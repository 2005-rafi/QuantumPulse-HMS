export const formatElapsedTime = (dateString) => {
  if (!dateString) return '0m';

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${Math.floor(seconds / 60)}m`;
};

export const formatPatientName = (patient = {}) => {
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown patient';
};

export const getPatientInitials = (patient = {}) => {
  const fullName = formatPatientName(patient);
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PT';
};

export const getPatientAge = (patient = {}) => {
  if (patient.age != null) return patient.age;
  if (!patient.dob) return '—';

  const dob = new Date(patient.dob);
  if (Number.isNaN(dob.getTime())) return '—';

  const diff = Date.now() - dob.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
};

export const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
};

export const countOrdersByStatus = (visits = [], status) => {
  return visits.reduce((total, visit) => {
    const matches = (visit.labOrders || []).filter((order) => order.status === status).length;
    return total + matches;
  }, 0);
};

export const countPendingOrders = (visit) => {
  return (visit?.labOrders || []).filter((order) => order.status !== 'COMPLETED').length;
};

export const getLongestWait = (visits = []) => {
  if (!visits.length) return '0m';

  const longest = visits.reduce((candidate, visit) => {
    if (!candidate) return visit;
    return new Date(visit.updatedAt) < new Date(candidate.updatedAt) ? visit : candidate;
  }, null);

  return formatElapsedTime(longest?.updatedAt);
};

export const getClinicalContext = (visit = {}) => {
  return {
    chiefComplaint: visit.consultation?.chiefComplaint || visit.vitals?.chiefComplaint || 'No complaint documented',
    diagnosis: visit.consultation?.diagnosis || 'Pending diagnosis',
    requestedBy: visit.consultation?.doctorId?.fullName || 'Unknown clinician',
  };
};
