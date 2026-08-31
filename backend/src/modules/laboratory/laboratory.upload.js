const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../../core/errors/AppError');
const { verifyFileMagicBytes } = require('../../core/utils/fileValidation');

// ── In-Memory Multer Storage (Zero local filesystem disk usage) ────────────────
const storage = multer.memoryStorage();

// ── Allowed MIME types & file size limits (5 KB to 10 MB) ──────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MIN_FILE_SIZE_BYTES = 5 * 1024;        // 5 KB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('LAB_003', 'File type rejected — only PDF, PNG, JPEG, WEBP allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/**
 * In-memory upload error handler and binary magic-byte verification middleware.
 */
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('LAB_004', 'File size exceeds the 10MB limit'));
    }
    return next(err);
  }

  // Verify memory buffer if received
  if (req.file && req.file.buffer) {
    if (req.file.buffer.length < MIN_FILE_SIZE_BYTES) {
      return next(new AppError('LAB_004', 'File is too small. Minimum allowed size is 5 KB'));
    }

    const isValid = verifyFileMagicBytes(req.file.buffer, ALLOWED_MIME);
    if (!isValid) {
      return next(new AppError('LAB_003', 'File binary signature is invalid or spoofed'));
    }
  }

  next();
};

module.exports = { upload, handleUploadError, ALLOWED_MIME };
