import React, { useState } from 'react';
import PatientIdentityHeader from './PatientIdentityHeader';
import ConsultationActionBar from './ConsultationActionBar';
import SummaryTab from './SummaryTab';
import ConsultationTab from './ConsultationTab';
import OrdersResultsTab from './OrdersResultsTab';
import HistoryTab from './HistoryTab';
import ClinicalPatientOverlayDialog from '../../components/md3/ClinicalPatientOverlayDialog';

/* ============================================================
   ClinicalWorkspace — Doctor's Consultation Hub & Active Desk
   Path: frontend/src/features/doctor/ClinicalWorkspace.jsx
   Pure Material 3 Clinical Workflow & High-Efficiency Visual Launchpad
   ============================================================ */

/* ─── Doctor Idle Clinical Launchpad ──────────────────────── */
const DoctorIdleLaunchpad = ({ user, queue = [], onSelectVisit, queueStats }) => {
  const [activeOverlayType, setActiveOverlayType] = useState(null);

  const doctorName = user?.fullName
    ? user.fullName.replace(/^Dr\.\s*/i, '')
    : 'Physician';
  const department = user?.department || 'General Medicine';

  // Find next actionable patient (FIFO: first non-completed, non-skipped)
  const nextPatient = queue.find(
    (v) => v.status === 'IN_PROGRESS' || v.status === 'WAITING_DOCTOR' || v.status === 'CALLED'
  );

  const activeConsultations = queueStats?.IN_PROGRESS ?? queue.filter((v) => v.status === 'IN_PROGRESS').length;
  const waitingPatients = queueStats?.WAITING_DOCTOR ?? queue.filter((v) => v.status === 'WAITING_DOCTOR').length;
  const pendingReviews = queueStats?.WAITING_DOCTOR_REVIEW ?? queue.filter((v) => v.status === 'WAITING_DOCTOR_REVIEW').length;
  const completedToday = queueStats?.COMPLETED ?? queue.filter((v) => v.status === 'COMPLETED').length;

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="doc-idle-launchpad">
      {/* ── 1. Hero Greeting Banner ── */}
      <div className="doc-idle__hero-card">
        <div className="doc-idle__hero-left">
          <div className="doc-idle__avatar-badge">
            <span className="material-symbols-rounded">stethoscope</span>
          </div>
          <div className="doc-idle__hero-titles">
            <div className="doc-idle__hero-title-row">
              <h2 className="doc-idle__hero-name">Welcome back, Dr. {doctorName}</h2>
              <span className="doc-idle__duty-pill">
                <span className="doc-idle__duty-dot" />
                <span>Active On-Duty</span>
              </span>
            </div>
            <p className="doc-idle__hero-meta">
              <span className="doc-idle__dept-tag">{department} Department</span>
              <span className="doc-idle__sep">•</span>
              <span className="doc-idle__date-tag">{todayDate}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Real-Time Metric Tiles (Clickable On-Tap Overlays) ── */}
      <div className="doc-idle__stats-grid">
        <div
          className="doc-stat-tile doc-stat-tile--progress clickable-stat-tile"
          onClick={() => setActiveOverlayType('in_consultation')}
          title="Click to view active in-consultation patients ledger"
          style={{ cursor: 'pointer' }}
        >
          <div className="doc-stat-tile__icon-wrap">
            <span className="material-symbols-rounded">stethoscope</span>
          </div>
          <div className="doc-stat-tile__content">
            <span className="doc-stat-tile__label">In Consultation</span>
            <span className="doc-stat-tile__val">{activeConsultations}</span>
          </div>
        </div>

        <div
          className="doc-stat-tile doc-stat-tile--waiting clickable-stat-tile"
          onClick={() => setActiveOverlayType('waiting_doctor')}
          title="Click to view patients awaiting doctor consultation"
          style={{ cursor: 'pointer' }}
        >
          <div className="doc-stat-tile__icon-wrap">
            <span className="material-symbols-rounded">schedule</span>
          </div>
          <div className="doc-stat-tile__content">
            <span className="doc-stat-tile__label">Awaiting Doctor</span>
            <span className="doc-stat-tile__val">{waitingPatients}</span>
          </div>
        </div>

        <div
          className="doc-stat-tile doc-stat-tile--review clickable-stat-tile"
          onClick={() => setActiveOverlayType('lab_reviews')}
          title="Click to view diagnostic lab results ready for review"
          style={{ cursor: 'pointer' }}
        >
          <div className="doc-stat-tile__icon-wrap">
            <span className="material-symbols-rounded">biotech</span>
          </div>
          <div className="doc-stat-tile__content">
            <span className="doc-stat-tile__label">Lab Reviews Ready</span>
            <span className="doc-stat-tile__val">{pendingReviews}</span>
          </div>
        </div>

        <div
          className="doc-stat-tile doc-stat-tile--completed clickable-stat-tile"
          onClick={() => setActiveOverlayType('completed_today')}
          title="Click to view completed patient consultations today"
          style={{ cursor: 'pointer' }}
        >
          <div className="doc-stat-tile__icon-wrap">
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div className="doc-stat-tile__content">
            <span className="doc-stat-tile__label">Completed Today</span>
            <span className="doc-stat-tile__val">{completedToday}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Next Patient Action Prompt ── */}
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
              Your patient queue is up to date. As reception checks in patients and nursing completes vitals triage, they will appear in real time on the left sidebar.
            </p>
          </div>
        </div>
      )}

      {/* ── 4. Visual Clinical Workflow Navigation Cards ── */}
      <div className="doc-idle__workflow-section">
        <h4 className="doc-idle__section-title">
          <span className="material-symbols-rounded">clinical_notes</span>
          <span>Clinical Workstation Flow</span>
        </h4>

        <div className="doc-idle__workflow-grid">
          <div className="doc-flow-card">
            <div className="doc-flow-card__step-num">1</div>
            <div className="doc-flow-card__icon-wrap">
              <span className="material-symbols-rounded">vital_signs</span>
            </div>
            <h5 className="doc-flow-card__title">Intake &amp; Vitals</h5>
            <p className="doc-flow-card__desc">
              Inspect triage baseline vitals, BMI calculations, and recorded symptoms from nursing intake.
            </p>
          </div>

          <div className="doc-flow-card">
            <div className="doc-flow-card__step-num">2</div>
            <div className="doc-flow-card__icon-wrap">
              <span className="material-symbols-rounded">prescriptions</span>
            </div>
            <h5 className="doc-flow-card__title">Diagnosis &amp; Rx</h5>
            <p className="doc-flow-card__desc">
              Record clinical diagnosis, structured dosing schedule, and order diagnostic laboratory panels.
            </p>
          </div>

          <div className="doc-flow-card">
            <div className="doc-flow-card__step-num">3</div>
            <div className="doc-flow-card__icon-wrap">
              <span className="material-symbols-rounded">send_and_archive</span>
            </div>
            <h5 className="doc-flow-card__title">Finalize &amp; Route</h5>
            <p className="doc-flow-card__desc">
              Finalize consultation session to automatically route prescriptions to Pharmacy and orders to Diagnostics.
            </p>
          </div>
        </div>
      </div>

      {/* ─── REUSABLE CLINICAL OVERLAY FOR DOCTOR LAUNCHPAD ─── */}
      <ClinicalPatientOverlayDialog
        isOpen={!!activeOverlayType}
        onClose={() => setActiveOverlayType(null)}
        type={activeOverlayType}
        items={
          activeOverlayType === 'in_consultation'
            ? queue.filter((v) => v.status === 'IN_PROGRESS')
            : activeOverlayType === 'waiting_doctor'
            ? queue.filter((v) => v.status === 'WAITING_DOCTOR')
            : activeOverlayType === 'lab_reviews'
            ? queue.filter((v) => v.status === 'WAITING_DOCTOR_REVIEW')
            : activeOverlayType === 'completed_today'
            ? queue.filter((v) => v.status === 'COMPLETED')
            : null
        }
        onSelectPatient={(item) => {
          if (onSelectVisit && item) {
            onSelectVisit(item);
          }
        }}
        doctorId={user?.staffId}
      />
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

  if (!visit) {
    return (
      <div className="doc-workspace doc-workspace--empty">
        <DoctorIdleLaunchpad
          user={user}
          queue={queue}
          onSelectVisit={onSelectVisit}
          queueStats={queueStats}
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
              <SummaryTab visit={visit} patient={patient} form={form} />
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
          labOrdersCount={labOrdersCount}
          savingDraft={savingDraft}
          routingToLab={routingToLab}
          finalizing={finalizing}
        />
      </div>
    </div>
  );
};

export default ClinicalWorkspace;
