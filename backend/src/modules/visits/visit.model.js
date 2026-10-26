const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  visitNumber: { type: String, required: true, unique: true },

  // Department-prefixed daily token: CARD-014, GEN-001, NEURO-007
  // Null for visits created before this feature was deployed (graceful fallback).
  tokenString: { type: String, trim: true, default: null },
  tokenSerial: { type: Number, default: null }, // raw integer serial for sorting/analytics

  patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',    required: true },
  visitType:  { type: String, enum: ['OPD', 'IPD', 'EMERGENCY'], default: 'OPD' },
  reasonForVisit: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false },
  ipdAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null, index: true },
  convertedToAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null, index: true },

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
      'ADMISSION_RECOMMENDED',// Doctor advised IPD admission; pending Ward Management bed allocation
      'CONVERTED_TO_IPD',     // Converted directly from OPD visit to Inpatient admission
    ],
    default: 'WAITING_TRIAGE',
  },

  // Doctor IPD Admission Advice / Ward Referral
  ipdAdmissionAdvice: {
    status: { type: String, enum: ['NONE', 'RECOMMENDED', 'ADMITTED', 'CANCELLED'], default: 'NONE' },
    advisingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    advisedAt: { type: Date, default: null },
    targetWardClass: { type: String, default: 'GENERAL_WARD' },
    admissionType: { type: String, enum: ['PLANNED', 'SURGICAL', 'EMERGENCY', 'DAY_CARE'], default: 'PLANNED' },
    provisionalDiagnosis: { type: String, trim: true, default: '' },
    chiefComplaints: { type: String, trim: true, default: '' },
    carePlan: { type: String, trim: true, default: '' },
    dietTier: { type: String, default: 'REGULAR_DIET' },
    urgency: { type: String, enum: ['ROUTINE', 'URGENT', 'EMERGENCY_STAT'], default: 'ROUTINE' },
    suggestedSurgeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    otSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTSession', default: null },
  },

  // Timestamps for queue analytics (when was this patient called, skipped, etc.)
  calledAt:   { type: Date, default: null },
  skippedAt:  { type: Date, default: null },

  // Cancellation tracking (when cancelled at reception before triage)
  cancellationReason: { type: String, trim: true, default: null },
  cancelledAt:        { type: Date, default: null },
  cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },

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

  // Triage Lifecycle & Fast-Track Tracking
  triage: {
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'SKIPPED'], default: 'PENDING' },
    skippedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    skippedAt: { type: Date, default: null },
    skipReason: { type: String, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
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
    testCode:           { type: String, default: '' },
    testName:           { type: String, required: true },
    labName:            { type: String, default: '' },          // denormalized lab name for display
    sampleType:         { type: String },
    reportType:         { type: String, enum: ['STRUCTURED_DATA', 'DOCUMENT_UPLOAD', 'HYBRID'], default: 'STRUCTURED_DATA' },
    isDocumentUploadOnly: { type: Boolean, default: false },
    templateLayout:     { type: String, enum: ['STANDARD_NUMERICAL', 'DESCRIPTIVE_NARRATIVE', 'IMAGING_STUDY', 'CULTURE_ANTIBIOGRAM'], default: 'STANDARD_NUMERICAL' },
    priority:           { type: String, enum: ['ROUTINE', 'URGENT', 'STAT'], default: 'ROUTINE' },
    status:             { type: String, enum: ['PENDING_SAMPLE', 'PROCESSING', 'AWAITING_VERIFICATION', 'COMPLETED', 'VERIFIED'], default: 'PENDING_SAMPLE' },
    sampleCollectedAt:  Date,
    results:            { type: Map, of: mongoose.Schema.Types.Mixed },
    notes:              { type: String, default: '' },           // technician notes
    technicianId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    processedAt:        Date,
    // Extensions for Laboratory Information System (LIS) workflow
    origin:             { type: String, enum: ['CLINICAL_DOCTOR', 'DIRECT_WALKIN'], default: 'CLINICAL_DOCTOR' },
    tokenNumber:        { type: String, default: '' },
    labVitals: {
      fastingHours:     { type: Number, default: null },
      preScanBp:        { type: String, default: '' },
      temperature:      { type: Number, default: null },
      pulse:            { type: Number, default: null },
      oxygenSaturation: { type: Number, default: null },
      bloodGlucose:     { type: Number, default: null },
      patientWeightKg:  { type: Number, default: null },
      clinicalNotes:    { type: String, default: '' },
      isSkipped:        { type: Boolean, default: false },
      skipReason:       { type: String, default: '' },
      recordedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      recordedAt:       Date,
    },
    technicianEntry: {
      enteredBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      enteredAt:        Date,
    },
    // Phlebotomy Safety Screening & Barcode
    phlebotomyRisks: {
      syncopeRisk:          { type: Boolean, default: false },
      difficultVein:        { type: Boolean, default: false },
      anticoagulantTherapy: { type: Boolean, default: false },
      latexAllergy:         { type: Boolean, default: false },
    },
    specimenBarcode:        { type: String, default: '' },
    recollectionRequested:  { type: Boolean, default: false },
    rejectionReason:        { type: String, default: '' },
    retakeCount:            { type: Number, default: 0 },
    phlebotomyRetakes: [{
      retakeNumber:         { type: Number, required: true },
      collectedAt:          { type: Date, default: Date.now },
      collectedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      reason:               { type: String, default: '' },
      previousStatus:       { type: String, default: 'RECOLLECT_SAMPLE' },
      barcode:              { type: String, default: '' },
      notes:                { type: String, default: '' },
    }],
    panicAlertBroadcasted:  { type: Boolean, default: false },
    panicAlertDetails: {
      triggeredAt:          Date,
      triggeredBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      panicValues:          [{ type: mongoose.Schema.Types.Mixed }],
      notes:                String,
    },
    pathologistVerification: {
      verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      verifiedAt:       Date,
      deltaFlag:        { type: Boolean, default: false },
      panicValueFlag:   { type: Boolean, default: false },
      doctorNotes:      { type: String, default: '' },
      clinicalImpression: { type: String, default: '' },
      signatureHash:    { type: String, default: '' },
      licenseNumber:    { type: String, default: '' },
    },
  }],


  // Pharmacy Work
  pharmacyWork: {
    pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    dispensedMedications: [{
      recommended:       String,
      alternativeGiven:  String,
      quantity:          String,
      unitPrice:         { type: Number, default: 0 },
      amount:            Number,
      dosageSchedule: {
        morning:   { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
        afternoon: { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
        night:     { count: { type: Number, default: 0 }, timing: { type: String, default: 'N/A' } },
      },
    }],
    totalAmount: { type: Number, default: 0 },
    status:      { type: String, enum: ['PENDING', 'DISPENSED', 'COMPLETED'], default: 'PENDING' },
    processedAt: Date,
  },

  // Phlebotomy Lifecycle & Dispatch Tracking
  phlebotomyDispatched:   { type: Boolean, default: false },
  phlebotomyDispatchedAt: { type: Date, default: null },
  phlebotomyDispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  phlebotomyDestination:  { type: String, enum: ['DOCTOR', 'BILLING', 'PATHOLOGY'], default: 'DOCTOR' },
  phlebotomyNotes:        { type: String, default: '' },

  // Laboratory / Clinical Disposition
  disposition: {
    status:       { type: String, default: null },
    notes:        { type: String, default: '' },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    dispatchedAt: { type: Date, default: null },
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
visitSchema.index({ phlebotomyDispatched: 1, 'labOrders.0': 1, status: 1 });
visitSchema.index({ phlebotomyDispatchedAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);

