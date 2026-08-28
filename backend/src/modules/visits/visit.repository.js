const Visit = require('./visit.model');
const { decryptPatient } = require('../patient/patient.repository');

const decryptPopulatedVisit = (visit) => {
  if (!visit) return visit;
  if (Array.isArray(visit)) {
    return visit.map(v => decryptPopulatedVisit(v));
  }
  const clone = visit.toObject ? visit.toObject({ flattenMaps: true }) : { ...visit };
  if (clone.patientId) {
    clone.patientId = decryptPatient(clone.patientId);
  }
  if (clone.labOrders && Array.isArray(clone.labOrders)) {
    clone.labOrders = clone.labOrders.map(order => {
      if (order.results && order.results instanceof Map) {
        order.results = Object.fromEntries(order.results);
      }
      return order;
    });
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
      .populate('consultation.doctorId');
    return decryptPopulatedVisit(doc);
  }

  async updateById(id, data, options = {}) {
    const doc = await Visit.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options })
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId');
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
      .sort({ createdAt: -1, _id: -1 });
    return decryptPopulatedVisit(docs);
  }

  async find(filters, sort = { createdAt: -1, _id: -1 }) {
    const docs = await Visit.find(filters)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
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

  async findPendingLabOrders() {
    const docs = await Visit.find({
      'labOrders.0': { $exists: true },
      labOrders: {
        $elemMatch: {
          status: { $in: ['PENDING_SAMPLE', 'PENDING', 'PROCESSING'] }
        }
      }
    })
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .sort({ createdAt: -1, _id: -1 });
    return decryptPopulatedVisit(docs);
  }

  async findPendingLabOrdersByDepartment(departmentId) {
    if (!departmentId) return this.findPendingLabOrders();
    const docs = await Visit.find({
      'labOrders.0': { $exists: true },
      labOrders: {
        $elemMatch: {
          status: { $in: ['PENDING_SAMPLE', 'PENDING', 'PROCESSING'] }
        }
      },
      $or: [
        { 'labOrders.labDepartmentId': departmentId },
        { departmentId: departmentId },
      ],
    })
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .sort({ createdAt: -1, _id: -1 });
    return decryptPopulatedVisit(docs);
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
    if (filter.departmentId) {
      query.$or = [
        { 'labOrders.labDepartmentId': filter.departmentId },
        { departmentId: filter.departmentId },
      ];
    }
    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(filter.limit ? Number(filter.limit) : 100);
    return decryptPopulatedVisit(docs);
  }
}

module.exports = new VisitRepository();
