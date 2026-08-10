const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    module: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
