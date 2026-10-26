/**
 * components/ipd/IpdPatientBanner.jsx
 * Pure Material 3 Inpatient Clinical Identity & Encounter Banner.
 * Upgraded layout: prominent patient full name at top, followed by structured
 * demographics and aligned clinical encounter metrics strip.
 */
import React from 'react';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';

export const IpdPatientBanner = ({
  admission,
  latestVitals,
  onOpenRecordVitals,
  onOpenUtilities,
}) => {
  if (!admission) return null;

  const patient = admission.patientId || {};
  const bed = admission.currentBedId;
  const room = admission.currentRoomId;
  const doctor = admission.primaryDoctorId;

  const patientFullName = formatPatientName(patient);
  const initials = getPatientInitials(patient);
  const attendingDoctorName = formatDoctorName(doctor?.fullName || `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim() || 'Attending Physician');

  // Day of stay calculation
  let dayOfStay = 1;
  if (admission.admissionDate) {
    const diffMs = Date.now() - new Date(admission.admissionDate).getTime();
    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const bedLabel = bed?.bedLabel || bed?.bedNumber || '—';
  const wardLabel = bed?.wardClass || bed?.wardType || 'General Ward';

  const news2Score = latestVitals?.news2Score || 0;
  const news2Bg = news2Score >= 7 ? '#fee2e2' : news2Score >= 5 ? '#fef3c7' : '#dcfce7';
  const news2Color = news2Score >= 7 ? '#991b1b' : news2Score >= 5 ? '#92400e' : '#166534';

  const status = admission.status || 'ADMITTED';
  const isAdmitted = status === 'ADMITTED';

  return (
    <div
      className="ipd-patient-banner-card"
      style={{
        background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── ROW 1: TOP PATIENT NAME, BED BADGE, NEWS2, ACTIONS & STATUS ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'var(--md-sys-color-primary-container, #eaddff)',
              color: 'var(--md-sys-color-on-primary-container, #21005d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              margin: 0,
              color: 'var(--md-sys-color-on-surface, #1d1b20)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {patientFullName}
          </h2>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid #99f6e4',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>hotel</span>
            Bed {bedLabel}
          </span>

          {latestVitals && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: news2Bg,
                color: news2Color,
                border: `1px solid ${news2Color}33`,
                whiteSpace: 'nowrap',
              }}
            >
              NEWS2: {news2Score} ({latestVitals.news2RiskLevel || 'Low'})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenRecordVitals && (
            <button
              type="button"
              onClick={onOpenRecordVitals}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--md-sys-color-primary, #006a6a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>favorite</span>
              <span>Record Vitals</span>
            </button>
          )}

          {onOpenUtilities && (
            <button
              type="button"
              onClick={() => onOpenUtilities('ADMIT_BED_MAP')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--md-sys-color-surface-container, #f0f5f2)',
                color: 'var(--md-sys-color-on-surface, #1d1b20)',
                border: '1px solid var(--md-sys-color-outline-variant, #d8e5df)',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>medical_services</span>
              <span>Ward Utilities</span>
            </button>
          )}

          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '9999px',
              background: isAdmitted ? '#dcfce7' : '#e0f2fe',
              color: isAdmitted ? '#166534' : '#0369a1',
              border: `1px solid ${isAdmitted ? '#86efac' : '#7dd3fc'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* ── ROW 2: DEMOGRAPHICS & IDENTIFIERS ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px 10px',
          fontSize: '0.72rem',
          color: 'var(--md-sys-color-on-surface-variant, #49454f)',
          paddingBottom: '2px',
        }}
      >
        <span>MRN: <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{patient.mrn || 'N/A'}</strong></span>
        <span>•</span>
        <span>{patient.age ? `${patient.age}y` : ''}{patient.gender ? ` / ${patient.gender}` : ''}</span>
        <span>•</span>
        <span>Blood: <strong style={{ color: patient.bloodGroup ? '#ba1a1a' : 'inherit' }}>{patient.bloodGroup || 'Unknown'}</strong></span>
        <span>•</span>
        <span>Room: <strong>{room?.roomNumber || '—'}</strong></span>
        {admission.provisionalDiagnosis && (
          <>
            <span>•</span>
            <span>Dx: <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{admission.provisionalDiagnosis}</strong></span>
          </>
        )}
        {patient.allergies && (
          <>
            <span>•</span>
            <span style={{ color: 'var(--md-sys-color-error, #ba1a1a)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>warning</span>
              Allergies: {patient.allergies}
            </span>
          </>
        )}
      </div>

      {/* ── ROW 3: ALIGNED CLINICAL METADATA STRIP ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          padding: '6px 10px',
          background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
          borderRadius: '8px',
          border: '1px solid var(--md-sys-color-outline-variant, #e7e0ec)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.60rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
            Attending Doctor
          </span>
          <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {attendingDoctorName}
          </strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.60rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
            Admission Date &amp; Stay
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
            <strong style={{ color: 'var(--md-sys-color-primary, #6750a4)' }}>Day {dayOfStay}</strong> {admission.admissionDate && `(${new Date(admission.admissionDate).toLocaleDateString('en-IN')})`}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.60rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
            Diet Plan
          </span>
          <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary, #6750a4)', fontSize: '0.74rem' }}>
            {(admission.dietTier || 'REGULAR_DIET').replace(/_/g, ' ')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.60rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
            Clinical Ward
          </span>
          <span style={{ fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)', fontSize: '0.74rem' }}>
            {wardLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IpdPatientBanner;

