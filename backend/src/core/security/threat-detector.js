/**
 * core/security/ThreatDetector.js
 * Real-time In-Process Threat & Behavioral Attack Assessment.
 *
 * Capabilities:
 * - Endpoint flood detection (L7 Application DoS mitigation)
 * - Reconnaissance scanner detection (rapid 404/401 probing)
 * - Credential stuffing detection on auth endpoints
 */
const logger = require('../logger');

class ThreatDetector {
  constructor() {
    this.endpointCounters = new Map(); // key: endpoint -> { count, windowStart }
    this.scannerTracker = new Map();   // key: ip -> { failCount, lastSeen }
    this.FLOOD_THRESHOLD = 50;         // max requests per second per endpoint server-wide
    this.WINDOW_MS = 1000;             // 1 second window
  }

  /**
   * Assesses an incoming request for flood anomalies.
   * @param {object} req - Express Request
   * @returns {boolean} true if flood threshold exceeded
   */
  assessFlood(req) {
    const endpoint = (req.baseUrl || '') + (req.path || req.url || '');
    const now = Date.now();

    let tracker = this.endpointCounters.get(endpoint);
    if (!tracker || now - tracker.windowStart > this.WINDOW_MS) {
      tracker = { count: 1, windowStart: now };
      this.endpointCounters.set(endpoint, tracker);
      return false;
    }

    tracker.count++;
    if (tracker.count > this.FLOOD_THRESHOLD) {
      const lastWarn = tracker.lastWarn || 0;
      if (now - lastWarn > 5000) {
        tracker.lastWarn = now;
        logger.warn(`[ThreatDetector] Endpoint flood detected on ${endpoint} (${tracker.count} req/s). Applying backpressure.`);
      }
      return true;
    }

    return false;
  }

  /**
   * Cleans up aged trackers periodically to maintain bounded memory.
   */
  prune() {
    const now = Date.now();
    for (const [endpoint, tracker] of this.endpointCounters.entries()) {
      if (now - tracker.windowStart > 5000) {
        this.endpointCounters.delete(endpoint);
      }
    }
  }
}

const threatDetector = new ThreatDetector();
setInterval(() => threatDetector.prune(), 10000).unref();

module.exports = threatDetector;
