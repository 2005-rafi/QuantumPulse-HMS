const mongoose = require('mongoose');

const BILL_STATUS = {
  OPEN: 'OPEN',
  FINALIZED: 'FINALIZED',
  CANCELLED: 'CANCELLED',
};

const lineItemSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      'VISIT_REGISTERED',
      'CONSULTATION_COMPLETED',
      'LAB_ORDER_ACCEPTED',
      'MEDICINE_DISPENSED',
      'PROCEDURE_PERFORMED',
      'BED_STAY_BILLED',
      'BED_TRANSFERRED',
      'SURGERY_PERFORMED',
      'SURGICAL_CONSUMABLE_BILLED',
      'NURSING_CARE_BILLED',
      'RMO_ROUND_BILLED',
    ],
  },
  category: {
    type: String,
    enum: ['REGISTRATION', 'CONSULTATION', 'DIAGNOSTICS', 'PHARMACY', 'PROCEDURE', 'BED_CHARGES', 'BED_SUPPORT', 'SURGERY', 'NURSING'],
    required: true,
  },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  snapshotPrice: { type: Number, required: true, min: 0 }, // price at time of charge -- immutable
  snapshotRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'TariffRule', default: null },
  snapshotRulePath: { type: String, trim: true, default: '' }, // e.g. "Cardiology dept + GRADE_3"
  proofReference: { type: String, trim: true, default: '' }, // e.g. Clinical justification / Doctor order / slip ref
  lineTotal: { type: Number, required: true, min: 0 }, // quantity * snapshotPrice
  // GST Tax Attributes (Statutory Compliance)
  hsnSacCode: { type: String, trim: true, default: '999312' }, // SAC 999312 for healthcare, HSN 3004 for pharma
  taxRate: { type: Number, default: 0, min: 0 },              // Total tax percentage (e.g., 0, 5, 12, 18)
  taxableAmount: { type: Number, default: 0, min: 0 },        // Base amount subject to tax
  cgstAmount: { type: Number, default: 0, min: 0 },           // Central GST portion
  sgstAmount: { type: Number, default: 0, min: 0 },           // State GST portion
  totalTaxAmount: { type: Number, default: 0, min: 0 },       // cgstAmount + sgstAmount
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

  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

  visitType: { type: String, enum: ['OPD', 'EMERGENCY', 'IPD'], default: 'OPD' },
  serviceDate: { type: Date, default: Date.now },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

  // Line items -- append-only, never modified after creation
  lineItems: [lineItemSchema],

  // Payments
  payments: [paymentSchema],

  // Post-finalization adjustments
  adjustments: [adjustmentSchema],

  // Financial summary (cached totals -- always recomputed on change)
  billedAmount: { type: Number, default: 0 },     // sum of lineItems[].lineTotal
  discountAmount: { type: Number, default: 0, min: 0 }, // Concessions / approved discount
  collectedAmount: { type: Number, default: 0 },  // sum of payments[].amount
  advanceCollected: { type: Number, default: 0 }, // sum of IPD advance deposits
  adjustedAmount: { type: Number, default: 0 },   // sum of APPROVED adjustments[].amount
  outstandingAmount: { type: Number, default: 0 }, // billedAmount - discountAmount - collectedAmount - adjustedAmount

  // GST Statutory Totals
  hospitalGstin: { type: String, trim: true, default: '33AAAAA0000A1Z5' },
  totalTaxableAmount: { type: Number, default: 0, min: 0 }, // Goods/services subject to tax
  totalExemptAmount: { type: Number, default: 0, min: 0 },  // Healthcare services exempt from GST
  totalCgst: { type: Number, default: 0, min: 0 },          // Total CGST sum
  totalSgst: { type: Number, default: 0, min: 0 },          // Total SGST sum
  totalTax: { type: Number, default: 0, min: 0 },           // Total tax amount

  // Reception Payment Reference (if registration fee collected at intake)
  receptionPaymentRef: { type: String, trim: true, default: null },

  // Lifecycle
  status: {
    type: String,
    enum: Object.values(BILL_STATUS),
    default: BILL_STATUS.OPEN,
  },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  finalizedAt: { type: Date, default: null },

  issuingArea: {
    type: String,
    enum: ['RECEPTION', 'PHARMACY', 'BILLING', 'SYSTEM'],
    default: 'SYSTEM',
  },

  notes: { type: String, trim: true, default: '' },
}, { timestamps: true });

// Indexes
billSchema.index({ visitId: 1 }, { unique: true, partialFilterExpression: { visitId: { $type: 'objectId' } } });
billSchema.index({ admissionId: 1 }, { unique: true, partialFilterExpression: { admissionId: { $type: 'objectId' } } });
billSchema.index({ patientId: 1, serviceDate: -1 });
billSchema.index({ status: 1, serviceDate: -1 });
billSchema.index({ status: 1, outstandingAmount: 1, visitType: 1 });
billSchema.index({ outstandingAmount: 1 });
billSchema.index({ serviceDate: 1 });
billSchema.index({ 'lineItems.category': 1, serviceDate: 1 });
billSchema.index({ issuingArea: 1, serviceDate: -1 });
billSchema.index({ issuingArea: 1, patientId: 1, serviceDate: -1 });

module.exports = mongoose.model('Bill', billSchema);
module.exports.BILL_STATUS = BILL_STATUS;
