/**
 * modules/ipd/discharge/discharge.service.js
 * Multi-departmental 3-way discharge clearance and Gate Pass generation service.
 */
const mongoose = require('mongoose');
const IPDClearance = require('./ipd-clearance.model');
const IPDAdmission = require('../admission/ipd-admission.model');
const BedMaster = require('../beds/bed.model');
const BedAllocation = require('../beds/bed-allocation.model');
const Bill = require('../../billing/bill.model');
const AppError = require('../../../core/errors/AppError');

class DischargeService {
  async initiateDischarge(admissionId, dischargeData, doctorStaffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');
    if (admission.status !== 'ADMITTED') {
      throw new AppError(`Cannot initiate discharge for admission in status: ${admission.status}`, 400, 'INVALID_STATUS');
    }

    admission.status = 'DISCHARGE_INITIATED';
    admission.dischargeSummary = {
      finalDiagnosis: dischargeData.finalDiagnosis || admission.provisionalDiagnosis,
      courseInHospital: dischargeData.courseInHospital || '',
      dischargeAdvice: dischargeData.dischargeAdvice || '',
      followUpDate: dischargeData.followUpDate || null,
      dischargedBy: doctorStaffId,
    };
    await admission.save();

    // Ensure clearance document exists
    let clearance = await IPDClearance.findOne({ admissionId: admission._id });
    if (!clearance) {
      clearance = await IPDClearance.create({
        admissionId: admission._id,
        patientId: admission.patientId,
        initiatedBy: doctorStaffId,
      });
    }

    return {
      admission,
      clearance,
      message: 'Discharge initiated successfully. Awaiting multi-departmental clearances.',
    };
  }

  async getClearanceStatus(admissionId) {
    let clearance = await IPDClearance.findOne({ admissionId })
      .populate('pharmacyClearance.clearedBy', 'firstName lastName')
      .populate('nursingClearance.clearedBy', 'firstName lastName')
      .populate('billingClearance.clearedBy', 'firstName lastName')
      .lean();

    if (!clearance) {
      const admission = await IPDAdmission.findById(admissionId);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
      clearance = await IPDClearance.create({
        admissionId: admission._id,
        patientId: admission.patientId,
        initiatedBy: admission.admittedBy,
      });
    }

    return clearance;
  }

  async markDepartmentClearance(admissionId, department, { notes, unreturnedMedsValue, cannulaRemoved } = {}, staffId) {
    const clearance = await IPDClearance.findOne({ admissionId });
    if (!clearance) throw new AppError('Clearance record not found', 404, 'NOT_FOUND');

    const now = new Date();

    if (department === 'PHARMACY') {
      clearance.pharmacyClearance = {
        isCleared: true,
        clearedBy: staffId,
        clearedAt: now,
        notes: notes || 'All floor stock medications reconciled',
      };
    } else if (department === 'WARD' || department === 'NURSING') {
      clearance.nursingClearance = {
        isCleared: true,
        clearedBy: staffId,
        clearedAt: now,
        cannulaRemoved: cannulaRemoved !== undefined ? cannulaRemoved : true,
        notes: notes || 'Vitals stable, cannula and dressings removed',
      };
    } else if (department === 'BILLING') {
      clearance.billingClearance = {
        isCleared: true,
        clearedBy: staffId,
        clearedAt: now,
        notes: notes || 'All dues settled in full',
      };
    } else {
      throw new AppError('Invalid department type for clearance (must be PHARMACY, WARD, or BILLING)', 400, 'INVALID_DEPT');
    }

    await clearance.save();
    return clearance;
  }

  async finalizeDischargeAndIssueGatePass(admissionId, staffId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admission = await IPDAdmission.findById(admissionId).session(session);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');

      const clearance = await IPDClearance.findOne({ admissionId: admission._id }).session(session);
      if (!clearance) throw new AppError('Clearance document not found', 404, 'NOT_FOUND');

      if (!clearance.pharmacyClearance?.isCleared) {
        throw new AppError('Pharmacy clearance pending. Cannot finalize discharge.', 400, 'PHARMACY_PENDING');
      }
      if (!clearance.nursingClearance?.isCleared) {
        throw new AppError('Nursing clearance pending. Cannot finalize discharge.', 400, 'NURSING_PENDING');
      }
      if (!clearance.billingClearance?.isCleared) {
        throw new AppError('Billing clearance pending. Cannot finalize discharge.', 400, 'BILLING_PENDING');
      }

      // 1. Generate Gate Pass Number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const gatePassNumber = `GP-${admission.admissionNumber}`;

      clearance.gatePassIssued = true;
      clearance.gatePassNumber = gatePassNumber;
      clearance.gatePassGeneratedAt = new Date();
      await clearance.save({ session });

      // 2. Finalize Inpatient Admission
      admission.status = 'DISCHARGED';
      admission.dischargeDate = new Date();
      await admission.save({ session });

      // 3. Free Bed & Mark for Cleaning
      if (admission.currentBedId) {
        await BedMaster.findByIdAndUpdate(
          admission.currentBedId,
          {
            status: 'CLEANING_IN_PROGRESS',
            currentAdmissionId: null,
            currentPatientId: null,
          },
          { session }
        );

        await BedAllocation.findOneAndUpdate(
          { bedId: admission.currentBedId, admissionId: admission._id, allocatedTo: null },
          { $set: { allocatedTo: new Date() } },
          { session }
        );
      }

      // 4. Finalize Bill
      if (admission.billId) {
        await Bill.findByIdAndUpdate(admission.billId, { status: 'FINALIZED' }, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: 'Patient discharged and Gate Pass issued successfully',
        gatePassNumber,
        admissionNumber: admission.admissionNumber,
        dischargeDate: admission.dischargeDate,
      };
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }

  async getGatePass(admissionId) {
    const clearance = await IPDClearance.findOne({ admissionId })
      .populate({
        path: 'admissionId',
        populate: [
          { path: 'patientId' },
          { path: 'primaryDoctorId', select: 'firstName lastName employeeId position' },
          { path: 'admittingDepartmentId', select: 'name code' },
          { path: 'currentBedId' },
        ],
      })
      .lean();

    if (!clearance || !clearance.gatePassIssued) {
      throw new AppError('Gate Pass has not been generated for this admission', 404, 'GATE_PASS_NOT_FOUND');
    }

    return clearance;
  }
}

module.exports = new DischargeService();
