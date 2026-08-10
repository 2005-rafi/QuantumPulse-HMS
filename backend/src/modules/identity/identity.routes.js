const express = require('express');
const router = express.Router();
const controller = require('./identity.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const { createIdentitySchema, changeStatusSchema, changePasswordSchema } = require('./identity.validation');

router.post('/', authenticate, requirePermission('MANAGE_USERS'), validate(createIdentitySchema), controller.create);
router.patch('/:id/status', authenticate, requirePermission('MANAGE_USERS'), validate(changeStatusSchema), controller.changeStatus);
router.patch('/:id/password', authenticate, validate(changePasswordSchema), controller.changePassword);

module.exports = router;
