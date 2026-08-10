const mongoose = require('mongoose');
const { STAFF_STATUS } = require('../../core/constants');

const staffSchema = new mongoose.Schema(
  {
    // ── Core Identity (backward-compatible primary fields) ──────────────────
    employeeId:   { type: String, required: true, unique: true, trim: true },
    fullName:     { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    roleId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    position:     { type: String, required: true, trim: true },
    positionRank: { type: Number, required: true, min: 1, max: 9 },
    status: {
      type: String,
      enum: Object.values(STAFF_STATUS),
      default: STAFF_STATUS.ACTIVE,
    },
    isDeleted: { type: Boolean, default: false },

    // ── Section 1: Personal Information ────────────────────────────────────
    firstName:    { type: String, trim: true, default: '' },
    middleName:   { type: String, trim: true, default: '' },
    lastName:     { type: String, trim: true, default: '' },
    gender:       { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    dateOfBirth:  { type: Date, default: null },
    bloodGroup:   { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', ''], default: '' },
    nationality:  { type: String, trim: true, default: '' },
    profilePhoto: { type: String, trim: true, default: '' },

    // ── Section 2: Contact Information ─────────────────────────────────────
    phone:            { type: String, trim: true, default: '' },
    alternatePhone:   { type: String, trim: true, default: '' },
    email:            { type: String, trim: true, lowercase: true, default: '' },
    addressLine1:     { type: String, trim: true, default: '' },
    addressLine2:     { type: String, trim: true, default: '' },
    area:             { type: String, trim: true, default: '' },
    city:             { type: String, trim: true, default: '' },
    state:            { type: String, trim: true, default: '' },
    country:          { type: String, trim: true, default: '' },
    postalCode:       { type: String, trim: true, default: '' },
    emergencyContactName:   { type: String, trim: true, default: '' },
    emergencyContactNumber: { type: String, trim: true, default: '' },

    // ── Section 3: Employment Information ──────────────────────────────────
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Consultant', ''],
      default: '',
    },
    joiningDate:  { type: Date, default: null },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'Rotational', ''],
      default: '',
    },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },

    // ── Section 4: Professional / Role-Specific ────────────────────────────
    yearsOfExperience: { type: Number, min: 0, default: 0 },

    // Doctor fields
    medicalLicenseNumber:    { type: String, trim: true },
    medicalCouncil:          { type: String, trim: true, default: '' },
    licenseRegistrationDate: { type: Date, default: null },
    licenseExpiryDate:       { type: Date, default: null },
    primaryQualification:    { type: String, trim: true, default: '' },
    highestQualification:    { type: String, trim: true, default: '' },
    primarySpecialization:   { type: String, trim: true, default: '' },
    superSpecialization:     { type: String, trim: true, default: '' },
    previousHospital:        { type: String, trim: true, default: '' },
    languagesKnown:          { type: [String], default: [] },
    consultationType: {
      type: String,
      enum: ['In-Person', 'Online', 'Both', ''],
      default: '',
    },
    consultingFee: { type: Number, min: 0, default: 0 },
    followUpFee:   { type: Number, min: 0, default: 0 },

    // Nurse fields
    nursingLicenseNumber:  { type: String, trim: true },
    nursingSpecialization: { type: String, trim: true, default: '' },

    // Laboratory fields
    labCertificationCode: { type: String, trim: true },
    labQualification:     { type: String, trim: true, default: '' },

    // Pharmacy fields
    pharmacyLicenseNumber: { type: String, trim: true },
    pharmacyQualification: { type: String, trim: true, default: '' },

    // Verification documents (optional)
    verificationDocument: {
      url: { type: String, default: null },
      fileName: { type: String, default: null },
      sizeBytes: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
staffSchema.index({ roleId: 1 });
staffSchema.index({ departmentId: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ isDeleted: 1 });
staffSchema.index({ medicalLicenseNumber: 1 },  { unique: true, sparse: true });
staffSchema.index({ nursingLicenseNumber: 1 },   { unique: true, sparse: true });
staffSchema.index({ labCertificationCode: 1 },   { unique: true, sparse: true });
staffSchema.index({ pharmacyLicenseNumber: 1 },  { unique: true, sparse: true });

module.exports = mongoose.model('Staff', staffSchema);
