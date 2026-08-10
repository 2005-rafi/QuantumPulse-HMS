const visitRepository = require('../visits/visit.repository');
const AppError = require('../../core/errors/AppError');
const { withTransaction } = require('../../core/database/transaction');

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

      const { dispensedMedications, consultationFee = 0, labCharges = 0 } = data;
      const pharmacyCharges = dispensedMedications.reduce((sum, med) => sum + (med.amount || 0), 0);
      const overallTotal = consultationFee + labCharges + pharmacyCharges;

      const updatedData = {
        status: 'COMPLETED',
        pharmacyWork: {
          pharmacistId,
          dispensedMedications,
          totalAmount: pharmacyCharges,
          status: 'COMPLETED',
          processedAt: new Date()
        },
        billing: {
          consultationFee,
          labCharges,
          pharmacyCharges,
          totalAmount: overallTotal,
          billedBy: pharmacistId,
          billedAt: new Date()
        }
      };

      const result = await visitRepository.updateById(visitId, updatedData, { session });
      return result;
    });
  }
}

module.exports = new PharmacyService();
