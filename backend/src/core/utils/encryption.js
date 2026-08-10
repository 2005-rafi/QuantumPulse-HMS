const crypto = require('crypto');

// The encryption key must be exactly 32 bytes for aes-256-cbc.
// Falls back to a default development key if ENCRYPTION_KEY is not defined.
const rawKey = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const ENCRYPTION_KEY = Buffer.from(rawKey.substring(0, 32), 'utf8');
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a string value using randomized AES-256-CBC (generates unique IV per call).
 * Best for text blocks or fields that do not need exact-match querying (e.g. addresses, notes).
 * Output format: 'iv_hex:encrypted_hex'
 */
const encryptRandom = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts a value encrypted via encryptRandom or encryptDeterministic.
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // Return as-is if the field is not in encrypted format (allows compatibility with unencrypted migration data)
      return encryptedText;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning raw value:', err.message);
    return encryptedText;
  }
};

/**
 * Encrypts a value using deterministic AES-256-CBC (uses static IV derived from the value or a salt).
 * Allows index lookups and exact matches (e.g., query Patient.findOne({ phone: encryptDeterministic('9876543210') })).
 * Output format: 'static_iv:encrypted_hex'
 */
const encryptDeterministic = (text) => {
  if (!text) return text;
  // Use a static IV for deterministic encryption so identical values produce identical ciphertexts
  // To protect static IV, we derive it using HMAC-SHA256 of the text with a salt
  const staticIv = crypto
    .createHmac('sha256', ENCRYPTION_KEY)
    .update(text)
    .digest()
    .subarray(0, 16);

  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, staticIv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${staticIv.toString('hex')}:${encrypted}`;
};

module.exports = {
  encryptRandom,
  encryptDeterministic,
  decrypt,
};
