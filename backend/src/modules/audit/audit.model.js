const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  actorRole: {
    type: String,
  },
  targetId: {
    type: String,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
}, { 
  timestamps: { createdAt: 'timestamp', updatedAt: false } 
});

// Indexes for high-frequency search, filter, and chronological cursor pagination
auditLogSchema.index({ timestamp: -1, _id: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ action: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ targetId: 1, timestamp: -1 });

// Prevent any modifications (append-only)
auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs are immutable');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
