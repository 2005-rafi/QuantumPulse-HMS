import React, { useState } from 'react';
import PatientIdentityHeader from './PatientIdentityHeader';
import ConsultationActionBar from './ConsultationActionBar';
import SummaryTab from './SummaryTab';
import ConsultationTab from './ConsultationTab';
import OrdersResultsTab from './OrdersResultsTab';
import HistoryTab from './HistoryTab';
import { RecommendIpdAdmissionModal } from './ConvertOpdToIpdModal';
import { RequestSurgeryModal } from './RequestSurgeryModal';

/* ============================================================
   ClinicalWorkspace — Doctor's Consultation Hub & Active Desk
   Path: frontend/src/features/doctor/ClinicalWorkspace.jsx
   Pure Material 3 Clinical Workflow & High-Efficiency Visual Launchpad
   ============================================================ */

/* ─── Doctor Idle Clinical Launchpad ──────────────────────── */
const DoctorIdleLaunchpad = ({ queue = [], onSelectVisit }) => {
  // Find next actionable patient (FIFO: first non-completed, non-skipped)
  const nextPatient = queue.find(
    (v) => v.status === 'IN_PROGRESS' || v.status === 'WAITING_DOCTOR' || v.status === 'CALLED'
  );

  return (
    <div className="doc-idle-launchpad">
      {/* ── Next Patient Action Prompt ── */}
      {nextPatient ? (
        <div className="doc-idle__action-card">
          <div className="doc-idle__action-header">
            <div className="doc-idle__action-badge">
              <span className="material-symbols-rounded">play_circle</span>
              <span>Next Patient Ready</span>
            </div>
            <span className="doc-idle__token-tag">
              {nextPatient.tokenString || nextPatient.visitNumber?.slice(-4) || 'GEN-—'}
            </span>
          </div>

          <div className="doc-idle__action-body">
            <div className="doc-idle__patient-identity">
              <div className="doc-idle__patient-avatar">
                {((nextPatient.patientId?.firstName?.[0] || '') + (nextPatient.patientId?.lastName?.[0] || '')).toUpperCase() || 'P'}
              </div>
              <div className="doc-idle__patient-details">
                <h3 className="doc-idle__patient-name">
                  {nextPatient.patientId?.firstName ? `${nextPatient.patientId.firstName} ${nextPatient.patientId.lastName || ''}` : 'Unnamed Patient'}
                </h3>
                <p className="doc-idle__patient-sub">
                  <span>{nextPatient.patientId?.age ? `${nextPatient.patientId.age} yrs` : '—'}</span>
                  <span>•</span>
                  <span>{nextPatient.patientId?.gender || '—'}</span>
                  <span>•</span>
                  <span className="doc-idle__mrn-code">{nextPatient.patientId?.mrn || 'N/A'}</span>
                </p>
              </div>
            </div>

            {nextPatient.vitals?.chiefComplaint && (
              <div className="doc-idle__complaint-box">
                <span className="material-symbols-rounded">assignment</span>
                <span><strong>Chief Complaint:</strong> {nextPatient.vitals.chiefComplaint}</span>
              </div>
            )}
          </div>

          <div className="doc-idle__action-footer">
            <button
              type="button"
              className="doc-idle__start-btn"
              onClick={() => onSelectVisit?.(nextPatient)}
            >
              <span className="material-symbols-rounded">stethoscope</span>
              <span>Start Consultation Desk</span>
              <span className="material-symbols-rounded doc-idle__btn-arrow">arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="doc-idle__empty-queue-card">
          <div className="doc-idle__empty-icon-wrap">
            <span className="material-symbols-rounded">verified_user</span>
          </div>
          <div className="doc-idle__empty-texts">
            <h3 className="doc-idle__empty-title">All Consultations Clear</h3>
            <p className="doc-idle__empty-desc">
              Your patient queue is up to date. As reception checks in patients and nursing completes vitals recording, they will appear in real time on the left sidebar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Clinical Workspace ─────────────────────────────── */
const ClinicalWorkspace = ({
  visit,
  user,
  form,
  onFormChange,
  laboratories,
  onMedicationsChange,
  onLabOrdersChange,
  onNotesChange,
  onSaveDraft,
  onSendToLab,
  onFinalize,
  savingDraft,
  routingToLab,
  finalizing,
  canFinalize,
  queueStats,
  queue,
  onSelectVisit,
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [showAdmitToIpdModal, setShowAdmitToIpdModal] = useState(false);
  const [showSurgeryRequestModal, setShowSurgeryRequestModal] = useState(false);

  if (!visit) {
    return (
      <div className="doc-workspace doc-workspace--empty">
        <DoctorIdleLaunchpad
          queue={queue}
          onSelectVisit={onSelectVisit}
        />
      </div>
    );
  }

  const patient = (visit?.patientId && typeof visit.patientId === 'object' && (visit.patientId.firstName || visit.patientId.lastName || visit.patientId.mrn))
    ? visit.patientId
    : (visit?.patient && typeof visit.patient === 'object')
    ? visit.patient
    : (visit && (visit.firstName || visit.lastName || visit.mrn))
    ? visit
    : (visit?.patientId && typeof visit.patientId === 'object')
    ? visit.patientId
    : {};
  const labOrdersCount = (form?.labOrders || []).length;

  const tabs = [
    { id: 'summary', label: 'Summary', icon: 'dashboard' },
    { id: 'consultation', label: 'Consultation', icon: 'stethoscope' },
    { id: 'orders', label: `Orders & Results${labOrdersCount > 0 ? ` (${labOrdersCount})` : ''}`, icon: 'science' },
    { id: 'history', label: 'History', icon: 'history' },
  ];

  return (
    <div className="doc-workspace">
      <div className="doc-workspace__card">
        {/* ── Patient Identity Header ── */}
        <PatientIdentityHeader visit={visit} />

        {/* ── Secondary Tab Navigation Bar ── */}
        <div className="doc-workspace__tabs-bar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`doc-workspace__tab-btn ${isActive ? 'doc-workspace__tab-btn--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="material-symbols-rounded">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active Tab Scrollable Content Area ── */}
        <div className="doc-workspace__scroll-body">
          {activeTab === 'summary' && (
            <div className="doc-tab-panel">
              <SummaryTab visit={visit} patient={patient} form={form} laboratories={laboratories} />
            </div>
          )}
          {activeTab === 'consultation' && (
            <div className="doc-tab-panel">
              <ConsultationTab
                visit={visit}
                form={form}
                onFormChange={onFormChange}
                onMedicationsChange={onMedicationsChange}
                onNotesChange={onNotesChange}
              />
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="doc-tab-panel">
              <OrdersResultsTab
                visit={visit}
                form={form}
                laboratories={laboratories}
                onLabOrdersChange={onLabOrdersChange}
              />
            </div>
          )}
          {activeTab === 'history' && (
            <div className="doc-tab-panel">
              <HistoryTab patient={patient} />
            </div>
          )}
        </div>

        {/* ── Fixed Bottom Action Bar ── */}
        <ConsultationActionBar
          onSaveDraft={onSaveDraft}
          onSendToLab={onSendToLab}
          onFinalize={onFinalize}
          canFinalize={canFinalize}
          onAdmitToIpd={() => setShowAdmitToIpdModal(true)}
          onRequestSurgery={() => setShowSurgeryRequestModal(true)}
          isAdmittedToIpd={Boolean(
            visit?.ipdAdmissionId ||
            visit?.convertedToAdmissionId ||
            visit?.status === 'CONVERTED_TO_IPD' ||
            visit?.status === 'ADMISSION_RECOMMENDED' ||
            visit?.ipdAdmissionAdvice?.status === 'RECOMMENDED'
          )}
          labOrdersCount={labOrdersCount}
          savingDraft={savingDraft}
          routingToLab={routingToLab}
          finalizing={finalizing}
        />
      </div>

      {/* Recommend Inpatient (IPD) Admission Modal */}
      <RecommendIpdAdmissionModal
        isOpen={showAdmitToIpdModal}
        onClose={() => setShowAdmitToIpdModal(false)}
        visit={visit}
        onSuccess={(updatedVisit) => {
          setShowAdmitToIpdModal(false);
          if (onSelectVisit && visit) {
            onSelectVisit({
              ...visit,
              status: 'ADMISSION_RECOMMENDED',
              ipdAdmissionAdvice: updatedVisit?.ipdAdmissionAdvice || { status: 'RECOMMENDED' },
            });
          }
        }}
      />

      {/* Surgery & Operating Theatre Request Modal */}
      <RequestSurgeryModal
        isOpen={showSurgeryRequestModal}
        onClose={() => setShowSurgeryRequestModal(false)}
        admissionId={visit?.ipdAdmissionId || visit?.convertedToAdmissionId}
        patient={patient}
        visit={visit}
        onSuccess={() => {
          setShowSurgeryRequestModal(false);
        }}
      />
    </div>
  );
};

export default ClinicalWorkspace;
