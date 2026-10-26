const mongoose = require('mongoose');
const visitRepository = require('./visit.repository');
const AppError = require('../../core/errors/app-error');
const { withTransaction } = require('../../core/database/transaction');
const tokenGenerator = require('./token-generator.service');
const sequenceService = require('../../core/database/sequence.service');
const Department = require('../administration/department.model');
const cacheService = require('../../core/cache/cache.service');
const { ACTIVE_STATUS_CODES, PATIENT_STATUS_CODES } = require('../../core/constants');

/**
 * VisitService — Orchestrates the patient visit lifecycle.
 *
 * SOLID:
 *   SRP — Each method owns one phase of the lifecycle.
 *   OCP — Token generation delegated to TokenGenerator; adding new status
 *         transitions doesn't require modifying existing methods.
 *   DIP — Depends on repository and token generator abstractions.
 */
class VisitService {

  _broadcastStatus(visit, newStatus, extra = {}) {
    try {
      const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
      if (!visit) return;
      const pid = visit.patientId?._id || visit.patientId;
      broadcastPatientStatus({
        patientId: pid,
        visitId: visit._id,
        tokenString: visit.tokenString,
        status: newStatus,
        departmentId: visit.departmentId?._id || visit.departmentId,
        ...extra,
      });
    } catch (err) {
      // Non-blocking real-time notification
    }
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  async createVisit(data, registeredBy, externalSession = null) {
    const execute = async (session) => {
      // 0. Resolve valid staffId for registeredBy
      let validStaffId = registeredBy;
      if (!validStaffId || !mongoose.Types.ObjectId.isValid(validStaffId)) {
        const Staff = require('../staff/staff.model');
        const fallbackStaff =
          (await Staff.findOne({ status: 'ACTIVE', isDeleted: false }).select('_id').session(session)) ||
          (await Staff.findOne().select('_id').session(session));
        validStaffId = fallbackStaff?._id;
      }

      // Clinical & Operations Guard: Prevent accidental duplicate active visits for the same patient in this department
      if (!data.allowConcurrent && data.patientId) {
        const VisitModel = mongoose.model('Visit');
        const existingActiveVisit = await VisitModel.findOne({
          patientId: data.patientId,
          status: { $in: ACTIVE_STATUS_CODES },
          ...(data.departmentId ? { departmentId: data.departmentId } : {}),
        }).populate('departmentId', 'name code').session(session);

        if (existingActiveVisit) {
          const deptName = existingActiveVisit.departmentId?.name || 'this department';
          throw new AppError(
            'BUSINESS_002',
            `Patient already has an active encounter (${existingActiveVisit.tokenString || existingActiveVisit.visitNumber} - ${existingActiveVisit.status}) in ${deptName}. Please complete or cancel the existing visit, or confirm concurrent encounter.`
          );
        }
      }

      // 1. Generate atomic sequential visit number (Zero-Collision)
      const visitNumber = await sequenceService.getNextSequence('visit', 'VST', session);

      // 2. Determine initial status & token
      let status = 'WAITING_TRIAGE';
      let tokenString = null;
      let tokenSerial = null;

      if (data.isDirectPharmacy) {
        status = 'WAITING_PHARMACY';
        let pharmDept = await Department.findOne({ code: 'PHARM' }).select('name code').session(session);
        if (!pharmDept) {
          pharmDept = { name: 'Pharmacy', code: 'PHARM' };
        }
        const token = await tokenGenerator.generate(pharmDept, session);
        tokenString = token.tokenString;
        tokenSerial = token.tokenSerial;
      } else if (data.visitType === 'EMERGENCY') {
        status = 'WAITING_TRIAGE';
        let emrgDept = null;
        if (data.departmentId) {
          emrgDept = await Department.findById(data.departmentId).select('name code').session(session);
        }
        if (!emrgDept) {
          emrgDept = { name: 'Emergency', code: 'ER' };
        }
        const token = await tokenGenerator.generate(emrgDept, session);
        tokenString = token.tokenString;
        tokenSerial = token.tokenSerial;
      } else {
        // 3. Generate department-prefixed daily token (CARD-014, GEN-001, etc.)
        let department = null;
        if (data.departmentId) {
          department = await Department.findById(data.departmentId).select('name code').session(session);
        }
        const token = await tokenGenerator.generate(department, session);
        tokenString = token.tokenString;
        tokenSerial = token.tokenSerial;
      }

      // 4. Build visit document
      const visitData = {
        visitNumber,
        tokenString,
        tokenSerial,
        patientId:       data.patientId,
        registeredBy:    validStaffId,
        status,
        visitType:       data.visitType || 'OPD',
        reasonForVisit:  data.reasonForVisit || '',
        departmentId:    data.departmentId || null,
        receptionPayment: data.receptionPayment ? {
          registrationFee: Math.max(0, Number(data.receptionPayment.registrationFee) || 0),
          consultationFee: Math.max(0, Number(data.receptionPayment.consultationFee) || 0),
          paymentMethod: data.receptionPayment.paymentMethod || 'Cash',
        } : {
          registrationFee: 0,
          consultationFee: 0,
          paymentMethod: 'Cash',
        },
      };

      // 5. Pre-assign doctor if selected at reception
      if (data.doctorId) {
        visitData.consultation = { doctorId: data.doctorId, status: 'DRAFT' };
      }

      const createdVisit = await visitRepository.create(visitData, session ? { session } : {});

      // Emit VISIT_REGISTERED BillableEvent to create the Bill ledger entry
      setImmediate(async () => {
        try {
          const billingService = require('../billing/bill.service');
          const { getTariffGrade } = require('../../core/constants');
          let tariffGrade = null;
          if (data.doctorId) {
            // Try to get doctor's tariff grade for consultation fee resolution
            const Staff = require('../staff/staff.model');
            const doctor = await Staff.findById(data.doctorId).select('positionRank tariffGrade').lean();
            if (doctor) {
              tariffGrade = doctor.tariffGrade || getTariffGrade(doctor.positionRank || 1);
            }
          }

          await billingService.processBillableEvent({
            type: 'VISIT_REGISTERED',
            visitId: createdVisit._id,
            patientId: data.patientId,
            triggeredBy: validStaffId,
            triggeredAt: new Date(),
            resolutionContext: {
              category: 'REGISTRATION',
              departmentId: data.departmentId || null,
              tariffGrade,
              visitType: data.visitType || 'OPD',
              appointmentType: data.appointmentType || null,
              quantity: 1,
            },
            description: data.visitType === 'IPD' ? 'IPD Admission Fee' : (data.visitType === 'EMERGENCY' ? 'Emergency Intake Fee' : 'OPD Registration Fee'),
          });

          // If reception collected registration fee, record immediate payment credit to keep ledger balanced
          if (data.receptionPayment && Number(data.receptionPayment.registrationFee) > 0) {
            const bill = await billingService.getBillForVisit(createdVisit._id);
            if (bill && (!bill.payments || bill.payments.length === 0)) {
              const collected = Number(data.receptionPayment.registrationFee);
              const maxPayable = bill.billedAmount > 0 ? bill.billedAmount : collected;
              await billingService.recordPayment(bill._id, {
                amount: Math.min(collected, maxPayable),
                method: data.receptionPayment.paymentMethod || 'Cash',
                reference: 'Reception Registration Fee',
              }, validStaffId);
            }
          }
        } catch (err) {
          console.error('[VisitService] Failed to emit VISIT_REGISTERED BillableEvent:', err.message);
        }
      });

      // Real-time broadcast for Reception & queues
      this._broadcastStatus(createdVisit, createdVisit.status, {
        stage: 'Encounter Registered',
      });

      return createdVisit;
    };

    if (externalSession) {
      return await execute(externalSession);
    }
    return withTransaction(execute);
  }

  _assertActivePatient(visit) {
    if (!visit || !visit.patientId || visit.patientId.isDeleted === true || (typeof visit.patientId === 'object' && visit.patientId.isOrphaned === true) || visit.patientId.mrn === 'DELETED-RECORD') {
      throw new AppError('BUSINESS_002', 'Cannot perform clinical action: Patient record has been deleted or is inactive');
    }
  }

  // ── TRIAGE QUEUE ACTIONS ─────────────────────────────────────────────────────

  /**
   * Mark a patient as "called" — their token has been announced.
   * Valid from: WAITING_TRIAGE, WAITING_DOCTOR (nurse or doctor calling).
   */
  async callPatient(visitId, staffId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const callableStatuses = ['WAITING_TRIAGE', 'WAITING_DOCTOR', 'SKIPPED'];
      if (!callableStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot call patient in status: ${visit.status}`);
      }

      const updated = await visitRepository.updateById(visitId, {
        status: 'CALLED',
        calledAt: new Date(),
      }, { session });
      this._broadcastStatus(updated || visit, 'CALLED', { stage: 'Patient Called' });
      return updated;
    });
  }

  /**
   * Skip a patient — they did not respond when called.
   * Token is preserved; patient can be re-queued without a new token.
   * Valid from: CALLED only.
   */
  async skipVisit(visitId, staffId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      if (visit.status !== 'CALLED') {
        throw new AppError('BUSINESS_002', `Can only skip a patient after calling. Current status: ${visit.status}`);
      }

      const updated = await visitRepository.updateById(visitId, {
        status: 'SKIPPED',
        skippedAt: new Date(),
      }, { session });
      this._broadcastStatus(updated || visit, 'SKIPPED', { stage: 'Patient Skipped' });
      return updated;
    });
  }

  /**
   * Re-queue a skipped patient back into the triage or doctor queue.
   * Uses the original token (no new token generated).
   */
  async requeueVisit(visitId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      if (visit.status !== 'SKIPPED') {
        throw new AppError('BUSINESS_002', 'Only SKIPPED visits can be re-queued');
      }

      // If vitals have been recorded, send back to WAITING_DOCTOR; otherwise WAITING_TRIAGE
      const hasVitals = visit.vitals && visit.vitals.chiefComplaint;
      const nextStatus = hasVitals ? 'WAITING_DOCTOR' : 'WAITING_TRIAGE';

      const updated = await visitRepository.updateById(visitId, { status: nextStatus }, { session });
      this._broadcastStatus(updated || visit, nextStatus, { stage: 'Patient Re-queued' });
      return updated;
    });
  }

  /**
   * Fast-track an urgent/special patient directly to the doctor desk (bypassing nurse triage vitals).
   * Valid from: WAITING_TRIAGE or CALLED.
   */
  async skipTriage(visitId, reason, nurseId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const allowable = ['WAITING_TRIAGE', 'CALLED'];
      if (!allowable.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot fast-track / skip triage for visit in status '${visit.status}'`);
      }

      let nurseObjectId = nurseId;
      if (nurseId && mongoose.Types.ObjectId.isValid(nurseId)) {
        nurseObjectId = new mongoose.Types.ObjectId(nurseId);
      }

      const updates = {
        status: 'WAITING_DOCTOR',
        'triage.status': 'SKIPPED',
        'triage.skippedBy': nurseObjectId,
        'triage.skippedAt': new Date(),
        'triage.skipReason': reason || 'Fast-tracked by nurse for direct consultation',
      };

      const updated = await visitRepository.updateById(visitId, updates, { session });
      this._broadcastStatus(updated || visit, 'WAITING_DOCTOR', { stage: 'Triage Skipped / Fast-Tracked' });
      return updated;
    });
  }

  /**
   * Revoke a previously skipped triage and return patient to WAITING_TRIAGE for vitals assessment.
   * Only permissible while patient is still in WAITING_DOCTOR and doctor has not started consultation.
   */
  async revokeTriageSkip(visitId, reason, nurseId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      if (visit.status === 'IN_PROGRESS' || visit.status === 'COMPLETED') {
        throw new AppError('BUSINESS_002', 'Cannot revoke triage skip: Doctor has already commenced consultation.');
      }

      if (visit.status !== 'WAITING_DOCTOR' || visit.triage?.status !== 'SKIPPED') {
        throw new AppError('BUSINESS_002', 'Can only revoke triage skip for patients actively in WAITING_DOCTOR with a skipped triage status.');
      }

      const updates = {
        status: 'WAITING_TRIAGE',
        'triage.status': 'PENDING',
        'triage.revokedBy': nurseId,
        'triage.revokedAt': new Date(),
        'triage.revokeReason': reason || 'Revoked by nurse for complete vitals intake',
      };

      const updated = await visitRepository.updateById(visitId, updates, { session });
      this._broadcastStatus(updated || visit, 'WAITING_TRIAGE', { stage: 'Triage Revoked' });
      return updated;
    });
  }

  /**
   * Cancel a visit and revoke its queue token.
   * Business rule: Allowed ONLY before nursing triage (status WAITING_TRIAGE or CALLED before vitals recorded).
   */
  async cancelVisit(visitId, reason, staffId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      if (visit.status === 'CANCELLED') {
        throw new AppError('BUSINESS_002', 'Visit is already cancelled');
      }

      // Rule: Visits can ONLY be cancelled before nursing triage.
      const cancellableStatuses = ['WAITING_TRIAGE', 'CALLED', 'SKIPPED'];
      const hasCompletedTriage = Boolean(visit.vitals?.recordedAt || visit.vitals?.chiefComplaint);

      if (!cancellableStatuses.includes(visit.status) || (hasCompletedTriage && visit.status !== 'SKIPPED')) {
        throw new AppError(
          'BUSINESS_003',
          `Cannot cancel visit in status '${visit.status}'. Reception can only cancel a visit before nursing triage. Once triage assessment or doctor consultation has begun, cancellation is restricted.`
        );
      }

      const updated = await visitRepository.updateById(
        visitId,
        {
          status: 'CANCELLED',
          cancellationReason: reason || 'Cancelled at reception before nursing triage',
          cancelledAt: new Date(),
          cancelledBy: staffId,
        },
        { session }
      );
      this._broadcastStatus(updated || visit, 'CANCELLED', { stage: 'Visit Cancelled', details: reason });
      return updated;
    });
  }

  // ── VITALS & CONSULTATION ────────────────────────────────────────────────────

  async recordVitals(visitId, vitalsData, nurseId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const allowedStatuses = ['WAITING_TRIAGE', 'CALLED', 'WAITING_DOCTOR'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot record vitals in current status: ${visit.status}`);
      }

      // Enforce department-specific vital fields validation rules and numeric bounds on the backend
      if (visit.departmentId && visit.departmentId.vitalFields && visit.departmentId.vitalFields.length > 0) {
        if (!vitalsData.dynamicVitals) vitalsData.dynamicVitals = {};
        for (const field of visit.departmentId.vitalFields) {
          const rawVal = vitalsData.dynamicVitals[field.name];
          if (field.required && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
            throw new AppError('VALIDATION_001', `${field.label} is required for this department`);
          }

          if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
            if (field.type === 'number') {
              const numVal = Number(rawVal);
              if (Number.isNaN(numVal)) {
                throw new AppError('VALIDATION_001', `${field.label} must be a valid number`);
              }
              if (field.min !== null && field.min !== undefined && numVal < field.min) {
                throw new AppError('VALIDATION_001', `${field.label} cannot be less than ${field.min} ${field.unit || ''}`.trim());
              }
              if (field.max !== null && field.max !== undefined && numVal > field.max) {
                throw new AppError('VALIDATION_001', `${field.label} cannot be greater than ${field.max} ${field.unit || ''}`.trim());
              }
              // Sanitize value to actual number
              vitalsData.dynamicVitals[field.name] = numVal;
            }
          }
        }
      }

      // Update patient-level fields (allergies & operations) atomically
      if (vitalsData.allergies !== undefined || vitalsData.operations !== undefined) {
        const Patient = require('../patient/patient.model');
        const { encryptPatient } = require('../patient/patient.repository');

        const patientUpdates = {};
        if (vitalsData.allergies !== undefined) patientUpdates.allergies = vitalsData.allergies;
        if (vitalsData.operations !== undefined) patientUpdates.operations = vitalsData.operations;

        const encrypted = encryptPatient(patientUpdates);
        await Patient.findByIdAndUpdate(visit.patientId._id || visit.patientId, encrypted, { session });
      }

      // Separate out allergies/operations/doctorId from clinical vitals record
      const { allergies, operations, doctorId, ...cleanVitals } = vitalsData;

      let nurseObjectId = nurseId;
      if (nurseId && mongoose.Types.ObjectId.isValid(nurseId)) {
        nurseObjectId = new mongoose.Types.ObjectId(nurseId);
      }

      const visitUpdates = {
        vitals: {
          ...cleanVitals,
          recordedBy: nurseObjectId,
          recordedAt: new Date(),
        },
        'triage.status': 'COMPLETED',
        status: 'WAITING_DOCTOR',
      };

      if (doctorId) {
        visitUpdates['consultation.doctorId'] = doctorId;
      }

      const updated = await visitRepository.updateById(visitId, visitUpdates, { session });
      this._broadcastStatus(updated || visit, 'WAITING_DOCTOR', { stage: 'Vitals Recorded - Waiting Doctor' });
      return updated;
    });
  }

  async startConsultation(visitId, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND');
      this._assertActivePatient(visit);

      if (visit.status === 'IN_PROGRESS') {
        return visit;
      }

      // Clinical Guard: Doctor can ONLY start consultation after nurse triage is completed or explicitly skipped
      const allowedStatuses = ['WAITING_DOCTOR', 'CALLED'];
      if (!allowedStatuses.includes(visit.status)) {
        if (visit.status === 'WAITING_TRIAGE') {
          throw new AppError('BUSINESS_002', 'Cannot start consultation: Patient has not completed nursing triage. Please wait for nursing triage or have the nurse fast-track the patient.');
        }
        throw new AppError('BUSINESS_002', `Cannot start consultation from status: ${visit.status}`);
      }

      const updated = await visitRepository.updateById(visitId, {
        status: 'IN_PROGRESS',
        calledAt: new Date(),
        'consultation.doctorId': doctorId,
      }, { session });
      this._broadcastStatus(updated || visit, 'IN_PROGRESS', { stage: 'Consultation In Progress', doctorId });
      return updated;
    });
  }

  async _populateLabOrders(labOrders, visitDeptId) {
    if (!labOrders || labOrders.length === 0) return labOrders;
    try {
      const mongoose = require('mongoose');
      const Laboratory = require('../laboratory/laboratory.model');
      
      const validObjectIds = labOrders
        .map(o => o.laboratoryId)
        .filter(id => id && mongoose.Types.ObjectId.isValid(id));
      
      const labsById = validObjectIds.length > 0
        ? await Laboratory.find({ _id: { $in: validObjectIds } }).lean()
        : [];
      
      const allActiveLabs = await Laboratory.find({
        $and: [
          { $or: [{ status: 'Active' }, { isActive: true }, { status: { $exists: false }, isActive: { $exists: false } }] },
          { status: { $ne: 'Inactive' } },
          { isActive: { $ne: false } },
        ]
      }).populate('departmentId').lean();

      const labMap = {};
      labsById.forEach(lab => {
        labMap[lab._id.toString()] = lab;
      });

      return labOrders.map(order => {
        let lab = order.laboratoryId ? labMap[order.laboratoryId.toString()] : null;
        if (!lab && order.laboratoryId) {
          lab = allActiveLabs.find(l => l._id.toString() === order.laboratoryId.toString());
        }
        if (!lab && order.labDepartmentId) {
          lab = allActiveLabs.find(l => {
            const deptId = l.departmentId?._id ? l.departmentId._id.toString() : l.departmentId?.toString();
            return deptId === order.labDepartmentId.toString();
          });
        }
        if (!lab && order.labName) {
          const searchName = order.labName.toLowerCase().replace(/haematology/g, 'hematology');
          lab = allActiveLabs.find(l => {
            const lname = l.name.toLowerCase().replace(/haematology/g, 'hematology');
            return lname.includes(searchName) || searchName.includes(lname);
          });
        }
        if (!lab && order.testName) {
          const testLower = order.testName.toLowerCase().replace(/haematology/g, 'hematology');
          lab = allActiveLabs.find(l => l.testCatalog?.some(t => {
            const tLower = t.name?.toLowerCase().replace(/haematology/g, 'hematology');
            return tLower?.includes(testLower) || testLower.includes(tLower || '');
          }));
        }
        if (!lab && allActiveLabs.length > 0) {
          lab = allActiveLabs[0];
        }

        const labDeptId = lab ? (lab.departmentId?._id || lab.departmentId) : undefined;
        const resolvedLabId = lab ? lab._id : (mongoose.Types.ObjectId.isValid(order.laboratoryId) ? order.laboratoryId : (allActiveLabs[0]?._id || undefined));
        const resolvedDeptId = order.labDepartmentId || labDeptId || visitDeptId;
        const resolvedLabName = order.labName || (lab ? lab.name : 'Clinical Laboratory');

        const matchedTest = lab?.testCatalog?.find(t => t.name?.toLowerCase() === (order.testName || '').toLowerCase());
        const resolvedTestCode = order.testCode || matchedTest?.testCode || (order.testName ? order.testName.toUpperCase().replace(/\s+/g, '_').slice(0, 10) : 'LAB');
        const resolvedReportType = order.reportType || matchedTest?.reportType || (matchedTest?.isDocumentUploadOnly ? 'DOCUMENT_UPLOAD' : 'STRUCTURED_DATA');
        const resolvedIsDocUploadOnly = order.isDocumentUploadOnly !== undefined ? order.isDocumentUploadOnly : Boolean(matchedTest?.isDocumentUploadOnly || matchedTest?.reportType === 'DOCUMENT_UPLOAD');
        const resolvedTemplateLayout = order.templateLayout || matchedTest?.templateLayout || 'STANDARD_NUMERICAL';

        return {
          ...order,
          testCode: resolvedTestCode,
          reportType: resolvedReportType,
          isDocumentUploadOnly: resolvedIsDocUploadOnly,
          templateLayout: resolvedTemplateLayout,
          ...(resolvedLabId ? { laboratoryId: resolvedLabId } : {}),
          ...(resolvedDeptId ? { labDepartmentId: resolvedDeptId } : {}),
          labName: resolvedLabName,
          status: order.status || 'PENDING_SAMPLE',
        };
      });
    } catch (err) {
      console.error('Failed to populate lab orders metadata:', err);
      return labOrders;
    }
  }

  async saveConsultationDraft(visitId, data, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const allowedStatuses = ['WAITING_TRIAGE', 'WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot update consultation in current status: ${visit.status}`);
      }
      if (visit.consultation?.status === 'FINALIZED' && visit.status !== 'WAITING_DOCTOR_REVIEW') {
        throw new AppError('BUSINESS_003', 'Consultation is already finalized and locked.');
      }

      const { prescribedMedications, labOrders, ...consultationData } = data;
      const visitDeptId = visit.departmentId?._id || visit.departmentId;
      const populatedLabOrders = labOrders ? await this._populateLabOrders(labOrders, visitDeptId) : undefined;

      const updatedData = {
        status: 'IN_PROGRESS',
        consultation: {
          ...visit.consultation?.toObject?.() ?? visit.consultation ?? {},
          ...consultationData,
          doctorId,
          status: 'DRAFT',
          recordedAt: new Date(),
        },
      };
      if (prescribedMedications) updatedData.prescribedMedications = prescribedMedications;
      if (populatedLabOrders) updatedData.labOrders = populatedLabOrders;

      return visitRepository.updateById(visitId, updatedData, { session });
    });
  }

  async routeToLaboratory(visitId, data, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const allowedStatuses = ['WAITING_TRIAGE', 'WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot route to laboratory in current status: ${visit.status}`);
      }

      const { prescribedMedications, labOrders, ...consultationData } = data;
      const visitDeptId = visit.departmentId?._id || visit.departmentId;
      const populatedLabOrders = labOrders ? await this._populateLabOrders(labOrders, visitDeptId) : undefined;

      if (!populatedLabOrders || populatedLabOrders.length === 0) {
        throw new AppError('BUSINESS_002', 'Cannot route to laboratory without any diagnostic orders.');
      }

      const updatedData = {
        status: 'WAITING_LAB',
        phlebotomyDispatched: false,
        phlebotomyDispatchedAt: null,
        phlebotomyDispatchedBy: null,
        phlebotomyDestination: null,
        phlebotomyNotes: '',
        consultation: {
          ...visit.consultation?.toObject?.() ?? visit.consultation ?? {},
          ...consultationData,
          doctorId,
          status: 'DRAFT',
          recordedAt: new Date(),
        },
        labOrders: populatedLabOrders,
      };
      if (prescribedMedications) updatedData.prescribedMedications = prescribedMedications;

      const updatedVisit = await visitRepository.updateById(visitId, updatedData, { session });

      this._broadcastStatus(updatedVisit || visit, 'WAITING_LAB', { stage: 'Sent to Laboratory' });

      // Emit DIAGNOSTICS BillableEvents for automated tariff and financial tracking
      setImmediate(async () => {
        try {
          const billingService = require('../billing/bill.service');
          for (const ord of populatedLabOrders) {
            await billingService.processBillableEvent({
              type: 'LAB_ORDER_ACCEPTED',
              visitId: visit._id,
              patientId: visit.patientId?._id || visit.patientId,
              triggeredBy: doctorId,
              triggeredAt: new Date(),
              resolutionContext: {
                category: 'DIAGNOSTICS',
                testCode: ord.testCode || ord.testName,
                departmentId: ord.labDepartmentId || visitDeptId,
                visitType: visit.visitType || 'OPD',
                quantity: 1,
              },
              description: `Laboratory Investigation: ${ord.testName}`,
            });
          }
        } catch (err) {
          console.error('[VisitService] Failed to emit LAB_ORDER_ACCEPTED BillableEvents:', err.message);
        }
      });

      return updatedVisit;
    });
  }

  async finalizeConsultation(visitId, data, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
      this._assertActivePatient(visit);

      const allowedStatuses = ['WAITING_TRIAGE', 'WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot finalize consultation in current status: ${visit.status}`);
      }
      if (visit.consultation?.status === 'FINALIZED' && visit.status !== 'WAITING_DOCTOR_REVIEW') {
        throw new AppError('BUSINESS_003', 'Consultation is already finalized and locked.');
      }

      const labOrdersInput = data.labOrders || data.labTests;
      const { prescribedMedications, labOrders, labTests, ...consultationData } = data;
      const visitDeptId = visit.departmentId?._id || visit.departmentId;
      const populatedLabOrders = labOrdersInput ? await this._populateLabOrders(labOrdersInput, visitDeptId) : undefined;

      let nextStatus = 'WAITING_BILLING';
      const hasPendingLabs = populatedLabOrders?.some(order => order.status !== 'COMPLETED' && order.status !== 'VERIFIED');
      if (hasPendingLabs) {
        nextStatus = 'WAITING_LAB';
      } else if (prescribedMedications?.length > 0) {
        nextStatus = 'WAITING_PHARMACY';
      }

      const updatedData = {
        status: nextStatus,
        consultation: {
          ...visit.consultation?.toObject?.() ?? visit.consultation ?? {},
          ...consultationData,
          doctorId,
          status: hasPendingLabs ? 'DRAFT' : 'FINALIZED',
          recordedAt: new Date(),
        },
      };
      if (prescribedMedications) updatedData.prescribedMedications = prescribedMedications;
      if (populatedLabOrders) updatedData.labOrders = populatedLabOrders;

      const updatedVisit = await visitRepository.updateById(visitId, updatedData, { session });

      // Emit CONSULTATION_COMPLETED BillableEvent to charge consultation fee to patient ledger
      setImmediate(async () => {
        try {
          const billingService = require('../billing/bill.service');
          const Staff = require('../staff/staff.model');
          const { getTariffGrade } = require('../../core/constants');
          const docId = doctorId || visit.consultation?.doctorId;
          let tariffGrade = null;
          let docName = 'Physician Consultation Fee';
          if (docId) {
            const docStaff = await Staff.findById(docId).select('fullName positionRank tariffGrade title').lean();
            if (docStaff) {
              tariffGrade = docStaff.tariffGrade || getTariffGrade(docStaff.positionRank || 1);
              docName = `Consultation — ${docStaff.title || 'Dr.'} ${docStaff.fullName || 'Doctor'}`;
            }
          }

          await billingService.processBillableEvent({
            type: 'CONSULTATION_COMPLETED',
            visitId: visit._id,
            patientId: visit.patientId?._id || visit.patientId,
            triggeredBy: docId || visit.registeredBy,
            triggeredAt: new Date(),
            resolutionContext: {
              category: 'CONSULTATION',
              departmentId: visitDeptId || null,
              tariffGrade,
              staffId: docId || null,
              visitType: visit.visitType || 'OPD',
              quantity: 1,
            },
            description: docName,
          });

          // If new labs were prescribed in this consultation, emit diagnostic charges
          if (populatedLabOrders && populatedLabOrders.length > 0) {
            for (const ord of populatedLabOrders) {
              await billingService.processBillableEvent({
                type: 'LAB_ORDER_ACCEPTED',
                visitId: visit._id,
                patientId: visit.patientId?._id || visit.patientId,
                triggeredBy: docId || visit.registeredBy,
                triggeredAt: new Date(),
                resolutionContext: {
                  category: 'DIAGNOSTICS',
                  testCode: ord.testCode || ord.testName,
                  departmentId: ord.labDepartmentId || visitDeptId,
                  visitType: visit.visitType || 'OPD',
                  quantity: 1,
                },
                description: `Laboratory Investigation: ${ord.testName}`,
              });
            }
          }
        } catch (err) {
          console.error('[VisitService] Failed to emit consultation/lab BillableEvents:', err.message);
        }
      });

      this._broadcastStatus(updatedVisit || visit, nextStatus, {
        stage: nextStatus === 'WAITING_LAB' ? 'Sent to Laboratory' : (nextStatus === 'WAITING_PHARMACY' ? 'Prescription Sent to Pharmacy' : 'Consultation Finalized - Waiting Billing'),
      });

      return updatedVisit;
    });
  }

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  async getQueue(status, filters = {}) {
    const query = { ...filters };
    if (query.startDate || query.endDate) {
      query.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
      delete query.startDate;
      delete query.endDate;
    }
    return visitRepository.getQueue(status, query);
  }

  async getHospitalStats() {
    return cacheService.wrap('stats:hospital:live', 30, async () => {
      let IPDAdmission, BedMaster, OTSession;
    try { IPDAdmission = mongoose.model('IPDAdmission'); } catch (_) {
      try { IPDAdmission = require('../ipd/admission/ipd-admission.model'); } catch (__) {}
    }
    try { BedMaster = mongoose.model('BedMaster'); } catch (_) {
      try { BedMaster = require('../ipd/beds/bed.model'); } catch (__) {}
    }
    try { OTSession = mongoose.model('OTSession'); } catch (_) {
      try { OTSession = require('../ipd/ot/ot-session.model'); } catch (__) {}
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      rawStats, 
      activeDepts, 
      pendingLabs,
      ipdAdmittedCount,
      ipdPendingCount,
      ipdDischargedTodayCount,
      ipdDischargingCount,
      bedTotalCount,
      bedOccupiedCount,
      bedAvailableCount,
      bedMaintenanceCount,
      otScheduledCount,
      otInTheatreCount,
      otPacuCount,
      otCompletedTodayCount,
      ipdEmergencyCount,
      emergencyVisitsCount,
    ] = await Promise.all([
      visitRepository.getHospitalStats(),
      visitRepository.getActiveDepartmentLoads(),
      visitRepository.getPendingLabPressures(),
      // IPD Admission metrics
      IPDAdmission ? IPDAdmission.countDocuments({ status: 'ADMITTED' }).catch(() => 0) : 0,
      IPDAdmission ? IPDAdmission.countDocuments({ status: { $in: ['REQUESTED', 'PENDING_BED', 'PENDING'] } }).catch(() => 0) : 0,
      IPDAdmission ? IPDAdmission.countDocuments({ status: 'DISCHARGED', updatedAt: { $gte: startOfToday } }).catch(() => 0) : 0,
      IPDAdmission ? IPDAdmission.countDocuments({ status: { $in: ['DISCHARGING', 'CLEARANCE_PENDING', 'PENDING_DISCHARGE'] } }).catch(() => 0) : 0,
      // Bed Master metrics
      BedMaster ? BedMaster.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0) : 0,
      BedMaster ? BedMaster.countDocuments({ status: 'OCCUPIED', isDeleted: { $ne: true } }).catch(() => 0) : 0,
      BedMaster ? BedMaster.countDocuments({ status: 'AVAILABLE', isDeleted: { $ne: true } }).catch(() => 0) : 0,
      BedMaster ? BedMaster.countDocuments({ status: { $in: ['MAINTENANCE', 'CLEANING', 'RESERVED', 'BLOCKED'] }, isDeleted: { $ne: true } }).catch(() => 0) : 0,
      // OT Session metrics
      OTSession ? OTSession.countDocuments({ status: { $in: ['SCHEDULED', 'REQUESTED', 'PRE_OP'] } }).catch(() => 0) : 0,
      OTSession ? OTSession.countDocuments({ status: { $in: ['IN_THEATRE', 'IN_PROGRESS', 'SURGERY_IN_PROGRESS'] } }).catch(() => 0) : 0,
      OTSession ? OTSession.countDocuments({ status: { $in: ['PACU', 'RECOVERY'] } }).catch(() => 0) : 0,
      OTSession ? OTSession.countDocuments({ status: 'COMPLETED', updatedAt: { $gte: startOfToday } }).catch(() => 0) : 0,
      // Emergency metrics
      IPDAdmission ? IPDAdmission.countDocuments({ status: 'ADMITTED', admissionType: 'EMERGENCY' }).catch(() => 0) : 0,
      mongoose.model('Visit').countDocuments({ visitType: 'EMERGENCY', status: { $nin: ['COMPLETED', 'CANCELLED', 'CONVERTED_TO_IPD'] } }).catch(() => 0),
    ]);

    let patientIn = rawStats.totalToday || 0;
    let patientOut = rawStats.completedToday || 0;
    let totalCompleted = rawStats.totalCompleted || 0;
    let totalVisits = rawStats.totalAll || 0;
    let pendingLab = 0;
    let pendingPharmacy = 0;
    let pendingBilling = 0;
    let waitingTriage = 0;
    let waitingDoctor = 0;
    let inProgress = 0;
    let skipped = 0;

    rawStats.byStatus.forEach((stat) => {
      if (stat._id === 'WAITING_LAB')                                            pendingLab      += stat.count;
      if (stat._id === 'WAITING_PHARMACY')                                       pendingPharmacy += stat.count;
      if (stat._id === 'WAITING_BILLING')                                        pendingBilling  += stat.count;
      if (stat._id === 'WAITING_TRIAGE' || stat._id === 'CALLED')                 waitingTriage   += stat.count;
      if (stat._id === 'WAITING_DOCTOR' || stat._id === 'WAITING_DOCTOR_REVIEW') waitingDoctor   += stat.count;
      if (stat._id === 'IN_PROGRESS')                                            inProgress      += stat.count;
      if (stat._id === 'SKIPPED')                                                skipped         += stat.count;
    });

    const departmentLoads = activeDepts.reduce((acc, curr) => {
      if (curr._id) acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const laboratoryPressures = pendingLabs.reduce((acc, curr) => {
      if (curr._id) acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const ipdStats = {
      activeAdmissions: ipdAdmittedCount || 0,
      pendingAdmissions: ipdPendingCount || 0,
      dischargingCount: ipdDischargingCount || 0,
      dischargedToday: ipdDischargedTodayCount || 0,
      emergencyAdmitted: ipdEmergencyCount || 0,
    };

    const bedStats = {
      totalBeds: bedTotalCount || 0,
      occupiedBeds: bedOccupiedCount || 0,
      availableBeds: bedAvailableCount || 0,
      maintenanceBeds: bedMaintenanceCount || 0,
      occupancyRate: bedTotalCount > 0 ? Math.round(((bedOccupiedCount || 0) / bedTotalCount) * 100) : 0,
    };

    const surgeryStats = {
      scheduled: otScheduledCount || 0,
      inTheatre: otInTheatreCount || 0,
      pacu: otPacuCount || 0,
      completedToday: otCompletedTodayCount || 0,
      totalToday: (otScheduledCount || 0) + (otInTheatreCount || 0) + (otPacuCount || 0) + (otCompletedTodayCount || 0),
    };

    const emergencyStats = {
      activeCount: (ipdEmergencyCount || 0) + (emergencyVisitsCount || 0),
      ipdCount: ipdEmergencyCount || 0,
      opdCount: emergencyVisitsCount || 0,
    };

    return { 
      patientIn, 
      patientOut, 
      totalCompleted,
      totalVisits,
      pendingLab, 
      pendingPharmacy,
      pendingBilling,
      waitingTriage,
      waitingDoctor,
      inProgress,
      skipped,
      departmentLoads,
      laboratoryPressures,
      ipd: ipdStats,
      beds: bedStats,
      surgeries: surgeryStats,
      emergency: emergencyStats,
    };
    });
  }

  /**
   * Doctor Consultation History (Strictly scoped to logged-in doctor)
   * Returns finalized and completed patient encounters with medications & immutable doctor notes.
   */
  async getDoctorConsultationHistory(doctorId, queryParams = {}) {
    const { page = 1, limit = 50, q = '', startDate, endDate, status, visitType } = queryParams;
    const skip = (Number(page) - 1) * Number(limit);

    const mongoose = require('mongoose');
    const doctorObjectId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const matchConditions = {
      'consultation.doctorId': doctorObjectId,
    };

    if (status && status !== 'ALL' && status !== 'all') {
      matchConditions.status = status;
    }

    if (visitType && visitType !== 'ALL' && visitType !== 'all') {
      matchConditions.visitType = visitType.toUpperCase();
    }

    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          matchConditions.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          matchConditions.createdAt.$lte = end;
        }
      }
    }

    // Query visits matching doctor with populated fields
    const visits = await visitRepository.find(matchConditions, { 'consultation.recordedAt': -1, createdAt: -1 });

    // Client-side text filter on populated patient fields if search string `q` is provided
    let filteredVisits = visits;
    if (q && q.trim()) {
      const queryTerm = q.trim().toLowerCase();
      filteredVisits = visits.filter((v) => {
        const p = v.patientId || {};
        const pName = `${p.firstName || ''} ${p.lastName || ''} ${p.fullName || ''}`.toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const token = (v.tokenString || v.visitNumber || '').toLowerCase();
        const diag = (v.consultation?.diagnosis || '').toLowerCase();
        const reason = (v.reasonForVisit || v.vitals?.chiefComplaint || '').toLowerCase();
        return (
          pName.includes(queryTerm) ||
          mrn.includes(queryTerm) ||
          phone.includes(queryTerm) ||
          token.includes(queryTerm) ||
          diag.includes(queryTerm) ||
          reason.includes(queryTerm)
        );
      });
    }

    const total = filteredVisits.length;
    const paginatedItems = filteredVisits.slice(skip, skip + Number(limit));

    return {
      items: paginatedItems,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Nurse Triage History — Scoped strictly to nurse's department with RBAC isolation.
   * Supports nurse-based filtering ('ALL', 'MY', or specific staff ID), patient search, and metrics.
   */
  async getNurseTriageHistory(nurseId, departmentId, queryParams = {}, user = {}) {
    const {
      page = 1,
      limit = 50,
      q = '',
      startDate,
      endDate,
      status,
      triageStatus,
      nurseFilter,
      filterNurseId,
    } = queryParams;
    const skip = (Number(page) - 1) * Number(limit);

    const mongoose = require('mongoose');
    const Staff = require('../staff/staff.model');

    // 1. RBAC Department Scoping & Resolution
    let resolvedDeptId = departmentId;
    const isSuperAdmin = ['Admin', 'SuperAdmin', 'Administrator'].includes(user.role);

    if (!isSuperAdmin) {
      // Clinical nurses are strictly scoped to their assigned department
      if (user.departmentId) {
        resolvedDeptId = typeof user.departmentId === 'object' ? (user.departmentId._id || user.departmentId.id) : user.departmentId;
      } else if (nurseId && mongoose.Types.ObjectId.isValid(nurseId)) {
        const staffRecord = await Staff.findById(nurseId).select('departmentId').lean();
        if (staffRecord?.departmentId) {
          resolvedDeptId = staffRecord.departmentId;
        }
      }

      if (!resolvedDeptId) {
        throw new AppError('AUTH_003', 'Access denied: Nurse must be assigned to an active clinical department to access triage records.');
      }
    }

    const matchConditions = {};
    if (resolvedDeptId) {
      const deptIds = [resolvedDeptId.toString()];
      if (mongoose.Types.ObjectId.isValid(resolvedDeptId)) {
        deptIds.push(new mongoose.Types.ObjectId(resolvedDeptId));
      }
      matchConditions.departmentId = { $in: deptIds };
    }

    // 2. Triage Status Condition: Must have recorded vitals, completed triage, fast-tracked, or moved forward in clinical pathway
    const isCompletedTriage = {
      $or: [
        { 'vitals.recordedAt': { $exists: true, $ne: null } },
        { 'triage.status': 'COMPLETED' },
        { 'vitals.recordedBy': { $exists: true, $ne: null } },
        { 'vitals.bloodPressure': { $exists: true, $ne: null, $ne: '' } },
        { status: { $in: ['WAITING_DOCTOR', 'IN_PROGRESS', 'WAITING_LAB', 'WAITING_DOCTOR_REVIEW', 'WAITING_PHARMACY', 'WAITING_BILLING', 'COMPLETED'] } },
      ],
    };

    const isSkippedTriage = {
      $or: [
        { 'triage.status': 'SKIPPED' },
        { 'triage.skippedAt': { $exists: true, $ne: null } },
        { 'triage.skippedBy': { $exists: true, $ne: null } },
      ],
    };

    if (triageStatus && triageStatus !== 'ALL' && triageStatus !== 'all') {
      if (triageStatus === 'SKIPPED') {
        matchConditions.$and = matchConditions.$and || [];
        matchConditions.$and.push(isSkippedTriage);
      } else if (triageStatus === 'COMPLETED') {
        matchConditions.$and = matchConditions.$and || [];
        matchConditions.$and.push(isCompletedTriage);
      }
    } else {
      matchConditions.$and = matchConditions.$and || [];
      matchConditions.$and.push({
        $or: [
          ...isCompletedTriage.$or,
          ...isSkippedTriage.$or,
        ],
      });
    }

    // 3. Nurse-based Filtering
    const selectedNurse = nurseFilter || filterNurseId || queryParams.nurseId;
    if (selectedNurse && selectedNurse !== 'ALL' && selectedNurse !== 'all') {
      const targetNurseId = selectedNurse === 'MY' ? nurseId : selectedNurse;
      if (targetNurseId) {
        const nurseObjIds = [targetNurseId.toString()];
        if (mongoose.Types.ObjectId.isValid(targetNurseId)) {
          nurseObjIds.push(new mongoose.Types.ObjectId(targetNurseId));
        }
        matchConditions.$and = matchConditions.$and || [];
        matchConditions.$and.push({
          $or: [
            { 'vitals.recordedBy': { $in: nurseObjIds } },
            { 'triage.skippedBy': { $in: nurseObjIds } },
          ],
        });
      }
    }

    if (status && status !== 'ALL' && status !== 'all') {
      matchConditions.status = status;
    }

    // 4. Date Filtering across all triage activity timestamps
    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const parts = String(startDate).split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          const [sYear, sMonth, sDay] = parts.map(Number);
          const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
          dateRange.$gte = start;
        } else {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            dateRange.$gte = start;
          }
        }
      }
      if (endDate) {
        const parts = String(endDate).split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          const [eYear, eMonth, eDay] = parts.map(Number);
          const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
          dateRange.$lte = end;
        } else {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            dateRange.$lte = end;
          }
        }
      }

      if (Object.keys(dateRange).length > 0) {
        matchConditions.$and = matchConditions.$and || [];
        matchConditions.$and.push({
          $or: [
            { 'vitals.recordedAt': dateRange },
            { 'triage.skippedAt': dateRange },
            { updatedAt: dateRange },
            { createdAt: dateRange },
          ],
        });
      }
    }

    // 5. Fetch all visits matching departmental query (with populated nurse details)
    const visits = await visitRepository.find(matchConditions, {
      'vitals.recordedAt': -1,
      'triage.skippedAt': -1,
      updatedAt: -1,
      createdAt: -1,
    });

    // 6. Pluggable Search Filtering (Name, MRN, Token, Phone, Complaint, Nurse Name)
    let filteredVisits = visits;
    if (q && q.trim()) {
      const queryTerm = q.trim().toLowerCase();
      filteredVisits = visits.filter((v) => {
        const p = v.patientId || {};
        const pName = `${p.firstName || ''} ${p.lastName || ''} ${p.fullName || ''}`.toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const token = (v.tokenString || v.visitNumber || '').toLowerCase();
        const complaint = (v.vitals?.chiefComplaint || v.reasonForVisit || '').toLowerCase();
        const vitalsNurse = v.vitals?.recordedBy?.fullName?.toLowerCase() || '';
        const skipNurse = v.triage?.skippedBy?.fullName?.toLowerCase() || '';
        return (
          pName.includes(queryTerm) ||
          mrn.includes(queryTerm) ||
          phone.includes(queryTerm) ||
          token.includes(queryTerm) ||
          complaint.includes(queryTerm) ||
          vitalsNurse.includes(queryTerm) ||
          skipNurse.includes(queryTerm)
        );
      });
    }

    // 7. Compute Department Triage Metrics & Active Department Nurses List
    let departmentNurses = [];
    if (resolvedDeptId && mongoose.Types.ObjectId.isValid(resolvedDeptId)) {
      const Role = require('../administration/role.model');
      const nurseRoles = await Role.find({
        name: { $in: ['Nurse', 'OPD Nurse', 'IPD Nurse', 'Triage Nurse', 'Head Nurse', 'Lab Nurse'] },
      }).select('_id').lean();
      const nurseRoleIds = nurseRoles.map((r) => r._id);

      departmentNurses = await Staff.find({
        departmentId: new mongoose.Types.ObjectId(resolvedDeptId),
        $or: [
          { roleId: { $in: nurseRoleIds } },
          { position: { $regex: /nurse/i } },
          { nursingLicenseNumber: { $exists: true, $ne: '' } },
        ],
        isDeleted: false,
        status: { $in: ['Active', 'ACTIVE'] },
      })
        .select('_id fullName employeeId position title firstName lastName')
        .sort({ fullName: 1 })
        .lean();
    }

    const total = filteredVisits.length;
    const paginatedItems = filteredVisits.slice(skip, skip + Number(limit));

    // Calculate live department metrics from unpaginated match
    const currentNurseObjIdStr = nurseId ? nurseId.toString() : '';
    const myIntakes = filteredVisits.filter((v) => {
      const recById = v.vitals?.recordedBy?._id || v.vitals?.recordedBy;
      const skipById = v.triage?.skippedBy?._id || v.triage?.skippedBy;
      return (recById && recById.toString() === currentNurseObjIdStr) || (skipById && skipById.toString() === currentNurseObjIdStr);
    }).length;

    const vitalsValidated = filteredVisits.filter((v) => v.vitals?.recordedAt).length;
    const fastTracked = filteredVisits.filter((v) => v.triage?.status === 'SKIPPED').length;
    const completed = filteredVisits.filter((v) => v.status === 'COMPLETED').length;

    return {
      items: paginatedItems,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      departmentNurses,
      metrics: {
        totalIntakes: total,
        myIntakes,
        vitalsValidated,
        fastTracked,
        completed,
      },
    };
  }

  /**
   * Patient Care & Consultation History across all encounters
   * Implements role-based privacy abstraction between clinical staff and reception/patient view.
   */
  async getVisitsByPatientId(patientId, userRole = null) {
    if (!patientId) {
      return [];
    }
    let resolvedId = patientId;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      const Patient = require('../patient/patient.model');
      const patient = await Patient.findOne({ mrn: patientId, isDeleted: { $ne: true } }).select('_id');
      if (patient) {
        resolvedId = patient._id;
      } else {
        return [];
      }
    }
    const visits = await visitRepository.find({ patientId: resolvedId }, { createdAt: -1 });

    // Privacy barrier: Non-clinical roles (Reception/Patient) see patient-facing clinical data,
    // but internal clinical scratch notes are abstracted.
    const isClinicalRole = [
      'Doctor',
      'Surgeon',
      'Nurse',
      'OPD Nurse',
      'IPD Nurse',
      'Lab Nurse',
      'Admin',
      'SuperAdmin',
      'Administrator',
    ].includes(userRole);

    if (!isClinicalRole) {
      return visits.map((v) => {
        const clone = { ...v };
        if (clone.consultation) {
          clone.consultation = {
            doctorId: clone.consultation.doctorId,
            diagnosis: clone.consultation.diagnosis,
            treatmentPlan: clone.consultation.treatmentPlan,
            status: clone.consultation.status,
            recordedAt: clone.consultation.recordedAt,
            // Abstract confidential doctor scratch notes from non-clinical reception screen
            notes: clone.consultation.notes ? 'Consultation completed and documented by attending clinician.' : '',
            differentials: undefined,
            prognosis: clone.consultation.prognosis,
          };
        }
        return clone;
      });
    }

    return visits;
  }
}

module.exports = new VisitService();
