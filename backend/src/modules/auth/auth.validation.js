const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(1).max(100).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const unlockSchema = Joi.object({
  password: Joi.string().min(1).max(100).required(),
  username: Joi.string().min(2).max(50).allow('', null).optional(),
});

module.exports = { loginSchema, refreshSchema, unlockSchema };
