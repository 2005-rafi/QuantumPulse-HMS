const { verifyAccessToken } = require('../../modules/auth/token.service');
const identityService = require('../../modules/identity/identity.service');
const { error: sendError } = require('../responses');
const logger = require('../logger');

const config = require('../config');

// Fast in-memory TTL cache for user account status to avoid DB connection pool starvation
const userStatusCache = new Map();
const CACHE_TTL_MS = config.auth?.statusCacheTtlMs || 30000;
const MAX_CACHE_SIZE = config.auth?.statusCacheMaxSize || 1000;

const getCachedUserStatus = async (userId) => {
  const now = Date.now();
  const cached = userStatusCache.get(userId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }
  try {
    const identity = await identityService.getById(userId);
    const status = identity ? identity.accountStatus : null;
    
    // Prune oldest entries if cache exceeds max size
    if (userStatusCache.size >= MAX_CACHE_SIZE) {
      const firstKey = userStatusCache.keys().next().value;
      if (firstKey) userStatusCache.delete(firstKey);
    }

    userStatusCache.set(userId, { status, timestamp: now });
    return status;
  } catch (err) {
    // If DB fails temporarily, fall back to cached status if available
    return cached?.status || 'Active';
  }
};

/**
 * Verifies JWT access token on every protected route.
 * Attaches req.user = { userId, staffId, role, department, departmentId, permissions }
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    
    // Fast account status check with 30s TTL cache (0 DB calls for cached requests)
    const accountStatus = await getCachedUserStatus(payload.userId);
    if (!accountStatus) {
      return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
    }

    if (accountStatus !== 'Active') {
      logger.warn('Auth blocked: account is not active', { 
        userId: payload.userId, 
        status: accountStatus, 
        requestId: req.requestId 
      });
      const errorCode = accountStatus === 'Locked' ? 'AUTH_004' : 'AUTH_005';
      const errorMessage = accountStatus === 'Locked' ? 'Account locked' : 'Account disabled';
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
