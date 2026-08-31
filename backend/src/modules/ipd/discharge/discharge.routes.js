/**
 * modules/ipd/discharge/discharge.routes.js
 * Inpatient discharge router.
 */
const express = require('express');
const router = express.Router();
const controller = require('./discharge.controller');
const authenticate = require('../../../core/middleware/authenticate');

router.post('/:admissionId/initiate', authenticate, controller.initiateDischarge);
router.get('/:admissionId/clearance', authenticate, controller.getClearanceStatus);
router.patch('/:admissionId/clearance/:department', authenticate, controller.markClearance);
router.post('/:admissionId/finalize', authenticate, controller.finalizeDischarge);
router.get('/:admissionId/gate-pass', authenticate, controller.getGatePass);

module.exports = router;
