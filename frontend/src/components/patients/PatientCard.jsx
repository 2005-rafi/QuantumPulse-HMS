import React from 'react';
import { Md3Avatar, Md3Chip, Icon } from '../md3/Md3Widgets';
import { getPatientInitials, formatPatientName } from '../../utils/patientFormatters';
import './PatientCard.css';

/**
 * PatientCard — Informative, Responsive Material 3 Clinical Card.
 * Displays patient identity, MRN, contact, location, blood group, and clinical timeline.
 */
export const PatientCard = ({
  patient,
  onClick,
  statusBadge,
  typeIndicator = 'OPD',
  isSelected = false,
  actionSlot,
}) => {
  if (!patient) return null;

  const fullName = formatPatientName(patient) || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const age = patient.age ? `${patient.age} yrs` : '';
  const gender = patient.gender || '';
  const demographics = [age, gender].filter(Boolean).join(' • ');

  const city = patient.address?.city || patient.city || '';
  const state = patient.address?.state || patient.state || '';
  const location = [city, state].filter(Boolean).join(', ');

  const formatVisitDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const lastVisit = formatVisitDate(patient.lastVisitDate);
  const nextAppt = patient.latestAppointment?.date ? formatVisitDate(patient.latestAppointment.date) : null;

  return (
    <div
      className={`md3-patient-card ${isSelected ? 'md3-patient-card--selected' : ''}`}
      onClick={() => onClick?.(patient)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
      aria-label={`View profile of ${fullName}`}
    >
      <div className="md3-patient-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER ── */}
      <div className="md3-patient-card-header">
        <div className="md3-patient-card-avatar-wrap">
          <Md3Avatar
            initials={getPatientInitials(patient)}
            size="small"
            variant="primary"
          />
        </div>

        <div className="md3-patient-card-identity">
          <h4 className="md3-patient-card-name" title={fullName}>
            {fullName}
          </h4>
          {demographics && (
            <span className="md3-patient-card-demographics">
              {demographics}
            </span>
          )}
        </div>

        <div className="md3-patient-card-badges">
          {typeIndicator && (
            <span className="md3-patient-type-pill">{typeIndicator}</span>
          )}
          {statusBadge && (
            <span className="md3-patient-status-pill">{statusBadge}</span>
          )}
        </div>
      </div>

      {/* ── MRN & CLINICAL BADGES ── */}
      <div className="md3-patient-card-sub-header">
        <code className="md3-patient-mrn-badge">
          {patient.mrn || 'MRN-PENDING'}
        </code>
        {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
          <span className="md3-patient-blood-pill" title={`Blood Group: ${patient.bloodGroup}`}>
            <Icon.Droplet />
            <span>{patient.bloodGroup}</span>
          </span>
        )}
      </div>

      {/* ── CARD BODY METADATA ── */}
      <div className="md3-patient-card-details">
        {patient.phone && (
          <div className="md3-patient-meta-row" title={`Phone: ${patient.phone}`}>
            <Icon.Phone />
            <span className="md3-patient-meta-text">{patient.phone}</span>
          </div>
        )}

        {location && (
          <div className="md3-patient-meta-row" title={`Location: ${location}`}>
            <Icon.Location />
            <span className="md3-patient-meta-text">{location}</span>
          </div>
        )}

        {lastVisit && (
          <div className="md3-patient-meta-row md3-patient-meta-row--timeline" title={`Last OPD Visit: ${lastVisit}`}>
            <Icon.Calendar />
            <span className="md3-patient-meta-text">
              Last Visit: <strong>{lastVisit}</strong>
            </span>
          </div>
        )}

        {nextAppt && (
          <div className="md3-patient-meta-row md3-patient-meta-row--appt" title={`Upcoming Appointment: ${nextAppt}`}>
            <Icon.Clock />
            <span className="md3-patient-meta-text">
              Appt: <strong>{nextAppt}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── CARD FOOTER ACTION ── */}
      <div className="md3-patient-card-footer">
        <span className="md3-patient-view-action">
          <span>View Profile</span>
          <Icon.ChevronRight />
        </span>
        {actionSlot && (
          <div className="md3-patient-card-action-slot" onClick={(e) => e.stopPropagation()}>
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientCard;
