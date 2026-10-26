/**
 * utils/clinicalText.js
 * Comprehensive clinical text formatting and sanitization utilities.
 * Handles HTML entity decoding (fixing &amp; double-escaping), marquee overflows,
 * and clean display labels for hospital infrastructure and clinical metadata.
 */

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const HTML_ENTITY_REGEX = /&(?:amp|lt|gt|quot|#x27|#39|apos|nbsp);/g;

/**
 * Decode HTML entities and clean extra whitespace from clinical strings.
 * @param {string|any} text
 * @returns {string}
 */
export const cleanClinicalText = (text) => {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return String(text);

  // Recursively decode in case of multi-level escaping (e.g. &amp;amp;)
  let decoded = text;
  let prev = '';
  let iterations = 0;
  while (decoded !== prev && iterations < 3) {
    prev = decoded;
    decoded = decoded.replace(HTML_ENTITY_REGEX, (match) => HTML_ENTITY_MAP[match] || match);
    iterations++;
  }

  return decoded.trim();
};

/**
 * Truncate long clinical string with ellipsis if it exceeds maxLength.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateClinicalText = (text, maxLength = 32) => {
  const clean = cleanClinicalText(text);
  if (!clean || clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
};

/**
 * Format room label with clean formatting.
 * @param {string} roomNumber
 * @param {string} roomName
 * @returns {string}
 */
export const formatRoomLabel = (roomNumber, roomName) => {
  const cleanNum = cleanClinicalText(roomNumber);
  const cleanNm = cleanClinicalText(roomName);
  if (!cleanNm) return cleanNum;
  return `${cleanNum} — ${cleanNm}`;
};

export default {
  cleanClinicalText,
  truncateClinicalText,
  formatRoomLabel,
};
