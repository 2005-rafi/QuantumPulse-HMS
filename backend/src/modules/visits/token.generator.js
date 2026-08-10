const TokenCounter = require('./token.counter.model');
const AppError = require('../../core/errors/AppError');

/**
 * Static department code map.
 * Resolution priority:
 *   1. department.code field (from DB — future-proof)
 *   2. This static map (covers all seeded departments)
 *   3. First-4-chars fallback (handles any new custom departments)
 */
const DEPT_CODE_MAP = {
  'General Medicine':   'GEN',
  'Cardiology':         'CARD',
  'Neurology':          'NEURO',
  'Orthopedics':        'ORTH',
  'Laboratory':         'LAB',
  'Pharmacy':           'PHARM',
  'Administration':     'ADMIN',
  'Nursing':            'NURS',
  'Pediatrics':         'PED',
  'Dermatology':        'DERM',
  'Gynecology':         'GYN',
  'Ophthalmology':      'OPTH',
  'ENT':                'ENT',
  'Radiology':          'RAD',
  'Psychiatry':         'PSYC',
};

/**
 * Resolve short department code from a Department mongoose document.
 * @param {Object|null} department - { _id, name, code? }
 * @returns {string}
 */
const resolveDeptCode = (department) => {
  if (!department) return 'GEN';
  if (department.code) return department.code.toUpperCase().trim().slice(0, 5);
  if (DEPT_CODE_MAP[department.name]) return DEPT_CODE_MAP[department.name];
  // Fallback: strip spaces, take first 4 uppercase chars
  return (department.name || 'GEN').replace(/\s+/g, '').toUpperCase().slice(0, 4) || 'GEN';
};

/**
 * Get start-of-day date (midnight local time).
 * Using local time ensures tokens reset at midnight for the hospital's timezone,
 * not at UTC midnight (which may differ by hours in India IST UTC+5:30).
 * @returns {Date}
 */
const getTodayStart = () => {
  const targetTimezone = 'Asia/Kolkata';
  const localDateStr = new Date().toLocaleDateString('en-CA', { timeZone: targetTimezone }); // YYYY-MM-DD
  const [year, month, day] = localDateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * TokenGenerator — Atomic, daily-resetting, department-prefixed token service.
 *
 * Generates tokens in the format: DEPT-XXX (e.g., CARD-014, GEN-001).
 * Serial resets to 001 every day per department.
 * Atomic under concurrent requests via MongoDB $inc + upsert.
 *
 * SOLID:
 *   SRP — Only generates tokens; never touches Visit documents.
 *   OCP — New departments handled via DEPT_CODE_MAP or department.code field.
 *   DIP — Depends on TokenCounter model abstraction, not raw MongoDB.
 */
class TokenGenerator {
  /**
   * Generate a unique token for a visit.
   * @param {Object|null} department - Populated Department document { _id, name, code? }
   *                                   Pass null for walk-in with no department.
   * @param {import('mongoose').ClientSession|null} session - Transaction session
   * @returns {Promise<{ tokenString: string, tokenSerial: number }>}
   */
  async generate(department, session = null) {
    const code = resolveDeptCode(department);
    const departmentId = department?._id ?? null;
    return this._atomicIncrement(departmentId, code, session);
  }

  /**
   * Atomically increment the counter for (departmentId, today) and return new serial.
   * findOneAndUpdate with upsert creates the counter doc on first use for each day.
   * @private
   */
  async _atomicIncrement(departmentId, code, session) {
    const today = getTodayStart();

    const updateOptions = {
      returnDocument: 'after',
      upsert: true,
      ...(session ? { session } : {}),
    };

    const counter = await TokenCounter.findOneAndUpdate(
      { departmentId, date: today },
      { $inc: { count: 1 } },
      updateOptions
    );

    if (!counter) {
      throw new AppError('TOKEN_GEN_FAILED', 'Failed to generate visit token. Counter unavailable.');
    }

    const serial = counter.count;
    const paddedSerial = String(serial).padStart(3, '0');
    const tokenString = `${code}-${paddedSerial}`;

    return { tokenString, tokenSerial: serial };
  }
}

module.exports = new TokenGenerator();
