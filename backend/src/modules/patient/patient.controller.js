const service = require('./patient.service');
const { success } = require('../../core/responses');
const auditService = require('../audit/audit.service');
const catchAsync = require('../../core/utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const patient = await service.create(req.body);

  // Log audit event
  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_REGISTER',
    patient._id,
    { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
    req.ip
  );

  return success(res, patient, 'Patient registered successfully', 201);
});

const search = catchAsync(async (req, res) => {
  const result = await service.search(req.query);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_SEARCH',
    null,
    { query: req.query.q || '', resultsCount: result.total },
    req.ip
  );

  return success(res, result, 'Patients retrieved successfully');
});

const getById = catchAsync(async (req, res) => {
  const patient = await service.getById(req.params.id);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_VIEW',
    patient._id,
    { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
    req.ip
  );

  return success(res, patient, 'Patient retrieved successfully');
});

const getByMrn = catchAsync(async (req, res) => {
  const patient = await service.getByMrn(req.params.mrn);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_VIEW',
    patient._id,
    { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
    req.ip
  );

  return success(res, patient, 'Patient retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const patient = await service.update(req.params.id, req.body);

  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_UPDATE',
    patient._id,
    { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
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
  const result = await service.registerWithVisit(req.body, req.user.staffId);

  // Log audit event
  auditService.logEvent(
    req.user.staffId || req.user.userId,
    req.user.role,
    'PATIENT_REGISTER',
    result.patient._id,
    { mrn: result.patient.mrn, name: `${result.patient.firstName} ${result.patient.lastName}` },
    req.ip
  );

  return success(res, result, 'Patient registered with initial visit successfully', 201);
});

module.exports = { create, search, getById, getByMrn, update, addHistory, checkDuplicates, registerWithVisit };
