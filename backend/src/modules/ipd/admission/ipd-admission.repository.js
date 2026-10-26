/**
 * modules/ipd/admission/ipd-admission.repository.js
 * Inpatient admission data layer.
 */
const IPDAdmission = require('./ipd-admission.model');
const { decryptPatient } = require('../../patient/patient.repository');

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
  isDeleted: true,
  isOrphaned: true
});

const decryptPopulatedAdmission = (adm) => {
  if (!adm) return adm;
  if (Array.isArray(adm)) return adm.map(a => decryptPopulatedAdmission(a));
  const clone = adm.toObject ? adm.toObject({ flattenMaps: true }) : { ...adm };
  if (clone.patientId && typeof clone.patientId === 'object' && clone.patientId._id) {
    if (clone.patientId.isDeleted) {
      clone.patientId = { ...DELETED_PATIENT_FALLBACK, _id: clone.patientId._id, isDeleted: true };
    } else {
      clone.patientId = decryptPatient(clone.patientId);
    }
  } else if (!clone.patientId || (typeof clone.patientId === 'object' && !clone.patientId.firstName)) {
    clone.patientId = {
      ...DELETED_PATIENT_FALLBACK,
      _id: clone.patientId?._id || (typeof clone.patientId === 'string' ? clone.patientId : null),
      isDeleted: true,
      isOrphaned: true,
    };
  }
  return clone;
};

class IPDAdmissionRepository {
  async createAdmission(data, session = null) {
    if (session) {
      const docs = await IPDAdmission.create([data], { session });
      return docs[0];
    }
    return IPDAdmission.create(data);
  }

  async getAdmissions(filter = {}, session = null) {
    const q = IPDAdmission.find(filter)
      .populate('patientId')
      .populate('primaryDoctorId', 'firstName lastName employeeId position departmentId')
      .populate('admittingDepartmentId', 'name code')
      .populate('currentBedId', 'bedNumber bedLabel wardClass features status')
      .populate('currentRoomId', 'roomNumber roomName roomType')
      .populate('currentFloorId', 'floorNumber floorName wing')
      .sort({ admissionDate: -1 });

    if (session) q.session(session);
    const docs = await q.lean();
    const decrypted = decryptPopulatedAdmission(docs);

    // If active admissions query (e.g. ADMITTED), filter out deleted/orphaned records
    if (filter.status === 'ADMITTED' || (Array.isArray(filter.status?.$in) && filter.status.$in.includes('ADMITTED'))) {
      return decrypted.filter(adm => {
        const p = adm.patientId;
        return p && !p.isDeleted && !p.isOrphaned && p.mrn !== 'DELETED-RECORD';
      });
    }

    return decrypted;
  }

  async getAdmissionById(id) {
    const doc = await IPDAdmission.findById(id)
      .populate('patientId')
      .populate('primaryDoctorId', 'firstName lastName employeeId position departmentId')
      .populate('admittingDepartmentId', 'name code')
      .populate('currentBedId', 'bedNumber bedLabel wardClass features status')
      .populate('currentRoomId', 'roomNumber roomName roomType')
      .populate('currentFloorId', 'floorNumber floorName wing')
      .populate('billId')
      .populate('admittedBy', 'firstName lastName')
      .lean();

    return decryptPopulatedAdmission(doc);
  }

  async updateAdmission(id, update, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return IPDAdmission.findByIdAndUpdate(id, update, opts).lean();
  }

  async generateAdmissionNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await IPDAdmission.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `IPD-${dateStr}-${seq}`;
  }
}

module.exports = new IPDAdmissionRepository();
