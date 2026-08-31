/**
 * modules/ipd/admission/ipd-admission.model.js
 * IPDAdmission Master Model representing an inpatient hospital stay encounter.
 */
const mongoose = require('mongoose');

const ADMISSION_STATUS = {
  ADMITTED: 'ADMITTED',
  DISCHARGE_INITIATED: 'DISCHARGE_INITIATED',
  DISCHARGED: 'DISCHARGED',
  TRANSFERRED_OUT: 'TRANSFERRED_OUT',
  CANCELLED: 'CANCELLED',
};

const ADMISSION_TYPES = ['EMERGENCY', 'PLANNED', 'TRANSFER'];

const ipdAdmissionSchema = new mongoose.Schema(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    primaryDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    admittingDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    currentBedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedMaster',
      required: true,
      index: true,
    },
    currentRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomMaster',
      required: true,
    },
    currentFloorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FloorMaster',
      required: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dischargeDate: {
      type: Date,
      default: null,
    },
    admissionType: {
      type: String,
      enum: ADMISSION_TYPES,
      default: 'PLANNED',
    },
    provisionalDiagnosis: {
      type: String,
      trim: true,
      required: true,
    },
    chiefComplaints: {
      type: String,
      trim: true,
      default: '',
    },
    carePlan: {
      type: String,
      trim: true,
      default: '',
    },
    dietTier: {
      type: String,
      enum: ['REGULAR_DIET', 'DIABETIC', 'RENAL', 'CARDIAC', 'LIQUID', 'SOFT', 'NPO'],
      default: 'REGULAR_DIET',
    },
    status: {
      type: String,
      enum: Object.values(ADMISSION_STATUS),
      default: ADMISSION_STATUS.ADMITTED,
      required: true,
      index: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      default: null,
    },
    admittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    dischargeSummary: {
      finalDiagnosis: { type: String, trim: true, default: '' },
      courseInHospital: { type: String, trim: true, default: '' },
      dischargeAdvice: { type: String, trim: true, default: '' },
      followUpDate: { type: Date, default: null },
      dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    },
  },
  {
    timestamps: true,
  }
);

ipdAdmissionSchema.index({ status: 1, admissionDate: -1 });
ipdAdmissionSchema.index({ patientId: 1, status: 1 });
ipdAdmissionSchema.index({ primaryDoctorId: 1, status: 1 });

module.exports = mongoose.model('IPDAdmission', ipdAdmissionSchema);
module.exports.ADMISSION_STATUS = ADMISSION_STATUS;
module.exports.ADMISSION_TYPES = ADMISSION_TYPES;
