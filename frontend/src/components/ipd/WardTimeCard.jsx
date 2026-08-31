/**
 * components/ipd/WardTimeCard.jsx
 * Reusable Material Design 3 Telemetry Card for Inpatient Beds.
 * Scaled for 5-element desktop layout, marquee text on overflow, 100% chip visibility, zero emojis.
 */
import React from 'react';
import Md3MarqueeText from '../md3/Md3MarqueeText';
import './WardTimeCard.css';

export const WardTimeCard = ({
  bed,
  currentTime,
  onUpdateStatus,
  isActionBusy = false,
  formatElapsedTime,
  formatStayDuration,
}) => {
  if (!bed) return null;

  const isOccupied = bed.status === 'OCCUPIED';
  const isCleaning = bed.status === 'CLEANING_IN_PROGRESS';
  const isMaintenance = bed.status === 'UNDER_MAINTENANCE' || bed.status === 'BLOCKED';
  const isVacant = bed.status === 'VACANT';

  const patient = bed.currentPatientId;
  const admission = bed.currentAdmissionId;
  const stayInfo = isOccupied && formatStayDuration ? formatStayDuration(admission?.admissionDate) : null;
  const isLongStay = stayInfo?.isLongStay;

  const cardModifier = isLongStay
    ? 'md3-ward-time-card--long-stay'
    : isCleaning
    ? 'md3-ward-time-card--cleaning'
    : isMaintenance
    ? 'md3-ward-time-card--maint'
    : isVacant
    ? 'md3-ward-time-card--vacant'
    : 'md3-ward-time-card--occupied';

  const statusPillModifier = isCleaning
    ? 'md3-ward-status-pill--cleaning'
    : isMaintenance
    ? 'md3-ward-status-pill--maint'
    : isVacant
    ? 'md3-ward-status-pill--vacant'
    : 'md3-ward-status-pill--occupied';

  const statusLabel = isCleaning
    ? 'Cleaning'
    : isMaintenance
    ? 'Maintenance'
    : isVacant
    ? 'Vacant'
    : 'Occupied';

  const statusIcon = isCleaning
    ? 'cleaning_services'
    : isMaintenance
    ? 'handyman'
    : isVacant
    ? 'check_circle'
    : 'hotel';

  const patientFullName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Inpatient';

  return (
    <div className={`md3-ward-time-card ${cardModifier}`} role="article" aria-label={`Bed card for ${bed.bedLabel}`}>
      <div className="md3-ward-time-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER ── */}
      <div className="md3-ward-card-header">
        <div className="md3-ward-card-title-group">
          <Md3MarqueeText
            as="h4"
            className="md3-ward-card-label"
            text={bed.bedLabel}
          />
          <Md3MarqueeText
            as="span"
            className="md3-ward-card-location"
            text={`Floor ${bed.floorNumber} • Room ${bed.roomNumber} (${bed.wardClass})`}
          />
        </div>

        {/* Fully visible status chip */}
        <span className={`md3-ward-status-pill ${statusPillModifier}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>{statusIcon}</span>
          {statusLabel}
        </span>
      </div>

      {/* ── CARD BODY METADATA ── */}
      {isOccupied && (
        <div className="md3-ward-card-body">
          <div className="md3-ward-patient-line">
            <Md3MarqueeText
              as="span"
              className="md3-ward-patient-name"
              text={patientFullName}
            />
            <span className={`md3-ward-stay-chip ${isLongStay ? 'md3-ward-stay-chip--alert' : ''}`}>
              <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>schedule</span>
              {stayInfo?.text}
            </span>
          </div>

          <div className="md3-ward-meta-text">
            MRN: {patient?.mrn || '—'} {patient?.age ? `• ${patient.age}y` : ''}
          </div>

          <Md3MarqueeText
            as="div"
            className="md3-ward-meta-text"
            text={`Dx: ${admission?.provisionalDiagnosis || 'Clinical Inpatient Care'}`}
          />
        </div>
      )}

      {isCleaning && (
        <div className="md3-ward-card-body" style={{ background: 'color-mix(in srgb, var(--md-sys-color-tertiary-container) 25%, var(--md-sys-color-surface))' }}>
          <div className="md3-ward-patient-line">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--md-sys-color-on-tertiary-container)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-tertiary)' }}>cleaning_services</span>
              <strong style={{ fontSize: '0.8125rem' }}>Housekeeping Active</strong>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--md-sys-color-tertiary)', fontFamily: 'monospace' }}>
              {formatElapsedTime ? formatElapsedTime(bed.updatedAt) : '—'}
            </span>
          </div>
          <span className="md3-ward-meta-text">Target turnaround SLA: &lt; 30 min</span>
        </div>
      )}

      {isMaintenance && (
        <div className="md3-ward-card-body">
          <div className="md3-ward-patient-line">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-outline)' }}>handyman</span>
              <strong style={{ fontSize: '0.8125rem' }}>Facility Maintenance</strong>
            </div>
            <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {formatElapsedTime ? formatElapsedTime(bed.updatedAt) : '—'}
            </span>
          </div>
          <span className="md3-ward-meta-text">Unavailable for patient placement.</span>
        </div>
      )}

      {isVacant && (
        <div className="md3-ward-card-body" style={{ background: 'color-mix(in srgb, var(--md-sys-color-primary-container) 22%, var(--md-sys-color-surface))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-sys-color-primary)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>task_alt</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              Cleaned &amp; Ready for Inpatient Placement
            </span>
          </div>
        </div>
      )}

      {/* ── CARD ACTIONS ── */}
      <div className="md3-ward-card-actions">
        {isCleaning && (
          <button
            type="button"
            className="md3-ward-btn-compact md3-ward-btn-compact--filled-primary"
            disabled={isActionBusy}
            onClick={() => onUpdateStatus(bed._id, 'VACANT')}
            style={{ width: '100%' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>task_alt</span>
            {isActionBusy ? 'Updating...' : 'Complete Sanitization (Make Vacant)'}
          </button>
        )}

        {isVacant && (
          <>
            <button
              type="button"
              className="md3-ward-btn-compact md3-ward-btn-compact--outlined"
              disabled={isActionBusy}
              onClick={() => onUpdateStatus(bed._id, 'CLEANING_IN_PROGRESS')}
              style={{ flex: 1 }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>cleaning_services</span>
              Cleaning
            </button>

            <button
              type="button"
              className="md3-ward-btn-compact md3-ward-btn-compact--text"
              disabled={isActionBusy}
              onClick={() => onUpdateStatus(bed._id, 'UNDER_MAINTENANCE')}
              title="Mark Maintenance"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>handyman</span>
              Maintenance
            </button>
          </>
        )}

        {isMaintenance && (
          <button
            type="button"
            className="md3-ward-btn-compact md3-ward-btn-compact--filled-primary"
            disabled={isActionBusy}
            onClick={() => onUpdateStatus(bed._id, 'VACANT')}
            style={{ width: '100%' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>task_alt</span>
            {isActionBusy ? 'Updating...' : 'Complete Maintenance (Make Vacant)'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WardTimeCard;
