/**
 * core/database/sequence.service.js
 * Atomic zero-collision sequence generator for clinical identifiers across the HMS.
 * Uses MongoDB atomic $inc on the Counter collection to guarantee strict sequential integrity
 * under high concurrency (eliminating Math.random collisions and TOCTTOU races).
 */
const Counter = require('./counter.model');

class SequenceService {
  /**
   * Generates a date-scoped sequential identifier: {PREFIX}-{YYYYMMDD}-{XXXX}
   * Example: APT-20260901-0001, VST-20260901-0014, ADM-20260901-0003
   *
   * @param {string} sequenceKey - Unique domain key (e.g. 'appointment', 'visit', 'admission', 'invoice')
   * @param {string} prefix - Human-readable clinical prefix (e.g. 'APT', 'VST', 'ADM', 'INV')
   * @param {import('mongoose').ClientSession|null} session - Active Mongoose transaction session
   * @param {number} padLength - Number of digits to pad (default: 4)
   * @returns {Promise<string>} Sequential formatted identifier
   */
  async getNextSequence(sequenceKey, prefix, session = null, padLength = 4) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const counterId = `${sequenceKey}_${dateStr}`;

    const updateOptions = {
      returnDocument: 'after',
      upsert: true,
      ...(session ? { session } : {}),
    };

    const counter = await Counter.findOneAndUpdate(
      { id: counterId },
      { $inc: { seq: 1 } },
      updateOptions
    );

    const paddedSeq = String(counter.seq).padStart(padLength, '0');
    return `${prefix}-${dateStr}-${paddedSeq}`;
  }

  /**
   * Generates a lifetime sequential identifier (e.g. for Patient MRN: PT-YYYYMMDD-HHMM-000042)
   *
   * @param {import('mongoose').ClientSession|null} session - Active Mongoose transaction session
   * @returns {Promise<string>} Sequential MRN string
   */
  async getNextPatientMRN(session = null) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'mrn' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, ...(session ? { session } : {}) }
    );

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    return `PT-${y}${m}${d}-${hh}${mm}-${String(counter.seq).padStart(6, '0')}`;
  }
}

module.exports = new SequenceService();
