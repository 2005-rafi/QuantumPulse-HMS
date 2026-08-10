const express = require('express');
const router = express.Router();
const controller = require('./staff.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const { upload, handleUploadError } = require('./staff.upload');
const { createStaffSchema, updateStaffSchema, changePositionSchema } = require('./staff.validation');

router.post('/', authenticate, requirePermission('MANAGE_USERS'), validate(createStaffSchema), controller.create);
router.get('/', authenticate, controller.list);
// Static routes must be declared BEFORE parameterized /:id routes
router.get('/generate-username', authenticate, requirePermission('MANAGE_USERS'), controller.generateUsername);
router.post('/upload-document', authenticate, requirePermission('MANAGE_USERS'), upload.single('document'), handleUploadError, controller.uploadCertificate);
router.get('/certificates/:filename', authenticate, controller.downloadCertificate);

router.get('/:id', authenticate, requirePermission('MANAGE_USERS'), controller.getById);
router.put('/:id', authenticate, requirePermission('MANAGE_USERS'), validate(updateStaffSchema), controller.update);
router.put('/:id/position', authenticate, requirePermission('MANAGE_USERS'), validate(changePositionSchema), controller.changePosition);
router.get('/:id/position-history', authenticate, requirePermission('MANAGE_USERS'), controller.getPositionHistory);
router.patch('/:id/disable', authenticate, requirePermission('MANAGE_USERS'), controller.disableStaff);
router.patch('/:id/enable', authenticate, requirePermission('MANAGE_USERS'), controller.enableStaff);
router.delete('/:id', authenticate, requirePermission('MANAGE_USERS'), controller.deleteStaff);

module.exports = router;
