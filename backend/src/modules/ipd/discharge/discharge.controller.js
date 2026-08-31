/**
 * modules/ipd/discharge/discharge.controller.js
 * Inpatient discharge & clearance controllers.
 */
const dischargeService = require('./discharge.service');
const { success } = require('../../../core/responses');

class DischargeController {
  async initiateDischarge(req, res, next) {
    try {
      const doctorId = req.user.staffId || req.user.id;
      const result = await dischargeService.initiateDischarge(req.params.admissionId, req.body, doctorId);
      return success(res, result, 'Discharge initiated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getClearanceStatus(req, res, next) {
    try {
      const clearance = await dischargeService.getClearanceStatus(req.params.admissionId);
      return success(res, clearance, 'Clearance status retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async markClearance(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const clearance = await dischargeService.markDepartmentClearance(
        req.params.admissionId,
        req.params.department.toUpperCase(),
        req.body,
        staffId
      );
      return success(res, clearance, `${req.params.department} clearance marked successfully`);
    } catch (err) {
      next(err);
    }
  }

  async finalizeDischarge(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const result = await dischargeService.finalizeDischargeAndIssueGatePass(req.params.admissionId, staffId);
      return success(res, result, 'Discharge finalized and Gate Pass issued successfully');
    } catch (err) {
      next(err);
    }
  }

  async getGatePass(req, res, next) {
    try {
      const gatePass = await dischargeService.getGatePass(req.params.admissionId);
      return success(res, gatePass, 'Gate Pass retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DischargeController();
