const mongoose = require('mongoose');

const deletionRequestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
  },
  patientSnapshot: {
    fullName: { type: String, trim: true },
    mrn: { type: String, trim: true },
    phone: { type: String, trim: true },
    gender: { type: String, trim: true },
    age: { type: Number },
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  resolutionReason: {
    type: String,
    trim: true,
  },
  resolvedAt: {
    type: Date,
  },
}, { timestamps: true });

deletionRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DeletionRequest', deletionRequestSchema);

