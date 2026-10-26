const ERROR_CODES = require('./error-codes');

class AppError extends Error {
  constructor(errorCodeKeyOrMessage, detailsOrStatus = null, optionsOrCode = {}) {
    let errorDef;
    let message;
    let errorCode;
    let httpStatus;
    let details = null;

    if (ERROR_CODES[errorCodeKeyOrMessage]) {
      errorDef = ERROR_CODES[errorCodeKeyOrMessage];
      errorCode = errorDef.code;
      httpStatus = errorDef.httpStatus;
      message = typeof detailsOrStatus === 'string' ? detailsOrStatus : errorDef.message;
      details = typeof detailsOrStatus === 'string' ? null : detailsOrStatus;
    } else {
      message = String(errorCodeKeyOrMessage || 'An error occurred');
      httpStatus = typeof detailsOrStatus === 'number' ? detailsOrStatus : 500;
      const codeStr = typeof optionsOrCode === 'string' 
        ? optionsOrCode 
        : (typeof optionsOrCode === 'object' && optionsOrCode?.code ? optionsOrCode.code : (httpStatus === 404 ? 'NOT_FOUND' : httpStatus === 409 ? 'BUSINESS_001' : httpStatus === 422 ? 'VALIDATION_001' : httpStatus === 403 ? 'AUTHZ_001' : httpStatus === 401 ? 'AUTH_001' : 'BUSINESS_001'));
      errorCode = codeStr;
      if (typeof detailsOrStatus === 'object' && detailsOrStatus !== null) {
        details = detailsOrStatus;
      }
    }

    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.details = details;
    
    const isOperationalOpt = typeof optionsOrCode === 'object' && optionsOrCode !== null ? optionsOrCode.isOperational : undefined;
    this.isOperational = isOperationalOpt !== undefined 
      ? isOperationalOpt 
      : (errorDef && errorDef.isOperational !== undefined ? errorDef.isOperational : httpStatus < 500);

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
