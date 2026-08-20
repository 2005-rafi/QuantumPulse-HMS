const path = require('path');
const fs = require('fs');
const visitRepository = require('../visits/visit.repository');
const Laboratory = require('./laboratory.model');
const ScanReport = require('./laboratory.scan.model');
const { StorageService } = require('./laboratory.upload');
const AppError = require('../../core/errors/AppError');
const { withTransaction } = require('../../core/database/transaction');
const administrationService = require('../administration/administration.service');

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

    if (dept.type !== 'DIAGNOSTIC' && dept.type !== 'CLINICAL/DIAGNOSTIC') {
      throw new AppError('BUSINESS_002', `Cannot link laboratory to a non-diagnostic department type: ${dept.type}`);
    }

    // Guard: prevent duplicate lab per department (unique name still enforced by schema)
    const existing = await Laboratory.findOne({ name: data.name });
    if (existing) throw new AppError('BUSINESS_001', `A laboratory named "${data.name}" already exists`);

    return await Laboratory.create(data);
  }

  /**
   * List all active laboratories.
   * @param {object} filter  Optional: { departmentId } to scope by department
   */
  async getAllLaboratories(filter = {}) {
    const query = {};
    if (!filter.includeInactive) {
      query.isActive = true;
    }
    if (filter.departmentId) query.departmentId = filter.departmentId;
    return await Laboratory.find(query).populate('departmentId', 'name code type').lean();
  }

  /**
   * Get a single laboratory by ID.
   */
  async getLaboratoryById(id) {
    const lab = await Laboratory.findById(id).populate('departmentId', 'name code type').lean();
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  /**
   * Update laboratory metadata (name, description, isActive).
   * departmentId cannot be changed after creation (business rule).
   */
  async updateLaboratory(id, data) {
    // Prevent departmentId from being changed via update
    const { departmentId, ...safeData } = data;

    if (safeData.isActive === false) {
      const Visit = require('../visits/visit.model');
      const activeLabOrdersCount = await Visit.countDocuments({
        'labOrders': {
          $elemMatch: {
            laboratoryId: id,
            status: { $in: ['PENDING_SAMPLE', 'PROCESSING'] }
          }
        }
      });
      if (activeLabOrdersCount > 0) {
        throw new AppError('BUSINESS_002', 'Cannot deactivate laboratory: it has pending or processing lab orders');
      }
    }

    const lab = await Laboratory.findByIdAndUpdate(id, safeData, { returnDocument: 'after', runValidators: true });
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  /**
   * Soft-delete a laboratory.
   */
  async deleteLaboratory(id) {
    const Visit = require('../visits/visit.model');
    const activeLabOrdersCount = await Visit.countDocuments({
      'labOrders': {
        $elemMatch: {
          laboratoryId: id,
          status: { $in: ['PENDING_SAMPLE', 'PROCESSING'] }
        }
      }
    });
    if (activeLabOrdersCount > 0) {
      throw new AppError('BUSINESS_002', 'Cannot deactivate laboratory: it has pending or processing lab orders');
    }

    const lab = await Laboratory.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    return lab;
  }

  // ── Test Catalog Methods (admin only) ────────────────────────────────────────────

  /**
   * Add a new test to a laboratory's catalog.
   */
  async addTest(labId, testData) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    lab.testCatalog.push(testData);
    await lab.save();
    return lab.testCatalog[lab.testCatalog.length - 1];
  }

  /**
   * Update an existing test in the catalog.
   */
  async updateTest(labId, testId, testData) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    const test = lab.testCatalog.id(testId);
    if (!test) throw new AppError('NOT_FOUND', 'Test not found in catalog');
    Object.assign(test, testData);
    await lab.save();
    return test;
  }

  /**
   * Remove a test from the catalog.
   */
  async removeTest(labId, testId) {
    const lab = await Laboratory.findById(labId);
    if (!lab) throw new AppError('NOT_FOUND', 'Laboratory not found');
    const test = lab.testCatalog.id(testId);
    if (!test) throw new AppError('NOT_FOUND', 'Test not found in catalog');
    test.deleteOne();
    await lab.save();
    return { removed: testId };
  }

  // ── Workflow Methods (technician) ────────────────────────────────────────────────

  /**
   * Get visits with pending or processing lab orders for the technician's department.
   * Filters by labDepartmentId matching the authenticated technician's departmentId.
   * @param {string} departmentId  The technician's departmentId from req.user
   */
  async getPendingVisits(departmentId) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    // Department isolation: Technician only sees patients belonging to their department or assigned lab
    const deptMatch = departmentId
      ? {
          $or: [
            { 'labOrders.labDepartmentId': departmentId },
            { departmentId: departmentId },
          ],
        }
      : {};

    const query = {
      ...deptMatch,
      $or: [
        {
          'labOrders': {
            $elemMatch: {
              status: { $in: ['PENDING_SAMPLE', 'PROCESSING'] },
            },
          },
        },
        {
          'labOrders': {
            $elemMatch: {
              status: 'COMPLETED',
              processedAt: { $gte: cutoff },
            },
          },
        },
        {
          status: 'WAITING_LAB',
          'labOrders.0': { $exists: true },
        },
      ],
    };

    return await visitRepository.find(query);
  }

  /**
   * Mark a lab order's sample as collected.
   * Enforces department ownership: technician can only act on orders in their dept.
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

      // Department ownership check
      if (technicianDeptId && order.labDepartmentId) {
        if (order.labDepartmentId.toString() !== technicianDeptId.toString()) {
          throw new AppError('LAB_002');
        }
      }

      if (order.status !== 'PENDING_SAMPLE') {
        throw new AppError('BUSINESS_002', `Cannot collect sample for order in status: ${order.status}`);
      }

      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return {
            ...o,
            status: 'PROCESSING',
            sampleCollectedAt: new Date(),
          };
        }
        return o;
      });

      return await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });
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

      // Department ownership check
      if (technicianDeptId && order.labDepartmentId) {
        if (order.labDepartmentId.toString() !== technicianDeptId.toString()) {
          throw new AppError('LAB_002');
        }
      }

      if (order.status !== 'PROCESSING') {
        throw new AppError('BUSINESS_002', `Cannot upload results for order in status: ${order.status}`);
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
            technicianId,
            processedAt: new Date(),
          };
        }
        return o;
      });

      // Promote visit status only when all lab orders are done
      const allCompleted = updatedLabOrders.every((o) => o.status === 'COMPLETED');
      const updateData = { labOrders: updatedLabOrders };
      if (allCompleted) {
        updateData.status = 'WAITING_DOCTOR_REVIEW';
      }

      return await visitRepository.updateById(visitId, updateData, { session });
    });
  }

  // ── Scan File Methods ────────────────────────────────────────────────────────────

  /**
   * Record a successfully uploaded scan file and link it to the lab order.
   * The file is already written to disk by multer at this point.
   *
   * @param {object} params
   * @param {string} params.visitId
   * @param {string} params.orderId
   * @param {string} params.labId
   * @param {string} params.patientId
   * @param {string} params.labDepartmentId
   * @param {string} params.uploadedBy       Staff ID
   * @param {string} params.deptCode         Department code for path, e.g. 'RAD'
   * @param {object} file                    Multer file object
   * @returns {ScanReport}
   */
  async uploadScanFile({ visitId, orderId, labId, patientId, labDepartmentId, uploadedBy, deptCode }, file) {
    const storedFilename = file.filename;
    const storagePath = StorageService.relativePath(deptCode, storedFilename);

    const scanReport = await ScanReport.create({
      patientId,
      visitId,
      orderId,
      labId,
      labDepartmentId,
      uploadedBy,
      originalFilename: file.originalname,
      storedFilename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath,
    });

    // Update the visit document to link this scan report ID in MongoDB metadata
    const visit = await visitRepository.findById(visitId);
    if (visit) {
      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          const existingResults = o.results ? (o.results instanceof Map ? Object.fromEntries(o.results) : o.results) : {};
          return {
            ...o,
            results: { ...existingResults, scanReportId: scanReport._id.toString() },
          };
        }
        return o;
      });
      await visitRepository.updateById(visitId, { labOrders: updatedLabOrders });
    }

    return scanReport;
  }

  /**
   * Get a scan report's metadata and verify the requester belongs to the same department.
   * @param {string} scanId
   * @param {string} requesterDeptId
   * @returns {{ scan: ScanReport, absolutePath: string }}
   */
  async getScanFile(scanId, user) {
    const scan = await ScanReport.findById(scanId).lean();
    if (!scan) throw new AppError('LAB_005');

    let isAuthorized = false;

    // 1. Tech check (LAB_PROCESS permission with matching department ID)
    if (user.permissions && user.permissions.includes('LAB_PROCESS')) {
      if (user.departmentId && scan.labDepartmentId.toString() === user.departmentId.toString()) {
        isAuthorized = true;
      }
    }

    // 2. Admin check (LAB_MANAGE permission)
    if (user.permissions && user.permissions.includes('LAB_MANAGE')) {
      isAuthorized = true;
    }

    // 3. Clinical Staff check (Doctors/Nurses who consult/view patient files)
    if (
      !isAuthorized && 
      user.permissions && 
      (user.permissions.includes('PATIENT_VIEW') || user.permissions.includes('NOTE_UPDATE') || user.permissions.includes('NOTE_FINALIZE'))
    ) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new AppError('LAB_002', 'Permission not granted to view this scan report');
    }

    const absolutePath = StorageService.absolutePath(scan.storagePath);
    if (!fs.existsSync(absolutePath)) throw new AppError('LAB_005');

    return { scan, absolutePath };
  }

  /**
   * Get all scan reports for a specific lab order.
   */
  async getScansForOrder(visitId, orderId) {
    return await ScanReport.find({ visitId, orderId }).sort({ createdAt: -1 }).lean();
  }
}

module.exports = new LaboratoryService();

