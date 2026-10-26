/**
 * core/cache/CacheService.js
 * High-performance, In-Process Cache Service with Stampede (Thundering-Herd) Protection,
 * Namespace-Based Invalidation, and Clinical Security Policy Enforcement.
 *
 * Principles:
 * - OOP: Encapsulated CacheService singleton.
 * - SRP: Isolates cache storage, stampede suppression, and lifecycle eviction.
 * - DIP: Redis-swappable interface (get, set, del, delByPattern, wrap).
 */
const NodeCache = require('node-cache');
const logger = require('../logger');
const { CacheSecurityPolicy } = require('./cache-security-policy');

class CacheService {
  constructor(options = {}) {
    this.store = new NodeCache({
      stdTTL: options.stdTTL || 300, // 5 min default
      checkperiod: options.checkperiod || 60, // check for expired keys every 60s
      useClones: false, // Performance: avoid deep clone overhead
      maxKeys: options.maxKeys || 5000, // Strict memory bound (under 50MB)
    });

    // Logical Mutex / Stampede guard: maps cacheKey -> in-flight Promise
    this._pending = new Map();

    // Namespace tracking: maps prefix -> Set of full keys
    this._namespaces = new Map();

    // Listen to expiration events to maintain namespace registry
    this.store.on('expired', (key) => {
      this._removeFromNamespaces(key);
    });
    this.store.on('del', (key) => {
      this._removeFromNamespaces(key);
    });
  }

  /**
   * Internal helper to register a key across all its hierarchal namespace prefix buckets.
   * e.g., 'ref:departments:all' registers under 'ref:' and 'ref:departments:'
   */
  _registerNamespace(key) {
    const parts = key.split(':');
    let prefixAcc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      prefixAcc += parts[i] + ':';
      if (!this._namespaces.has(prefixAcc)) {
        this._namespaces.set(prefixAcc, new Set());
      }
      this._namespaces.get(prefixAcc).add(key);
    }
  }

  _removeFromNamespaces(key) {
    for (const [, keySet] of this._namespaces.entries()) {
      keySet.delete(key);
    }
  }

  /**
   * Retrieves an item from cache.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    return this.store.get(key) || null;
  }

  /**
   * Stores an item into cache with optional TTL.
   * Validates projection safety before storage.
   *
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds]
   */
  set(key, value, ttlSeconds) {
    try {
      CacheSecurityPolicy.assertDomainAllowed(key);
      CacheSecurityPolicy.assertProjectionSafe(key, value);

      const success = ttlSeconds !== undefined
        ? this.store.set(key, value, ttlSeconds)
        : this.store.set(key, value);

      if (success) {
        this._registerNamespace(key);
      }
      return success;
    } catch (err) {
      logger.warn(`[CacheService] set() rejected for key '${key}': ${err.message}`);
      return false;
    }
  }

  /**
   * Deletes a single key from cache.
   * @param {string} key
   */
  del(key) {
    this._removeFromNamespaces(key);
    return this.store.del(key);
  }

  /**
   * Deletes all keys matching a namespace prefix or pattern atomically.
   * e.g., 'ref:departments:' or 'ref:departments:*'
   *
   * @param {string} prefix
   * @returns {number} count of deleted keys
   */
  delByPattern(prefix) {
    let deletedCount = 0;
    const cleanPrefix = prefix.endsWith('*') ? prefix.slice(0, -1) : prefix;
    const prefixes = [
      cleanPrefix,
      cleanPrefix.startsWith('hms:') ? cleanPrefix.slice(4) : `hms:${cleanPrefix}`,
    ];

    // 1. Invalidate from tracked namespace bucket
    for (const p of prefixes) {
      if (this._namespaces.has(p)) {
        const keysToDelete = Array.from(this._namespaces.get(p));
        for (const key of keysToDelete) {
          if (this.store.del(key) > 0) {
            deletedCount++;
          }
          this._removeFromNamespaces(key);
        }
      }
    }

    // 2. Scan all active store keys for prefix/substring coverage
    const allKeys = this.store.keys();
    for (const key of allKeys) {
      if (prefixes.some(p => key.startsWith(p) || key.includes(p))) {
        if (this.store.del(key) > 0) {
          deletedCount++;
        }
        this._removeFromNamespaces(key);
      }
    }
    return deletedCount;
  }

  /**
   * Clears entire in-memory cache and namespace registry.
   */
  flushAll() {
    this._pending.clear();
    this._namespaces.clear();
    return this.store.flushAll();
  }

  /**
   * Wraps an asynchronous fetch function with cache lookup and stampede protection.
   * If 100 concurrent requests request the same cold key, exactly 1 DB execution occurs.
   *
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - TTL in seconds
   * @param {Function} fetchFn - () => Promise<any>
   * @param {object} [options] - { user, scope, bypassCache }
   * @returns {Promise<any>}
   */
  async wrap(key, ttlSeconds, fetchFn, options = {}) {
    if (options.bypassCache) {
      return fetchFn();
    }

    // Role-salt key if user is provided
    const effectiveKey = options.user
      ? CacheSecurityPolicy.saltKey(key, options.user, options.scope)
      : key;

    // 1. Check cache hit
    const cached = this.get(effectiveKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Check in-flight promise (Stampede / Thundering-Herd Guard)
    if (this._pending.has(effectiveKey)) {
      return this._pending.get(effectiveKey);
    }

    // 3. Cache Miss: Register in-flight promise
    const fetchPromise = (async () => {
      try {
        const freshData = await fetchFn();
        if (freshData !== null && freshData !== undefined) {
          this.set(effectiveKey, freshData, ttlSeconds);
        }
        return freshData;
      } finally {
        this._pending.delete(effectiveKey);
      }
    })();

    this._pending.set(effectiveKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Flushes all stored cache entries and pending requests.
   */
  flush() {
    this._pending.clear();
    this._namespaces.clear();
    this.store.flushAll();
    return true;
  }

  /**
   * Returns cache stats (hits, misses, keys count, memory, pending promises).
   */
  getStats() {
    const stats = this.store.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
      pendingPromises: this._pending.size,
      trackedNamespaces: this._namespaces.size,
    };
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
module.exports.CacheService = CacheService;
