const { verifyAccessToken } = require('../../modules/auth/token.service');
const identityService = require('../../modules/identity/identity.service');
const { error: sendError } = require('../responses');
const logger = require('../logger');

/**
 * Verifies JWT access token on every protected route.
 * Attaches req.user = { userId, staffId, role, department, permissions }
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    
    // Check account status in DB to handle real-time locking/disabling
    const identity = await identityService.getById(payload.userId);
    if (!identity) {
      return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
    }

    if (identity.accountStatus !== 'Active') {
      logger.warn('Auth blocked: account is not active', { 
        userId: payload.userId, 
        status: identity.accountStatus, 
        requestId: req.requestId 
      });
      const errorCode = identity.accountStatus === 'Locked' ? 'AUTH_004' : 'AUTH_005';
      const errorMessage = identity.accountStatus === 'Locked' ? 'Account locked' : 'Account disabled';
      return sendError(res, errorCode, errorMessage, null, 401);
    }

    req.user = payload;
    return next();
  } catch (err) {
    logger.warn('Token verification failed', { error: err.message, requestId: req.requestId });
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'AUTH_002', 'Token expired', null, 401);
    }
    return sendError(res, 'AUTH_003', 'Token invalid or malformed', null, 401);
  }
};

module.exports = authenticate;
