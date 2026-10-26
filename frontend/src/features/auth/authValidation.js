/**
 * QuantumCareOne HMS - Clinical Authentication Validation Engine
 * 
 * Adheres to:
 * - Single Responsibility Principle (SRP): Pure validation and sanitization
 * - Tesler's Law (Conservation of Complexity): Handles edge cases, control characters,
 *   bidi overrides, and sanitization automatically to minimize user friction.
 * - Open/Closed Principle (OCP): Extensible error code mapping table.
 */

// Sanitizes inputs to prevent XSS, invisible Unicode injection, and format exploits
export const sanitizeInput = (val, isPassword = false) => {
  if (typeof val !== 'string') return '';
  if (isPassword) {
    // Passwords: Strip null bytes & dangerous control characters, limit length to 128
    return val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 128);
  }
  // Usernames: Strip control characters, bidi overrides, zero-width spaces, and HTML injection
  return val
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u202A-\u202E\u2060-\u2069\uFEFF]/g, '')
    .replace(/[<>"']/g, '')
    .slice(0, 64);
};

// Validates a single field value and returns a localized, clinical-grade error string
export const validateField = (name, value) => {
  if (name === 'username') {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return 'Staff username or ID is required';
    }
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (trimmed.length > 64) {
      return 'Username cannot exceed 64 characters';
    }
    if (!/^[a-zA-Z0-9._@-]+$/.test(trimmed)) {
      return 'Only alphanumeric characters and ( . _ - @ ) are permitted';
    }
    return '';
  }

  if (name === 'password') {
    if (!value) {
      return 'Workstation password is required';
    }
    if (value.length < 4) {
      return 'Password must be at least 4 characters';
    }
    if (value.length > 128) {
      return 'Password cannot exceed 128 characters';
    }
    return '';
  }

  return '';
};

// Comprehensive form validator ensuring atomic validation state
export const validateLoginForm = (form) => {
  const usernameError = validateField('username', form.username);
  const passwordError = validateField('password', form.password);

  const errors = {};
  if (usernameError) errors.username = usernameError;
  if (passwordError) errors.password = passwordError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Clinical Error Code to User-Friendly Diagnostic Resolution
export const ERROR_MAPPINGS = {
  AUTH_001: 'Invalid staff username or password credentials. Please verify your ID.',
  AUTH_002: 'Authentication session expired. Please sign in again.',
  AUTH_003: 'Invalid authentication token. Security validation failed.',
  AUTH_004: 'Clinical workstation locked due to excessive failed attempts. Contact Hospital IT.',
  AUTH_005: 'This staff account has been deactivated. Contact Hospital Administrator.',
  AUTH_006: 'Account pending administrative activation.',
  ERR_NETWORK: 'Unable to reach the HMS Clinical Server. Please check hospital network.',
  ECONNABORTED: 'Clinical server request timed out. Please check network connection.',
};

export const resolveAuthErrorMessage = (error, consecutiveFails = 0) => {
  if (!error) return '';

  const code = error.response?.data?.errorCode || error.code;
  const serverMsg = error.response?.data?.message;

  if (code === 'AUTH_004') {
    const remainingSeconds = error.response?.data?.details?.remainingSeconds;
    if (remainingSeconds) {
      return `Account locked due to consecutive failed attempts. Locked for ${remainingSeconds}s.`;
    }
    return ERROR_MAPPINGS.AUTH_004;
  }

  if (consecutiveFails >= 5) {
    return 'Security Lockout: 5 consecutive failed attempts. Workstation temporarily paused for 30s.';
  }

  if (code && ERROR_MAPPINGS[code]) {
    return ERROR_MAPPINGS[code];
  }

  return serverMsg || 'Authentication failed. Please verify your staff credentials.';
};
