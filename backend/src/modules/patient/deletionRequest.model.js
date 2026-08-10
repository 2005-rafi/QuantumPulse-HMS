const mongoose = require('mongoose');

const deletionRequestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  resolvedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('DeletionRequest', deletionRequestSchema);
