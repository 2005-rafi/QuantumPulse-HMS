const Identity = require('./identity.model');

// Explicitly select secrets only when needed (passwordHash, refreshTokenHash are select:false)
const create = (data) => Identity.create(data);

const findByUsername = (username) =>
  Identity.findOne({ username: username.toLowerCase() })
    .select('+passwordHash +refreshTokenHash')
    .lean();

const findByStaffId = (staffId) =>
  Identity.findOne({ staffId }).select('+refreshTokenHash').lean();

const findByStaffIds = (staffIds) =>
  Identity.find({ staffId: { $in: staffIds } }).select('+refreshTokenHash').lean();

const findById = (id) => Identity.findById(id).lean();

const findByIdWithSecrets = (id) =>
  Identity.findById(id).select('+passwordHash +refreshTokenHash').lean();

const updateStatus = (id, accountStatus) =>
  Identity.findByIdAndUpdate(id, { accountStatus, failedLoginAttempts: 0 }, { returnDocument: 'after' }).lean();

const updatePassword = (id, passwordHash) =>
  Identity.findByIdAndUpdate(id, { passwordHash, failedLoginAttempts: 0 }, { returnDocument: 'after' }).lean();

const updateRefreshToken = (id, refreshTokenHash) =>
  Identity.findByIdAndUpdate(id, { refreshTokenHash, lastLoginAt: new Date() }, { returnDocument: 'after' }).lean();

const incrementFailedAttempts = (id) =>
  Identity.findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } }, { returnDocument: 'after' }).lean();

const resetFailedAttempts = (id) =>
  Identity.findByIdAndUpdate(id, { failedLoginAttempts: 0, lastLoginAt: new Date() }, { returnDocument: 'after' }).lean();

const update = (id, data) =>
  Identity.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();

module.exports = {
  create, findByUsername, findByStaffId, findByStaffIds, findById, findByIdWithSecrets,
  updateStatus, updatePassword, updateRefreshToken, incrementFailedAttempts, resetFailedAttempts,
  update,
};
