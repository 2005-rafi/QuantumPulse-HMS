const mongoose = require('mongoose');

const SERVICE_CATEGORIES = {
  REGISTRATION: 'REGISTRATION',
  CONSULTATION: 'CONSULTATION',
  PROCEDURE: 'PROCEDURE',
  PACKAGE: 'PACKAGE',
  DIAGNOSTICS: 'DIAGNOSTICS',
};

const serviceMasterSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    // Convention: CATEGORY-SHORTCODE e.g. REG-OPD, CONS-CARD
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  category: {
    type: String,
    enum: Object.values(SERVICE_CATEGORIES),
    required: true,
  },
  defaultUnit: {
    type: String,
    enum: ['PER_VISIT', 'PER_ITEM', 'PER_PROCEDURE', 'PER_DAY', 'PER_TEST'],
    default: 'PER_VISIT',
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
}, { timestamps: true });

serviceMasterSchema.index({ category: 1, isActive: 1 });
serviceMasterSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('ServiceMaster', serviceMasterSchema);
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;
