/**
 * modules/ipd/ot/ot.controller.js
 * Operating theatre Express controllers.
 */
const otService = require('./ot.service');
const { success } = require('../../../core/responses');

class OTController {
  async bookSession(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const session = await otService.bookSession(req.body, staffId);
      return success(res, session, 'OT session scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getSessions(req, res, next) {
    try {
      const staffId = req.user?.staffId || req.user?.id;
      const sessions = await otService.getSessions(req.query, staffId);
      return success(res, sessions, 'OT sessions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const session = await otService.getSessionById(req.params.id);
      return success(res, session, 'OT session details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateMilestone(req, res, next) {
    try {
      const staffId = req.user?.staffId || req.user?.id;
      const { milestone, notes } = req.body;
      const session = await otService.updateMilestone(req.params.id, milestone, notes, staffId);
      return success(res, session, `Surgical milestone advanced to ${milestone}`);
    } catch (err) {
      next(err);
    }
  }

  async updateSessionStatus(req, res, next) {
    try {
      const staffId = req.user?.staffId || req.user?.id;
      const { status, operativeNotes } = req.body;
      const session = await otService.updateSessionStatus(req.params.id, status, operativeNotes, staffId);
      return success(res, session, 'OT session status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async requestSurgery(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const session = await otService.requestSurgery(req.body, staffId);
      return success(res, session, 'Surgery request submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async approveAndSchedule(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const session = await otService.approveAndScheduleSession(req.params.id, req.body, staffId);
      return success(res, session, 'Surgery session scheduled and resources allocated successfully');
    } catch (err) {
      next(err);
    }
  }

  async rejectRequest(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const { reason } = req.body;
      const session = await otService.rejectRequest(req.params.id, reason, staffId);
      return success(res, session, 'Surgery request declined');
    } catch (err) {
      next(err);
    }
  }

  async updateChecklist(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const session = await otService.updateChecklist(req.params.id, req.body, staffId);
      return success(res, session, 'Pre-operative checklist updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async completeWithHandoff(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const session = await otService.completeWithHandoff(req.params.id, req.body, staffId);
      return success(res, session, 'Surgery completed, post-op hand-off executed, and consumables billed successfully');
    } catch (err) {
      next(err);
    }
  }

  async logConsumable(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const consumable = await otService.logConsumable(req.params.sessionId, req.body, staffId);
      return success(res, consumable, 'Surgical consumable logged successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getConsumables(req, res, next) {
    try {
      const consumables = await otService.getConsumables(req.params.sessionId);
      return success(res, consumables, 'Consumables retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OTController();
