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
 * Normalizes doctor full name to ensure 'Dr. ' prefix is never duplicated.
 * E.g., 'Dr. Ramesh Krishnan' -> 'Dr. Ramesh Krishnan'
 *       'Ramesh Krishnan' -> 'Dr. Ramesh Krishnan'
 *       'Dr. Dr. Ramesh' -> 'Dr. Ramesh'
 */
export const formatDoctorName = (name) => {
  if (!name) return '—';
  const clean = String(name).replace(/^(Dr\.?\s*)+/i, '').trim();
  return clean ? `Dr. ${clean}` : '—';
};
