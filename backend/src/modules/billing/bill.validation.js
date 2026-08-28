const Joi = require('joi');

const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  method: Joi.string().valid('Cash', 'UPI', 'Card', 'Insurance', 'WaivedOff').required(),
  reference: Joi.string().allow('').default(''),
});

const requestAdjustmentSchema = Joi.object({
  type: Joi.string().valid('CREDIT_NOTE', 'REFUND', 'WRITEOFF').required(),
  amount: Joi.number().min(0).required(),
  reason: Joi.string().required().trim(),
});

module.exports = { recordPaymentSchema, requestAdjustmentSchema };
