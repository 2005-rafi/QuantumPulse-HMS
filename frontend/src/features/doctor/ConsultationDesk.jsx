import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PatientQueue from './PatientQueue';
import ClinicalWorkspace from './ClinicalWorkspace';

const ConsultationDesk = ({
  queue,
  selectedVisit,
  onSelectVisit,
  onRefreshQueue,
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
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const onSelectPatient = (visit) => {
    onSelectVisit?.(visit);
    setIsMobileDrawerOpen(false);
  };

  const patient = selectedVisit?.patientId || {};
  const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Active Patient';
  const tokenDisplay = selectedVisit?.tokenString || (selectedVisit?.visitNumber ? selectedVisit.visitNumber.slice(-4) : '');

  return (
    <div className={`consultation-desk ${isCollapsed ? 'consultation-desk--rail' : ''}`}>
      {/* ── Mobile/Tablet Backdrop Scrim Portaled to Root Body for Full Viewport Blur ── */}
      {isMobileDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="doc-drawer-backdrop"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* ── Mobile/Tablet Sticky/Top Toolbar (Muscle Memory Zone) ── */}
      <div className="doc-mobile-toolbar">
        <button
          type="button"
          className="doc-mobile-drawer-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Waiting Patients Queue Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Waiting Patients</span>
          <span className="doc-mobile-count-badge">{queue?.length || 0}</span>
        </button>

        {selectedVisit && tokenDisplay && (
          <div className="doc-mobile-patient-preview">
            <span className="doc-mobile-token-pill">Token: {tokenDisplay}</span>
          </div>
        )}
      </div>

      <div className={`consultation-desk__queue ${isCollapsed ? 'consultation-desk__queue--rail' : ''} ${isMobileDrawerOpen ? 'is-mobile-open' : ''}`}>
        <PatientQueue
          queue={queue}
          selectedVisitId={selectedVisit?._id}
          onSelectVisit={onSelectPatient}
          onRefresh={onRefreshQueue}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
      </div>
      <div className="consultation-desk__workspace">
        <ClinicalWorkspace
          visit={selectedVisit}
          user={user}
          form={form}
          onFormChange={onFormChange}
          laboratories={laboratories}
          onMedicationsChange={onMedicationsChange}
          onLabOrdersChange={onLabOrdersChange}
          onNotesChange={onNotesChange}
          onSaveDraft={onSaveDraft}
          onSendToLab={onSendToLab}
          onFinalize={onFinalize}
          savingDraft={savingDraft}
          routingToLab={routingToLab}
          finalizing={finalizing}
          canFinalize={canFinalize}
          queueStats={queueStats}
          queue={queue}
          onSelectVisit={onSelectPatient}
        />
      </div>
    </div>
  );
};

export default ConsultationDesk;
