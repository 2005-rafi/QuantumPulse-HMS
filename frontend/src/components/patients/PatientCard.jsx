import React from 'react';
import { Md3Avatar, Md3Chip, Icon } from '../md3/Md3Widgets';
import { getPatientInitials, formatPatientName } from '../../utils/patientFormatters';
import { usePatientStatus } from '../../context/PatientStatusContext';
import { getPatientStatus } from '../../constants/patientStatus';
import './PatientCard.css';

/**
 * PatientCard — Informative, Responsive Material 3 Clinical Card.
 * Displays patient identity, MRN, contact, location, blood group, and clinical timeline.
 * Engineered for medical professionals on mobile, tablet, and desktop viewports.
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

  const { getLiveStatus } = usePatientStatus();
  const patientId = patient._id || patient.id;
  const fallbackStatus = patient.currentState || patient.lastVisitStatus || 'REGISTERED_IDLE';
  const liveInfo = getLiveStatus(patientId, fallbackStatus);
  const statusMeta = liveInfo.statusMeta || getPatientStatus(liveInfo.status);
  const currentToken = liveInfo.tokenString || patient.activeVisit?.tokenString;

  const currentDept =
    patient.activeVisit?.department ||
    (typeof patient.activeVisit?.departmentId === 'object' ? patient.activeVisit.departmentId?.name : null) ||
    patient.department;

  const currentDoctor =
    patient.activeVisit?.doctorName ||
    patient.activeVisit?.consultation?.doctorName ||
    (typeof patient.activeVisit?.doctorId === 'object' ? patient.activeVisit.doctorId?.name : null);

  const fullName = formatPatientName(patient) || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const age = patient.age !== undefined && patient.age !== null && patient.age !== '' ? `${patient.age} yrs` : '';
  const gender = patient.gender || '';
  const demographics = [age, gender].filter(Boolean).join(' • ');

  const city = patient.address?.city || patient.city || '';
  const state = patient.address?.state || patient.state || '';
  const location = [city, state].filter(Boolean).join(', ');

  const formatVisitDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const lastVisit = formatVisitDate(patient.lastVisitDate);
  const nextAppt = patient.latestAppointment?.date ? formatVisitDate(patient.latestAppointment.date) : null;

  const rawType = String(typeIndicator || patient.currentState || patient.lastVisitType || 'IDLE').toUpperCase();
  const isIpd = rawType === 'IPD' || !!patient.activeAdmission;
  const isEmergency = rawType === 'EMERGENCY' || patient.activeAdmission?.admissionType === 'EMERGENCY';
  const isOpd = !isIpd && !isEmergency && (rawType === 'OPD' || patient.lastVisitType === 'OPD');

  const typeClassModifier = isEmergency
    ? 'md3-patient-type-pill--emergency'
    : isIpd
    ? 'md3-patient-type-pill--ipd'
    : isOpd
    ? 'md3-patient-type-pill--opd'
    : 'md3-patient-type-pill--idle';

  const displayTypeLabel = isEmergency
    ? 'EMERGENCY'
    : isIpd
    ? patient.activeAdmission?.bedNumber
      ? `IPD • Bed ${patient.activeAdmission.bedNumber}`
      : 'IPD'
    : isOpd
    ? 'OPD'
    : 'REGISTERED';

  return (
    <div
      className={`md3-patient-card ${isSelected ? 'md3-patient-card--selected' : ''}`}
      onClick={() => onClick?.(patient)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(patient);
        }
      }}
      aria-label={`View profile of ${fullName}`}
    >
      <div className="md3-patient-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER: AVATAR, IDENTITY & STATUS ── */}
      <div className="md3-patient-card-header">
        <div className="md3-patient-card-avatar-wrap">
          <Md3Avatar
            initials={getPatientInitials(patient)}
            size="small"
            variant="primary"
          />
        </div>

        <div className="md3-patient-card-identity">
          <div className="md3-patient-card-name-row">
            <h4 className="md3-patient-card-name" title={fullName}>
              {fullName}
            </h4>
            <span className={`md3-patient-type-pill ${typeClassModifier}`}>
              {displayTypeLabel}
            </span>
          </div>

          <div className="md3-patient-card-sub-id">
            <code
              className="md3-patient-mrn-badge"
              title={`Click to copy UHID: ${patient.mrn || 'N/A'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (patient?.mrn) {
                  navigator.clipboard?.writeText(patient.mrn);
                }
              }}
            >
              <span className="material-symbols-rounded">tag</span>
              {patient.mrn || 'MRN-PENDING'}
            </code>
            {demographics && (
              <span className="md3-patient-card-demographics">
                {demographics}
              </span>
            )}
            <span
              className={`md3-patient-blood-pill ${patient.bloodGroup && patient.bloodGroup !== 'Unknown' ? 'is-recorded' : 'is-empty'}`}
              title={`Blood Group: ${patient.bloodGroup || 'Not Recorded'}`}
            >
              <span className="material-symbols-rounded md3-patient-blood-icon" aria-hidden="true">
                water_drop
              </span>
              <span>{patient.bloodGroup && patient.bloodGroup !== 'Unknown' ? patient.bloodGroup : '—'}</span>
            </span>
          </div>
        </div>

        <div className="md3-patient-card-status-col">
          <span
            className={`md3-patient-status-pill ${statusMeta.badgeClass || 'md3-status-badge--neutral'}`}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '13px', lineHeight: 1 }}>
              {statusMeta.icon || 'fiber_manual_record'}
            </span>
            <span>{statusMeta.shortLabel || statusMeta.label}</span>
          </span>
        </div>
      </div>

      {/* ── CLINICAL WORKFLOW / QUEUE DETAILS ── */}
      {(currentToken || currentDept || currentDoctor || (isIpd && patient.activeAdmission)) && (
        <div className="md3-patient-card-workflow-box">
          {currentToken && (
            <span className="md3-patient-token-badge" title={`Active Token: ${currentToken}`}>
              <span className="material-symbols-rounded">confirmation_number</span>
              <span>{currentToken}</span>
            </span>
          )}
          {currentDept && (
            <span className="md3-patient-workflow-text" title={`Department: ${currentDept}`}>
              <span className="material-symbols-rounded">apartment</span>
              <span>{currentDept}</span>
            </span>
          )}
          {currentDoctor && (
            <span className="md3-patient-workflow-text" title={`Doctor: Dr. ${currentDoctor}`}>
              <span className="material-symbols-rounded">stethoscope</span>
              <span>Dr. {currentDoctor}</span>
            </span>
          )}
          {isIpd && patient.activeAdmission && (
            <span className="md3-patient-workflow-text md3-patient-workflow-text--bed" title={`Inpatient Bed: ${patient.activeAdmission.bedNumber || 'Admitted'}`}>
              <span className="material-symbols-rounded">hotel</span>
              <span>Bed {patient.activeAdmission.bedNumber || 'Inpatient'}</span>
            </span>
          )}
        </div>
      )}

      {/* ── CONTACT & FOOTER ── */}
      <div className="md3-patient-card-footer">
        <div className="md3-patient-card-footer-meta">
          {patient.phone && (
            <span className="md3-patient-meta-item" title={`Mobile: ${patient.phone}`}>
              <span className="material-symbols-rounded">call</span>
              <span>{patient.phone}</span>
            </span>
          )}
          {city && (
            <span className="md3-patient-meta-item" title={`Location: ${location || city}`}>
              <span className="material-symbols-rounded">location_on</span>
              <span>{city}</span>
            </span>
          )}
          {lastVisit && !isIpd && (
            <span className="md3-patient-meta-item md3-meta-last-visit" title={`Last Visit: ${lastVisit}`}>
              <span className="material-symbols-rounded">calendar_today</span>
              <span>{lastVisit}</span>
            </span>
          )}
          {nextAppt && (
            <span className="md3-patient-meta-item md3-meta-appt" title={`Upcoming Appointment: ${nextAppt}`}>
              <span className="material-symbols-rounded">event</span>
              <span>Appt: {nextAppt}</span>
            </span>
          )}
        </div>
        <div className="md3-patient-card-action-wrap">
          <span className="md3-patient-view-action" title="View Patient Profile">
            <span className="md3-view-label">Profile</span>
            <span className="material-symbols-rounded">chevron_right</span>
          </span>
          {actionSlot && (
            <div className="md3-patient-card-action-slot" onClick={(e) => e.stopPropagation()}>
              {actionSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientCard;

