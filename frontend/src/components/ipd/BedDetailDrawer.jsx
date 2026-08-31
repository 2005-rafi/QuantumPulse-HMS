/**
 * components/ipd/BedDetailDrawer.jsx
 * Slide-in Bed Inspector Drawer providing quick clinical and administrative actions.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import PhiField from '../patients/PhiField';
import { Md3Button } from '../md3/Md3FormComponents';
import './BedDetailDrawer.css';

export const BedDetailDrawer = ({
  bed,
  onClose,
  onOpenAdmit,
  onOpenTransfer,
  onUpdateStatus,
}) => {
  const navigate = useNavigate();

  if (!bed) return null;

  const isOccupied = bed.status === 'OCCUPIED';
  const isVacant = bed.status === 'VACANT';
  const isMaintenance = bed.status === 'UNDER_MAINTENANCE' || bed.status === 'CLEANING_IN_PROGRESS';

  const patient = bed.currentPatientId;
  const admission = bed.currentAdmissionId;
  const doctor = admission?.primaryDoctorId;

  // Calculate day of stay
  let dayOfStay = 1;
  if (admission?.admissionDate) {
    const diffMs = Date.now() - new Date(admission.admissionDate).getTime();
    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return createPortal(
    <div className="ipd-drawer-backdrop" onClick={onClose}>
      <div className="ipd-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ipd-drawer-header">
          <div>
            <h2 className="ipd-drawer-title">{bed.bedLabel}</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
              Ward: {bed.wardClass} • Room {bed.roomId?.roomNumber || '—'}
            </span>
          </div>
          <button type="button" className="ipd-drawer-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="ipd-drawer-content">
          {/* Status Chip & Telemetry */}
          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">Bed Status & Capabilities</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: isOccupied
                    ? 'var(--md-sys-color-error-container)'
                    : isVacant
                    ? 'var(--md-sys-color-primary-container)'
                    : 'var(--md-sys-color-surface-container-high)',
                  color: isOccupied
                    ? 'var(--md-sys-color-on-error-container)'
                    : isVacant
                    ? 'var(--md-sys-color-on-primary-container)'
                    : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                ● {bed.status}
              </span>

              {bed.features?.map((feat) => (
                <span
                  key={feat}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    background: 'var(--md-sys-color-surface-container-highest)',
                    color: 'var(--md-sys-color-on-surface)',
                  }}
                >
                  {feat.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Occupied Inpatient Details */}
          {isOccupied && (
            <div className="ipd-drawer-section">
              <span className="ipd-drawer-section-title">Current Inpatient</span>
              <div className="ipd-drawer-patient-card">
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>
                    {patient?.firstName} {patient?.lastName}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
                    MRN: {patient?.mrn} • {patient?.age}y / {patient?.gender}
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <strong>Phone:</strong> <PhiField value={patient?.phone} type="phone" />
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <strong>Admission #:</strong> {admission?.admissionNumber || '—'}
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <strong>Diagnosis:</strong> {admission?.provisionalDiagnosis || '—'}
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <strong>Attending Doctor:</strong> Dr. {doctor?.firstName || 'Assigned Consultant'} {doctor?.lastName || ''}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>
                  Stay: Day {dayOfStay} (Admitted {admission?.admissionDate ? new Date(admission.admissionDate).toLocaleDateString('en-IN') : '—'})
                </div>
              </div>
            </div>
          )}

          {/* Actions Matrix */}
          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">Actions</span>
            <div className="ipd-drawer-actions">
              {isVacant && (
                <>
                  <Md3Button
                    variant="filled"
                    onClick={() => {
                      onClose();
                      onOpenAdmit && onOpenAdmit(bed);
                    }}
                  >
                    Admit Patient to this Bed
                  </Md3Button>
                  <Md3Button
                    variant="outlined"
                    onClick={() => onUpdateStatus && onUpdateStatus(bed._id, 'UNDER_MAINTENANCE')}
                  >
                    Mark for Maintenance / Sanitizing
                  </Md3Button>
                </>
              )}

              {isOccupied && (
                <>
                  <Md3Button
                    variant="filled"
                    onClick={() => {
                      onClose();
                      onOpenTransfer && onOpenTransfer(bed, admission);
                    }}
                  >
                    Transfer Patient Bed
                  </Md3Button>

                  <Md3Button
                    variant="tonal"
                    onClick={() => {
                      onClose();
                      navigate(`/dashboard/ipd/nursing/${admission?._id}`);
                    }}
                  >
                    Open Nursing Station (e-MAR & Vitals)
                  </Md3Button>

                  <Md3Button
                    variant="tonal"
                    onClick={() => {
                      onClose();
                      navigate(`/dashboard/ipd/doctor/${admission?._id}`);
                    }}
                  >
                    Open Doctor Cockpit (CPOE & Rounds)
                  </Md3Button>

                  <Md3Button
                    variant="outlined"
                    onClick={() => {
                      onClose();
                      navigate(`/dashboard/ipd/billing/${admission?._id}`);
                    }}
                  >
                    View Running IPD Ledger
                  </Md3Button>
                </>
              )}

              {isMaintenance && (
                <Md3Button
                  variant="filled"
                  onClick={() => onUpdateStatus && onUpdateStatus(bed._id, 'VACANT')}
                >
                  Mark Cleaning Complete (Make Vacant)
                </Md3Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BedDetailDrawer;
