const path = require('path');
const fs = require('fs');
const visitRepository = require('../visits/visit.repository');
const Laboratory = require('./laboratory.model');
const ScanReport = require('./laboratory.scan.model');
const { StorageService } = require('./laboratory.upload');
const AppError = require('../../core/errors/AppError');
const { withTransaction } = require('../../core/database/transaction');
const administrationService = require('../administration/administration.service');
const logger = require('../../core/logger');
const auditService = require('../audit/audit.service');

class LaboratoryService {
  // ── Configuration Methods (admin only) ──────────────────────────────────────────

  /**
   * Create a new laboratory.
   * Validates that the linked department exists before creating.
   */
  async createLaboratory(data) {
    const dept = await administrationService.getDepartmentById(data.departmentId);
    if (!dept) throw new AppError('NOT_FOUND', 'Department not found');

    if (dept.status !== 'Active') {
      throw new AppError('BUSINESS_002', `Cannot link laboratory to inactive department "${dept.name}"`);
    }

    // Check duplicate code
    const existing = await Laboratory.findOne({ code: data.code.toUpperCase() });
    if (existing) throw new AppError('CONFLICT', `Laboratory with code "${data.code}" already exists`);

    return await Laboratory.create({
      ...data,
      code: data.code.toUpperCase(),
    });
  }

  async getAllLaboratories(filter = {}) {
    const query = filter.includeInactive ? {} : { status: 'Active' };
    if (filter.departmentId) query.departmentId = filter.departmentId;
    return await Laboratory.find(query).populate('departmentId', 'name code').lean();
  }

  async getLaboratoryById(id) {
    const lab = await Laboratory.findById(id).populate('departmentId', 'name code').lean();
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  async updateLaboratory(id, data) {
    if (data.departmentId) {
      const dept = await administrationService.getDepartmentById(data.departmentId);
      if (!dept) throw new AppError('NOT_FOUND', 'Department not found');
    }
    if (data.code) data.code = data.code.toUpperCase();

    const lab = await Laboratory.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  async deleteLaboratory(id) {
    const lab = await Laboratory.findByIdAndUpdate(id, { $set: { status: 'Inactive' } }, { new: true });
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  // ── Test Catalog Methods (admin only) ────────────────────────────────────────────

  async addTest(labId, testData) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');

    const codeExists = lab.testCatalog.some((t) => t.code === testData.code.toUpperCase());
    if (codeExists) throw new AppError('CONFLICT', `Test code "${testData.code}" already exists in this laboratory catalog`);

    lab.testCatalog.push({
      ...testData,
      code: testData.code.toUpperCase(),
    });
    await lab.save();
    return lab.testCatalog[lab.testCatalog.length - 1];
  }

  async updateTest(labId, testId, testData) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');

    const test = lab.testCatalog.id(testId);
    if (!test) throw new AppError('NOT_FOUND', 'Test not found in catalog');

    if (testData.code) testData.code = testData.code.toUpperCase();
    Object.assign(test, testData);
    await lab.save();
    return test;
  }

  async removeTest(labId, testId) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');

    const test = lab.testCatalog.id(testId);
    if (!test) throw new AppError('NOT_FOUND', 'Test not found in catalog');

    test.status = 'Inactive';
    await lab.save();
    return { id: testId, status: 'Inactive' };
  }

  // ── Workflow Methods (technician) ───────────────────────────────────────────────

  /**
   * Get visits with pending lab orders, filtered by the technician's department.
   * If departmentId is not provided, returns all visits with pending lab orders.
   */
  async getPendingVisits(departmentId) {
    let visits;
    if (departmentId) {
      visits = await visitRepository.findPendingLabOrdersByDepartment(departmentId);
      if (!visits || visits.length === 0) {
        visits = await visitRepository.findPendingLabOrders();
      }
    } else {
      visits = await visitRepository.findPendingLabOrders();
    }
    return visits;
  }

  /**
   * Get visits with completed/reported lab orders across the hospital,
   * optionally filtered by technician's department.
   */
  async getReportedVisits(departmentId, options = {}) {
    let visits;
    if (departmentId) {
      visits = await visitRepository.findReportedLabOrders({ departmentId, limit: options.limit });
      if (!visits || visits.length === 0) {
        visits = await visitRepository.findReportedLabOrders({ limit: options.limit });
      }
    } else {
      visits = await visitRepository.findReportedLabOrders({ limit: options.limit });
    }
    return visits;
  }

  /**
   * Register specimen collection for a specific lab order within a visit.
   * Promotes order status from PENDING_SAMPLE -> PROCESSING.
   * @param {string} visitId
   * @param {string} orderId
   * @param {string} technicianDeptId  From req.user.departmentId
   */
  async collectSample(visitId, orderId, technicianDeptId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const order = visit.labOrders.find(
        (o) => o._id?.toString() === orderId?.toString() || o.id?.toString() === orderId?.toString()
      );
      if (!order) throw new AppError('NOT_FOUND', 'Lab order not found');

      // Safe department info log (handles populated vs unpopulated department references)
      if (technicianDeptId && order.labDepartmentId) {
        const orderDeptId = typeof order.labDepartmentId === 'object' ? order.labDepartmentId._id?.toString() : order.labDepartmentId.toString();
        const techDeptId = typeof technicianDeptId === 'object' ? technicianDeptId._id?.toString() : technicianDeptId.toString();
        if (orderDeptId && techDeptId && orderDeptId !== techDeptId) {
          logger.info(`[LaboratoryService] Cross-department sample registration: order dept ${orderDeptId} vs technician dept ${techDeptId}`);
        }
      }

      const currentStatus = (order.status || 'PENDING_SAMPLE').toUpperCase();
      if (currentStatus === 'COMPLETED') {
        throw new AppError('BUSINESS_002', 'Cannot collect sample for an already completed order');
      }

      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return {
            ...o,
            status: 'PROCESSING',
            sampleCollectedAt: o.sampleCollectedAt || new Date(),
          };
        }
        return o;
      });

      const updatedVisit = await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });
      logger.info(`[LaboratoryService] Sample registered for order ${orderId} in visit ${visitId}`);
      return updatedVisit;
    });
  }

  /**
   * Upload text/numeric results for a lab order.
   * File-type result fields are handled separately via uploadScanFile.
   * @param {string} visitId
   * @param {string} orderId
   * @param {object} results         Key-value pairs for non-file fields
   * @param {string} notes           Optional technician notes
   * @param {string} technicianId    Staff ID from req.user.staffId
   * @param {string} technicianDeptId From req.user.departmentId
   */
  async uploadResults(visitId, orderId, results, notes, technicianId, technicianDeptId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const order = visit.labOrders.find(
        (o) => o._id?.toString() === orderId?.toString() || o.id?.toString() === orderId?.toString()
      );
      if (!order) throw new AppError('NOT_FOUND', 'Lab order not found');

      // Department info log
      if (technicianDeptId && order.labDepartmentId) {
        const orderDeptId = typeof order.labDepartmentId === 'object' ? order.labDepartmentId._id?.toString() : order.labDepartmentId.toString();
        const techDeptId = typeof technicianDeptId === 'object' ? technicianDeptId._id?.toString() : technicianDeptId.toString();
        if (orderDeptId && techDeptId && orderDeptId !== techDeptId) {
          logger.info(`[LaboratoryService] Cross-department result entry: order dept ${orderDeptId} vs technician dept ${techDeptId}`);
        }
      }

      // Merge new results into existing (preserves any file refs already stored as scan IDs)
      const existing = order.results ? (order.results instanceof Map ? Object.fromEntries(order.results) : order.results) : {};
      const updatedResults = { ...existing, ...results };

      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return {
            ...o,
            status: 'COMPLETED',
            results: updatedResults,
            notes: notes !== undefined ? notes : o.notes,
            technicianId: technicianId || o.technicianId,
            processedAt: new Date(),
          };
        }
        return o;
      });

      // Promote visit status only when all lab orders are done
      const allCompleted = updatedLabOrders.every((o) => (o.status || '').toUpperCase() === 'COMPLETED');
      const updateData = { labOrders: updatedLabOrders };
      if (allCompleted) {
        updateData.status = 'WAITING_DOCTOR_REVIEW';
      }

      const updatedVisit = await visitRepository.updateById(visitId, updateData, { session });
      logger.info(`[LaboratoryService] Results submitted for order ${orderId} in visit ${visitId}`);
      return updatedVisit;
    });
  }

  // ── Scan File Management (Cloudinary Storage) ─────────────────────────

  async uploadScanFile(paramsOrVisitId, fileOrOrderId, fileParam, technicianIdParam, deptCodeParam) {
    let visitId, orderId, labId, patientId, labDepartmentId, uploadedBy, deptCode, file;

    if (typeof paramsOrVisitId === 'object' && !fileParam) {
      visitId = paramsOrVisitId.visitId;
      orderId = paramsOrVisitId.orderId;
      labId = paramsOrVisitId.labId;
      patientId = paramsOrVisitId.patientId;
      labDepartmentId = paramsOrVisitId.labDepartmentId;
      uploadedBy = paramsOrVisitId.uploadedBy;
      deptCode = paramsOrVisitId.deptCode || 'GENERAL';
      file = fileOrOrderId;
    } else {
      visitId = paramsOrVisitId;
      orderId = fileOrOrderId;
      file = fileParam;
      uploadedBy = technicianIdParam;
      deptCode = deptCodeParam || 'GENERAL';
    }

    if (!file || !file.buffer) throw new AppError('VALIDATION_001', 'No file buffer was uploaded');

    const CloudinaryStorageService = require('../../core/storage/CloudinaryStorageService');

    const cleanDept = (deptCode || 'GENERAL').toUpperCase();
    const filename = `${patientId || 'patient'}-${orderId}-${Date.now()}`;

    // Upload in-memory buffer to Cloudinary with retry
    const uploadResult = await CloudinaryStorageService.uploadBuffer(file.buffer, {
      folder: `scans/${cleanDept}`,
      filename,
      mimeType: file.mimetype,
      tags: ['lab_scan', cleanDept, orderId.toString()],
      context: {
        visitId: visitId ? visitId.toString() : '',
        orderId: orderId ? orderId.toString() : '',
        patientId: patientId ? patientId.toString() : '',
        uploadedBy: uploadedBy ? uploadedBy.toString() : '',
      },
      isPrivate: true,
    });

    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) {
        throw new AppError('NOT_FOUND', 'Visit not found');
      }

      const order = visit.labOrders.find(o => o._id?.toString() === orderId.toString() || o.id?.toString() === orderId.toString());
      if (!order) {
        throw new AppError('NOT_FOUND', 'Lab order not found in this visit');
      }

      const resolvedPatientId = patientId || visit.patientId?._id || visit.patientId;
      const resolvedLabId = labId || order.laboratoryId || null;
      const resolvedLabDeptId = labDepartmentId || order.labDepartmentId || null;

      const scanDoc = new ScanReport({
        orderId: orderId.toString(),
        visitId,
        patientId: resolvedPatientId,
        labId: resolvedLabId,
        labDepartmentId: resolvedLabDeptId,
        uploadedBy,
        originalFilename: file.originalname,
        storedFilename: uploadResult.publicId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        cloudinaryPublicId: uploadResult.publicId,
        secureUrl: uploadResult.secureUrl,
        resourceType: uploadResult.resourceType,
        storageType: 'cloudinary',
        storagePath: `scans/${cleanDept}/${uploadResult.publicId}`,
      });
      await scanDoc.save({ session });

      const fieldKey = `attachment_${scanDoc._id}`;
      const existingResults = order.results ? (order.results instanceof Map ? Object.fromEntries(order.results) : order.results) : {};
      const newResults = { ...existingResults, [fieldKey]: scanDoc._id.toString() };

      const updatedLabOrders = visit.labOrders.map(o => {
        if (o._id?.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return { ...o, results: newResults };
        }
        return o;
      });
      await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });

      logger.info('Scan report uploaded successfully to Cloudinary', { scanId: scanDoc._id, publicId: uploadResult.publicId });
      return scanDoc;
    });
  }

  async getScansForOrder(visitId, orderId) {
    const query = { status: { $ne: 'Inactive' } };
    if (orderId) query.orderId = orderId.toString();
    if (visitId) query.visitId = visitId;

    return await ScanReport.find(query)
      .populate('uploadedBy', 'fullName employeeId')
      .lean();
  }

  async getScanFile(scanId, user) {
    const scan = await ScanReport.findById(scanId);
    if (!scan) throw new AppError('NOT_FOUND', 'Scan report not found', 404);

    const CloudinaryStorageService = require('../../core/storage/CloudinaryStorageService');
    let presignedUrl = scan.secureUrl || null;

    // Resolve candidate public ID if cloudinaryPublicId is missing
    const publicId =
      scan.cloudinaryPublicId ||
      (scan.storagePath ? scan.storagePath.replace(/\.[^/.]+$/, '') : null) ||
      (scan.storedFilename ? scan.storedFilename.replace(/\.[^/.]+$/, '') : null);

    if (publicId && CloudinaryStorageService.configured) {
      try {
        presignedUrl = CloudinaryStorageService.generatePresignedUrl(publicId, {
          expiresInSeconds: 3600,
          resourceType: scan.resourceType || (scan.mimeType === 'application/pdf' ? 'raw' : 'image'),
          format: scan.mimeType === 'application/pdf' ? 'pdf' : undefined,
        });
      } catch (err) {
        logger.warn('Failed to generate presigned Cloudinary URL, falling back to direct URL:', { error: err.message });
      }
    }

    // Direct Cloudinary URL fallback if presigned is still null
    if (!presignedUrl && publicId && CloudinaryStorageService.configured) {
      const resType = scan.resourceType || (scan.mimeType === 'application/pdf' ? 'raw' : 'image');
      presignedUrl = `https://res.cloudinary.com/${CloudinaryStorageService.cloudName}/${resType}/upload/${publicId}${scan.mimeType === 'application/pdf' ? '.pdf' : ''}`;
    }

    // If still null, fallback to sample asset or secureUrl
    if (!presignedUrl) {
      presignedUrl = scan.secureUrl || `https://res.cloudinary.com/${CloudinaryStorageService.cloudName || 'r6zfonlx'}/image/upload/main-sample.png`;
    }

    return { scan, presignedUrl };
  }

  async getScanById(scanId, user) {
    return await this.getScanFile(scanId, user);
  }
}

module.exports = new LaboratoryService();
