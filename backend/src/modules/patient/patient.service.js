const repo = require('./patient.repository');
const AppError = require('../../core/errors/app-error');
const crypto = require('crypto');
const sequenceService = require('../../core/database/sequence.service');
const { encryptDeterministic } = require('../../core/utils/encryption');

const create = async (data, session = null) => {
  const mrn = await sequenceService.getNextPatientMRN(session);
  return repo.create({ ...data, mrn }, { session });
};

const isBasicOnly = (user) => {
  if (!user) return false;
  const userRole = (user.role || '').toUpperCase();
  if (userRole === 'ADMINISTRATOR' || userRole === 'ADMIN') return false;
  if (userRole === 'PHARMACY') return true;
  const hasFull = user.permissions && user.permissions.includes('PATIENT_VIEW');
  const hasBasic = user.permissions && user.permissions.includes('PATIENT_BASIC_VIEW');
  return hasBasic && !hasFull;
};

const projectBasicPatient = (patient) => {
  if (!patient) return null;
  const p = patient.toObject ? patient.toObject() : { ...patient };
  return {
    _id: p._id,
    mrn: p.mrn,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    age: p.age,
    bloodGroup: p.bloodGroup,
    phone: p.phone,
    city: p.city || p.address?.city || '',
    activeVisit: p.activeVisit || null,
    currentState: p.currentState || 'IDLE',
  };
};

const getById = async (id, user = null) => {
  let patient = null;
  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(id)) {
    patient = await repo.findById(id);
  }
  if (!patient) {
    patient = await repo.findByMrn(id);
  }
  if (!patient) throw new AppError('NOT_FOUND', 'Patient not found');

  const DeletionRequest = require('./deletion-request.model');
  const pendingDeletion = await DeletionRequest.findOne({ patientId: patient._id, status: 'PENDING' })
    .populate('requestedBy', 'fullName name role')
    .lean();

  const enriched = {
    ...patient,
    hasPendingDeletion: Boolean(pendingDeletion),
    pendingDeletionRequest: pendingDeletion || null,
  };

  if (isBasicOnly(user)) {
    return projectBasicPatient(enriched);
  }
  return enriched;
};

const getByMrn = async (mrn, user = null) => {
  const patient = await repo.findByMrn(mrn);
  if (!patient) throw new AppError('NOT_FOUND', 'Patient not found');

  const DeletionRequest = require('./deletion-request.model');
  const pendingDeletion = await DeletionRequest.findOne({ patientId: patient._id, status: 'PENDING' })
    .populate('requestedBy', 'fullName name role')
    .lean();

  const enriched = {
    ...patient,
    hasPendingDeletion: Boolean(pendingDeletion),
    pendingDeletionRequest: pendingDeletion || null,
  };

  if (isBasicOnly(user)) {
    return projectBasicPatient(enriched);
  }
  return enriched;
};

const Visit = require('../visits/visit.model');
const Appointment = require('../appointments/appointment.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
require('../ipd/beds/bed.model');
require('../ipd/beds/room.model');
require('../ipd/beds/floor.model');
require('../administration/department.model');
require('../staff/staff.model');
const mongoose = require('mongoose');

const { ACTIVE_STATUS_CODES, getPatientStatus, PATIENT_STATUS_CODES } = require('../../core/constants');

const enrichPatientsWithHistory = async (items) => {
  if (!items || items.length === 0) return items;
  const patientIds = items.map((p) => p._id).filter(Boolean);
  if (patientIds.length === 0) return items;

  try {
    const [latestVisits, activeVisitsList, latestAppointments, activeAdmissions] = await Promise.all([
      // 1. Latest recorded visit overall (for last visit date and type)
      Visit.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$patientId',
            lastVisitDate: { $first: '$createdAt' },
            lastVisitStatus: { $first: '$status' },
            lastVisitType: { $first: '$visitType' },
          },
        },
      ]),
      // 2. All active encounters currently in hospital workflow
      Visit.find({
        patientId: { $in: patientIds },
        status: { $in: ACTIVE_STATUS_CODES },
      })
        .sort({ createdAt: -1 })
        .populate('departmentId', 'name code')
        .lean(),
      // 3. Latest appointment
      Appointment.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { appointmentDate: -1, startTime: -1 } },
        {
          $group: {
            _id: '$patientId',
            appointmentDate: { $first: '$appointmentDate' },
            startTime: { $first: '$startTime' },
            endTime: { $first: '$endTime' },
            status: { $first: '$status' },
          },
        },
      ]),
      // 4. Active inpatient admission
      IPDAdmission.find({
        patientId: { $in: patientIds },
        status: { $in: ['ADMITTED', 'DISCHARGE_INITIATED'] },
      })
        .populate('currentBedId', 'bedNumber bedType')
        .populate('currentRoomId', 'roomNumber roomType')
        .populate('currentFloorId', 'floorNumber floorName')
        .populate('admittingDepartmentId', 'name code')
        .lean(),
    ]);

    const latestVisitMap = new Map(latestVisits.map((v) => [String(v._id), v]));
    const apptMap = new Map(latestAppointments.map((a) => [String(a._id), a]));
    const admissionMap = new Map(activeAdmissions.map((adm) => [String(adm.patientId), adm]));

    // Group active visits by patientId
    const activeVisitsByPatient = new Map();
    for (const v of activeVisitsList) {
      const pid = String(v.patientId);
      if (!activeVisitsByPatient.has(pid)) {
        activeVisitsByPatient.set(pid, []);
      }
      activeVisitsByPatient.get(pid).push(v);
    }

    return items.map((p) => {
      const pid = String(p._id);
      const v = latestVisitMap.get(pid);
      const a = apptMap.get(pid);
      const adm = admissionMap.get(pid);
      const pActiveVisits = activeVisitsByPatient.get(pid) || [];
      const primaryActiveVisit = pActiveVisits[0] || null;

      let currentState = PATIENT_STATUS_CODES.REGISTERED_IDLE;
      let activeAdmission = null;

      if (adm) {
        currentState = adm.admissionType === 'EMERGENCY' ? 'EMERGENCY' : PATIENT_STATUS_CODES.ADMITTED_IPD;
        activeAdmission = {
          admissionNumber: adm.admissionNumber,
          admissionType: adm.admissionType,
          status: adm.status,
          admissionDate: adm.admissionDate,
          bedNumber: adm.currentBedId?.bedNumber || '',
          roomNumber: adm.currentRoomId?.roomNumber || '',
          floorName: adm.currentFloorId?.floorName || '',
          department: adm.admittingDepartmentId?.name || '',
          diagnosis: adm.provisionalDiagnosis || '',
        };
      } else if (primaryActiveVisit) {
        currentState = primaryActiveVisit.status;
      } else if (v && v.lastVisitStatus) {
        currentState = v.lastVisitStatus;
      }

      const activeVisit = primaryActiveVisit
        ? {
            _id: primaryActiveVisit._id,
            visitNumber: primaryActiveVisit.visitNumber,
            visitType: primaryActiveVisit.visitType,
            status: primaryActiveVisit.status,
            tokenString: primaryActiveVisit.tokenString,
            department: primaryActiveVisit.departmentId?.name || 'General OPD',
          }
        : null;

      return {
        ...p,
        currentState,
        statusMeta: getPatientStatus(currentState),
        activeVisit,
        activeEncountersCount: pActiveVisits.length,
        activeVisitsSummary: pActiveVisits.map((av) => ({
          visitNumber: av.visitNumber,
          tokenString: av.tokenString,
          status: av.status,
          statusMeta: getPatientStatus(av.status),
          department: av.departmentId?.name || 'General OPD',
        })),
        activeAdmission,
        lastVisitDate: v ? v.lastVisitDate : p.lastVisitDate || null,
        lastVisitStatus: v ? v.lastVisitStatus : null,
        lastVisitType: v ? v.lastVisitType : null,
        latestAppointment: a
          ? {
              date: a.appointmentDate,
              startTime: a.startTime,
              endTime: a.endTime,
              status: a.status,
            }
          : null,
      };
    });
  } catch (err) {
    return items;
  }
};

const { QueryContext, QueryBuilder, PatientQueryConfig } = require('../../core/query');

const search = async (queryParams = {}, userOrScope = {}) => {
  // Support nested queryParams.filters if passed by certain querystring formats
  const rawFilters = typeof queryParams.filters === 'object' && queryParams.filters !== null ? queryParams.filters : {};
  const normalizedParams = {
    ...rawFilters,
    ...queryParams,
  };

  const visitType = normalizedParams.visitType || rawFilters.visitType;
  const status = normalizedParams.status || rawFilters.status;
  const startDate = normalizedParams.startDate || rawFilters.startDate;
  const endDate = normalizedParams.endDate || rawFilters.endDate;
  const departmentId = normalizedParams.departmentId || rawFilters.departmentId;
  const doctorId = normalizedParams.doctorId || rawFilters.doctorId;
  const securityScope = (userOrScope && userOrScope.securityScope) || (userOrScope && !userOrScope.role && !userOrScope.permissions ? userOrScope : {});
  const queryContext = QueryContext.fromRequest({ query: normalizedParams }, securityScope);
  const compiled = QueryBuilder.compile(queryContext, PatientQueryConfig);

  // 1. Resolve Visit & Admission Filters if present
  const types = visitType
    ? (Array.isArray(visitType) ? visitType : visitType.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    : [];
  const statuses = status
    ? (Array.isArray(status) ? status : status.split(',').map((s) => s.trim()).filter(Boolean))
    : [];

  const hasVisitFilters = types.length > 0 || statuses.length > 0 || departmentId || doctorId || startDate || endDate;

  // Enforce soft-deletion filter
  const baseFilter = { ...compiled.filter };
  if (baseFilter.isDeleted === undefined) {
    baseFilter.isDeleted = { $ne: true };
  }

  if (hasVisitFilters) {
    const pipeline = [];

    // Stage 1: Match non-deleted patient name/phone/mrn first using compiled filter
    if (baseFilter && Object.keys(baseFilter).length > 0) {
      pipeline.push({ $match: baseFilter });
    }

    // Stage 2: Prepare visit matching criteria
    const visitMatch = {};
    if (statuses.length > 0) {
      const encounterStatuses = statuses.filter((st) => st !== 'REGISTERED_IDLE' && st !== 'ADMITTED_IPD' && st !== 'IPD');
      if (encounterStatuses.length > 0) {
        visitMatch.status = { $in: encounterStatuses };
      }
    }
    if (departmentId) {
      const depts = Array.isArray(departmentId) ? departmentId : departmentId.split(',').filter(Boolean);
      if (depts.length > 0) {
        visitMatch.departmentId = { $in: depts.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }
    if (doctorId) {
      const docs = Array.isArray(doctorId) ? doctorId : doctorId.split(',').filter(Boolean);
      if (docs.length > 0) {
        visitMatch['consultation.doctorId'] = { $in: docs.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }
    if (startDate || endDate) {
      visitMatch.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          visitMatch.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          visitMatch.createdAt.$lte = end;
        }
      }
    }

    // Lookup visits
    pipeline.push({
      $lookup: {
        from: 'visits',
        let: { pId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$patientId', '$$pId'] },
              ...visitMatch,
            },
          },
          { $limit: 10 },
        ],
        as: 'matchingVisits',
      },
    });

    // Lookup active IPD admissions
    pipeline.push({
      $lookup: {
        from: 'ipdadmissions',
        let: { pId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$patientId', '$$pId'] },
              status: { $in: ['ADMITTED', 'DISCHARGE_INITIATED'] },
            },
          },
          { $limit: 1 },
        ],
        as: 'activeAdmissions',
      },
    });

    // Stage 3: Match based on selected modality types and workflow statuses
    const filterConditions = [];

    if (types.length > 0) {
      if (types.includes('IPD')) {
        filterConditions.push({ 'activeAdmissions.0': { $exists: true } });
        filterConditions.push({ 'matchingVisits.visitType': 'IPD' });
      }
      if (types.includes('EMERGENCY')) {
        filterConditions.push({ 'activeAdmissions.admissionType': 'EMERGENCY' });
        filterConditions.push({ 'matchingVisits.visitType': 'EMERGENCY' });
      }
      if (types.includes('OPD')) {
        filterConditions.push({ 'matchingVisits.visitType': 'OPD' });
      }
      if (types.includes('IDLE') || types.includes('REGISTERED')) {
        filterConditions.push({
          matchingVisits: { $size: 0 },
          activeAdmissions: { $size: 0 },
        });
      }
    }

    if (statuses.length > 0) {
      if (statuses.includes('REGISTERED_IDLE')) {
        filterConditions.push({
          matchingVisits: { $size: 0 },
          activeAdmissions: { $size: 0 },
        });
      }
      if (statuses.includes('ADMITTED_IPD') || statuses.includes('IPD')) {
        filterConditions.push({ 'activeAdmissions.0': { $exists: true } });
      }
      const encounterStatuses = statuses.filter((st) => st !== 'REGISTERED_IDLE' && st !== 'ADMITTED_IPD' && st !== 'IPD');
      if (encounterStatuses.length > 0) {
        filterConditions.push({ 'matchingVisits.status': { $in: encounterStatuses } });
      }
    }

    if (filterConditions.length > 0) {
      pipeline.push({ $match: { $or: filterConditions } });
    } else {
      // General visit filter match (if department/doctor/date was specified without type or status)
      pipeline.push({
        $match: {
          $or: [
            { 'matchingVisits.0': { $exists: true } },
            { 'activeAdmissions.0': { $exists: true } },
          ],
        },
      });
    }

    // Stage 4: Project out temporary lookup arrays
    pipeline.push({
      $project: { matchingVisits: 0, activeAdmissions: 0 },
    });

    // Stage 5: Sort deterministically
    pipeline.push({ $sort: compiled.sort });

    // Stage 6: Facet search for paginated items and count in a single query
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: (compiled.page - 1) * compiled.limit }, { $limit: compiled.limit }],
      },
    });

    const result = await repo.aggregateSearch(pipeline);
    const enrichedItems = await enrichPatientsWithHistory(result.items);
    const finalItems = isBasicOnly(userOrScope) ? enrichedItems.map(projectBasicPatient) : enrichedItems;
    return {
      items: finalItems,
      total: result.total,
      page: compiled.page,
      limit: compiled.limit,
      pages: Math.ceil(result.total / compiled.limit),
    };
  } else {
    // Direct indexed query path
    const [rawItems, total] = await Promise.all([
      repo.search(compiled.filter, compiled.page, compiled.limit, compiled.sort, compiled.projection),
      repo.countDocuments(compiled.filter),
    ]);
    const enrichedItems = await enrichPatientsWithHistory(rawItems);
    const finalItems = isBasicOnly(userOrScope) ? enrichedItems.map(projectBasicPatient) : enrichedItems;
    return {
      items: finalItems,
      total,
      page: compiled.page,
      limit: compiled.limit,
      pages: Math.ceil(total / compiled.limit),
    };
  }
};

const update = async (id, data) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('NOT_FOUND', 'Patient not found');
  return repo.update(id, data);
};

const addMedicalHistory = async (id, historyData, staffId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('NOT_FOUND', 'Patient not found');
  return repo.addMedicalHistory(id, { ...historyData, addedBy: staffId });
};

const checkDuplicates = async (data) => {
  const { firstName, lastName, phone, dob, aadhaar } = data;
  
  const parsedDob = new Date(dob);
  // Start of day and end of day to match Date of Birth correctly
  const dobStart = new Date(parsedDob.getFullYear(), parsedDob.getMonth(), parsedDob.getDate());
  const dobEnd = new Date(parsedDob.getFullYear(), parsedDob.getMonth(), parsedDob.getDate() + 1);

  const encPhone = (phone && typeof phone === 'string' && phone.trim()) ? encryptDeterministic(phone.trim()) : null;
  const encAadhaar = (aadhaar && typeof aadhaar === 'string' && aadhaar.trim()) ? encryptDeterministic(aadhaar.trim()) : null;

  // 1. Hard Matches (High Confidence)
  const hardMatchConditions = [];
  if (encAadhaar) {
    hardMatchConditions.push({ aadhaar: encAadhaar });
  }
  if (encPhone && firstName && lastName) {
    hardMatchConditions.push({
      phone: encPhone,
      firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }
    });
  }
  if (firstName && lastName && dob) {
    hardMatchConditions.push({
      firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') },
      dob: { $gte: dobStart, $lt: dobEnd }
    });
  }

  let hardMatches = [];
  if (hardMatchConditions.length > 0) {
    hardMatches = await repo.findDuplicates({ $or: hardMatchConditions });
  }

  const hardMatchIds = hardMatches.map(m => m._id.toString());

  // 2. Soft Matches (Family / Partial Confidence)
  const softMatchConditions = [];
  if (encPhone) {
    softMatchConditions.push({ phone: encPhone });
  }
  if (firstName && dob) {
    softMatchConditions.push({
      firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') },
      dob: { $gte: dobStart, $lt: dobEnd }
    });
  }

  let softMatches = [];
  if (softMatchConditions.length > 0) {
    softMatches = await repo.findDuplicates({
      _id: { $nin: hardMatchIds },
      $or: softMatchConditions
    });
  }

  const results = [
    ...hardMatches.map(m => ({ ...m, matchConfidence: 'HARD' })),
    ...softMatches.map(m => ({ ...m, matchConfidence: 'SOFT' }))
  ];

  return enrichPatientsWithHistory(results);
};

const registerWithVisit = async (data, staffId) => {
  const { withTransaction } = require('../../core/database/transaction');
  return withTransaction(async (session) => {
    // 1. Create Patient using atomic zero-collision sequence
    const mrn = await sequenceService.getNextPatientMRN(session);
    const patientData = { ...data.patient, mrn };
    const patient = await repo.create(patientData, { session });

    // 2. Resolve defensive valid Staff ID for registration audit
    let validStaffId = staffId;
    if (!validStaffId || !mongoose.Types.ObjectId.isValid(validStaffId)) {
      const Staff = require('../staff/staff.model');
      const fallbackStaff =
        (await Staff.findOne({ status: 'ACTIVE', isDeleted: false }).select('_id').session(session)) ||
        (await Staff.findOne().select('_id').session(session));
      validStaffId = fallbackStaff?._id;
    }

    let visit = null;
    let admission = null;

    // 3. Check if this is an Inpatient (IPD) Admission workflow
    const isIpdWorkflow =
      data.workflowType === 'IPD_MEDICAL' ||
      data.workflowType === 'IPD_SURGICAL' ||
      Boolean(data.admission);

    if (isIpdWorkflow) {
      const ipdAdmissionService = require('../ipd/admission/ipd-admission.service');
      const adm = data.admission || {};
      const admissionPayload = {
        patientId: patient._id,
        primaryDoctorId: adm.primaryDoctorId || data.visit?.doctorId,
        admittingDepartmentId: adm.admittingDepartmentId || data.visit?.departmentId,
        bedId: adm.bedId || adm.selectedBedId,
        admissionType: adm.admissionType || (data.workflowType === 'IPD_SURGICAL' ? 'SURGICAL' : 'PLANNED'),
        provisionalDiagnosis: adm.provisionalDiagnosis || data.visit?.reasonForVisit || 'Inpatient Admission',
        chiefComplaints: adm.chiefComplaints || data.visit?.reasonForVisit || '',
        carePlan: adm.carePlan || '',
        dietTier: adm.dietTier || 'REGULAR_DIET',
        initialDepositAmount: Number(adm.initialDepositAmount) || 0,
        paymentMethod: (adm.paymentMethod || adm.depositPaymentMethod || 'CASH').toUpperCase(),
      };

      admission = await ipdAdmissionService.admitPatient(admissionPayload, validStaffId, session);
      visit = await Visit.findOne({ ipdAdmissionId: admission._id }).session(session);
    } else {
      // Standard Outpatient (OPD) or Emergency encounter
      const visitService = require('../visits/visit.service');
      const visitPayload = {
        ...data.visit,
        patientId: patient._id.toString(),
      };
      visit = await visitService.createVisit(visitPayload, validStaffId, session);
    }

    return { patient, visit, admission, isIpd: isIpdWorkflow };
  });
};

const getDeletedPatients = async (queryParams = {}) => {
  const Patient = require('./patient.model');
  const DeletionRequest = require('./deletion-request.model');
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 20));
  const searchQuery = (queryParams.q || queryParams.search || '').trim();

  const filter = { isDeleted: true };
  if (searchQuery) {
    const encPhone = encryptDeterministic(searchQuery);
    filter.$or = [
      { mrn: { $regex: searchQuery, $options: 'i' } },
      { firstName: { $regex: searchQuery, $options: 'i' } },
      { lastName: { $regex: searchQuery, $options: 'i' } },
      { phone: encPhone },
    ];
  }

  const [rawDocs, total] = await Promise.all([
    Patient.find(filter)
      .populate('deletedBy', 'fullName name role email')
      .sort({ deletedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  const patientIds = rawDocs.map((p) => p._id);
  const deletionRequests = await DeletionRequest.find({
    patientId: { $in: patientIds },
  })
    .populate('requestedBy', 'fullName name role email')
    .populate('approvedBy', 'fullName name role email')
    .sort({ resolvedAt: -1, createdAt: -1 })
    .lean();

  const reqMap = new Map();
  for (const req of deletionRequests) {
    const key = String(req.patientId);
    if (!reqMap.has(key)) {
      reqMap.set(key, req);
    }
  }

  const decrypted = repo.decryptPatient(rawDocs);
  const items = decrypted.map((p) => {
    const req = reqMap.get(String(p._id));
    return {
      ...p,
      deletionRequest: req || null,
      requestedBy: req?.requestedBy || null,
      approvedBy: p.deletedBy || req?.approvedBy || null,
      deletionReason: p.deletionReason || req?.reason || 'Clinical Record Soft-Deleted',
      deletedAt: p.deletedAt || req?.resolvedAt || req?.updatedAt || p.updatedAt,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

const restorePatient = async (id, staffId) => {
  const Patient = require('./patient.model');
  const patient = await Patient.findById(id);
  if (!patient) throw new AppError('NOT_FOUND', 'Patient not found');
  if (!patient.isDeleted) throw new AppError('BUSINESS_001', 'Patient is not marked as deleted');

  patient.isDeleted = false;
  patient.deletedAt = null;
  patient.deletedBy = null;
  patient.deletionReason = '';
  await patient.save();

  return repo.decryptPatient(patient);
};

module.exports = {
  create,
  getById,
  getByMrn,
  search,
  update,
  addMedicalHistory,
  checkDuplicates,
  registerWithVisit,
  getDeletedPatients,
  restorePatient,
};

