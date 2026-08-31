/**
 * modules/ipd/admission/ipd-admission.validation.js
 * Joi input validation schemas for IPD admissions.
 */
const Joi = require('joi');
const { ADMISSION_TYPES, ADMISSION_STATUS } = require('./ipd-admission.model');

const admitPatientSchema = Joi.object({
  patientId: Joi.string().hex().length(24).required(),
  primaryDoctorId: Joi.string().hex().length(24).required(),
  admittingDepartmentId: Joi.string().hex().length(24).required(),
  bedId: Joi.string().hex().length(24).required(),
  admissionType: Joi.string().valid(...ADMISSION_TYPES).default('PLANNED'),
  provisionalDiagnosis: Joi.string().trim().min(3).max(300).required(),
  chiefComplaints: Joi.string().trim().allow('').max(500).default(''),
  carePlan: Joi.string().trim().allow('').max(500).default(''),
  dietTier: Joi.string().valid('REGULAR_DIET', 'DIABETIC', 'RENAL', 'CARDIAC', 'LIQUID', 'SOFT', 'NPO').default('REGULAR_DIET'),
  initialDepositAmount: Joi.number().min(0).optional(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'INSURANCE_TPA').default('UPI'),
  transactionReference: Joi.string().trim().allow('').max(100).default(''),
});

const updateAdmissionSchema = Joi.object({
  carePlan: Joi.string().trim().allow('').max(500),
  dietTier: Joi.string().valid('REGULAR_DIET', 'DIABETIC', 'RENAL', 'CARDIAC', 'LIQUID', 'SOFT', 'NPO'),
  status: Joi.string().valid(...Object.values(ADMISSION_STATUS)),
  dischargeSummary: Joi.object({
    finalDiagnosis: Joi.string().trim().allow(''),
    courseInHospital: Joi.string().trim().allow(''),
    dischargeAdvice: Joi.string().trim().allow(''),
    followUpDate: Joi.date().allow(null),
  }),
});

module.exports = {
  admitPatientSchema,
  updateAdmissionSchema,
};
