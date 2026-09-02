const mongoose = require('mongoose');
const config = require('../../config');

/**
 * PaginationStrategy
 * Implements both scalable Offset and Keyset Cursor pagination.
 *
 * Principles from docs/file.md:
 * - Offset pagination is used for shallow navigational tables.
 * - Cursor pagination is used for deep/infinite feeds and high-volume audit/event collections (O(log N + K)).
 * - Cursor tokens are opaque Base64 encoded JSON tuples [sortVal, _id].
 */
class PaginationStrategy {
  /**
   * Encodes a cursor from the last item of a page.
   * @param {object} lastItem - Document
   * @param {string} sortKey - Field used for sorting (e.g. 'timestamp', 'createdAt')
   * @returns {string} Opaque base64 cursor token
   */
  static encodeCursor(lastItem, sortKey = 'createdAt') {
    if (!lastItem || !lastItem._id) return null;
    const sortVal = lastItem[sortKey] instanceof Date
      ? lastItem[sortKey].toISOString()
      : lastItem[sortKey];
    const payload = JSON.stringify([sortVal, String(lastItem._id)]);
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Decodes an opaque cursor token.
   * @param {string} cursorStr - Base64 cursor token
   * @returns {[any, string]|null} [sortVal, id]
   */
  static decodeCursor(cursorStr) {
    if (!cursorStr || typeof cursorStr !== 'string') return null;
    try {
      const json = Buffer.from(cursorStr, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Builds cursor keyset comparison predicate.
   * @param {string} cursorStr - Base64 cursor token
   * @param {object} sortObj - Compiled sort object (e.g. { timestamp: -1, _id: -1 })
   * @returns {object|null} MongoDB filter predicate
   */
  static buildCursorFilter(cursorStr, sortObj = {}) {
    const decoded = this.decodeCursor(cursorStr);
    if (!decoded) return null;

    const [rawSortVal, idStr] = decoded;
    const sortField = Object.keys(sortObj)[0] || 'createdAt';
    const direction = sortObj[sortField] || -1;
    const isDesc = direction === -1;

    let sortVal = rawSortVal;
    if (typeof rawSortVal === 'string' && !isNaN(Date.parse(rawSortVal))) {
      sortVal = new Date(rawSortVal);
    }

    const idVal = mongoose.isValidObjectId(idStr) ? new mongoose.Types.ObjectId(idStr) : idStr;

    const compOp = isDesc ? '$lt' : '$gt';

    // Compound keyset filter: (field < sortVal) OR (field == sortVal AND _id < idVal)
    if (sortField === '_id') {
      return { _id: { [compOp]: idVal } };
    }

    return {
      $or: [
        { [sortField]: { [compOp]: sortVal } },
        { [sortField]: sortVal, _id: { [compOp]: idVal } },
      ],
    };
  }

  /**
   * Calculates standard offset pagination parameters.
   * @param {number} page
   * @param {number} limit
   * @returns {{ skip: number, limit: number }}
   */
  static buildOffset(page = 1, limit = null) {
    const defaultLimit = config.query?.defaultLimit || 20;
    const maxLimit = config.query?.maxLimit || 100;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(maxLimit, parseInt(limit, 10) || defaultLimit));
    return {
      skip: (p - 1) * l,
      limit: l,
    };
  }
}

module.exports = PaginationStrategy;
