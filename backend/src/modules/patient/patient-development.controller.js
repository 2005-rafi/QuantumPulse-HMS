/**
 * modules/patient/patient-development.controller.js
 * Controller handling development purge and preview requests.
 */
const service = require('./patient-development.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');

const getPurgePreview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const preview = await service.getPurgePreview(id);
  return success(res, preview, 'Purge impact preview generated successfully', 200);
});

const purgePatient = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await service.purgePatient(id, req.user, req.ip);
  return success(res, result, result.message, 200);
});

const getGhostRecords = catchAsync(async (req, res) => {
  const ghosts = await service.getGhostRecords();
  return success(res, ghosts, 'Ghost and orphaned records retrieved successfully', 200);
});

const purgeGhostRecord = catchAsync(async (req, res) => {
  const { type, id } = req.params;
  const result = await service.purgeGhostRecord(type, id, req.user, req.ip);
  return success(res, result, result.message, 200);
});

const purgeAllGhostRecords = catchAsync(async (req, res) => {
  const result = await service.purgeAllGhostRecords(req.user, req.ip);
  return success(res, result, result.message, 200);
});

module.exports = {
  getPurgePreview,
  purgePatient,
  getGhostRecords,
  purgeGhostRecord,
  purgeAllGhostRecords,
};
