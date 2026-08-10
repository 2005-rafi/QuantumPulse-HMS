import React from 'react';
import {
  Md3Avatar, Md3Chip, Icon,
} from '../../components/md3/Md3Widgets';

const STATUS_LABELS = {
  IN_PROGRESS: 'In Consultation',
  WAITING_DOCTOR: 'Waiting',
  WAITING_DOCTOR_REVIEW: 'Review',
  COMPLETED: 'Completed',
  BILLED: 'Billed',
  DISPENSED: 'Dispensed',
};

const PatientIdentityHeader = ({ visit }) => {
  const patient = visit?.patientId || {};
  const status = visit?.status || 'UNKNOWN';
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  const getStatusVariant = (s) => {
    if (s === 'IN_PROGRESS') return 'tertiary';
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

  return (
    <div className="patient-identity-banner">
      {hasAllergies && (
        <div className="patient-identity-banner__allergy">
          <Icon.Alert size={15} />
          <span>ALLERGIES: {allergyText}</span>
        </div>
      )}
      <div className="patient-identity-banner__body">
        <div className="patient-identity-banner__left">
          <Md3Avatar initials={initials} size="medium" variant="primary" />
          <div className="patient-identity-banner__names">
            <h2 className="patient-identity-banner__name">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="patient-identity-banner__meta">
              <span>{patient.mrn || 'No MRN'}</span>
              <span className="patient-identity-banner__meta-sep">•</span>
              <span>{patient.age ? `${patient.age} yrs` : 'Unknown age'}</span>
              <span className="patient-identity-banner__meta-sep">•</span>
              <span>{patient.gender || 'Unknown'}</span>
              {patient.bloodGroup && (
                <>
                  <span className="patient-identity-banner__meta-sep">•</span>
                  <span className="patient-identity-banner__blood">Blood: {patient.bloodGroup}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="patient-identity-banner__right">
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
