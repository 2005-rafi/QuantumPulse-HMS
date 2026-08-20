const appointmentService = require('./appointment.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catchAsync');
const auditService = require('../audit/audit.service');

/**
 * AppointmentController — HTTP boundary for the appointment lifecycle.
 *
 * SOLID: SRP — handles HTTP request parsing, error capturing, audit logging & responses.
 * No business logic lives here.
 */
class AppointmentController {
  // ── CREATE ────────────────────────────────────────────────────────────────

  create = catchAsync(async (req, res) => {
    const appointment = await appointmentService.createAppointment(req.body, req.user.staffId || req.user.userId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'APPOINTMENT_CREATED',
      appointment._id,
      {
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: appointment.appointmentDate,
        time: appointment.startTime,
      },
      req.ip
    );

    return success(res, appointment, 'Appointment booked successfully', 201);
  });

  // ── AVAILABILITY ──────────────────────────────────────────────────────────

  getAvailability = catchAsync(async (req, res) => {
    const { doctorId, departmentId, date } = req.query;
    const availability = await appointmentService.getAvailableSlots(doctorId, departmentId, date);
    return success(res, availability, 'Slot availability retrieved successfully', 200);
  });

  // ── CHECK-IN ──────────────────────────────────────────────────────────────

  checkIn = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await appointmentService.checkIn(id, req.user.staffId || req.user.userId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'APPOINTMENT_CHECKED_IN',
      result.appointment._id,
      {
        visitId: result.visit._id,
        visitNumber: result.visit.visitNumber,
        tokenString: result.visit.tokenString,
      },
      req.ip
    );

    const message = result.alreadyCheckedIn
      ? 'Patient was already checked in'
      : 'Patient checked in successfully. Visit queue ticket generated.';

    return success(res, result, message, 200);
  });

  // ── RESCHEDULE ────────────────────────────────────────────────────────────

  reschedule = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updated = await appointmentService.rescheduleAppointment(
      id,
      req.body,
      req.user.staffId || req.user.userId
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'APPOINTMENT_RESCHEDULED',
      updated._id,
      {
        newDate: updated.appointmentDate,
        newTime: updated.startTime,
        reason: req.body.reason,
      },
      req.ip
    );

    return success(res, updated, 'Appointment rescheduled successfully', 200);
  });

  // ── CANCEL ────────────────────────────────────────────────────────────────

  cancel = catchAsync(async (req, res) => {
    const { id } = req.params;
    const cancellationReason = req.body.cancellationReason || req.body.reason;
    const updated = await appointmentService.cancelAppointment(
      id,
      cancellationReason,
      req.user.staffId || req.user.userId
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'APPOINTMENT_CANCELLED',
      updated._id,
      { cancellationReason },
      req.ip
    );

    return success(res, updated, 'Appointment cancelled successfully', 200);
  });

  // ── MARK MISSED ───────────────────────────────────────────────────────────

  markMissed = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updated = await appointmentService.markMissed(id, req.user.staffId || req.user.userId);

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'APPOINTMENT_MARKED_MISSED',
      updated._id,
      null,
      req.ip
    );

    return success(res, updated, 'Appointment marked as missed', 200);
  });

  // ── LIST & DETAILS ────────────────────────────────────────────────────────

  list = catchAsync(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const data = await appointmentService.getAppointments(filters, { page, limit });
    return success(res, data, 'Appointments retrieved successfully', 200);
  });

  getById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const appointment = await appointmentService.getAppointmentById(id);
    return success(res, appointment, 'Appointment details retrieved successfully', 200);
  });

  getDoctorAppointments = catchAsync(async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;
    const appointments = await appointmentService.getDoctorScheduleAppointments(doctorId, date);
    return success(res, appointments, "Doctor's appointments retrieved successfully", 200);
  });

  // ── DOCTOR DIRECTORY ──────────────────────────────────────────────────────

  getDoctorsByDepartment = catchAsync(async (req, res) => {
    const { departmentId } = req.query;
    const doctors = await appointmentService.getDoctorsByDepartment(departmentId);
    return success(res, doctors, 'Doctors list retrieved successfully', 200);
  });

  // ── SCHEDULE MANAGEMENT (ADMIN) ───────────────────────────────────────────

  createSchedule = catchAsync(async (req, res) => {
    const schedule = await appointmentService.createDoctorSchedule(
      req.body,
      req.user.staffId || req.user.userId
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'SCHEDULE_CREATED',
      schedule._id,
      req.body,
      req.ip
    );

    return success(res, schedule, 'Doctor schedule saved successfully', 201);
  });

  getDoctorSchedules = catchAsync(async (req, res) => {
    const { doctorId } = req.params;
    const schedules = await appointmentService.getDoctorSchedules(doctorId);
    return success(res, schedules, 'Doctor schedules retrieved successfully', 200);
  });

  listAllSchedules = catchAsync(async (req, res) => {
    const schedules = await appointmentService.listAllSchedules(req.query);
    return success(res, schedules, 'All schedules retrieved successfully', 200);
  });

  updateSchedule = catchAsync(async (req, res) => {
    const { id } = req.params;
    const schedule = await appointmentService.updateDoctorSchedule(
      id,
      req.body,
      req.user.staffId || req.user.userId
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'SCHEDULE_UPDATED',
      schedule._id,
      req.body,
      req.ip
    );

    return success(res, schedule, 'Doctor schedule updated successfully', 200);
  });
}

module.exports = new AppointmentController();
