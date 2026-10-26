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
const { withTransaction } = require('../../../core/database/transaction');
const AppError = require('../../../core/errors/app-error');

const ipdBillingService = require('../billing/ipd-billing.service');

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
      .populate('billingClearance.clearedBy', 'firstName lastName');

    if (!clearance) {
      const admission = await IPDAdmission.findById(admissionId);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
      clearance = await IPDClearance.create({
        admissionId: admission._id,
        patientId: admission.patientId,
        initiatedBy: admission.admittedBy,
      });
    }

    // Attach authoritative live financial ledger summary (consumed charges, advance deposits, outstanding balance)
    let financialSummary = null;
    try {
      const ledger = await ipdBillingService.getLedgerSummary(admissionId);
      if (ledger && ledger.financialSummary) {
        financialSummary = {
          totalGrossBilled: ledger.financialSummary.totalGrossBilled || 0,
          totalAdvanceDeposited: ledger.financialSummary.totalAdvanceDeposited || 0,
          totalDeskPayments: ledger.financialSummary.totalDeskPayments || 0,
          totalCollected: ledger.financialSummary.totalCollected || ((ledger.financialSummary.totalAdvanceDeposited || 0) + (ledger.financialSummary.totalDeskPayments || 0)),
          outstandingDue: ledger.financialSummary.outstandingDue || 0,
          status: ledger.financialSummary.status || 'OPEN',
          isSettled: (ledger.financialSummary.outstandingDue || 0) <= 0 && (ledger.financialSummary.status === 'FINALIZED' || ledger.financialSummary.totalGrossBilled > 0),
        };

        // System verification sync: If bill is finalized and balance is zero, ensure clearance reflects it
        if (financialSummary.isSettled) {
          if (!clearance.billingClearance?.isCleared) {
            clearance.billingClearance.isCleared = true;
            clearance.billingClearance.clearedAt = new Date();
            clearance.billingClearance.totalBilled = financialSummary.totalGrossBilled;
            clearance.billingClearance.totalCollected = financialSummary.totalCollected;
            clearance.billingClearance.balanceDue = 0;
            clearance.billingClearance.notes = `System Verified: Settled in full (Bill #${ledger.bill?.billNumber || 'Finalized'})`;
            await clearance.save();
          }
        } else if (financialSummary.outstandingDue > 0) {
          let modified = false;
          // If unbilled consumed charges were added or clearance was prematurely marked, revoke clearance and record dues
          if (clearance.billingClearance?.isCleared && !clearance.gatePassIssued) {
            clearance.billingClearance.isCleared = false;
            modified = true;
          }
          if (clearance.billingClearance?.balanceDue !== financialSummary.outstandingDue) {
            clearance.billingClearance.balanceDue = financialSummary.outstandingDue;
            clearance.billingClearance.totalBilled = financialSummary.totalGrossBilled;
            clearance.billingClearance.totalCollected = financialSummary.totalCollected;
            modified = true;
          }
          if (modified && !clearance.gatePassIssued) {
            await clearance.save();
          }
        }
      }
    } catch (err) {
      const logger = require('../../../core/logger');
      logger.warn('[DischargeService] Non-blocking warning: Could not calculate live financial summary for clearance:', { admissionId, error: err.message });
    }

    const clearanceObj = clearance.toObject ? clearance.toObject() : clearance;
    clearanceObj.financialSummary = financialSummary;
    return clearanceObj;
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
      // SYSTEM VERIFICATION: Verify that all consumed IPD charges have been settled
      const ledger = await ipdBillingService.getLedgerSummary(admissionId);
      const outstandingDue = ledger?.financialSummary?.outstandingDue || 0;
      const totalGrossBilled = ledger?.financialSummary?.totalGrossBilled || 0;
      const totalCollected = ledger?.financialSummary?.totalCollected || ((ledger?.financialSummary?.totalAdvanceDeposited || 0) + (ledger?.financialSummary?.totalDeskPayments || 0));

      if (outstandingDue > 0) {
        throw new AppError(
          `Cannot grant billing clearance: Patient has outstanding consumed charges of ₹${outstandingDue.toLocaleString('en-IN')}. Please collect payment or finalize settlement at Cashier Desk.`,
          400,
          'BILLING_OUTSTANDING_DUES'
        );
      }

      clearance.billingClearance = {
        isCleared: true,
        clearedBy: staffId,
        clearedAt: now,
        totalBilled: totalGrossBilled,
        totalCollected: totalCollected,
        balanceDue: 0,
        notes: notes || 'System Verified: All consumed charges settled in full (Zero Dues)',
      };
    } else {
      throw new AppError('Invalid department type for clearance (must be PHARMACY, WARD, or BILLING)', 400, 'INVALID_DEPT');
    }

    await clearance.save();

    try {
      const { broadcastIPDLedgerUpdate } = require('../../realtime/patient-status-events.service');
      broadcastIPDLedgerUpdate({
        admissionId,
        eventType: 'CLEARANCE_UPDATED',
        department,
        clearance: clearance.toObject ? clearance.toObject() : clearance,
      });
    } catch (_) {}

    return clearance;
  }

  async finalizeDischargeAndIssueGatePass(admissionId, staffId) {
    return withTransaction(async (session) => {
      const sessionOpts = session ? { session } : {};
      const admission = await IPDAdmission.findById(admissionId).setOptions(sessionOpts);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');

      const clearance = await IPDClearance.findOne({ admissionId: admission._id }).setOptions(sessionOpts);
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

      // Final System Financial Audit: Ensure zero uncollected charges remain before Exit Pass authorization
      const ledger = await ipdBillingService.getLedgerSummary(admission._id);
      const outstandingDue = ledger?.financialSummary?.outstandingDue || 0;
      if (outstandingDue > 0) {
        clearance.billingClearance.isCleared = false;
        clearance.billingClearance.balanceDue = outstandingDue;
        await clearance.save(sessionOpts);
        throw new AppError(
          `Cannot issue Gate Pass: Patient has uncollected charges of ₹${outstandingDue.toLocaleString('en-IN')}. Payment is required before exit pass authorization.`,
          400,
          'BILLING_OUTSTANDING_DUES'
        );
      }

      // 1. Generate Gate Pass Number
      const gatePassNumber = `GP-${admission.admissionNumber}`;

      clearance.gatePassIssued = true;
      clearance.gatePassNumber = gatePassNumber;
      clearance.gatePassGeneratedAt = new Date();
      await clearance.save(sessionOpts);

      // 2. Finalize Inpatient Admission
      admission.status = 'DISCHARGED';
      admission.dischargeDate = new Date();
      await admission.save(sessionOpts);

      // 3. Free Bed & Mark for Cleaning
      if (admission.currentBedId) {
        await BedMaster.findByIdAndUpdate(
          admission.currentBedId,
          {
            status: 'CLEANING_IN_PROGRESS',
            currentAdmissionId: null,
            currentPatientId: null,
          },
          sessionOpts
        );

        await BedAllocation.findOneAndUpdate(
          { bedId: admission.currentBedId, admissionId: admission._id, allocatedTo: null },
          { $set: { allocatedTo: new Date() } },
          sessionOpts
        );
      }

      // 4. Finalize Bill
      if (admission.billId) {
        await Bill.findByIdAndUpdate(admission.billId, { status: 'FINALIZED' }, sessionOpts);
      }

      return {
        success: true,
        message: 'Patient discharged and Gate Pass issued successfully',
        gatePassNumber,
        admissionNumber: admission.admissionNumber,
        admissionId: admission._id,
        patientId: admission.patientId,
      };
    });

    try {
      const { broadcastIPDLedgerUpdate, broadcastPatientStatus } = require('../../realtime/patient-status-events.service');
      broadcastIPDLedgerUpdate({
        admissionId: result.admissionId,
        patientId: result.patientId,
        eventType: 'GATE_PASS_ISSUED',
        gatePassNumber: result.gatePassNumber,
        isSettled: true,
        outstandingDue: 0,
      });
      broadcastPatientStatus({
        patientId: result.patientId,
        status: 'DISCHARGED',
        stage: 'Discharged & Gate Pass Issued',
        details: { gatePassNumber: result.gatePassNumber, admissionNumber: result.admissionNumber },
      });
    } catch (_) {}

    return result;
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
