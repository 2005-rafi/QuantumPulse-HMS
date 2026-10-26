/**
 * QueryContext
 * Encapsulates, sanitizes, and normalizes incoming query parameters.
 *
 * Responsibilities:
 * - Sanitizes raw input to prevent NoSQL operator injection ($where, $regex injection, etc.)
 * - Normalizes search terms, filter maps, sort directives, and pagination controls.
 * - Immutable once created.
 */
class QueryContext {
  constructor({
    q = '',
    filters = {},
    sortBy = null,
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    cursor = null,
    fields = null,
    securityScope = {},
    ...otherParams
  } = {}) {
    // 1. Sanitize & normalize search query
    this.q = typeof q === 'string' ? q.trim() : (typeof otherParams.search === 'string' ? otherParams.search.trim() : '');

    // 2. Combine explicit filters with any top-level filter parameters
    const mergedFilters = { ...otherParams, ...filters };
    delete mergedFilters.q;
    delete mergedFilters.search;
    delete mergedFilters.sortBy;
    delete mergedFilters.sort;
    delete mergedFilters.sortOrder;
    delete mergedFilters.order;
    delete mergedFilters.page;
    delete mergedFilters.limit;
    delete mergedFilters.cursor;
    delete mergedFilters.fields;

    this.filters = this._sanitizeFilters(mergedFilters);

    // 3. Security scope injected from trusted server-side authorization (may contain operators like $ne, $in)
    this.securityScope = securityScope && typeof securityScope === 'object' && !Array.isArray(securityScope) ? { ...securityScope } : {};

    // 4. Sort configuration
    this.sortBy = typeof sortBy === 'string' ? sortBy.trim() : (typeof otherParams.sort === 'string' ? otherParams.sort.trim() : null);
    const orderInput = sortOrder || otherParams.order;
    this.sortOrder = String(orderInput).toLowerCase() === 'asc' || String(orderInput) === '1' ? 'asc' : 'desc';

    // 5. Pagination configuration
    const pageInput = page !== undefined ? page : otherParams.page;
    const limitInput = limit !== undefined ? limit : otherParams.limit;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limitInput, 10) || 20));
    const parsedPage = Math.max(1, parseInt(pageInput, 10) || 1);
    this.limit = parsedLimit;
    this.page = parsedPage;
    this.cursor = typeof cursor === 'string' && cursor.trim() ? cursor.trim() : (typeof otherParams.cursor === 'string' ? otherParams.cursor.trim() : null);

    // 6. Projections
    const fieldsInput = fields !== null && fields !== undefined ? fields : otherParams.fields;
    this.fields = Array.isArray(fieldsInput)
      ? fieldsInput.map(f => String(f).trim()).filter(Boolean)
      : typeof fieldsInput === 'string'
        ? fieldsInput.split(',').map(f => f.trim()).filter(Boolean)
        : null;

    Object.freeze(this);
  }

  /**
   * Recursively strips keys starting with '$' to prevent MongoDB operator injection.
   */
  _sanitizeFilters(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return {};
    }

    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      // Reject dangerous mongo operators in keys
      if (key.startsWith('$')) continue;

      if (val !== undefined && val !== null && val !== '') {
        if (typeof val === 'string') {
          clean[key] = val.trim();
        } else if (Array.isArray(val)) {
          clean[key] = val.map(item => (typeof item === 'string' ? item.trim() : (item && typeof item.toString === 'function' ? item.toString() : item))).filter(i => i !== '' && i !== null && i !== undefined);
        } else if (val && (val._bsontype === 'ObjectId' || val._bsontype === 'ObjectID' || typeof val.toHexString === 'function' || val.constructor?.name === 'ObjectId')) {
          clean[key] = val.toString();
        } else if (val instanceof Date || val instanceof RegExp) {
          clean[key] = val;
        } else if (typeof val === 'object') {
          clean[key] = this._sanitizeFilters(val);
        } else {
          clean[key] = val;
        }
      }
    }
    return clean;
  }

  /**
   * Factory from Express Request
   */
  static fromRequest(req, securityScope = {}) {
    const query = req.query || {};
    const filters = { ...query };

    // Extract framework reserved query parameters
    const q = filters.q || filters.search || '';
    const sortBy = filters.sortBy || filters.sort || null;
    const sortOrder = filters.sortOrder || filters.order || (filters.sortBy?.endsWith('_asc') ? 'asc' : 'desc');
    const page = filters.page;
    const limit = filters.limit;
    const cursor = filters.cursor;
    const fields = filters.fields;

    // Remove framework reserved parameters from general filters object
    delete filters.q;
    delete filters.search;
    delete filters.sortBy;
    delete filters.sort;
    delete filters.sortOrder;
    delete filters.order;
    delete filters.page;
    delete filters.limit;
    delete filters.cursor;
    delete filters.fields;

    return new QueryContext({
      q,
      filters,
      sortBy,
      sortOrder,
      page,
      limit,
      cursor,
      fields,
      securityScope,
    });
  }
}

module.exports = QueryContext;
