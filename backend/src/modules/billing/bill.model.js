const mongoose = require('mongoose');

const BILL_STATUS = {
  OPEN: 'OPEN',
  FINALIZED: 'FINALIZED',
  CANCELLED: 'CANCELLED',
};

const lineItemSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['VISIT_REGISTERED', 'CONSULTATION_COMPLETED', 'LAB_ORDER_ACCEPTED', 'MEDICINE_DISPENSED', 'PROCEDURE_PERFORMED'],
  },
  category: {
    type: String,
    enum: ['REGISTRATION', 'CONSULTATION', 'DIAGNOSTICS', 'PHARMACY', 'PROCEDURE'],
    required: true,
  },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  snapshotPrice: { type: Number, required: true, min: 0 }, // price at time of charge -- immutable
  snapshotRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'TariffRule', default: null },
  snapshotRulePath: { type: String, trim: true, default: '' }, // e.g. "Cardiology dept + GRADE_3"
  lineTotal: { type: Number, required: true, min: 0 }, // quantity * snapshotPrice
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Insurance', 'WaivedOff'],
    required: true,
  },
  reference: { type: String, trim: true, default: '' }, // UPI txn ID, card approval
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  recordedAt: { type: Date, default: Date.now },
}, { _id: true });

const adjustmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CREDIT_NOTE', 'REFUND', 'WRITEOFF'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  issuedAt: { type: Date, default: Date.now },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  approvedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL',
  },
}, { _id: true });

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true, trim: true },

  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

  visitType: { type: String, enum: ['OPD', 'EMERGENCY', 'IPD'], default: 'OPD' },
  serviceDate: { type: Date, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

  // Line items -- append-only, never modified after creation
  lineItems: [lineItemSchema],

  // Payments
  payments: [paymentSchema],

  // Post-finalization adjustments
  adjustments: [adjustmentSchema],

  // Financial summary (cached totals -- always recomputed on change)
  billedAmount: { type: Number, default: 0 },     // sum of lineItems[].lineTotal
  collectedAmount: { type: Number, default: 0 },  // sum of payments[].amount
  adjustedAmount: { type: Number, default: 0 },   // sum of APPROVED adjustments[].amount
  outstandingAmount: { type: Number, default: 0 }, // billedAmount - collectedAmount - adjustedAmount

  // Lifecycle
  status: {
    type: String,
    enum: Object.values(BILL_STATUS),
    default: BILL_STATUS.OPEN,
  },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  finalizedAt: { type: Date, default: null },

  notes: { type: String, trim: true, default: '' },
}, { timestamps: true });

// Indexes
billSchema.index({ visitId: 1 }, { unique: true });  // 1:1 Visit-Bill invariant
billSchema.index({ patientId: 1, serviceDate: -1 });
billSchema.index({ status: 1, serviceDate: -1 });
billSchema.index({ outstandingAmount: 1 }); // for outstanding dues dashboard
billSchema.index({ serviceDate: 1 });       // date-range analytics
billSchema.index({ 'lineItems.category': 1, serviceDate: 1 });

module.exports = mongoose.model('Bill', billSchema);
module.exports.BILL_STATUS = BILL_STATUS;
