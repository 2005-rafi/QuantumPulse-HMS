/**
 * modules/ipd/beds/floor.model.js
 * FloorMaster model for physical hospital layout.
 */
const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema(
  {
    floorNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    floorName: {
      type: String,
      required: true,
      trim: true,
    },
    wing: {
      type: String,
      trim: true,
      default: 'Main Wing',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

floorSchema.index({ isActive: 1 });

module.exports = mongoose.model('FloorMaster', floorSchema);
