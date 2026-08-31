/**
 * modules/ipd/nursing/emar-record.model.js
 * Electronic Medication Administration Record (e-MAR) tracking per inpatient stay.
 */
const mongoose = require('mongoose');

const EMAR_STATUS = {
  DUE: 'DUE',
  GIVEN: 'GIVEN',
  OMITTED: 'OMITTED',
  DELAYED: 'DELAYED',
  REFUSED: 'REFUSED',
};

const emarRecordSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    cpoeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CPOEOrder',
      default: null,
    },
    medicationName: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      enum: ['ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'INHALATION', 'RECTAL', 'OTHER'],
      default: 'ORAL',
    },
    frequency: {
      type: String,
      default: 'TDS',
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    administeredTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(EMAR_STATUS),
      default: EMAR_STATUS.DUE,
      required: true,
      index: true,
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    omissionReason: {
      type: String,
      trim: true,
      default: '',
    },
    nurseNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emarRecordSchema.index({ admissionId: 1, scheduledTime: 1, status: 1 });

module.exports = mongoose.model('EmarRecord', emarRecordSchema);
module.exports.EMAR_STATUS = EMAR_STATUS;
