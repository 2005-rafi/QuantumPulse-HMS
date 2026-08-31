/**
 * modules/ipd/nursing/nursing.controller.js
 * Inpatient nursing endpoints controller.
 */
const nursingService = require('./nursing.service');
const { success } = require('../../../core/responses');

class NursingController {
  // ── Vitals & NEWS2 ──────────────────────────────────────────
  async recordVitals(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const record = await nursingService.recordVitals(req.params.admissionId, req.body, staffId);
      return success(res, record, 'Vitals recorded and NEWS2 evaluated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getVitalsHistory(req, res, next) {
    try {
      const vitals = await nursingService.getVitalsHistory(req.params.admissionId);
      return success(res, vitals, 'Vitals history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getLatestVitals(req, res, next) {
    try {
      const latest = await nursingService.getLatestVitals(req.params.admissionId);
      return success(res, latest, 'Latest vitals retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── e-MAR Medication Records ────────────────────────────────
  async getEmarGrid(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const emar = await nursingService.getEmarGrid(req.params.admissionId, startDate, endDate);
      return success(res, emar, 'e-MAR records retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateEmarStatus(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const record = await nursingService.updateEmarStatus(req.params.emarId, req.body.status, {
        administeredBy: staffId,
        ...req.body,
      });
      return success(res, record, 'Medication administration status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── I/O Fluid Balance ───────────────────────────────────────
  async logIOBalance(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const record = await nursingService.logIOBalance(req.params.admissionId, req.body, staffId);
      return success(res, record, 'Fluid I/O balance recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getIOHistory(req, res, next) {
    try {
      const history = await nursingService.getIOHistory(req.params.admissionId);
      return success(res, history, 'I/O balance history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── SBAR Shift Handover ─────────────────────────────────────
  async createHandover(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const handover = await nursingService.createHandover(req.params.admissionId, req.body, staffId);
      return success(res, handover, 'SBAR shift handover note created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getHandovers(req, res, next) {
    try {
      const handovers = await nursingService.getHandovers(req.params.admissionId);
      return success(res, handovers, 'Handover notes retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async acknowledgeHandover(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const handover = await nursingService.acknowledgeHandover(req.params.handoverId, staffId);
      return success(res, handover, 'Handover note acknowledged successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NursingController();
