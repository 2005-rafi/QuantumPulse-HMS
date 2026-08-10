const bcrypt = require('bcryptjs');
const repo = require('./identity.repository');
const AppError = require('../../core/errors/AppError');
const config = require('../../core/config');
const { ACCOUNT_STATUS } = require('../../core/constants');

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
const createIdentity = async ({ staffId, username, password }) => {
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
  });

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

  return repo.updateStatus(id, newStatus);
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

const updateCredentials = async (staffId, { username, password }) => {
  const identity = await repo.findByStaffId(staffId);
  if (!identity) throw new AppError('NOT_FOUND', 'Identity not found for this staff');

  const updates = {};
  if (username) {
    const normUser = username.toLowerCase();
    if (normUser !== identity.username) {
      const existing = await repo.findByUsername(normUser);
      if (existing) {
        throw new AppError('BUSINESS_001', 'Username already taken');
      }
      updates.username = normUser;
    }
  }

  if (password) {
    updates.passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  }

  if (Object.keys(updates).length > 0) {
    await repo.update(identity._id, updates);
  }

  return { message: 'Credentials updated successfully' };
};

const findByUsername = (username) => repo.findByUsername(username);
const getByStaffId = (staffId) => repo.findByStaffId(staffId);
const getByStaffIds = (staffIds) => repo.findByStaffIds(staffIds);
const getById = (id) => repo.findById(id);
const findByIdWithSecrets = (id) => repo.findByIdWithSecrets(id);
const updateRefreshToken = (id, hash) => repo.updateRefreshToken(id, hash);
const incrementFailedAttempts = (id) => repo.incrementFailedAttempts(id);
const resetFailedAttempts = (id) => repo.resetFailedAttempts(id);
const lockAccount = (id) => repo.updateStatus(id, ACCOUNT_STATUS.LOCKED);

module.exports = {
  createIdentity, changeStatus, changePassword, updateCredentials,
  clearFirstLogin, changePasswordWithFirstLoginClear,
  findByUsername, getByStaffId, getByStaffIds, getById, findByIdWithSecrets,
  updateRefreshToken, incrementFailedAttempts, resetFailedAttempts, lockAccount,
};
