const mongoose = require('mongoose');
const visitService = require('./visit.service');
const { success, error: sendError } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');
const auditService = require('../audit/audit.service');
const { AUDIT_CATEGORIES, AUDIT_SEVERITIES } = require('../audit/audit-constants');

/**
 * VisitController — HTTP boundary for the visit lifecycle.
 *
 * SRP: Each handler validates input, delegates to service, and formats response.
 * No business logic lives here.
 */
class VisitController {

  // ── CREATE ──────────────────────────────────────────────────────────────────

  createVisit = catchAsync(async (req, res) => {
    const registeredBy = req.user.staffId || req.user.userId || req.user.id;
    const visit = await visitService.createVisit(req.body, registeredBy);

    auditService.logEvent(
      registeredBy,
      req.user.role,
      'VISIT_CREATE',
      visit._id,
      { mrn: visit.visitNumber, patientId: visit.patientId, tokenString: visit.tokenString },
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

  skipTriage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const nurseId = req.user.staffId || req.user.userId || req.user.id;

    const visit = await visitService.skipTriage(id, reason, nurseId);

    auditService.logStatusChange({
      actorId: nurseId,
      actorRole: req.user.role,
      targetType: 'Visit',
      targetId: visit._id,
      statusFrom: 'WAITING_TRIAGE',
      statusTo: 'TRIAGE_SKIPPED',
      reason,
      category: AUDIT_CATEGORIES.CLINICAL,
      severity: AUDIT_SEVERITIES.WARNING,
      details: { tokenString: visit.tokenString, departmentId: visit.departmentId, patientId: visit.patientId },
      ipAddress: req.ip,
    });

    return success(res, visit, 'Patient triage fast-tracked to doctor queue', 200);
  });

  revokeTriageSkip = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const nurseId = req.user.staffId || req.user.userId || req.user.id;

    const visit = await visitService.revokeTriageSkip(id, reason, nurseId);

    auditService.logStatusChange({
      actorId: nurseId,
      actorRole: req.user.role,
      targetType: 'Visit',
      targetId: visit._id,
      statusFrom: 'TRIAGE_SKIPPED',
      statusTo: 'WAITING_TRIAGE',
      reason,
      category: AUDIT_CATEGORIES.CLINICAL,
      severity: AUDIT_SEVERITIES.INFO,
      details: { tokenString: visit.tokenString, departmentId: visit.departmentId, patientId: visit.patientId },
      ipAddress: req.ip,
    });

    return success(res, visit, 'Triage fast-track revoked. Patient returned to nursing queue', 200);
  });

  cancelVisit = catchAsync(async (req, res) => {
    const { id } = req.params;
    const reason = req.body.cancellationReason || req.body.reason || 'Cancelled at reception';
    const staffId = req.user.staffId || req.user.userId || req.user.id;
    const cancelled = await visitService.cancelVisit(id, reason, staffId);

    auditService.logStatusChange({
      actorId: staffId,
      actorRole: req.user.role,
      targetType: 'Visit',
      targetId: cancelled._id,
      statusFrom: cancelled.previousStatus || 'ACTIVE',
      statusTo: 'CANCELLED',
      reason,
      category: AUDIT_CATEGORIES.ADMINISTRATIVE,
      severity: AUDIT_SEVERITIES.WARNING,
      details: { 
        tokenString: cancelled.tokenString, 
        departmentId: cancelled.departmentId,
        patientId: cancelled.patientId,
      },
      ipAddress: req.ip,
    });

    return success(res, cancelled, 'Visit cancelled and queue token revoked successfully', 200);
  });

  // ── QUEUE VIEW ───────────────────────────────────────────────────────────────

  getQueue = catchAsync(async (req, res) => {
    const { status } = req.params;
    const filters = { ...req.query };

    // Strict Department Isolation for Nurses:
    // Nurses (OPD Nurse, Nurse, IPD Nurse) can ONLY access their assigned department's triage/clinical queue.
    const nurseRoles = ['OPD Nurse', 'Nurse', 'IPD Nurse'];
    if (nurseRoles.includes(req.user.role)) {
      if (!req.user.departmentId) {
        return success(res, [], 'Queue retrieved successfully (No department assigned to nurse profile)', 200);
      }
      filters.departmentId = req.user.departmentId;
    }

    const queue = await visitService.getQueue(status, filters);
    return success(res, queue, 'Queue retrieved successfully', 200);
  });

  // ── VITALS & CONSULTATION ────────────────────────────────────────────────────

  recordVitals = catchAsync(async (req, res) => {
    const { id } = req.params;
    const nurseId = req.user.staffId || req.user.userId || req.user.id;
    const visit = await visitService.recordVitals(id, req.body, nurseId);

    auditService.logEvent(
      nurseId,
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

  routeToLaboratory = catchAsync(async (req, res) => {
    const { id } = req.params;
    const visit = await visitService.routeToLaboratory(id, req.body, req.user.staffId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'CONSULTATION_ROUTED_TO_LAB',
      visit._id,
      { ordersCount: visit.labOrders?.length || 0 },
      req.ip
    );

    return success(res, visit, 'Patient routed to laboratory successfully', 200);
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

  getDoctorConsultationHistory = catchAsync(async (req, res) => {
    const doctorId = req.user.staffId || req.user.userId || req.user.id;
    const history = await visitService.getDoctorConsultationHistory(doctorId, req.query);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'DOCTOR_CONSULTATION_HISTORY_VIEWED',
      null,
      { doctorId, resultsCount: history.total },
      req.ip
    );

    return success(res, history, 'Doctor consultation history retrieved successfully', 200);
  });

  getNurseTriageHistory = catchAsync(async (req, res) => {
    const nurseId = req.user.staffId || req.user.userId || req.user.id;
    const departmentId = req.user.departmentId || req.query.departmentId;

    const history = await visitService.getNurseTriageHistory(nurseId, departmentId, req.query, req.user);

    auditService.logEvent(
      nurseId,
      req.user.role,
      'NURSE_TRIAGE_HISTORY_VIEWED',
      null,
      { departmentId, resultsCount: history.total },
      req.ip
    );

    return success(res, history, 'Nurse triage history retrieved successfully', 200);
  });

  getHospitalStats = catchAsync(async (req, res) => {
    const stats = await visitService.getHospitalStats();
    return success(res, stats, 'Hospital stats retrieved successfully', 200);
  });

  getVisitsByPatientId = catchAsync(async (req, res) => {
    const { patientId } = req.params;
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return success(res, [], 'Patient visits retrieved successfully (No records for invalid or unassigned ID)', 200);
    }
    const visits = await visitService.getVisitsByPatientId(patientId, req.user?.role);
    return success(res, visits, 'Patient visits retrieved successfully', 200);
  });
}

module.exports = new VisitController();
