const Joi = require('joi');

const createServiceMasterSchema = Joi.object({
  code: Joi.string().required().uppercase().trim(),
  name: Joi.string().required().trim(),
  description: Joi.string().allow('').default(''),
  category: Joi.string().valid('REGISTRATION', 'CONSULTATION', 'PROCEDURE', 'PACKAGE', 'DIAGNOSTICS').required(),
  defaultUnit: Joi.string().valid('PER_VISIT', 'PER_ITEM', 'PER_PROCEDURE', 'PER_DAY', 'PER_TEST').default('PER_VISIT'),
});

const createTariffRuleSchema = Joi.object({
  serviceMasterId: Joi.string().allow(null, ''),
  testCode: Joi.string().allow(null, '').trim(),
  category: Joi.string().valid('REGISTRATION', 'CONSULTATION', 'DIAGNOSTICS', 'PROCEDURE', 'PACKAGE').required(),
  scope: Joi.object({
    departmentId: Joi.string().allow(null, ''),
    tariffGrade: Joi.string().valid('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5').allow(null),
    staffId: Joi.string().allow(null, ''),
    visitType: Joi.string().valid('OPD', 'EMERGENCY', 'IPD').allow(null),
    appointmentType: Joi.string().valid('WALK_IN', 'FOLLOW_UP', 'SCHEDULED').allow(null),
  }).default({}),
  amount: Joi.number().min(0).required(),
  unit: Joi.string().valid('PER_VISIT', 'PER_TEST', 'PER_ITEM', 'PER_PROCEDURE', 'PER_DAY').default('PER_VISIT'),
  effectiveFrom: Joi.date().required(),
  effectiveTo: Joi.date().allow(null),
});

const publishRuleSchema = Joi.object({
  reason: Joi.string().allow('').default(''),
});

const cancelRuleSchema = Joi.object({
  reason: Joi.string().allow('').default(''),
});

const createMedicinePriceSchema = Joi.object({
  medicineName: Joi.string().required().trim(),
  genericName: Joi.string().allow('').default(''),
  manufacturer: Joi.string().allow('').default(''),
  unitPrice: Joi.number().min(0).required(),
  unit: Joi.string().default('tablet'),
  dispensingFee: Joi.number().min(0).default(0),
  effectiveFrom: Joi.date().default(Date.now),
  effectiveTo: Joi.date().allow(null),
});

module.exports = {
  createServiceMasterSchema,
  createTariffRuleSchema,
  publishRuleSchema,
  cancelRuleSchema,
  createMedicinePriceSchema,
};
