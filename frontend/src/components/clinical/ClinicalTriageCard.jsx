import React, { memo } from 'react';
import './ClinicalTriageCard.css';

/* ============================================================
   ClinicalTriageCard — Material Design 3 Clinical Triage Card
   Path: frontend/src/components/clinical/ClinicalTriageCard.jsx

   SOLID Principles:
     SRP — Displays individual patient triage/intake card in a compact, clinical format.
     OCP — Extensible via customActions prop and flexible slot design.
     LSP / DIP — Fully isolated pure presentation component.

   Design Architecture:
     - Material 3 surface elevation, typography & iconography.
     - Ergonomic clinical density: compact footprint, high legibility.
     - Multi-breakpoint responsive layout (up to 5 cards per row on desktop).
   ============================================================ */

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTimeOnly = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatStatusBadge = (status, triageStatus) => {
  if (triageStatus === 'SKIPPED') {
    return {
      label: 'Fast-Tracked',
      icon: 'bolt',
      className: 'ctc-status--skipped',
    };
  }
  switch (status) {
    case 'COMPLETED':
      return { label: 'Complete', icon: 'check_circle', className: 'ctc-status--completed' };
    case 'IN_PROGRESS':
      return { label: 'In Consult', icon: 'stethoscope', className: 'ctc-status--progress' };
    case 'WAITING_DOCTOR':
      return { label: 'Waiting Doctor', icon: 'schedule', className: 'ctc-status--waiting' };
    case 'WAITING_DOCTOR_REVIEW':
      return { label: 'Lab Ready', icon: 'biotech', className: 'ctc-status--review' };
    case 'WAITING_LAB':
      return { label: 'At Lab', icon: 'science', className: 'ctc-status--lab' };
    default:
      return { label: status?.replace(/_/g, ' ') || 'Triaged', icon: 'done_all', className: 'ctc-status--default' };
  }
};

export const calculateBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const hM = heightCm / 100;
  if (hM <= 0) return null;
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));
  let category = 'Normal';
  let level = 'normal'; // 'underweight' | 'normal' | 'overweight' | 'obese'

  if (bmi < 18.5) {
    category = 'Underweight';
    level = 'underweight';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'Overweight';
    level = 'overweight';
  } else if (bmi >= 30) {
    category = 'Obese';
    level = 'obese';
  }
  return { value: bmi, category, level };
};

export const ClinicalTriageCard = memo(({
  visit,
  currentStaffId,
  onViewDetails,
  onRevoke,
  isRevoking = false,
  customActions,
  className = '',
}) => {
  if (!visit) return null;

  const patient = visit.patientId || {};
  const firstName = (patient.firstName || '').trim();
  const lastName = (patient.lastName || '').trim();
  const rawFullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const fullName = rawFullName.replace(/[\s\-_]+$/, '').trim() || 'Unnamed Patient';
  const token = visit.tokenString || visit.visitNumber || 'TOKEN';
  const mrn = patient.mrn || '';
  const isSkipped = visit.triage?.status === 'SKIPPED';
  const statusBadge = formatStatusBadge(visit.status, visit.triage?.status);
  const isRevokable = isSkipped && visit.status === 'WAITING_DOCTOR';

  // Nurse Attribution
  const triagingNurse = visit.vitals?.recordedBy;
  const skippingNurse = visit.triage?.skippedBy;
  const nurseName = triagingNurse?.fullName || skippingNurse?.fullName || (isSkipped ? 'Fast-Track Nurse' : 'Triage Nurse');
  const nurseEmpId = triagingNurse?.employeeId || skippingNurse?.employeeId || '';

  const recById = (triagingNurse?._id || triagingNurse)?.toString();
  const skipById = (skippingNurse?._id || skippingNurse)?.toString();
  const currId = currentStaffId?.toString();
  const isMyIntake = Boolean(currId && (recById === currId || skipById === currId));

  // Vitals
  const vitals = visit.vitals || {};
  const hasVitals = Boolean(
    vitals.bloodPressure ||
    vitals.pulse ||
    vitals.temperature ||
    vitals.oxygenSaturation
  );
  const bmiInfo = calculateBmi(vitals.weight, vitals.height);

  // Demographic details
  const demoParts = [
    patient.age ? patient.age + 'y' : null,
    patient.gender ? (patient.gender.toLowerCase().startsWith('m') ? 'M' : patient.gender.toLowerCase().startsWith('f') ? 'F' : patient.gender) : null,
    patient.bloodGroup && patient.bloodGroup !== 'Unknown' ? patient.bloodGroup : null,
  ].filter(Boolean);

  const complaintText = vitals.chiefComplaint || visit.reasonForVisit || '';

  return (
    <article
      className={'ctc-card ' + (isSkipped ? 'ctc-card--skipped ' : '') + (isMyIntake ? 'ctc-card--my-intake ' : '') + className}
      data-visit-id={visit._id}
    >
      {/* ─── 1. Header: Nurse Attribution Bar ─── */}
      <div className="ctc-card__nurse-strip">
        <div className="ctc-nurse-info" title={(isSkipped ? 'Fast-tracked by ' : 'Triaged by ') + 'Nurse ' + nurseName + (nurseEmpId ? ' (' + nurseEmpId + ')' : '')}>
          <span className="material-symbols-rounded ctc-nurse-icon">
            {isSkipped ? 'bolt' : 'medical_services'}
          </span>
          <span className="ctc-nurse-text">
            {isSkipped ? 'Fast-track:' : 'Nurse:'}{' '}
            <strong className="ctc-nurse-name">{nurseName}</strong>
            {nurseEmpId && <small className="ctc-nurse-empid"> ({nurseEmpId})</small>}
          </span>
        </div>

        {isMyIntake && (
          <span className="ctc-my-chip" title="Triaged by you">
            <span className="material-symbols-rounded">person</span>
            <span>Mine</span>
          </span>
        )}
      </div>

      {/* ─── 2. Token, Type & Visit Status Row (Symmetric Header) ─── */}
      <div className="ctc-card__token-row">
        <div className="ctc-token-capsule" title={`Token: ${token} • Type: ${visit.visitType || 'OPD'}`}>
          <span className="ctc-token-num">{token}</span>
          <span className="ctc-token-divider" aria-hidden="true">•</span>
          <span className="ctc-token-type">{visit.visitType || 'OPD'}</span>
        </div>

        <div className={'ctc-status-badge ' + statusBadge.className} title={statusBadge.label}>
          <span className="material-symbols-rounded">{statusBadge.icon}</span>
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* ─── 3. Patient Demographics Row ─── */}
      <div className="ctc-card__patient-row">
        <div className="ctc-avatar" aria-hidden="true">
          {((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || 'P'}
        </div>
        <div className="ctc-patient-details">
          <div className="ctc-patient-name" title={fullName}>
            {fullName}
          </div>
          <div className="ctc-patient-meta">
            {demoParts.length > 0 && <span className="ctc-demo">{demoParts.join(' • ')}</span>}
            {mrn && <span className="ctc-mrn" title={'MRN: ' + mrn}>{mrn}</span>}
          </div>
        </div>
      </div>

      {/* ─── 4. Clinical Vitals Matrix ─── */}
      {hasVitals ? (
        <div className="ctc-vitals-strip">
          {vitals.bloodPressure && (
            <div className="ctc-vital-cell" title="Blood Pressure (Systolic/Diastolic)">
              <span className="ctc-vital-val">{vitals.bloodPressure}</span>
              <span className="ctc-vital-lbl">BP</span>
            </div>
          )}
          {vitals.pulse !== undefined && vitals.pulse !== null && (
            <div className={'ctc-vital-cell ' + (vitals.pulse > 100 || vitals.pulse < 55 ? 'ctc-vital-cell--warn' : '')} title="Pulse / Heart Rate">
              <span className="ctc-vital-val">{vitals.pulse}</span>
              <span className="ctc-vital-lbl">HR</span>
            </div>
          )}
          {vitals.temperature !== undefined && vitals.temperature !== null && (
            <div className={'ctc-vital-cell ' + (vitals.temperature >= 100.4 ? 'ctc-vital-cell--warn' : '')} title="Body Temperature">
              <span className="ctc-vital-val">{vitals.temperature}</span>
              <span className="ctc-vital-lbl">°F</span>
            </div>
          )}
          {vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation !== null && (
            <div className={'ctc-vital-cell ' + (vitals.oxygenSaturation < 95 ? 'ctc-vital-cell--warn' : '')} title="Oxygen Saturation (SpO2)">
              <span className="ctc-vital-val">{vitals.oxygenSaturation}%</span>
              <span className="ctc-vital-lbl">SpO2</span>
            </div>
          )}
          {bmiInfo && (
            <div className={'ctc-vital-cell ctc-vital-cell--bmi ctc-vital-cell--' + bmiInfo.level} title={'BMI: ' + bmiInfo.value + ' (' + bmiInfo.category + ')'}>
              <span className="ctc-vital-val">{bmiInfo.value}</span>
              <span className="ctc-vital-lbl">BMI</span>
            </div>
          )}
        </div>
      ) : isSkipped ? (
        <div className="ctc-skipped-banner">
          <span className="material-symbols-rounded">speed</span>
          <span className="ctc-skipped-text" title={visit.triage?.skipReason || 'Fast-tracked for immediate doctor consultation'}>
            <strong>Fast-Track:</strong> {visit.triage?.skipReason || 'Direct consult'}
          </span>
        </div>
      ) : (
        <div className="ctc-empty-vitals">
          <span>Pending vitals intake</span>
        </div>
      )}

      {/* ─── 5. Chief Complaint / Note Row ─── */}
      {complaintText && (
        <div className="ctc-complaint-row" title={'Chief Complaint: ' + complaintText}>
          <span className="material-symbols-rounded ctc-complaint-icon">notes</span>
          <span className="ctc-complaint-text">{complaintText}</span>
        </div>
      )}

      {/* ─── 6. Footer: Timestamps & Action Buttons ─── */}
      <div className="ctc-card__footer">
        <div className="ctc-timestamp" title={'Check-in: ' + formatDateTime(visit.createdAt)}>
          <span className="material-symbols-rounded">schedule</span>
          <span>{formatTimeOnly(vitals.recordedAt || visit.triage?.skippedAt || visit.updatedAt || visit.createdAt)}</span>
        </div>

        <div className="ctc-actions">
          {isRevokable && onRevoke && (
            <button
              type="button"
              className="ctc-btn ctc-btn--revoke"
              onClick={() => onRevoke(visit._id)}
              disabled={isRevoking}
              title="Revoke skip and recall patient for vitals"
            >
              <span className="material-symbols-rounded">undo</span>
              <span>Revoke</span>
            </button>
          )}

          {customActions}

          {onViewDetails && (
            <button
              type="button"
              className="ctc-btn ctc-btn--view"
              onClick={() => onViewDetails(visit)}
              title="View full clinical assessment and vitals"
            >
              <span className="material-symbols-rounded">visibility</span>
              <span>View</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

ClinicalTriageCard.displayName = 'ClinicalTriageCard';

export default ClinicalTriageCard;
