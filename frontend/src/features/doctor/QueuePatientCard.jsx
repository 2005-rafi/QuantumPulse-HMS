import React from 'react';
import { Md3IconButton, Icon, Md3Avatar, Md3Chip } from '../../components/md3/Md3Widgets';

/* ============================================================
   QueuePatientCard — Doctor and Nurse queue item card.
   ============================================================ */

const STATUS_CONFIG = {
  WAITING_DOCTOR: { label: 'Waiting',     variant: 'primary'   },
  CALLED:          { label: 'Called',      variant: 'tertiary'  },
  IN_PROGRESS:     { label: 'In Consultation', variant: 'success'   },
  WAITING_DOCTOR_REVIEW: { label: 'Review', variant: 'secondary' },
  COMPLETED:       { label: 'Completed',  variant: 'secondary' },
  SKIPPED:         { label: 'Skipped',    variant: 'error'     },
};

const QueuePatientCard = ({
  visit,
  isSelected,
  onClick,
  waitTime,
  onCall,
  onSkip,
}) => {
  const patient  = visit?.patientId || {};
  const status   = visit?.status || 'WAITING_DOCTOR';
  const config   = STATUS_CONFIG[status] || STATUS_CONFIG.WAITING_DOCTOR;

  const tokenDisplay = visit?.tokenString ?? (visit?.visitNumber?.slice(-4) ?? '—');
  
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const showCall = onCall && (status === 'WAITING_DOCTOR' || status === 'SKIPPED');
  const showSkip = onSkip && status === 'CALLED';

  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed';

  return (
    <div
      className={['queue-card', isSelected ? 'queue-card--selected' : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{ boxSizing: 'border-box' }}
    >
      <div className="queue-card__top">
        <Md3Avatar initials={initials} size="medium" variant="primary" />
        <div className="queue-card__identity">
          <div className="queue-card__identity-row">
            <span className="queue-card__name">{name}</span>
            <span className="queue-card__status-chip">
              <Md3Chip variant={config.variant} size="small">{config.label}</Md3Chip>
            </span>
          </div>
          <div className="queue-card__sub-row">
            <span className="queue-card__sub">{ageGender}</span>
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <>
                <span className="queue-card__bullet">&bull;</span>
                <span className="queue-card__blood-group">{patient.bloodGroup}</span>
              </>
            )}
            <span className="queue-card__bullet">&bull;</span>
            <span className="queue-card__sub" style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{tokenDisplay}</span>
          </div>
        </div>
        
        {/* Actions inline at the top right if present */}
        {(showCall || showSkip) && (
          <div className="queue-card__actions" onClick={(e) => e.stopPropagation()} style={{ marginLeft: '8px', display: 'flex', gap: '4px' }}>
            {showCall && (
              <Md3IconButton 
                icon={<Icon.PhoneCall size={18} />} 
                variant="filled" 
                onClick={(e) => { e.stopPropagation(); onCall?.(visit._id); }} 
                ariaLabel="Call patient"
              />
            )}
            {showSkip && (
              <Md3IconButton 
                icon={<Icon.SkipForward size={18} />} 
                variant="tonal" 
                onClick={(e) => { e.stopPropagation(); onSkip?.(visit._id); }} 
                ariaLabel="Skip patient"
              />
            )}
          </div>
        )}
      </div>

      <div className="queue-card__mrn">
        MRN: {patient.mrn || 'N/A'}
      </div>

      <div className="queue-card__meta">
        <div className="queue-card__meta-item">
          <Icon.Clock />
          <span>{waitTime || '—'}</span>
        </div>
        {visit?.vitals?.chiefComplaint && (
          <div className="queue-card__complaint">
            <Icon.Clipboard />
            <span>{visit.vitals.chiefComplaint}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePatientCard;
