const express = require('express');
const router = express.Router();
const controller = require('./identity.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { requirePermission, requireStaffManagementAuth } = require('../../core/middleware/authorize.middleware');
const { validate } = require('../../core/validation/validate.middleware');
const { createIdentitySchema, changeStatusSchema, changePasswordSchema } = require('./identity.validation');

router.post('/', authenticate, requireStaffManagementAuth, validate(createIdentitySchema), controller.create);
router.patch('/:id/status', authenticate, requireStaffManagementAuth, validate(changeStatusSchema), controller.changeStatus);
router.patch('/:id/password', authenticate, validate(changePasswordSchema), controller.changePassword);

module.exports = router;
