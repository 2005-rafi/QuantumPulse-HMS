const billRepository = require('./bill.repository');
const tariffResolver = require('../tariff/tariff-resolver');
const AppError = require('../../core/errors/AppError');
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
      bill = await billRepository.create({
        billNumber,
        visitId,
        patientId,
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

    // 4. Build line item
    const quantity = resolutionContext && resolutionContext.quantity ? resolutionContext.quantity : 1;
    const lineItem = {
      eventType: type,
      category: (resolutionContext && resolutionContext.category) ? resolutionContext.category : this._categoryFromEventType(type),
      description: description || this._defaultDescription(type, resolutionContext),
      quantity,
      snapshotPrice: resolvedAmount,
      snapshotRuleId: ruleId,
      snapshotRulePath: explanation,
      lineTotal: resolvedAmount * quantity,
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
    return withTransaction(async (session) => {
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
  }

  async finalizeBill(billId, staffId) {
    return withTransaction(async (session) => {
      const bill = await billRepository.findById(billId, { session });
      if (!bill) throw new AppError('NOT_FOUND', 'Bill not found');
      if (bill.status !== BILL_STATUS.OPEN) {
        throw new AppError('BUSINESS_002', `Bill is already ${bill.status}`);
      }
      return billRepository.finalizeBill(billId, staffId, session);
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
}

module.exports = new BillingService();
