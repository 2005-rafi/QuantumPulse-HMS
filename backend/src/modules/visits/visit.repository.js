const Visit = require('./visit.model');
const { decryptPatient } = require('../patient/patient.repository');

const decryptPopulatedVisit = (visit) => {
  if (!visit) return visit;
  if (Array.isArray(visit)) {
    return visit.map(v => decryptPopulatedVisit(v));
  }
  const clone = visit.toObject ? visit.toObject() : { ...visit };
  if (clone.patientId) {
    clone.patientId = decryptPatient(clone.patientId);
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
    const statusQuery = typeof status === 'string' && status.includes(',')
      ? { $in: status.split(',') }
      : status;
    const query = { status: statusQuery, ...filters };
    const docs = await Visit.find(query)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId')
      .sort({ createdAt: 1 });
    return decryptPopulatedVisit(docs);
  }

  async find(filters) {
    const docs = await Visit.find(filters)
      .populate('patientId')
      .populate('departmentId')
      .populate('consultation.doctorId');
    return decryptPopulatedVisit(docs);
  }

  async getHospitalStats() {
    const targetTimezone = 'Asia/Kolkata';
    const localDateStr = new Date().toLocaleDateString('en-CA', { timeZone: targetTimezone }); // YYYY-MM-DD
    const [year, month, day] = localDateStr.split('-').map(Number);
    const today = new Date(Date.UTC(year, month - 1, day));

    const matchToday = {
      createdAt: { $gte: today }
    };

    const stats = await Visit.aggregate([
      { $match: matchToday },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalToday = await Visit.countDocuments(matchToday);

    return {
      totalToday,
      byStatus: stats
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
      { $match: { 'labOrders.status': { $ne: 'COMPLETED' } } },
      { $group: { _id: '$labOrders.laboratoryId', count: { $sum: 1 } } }
    ]);
  }
}

module.exports = new VisitRepository();
