/**
 * NoSQL Injection Protection Middleware
 * Recursively inspects and sanitizes request body, query, and params.
 * Neutralizes keys starting with '$' or containing '.' to prevent MongoDB operator injection.
 * Drops prototype pollution keys ('__proto__', 'constructor', 'prototype').
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const sanitizeValue = (value, depth = 0) => {
  if (depth > 15 || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object' && !(value instanceof Date) && !(value instanceof RegExp) && !(value instanceof Buffer)) {
    const cleanObj = {};
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

      // Neutralize Prototype Pollution
      if (FORBIDDEN_KEYS.has(key)) {
        continue;
      }

      // Neutralize MongoDB operator injection ($prefix) and dot notation keys
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }

      cleanObj[key] = sanitizeValue(value[key], depth + 1);
    }
    return cleanObj;
  }

  return value;
};

const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = mongoSanitize;

