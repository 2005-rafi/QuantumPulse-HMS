const Visit = require('./visit.model');
const { decryptPatient } = require('../patient/patient.repository');
require('../staff/staff.model');
require('../administration/department.model');
require('../ipd/admission/ipd-admission.model');
require('../ipd/beds/bed.model');
require('../ipd/beds/room.model');
require('../ipd/beds/floor.model');

const DELETED_PATIENT_FALLBACK = Object.freeze({
  _id: null,
  firstName: 'Deleted',
  lastName: 'Patient',
  fullName: '[DELETED PATIENT]',
  mrn: 'DELETED-RECORD',
  age: null,
  displayAge: '—',
  gender: 'Unknown',
  phone: '—',
  allergies: '',
  operations: '',
  isDeleted: true,
  isOrphaned: true
});

const decryptPopulatedVisit = (visit) => {
  if (!visit) return visit;
  if (Array.isArray(visit)) {
    return visit.map(v => decryptPopulatedVisit(v));
  }
  const clone = visit.toObject ? visit.toObject({ flattenMaps: true }) : { ...visit };
  if (clone.patientId && typeof clone.patientId === 'object' && clone.patientId._id) {
    if (clone.patientId.isDeleted) {
      clone.patientId = {
        ...DELETED_PATIENT_FALLBACK,
        _id: clone.patientId._id,
        isDeleted: true,
      };
    } else {
      clone.patientId = decryptPatient(clone.patientId);
    }
  } else if (!clone.patientId || (typeof clone.patientId === 'object' && !clone.patientId.firstName)) {
    // Dangling reference protection: patient document was purged from database
    clone.patientId = {
      ...DELETED_PATIENT_FALLBACK,
      _id: clone.patientId?._id || (typeof clone.patientId === 'string' ? clone.patientId : null),
      isDeleted: true,
      isOrphaned: true,
    };
  }
  if (clone.labOrders && Array.isArray(clone.labOrders)) {
    clone.labOrders = clone.labOrders.map(order => {
      if (order.results && order.results instanceof Map) {
        order.results = Object.fromEntries(order.results);
      }
      return order;
    });
  }
  // Normalize reception fee fields onto the root visit object for billing/print consumers
  if (clone.receptionPayment) {
    if (clone.registrationFee === undefined && clone.receptionPayment.registrationFee !== undefined) {
      clone.registrationFee = clone.receptionPayment.registrationFee;
    }
    if (clone.consultationFee === undefined && clone.receptionPayment.consultationFee !== undefined) {
      clone.consultationFee = clone.receptionPayment.consultationFee;
    }
    if (clone.paymentMethod === undefined && clone.receptionPayment.paymentMethod !== undefined) {
      clone.paymentMethod = clone.receptionPayment.paymentMethod;
    }
  }

  // Normalize IPD admission doctor references (primaryDoctorId <-> admittingDoctorId)
  if (clone.ipdAdmissionId && typeof clone.ipdAdmissionId === 'object') {
    if (clone.ipdAdmissionId.primaryDoctorId && !clone.ipdAdmissionId.admittingDoctorId) {
      clone.ipdAdmissionId.admittingDoctorId = clone.ipdAdmissionId.primaryDoctorId;
    }
  }
  return clone;
};

class VisitRepository {
  async create(data, options = {}) {
    let doc;
    if (options.session) {
      const [newDoc] = await Visit.create([data], options);
      doc = newDoc;
    } else {
      doc = await Visit.create(data);
    }
    return decryptPopulatedVisit(doc);
  }

  async findById(id, options = {}) {
    const doc = await Visit.findById(id, null, options)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate('vitals.recordedBy', 'fullName employeeId position title')
      .populate('triage.skippedBy', 'fullName employeeId position title')
      .populate('triage.revokedBy', 'fullName employeeId position title');
    return decryptPopulatedVisit(doc);
  }

  async updateById(id, data, options = {}) {
    const doc = await Visit.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options })
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate('vitals.recordedBy', 'fullName employeeId position title')
      .populate('triage.skippedBy', 'fullName employeeId position title')
      .populate('triage.revokedBy', 'fullName employeeId position title');
    return decryptPopulatedVisit(doc);
  }

  async getQueue(status, filters = {}) {
    let statusQuery;
    if (status === 'ALL' || status === 'all') {
      statusQuery = { $exists: true };
    } else if (typeof status === 'string' && status.includes(',')) {
      statusQuery = { $in: status.split(',') };
    } else {
      statusQuery = status;
    }
    const query = { status: statusQuery, ...filters };
    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate('vitals.recordedBy', 'fullName employeeId position title')
      .populate('triage.skippedBy', 'fullName employeeId position title')
      .populate('triage.revokedBy', 'fullName employeeId position title')
      .sort({ createdAt: -1, _id: -1 });

    const decrypted = decryptPopulatedVisit(docs);

    // Active operational queue filtering: Exclude deleted or orphaned patients
    const activeQueue = [];
    const orphanedVisitIds = [];

    for (const v of decrypted) {
      const p = v.patientId;
      const isInvalidOrDeleted = !p || p.isDeleted === true || p.isOrphaned === true || !p.firstName || p.mrn === 'DELETED-RECORD';
      if (isInvalidOrDeleted) {
        orphanedVisitIds.push(v._id || v.id);
      } else {
        activeQueue.push(v);
      }
    }

    // Asynchronous Self-Healing: Auto-cancel in-flight visits that have no active patient
    if (orphanedVisitIds.length > 0) {
      Visit.updateMany(
        { _id: { $in: orphanedVisitIds }, status: { $nin: ['COMPLETED', 'CANCELLED'] } },
        { status: 'CANCELLED', cancellationReason: 'Auto-cancelled: Patient record deleted or purged' }
      ).catch(() => {});
    }

    return activeQueue;
  }

  async find(filters, sort = { createdAt: -1, _id: -1 }) {
    const docs = await Visit.find(filters)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate('vitals.recordedBy', 'fullName employeeId position title')
      .populate('triage.skippedBy', 'fullName employeeId position title')
      .populate('triage.revokedBy', 'fullName employeeId position title')
      .sort(sort);
    return decryptPopulatedVisit(docs);
  }

  async getHospitalStats() {
    const now = new Date();
    const targetTimezone = 'Asia/Kolkata';
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: targetTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const localDateStr = formatter.format(now); // YYYY-MM-DD
    const [year, month, day] = localDateStr.split('-').map(Number);

    // Start & end of today in local timezone (IST = UTC+5:30)
    const startOfTodayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + (24 * 60 * 60 * 1000) - 1);

    const matchToday = {
      createdAt: { $gte: startOfTodayUtc, $lte: endOfTodayUtc }
    };

    // 1. Total registrations today
    const totalToday = await Visit.countDocuments(matchToday);

    // 2. Total all-time visits
    const totalAll = await Visit.countDocuments({});

    // 3. Completed visits today
    const completedToday = await Visit.countDocuments({
      status: 'COMPLETED',
      updatedAt: { $gte: startOfTodayUtc, $lte: endOfTodayUtc }
    });

    // 4. Total all-time completed visits
    const totalCompleted = await Visit.countDocuments({ status: 'COMPLETED' });

    // 5. Real-time Live Queue breakdown across ALL active and queued visits
    const liveStats = await Visit.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      totalToday,
      totalAll,
      completedToday,
      totalCompleted,
      byStatus: liveStats
    };
  }

  async getActiveDepartmentLoads() {
    return await Visit.aggregate([
      { $match: { status: { $nin: ['COMPLETED', 'CANCELLED'] } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ]);
  }

  async getPendingLabPressures() {
    return await Visit.aggregate([
      { $unwind: '$labOrders' },
      { $match: { 'labOrders.status': { $in: ['PENDING_SAMPLE', 'PENDING', 'PROCESSING'] } } },
      { $group: { _id: '$labOrders.laboratoryId', count: { $sum: 1 } } }
    ]);
  }

  async findPendingLabOrders(options = {}) {
    const query = {
      status: { $nin: ['CANCELLED', 'COMPLETED'] },
      'labOrders.0': { $exists: true },
      labOrders: {
        $elemMatch: {
          status: { $in: ['PENDING_SAMPLE', 'PENDING', 'PROCESSING', 'AWAITING_VERIFICATION'] }
        }
      }
    };
    if (options.isNurseQueue) {
      // Patient is visible in nurse queue if NOT dispatched, OR if any sample requires recollection / retake
      query.$or = [
        { phlebotomyDispatched: { $ne: true } },
        { 'labOrders.recollectionRequested': true, 'labOrders.status': { $in: ['PENDING_SAMPLE', 'PENDING'] } }
      ];
    }
    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate({
        path: 'ipdAdmissionId',
        populate: [
          { path: 'currentBedId', select: 'bedNumber bedLabel' },
        ],
      })
      .sort({ createdAt: -1, _id: -1 });
    const decrypted = decryptPopulatedVisit(docs);
    if (!options.includeArchived) {
      // Isolate active clinical queue: exclude soft-deleted or orphaned patient ghosts
      return decrypted.filter((v) => v.patientId && !v.patientId.isDeleted && !v.patientId.isOrphaned);
    }
    return decrypted;
  }

  async findPendingLabOrdersByDepartment(departmentId, options = {}) {
    if (!departmentId || departmentId === 'ALL') return this.findPendingLabOrders(options);
    const andClauses = [
      { status: { $nin: ['CANCELLED', 'COMPLETED'] } },
      { 'labOrders.0': { $exists: true } },
      {
        labOrders: {
          $elemMatch: {
            status: { $in: ['PENDING_SAMPLE', 'PENDING', 'PROCESSING', 'AWAITING_VERIFICATION'] }
          }
        }
      },
      {
        $or: [
          { 'labOrders.labDepartmentId': departmentId },
          { departmentId: departmentId },
        ]
      }
    ];

    if (options.isNurseQueue) {
      andClauses.push({
        $or: [
          { phlebotomyDispatched: { $ne: true } },
          { 'labOrders.recollectionRequested': true, 'labOrders.status': { $in: ['PENDING_SAMPLE', 'PENDING'] } }
        ]
      });
    }

    const docs = await Visit.find({ $and: andClauses })
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate({
        path: 'ipdAdmissionId',
        populate: [
          { path: 'currentBedId', select: 'bedNumber bedLabel' },
        ],
      })
      .sort({ createdAt: -1, _id: -1 });
    const decrypted = decryptPopulatedVisit(docs);
    if (!options.includeArchived) {
      // Isolate active clinical queue: exclude soft-deleted or orphaned patient ghosts
      return decrypted.filter((v) => v.patientId && !v.patientId.isDeleted && !v.patientId.isOrphaned);
    }
    return decrypted;
  }

  async findReportedLabOrders(filter = {}) {
    const query = {
      'labOrders.0': { $exists: true },
      labOrders: {
        $elemMatch: {
          status: 'COMPLETED',
        },
      },
    };
    if (filter.departmentId && filter.departmentId !== 'ALL') {
      query.$or = [
        { 'labOrders.labDepartmentId': filter.departmentId },
        { departmentId: filter.departmentId },
      ];
    }
    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate({
        path: 'ipdAdmissionId',
        populate: [
          { path: 'currentBedId', select: 'bedNumber bedLabel' },
        ],
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(filter.limit ? Number(filter.limit) : 100);
    return decryptPopulatedVisit(docs);
  }

  /**
   * Find visits handled or dispatched by the Lab Nurse with live hospital lifecycle whereabouts.
   * Returns patient demographics, recorded pre-vitals, specimen intake status, and current clinical stage.
   */
  async findLabNurseHistory(filters = {}) {
    const query = {
      'labOrders.0': { $exists: true },
      $or: [
        { phlebotomyDispatched: true },
        { 'labOrders.sampleCollectedAt': { $exists: true, $ne: null } },
        { 'labOrders.labVitals.recordedAt': { $exists: true, $ne: null } },
        { 'disposition.status': { $exists: true, $ne: null } },
        { status: { $in: ['WAITING_DOCTOR_REVIEW', 'WAITING_BILLING', 'WAITING_PHARMACY', 'COMPLETED'] } },
      ],
    };

    if (filters.departmentId && filters.departmentId !== 'ALL') {
      query.$and = [
        {
          $or: [
            { 'labOrders.labDepartmentId': filters.departmentId },
            { departmentId: filters.departmentId },
          ]
        }
      ];
    }

    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'AT_DOCTOR') {
        query.status = { $in: ['WAITING_DOCTOR_REVIEW', 'WAITING_DOCTOR', 'IN_PROGRESS'] };
      } else if (filters.status === 'IN_PATHOLOGY') {
        query.status = 'WAITING_LAB';
      } else if (filters.status === 'AT_BILLING') {
        query.status = 'WAITING_BILLING';
      } else if (filters.status === 'AT_PHARMACY') {
        query.status = 'WAITING_PHARMACY';
      } else if (filters.status === 'COMPLETED') {
        query.status = 'COMPLETED';
      }
    }

    if (filters.startDate || filters.endDate) {
      const dateQuery = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        dateQuery.$gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.$or = [
        { phlebotomyDispatchedAt: dateQuery },
        { updatedAt: dateQuery },
        { createdAt: dateQuery },
      ];
    } else if (filters.date) {
      const startDate = new Date(filters.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.date);
      endDate.setHours(23, 59, 59, 999);
      query.$or = [
        { phlebotomyDispatchedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }

    let sortOrder = { phlebotomyDispatchedAt: -1, updatedAt: -1, createdAt: -1 };
    if (filters.sort === 'oldest') {
      sortOrder = { phlebotomyDispatchedAt: 1, updatedAt: 1, createdAt: 1 };
    } else if (filters.sort === 'token') {
      sortOrder = { tokenString: 1, createdAt: -1 };
    }

    const limit = filters.limit ? Number(filters.limit) : 100;
    const skip = filters.page ? (Number(filters.page) - 1) * limit : 0;

    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .populate('phlebotomyDispatchedBy')
      .populate('labOrders.technicianId')
      .populate('labOrders.labVitals.recordedBy')
      .populate('labOrders.phlebotomyRetakes.collectedBy')
      .populate('labOrders.pathologistVerification.verifiedBy')
      .populate({
        path: 'ipdAdmissionId',
        populate: [
          { path: 'currentBedId', select: 'bedNumber bedLabel' },
          { path: 'primaryDoctorId', select: 'fullName firstName lastName title' },
        ],
        options: { strictPopulate: false }
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    return decryptPopulatedVisit(docs);
  }
}

module.exports = new VisitRepository();
