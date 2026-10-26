const pharmacyService = require('./pharmacy.service');
const { success, error: sendError } = require('../../core/responses');
const { dispenseSchema } = require('./pharmacy.validation');
const catchAsync = require('../../core/utils/catch-async');
const auditService = require('../audit/audit.service');

class PharmacyController {
  dispenseMedications = catchAsync(async (req, res) => {
    const { id } = req.params; // Visit ID
    const { error, value } = dispenseSchema.validate(req.body);
    
    if (error) {
      return sendError(res, 'VALIDATION_001', error.details[0].message, null, 400);
    }

    const visit = await pharmacyService.dispenseMedications(id, value, req.user.staffId);
    
    // Log audit event
    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'MEDICINE_DISPENSED',
      visit._id,
      { medications: value.dispensedMedications, totalAmount: visit.billing?.pharmacyCharges },
      req.ip
    );

    return success(res, visit, 'Medications dispensed successfully', 200);
  });

  createItem = catchAsync(async (req, res) => {
    const item = await pharmacyInventoryService.createItem(req.body, req.user.staffId);
    return success(res, item, 'Medicine catalogued successfully', 201);
  });

  listItems = catchAsync(async (req, res) => {
    const result = await pharmacyInventoryService.listItems(req.query, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return success(res, result.items, 'Medicine catalogue retrieved successfully', 200, result.pagination);
  });

  getItemBatches = catchAsync(async (req, res) => {
    const batches = await pharmacyInventoryService.getItemBatches(req.params.id);
    return success(res, batches, 'Active batches retrieved successfully', 200);
  });

  receiveStock = catchAsync(async (req, res) => {
    const result = await pharmacyInventoryService.receiveStock(req.body, req.user.staffId);
    return success(res, result, 'Stock batch received successfully (GRN recorded)', 201);
  });

  getInventorySummary = catchAsync(async (req, res) => {
    const summary = await pharmacyInventoryService.getInventorySummary();
    return success(res, summary, 'Pharmacy telemetry summary retrieved', 200);
  });

  getStockLedger = catchAsync(async (req, res) => {
    const result = await pharmacyInventoryService.getStockLedger(req.query, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return success(res, result.entries, 'Stock movement ledger retrieved', 200, result.pagination);
  });
}

const pharmacyInventoryService = require('./pharmacy-inventory.service');
module.exports = new PharmacyController();
