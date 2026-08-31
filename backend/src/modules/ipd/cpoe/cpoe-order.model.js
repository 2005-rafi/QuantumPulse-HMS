/**
 * modules/ipd/cpoe/cpoe-order.model.js
 * Inpatient Computerized Physician Order Entry (CPOE) model.
 */
const mongoose = require('mongoose');

const CPOE_ORDER_TYPES = ['LAB', 'MEDICATION', 'DIET', 'PROCEDURE', 'CONSULT'];

const CPOE_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const cpoeOrderSchema = new mongoose.Schema(
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
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    orderType: {
      type: String,
      enum: CPOE_ORDER_TYPES,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'STAT'],
      default: 'ROUTINE',
    },
    // For LAB orders
    testCode: { type: String, trim: true, default: null },
    testName: { type: String, trim: true, default: null },
    labOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabOrder', default: null },

    // For MEDICATION orders
    medication: {
      name: { type: String, trim: true },
      dosage: { type: String, trim: true },
      route: { type: String, default: 'ORAL' },
      frequency: { type: String, default: 'TDS' },
      durationDays: { type: Number, default: 1 },
      instructions: { type: String, trim: true, default: '' },
    },
    pharmacyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyOrder', default: null },

    // For DIET orders
    dietTier: { type: String, default: null },

    // For CONSULT orders
    consultDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    consultDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    consultReason: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: Object.values(CPOE_STATUS),
      default: CPOE_STATUS.PENDING,
      required: true,
      index: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

cpoeOrderSchema.index({ admissionId: 1, orderType: 1, status: 1 });

module.exports = mongoose.model('CPOEOrder', cpoeOrderSchema);
module.exports.CPOE_ORDER_TYPES = CPOE_ORDER_TYPES;
module.exports.CPOE_STATUS = CPOE_STATUS;
