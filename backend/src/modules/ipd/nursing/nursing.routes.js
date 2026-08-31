/**
 * modules/ipd/nursing/nursing.routes.js
 * Express router for nursing station actions.
 */
const express = require('express');
const router = express.Router();
const controller = require('./nursing.controller');
const authenticate = require('../../../core/middleware/authenticate');
const { validate } = require('../../../core/validation/validate');
const {
  recordVitalsSchema,
  updateEmarSchema,
  logIOSchema,
  createHandoverSchema,
} = require('./nursing.validation');

// ── Vitals & NEWS2 ──────────────────────────────────────────
router.post('/:admissionId/vitals', authenticate, validate(recordVitalsSchema), controller.recordVitals);
router.get('/:admissionId/vitals', authenticate, controller.getVitalsHistory);
router.get('/:admissionId/vitals/latest', authenticate, controller.getLatestVitals);

// ── e-MAR Medication Records ────────────────────────────────
router.get('/:admissionId/emar', authenticate, controller.getEmarGrid);
router.patch('/emar/:emarId/status', authenticate, validate(updateEmarSchema), controller.updateEmarStatus);

// ── Fluid I/O Balance ───────────────────────────────────────
router.post('/:admissionId/io', authenticate, validate(logIOSchema), controller.logIOBalance);
router.get('/:admissionId/io', authenticate, controller.getIOHistory);

// ── SBAR Shift Handover ─────────────────────────────────────
router.post('/:admissionId/handover', authenticate, validate(createHandoverSchema), controller.createHandover);
router.get('/:admissionId/handover', authenticate, controller.getHandovers);
router.patch('/handover/:handoverId/acknowledge', authenticate, controller.acknowledgeHandover);

module.exports = router;
