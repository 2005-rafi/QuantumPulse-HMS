const mongoose = require('mongoose');

const positionHistorySchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    previousPosition: { type: String, default: null }, // Null for initial assignment
    newPosition: { type: String, required: true },
    changeType: { 
      type: String, 
      enum: ['ASSIGNMENT', 'PROMOTION', 'DEMOTION', 'LATERAL'], 
      required: true 
    },
    reason: { type: String, default: '' },
    effectiveDate: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true }
  },
  { timestamps: true }
);

// Indexing for efficient lookups by staffId
positionHistorySchema.index({ staffId: 1 });

module.exports = mongoose.model('PositionHistory', positionHistorySchema);
