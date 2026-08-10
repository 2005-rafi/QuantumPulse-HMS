const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { PERMISSIONS } = require('../../core/constants');

// All audit routes are protected and require VIEW_AUDIT permission
router.use(authenticate);
router.use(requirePermission(PERMISSIONS.VIEW_AUDIT));

router.get('/', auditController.getLogs);

module.exports = router;
