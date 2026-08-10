const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  visitNumber: { type: String, required: true, unique: true },

  // Department-prefixed daily token: CARD-014, GEN-001, NEURO-007
  // Null for visits created before this feature was deployed (graceful fallback).
  tokenString: { type: String, trim: true, default: null },
  tokenSerial: { type: Number, default: null }, // raw integer serial for sorting/analytics

  patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',    required: true },
  visitType:  { type: String, enum: ['OPD', 'IPD'], default: 'OPD' },
  reasonForVisit: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false },

  status: {
    type: String,
    enum: [
      'WAITING_TRIAGE',       // Registered, waiting for nurse triage
      'CALLED',               // Nurse/Doctor pressed "Call" — patient being summoned
      'WAITING_DOCTOR',       // Triage complete, waiting for doctor consultation
      'IN_PROGRESS',          // Doctor has started consultation
      'WAITING_LAB',          // Sent for lab tests
      'WAITING_DOCTOR_REVIEW',// Lab results ready, waiting for doctor review
      'WAITING_PHARMACY',     // Prescription ready, heading to pharmacy
      'WAITING_BILLING',      // Heading to billing
      'SKIPPED',              // Patient did not respond to callout (can be re-queued)
      'COMPLETED',            // Visit fully concluded
      'CANCELLED',            // Visit cancelled
    ],
    default: 'WAITING_TRIAGE',
  },

  // Timestamps for queue analytics (when was this patient called, skipped, etc.)
  calledAt:   { type: Date, default: null },
  skippedAt:  { type: Date, default: null },

  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },

  // Payment collected at reception
  receptionPayment: {
    registrationFee:  { type: Number, default: 0 },
    consultationFee:  { type: Number, default: 0 },
    paymentMethod:    { type: String, enum: ['Cash', 'Card', 'UPI', 'Insurance'], default: 'Cash' },
  },

  // Triage / Vitals
  vitals: {
    height:           Number,   // cm
    weight:           Number,   // kg
    bloodPressure:    String,   // e.g. 120/80
    temperature:      Number,   // Fahrenheit
    pulse:            Number,   // bpm
    oxygenSaturation: Number,   // %
    chiefComplaint:   String,   // Added by nurse at triage
    dynamicVitals:    { type: Map, of: mongoose.Schema.Types.Mixed },
    recordedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    recordedAt:       Date,
  },

  // Consultation
  consultation: {
    doctorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    chiefComplaint: String,
    historyOfPresentIllness: String,
    physicalExamination: String,
    differentials:      String,
    prognosis:          String,
    diagnosis:      String,
    treatmentPlan:  String,
    notes:          String,
    status:         { type: String, enum: ['DRAFT', 'FINALIZED'], default: 'DRAFT' },
    recordedAt:     Date,
  },

  // Orders
  prescribedMedications: [{ type: mongoose.Schema.Types.Mixed }],

  // Lab Orders
  labOrders: [{
    laboratoryId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
    // Denormalized department — enables department-filtered queue without a join.
    labDepartmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false },
    testName:           { type: String, required: true },
    labName:            { type: String, default: '' },          // denormalized lab name for display
    sampleType:         { type: String },
    priority:           { type: String, enum: ['ROUTINE', 'URGENT', 'STAT'], default: 'ROUTINE' },
    status:             { type: String, enum: ['PENDING_SAMPLE', 'PROCESSING', 'COMPLETED'], default: 'PENDING_SAMPLE' },
    sampleCollectedAt:  Date,
    results:            { type: Map, of: mongoose.Schema.Types.Mixed },
    notes:              { type: String, default: '' },           // technician notes
    technicianId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    processedAt:        Date,
  }],

  // Pharmacy Work
  pharmacyWork: {
    pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    dispensedMedications: [{
      recommended:       String,
      alternativeGiven:  String,
      quantity:          String,
      amount:            Number,
      dosageSchedule: {
        morning:   { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
        afternoon: { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
        night:     { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
      },
    }],
    totalAmount: { type: Number, default: 0 },
    status:      { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
    processedAt: Date,
  },

  // Billing
  billing: {
    consultationFee:  { type: Number, default: 0 },
    labCharges:       { type: Number, default: 0 },
    pharmacyCharges:  { type: Number, default: 0 },
    totalAmount:      { type: Number, default: 0 },
    billedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    billedAt:         Date,
  },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────────────
// FIFO queue retrieval per department (createdAt: 1 = oldest first)
visitSchema.index({ status: 1, departmentId: 1, createdAt: 1 });
visitSchema.index({ status: 1, createdAt: 1 });
visitSchema.index({ patientId: 1 });
visitSchema.index({ departmentId: 1 });
visitSchema.index({ tokenString: 1 });
visitSchema.index({ 'vitals.dynamicVitals.$**': 1 });
visitSchema.index({ 'labOrders.laboratoryId': 1, 'labOrders.status': 1 });
visitSchema.index({ 'labOrders.labDepartmentId': 1, 'labOrders.status': 1 }); // dept-filtered queue

module.exports = mongoose.model('Visit', visitSchema);
