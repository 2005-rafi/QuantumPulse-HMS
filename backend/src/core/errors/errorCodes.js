const ERROR_CODES = {
  // Authentication — 401
  AUTH_001: { code: 'AUTH_001', message: 'Invalid credentials', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_002: { code: 'AUTH_002', message: 'Token expired', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_003: { code: 'AUTH_003', message: 'Token invalid or malformed', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_004: { code: 'AUTH_004', message: 'Account locked', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_005: { code: 'AUTH_005', message: 'Account disabled', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_006: { code: 'AUTH_006', message: 'Account pending activation', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },
  AUTH_007: { code: 'AUTH_007', message: 'Authentication required', httpStatus: 401, severity: 'WARN', retryable: false, isOperational: true },

  // Authorization — 403
  AUTHZ_001: { code: 'AUTHZ_001', message: 'Permission not granted for this role', httpStatus: 403, severity: 'WARN', retryable: false, isOperational: true },
  AUTHZ_002: { code: 'AUTHZ_002', message: 'Business ownership check failed', httpStatus: 403, severity: 'WARN', retryable: false, isOperational: true },
  AUTHZ_003: { code: 'AUTHZ_003', message: 'Operation requires elevated role', httpStatus: 403, severity: 'WARN', retryable: false, isOperational: true },

  // Validation — 422
  VALIDATION_001: { code: 'VALIDATION_001', message: 'Required field missing', httpStatus: 422, severity: 'WARN', retryable: false, isOperational: true },
  VALIDATION_002: { code: 'VALIDATION_002', message: 'Invalid format', httpStatus: 422, severity: 'WARN', retryable: false, isOperational: true },
  VALIDATION_003: { code: 'VALIDATION_003', message: 'Value out of allowed range', httpStatus: 422, severity: 'WARN', retryable: false, isOperational: true },

  // Business — 409
  BUSINESS_001: { code: 'BUSINESS_001', message: 'Duplicate registration', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },
  BUSINESS_002: { code: 'BUSINESS_002', message: 'Invalid state transition', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },
  BUSINESS_003: { code: 'BUSINESS_003', message: 'Record already finalized or locked', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },
  BUSINESS_004: { code: 'BUSINESS_004', message: 'Operation already completed', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },
  BUSINESS_005: { code: 'BUSINESS_005', message: 'Concurrency conflict', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },

  // System — 500/503
  SYSTEM_001: { code: 'SYSTEM_001', message: 'Unexpected server error', httpStatus: 500, severity: 'ERROR', retryable: false, isOperational: false },
  SYSTEM_002: { code: 'SYSTEM_002', message: 'Database unavailable', httpStatus: 503, severity: 'CRITICAL', retryable: true, isOperational: false },
  SYSTEM_003: { code: 'SYSTEM_003', message: 'Transaction failed and was rolled back', httpStatus: 500, severity: 'ERROR', retryable: true, isOperational: true },
  SYSTEM_004: { code: 'SYSTEM_004', message: 'External dependency unavailable', httpStatus: 503, severity: 'ERROR', retryable: true, isOperational: true },

  // Not found
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', httpStatus: 404, severity: 'WARN', retryable: false, isOperational: true },

  // Bad Request
  BAD_REQUEST: { code: 'BAD_REQUEST', message: 'Bad request', httpStatus: 400, severity: 'WARN', retryable: false, isOperational: true },

  // Laboratory — 403/404/409/422
  LAB_001: { code: 'LAB_001', message: 'Laboratory already linked to this department', httpStatus: 409, severity: 'WARN', retryable: false, isOperational: true },
  LAB_002: { code: 'LAB_002', message: 'Lab order department mismatch — order belongs to a different lab department', httpStatus: 403, severity: 'WARN', retryable: false, isOperational: true },
  LAB_003: { code: 'LAB_003', message: 'File upload rejected — unsupported file type', httpStatus: 422, severity: 'WARN', retryable: false, isOperational: true },
  LAB_004: { code: 'LAB_004', message: 'File upload rejected — file size exceeds limit', httpStatus: 422, severity: 'WARN', retryable: false, isOperational: true },
  LAB_005: { code: 'LAB_005', message: 'Scan file not found on storage', httpStatus: 404, severity: 'WARN', retryable: false, isOperational: true },
};

module.exports = ERROR_CODES;
