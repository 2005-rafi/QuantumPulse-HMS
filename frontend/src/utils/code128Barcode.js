/**
 * frontend/src/utils/code128Barcode.js
 * High-performance, zero-dependency ISO/IEC 15417 Code 128 Barcode & Luhn Checksum Engine.
 *
 * Capabilities:
 * - Generates crisp, scalable vector SVG barcodes for patient wristbands, ID cards, and lab tubes.
 * - Dynamic Subset B & C encoding for maximum symbol density.
 * - Full ISO/IEC 7812 Luhn Checksum calculation and validation for clinical MRN numbers.
 * - Single-path SVG rendering for optimal DOM performance and sub-millisecond print spooling.
 */

// ISO/IEC 15417 Bar/Space width definitions (0 to 106).
// Each 6-character string defines widths of: Bar1, Space1, Bar2, Space2, Bar3, Space3 (total = 11 modules).
// Stop symbol 106 has 7 widths: Bar1, Space1, Bar2, Space2, Bar3, Space3, Bar4 (total = 13 modules).
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (Stop)
];

const CODE_B_START = 104;
const CODE_C_START = 105;
const CODE_TO_C = 99;
const CODE_TO_B = 100;
const STOP_CODE = 106;

/**
 * Encodes input text into Code 128 symbol values with auto B/C compression.
 * @param {string} text - Raw alphanumeric string (e.g. 'QPO-26-0000042-8')
 * @returns {number[]} Array of symbol values (0-106)
 */
export function encodeCode128Symbols(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const clean = text.trim();
  if (clean.length === 0) return [];

  const codes = [];
  let currentSet = null;
  let i = 0;

  function countConsecutiveDigits(str, startIdx) {
    let count = 0;
    while (startIdx + count < str.length && /\d/.test(str[startIdx + count])) {
      count++;
    }
    return count;
  }

  // Determine starting code set: if begins with 4+ digits, start in Code C
  const initialDigits = countConsecutiveDigits(clean, 0);
  if (initialDigits >= 4) {
    currentSet = 'C';
    codes.push(CODE_C_START);
  } else {
    currentSet = 'B';
    codes.push(CODE_B_START);
  }

  while (i < clean.length) {
    if (currentSet === 'B') {
      const remainingDigits = countConsecutiveDigits(clean, i);
      // Switch to Code C if 4 or more digits remain
      if (remainingDigits >= 4) {
        codes.push(CODE_TO_C);
        currentSet = 'C';
        continue;
      }
      const charCode = clean.charCodeAt(i) - 32;
      if (charCode < 0 || charCode > 95) {
        // Fallback for non-ASCII: replace with '?' (char code 63 - 32 = 31)
        codes.push(31);
      } else {
        codes.push(charCode);
      }
      i++;
    } else if (currentSet === 'C') {
      const remainingDigits = countConsecutiveDigits(clean, i);
      if (remainingDigits >= 2) {
        const pair = parseInt(clean.slice(i, i + 2), 10);
        codes.push(pair);
        i += 2;
      } else {
        // Not enough digits for a pair, switch back to Code B
        codes.push(CODE_TO_B);
        currentSet = 'B';
      }
    }
  }

  // Calculate Checksum Modulo 103
  let checksumSum = codes[0];
  for (let idx = 1; idx < codes.length; idx++) {
    checksumSum += idx * codes[idx];
  }
  codes.push(checksumSum % 103);
  codes.push(STOP_CODE);

  return codes;
}

/**
 * Computes SVG bar layout and path data for a given text.
 * @param {string} text - Text to encode
 * @param {object} [options]
 * @param {number} [options.quietZone=10] - Quiet zone margin in modules
 * @param {number} [options.height=40] - Bar height in SVG units
 * @returns {{ pathData: string, totalWidth: number, height: number, barsCount: number }}
 */
export function generateCode128SvgData(text, options = {}) {
  const { quietZone = 10, height = 40 } = options;
  const symbols = encodeCode128Symbols(text);

  if (symbols.length === 0) {
    return { pathData: '', totalWidth: 100, height, barsCount: 0 };
  }

  let x = quietZone;
  let pathCommands = [];
  let barsCount = 0;

  for (const symbolCode of symbols) {
    const pattern = CODE128_PATTERNS[symbolCode];
    if (!pattern) continue;

    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const moduleWidth = parseInt(pattern[p], 10);
      if (isBar) {
        pathCommands.push(`M${x},0h${moduleWidth}v${height}h-${moduleWidth}Z`);
        barsCount++;
      }
      x += moduleWidth;
      isBar = !isBar;
    }
  }

  const totalWidth = x + quietZone;
  return {
    pathData: pathCommands.join(' '),
    totalWidth,
    height,
    barsCount
  };
}

/**
 * Generates an ISO/IEC 7812 Mod-10 Luhn Checksum for a numeric string.
 * @param {string} numericString
 * @returns {number} Check digit (0-9)
 */
export function calculateLuhnChecksum(numericString) {
  const digits = String(numericString || '').replace(/\D/g, '');
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
 * Validates a formatted or unhyphenated MRN string against its Luhn check digit.
 * @param {string} mrnString
 * @returns {boolean} True if checksum matches
 */
export function validateLuhnChecksum(mrnString) {
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
 * Parses and validates an MRN string into structured components.
 * @param {string} mrn
 * @returns {{ isValid: boolean, isUnified: boolean, hospitalCode?: string, year?: string, sequence?: number, checkDigit?: number, barcodePayload: string, formatted: string }}
 */
export function parseMRN(mrn) {
  if (!mrn || typeof mrn !== 'string') {
    return { isValid: false, isUnified: false, barcodePayload: '', formatted: '' };
  }

  const clean = mrn.trim().toUpperCase();
  const unifiedMatch = clean.match(/^([A-Z]{2,6})-(\d{2})-(\d{7})-(\d)$/);

  if (unifiedMatch) {
    const [, hospitalCode, year, sequenceStr, checkDigitStr] = unifiedMatch;
    const numericBody = `${year}${sequenceStr}`;
    const expectedCheck = calculateLuhnChecksum(numericBody);
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

  // Legacy or unhyphenated fallback
  return {
    isValid: true,
    isUnified: false,
    barcodePayload: clean.replace(/-/g, ''),
    formatted: clean,
  };
}

/**
 * Formats an MRN for high-visibility UI presentation.
 * @param {string} mrn
 * @returns {string}
 */
export function formatMRNDisplay(mrn) {
  if (!mrn) return 'MRN-PENDING';
  return String(mrn).trim().toUpperCase();
}
