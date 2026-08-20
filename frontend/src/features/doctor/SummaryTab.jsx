import React from 'react';
import TriageVitalsPanel from './TriageVitalsPanel';
import MedicalHistoryPanel from './MedicalHistoryPanel';
import LabResultsPanel from './LabResultsPanel';
import { Md3Section, Icon, Md3Chip } from '../../components/md3/Md3Widgets';

const SummaryTab = ({ visit, patient, form }) => {
  const hasDiagnosis = Boolean(form?.clinicalDiagnosis || visit?.consultation?.diagnosis);
  const hasMedications = Boolean(form?.prescribedMedications?.length || visit?.prescriptions?.length);

  return (
    <div className="summary-2col-layout">
      {/* ── Left Column: Vitals & Clinical Assessment ── */}
      <div className="summary-col">
        {/* Triage Vitals Card */}
        <TriageVitalsPanel vitals={visit?.vitals || {}} />

        {/* Current Consultation Status Card */}
        <div className="summary-card">
          <div className="summary-card__header">
            <div className="summary-card__title-wrap">
              <span className="summary-card__icon primary">
                <Icon.FileText size={18} />
              </span>
              <div>
                <h4 className="summary-card__title">Current Consultation Status</h4>
                <p className="summary-card__subtitle">Clinical diagnosis and active care plan summary</p>
              </div>
            </div>
            <Md3Chip
              variant={visit?.status === 'IN_PROGRESS' ? 'primary' : 'default'}
              size="small"
            >
              {visit?.status?.replace(/_/g, ' ') || 'OPD Visit'}
            </Md3Chip>
          </div>

          <div className="summary-card__body">
            <div className="summary-info-item">
              <span className="summary-info-label">Active Diagnosis:</span>
              <span className="summary-info-value">
                {form?.clinicalDiagnosis || visit?.consultation?.diagnosis || (
                  <em className="summary-placeholder">Diagnosis pending in consultation tab</em>
                )}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Treatment Plan:</span>
              <span className="summary-info-value">
                {form?.treatmentPlan || visit?.consultation?.treatmentPlan || (
                  <em className="summary-placeholder">Plan pending in consultation tab</em>
                )}
              </span>
            </div>

            <div className="summary-info-item">
              <span className="summary-info-label">Prescribed Medications:</span>
              <span className="summary-info-value">
                {form?.prescribedMedications?.length > 0 ? (
                  <span className="summary-count-badge">
                    {form.prescribedMedications.length} medication{form.prescribedMedications.length !== 1 ? 's' : ''} in draft
                  </span>
                ) : (
                  <em className="summary-placeholder">No medications added yet</em>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Medical History & Diagnostics ── */}
      <div className="summary-col">
        {/* Medical History & Allergies Card */}
        <MedicalHistoryPanel patient={patient} />

        {/* Diagnostics & Laboratory Status Card */}
        <LabResultsPanel labOrders={visit?.labOrders || []} patient={patient} />
      </div>
    </div>
  );
};

export default SummaryTab;
