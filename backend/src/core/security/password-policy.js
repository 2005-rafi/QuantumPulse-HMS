/**
 * backend/src/core/security/password-policy.js
 * NIST SP 800-63B Enterprise Password Policy & Historical Entropy Guard.
 */
const bcrypt = require('bcryptjs');

const COMMON_BREACHED_PASSWORDS = new Set([
  'password',
  'password123',
  'hospital123',
  'admin123',
  'welcome123',
  'welcome2026',
  'doctor123',
  'nurse123',
  'qwerty123',
  '1234567890',
  'letmein123',
  'careone123',
  'quantumpulse',
  'quantumcare',
]);

const MIN_LENGTH = 10;
const MAX_LENGTH = 128;
const MAX_HISTORY_ENTRIES = 5;

/**
 * Validate password strength against NIST SP 800-63B standards
 *
 * @param {string} password - The plain text password
 * @param {Object} [options] - Optional context like username
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validatePassword = (password, options = {}) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password must be a non-empty string'] };
  }

  // 1. Length Verification
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters in length`);
  }
  if (password.length > MAX_LENGTH) {
    errors.push(`Password cannot exceed ${MAX_LENGTH} characters`);
  }

  // 2. Breached & Dictionary Password Blacklist
  const lower = password.toLowerCase().trim();
  if (COMMON_BREACHED_PASSWORDS.has(lower)) {
    errors.push('Password is too common or appears in known security breach dictionaries');
  }

  // 3. Username / Context Correlation Check
  if (options.username && typeof options.username === 'string') {
    const cleanUser = options.username.toLowerCase().trim();
    if (cleanUser.length >= 3 && lower.includes(cleanUser)) {
      errors.push('Password must not contain the user identifier or username');
    }
  }

  // 4. Repetitive or Sequential Patterns
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains excessive consecutive repetitive characters');
  }
  if (/12345|23456|34567|45678|56789|67890|abcdef|bcdefg/i.test(password)) {
    errors.push('Password contains easily guessable sequential sequences');
  }

  // 5. Entropy & Character Diversity (At least 3 character classes, or >= 14 chars passphrase)
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const diversityScore = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (password.length < 14 && diversityScore < 3) {
    errors.push(
      'Password must contain at least three of the following: uppercase letters, lowercase letters, numbers, or symbols'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check whether the new password matches any of the user's last 5 historical password hashes.
 *
 * @param {string} newPassword - Plain text candidate
 * @param {Array<{ hash: string }>} passwordHistory - Array of historical hash objects
 * @returns {Promise<boolean>} True if password was previously used (forbidden)
 */
const isPasswordInHistory = async (newPassword, passwordHistory = []) => {
  if (!Array.isArray(passwordHistory) || passwordHistory.length === 0) {
    return false;
  }

  const recentHistory = passwordHistory.slice(-MAX_HISTORY_ENTRIES);
  for (const entry of recentHistory) {
    if (entry.hash) {
      const isMatch = await bcrypt.compare(newPassword, entry.hash);
      if (isMatch) return true;
    }
  }

  return false;
};

module.exports = {
  validatePassword,
  isPasswordInHistory,
  MIN_LENGTH,
  MAX_HISTORY_ENTRIES,
};
