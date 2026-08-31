/**
 * components/ipd/WardTimeListView.jsx
 * Reusable Material Design 3 High-Density Table List for Inpatient Bed Telemetry & Time Monitoring.
 * Zero emojis, 100% semantic Material Symbols, pure MD3 tokens.
 */
import React from 'react';
import './WardTimeListView.css';

export const WardTimeListView = ({
  beds = [],
  currentTime,
  onUpdateStatus,
  actionLoading = {},
  formatElapsedTime,
  formatStayDuration,
}) => {
  if (!beds || beds.length === 0) return null;

  return (
    <div className="md3-ward-list-table-container" role="region" aria-label="Ward Bed Telemetry Table">
      <table className="md3-ward-list-table">
        <thead>
          <tr>
            <th scope="col">Bed &amp; Location</th>
            <th scope="col">Inpatient Details</th>
            <th scope="col">Ward Tier</th>
            <th scope="col">Stay Duration (LOS)</th>
            <th scope="col">Operational Status</th>
            <th scope="col">Housekeeping / Turnaround</th>
            <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {beds.map((bed) => {
            const isOccupied = bed.status === 'OCCUPIED';
            const isCleaning = bed.status === 'CLEANING_IN_PROGRESS';
            const isMaintenance = bed.status === 'UNDER_MAINTENANCE' || bed.status === 'BLOCKED';
            const isVacant = bed.status === 'VACANT';

            const patient = bed.currentPatientId;
            const admission = bed.currentAdmissionId;
            const stayInfo = isOccupied && formatStayDuration ? formatStayDuration(admission?.admissionDate) : null;
            const isActionBusy = actionLoading[bed._id];

            const statusPillModifier = isCleaning
              ? 'md3-ward-status-pill--cleaning'
              : isMaintenance
              ? 'md3-ward-status-pill--maint'
              : isVacant
              ? 'md3-ward-status-pill--vacant'
              : 'md3-ward-status-pill--occupied';

            const statusIcon = isCleaning
              ? 'cleaning_services'
              : isMaintenance
              ? 'handyman'
              : isVacant
              ? 'check_circle'
              : 'hotel';

            return (
              <tr key={bed._id} className="md3-ward-list-row">
                {/* 1. Bed & Location */}
                <td>
                  <div className="md3-ward-cell-bed">
                    <span className="md3-ward-bed-tag">{bed.bedLabel}</span>
                    <span className="md3-ward-bed-loc">
                      Floor {bed.floorNumber} • Room {bed.roomNumber}
                    </span>
                  </div>
                </td>

                {/* 2. Inpatient Details */}
                <td>
                  {isOccupied ? (
                    <div className="md3-ward-cell-patient">
                      <span className="md3-ward-patient-title">
                        {patient?.firstName} {patient?.lastName}
                      </span>
                      <span className="md3-ward-patient-sub">
                        MRN: {patient?.mrn || '—'} • {admission?.provisionalDiagnosis || 'Inpatient Care'}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      No inpatient assigned
                    </span>
                  )}
                </td>

                {/* 3. Ward Tier */}
                <td>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--md-sys-shape-corner-small, 8px)',
                      backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      color: 'var(--md-sys-color-on-surface)',
                    }}
                  >
                    {bed.wardClass}
                  </span>
                </td>

                {/* 4. Stay Duration */}
                <td>
                  {isOccupied ? (
                    <span
                      className={`md3-ward-stay-chip ${stayInfo?.isLongStay ? 'md3-ward-stay-chip--alert' : ''}`}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>schedule</span>
                      {stayInfo?.text}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                  )}
                </td>

                {/* 5. Status Pill */}
                <td>
                  <span className={`md3-ward-status-pill ${statusPillModifier}`}>
                    <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>{statusIcon}</span>
                    {bed.status}
                  </span>
                </td>

                {/* 6. Housekeeping / Turnaround */}
                <td>
                  {isCleaning ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--md-sys-color-tertiary)', fontFamily: 'monospace' }}>
                        {formatElapsedTime ? formatElapsedTime(bed.updatedAt) : '—'}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Active sanitizing</span>
                    </div>
                  ) : isMaintenance ? (
                    <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {formatElapsedTime ? formatElapsedTime(bed.updatedAt) : '—'}
                    </span>
                  ) : isVacant ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>task_alt</span>
                      Ready
                    </span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                  )}
                </td>

                {/* 7. Actions */}
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                    {isCleaning && (
                      <button
                        type="button"
                        className="md3-ward-btn-compact md3-ward-btn-compact--filled-primary"
                        disabled={isActionBusy}
                        onClick={() => onUpdateStatus(bed._id, 'VACANT')}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>task_alt</span>
                        {isActionBusy ? 'Updating...' : 'Complete'}
                      </button>
                    )}

                    {isVacant && (
                      <>
                        <button
                          type="button"
                          className="md3-ward-btn-compact md3-ward-btn-compact--outlined"
                          disabled={isActionBusy}
                          onClick={() => onUpdateStatus(bed._id, 'CLEANING_IN_PROGRESS')}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>cleaning_services</span>
                          Clean
                        </button>
                        <button
                          type="button"
                          className="md3-ward-btn-compact md3-ward-btn-compact--text"
                          disabled={isActionBusy}
                          onClick={() => onUpdateStatus(bed._id, 'UNDER_MAINTENANCE')}
                          title="Mark Maintenance"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>handyman</span>
                        </button>
                      </>
                    )}

                    {isMaintenance && (
                      <button
                        type="button"
                        className="md3-ward-btn-compact md3-ward-btn-compact--filled-primary"
                        disabled={isActionBusy}
                        onClick={() => onUpdateStatus(bed._id, 'VACANT')}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>task_alt</span>
                        {isActionBusy ? 'Updating...' : 'Ready'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WardTimeListView;
