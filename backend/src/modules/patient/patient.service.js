const repo = require('./patient.repository');
const AppError = require('../../core/errors/AppError');
const crypto = require('crypto');
const Counter = require('../../core/database/counter.model');
const { encryptDeterministic } = require('../../core/utils/encryption');

const generateMRN = async () => {
  // Atomically increment MRN sequence counter
  const counter = await Counter.findOneAndUpdate(
    { id: 'mrn' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `PT-${year}${month}${day}-${hours}${minutes}-${String(counter.seq).padStart(6, '0')}`;
};

const create = async (data) => {
  const mrn = await generateMRN();
  return repo.create({ ...data, mrn });
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

const search = async ({ q, page = 1, limit = 20, visitType, startDate, endDate, departmentId, doctorId, sortBy } = {}) => {
  const filter = {};
  
  // 1. Search Query Optimization & Input Encryption
  if (q) {
    const cleanQ = q.trim();
    
    // Check if cleanQ is numeric (phone/Aadhaar search)
    const isNumeric = /^[0-9]+$/.test(cleanQ);
    if (isNumeric) {
      const encVal = encryptDeterministic(cleanQ);
      filter.$or = [
        { phone: encVal },
        { whatsapp: encVal },
        { aadhaar: encVal }
      ];
    } else {
      // Check if cleanQ is MRN (PT-...)
      const isMrn = cleanQ.toUpperCase().startsWith('PT-');
      if (isMrn) {
        // Index-prefix match on MRN is optimized using ^ anchor
        filter.mrn = { $regex: new RegExp('^' + cleanQ, 'i') };
      } else {
        // Name search: use prefix match (^ anchor) on indexed name fields to utilize index!
        const parts = cleanQ.split(/\s+/);
        if (parts.length > 1) {
          filter.$or = [
            {
              firstName: { $regex: new RegExp('^' + parts[0], 'i') },
              lastName: { $regex: new RegExp('^' + parts.slice(1).join(' '), 'i') }
            },
            {
              firstName: { $regex: new RegExp('^' + parts.slice(1).join(' '), 'i') },
              lastName: { $regex: new RegExp('^' + parts[0], 'i') }
            }
          ];
        } else {
          filter.$or = [
            { firstName: { $regex: new RegExp('^' + cleanQ, 'i') } },
            { lastName: { $regex: new RegExp('^' + cleanQ, 'i') } }
          ];
        }
      }
    }
  }

  // 2. Resolve Visit Filters
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
      start.setHours(0, 0, 0, 0);
      visitFilter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      visitFilter.createdAt.$lte = end;
    }
  }

  // 3. Build Sort Configuration
  const sort = {};
  if (sortBy === 'nameA-Z') {
    sort.firstName = 1;
    sort.lastName = 1;
  } else if (sortBy === 'oldest') {
    sort.createdAt = 1;
  } else {
    sort.createdAt = -1;
  }

  // Determine whether to use aggregate lookup join vs standard search
  const hasVisitFilters = Object.keys(visitFilter).length > 0;
  if (hasVisitFilters) {
    const pipeline = [];
    
    // Stage 1: Match patient name/phone/mrn first
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }
    
    // Stage 2: Lookup visits to join
    pipeline.push({
      $lookup: {
        from: 'visits',
        let: { patientId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$patientId', '$$patientId'] },
              ...visitFilter
            }
          },
          { $limit: 1 } // Stop looking up as soon as one matching visit is found
        ],
        as: 'matchingVisits'
      }
    });

    // Stage 3: Keep only patients with matches
    pipeline.push({
      $match: {
        'matchingVisits.0': { $exists: true }
      }
    });

    // Stage 4: Project out joined array to keep memory footprint low
    pipeline.push({
      $project: { matchingVisits: 0 }
    });

    // Stage 5: Sort
    pipeline.push({ $sort: sort });

    // Stage 6: Facet search for paginated items and count in a single query
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
      }
    });

    const result = await repo.aggregateSearch(pipeline);
    const enrichedItems = await enrichPatientsWithHistory(result.items);
    return {
      items: enrichedItems,
      total: result.total,
      page,
      limit,
      pages: Math.ceil(result.total / limit)
    };
  } else {
    // Normal query path
    const [rawItems, total] = await Promise.all([
      repo.search(filter, page, limit, sort),
      repo.countDocuments(filter)
    ]);
    const enrichedItems = await enrichPatientsWithHistory(rawItems);
    return { items: enrichedItems, total, page, limit, pages: Math.ceil(total / limit) };
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
