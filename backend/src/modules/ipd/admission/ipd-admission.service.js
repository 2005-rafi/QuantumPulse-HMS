/**
 * modules/ipd/admission/ipd-admission.service.js
 * Inpatient admission lifecycle management with atomic ACID guarantees.
 */
const mongoose = require('mongoose');
const ipdAdmissionRepository = require('./ipd-admission.repository');
const bedRepository = require('../beds/bed.repository');
const Patient = require('../../patient/patient.model');
const Bill = require('../../billing/bill.model');
const AdvanceDeposit = require('../billing/advance-deposit.model');
const IPDClearance = require('../discharge/ipd-clearance.model');
const AppError = require('../../../core/errors/AppError');
const auditService = require('../../audit/audit.service');
const sequenceService = require('../../../core/database/sequence.service');

class IPDAdmissionService {
  async admitPatient(data, admittedByStaffId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Verify Patient
      const patient = await Patient.findById(data.patientId).session(session);
      if (!patient) throw new AppError('Patient not found', 404, 'NOT_FOUND');

      // Check if patient is already actively admitted inside transaction
      const existingAdmission = await ipdAdmissionRepository.getAdmissions(
        {
          patientId: data.patientId,
          status: 'ADMITTED',
        },
        session
      );
      if (existingAdmission && existingAdmission.length > 0) {
        throw new AppError('Patient is already actively admitted in IPD', 409, 'ALREADY_ADMITTED');
      }

      // 2. Atomic Compare-And-Swap (CAS) Bed Claim Guard
      const bed = await bedRepository.claimBedAtomically(
        data.bedId,
        {
          status: 'OCCUPIED',
          currentPatientId: patient._id,
        },
        session
      );
      if (!bed) {
        throw new AppError(
          'Selected bed was just claimed by another clinician or is no longer vacant. Please select another bed.',
          409,
          'BED_NOT_AVAILABLE'
        );
      }

      // 3. Generate Sequential Admission Number (Atomic Zero-Collision)
      const admissionNumber = await sequenceService.getNextSequence('admission', 'ADM', session);

      // 4. Create Inpatient Master Bill
      const billDocs = await Bill.create(
        [
          {
            billNumber: `BILL-${admissionNumber}`,
            patientId: patient._id,
            visitType: 'IPD',
            serviceDate: new Date(),
            billedAmount: 0,
            collectedAmount: 0,
            advanceCollected: data.initialDepositAmount || 0,
            outstandingAmount: 0,
            status: 'OPEN',
            lineItems: [],
            generatedBy: admittedByStaffId,
          },
        ],
        { session }
      );
      const bill = billDocs[0];

      // 5. Create IPDAdmission Document
      const admissionDocs = await ipdAdmissionRepository.createAdmission(
        {
          admissionNumber,
          patientId: patient._id,
          primaryDoctorId: data.primaryDoctorId,
          admittingDepartmentId: data.admittingDepartmentId,
          currentBedId: bed._id,
          currentRoomId: bed.roomId._id || bed.roomId,
          currentFloorId: bed.floorId._id || bed.floorId,
          admissionType: data.admissionType || 'PLANNED',
          provisionalDiagnosis: data.provisionalDiagnosis,
          chiefComplaints: data.chiefComplaints || '',
          carePlan: data.carePlan || '',
          dietTier: data.dietTier || 'REGULAR_DIET',
          billId: bill._id,
          admittedBy: admittedByStaffId,
        },
        session
      );
      const admission = admissionDocs[0] || admissionDocs;

      // 6. Occupy Bed
      await bedRepository.updateBed(
        bed._id,
        {
          status: 'OCCUPIED',
          currentAdmissionId: admission._id,
          currentPatientId: patient._id,
        },
        session
      );

      // 7. Create Initial BedAllocation Record
      await bedRepository.createAllocation(
        {
          admissionId: admission._id,
          patientId: patient._id,
          bedId: bed._id,
          roomId: bed.roomId._id || bed.roomId,
          floorId: bed.floorId._id || bed.floorId,
          wardClass: bed.wardClass,
          transferredBy: admittedByStaffId,
          transferReason: 'Initial IPD Admission',
        },
        session
      );

      // 8. Record Initial Advance Deposit if provided
      if (data.initialDepositAmount && data.initialDepositAmount > 0) {
        await AdvanceDeposit.create(
          [
            {
              admissionId: admission._id,
              patientId: patient._id,
              receiptNumber: `DEP-${admissionNumber}-01`,
              amount: data.initialDepositAmount,
              paymentMethod: data.paymentMethod || 'UPI',
              transactionReference: data.transactionReference || '',
              collectedBy: admittedByStaffId,
              notes: 'Initial admission advance deposit',
            },
          ],
          { session }
        );
      }

      // 9. Initialize 3-Way Discharge Clearance Record
      await IPDClearance.create(
        [
          {
            admissionId: admission._id,
            patientId: patient._id,
            initiatedBy: admittedByStaffId,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Audit trail (without PHI)
      try {
        auditService.logEvent(
          admittedByStaffId,
          'ClinicalStaff',
          'PATIENT_ADMITTED_IPD',
          admission._id,
          {
            admissionNumber: admission.admissionNumber,
            mrn: patient.mrn,
            bedNumber: bed.bedNumber,
            wardClass: bed.wardClass,
          }
        );
      } catch {}

      return ipdAdmissionRepository.getAdmissionById(admission._id);
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }

  async getAdmissions(query) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.primaryDoctorId) filter.primaryDoctorId = query.primaryDoctorId;
    if (query.admittingDepartmentId) filter.admittingDepartmentId = query.admittingDepartmentId;
    return ipdAdmissionRepository.getAdmissions(filter);
  }

  async getAdmissionById(id) {
    const admission = await ipdAdmissionRepository.getAdmissionById(id);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');
    return admission;
  }

  async updateAdmission(id, updateData) {
    const admission = await ipdAdmissionRepository.updateAdmission(id, updateData);
    if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
    return admission;
  }
}

module.exports = new IPDAdmissionService();
