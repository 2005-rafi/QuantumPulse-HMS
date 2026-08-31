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
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 1. Patient Demographics & Bed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--md-sys-color-primary-container, #bbf2e1)',
            color: 'var(--md-sys-color-primary, #006a57)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 700,
          }}
        >
          {patient?.firstName ? patient.firstName[0] : 'P'}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
              {patient?.firstName} {patient?.lastName}
            </h2>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--md-sys-color-secondary-container, #cce8e0)',
                color: 'var(--md-sys-color-on-secondary-container, #05201b)',
              }}
            >
              Bed: {bed?.bedNumber || '—'} ({bed?.wardClass || 'General'})
            </span>
            {latestVitals && (
              <News2Badge score={latestVitals.news2Score || 0} riskLevel={latestVitals.news2RiskLevel || 'LOW'} />
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', marginTop: '4px' }}>
            MRN: <strong>{patient?.mrn}</strong> • {patient?.age}y / {patient?.gender} • Blood: {patient?.bloodGroup || 'N/A'} • Room {room?.roomNumber || '—'}
          </div>
        </div>
      </div>

      {/* 2. Clinical Encounter Overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
        <div>
          <span style={{ color: 'var(--md-sys-color-outline)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
            Attending Doctor
          </span>
          <strong>Dr. {doctor?.firstName} {doctor?.lastName || ''}</strong>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-outline)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
            Admission Date & Stay
          </span>
          <strong>Day {dayOfStay}</strong> ({new Date(admission.admissionDate).toLocaleDateString('en-IN')})
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-outline)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
            Diet Plan
          </span>
          <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>
            {(admission.dietTier || 'REGULAR_DIET').replace('_', ' ')}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-outline)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
            Status
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.75rem',
              background: admission.status === 'ADMITTED' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)',
              color: admission.status === 'ADMITTED' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            {admission.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IpdPatientBanner;
