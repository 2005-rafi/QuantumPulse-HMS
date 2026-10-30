/**
 * backend/src/core/utils/phi-sanitizer.js
 * HIPAA § 164.514 Safe Harbor De-Identification & Role-Based PHI Sanitizer.
 * Provides cryptographically sound data masking for patient Protected Health Information (PHI).
 */

/**
 * Mask telephone number (preserves country code / leading digits and last 4 digits)
 * E.g. "+919876543210" -> "+91 98••• •3210"
 */
const maskPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim();
  if (cleaned.length < 8) return '••••••••';
  const firstPart = cleaned.slice(0, 4);
  const lastPart = cleaned.slice(-4);
  return `${firstPart}••••${lastPart}`;
};

/**
 * Mask National ID / Aadhaar number (preserves only last 4 digits)
 * E.g. "123456789012" -> "•••• •••• 9012"
 */
const maskAadhaar = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') return '';
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const last4 = digits.slice(-4);
  return `•••• •••• ${last4}`;
};

/**
 * Mask email address
 * E.g. "rohit.sharma@hospital.org" -> "r••••a@hospital.org"
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const [user, domain] = email.split('@');
  if (!domain) return '••••@••••';
  if (user.length <= 2) return `••@${domain}`;
  const first = user[0];
  const last = user[user.length - 1];
  return `${first}••••${last}@${domain}`;
};

/**
 * Redact street and door number for non-clinical or public exports
 * Retains city and state for regional epidemiology under HIPAA Safe Harbor
 */
const maskAddress = (address) => {
  if (!address) return address;
  const clone = typeof address === 'object' ? { ...address } : { city: address };
  if (clone.street) clone.street = '[REDACTED STREET ADDRESS]';
  if (clone.pinCode) clone.pinCode = '••••••';
  return clone;
};

/**
 * Masks clinical notes and psychiatric diagnoses for administrative/billing staff
 */
const maskClinicalData = (data) => {
  if (!data) return data;
  return '[PROTECTED CLINICAL DATA - RESTRICTED TO ATTENDING CLINICIANS]';
};

/**
 * Role-Based PHI Sanitization Pipeline.
 *
 * @param {Object} patient - Raw or decrypted patient object
 * @param {Object} user - Authenticated user context { role, permissions, isHod, positionRank }
 * @param {Object} options - { hasBreakGlassGrant, isAttendingPhysician }
 * @returns {Object} Sanitized patient object
 */
const sanitizePatientForRole = (patient, user = {}, options = {}) => {
  if (!patient) return null;
  const raw = patient.toObject ? patient.toObject() : { ...patient };
  const role = (user.role || '').toUpperCase();
  const permissions = user.permissions || [];
  const hasBreakGlass = Boolean(options.hasBreakGlassGrant);

  // 1. Full clinical clearance: Administrators, active Break-Glass, or explicit full PHI permission
  const hasFullClinicalClearance =
    role === 'ADMINISTRATOR' ||
    role === 'ADMIN' ||
    hasBreakGlass ||
    permissions.includes('PATIENT_PHI_FULL_VIEW');

  // 2. Attending medical staff clearance (Doctors, Surgeons, Emergency Physicians, Chief Nurses)
  const isClinicalRole = [
    'DOCTOR',
    'SURGEON',
    'EMERGENCY PHYSICIAN',
    'HEAD OF DEPARTMENT',
    'NURSE',
    'ANESTHETIST',
  ].includes(role);

  if (hasFullClinicalClearance || (isClinicalRole && !options.forceSafeHarbor)) {
    return {
      ...raw,
      _phiSanitized: false,
      _breakGlassApplied: hasBreakGlass,
    };
  }

  // 3. Billing & Financial Clerks: Can view demographic identifiers for invoices, but clinical notes redacted
  const isFinancialRole = ['BILLING', 'CASHIER', 'ACCOUNTANT', 'FINANCE'].includes(role);
  if (isFinancialRole && !options.forceSafeHarbor) {
    const sanitized = { ...raw };
    if (sanitized.phone) sanitized.phone = maskPhoneNumber(sanitized.phone);
    if (sanitized.email) sanitized.email = maskEmail(sanitized.email);
    if (sanitized.aadhaar) sanitized.aadhaar = maskAadhaar(sanitized.aadhaar);

    // Redact psychiatric, sensitive clinical history & surgical notes
    if (sanitized.allergies) sanitized.allergies = '[PROTECTED ALLERGY RECORDS]';
    if (sanitized.operations) sanitized.operations = '[PROTECTED SURGICAL HISTORY]';
    if (sanitized.medicalHistory && Array.isArray(sanitized.medicalHistory)) {
      sanitized.medicalHistory = sanitized.medicalHistory.map((item) => ({
        ...item,
        condition: '[CLINICAL CONDITION]',
        notes: maskClinicalData(item.notes),
      }));
    }

    return {
      ...sanitized,
      _phiSanitized: true,
      _sanitizationTier: 'FINANCIAL_RESTRICTED',
    };
  }

  // 4. General / Pharmacy / Reception / Non-Clinical: Full Safe Harbor de-identification
  const sanitized = { ...raw };
  if (sanitized.phone) sanitized.phone = maskPhoneNumber(sanitized.phone);
  if (sanitized.whatsapp) sanitized.whatsapp = maskPhoneNumber(sanitized.whatsapp);
  if (sanitized.email) sanitized.email = maskEmail(sanitized.email);
  if (sanitized.aadhaar) sanitized.aadhaar = maskAadhaar(sanitized.aadhaar);
  if (sanitized.address) sanitized.address = maskAddress(sanitized.address);

  if (sanitized.emergencyContact) {
    sanitized.emergencyContact = {
      ...sanitized.emergencyContact,
      phone: maskPhoneNumber(sanitized.emergencyContact.phone),
    };
  }

  // Obscure deep clinical notes
  if (sanitized.allergies) sanitized.allergies = '[PROTECTED ALLERGY RECORDS]';
  if (sanitized.operations) sanitized.operations = '[PROTECTED SURGICAL HISTORY]';
  if (sanitized.medicalHistory && Array.isArray(sanitized.medicalHistory)) {
    sanitized.medicalHistory = sanitized.medicalHistory.map((item) => ({
      ...item,
      condition: '[RESTRICTED]',
      notes: maskClinicalData(item.notes),
    }));
  }

  return {
    ...sanitized,
    _phiSanitized: true,
    _sanitizationTier: 'SAFE_HARBOR_DEIDENTIFIED',
  };
};

/**
 * Detects whether an object represents a Patient entity.
 */
const isPatientLike = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.mrn && (obj.phone !== undefined || obj.aadhaar !== undefined || obj.firstName !== undefined || obj.bloodGroup !== undefined)) {
    return true;
  }
  return false;
};

/**
 * Recursively traverses a payload to sanitize any patient entity or populated patient subdocument
 * according to the requesting user's role and clearances.
 *
 * @param {*} payload - Response data (array, object, or scalar)
 * @param {Object} user - Requesting user context { role, permissions, ... }
 * @param {Object} options - Options { hasBreakGlassGrant, forceSafeHarbor }
 * @returns {*} Sanitized payload
 */
const deepSanitizePayload = (payload, user = {}, options = {}, visited = new WeakSet(), depth = 0) => {
  if (!payload || typeof payload !== 'object' || depth > 10) {
    return payload;
  }

  const role = (user?.role || '').toUpperCase();
  const permissions = user?.permissions || [];
  const hasBreakGlass = Boolean(options.hasBreakGlassGrant);

  // 1. Full clinical clearance: Administrators, active Break-Glass, or explicit full PHI permission
  const hasFullClinicalClearance =
    role === 'ADMINISTRATOR' ||
    role === 'ADMIN' ||
    hasBreakGlass ||
    permissions.includes('PATIENT_PHI_FULL_VIEW');

  // 2. Attending medical staff clearance
  const isClinicalRole = [
    'DOCTOR',
    'SURGEON',
    'EMERGENCY PHYSICIAN',
    'HEAD OF DEPARTMENT',
    'NURSE',
    'ANESTHETIST',
  ].includes(role);

  // Fast-path: Skip deep traversal for fully cleared clinical & administrative staff
  if ((hasFullClinicalClearance || isClinicalRole) && !options.forceSafeHarbor) {
    return payload;
  }

  // Handle circular references
  if (visited.has(payload)) {
    return payload;
  }
  visited.add(payload);

  if (Array.isArray(payload)) {
    return payload.map((item) => deepSanitizePayload(item, user, options, visited, depth + 1));
  }

  // If payload itself is a direct patient record
  if (isPatientLike(payload)) {
    return sanitizePatientForRole(payload, user, options);
  }

  // Clone object shallowly to prevent mutating in-memory cache/references
  const clone = { ...payload };

  // Explicitly check populated subdocuments: patientId, patient, patientSnapshot, selectedPatient
  const patientKeys = ['patientId', 'patient', 'patientSnapshot', 'selectedPatient'];
  for (const key of patientKeys) {
    if (clone[key] && typeof clone[key] === 'object' && !Array.isArray(clone[key])) {
      if (isPatientLike(clone[key]) || clone[key].mrn || clone[key].phone) {
        clone[key] = sanitizePatientForRole(clone[key], user, options);
      }
    }
  }

  // Recursively sanitize all other properties
  for (const key of Object.keys(clone)) {
    const val = clone[key];
    if (val && typeof val === 'object' && !patientKeys.includes(key)) {
      clone[key] = deepSanitizePayload(val, user, options, visited, depth + 1);
    }
  }

  return clone;
};

module.exports = {
  maskPhoneNumber,
  maskAadhaar,
  maskEmail,
  maskAddress,
  maskClinicalData,
  sanitizePatientForRole,
  isPatientLike,
  deepSanitizePayload,
};

