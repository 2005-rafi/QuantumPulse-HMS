const billingService = require('./bill.service');
const { success, error: sendError } = require('../../core/responses');
const catchAsync = require('../../core/utils/catchAsync');
const { recordPaymentSchema, requestAdjustmentSchema } = require('./bill.validation');

class BillController {
  getBillByVisit = catchAsync(async (req, res) => {
    const bill = await billingService.getBillForVisit(req.params.visitId);
    return success(res, bill);
  });

  getBillById = catchAsync(async (req, res) => {
    const bill = await billingService.getBillById(req.params.id);
    return success(res, bill);
  });

  listBills = catchAsync(async (req, res) => {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.patientId) filters.patientId = req.query.patientId;
    if (req.query.from) filters.from = req.query.from;
    if (req.query.to) filters.to = req.query.to;
    if (req.query.outstandingOnly === 'true') filters.outstandingOnly = true;
    const options = { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 20 };
    const data = await billingService.listBills(filters, options);
    return success(res, data);
  });

  recordPayment = catchAsync(async (req, res) => {
    const { error, value } = recordPaymentSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const bill = await billingService.recordPayment(req.params.id, value, req.user.staffId);
    return success(res, bill, 'Payment recorded');
  });

  finalizeBill = catchAsync(async (req, res) => {
    const bill = await billingService.finalizeBill(req.params.id, req.user.staffId);
    return success(res, bill, 'Bill finalized');
  });

  requestAdjustment = catchAsync(async (req, res) => {
    const { error, value } = requestAdjustmentSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const bill = await billingService.requestAdjustment(req.params.id, value, req.user.staffId);
    return success(res, bill, 'Adjustment requested, pending admin approval');
  });

  approveAdjustment = catchAsync(async (req, res) => {
    const bill = await billingService.approveAdjustment(
      req.params.id,
      req.params.adjId,
      req.user.staffId
    );
    return success(res, bill, 'Adjustment approved');
  });

  // Analytics
  getAnalyticsSummary = catchAsync(async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) return sendError(res, 'VALIDATION_001', 'from and to dates are required', null, 400);
    const data = await billingService.getAnalyticsSummary(from, to);
    return success(res, data);
  });

  getAnalyticsByCategory = catchAsync(async (req, res) => {
    const data = await billingService.getAnalyticsByCategory(req.query.from, req.query.to);
    return success(res, data);
  });

  getAnalyticsTrend = catchAsync(async (req, res) => {
    const data = await billingService.getAnalyticsTrend(
      req.query.from,
      req.query.to,
      req.query.granularity || 'day'
    );
    return success(res, data);
  });

  getAnalyticsPaymentMethods = catchAsync(async (req, res) => {
    const data = await billingService.getAnalyticsPaymentMethods(req.query.from, req.query.to);
    return success(res, data);
  });

  getAnalyticsDayOfWeek = catchAsync(async (req, res) => {
    const data = await billingService.getAnalyticsDayOfWeek(req.query.from, req.query.to);
    return success(res, data);
  });

  getAnalyticsStatusWaterfall = catchAsync(async (req, res) => {
    const data = await billingService.getAnalyticsStatusWaterfall(req.query.from, req.query.to);
    return success(res, data);
  });

  getOutstandingBills = catchAsync(async (req, res) => {
    const data = await billingService.getOutstandingBills(
      parseInt(req.query.page) || 1,
      parseInt(req.query.limit) || 20
    );
    return success(res, data);
  });
}

module.exports = new BillController();
