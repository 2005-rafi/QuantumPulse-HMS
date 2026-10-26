const mongoose = require('mongoose');

/**
 * FilterStrategy
 * Translates validated user filters and mandatory security scopes into MongoDB query predicates.
 *
 * Rules:
 * - Only whitelisted fields in DomainQueryConfig are parsed into predicates.
 * - Server-side securityScope is applied with absolute precedence over user filters.
 * - Type-safe conversion of ObjectIds, booleans, and ISO dates.
 */
class FilterStrategy {
  /**
   * Builds MongoDB filter predicates from context filters and domain configuration.
   * @param {object} userFilters - Normalized filters from QueryContext
   * @param {object} securityScope - Injected security scope from authentication/role
   * @param {object} filterConfig - Domain filter mapping configuration
   * @returns {object} Combined MongoDB filter object
   */
  static build(userFilters = {}, securityScope = {}, filterConfig = {}) {
    const query = {};
    const allowedMap = filterConfig.allowedFields || {};

    // 1. Process User Filters against allowed field mappings
    for (const [key, value] of Object.entries(userFilters)) {
      if (value === undefined || value === null || value === '') continue;

      const mapping = allowedMap[key];
      if (!mapping) continue; // Ignore non-whitelisted filters

      const targetField = mapping.field || key;
      const type = mapping.type || 'exact';

      switch (type) {
        case 'exact':
          query[targetField] = this._castValue(value, mapping.cast);
          break;

        case 'in':
        case 'array': {
          const list = Array.isArray(value)
            ? value
            : typeof value === 'string'
              ? value.split(',').map(s => s.trim()).filter(Boolean)
              : [value];
          if (list.length > 0) {
            query[targetField] = { $in: list.map(v => this._castValue(v, mapping.cast)) };
          }
          break;
        }

        case 'boolean':
          query[targetField] = String(value) === 'true' || value === true;
          break;

        case 'dateRange':
          // Handled separately below in dateRange config
          break;

        default:
          query[targetField] = value;
      }
    }

    // 2. Process Date Range Filters if configured
    if (filterConfig.dateRanges) {
      for (const [rangeKey, rangeConfig] of Object.entries(filterConfig.dateRanges)) {
        const startVal = userFilters[rangeConfig.startParam || 'startDate'] || userFilters.from;
        const endVal = userFilters[rangeConfig.endParam || 'endDate'] || userFilters.to;
        const targetField = rangeConfig.field || rangeKey;

        if (startVal || endVal) {
          query[targetField] = query[targetField] || {};
          if (startVal) {
            const start = new Date(startVal);
            if (!isNaN(start.getTime())) {
              start.setHours(0, 0, 0, 0);
              query[targetField].$gte = start;
            }
          }
          if (endVal) {
            const end = new Date(endVal);
            if (!isNaN(end.getTime())) {
              end.setHours(23, 59, 59, 999);
              query[targetField].$lte = end;
            }
          }
        }
      }
    }

    // 3. Apply Mandatory Security Scope with absolute precedence
    for (const [scopeKey, scopeVal] of Object.entries(securityScope)) {
      if (scopeVal !== undefined && scopeVal !== null) {
        query[scopeKey] = scopeVal;
      }
    }

    return query;
  }

  /**
   * Safely casts string values into proper MongoDB types (ObjectId, Number, etc.)
   */
  static _castValue(value, castType) {
    if (castType === 'objectId') {
      try {
        if (value instanceof mongoose.Types.ObjectId) return value;
        if (typeof value === 'string' && mongoose.isValidObjectId(value)) {
          return new mongoose.Types.ObjectId(value);
        }
        return value;
      } catch {
        return value;
      }
    }
    if (castType === 'number') {
      const num = Number(value);
      return !isNaN(num) ? num : value;
    }
    if (castType === 'boolean') {
      return String(value) === 'true';
    }
    return value;
  }
}

module.exports = FilterStrategy;
