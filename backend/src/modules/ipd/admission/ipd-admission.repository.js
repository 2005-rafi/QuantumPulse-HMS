/**
 * modules/ipd/admission/ipd-admission.repository.js
 * Inpatient admission data layer.
 */
const IPDAdmission = require('./ipd-admission.model');

class IPDAdmissionRepository {
  async createAdmission(data, session = null) {
    if (session) {
      const docs = await IPDAdmission.create([data], { session });
      return docs[0];
    }
    return IPDAdmission.create(data);
  }

  async getAdmissions(filter = {}) {
    return IPDAdmission.find(filter)
      .populate('patientId', 'firstName lastName mrn age gender phone bloodGroup parentsName')
      .populate('primaryDoctorId', 'firstName lastName employeeId position departmentId')
      .populate('admittingDepartmentId', 'name code')
      .populate('currentBedId', 'bedNumber bedLabel wardClass features status')
      .populate('currentRoomId', 'roomNumber roomName roomType')
      .populate('currentFloorId', 'floorNumber floorName wing')
      .sort({ admissionDate: -1 })
      .lean();
  }

  async getAdmissionById(id) {
    return IPDAdmission.findById(id)
      .populate('patientId', 'firstName lastName mrn age gender phone bloodGroup emergencyContact address')
      .populate('primaryDoctorId', 'firstName lastName employeeId position departmentId')
      .populate('admittingDepartmentId', 'name code')
      .populate('currentBedId', 'bedNumber bedLabel wardClass features status')
      .populate('currentRoomId', 'roomNumber roomName roomType')
      .populate('currentFloorId', 'floorNumber floorName wing')
      .populate('billId')
      .populate('admittedBy', 'firstName lastName')
      .lean();
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
