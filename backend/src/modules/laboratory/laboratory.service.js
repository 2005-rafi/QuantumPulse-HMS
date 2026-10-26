const path = require('path');
const fs = require('fs');
const visitRepository = require('../visits/visit.repository');
const Laboratory = require('./laboratory.model');
const ScanReport = require('./laboratory-scan.model');
const { StorageService } = require('./laboratory-upload.middleware');
const AppError = require('../../core/errors/app-error');
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

    let code = data.code ? String(data.code).toUpperCase().trim() : null;
    if (!code && data.name) {
      const clean = String(data.name).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      code = clean.slice(0, 8);
    }

    if (code) {
      const existing = await Laboratory.findOne({ code });
      if (existing) {
        if (data.code) {
          throw new AppError('CONFLICT', `Laboratory with code "${data.code}" already exists`);
        } else {
          code = `${code.slice(0, 5)}${Math.floor(100 + Math.random() * 900)}`;
        }
      }
    }

    return await Laboratory.create({
      ...data,
      ...(code ? { code } : {}),
    });
  }

  async getAllLaboratories(filter = {}) {
    const query = filter.includeInactive
      ? {}
      : {
          $and: [
            {
              $or: [
                { status: 'Active' },
                { isActive: true },
                { status: { $exists: false }, isActive: { $exists: false } },
              ],
            },
            { status: { $ne: 'Inactive' } },
            { isActive: { $ne: false } },
          ],
        };
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
  async getPendingVisits(departmentId, options = {}) {
    let visits;
    if (departmentId) {
      visits = await visitRepository.findPendingLabOrdersByDepartment(departmentId, options);
      if (!visits || visits.length === 0) {
        visits = await visitRepository.findPendingLabOrders(options);
      }
    } else {
      visits = await visitRepository.findPendingLabOrders(options);
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
  async collectSample(visitId, orderId, technicianDeptId, staffId = null) {
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

      const now = new Date();
      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          const isRedraw = Boolean(o.recollectionRequested);
          const currentRetakes = Array.isArray(o.phlebotomyRetakes) ? [...o.phlebotomyRetakes] : [];
          
          if (isRedraw) {
            currentRetakes.push({
              retakeNumber: currentRetakes.length + 1,
              collectedAt: now,
              collectedBy: staffId,
              reason: o.rejectionReason || 'Specimen recollected by phlebotomist',
              previousStatus: 'RECOLLECT_SAMPLE',
              barcode: o.specimenBarcode || '',
              notes: o.notes || '',
            });
          }

          return {
            ...o,
            status: 'PROCESSING',
            sampleCollectedAt: now,
            recollectionRequested: false,
            retakeCount: isRedraw ? (o.retakeCount || 0) + 1 : (o.retakeCount || 0),
            phlebotomyRetakes: currentRetakes,
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
  /**
   * Upload text/numeric results for a lab order.
   * File-type result fields are handled separately via uploadScanFile.
   * Promotes order status to AWAITING_VERIFICATION for pathologist review.
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

      // Quality Assurance & HIPAA Chain-of-Custody: Ensure specimen was collected by nurse before entering results
      if (order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt) {
        throw new AppError('BUSINESS_002', 'Cannot submit analytical results before specimen is collected and accessioned by the lab nurse.');
      }

      // Merge new results into existing (preserves any file refs already stored as scan IDs)
      const existing = order.results ? (order.results instanceof Map ? Object.fromEntries(order.results) : order.results) : {};
      const updatedResults = { ...existing, ...results };

      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return {
            ...o,
            status: 'AWAITING_VERIFICATION',
            results: updatedResults,
            notes: notes !== undefined ? notes : o.notes,
            technicianId: technicianId || o.technicianId,
            processedAt: new Date(),
            technicianEntry: {
              enteredBy: technicianId,
              enteredAt: new Date(),
            },
          };
        }
        return o;
      });

      const updatedVisit = await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });

      // If this was an Inpatient IPD visit, sync the CPOE order status
      if (visit.ipdAdmissionId) {
        try {
          const CPOEOrder = require('../ipd/cpoe/cpoe-order.model');
          await CPOEOrder.updateMany(
            { admissionId: visit.ipdAdmissionId, labOrderId: order._id },
            { status: 'PROCESSING' }
          ).session(session);
        } catch (cpoeErr) {
          logger.warn(`[LaboratoryService] Notice syncing CPOE order status: ${cpoeErr.message}`);
        }
      }

      logger.info(`[LaboratoryService] Results submitted for order ${orderId} in visit ${visitId} -> AWAITING_VERIFICATION`);
      return updatedVisit;
    });
  }

  /**
   * Record lab-specific pre-vitals (fasting status, pre-scan BP, temp, pulse, SpO2, blood glucose, weight, skip & rollback).
   */
  async recordLabVitals(visitId, orderId, labVitals = {}, staffId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const order = visit.labOrders.find(
        (o) => o._id?.toString() === orderId?.toString() || o.id?.toString() === orderId?.toString()
      );
      if (!order) throw new AppError('NOT_FOUND', 'Lab order not found');

      const isRollback = Boolean(labVitals?.rollback);
      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          if (isRollback) {
            return {
              ...o,
              labVitals: {
                fastingHours: null,
                preScanBp: '',
                temperature: null,
                pulse: null,
                oxygenSaturation: null,
                bloodGlucose: null,
                patientWeightKg: null,
                clinicalNotes: '',
                isSkipped: false,
                skipReason: '',
                recordedBy: null,
                recordedAt: null,
              },
            };
          }

          return {
            ...o,
            labVitals: {
              fastingHours: labVitals.fastingHours !== undefined && labVitals.fastingHours !== null && labVitals.fastingHours !== '' ? Number(labVitals.fastingHours) : null,
              preScanBp: labVitals.preScanBp || '',
              temperature: labVitals.temperature !== undefined && labVitals.temperature !== null && labVitals.temperature !== '' ? Number(labVitals.temperature) : null,
              pulse: labVitals.pulse !== undefined && labVitals.pulse !== null && labVitals.pulse !== '' ? Number(labVitals.pulse) : null,
              oxygenSaturation: labVitals.oxygenSaturation !== undefined && labVitals.oxygenSaturation !== null && labVitals.oxygenSaturation !== '' ? Number(labVitals.oxygenSaturation) : null,
              bloodGlucose: labVitals.bloodGlucose !== undefined && labVitals.bloodGlucose !== null && labVitals.bloodGlucose !== '' ? Number(labVitals.bloodGlucose) : null,
              patientWeightKg: labVitals.patientWeightKg !== undefined && labVitals.patientWeightKg !== null && labVitals.patientWeightKg !== '' ? Number(labVitals.patientWeightKg) : null,
              clinicalNotes: labVitals.clinicalNotes || '',
              isSkipped: Boolean(labVitals.isSkipped),
              skipReason: labVitals.skipReason || '',
              recordedBy: staffId,
              recordedAt: new Date(),
            },
          };
        }
        return o;
      });

      const updatedVisit = await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });
      logger.info(`[LaboratoryService] Lab pre-vitals ${isRollback ? 'rolled back' : (labVitals.isSkipped ? 'skipped' : 'recorded')} for order ${orderId} in visit ${visitId}`);
      return updatedVisit;
    });
  }

  /**
   * Pathologist medical verification & authorization of diagnostic test report.
   * Promotes order status to VERIFIED (or rejects for RECOLLECT_SAMPLE).
   * Supports explicit clinical disposition: 'RETURN_TO_DOCTOR', 'ROUTE_TO_BILLING', 'RECOLLECT_SAMPLE'.
   */
  async verifyResults(
    visitId,
    orderId,
    doctorNotesOrOptions,
    doctorId,
    deltaFlag = false,
    panicValueFlag = false,
    disposition = null,
    clinicalImpression = '',
    rejectionReason = ''
  ) {
    let doctorNotes = typeof doctorNotesOrOptions === 'string' ? doctorNotesOrOptions : '';
    let isDelta = deltaFlag;
    let isPanic = panicValueFlag;
    let targetDisposition = disposition;
    let targetImpression = clinicalImpression;
    let targetRejection = rejectionReason;

    if (typeof doctorNotesOrOptions === 'object' && doctorNotesOrOptions !== null) {
      doctorNotes = doctorNotesOrOptions.doctorNotes || '';
      isDelta = Boolean(doctorNotesOrOptions.deltaFlag);
      isPanic = Boolean(doctorNotesOrOptions.panicValueFlag);
      targetDisposition = doctorNotesOrOptions.disposition || null;
      targetImpression = doctorNotesOrOptions.clinicalImpression || '';
      targetRejection = doctorNotesOrOptions.rejectionReason || '';
    }

    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const order = visit.labOrders.find(
        (o) => o._id?.toString() === orderId?.toString() || o.id?.toString() === orderId?.toString()
      );
      if (!order) throw new AppError('NOT_FOUND', 'Lab order not found');

      // ── Handle Rejection / Specimen Recollection Directive ─────────────────
      if (targetDisposition === 'RECOLLECT_SAMPLE') {
        const updatedLabOrders = visit.labOrders.map((o) => {
          if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
            return {
              ...o,
              status: 'PENDING_SAMPLE',
              sampleCollectedAt: null,
              recollectionRequested: true,
              rejectionReason: targetRejection || doctorNotes || 'Specimen compromised; recollection required.',
              rejectedBy: doctorId,
              rejectedAt: new Date(),
            };
          }
          return o;
        });

        // Clear phlebotomyDispatched so the visit immediately re-appears in the nurse intake queue with Redraw Alert
        const updatedVisit = await visitRepository.updateById(
          visitId,
          { labOrders: updatedLabOrders, status: 'WAITING_LAB', phlebotomyDispatched: false },
          { session }
        );

        logger.info(`[LaboratoryService] Specimen rejected for order ${orderId} in visit ${visitId} -> PENDING_SAMPLE with redraw alert`);
        return updatedVisit;
      }

      // Quality Assurance & HIPAA Chain-of-Custody: Ensure specimen was collected by nurse before medical authorization
      if (order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt) {
        throw new AppError('BUSINESS_002', 'Cannot authorize diagnostic report before specimen is collected and accessioned by the lab nurse.');
      }

      // ── Medical Authorization (VERIFIED) with Digital Signature Stamp ─────
      const crypto = require('crypto');
      const now = new Date();
      let doctorStaff = null;
      if (doctorId) {
        try {
          const Staff = require('../staff/staff.model');
          doctorStaff = await Staff.findById(doctorId).lean();
        } catch (err) {
          logger.warn(`[LaboratoryService] Notice fetching pathologist staff record: ${err.message}`);
        }
      }
      let signerName = 'Authorized Pathologist';
      if (doctorStaff) {
        const rawDoctorName = (doctorStaff.fullName || `${doctorStaff.firstName || ''} ${doctorStaff.lastName || ''}`).trim();
        const cleanDoctorName = rawDoctorName.replace(/^((dr|doctor)\.?\s*)+/i, '').trim();
        const title = doctorStaff.title ? (doctorStaff.title.endsWith('.') ? doctorStaff.title : `${doctorStaff.title}.`) : 'Dr.';
        signerName = cleanDoctorName ? `${title} ${cleanDoctorName}` : (rawDoctorName || 'Authorized Pathologist');
      }
      const licenseNumber = doctorStaff?.licenseNumber || 'MD-PATH-IND-84920';
      const signaturePayload = `${orderId}:${doctorId}:${now.toISOString()}:${doctorNotes || ''}:${targetImpression || ''}`;
      const signatureHash = crypto.createHash('sha256').update(signaturePayload).digest('hex').slice(0, 24).toUpperCase();

      const updatedLabOrders = visit.labOrders.map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          return {
            ...o,
            status: 'VERIFIED',
            recollectionRequested: false,
            rejectionReason: '',
            pathologistVerification: {
              verifiedBy: doctorId,
              verifiedAt: now,
              deltaFlag: isDelta,
              panicValueFlag: isPanic,
              doctorNotes,
              clinicalImpression: targetImpression,
              signerName,
              licenseNumber,
              signatureHash,
            },
          };
        }
        return o;
      });


      const allVerified = updatedLabOrders.every(
        (o) => ['VERIFIED', 'COMPLETED'].includes((o.status || '').toUpperCase())
      );

      const updateData = { labOrders: updatedLabOrders };

      // ── Clinical Disposition & Queue Navigation Routing ───────────────────
      if (targetDisposition === 'RETURN_TO_DOCTOR') {
        updateData.status = 'WAITING_DOCTOR_REVIEW';
        updateData.disposition = {
          status: 'RETURNED_TO_DOCTOR',
          notes: doctorNotes || targetImpression || 'Medically authorized diagnostic report returned to Attending Clinician.',
          dispatchedBy: doctorId,
          dispatchedAt: new Date(),
        };
      } else if (targetDisposition === 'ROUTE_TO_BILLING') {
        updateData.status = 'WAITING_BILLING';
        updateData.disposition = {
          status: 'ROUTED_TO_BILLING',
          notes: doctorNotes || targetImpression || 'Authorized lab report dispatched to Billing / Cashier counter.',
          dispatchedBy: doctorId,
          dispatchedAt: new Date(),
        };

        try {
          const BillService = require('../billing/bill.service');
          const TariffRule = require('../tariff/tariff-rule.model');
          const testName = order.testName || order.name || 'Laboratory Diagnostic Investigation';
          let testTariff = 250;
          const matchedTariff = await TariffRule.findOne({ category: 'LAB_TEST', status: 'PUBLISHED' }).lean();
          if (matchedTariff && typeof matchedTariff.basePrice === 'number') {
            testTariff = matchedTariff.basePrice;
          }
          await BillService.accrueBillableEvent({
            visitId: visit._id,
            patientId: visit.patientId,
            eventType: 'LAB_ORDER_ACCEPTED',
            category: 'DIAGNOSTICS',
            referenceId: order._id || visit._id,
            referenceModel: 'Visit',
            description: `Lab Test: ${testName}`,
            amount: testTariff,
            quantity: 1,
            unitPrice: testTariff,
          });
        } catch (billErr) {
          logger.warn(`[LaboratoryService] Accrue lab order fee notice: ${billErr.message}`);
        }
      } else if (allVerified) {
        // Default routing based on order origin if not explicitly commanded
        if (order.origin === 'DIRECT_WALKIN') {
          updateData.status = 'WAITING_BILLING';
          updateData.disposition = {
            status: 'ROUTED_TO_BILLING',
            notes: 'Direct Walk-In order completed and dispatched to billing.',
            dispatchedBy: doctorId,
            dispatchedAt: new Date(),
          };
        } else {
          updateData.status = 'WAITING_DOCTOR_REVIEW';
          updateData.disposition = {
            status: 'RETURNED_TO_DOCTOR',
            notes: 'Clinical referral lab tests completed and returned to doctor review queue.',
            dispatchedBy: doctorId,
            dispatchedAt: new Date(),
          };
        }
      }

      const updatedVisit = await visitRepository.updateById(visitId, updateData, { session });

      if (updateData.status) {
        try {
          const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
          broadcastPatientStatus({
            patientId: visit.patientId?._id || visit.patientId,
            visitId,
            tokenString: visit.tokenString,
            status: updateData.status,
            stage: updateData.status === 'WAITING_BILLING' ? 'Lab Report Dispatched to Billing' : 'Lab Report Verified - Waiting Doctor Review',
          });
        } catch (_) {}
      }

      // Sync IPD CPOE order if applicable
      if (visit.ipdAdmissionId) {
        try {
          const CPOEOrder = require('../ipd/cpoe/cpoe-order.model');
          await CPOEOrder.updateMany(
            { admissionId: visit.ipdAdmissionId, labOrderId: order._id },
            { status: 'COMPLETED' }
          ).session(session);
        } catch (cpoeErr) {
          logger.warn(`[LaboratoryService] Notice syncing CPOE order status on verification: ${cpoeErr.message}`);
        }
      }

      logger.info(`[LaboratoryService] Pathologist verification completed for order ${orderId} in visit ${visitId} (disposition: ${disposition || 'AUTO'})`);
      return updatedVisit;
    });
  }

  /**
   * Dispatch patient visit directly to either Attending Doctor or Direct Billing.
   * Updates phlebotomy lifecycle tracking, patient disposition, and hospital queue state atomically.
   */
  async dispatchVisit(visitId, disposition, notes, staffId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const updateData = {};
      const now = new Date();

      if (disposition === 'ROUTE_TO_PATHOLOGIST') {
        updateData.status = 'WAITING_LAB';
        updateData.disposition = {
          status: 'IN_PATHOLOGY',
          notes: notes || 'Specimens accessioned & handed over to Diagnostic Lab Doctor for Analysis & Verification.',
          dispatchedBy: staffId,
          dispatchedAt: now,
        };
        updateData.phlebotomyDispatched = true;
        updateData.phlebotomyDispatchedAt = now;
        updateData.phlebotomyDispatchedBy = staffId;
        updateData.phlebotomyDestination = 'PATHOLOGIST';
        updateData.phlebotomyNotes = notes || 'Specimens accessioned and handed over to Diagnostic Lab Doctor for Analysis & Verification.';

        if (Array.isArray(visit.labOrders)) {
          updateData.labOrders = visit.labOrders.map((o) => {
            const currentStatus = (o.status || 'PENDING_SAMPLE').toUpperCase();
            if (currentStatus === 'PENDING_SAMPLE' || currentStatus === 'PROCESSING') {
              return {
                ...o,
                status: 'AWAITING_VERIFICATION',
                sampleCollectedAt: o.sampleCollectedAt || now,
              };
            }
            return o;
          });
        }
      } else if (disposition === 'RETURN_TO_DOCTOR') {
        updateData.status = 'WAITING_DOCTOR_REVIEW';
        updateData.disposition = {
          status: 'RETURNED_TO_DOCTOR',
          notes: notes || 'Specimens collected / Pre-vitals recorded. Dispatched to Attending Doctor Consultation Queue.',
          dispatchedBy: staffId,
          dispatchedAt: now,
        };
        updateData.phlebotomyDispatched = true;
        updateData.phlebotomyDispatchedAt = now;
        updateData.phlebotomyDispatchedBy = staffId;
        updateData.phlebotomyDestination = 'DOCTOR';
        updateData.phlebotomyNotes = notes || 'Specimens collected / Pre-vitals recorded. Dispatched to Attending Doctor for Diagnosis.';
      } else if (disposition === 'ROUTE_TO_BILLING') {
        updateData.status = 'WAITING_BILLING';
        updateData.disposition = {
          status: 'ROUTED_TO_BILLING',
          notes: notes || 'Dispatched directly to Billing counter.',
          dispatchedBy: staffId,
          dispatchedAt: now,
        };
        updateData.phlebotomyDispatched = true;
        updateData.phlebotomyDispatchedAt = now;
        updateData.phlebotomyDispatchedBy = staffId;
        updateData.phlebotomyDestination = 'BILLING';
        updateData.phlebotomyNotes = notes || 'Dispatched directly to Billing counter.';

        try {
          const BillService = require('../billing/bill.service');
          const TariffRule = require('../tariff/tariff-rule.model');
          for (const ord of (visit.labOrders || [])) {
            const testName = ord.testName || ord.name || 'Laboratory Diagnostic Investigation';
            let testTariff = 250;
            const matchedTariff = await TariffRule.findOne({ category: 'LAB_TEST', status: 'PUBLISHED' }).lean();
            if (matchedTariff && typeof matchedTariff.basePrice === 'number') {
              testTariff = matchedTariff.basePrice;
            }
            await BillService.accrueBillableEvent({
              visitId: visit._id,
              patientId: visit.patientId,
              eventType: 'LAB_ORDER_ACCEPTED',
              category: 'DIAGNOSTICS',
              referenceId: ord._id || visit._id,
              referenceModel: 'Visit',
              description: `Lab Diagnostic: ${testName}`,
              amount: testTariff,
              quantity: 1,
              unitPrice: testTariff,
            });
          }
        } catch (billErr) {
          logger.warn(`[LaboratoryService] Accrue phlebotomy lab fees notice: ${billErr.message}`);
        }
      } else {
        throw new AppError('VALIDATION_001', 'Invalid disposition target');
      }

      const updatedVisit = await visitRepository.updateById(visitId, updateData, { session });

      if (updateData.status) {
        try {
          const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
          broadcastPatientStatus({
            patientId: visit.patientId?._id || visit.patientId,
            visitId,
            tokenString: visit.tokenString,
            status: updateData.status,
            stage: updateData.status === 'WAITING_BILLING' ? 'Phlebotomy Dispatched to Billing' : (updateData.status === 'WAITING_DOCTOR_REVIEW' ? 'Specimens Handed Over - Waiting Doctor Review' : 'Specimens in Pathology Lab'),
          });
        } catch (_) {}
      }

      logger.info(`[LaboratoryService] Visit ${visitId} dispatched to ${disposition} by staff ${staffId}`);
      return updatedVisit;
    });
  }

  /**
   * Get laboratory patient history & real-time whereabouts for Phlebotomy / Lab Nurse.
   */
  async getLabHistory(filters = {}, user = {}) {
    const departmentId = filters.departmentId || (user.departmentId ? String(user.departmentId) : null);
    const history = await visitRepository.findLabNurseHistory({
      ...filters,
      departmentId,
    });
    return history;
  }

  /**
   * Record phlebotomy safety screening flags and assign barcode tracking to specimen.
   */
  async recordPhlebotomyRisks(visitId, orderId, risks = {}, staffId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const riskData = (risks && typeof risks === 'object' && risks.risks) ? risks.risks : (risks || {});
      const targetOrderIdStr = (orderId || '').toString();

      const updatedLabOrders = (visit.labOrders || []).map((o) => {
        const orderIdStr = (o._id || o.id || '').toString();
        if (orderIdStr === targetOrderIdStr) {
          const barcode = o.specimenBarcode || `SPEC-${visit.tokenString || 'LAB'}-${orderIdStr.slice(-4).toUpperCase()}`;
          const currentRisks = o.phlebotomyRisks || {};
          return {
            ...o,
            phlebotomyRisks: {
              syncopeRisk: riskData.syncopeRisk !== undefined ? Boolean(riskData.syncopeRisk) : Boolean(currentRisks.syncopeRisk),
              difficultVein: riskData.difficultVein !== undefined ? Boolean(riskData.difficultVein) : Boolean(currentRisks.difficultVein),
              anticoagulantTherapy: riskData.anticoagulantTherapy !== undefined ? Boolean(riskData.anticoagulantTherapy) : Boolean(currentRisks.anticoagulantTherapy),
              latexAllergy: riskData.latexAllergy !== undefined ? Boolean(riskData.latexAllergy) : Boolean(currentRisks.latexAllergy),
            },
            specimenBarcode: barcode,
          };
        }
        return o;
      });

      const updatedVisit = await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });
      return updatedVisit;
    });
  }

  /**
   * Broadcast emergency critical / panic value alert to attending physician and care team.
   */
  async broadcastPanicAlert(visitId, orderId, panicDetails = {}, doctorId) {
    return await withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const now = new Date();
      const updatedLabOrders = (visit.labOrders || []).map((o) => {
        if (o._id.toString() === orderId.toString() || o.id?.toString() === orderId.toString()) {
          const currentVerify = o.pathologistVerification || {};
          return {
            ...o,
            panicAlertBroadcasted: true,
            panicAlertDetails: {
              triggeredAt: now,
              triggeredBy: doctorId,
              panicValues: panicDetails.panicValues || [],
              notes: panicDetails.notes || 'CRITICAL PANIC VALUE ALERT: Immediate clinical intervention required.',
            },
            pathologistVerification: {
              ...currentVerify,
              panicValueFlag: true,
              doctorNotes: `[CRITICAL PANIC ALERT BROADCASTED ${now.toLocaleTimeString()}] ${panicDetails.notes || ''}`.trim(),
            },
          };
        }
        return o;
      });

      const updatedVisit = await visitRepository.updateById(visitId, { labOrders: updatedLabOrders }, { session });
      logger.warn(`[LaboratoryService] EMERGENCY PANIC ALERT triggered for visit ${visitId}, order ${orderId} by staff ${doctorId}`);
      return updatedVisit;
    });
  }

  /**
   * Get chronological historical lab test results for a patient for delta checks and trend charts.
   */
  async getPatientLabHistory(patientId, testCode = null) {
    if (!patientId) throw new AppError('VALIDATION_001', 'Patient ID is required');
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return [];
    }

    const Visit = require('../visits/visit.model');
    const query = {
      patientId,
      'labOrders.0': { $exists: true },
      'labOrders.status': { $in: ['VERIFIED', 'COMPLETED'] },
    };

    const visits = await Visit.find(query)
      .select('createdAt consultation labOrders status tokenString')
      .populate('consultation.doctorId', 'fullName title')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const historyItems = [];
    visits.forEach((v) => {
      (v.labOrders || []).forEach((ord) => {
        if (['VERIFIED', 'COMPLETED'].includes((ord.status || '').toUpperCase())) {
          if (!testCode || ord.testCode === testCode || ord.testName === testCode) {
            historyItems.push({
              visitId: v._id,
              tokenString: v.tokenString,
              date: ord.pathologistVerification?.verifiedAt || ord.processedAt || v.createdAt,
              testName: ord.testName,
              testCode: ord.testCode,
              results: ord.results instanceof Map ? Object.fromEntries(ord.results) : (ord.results || {}),
              pathologist: ord.pathologistVerification,
              doctor: v.consultation?.doctorId?.fullName || 'Attending Doctor',
            });
          }
        }
      });
    });

    return historyItems;
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

    const CloudinaryStorageService = require('../../core/storage/cloudinary-storage.service');

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

      // Quality Assurance & HIPAA Chain-of-Custody: Ensure specimen was collected by nurse before attaching scans
      if (order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt) {
        throw new AppError('BUSINESS_002', 'Cannot attach diagnostic scans before specimen is collected and accessioned by the lab nurse.');
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

    const CloudinaryStorageService = require('../../core/storage/cloudinary-storage.service');
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
