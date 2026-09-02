const repo = require('./patient.repository');
const AppError = require('../../core/errors/AppError');
const crypto = require('crypto');
const sequenceService = require('../../core/database/sequence.service');
const { encryptDeterministic } = require('../../core/utils/encryption');

const create = async (data, session = null) => {
  const mrn = await sequenceService.getNextPatientMRN(session);
  return repo.create({ ...data, mrn }, { session });
};

const getById = async (id) => {
  const patient = await repo.findById(id);
  if (!patient) throw new AppError('NOT_FOUND', 'Patient not found');
  return patient;
};

const getByMrn = async (mrn) => {
  const patient = await repo.findByMrn(mrn);
  if (!patient) throw new AppError('NOT_FOUND', 'Patient not found');
  return patient;
};

const Visit = require('../visits/visit.model');
const Appointment = require('../appointments/appointment.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
require('../ipd/beds/bed.model');
require('../ipd/beds/room.model');
require('../ipd/beds/floor.model');
require('../administration/department.model');
const mongoose = require('mongoose');

const enrichPatientsWithHistory = async (items) => {
  if (!items || items.length === 0) return items;
  const patientIds = items.map((p) => p._id).filter(Boolean);
  if (patientIds.length === 0) return items;

  try {
    const [latestVisits, latestAppointments, activeAdmissions] = await Promise.all([
      Visit.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$patientId',
            lastVisitDate: { $first: '$createdAt' },
            lastVisitStatus: { $first: '$status' },
            lastVisitType: { $first: '$visitType' },
            activeVisit: {
              $first: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        'WAITING_TRIAGE',
                        'CALLED',
                        'WAITING_DOCTOR',
                        'IN_PROGRESS',
                        'WAITING_LAB',
                        'WAITING_DOCTOR_REVIEW',
                        'WAITING_PHARMACY',
                        'WAITING_BILLING',
                      ],
                    ],
                  },
                  {
                    visitNumber: '$visitNumber',
                    visitType: '$visitType',
                    status: '$status',
                    tokenString: '$tokenString',
                  },
                  null,
                ],
              },
            },
          },
        },
      ]),
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

    const visitMap = new Map(latestVisits.map((v) => [String(v._id), v]));
    const apptMap = new Map(latestAppointments.map((a) => [String(a._id), a]));
    const admissionMap = new Map(activeAdmissions.map((adm) => [String(adm.patientId), adm]));

    return items.map((p) => {
      const v = visitMap.get(String(p._id));
      const a = apptMap.get(String(p._id));
      const adm = admissionMap.get(String(p._id));

      let currentState = 'IDLE';
      let activeAdmission = null;

      if (adm) {
        currentState = adm.admissionType === 'EMERGENCY' ? 'EMERGENCY' : 'IPD';
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
      } else if (v?.activeVisit?.visitType === 'EMERGENCY' || v?.lastVisitType === 'EMERGENCY') {
        currentState = 'EMERGENCY';
      } else if (v?.activeVisit?.visitType === 'OPD' || v?.lastVisitType === 'OPD') {
        currentState = 'OPD';
      } else if (v?.activeVisit?.visitType === 'IPD' || v?.lastVisitType === 'IPD') {
        currentState = 'IPD';
      } else {
        currentState = 'IDLE';
      }

      return {
        ...p,
        currentState,
        activeAdmission,
        activeVisit: v?.activeVisit || null,
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

const search = async (queryParams = {}, securityScope = {}) => {
  // Support nested queryParams.filters if passed by certain querystring formats
  const rawFilters = typeof queryParams.filters === 'object' && queryParams.filters !== null ? queryParams.filters : {};
  const normalizedParams = {
    ...rawFilters,
    ...queryParams,
  };

  const visitType = normalizedParams.visitType || rawFilters.visitType;
  const startDate = normalizedParams.startDate || rawFilters.startDate;
  const endDate = normalizedParams.endDate || rawFilters.endDate;
  const departmentId = normalizedParams.departmentId || rawFilters.departmentId;
  const doctorId = normalizedParams.doctorId || rawFilters.doctorId;

  const queryContext = QueryContext.fromRequest({ query: normalizedParams }, securityScope);
  const compiled = QueryBuilder.compile(queryContext, PatientQueryConfig);

  // 1. Resolve Visit & Admission Filters if present
  const types = visitType
    ? (Array.isArray(visitType) ? visitType : visitType.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    : [];

  const hasVisitFilters = types.length > 0 || departmentId || doctorId || startDate || endDate;

  if (hasVisitFilters) {
    const pipeline = [];

    // Stage 1: Match patient name/phone/mrn first using compiled filter
    if (compiled.filter && Object.keys(compiled.filter).length > 0) {
      pipeline.push({ $match: compiled.filter });
    }

    // Stage 2: Prepare visit matching criteria
    const visitMatch = {};
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

    // Stage 3: Match based on selected modality types
    if (types.length > 0) {
      const typeConditions = [];
      if (types.includes('IPD')) {
        typeConditions.push({ 'activeAdmissions.0': { $exists: true } });
        typeConditions.push({ 'matchingVisits.visitType': 'IPD' });
      }
      if (types.includes('EMERGENCY')) {
        typeConditions.push({ 'activeAdmissions.admissionType': 'EMERGENCY' });
        typeConditions.push({ 'matchingVisits.visitType': 'EMERGENCY' });
      }
      if (types.includes('OPD')) {
        typeConditions.push({ 'matchingVisits.visitType': 'OPD' });
      }
      if (types.includes('IDLE') || types.includes('REGISTERED')) {
        typeConditions.push({
          matchingVisits: { $size: 0 },
          activeAdmissions: { $size: 0 },
        });
      }

      if (typeConditions.length > 0) {
        pipeline.push({ $match: { $or: typeConditions } });
      }
    } else {
      // General visit filter match (if department/doctor/date was specified without type)
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
    return {
      items: enrichedItems,
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
    return {
      items: enrichedItems,
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

  const encPhone = phone ? encryptDeterministic(phone.trim()) : null;
  const encAadhaar = aadhaar ? encryptDeterministic(aadhaar.trim()) : null;

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

  return results;
};

const registerWithVisit = async (data, staffId) => {
  const { withTransaction } = require('../../core/database/transaction');
  return withTransaction(async (session) => {
    // 1. Create Patient
    const mrn = await generateMRN();
    const patientData = { ...data.patient, mrn };
    const patient = await repo.create(patientData, { session });

    // 2. Create Visit
    const visitService = require('../visits/visit.service');
    const visitPayload = {
      ...data.visit,
      patientId: patient._id.toString()
    };
    
    const visit = await visitService.createVisit(visitPayload, staffId, session);

    return { patient, visit };
  });
};

module.exports = { create, getById, getByMrn, search, update, addMedicalHistory, checkDuplicates, registerWithVisit };
