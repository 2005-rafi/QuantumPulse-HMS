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

const enrichPatientsWithHistory = async (items) => {
  if (!items || items.length === 0) return items;
  const patientIds = items.map(p => p._id).filter(Boolean);
  if (patientIds.length === 0) return items;

  try {
    const [latestVisits, latestAppointments] = await Promise.all([
      Visit.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { createdAt: -1 } },
        { $group: {
            _id: '$patientId',
            lastVisitDate: { $first: '$createdAt' },
            lastVisitStatus: { $first: '$status' },
            lastVisitType: { $first: '$visitType' }
        }}
      ]),
      Appointment.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { appointmentDate: -1, startTime: -1 } },
        { $group: {
            _id: '$patientId',
            appointmentDate: { $first: '$appointmentDate' },
            startTime: { $first: '$startTime' },
            endTime: { $first: '$endTime' },
            status: { $first: '$status' }
        }}
      ])
    ]);

    const visitMap = new Map(latestVisits.map(v => [String(v._id), v]));
    const apptMap = new Map(latestAppointments.map(a => [String(a._id), a]));

    return items.map(p => {
      const v = visitMap.get(String(p._id));
      const a = apptMap.get(String(p._id));
      return {
        ...p,
        lastVisitDate: v ? v.lastVisitDate : (p.lastVisitDate || null),
        lastVisitStatus: v ? v.lastVisitStatus : null,
        lastVisitType: v ? v.lastVisitType : null,
        latestAppointment: a ? {
          date: a.appointmentDate,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status
        } : null
      };
    });
  } catch (err) {
    return items;
  }
};

const { QueryContext, QueryBuilder, PatientQueryConfig } = require('../../core/query');

const search = async (queryParams = {}, securityScope = {}) => {
  const queryContext = QueryContext.fromRequest({ query: queryParams }, securityScope);

  const { visitType, startDate, endDate, departmentId, doctorId } = queryParams;
  const compiled = QueryBuilder.compile(queryContext, PatientQueryConfig);

  // 1. Resolve Visit Filters if present
  const visitFilter = {};
  if (visitType) {
    const types = Array.isArray(visitType) ? visitType : visitType.split(',').filter(Boolean);
    if (types.length > 0) visitFilter.visitType = { $in: types };
  }
  if (departmentId) {
    const depts = Array.isArray(departmentId) ? departmentId : departmentId.split(',').filter(Boolean);
    if (depts.length > 0) {
      const mongoose = require('mongoose');
      visitFilter.departmentId = { $in: depts.map(id => new mongoose.Types.ObjectId(id)) };
    }
  }
  if (doctorId) {
    const docs = Array.isArray(doctorId) ? doctorId : doctorId.split(',').filter(Boolean);
    if (docs.length > 0) {
      const mongoose = require('mongoose');
      visitFilter['consultation.doctorId'] = { $in: docs.map(id => new mongoose.Types.ObjectId(id)) };
    }
  }
  if (startDate || endDate) {
    visitFilter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        visitFilter.createdAt.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        visitFilter.createdAt.$lte = end;
      }
    }
  }

  // Determine whether to use aggregate lookup join vs direct indexed search
  const hasVisitFilters = Object.keys(visitFilter).length > 0;
  if (hasVisitFilters) {
    const pipeline = [];

    // Stage 1: Match patient name/phone/mrn first using compiled filter
    if (compiled.filter && Object.keys(compiled.filter).length > 0) {
      pipeline.push({ $match: compiled.filter });
    }

    // Stage 2: Lookup visits to join (bounded by $limit: 1 per patient)
    pipeline.push({
      $lookup: {
        from: 'visits',
        let: { patientId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$patientId', '$$patientId'] },
              ...visitFilter,
            },
          },
          { $limit: 1 },
        ],
        as: 'matchingVisits',
      },
    });

    // Stage 3: Keep only patients with matches
    pipeline.push({
      $match: {
        'matchingVisits.0': { $exists: true },
      },
    });

    // Stage 4: Project out joined array to keep memory footprint minimal
    pipeline.push({
      $project: { matchingVisits: 0 },
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
