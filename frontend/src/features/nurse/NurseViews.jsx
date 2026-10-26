import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import TriageQueue from './TriageQueue';
import PatientTriageSheet from './PatientTriageSheet';
export { default as NurseTriageHistoryView } from './NurseTriageHistoryView';

/**
 * NurseTriageView — Standard OPD triage queue and vital assessment workspace.
 * Supports collapsible rail queue view on Desktop and slide-in sub drawer on Mobile/Tablet.
 */
export const NurseTriageView = () => {
  const {
    queue,
    loadingQueue,
    selectedVisit,
    department,
    fetchQueue,
    handleSelect,
    handleTriageComplete,
    handleTriageCancel,
    deptName,
  } = useOutletContext();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const onSelectVisit = (visit) => {
    handleSelect(visit);
    setIsMobileDrawerOpen(false);
  };

  const patient = selectedVisit?.patientId || {};
  const patientName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Active Patient';
  const tokenDisplay = selectedVisit?.tokenString || (selectedVisit?.visitNumber ? selectedVisit.visitNumber.slice(-4) : '');

  return (
    <div className={`nurse-layout ${isCollapsed ? 'nurse-layout--rail' : ''}`}>
      {/* ── Mobile/Tablet Backdrop Scrim Portaled to Root Body for Full Viewport Blur ── */}
      {isMobileDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="nurse-drawer-backdrop"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* ── Mobile/Tablet Sticky/Top Toolbar (Muscle Memory Zone) ── */}
      <div className="nurse-mobile-toolbar">
        <button
          type="button"
          className="nurse-mobile-drawer-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Waiting Patients Queue Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Waiting Patients</span>
          <span className="nurse-mobile-count-badge">{queue?.length || 0}</span>
        </button>

        {selectedVisit && (
          <div className="nurse-mobile-patient-preview">
            {tokenDisplay && <span className="nurse-mobile-token-pill">{tokenDisplay}</span>}
            <span className="nurse-mobile-patient-name">{patientName}</span>
          </div>
        )}
      </div>

      <section
        className={`nurse-col nurse-col--queue ${isCollapsed ? 'nurse-col--queue-rail' : ''} ${isMobileDrawerOpen ? 'is-mobile-open' : ''}`}
        aria-label="Waiting triage queue"
      >
        <TriageQueue
          visits={queue}
          selectedVisitId={selectedVisit?._id || selectedVisit?.id || null}
          onSelectVisit={onSelectVisit}
          onRefresh={fetchQueue}
          departmentName={deptName}
          loading={loadingQueue}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
      </section>

      <section className="nurse-col nurse-col--sheet" aria-label="Patient triage assessment sheet">
        <PatientTriageSheet
          visit={selectedVisit}
          department={department}
          onComplete={handleTriageComplete}
          onCancel={handleTriageCancel}
        />
      </section>
    </div>
  );
};

export default NurseTriageView;
