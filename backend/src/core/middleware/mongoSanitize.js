/**
 * NoSQL Injection Protection Middleware
 * Recursively inspects and sanitizes request body, query, and params.
 * Neutralizes keys starting with '$' or containing '.' to prevent MongoDB operator injection.
 */
const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && !(value instanceof Date) && !(value instanceof RegExp)) {
    const cleanObj = {};
    for (const key of Object.keys(value)) {
      // Prohibit or sanitize keys starting with $ or containing .
      const safeKey = key.replace(/^\$/, '_').replace(/\./g, '_');
      cleanObj[safeKey] = sanitizeValue(value[key]);
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
