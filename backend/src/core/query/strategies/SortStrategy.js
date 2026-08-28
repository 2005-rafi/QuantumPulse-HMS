/**
 * SortStrategy
 * Translates and normalizes sort directives with strict whitelist validation and deterministic tie-breakers.
 *
 * Rules from docs/file.md:
 * - Every sortable field must be explicitly whitelisted in DomainQueryConfig.
 * - Deterministic ordering is guaranteed by automatically appending a unique tie-breaker (_id: -1 / 1).
 * - Client cannot force unindexed or arbitrary field sorts.
 */
class SortStrategy {
  /**
   * Builds a deterministic MongoDB sort object.
   * @param {string|null} requestedSortBy - Client requested sort field or shortcut
   * @param {string} requestedOrder - 'asc' | 'desc'
   * @param {object} sortConfig - Domain sort configuration
   * @returns {object} MongoDB sort descriptor (e.g. { createdAt: -1, _id: -1 })
   */
  static build(requestedSortBy, requestedOrder = 'desc', sortConfig = {}) {
    const allowed = sortConfig.allowedFields || {};
    const shortcuts = sortConfig.shortcuts || {};
    const defaultSort = sortConfig.defaultSort || { createdAt: -1, _id: -1 };
    const direction = requestedOrder === 'asc' ? 1 : -1;

    let sort = {};

    // 1. Check for named shortcut (e.g. 'newest', 'oldest', 'nameA-Z', 'priority')
    if (requestedSortBy && shortcuts[requestedSortBy]) {
      sort = { ...shortcuts[requestedSortBy] };
    }
    // 2. Check for whitelisted individual field
    else if (requestedSortBy && allowed[requestedSortBy]) {
      const fieldMapping = allowed[requestedSortBy];
      if (typeof fieldMapping === 'string') {
        sort[fieldMapping] = direction;
      } else if (typeof fieldMapping === 'object') {
        // Multi-field mapping (e.g. { firstName: 1, lastName: 1 })
        for (const [f, dir] of Object.entries(fieldMapping)) {
          sort[f] = dir === 'inherit' ? direction : dir;
        }
      }
    }
    // 3. Fallback to domain default sort
    else {
      sort = { ...defaultSort };
    }

    // 4. Inject deterministic unique tie-breaker if not already present
    if (!sort._id && !sort.id) {
      // Inherit the direction of the primary sort or default to -1
      const primaryDir = Object.values(sort)[0] || -1;
      sort._id = primaryDir === 1 ? 1 : -1;
    }

    return sort;
  }
}

module.exports = SortStrategy;
