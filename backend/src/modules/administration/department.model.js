const mongoose = require('mongoose');

/**
 * Department Model — represents a functional organizational unit in the hospital.
 *
 * SOLID / SRP: This model only defines the department's persistent structure.
 * Business rules (HOD eligibility, code uniqueness) live in the service layer.
 *
 * Design: A department is created first (no staff, no HOD).
 * Staff are assigned after creation. HOD is assigned after eligible staff exist.
 * Per docs/file.md §Department Creation Workflow.
 */
const departmentSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    // Short uppercase code for token generation and display (e.g. 'CARD', 'LAB').
    // Required and unique per docs/file.md §Department Code.
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Department code must not exceed 10 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Classification ──────────────────────────────────────────────────────────
    // Five types per docs/file.md §Department Types.
    type: {
      type: String,
      enum: {
        values: ['CLINICAL', 'DIAGNOSTIC', 'CLINICAL/DIAGNOSTIC', 'SUPPORT', 'ADMINISTRATIVE'],
        message: 'Invalid department type: {VALUE}',
      },
      required: [true, 'Department type is required'],
    },

    // ── Operational Status ──────────────────────────────────────────────────────
    // Active: dept participates in HMS operations.
    // Inactive: dept is dormant; soft-deleted, not hard-deleted.
    status: {
      type: String,
      enum: { values: ['Active', 'Inactive'], message: 'Status must be Active or Inactive' },
      default: 'Active',
    },

    // ── Leadership ──────────────────────────────────────────────────────────────
    // Nullable. Assigned after creation once eligible staff exist.
    // Per docs/file.md §Why HOD Is Not Selected During Department Creation.
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },

    // ── Dynamic Vitals Schema ───────────────────────────────────────────────────
    // Configurable per-department vital fields used during patient triage.
    vitalFields: [
      {
        name:     { type: String, required: true },
        label:    { type: String, required: true },
        type:     { type: String, enum: ['text', 'number', 'boolean'], default: 'text' },
        unit:     { type: String, default: '' },
        required: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);

