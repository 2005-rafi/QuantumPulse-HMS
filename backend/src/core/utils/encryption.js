const crypto = require('crypto');

// The encryption key must be exactly 32 bytes for aes-256-cbc.
const resolveEncryptionKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('CRITICAL_SECURITY_ERROR: ENCRYPTION_KEY environment variable is required and cannot be empty.');
  }

  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  const keyBuffer = Buffer.from(rawKey, 'utf8');
  if (keyBuffer.length !== 32) {
    throw new Error(`CRITICAL_SECURITY_ERROR: ENCRYPTION_KEY must be exactly 32 bytes (or 64-char hex). Current byte length: ${keyBuffer.length}`);
  }
  return keyBuffer;
};

const ENCRYPTION_KEY = resolveEncryptionKey();
const GCM_ALGORITHM = 'aes-256-gcm';
const CBC_ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a string value using randomized AES-256-GCM (generates unique 12-byte IV per call).
 * Provides authenticated encryption (both confidentiality and integrity).
 * Output format: 'iv_hex:authTag_hex:encrypted_hex'
 */
const encryptRandom = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts a value encrypted via encryptRandom (GCM or legacy CBC) or encryptDeterministic.
 * Returns null if corrupted/tampered rather than returning raw ciphertext.
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    
    // 3-part format: AES-256-GCM ('iv_hex:authTag_hex:encrypted_hex')
    if (parts.length === 3) {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // 2-part format: AES-256-CBC legacy/deterministic ('iv_hex:encrypted_hex')
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(CBC_ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // Return as-is if the field is not in encrypted format (unencrypted legacy records)
    return encryptedText;
  } catch (err) {
    console.error('CRITICAL: Decryption failed for field. Ciphertext withheld for security.', err.message);
    return null;
  }
};

/**
 * Encrypts a value using deterministic AES-256-CBC (uses static IV derived via HMAC-SHA256).
 * Allows index lookups and exact matches (e.g., query Patient.findOne({ phone: encryptDeterministic('9876543210') })).
 * Output format: 'static_iv:encrypted_hex'
 */
const encryptDeterministic = (text) => {
  if (!text) return text;
  // Derive static IV using HMAC-SHA256 with key and value to maintain deterministic property safely
  const staticIv = crypto
    .createHmac('sha256', ENCRYPTION_KEY)
    .update(text)
    .digest()
    .subarray(0, 16);

  const cipher = crypto.createCipheriv(CBC_ALGORITHM, ENCRYPTION_KEY, staticIv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${staticIv.toString('hex')}:${encrypted}`;
};

module.exports = {
  encryptRandom,
  encryptDeterministic,
  decrypt,
};
