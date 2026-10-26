/**
 * backend/src/core/middleware/parameter-coercion.middleware.js
 * Server-Side Defense-in-Depth Parameter Type Coercion & NoSQL Injection Defense.
 * Prevents malicious client tampering (e.g. ?page[$gt]=0, ?status[$ne]=1, prototype pollution).
 */
const logger = require('../logger');

const FORBIDDEN_KEY_PATTERNS = [/^\$/, /\./, /__proto__/, /constructor/, /prototype/];

/**
 * Recursively inspects and purges malicious operator objects from query and body inputs
 */
const cleanObject = (obj, depth = 0) => {
  if (depth > 8 || !obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanObject(item, depth + 1));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const isForbidden = FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isForbidden) {
      logger.warn('ParameterCoercion: Neutralized illegal query key', { key });
      continue;
    }

    if (value && typeof value === 'object') {
      clean[key] = cleanObject(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }

  return clean;
};

/**
 * Express middleware enforcing strict primitive parameter coercion
 */
const parameterCoercionMiddleware = (req, res, next) => {
  try {
    // 1. Sanitize req.query
    if (req.query && typeof req.query === 'object') {
      req.query = cleanObject(req.query);

      // Coerce numeric pagination parameters
      if (req.query.page !== undefined) {
        const parsed = parseInt(req.query.page, 10);
        req.query.page = !isNaN(parsed) && parsed > 0 ? parsed : 1;
      }

      if (req.query.limit !== undefined) {
        const parsed = parseInt(req.query.limit, 10);
        req.query.limit = !isNaN(parsed) && parsed > 0 ? Math.min(100, parsed) : 20;
      }

      // Ensure scalar parameters are strings, not injection dictionaries
      const scalarParams = ['status', 'search', 'sortBy', 'sortOrder', 'mrn', 'visitType', 'departmentId'];
      for (const param of scalarParams) {
        if (req.query[param] !== undefined) {
          if (typeof req.query[param] === 'object' && req.query[param] !== null) {
            logger.warn('ParameterCoercion: Blocked dictionary injection in scalar parameter', {
              param,
              val: req.query[param],
            });
            delete req.query[param];
          } else if (typeof req.query[param] !== 'string') {
            req.query[param] = String(req.query[param]);
          }
        }
      }
    }

    // 2. Sanitize req.params
    if (req.params && typeof req.params === 'object') {
      req.params = cleanObject(req.params);
    }

    return next();
  } catch (err) {
    logger.error('ParameterCoercion Middleware error', { error: err.message });
    return next(err);
  }
};

module.exports = parameterCoercionMiddleware;
