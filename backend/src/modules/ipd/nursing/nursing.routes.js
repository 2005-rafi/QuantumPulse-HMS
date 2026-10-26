/**
 * modules/ipd/nursing/nursing.routes.js
 * Express router for nursing station actions.
 */
const express = require('express');
const router = express.Router();
const controller = require('./nursing.controller');
const authenticate = require('../../../core/middleware/authenticate.middleware');
const { requirePermission } = require('../../../core/middleware/authorize.middleware');
const { validate } = require('../../../core/validation/validate.middleware');
const {
  recordVitalsSchema,
  updateEmarSchema,
  logIOSchema,
  createHandoverSchema,
} = require('./nursing.validation');

// ── Vitals & NEWS2 & Trends (IPD Nurse, Doctor, Surgeon, or OPD Nurse on admission) ───
router.post('/:admissionId/vitals', authenticate, requirePermission(['VITALS_RECORD', 'EMAR_RECORD']), validate(recordVitalsSchema), controller.recordVitals);
router.get('/:admissionId/vitals', authenticate, controller.getVitalsHistory);
router.get('/:admissionId/vitals/latest', authenticate, controller.getLatestVitals);
router.get('/:admissionId/vitals/trends', authenticate, controller.getVitalsTrends);
router.patch('/:admissionId/vitals/frequency', authenticate, requirePermission(['VITALS_RECORD', 'EMAR_RECORD', 'INPATIENT_DOCTOR_ACCESS']), controller.updateVitalsFrequency);

// ── e-MAR Medication Records (IPD Nurse, Doctor, Surgeon) ───────────────────
router.get('/:admissionId/emar', authenticate, controller.getEmarGrid);
router.patch('/emar/:emarId/status', authenticate, requirePermission(['EMAR_RECORD']), validate(updateEmarSchema), controller.updateEmarStatus);

// ── Fluid I/O Balance (IPD Nurse) ───────────────────────────────────────────
router.post('/:admissionId/io', authenticate, requirePermission(['IO_BALANCE_LOG']), validate(logIOSchema), controller.logIOBalance);
router.get('/:admissionId/io', authenticate, controller.getIOHistory);

// ── SBAR Shift Handover (IPD Nurse) ─────────────────────────────────────────
router.post('/:admissionId/handover', authenticate, requirePermission(['SHIFT_HANDOVER']), validate(createHandoverSchema), controller.createHandover);
router.get('/:admissionId/handover', authenticate, controller.getHandovers);
router.patch('/handover/:handoverId/acknowledge', authenticate, requirePermission(['SHIFT_HANDOVER']), controller.acknowledgeHandover);

module.exports = router;
