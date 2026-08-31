const fs = require('fs');

/**
 * Validates the binary header (magic bytes) of an uploaded file buffer or path.
 * Returns MIME type string if valid, or null.
 */
const detectMagicMime = (bufferOrPath) => {
  try {
    let buffer;
    if (Buffer.isBuffer(bufferOrPath)) {
      buffer = bufferOrPath.subarray(0, 16);
    } else if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
      buffer = Buffer.alloc(16);
      const fd = fs.openSync(bufferOrPath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
    } else {
      return null;
    }

    if (!buffer || buffer.length < 4) return null;

    // 1. PDF: %PDF (0x25, 0x50, 0x44, 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }

    // 2. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return 'image/png';
    }

    // 3. JPEG/JPG: 0xFF, 0xD8, 0xFF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // 4. WEBP: RIFF (0..3) ... WEBP (8..11)
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Middleware or utility to verify uploaded file signature against allowed MIME types.
 * Works seamlessly with in-memory Buffer or disk path.
 */
const verifyFileMagicBytes = (bufferOrPath, allowedMimeSet) => {
  const detectedMime = detectMagicMime(bufferOrPath);
  if (!detectedMime || !allowedMimeSet.has(detectedMime)) {
    if (typeof bufferOrPath === 'string') {
      try {
        if (fs.existsSync(bufferOrPath)) {
          fs.unlinkSync(bufferOrPath);
        }
      } catch (_) {}
    }
    return false;
  }
  return true;
};

module.exports = {
  detectMagicMime,
  verifyFileMagicBytes,
};
