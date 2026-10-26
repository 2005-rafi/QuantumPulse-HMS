const express = require('express');
const router = express.Router();
const pharmacyController = require('./pharmacy.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { requirePermission: authorize } = require('../../core/middleware/authorize.middleware');
const { PERMISSIONS } = require('../../core/constants');

// Apply authentication to all pharmacy routes
router.use(authenticate);

// Pharmacist dispenses medications for a specific visit
router.patch('/visits/:id/dispense', 
  authorize(PERMISSIONS.MEDICINE_DISPENSE),
  pharmacyController.dispenseMedications
);

// ── Inventory & Catalogue Routes ──
router.get('/inventory/summary', pharmacyController.getInventorySummary);
router.get('/inventory/items', pharmacyController.listItems);
router.post('/inventory/items', pharmacyController.createItem);
router.get('/inventory/items/:id/batches', pharmacyController.getItemBatches);
router.post('/inventory/receive', pharmacyController.receiveStock);
router.get('/inventory/ledger', pharmacyController.getStockLedger);

module.exports = router;
