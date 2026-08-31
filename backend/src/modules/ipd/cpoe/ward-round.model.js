/**
 * modules/ipd/cpoe/ward-round.model.js
 * Inpatient daily SOAP ward round notes recorded by doctors.
 */
const mongoose = require('mongoose');

const wardRoundSchema = new mongoose.Schema(
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    roundDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    conditionAssessment: {
      type: String,
      enum: ['IMPROVING', 'STABLE', 'GUARDED', 'CRITICAL'],
      default: 'STABLE',
      required: true,
    },
    // SOAP structured notes
    subjective: {
      type: String,
      trim: true,
      default: '',
    },
    objective: {
      type: String,
      trim: true,
      default: '',
    },
    assessment: {
      type: String,
      trim: true,
      required: true,
    },
    plan: {
      type: String,
      trim: true,
      required: true,
    },
    isFinalized: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

wardRoundSchema.index({ admissionId: 1, roundDate: -1 });

module.exports = mongoose.model('WardRound', wardRoundSchema);
