/**
 * backend/src/modules/audit/audit.routes.js
 */
const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { requirePermission } = require('../../core/middleware/authorize.middleware');
const { PERMISSIONS } = require('../../core/constants');

// All audit routes are protected and require VIEW_AUDIT permission
router.use(authenticate);
router.use(requirePermission(PERMISSIONS.VIEW_AUDIT));

router.get('/', auditController.getLogs);
router.get('/metrics', auditController.getMetrics);
router.post('/verify-integrity', auditController.verifyIntegrity);
router.get('/export', auditController.exportLogs);

module.exports = router;
