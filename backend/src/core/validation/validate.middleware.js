const { error: sendError } = require('../responses');

/**
 * Joi validation middleware factory.
 * Validates req.body against the given schema.
 * Returns VALIDATION errors before any DB write.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (!error) {
    req.body = value;
    return next();
  }

  const details = error.details.map((d) => ({
    field: d.path.length ? d.path.join('.') : (d.context.key || 'body'),
    key: d.context.key || d.path[d.path.length - 1],
    message: d.message.replace(/"/g, ''),
  }));

  const logger = require('../logger');
  logger.warn('Joi validation failed', { path: req.originalUrl, details });

  // Pick first error code
  const firstType = error.details[0].type;
  let errorCode = 'VALIDATION_001';
  if (firstType.includes('format') || firstType.includes('email') || firstType.includes('pattern')) {
    errorCode = 'VALIDATION_002';
  } else if (firstType.includes('min') || firstType.includes('max')) {
    errorCode = 'VALIDATION_003';
  }

  const formattedSummary = details.map((d) => (d.message ? d.message.replace(/"/g, '') : `${d.field} is invalid`)).join('; ');

  return sendError(res, errorCode, `Validation failed: ${formattedSummary}`, details, 422);
};

module.exports = { validate };
