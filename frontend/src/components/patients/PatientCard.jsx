import React from 'react';
import { Md3Avatar, Md3Chip, Icon } from '../md3/Md3Widgets';
import { getPatientInitials } from '../../utils/patientFormatters';
import './PatientCard.css';

export const PatientCard = ({
  patient,
  onClick,
  statusBadge,
  typeIndicator = 'OPD',
  timeElapsed,
  reason,
  isSelected = false,
  actionSlot,
  metadata = []
}) => {
  if (!patient) return null;

  const age = patient.age ? `${patient.age} yrs` : '';
  const gender = patient.gender || '';
  const demographics = [age, gender].filter(Boolean).join(' ');

  const hasMeta = (metadata && metadata.length > 0) || timeElapsed || reason;

  return (
    <div
      className={`md3-patient-card ${isSelected ? 'md3-patient-card--selected' : ''}`}
      onClick={() => onClick?.(patient)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
      aria-label={`View profile of ${patient.firstName} ${patient.lastName}`}
    >
      <div className="md3-patient-card-rail" aria-hidden="true" />
      
      <div className="md3-patient-card-content">
        {/* Top Row */}
        <div className="md3-patient-card-top-row">
          <Md3Avatar 
            initials={getPatientInitials(patient)} 
            size="medium" 
            variant="primary" 
          />
          <div className="md3-patient-card-identity">
            <span className="md3-patient-card-name">
              {patient.firstName} {patient.lastName}
            </span>
            {demographics && (
              <span className="md3-patient-card-demographics">
                &middot; {demographics}
              </span>
            )}
          </div>
          <div className="md3-patient-card-badges">
            {typeIndicator && (
              <Md3Chip variant="secondary" size="small">{typeIndicator}</Md3Chip>
            )}
            {statusBadge && (
              <Md3Chip variant="default" size="small">{statusBadge}</Md3Chip>
            )}
            {actionSlot && (
              <div className="md3-patient-card-action-slot">
                {actionSlot}
              </div>
            )}
          </div>
        </div>

        {/* Middle Row */}
        <div className="md3-patient-card-mid-row">
          <span className="md3-patient-card-mrn">
            MRN: {patient.mrn || 'N/A'}
          </span>
        </div>

        {/* Meta Row */}
        {hasMeta && (
          <div className="md3-patient-card-meta-row">
            {metadata && metadata.length > 0 ? (
              metadata.map((item, index) => (
                <span key={index} className="md3-patient-card-meta-item">
                  {item.icon}
                  <span>{item.text}</span>
                </span>
              ))
            ) : (
              <>
                {timeElapsed && (
                  <span className="md3-patient-card-time">
                    <Icon.Clock size={14} /> {timeElapsed}
                  </span>
                )}
                {reason && (
                  <span className="md3-patient-card-reason">
                    <Icon.Heart size={14} /> {reason}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientCard;
