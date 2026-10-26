const service = require('./deletion-request.service');
const { success } = require('../../core/responses');

class DeletionRequestController {
  async requestDeletion(req, res, next) {
    try {
      const { id: patientId } = req.params;
      const adminId = req.user.staffId || req.user.userId;
      const { reason } = req.body;
      const result = await service.requestDeletion(patientId, adminId, reason, req.ip);
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
      const result = await service.approveDeletion(requestId, doctorId, req.ip);
      return success(res, result, 'Patient deletion approved and executed successfully');
    } catch (err) {
      next(err);
    }
  }

  async rejectDeletion(req, res, next) {
    try {
      const { id: requestId } = req.params;
      const doctorId = req.user.staffId || req.user.userId;
      const { reason } = req.body || {};
      const result = await service.rejectDeletion(requestId, doctorId, reason, req.ip);
      return success(res, result, 'Patient deletion request rejected');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DeletionRequestController();

