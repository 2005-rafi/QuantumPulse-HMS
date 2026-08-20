const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../../core/errors/AppError');

// ── Storage root ────────────────────────────────────────────────────────────────
// Resolved relative to the backend package root (two levels up from this file's src/modules/laboratory/).
const STORAGE_ROOT = path.resolve(__dirname, '../../../../storage');

// ── StorageService ───────────────────────────────────────────────────────────────
// Thin abstraction over the local filesystem.
// Swap the implementation here to redirect to S3/MinIO without touching business logic.
const StorageService = {
  /**
   * Ensure the target subdirectory exists (idempotent).
   * @param {string} relativeDir  e.g. 'scans/RAD'
   * @returns {string} absolute path to that directory
   */
  ensureDir(relativeDir) {
    const absDir = path.join(STORAGE_ROOT, relativeDir);
    fs.mkdirSync(absDir, { recursive: true });
    return absDir;
  },

  /**
   * Compute the relative storagePath for a given dept code + filename.
   * @param {string} deptCode   uppercase department code, e.g. 'RAD', 'HAEM'
   * @param {string} filename   the stored filename (UUID-based)
   * @returns {string}          e.g. 'scans/RAD/uuid.pdf'
   */
  relativePath(deptCode, filename) {
    return path.posix.join('scans', deptCode || 'GENERAL', filename);
  },

  /**
   * Resolve a storagePath to an absolute filesystem path for streaming.
   * @param {string} storagePath  relative path e.g. 'scans/RAD/uuid.pdf'
   * @returns {string}            absolute path
   */
  absolutePath(storagePath) {
    return path.join(STORAGE_ROOT, storagePath);
  },
};

// ── Multer disk storage ──────────────────────────────────────────────────────────
// The dept code is injected by the route via req.labDeptCode (set in controller before upload).
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // req.labDeptCode is set by the controller before multer runs (via a preceding middleware).
    const deptCode = (req.labDeptCode || 'GENERAL').toUpperCase();
    const absDir = StorageService.ensureDir(path.join('scans', deptCode));
    cb(null, absDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const patientId = req.patientId || 'unknown_patient';
    const orderId = req.params.orderId || uuidv4();
    const stored = `${patientId}-${orderId}${ext}`;
    // Expose for controller use
    req.storedFilename = stored;
    cb(null, stored);
  },
});

// ── File filter: allowed MIME types ─────────────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('LAB_003'), false);
  }
  cb(null, true);
};

// ── Multer instance ──────────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/**
 * Multer error handler middleware — converts multer-specific errors to AppError codes.
 * Use AFTER the multer middleware in route chains.
 */
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('LAB_004'));
    if (err.message === 'LAB_003' || (err.errorCode && err.errorCode === 'LAB_003')) return next(err);
    return next(err);
  }
  next();
};

module.exports = { upload, handleUploadError, StorageService };
