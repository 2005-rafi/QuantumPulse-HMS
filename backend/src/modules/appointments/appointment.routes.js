const express = require('express');
const router = express.Router();
const controller = require('./appointment.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  markMissedSchema,
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
} = require('./appointment.validation');

// All appointment routes require authentication
router.use(authenticate);

// ── Static Routes (Registered BEFORE parameterized /:id routes) ─────────────

// Doctors lookup for appointment booking
router.get(
  '/doctors',
  requirePermission(['APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'VISIT_CREATE']),
  controller.getDoctorsByDepartment
);

// Slot Availability calculation
router.get(
  '/availability',
  requirePermission(['APPOINTMENT_VIEW', 'APPOINTMENT_CREATE']),
  controller.getAvailability
);

// Doctor Schedules (Admin & View)
router.get(
  '/schedules',
  requirePermission(['APPOINTMENT_VIEW', 'APPOINTMENT_MANAGE_SCHEDULE']),
  controller.listAllSchedules
);
router.post(
  '/schedules',
  requirePermission('APPOINTMENT_MANAGE_SCHEDULE'),
  validate(createDoctorScheduleSchema),
  controller.createSchedule
);
router.get(
  '/schedules/doctor/:doctorId',
  requirePermission(['APPOINTMENT_VIEW', 'APPOINTMENT_MANAGE_SCHEDULE']),
  controller.getDoctorSchedules
);
router.put(
  '/schedules/:id',
  requirePermission('APPOINTMENT_MANAGE_SCHEDULE'),
  validate(updateDoctorScheduleSchema),
  controller.updateSchedule
);

// Doctor specific appointments (Doctor Dashboard)
router.get(
  '/doctor/:doctorId',
  requirePermission('APPOINTMENT_VIEW'),
  controller.getDoctorAppointments
);

// ── Appointment Core CRUD ───────────────────────────────────────────────────

router.get(
  '/',
  requirePermission('APPOINTMENT_VIEW'),
  controller.list
);

router.post(
  '/',
  requirePermission('APPOINTMENT_CREATE'),
  validate(createAppointmentSchema),
  controller.create
);

router.get(
  '/:id',
  requirePermission('APPOINTMENT_VIEW'),
  controller.getById
);

router.patch(
  '/:id/check-in',
  requirePermission('APPOINTMENT_CHECKIN'),
  controller.checkIn
);

router.patch(
  '/:id/reschedule',
  requirePermission('APPOINTMENT_UPDATE'),
  validate(rescheduleAppointmentSchema),
  controller.reschedule
);

router.patch(
  '/:id/cancel',
  requirePermission('APPOINTMENT_CANCEL'),
  validate(cancelAppointmentSchema),
  controller.cancel
);

router.patch(
  '/:id/missed',
  requirePermission('APPOINTMENT_MARK_MISSED'),
  validate(markMissedSchema),
  controller.markMissed
);

module.exports = router;
