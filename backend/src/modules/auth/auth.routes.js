const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const authenticate = require('../../core/middleware/authenticate');
const { validate } = require('../../core/validation/validate');
const { loginSchema, refreshSchema, unlockSchema } = require('./auth.validation');
const { verifyAccessToken } = require('./token.service');

// Optional auth helper to extract user from Authorization header if present
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch {}
  }
  return next();
};

// Public
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/unlock', optionalAuthenticate, validate(unlockSchema), controller.unlock);

// Protected
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
