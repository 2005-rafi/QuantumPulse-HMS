/**
 * components/ipd/IpdPatientBanner.jsx
 * Pure Material 3 Inpatient Clinical Identity & Encounter Banner.
 */
import React from 'react';
import PhiField from '../patients/PhiField';
import News2Badge from './News2Badge';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';

export const IpdPatientBanner = ({
  admission,
  latestVitals,
  onBedTransferClick,
  onDischargeClick,
}) => {
  if (!admission) return null;

  const patient = admission.patientId || {};
  const bed = admission.currentBedId;
  const room = admission.currentRoomId;
  const doctor = admission.primaryDoctorId;

  const patientFullName = formatPatientName(patient);
  const initials = getPatientInitials(patient);
  const attendingDoctorName = formatDoctorName(doctor?.fullName || `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim() || 'Physician');

  // Day of stay calculation
  let dayOfStay = 1;
  if (admission.admissionDate) {
    const diffMs = Date.now() - new Date(admission.admissionDate).getTime();
    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const bedLabel = bed?.bedLabel || bed?.bedNumber || '—';
  const wardLabel = bed?.wardClass || bed?.wardType || 'General Ward';

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
        borderRadius: '16px',
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Patient Demographics & Bed Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', minWidth: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--md-sys-color-primary-container, #eaddff)',
            color: 'var(--md-sys-color-on-primary-container, #21005d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
              {patientFullName}
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: '#ccfbf1',
                color: '#0f766e',
                padding: '2px 8px',
                borderRadius: '100px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>hotel</span>
              Bed {bedLabel} ({wardLabel})
            </span>
            {latestVitals && (
              <News2Badge score={latestVitals.news2Score || 0} riskLevel={latestVitals.news2RiskLevel || 'LOW'} />
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)', marginTop: '3px' }}>
            MRN: <strong>{patient.mrn || 'N/A'}</strong> • {patient.age ? `${patient.age}y` : ''}{patient.gender ? ` / ${patient.gender}` : ''} • Blood: <span style={{ color: '#ba1a1a', fontWeight: 700 }}>{patient.bloodGroup || 'N/A'}</span> • Room {room?.roomNumber || '—'}
          </div>
        </div>
      </div>

      {/* 2. Clinical Encounter Overview Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Attending Doctor
          </span>
          <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{attendingDoctorName}</strong>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Admission Date &amp; Stay
          </span>
          <strong style={{ color: 'var(--md-sys-color-primary, #6750a4)' }}>Day {dayOfStay}</strong> {admission.admissionDate && `(${new Date(admission.admissionDate).toLocaleDateString('en-IN')})`}
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Diet Plan
          </span>
          <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary, #6750a4)' }}>
            {(admission.dietTier || 'REGULAR_DIET').replace(/_/g, ' ')}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Status
          </span>
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '2px 10px',
              borderRadius: '100px',
              background: admission.status === 'ADMITTED' ? '#dcfce7' : '#e0f2fe',
              color: admission.status === 'ADMITTED' ? '#166534' : '#0369a1',
            }}
          >
            {admission.status || 'ADMITTED'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IpdPatientBanner;
