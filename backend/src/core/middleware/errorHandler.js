const AppError = require('../errors/AppError');
const ERROR_CODES = require('../errors/errorCodes');
const { error: sendError } = require('../responses');
const logger = require('../logger');

/**
 * Central error handler. Classifies every error into catalog codes.
 * Never leaks stack traces, DB queries, or file paths to responses.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const requestId = req.requestId || 'unknown';
  
  let errorCode = 'SYSTEM_001';
  let httpStatus = 500;
  let message = 'An unexpected error occurred';
  let details = null;
  let isOperational = false;

  // 1. Catch Express body-parser malformed JSON errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    errorCode = 'BAD_REQUEST';
    httpStatus = 400;
    message = 'Malformed JSON payload';
    isOperational = true;
  }
  // 2. Catch JWT expiration / signature issues
  else if (err.name === 'TokenExpiredError') {
    errorCode = 'AUTH_002';
    httpStatus = 401;
    message = 'Token expired';
    isOperational = true;
  } 
  else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    errorCode = 'AUTH_003';
    httpStatus = 401;
    message = 'Token invalid or malformed';
    isOperational = true;
  }
  // 3. Catch custom AppErrors
  else if (err instanceof AppError) {
    errorCode = err.errorCode;
    httpStatus = err.httpStatus;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  }
  // 4. Mongoose Duplicate Key
  else if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    errorCode = 'BUSINESS_001';
    httpStatus = 409;
    message = `Duplicate value for ${field}`;
    isOperational = true;
  }
  // 5. Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    errorCode = 'VALIDATION_001';
    httpStatus = 422;
    message = 'Validation failed';
    isOperational = true;
  }
  // 6. Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    errorCode = 'VALIDATION_002';
    httpStatus = 422;
    message = 'Invalid ID format';
    isOperational = true;
  }

  // Look up severity/retryable metadata from central catalog
  const errorDef = ERROR_CODES[errorCode] || {};
  const severity = errorDef.severity || (httpStatus >= 500 ? 'ERROR' : 'WARN');
  const retryable = errorDef.retryable !== undefined ? errorDef.retryable : false;

  // Dynamic log level routing and alert trigger check
  const logContext = {
    errorCode,
    message: err.message || message,
    requestId,
    httpStatus,
    isOperational,
    retryable,
    severity,
    stack: !isOperational ? err.stack : undefined,
  };

  if (severity === 'CRITICAL' || severity === 'ERROR' || !isOperational || httpStatus >= 500) {
    logger.error(`Exception triggered: ${message}`, logContext);
  } else {
    logger.warn(`Operational warning: ${message}`, logContext);
  }

  return sendError(res, errorCode, message, details, httpStatus, req);
};

module.exports = errorHandler;
