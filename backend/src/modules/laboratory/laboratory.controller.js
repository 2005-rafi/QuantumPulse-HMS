const path = require('path');
const laboratoryService = require('./laboratory.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');
const auditService = require('../audit/audit.service');

class LaboratoryController {
  // ── Configuration (Admin — LAB_MANAGE) ──────────────────────────────────────────

  createLaboratory = catchAsync(async (req, res) => {
    const lab = await laboratoryService.createLaboratory(req.body);
    return success(res, lab, 'Laboratory created successfully', 201);
  });

  getAllLaboratories = catchAsync(async (req, res) => {
    const filter = {};
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.includeInactive === 'true') filter.includeInactive = true;
    const labs = await laboratoryService.getAllLaboratories(filter);
    return success(res, labs, 'Laboratories retrieved successfully');
  });

  getLaboratoryById = catchAsync(async (req, res) => {
    const lab = await laboratoryService.getLaboratoryById(req.params.id);
    return success(res, lab, 'Laboratory retrieved successfully');
  });

  updateLaboratory = catchAsync(async (req, res) => {
    const lab = await laboratoryService.updateLaboratory(req.params.id, req.body);
    return success(res, lab, 'Laboratory updated successfully');
  });

  deleteLaboratory = catchAsync(async (req, res) => {
    await laboratoryService.deleteLaboratory(req.params.id);
    return success(res, null, 'Laboratory deactivated successfully');
  });

  // ── Test Catalog (Admin — LAB_MANAGE) ────────────────────────────────────────────

  addTest = catchAsync(async (req, res) => {
    const test = await laboratoryService.addTest(req.params.id, req.body);
    return success(res, test, 'Test added to catalog', 201);
  });

  updateTest = catchAsync(async (req, res) => {
    const test = await laboratoryService.updateTest(req.params.id, req.params.testId, req.body);
    return success(res, test, 'Test updated successfully');
  });

  removeTest = catchAsync(async (req, res) => {
    const result = await laboratoryService.removeTest(req.params.id, req.params.testId);
    return success(res, result, 'Test removed from catalog');
  });

  // ── Workflow (Technician — LAB_PROCESS) ─────────────────────────────────────────

  getPendingVisits = catchAsync(async (req, res) => {
    const targetDeptId = req.query.departmentId && req.query.departmentId !== 'ALL'
      ? req.query.departmentId
      : null;
    const isNurseQueue = req.user?.role === 'Lab Nurse' || req.query.isNurseQueue === 'true';
    const visits = await laboratoryService.getPendingVisits(targetDeptId, { isNurseQueue });
    return success(res, visits, 'Pending lab visits retrieved successfully');
  });

  getReportedVisits = catchAsync(async (req, res) => {
    const targetDeptId = req.query.departmentId && req.query.departmentId !== 'ALL'
      ? req.query.departmentId
      : null;
    const visits = await laboratoryService.getReportedVisits(targetDeptId, req.query);
    return success(res, visits, 'Reported lab visits retrieved successfully');
  });

  getLabHistory = catchAsync(async (req, res) => {
    const targetDeptId = req.query.departmentId && req.query.departmentId !== 'ALL'
      ? req.query.departmentId
      : null;
    const filters = {
      departmentId: targetDeptId,
      status: req.query.status,
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sort: req.query.sort || 'latest',
      search: req.query.search || req.query.q,
      limit: parseInt(req.query.limit, 10) || 100,
      page: parseInt(req.query.page, 10) || 1,
    };
    const history = await laboratoryService.getLabHistory(filters, req.user);
    return success(res, history, 'Laboratory patient history retrieved successfully');
  });


  collectSample = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const staffId = req.user?.staffId || req.user?._id || req.user?.id || null;
    const visit = await laboratoryService.collectSample(visitId, orderId, req.user?.departmentId, staffId);
    return success(res, visit, 'Sample collected successfully');
  });

  uploadResults = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const { results, notes } = req.body;
    const visit = await laboratoryService.uploadResults(
      visitId, orderId, results, notes,
      req.user.staffId, req.user.departmentId
    );
    return success(res, visit, 'Results uploaded successfully');
  });

  recordLabVitals = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const visit = await laboratoryService.recordLabVitals(visitId, orderId, req.body, req.user.staffId);
    return success(res, visit, 'Lab pre-vitals recorded successfully');
  });

  recordPhlebotomyRisks = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const visit = await laboratoryService.recordPhlebotomyRisks(visitId, orderId, req.body, req.user.staffId);
    return success(res, visit, 'Phlebotomy safety screening flags and barcode registered');
  });

  broadcastPanicAlert = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const visit = await laboratoryService.broadcastPanicAlert(visitId, orderId, req.body, req.user.staffId);
    return success(res, visit, 'Emergency critical / panic value alert broadcasted to care team');
  });

  getPatientLabHistory = catchAsync(async (req, res) => {
    const { patientId } = req.params;
    const { testCode } = req.query;
    const history = await laboratoryService.getPatientLabHistory(patientId, testCode);
    return success(res, history, 'Patient historical diagnostic trend retrieved');
  });


  verifyResults = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const { doctorNotes, deltaFlag, panicValueFlag, disposition, clinicalImpression, rejectionReason } = req.body;
    const visit = await laboratoryService.verifyResults(
      visitId,
      orderId,
      doctorNotes,
      req.user.staffId,
      deltaFlag,
      panicValueFlag,
      disposition,
      clinicalImpression,
      rejectionReason
    );
    return success(res, visit, 'Diagnostic test report verified and authorized');
  });

  dispatchVisit = catchAsync(async (req, res) => {
    const { visitId } = req.params;
    const { disposition, notes } = req.body;
    const visit = await laboratoryService.dispatchVisit(visitId, disposition, notes, req.user.staffId);
    return success(res, visit, 'Visit successfully dispatched and routed');
  });

  // ── Scan Files (Technician — LAB_PROCESS) ────────────────────────────────────────

  /**
   * Middleware: inject dept code before multer so storage destination knows the folder.
   * This must be a route middleware, not a class method, to run before multer.
   */
  static injectDeptCode = catchAsync(async (req, res, next) => {
    const AppError = require('../../core/errors/app-error');
    const visitRepository = require('../visits/visit.repository');

    const { visitId, orderId } = req.params;
    if (!visitId) {
      throw new AppError('VALIDATION_001', 'visitId parameter is required');
    }

    const visit = await visitRepository.findById(visitId);
    if (!visit) {
      throw new AppError('NOT_FOUND', 'Visit not found');
    }

    const order = visit.labOrders?.find(o => o._id.toString() === orderId.toString());

    req.labDeptCode = (req.user.department || 'GENERAL').toUpperCase().replace(/\W/g, '').slice(0, 8);
    req.patientId = visit.patientId?._id?.toString() || visit.patientId?.toString() || '';
    req.laboratoryId = order?.laboratoryId?.toString() || '';

    next();
  });

  uploadScan = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const fs = require('fs');
    const AppError = require('../../core/errors/app-error');

    if (!req.file) {
      throw new AppError('VALIDATION_001', 'No file attached to the request');
    }

    // Enforce 5 KB minimum size check
    const MIN_SIZE = 5 * 1024;
    if (req.file.size < MIN_SIZE) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw new AppError('LAB_004', 'File is too small. Minimum allowed size is 5 KB.');
    }

    // Inspect magic bytes of the file on disk to prevent MIME spoofing
    try {
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      const hex = buffer.toString('hex').toUpperCase();
      let isValid = false;
      const mime = req.file.mimetype;

      if (mime === 'application/pdf' && hex.startsWith('25504446')) {
        isValid = true;
      } else if (mime === 'image/jpeg' && hex.startsWith('FFD8FF')) {
        isValid = true;
      } else if (mime === 'image/png' && hex.startsWith('89504E47')) {
        isValid = true;
      } else if (mime === 'image/webp' && hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') {
        isValid = true;
      }

      if (!isValid) {
        fs.unlinkSync(req.file.path); // Delete the invalid file
        throw new AppError('LAB_003', 'File content verification failed: magic bytes do not match MIME type');
      }
    } catch (err) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw err;
    }

    const scanReport = await laboratoryService.uploadScanFile(
      {
        visitId,
        orderId,
        labId:           req.laboratoryId,
        patientId:       req.patientId,
        labDepartmentId: req.user.departmentId,
        uploadedBy:      req.user.staffId,
        deptCode:        req.labDeptCode,
      },
      req.file
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'SCAN_UPLOAD',
      scanReport._id,
      { filename: scanReport.originalFilename, patientId: req.body.patientId, visitId },
      req.ip
    );

    return success(res, scanReport, 'Scan file uploaded successfully', 201);
  });

  downloadScan = catchAsync(async (req, res) => {
    const { scan, presignedUrl, absolutePath } = await laboratoryService.getScanFile(
      req.params.scanId,
      req.user
    );

    auditService.logEvent(
      req.user.staffId || req.user.userId,
      req.user.role,
      'SCAN_DOWNLOAD',
      scan._id,
      { filename: scan.originalFilename, patientId: scan.patientId, visitId: scan.visitId },
      req.ip
    );

    if (presignedUrl) {
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return success(res, { downloadUrl: presignedUrl, scan }, 'Scan download URL generated');
      }
      return res.redirect(presignedUrl);
    }

    if (absolutePath) {
      res.setHeader('Content-Type', scan.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${scan.originalFilename}"`);
      return res.sendFile(absolutePath);
    }

    throw new AppError('NOT_FOUND', 'Scan file not found', 404);
  });

  getScansForOrder = catchAsync(async (req, res) => {
    const { visitId, orderId } = req.params;
    const scans = await laboratoryService.getScansForOrder(visitId, orderId);
    return success(res, scans, 'Scan reports retrieved successfully');
  });
}

module.exports = new LaboratoryController();

