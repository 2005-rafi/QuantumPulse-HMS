const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  }
}, {
  timestamps: true,
  minimize: false // Ensure empty objects are saved
});

module.exports = mongoose.model('Setting', settingSchema);
