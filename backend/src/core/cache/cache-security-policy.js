/**
 * core/cache/CacheSecurityPolicy.js
 * Security enforcement rules for HMS In-Process Cache.
 *
 * Principles:
 * - SRP: Isolates cache security policy, role-salting, and PHI assertions.
 * - HIPAA/DPDP: Enforces strict exclusion of Protected Health Information from memory caches.
 */
const crypto = require('crypto');

class CacheSecurityViolationError extends Error {
  constructor(message) {
    super(`[CacheSecurityPolicy] ${message}`);
    this.name = 'CacheSecurityViolationError';
  }
}

class CacheSecurityPolicy {
  /**
   * Domain prefixes that must NEVER be stored in shared memory cache.
   */
  static PHI_BLOCKED_DOMAINS = [
    'patient:profile',
    'patient:record',
    'clinical:consultation',
    'clinical:vitals',
    'clinical:notes',
    'pharmacy:prescription',
    'laboratory:result',
    'billing:invoice',
    'diagnosis:',
  ];

  /**
   * Explicitly forbidden field keys in cached objects.
   */
  static FORBIDDEN_PHI_FIELDS = new Set([
    'aadhaar',
    'aadhaarencrypted',
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
    'medicalhistory',
    'diagnosisnotes',
    'ssn',
    'creditcard',
    'cardnumber',
    'cvv',
    'pin',
  ]);

  /**
   * Salts a cache key with the actor's role and optional department/ward scope.
   * Format: {tenantId}:{baseKey}::ROLE:{role}[::SCOPE:{scopeHash}]
   *
   * @param {string} baseKey - Base resource key (e.g., 'ref:staff:all')
   * @param {object|string} userOrRole - User object or role string
   * @param {string} [scope] - Optional scope (e.g. departmentId)
   * @returns {string} Salted key
   */
  static saltKey(baseKey, userOrRole, scope = null) {
    this.assertDomainAllowed(baseKey);

    const role = typeof userOrRole === 'string'
      ? userOrRole
      : userOrRole?.role || 'PUBLIC';

    let salted = `hms:${baseKey}::ROLE:${role}`;

    const rawScope = scope || (typeof userOrRole === 'object' ? userOrRole?.departmentId : null);
    if (rawScope) {
      const scopeHash = crypto.createHash('sha256').update(String(rawScope)).digest('hex').substring(0, 8);
      salted += `::SCOPE:${scopeHash}`;
    }

    return salted;
  }

  /**
   * Asserts that a key does not violate PHI caching bans.
   * @param {string} key
   */
  static assertDomainAllowed(key) {
    const lower = key.toLowerCase();
    for (const blocked of this.PHI_BLOCKED_DOMAINS) {
      if (lower.startsWith(blocked) || lower.includes(blocked)) {
        throw new CacheSecurityViolationError(
          `Security violation: Attempted to cache restricted clinical domain '${blocked}'. Clinical PHI must never be stored in shared memory cache.`
        );
      }
    }
  }

  /**
   * Asserts that data to be cached does not contain forbidden sensitive fields.
   * @param {string} key
   * @param {any} data
   */
  static assertProjectionSafe(key, data) {
    if (!data || typeof data !== 'object') return;

    const checkItem = (item) => {
      if (!item || typeof item !== 'object') return;
      for (const prop of Object.keys(item)) {
        if (this.FORBIDDEN_PHI_FIELDS.has(prop.toLowerCase())) {
          throw new CacheSecurityViolationError(
            `Security violation on key '${key}': Payload contains forbidden sensitive field '${prop}'. Use role-bound projections before caching.`
          );
        }
      }
    };

    if (Array.isArray(data)) {
      data.slice(0, 10).forEach(checkItem); // Sample inspection for arrays
    } else {
      checkItem(data);
    }
  }
}

module.exports = {
  CacheSecurityPolicy,
  CacheSecurityViolationError,
};
