/**
 * modules/ipd/cpoe/cpoe.routes.js
 * Inpatient physician order entry & SOAP rounds routes.
 */
const express = require('express');
const router = express.Router();
const controller = require('./cpoe.controller');
const authenticate = require('../../../core/middleware/authenticate');

// ── CPOE Orders ─────────────────────────────────────────────
router.post('/:admissionId/orders', authenticate, controller.createOrder);
router.get('/:admissionId/orders', authenticate, controller.getOrders);
router.patch('/orders/:orderId/status', authenticate, controller.updateOrderStatus);

// ── SOAP Ward Rounds ────────────────────────────────────────
router.post('/:admissionId/ward-rounds', authenticate, controller.recordWardRound);
router.get('/:admissionId/ward-rounds', authenticate, controller.getWardRounds);

module.exports = router;
