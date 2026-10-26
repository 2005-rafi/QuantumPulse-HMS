import React from 'react';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import './LabTokenQueueBar.css';

/**
 * LabTokenQueueBar — Real-time Laboratory Token & Waiting Queue Control Banner
 */
export const LabTokenQueueBar = ({
  activeToken = 'LAB-001',
  waitingCount = 0,
  onCallNextToken,
  activeOriginFilter = 'ALL',
  onOriginFilterChange,
  isCalling = false,
}) => {
  return (
    <div className="lab-token-bar">
      <div className="lab-token-bar__current">
        <div className="lab-token-bar__badge">
          <span className="material-symbols-rounded">confirmation_number</span>
          <span className="lab-token-bar__label">CURRENT CALL</span>
        </div>
        <div className="lab-token-bar__number">{activeToken || 'NONE'}</div>
      </div>

      <div className="lab-token-bar__controls">
        <div className="lab-token-bar__filters" role="group" aria-label="Intake queue filters">
          <button
            type="button"
            className={`lab-token-chip ${activeOriginFilter === 'ALL' ? 'lab-token-chip--active' : ''}`}
            onClick={() => onOriginFilterChange('ALL')}
          >
            <span>All Patients</span>
          </button>
          <button
            type="button"
            className={`lab-token-chip ${activeOriginFilter === 'CLINICAL_DOCTOR' ? 'lab-token-chip--active' : ''}`}
            onClick={() => onOriginFilterChange('CLINICAL_DOCTOR')}
          >
            <span className="material-symbols-rounded lab-token-chip__icon">stethoscope</span>
            <span>Clinical Directives</span>
          </button>
          <button
            type="button"
            className={`lab-token-chip ${activeOriginFilter === 'DIRECT_WALKIN' ? 'lab-token-chip--active' : ''}`}
            onClick={() => onOriginFilterChange('DIRECT_WALKIN')}
          >
            <span className="material-symbols-rounded lab-token-chip__icon">directions_walk</span>
            <span>Direct Walk-Ins</span>
          </button>
        </div>

        <div className="lab-token-bar__actions">
          <div className="lab-token-bar__waiting">
            <span className="material-symbols-rounded">groups</span>
            <span>Waiting: <strong>{waitingCount} Patients</strong></span>
          </div>

          <Md3Button
            variant="filled"
            onClick={onCallNextToken}
            disabled={isCalling || waitingCount === 0}
            className="lab-token-call-btn"
          >
            <span className="material-symbols-rounded">campaign</span>
            <span>{isCalling ? 'Calling...' : 'Call Next Token'}</span>
          </Md3Button>
        </div>
      </div>
    </div>
  );
};

export default LabTokenQueueBar;

