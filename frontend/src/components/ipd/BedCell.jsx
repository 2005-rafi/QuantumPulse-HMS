/**
 * components/ipd/BedCell.jsx
 * The atomic BookMyShow-style bed tile with state layers and hover tooltips.
 */
import React from 'react';
import './BedCell.css';

export const BedCell = ({
  bed,
  isSelected = false,
  onClick,
}) => {
  if (!bed) return null;

  const isOccupied = bed.status === 'OCCUPIED';
  const isVacant = bed.status === 'VACANT';
  const isReserved = bed.status === 'RESERVED';
  const isMaintenance = bed.status === 'UNDER_MAINTENANCE' || bed.status === 'CLEANING_IN_PROGRESS' || bed.status === 'BLOCKED';

  let statusClass = 'ipd-bed-cell--vacant';
  let statusText = 'Vacant';

  if (isOccupied) {
    statusClass = 'ipd-bed-cell--occupied';
    statusText = 'Occupied';
  } else if (isReserved) {
    statusClass = 'ipd-bed-cell--reserved';
    statusText = 'Reserved';
  } else if (isMaintenance) {
    statusClass = 'ipd-bed-cell--maintenance';
    statusText = bed.status === 'CLEANING_IN_PROGRESS' ? 'Cleaning' : 'Maint';
  }

  const patient = bed.currentPatientId;
  const patientName = patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : null;

  // Tooltip content
  const tooltipText = isOccupied
    ? `Bed: ${bed.bedLabel} (${bed.wardClass})\nPatient: ${patientName || 'Admitted'}\nMRN: ${patient?.mrn || 'N/A'}\nClick to inspect`
    : `Bed: ${bed.bedLabel} (${bed.wardClass})\nStatus: ${statusText}\nClick to allocate / manage`;

  return (
    <button
      type="button"
      className={`ipd-bed-cell ${statusClass} ${isSelected ? 'ipd-bed-cell--selected' : ''}`}
      onClick={() => onClick && onClick(bed)}
      title={tooltipText}
      aria-label={`Bed ${bed.bedNumber} - ${statusText}`}
    >
      <span className="ipd-bed-cell__number">{bed.bedNumber}</span>

      {isOccupied && patientName ? (
        <span className="ipd-bed-cell__patient-name">{patientName}</span>
      ) : (
        <span className="ipd-bed-cell__status-tag">{statusText}</span>
      )}

      {/* Feature Icons */}
      <div className="ipd-bed-cell__icons">
        {bed.features?.includes('VENTILATOR_READY') && (
          <span className="material-symbols-rounded ipd-bed-cell__feature-dot" title="Ventilator Ready">
            air
          </span>
        )}
        {bed.features?.includes('OXYGEN_PIPED') && (
          <span className="material-symbols-rounded ipd-bed-cell__feature-dot" title="Piped Oxygen">
            mode_fan
          </span>
        )}
        {bed.features?.includes('MONITOR_ATTACHED') && (
          <span className="material-symbols-rounded ipd-bed-cell__feature-dot" title="Cardiac Monitor Attached">
            ecg_heart
          </span>
        )}
      </div>
    </button>
  );
};

export default BedCell;
