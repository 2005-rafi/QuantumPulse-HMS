const service = require('./deletionRequest.service');
const { success } = require('../../core/responses');

class DeletionRequestController {
  async requestDeletion(req, res, next) {
    try {
      const { id: patientId } = req.params;
      const adminId = req.user.staffId || req.user.userId;
      const { reason } = req.body;
      const result = await service.requestDeletion(patientId, adminId, reason);
      return success(res, result, 'Patient deletion requested successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getPendingRequests(req, res, next) {
    try {
      const result = await service.getPendingRequests();
      return success(res, result, 'Pending deletion requests retrieved');
    } catch (err) {
      next(err);
    }
  }

  async approveDeletion(req, res, next) {
    try {
      const { id: requestId } = req.params;
      const doctorId = req.user.staffId || req.user.userId;
      const result = await service.approveDeletion(requestId, doctorId);
      
      // Log audit event
      const auditService = require('../audit/audit.service');
      auditService.logEvent(
        req.user.staffId || req.user.userId,
        req.user.role,
        'PATIENT_DELETED',
        result.patientId,
        { requestId: result._id, reason: result.reason },
        req.ip
      );

      return success(res, result, 'Patient deletion approved and executed successfully');
    } catch (err) {
      next(err);
    }
  }

  async rejectDeletion(req, res, next) {
    try {
      const { id: requestId } = req.params;
      const doctorId = req.user.staffId || req.user.userId;
      const result = await service.rejectDeletion(requestId, doctorId);
      return success(res, result, 'Patient deletion rejected');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DeletionRequestController();
