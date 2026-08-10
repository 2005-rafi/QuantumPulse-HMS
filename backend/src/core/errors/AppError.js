const ERROR_CODES = require('./errorCodes');

class AppError extends Error {
  constructor(errorCodeKey, details = null, options = {}) {
    const errorDef = ERROR_CODES[errorCodeKey];
    if (!errorDef) {
      throw new Error(`Unknown error code key: ${errorCodeKey}`);
    }
    // If a specific string message is passed as details, use it as the main error message
    const message = typeof details === 'string' ? details : errorDef.message;
    super(message);
    this.name = 'AppError';
    this.errorCode = errorDef.code;
    this.httpStatus = errorDef.httpStatus;
    this.details = typeof details === 'string' ? null : details;
    
    // Determine operational status from options, error definitions, or fallback to true
    this.isOperational = options.isOperational !== undefined 
      ? options.isOperational 
      : (errorDef.isOperational !== undefined ? errorDef.isOperational : true);

    // Keep stack trace clean and accurate
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
