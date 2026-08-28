const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const identityService = require('../identity/identity.service');
const staffService = require('../staff/staff.service');
const administrationService = require('../administration/administration.service');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./token.service');
const AppError = require('../../core/errors/AppError');
const config = require('../../core/config');
const { ACCOUNT_STATUS } = require('../../core/constants');
const logger = require('../../core/logger');

const buildUserPayload = async (identity, staff) => {
  const permissions = await administrationService.getPermissionCodesForRole(staff.roleId._id || staff.roleId);
  return {
    userId: identity._id.toString(),
    staffId: staff._id.toString(),
    role: staff.roleId.name || staff.role,
    department: staff.departmentId.name || staff.department,
    departmentId: staff.departmentId._id ? staff.departmentId._id.toString() : staff.departmentId.toString(),
    permissions,
  };
};

/**
 * Login: authenticate user, issue access + refresh tokens.
 */
const login = async (username, password) => {
  // 1. Find identity
  const identity = await identityService.findByUsername(username);
  if (!identity) {
    // No user enumeration — same message for all cases
    throw new AppError('AUTH_001');
  }

  // 2. Check account status
  if (identity.accountStatus === ACCOUNT_STATUS.LOCKED) throw new AppError('AUTH_004');
  if (identity.accountStatus === ACCOUNT_STATUS.DISABLED) throw new AppError('AUTH_005');
  if (identity.accountStatus === ACCOUNT_STATUS.PENDING) throw new AppError('AUTH_006');
  if (identity.accountStatus !== ACCOUNT_STATUS.ACTIVE) throw new AppError('AUTH_001');

  // 3. Verify password
  const isMatch = await bcrypt.compare(password, identity.passwordHash);
  if (!isMatch) {
    const updated = await identityService.incrementFailedAttempts(identity._id);
    if (updated.failedLoginAttempts >= config.maxFailedAttempts) {
      await identityService.lockAccount(identity._id);
      logger.warn('Account locked after failed attempts', { username, attempts: updated.failedLoginAttempts });
    }
    throw new AppError('AUTH_001');
  }

  // 4. Reset failed attempts
  await identityService.resetFailedAttempts(identity._id);

  // 5. Load staff for role/department
  const staff = await staffService.getById(identity.staffId.toString());

  // 6. Build token payload
  const payload = await buildUserPayload(identity, staff);

  // 7. Issue tokens
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: payload.userId });

  // 8. Store hashed refresh token
  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await identityService.updateRefreshToken(identity._id, refreshHash);

  logger.info('User logged in', { username, role: payload.role });

  return {
    accessToken,
    refreshToken,
    user: {
      id: payload.userId,
      staffId: payload.staffId,
      fullName: staff.fullName,
      role: payload.role,
      department: payload.department,
      departmentId: payload.departmentId
    },
  };
};

/**
 * Logout: invalidate refresh token.
 */
const logout = async (userId) => {
  await identityService.updateRefreshToken(userId, null);
  logger.info('User logged out', { userId });
};

/**
 * Refresh: validate refresh token, rotate, issue new access token.
 * Rotation: old refresh token is immediately invalidated after use.
 */
const refresh = async (refreshToken) => {
  // 1. Verify JWT signature and expiry
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('AUTH_003');
  }

  // 2. Load identity with secrets (need refreshTokenHash for hash comparison)
  const identityWithSecrets = await identityService.findByIdWithSecrets(payload.userId);
  if (!identityWithSecrets || !identityWithSecrets.refreshTokenHash) {
    // No stored hash = user has logged out or never logged in
    throw new AppError('AUTH_003');
  }

  // 3. Compare incoming token hash against stored hash (rotation check)
  const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  if (incomingHash !== identityWithSecrets.refreshTokenHash) {
    // Hash mismatch — token was already rotated or tampered
    throw new AppError('AUTH_003');
  }

  // 4. Check account is still active
  if (identityWithSecrets.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new AppError('AUTH_004');
  }

  // 5. Load staff for fresh role/permission data
  const staff = await staffService.getById(identityWithSecrets.staffId.toString());
  const newPayload = await buildUserPayload(identityWithSecrets, staff);

  // 6. Issue new token pair (jti in refresh token guarantees uniqueness even within same second)
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken({ userId: payload.userId });

  // 7. Immediately rotate: store new hash, invalidating the old token
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  await identityService.updateRefreshToken(identityWithSecrets._id.toString(), newHash);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Me: return current user info.
 */
const me = async (userId) => {
  const identity = await identityService.getById(userId);
  if (!identity) throw new AppError('NOT_FOUND');

  const staff = identity.staffId ? await staffService.getById(identity.staffId.toString()) : null;
  const roleId = staff?.roleId?._id || staff?.roleId;
  const permissions = roleId ? await administrationService.getPermissionCodesForRole(roleId) : [];

  return {
    id: userId,
    staffId: staff?._id ? staff._id.toString() : '',
    fullName: staff?.fullName || 'Authenticated User',
    employeeId: staff?.employeeId || '',
    role: staff?.roleId?.name || staff?.role || 'Staff',
    department: staff?.departmentId?.name || staff?.department || 'General',
    departmentId: staff?.departmentId?._id ? staff.departmentId._id.toString() : (staff?.departmentId?.toString() || ''),
    permissions,
    accountStatus: identity.accountStatus,
  };
};

module.exports = { login, logout, refresh, me };
