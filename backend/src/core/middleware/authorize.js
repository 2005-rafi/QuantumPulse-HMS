const { error: sendError } = require('../responses');
const logger = require('../logger');

/**
 * Factory: requirePermission('MANAGE_USERS')
 * Must be used AFTER authenticate middleware.
 * Checks req.user.permissions array.
 */
const requirePermission = (permissions) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  const requiredList = Array.isArray(permissions) ? permissions : [permissions];
  const hasPermission = req.user.permissions && requiredList.some((p) => req.user.permissions.includes(p));
  if (!hasPermission) {
    logger.warn('Authorization denied', {
      userId: req.user.userId,
      role: req.user.role,
      requiredPermissions: requiredList,
      requestId: req.requestId,
    });
    return sendError(res, 'AUTHZ_001', 'Permission not granted for this role', null, 403);
  }

  return next();
};

/**
 * Factory: requirePermissionOrSelf('MANAGE_USERS', 'id')
 * Checks if the caller has the required permission OR is accessing their own staff record.
 */
const requirePermissionOrSelf = (permissions, paramName = 'id') => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  // Self check: is this the staff member accessing their own data?
  const targetId = req.params[paramName];
  if (targetId && req.user.staffId && String(req.user.staffId) === String(targetId)) {
    return next();
  }

  const requiredList = Array.isArray(permissions) ? permissions : [permissions];
  const hasPermission = req.user.permissions && requiredList.some((p) => req.user.permissions.includes(p));
  if (!hasPermission) {
    logger.warn('Authorization denied', {
      userId: req.user.userId,
      role: req.user.role,
      requiredPermissions: requiredList,
      requestId: req.requestId,
    });
    return sendError(res, 'AUTHZ_001', 'Permission not granted for this role', null, 403);
  }

  return next();
};

module.exports = { requirePermission, requirePermissionOrSelf };

