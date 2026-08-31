/**
 * modules/ipd/admission/ipd-admission.controller.js
 * Inpatient admission Express controllers.
 */
const ipdAdmissionService = require('./ipd-admission.service');
const { success } = require('../../../core/responses');

class IPDAdmissionController {
  async admitPatient(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const admission = await ipdAdmissionService.admitPatient(req.body, staffId);
      return success(res, admission, 'Patient admitted to IPD successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAdmissions(req, res, next) {
    try {
      const admissions = await ipdAdmissionService.getAdmissions(req.query);
      return success(res, admissions, 'Inpatient admissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAdmissionById(req, res, next) {
    try {
      const admission = await ipdAdmissionService.getAdmissionById(req.params.id);
      return success(res, admission, 'Admission details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateAdmission(req, res, next) {
    try {
      const admission = await ipdAdmissionService.updateAdmission(req.params.id, req.body);
      return success(res, admission, 'Admission updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IPDAdmissionController();
