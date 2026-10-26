/**
 * modules/ipd/admission/ipd-admission.service.js
 * Inpatient admission lifecycle management with atomic ACID guarantees.
 */
const mongoose = require('mongoose');
const ipdAdmissionRepository = require('./ipd-admission.repository');
const bedRepository = require('../beds/bed.repository');
const Patient = require('../../patient/patient.model');
const Bill = require('../../billing/bill.model');
const AdvanceDeposit = require('../billing/advance-deposit.model');
const IPDClearance = require('../discharge/ipd-clearance.model');
const AppError = require('../../../core/errors/app-error');
const auditService = require('../../audit/audit.service');
const sequenceService = require('../../../core/database/sequence.service');
const { withTransaction } = require('../../../core/database/transaction');

class IPDAdmissionService {
  async admitPatient(data, admittedByStaffId, externalSession = null) {
    const execute = async (session) => {
      // 0. Resolve valid staffId for registration and audit
      let validStaffId = admittedByStaffId;
      if (!validStaffId || !mongoose.Types.ObjectId.isValid(validStaffId)) {
        const Staff = require('../../staff/staff.model');
        const fallbackStaff =
          (await Staff.findOne({ status: 'ACTIVE', isDeleted: false }).select('_id').session(session)) ||
          (await Staff.findOne().select('_id').session(session));
        validStaffId = fallbackStaff?._id;
      }

      // 1. Verify Patient
      const patient = await Patient.findById(data.patientId).session(session);
      if (!patient) throw new AppError('Patient not found', 404, 'NOT_FOUND');

      // Check if patient is already actively admitted inside transaction
      const existingAdmission = await ipdAdmissionRepository.getAdmissions(
        {
          patientId: data.patientId,
          status: 'ADMITTED',
        },
        session
      );
      if (existingAdmission && existingAdmission.length > 0) {
        throw new AppError('Patient is already actively admitted in IPD', 409, 'ALREADY_ADMITTED');
      }

      // 1.1 Verify Bed Existence and Gender Privacy Compatibility
      const BedMaster = require('../beds/bed.model');
      const RoomMaster = require('../beds/room.model');
      const targetBedDoc = await BedMaster.findById(data.bedId).session(session);
      if (!targetBedDoc || !targetBedDoc.isActive) {
        throw new AppError('Selected bed could not be found or is inactive.', 404, 'NOT_FOUND');
      }
      const targetRoomDoc = await RoomMaster.findById(targetBedDoc.roomId).session(session);
      this._validateGenderCompatibility(patient, targetBedDoc, targetRoomDoc);

      // 2. Atomic Compare-And-Swap (CAS) Bed Claim Guard
      const bed = await bedRepository.claimBedAtomically(
        data.bedId,
        {
          status: 'OCCUPIED',
          currentPatientId: patient._id,
        },
        session
      );
      if (!bed) {
        throw new AppError(
          'Selected bed was just claimed by another clinician or is no longer vacant. Please select another bed.',
          409,
          'BED_NOT_AVAILABLE'
        );
      }

      // 3. Generate Sequential Admission Number (Atomic Zero-Collision)
      const admissionNumber = await sequenceService.getNextSequence('admission', 'ADM', session);

      // 3.1. Resolve Authoritative Centralized Tariffs
      const tariffResolver = require('../../tariff/tariff-resolver.service');
      const { getTariffGrade } = require('../../../core/constants');

      // A. Resolve Bed Tariff (Daily & Hourly)
      const bedTariff = await tariffResolver.resolve({
        category: 'BED_CHARGES',
        wardClass: bed.wardClass,
        floorId: bed.floorId?._id || bed.floorId,
        comfortTier: bed.comfortTier || 'STANDARD',
        sharingType: bed.sharingType || 'GENERAL_WARD',
        visitType: 'IPD',
      });

      const dailyRateApplied = bed.dailyRateOverride != null && bed.dailyRateOverride > 0
        ? bed.dailyRateOverride
        : (bed.roomId?.baseTariff != null && bed.roomId?.baseTariff > 0 ? bed.roomId.baseTariff : bedTariff.dailyRate);

      const hourlyRateApplied = bed.hourlyRateOverride != null && bed.hourlyRateOverride > 0
        ? bed.hourlyRateOverride
        : (bedTariff.hourlyRate || Math.round(dailyRateApplied / 24));

      // B. Resolve IPD Admission Registration Fee
      const regTariff = await tariffResolver.resolve({
        category: 'REGISTRATION',
        visitType: 'IPD',
        departmentId: data.admittingDepartmentId,
      });

      // C. Resolve Doctor Inpatient Admission Assessment Fee
      let doctorTariffGrade = null;
      if (data.primaryDoctorId) {
        const Staff = require('../../staff/staff.model');
        const docObj = await Staff.findById(data.primaryDoctorId).select('positionRank tariffGrade').session(session);
        if (docObj) {
          doctorTariffGrade = docObj.tariffGrade || getTariffGrade(docObj.positionRank || 1);
        }
      }

      const docTariff = await tariffResolver.resolve({
        category: 'CONSULTATION',
        visitType: 'IPD',
        departmentId: data.admittingDepartmentId,
        tariffGrade: doctorTariffGrade,
        staffId: data.primaryDoctorId,
      });

      // D. Build Initial Authoritative Line Items
      const lineItems = [];
      let initialBilledAmount = 0;

      if (regTariff && typeof regTariff.amount === 'number' && regTariff.amount >= 0) {
        lineItems.push({
          eventType: 'VISIT_REGISTERED',
          category: 'REGISTRATION',
          description: regTariff.amount === 0
            ? `IPD Inpatient Admission Registration (Complimentary / Waived — ${regTariff.explanation})`
            : `IPD Inpatient Admission Registration (${regTariff.explanation})`,
          snapshotPrice: regTariff.amount,
          quantity: 1,
          lineTotal: regTariff.amount,
          snapshotRuleId: regTariff.ruleId || null,
          snapshotRulePath: regTariff.explanation || '',
          addedBy: validStaffId,
        });
        initialBilledAmount += regTariff.amount;
      }

      if (docTariff && typeof docTariff.amount === 'number' && docTariff.amount >= 0) {
        lineItems.push({
          eventType: 'CONSULTATION_COMPLETED',
          category: 'CONSULTATION',
          description: docTariff.amount === 0
            ? `IPD Doctor Admission Assessment (Complimentary / Waived — ${docTariff.explanation})`
            : `IPD Doctor Admission Assessment (${docTariff.explanation})`,
          snapshotPrice: docTariff.amount,
          quantity: 1,
          lineTotal: docTariff.amount,
          snapshotRuleId: docTariff.ruleId || null,
          snapshotRulePath: docTariff.explanation || '',
          addedBy: validStaffId,
        });
        initialBilledAmount += docTariff.amount;
      }

      const depositAmount = data.initialDepositAmount || 0;
      const initialOutstanding = Math.max(0, initialBilledAmount - depositAmount);

      const payments = [];
      if (depositAmount > 0) {
        const payMethod = (data.paymentMethod || data.depositPaymentMethod || 'Cash');
        const validMethod = ['Cash', 'UPI', 'Card', 'Insurance', 'WaivedOff'].find(
          (m) => m.toLowerCase() === payMethod.toLowerCase()
        ) || 'Cash';

        payments.push({
          amount: depositAmount,
          method: validMethod,
          reference: data.transactionReference || 'INITIAL_IPD_DEPOSIT',
          recordedBy: validStaffId,
          recordedAt: new Date(),
        });
      }

      // 4. Create Inpatient Master Bill
      const billDocs = await Bill.create(
        [
          {
            billNumber: `BILL-${admissionNumber}`,
            patientId: patient._id,
            visitType: 'IPD',
            serviceDate: new Date(),
            billedAmount: initialBilledAmount,
            collectedAmount: depositAmount,
            advanceCollected: depositAmount,
            outstandingAmount: initialOutstanding,
            status: 'OPEN',
            lineItems,
            payments,
            generatedBy: validStaffId,
          },
        ],
        session ? { session } : {}
      );
      const bill = billDocs[0];

      // 5. Create IPDAdmission Document
      const admissionDocs = await ipdAdmissionRepository.createAdmission(
        {
          admissionNumber,
          patientId: patient._id,
          primaryDoctorId: data.primaryDoctorId,
          admittingDepartmentId: data.admittingDepartmentId,
          currentBedId: bed._id,
          currentRoomId: bed.roomId?._id || bed.roomId,
          currentFloorId: bed.floorId?._id || bed.floorId,
          admissionType: data.admissionType || 'PLANNED',
          sourceVisitId: data.sourceVisitId || null,
          conversionType: data.conversionType || (data.sourceVisitId ? 'OPD_CONVERSION' : 'DIRECT_ADMISSION'),
          provisionalDiagnosis: data.provisionalDiagnosis,
          chiefComplaints: data.chiefComplaints || '',
          carePlan: data.carePlan || '',
          dietTier: data.dietTier || 'REGULAR_DIET',
          billId: bill._id,
          admittedBy: validStaffId,
        },
        session
      );
      const admission = admissionDocs[0] || admissionDocs;

      // Update Bill with admissionId
      await Bill.updateOne(
        { _id: bill._id },
        { admissionId: admission._id },
        session ? { session } : {}
      );

      // 6. Occupy Bed
      await bedRepository.updateBed(
        bed._id,
        {
          status: 'OCCUPIED',
          currentAdmissionId: admission._id,
          currentPatientId: patient._id,
        },
        session
      );

      // 7. Create Initial BedAllocation Record with Inherited Centralized Tariff
      await bedRepository.createAllocation(
        {
          admissionId: admission._id,
          patientId: patient._id,
          bedId: bed._id,
          roomId: bed.roomId?._id || bed.roomId,
          floorId: bed.floorId?._id || bed.floorId,
          wardClass: bed.wardClass,
          comfortTier: bed.comfortTier || 'STANDARD',
          sharingType: bed.sharingType || 'GENERAL_WARD',
          dailyRateApplied,
          hourlyRateApplied,
          transferredBy: validStaffId,
          transferReason: 'Initial IPD Admission',
        },
        session
      );

      // 8. Record Initial Advance Deposit if provided
      if (data.initialDepositAmount && data.initialDepositAmount > 0) {
        const payMethod = (data.paymentMethod || data.depositPaymentMethod || 'CASH').toUpperCase();
        await AdvanceDeposit.create(
          [
            {
              admissionId: admission._id,
              patientId: patient._id,
              receiptNumber: `DEP-${admissionNumber}-01`,
              amount: data.initialDepositAmount,
              paymentMethod: payMethod,
              transactionReference: data.transactionReference || '',
              collectedBy: validStaffId,
              notes: 'Initial admission advance deposit',
            },
          ],
          session ? { session } : {}
        );
      }

      // 9. Initialize 3-Way Discharge Clearance Record
      await IPDClearance.create(
        [
          {
            admissionId: admission._id,
            patientId: patient._id,
            initiatedBy: validStaffId,
          },
        ],
        session ? { session } : {}
      );

      // 10. Initialize Operational Encounter Visit for Inpatient Stay
      const Visit = require('../../visits/visit.model');
      await Visit.create(
        [
          {
            visitNumber: `VIS-IPD-${admissionNumber}`,
            tokenString: `IPD-${admissionNumber.slice(-4)}`,
            tokenSerial: 1,
            patientId: patient._id,
            registeredBy: validStaffId,
            departmentId: data.admittingDepartmentId,
            ipdAdmissionId: admission._id,
            visitType: 'IPD',
            status: 'IN_PROGRESS',
            reasonForVisit: `Inpatient Admission: ${data.provisionalDiagnosis || 'IPD Care'}`,
            consultation: {
              doctorId: data.primaryDoctorId,
              status: 'DRAFT',
              recordedAt: new Date(),
            },
            labOrders: [],
          },
        ],
        session ? { session } : {}
      );

      return admission;
    };

    if (externalSession) {
      return execute(externalSession);
    }

    const admission = await withTransaction(execute);

    // Audit trail (without PHI)
    try {
      auditService.logEvent(
        admittedByStaffId,
        'ClinicalStaff',
        'PATIENT_ADMITTED_IPD',
        admission._id,
        {
          admissionNumber: admission.admissionNumber,
          bedId: data.bedId,
        }
      );
    } catch (auditErr) {
      console.warn('Non-blocking audit log failure:', auditErr.message);
    }

    return admission;
  }

  async getAdmissions(query) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.primaryDoctorId) filter.primaryDoctorId = query.primaryDoctorId;
    if (query.admittingDepartmentId) filter.admittingDepartmentId = query.admittingDepartmentId;
    return ipdAdmissionRepository.getAdmissions(filter);
  }

  /**
   * Retrieves paginated inpatient history with clinical telemetry, LOS calculation,
   * doctor-centric filtering (primary doctor OR rounds consulting doctor), and search.
   */
  async getAdmissionHistory(query = {}) {
    const WardRound = require('../cpoe/ward-round.model');
    const IPDAdmission = require('./ipd-admission.model');

    const filter = {};
    const {
      doctorId,
      status,
      search,
      q,
      startDate,
      endDate,
      departmentId,
      page = 1,
      limit = 50,
    } = query;

    // 1. Doctor-Centric Filtering: primary doctor OR rounds consulting doctor
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      const doctorObjId = new mongoose.Types.ObjectId(doctorId);
      const roundedAdmissionIds = await WardRound.find({ doctorId: doctorObjId }).distinct('admissionId');
      filter.$or = [
        { primaryDoctorId: doctorObjId },
        { _id: { $in: roundedAdmissionIds } },
      ];
    }

    // 2. Department Filtering
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      filter.admittingDepartmentId = departmentId;
    }

    // 3. Status Filtering
    if (status && status !== 'ALL') {
      if (status === 'ACTIVE' || status === 'ADMITTED') {
        filter.status = { $in: ['ADMITTED', 'DISCHARGE_INITIATED'] };
      } else if (status === 'TRANSFERRED') {
        filter.status = 'TRANSFERRED_OUT';
      } else {
        filter.status = status;
      }
    }

    // 4. Date Range Filtering (Admission date boundary)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.admissionDate = { $gte: start, $lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.admissionDate = { $gte: start };
    }

    // 5. Query Admissions with Populations
    const rawAdmissions = await ipdAdmissionRepository.getAdmissions(filter);

    // 6. Enrich with Ward Rounds Count, Latest Round & LOS
    const admissionIds = rawAdmissions.map((adm) => adm._id);

    // Batch aggregate ward rounds by admissionId
    const roundsStats = await WardRound.aggregate([
      { $match: { admissionId: { $in: admissionIds } } },
      { $sort: { roundDate: -1 } },
      {
        $group: {
          _id: '$admissionId',
          count: { $sum: 1 },
          latestRoundDate: { $first: '$roundDate' },
          latestCondition: { $first: '$conditionAssessment' },
          latestDoctorId: { $first: '$doctorId' },
        },
      },
    ]);

    const roundsMap = new Map();
    roundsStats.forEach((r) => {
      roundsMap.set(String(r._id), r);
    });

    const searchTerm = (search || q || '').trim().toLowerCase();

    // Enrich and calculate LOS
    let enrichedList = rawAdmissions.map((adm) => {
      const p = adm.patientId || {};
      const rStat = roundsMap.get(String(adm._id)) || { count: 0, latestRoundDate: null, latestCondition: null };

      const admDate = adm.admissionDate ? new Date(adm.admissionDate) : new Date(adm.createdAt);
      const disDate = adm.dischargeDate ? new Date(adm.dischargeDate) : new Date();
      const losMs = Math.max(0, disDate - admDate);
      const losDays = Math.max(1, Math.ceil(losMs / (1000 * 60 * 60 * 24)));

      const patientName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      const bedLabel = adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '—';

      return {
        ...adm,
        losDays,
        wardRoundsCount: rStat.count,
        latestRound: {
          roundDate: rStat.latestRoundDate,
          condition: rStat.latestCondition,
        },
        searchIndex: `${adm.admissionNumber || ''} ${p.mrn || ''} ${patientName} ${p.phone || ''} ${bedLabel} ${adm.provisionalDiagnosis || ''} ${adm.dischargeSummary?.finalDiagnosis || ''}`.toLowerCase(),
      };
    });

    // 7. In-memory search filtering (on decrypted PHI & computed fields)
    if (searchTerm) {
      enrichedList = enrichedList.filter((item) => item.searchIndex.includes(searchTerm));
    }

    // 8. Compute High-Level Telemetry Metrics
    const totalCount = enrichedList.length;
    const activeCount = enrichedList.filter((a) => ['ADMITTED', 'DISCHARGE_INITIATED'].includes(a.status)).length;
    const dischargedCount = enrichedList.filter((a) => a.status === 'DISCHARGED').length;
    const transferredCount = enrichedList.filter((a) => a.status === 'TRANSFERRED_OUT').length;
    const totalLos = enrichedList.reduce((acc, curr) => acc + (curr.losDays || 1), 0);
    const avgLosDays = totalCount > 0 ? (totalLos / totalCount).toFixed(1) : '0.0';

    // 9. Pagination
    const numLimit = Math.max(1, parseInt(limit, 10) || 50);
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const startIndex = (numPage - 1) * numLimit;
    const paginatedItems = enrichedList.slice(startIndex, startIndex + numLimit).map(({ searchIndex, ...item }) => item);

    return {
      items: paginatedItems,
      total: totalCount,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(totalCount / numLimit) || 1,
      stats: {
        totalCount,
        activeCount,
        dischargedCount,
        transferredCount,
        avgLosDays: Number(avgLosDays),
      },
    };
  }

  /**
   * Retrieves complete 360-degree Inpatient Case File for an admission
   * (Admission details, patient demographics, chronological daily SOAP rounds, CPOE orders, and discharge summary).
   */
  async getAdmissionCaseFile(admissionId) {
    const WardRound = require('../cpoe/ward-round.model');
    const CPOEOrder = require('../cpoe/cpoe-order.model');
    const IPDClearance = require('../discharge/ipd-clearance.model');
    const VitalsFlowsheet = require('../nursing/vitals-flowsheet.model');

    const admission = await this.getAdmissionById(admissionId);

    const [wardRounds, cpoeOrders, clearance, vitals] = await Promise.all([
      WardRound.find({ admissionId })
        .populate('doctorId', 'firstName lastName employeeId position')
        .sort({ roundDate: 1 })
        .lean(),
      CPOEOrder.find({ admissionId })
        .populate('orderedBy', 'firstName lastName employeeId')
        .sort({ createdAt: -1 })
        .lean(),
      IPDClearance.findOne({ admissionId }).lean(),
      VitalsFlowsheet.find({ admissionId })
        .sort({ recordedAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const admDate = admission.admissionDate ? new Date(admission.admissionDate) : new Date(admission.createdAt);
    const disDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const losMs = Math.max(0, disDate - admDate);
    const losDays = Math.max(1, Math.ceil(losMs / (1000 * 60 * 60 * 24)));

    return {
      admission,
      patient: admission.patientId,
      losDays,
      wardRounds: wardRounds || [],
      cpoeOrders: cpoeOrders || [],
      clearance: clearance || null,
      vitals: vitals || [],
    };
  }

  async getAdmissionById(id) {
    const admission = await ipdAdmissionRepository.getAdmissionById(id);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');
    return admission;
  }

  async updateAdmission(id, updateData) {
    const admission = await ipdAdmissionRepository.updateAdmission(id, updateData);
    if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
    return admission;
  }

  /**
   * Records a doctor's clinical recommendation for IPD admission without physical bed allocation
   * or financial collection. Moves visit into ADMISSION_RECOMMENDED status for Ward Management.
   */
  async recommendAdmission(data, advisingDoctorId) {
    const Visit = require('../../visits/visit.model');
    const visit = await Visit.findById(data.visitId);
    if (!visit) throw new AppError('Patient visit not found', 404, 'NOT_FOUND');

    if (['COMPLETED', 'CANCELLED', 'CONVERTED_TO_IPD'].includes(visit.status)) {
      throw new AppError(`Cannot advise admission for visit with status ${visit.status}`, 409, 'INVALID_VISIT_STATUS');
    }

    visit.status = 'ADMISSION_RECOMMENDED';
    visit.ipdAdmissionAdvice = {
      status: 'RECOMMENDED',
      advisingDoctorId: advisingDoctorId,
      advisedAt: new Date(),
      targetWardClass: data.targetWardClass || 'GENERAL_WARD',
      admissionType: data.admissionType || 'PLANNED',
      provisionalDiagnosis: data.provisionalDiagnosis || visit.consultation?.diagnosis || 'Admission Recommended',
      chiefComplaints: data.chiefComplaints || visit.consultation?.chiefComplaint || visit.reasonForVisit || '',
      carePlan: data.carePlan || visit.consultation?.treatmentPlan || '',
      dietTier: data.dietTier || 'REGULAR_DIET',
      urgency: data.urgency || 'ROUTINE',
      suggestedSurgeonId: data.suggestedSurgeonId || null,
      otSessionId: visit.ipdAdmissionAdvice?.otSessionId || null,
    };

    await visit.save();

    try {
      auditService.logEvent(
        advisingDoctorId,
        'Doctor',
        'IPD_ADMISSION_RECOMMENDED',
        visit._id,
        {
          targetWardClass: visit.ipdAdmissionAdvice.targetWardClass,
          admissionType: visit.ipdAdmissionAdvice.admissionType,
          urgency: visit.ipdAdmissionAdvice.urgency,
        }
      );
    } catch (auditErr) {
      console.warn('Non-blocking audit log failure:', auditErr.message);
    }

    return visit;
  }

  /**
   * Retrieves pending doctor IPD admission advice queue for Ward Management bed allocation.
   */
  async getPendingAdmissionAdvice() {
    const Visit = require('../../visits/visit.model');
    return Visit.find({
      status: { $nin: ['CONVERTED_TO_IPD', 'COMPLETED', 'CANCELLED'] },
      'ipdAdmissionAdvice.status': { $ne: 'ADMITTED' },
      $or: [
        { status: 'ADMISSION_RECOMMENDED' },
        { 'ipdAdmissionAdvice.status': 'RECOMMENDED' },
      ],
    })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth contactNumber age bloodGroup')
      .populate('departmentId', 'name')
      .populate('ipdAdmissionAdvice.advisingDoctorId', 'firstName lastName specialization')
      .populate('ipdAdmissionAdvice.suggestedSurgeonId', 'firstName lastName specialization')
      .populate('ipdAdmissionAdvice.otSessionId', 'procedureName surgeryType urgency status scheduledStart')
      .sort({ 'ipdAdmissionAdvice.advisedAt': -1 });
  }

  /**
   * Directly converts an active OPD patient visit into an IPD Inpatient Admission
   * within an atomic ACID transaction, preserving clinical history.
   */
  async convertOpdToIpd(data, admittedByStaffId, externalSession = null) {
    const Visit = require('../../visits/visit.model');

    const execute = async (session) => {
      // 1. Verify Visit
      const visit = await Visit.findById(data.visitId).session(session);
      if (!visit) throw new AppError('Source OPD visit not found', 404, 'NOT_FOUND');

      if (['COMPLETED', 'CANCELLED', 'CONVERTED_TO_IPD'].includes(visit.status)) {
        throw new AppError(`Cannot convert visit with status ${visit.status}`, 409, 'INVALID_VISIT_STATUS');
      }

      // 2. Prepare admission payload from visit & user input
      const admissionPayload = {
        ...data,
        patientId: visit.patientId,
        admittingDepartmentId: data.admittingDepartmentId || visit.departmentId,
        primaryDoctorId: data.primaryDoctorId || visit.consultation?.doctorId || admittedByStaffId,
        provisionalDiagnosis: data.provisionalDiagnosis || visit.consultation?.diagnosis || 'Admitted from OPD',
        chiefComplaints: data.chiefComplaints || visit.consultation?.chiefComplaint || visit.reasonForVisit || '',
        carePlan: data.carePlan || visit.consultation?.treatmentPlan || '',
        sourceVisitId: visit._id,
        conversionType: data.conversionType || 'OPD_CONVERSION',
      };

      // 3. Call admitPatient within the active session
      const admission = await this.admitPatient(admissionPayload, admittedByStaffId, session);

      // 4. Update the source OPD visit to terminal status CONVERTED_TO_IPD
      visit.status = 'CONVERTED_TO_IPD';
      visit.convertedToAdmissionId = admission._id;
      visit.ipdAdmissionId = admission._id;
      if (visit.ipdAdmissionAdvice) {
        visit.ipdAdmissionAdvice.status = 'ADMITTED';
      }
      await visit.save(session ? { session } : {});

      // 5. Link any pending OTSession associated with visit or advice to the new admission
      const OTSession = require('../ot/ot-session.model');
      await OTSession.updateMany(
        {
          $or: [
            { visitId: visit._id },
            { patientId: visit.patientId, admissionId: null },
            ...(visit.ipdAdmissionAdvice?.otSessionId ? [{ _id: visit.ipdAdmissionAdvice.otSessionId }] : []),
          ],
        },
        { $set: { admissionId: admission._id } },
        session ? { session } : {}
      );

      return { admission, visit };
    };

    if (externalSession) {
      return execute(externalSession);
    }

    const result = await withTransaction(execute);

    // Audit trail
    try {
      auditService.logEvent(
        admittedByStaffId,
        'ClinicalStaff',
        'OPD_CONVERTED_TO_IPD',
        result.admission._id,
        {
          sourceVisitId: data.visitId,
          admissionNumber: result.admission.admissionNumber,
          bedId: data.bedId,
        }
      );
    } catch (auditErr) {
      console.warn('Non-blocking audit log failure:', auditErr.message);
    }

    return result;
  }

  /**
   * Enforces hospital clinical privacy and ward gender segregation policy.
   * - Male patients cannot be admitted to Female-only rooms/beds.
   * - Female patients cannot be admitted to Male-only rooms/beds.
   * - Other/Non-binary/Transgender/Unknown patients are accommodated in unrestricted/private rooms per preference.
   */
  _validateGenderCompatibility(patient, bed, room) {
    if (!patient || !room) return;
    const pGender = (patient.gender || '').trim().toUpperCase();
    const rawRestriction = (room.genderRestriction || 'UNRESTRICTED').toUpperCase();

    if (!pGender || pGender === 'OTHER' || pGender === 'NON_BINARY' || pGender === 'TRANSGENDER' || pGender === 'UNKNOWN') {
      return;
    }

    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
    const bedLabel = bed?.bedLabel || bed?.bedNumber || 'Bed';
    const roomNum = room.roomNumber || room.roomName || 'Ward Room';

    // 1. Room-level gender restriction
    if (rawRestriction === 'FEMALE_ONLY' || rawRestriction === 'FEMALE') {
      if (pGender !== 'FEMALE') {
        throw new AppError(
          `Clinical Ward Privacy Violation: Room ${roomNum} is designated for Female patients only. Cannot admit Male patient "${patientName}". Please select a Male or Unisex ward accommodation.`,
          422,
          'GENDER_MISMATCH'
        );
      }
    }

    if (rawRestriction === 'MALE_ONLY' || rawRestriction === 'MALE') {
      if (pGender !== 'MALE') {
        throw new AppError(
          `Clinical Ward Privacy Violation: Room ${roomNum} is designated for Male patients only. Cannot admit Female patient "${patientName}". Please select a Female or Unisex ward accommodation.`,
          422,
          'GENDER_MISMATCH'
        );
      }
    }

    // 2. Bed-level naming designation
    const upperLabel = (bedLabel || '').toUpperCase();
    if (pGender === 'MALE' && (upperLabel.includes('FEMALE') || upperLabel.startsWith('F-') || upperLabel.startsWith('F_'))) {
      throw new AppError(
        `Clinical Ward Privacy Violation: Bed "${bedLabel}" in Room ${roomNum} is reserved for Female patients. Cannot allocate to Male patient "${patientName}". Please select a Male or Unisex bed.`,
        422,
        'GENDER_MISMATCH'
      );
    }

    if (pGender === 'FEMALE' && (upperLabel.includes('MALE') && !upperLabel.includes('FEMALE') || upperLabel.startsWith('M-') || upperLabel.startsWith('M_'))) {
      throw new AppError(
        `Clinical Ward Privacy Violation: Bed "${bedLabel}" in Room ${roomNum} is reserved for Male patients. Cannot allocate to Female patient "${patientName}". Please select a Female or Unisex bed.`,
        422,
        'GENDER_MISMATCH'
      );
    }
  }
}

module.exports = new IPDAdmissionService();
