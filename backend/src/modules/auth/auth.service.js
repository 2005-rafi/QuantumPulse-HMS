const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const identityService = require('../identity/identity.service');
const staffService = require('../staff/staff.service');
const administrationService = require('../administration/administration.service');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./token.service');
const AppError = require('../../core/errors/app-error');
const config = require('../../core/config');
const { ACCOUNT_STATUS } = require('../../core/constants');
const logger = require('../../core/logger');
const auditService = require('../audit/audit.service');

const buildUserPayload = async (identity, staff) => {
  const permissions = await administrationService.getPermissionCodesForRole(staff.roleId._id || staff.roleId);
  const Department = require('../administration/department.model');

  const deptId = staff.departmentId?._id ? staff.departmentId._id.toString() : (staff.departmentId ? staff.departmentId.toString() : '');
  
  let isHod = false;
  let hodDepartmentId = null;

  if (staff._id) {
    const deptAsHod = await Department.findOne({ headOfDepartment: staff._id });
    if (deptAsHod) {
      isHod = true;
      hodDepartmentId = deptAsHod._id.toString();
    } else if (['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(staff.position)) {
      isHod = true;
      hodDepartmentId = deptId;
    }
  }

  return {
    userId: identity._id.toString(),
    staffId: staff._id.toString(),
    role: staff.roleId.name || staff.role,
    department: staff.departmentId.name || staff.department,
    departmentId: deptId,
    permissions,
    isHod,
    hodDepartmentId: hodDepartmentId || (isHod ? deptId : null),
    position: staff.position || '',
    positionRank: staff.positionRank || 1,
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

  // 2. Check account status & handle automatic lockout expiry
  if (identity.accountStatus === ACCOUNT_STATUS.LOCKED) {
    const isLockExpired = identity.lockUntil && Date.now() > new Date(identity.lockUntil).getTime();
    if (isLockExpired) {
      await identityService.unlockAccount(identity._id);
      identity.accountStatus = ACCOUNT_STATUS.ACTIVE;
      identity.failedLoginAttempts = 0;
      identity.lockUntil = null;
      logger.info('Account lock expired; automatically unlocked on login attempt', { username });
    } else {
      const remainingSeconds = identity.lockUntil 
        ? Math.max(1, Math.ceil((new Date(identity.lockUntil).getTime() - Date.now()) / 1000))
        : 900;
      throw new AppError('AUTH_004', `Account is temporarily locked due to consecutive failed attempts. Try again in ${remainingSeconds} seconds or contact Hospital IT.`, { lockUntil: identity.lockUntil, remainingSeconds });
    }
  }
  if (identity.accountStatus === ACCOUNT_STATUS.DISABLED) throw new AppError('AUTH_005');
  if (identity.accountStatus === ACCOUNT_STATUS.PENDING) throw new AppError('AUTH_006');
  if (identity.accountStatus !== ACCOUNT_STATUS.ACTIVE) throw new AppError('AUTH_001');

  // 3. Verify password
  const isMatch = await bcrypt.compare(password, identity.passwordHash);
  if (!isMatch) {
    const updated = await identityService.incrementFailedAttempts(identity._id);
    if (updated.failedLoginAttempts >= config.maxFailedAttempts) {
      await identityService.lockAccount(identity._id, config.lockoutDurationMs);
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
      departmentId: payload.departmentId,
      isHod: payload.isHod,
      hodDepartmentId: payload.hodDepartmentId,
      position: payload.position,
      positionRank: payload.positionRank,
      permissions: payload.permissions,
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

const REFRESH_GRACE_WINDOW_MS = 30 * 1000; // 30-second lease grace window for concurrent requests/tabs

/**
 * Refresh: validate refresh token, rotate, issue new access token.
 * Concurrency-safe: RFC 6749 grace period protects against race conditions across browser tabs.
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

  // 3. Compare incoming token hash against current or previous grace window hash
  const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const isCurrentHashMatch = incomingHash === identityWithSecrets.refreshTokenHash;

  const isGraceWindowMatch =
    !isCurrentHashMatch &&
    identityWithSecrets.previousRefreshTokenHash &&
    incomingHash === identityWithSecrets.previousRefreshTokenHash &&
    identityWithSecrets.refreshTokenRotatedAt &&
    Date.now() - new Date(identityWithSecrets.refreshTokenRotatedAt).getTime() < REFRESH_GRACE_WINDOW_MS;

  if (!isCurrentHashMatch && !isGraceWindowMatch) {
    logger.error('CRITICAL: Token replay attack detected! Revoking all sessions for user', {
      userId: payload.userId,
      familyId: payload.familyId,
      isGraceWindowMatch,
    });
    // Neutralize replay attack: revoke all tokens for this user family
    await identityService.updateRefreshToken(identityWithSecrets._id, null);

    auditService.logEvent(
      identityWithSecrets.staffId || payload.userId,
      'SECURITY',
      'TOKEN_FAMILY_REPLAY_ATTACK_DETECTED',
      payload.userId,
      {
        userId: payload.userId,
        familyId: payload.familyId || null,
        action: 'ALL_SESSIONS_REVOKED',
        reason: 'Consumed refresh token replayed outside grace window',
      },
      null,
      {
        category: 'SECURITY',
        severity: 'CRITICAL',
        statusChange: {
          from: 'ACTIVE_SESSION',
          to: 'TOKEN_FAMILY_REVOKED',
          reason: 'Replay attack neutralization',
        },
      }
    );

    throw new AppError('AUTH_003', 'Invalid or revoked token family');
  }

  // 4. Check account is still active
  if (identityWithSecrets.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new AppError('AUTH_004');
  }

  // 5. Load staff for fresh role/permission data
  const staff = await staffService.getById(identityWithSecrets.staffId.toString());
  const newPayload = await buildUserPayload(identityWithSecrets, staff);

  if (isGraceWindowMatch) {
    // Grace window hit: concurrent request from another tab or in-flight queue.
    // Return a fresh access token without returning the revoked refresh token.
    const newAccessToken = signAccessToken(newPayload);
    logger.info('Refresh token matched within concurrent grace window', { userId: payload.userId });
    return { accessToken: newAccessToken, refreshToken: null };
  }

  // 6. Issue new token pair preserving the token family
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken({ userId: payload.userId, familyId: payload.familyId });
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  // 7. Atomic CAS rotation: update current hash and retain previous with rotation timestamp
  const rotated = await identityService.rotateRefreshTokenAtomic(identityWithSecrets._id, identityWithSecrets.refreshTokenHash, newHash);
  if (!rotated) {
    // Another concurrent request updated the token in the interim.
    // Re-verify against latest state to see if our token became the previousRefreshTokenHash within grace window.
    const latestIdentity = await identityService.findByIdWithSecrets(payload.userId);
    const isNowGraceMatch =
      latestIdentity &&
      latestIdentity.previousRefreshTokenHash === incomingHash &&
      latestIdentity.refreshTokenRotatedAt &&
      Date.now() - new Date(latestIdentity.refreshTokenRotatedAt).getTime() < REFRESH_GRACE_WINDOW_MS;

    if (isNowGraceMatch) {
      logger.info('Concurrent refresh CAS race resolved: token accepted under grace window', { userId: payload.userId });
      return { accessToken: newAccessToken, refreshToken: null };
    }

    logger.warn('Refresh token CAS rotation failed and not eligible for grace window', { userId: payload.userId });
    throw new AppError('AUTH_003');
  }

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

  const Department = require('../administration/department.model');
  const deptId = staff?.departmentId?._id ? staff.departmentId._id.toString() : (staff?.departmentId?.toString() || '');
  let isHod = false;
  let hodDepartmentId = null;

  if (staff?._id) {
    const deptAsHod = await Department.findOne({ headOfDepartment: staff._id });
    if (deptAsHod) {
      isHod = true;
      hodDepartmentId = deptAsHod._id.toString();
    } else if (['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(staff?.position)) {
      isHod = true;
      hodDepartmentId = deptId;
    }
  }

  return {
    id: userId,
    username: identity.username,
    staffId: staff?._id ? staff._id.toString() : '',
    fullName: staff?.fullName || 'Authenticated User',
    employeeId: staff?.employeeId || '',
    role: staff?.roleId?.name || staff?.role || 'Staff',
    department: staff?.departmentId?.name || staff?.department || 'General',
    departmentId: deptId,
    permissions,
    accountStatus: identity.accountStatus,
    isHod,
    hodDepartmentId: hodDepartmentId || (isHod ? deptId : null),
    position: staff?.position || '',
    positionRank: staff?.positionRank || 1,
  };
};

/**
 * Unlock: re-authenticate user during lock screen and rotate session tokens.
 */
const unlock = async (userId, username, password) => {
  let identity = null;
  if (userId) {
    identity = await identityService.findByIdWithSecrets(userId);
  }
  if (!identity && username) {
    identity = await identityService.findByUsername(username);
  }
  if (!identity) {
    throw new AppError('AUTH_001');
  }

  // Check account status & handle automatic lockout expiry
  if (identity.accountStatus === ACCOUNT_STATUS.LOCKED) {
    const isLockExpired = identity.lockUntil && Date.now() > new Date(identity.lockUntil).getTime();
    if (isLockExpired) {
      await identityService.unlockAccount(identity._id);
      identity.accountStatus = ACCOUNT_STATUS.ACTIVE;
      identity.failedLoginAttempts = 0;
      identity.lockUntil = null;
      logger.info('Account lock expired; automatically unlocked on unlock screen attempt', { userId: identity._id });
    } else {
      const remainingSeconds = identity.lockUntil 
        ? Math.max(1, Math.ceil((new Date(identity.lockUntil).getTime() - Date.now()) / 1000))
        : 900;
      throw new AppError('AUTH_004', `Account is temporarily locked due to consecutive failed attempts. Try again in ${remainingSeconds} seconds or contact Hospital IT.`, { lockUntil: identity.lockUntil, remainingSeconds });
    }
  }
  if (identity.accountStatus === ACCOUNT_STATUS.DISABLED) throw new AppError('AUTH_005');
  if (identity.accountStatus !== ACCOUNT_STATUS.ACTIVE) throw new AppError('AUTH_001');

  // Verify password
  const isMatch = await bcrypt.compare(password, identity.passwordHash);
  if (!isMatch) {
    const updated = await identityService.incrementFailedAttempts(identity._id);
    if (updated.failedLoginAttempts >= config.maxFailedAttempts) {
      await identityService.lockAccount(identity._id, config.lockoutDurationMs);
      logger.warn('Account locked after failed unlock attempts', { userId: identity._id });
    }
    throw new AppError('AUTH_001');
  }

  // Reset failed attempts
  await identityService.resetFailedAttempts(identity._id);

  // Load staff & build payload
  const staff = identity.staffId ? await staffService.getById(identity.staffId.toString()) : null;
  const payload = await buildUserPayload(identity, staff);

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: identity._id.toString() });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await identityService.updateRefreshToken(identity._id.toString(), hash);

  return {
    user: payload,
    accessToken,
    refreshToken,
  };
};

module.exports = { login, logout, refresh, me, unlock };
