const billRepository = require('./bill.repository');
const tariffResolver = require('../tariff/tariff-resolver.service');
const AppError = require('../../core/errors/app-error');
const { withTransaction } = require('../../core/database/transaction');
const { BILL_STATUS } = require('./bill.model');

/**
 * BillingService -- Central financial fact recorder.
 *
 * SOLID:
 *   SRP -- Owns all financial recording. No clinical logic.
 *   OCP -- New event types added by extending the event type enum, not this class.
 *   DIP -- Depends on billRepository and tariffResolver abstractions.
 *
 * Pipeline: BillableEvent -> TariffResolver -> BillLineItem -> Bill
 */
class BillingService {

  /**
   * Process a billable event from a clinical module.
   * This is the single entry point for all charge creation.
   *
   * @param {object} event - BillableEvent
   * @param {string} event.type - VISIT_REGISTERED | CONSULTATION_COMPLETED | LAB_ORDER_ACCEPTED | MEDICINE_DISPENSED | PROCEDURE_PERFORMED
   * @param {string} event.visitId
   * @param {string} event.patientId
   * @param {string} event.triggeredBy - Staff ObjectId
   * @param {Date}   event.triggeredAt
   * @param {object} event.resolutionContext - { category, testCode, serviceMasterId, departmentId, tariffGrade, staffId, appointmentType, quantity }
   * @param {number} [event.preResolvedPrice] - For MEDICINE_DISPENSED: pharmacy owns the price
   * @param {string} [event.description] - Human-readable description for the line item
   * @param {object} [session] - Mongoose session for atomic operation
   */
  async processBillableEvent(event, session = null) {
    const { type, visitId, patientId, triggeredBy, resolutionContext, preResolvedPrice, description } = event;

    // 1. Find or create the Bill for this visit
    let bill = await billRepository.findByVisitId(visitId);

    if (!bill) {
      // Only VISIT_REGISTERED creates the Bill
      const billNumber = await billRepository.generateBillNumber();
      let issuingArea = 'SYSTEM';
      if (type === 'VISIT_REGISTERED') {
        issuingArea = 'RECEPTION';
      } else if (type === 'MEDICINE_DISPENSED') {
        issuingArea = 'PHARMACY';
      } else {
        issuingArea = 'BILLING';
      }
      bill = await billRepository.create({
        billNumber,
        visitId,
        patientId,
        issuingArea,
        visitType: resolutionContext && resolutionContext.visitType ? resolutionContext.visitType : 'OPD',
        serviceDate: new Date(),
        departmentId: resolutionContext && resolutionContext.departmentId ? resolutionContext.departmentId : null,
        lineItems: [],
        payments: [],
        adjustments: [],
        billedAmount: 0,
        collectedAmount: 0,
        adjustedAmount: 0,
        outstandingAmount: 0,
        status: BILL_STATUS.OPEN,
        generatedBy: triggeredBy,
      }, { session });
    }

    // 2. Assert bill is still OPEN
    if (bill.status !== BILL_STATUS.OPEN) {
      throw new AppError('BUSINESS_002', `Cannot add charges to a ${bill.status} bill`);
    }

    // 3. Resolve price
    let resolvedAmount, ruleId, explanation;

    if (preResolvedPrice !== undefined && preResolvedPrice !== null) {
      // Pharmacy provides pre-resolved price from MedicinePrice catalog
      resolvedAmount = preResolvedPrice;
      ruleId = null;
      explanation = 'Medicine price from pharmacy catalog';
    } else {
      // Backend re-resolves authoritatively -- never trust frontend amount
      const resolution = await tariffResolver.resolve(resolutionContext);
      resolvedAmount = resolution.amount;
      ruleId = resolution.ruleId;
      explanation = resolution.explanation;
    }

    // 4. Build line item with GST Statutory Attributes
    const quantity = resolutionContext && resolutionContext.quantity ? resolutionContext.quantity : 1;
    const category = (resolutionContext && resolutionContext.category) ? resolutionContext.category : this._categoryFromEventType(type);
    const lineTotal = resolvedAmount * quantity;

    // Healthcare clinical services (SAC 999312) are GST exempt (0%).
    // Medicines and pharmacy consumables (HSN 3004) are taxable (12% standard: 6% CGST + 6% SGST).
    const isPharmacy = category === 'PHARMACY' || type === 'MEDICINE_DISPENSED';
    const hsnSacCode = (resolutionContext && resolutionContext.hsnSacCode) || (isPharmacy ? '3004' : '999312');
    const taxRate = (resolutionContext && resolutionContext.taxRate !== undefined) ? resolutionContext.taxRate : (isPharmacy ? 12 : 0);

    const taxableAmount = isPharmacy ? lineTotal : 0;
    const cgstAmount = taxRate > 0 ? Number(((taxableAmount * (taxRate / 2)) / 100).toFixed(2)) : 0;
    const sgstAmount = taxRate > 0 ? Number(((taxableAmount * (taxRate / 2)) / 100).toFixed(2)) : 0;
    const totalTaxAmount = Number((cgstAmount + sgstAmount).toFixed(2));

    const lineItem = {
      eventType: type,
      category,
      description: description || this._defaultDescription(type, resolutionContext),
      quantity,
      snapshotPrice: resolvedAmount,
      snapshotRuleId: ruleId,
      snapshotRulePath: explanation,
      lineTotal,
      hsnSacCode,
      taxRate,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTaxAmount,
      addedBy: triggeredBy,
      addedAt: new Date(),
    };

    // 5. Append line item atomically
    return billRepository.appendLineItem(bill._id, lineItem, session);
  }

  _categoryFromEventType(type) {
    const map = {
      VISIT_REGISTERED: 'REGISTRATION',
      CONSULTATION_COMPLETED: 'CONSULTATION',
      LAB_ORDER_ACCEPTED: 'DIAGNOSTICS',
      MEDICINE_DISPENSED: 'PHARMACY',
      PROCEDURE_PERFORMED: 'PROCEDURE',
      SURGERY_PERFORMED: 'SURGERY',
      SURGICAL_CONSUMABLE_BILLED: 'PROCEDURE',
      BED_STAY_BILLED: 'BED_CHARGES',
      BED_TRANSFERRED: 'BED_CHARGES',
      NURSING_CARE_BILLED: 'BED_SUPPORT',
      RMO_ROUND_BILLED: 'CONSULTATION',
    };
    return map[type] || 'REGISTRATION';
  }

  _defaultDescription(type, ctx) {
    const map = {
      VISIT_REGISTERED: 'OPD Registration Fee',
      CONSULTATION_COMPLETED: 'Consultation Fee',
      LAB_ORDER_ACCEPTED: `Lab Test${ctx && ctx.testCode ? ` (${ctx.testCode})` : ''}`,
      MEDICINE_DISPENSED: (ctx && ctx.medicineName) ? ctx.medicineName : 'Medicine Dispensed',
      PROCEDURE_PERFORMED: 'Procedure Fee',
      SURGERY_PERFORMED: (ctx && ctx.procedureName) ? `Surgical Procedure: ${ctx.procedureName}` : 'Surgical Procedure',
      SURGICAL_CONSUMABLE_BILLED: (ctx && ctx.itemName) ? `OT Consumable: ${ctx.itemName}` : 'Surgical Consumable',
      BED_STAY_BILLED: 'Daily Bed Accommodation Charge',
      BED_TRANSFERRED: 'Bed Transfer Adjustment',
      NURSING_CARE_BILLED: 'Nursing & Bed Support Care',
      RMO_ROUND_BILLED: 'Resident Doctor (RMO) Ward Round',
    };
    return map[type] || type;
  }

  async getBillForVisit(visitId) {
    return billRepository.findByVisitId(visitId);
  }

  async getBillById(id) {
    const bill = await billRepository.findById(id);
    if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
    return bill;
  }

  async listBills(filters, options) {
    return billRepository.listBills(filters, options);
  }

  async recordPayment(billId, paymentData, staffId) {
    const recorded = await withTransaction(async (session) => {
      const bill = await billRepository.findById(billId, { session });
      if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
      if (bill.status === BILL_STATUS.CANCELLED) throw new AppError('BUSINESS_002', 'Cannot record payment on a cancelled bill');

      const payment = {
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || '',
        recordedBy: staffId,
        recordedAt: new Date(),
      };
      return billRepository.recordPayment(billId, payment, session);
    });

    if (recorded?.admissionId) {
      try {
        if (recorded.outstandingAmount <= 0) {
          const IPDClearance = require('../ipd/discharge/ipd-clearance.model');
          await IPDClearance.findOneAndUpdate(
            { admissionId: recorded.admissionId },
            {
              $set: {
                'billingClearance.isCleared': true,
                'billingClearance.clearedBy': staffId,
                'billingClearance.clearedAt': new Date(),
                'billingClearance.notes': `Bill #${recorded.billNumber} balance cleared in full`,
                'billingClearance.balanceDue': 0,
                'billingClearance.totalBilled': recorded.billedAmount,
                'billingClearance.totalCollected': (recorded.collectedAmount || 0) + (recorded.advanceCollected || 0),
              },
            }
          );
        }

        const { broadcastIPDLedgerUpdate } = require('../realtime/patient-status-events.service');
        broadcastIPDLedgerUpdate({
          admissionId: recorded.admissionId,
          patientId: recorded.patientId,
          eventType: 'PAYMENT_RECORDED',
          billId: recorded._id,
          amount: paymentData.amount,
          outstandingDue: recorded.outstandingAmount,
          isSettled: recorded.outstandingAmount <= 0 && recorded.status === 'FINALIZED',
        });
      } catch (_) {}
    }

    return recorded;
  }

  async finalizeBill(billId, staffId) {
    return withTransaction(async (session) => {
      const bill = await billRepository.findById(billId, { session });
      if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
      if (bill.status !== BILL_STATUS.OPEN) {
        throw new AppError('BUSINESS_002', `Bill is already ${bill.status}`);
      }
      if (bill.outstandingAmount > 0) {
        throw new AppError(
          'BUSINESS_002',
          `Cannot finalize bill with outstanding balance of ₹${bill.outstandingAmount}. Please collect full payment or record an approved adjustment first.`
        );
      }

      const finalized = await billRepository.finalizeBill(billId, staffId, session);

      // 1. If this bill belongs to an Outpatient / Emergency Visit, complete the visit!
      if (bill.visitId) {
        const Visit = require('../visits/visit.model');
        const updatedVisit = await Visit.findByIdAndUpdate(
          bill.visitId,
          {
            status: 'COMPLETED',
            'billing.totalAmount': finalized.billedAmount,
            'billing.billedBy': staffId,
            'billing.billedAt': new Date(),
          },
          { session, new: true }
        );

        try {
          const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
          broadcastPatientStatus({
            patientId: bill.patientId,
            visitId: bill.visitId,
            tokenString: updatedVisit?.tokenString,
            status: 'COMPLETED',
            stage: 'Billing Settled & Encounter Completed',
            details: {
              billNumber: finalized.billNumber,
              billedAmount: finalized.billedAmount,
            },
          });
        } catch (_) {}
      }

      // 2. If this bill belongs to an Inpatient Admission, mark billing clearance cleared!
      if (bill.admissionId) {
        try {
          const IPDClearance = require('../ipd/discharge/ipd-clearance.model');
          await IPDClearance.findOneAndUpdate(
            { admissionId: bill.admissionId },
            {
              $set: {
                'billingClearance.isCleared': true,
                'billingClearance.clearedBy': staffId,
                'billingClearance.clearedAt': new Date(),
                'billingClearance.notes': `Bill #${finalized.billNumber} settled in full`,
                'billingClearance.balanceDue': 0,
                'billingClearance.totalBilled': finalized.billedAmount,
                'billingClearance.totalCollected': (finalized.collectedAmount || 0) + (finalized.advanceCollected || 0),
              },
            },
            { session }
          );
        } catch (e) {
          // ignore if clearance doc does not exist yet
        }

        try {
          const { broadcastIPDLedgerUpdate } = require('../realtime/patient-status-events.service');
          broadcastIPDLedgerUpdate({
            admissionId: bill.admissionId,
            patientId: bill.patientId,
            eventType: 'BILL_FINALIZED',
            isSettled: true,
            outstandingDue: 0,
            billNumber: finalized.billNumber,
            totalGrossBilled: finalized.billedAmount,
            totalAdvanceDeposited: finalized.advanceCollected || finalized.collectedAmount,
          });
        } catch (_) {}
      }

      return finalized;
    });
  }

  async requestAdjustment(billId, adjustmentData, staffId) {
    const bill = await billRepository.findById(billId);
    if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
    if (bill.status !== BILL_STATUS.FINALIZED) {
      throw new AppError('BUSINESS_002', 'Adjustments can only be made to FINALIZED bills');
    }
    const adjustment = {
      type: adjustmentData.type,
      amount: adjustmentData.amount,
      reason: adjustmentData.reason,
      issuedBy: staffId,
      issuedAt: new Date(),
      status: 'PENDING_APPROVAL',
    };
    return billRepository.appendAdjustment(billId, adjustment);
  }

  async approveAdjustment(billId, adjustmentId, adminId) {
    return withTransaction(async (session) => {
      const bill = await billRepository.findById(billId, { session });
      if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
      const adj = bill.adjustments && bill.adjustments.find(a => String(a._id) === String(adjustmentId));
      if (!adj) throw new AppError('NOT_FOUND', 'Adjustment not found');
      if (adj.status !== 'PENDING_APPROVAL') throw new AppError('BUSINESS_002', 'Adjustment is not pending approval');
      return billRepository.approveAdjustment(billId, adjustmentId, adminId, session);
    });
  }

  async getAnalyticsSummary(from, to) {
    return billRepository.aggregateRevenueSummary(from, to);
  }

  async getAnalyticsByCategory(from, to) {
    return billRepository.aggregateByCategory(from, to);
  }

  async getAnalyticsTrend(from, to, granularity) {
    return billRepository.aggregateTrend(from, to, granularity);
  }

  async getAnalyticsPaymentMethods(from, to) {
    return billRepository.aggregatePaymentMethods(from, to);
  }

  async getAnalyticsDayOfWeek(from, to) {
    return billRepository.aggregateDayOfWeekHeatmap(from, to);
  }

  async getAnalyticsStatusWaterfall(from, to) {
    return billRepository.aggregateStatusWaterfall(from, to);
  }

  async getOutstandingBills(page, limit) {
    return billRepository.getOutstandingBills(page, limit);
  }

  async addManualCharge(billId, chargeData, staffId) {
    return withTransaction(async (session) => {
      const bill = await billRepository.findById(billId, { session });
      if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
      if (bill.status !== BILL_STATUS.OPEN) {
        throw new AppError('BUSINESS_002', `Cannot add charges to a ${bill.status} bill`);
      }
      const quantity = Math.max(1, Number(chargeData.quantity) || 1);
      const snapshotPrice = Number(chargeData.price ?? chargeData.snapshotPrice ?? 0);
      const lineItem = {
        eventType: chargeData.eventType || 'PROCEDURE_PERFORMED',
        category: chargeData.category || 'PROCEDURE',
        description: chargeData.description || 'Clinical Procedure / Charge',
        quantity,
        snapshotPrice,
        snapshotRulePath: chargeData.snapshotRulePath || 'Billing Station Charge Capture',
        proofReference: chargeData.proofReference || '',
        lineTotal: quantity * snapshotPrice,
        addedBy: staffId,
        addedAt: new Date(),
      };
      return billRepository.appendLineItem(billId, lineItem, session);
    });
  }

  async getOrCreateBillForVisit(visitId, staffId, issuingArea = 'BILLING') {
    let bill = await billRepository.findByVisitId(visitId);
    if (!bill) {
      const Visit = require('../visits/visit.model');
      const visit = await Visit.findById(visitId);
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      const billNumber = await billRepository.generateBillNumber();
      await billRepository.create({
        billNumber,
        visitId,
        patientId: visit.patientId,
        visitType: visit.visitType || 'OPD',
        serviceDate: new Date(),
        departmentId: visit.departmentId || null,
        lineItems: [],
        payments: [],
        adjustments: [],
        billedAmount: 0,
        discountAmount: 0,
        collectedAmount: 0,
        advanceCollected: 0,
        adjustedAmount: 0,
        outstandingAmount: 0,
        status: BILL_STATUS.OPEN,
        generatedBy: staffId,
        issuingArea,
      });
      bill = await billRepository.findByVisitId(visitId);
    }
    return bill;
  }

  async getOrCreateBillForAdmission(admissionId, staffId, issuingArea = 'BILLING') {
    let bill = await billRepository.findByAdmissionId(admissionId);
    const IPDAdmission = require('../ipd/admission/ipd-admission.model');
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('NOT_FOUND', 'Inpatient admission not found');

    if (!bill && admission.billId) {
      bill = await billRepository.findById(admission.billId);
    }

    if (!bill) {
      const billNumber = await billRepository.generateBillNumber();
      const newBill = await billRepository.create({
        billNumber,
        admissionId: admission._id,
        patientId: admission.patientId,
        visitType: 'IPD',
        serviceDate: admission.admissionDate || new Date(),
        departmentId: admission.admittingDepartmentId || null,
        lineItems: [],
        payments: [],
        adjustments: [],
        billedAmount: 0,
        discountAmount: 0,
        collectedAmount: 0,
        advanceCollected: 0,
        adjustedAmount: 0,
        outstandingAmount: 0,
        status: BILL_STATUS.OPEN,
        generatedBy: staffId,
        issuingArea,
      });

      admission.billId = newBill._id;
      await admission.save();
      bill = await billRepository.findById(newBill._id);
    }

    // Synchronize live bed occupancy charges and advance payments for active open inpatient bills
    if (bill && bill.status === BILL_STATUS.OPEN) {
      try {
        const ipdBillingService = require('../ipd/billing/ipd-billing.service');
        const ledger = await ipdBillingService.getRunningLedger(admission._id);
        if (ledger && ledger.financialSummary) {
          const bedData = ledger.bedChargesData;
          const currentLineItems = bill.lineItems || [];
          const nonBedLineItems = currentLineItems.filter((i) => i.category !== 'BED_CHARGES');

          if (bedData && bedData.totalBedStayAmount > 0) {
            const bedItems = (bedData.segments && bedData.segments.length > 0)
              ? bedData.segments.map((seg) => {
                  const fromStr = new Date(seg.allocatedFrom).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  });
                  const toStr = seg.allocatedTo
                    ? new Date(seg.allocatedTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : 'Present';

                  const durationText = seg.fullDays > 0 && seg.billableRemainingHours > 0
                    ? `${seg.fullDays}d ${seg.billableRemainingHours}h`
                    : seg.fullDays > 0
                    ? `${seg.fullDays} Day(s)`
                    : `${seg.billableRemainingHours} Hr(s)`;

                  const rateDetail = seg.fullDays > 0
                    ? `@ ₹${seg.dailyRate}/day`
                    : `@ ₹${seg.hourlyRate}/hr`;

                  return {
                    eventType: 'BED_STAY_BILLED',
                    category: 'BED_CHARGES',
                    description: `Bed Accommodation: ${seg.bedLabel} (${seg.wardClass || 'Standard'}, ${seg.floorName || 'Floor 1'}) [${fromStr} – ${toStr}] — ${durationText} ${rateDetail}`,
                    quantity: seg.fullDays > 0 ? seg.fullDays : (seg.billableRemainingHours || 1),
                    snapshotPrice: seg.fullDays > 0 ? seg.dailyRate : (seg.hourlyRate || 0),
                    lineTotal: seg.segmentAmount,
                    proofReference: `Stay Duration: ${seg.totalHoursFormatted || 0} Hours`,
                    addedBy: staffId,
                    addedAt: new Date(),
                  };
                })
              : [
                  {
                    eventType: 'BED_STAY_BILLED',
                    category: 'BED_CHARGES',
                    description: `Bed Accommodation: ${bedData.activeBedLabel || 'Bed'} (${bedData.activeWardClass || 'Standard'}) — ${bedData.stayDurationFormatted || '1 Day'} @ ₹${bedData.dailyRate || 0}/day`,
                    quantity: bedData.billableDays || 1,
                    snapshotPrice: bedData.dailyRate || 0,
                    lineTotal: bedData.totalBedStayAmount,
                    proofReference: `Total Stay: ${bedData.totalStayHours || 0} Hours`,
                    addedBy: staffId,
                    addedAt: new Date(),
                  },
                ];

            bill.lineItems = [...nonBedLineItems, ...bedItems];
          } else {
            bill.lineItems = nonBedLineItems;
          }

          const newBilledAmount = bill.lineItems.reduce((sum, li) => sum + (li.lineTotal || 0), 0);
          bill.billedAmount = newBilledAmount;

          // Reconcile advance payments between IPD ledger and bill payments
          const advanceFromLedger = ledger.financialSummary.totalAdvanceDeposited || 0;
          const advanceFromPayments = (bill.payments || [])
            .filter((p) => p.reference && /DEPOSIT/i.test(p.reference))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          bill.advanceCollected = Math.max(advanceFromLedger, advanceFromPayments);

          // Regular counter collections (excluding advance deposits)
          const regularCollected = (bill.payments || [])
            .filter((p) => !p.reference || !/DEPOSIT/i.test(p.reference))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          bill.collectedAmount = regularCollected;

          const netDue = Math.max(
            0,
            bill.billedAmount - (bill.discountAmount || 0) - (bill.adjustedAmount || 0) - bill.collectedAmount - bill.advanceCollected
          );
          bill.outstandingAmount = netDue;

          const Bill = require('./bill.model');
          await Bill.findByIdAndUpdate(bill._id, {
            lineItems: bill.lineItems,
            billedAmount: bill.billedAmount,
            advanceCollected: bill.advanceCollected,
            collectedAmount: bill.collectedAmount,
            outstandingAmount: bill.outstandingAmount,
          });

          bill = await billRepository.findById(bill._id);
        }
      } catch (syncErr) {
        // Non-blocking sync fallback
      }
    }

    return bill;
  }

  /**
   * Get audited patient ledger summary across all line items and payments.
   */
  async getPatientLedgerSummary(billId) {
    const bill = await billRepository.findById(billId);
    if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');

    const lineItems = bill.lineItems || [];
    const categoryTotals = {
      REGISTRATION: 0,
      CONSULTATION: 0,
      DIAGNOSTICS: 0,
      PHARMACY: 0,
      PROCEDURE: 0,
      BED_CHARGES: 0,
      BED_SUPPORT: 0,
      SURGERY: 0,
      NURSING: 0,
    };

    lineItems.forEach((li) => {
      const cat = li.category || 'PROCEDURE';
      if (categoryTotals[cat] !== undefined) {
        categoryTotals[cat] += (li.lineTotal || 0);
      } else {
        categoryTotals.PROCEDURE += (li.lineTotal || 0);
      }
    });

    const grossCharges = lineItems.reduce((sum, li) => sum + (li.lineTotal || 0), 0);
    const discountAmount = bill.discountAmount || 0;
    const netBilled = Math.max(0, grossCharges - discountAmount);
    const totalCollected = (bill.collectedAmount || 0) + (bill.advanceCollected || 0);
    const approvedAdjustments = bill.adjustedAmount || 0;
    const outstandingDue = Math.max(0, netBilled - totalCollected - approvedAdjustments);
    const excessRefund = Math.max(0, totalCollected - netBilled);

    return {
      billId: bill._id,
      billNumber: bill.billNumber,
      status: bill.status,
      serviceDate: bill.serviceDate,
      grossCharges,
      discountAmount,
      netBilled,
      totalCollected,
      advanceCollected: bill.advanceCollected || 0,
      paymentCollected: bill.collectedAmount || 0,
      approvedAdjustments,
      outstandingDue,
      excessRefund,
      categoryTotals,
      lineItemsCount: lineItems.length,
      paymentsCount: (bill.payments || []).length,
    };
  }
}

module.exports = new BillingService();
