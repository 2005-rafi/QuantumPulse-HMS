import React from 'react';
import MedicalHistoryPanel from './MedicalHistoryPanel';
import { Icon, Md3Chip } from '../../components/md3/Md3Widgets';

const HistoryTab = ({ patient = {} }) => {
  return (
    <div className="summary-2col-layout">
      {/* ── Left Column: Medical & Surgical History ── */}
      <div className="summary-col">
        <MedicalHistoryPanel patient={patient} />

        {/* Patient Profile & Demographics Card */}
        <div className="summary-card">
          <div className="summary-card__header">
            <div className="summary-card__title-wrap">
              <span className="summary-card__icon default">
                <Icon.Person />
              </span>
              <div>
                <h4 className="summary-card__title">Demographics & Emergency Contact</h4>
                <p className="summary-card__subtitle">Registered identity and contact details</p>
              </div>
            </div>
            <Md3Chip variant="default" size="small">
              MRN: {patient.mrn || '—'}
            </Md3Chip>
          </div>

          <div className="summary-card__body">
            <div className="summary-info-item">
              <span className="summary-info-label">Full Name:</span>
              <span className="summary-info-value font-bold">
                {patient.firstName} {patient.lastName}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Age & Gender:</span>
              <span className="summary-info-value">
                {patient.age ? `${patient.age} yrs` : '—'} • {patient.gender || '—'}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Blood Group:</span>
              <span className="summary-info-value blood-highlight">
                {patient.bloodGroup || '—'}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Phone / Contact:</span>
              <span className="summary-info-value">
                {patient.phoneNumber || '—'}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Emergency Contact:</span>
              <span className="summary-info-value">
                {patient.emergencyContact?.name ? (
                  `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Relative'}) - ${patient.emergencyContact.phone || ''}`
                ) : (
                  <em className="summary-placeholder">None registered</em>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Past Clinical Encounters Timeline ── */}
      <div className="summary-col">
        <div className="summary-card">
          <div className="summary-card__header">
            <div className="summary-card__title-wrap">
              <span className="summary-card__icon tertiary">
                <Icon.Clock size={18} />
              </span>
              <div>
                <h4 className="summary-card__title">Previous Hospital Encounters</h4>
                <p className="summary-card__subtitle">Past consultation visits and clinical notes</p>
              </div>
            </div>
            <Md3Chip variant="tertiary" size="small">
              Patient Record
            </Md3Chip>
          </div>

          <div className="summary-card__body">
            <div className="summary-history-timeline">
              <div className="summary-timeline-item">
                <div className="summary-timeline-badge active" />
                <div className="summary-timeline-content">
                  <div className="summary-timeline-header">
                    <span className="summary-timeline-title">Current OPD Visit</span>
                    <span className="summary-timeline-date">Active Session</span>
                  </div>
                  <p className="summary-timeline-desc">
                    Patient currently in consultation desk. Triage observations and diagnostic requisitions in progress.
                  </p>
                </div>
              </div>

              <div className="summary-timeline-item">
                <div className="summary-timeline-badge" />
                <div className="summary-timeline-content">
                  <div className="summary-timeline-header">
                    <span className="summary-timeline-title">Initial Registration & Onboarding</span>
                    <span className="summary-timeline-date">Patient File Created</span>
                  </div>
                  <p className="summary-timeline-desc">
                    Master patient record generated with MRN {patient.mrn || '—'}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
