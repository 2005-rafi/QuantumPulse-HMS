const service = require('./patient.service');
const { success } = require('../../core/responses');
const auditService = require('../audit/audit.service');
const catchAsync = require('../../core/utils/catch-async');
const breakGlassService = require('./break-glass.service');
const { sanitizePatientForRole } = require('../../core/utils/phi-sanitizer');

const create = catchAsync(async (req, res) => {
  const patient = await service.create(req.body);

  // Log audit event (HIPAA compliant - no PHI in audit logs)
  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_REGISTER',
    patient._id,
    { resourceType: 'PATIENT', mrn: patient.mrn, action: 'CREATE' },
    req.ip
  );

  return success(res, patient, 'Patient registered successfully', 201);
});

const search = catchAsync(async (req, res) => {
  const result = await service.search(req.query, req.user);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_LIST_QUERIED',
    null,
    { resourceType: 'PATIENT', queryParams: Object.keys(req.query), resultsCount: result.total },
    req.ip
  );

  const sanitizedItems = (result.items || []).map((item) =>
    sanitizePatientForRole(item, req.user)
  );

  return success(res, { ...result, items: sanitizedItems }, 'Patients retrieved successfully');
});

const getById = catchAsync(async (req, res) => {
  const patient = await service.getById(req.params.id, req.user);
  const staffId = req.user.staffId || req.user.userId;
  const hasBreakGlass = await breakGlassService.hasActiveGrant(patient._id, staffId);
  const sanitized = sanitizePatientForRole(patient, req.user, { hasBreakGlassGrant: hasBreakGlass });

  auditService.logEvent(
    staffId,
    req.user.role,
    hasBreakGlass ? 'PATIENT_RECORD_ACCESSED_BREAK_GLASS' : 'PATIENT_RECORD_ACCESSED',
    patient._id,
    { resourceType: 'PATIENT', mrn: patient.mrn, action: 'READ', breakGlassApplied: hasBreakGlass },
    req.ip
  );

  return success(res, sanitized, 'Patient retrieved successfully');
});

const getByMrn = catchAsync(async (req, res) => {
  const patient = await service.getByMrn(req.params.mrn, req.user);
  const staffId = req.user.staffId || req.user.userId;
  const hasBreakGlass = await breakGlassService.hasActiveGrant(patient._id, staffId);
  const sanitized = sanitizePatientForRole(patient, req.user, { hasBreakGlassGrant: hasBreakGlass });

  auditService.logEvent(
    staffId,
    req.user.role,
    hasBreakGlass ? 'PATIENT_RECORD_ACCESSED_BREAK_GLASS' : 'PATIENT_RECORD_ACCESSED',
    patient._id,
    { resourceType: 'PATIENT', mrn: patient.mrn, action: 'READ', breakGlassApplied: hasBreakGlass },
    req.ip
  );

  return success(res, sanitized, 'Patient retrieved successfully');
});

const breakGlass = catchAsync(async (req, res) => {
  const patientId = req.params.id;
  const { reason, clinicalEncounterType } = req.body;
  const grant = await breakGlassService.authorizeEmergencyAccess({
    patientId,
    user: req.user,
    reason,
    clinicalEncounterType,
    ipAddress: req.ip,
  });

  return success(res, grant, 'Break-Glass emergency access granted successfully', 201);
});

const update = catchAsync(async (req, res) => {
  const patient = await service.update(req.params.id, req.body);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_UPDATE',
    patient._id,
    { resourceType: 'PATIENT', mrn: patient.mrn, changedFields: Object.keys(req.body), action: 'UPDATE' },
    req.ip
  );

  return success(res, patient, 'Patient updated successfully');
});

const addHistory = catchAsync(async (req, res) => {
  const patient = await service.addMedicalHistory(req.params.id, req.body, req.user.staffId);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_HISTORY_ADD',
    patient._id,
    { condition: req.body.condition },
    req.ip
  );

  return success(res, patient, 'Medical history added successfully');
});

const checkDuplicates = catchAsync(async (req, res) => {
  const duplicates = await service.checkDuplicates(req.body);
  return success(res, duplicates, 'Duplicate check completed successfully');
});

const registerWithVisit = catchAsync(async (req, res) => {
  const staffId = req.user?.staffId || req.user?.userId || req.user?.id || req.user?._id;
  const result = await service.registerWithVisit(req.body, staffId);

  // Log audit event
  auditService.logEvent(
    staffId,
    req.user?.role || 'RECEPTIONIST',
    'PATIENT_REGISTER',
    result.patient._id,
    { mrn: result.patient.mrn, name: `${result.patient.firstName} ${result.patient.lastName}` },
    req.ip
  );

  return success(res, result, 'Patient registered with initial visit successfully', 201);
});

const getDeleted = catchAsync(async (req, res) => {
  const result = await service.getDeletedPatients(req.query);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'DELETED_PATIENTS_LIST_QUERIED',
    null,
    { resourceType: 'PATIENT', queryParams: Object.keys(req.query), resultsCount: result.total },
    req.ip
  );

  return success(res, result, 'Deleted patients retrieved successfully');
});

const restore = catchAsync(async (req, res) => {
  const staffId = req.user?.staffId || req.user?.userId || req.user?.id || req.user?._id;
  const patient = await service.restorePatient(req.params.id, staffId);

  auditService.logEvent(
    staffId,
    req.user.role,
    'PATIENT_RESTORED',
    patient._id,
    { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
    req.ip
  );

  return success(res, patient, 'Patient restored successfully');
});

module.exports = {
  create,
  search,
  getById,
  getByMrn,
  update,
  addHistory,
  checkDuplicates,
  registerWithVisit,
  getDeleted,
  restore,
  breakGlass,
};
