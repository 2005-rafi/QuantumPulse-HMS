const mongoose = require('mongoose');
const { ACCOUNT_STATUS } = require('../../core/constants');

const identitySchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, unique: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    // Security fields
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    refreshTokenHash: { type: String, select: false, default: null },
    previousRefreshTokenHash: { type: String, select: false, default: null },
    refreshTokenRotatedAt: { type: Date, default: null },
    tokenFamilyId: { type: String, select: false, default: null },
    passwordHistory: [{ hash: { type: String, select: false }, changedAt: { type: Date, default: Date.now } }],
    lastLoginAt: { type: Date, default: null },
    // First-login password change enforcement (docs/file2.md §Password Strategy)
    firstLogin: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// indexes created via unique:true on username and staffId fields above

module.exports = mongoose.model('Identity', identitySchema);

