const bcrypt = require('bcryptjs');
const repo = require('./identity.repository');
const AppError = require('../../core/errors/app-error');
const config = require('../../core/config');
const { ACCOUNT_STATUS } = require('../../core/constants');
const { invalidateUserCache } = require('../../core/middleware/authenticate.middleware');

// Account status state machine
const VALID_STATUS_TRANSITIONS = {
  [ACCOUNT_STATUS.PENDING]: [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DISABLED],
  [ACCOUNT_STATUS.ACTIVE]: [ACCOUNT_STATUS.LOCKED, ACCOUNT_STATUS.DISABLED],
  [ACCOUNT_STATUS.LOCKED]: [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DISABLED],
  [ACCOUNT_STATUS.DISABLED]: [ACCOUNT_STATUS.ACTIVE], // admin can re-enable disabled accounts
};

/**
 * Create a login account linked to a staff record.
 * Critical write: uses bcrypt for password hashing.
 */
const createIdentity = async ({ staffId, username, password }, session = null) => {
  const existing = await repo.findByStaffId(staffId);
  if (existing) throw new AppError('BUSINESS_001', 'Staff already has a login account');

  const existingUsername = await repo.findByUsername(username);
  if (existingUsername) throw new AppError('BUSINESS_001', 'Username already taken');

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const identity = await repo.create({
    staffId,
    username: username.toLowerCase(),
    passwordHash,
    accountStatus: ACCOUNT_STATUS.ACTIVE, // Admin-created accounts start Active
    firstLogin: true,                      // Enforce password change on first login
    passwordChangedAt: null,
  }, session ? { session } : {});

  // Never return passwordHash
  const { passwordHash: _ph, refreshTokenHash: _rth, ...safe } = identity.toObject ? identity.toObject() : identity;
  return safe;
};

/**
 * Clear firstLogin flag after staff has changed their temporary password.
 */
const clearFirstLogin = async (staffId) => {
  const identity = await repo.findByStaffId(staffId);
  if (!identity) throw new AppError('NOT_FOUND', 'Identity not found');
  await repo.update(identity._id, { firstLogin: false, passwordChangedAt: new Date() });
  return { message: 'First login cleared' };
};

/**
 * Change password and simultaneously clear the firstLogin flag.
 * Used by the forced-password-change flow on first login.
 */
const changePasswordWithFirstLoginClear = async (staffId, newPassword) => {
  const identity = await repo.findByStaffId(staffId);
  if (!identity) throw new AppError('NOT_FOUND', 'Identity not found for this staff');

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await repo.update(identity._id, {
    passwordHash,
    firstLogin: false,
    passwordChangedAt: new Date(),
  });
  return { message: 'Password changed. First login cleared.' };
};

/**
 * Change account status with state machine validation.
 */
const changeStatus = async (id, newStatus) => {
  const identity = await repo.findById(id);
  if (!identity) throw new AppError('NOT_FOUND');

  const allowedTransitions = VALID_STATUS_TRANSITIONS[identity.accountStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError('BUSINESS_002', `Cannot transition from ${identity.accountStatus} to ${newStatus}`);
  }

  const updated = await repo.updateStatus(id, newStatus);
  invalidateUserCache(id);
  return updated;
};

/**
 * Change password — hashes before storing, never stores plain text.
 */
const changePassword = async (id, newPassword) => {
  const identity = await repo.findById(id);
  if (!identity) throw new AppError('NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await repo.updatePassword(id, passwordHash);
  return { message: 'Password changed successfully' };
};

const updateCredentials = async (staffId, { username, password }, session = null) => {
  const options = session ? { session } : {};
  const identity = await repo.findByStaffId(staffId, options);
  
  // If identity does not exist for this staff (e.g. legacy/migrated staff), create one if credentials provided
  if (!identity) {
    if (username && password) {
      return createIdentity({ staffId, username, password }, session);
    }
    if (username && !password) {
      throw new AppError('BAD_REQUEST', 'Password is required when creating a new login identity for staff');
    }
    if (!username && password) {
      throw new AppError('BAD_REQUEST', 'Username is required when creating a new login identity for staff');
    }
    return { message: 'No credentials to update' };
  }

  const updates = {};
  if (username) {
    const normUser = username.toLowerCase().trim();
    if (normUser !== identity.username) {
      const existing = await repo.findByUsername(normUser, options);
      if (existing && String(existing.staffId) !== String(staffId)) {
        throw new AppError('BUSINESS_001', `Username "${normUser}" is already taken by another account`);
      }
      updates.username = normUser;
    }
  }

  if (password && password.trim()) {
    updates.passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    updates.failedLoginAttempts = 0;
    updates.lockUntil = null;
    updates.accountStatus = ACCOUNT_STATUS.ACTIVE;
    updates.passwordChangedAt = new Date();
  }

  if (Object.keys(updates).length > 0) {
    await repo.update(identity._id, updates, options);
    invalidateUserCache(identity._id);
  }

  return { message: 'Credentials updated successfully' };
};

const findByUsername = (username, options = {}) => repo.findByUsername(username, options);
const getByStaffId = (staffId, options = {}) => repo.findByStaffId(staffId, options);
const getByStaffIds = (staffIds, options = {}) => repo.findByStaffIds(staffIds, options);
const getById = (id, options = {}) => repo.findById(id, options);
const findByIdWithSecrets = (id, options = {}) => repo.findByIdWithSecrets(id, options);
const updateRefreshToken = (id, hash, prevHash, options = {}) => repo.updateRefreshToken(id, hash, prevHash, options);
const rotateRefreshTokenAtomic = (id, expectedOldHash, newHash, options = {}) => repo.rotateRefreshTokenAtomic(id, expectedOldHash, newHash, options);
const incrementFailedAttempts = (id, options = {}) => repo.incrementFailedAttempts(id, options);
const resetFailedAttempts = (id, options = {}) => repo.resetFailedAttempts(id, options);

const lockAccount = async (id, durationMs = config.lockoutDurationMs || 15 * 60 * 1000) => {
  const lockUntil = new Date(Date.now() + durationMs);
  const res = await repo.lockAccount(id, lockUntil);
  invalidateUserCache(id);
  return res;
};

const unlockAccount = async (id) => {
  const res = await repo.unlockAccount(id);
  invalidateUserCache(id);
  return res;
};

module.exports = {
  createIdentity, changeStatus, changePassword, updateCredentials,
  clearFirstLogin, changePasswordWithFirstLoginClear,
  findByUsername, getByStaffId, getByStaffIds, getById, findByIdWithSecrets,
  updateRefreshToken, rotateRefreshTokenAtomic, incrementFailedAttempts, resetFailedAttempts,
  lockAccount, unlockAccount,
};
