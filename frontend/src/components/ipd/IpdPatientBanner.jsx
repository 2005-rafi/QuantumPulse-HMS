/**
 * components/ipd/IpdPatientBanner.jsx
 * Sticky Inpatient Clinical Identity & Encounter Banner.
 */
import React from 'react';
import PhiField from '../patients/PhiField';
import News2Badge from './News2Badge';

export const IpdPatientBanner = ({
  admission,
  latestVitals,
  onBedTransferClick,
  onDischargeClick,
}) => {
  if (!admission) return null;

  const patient = admission.patientId;
  const bed = admission.currentBedId;
  const room = admission.currentRoomId;
  const doctor = admission.primaryDoctorId;

  // Day of stay calculation
  let dayOfStay = 1;
  if (admission.admissionDate) {
    const diffMs = Date.now() - new Date(admission.admissionDate).getTime();
    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        borderRadius: '10px',
        padding: '8px 14px',
        marginBottom: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* 1. Patient Demographics & Bed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'var(--md-sys-color-primary-container, #eaddff)',
            color: 'var(--md-sys-color-primary, #6750a4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            fontWeight: 700,
          }}
        >
          {patient?.firstName ? patient.firstName[0] : 'P'}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
              {patient?.firstName} {patient?.lastName}
            </h2>
            <span className="clinical-meta-pill">
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>hotel</span>
              Bed {bed?.bedNumber || '—'} ({bed?.wardClass || 'General'})
            </span>
            {latestVitals && (
              <News2Badge score={latestVitals.news2Score || 0} riskLevel={latestVitals.news2RiskLevel || 'LOW'} />
            )}
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
            MRN: <strong>{patient?.mrn}</strong> • {patient?.age}y / {patient?.gender} • Blood: {patient?.bloodGroup || 'N/A'} • Room {room?.roomNumber || '—'}
          </div>
        </div>
      </div>

      {/* 2. Clinical Encounter Overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.76rem' }}>
        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Attending Doctor
          </span>
          <strong style={{ color: 'var(--md-sys-color-on-surface)' }}>Dr. {doctor?.firstName} {doctor?.lastName || ''}</strong>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Admission Date &amp; Stay
          </span>
          <strong style={{ color: 'var(--md-sys-color-on-surface)' }}>Day {dayOfStay}</strong> ({new Date(admission.admissionDate).toLocaleDateString('en-IN')})
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Diet Plan
          </span>
          <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>
            {(admission.dietTier || 'REGULAR_DIET').replace('_', ' ')}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', display: 'block', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Status
          </span>
          <span className="clinical-status-pill clinical-status-pill--completed">
            {admission.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IpdPatientBanner;
