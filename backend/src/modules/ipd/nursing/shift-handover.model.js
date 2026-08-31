/**
 * modules/ipd/nursing/shift-handover.model.js
 * SBAR structured nursing shift handover notes.
 */
const mongoose = require('mongoose');

const shiftHandoverSchema = new mongoose.Schema(
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
    },
    shift: {
      type: String,
      enum: ['MORNING_TO_EVENING', 'EVENING_TO_NIGHT', 'NIGHT_TO_MORNING'],
      required: true,
    },
    handoverTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    nurseOut: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    nurseIn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    // SBAR structured fields
    situation: {
      type: String,
      required: true,
      trim: true,
    },
    background: {
      type: String,
      required: true,
      trim: true,
    },
    assessment: {
      type: String,
      required: true,
      trim: true,
    },
    recommendation: {
      type: String,
      required: true,
      trim: true,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

shiftHandoverSchema.index({ admissionId: 1, handoverTime: -1 });

module.exports = mongoose.model('ShiftHandover', shiftHandoverSchema);
