const multer = require('multer');
const AppError = require('../../core/errors/AppError');
const { verifyFileMagicBytes } = require('../../core/utils/fileValidation');

// ── In-Memory Multer Storage (Zero local filesystem disk usage) ────────────────
const storage = multer.memoryStorage();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']);
const MIN_FILE_SIZE_BYTES = 5 * 1024;        // 5 KB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('VALIDATION_002', 'File type rejected — only PDF, PNG, JPG, JPEG, WEBP allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('VALIDATION_003', 'File size exceeds the 10MB limit'));
    }
    return next(err);
  }

  // Verify binary magic bytes in memory
  if (req.file && req.file.buffer) {
    if (req.file.buffer.length < MIN_FILE_SIZE_BYTES) {
      return next(new AppError('VALIDATION_003', 'File is too small. Minimum allowed size is 5 KB'));
    }

    const isValid = verifyFileMagicBytes(req.file.buffer, ALLOWED_MIME);
    if (!isValid) {
      return next(new AppError('VALIDATION_002', 'File binary signature is invalid or spoofed'));
    }
  }

  next();
};

module.exports = { upload, handleUploadError, ALLOWED_MIME };
