const visitService = require('./visit.service');
const { success, error: sendError } = require('../../core/responses');
const catchAsync = require('../../core/utils/catchAsync');
const auditService = require('../audit/audit.service');

/**
 * VisitController — HTTP boundary for the visit lifecycle.
 *
 * SRP: Each handler validates input, delegates to service, and formats response.
 * No business logic lives here.
 */
class VisitController {

  // ── CREATE ──────────────────────────────────────────────────────────────────

  createVisit = catchAsync(async (req, res) => {
    const visit = await visitService.createVisit(req.body, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'VISIT_CREATE',
      visit._id,
      { mrn: visit.visitNumber, patientId: visit.patientId },
      req.ip
    );

    return success(res, visit, 'Visit created successfully', 201);
  });

  // ── QUEUE ACTIONS ────────────────────────────────────────────────────────────

  callPatient = catchAsync(async (req, res) => {
    const visit = await visitService.callPatient(req.params.id, req.user.staffId);
    return success(res, visit, 'Patient called successfully', 200);
  });

  skipVisit = catchAsync(async (req, res) => {
    const visit = await visitService.skipVisit(req.params.id, req.user.staffId);
    return success(res, visit, 'Visit skipped. Patient can be re-queued.', 200);
  });

  requeueVisit = catchAsync(async (req, res) => {
    const visit = await visitService.requeueVisit(req.params.id);
    return success(res, visit, 'Patient re-queued successfully', 200);
  });

  // ── QUEUE VIEW ───────────────────────────────────────────────────────────────

  getQueue = catchAsync(async (req, res) => {
    const { status } = req.params;
    const queue = await visitService.getQueue(status, req.query);
    return success(res, queue, 'Queue retrieved successfully', 200);
  });

  // ── VITALS & CONSULTATION ────────────────────────────────────────────────────

  recordVitals = catchAsync(async (req, res) => {
    const { id } = req.params;
    const visit = await visitService.recordVitals(id, req.body, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'VITALS_RECORDED',
      visit._id,
      { vitals: req.body },
      req.ip
    );

    return success(res, visit, 'Vitals recorded successfully', 200);
  });

  startConsultation = catchAsync(async (req, res) => {
    const visit = await visitService.startConsultation(req.params.id, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'CONSULTATION_START',
      visit._id,
      null,
      req.ip
    );

    return success(res, visit, 'Consultation started successfully', 200);
  });

  saveConsultationDraft = catchAsync(async (req, res) => {
    const { id } = req.params;
    const visit = await visitService.saveConsultationDraft(id, req.body, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'CONSULTATION_DRAFT_SAVE',
      visit._id,
      null,
      req.ip
    );

    return success(res, visit, 'Consultation draft saved successfully', 200);
  });

  finalizeConsultation = catchAsync(async (req, res) => {
    const { id } = req.params;
    const visit = await visitService.finalizeConsultation(id, req.body, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'CONSULTATION_FINALIZED',
      visit._id,
      { diagnosis: req.body.diagnosis, treatmentPlan: req.body.treatmentPlan },
      req.ip
    );

    return success(res, visit, 'Consultation finalized successfully', 200);
  });

  // ── STATS & HISTORY ──────────────────────────────────────────────────────────

  getHospitalStats = catchAsync(async (req, res) => {
    const stats = await visitService.getHospitalStats();
    return success(res, stats, 'Hospital stats retrieved successfully', 200);
  });

  getVisitsByPatientId = catchAsync(async (req, res) => {
    const visits = await visitService.getVisitsByPatientId(req.params.patientId);
    return success(res, visits, 'Patient visits retrieved successfully', 200);
  });
}

module.exports = new VisitController();
