const express = require('express');
const router = express.Router();
const visitController = require('./visit.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const {
  createVisitSchema,
  recordVitalsSchema,
  saveDraftSchema,
  finalizeConsultationSchema,
  cancelVisitSchema,
} = require('./visit.validation');

router.use(authenticate);

// ── Create new visit (Reception) ────────────────────────────────────────────
router.post('/', requirePermission('VISIT_CREATE'), validate(createVisitSchema), visitController.createVisit);

// ── Cancel visit & revoke queue token (Reception / Admin - before triage only) ─
router.patch('/:id/cancel', requirePermission(['VISIT_CLOSE', 'VISIT_CREATE', 'MANAGE_USERS']), validate(cancelVisitSchema), visitController.cancelVisit);

// ── Doctor consultation history (Isolated to logged-in doctor) ───────────────
router.get('/doctor/history', requirePermission(['NOTE_UPDATE', 'VISIT_VIEW']), visitController.getDoctorConsultationHistory);

// ── Patient visit history ────────────────────────────────────────────────────
router.get('/patient/:patientId', requirePermission('VISIT_VIEW'), visitController.getVisitsByPatientId);

// ── Hospital stats (Admin) ───────────────────────────────────────────────────
router.get('/stats', requirePermission('VIEW_AUDIT'), visitController.getHospitalStats);

// ── View queue by status ─────────────────────────────────────────────────────
router.get('/queue/:status', requirePermission('VISIT_VIEW'), visitController.getQueue);

// ── Vitals & Consultation ────────────────────────────────────────────────────
router.patch('/:id/vitals',                 requirePermission('VITALS_RECORD'),   validate(recordVitalsSchema), visitController.recordVitals);
router.patch('/:id/start',                  requirePermission('NOTE_UPDATE'),      visitController.startConsultation);
router.patch('/:id/consultation/draft',      requirePermission('NOTE_UPDATE'),      validate(saveDraftSchema), visitController.saveConsultationDraft);
router.patch('/:id/consultation/order-labs', requirePermission('NOTE_UPDATE'),      validate(saveDraftSchema), visitController.routeToLaboratory);
router.patch('/:id/consultation/finalize',   requirePermission('NOTE_FINALIZE'),    validate(finalizeConsultationSchema), visitController.finalizeConsultation);

// ── Token queue state transitions (Nurse + Doctor) ───────────────────────────
// VITALS_RECORD permission covers nurses; NOTE_UPDATE covers doctors for both call/skip
router.patch('/:id/call',    requirePermission(['VITALS_RECORD', 'NOTE_UPDATE']), visitController.callPatient);
router.patch('/:id/skip',    requirePermission(['VITALS_RECORD', 'NOTE_UPDATE']), visitController.skipVisit);
router.patch('/:id/requeue', requirePermission(['VITALS_RECORD', 'NOTE_UPDATE']), visitController.requeueVisit);

module.exports = router;
