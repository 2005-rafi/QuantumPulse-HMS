/**
 * frontend/src/core/security/query-sanitizer.js
 * Client-Side Query Injection & Prototype Pollution Defense.
 * Sanitizes outbound query parameters and payload objects against NoSQL injection ($ operators)
 * and prototype pollution (__proto__, constructor, prototype).
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Checks if an object key is safe from prototype pollution and NoSQL operator injection
 * @param {string} key
 * @returns {boolean}
 */
export const isSafeKey = (key) => {
  if (typeof key !== 'string') return false;
  if (FORBIDDEN_KEYS.has(key)) return false;
  if (key.startsWith('$') || key.includes('.')) return false;
  return true;
};

/**
 * Recursively sanitizes any JavaScript object or array, stripping forbidden operator keys
 * and prototype pollution vectors.
 *
 * @param {any} input - Value to sanitize
 * @param {number} [depth=0] - Recursion depth limit
 * @returns {any} Sanitized clone
 */
export const sanitizePayload = (input, depth = 0) => {
  if (depth > 10) return null; // Prevent stack overflow or circular reference DoS
  if (input === null || input === undefined) return input;

  // Primitives pass directly
  if (typeof input !== 'object') {
    return input;
  }

  // FormData and Blob/File instances should not be recursively inspected as plain objects
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return input;
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    return input;
  }

  // Arrays
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item, depth + 1));
  }

  // Objects
  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isSafeKey(key)) {
      if (typeof console !== 'undefined') {
        console.warn(`[SecuritySanitizer] Neutralized injection key: "${key}"`);
      }
      continue;
    }
    clean[key] = sanitizePayload(value, depth + 1);
  }

  return clean;
};

/**
 * Specifically sanitizes HTTP GET query parameters
 *
 * @param {Object} params
 * @returns {Object}
 */
export const sanitizeQueryParams = (params) => {
  if (!params || typeof params !== 'object') return params;
  return sanitizePayload(params);
};

export default {
  isSafeKey,
  sanitizePayload,
  sanitizeQueryParams,
};
