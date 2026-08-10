const express = require('express');
const router = express.Router();
const controller = require('./laboratory.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { validate } = require('../../core/validation/validate');
const { upload, handleUploadError } = require('./laboratory.upload');
const {
  createLaboratorySchema,
  updateLaboratorySchema,
  addTestSchema,
  updateTestSchema,
  uploadResultsSchema,
} = require('./laboratory.validation');

// ── Configuration Routes (Admin — LAB_MANAGE) ───────────────────────────────────
router.post(  '/config',     authenticate, requirePermission('LAB_MANAGE'), validate(createLaboratorySchema), controller.createLaboratory);
router.get(   '/config',     authenticate, controller.getAllLaboratories);
router.get(   '/config/:id', authenticate, controller.getLaboratoryById);
router.put(   '/config/:id', authenticate, requirePermission('LAB_MANAGE'), validate(updateLaboratorySchema), controller.updateLaboratory);
router.delete('/config/:id', authenticate, requirePermission('LAB_MANAGE'), controller.deleteLaboratory);

// ── Test Catalog Routes (Admin — LAB_MANAGE) ─────────────────────────────────────
router.post(  '/config/:id/tests',             authenticate, requirePermission('LAB_MANAGE'), validate(addTestSchema),    controller.addTest);
router.put(   '/config/:id/tests/:testId',     authenticate, requirePermission('LAB_MANAGE'), validate(updateTestSchema), controller.updateTest);
router.delete('/config/:id/tests/:testId',     authenticate, requirePermission('LAB_MANAGE'), controller.removeTest);

// ── Workflow Routes (Technician — LAB_PROCESS) ──────────────────────────────────
router.get('/pending',
  authenticate, requirePermission('LAB_PROCESS'),
  controller.getPendingVisits);

router.patch('/orders/:visitId/:orderId/collect',
  authenticate, requirePermission('LAB_PROCESS'),
  controller.collectSample);

router.patch('/orders/:visitId/:orderId/results',
  authenticate, requirePermission('LAB_PROCESS'),
  validate(uploadResultsSchema),
  controller.uploadResults);

// ── Scan File Routes (Technician — LAB_PROCESS / LAB_VERIFY) ────────────────────
// Upload: inject dept code → multer → multer error handler → controller
router.post('/orders/:visitId/:orderId/scan',
  authenticate, requirePermission('LAB_PROCESS'),
  controller.constructor.injectDeptCode,
  upload.single('file'),
  handleUploadError,
  controller.uploadScan);

// List scans for an order
router.get('/orders/:visitId/:orderId/scans',
  authenticate, requirePermission('LAB_PROCESS'),
  controller.getScansForOrder);

// Download / stream a scan file (LAB_PROCESS or Clinical Staff)
router.get('/scans/:scanId',
  authenticate, requirePermission(['LAB_PROCESS', 'PATIENT_VIEW', 'NOTE_UPDATE', 'NOTE_FINALIZE']),
  controller.downloadScan);

module.exports = router;

