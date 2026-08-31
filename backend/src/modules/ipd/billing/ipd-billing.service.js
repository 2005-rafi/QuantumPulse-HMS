/**
 * modules/ipd/billing/ipd-billing.service.js
 * Inpatient billing ledger management, advance deposit collection, and daily tariff ingestion.
 */
const mongoose = require('mongoose');
const AdvanceDeposit = require('./advance-deposit.model');
const IPDAdmission = require('../admission/ipd-admission.model');
const BedMaster = require('../beds/bed.model');
const Bill = require('../../billing/bill.model');
const tariffResolver = require('../../tariff/tariff-resolver');
const AppError = require('../../../core/errors/AppError');

class IPDBillingService {
  async getRunningLedger(admissionId) {
    const admission = await IPDAdmission.findById(admissionId)
      .populate('patientId', 'firstName lastName mrn age gender phone')
      .populate('primaryDoctorId', 'firstName lastName')
      .populate('currentBedId', 'bedNumber bedLabel wardClass')
      .populate('currentRoomId', 'roomNumber roomName roomType')
      .populate('currentFloorId', 'floorNumber floorName')
      .lean();

    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    let bill = null;
    if (admission.billId) {
      bill = await Bill.findById(admission.billId).lean();
    } else {
      bill = await Bill.findOne({ patientId: admission.patientId, visitType: 'IPD', status: 'OPEN' }).lean();
    }

    const deposits = await AdvanceDeposit.find({ admissionId: admission._id })
      .populate('collectedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const totalDeposits = deposits.reduce((sum, d) => sum + (d.isRefunded ? 0 : d.amount), 0);
    const totalBilled = bill ? (bill.billedAmount || 0) : 0;
    const discountAmount = bill ? (bill.discountAmount || 0) : 0;
    const netAmount = Math.max(0, totalBilled - discountAmount);
    const outstandingDue = Math.max(0, netAmount - totalDeposits);
    const excessCredit = Math.max(0, totalDeposits - netAmount);

    return {
      admission,
      bill,
      lineItems: bill ? bill.lineItems || [] : [],
      deposits,
      financialSummary: {
        totalBilled,
        discountAmount,
        netAmount,
        totalAdvanceDeposited: totalDeposits,
        outstandingDue,
        excessCredit,
        status: bill ? bill.status : 'OPEN',
      },
    };
  }

  async recordAdvanceDeposit(admissionId, depositData, staffId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admission = await IPDAdmission.findById(admissionId).session(session);
      if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

      const count = await AdvanceDeposit.countDocuments({ admissionId }).session(session);
      const seq = String(count + 1).padStart(2, '0');
      const receiptNumber = `DEP-${admission.admissionNumber}-${seq}`;

      const depositDocs = await AdvanceDeposit.create(
        [
          {
            admissionId: admission._id,
            patientId: admission.patientId,
            receiptNumber,
            amount: depositData.amount,
            paymentMethod: depositData.paymentMethod || 'UPI',
            transactionReference: depositData.transactionReference || '',
            collectedBy: staffId,
            notes: depositData.notes || '',
          },
        ],
        { session }
      );
      const deposit = depositDocs[0];

      // Update Bill advanceCollected
      if (admission.billId) {
        await Bill.findByIdAndUpdate(
          admission.billId,
          { $inc: { advanceCollected: depositData.amount } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return deposit;
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }

  async getAdvanceDeposits(admissionId) {
    return AdvanceDeposit.find({ admissionId })
      .populate('collectedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  // ── Daily Charge Ingestion (Midnight Cron or Manual Trigger) ──
  async ingestDailyCharges(admissionId, staffId = null) {
    const admission = await IPDAdmission.findById(admissionId)
      .populate('currentBedId')
      .populate('primaryDoctorId');

    if (!admission || admission.status !== 'ADMITTED') {
      return { success: false, message: 'Patient not currently admitted' };
    }

    const bed = admission.currentBedId;
    const wardClass = bed?.wardClass || 'GENERAL_WARD';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    let bill = await Bill.findById(admission.billId);
    if (!bill) {
      bill = await Bill.findOne({ patientId: admission.patientId, visitType: 'IPD', status: 'OPEN' });
    }
    if (!bill) return { success: false, message: 'No open bill found for admission' };

    const newLineItems = [];

    // 1. Room Rent Charge
    const addedByStaff = staffId || admission.primaryDoctorId?._id || admission.admittedBy;
    try {
      const roomTariff = await tariffResolver.resolve({
        category: 'PROCEDURE',
        wardClass,
        visitType: 'IPD',
      });
      const roomRate = bed?.dailyRateOverride || roomTariff.amount;
      newLineItems.push({
        description: `Room Rent — ${bed.bedLabel} (${wardClass}) [${dateStr}]`,
        category: 'PROCEDURE',
        snapshotPrice: roomRate,
        quantity: 1,
        lineTotal: roomRate,
        snapshotRuleId: roomTariff.ruleId,
        addedBy: addedByStaff,
      });
    } catch {
      const fallbackRate = wardClass.includes('ICU') ? 5000 : wardClass.includes('DELUXE') ? 3500 : 1500;
      newLineItems.push({
        description: `Room Rent — ${bed.bedLabel} (${wardClass}) [${dateStr}]`,
        category: 'PROCEDURE',
        snapshotPrice: fallbackRate,
        quantity: 1,
        lineTotal: fallbackRate,
        addedBy: addedByStaff,
      });
    }

    // 2. Nursing Care Charge
    const nursingRate = wardClass.includes('ICU') ? 1500 : 500;
    newLineItems.push({
      description: `Nursing Care Fee — (${wardClass}) [${dateStr}]`,
      category: 'PROCEDURE',
      snapshotPrice: nursingRate,
      quantity: 1,
      lineTotal: nursingRate,
      addedBy: addedByStaff,
    });

    // 3. RMO Doctor Round Charge
    newLineItems.push({
      description: `Resident Doctor (RMO) Visit [${dateStr}]`,
      category: 'CONSULTATION',
      snapshotPrice: 400,
      quantity: 1,
      lineTotal: 400,
      addedBy: addedByStaff,
    });

    // Append to Bill
    const addedAmount = newLineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    bill.lineItems.push(...newLineItems);
    bill.billedAmount = (bill.billedAmount || 0) + addedAmount;
    bill.outstandingAmount = Math.max(0, bill.billedAmount - (bill.advanceCollected || 0) - (bill.collectedAmount || 0) - (bill.adjustedAmount || 0));
    await bill.save();

    return {
      success: true,
      chargesAdded: newLineItems.length,
      amountAdded: addedAmount,
      totalBilled: bill.billedAmount,
    };
  }
}

module.exports = new IPDBillingService();
