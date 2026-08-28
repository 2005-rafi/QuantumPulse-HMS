import React from 'react';
import { formatTimeOnly } from '../../utils/dateFormatting';

/* ============================================================
   QueuePatientCard — Pure Material 3 Clinical Doctor Queue Card
   Path: frontend/src/features/doctor/QueuePatientCard.jsx
   ============================================================ */

const STATUS_CONFIG = {
  WAITING_DOCTOR:        { label: 'Waiting',            variant: 'waiting',     icon: 'schedule' },
  CALLED:                { label: 'Called',             variant: 'called',      icon: 'volume_up' },
  IN_PROGRESS:           { label: 'In Consult',         variant: 'progress',    icon: 'stethoscope' },
  WAITING_DOCTOR_REVIEW: { label: 'Lab Ready',          variant: 'review',      icon: 'biotech' },
  WAITING_LAB:           { label: 'At Laboratory',      variant: 'lab',         icon: 'science' },
  COMPLETED:             { label: 'Completed',          variant: 'completed',   icon: 'check_circle' },
  SKIPPED:               { label: 'Skipped',            variant: 'skipped',     icon: 'forward_media' },
};

const decodeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const maskPhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 2)}••• •${cleaned.slice(-4)}`;
  }
  return phone;
};

const QueuePatientCard = ({
  visit,
  isSelected,
  onClick,
  waitTime,
  onCall,
  onSkip,
}) => {
  const patient = (visit?.patientId && typeof visit.patientId === 'object') ? visit.patientId : {};
  const status = visit?.status || 'WAITING_DOCTOR';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.WAITING_DOCTOR;
  const vitals = visit?.vitals || {};

  const tokenDisplay = visit?.tokenString ?? (visit?.visitNumber?.slice(-4) ?? 'GEN-—');
  const mrnDisplay = patient.mrn?.startsWith('MRN-')
    ? patient.mrn
    : (patient.mrn ? `MRN-${patient.mrn}` : 'MRN: —');

  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Unnamed Patient';
  const arrivalTime = visit?.createdAt ? formatTimeOnly(visit.createdAt) : null;
  const maskedPhone = maskPhone(patient.phoneNumber);
  const visitType = visit?.visitType || (visit?.appointmentType === 'WALK_IN' ? 'Walk-in' : 'OPD');

  // Format clean wait/arrival string
  let cleanTimeText = '';
  if (waitTime && arrivalTime) {
    cleanTimeText = `${waitTime} · ${arrivalTime}`;
  } else if (arrivalTime) {
    cleanTimeText = arrivalTime;
  } else if (waitTime) {
    cleanTimeText = waitTime;
  }

  // Allergy parsing
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

  const bpVal = vitals.bloodPressure || (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}` : null);

  // Check if vitals exist for quick snapshot
  const hasRecordedVitals = Boolean(
    bpVal || vitals.pulseRate || vitals.temperature || vitals.spO2 || vitals.weight
  );

  const showCall = onCall && (status === 'WAITING_DOCTOR' || status === 'SKIPPED');
  const showSkip = onSkip && status === 'CALLED';

  const cardClasses = [
    'doctor-queue-card',
    `doctor-queue-card--${config.variant}`,
    isSelected ? 'doctor-queue-card--selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* ─── 1. Header Row: Token & Type (Left) | Status & Quick Actions (Right) ─── */}
      <div className="doctor-queue-card__header-row">
        <div className="doctor-queue-card__badge-cluster">
          <span className="doctor-queue-card__token">{tokenDisplay}</span>
          {visitType && <span className="doctor-queue-card__type-tag">{visitType}</span>}
        </div>

        <div className="doctor-queue-card__header-right">
          <span className={`doctor-queue-card__status-tag doctor-queue-card__status-tag--${config.variant}`}>
            <span className="material-symbols-rounded">{config.icon}</span>
            <span>{config.label}</span>
          </span>

          {/* Action buttons (Call / Skip) */}
          {(showCall || showSkip) && (
            <div className="doctor-queue-card__actions" onClick={(e) => e.stopPropagation()}>
              {showCall && (
                <button
                  type="button"
                  className="doctor-card-action-btn doctor-card-action-btn--call"
                  onClick={(e) => { e.stopPropagation(); onCall?.(visit._id); }}
                  title="Call Patient"
                >
                  <span className="material-symbols-rounded">volume_up</span>
                  <span>Call</span>
                </button>
              )}
              {showSkip && (
                <button
                  type="button"
                  className="doctor-card-action-btn doctor-card-action-btn--skip"
                  onClick={(e) => { e.stopPropagation(); onSkip?.(visit._id); }}
                  title="Skip Patient"
                >
                  <span className="material-symbols-rounded">forward_media</span>
                  <span>Skip</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Patient Identity & Demographics Row ─── */}
      <div className="doctor-queue-card__identity-row">
        <div className="doctor-queue-card__avatar">{initials}</div>
        <div className="doctor-queue-card__identity-details">
          <div className="doctor-queue-card__name-row">
            <h4 className="doctor-queue-card__name">{name}</h4>
          </div>
          <div className="doctor-queue-card__tags-row">
            <span className="doctor-queue-card__mrn-tag">{mrnDisplay}</span>
            {ageGender && <span className="doctor-queue-card__demog-tag">{ageGender}</span>}
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <span className="doctor-queue-card__blood-tag" title="Blood Group">
                <span className="material-symbols-rounded">bloodtype</span>
                <span>{patient.bloodGroup}</span>
              </span>
            )}
            {cleanTimeText && (
              <span className="doctor-queue-card__wait-pill" title="Arrival Time & Wait Duration">
                <span className="material-symbols-rounded">schedule</span>
                <span>{cleanTimeText}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Triage Vitals Quick Snapshot (Instant Doctor Insight) ─── */}
      {hasRecordedVitals && (
        <div className="doctor-queue-card__vitals-bar" title="Check-in Triage Vitals">
          {bpVal && (
            <span className="doctor-queue-card__vital-item">
              <span className="material-symbols-rounded doc-vital-icon">cardiology</span>
              <span className="doc-vital-label">BP</span>
              <span className="doc-vital-val">{bpVal}</span>
            </span>
          )}
          {vitals.pulseRate && (
            <span className="doctor-queue-card__vital-item">
              <span className="material-symbols-rounded doc-vital-icon">favorite</span>
              <span className="doc-vital-label">Pulse</span>
              <span className="doc-vital-val">{vitals.pulseRate} bpm</span>
            </span>
          )}
          {vitals.temperature && (
            <span className="doctor-queue-card__vital-item">
              <span className="material-symbols-rounded doc-vital-icon">device_thermostat</span>
              <span className="doc-vital-label">Temp</span>
              <span className="doc-vital-val">{vitals.temperature}°F</span>
            </span>
          )}
          {vitals.spO2 && (
            <span className="doctor-queue-card__vital-item">
              <span className="material-symbols-rounded doc-vital-icon">air</span>
              <span className="doc-vital-label">SpO₂</span>
              <span className="doc-vital-val">{vitals.spO2}%</span>
            </span>
          )}
        </div>
      )}

      {/* ─── 4. Critical Allergies Alert (Safety First) ─── */}
      {hasAllergies && (
        <div className="doctor-queue-card__alert-bar">
          <span className="material-symbols-rounded">warning</span>
          <span className="doc-alert-text"><strong>Allergy:</strong> {allergyText}</span>
        </div>
      )}

      {/* ─── 5. Chief Complaint / Reason for Visit Box ─── */}
      {(visit?.vitals?.chiefComplaint || visit?.reason) && (
        <div className="doctor-queue-card__reason-box">
          <span className="material-symbols-rounded">assignment</span>
          <span className="doctor-queue-card__reason-text">
            <strong>Reason:</strong> {decodeHtml(visit?.vitals?.chiefComplaint || visit.reason)}
          </span>
        </div>
      )}
    </div>
  );
};

export default QueuePatientCard;
