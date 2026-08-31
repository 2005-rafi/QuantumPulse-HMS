/**
 * modules/ipd/ot/ot.routes.js
 * Operating theatre Express router.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ot.controller');
const authenticate = require('../../../core/middleware/authenticate');

router.post('/sessions', authenticate, controller.bookSession);
router.get('/sessions', authenticate, controller.getSessions);
router.get('/sessions/:id', authenticate, controller.getSessionById);
router.patch('/sessions/:id/status', authenticate, controller.updateSessionStatus);

router.post('/sessions/:sessionId/consumables', authenticate, controller.logConsumable);
router.get('/sessions/:sessionId/consumables', authenticate, controller.getConsumables);

module.exports = router;
