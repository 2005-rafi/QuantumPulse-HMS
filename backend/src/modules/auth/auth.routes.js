const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const authenticate = require('../../core/middleware/authenticate');
const { validate } = require('../../core/validation/validate');
const { loginSchema, refreshSchema } = require('./auth.validation');

// Public
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);

// Protected
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
