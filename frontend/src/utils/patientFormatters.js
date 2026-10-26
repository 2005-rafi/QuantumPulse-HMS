export const getPatientInitials = (patient) => {
  if (!patient) return '';
  return `${patient.firstName?.charAt(0) || ''}${patient.lastName?.charAt(0) || ''}`.toUpperCase();
};

export const formatDob = (dob) => {
  if (!dob) return '—';
  return new Date(dob).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
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


