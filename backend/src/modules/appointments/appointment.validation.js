const Joi = require('joi');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createAppointmentSchema = Joi.object({
  patientId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid patient ID format',
    'any.required': 'Patient selection is required',
  }),
  departmentId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid department ID format',
    'any.required': 'Department selection is required',
  }),
  doctorId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid doctor ID format',
    'any.required': 'Doctor selection is required',
  }),
  appointmentType: Joi.string().valid('SCHEDULED', 'WALK_IN', 'FOLLOW_UP').default('SCHEDULED'),
  appointmentDate: Joi.date().iso().required().messages({
    'date.base': 'Invalid appointment date',
    'any.required': 'Appointment date is required',
  }),
  startTime: Joi.string().pattern(timeRegex).required().messages({
    'string.pattern.base': 'Start time must be in HH:mm format (e.g. 09:30)',
    'any.required': 'Start time is required',
  }),
  endTime: Joi.string().pattern(timeRegex).required().messages({
    'string.pattern.base': 'End time must be in HH:mm format (e.g. 09:45)',
    'any.required': 'End time is required',
  }),
  reason: Joi.string().trim().max(1000).allow('').optional(),
  notes: Joi.string().trim().max(1000).allow('').optional(),
  source: Joi.string().valid('RECEPTION', 'ONLINE').default('RECEPTION'),
});

const rescheduleAppointmentSchema = Joi.object({
  appointmentDate: Joi.date().iso().required().messages({
    'date.base': 'Invalid appointment date',
    'any.required': 'New appointment date is required',
  }),
  startTime: Joi.string().pattern(timeRegex).required().messages({
    'string.pattern.base': 'Start time must be in HH:mm format (e.g. 09:30)',
    'any.required': 'Start time is required',
  }),
  endTime: Joi.string().pattern(timeRegex).required().messages({
    'string.pattern.base': 'End time must be in HH:mm format (e.g. 09:45)',
    'any.required': 'End time is required',
  }),
  doctorId: Joi.string().hex().length(24).optional(),
  departmentId: Joi.string().hex().length(24).optional(),
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'string.min': 'Reschedule reason must be at least 3 characters',
    'any.required': 'Reschedule reason is required for audit trail',
  }),
});

const cancelAppointmentSchema = Joi.object({
  cancellationReason: Joi.string().trim().min(3).max(500).optional().messages({
    'string.min': 'Cancellation reason must be at least 3 characters',
  }),
  reason: Joi.string().trim().min(3).max(500).optional().messages({
    'string.min': 'Cancellation reason must be at least 3 characters',
  }),
}).or('cancellationReason', 'reason').messages({
  'object.missing': 'Cancellation reason is required',
});

const markMissedSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow('').optional(),
});

const createDoctorScheduleSchema = Joi.object({
  doctorId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid doctor ID format',
    'any.required': 'Doctor selection is required',
  }),
  departmentId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid department ID format',
    'any.required': 'Department selection is required',
  }),
  dayOfWeek: Joi.number().integer().min(0).max(6).required().messages({
    'number.min': 'Day of week must be between 0 (Sun) and 6 (Sat)',
    'number.max': 'Day of week must be between 0 (Sun) and 6 (Sat)',
    'any.required': 'Day of week is required',
  }),
  startTime: Joi.string().pattern(timeRegex).required(),
  endTime: Joi.string().pattern(timeRegex).required(),
  slotDurationMinutes: Joi.number().integer().min(5).max(120).default(15),
  maxPatientsPerSlot: Joi.number().integer().min(1).max(50).default(1),
  isActive: Joi.boolean().default(true),
});

const updateDoctorScheduleSchema = Joi.object({
  startTime: Joi.string().pattern(timeRegex).optional(),
  endTime: Joi.string().pattern(timeRegex).optional(),
  slotDurationMinutes: Joi.number().integer().min(5).max(120).optional(),
  maxPatientsPerSlot: Joi.number().integer().min(1).max(50).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  markMissedSchema,
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
};
