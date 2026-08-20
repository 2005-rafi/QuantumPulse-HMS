const mongoose = require('mongoose');

/**
 * DoctorSchedule Model — defines weekly slot availability for doctors per department.
 *
 * SOLID / SRP: Only owns doctor schedule persistence & integrity.
 */
const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Doctor ID is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
    },
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required (0-6)'],
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g. "09:00")'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g. "17:00")'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    slotDurationMinutes: {
      type: Number,
      default: 15,
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [120, 'Slot duration cannot exceed 120 minutes'],
    },
    maxPatientsPerSlot: {
      type: Number,
      default: 1,
      min: [1, 'Capacity must be at least 1 patient per slot'],
      max: [50, 'Capacity cannot exceed 50 patients per slot'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique schedule per doctor, department, and dayOfWeek
doctorScheduleSchema.index({ doctorId: 1, departmentId: 1, dayOfWeek: 1 }, { unique: true });
doctorScheduleSchema.index({ doctorId: 1, isActive: 1 });
doctorScheduleSchema.index({ departmentId: 1, isActive: 1 });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);
