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
