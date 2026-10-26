/**
 * core/database/sequence.service.js
 * Atomic zero-collision sequence generator for clinical identifiers across the HMS.
 * Uses MongoDB atomic $inc on the Counter collection to guarantee strict sequential integrity
 * under high concurrency (eliminating Math.random collisions and TOCTTOU races).
 *
 * Unified Enterprise MRN Specification:
 * - Structure: [HOSPITAL_CODE]-[YY]-[7_DIGIT_SEQ]-[LUHN_CHECK_DIGIT]
 *   Example: QPO-26-0000042-2
 * - Concurrency: Atomic MongoDB $inc with session support.
 * - Capacity: 10,000,000 (100 Lakhs / 1 Crore) patients per sequence cycle.
 * - Barcode Optimization: Ultra-compact (13 chars payload / ~1.1 inches in Code 128 Set C).
 * - Safety: ISO/IEC 7812 Luhn Checksum eliminates typos and transposition errors.
 */
const Counter = require('./counter.model');
const config = require('../config');

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
   * Calculates ISO/IEC 7812 Luhn Checksum check-digit for a numeric payload.
   *
   * @param {string} numericString - Pure numeric digit string
   * @returns {number} Calculated single check digit (0-9)
   */
  calculateLuhnChecksum(numericString) {
    const digits = String(numericString).replace(/\D/g, '');
    let sum = 0;
    let alternate = true;

    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Validates whether a full MRN string has a mathematically sound Luhn check digit.
   *
   * @param {string} mrnString - Formatted or raw MRN
   * @returns {boolean} True if checksum is valid
   */
  validateLuhnChecksum(mrnString) {
    if (!mrnString || typeof mrnString !== 'string') return false;
    const digitsOnly = mrnString.replace(/\D/g, '');
    if (digitsOnly.length < 8) return false;

    let sum = 0;
    let alternate = false;

    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let n = parseInt(digitsOnly[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  }

  /**
   * Formats a raw numeric sequence into an authoritative Unified Enterprise MRN.
   * Format: [HOSPITAL_CODE]-[YY]-[7_DIGIT_SEQ]-[LUHN_CHECK_DIGIT]
   * Example: QPO-26-0000042-2
   *
   * @param {number} seqNumber - Sequential counter value
   * @param {number|Date} [date] - Registration date reference
   * @param {string} [prefix] - Hospital code override
   * @returns {string} Formatted Unified MRN
   */
  formatUnifiedMRN(seqNumber, date = new Date(), prefix = null) {
    const hospitalPrefix = (prefix || config.hospitalCode || process.env.HOSPITAL_CODE || 'QPO').toUpperCase();
    const d = date instanceof Date ? date : new Date(date);
    const yy = String(d.getFullYear()).slice(-2);
    const seqPadded = String(seqNumber).padStart(7, '0');
    const numericBody = `${yy}${seqPadded}`;
    const checkDigit = this.calculateLuhnChecksum(numericBody);

    return `${hospitalPrefix}-${yy}-${seqPadded}-${checkDigit}`;
  }

  /**
   * Generates the next sequential Unified Enterprise MRN for patient registration.
   * Guarantees atomic zero-collision concurrency across thousands of registrations per day.
   *
   * @param {import('mongoose').ClientSession|null} session - Active Mongoose transaction session
   * @returns {Promise<string>} Unified MRN string (e.g. QPO-26-0000015-4)
   */
  async getNextPatientMRN(session = null) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'mrn' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, ...(session ? { session } : {}) }
    );

    return this.formatUnifiedMRN(counter.seq, new Date());
  }

  /**
   * Parses and inspects an MRN string into structured component metadata.
   * Supports both new Unified MRNs and legacy format inspection.
   *
   * @param {string} mrn
   * @returns {object} Parsed MRN inspection result
   */
  parseMRN(mrn) {
    if (!mrn || typeof mrn !== 'string') {
      return { isValid: false, isUnified: false, raw: mrn };
    }

    const clean = mrn.trim().toUpperCase();
    const unifiedMatch = clean.match(/^([A-Z]{2,6})-(\d{2})-(\d{7})-(\d)$/);

    if (unifiedMatch) {
      const [, hospitalCode, year, sequenceStr, checkDigitStr] = unifiedMatch;
      const numericBody = `${year}${sequenceStr}`;
      const expectedCheck = this.calculateLuhnChecksum(numericBody);
      const isChecksumValid = parseInt(checkDigitStr, 10) === expectedCheck;

      return {
        isValid: isChecksumValid,
        isUnified: true,
        hospitalCode,
        year: `20${year}`,
        sequence: parseInt(sequenceStr, 10),
        checkDigit: parseInt(checkDigitStr, 10),
        barcodePayload: `${hospitalCode}${year}${sequenceStr}${checkDigitStr}`,
        formatted: clean,
      };
    }

    // Legacy format fallback
    return {
      isValid: true,
      isUnified: false,
      isLegacy: true,
      formatted: clean,
      barcodePayload: clean.replace(/-/g, ''),
    };
  }
}

module.exports = new SequenceService();
