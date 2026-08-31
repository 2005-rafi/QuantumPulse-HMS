/**
 * modules/ipd/beds/room.model.js
 * RoomMaster model representing physical rooms/clusters on floors.
 */
const mongoose = require('mongoose');

const ROOM_TYPES = [
  'GENERAL_WARD',
  'SEMI_PRIVATE',
  'PRIVATE',
  'DELUXE_PRIVATE',
  'ICU',
  'CCU',
  'NICU',
  'PICU',
  'HDU',
  'ISOLATION',
  'POST_OP_RECOVERY',
  'OT',
  'EMERGENCY',
];

const roomSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorMaster',
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ROOM_TYPES,
      required: true,
      default: 'GENERAL_WARD',
    },
    genderRestriction: {
      type: String,
      enum: ['MALE_ONLY', 'FEMALE_ONLY', 'UNRESTRICTED'],
      default: 'UNRESTRICTED',
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
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

roomSchema.index({ floorId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ roomType: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.model('RoomMaster', roomSchema);
module.exports.ROOM_TYPES = ROOM_TYPES;
