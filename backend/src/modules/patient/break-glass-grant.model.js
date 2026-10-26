/**
 * backend/src/modules/patient/break-glass-grant.model.js
 * Mongoose schema for HIPAA Break-Glass Emergency Chart Access Grants.
 */
const mongoose = require('mongoose');

const breakGlassGrantSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      default: 'Emergency',
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    clinicalEncounterType: {
      type: String,
      enum: ['EMERGENCY', 'TRAUMA', 'RESUSCITATION', 'CRITICAL_CARE', 'SURGICAL_INTERVENTION', 'OTHER'],
      default: 'EMERGENCY',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast active grant verification
breakGlassGrantSchema.index({ patientId: 1, staffId: 1, status: 1, expiresAt: 1 });

module.exports = mongoose.model('BreakGlassGrant', breakGlassGrantSchema);
