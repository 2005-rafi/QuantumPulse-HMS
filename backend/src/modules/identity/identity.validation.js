const Joi = require('joi');
const { ACCOUNT_STATUS } = require('../../core/constants');

const passwordComplexity = Joi.string()
  .min(8)
  .max(100)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
  });

const createIdentitySchema = Joi.object({
  staffId: Joi.string().length(24).required(),
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required().messages({
    'string.pattern.base': 'Username can only contain alphanumeric characters and underscores',
  }),
  password: passwordComplexity,
});

const changeStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ACCOUNT_STATUS)).required(),
});

const changePasswordSchema = Joi.object({
  password: passwordComplexity,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

module.exports = { createIdentitySchema, changeStatusSchema, changePasswordSchema };
