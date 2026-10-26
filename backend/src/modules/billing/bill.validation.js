const Joi = require('joi');

const PAYMENT_METHOD_MAP = {
  Cash: 'Cash',
  CASH: 'Cash',
  cash: 'Cash',
  UPI: 'UPI',
  upi: 'UPI',
  Card: 'Card',
  CARD: 'Card',
  card: 'Card',
  Insurance: 'Insurance',
  INSURANCE: 'Insurance',
  insurance: 'Insurance',
  WaivedOff: 'WaivedOff',
  WAIVER: 'WaivedOff',
  WAIVEDOFF: 'WaivedOff',
  waivedoff: 'WaivedOff',
  NetBanking: 'UPI',
  NET_BANKING: 'UPI',
};

const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).required(),
  method: Joi.string()
    .valid(...Object.keys(PAYMENT_METHOD_MAP))
    .custom((value) => PAYMENT_METHOD_MAP[value] || 'Cash')
    .required(),
  reference: Joi.string().allow('').default(''),
});

const requestAdjustmentSchema = Joi.object({
  type: Joi.string().valid('CREDIT_NOTE', 'REFUND', 'WRITEOFF').required(),
  amount: Joi.number().min(0).required(),
  reason: Joi.string().required().trim(),
});

module.exports = { recordPaymentSchema, requestAdjustmentSchema };
