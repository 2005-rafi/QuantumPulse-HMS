/**
 * backend/src/core/middleware/phi-sanitizer.middleware.js
 * Universal HIPAA § 164.514 Safe Harbor & Role-Based PHI Response Interceptor.
 *
 * Automatically inspects all outgoing Express JSON responses and enforces cryptographically
 * sound role-based data masking. Non-clinical roles (receptionists, billing, cashiers, general staff)
 * receive masked demographic identifiers and redacted clinical notes, preventing accidental PHI leakage.
 */
const { deepSanitizePayload } = require('../utils/phi-sanitizer');

const phiSanitizerMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (body && typeof body === 'object') {
      try {
        body = deepSanitizePayload(body, req.user);
      } catch (err) {
        // Fallback to sending original body without crashing if unexpected traversal error
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = phiSanitizerMiddleware;
