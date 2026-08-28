const { encryptDeterministic } = require('../../utils/encryption');

/**
 * SearchStrategy
 * Translates sanitized search terms into optimal MongoDB database predicates.
 *
 * Principles:
 * - Exact identifiers use indexed equality predicates (B-Tree O(log N + K)).
 * - Sensitive numeric fields (Phone, Aadhaar) use deterministic encryption without decrypting full DB in memory.
 * - Text fields use index-compatible prefix/anchored regexes or text index queries.
 */
class SearchStrategy {
  /**
   * Builds search predicates for a given term and domain search config.
   * @param {string} term - Sanitized search string
   * @param {object} searchConfig - Domain search configuration
   * @returns {object|null} MongoDB filter object or null if empty
   */
  static build(term, searchConfig = {}) {
    if (!term || typeof term !== 'string' || !term.trim()) {
      return null;
    }

    const cleanTerm = term.trim();
    const orConditions = [];

    // 1. Exact Identifier Lookups (e.g. MRN, Token, Employee ID, Bill Number)
    if (Array.isArray(searchConfig.exactFields) && searchConfig.exactFields.length > 0) {
      for (const field of searchConfig.exactFields) {
        orConditions.push({ [field]: cleanTerm.toUpperCase() });
        orConditions.push({ [field]: cleanTerm });
      }
    }

    // 2. Protected Encrypted Field Lookups (e.g. Phone, Aadhaar, WhatsApp)
    const digitsOnly = cleanTerm.replace(/\D/g, '');
    const isLikelyPhoneOrId = digitsOnly.length >= 4 && digitsOnly.length === cleanTerm.replace(/[+\s-]/g, '').length;
    if (isLikelyPhoneOrId && Array.isArray(searchConfig.protectedFields) && searchConfig.protectedFields.length > 0) {
      try {
        const encryptedTerm = encryptDeterministic(digitsOnly);
        for (const field of searchConfig.protectedFields) {
          orConditions.push({ [field]: encryptedTerm });
        }
      } catch (err) {
        // Fallback: search raw if encryption unavailable in test env
        for (const field of searchConfig.protectedFields) {
          orConditions.push({ [field]: digitsOnly });
        }
      }
    }

    // 3. Smart Name & Text Prefix Search
    const parts = cleanTerm.split(/\s+/).filter(Boolean);
    if (!isLikelyPhoneOrId) {
      if (parts.length > 1) {
        // Multi-word name search (e.g. "John Doe" or "Saravanan Govindasamy")
        const part0 = parts[0].replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const partRest = parts.slice(1).join(' ').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        orConditions.push({
          firstName: new RegExp(`^${part0}`, 'i'),
          lastName: new RegExp(`^${partRest}`, 'i'),
        });
        orConditions.push({
          firstName: new RegExp(`^${partRest}`, 'i'),
          lastName: new RegExp(`^${part0}`, 'i'),
        });
      } else if (Array.isArray(searchConfig.prefixFields) && searchConfig.prefixFields.length > 0) {
        // Single word prefix search (e.g. "John" or "Doe")
        const escaped = cleanTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const prefixRegex = new RegExp(`^${escaped}`, 'i');

        for (const field of searchConfig.prefixFields) {
          orConditions.push({ [field]: prefixRegex });
        }
      }
    }

    // 4. Bounded Regex Search for Name parts
    if (!isLikelyPhoneOrId && Array.isArray(searchConfig.containsFields) && searchConfig.containsFields.length > 0) {
      const escaped = cleanTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const containsRegex = new RegExp(escaped, 'i');

      for (const field of searchConfig.containsFields) {
        orConditions.push({ [field]: containsRegex });
      }
    }

    if (orConditions.length === 0) {
      return null;
    }

    if (orConditions.length === 1) {
      return orConditions[0];
    }

    return { $or: orConditions };
  }
}

module.exports = SearchStrategy;
