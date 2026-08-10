const pharmacyService = require('./pharmacy.service');
const { success, error: sendError } = require('../../core/responses');
const { dispenseSchema } = require('./pharmacy.validation');
const catchAsync = require('../../core/utils/catchAsync');
const auditService = require('../audit/audit.service');

class PharmacyController {
  dispenseMedications = catchAsync(async (req, res) => {
    const { id } = req.params; // Visit ID
    const { error, value } = dispenseSchema.validate(req.body);
    
    if (error) {
      return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    }

    const visit = await pharmacyService.dispenseMedications(id, value, req.user.staffId);
    
    // Log audit event
    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'MEDICINE_DISPENSED',
      visit._id,
      { medications: value.dispensedMedications, totalAmount: visit.billing?.pharmacyCharges },
      req.ip
    );

    return success(res, visit, 'Medications dispensed successfully', 200);
  });
}

module.exports = new PharmacyController();
