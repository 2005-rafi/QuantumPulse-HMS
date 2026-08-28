const visitRepository = require('../visits/visit.repository');
const AppError = require('../../core/errors/AppError');
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
      const pharmacyCharges = dispensedMedications.reduce((sum, med) => sum + (med.amount || 0), 0);

      // Update visit: record pharmacy work and mark completed
      const updatedData = {
        status: 'COMPLETED',
        pharmacyWork: {
          pharmacistId,
          dispensedMedications,
          totalAmount: pharmacyCharges,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
        // Keep visit.billing for backward compat with existing seeded visits
        billing: {
          consultationFee: data.consultationFee || 0,
          labCharges: data.labCharges || 0,
          pharmacyCharges,
          totalAmount: (data.consultationFee || 0) + (data.labCharges || 0) + pharmacyCharges,
          billedBy: pharmacistId,
          billedAt: new Date(),
        },
      };

      const result = await visitRepository.updateById(visitId, updatedData, { session });

      // Emit BillableEvent for each dispensed medicine (async, non-blocking for session)
      // This is done after the visit update to avoid circular dependency issues in MVP
      setImmediate(async () => {
        try {
          const billingService = require('../billing/bill.service');
          for (const med of dispensedMedications) {
            if (!med.recommended && !med.alternativeGiven) continue;
            const medicineName = med.alternativeGiven || med.recommended || 'Medicine';
            await billingService.processBillableEvent({
              type: 'MEDICINE_DISPENSED',
              visitId,
              patientId: visit.patientId && visit.patientId._id ? visit.patientId._id : visit.patientId,
              triggeredBy: pharmacistId,
              triggeredAt: new Date(),
              resolutionContext: {
                category: 'PHARMACY',
                medicineName,
                quantity: 1,
              },
              preResolvedPrice: med.amount || 0,
              description: `${medicineName}${med.quantity ? ` x${med.quantity}` : ''}`,
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
