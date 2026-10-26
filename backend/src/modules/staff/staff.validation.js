const Joi = require('joi');

// ── Shared field definitions ─────────────────────────────────────────────────
const phonePattern = /^[0-9+\-\s()]{7,25}$/;

const personalFields = {
  title:        Joi.string().trim().valid('Dr.', 'Mr.', 'Ms.', 'Mrs.', 'Smt.', 'Sri.', '').optional().allow('', null),
  firstName:    Joi.string().trim().min(1).max(60).optional().allow('', null),
  middleName:   Joi.string().trim().max(60).optional().allow('', null),
  lastName:     Joi.string().trim().min(1).max(60).optional().allow('', null),
  gender:       Joi.string().trim().valid('Male', 'Female', 'Other', '').optional().allow('', null),
  dateOfBirth:  Joi.date().iso().max('now').optional().allow(null, ''),
  bloodGroup:   Joi.string().trim().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '').optional().allow('', null),
  maritalStatus: Joi.string().trim().valid('Single', 'Married', 'Divorced', 'Widowed', '').optional().allow('', null),
  nationality:  Joi.string().trim().max(60).optional().allow('', null),
  profilePhoto: Joi.string().trim().optional().allow('', null),
};

const contactFields = {
  phone:          Joi.string().trim().pattern(phonePattern).optional().allow('', null),
  alternatePhone: Joi.string().trim().pattern(phonePattern).optional().allow('', null),
  email:          Joi.string().trim().lowercase().email({ tlds: { allow: false } }).optional().allow('', null),
  addressLine1:   Joi.string().trim().max(200).optional().allow('', null),
  addressLine2:   Joi.string().trim().max(200).optional().allow('', null),
  area:           Joi.string().trim().max(100).optional().allow('', null),
  city:           Joi.string().trim().max(100).optional().allow('', null),
  state:          Joi.string().trim().max(100).optional().allow('', null),
  stateCode:      Joi.string().trim().max(20).optional().allow('', null),
  country:        Joi.string().trim().max(100).optional().allow('', null),
  countryCode:    Joi.string().trim().max(20).optional().allow('', null),
  postalCode:     Joi.string().trim().max(20).optional().allow('', null),
  emergencyContactName:   Joi.string().trim().max(100).optional().allow('', null),
  emergencyContactNumber: Joi.string().trim().pattern(phonePattern).optional().allow('', null),
};

const employmentFields = {
  departmentId:   Joi.string().length(24).optional().allow(null, ''),
  roleId:         Joi.string().length(24).optional(),
  position:       Joi.string().trim().min(2).max(100).optional(),
  positionRank:   Joi.number().integer().min(1).max(9).optional(),
  tariffGrade:    Joi.string().trim().valid('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5').optional().allow('', null),
  salaryGrade:    Joi.string().trim().max(100).optional().allow('', null),
  baseSalary:     Joi.number().min(0).optional().allow('', null),
  employmentType: Joi.string().trim().valid('Full-time', 'Part-time', 'Contract', 'Consultant', '').optional().allow('', null),
  joiningDate:    Joi.date().iso().optional().allow(null, ''),
  shift:          Joi.string().trim().valid('Morning', 'Evening', 'Night', 'Rotational', '').optional().allow('', null),
  reportingTo:    Joi.string().length(24).optional().allow(null, ''),
  nursingDomain:  Joi.string().trim().valid('OPD', 'IPD', 'LAB', '').optional().allow('', null),
  assignedWardId: Joi.string().length(24).optional().allow(null, ''),
};

const professionalFields = {
  yearsOfExperience:     Joi.number().integer().min(0).max(60).optional().allow(null, ''),
  // Doctor
  medicalLicenseNumber:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  medicalCouncil:        Joi.string().trim().max(100).optional().allow('', null),
  licenseRegistrationDate: Joi.date().iso().optional().allow(null, ''),
  licenseExpiryDate:     Joi.date().iso().optional().allow(null, ''),
  primaryQualification:  Joi.string().trim().max(100).optional().allow('', null),
  highestQualification:  Joi.string().trim().max(100).optional().allow('', null),
  primarySpecialization: Joi.string().trim().max(100).optional().allow('', null),
  superSpecialization:   Joi.string().trim().max(100).optional().allow('', null),
  previousHospital:      Joi.string().trim().max(200).optional().allow('', null),
  languagesKnown:        Joi.array().items(Joi.string().trim()).optional().allow(null),
  consultationType:      Joi.string().trim().valid('In-Person', 'Online', 'Both', '').optional().allow('', null),
  consultingFee:         Joi.number().min(0).optional().allow(null, ''),
  followUpFee:           Joi.number().min(0).optional().allow(null, ''),
  // Nurse
  nursingLicenseNumber:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  nursingSpecialization: Joi.string().trim().max(100).optional().allow('', null),
  // Laboratory
  labCertificationCode:  Joi.string().trim().min(3).max(50).optional().allow('', null),
  labQualification:      Joi.string().trim().max(100).optional().allow('', null),
  // Pharmacy
  pharmacyLicenseNumber: Joi.string().trim().min(3).max(50).optional().allow('', null),
  pharmacyQualification: Joi.string().trim().max(100).optional().allow('', null),
};

// ── Schemas ──────────────────────────────────────────────────────────────────
const verificationDocumentSchema = Joi.alternatives().try(
  Joi.object({
    url: Joi.string().trim().optional().allow('', null),
    secureUrl: Joi.string().trim().optional().allow('', null),
    cloudinaryPublicId: Joi.string().trim().optional().allow('', null),
    resourceType: Joi.string().trim().optional().allow('', null),
    fileName: Joi.string().trim().optional().allow('', null),
    sizeBytes: Joi.number().integer().min(0).optional().allow(null),
    mimeType: Joi.string().trim().optional().allow('', null),
    uploadedAt: Joi.date().iso().optional().allow(null, ''),
  }),
  Joi.valid(null, '')
).optional();

const createStaffSchema = Joi.object({
  // fullName is required for backward compat; also accepts split names
  fullName:     Joi.string().min(2).max(100).required(),
  departmentId: Joi.string().length(24).optional().allow(null, ''),
  roleId:       Joi.string().length(24).required(),
  position:     Joi.string().min(2).max(100).required(),
  positionRank: Joi.number().integer().min(1).max(9).optional(),
  status:       Joi.string().valid('Active', 'Inactive').optional(),
  username:     Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).optional().allow('', null).messages({
    'string.pattern.base': 'Username can only contain alphanumeric characters and underscores',
  }),
  password:     Joi.string().min(8).max(100).optional().allow('', null),
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

