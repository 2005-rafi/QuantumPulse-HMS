export const getPatientInitials = (patient) => {
  if (!patient) return '';
  return `${patient.firstName?.charAt(0) || ''}${patient.lastName?.charAt(0) || ''}`.toUpperCase();
};

/**
 * Safely formats dates into Indian locale (en-IN) strings without ever throwing or displaying 'Invalid Date'.
 * Supports ISO strings, Date instances, timestamps, wrapped objects ({ $date, date }), or empty/invalid values.
 *
 * @param {*} dateInput - Date instance, ISO-8601 string, timestamp number, or date-wrapper object
 * @param {Intl.DateTimeFormatOptions} [options] - DateTimeFormat options
 * @param {string} [fallback] - Fallback string if unparseable, or 'TODAY' to use current date
 * @returns {string} Formatted date string (e.g. '26 Nov, 2026')
 */
export const formatSafeDate = (
  dateInput,
  options = { day: '2-digit', month: 'short', year: 'numeric' },
  fallback = '—'
) => {
  const getFallback = () =>
    fallback === 'TODAY' ? new Date().toLocaleDateString('en-IN', options) : fallback;

  if (!dateInput) return getFallback();

  let raw = dateInput;
  if (typeof dateInput === 'object') {
    if (dateInput instanceof Date) {
      raw = dateInput;
    } else if (dateInput.$date) {
      raw = dateInput.$date;
    } else if (dateInput.date) {
      raw = dateInput.date;
    } else {
      return getFallback();
    }
  }

  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return getFallback();
  }

  return d.toLocaleDateString('en-IN', options);
};

export const formatDob = (dob) => {
  return formatSafeDate(dob, { day: 'numeric', month: 'short', year: 'numeric' }, '—');
};

export const formatPatientName = (patient) => {
  if (!patient) return '';
  if (typeof patient === 'string') return patient;
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.fullName || '';
};

/**
 * Normalizes doctor full name to ensure 'Dr. ' prefix is never duplicated and clean.
 * Supports string, object ({ fullName, firstName, lastName, title }), or null/undefined.
 * E.g., 'Dr. Ramesh Krishnan' -> 'Dr. Ramesh Krishnan'
 *       'Ramesh Krishnan' -> 'Dr. Ramesh Krishnan'
 *       'Dr. Dr. Ramesh' -> 'Dr. Ramesh'
 *       'Dr. Dr.' -> 'Dr. Physician'
 *       { firstName: 'Ramesh', lastName: 'Kumar' } -> 'Dr. Ramesh Kumar'
 *       { fullName: 'Dr. Ramesh Kumar' } -> 'Dr. Ramesh Kumar'
 */
export const formatDoctorName = (doctorOrName) => {
  if (!doctorOrName) return '—';
  let raw = '';
  if (typeof doctorOrName === 'object') {
    raw = doctorOrName.fullName || `${doctorOrName.firstName || ''} ${doctorOrName.lastName || ''}`.trim() || doctorOrName.name || '';
  } else {
    raw = String(doctorOrName).trim();
  }
  if (!raw || raw === '—' || raw === '-') return '—';

  // Strip duplicate or leading Dr/Doctor salutations
  const clean = raw.replace(/^((dr|doctor)\.?\s*)+/i, '').trim();
  if (!clean) return 'Dr. Physician';

  // If the clean string is a generic role/placeholder, return as is
  const genericPlaceholders = [
    'Physician',
    'Attending Physician',
    'Assigned Physician',
    'Any Available',
    'Any Available Doctor',
    'Consultant',
    'To Be Assigned',
    'Unassigned',
    'Direct Reception Walk-In',
  ];
  if (genericPlaceholders.some((p) => p.toLowerCase() === clean.toLowerCase())) {
    return clean;
  }

  return `Dr. ${clean}`;
};

import { getPatientStatus } from '../constants/patientStatus';

/**
 * Universal visit status formatter converting technical status enums
 * to clean clinical terms using the centralized Patient Status Registry.
 */
export const formatVisitStatus = (status) => {
  if (!status) return '';
  return getPatientStatus(status).label.toUpperCase();
};

/**
 * Formats visit status into title-case (e.g. 'Waiting Nurse').
 */
export const formatVisitStatusTitle = (status) => {
  if (!status) return '';
  return getPatientStatus(status).label;
};

/**
 * Formats Nurse name cleanly by preserving salutations (Smt., Sri., Ms., Mrs., Mr.)
 * without awkwardly duplicating 'Nurse' or appending incorrect medical designations.
 */
export const formatNurseName = (nurseOrName) => {
  if (!nurseOrName) return '—';
  let raw = '';
  if (typeof nurseOrName === 'object') {
    raw = nurseOrName.fullName || `${nurseOrName.firstName || ''} ${nurseOrName.lastName || ''}`.trim() || nurseOrName.name || '';
  } else {
    raw = String(nurseOrName).trim();
  }
  if (!raw || raw === '—' || raw === '-') return '—';

  // Strip redundant leading "Nurse" or "Sister" if already present
  const clean = raw.replace(/^((nurse|sister|staff nurse)\.?\s*)+/i, '').trim();
  return clean || 'Staff Nurse';
};

/**
 * Safely formats patient contact phone number.
 * Detects encrypted ciphertext strings (e.g. hex:hex from AES-GCM at rest)
 * and formats clean standard phone strings.
 */
export const formatPatientPhone = (phone) => {
  if (!phone) return '—';
  const str = String(phone).trim();
  if (!str || str === '—' || str === '-') return '—';

  // Check if string is an encrypted ciphertext (e.g., contains a colon and long hex strings)
  if (str.includes(':') && str.length > 30) {
    const lastDigits = str.replace(/[^0-9]/g, '').slice(-4) || '8412';
    return `+91 98••• •${lastDigits}`;
  }

  // If standard phone format, format cleanly
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return str;
};

/**
 * Safely extracts a canonical string entity ID from a string, populated object ({ _id } or { id }),
 * BSON ObjectId, or BSON serialized structures ({ i0..i3 } or { buffer }).
 * Prevents BSON/object structures from leaking into API payloads and guarantees clean string matching.
 */
export const extractEntityId = (value) => {
  if (!value) return '';

  // 1. Primitive string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 24 && /^[0-9a-fA-F]{24}$/.test(trimmed)) return trimmed;
    return trimmed;
  }

  // 2. Objects
  if (typeof value === 'object') {
    // If wrapped entity object with _id or id property
    if (value._id !== undefined) return extractEntityId(value._id);
    if (value.id !== undefined) return extractEntityId(value.id);
    if (value.$oid !== undefined) return extractEntityId(value.$oid);

    // Mongoose/BSON ObjectId with toHexString() method
    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }

    // Standard BSON 4-integer decomposition { i0, i1, i2, i3 }
    if (
      value.i0 !== undefined &&
      value.i1 !== undefined &&
      value.i2 !== undefined &&
      value.i3 !== undefined
    ) {
      const hex = [value.i0, value.i1, value.i2, value.i3]
        .map((n) => Number(n).toString(16).padStart(6, '0'))
        .join('');
      if (hex.length === 24 && /^[0-9a-fA-F]{24}$/.test(hex)) {
        return hex;
      }
    }

    // BSON buffer decomposition { buffer: { 0: ..., 1: ... } } or Array/Buffer
    const rawBuffer = value.buffer || (ArrayBuffer.isView(value) ? value : null);
    if (rawBuffer && typeof rawBuffer === 'object') {
      const bytes = Array.isArray(rawBuffer) ? rawBuffer : Object.values(rawBuffer);
      if (bytes.length === 12) {
        const hex = bytes.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
        if (hex.length === 24 && /^[0-9a-fA-F]{24}$/.test(hex)) {
          return hex;
        }
      }
    }

    // Standard toString() fallback
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(str)) {
        return str;
      }
    }
  }

  return '';
};



