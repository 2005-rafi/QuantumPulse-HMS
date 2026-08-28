const Appointment = require('./appointment.model');
const DoctorSchedule = require('./doctorSchedule.model');
const { decryptPatient } = require('../patient/patient.repository');

const decryptPopulatedAppointment = (appt) => {
  if (!appt) return appt;
  if (Array.isArray(appt)) {
    return appt.map((a) => decryptPopulatedAppointment(a));
  }
  const clone = appt.toObject ? appt.toObject({ flattenMaps: true }) : { ...appt };
  if (clone.patientId && typeof clone.patientId === 'object') {
    clone.patientId = decryptPatient(clone.patientId);
  }
  if (clone.visitId && typeof clone.visitId === 'object' && clone.visitId.patientId && typeof clone.visitId.patientId === 'object') {
    clone.visitId.patientId = decryptPatient(clone.visitId.patientId);
  }
  return clone;
};

class AppointmentRepository {
  // ── APPOINTMENT PERSISTENCE ───────────────────────────────────────────────

  async create(data, options = {}) {
    let doc;
    if (options.session) {
      const [newDoc] = await Appointment.create([data], options);
      doc = newDoc;
    } else {
      doc = await Appointment.create(data);
    }
    return this.findById(doc._id, options);
  }

  async findById(id, options = {}) {
    const doc = await Appointment.findById(id, null, options)
      .populate('patientId')
      .populate('departmentId', 'name code type status')
      .populate('doctorId', 'fullName employeeId position primarySpecialization consultingFee followUpFee')
      .populate('visitId')
      .populate('createdBy', 'fullName employeeId')
      .populate('cancelledBy', 'fullName employeeId');
    return decryptPopulatedAppointment(doc);
  }

  async findOne(filter, options = {}) {
    const doc = await Appointment.findOne(filter, null, options)
      .populate('patientId')
      .populate('departmentId', 'name code type status')
      .populate('doctorId', 'fullName employeeId position primarySpecialization')
      .populate('visitId');
    return decryptPopulatedAppointment(doc);
  }

  async updateById(id, data, options = {}) {
    const doc = await Appointment.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
      ...options,
    })
      .populate('patientId')
      .populate('departmentId', 'name code type status')
      .populate('doctorId', 'fullName employeeId position primarySpecialization consultingFee followUpFee')
      .populate('visitId')
      .populate('createdBy', 'fullName employeeId')
      .populate('cancelledBy', 'fullName employeeId');
    return decryptPopulatedAppointment(doc);
  }

  async findAll(filter = {}, pagination = {}, sort = { appointmentDate: 1, startTime: 1 }) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId')
        .populate('departmentId', 'name code type status')
        .populate('doctorId', 'fullName employeeId position primarySpecialization consultingFee followUpFee')
        .populate('visitId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return {
      items: decryptPopulatedAppointment(docs),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async countSlotOccupancy(doctorId, date, startTime, options = {}) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: { $in: ['SCHEDULED', 'CHECKED_IN'] },
    };

    return Appointment.countDocuments(query, options);
  }

  async findActiveAppointmentsForDoctorOnDate(doctorId, date, options = {}) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const docs = await Appointment.find(
      {
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['SCHEDULED', 'CHECKED_IN', 'COMPLETED'] },
      },
      null,
      options
    ).sort({ startTime: 1 });

    return docs;
  }

  async getDashboardSummary(dateFilter = {}) {
    const summary = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      total: 0,
      SCHEDULED: 0,
      CHECKED_IN: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      MISSED: 0,
      RESCHEDULED: 0,
    };

    summary.forEach((item) => {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
      counts.total += item.count;
    });

    return counts;
  }

  // ── DOCTOR SCHEDULE PERSISTENCE ───────────────────────────────────────────

  async createSchedule(data, options = {}) {
    return DoctorSchedule.create(data);
  }

  async findScheduleById(id) {
    return DoctorSchedule.findById(id)
      .populate('doctorId', 'fullName employeeId position primarySpecialization departmentId')
      .populate('departmentId', 'name code');
  }

  async findSchedulesByDoctor(doctorId, isActive = true) {
    const filter = { doctorId };
    if (isActive !== undefined) filter.isActive = isActive;
    return DoctorSchedule.find(filter)
      .populate('departmentId', 'name code')
      .sort({ dayOfWeek: 1, startTime: 1 });
  }

  async findScheduleByDoctorAndDay(doctorId, departmentId, dayOfWeek) {
    const filter = { doctorId, dayOfWeek, isActive: true };
    if (departmentId) filter.departmentId = departmentId;
    return DoctorSchedule.findOne(filter).populate('departmentId', 'name code');
  }

  async updateSchedule(id, data) {
    return DoctorSchedule.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('departmentId', 'name code');
  }

  async listAllSchedules(filter = {}) {
    return DoctorSchedule.find(filter)
      .populate('doctorId', 'fullName employeeId position primarySpecialization')
      .populate('departmentId', 'name code')
      .sort({ doctorId: 1, dayOfWeek: 1 });
  }
}

module.exports = new AppointmentRepository();
