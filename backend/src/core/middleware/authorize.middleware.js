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
  
  // Role-based wildcard matching for core clinical roles
  const userRole = (req.user.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'ADMIN';
  const isLabRole = userRole === 'LABORATORY' || userRole.includes('LAB');
  const isWardOpsRole = userRole === 'WARD OPERATIONS' || userRole === 'WARD_OPERATIONS' || userRole.includes('WARD');
  
  const hasRoleMatch = 
    isAdmin ||
    (isLabRole && requiredList.some(p => String(p).startsWith('LAB_'))) ||
    (isWardOpsRole && requiredList.some(p => String(p).startsWith('FACILITY_') || String(p).startsWith('BED_')));
  const hasPermission = (req.user.permissions && requiredList.some((p) => req.user.permissions.includes(p))) || hasRoleMatch;

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

/**
 * Factory: requireStaffManagementAuth
 * Authorizes Hospital Administrator OR Head of Department (HOD).
 */
const requireStaffManagementAuth = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  const userRole = (req.user.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'ADMIN';
  const hasManageUsers = req.user.permissions && req.user.permissions.includes('MANAGE_USERS');
  const isHod = Boolean(req.user.isHod);

  if (isAdmin || hasManageUsers || isHod) {
    return next();
  }

  logger.warn('Authorization denied for staff management', {
    userId: req.user.userId,
    role: req.user.role,
    isHod: req.user.isHod,
    requestId: req.requestId,
  });
  return sendError(res, 'AUTHZ_001', 'Permission not granted for this role', null, 403);
};

/**
 * Factory: requireStaffManagementOrSelf('id')
 * Checks if the caller is accessing their own record, OR is Admin, OR is HOD.
 */
const requireStaffManagementOrSelf = (paramName = 'id') => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'AUTH_007', 'Authentication required', null, 401);
  }

  const targetId = req.params[paramName];
  if (targetId && req.user.staffId && String(req.user.staffId) === String(targetId)) {
    return next();
  }

  const userRole = (req.user.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'ADMIN';
  const hasManageUsers = req.user.permissions && req.user.permissions.includes('MANAGE_USERS');
  const isHod = Boolean(req.user.isHod);

  if (isAdmin || hasManageUsers || isHod) {
    return next();
  }

  logger.warn('Authorization denied for staff resource', {
    userId: req.user.userId,
    role: req.user.role,
    requestId: req.requestId,
  });
  return sendError(res, 'AUTHZ_001', 'Permission not granted for this role', null, 403);
};

const { abacPolicyEngine, ACTIONS } = require('../security/abac-policy.engine');

const enforceAbac = (action, resourceResolver = null) => abacPolicyEngine.enforce(action, resourceResolver);

module.exports = { 
  requirePermission, 
  requirePermissionOrSelf,
  requireStaffManagementAuth,
  requireStaffManagementOrSelf,
  enforceAbac,
  abacPolicyEngine,
  ACTIONS,
};

