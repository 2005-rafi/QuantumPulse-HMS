/**
 * modules/ipd/admission/ipd-admission.controller.js
 * Inpatient admission Express controllers.
 */
const ipdAdmissionService = require('./ipd-admission.service');
const { success } = require('../../../core/responses');

class IPDAdmissionController {
  async recommendAdmission(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const result = await ipdAdmissionService.recommendAdmission(req.body, staffId);
      return success(res, result, 'Inpatient admission advised successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async getPendingAdmissionAdvice(req, res, next) {
    try {
      const adviceList = await ipdAdmissionService.getPendingAdmissionAdvice();
      return success(res, adviceList, 'Pending admission advice retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

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

  async getAdmissionHistory(req, res, next) {
    try {
      const result = await ipdAdmissionService.getAdmissionHistory(req.query);
      return success(res, result, 'Inpatient admission history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAdmissionCaseFile(req, res, next) {
    try {
      const result = await ipdAdmissionService.getAdmissionCaseFile(req.params.id);
      return success(res, result, 'Inpatient clinical case file retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async exportAdmissions(req, res, next) {
    try {
      const PatientExportService = require('../../patient/patient-export.service');
      const auditService = require('../../audit/audit.service');

      const {
        scope = 'all',
        startDate,
        endDate,
        status,
        format = 'csv',
        columns,
      } = req.body || {};

      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `inpatient_census_export_${scope}_${nowStr}.${format === 'json' ? 'json' : 'csv'}`;
      const contentType = format === 'json' ? 'application/json' : 'text/csv; charset=utf-8';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      try {
        await auditService.log({
          action: 'EXPORT_INPATIENT_CENSUS',
          userId: req.user?._id || req.user?.id,
          role: req.user?.role,
          ip: req.ip || req.connection?.remoteAddress,
          details: {
            scope,
            startDate,
            endDate,
            status,
            format,
            filename,
          },
        });
      } catch (auditErr) {
        console.warn('[IPDAdmissionController] Audit logging note:', auditErr.message);
      }

      await PatientExportService.streamExport({
        reportType: 'inpatient_census',
        scope,
        startDate,
        endDate,
        status,
        format,
        columns,
        outputStream: res,
      });
    } catch (err) {
      console.error('[IPDAdmissionController] Export streaming failed:', err);
      if (!res.headersSent) {
        next(err);
      } else {
        res.end();
      }
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

  async convertFromOpd(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const result = await ipdAdmissionService.convertOpdToIpd(req.body, staffId);
      return success(res, result, 'Patient converted from OPD to IPD admission successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IPDAdmissionController();
