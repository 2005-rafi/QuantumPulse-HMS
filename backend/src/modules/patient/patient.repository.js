const Patient = require('./patient.model');
const { executeIsolatedQuery, executeIsolatedAggregate } = require('../../core/database/read-write-isolation');
const { encryptDeterministic, encryptRandom, decrypt } = require('../../core/utils/encryption');

// Helper to encrypt a patient record for DB write
const encryptPatient = (data) => {
  if (!data) return data;
  const clone = { ...data };
  
  if (clone.aadhaar && typeof clone.aadhaar === 'string' && clone.aadhaar.trim()) {
    clone.aadhaar = encryptDeterministic(clone.aadhaar.trim());
  } else {
    delete clone.aadhaar;
  }

  if (clone.phone) clone.phone = encryptDeterministic(clone.phone.trim());

  if (clone.whatsapp && typeof clone.whatsapp === 'string' && clone.whatsapp.trim()) {
    clone.whatsapp = encryptDeterministic(clone.whatsapp.trim());
  } else {
    delete clone.whatsapp;
  }

  if (clone.email && typeof clone.email === 'string' && clone.email.trim()) {
    clone.email = encryptDeterministic(clone.email.trim().toLowerCase());
  } else {
    delete clone.email;
  }

  if (clone.parentsName && typeof clone.parentsName === 'string' && clone.parentsName.trim()) {
    clone.parentsName = encryptRandom(clone.parentsName.trim());
  } else {
    delete clone.parentsName;
  }

  if (clone.allergies && typeof clone.allergies === 'string' && clone.allergies.trim()) {
    clone.allergies = encryptRandom(clone.allergies.trim());
  } else {
    delete clone.allergies;
  }

  if (clone.operations && typeof clone.operations === 'string' && clone.operations.trim()) {
    clone.operations = encryptRandom(clone.operations.trim());
  } else {
    delete clone.operations;
  }
  
  if (clone.address) {
    clone.address = { ...clone.address };
    if (clone.address.street) clone.address.street = encryptRandom(clone.address.street);
    if (clone.address.pinCode) clone.address.pinCode = encryptRandom(clone.address.pinCode);
  }
  
  if (clone.emergencyContact) {
    clone.emergencyContact = { ...clone.emergencyContact };
    if (clone.emergencyContact.name) clone.emergencyContact.name = encryptRandom(clone.emergencyContact.name);
    if (clone.emergencyContact.phone) clone.emergencyContact.phone = encryptRandom(clone.emergencyContact.phone);
  }

  if (clone.medicalHistory) {
    if (Array.isArray(clone.medicalHistory)) {
      clone.medicalHistory = clone.medicalHistory.map(encryptMedicalHistoryItem);
    } else {
      clone.medicalHistory = encryptMedicalHistoryItem(clone.medicalHistory);
    }
  }

  return clone;
};

const encryptMedicalHistoryItem = (item) => {
  if (!item) return item;
  const clone = { ...item };
  if (clone.condition) clone.condition = encryptRandom(clone.condition);
  if (clone.notes) clone.notes = encryptRandom(clone.notes);
  return clone;
};

// Helper to decrypt a patient record read from DB
const decryptPatient = (doc) => {
  if (!doc) return doc;
  
  if (Array.isArray(doc)) {
    return doc.map(d => decryptPatient(d));
  }

  const clone = doc.toObject ? doc.toObject() : { ...doc };
  
  // Ensure fullName is always populated
  clone.fullName = `${clone.firstName || ''} ${clone.lastName || ''}`.trim() || clone.name || '';

  // Recalculate age dynamically on reads in real-time
  if (clone.dob) {
    const today = new Date();
    const dob = new Date(clone.dob);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    clone.age = age;
  }

  if (clone.aadhaar) clone.aadhaar = decrypt(clone.aadhaar);
  if (clone.phone) clone.phone = decrypt(clone.phone);
  if (clone.whatsapp) clone.whatsapp = decrypt(clone.whatsapp);
  if (clone.email) clone.email = decrypt(clone.email);
  if (clone.parentsName) clone.parentsName = decrypt(clone.parentsName);
  if (clone.allergies) clone.allergies = decrypt(clone.allergies);
  if (clone.operations) clone.operations = decrypt(clone.operations);
  
  if (clone.address) {
    clone.address = { ...clone.address };
    if (clone.address.street) clone.address.street = decrypt(clone.address.street);
    if (clone.address.city) clone.address.city = decrypt(clone.address.city);
    if (clone.address.state) clone.address.state = decrypt(clone.address.state);
    if (clone.address.pinCode) clone.address.pinCode = decrypt(clone.address.pinCode);
  }
  
  if (clone.emergencyContact) {
    clone.emergencyContact = { ...clone.emergencyContact };
    if (clone.emergencyContact.name) clone.emergencyContact.name = decrypt(clone.emergencyContact.name);
    if (clone.emergencyContact.phone) clone.emergencyContact.phone = decrypt(clone.emergencyContact.phone);
  }

  if (clone.medicalHistory && Array.isArray(clone.medicalHistory)) {
    clone.medicalHistory = clone.medicalHistory.map(decryptMedicalHistoryItem);
  }

  return clone;
};

const decryptMedicalHistoryItem = (item) => {
  if (!item) return item;
  const clone = item.toObject ? item.toObject() : { ...item };
  if (clone.condition) clone.condition = decrypt(clone.condition);
  if (clone.notes) clone.notes = decrypt(clone.notes);
  return clone;
};

const create = async (data, options = {}) => {
  const encrypted = encryptPatient(data);
  if (options.session) {
    const [doc] = await Patient.create([encrypted], options);
    return decryptPatient(doc);
  }
  const doc = await Patient.create(encrypted);
  return decryptPatient(doc);
};

const findById = async (id, includeDeleted = false) => {
  const query = { _id: id };
  if (!includeDeleted) query.isDeleted = { $ne: true };
  const doc = await executeIsolatedQuery(Patient, (m) => m.findOne(query).populate('medicalHistory.addedBy', 'fullName role'));
  return decryptPatient(doc);
};

const findByMrn = async (mrn, includeDeleted = false) => {
  if (!mrn) return null;
  const rawMrn = String(mrn).trim();
  const cleanUpper = rawMrn.toUpperCase();

  // Support formatted MRN, raw query, and unhyphenated barcode payload (e.g. QPO2600000018)
  const candidates = [rawMrn, cleanUpper];
  const unhyphenatedMatch = cleanUpper.match(/^([A-Z]{2,6})(\d{2})(\d{7})(\d)$/);
  if (unhyphenatedMatch) {
    const [, code, yr, seq, chk] = unhyphenatedMatch;
    candidates.push(`${code}-${yr}-${seq}-${chk}`);
  }

  const query = {
    $or: [
      { mrn: { $in: candidates } },
      { previousMrns: { $in: candidates } }
    ]
  };
  if (!includeDeleted) query.isDeleted = { $ne: true };
  const doc = await executeIsolatedQuery(Patient, (m) => m.findOne(query).populate('medicalHistory.addedBy', 'fullName role'));
  return decryptPatient(doc);
};

const findDuplicates = async (filter) => {
  const finalFilter = { ...filter };
  if (finalFilter.isDeleted === undefined) {
    finalFilter.isDeleted = { $ne: true };
  }
  const docs = await executeIsolatedQuery(Patient, (m) => m.find(finalFilter));
  return decryptPatient(docs);
};

const search = async (filter = {}, page = 1, limit = 20, sort = { createdAt: -1, _id: -1 }, projection = null) => {
  const finalFilter = { ...filter };
  if (finalFilter.isDeleted === undefined) {
    finalFilter.isDeleted = { $ne: true };
  }
  let query = Patient.find(finalFilter);
  if (projection) query = query.select(projection);
  const docs = await executeIsolatedQuery(Patient, () =>
    query.sort(sort).skip((page - 1) * limit).limit(limit)
  );
  return decryptPatient(docs);
};

const countDocuments = (filter = {}) => {
  const finalFilter = { ...filter };
  if (finalFilter.isDeleted === undefined) {
    finalFilter.isDeleted = { $ne: true };
  }
  return Patient.countDocuments(finalFilter);
};

const update = async (id, data) => {
  const encrypted = encryptPatient(data);
  const doc = await Patient.findByIdAndUpdate(id, encrypted, { returnDocument: 'after', runValidators: true }).lean();
  return decryptPatient(doc);
};

const addMedicalHistory = async (id, historyData) => {
  const encryptedHistory = encryptMedicalHistoryItem(historyData);
  const doc = await Patient.findByIdAndUpdate(id, { $push: { medicalHistory: encryptedHistory } }, { returnDocument: 'after', runValidators: true })
    .populate('medicalHistory.addedBy', 'fullName role')
    .lean();
  return decryptPatient(doc);
};

const aggregateSearch = async (pipeline) => {
  const results = await executeIsolatedAggregate(Patient, pipeline);
  const metadata = results[0]?.metadata[0] || { total: 0 };
  const data = results[0]?.data || [];
  return {
    total: metadata.total,
    items: decryptPatient(data)
  };
};

module.exports = { create, findById, findByMrn, findDuplicates, search, countDocuments, update, addMedicalHistory, aggregateSearch, decryptPatient, encryptPatient };

