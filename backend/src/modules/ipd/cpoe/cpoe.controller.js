/**
 * modules/ipd/cpoe/cpoe.controller.js
 * Inpatient physician order entry & SOAP rounds controllers.
 */
const cpoeService = require('./cpoe.service');
const { success } = require('../../../core/responses');

class CPOEController {
  async createOrder(req, res, next) {
    try {
      const doctorId = req.user.staffId || req.user.id;
      const order = await cpoeService.createOrder(req.params.admissionId, req.body, doctorId);
      return success(res, order, 'CPOE order placed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req, res, next) {
    try {
      const filter = {};
      if (req.query.orderType) filter.orderType = req.query.orderType;
      if (req.query.status) filter.status = req.query.status;

      const orders = await cpoeService.getOrders(req.params.admissionId, filter);
      return success(res, orders, 'CPOE orders retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const order = await cpoeService.updateOrderStatus(req.params.orderId, req.body.status);
      return success(res, order, 'Order status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── SOAP Ward Rounds ────────────────────────────────────────
  async recordWardRound(req, res, next) {
    try {
      const doctorId = req.user.staffId || req.user.id;
      const round = await cpoeService.recordWardRound(req.params.admissionId, req.body, doctorId);
      return success(res, round, 'Daily SOAP ward round recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getWardRounds(req, res, next) {
    try {
      const rounds = await cpoeService.getWardRounds(req.params.admissionId);
      return success(res, rounds, 'Ward round notes retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CPOEController();
