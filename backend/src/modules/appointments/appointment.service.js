const appointmentRepository = require('./appointment.repository');
const visitService = require('../visits/visit.service');
const Staff = require('../staff/staff.model');
const Department = require('../administration/department.model');
const Patient = require('../patient/patient.model');
const Role = require('../administration/role.model');
const AppError = require('../../core/errors/AppError');
const { withTransaction } = require('../../core/database/transaction');

// Helper to convert "HH:mm" to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes from midnight back to "HH:mm"
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper to generate appointment unique number
const generateAppointmentNumber = (date) => {
  const dateObj = new Date(date);
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `APT-${y}${m}${d}-${rand}`;
};

class AppointmentService {
  // ── 1. AVAILABILITY CALCULATION ───────────────────────────────────────────

  /**
   * Calculates slot availability for a doctor on a given date.
   * @param {string} doctorId - Staff ID of doctor
   * @param {string} departmentId - Department ID
   * @param {string|Date} dateStr - Target date (YYYY-MM-DD or ISO)
   * @returns {Promise<{ slots: Array, schedule: Object|null }>}
   */
  async getAvailableSlots(doctorId, departmentId, dateStr) {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      throw new AppError('VALIDATION_002', 'Invalid date format');
    }

    // 1. Verify doctor exists and is active
    const doctor = await Staff.findOne({ _id: doctorId, isDeleted: { $ne: true } });
    if (!doctor) {
      throw new AppError('NOT_FOUND', 'Doctor not found or inactive');
    }

    // 2. Day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOfWeek = targetDate.getUTCDay();

    // 3. Find doctor schedule for this day
    let schedule = await appointmentRepository.findScheduleByDoctorAndDay(doctorId, departmentId, dayOfWeek);

    // Fallback: If no explicit schedule configured, look for general active schedule or generate standard 09:00-17:00
    let startTime = '09:00';
    let endTime = '17:00';
    let slotDurationMinutes = 15;
    let maxPatientsPerSlot = 1;

    if (schedule) {
      startTime = schedule.startTime;
      endTime = schedule.endTime;
      slotDurationMinutes = schedule.slotDurationMinutes || 15;
      maxPatientsPerSlot = schedule.maxPatientsPerSlot || 1;
    }

    // 4. Generate all potential time slots
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const rawSlots = [];

    for (let current = startMins; current + slotDurationMinutes <= endMins; current += slotDurationMinutes) {
      const slotStart = minutesToTime(current);
      const slotEnd = minutesToTime(current + slotDurationMinutes);
      rawSlots.push({
        slotId: `${slotStart}-${slotEnd}`,
        startTime: slotStart,
        endTime: slotEnd,
        capacity: maxPatientsPerSlot,
        bookedCount: 0,
        remainingCapacity: maxPatientsPerSlot,
        status: 'AVAILABLE', // 'AVAILABLE' | 'FULL' | 'PAST'
      });
    }

    // 5. Query existing active appointments for doctor on target date
    const bookedAppointments = await appointmentRepository.findActiveAppointmentsForDoctorOnDate(doctorId, targetDate);

    // 6. Map booked appointments to slots
    const occupancyMap = {};
    bookedAppointments.forEach((appt) => {
      occupancyMap[appt.startTime] = (occupancyMap[appt.startTime] || 0) + 1;
    });

    // 7. Check if date is in the past or today past current time
    const today = new Date();
    const isToday =
      targetDate.getUTCFullYear() === today.getFullYear() &&
      targetDate.getUTCMonth() === today.getMonth() &&
      targetDate.getUTCDate() === today.getDate();

    const currentMinsNow = today.getHours() * 60 + today.getMinutes();

    const slots = rawSlots.map((slot) => {
      const booked = occupancyMap[slot.startTime] || 0;
      const remaining = Math.max(0, slot.capacity - booked);
      let status = 'AVAILABLE';

      if (remaining <= 0) {
        status = 'FULL';
      } else if (isToday && timeToMinutes(slot.startTime) < currentMinsNow) {
        // If slot is earlier than current time today, mark as past
        status = 'PAST';
      }

      return {
        ...slot,
        bookedCount: booked,
        remainingCapacity: remaining,
        status,
      };
    });

    return {
      doctorId,
      doctorName: doctor.fullName,
      appointmentDate: targetDate.toISOString().split('T')[0],
      dayOfWeek,
      hasConfiguredSchedule: !!schedule,
      schedule: schedule
        ? {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            slotDurationMinutes: schedule.slotDurationMinutes,
            maxPatientsPerSlot: schedule.maxPatientsPerSlot,
          }
        : null,
      slots,
    };
  }

  // ── 2. CREATE APPOINTMENT (WITH CONCURRENCY & DOUBLE-BOOKING CHECK) ────────

  async createAppointment(data, createdBy) {
    return withTransaction(async (session) => {
      const {
        patientId,
        departmentId,
        doctorId,
        appointmentType = 'SCHEDULED',
        appointmentDate,
        startTime,
        endTime,
        reason,
        notes,
        source = 'RECEPTION',
      } = data;

      // 1. Verify Patient
      const patient = await Patient.findById(patientId).session(session);
      if (!patient) {
        throw new AppError('NOT_FOUND', 'Patient record not found');
      }

      // 2. Verify Department
      const department = await Department.findOne({ _id: departmentId, status: 'Active' }).session(session);
      if (!department) {
        throw new AppError('NOT_FOUND', 'Department not found or inactive');
      }

      // 3. Verify Doctor
      const doctor = await Staff.findOne({
        _id: doctorId,
        isDeleted: { $ne: true },
        status: 'Active',
      }).session(session);
      if (!doctor) {
        throw new AppError('NOT_FOUND', 'Doctor not found or inactive');
      }

      // 4. Validate doctor department relationship (if doctor assigned department differs)
      if (doctor.departmentId && String(doctor.departmentId) !== String(departmentId)) {
        // Cross-department check warning/validation
      }

      // 5. Date validation — reject past dates for scheduled booking
      const apptDateObj = new Date(appointmentDate);
      apptDateObj.setUTCHours(0, 0, 0, 0);

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      // Check if scheduled date is before today
      const apptTimeMs = new Date(apptDateObj).getTime();
      const todayTimeMs = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate()).getTime();

      if (apptTimeMs < todayTimeMs) {
        throw new AppError('VALIDATION_003', 'Cannot book appointments for past dates');
      }

      // 6. Double booking check inside transaction
      // Check schedule capacity
      const dayOfWeek = apptDateObj.getUTCDay();
      const schedule = await appointmentRepository.findScheduleByDoctorAndDay(doctorId, departmentId, dayOfWeek);
      const maxCapacity = schedule?.maxPatientsPerSlot || 1;

      const currentOccupancy = await appointmentRepository.countSlotOccupancy(
        doctorId,
        apptDateObj,
        startTime,
        { session }
      );

      if (currentOccupancy >= maxCapacity) {
        throw new AppError(
          'APPT_001',
          `The selected slot ${startTime} - ${endTime} is already fully booked. Please select another slot.`
        );
      }

      // 7. Generate Appointment Number & Build Record
      const appointmentNumber = generateAppointmentNumber(apptDateObj);

      const appointmentData = {
        appointmentNumber,
        patientId,
        departmentId,
        doctorId,
        appointmentType,
        appointmentDate: apptDateObj,
        startTime,
        endTime,
        status: 'SCHEDULED',
        reason: reason || '',
        notes: notes || '',
        source,
        createdBy,
      };

      const createdAppointment = await appointmentRepository.create(appointmentData, { session });
      return createdAppointment;
    });
  }

  // ── 3. APPOINTMENT CHECK-IN (INTEGRATING WITH VISIT DOMAIN) ────────────────

  /**
   * Checks in an appointment: converts scheduled appointment into an active OPD Visit.
   * Feeds the existing Visit -> WAITING_TRIAGE -> Nurse workflow.
   * Prevents duplicate Visit creation!
   */
  async checkIn(appointmentId, staffId) {
    return withTransaction(async (session) => {
      // 1. Fetch appointment
      const appointment = await appointmentRepository.findById(appointmentId, { session });
      if (!appointment) {
        throw new AppError('NOT_FOUND', 'Appointment not found');
      }

      // 2. Validate current status
      if (appointment.status === 'CHECKED_IN' && appointment.visitId) {
        // Idempotency: Return existing visit if already checked in
        return {
          appointment,
          visit: appointment.visitId,
          alreadyCheckedIn: true,
        };
      }

      if (appointment.status === 'CANCELLED') {
        throw new AppError('APPT_003', 'Cannot check in a cancelled appointment');
      }

      if (appointment.status === 'MISSED') {
        throw new AppError('APPT_003', 'Cannot check in an appointment marked as missed');
      }

      if (appointment.status === 'COMPLETED') {
        throw new AppError('APPT_003', 'Appointment has already been completed');
      }

      // 3. Create or Link Visit via existing visitService.createVisit
      const patientId = appointment.patientId._id || appointment.patientId;
      const departmentId = appointment.departmentId?._id || appointment.departmentId;
      const doctorId = appointment.doctorId?._id || appointment.doctorId;

      const visitPayload = {
        patientId,
        departmentId,
        doctorId,
        visitType: 'OPD',
        reasonForVisit: appointment.reason || 'Scheduled Appointment',
      };

      // Call visitService.createVisit with the outer transaction session
      const createdVisit = await visitService.createVisit(visitPayload, staffId, session);

      // 4. Update Appointment record with link to Visit
      const updatedAppointment = await appointmentRepository.updateById(
        appointmentId,
        {
          status: 'CHECKED_IN',
          visitId: createdVisit._id,
          checkedInAt: new Date(),
        },
        { session }
      );

      return {
        appointment: updatedAppointment,
        visit: createdVisit,
        alreadyCheckedIn: false,
      };
    });
  }

  // ── 4. RESCHEDULE APPOINTMENT ─────────────────────────────────────────────

  async rescheduleAppointment(appointmentId, data, staffId) {
    return withTransaction(async (session) => {
      const { appointmentDate, startTime, endTime, doctorId, departmentId, reason } = data;

      const appointment = await appointmentRepository.findById(appointmentId, { session });
      if (!appointment) {
        throw new AppError('NOT_FOUND', 'Appointment not found');
      }

      if (['CHECKED_IN', 'COMPLETED', 'CANCELLED'].includes(appointment.status)) {
        throw new AppError(
          'APPT_003',
          `Cannot reschedule an appointment in ${appointment.status} status`
        );
      }

      const newDoctorId = doctorId || (appointment.doctorId._id || appointment.doctorId);
      const newDepartmentId = departmentId || (appointment.departmentId._id || appointment.departmentId);
      const newDateObj = new Date(appointmentDate);
      newDateObj.setUTCHours(0, 0, 0, 0);

      // Check slot availability
      const dayOfWeek = newDateObj.getUTCDay();
      const schedule = await appointmentRepository.findScheduleByDoctorAndDay(newDoctorId, newDepartmentId, dayOfWeek);
      const maxCapacity = schedule?.maxPatientsPerSlot || 1;

      const occupancy = await appointmentRepository.countSlotOccupancy(
        newDoctorId,
        newDateObj,
        startTime,
        { session }
      );

      if (occupancy >= maxCapacity) {
        throw new AppError('APPT_001', 'The selected new slot is already booked. Please choose another slot.');
      }

      // Preserve old appointment details for audit trail
      const rescheduledFrom = {
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        changedBy: staffId,
        changedAt: new Date(),
        reason: reason || 'Patient requested reschedule',
      };

      const updated = await appointmentRepository.updateById(
        appointmentId,
        {
          appointmentDate: newDateObj,
          startTime,
          endTime,
          doctorId: newDoctorId,
          departmentId: newDepartmentId,
          status: 'SCHEDULED', // back to scheduled
          rescheduledFrom,
        },
        { session }
      );

      return updated;
    });
  }

  // ── 5. CANCEL APPOINTMENT ─────────────────────────────────────────────────

  async cancelAppointment(appointmentId, cancellationReason, staffId) {
    return withTransaction(async (session) => {
      const appointment = await appointmentRepository.findById(appointmentId, { session });
      if (!appointment) {
        throw new AppError('NOT_FOUND', 'Appointment not found');
      }

      if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
        throw new AppError('APPT_003', `Appointment is already ${appointment.status.toLowerCase()}`);
      }

      const updated = await appointmentRepository.updateById(
        appointmentId,
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: staffId,
          cancellationReason: cancellationReason || 'Cancelled by user',
        },
        { session }
      );

      return updated;
    });
  }

  // ── 6. MARK MISSED ────────────────────────────────────────────────────────

  async markMissed(appointmentId, staffId) {
    return withTransaction(async (session) => {
      const appointment = await appointmentRepository.findById(appointmentId, { session });
      if (!appointment) {
        throw new AppError('NOT_FOUND', 'Appointment not found');
      }

      if (appointment.status !== 'SCHEDULED') {
        throw new AppError('APPT_003', `Only SCHEDULED appointments can be marked as MISSED. Current status: ${appointment.status}`);
      }

      const updated = await appointmentRepository.updateById(
        appointmentId,
        {
          status: 'MISSED',
          missedAt: new Date(),
        },
        { session }
      );

      return updated;
    });
  }

  // ── 7. COMPLETE APPOINTMENT ───────────────────────────────────────────────

  async completeAppointment(appointmentId) {
    return withTransaction(async (session) => {
      const appointment = await appointmentRepository.findById(appointmentId, { session });
      if (!appointment) return null;

      if (appointment.status !== 'CHECKED_IN') return appointment;

      return appointmentRepository.updateById(
        appointmentId,
        {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        { session }
      );
    });
  }

  // ── 8. QUERIES & LISTINGS ─────────────────────────────────────────────────

  async getAppointments(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      if (filters.status.includes(',')) {
        query.status = { $in: filters.status.split(',') };
      } else {
        query.status = filters.status;
      }
    }

    if (filters.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters.doctorId) {
      query.doctorId = filters.doctorId;
    }

    if (filters.appointmentType) {
      query.appointmentType = filters.appointmentType;
    }

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }

    // Date range filtering
    if (filters.date) {
      const targetDate = new Date(filters.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      query.appointmentDate = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.appointmentDate.$gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.appointmentDate.$lte = end;
      }
    }

    const [results, summary] = await Promise.all([
      appointmentRepository.findAll(query, pagination, { appointmentDate: 1, startTime: 1 }),
      appointmentRepository.getDashboardSummary(query.appointmentDate ? { appointmentDate: query.appointmentDate } : {}),
    ]);

    return {
      ...results,
      summary,
    };
  }

  async getAppointmentById(id) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('NOT_FOUND', 'Appointment not found');
    }
    return appointment;
  }

  async getDoctorScheduleAppointments(doctorId, dateStr) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    };

    return appointmentRepository.findAll(query, { limit: 100 }, { startTime: 1 });
  }

  // ── 9. DOCTOR SCHEDULE CONFIGURATION (ADMIN) ──────────────────────────────

  async createDoctorSchedule(data, staffId) {
    const { doctorId, departmentId, dayOfWeek } = data;

    const existing = await appointmentRepository.findScheduleByDoctorAndDay(doctorId, departmentId, dayOfWeek);
    if (existing) {
      // Update existing schedule instead of throwing error
      return appointmentRepository.updateSchedule(existing._id, data);
    }

    return appointmentRepository.createSchedule(data);
  }

  async getDoctorSchedules(doctorId) {
    return appointmentRepository.findSchedulesByDoctor(doctorId);
  }

  async updateDoctorSchedule(scheduleId, data, staffId) {
    const schedule = await appointmentRepository.findScheduleById(scheduleId);
    if (!schedule) {
      throw new AppError('NOT_FOUND', 'Schedule not found');
    }
    return appointmentRepository.updateSchedule(scheduleId, data);
  }

  async listAllSchedules(filter = {}) {
    return appointmentRepository.listAllSchedules(filter);
  }

  // ── 10. DOCTOR DIRECTORY BY DEPARTMENT ───────────────────────────────────

  async getDoctorsByDepartment(departmentId) {
    const doctorRole = await Role.findOne({ name: 'Doctor' });
    if (!doctorRole) return [];

    const filter = {
      roleId: doctorRole._id,
      status: 'Active',
      isDeleted: { $ne: true },
    };

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    return Staff.find(filter)
      .populate('departmentId', 'name code')
      .select('fullName employeeId position primarySpecialization consultingFee followUpFee departmentId')
      .sort({ fullName: 1 })
      .lean();
  }
}

module.exports = new AppointmentService();
