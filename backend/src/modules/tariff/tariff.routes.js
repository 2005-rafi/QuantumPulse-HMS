const express = require('express');
const router = express.Router();
const controller = require('./tariff.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { PERMISSIONS } = require('../../core/constants');

router.use(authenticate);

// ── Service Master ────────────────────────────────────────────────────────────
router.get('/services', requirePermission(PERMISSIONS.TARIFF_VIEW), controller.listServices);
router.post('/services', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.createService);
router.put('/services/:id', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.updateService);

// ── Tariff Rules ──────────────────────────────────────────────────────────────
router.get('/rules', requirePermission(PERMISSIONS.TARIFF_VIEW), controller.listRules);
router.get('/rules/:id', requirePermission(PERMISSIONS.TARIFF_VIEW), controller.getRule);
router.post('/rules', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.createRule);
router.put('/rules/:id', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.updateRule);
router.post('/rules/:id/publish', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.publishRule);
router.post('/rules/:id/cancel', requirePermission(PERMISSIONS.TARIFF_MANAGE), controller.cancelRule);
router.get('/rules/:id/impact', requirePermission(PERMISSIONS.TARIFF_VIEW), controller.getImpact);

// ── Price Resolver (read-only, for display only) ──────────────────────────────
router.get('/resolve', controller.resolvePrice);

// ── Medicine Prices ───────────────────────────────────────────────────────────
router.get('/medicine-prices', requirePermission([PERMISSIONS.TARIFF_VIEW, PERMISSIONS.MEDICINE_PRICE_MANAGE, PERMISSIONS.MEDICINE_DISPENSE]), controller.listMedicinePrices);
router.get('/medicine-prices/lookup/:name', requirePermission([PERMISSIONS.TARIFF_VIEW, PERMISSIONS.MEDICINE_PRICE_MANAGE, PERMISSIONS.MEDICINE_DISPENSE]), controller.getMedicinePrice);
router.post('/medicine-prices', requirePermission([PERMISSIONS.TARIFF_MANAGE, PERMISSIONS.MEDICINE_PRICE_MANAGE]), controller.createMedicinePrice);
router.put('/medicine-prices/:id', requirePermission([PERMISSIONS.TARIFF_MANAGE, PERMISSIONS.MEDICINE_PRICE_MANAGE]), controller.updateMedicinePrice);
router.delete('/medicine-prices/:id', requirePermission([PERMISSIONS.TARIFF_MANAGE, PERMISSIONS.MEDICINE_PRICE_MANAGE]), controller.deactivateMedicinePrice);

module.exports = router;
