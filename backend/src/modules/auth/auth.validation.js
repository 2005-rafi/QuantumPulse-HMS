const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(1).max(100).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { loginSchema, refreshSchema };
