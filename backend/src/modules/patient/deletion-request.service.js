const mongoose = require('mongoose');
const DeletionRequest = require('./deletion-request.model');
const Patient = require('./patient.model');
const Visit = require('../visits/visit.model');
const Appointment = require('../appointments/appointment.model');
const BedMaster = require('../ipd/beds/bed.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
const AuditService = require('../audit/audit.service');
const AppError = require('../../core/errors/app-error');
const { withTransaction } = require('../../core/database/transaction');

class DeletionRequestService {
  /**
   * Request deletion of a patient record.
   * Denormalizes patientSnapshot for permanent transparency.
   */
  async requestDeletion(patientId, adminId, reason, ipAddress = null) {
    const existingRequest = await DeletionRequest.findOne({ patientId, status: 'PENDING' });
    if (existingRequest) {
      throw new AppError('BUSINESS_001', 'A pending deletion request already exists for this patient');
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('NOT_FOUND', 'Patient not found');
    }

    const patientSnapshot = {
      fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient',
      mrn: patient.mrn || 'N/A',
      phone: patient.phone || '',
      gender: patient.gender || '',
      age: patient.age,
    };

    const req = await DeletionRequest.create({
      patientId,
      patientSnapshot,
      requestedBy: adminId,
      reason,
      status: 'PENDING',
    });

    // Asynchronous audit logging
    AuditService.logEvent(
      adminId,
      'ADMIN',
      'PATIENT_DELETION_REQUESTED',
      patientId,
      {
        requestId: req._id,
        mrn: patientSnapshot.mrn,
        patientName: patientSnapshot.fullName,
        reason,
      },
      ipAddress
    ).catch((err) => console.error('[AuditService] Failed to log deletion request:', err));

    return req;
  }

  /**
   * Get all pending deletion requests with full population and patientSnapshot fallback.
   */
  async getPendingRequests() {
    const requests = await DeletionRequest.find({ status: 'PENDING' })
      .populate('patientId', 'firstName lastName mrn phone gender age isDeleted')
      .populate('requestedBy', 'fullName name role email')
      .sort({ createdAt: -1 })
      .lean();

    return requests.map((req) => ({
      ...req,
      patientDisplay: req.patientId || req.patientSnapshot || {
        firstName: 'Unknown',
        lastName: 'Patient',
        mrn: 'N/A',
      },
    }));
  }

  /**
   * Approve deletion request and safely soft-delete patient record.
   * Clears IPD bed allocations, cancels pending appointments/visits, and writes an audit log.
   */
  async approveDeletion(requestId, doctorId, ipAddress = null) {
    return withTransaction(async (session) => {
      const request = await DeletionRequest.findById(requestId).session(session);
      if (!request) throw new AppError('NOT_FOUND', 'Deletion request not found');
      if (request.status !== 'PENDING') throw new AppError('BUSINESS_001', 'Request is not pending');

      const patient = await Patient.findById(request.patientId).session(session);

      // 1. Guard against active clinical encounters in progress
      const activeVisits = await Visit.countDocuments({
        patientId: request.patientId,
        status: {
          $in: [
            'WAITING_TRIAGE',
            'CALLED',
            'WAITING_DOCTOR',
            'IN_PROGRESS',
            'WAITING_LAB',
            'WAITING_DOCTOR_REVIEW',
            'WAITING_PHARMACY',
          ],
        },
      }).session(session);

      if (activeVisits > 0) {
        throw new AppError(
          'CLINICAL_001',
          `Cannot delete patient with ${activeVisits} active clinical encounter(s) in progress. Please discharge or finalize visits first.`
        );
      }

      // 2. Guard against active IPD bed occupancy
      const activeAdmission = await IPDAdmission.findOne({
        patientId: request.patientId,
        status: { $in: ['ADMITTED', 'DISCHARGE_INITIATED'] },
      }).session(session);

      if (activeAdmission) {
        throw new AppError(
          'CLINICAL_002',
          'Cannot delete patient currently admitted to an Inpatient (IPD) Bed. Please discharge and vacate bed first.'
        );
      }

      // 3. Release any legacy bed occupancies in BedMaster
      await BedMaster.updateMany(
        { currentPatientId: request.patientId },
        { isOccupied: false, currentAdmissionId: null, currentPatientId: null, status: 'VACANT' }
      ).session(session);

      // 4. Safely cancel any scheduled/confirmed upcoming appointments
      await Appointment.updateMany(
        { patientId: request.patientId, status: { $in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] } },
        { status: 'CANCELLED', cancellationReason: 'Patient Record Deletion Approved' }
      ).session(session);

      // 5. Safely cancel any non-completed historical visits
      await Visit.updateMany(
        { patientId: request.patientId, status: { $ne: 'COMPLETED' } },
        { status: 'CANCELLED', cancellationReason: 'Patient Record Deletion Approved' }
      ).session(session);

      // 6. Mark patient as soft-deleted
      if (patient) {
        patient.isDeleted = true;
        patient.deletedAt = new Date();
        patient.deletedBy = doctorId;
        patient.deletionReason = request.reason || 'Approved Deletion Request';
        await patient.save({ session });
      } else {
        await Patient.findByIdAndUpdate(
          request.patientId,
          {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: doctorId,
            deletionReason: request.reason || 'Approved Deletion Request',
          },
          { session }
        );
      }

      // 7. Update DeletionRequest status
      request.status = 'APPROVED';
      request.approvedBy = doctorId;
      request.resolvedAt = new Date();
      await request.save({ session });

      // 8. Log system audit event for complete transparency
      const patientName =
        request.patientSnapshot?.fullName ||
        (patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown Patient');
      const mrn = request.patientSnapshot?.mrn || patient?.mrn || 'N/A';

      AuditService.logEvent(
        doctorId,
        'DOCTOR',
        'PATIENT_DELETED',
        request.patientId,
        {
          requestId: request._id,
          mrn,
          patientName,
          requestedBy: request.requestedBy,
          approvedBy: doctorId,
          reason: request.reason,
          resolvedAt: request.resolvedAt,
        },
        ipAddress
      ).catch((err) => console.error('[AuditService] Failed to log deletion approval:', err));

      return request;
    });
  }

  /**
   * Reject patient deletion request.
   */
  async rejectDeletion(requestId, doctorId, reason = 'Rejected by clinician', ipAddress = null) {
    const request = await DeletionRequest.findById(requestId);
    if (!request) throw new AppError('NOT_FOUND', 'Deletion request not found');
    if (request.status !== 'PENDING') throw new AppError('BUSINESS_001', 'Request is not pending');

    request.status = 'REJECTED';
    request.approvedBy = doctorId;
    request.resolutionReason = reason;
    request.resolvedAt = new Date();
    await request.save();

    AuditService.logEvent(
      doctorId,
      'DOCTOR',
      'PATIENT_DELETION_REJECTED',
      request.patientId,
      {
        requestId: request._id,
        mrn: request.patientSnapshot?.mrn,
        patientName: request.patientSnapshot?.fullName,
        requestedBy: request.requestedBy,
        approvedBy: doctorId,
        rejectionReason: reason,
        resolvedAt: request.resolvedAt,
      },
      ipAddress
    ).catch((err) => console.error('[AuditService] Failed to log deletion rejection:', err));

    return request;
  }
}

module.exports = new DeletionRequestService();

