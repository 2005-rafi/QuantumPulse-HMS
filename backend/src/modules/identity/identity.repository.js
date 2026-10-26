const Identity = require('./identity.model');

// Explicitly select secrets only when needed (passwordHash, refreshTokenHash are select:false)
const create = (data, options = {}) => {
  const doc = new Identity(data);
  return doc.save(options);
};

const findByUsername = (username, options = {}) =>
  Identity.findOne({ username: username.toLowerCase() }, null, options)
    .select('+passwordHash +refreshTokenHash')
    .lean();

const findByStaffId = (staffId, options = {}) =>
  Identity.findOne({ staffId }, null, options).select('+refreshTokenHash').lean();

const findByStaffIds = (staffIds, options = {}) =>
  Identity.find({ staffId: { $in: staffIds } }, null, options).select('+refreshTokenHash').lean();

const findById = (id, options = {}) => Identity.findById(id, null, options).lean();

const findByIdWithSecrets = (id, options = {}) =>
  Identity.findById(id, null, options).select('+passwordHash +refreshTokenHash +previousRefreshTokenHash +refreshTokenRotatedAt').lean();

const updateStatus = (id, accountStatus, options = {}) => {
  const updates = { accountStatus };
  if (accountStatus === 'Active') {
    updates.failedLoginAttempts = 0;
    updates.lockUntil = null;
  }
  return Identity.findByIdAndUpdate(id, updates, { returnDocument: 'after', ...options }).lean();
};

const updatePassword = (id, passwordHash, options = {}) =>
  Identity.findByIdAndUpdate(
    id,
    { passwordHash, failedLoginAttempts: 0, lockUntil: null, accountStatus: 'Active' },
    { returnDocument: 'after', ...options }
  ).lean();

const lockAccount = (id, lockUntil, options = {}) =>
  Identity.findByIdAndUpdate(
    id,
    { accountStatus: 'Locked', lockUntil },
    { returnDocument: 'after', ...options }
  ).lean();

const unlockAccount = (id, options = {}) =>
  Identity.findByIdAndUpdate(
    id,
    { accountStatus: 'Active', failedLoginAttempts: 0, lockUntil: null },
    { returnDocument: 'after', ...options }
  ).lean();

const updateRefreshToken = (id, refreshTokenHash, previousRefreshTokenHash = null, options = {}) => {
  const updateData = {
    refreshTokenHash,
    lastLoginAt: new Date(),
  };
  if (previousRefreshTokenHash !== undefined) {
    updateData.previousRefreshTokenHash = previousRefreshTokenHash;
    updateData.refreshTokenRotatedAt = new Date();
  }
  if (!refreshTokenHash) {
    // Logout: wipe both
    updateData.previousRefreshTokenHash = null;
    updateData.refreshTokenRotatedAt = null;
  }
  return Identity.findByIdAndUpdate(id, updateData, { returnDocument: 'after', ...options }).lean();
};

/**
 * Atomic Compare-And-Swap (CAS) token rotation to avoid race conditions across concurrent requests
 */
const rotateRefreshTokenAtomic = (id, expectedOldHash, newHash, options = {}) =>
  Identity.findOneAndUpdate(
    { _id: id, refreshTokenHash: expectedOldHash },
    {
      $set: {
        refreshTokenHash: newHash,
        previousRefreshTokenHash: expectedOldHash,
        refreshTokenRotatedAt: new Date(),
      },
    },
    { returnDocument: 'after', ...options }
  ).lean();

const incrementFailedAttempts = (id, options = {}) =>
  Identity.findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } }, { returnDocument: 'after', ...options }).lean();

const resetFailedAttempts = (id, options = {}) =>
  Identity.findByIdAndUpdate(id, { failedLoginAttempts: 0, lastLoginAt: new Date() }, { returnDocument: 'after', ...options }).lean();

const update = (id, data, options = {}) =>
  Identity.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options }).lean();

module.exports = {
  create, findByUsername, findByStaffId, findByStaffIds, findById, findByIdWithSecrets,
  updateStatus, updatePassword, updateRefreshToken, rotateRefreshTokenAtomic, incrementFailedAttempts, resetFailedAttempts,
  lockAccount, unlockAccount,
  update,
};
