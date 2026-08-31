/**
 * modules/ipd/discharge/ipd-clearance.model.js
 * 3-Way Departmental Discharge Clearance workflow and Gate Pass model.
 */
const mongoose = require('mongoose');

const ipdClearanceSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    // 1. Pharmacy Clearance
    pharmacyClearance: {
      isCleared: { type: Boolean, default: false },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
      clearedAt: { type: Date, default: null },
      notes: { type: String, trim: true, default: '' },
    },
    // 2. Ward Nursing Clearance
    nursingClearance: {
      isCleared: { type: Boolean, default: false },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
      clearedAt: { type: Date, default: null },
      cannulaRemoved: { type: Boolean, default: false },
      notes: { type: String, trim: true, default: '' },
    },
    // 3. Billing & Cashier Clearance
    billingClearance: {
      isCleared: { type: Boolean, default: false },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
      clearedAt: { type: Date, default: null },
      totalBilled: { type: Number, default: 0 },
      totalCollected: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 0 },
      notes: { type: String, trim: true, default: '' },
    },
    // Overall Gate Pass
    isAllCleared: {
      type: Boolean,
      default: false,
    },
    gatePassIssued: {
      type: Boolean,
      default: false,
    },
    gatePassNumber: {
      type: String,
      trim: true,
      default: null,
    },
    gatePassGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ipdClearanceSchema.pre('save', function () {
  this.isAllCleared = Boolean(
    this.pharmacyClearance?.isCleared &&
    this.nursingClearance?.isCleared &&
    this.billingClearance?.isCleared
  );
});

module.exports = mongoose.model('IPDClearance', ipdClearanceSchema);
