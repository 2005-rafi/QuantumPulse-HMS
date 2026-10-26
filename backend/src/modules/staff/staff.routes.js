const express = require('express');
const router = express.Router();
const controller = require('./staff.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { 
  requirePermission, 
  requireStaffManagementAuth, 
  requireStaffManagementOrSelf 
} = require('../../core/middleware/authorize.middleware');
const { validate } = require('../../core/validation/validate.middleware');
const { upload, handleUploadError } = require('./staff-upload.middleware');
const { createStaffSchema, updateStaffSchema, changePositionSchema } = require('./staff.validation');

router.post('/', authenticate, requireStaffManagementAuth, validate(createStaffSchema), controller.create);
router.get('/', authenticate, controller.list);
// Static routes must be declared BEFORE parameterized /:id routes
router.get('/generate-username', authenticate, requireStaffManagementAuth, controller.generateUsername);
router.post('/upload-document', authenticate, requireStaffManagementAuth, upload.single('document'), handleUploadError, controller.uploadCertificate);
router.get('/certificates/:filename', authenticate, controller.downloadCertificate);
router.get('/:id/verification-document', authenticate, controller.downloadCertificate);

router.get('/:id', authenticate, requireStaffManagementOrSelf('id'), controller.getById);
router.put('/:id', authenticate, requireStaffManagementAuth, validate(updateStaffSchema), controller.update);
router.put('/:id/position', authenticate, requireStaffManagementAuth, validate(changePositionSchema), controller.changePosition);
router.get('/:id/position-history', authenticate, requireStaffManagementOrSelf('id'), controller.getPositionHistory);
router.patch('/:id/disable', authenticate, requireStaffManagementAuth, controller.disableStaff);
router.patch('/:id/enable', authenticate, requireStaffManagementAuth, controller.enableStaff);
router.patch('/:id/unlock', authenticate, requireStaffManagementAuth, controller.unlockStaff);
router.delete('/:id', authenticate, requirePermission('MANAGE_USERS'), controller.deleteStaff);

module.exports = router;
