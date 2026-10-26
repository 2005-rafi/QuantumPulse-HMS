/**
 * modules/patient/patient-development.routes.js
 * Independent router for development-only management and patient purging.
 *
 * Security (CIA Triad):
 * - Confined strictly to development environment (NODE_ENV !== 'production').
 * - Requires active JWT authentication.
 * - Requires Administrator authorization.
 */
const express = require('express');
const controller = require('./patient-development.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { error: sendError } = require('../../core/responses');
const logger = require('../../core/logger');

const router = express.Router();

/**
 * Strict Development-Only & Administrator Security Guard
 */
const devGuard = (req, res, next) => {
  // 1. Environment Guard (Production Lockdown)
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[DevGuard] Blocked unauthorized attempt to access development routes in production', {
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.userId,
    });
    return sendError(res, 'FORBIDDEN_001', 'Development features are disabled in production mode.', null, 403);
  }

  // 2. Strict Administrator Role Guard
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ADMINISTRATOR' && userRole !== 'ADMIN') {
    logger.warn('[DevGuard] Blocked non-administrator from development purge route', {
      ip: req.ip,
      role: req.user?.role,
      userId: req.user?.userId,
    });
    return sendError(res, 'AUTHZ_001', 'Access restricted to Administrator role.', null, 403);
  }

  next();
};

router.use(authenticate);
router.use(devGuard);

// Preview impact of permanent deletion before confirmation
router.get('/patients/:id/purge-preview', controller.getPurgePreview);

// Permanently purge patient and cascade-release all clinical assets
router.delete('/patients/:id/purge', controller.purgePatient);

// Ghost & Orphaned Records Studio (Development Mode)
router.get('/ghost-records', controller.getGhostRecords);
router.delete('/ghost-records/:type/:id', controller.purgeGhostRecord);
router.post('/ghost-records/purge-all', controller.purgeAllGhostRecords);

module.exports = router;
