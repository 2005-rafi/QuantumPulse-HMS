const express = require('express');
const router = express.Router();
const controller = require('./administration.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const {
  createRoleSchema,
  assignPermissionsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  assignHodSchema,
} = require('./administration.validation');

// ── Role & Permission Routes ────────────────────────────────────────────────────────────
router.get('/roles',    authenticate, requirePermission('MANAGE_USERS'), controller.listRoles);
router.post('/roles',   authenticate, requirePermission('MANAGE_USERS'), validate(createRoleSchema), controller.createRole);
router.post('/roles/:id/permissions', authenticate, requirePermission('MANAGE_USERS'), validate(assignPermissionsSchema), controller.assignPermissionsToRole);
router.get('/permissions', authenticate, requirePermission('MANAGE_USERS'), controller.listPermissions);

// ── Department Routes ──────────────────────────────────────────────────────────────────
// NOTE: Static routes (/all) must be registered BEFORE parameterized routes (/:id)
// to prevent Express treating 'all' as an ID.
router.get('/departments/all', authenticate, requirePermission('MANAGE_USERS'), controller.listAllDepartments);
router.get('/departments',     authenticate, controller.listDepartments);
router.post('/departments',    authenticate, requirePermission('MANAGE_USERS'), validate(createDepartmentSchema), controller.createDepartment);
router.put('/departments/:id', authenticate, requirePermission('MANAGE_USERS'), validate(updateDepartmentSchema), controller.updateDepartment);
router.delete('/departments/:id', authenticate, requirePermission('MANAGE_USERS'), controller.deleteDepartment);
// HOD assignment — separate lifecycle step, requires MANAGE_USERS
router.put('/departments/:id/hod', authenticate, requirePermission('MANAGE_USERS'), validate(assignHodSchema), controller.assignHod);
// Admin view: list all labs linked to a specific department
router.get('/departments/:id/laboratories', authenticate, requirePermission('LAB_MANAGE'), controller.getLaboratoriesByDepartment);

// ── Settings Routes ────────────────────────────────────────────────────────────────────
router.get('/settings/:key', authenticate, controller.getSetting);
router.put('/settings/:key', authenticate, requirePermission('MANAGE_USERS'), controller.updateSetting);

// ── Storage & Database Analytics Route ──────────────────────────────────────────────────
const storageAnalyticsController = require('./storageAnalytics.controller');
router.get('/storage-analytics', authenticate, requirePermission(['MANAGE_USERS', 'VIEW_AUDIT']), storageAnalyticsController.getAnalytics);
router.get('/admin/storage-analytics', authenticate, requirePermission(['MANAGE_USERS', 'VIEW_AUDIT']), storageAnalyticsController.getAnalytics);

module.exports = router;

