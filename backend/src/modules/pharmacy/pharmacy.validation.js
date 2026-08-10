const Joi = require('joi');

const dispenseSchema = Joi.object({
  dispensedMedications: Joi.array().items(
    Joi.object({
      recommended: Joi.string().required(),
      alternativeGiven: Joi.string().allow('', null),
      quantity: Joi.string().required(),
      amount: Joi.number().min(0).required(),
      dosageSchedule: Joi.object({
        morning: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional(),
        afternoon: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional(),
        night: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional()
      }).optional()
    })
  ).required(),
  consultationFee: Joi.number().min(0).optional(),
  labCharges: Joi.number().min(0).optional()
});

module.exports = { dispenseSchema };
