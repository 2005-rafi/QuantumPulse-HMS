/**
 * modules/ipd/billing/ipd-billing.routes.js
 * Inpatient billing router.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ipd-billing.controller');
const authenticate = require('../../../core/middleware/authenticate');

router.get('/:admissionId/ledger', authenticate, controller.getRunningLedger);
router.post('/:admissionId/deposits', authenticate, controller.recordAdvanceDeposit);
router.get('/:admissionId/deposits', authenticate, controller.getAdvanceDeposits);
router.post('/:admissionId/ingest-charges', authenticate, controller.ingestDailyCharges);

module.exports = router;
