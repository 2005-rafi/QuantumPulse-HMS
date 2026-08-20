import React from 'react';
import {
  Md3Avatar, Md3Chip, Icon,
} from '../../components/md3/Md3Widgets';

const STATUS_LABELS = {
  IN_PROGRESS: 'In Consultation',
  WAITING_DOCTOR: 'Waiting Doctor',
  WAITING_DOCTOR_REVIEW: 'Doctor Review',
  COMPLETED: 'Completed',
  BILLED: 'Billed',
  DISPENSED: 'Dispensed',
};

const PatientIdentityHeader = ({ visit }) => {
  const patient = visit?.patientId || {};
  const status = visit?.status || 'UNKNOWN';
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || 'PT';

  const getStatusVariant = (s) => {
    if (s === 'IN_PROGRESS') return 'success';
    if (s === 'WAITING_DOCTOR_REVIEW') return 'secondary';
    if (s === 'COMPLETED' || s === 'BILLED' || s === 'DISPENSED') return 'default';
    return 'primary';
  };

  const allergyText = Array.isArray(patient.allergies)
    ? patient.allergies.join(', ')
    : typeof patient.allergies === 'string'
      ? patient.allergies.trim()
      : '';

  const hasAllergies = allergyText && allergyText !== '' && allergyText.toUpperCase() !== 'NKDA';
  const tokenString = visit?.tokenString || visit?.visitNumber?.slice(-4) || '—';

  return (
    <div className="patient-identity-banner">
      {hasAllergies && (
        <div className="patient-identity-banner__allergy">
          <Icon.Alert size={16} />
          <span>KNOWN ALLERGIES: {allergyText}</span>
        </div>
      )}
      <div className="patient-identity-banner__body">
        <div className="patient-identity-banner__left">
          <Md3Avatar initials={initials} size="large" variant="primary" />
          <div className="patient-identity-banner__names">
            <div className="patient-identity-banner__name-row">
              <h2 className="patient-identity-banner__name">
                {patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : 'Unnamed Patient'}
              </h2>
              <span className="patient-identity-banner__mrn-pill">
                MRN: {patient.mrn || 'N/A'}
              </span>
            </div>
            <div className="patient-identity-banner__meta">
              <span>{patient.age ? `${patient.age} yrs` : '—'}</span>
              <span className="patient-identity-banner__meta-sep">•</span>
              <span>{patient.gender || '—'}</span>
              {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                <>
                  <span className="patient-identity-banner__meta-sep">•</span>
                  <span className="patient-identity-banner__blood">
                    <Icon.Heart /> {patient.bloodGroup}
                  </span>
                </>
              )}
              {patient.phoneNumber && (
                <>
                  <span className="patient-identity-banner__meta-sep">•</span>
                  <span className="patient-identity-banner__phone">
                    <Icon.Phone /> {patient.phoneNumber}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="patient-identity-banner__right">
          <div className="patient-identity-banner__token-box">
            <span className="token-box-label">Queue Token</span>
            <span className="token-box-val">{tokenString}</span>
          </div>
          <div className="patient-identity-banner__ticket">
            <span className="patient-identity-banner__ticket-label">Visit Ticket</span>
            <span className="patient-identity-banner__ticket-value">{visit?.visitNumber || '—'}</span>
          </div>
          <div className="patient-identity-banner__divider" />
          <Md3Chip variant={getStatusVariant(status)} size="medium">
            {label}
          </Md3Chip>
        </div>
      </div>
    </div>
  );
};

export default PatientIdentityHeader;
