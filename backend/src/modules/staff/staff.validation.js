const Joi = require('joi');

// ── Shared field definitions ─────────────────────────────────────────────────
const phonePattern = /^[0-9+\-\s]{7,15}$/;

const personalFields = {
  firstName:    Joi.string().trim().min(1).max(60).optional().allow(''),
  middleName:   Joi.string().trim().max(60).optional().allow(''),
  lastName:     Joi.string().trim().min(1).max(60).optional().allow(''),
  gender:       Joi.string().trim().valid('Male', 'Female', 'Other', '').optional(),
  dateOfBirth:  Joi.date().iso().max('now').optional().allow(null),
  bloodGroup:   Joi.string().trim().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '').optional(),
  maritalStatus: Joi.string().trim().valid('Single', 'Married', 'Divorced', 'Widowed', '').optional(),
  nationality:  Joi.string().trim().max(60).optional().allow(''),
};

const contactFields = {
  phone:          Joi.string().trim().pattern(phonePattern).optional().allow(''),
  alternatePhone: Joi.string().trim().pattern(phonePattern).optional().allow(''),
  email:          Joi.string().trim().email().optional().allow(''),
  addressLine1:   Joi.string().trim().max(200).optional().allow(''),
  addressLine2:   Joi.string().trim().max(200).optional().allow(''),
  area:           Joi.string().trim().max(100).optional().allow(''),
  city:           Joi.string().trim().max(100).optional().allow(''),
  state:          Joi.string().trim().max(100).optional().allow(''),
  country:        Joi.string().trim().max(100).optional().allow(''),
  postalCode:     Joi.string().trim().max(20).optional().allow(''),
  emergencyContactName:   Joi.string().trim().max(100).optional().allow(''),
  emergencyContactNumber: Joi.string().trim().pattern(phonePattern).optional().allow(''),
};

const employmentFields = {
  departmentId:   Joi.string().length(24).optional(),
  roleId:         Joi.string().length(24).optional(),
  position:       Joi.string().trim().min(2).max(100).optional(),
  employmentType: Joi.string().trim().valid('Full-time', 'Part-time', 'Contract', 'Consultant', '').optional(),
  joiningDate:    Joi.date().iso().optional().allow(null),
  shift:          Joi.string().trim().valid('Morning', 'Evening', 'Night', 'Rotational', '').optional(),
  reportingTo:    Joi.string().length(24).optional().allow(null, ''),
};

const professionalFields = {
  yearsOfExperience:     Joi.number().integer().min(0).max(60).optional(),
  // Doctor
  medicalLicenseNumber:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  medicalCouncil:        Joi.string().trim().max(100).optional().allow(''),
  licenseRegistrationDate: Joi.date().iso().optional().allow(null),
  licenseExpiryDate:     Joi.date().iso().optional().allow(null),
  primaryQualification:  Joi.string().trim().max(100).optional().allow(''),
  highestQualification:  Joi.string().trim().max(100).optional().allow(''),
  primarySpecialization: Joi.string().trim().max(100).optional().allow(''),
  superSpecialization:   Joi.string().trim().max(100).optional().allow(''),
  previousHospital:      Joi.string().trim().max(200).optional().allow(''),
  languagesKnown:        Joi.array().items(Joi.string().trim()).optional(),
  consultationType:      Joi.string().trim().valid('In-Person', 'Online', 'Both', '').optional(),
  consultingFee:         Joi.number().min(0).optional(),
  followUpFee:           Joi.number().min(0).optional(),
  // Nurse
  nursingLicenseNumber:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  nursingSpecialization: Joi.string().trim().max(100).optional().allow(''),
  // Laboratory
  labCertificationCode:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  labQualification:      Joi.string().trim().max(100).optional().allow(''),
  // Pharmacy
  pharmacyLicenseNumber: Joi.string().trim().min(3).max(50).optional().allow('', null),
  pharmacyQualification: Joi.string().trim().max(100).optional().allow(''),
};

// ── Schemas ──────────────────────────────────────────────────────────────────
const verificationDocumentSchema = Joi.object({
  url: Joi.string().trim().uri().required(),
  fileName: Joi.string().trim().required(),
  sizeBytes: Joi.number().integer().min(0).max(10 * 1024 * 1024).required(),
  uploadedAt: Joi.date().iso().optional().allow(null),
}).optional().allow(null);

const createStaffSchema = Joi.object({
  // fullName is required for backward compat; also accepts split names
  fullName:     Joi.string().min(2).max(100).required(),
  departmentId: Joi.string().length(24).required(),
  roleId:       Joi.string().length(24).required(),
  position:     Joi.string().min(2).max(100).required(),
  positionRank: Joi.number().integer().min(1).max(9).optional(),
  status:       Joi.string().valid('Active', 'Inactive').optional(),
  verificationDocument: verificationDocumentSchema,
  ...personalFields,
  ...contactFields,
  ...employmentFields,
  ...professionalFields,
});

const updateStaffSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  status:   Joi.string().valid('Active', 'Inactive').optional(),
  username: Joi.string().min(3).max(30).optional(),
  password: Joi.string().min(6).optional(),
  positionRank: Joi.number().integer().min(1).max(9).optional(),
  verificationDocument: verificationDocumentSchema,
  ...personalFields,
  ...contactFields,
  ...employmentFields,
  ...professionalFields,
});

const changePositionSchema = Joi.object({
  position: Joi.string().min(2).max(100).required(),
  reason:   Joi.string().min(3).max(255).required(),
});

module.exports = { createStaffSchema, updateStaffSchema, changePositionSchema };

