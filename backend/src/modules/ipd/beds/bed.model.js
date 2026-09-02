/**
 * modules/ipd/beds/bed.model.js
 * BedMaster model representing individual physical beds/bays.
 */
const mongoose = require('mongoose');

const BED_STATUS = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  CLEANING_IN_PROGRESS: 'CLEANING_IN_PROGRESS',
  BLOCKED: 'BLOCKED',
};

const BED_FEATURES = [
  'VENTILATOR_READY',
  'MONITOR_ATTACHED',
  'OXYGEN_PIPED',
  'SUCTION_READY',
];

const bedSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomMaster',
      required: true,
      index: true,
    },
    // Denormalized for ultra-fast floor level queries (DSA/DBMS optimization)
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorMaster',
      required: true,
      index: true,
    },
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    bedLabel: {
      type: String,
      required: true,
      trim: true,
    },
    wardClass: {
      type: String,
      required: true,
      trim: true,
    },
    comfortTier: {
      type: String,
      enum: ['STANDARD', 'COMFORT', 'DELUXE', 'SUPER_DELUXE_SUITE', 'EXECUTIVE_PRESIDENTIAL'],
      default: 'STANDARD',
    },
    sharingType: {
      type: String,
      enum: ['GENERAL_WARD', 'SEMI_PRIVATE', 'PRIVATE_SINGLE', 'VIP_ISOLATION'],
      default: 'GENERAL_WARD',
    },
    features: [
      {
        type: String,
        enum: BED_FEATURES,
      },
    ],
    status: {
      type: String,
      enum: Object.values(BED_STATUS),
      default: BED_STATUS.VACANT,
      required: true,
    },
    dailyRateOverride: {
      type: Number,
      default: null,
      min: 0,
    },
    hourlyRateOverride: {
      type: Number,
      default: null,
      min: 0,
    },
    minAdvanceDepositOverride: {
      type: Number,
      default: null,
      min: 0,
    },
    currentAdmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      default: null,
    },
    currentPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    notes: {
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

// High performance compound indexes for live BookMyShow queries
bedSchema.index({ status: 1, wardClass: 1 });
bedSchema.index({ floorId: 1, status: 1 });
bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ currentAdmissionId: 1 });
bedSchema.index({ currentPatientId: 1 });

module.exports = mongoose.model('BedMaster', bedSchema);
module.exports.BED_STATUS = BED_STATUS;
module.exports.BED_FEATURES = BED_FEATURES;
