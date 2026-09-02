const visitRepository = require('./visit.repository');
const AppError = require('../../core/errors/AppError');
const { withTransaction } = require('../../core/database/transaction');
const tokenGenerator = require('./token.generator');
const sequenceService = require('../../core/database/sequence.service');
const Department = require('../administration/department.model');

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

  // ── CREATE ──────────────────────────────────────────────────────────────────

  async createVisit(data, registeredBy, externalSession = null) {
    const execute = async (session) => {
      // 1. Generate atomic sequential visit number (Zero-Collision)
      const visitNumber = await sequenceService.getNextSequence('visit', 'VST', session);

      // 2. Determine initial status
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
        registeredBy,
        status,
        visitType:       data.visitType || 'OPD',
        reasonForVisit:  data.reasonForVisit || '',
        departmentId:    data.departmentId || null,
        receptionPayment: data.receptionPayment || {
          registrationFee: 0,
          consultationFee: 0,
          paymentMethod:   'Cash',
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
            triggeredBy: registeredBy,
            triggeredAt: new Date(),
            resolutionContext: {
              category: 'REGISTRATION',
              departmentId: data.departmentId || null,
              tariffGrade,
              visitType: data.visitType || 'OPD',
              appointmentType: data.appointmentType || null,
              quantity: 1,
            },
            description: 'OPD Registration Fee',
          });
        } catch (err) {
          console.error('[VisitService] Failed to emit VISIT_REGISTERED BillableEvent:', err.message);
        }
      });

      return createdVisit;
    };

    if (externalSession) {
      return await execute(externalSession);
    }
    return withTransaction(execute);
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

      const callableStatuses = ['WAITING_TRIAGE', 'WAITING_DOCTOR', 'SKIPPED'];
      if (!callableStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot call patient in status: ${visit.status}`);
      }

      return visitRepository.updateById(visitId, {
        status: 'CALLED',
        calledAt: new Date(),
      }, { session });
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

      if (visit.status !== 'CALLED') {
        throw new AppError('BUSINESS_002', `Can only skip a patient after calling. Current status: ${visit.status}`);
      }

      return visitRepository.updateById(visitId, {
        status: 'SKIPPED',
        skippedAt: new Date(),
      }, { session });
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

      if (visit.status !== 'SKIPPED') {
        throw new AppError('BUSINESS_002', 'Only SKIPPED visits can be re-queued');
      }

      // If vitals have been recorded, send back to WAITING_DOCTOR; otherwise WAITING_TRIAGE
      const hasVitals = visit.vitals && visit.vitals.chiefComplaint;
      const nextStatus = hasVitals ? 'WAITING_DOCTOR' : 'WAITING_TRIAGE';

      return visitRepository.updateById(visitId, { status: nextStatus }, { session });
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

      return visitRepository.updateById(
        visitId,
        {
          status: 'CANCELLED',
          cancellationReason: reason || 'Cancelled at reception before nursing triage',
          cancelledAt: new Date(),
          cancelledBy: staffId,
        },
        { session }
      );
    });
  }

  // ── VITALS & CONSULTATION ────────────────────────────────────────────────────

  async recordVitals(visitId, vitalsData, nurseId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const allowedStatuses = ['WAITING_TRIAGE', 'CALLED', 'WAITING_DOCTOR'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot record vitals in current status: ${visit.status}`);
      }

      // Enforce department-specific vital fields validation rules on the backend
      if (visit.departmentId && visit.departmentId.vitalFields && visit.departmentId.vitalFields.length > 0) {
        for (const field of visit.departmentId.vitalFields) {
          const val = vitalsData.dynamicVitals?.[field.name];
          if (field.required && (val === undefined || val === null || val === '')) {
            throw new AppError('VALIDATION_001', `${field.label} is required for this department`);
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

      const visitUpdates = {
        vitals: {
          ...cleanVitals,
          recordedBy: nurseId,
          recordedAt: new Date(),
        },
        status: 'WAITING_DOCTOR',
      };

      if (doctorId) {
        visitUpdates['consultation.doctorId'] = doctorId;
      }

      return visitRepository.updateById(visitId, visitUpdates, { session });
    });
  }

  async startConsultation(visitId, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND');

      const allowedStatuses = ['WAITING_DOCTOR', 'CALLED'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot start consultation from status: ${visit.status}`);
      }

      return visitRepository.updateById(visitId, {
        status: 'IN_PROGRESS',
        calledAt: new Date(),
        'consultation.doctorId': doctorId,
      }, { session });
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
      
      const allActiveLabs = await Laboratory.find({ isActive: true }).lean();

      const labMap = {};
      labsById.forEach(lab => {
        labMap[lab._id.toString()] = lab;
      });

      return labOrders.map(order => {
        let lab = order.laboratoryId ? labMap[order.laboratoryId.toString()] : null;
        if (!lab && order.labName) {
          lab = allActiveLabs.find(l => l.name.toLowerCase() === order.labName.toLowerCase());
        }
        if (!lab && allActiveLabs.length > 0) {
          lab = allActiveLabs.find(l => l.testCatalog?.some(t => t.name === order.testName)) || allActiveLabs[0];
        }

        const resolvedLabId = lab ? lab._id : (mongoose.Types.ObjectId.isValid(order.laboratoryId) ? order.laboratoryId : (allActiveLabs[0]?._id || undefined));
        const resolvedDeptId = order.labDepartmentId || (lab ? lab.departmentId : undefined) || visitDeptId;
        const resolvedLabName = order.labName || (lab ? lab.name : 'Clinical Laboratory');

        return {
          ...order,
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

      const allowedStatuses = ['WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
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

      const allowedStatuses = ['WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
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

      return visitRepository.updateById(visitId, updatedData, { session });
    });
  }

  async finalizeConsultation(visitId, data, doctorId) {
    return withTransaction(async (session) => {
      const visit = await visitRepository.findById(visitId, { session });
      if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

      const allowedStatuses = ['WAITING_DOCTOR', 'CALLED', 'IN_PROGRESS', 'WAITING_DOCTOR_REVIEW'];
      if (!allowedStatuses.includes(visit.status)) {
        throw new AppError('BUSINESS_002', `Cannot finalize consultation in current status: ${visit.status}`);
      }
      if (visit.consultation?.status === 'FINALIZED' && visit.status !== 'WAITING_DOCTOR_REVIEW') {
        throw new AppError('BUSINESS_003', 'Consultation is already finalized and locked.');
      }

      const { prescribedMedications, labOrders, ...consultationData } = data;
      const visitDeptId = visit.departmentId?._id || visit.departmentId;
      const populatedLabOrders = labOrders ? await this._populateLabOrders(labOrders, visitDeptId) : undefined;

      let nextStatus = 'COMPLETED';
      const hasPendingLabs = populatedLabOrders?.some(order => order.status !== 'COMPLETED');
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

      return visitRepository.updateById(visitId, updatedData, { session });
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
    const [rawStats, activeDepts, pendingLabs] = await Promise.all([
      visitRepository.getHospitalStats(),
      visitRepository.getActiveDepartmentLoads(),
      visitRepository.getPendingLabPressures(),
    ]);

    let patientIn = rawStats.totalToday || 0;
    let patientOut = rawStats.completedToday || 0;
    let totalCompleted = rawStats.totalCompleted || 0;
    let totalVisits = rawStats.totalAll || 0;
    let pendingLab = 0;
    let pendingPharmacy = 0;
    let waitingTriage = 0;
    let waitingDoctor = 0;
    let inProgress = 0;
    let skipped = 0;

    rawStats.byStatus.forEach((stat) => {
      if (stat._id === 'WAITING_LAB')                                            pendingLab      += stat.count;
      if (stat._id === 'WAITING_PHARMACY')                                       pendingPharmacy += stat.count;
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

    return { 
      patientIn, 
      patientOut, 
      totalCompleted,
      totalVisits,
      pendingLab, 
      pendingPharmacy,
      waitingTriage,
      waitingDoctor,
      inProgress,
      skipped,
      departmentLoads,
      laboratoryPressures,
    };
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
   * Patient Care & Consultation History across all encounters
   * Implements role-based privacy abstraction between clinical staff and reception/patient view.
   */
  async getVisitsByPatientId(patientId, userRole = null) {
    const visits = await visitRepository.find({ patientId }, { createdAt: -1 });

    // Privacy barrier: Non-clinical roles (Reception/Patient) see patient-facing clinical data,
    // but internal clinical scratch notes are abstracted.
    const isClinicalRole = ['Doctor', 'Nurse', 'Admin', 'SuperAdmin', 'Administrator'].includes(userRole);

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
