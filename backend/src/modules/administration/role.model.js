const mongoose = require('mongoose');
const { ROLES } = require('../../core/constants');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: Object.values(ROLES),
      trim: true,
    },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
