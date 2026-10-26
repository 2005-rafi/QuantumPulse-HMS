const visitRepository = require('../visits/visit.repository');
const AppError = require('../../core/errors/app-error');
const { withTransaction } = require('../../core/database/transaction');
const medicinePriceRepository = require('./medicine-price.repository');

class PharmacyService {
  async dispenseMedications(visitId, data, pharmacistId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) {
        throw new AppError('NOT_FOUND', 'Visit not found');
      }

      if (visit.status !== 'WAITING_PHARMACY') {
        throw new AppError('BUSINESS_002', `Cannot dispense medications in current status: ${visit.status}`);
      }

      const dispensedMedications = Array.isArray(data.dispensedMedications) ? data.dispensedMedications : [];
      const pharmacyCharges = dispensedMedications.reduce((sum, med) => {
        const q = Number(med.quantity) || 1;
        const up = Number(med.unitPrice) || 0;
        const lineAmt = med.amount !== undefined && med.amount !== null && !isNaN(Number(med.amount)) ? Number(med.amount) : (q * up);
        return sum + lineAmt;
      }, 0);

      // Update visit: record pharmacy work and route to central billing station for payment and closure
      const updatedData = {
        status: 'WAITING_BILLING',
        pharmacyWork: {
          pharmacistId,
          dispensedMedications,
          totalAmount: pharmacyCharges,
          status: 'DISPENSED',
          processedAt: new Date(),
        },
        // Preserve legacy billing fields for backward compatibility, but leave billedBy null until cashier settles
        billing: {
          consultationFee: data.consultationFee || 0,
          labCharges: data.labCharges || 0,
          pharmacyCharges,
          totalAmount: (data.consultationFee || 0) + (data.labCharges || 0) + pharmacyCharges,
          billedAt: new Date(),
        },
      };

      const result = await visitRepository.updateById(visitId, updatedData, { session });

      try {
        const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
        broadcastPatientStatus({
          patientId: visit.patientId?._id || visit.patientId,
          visitId,
          tokenString: visit.tokenString,
          status: 'WAITING_BILLING',
          stage: 'Medications Dispensed - Waiting Billing',
        });
      } catch (_) {}

      // Emit BillableEvent for each dispensed medicine (async, non-blocking for session)
      // This is done after the visit update to avoid circular dependency issues in MVP
      setImmediate(async () => {
        try {
          const billingService = require('../billing/bill.service');
          for (const med of dispensedMedications) {
            if (!med.recommended && !med.alternativeGiven) continue;
            const medicineName = med.alternativeGiven || med.recommended || 'Medicine';
            const qty = Number(med.quantity) || 1;
            const unitPrice = med.unitPrice !== undefined && med.unitPrice !== null && !isNaN(Number(med.unitPrice))
              ? Number(med.unitPrice)
              : (med.amount ? Number(med.amount) / qty : 0);

            await billingService.processBillableEvent({
              type: 'MEDICINE_DISPENSED',
              visitId,
              patientId: visit.patientId && visit.patientId._id ? visit.patientId._id : visit.patientId,
              triggeredBy: pharmacistId,
              triggeredAt: new Date(),
              resolutionContext: {
                category: 'PHARMACY',
                medicineName,
                quantity: qty,
              },
              preResolvedPrice: unitPrice,
              description: `${medicineName}${med.alternativeGiven ? ` (Substituted)` : ''} (Qty: ${qty} @ ₹${unitPrice.toFixed(2)})`,
            });
          }
        } catch (err) {
          console.error('[PharmacyService] Failed to emit medicine BillableEvents:', err.message);
        }
      });

      return result;
    });
  }

  async getMedicinePriceByName(medicineName) {
    return medicinePriceRepository.findActiveByName(medicineName);
  }

  async listMedicinePrices(filters, options) {
    return medicinePriceRepository.list(filters, options);
  }

  async createMedicinePrice(data, staffId) {
    return medicinePriceRepository.create({ ...data, setBy: staffId, effectiveFrom: data.effectiveFrom || new Date() });
  }

  async updateMedicinePrice(id, data) {
    return medicinePriceRepository.update(id, data);
  }

  async deactivateMedicinePrice(id, staffId) {
    return medicinePriceRepository.deactivate(id, staffId);
  }
}

module.exports = new PharmacyService();
