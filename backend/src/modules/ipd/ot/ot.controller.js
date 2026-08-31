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
      const sessions = await otService.getSessions(req.query);
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

  async updateSessionStatus(req, res, next) {
    try {
      const { status, operativeNotes } = req.body;
      const session = await otService.updateSessionStatus(req.params.id, status, operativeNotes);
      return success(res, session, 'OT session status updated successfully');
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
