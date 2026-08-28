const tariffService = require('./tariff.service');
const pharmacyService = require('../pharmacy/pharmacy.service');
const { success, error: sendError } = require('../../core/responses');
const catchAsync = require('../../core/utils/catchAsync');
const {
  createServiceMasterSchema,
  createTariffRuleSchema,
  publishRuleSchema,
  cancelRuleSchema,
  createMedicinePriceSchema,
} = require('./tariff.validation');

class TariffController {
  // ── ServiceMaster ─────────────────────────────────────────────────────────
  listServices = catchAsync(async (req, res) => {
    const filters = { isActive: req.query.includeInactive === 'true' ? undefined : true };
    if (req.query.category) filters.category = req.query.category;
    const items = await tariffService.listServiceMasters(filters);
    return success(res, items);
  });

  createService = catchAsync(async (req, res) => {
    const { error, value } = createServiceMasterSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const item = await tariffService.createServiceMaster(value, req.user.staffId);
    return success(res, item, 'Service created', 201);
  });

  updateService = catchAsync(async (req, res) => {
    const item = await tariffService.updateServiceMaster(req.params.id, req.body);
    return success(res, item, 'Service updated');
  });

  // ── TariffRule ────────────────────────────────────────────────────────────
  listRules = catchAsync(async (req, res) => {
    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.departmentId) filters.departmentId = req.query.departmentId;
    if (req.query.tariffGrade) filters.tariffGrade = req.query.tariffGrade;
    const options = { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 50 };
    const data = await tariffService.listTariffRules(filters, options);
    return success(res, data);
  });

  getRule = catchAsync(async (req, res) => {
    const rule = await tariffService.getTariffRule(req.params.id);
    return success(res, rule);
  });

  createRule = catchAsync(async (req, res) => {
    const { error, value } = createTariffRuleSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const rule = await tariffService.createTariffRule(value, req.user.staffId);
    return success(res, rule, 'Tariff rule created', 201);
  });

  updateRule = catchAsync(async (req, res) => {
    const rule = await tariffService.updateTariffRule(req.params.id, req.body, req.user.staffId);
    return success(res, rule, 'Tariff rule updated');
  });

  publishRule = catchAsync(async (req, res) => {
    const { error, value } = publishRuleSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const rule = await tariffService.publishTariffRule(req.params.id, req.user.staffId, value?.reason);
    return success(res, rule, 'Tariff rule published');
  });

  cancelRule = catchAsync(async (req, res) => {
    const { error, value } = cancelRuleSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const rule = await tariffService.cancelTariffRule(req.params.id, req.user.staffId, value?.reason);
    return success(res, rule, 'Tariff rule cancelled');
  });

  getImpact = catchAsync(async (req, res) => {
    const data = await tariffService.previewImpact(req.params.id);
    return success(res, data);
  });

  resolvePrice = catchAsync(async (req, res) => {
    const context = {
      category: req.query.category,
      testCode: req.query.testCode || null,
      serviceMasterId: req.query.serviceMasterId || null,
      departmentId: req.query.departmentId || null,
      tariffGrade: req.query.tariffGrade || null,
      staffId: req.query.staffId || null,
      visitType: req.query.visitType || null,
      appointmentType: req.query.appointmentType || null,
    };
    if (!context.category) return sendError(res, 'VALIDATION_001', 'category is required', null, 400);
    try {
      const resolution = await tariffService.resolvePrice(context);
      return success(res, resolution);
    } catch (err) {
      return success(res, { amount: 0, explanation: 'No tariff rule configured', ruleId: null });
    }
  });

  // ── Medicine Prices ───────────────────────────────────────────────────────
  listMedicinePrices = catchAsync(async (req, res) => {
    const filters = {};
    if (req.query.search) filters.search = req.query.search;
    if (req.query.status) filters.status = req.query.status;
    const options = { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 50 };
    const data = await pharmacyService.listMedicinePrices(filters, options);
    return success(res, data);
  });

  getMedicinePrice = catchAsync(async (req, res) => {
    const price = await pharmacyService.getMedicinePriceByName(req.params.name);
    return success(res, price);
  });

  createMedicinePrice = catchAsync(async (req, res) => {
    const { error, value } = createMedicinePriceSchema.validate(req.body);
    if (error) return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    const price = await pharmacyService.createMedicinePrice(value, req.user.staffId);
    return success(res, price, 'Medicine price created', 201);
  });

  updateMedicinePrice = catchAsync(async (req, res) => {
    const price = await pharmacyService.updateMedicinePrice(req.params.id, req.body);
    return success(res, price, 'Medicine price updated');
  });

  deactivateMedicinePrice = catchAsync(async (req, res) => {
    await pharmacyService.deactivateMedicinePrice(req.params.id, req.user.staffId);
    return success(res, null, 'Medicine price deactivated');
  });
}

module.exports = new TariffController();
