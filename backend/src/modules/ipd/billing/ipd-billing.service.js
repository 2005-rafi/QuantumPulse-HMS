/**
 * modules/ipd/billing/ipd-billing.service.js
 * Inpatient billing ledger management, advance deposit collection, and daily tariff ingestion.
 */
const mongoose = require('mongoose');
const AdvanceDeposit = require('./advance-deposit.model');
const IPDAdmission = require('../admission/ipd-admission.model');
const BedMaster = require('../beds/bed.model');
const BedAllocation = require('../beds/bed-allocation.model');
const Bill = require('../../billing/bill.model');
const tariffResolver = require('../../tariff/tariff-resolver');
const AppError = require('../../../core/errors/AppError');
const config = require('../../../core/config');

class IPDBillingService {
  /**
   * Resolve authoritative bed tariff rules based on Bed, Floor, WardClass, and Comfort Tier.
   */
  async resolveBedTariff({ bedId, floorId, wardClass, comfortTier, sharingType }) {
    let bed = null;
    if (bedId) {
      bed = await BedMaster.findById(bedId).populate('floorId').lean();
    }

    const resolvedWardClass = wardClass || bed?.wardClass || 'GENERAL_WARD';
    const resolvedFloorId = floorId || bed?.floorId?._id || bed?.floorId;
    const resolvedComfortTier = comfortTier || bed?.comfortTier || 'STANDARD';
    const resolvedSharingType = sharingType || bed?.sharingType || 'GENERAL_WARD';

    let tariff = null;
    try {
      tariff = await tariffResolver.resolve({
        category: 'BED_CHARGES',
        wardClass: resolvedWardClass,
        floorId: resolvedFloorId,
        comfortTier: resolvedComfortTier,
        sharingType: resolvedSharingType,
        visitType: 'IPD',
      });
    } catch {
      // Fallback defaults if no rule published — centralized in config
      const isCritical = /ICU|CCU|NICU|PICU|HDU/i.test(resolvedWardClass);
      const isDeluxe = /DELUXE|SUITE|PRIVATE/i.test(resolvedWardClass) || resolvedComfortTier === 'DELUXE';
      
      const defaults = config.billingDefaults || {};
      const fallbackDaily = isCritical
        ? (defaults.fallbackDailyRates?.ICU || 8000)
        : isDeluxe
        ? (defaults.fallbackDailyRates?.DELUXE || 4000)
        : (defaults.fallbackDailyRates?.STANDARD || 1500);

      const fallbackHourly = Math.round(fallbackDaily / 24);

      const fallbackMinAdv = isCritical
        ? (defaults.fallbackMinAdvance?.ICU || 20000)
        : isDeluxe
        ? (defaults.fallbackMinAdvance?.DELUXE || 12000)
        : (defaults.fallbackMinAdvance?.STANDARD || 5000);

      tariff = {
        amount: fallbackDaily,
        dailyRate: fallbackDaily,
        hourlyRate: fallbackHourly,
        minAdvanceDeposit: fallbackMinAdv,
        gracePeriodMinutes: defaults.defaultGracePeriodMinutes || 60,
        unit: 'PER_DAY',
        explanation: 'Default Configured Base Tariff',
      };
    }

    const dailyRate = bed?.dailyRateOverride != null && bed.dailyRateOverride > 0
      ? bed.dailyRateOverride
      : tariff.dailyRate;

    const hourlyRate = bed?.hourlyRateOverride != null && bed.hourlyRateOverride > 0
      ? bed.hourlyRateOverride
      : (tariff.hourlyRate || Math.round(dailyRate / 24));

    const minAdvanceDeposit = bed?.minAdvanceDepositOverride != null && bed.minAdvanceDepositOverride >= 0
      ? bed.minAdvanceDepositOverride
      : (tariff.minAdvanceDeposit || 0);

    return {
      dailyRate,
      hourlyRate,
      minAdvanceDeposit,
      gracePeriodMinutes: tariff.gracePeriodMinutes || 60,
      wardClass: resolvedWardClass,
      comfortTier: resolvedComfortTier,
      sharingType: resolvedSharingType,
      floorId: resolvedFloorId,
      ruleId: tariff.ruleId || null,
      explanation: tariff.explanation,
    };
  }

  /**
   * Calculate exact pro-rata stay duration and financial charges across all bed allocation segments.
   */
  async calculateBedOccupancyCharges(admissionId, asOfDate = new Date()) {
    const allocations = await BedAllocation.find({ admissionId })
      .populate('bedId')
      .populate('roomId')
      .populate('floorId')
      .sort({ allocatedFrom: 1 })
      .lean();

    if (!allocations || allocations.length === 0) {
      return { totalBedStayAmount: 0, totalStayHours: 0, segments: [] };
    }

    const segments = [];
    let totalBedStayAmount = 0;
    let totalStayHours = 0;

    for (const alloc of allocations) {
      const from = new Date(alloc.allocatedFrom);
      const to = alloc.allocatedTo ? new Date(alloc.allocatedTo) : new Date(asOfDate);
      const durationMs = Math.max(0, to.getTime() - from.getTime());
      const rawHours = durationMs / (1000 * 60 * 60);

      // Tariff resolution for this bed segment
      const tariff = await this.resolveBedTariff({
        bedId: alloc.bedId?._id || alloc.bedId,
        floorId: alloc.floorId?._id || alloc.floorId,
        wardClass: alloc.wardClass,
        comfortTier: alloc.comfortTier,
        sharingType: alloc.sharingType,
      });

      const dailyRate = alloc.dailyRateApplied > 0 ? alloc.dailyRateApplied : tariff.dailyRate;
      const hourlyRate = alloc.hourlyRateApplied > 0 ? alloc.hourlyRateApplied : tariff.hourlyRate;
      const graceMin = tariff.gracePeriodMinutes || 60;

      const fullDays = Math.floor(rawHours / 24);
      const remainingHoursFloat = rawHours % 24;
      let billableRemainingHours = Math.floor(remainingHoursFloat);
      const remainingMinutes = (remainingHoursFloat - billableRemainingHours) * 60;

      if (remainingMinutes > graceMin) {
        billableRemainingHours += 1;
      }

      // Segment total calculation
      const segmentAmount = (fullDays * dailyRate) + (billableRemainingHours * hourlyRate);

      segments.push({
        allocationId: alloc._id,
        bedNumber: alloc.bedId?.bedNumber || 'Bed',
        bedLabel: alloc.bedId?.bedLabel || alloc.wardClass,
        wardClass: alloc.wardClass,
        comfortTier: alloc.comfortTier || 'STANDARD',
        floorName: alloc.floorId?.floorName || `Floor ${alloc.floorId?.floorNumber || 1}`,
        allocatedFrom: from,
        allocatedTo: alloc.allocatedTo ? to : null,
        isActive: !alloc.allocatedTo,
        durationMs,
        fullDays,
        billableRemainingHours,
        totalHoursFormatted: rawHours.toFixed(1),
        dailyRate,
        hourlyRate,
        segmentAmount,
      });

      totalBedStayAmount += segmentAmount;
      totalStayHours += rawHours;
    }

    return {
      totalBedStayAmount,
      totalStayHours: parseFloat(totalStayHours.toFixed(1)),
      segments,
    };
  }

  /**
   * Get complete real-time running financial ledger.
   */
  async getRunningLedger(admissionId) {
    const admission = await IPDAdmission.findById(admissionId)
      .populate('patientId', 'firstName lastName mrn age gender phone')
      .populate('primaryDoctorId', 'firstName lastName employeeId position')
      .populate('admittingDepartmentId', 'name code')
      .populate('currentBedId', 'bedNumber bedLabel wardClass comfortTier sharingType')
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

    // 1. Calculate live bed occupancy charges
    const bedChargesData = await this.calculateBedOccupancyCharges(admission._id);

    // 2. Fetch all advance deposit receipts
    const deposits = await AdvanceDeposit.find({ admissionId: admission._id })
      .populate('collectedBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .lean();

    const totalDeposits = deposits.reduce((sum, d) => sum + (d.isRefunded ? 0 : d.amount), 0);

    // 3. Itemize charges from existing Bill lineItems
    const rawLineItems = bill?.lineItems || [];
    const otherCharges = rawLineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

    // Combined Gross Billed Amount (Live Bed Stay + Other Clinical Charges)
    const totalGrossBilled = otherCharges + bedChargesData.totalBedStayAmount;
    const discountAmount = bill ? (bill.discountAmount || 0) : 0;
    const netPayable = Math.max(0, totalGrossBilled - discountAmount);
    const outstandingDue = Math.max(0, netPayable - totalDeposits);
    const excessCredit = Math.max(0, totalDeposits - netPayable);

    // Category breakdown
    const categoryBreakdown = {
      BED_CHARGES: bedChargesData.totalBedStayAmount,
      PHARMACY: rawLineItems.filter(i => i.category === 'PHARMACY').reduce((sum, i) => sum + i.lineTotal, 0),
      DIAGNOSTICS: rawLineItems.filter(i => i.category === 'DIAGNOSTICS').reduce((sum, i) => sum + i.lineTotal, 0),
      PROCEDURE: rawLineItems.filter(i => i.category === 'PROCEDURE').reduce((sum, i) => sum + i.lineTotal, 0),
      CONSULTATION: rawLineItems.filter(i => i.category === 'CONSULTATION').reduce((sum, i) => sum + i.lineTotal, 0),
      REGISTRATION: rawLineItems.filter(i => i.category === 'REGISTRATION').reduce((sum, i) => sum + i.lineTotal, 0),
    };

    return {
      admission,
      bill,
      lineItems: rawLineItems,
      bedChargesData,
      deposits,
      categoryBreakdown,
      financialSummary: {
        totalGrossBilled,
        otherCharges,
        bedStayCharges: bedChargesData.totalBedStayAmount,
        totalStayHours: bedChargesData.totalStayHours,
        discountAmount,
        netPayable,
        totalAdvanceDeposited: totalDeposits,
        outstandingDue,
        excessCredit,
        status: bill ? bill.status : 'OPEN',
      },
    };
  }

  /**
   * Record Advance Deposit with ACID transaction and idempotency protection.
   */
  async recordAdvanceDeposit(admissionId, depositData, staffId) {
    // Idempotency check
    if (depositData.idempotencyKey) {
      const existing = await AdvanceDeposit.findOne({ idempotencyKey: depositData.idempotencyKey }).lean();
      if (existing) return existing;
    }

    const session = await mongoose.startSession();
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

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
            amount: parseFloat(depositData.amount),
            paymentMethod: depositData.paymentMethod || 'UPI',
            transactionReference: depositData.transactionReference || '',
            depositType: depositData.depositType || 'ADMISSION_ADVANCE',
            idempotencyKey: depositData.idempotencyKey || null,
            collectedBy: staffId,
            notes: depositData.notes || '',
          },
        ],
        { session }
      );
      const deposit = depositDocs[0];

      // Atomically update Bill advanceCollected
      if (admission.billId) {
        await Bill.findByIdAndUpdate(
          admission.billId,
          {
            $inc: { advanceCollected: deposit.amount },
          },
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

  // ── Daily Charge Ingestion ──
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
    const addedByStaff = staffId || admission.primaryDoctorId?._id || admission.admittedBy;

    // 1. Resolve Bed Tariff
    const bedTariff = await this.resolveBedTariff({
      bedId: bed?._id,
      floorId: bed?.floorId,
      wardClass,
      comfortTier: bed?.comfortTier,
      sharingType: bed?.sharingType,
    });

    newLineItems.push({
      eventType: 'BED_STAY_BILLED',
      description: `Daily Bed Charge — ${bed.bedLabel} (${wardClass}, ${bed.comfortTier || 'STANDARD'}) [${dateStr}]`,
      category: 'BED_CHARGES',
      snapshotPrice: bedTariff.dailyRate,
      quantity: 1,
      lineTotal: bedTariff.dailyRate,
      snapshotRuleId: bedTariff.ruleId,
      addedBy: addedByStaff,
    });

    // 2. Nursing Care Charge (via tariff or configured defaults)
    const defaults = config.billingDefaults || {};
    let nursingRate = wardClass.includes('ICU')
      ? (defaults.nursingCareRates?.ICU || 1500)
      : (defaults.nursingCareRates?.STANDARD || 500);

    try {
      const nursingTariff = await tariffResolver.resolve({
        category: 'PROCEDURE',
        wardClass,
        visitType: 'IPD',
      });
      if (nursingTariff?.amount > 0) nursingRate = nursingTariff.amount;
    } catch {
      // Use configured default rate
    }

    newLineItems.push({
      eventType: 'PROCEDURE_PERFORMED',
      description: `Nursing Care Fee — (${wardClass}) [${dateStr}]`,
      category: 'PROCEDURE',
      snapshotPrice: nursingRate,
      quantity: 1,
      lineTotal: nursingRate,
      addedBy: addedByStaff,
    });

    // 3. RMO Doctor Round Charge (via tariff or configured defaults)
    let rmoRate = defaults.rmoRoundCharge || 400;
    try {
      const rmoTariff = await tariffResolver.resolve({
        category: 'CONSULTATION',
        wardClass,
        visitType: 'IPD',
      });
      if (rmoTariff?.amount > 0) rmoRate = rmoTariff.amount;
    } catch {
      // Use configured default rate
    }

    newLineItems.push({
      eventType: 'CONSULTATION_COMPLETED',
      description: `Resident Doctor (RMO) Visit [${dateStr}]`,
      category: 'CONSULTATION',
      snapshotPrice: rmoRate,
      quantity: 1,
      lineTotal: rmoRate,
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

  /**
   * Finalize settlement and close bill during discharge.
   */
  async finalizeSettlement(admissionId, settlementData, staffId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admission = await IPDAdmission.findById(admissionId).session(session);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');

      let bill = await Bill.findById(admission.billId).session(session);
      if (!bill) throw new AppError('Inpatient bill not found', 404, 'NOT_FOUND');

      // 1. Calculate final bed stay charges and append to bill lineItems
      const bedCharges = await this.calculateBedOccupancyCharges(admission._id);
      for (const seg of bedCharges.segments) {
        bill.lineItems.push({
          eventType: 'BED_STAY_BILLED',
          category: 'BED_CHARGES',
          description: `Bed Stay — ${seg.bedLabel} (${seg.wardClass}, ${seg.floorName}) [${seg.fullDays}d ${seg.billableRemainingHours}h]`,
          quantity: 1,
          snapshotPrice: seg.segmentAmount,
          lineTotal: seg.segmentAmount,
          addedBy: staffId,
          addedAt: new Date(),
        });
      }

      // Recompute bill totals
      const totalBilled = bill.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
      bill.billedAmount = totalBilled;

      const deposits = await AdvanceDeposit.find({ admissionId: admission._id }).session(session);
      const totalDeposits = deposits.reduce((sum, d) => sum + (d.isRefunded ? 0 : d.amount), 0);
      bill.advanceCollected = totalDeposits;

      const discount = parseFloat(settlementData.discountAmount || 0);
      bill.discountAmount = discount;

      const netAmount = Math.max(0, totalBilled - discount);
      const remainingDue = Math.max(0, netAmount - totalDeposits);
      const excessRefund = Math.max(0, totalDeposits - netAmount);

      if (remainingDue > 0 && settlementData.payment) {
        bill.payments.push({
          amount: remainingDue,
          method: settlementData.payment.method || 'UPI',
          reference: settlementData.payment.reference || '',
          recordedBy: staffId,
          recordedAt: new Date(),
        });
        bill.collectedAmount = (bill.collectedAmount || 0) + remainingDue;
      }

      if (excessRefund > 0 && settlementData.issueRefund) {
        bill.adjustments.push({
          type: 'REFUND',
          amount: excessRefund,
          reason: 'Discharge Excess Advance Deposit Refund',
          issuedBy: staffId,
          issuedAt: new Date(),
          status: 'APPROVED',
          approvedBy: staffId,
          approvedAt: new Date(),
        });
        bill.adjustedAmount = (bill.adjustedAmount || 0) + excessRefund;
      }

      bill.outstandingAmount = 0;
      bill.status = 'FINALIZED';
      bill.finalizedBy = staffId;
      bill.finalizedAt = new Date();

      await bill.save({ session });

      // Mark billing clearance
      const IPDClearance = require('../discharge/ipd-clearance.model');
      await IPDClearance.findOneAndUpdate(
        { admissionId: admission._id },
        {
          $set: {
            'billingClearance.isCleared': true,
            'billingClearance.clearedBy': staffId,
            'billingClearance.clearedAt': new Date(),
            'billingClearance.notes': `Settled in full (Bill #${bill.billNumber})`,
          },
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: 'Final settlement processed and bill finalized successfully',
        bill,
      };
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }
}

module.exports = new IPDBillingService();
