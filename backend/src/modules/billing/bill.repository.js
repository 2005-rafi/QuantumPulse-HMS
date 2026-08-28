const Bill = require('./bill.model');

class BillRepository {
  async create(data, options = {}) {
    if (options.session) {
      const [doc] = await Bill.create([data], { session: options.session });
      return doc;
    }
    return Bill.create(data);
  }

  async findByVisitId(visitId, options = {}) {
    return Bill.findOne({ visitId }, null, options)
      .populate('lineItems.addedBy', 'fullName')
      .populate('payments.recordedBy', 'fullName')
      .populate('adjustments.issuedBy', 'fullName')
      .populate('adjustments.approvedBy', 'fullName')
      .populate('generatedBy', 'fullName')
      .populate('finalizedBy', 'fullName')
      .lean();
  }

  async findById(id, options = {}) {
    return Bill.findById(id, null, options)
      .populate('lineItems.addedBy', 'fullName')
      .populate('payments.recordedBy', 'fullName')
      .populate('adjustments.issuedBy', 'fullName')
      .populate('generatedBy', 'fullName')
      .populate('patientId', 'firstName lastName mrn')
      .lean();
  }

  async findByPatientId(patientId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const [items, total] = await Promise.all([
      Bill.find({ patientId })
        .sort({ serviceDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bill.countDocuments({ patientId }),
    ]);
    return { items, total, page, limit };
  }

  async listBills(filters = {}, options = {}) {
    const { QueryContext, QueryBuilder, BillQueryConfig } = require('../../core/query');

    const queryContext = new QueryContext({
      filters,
      page: options.page || 1,
      limit: options.limit || 20,
      sortBy: options.sortBy || 'serviceDate',
      sortOrder: options.sortOrder || 'desc',
    });

    const compiled = QueryBuilder.compile(queryContext, BillQueryConfig);
    if (filters.outstandingOnly) {
      if (compiled.filter.$and) {
        compiled.filter.$and.push({ outstandingAmount: { $gt: 0 } });
      } else if (Object.keys(compiled.filter).length > 0) {
        compiled.filter = { $and: [compiled.filter, { outstandingAmount: { $gt: 0 } }] };
      } else {
        compiled.filter.outstandingAmount = { $gt: 0 };
      }
    }

    const [items, total] = await Promise.all([
      Bill.find(compiled.filter)
        .select(compiled.projection)
        .populate('patientId', 'firstName lastName mrn')
        .populate('generatedBy', 'fullName')
        .sort(compiled.sort)
        .skip(compiled.pagination.skip)
        .limit(compiled.pagination.limit)
        .lean(),
      Bill.countDocuments(compiled.filter),
    ]);

    return { items, total, page: compiled.page, limit: compiled.limit, pages: Math.ceil(total / compiled.limit) };
  }

  async appendLineItem(billId, lineItem, session = null) {
    const opts = session ? { session } : {};
    const bill = await Bill.findByIdAndUpdate(
      billId,
      {
        $push: { lineItems: lineItem },
      },
      { returnDocument: 'after', ...opts }
    );
    // Recompute billedAmount
    const newBilledAmount = bill.lineItems.reduce((sum, li) => sum + (li.lineTotal || 0), 0);
    return Bill.findByIdAndUpdate(
      billId,
      {
        billedAmount: newBilledAmount,
        outstandingAmount: newBilledAmount - bill.collectedAmount - bill.adjustedAmount,
      },
      { returnDocument: 'after', ...opts }
    ).lean();
  }

  async recordPayment(billId, payment, session = null) {
    const opts = session ? { session } : {};
    const bill = await Bill.findByIdAndUpdate(
      billId,
      { $push: { payments: payment } },
      { returnDocument: 'after', ...opts }
    );
    const newCollected = bill.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return Bill.findByIdAndUpdate(
      billId,
      {
        collectedAmount: newCollected,
        outstandingAmount: Math.max(0, bill.billedAmount - newCollected - bill.adjustedAmount),
      },
      { returnDocument: 'after', ...opts }
    ).lean();
  }

  async finalizeBill(billId, staffId, session = null) {
    const opts = session ? { session } : {};
    return Bill.findByIdAndUpdate(
      billId,
      { status: 'FINALIZED', finalizedBy: staffId, finalizedAt: new Date() },
      { returnDocument: 'after', ...opts }
    ).lean();
  }

  async appendAdjustment(billId, adjustment, session = null) {
    const opts = session ? { session } : {};
    return Bill.findByIdAndUpdate(
      billId,
      { $push: { adjustments: adjustment } },
      { returnDocument: 'after', ...opts }
    ).lean();
  }

  async approveAdjustment(billId, adjustmentId, adminId, session = null) {
    const opts = session ? { session } : {};
    const bill = await Bill.findOneAndUpdate(
      { _id: billId, 'adjustments._id': adjustmentId },
      {
        $set: {
          'adjustments.$.status': 'APPROVED',
          'adjustments.$.approvedBy': adminId,
          'adjustments.$.approvedAt': new Date(),
        },
      },
      { returnDocument: 'after', ...opts }
    );
    if (!bill) return null;
    // Recompute adjustedAmount and outstandingAmount
    const newAdjusted = bill.adjustments
      .filter(a => a.status === 'APPROVED')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    return Bill.findByIdAndUpdate(
      billId,
      {
        adjustedAmount: newAdjusted,
        outstandingAmount: Math.max(0, bill.billedAmount - bill.collectedAmount - newAdjusted),
      },
      { returnDocument: 'after', ...opts }
    ).lean();
  }

  /**
   * Generate a unique bill number: BILL-YYYYMMDD-NNNNN
   * Uses atomic counter in a settings-like doc.
   */
  async generateBillNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BILL-${dateStr}-`;
    const count = await Bill.countDocuments({ billNumber: { $regex: `^${prefix}` } });
    const serial = String(count + 1).padStart(5, '0');
    return `${prefix}${serial}`;
  }

  // -- Analytics Pipelines --------------------------------------------------

  async aggregateRevenueSummary(from, to) {
    const match = {
      status: { $ne: 'CANCELLED' },
      serviceDate: { $gte: new Date(from), $lte: new Date(to) },
    };
    const result = await Bill.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$billedAmount' },
          totalCollected: { $sum: '$collectedAmount' },
          totalAdjusted: { $sum: '$adjustedAmount' },
          totalOutstanding: { $sum: '$outstandingAmount' },
          billCount: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { totalBilled: 0, totalCollected: 0, totalAdjusted: 0, totalOutstanding: 0, billCount: 0 };
  }

  async aggregateByCategory(from, to) {
    return Bill.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, serviceDate: { $gte: new Date(from), $lte: new Date(to) } } },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: '$lineItems.category',
          totalAmount: { $sum: '$lineItems.lineTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
  }

  async aggregateTrend(from, to, granularity = 'day') {
    const groupId = granularity === 'month'
      ? { year: { $year: '$serviceDate' }, month: { $month: '$serviceDate' } }
      : granularity === 'week'
        ? { year: { $isoWeekYear: '$serviceDate' }, week: { $isoWeek: '$serviceDate' } }
        : { year: { $year: '$serviceDate' }, month: { $month: '$serviceDate' }, day: { $dayOfMonth: '$serviceDate' } };

    return Bill.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, serviceDate: { $gte: new Date(from), $lte: new Date(to) } } },
      {
        $group: {
          _id: groupId,
          billed: { $sum: '$billedAmount' },
          collected: { $sum: '$collectedAmount' },
          outstanding: { $sum: '$outstandingAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
  }

  async aggregatePaymentMethods(from, to) {
    return Bill.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, serviceDate: { $gte: new Date(from), $lte: new Date(to) } } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', totalAmount: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1 } },
    ]);
  }

  async aggregateDayOfWeekHeatmap(from, to) {
    return Bill.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, serviceDate: { $gte: new Date(from), $lte: new Date(to) } } },
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$serviceDate' } },
          totalBilled: { $sum: '$billedAmount' },
          totalCollected: { $sum: '$collectedAmount' },
          billCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.dayOfWeek': 1 } },
    ]);
  }

  async aggregateStatusWaterfall(from, to) {
    return Bill.aggregate([
      { $match: { serviceDate: { $gte: new Date(from), $lte: new Date(to) } } },
      {
        $group: {
          _id: '$status',
          totalBilled: { $sum: '$billedAmount' },
          totalCollected: { $sum: '$collectedAmount' },
          totalAdjusted: { $sum: '$adjustedAmount' },
          totalOutstanding: { $sum: '$outstandingAmount' },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async getOutstandingBills(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      Bill.find({ outstandingAmount: { $gt: 0 }, status: { $ne: 'CANCELLED' } })
        .populate('patientId', 'firstName lastName mrn')
        .sort({ serviceDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bill.countDocuments({ outstandingAmount: { $gt: 0 }, status: { $ne: 'CANCELLED' } }),
    ]);
    return { items, total, page, limit };
  }
}

module.exports = new BillRepository();
