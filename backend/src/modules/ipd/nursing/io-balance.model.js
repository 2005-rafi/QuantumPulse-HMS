/**
 * modules/ipd/nursing/io-balance.model.js
 * Fluid Intake / Output balance ledger per shift.
 */
const mongoose = require('mongoose');

const ioBalanceSchema = new mongoose.Schema(
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
    recordedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    shift: {
      type: String,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      required: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    // Intake items (in mL)
    intake: {
      oral: { type: Number, default: 0, min: 0 },
      ivFluids: { type: Number, default: 0, min: 0 },
      rylesTube: { type: Number, default: 0, min: 0 },
      bloodProducts: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    // Output items (in mL)
    output: {
      urine: { type: Number, default: 0, min: 0 },
      drainage: { type: Number, default: 0, min: 0 },
      vomitus: { type: Number, default: 0, min: 0 },
      stool: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    totalIntake: {
      type: Number,
      default: 0,
    },
    totalOutput: {
      type: Number,
      default: 0,
    },
    netBalance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

ioBalanceSchema.pre('save', function () {
  const i = this.intake || {};
  const o = this.output || {};
  this.totalIntake = (i.oral || 0) + (i.ivFluids || 0) + (i.rylesTube || 0) + (i.bloodProducts || 0) + (i.other || 0);
  this.totalOutput = (o.urine || 0) + (o.drainage || 0) + (o.vomitus || 0) + (o.stool || 0) + (o.other || 0);
  this.netBalance = this.totalIntake - this.totalOutput;
});

ioBalanceSchema.index({ admissionId: 1, recordedAt: -1 });

module.exports = mongoose.model('IOBalance', ioBalanceSchema);
