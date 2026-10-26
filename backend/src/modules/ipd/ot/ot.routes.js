/**
 * modules/ipd/ot/ot.routes.js
 * Operating theatre Express router.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ot.controller');
const authenticate = require('../../../core/middleware/authenticate.middleware');

const { requirePermission } = require('../../../core/middleware/authorize.middleware');

// ── Surgery Request & Scheduling ────────────────────────────
router.post('/sessions', authenticate, requirePermission(['OT_BOOK', 'OT_REQUEST']), controller.bookSession);
router.post('/sessions/request', authenticate, requirePermission(['OT_REQUEST', 'OT_BOOK']), controller.requestSurgery);
router.patch('/sessions/:id/schedule', authenticate, requirePermission(['OT_BOOK', 'OT_MANAGE']), controller.approveAndSchedule);
router.patch('/sessions/:id/reject', authenticate, requirePermission(['OT_BOOK', 'OT_MANAGE']), controller.rejectRequest);

// ── Checklist & Clinical Execution ─────────────────────────
router.patch('/sessions/:id/checklist', authenticate, requirePermission(['OT_MANAGE', 'OT_BOOK', 'VITALS_RECORD', 'EMAR_RECORD']), controller.updateChecklist);
router.patch('/sessions/:id/milestone', authenticate, requirePermission(['OT_MANAGE', 'OT_BOOK', 'SURGICAL_NOTES', 'OT_REQUEST']), controller.updateMilestone);
router.patch('/sessions/:id/complete-handoff', authenticate, requirePermission(['OT_MANAGE', 'SURGICAL_NOTES']), controller.completeWithHandoff);
router.patch('/sessions/:id/status', authenticate, requirePermission(['OT_MANAGE']), controller.updateSessionStatus);

// ── Session Query & Details ─────────────────────────────────
router.get('/sessions', authenticate, requirePermission(['OT_VIEW']), controller.getSessions);
router.get('/sessions/:id', authenticate, requirePermission(['OT_VIEW']), controller.getSessionById);

// ── Consumables ─────────────────────────────────────────────
router.post('/sessions/:sessionId/consumables', authenticate, requirePermission(['OT_CONSUMABLE_LOG', 'OT_MANAGE']), controller.logConsumable);
router.get('/sessions/:sessionId/consumables', authenticate, requirePermission(['OT_VIEW']), controller.getConsumables);

module.exports = router;
