const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../../core/errors/AppError');

const STORAGE_ROOT = path.resolve(__dirname, '../../../../storage');
const CERTIFICATE_DIR = 'certificates';

const StorageService = {
  ensureDir(relativeDir) {
    const absDir = path.join(STORAGE_ROOT, relativeDir);
    fs.mkdirSync(absDir, { recursive: true });
    return absDir;
  },

  relativePath(filename) {
    return path.posix.join(CERTIFICATE_DIR, filename);
  },

  absolutePath(storagePath) {
    return path.join(STORAGE_ROOT, storagePath);
  },
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const absDir = StorageService.ensureDir(CERTIFICATE_DIR);
    cb(null, absDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const stored = `${uuidv4()}${ext}`;
    req.storedFilename = stored;
    cb(null, stored);
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError('VALIDATION_002', 'File type rejected - only PDF, PNG, JPG, JPEG allowed'), false);
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
  next();
};

module.exports = { upload, handleUploadError, StorageService };
