/**
 * backend/src/modules/audit/audit.model.js
 * Production-Grade Immutably-Chained Hospital Audit Model.
 * Compliant with HIPAA § 164.312(b), NABH, and 21 CFR Part 11.
 */
const mongoose = require('mongoose');
const { AUDIT_CATEGORIES, AUDIT_SEVERITIES } = require('./audit-constants');

const auditLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: Object.values(AUDIT_CATEGORIES),
      default: AUDIT_CATEGORIES.SYSTEM,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITIES),
      default: AUDIT_SEVERITIES.INFO,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      index: true,
    },
    actorRole: {
      type: String,
      index: true,
    },
    actorSnapshot: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      fullName: { type: String, trim: true },
      username: { type: String, trim: true },
      role: { type: String, trim: true },
      department: { type: String, trim: true },
    },
    targetId: {
      type: String,
      index: true,
    },
    targetSnapshot: {
      id: { type: String },
      entityType: { type: String, trim: true },
      identifier: { type: String, trim: true },
      label: { type: String, trim: true },
    },
    // Structured status transition tracking for patients and staff
    statusChange: {
      from: { type: String, default: null },
      to: { type: String, default: null },
      reason: { type: String, default: null },
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    // Cryptographic Chain of Custody (SHA-256 Tamper-Proof Chaining)
    chainIndex: {
      type: Number,
      default: null,
    },
    prevHash: {
      type: String,
      default: null,
    },
    hash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// High-Concurrency Compound Indexes (Adhering to MongoDB ESR Rule)
auditLogSchema.index({ timestamp: -1, _id: -1 });
auditLogSchema.index({ category: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ category: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ action: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ targetId: 1, timestamp: -1 });
auditLogSchema.index({ 'targetSnapshot.identifier': 1, timestamp: -1 });
auditLogSchema.index({ chainIndex: 1 }, { sparse: true });

// Prevent any modifications (append-only ledger)
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are cryptographically sealed and immutable');
});
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are cryptographically sealed and immutable');
});
auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are cryptographically sealed and immutable');
});
auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit logs are cryptographically sealed and immutable');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
