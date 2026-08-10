const DeletionRequest = require('./deletionRequest.model');
const Patient = require('./patient.model');
const Visit = require('../visits/visit.model');
const AppError = require('../../core/errors/AppError');
const mongoose = require('mongoose');
const { withTransaction } = require('../../core/database/transaction');

class DeletionRequestService {
  async requestDeletion(patientId, adminId, reason) {
    const existingRequest = await DeletionRequest.findOne({ patientId, status: 'PENDING' });
    if (existingRequest) {
      throw new AppError('BUSINESS_001', 'A pending deletion request already exists for this patient');
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('NOT_FOUND', 'Patient not found');
    }

    const req = await DeletionRequest.create({
      patientId,
      requestedBy: adminId,
      reason
    });
    return req;
  }

  async getPendingRequests() {
    return await DeletionRequest.find({ status: 'PENDING' })
      .populate('patientId', 'firstName lastName mrn')
      .populate('requestedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async approveDeletion(requestId, doctorId) {
    return withTransaction(async (session) => {
      const request = await DeletionRequest.findById(requestId).session(session);
      if (!request) throw new AppError('NOT_FOUND', 'Deletion request not found');
      if (request.status !== 'PENDING') throw new AppError('BUSINESS_001', 'Request is not pending');

      request.status = 'APPROVED';
      request.approvedBy = doctorId;
      request.resolvedAt = new Date();
      await request.save({ session });

      await Visit.deleteMany({ patientId: request.patientId }).session(session);
      await Patient.findByIdAndDelete(request.patientId).session(session);

      return request;
    });
  }

  async rejectDeletion(requestId, doctorId) {
    const request = await DeletionRequest.findById(requestId);
    if (!request) throw new AppError('NOT_FOUND', 'Deletion request not found');
    if (request.status !== 'PENDING') throw new AppError('BUSINESS_001', 'Request is not pending');

    request.status = 'REJECTED';
    request.approvedBy = doctorId;
    request.resolvedAt = new Date();
    await request.save();
    return request;
  }
}

module.exports = new DeletionRequestService();
