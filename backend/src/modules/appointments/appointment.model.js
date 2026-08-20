const mongoose = require('mongoose');

/**
 * Appointment Model — represents planned future healthcare interactions.
 *
 * Distinct from Visit:
 *   - Appointment: scheduling domain (plans, bookings, slots)
 *   - Visit: clinical execution domain (triage, consultation, pharmacy, billing)
 *
 * SOLID / SRP: Only owns appointment persistence & state constraints.
 */
const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Doctor ID is required'],
    },
    appointmentType: {
      type: String,
      enum: ['SCHEDULED', 'WALK_IN', 'FOLLOW_UP'],
      default: 'SCHEDULED',
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'MISSED', 'RESCHEDULED'],
      default: 'SCHEDULED',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['RECEPTION', 'ONLINE'],
      default: 'RECEPTION',
    },
    // Linked when checked in into an OPD visit
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    missedAt: {
      type: Date,
      default: null,
    },
    rescheduledFrom: {
      appointmentDate: Date,
      startTime: String,
      endTime: String,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      changedAt: Date,
      reason: String,
    },
  },
  { timestamps: true }
);

// Indexes for high-efficiency operational queries & schedule lookups
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ departmentId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ visitId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
