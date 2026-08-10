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
