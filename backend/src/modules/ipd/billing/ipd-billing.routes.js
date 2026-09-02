/**
 * modules/ipd/billing/ipd-billing.routes.js
 * Inpatient billing router.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ipd-billing.controller');
const authenticate = require('../../../core/middleware/authenticate');
const { requirePermission } = require('../../../core/middleware/authorize');

router.get('/resolve-tariff', authenticate, requirePermission(['TARIFF_VIEW', 'BILL_VIEW', 'BED_VIEW']), controller.resolveBedTariff);
router.get('/:admissionId/ledger', authenticate, requirePermission(['BILL_VIEW', 'BED_VIEW']), controller.getRunningLedger);
router.post('/:admissionId/deposits', authenticate, requirePermission(['PAYMENT_RECORD', 'BILL_GENERATE']), controller.recordAdvanceDeposit);
router.get('/:admissionId/deposits', authenticate, requirePermission(['BILL_VIEW', 'PAYMENT_RECORD']), controller.getAdvanceDeposits);
router.post('/:admissionId/ingest-charges', authenticate, requirePermission(['BILL_GENERATE', 'TARIFF_MANAGE', 'BED_STATUS_UPDATE']), controller.ingestDailyCharges);
router.post('/:admissionId/finalize-settlement', authenticate, requirePermission(['BILL_FINALIZE', 'PAYMENT_RECORD']), controller.finalizeSettlement);

module.exports = router;
