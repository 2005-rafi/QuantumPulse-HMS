const Joi = require('joi');

const createPatientSchema = Joi.object({
  firstName: Joi.string().required().trim(),
  lastName: Joi.string().required().trim(),
  dob: Joi.date().iso().max('now').required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown').default('Unknown'),
  aadhaar: Joi.string().length(12).pattern(/^[0-9]+$/).allow('', null).messages({'string.pattern.base': 'Aadhaar must contain only numbers'}),
  phone: Joi.string().required().trim(),
  whatsapp: Joi.string().allow('', null).trim(),
  email: Joi.string().email().allow('', null).trim(),
  parentsName: Joi.string().allow('', null).trim(),
  address: Joi.object({
    street: Joi.string().allow('', null).trim(),
    city: Joi.string().allow('', null).trim(),
    state: Joi.string().allow('', null).trim(),
    stateCode: Joi.string().allow('', null).trim(),
    country: Joi.string().allow('', null).trim(),
    countryCode: Joi.string().allow('', null).trim(),
    pinCode: Joi.string().allow('', null).trim()
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().allow('', null).trim(),
    relation: Joi.string().allow('', null).trim(),
    phone: Joi.string().allow('', null).trim()
  }).optional()
});

const updatePatientSchema = Joi.object({
  firstName: Joi.string().trim(),
  lastName: Joi.string().trim(),
  dob: Joi.date().iso().max('now'),
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'),
  aadhaar: Joi.string().length(12).pattern(/^[0-9]+$/).allow('', null).messages({'string.pattern.base': 'Aadhaar must contain only numbers'}),
  phone: Joi.string().trim(),
  whatsapp: Joi.string().allow('', null).trim(),
  email: Joi.string().email().allow('', null).trim(),
  parentsName: Joi.string().allow('', null).trim(),
  address: Joi.object({
    street: Joi.string().allow('', null).trim(),
    city: Joi.string().allow('', null).trim(),
    state: Joi.string().allow('', null).trim(),
    stateCode: Joi.string().allow('', null).trim(),
    country: Joi.string().allow('', null).trim(),
    countryCode: Joi.string().allow('', null).trim(),
    pinCode: Joi.string().allow('', null).trim()
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().allow('', null).trim(),
    relation: Joi.string().allow('', null).trim(),
    phone: Joi.string().allow('', null).trim()
  }).optional()
}).min(1);

const addHistorySchema = Joi.object({
  condition: Joi.string().required().trim(),
  diagnosedDate: Joi.date().iso().max('now').optional(),
  notes: Joi.string().allow('', null).trim(),
  status: Joi.string().valid('Active', 'Resolved').default('Active')
});

const createPatientWithVisitSchema = Joi.object({
  patient: createPatientSchema.required(),
  visit: Joi.object({
    isDirectPharmacy: Joi.boolean().optional(),
    departmentId: Joi.string().optional(),
    doctorId: Joi.string().optional(),
    visitType: Joi.string().valid('OPD', 'IPD').optional(),
    reasonForVisit: Joi.string().allow('').optional(),
    receptionPayment: Joi.object({
      registrationFee: Joi.number().min(0).optional(),
      consultationFee: Joi.number().min(0).optional(),
      paymentMethod: Joi.string().valid('Cash', 'Card', 'UPI', 'Insurance').optional()
    }).optional()
  }).required()
});

module.exports = { createPatientSchema, updatePatientSchema, addHistorySchema, createPatientWithVisitSchema };
