/**
 * modules/ipd/beds/bed-allocation.model.js
 * Append-only historical log of patient-to-bed allocations and transfers.
 */
const mongoose = require('mongoose');

const bedAllocationSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedMaster',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomMaster',
      required: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorMaster',
      required: true,
    },
    wardClass: {
      type: String,
      required: true,
      trim: true,
    },
    allocatedFrom: {
      type: Date,
      default: Date.now,
      required: true,
    },
    allocatedTo: {
      type: Date,
      default: null, // null = currently active on this bed
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    transferReason: {
      type: String,
      trim: true,
      default: 'Initial Admission',
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

bedAllocationSchema.index({ admissionId: 1, allocatedFrom: 1 });
bedAllocationSchema.index({ bedId: 1, allocatedTo: 1 });

module.exports = mongoose.model('BedAllocation', bedAllocationSchema);
