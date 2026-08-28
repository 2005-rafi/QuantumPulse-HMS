import React from 'react';

/* ============================================================
   PatientIdentityHeader — Doctor Consultation Patient Demographics Hero
   Path: frontend/src/features/doctor/PatientIdentityHeader.jsx
   ============================================================ */

const STATUS_CONFIG = {
  IN_PROGRESS:           { label: 'In Consultation',    variant: 'progress' },
  WAITING_DOCTOR:        { label: 'Waiting Doctor',     variant: 'waiting' },
  WAITING_DOCTOR_REVIEW: { label: 'Lab Results Ready',  variant: 'review' },
  SCHEDULED:             { label: 'Scheduled Booking',  variant: 'waiting' },
  CONFIRMED:             { label: 'Confirmed Appt',     variant: 'waiting' },
  CHECKED_IN:            { label: 'Checked In / Ready', variant: 'progress' },
  COMPLETED:             { label: 'Completed',          variant: 'completed' },
  BILLED:                { label: 'Billed',             variant: 'completed' },
  DISPENSED:             { label: 'Dispensed',          variant: 'completed' },
  CANCELLED:             { label: 'Cancelled',          variant: 'waiting' },
};

const maskPhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 2)}••• •${cleaned.slice(-4)}`;
  }
  return phone;
};

const formatApptDate = (dateVal) => {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return String(dateVal);
  }
};

const PatientIdentityHeader = ({ visit }) => {
  const patient = (visit?.patientId && typeof visit.patientId === 'object' && (visit.patientId.firstName || visit.patientId.lastName || visit.patientId.mrn))
    ? visit.patientId
    : (visit?.patient && typeof visit.patient === 'object')
    ? visit.patient
    : (visit && (visit.firstName || visit.lastName || visit.mrn))
    ? visit
    : (visit?.patientId && typeof visit.patientId === 'object')
    ? visit.patientId
    : {};
  const status = visit?.status || (visit?.appointmentNumber ? 'SCHEDULED' : 'IN_PROGRESS');
  const config = STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), variant: 'waiting' };

  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || 'PT';
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Unnamed Patient';

  const mrnDisplay = patient.mrn?.startsWith('MRN-')
    ? patient.mrn
    : (patient.mrn ? `MRN-${patient.mrn}` : 'MRN: N/A');

  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const isNoneOrNkda = (text) => {
    if (!text) return true;
    if (typeof text === 'string') {
      const clean = text.trim().toUpperCase();
      return (
        clean === '' ||
        clean === 'NONE' ||
        clean === 'NIL' ||
        clean === 'NO' ||
        clean === 'NKDA' ||
        clean === 'NO KNOWN ALLERGIES' ||
        clean === 'NO KNOWN DRUG ALLERGIES' ||
        clean === 'N/A' ||
        clean === 'NULL' ||
        clean === 'UNDEFINED'
      );
    }
    return false;
  };

  const rawAllergies = Array.isArray(patient.allergies)
    ? patient.allergies.filter(a => !isNoneOrNkda(a))
    : (typeof patient.allergies === 'string' && !isNoneOrNkda(patient.allergies))
      ? patient.allergies.split(',').map(s => s.trim()).filter(s => !isNoneOrNkda(s))
      : [];

  const allergyText = rawAllergies.join(', ');
  const hasAllergies = rawAllergies.length > 0;
  const tokenString = visit?.tokenString || (visit?.visitNumber && visit.visitNumber !== 'Pending Check-In' ? visit.visitNumber.slice(-4) : '—');
  const maskedPhone = maskPhone(patient.phoneNumber);

  const hasAppointment = Boolean(
    visit?.appointmentDate || visit?.startTime || visit?.appointmentNumber || visit?.appointmentId
  );
  const formattedApptDate = formatApptDate(visit?.appointmentDate);

  return (
    <div className="doc-identity-banner">
      {/* ── Critical Allergy Alert Strip (if present) ── */}
      {hasAllergies && (
        <div className="doc-identity-banner__allergy-strip">
          <span className="material-symbols-rounded">warning</span>
          <span><strong>KNOWN ALLERGY ALERT:</strong> {allergyText}</span>
        </div>
      )}

      <div className="doc-identity-banner__body">
        {/* Left Column: Avatar & Patient Details */}
        <div className="doc-identity-banner__left">
          <div className="doc-identity-banner__avatar">{initials}</div>
          <div className="doc-identity-banner__details">
            <div className="doc-identity-banner__name-row">
              <h2 className="doc-identity-banner__name">{name}</h2>
              <span className="doc-identity-banner__mrn-pill">{mrnDisplay}</span>
            </div>

            <div className="doc-identity-banner__chips-row">
              {ageGender && (
                <span className="doc-identity-banner__tag">
                  <span className="material-symbols-rounded">person</span>
                  <span>{ageGender}</span>
                </span>
              )}
              {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                <span className="doc-identity-banner__tag doc-identity-banner__tag--blood">
                  <span className="material-symbols-rounded">bloodtype</span>
                  <span>{patient.bloodGroup}</span>
                </span>
              )}
              {maskedPhone && (
                <span className="doc-identity-banner__tag">
                  <span className="material-symbols-rounded">call</span>
                  <span>{maskedPhone}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Appointment Details, Queue Token, Visit Number & Status */}
        <div className="doc-identity-banner__right">
          {/* Top Appointment Date & Time Box (Rendered before Queue Token & Visit Ticket) */}
          {hasAppointment && (
            <div className="doc-identity-banner__appointment-box">
              <span className="doc-identity-banner__appointment-label">
                <span className="material-symbols-rounded">calendar_month</span>
                <span>Appointment</span>
              </span>
              <span className="doc-identity-banner__appointment-val">
                {formattedApptDate || 'Scheduled Date'}
                {visit?.startTime ? ` • ${visit.startTime}${visit.endTime ? `–${visit.endTime}` : ''}` : ''}
              </span>
            </div>
          )}

          <div className="doc-identity-banner__token-box">
            <span className="doc-identity-banner__token-label">Queue Token</span>
            <span className="doc-identity-banner__token-val">{tokenString}</span>
          </div>

          <div className="doc-identity-banner__visit-box">
            <span className="doc-identity-banner__visit-label">
              {visit?.visitNumber && visit.visitNumber !== 'Pending Check-In' ? 'Visit Ticket' : 'Appt Code'}
            </span>
            <span className="doc-identity-banner__visit-val">
              {visit?.visitNumber && visit.visitNumber !== 'Pending Check-In'
                ? visit.visitNumber
                : visit?.appointmentNumber || '—'}
            </span>
          </div>

          <div className="doc-identity-banner__divider" />

          <span className={`doc-identity-banner__status-pill doc-identity-banner__status-pill--${config.variant}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PatientIdentityHeader;
