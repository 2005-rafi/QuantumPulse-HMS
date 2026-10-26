import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useNavigate } from 'react-router-dom';
import LabWorkQueue from './LabWorkQueue';
import LabResultWorksheet from './LabResultWorksheet';
import Md3FileUpload from '../../components/md3/Md3FileUpload';
import LabPriorityBar from './LabPriorityBar';
import SpecimenTracker from './SpecimenTracker';
import ResultsGrid from './ResultsGrid';
import LabTokenQueueBar from './LabTokenQueueBar';
import LabPreVitalsDialog from './LabPreVitalsDialog';
import LabDoctorCockpit from './LabDoctorCockpit';
import LabNurseHistoryView from './LabNurseHistoryView';
import Md3PatientHistoryManager from '../../components/md3/Md3PatientHistoryManager';


/**
 * LabProcessingView — Live diagnostic test queue & result entry worksheet.
 */
export const LabProcessingView = () => {
  const {
    filteredQueue,
    selectedVisit,
    laboratories,
    handleSelectVisit,
    hasLoadedQueue,
    isRefreshing,
    queueError,
    fetchQueue,
    searchValue,
    setSearchValue,
    priorityCounts,
    priorityFilter,
    setPriorityFilter,
    stationFilter,
    setStationFilter,
    statusCounts,
    busyAction,
    resultsForm,
    notesForm,
    handleResultFieldChange,
    handleNotesChange,
    handleCollectSample,
    handleSubmitResult,
    handleFileUpload,
    dirtyCount,
    allCompletedOrders,
    activeOriginFilter,
    setActiveOriginFilter,
    activeToken,
    callNextToken,
    handleRecordLabVitals,
    handleRecordPhlebotomyRisks,
    handleVerifyResults,
    handleDispatchVisit,
    queue,
    user,
    isLabNurse,
  } = useOutletContext();

  const navigate = useNavigate();
  const [vitalsModalOrder, setVitalsModalOrder] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isNurseMode = Boolean(isLabNurse || user?.role === 'Lab Nurse');

  const onSelectPatient = (visit) => {
    handleSelectVisit?.(visit);
    setIsMobileDrawerOpen(false);
  };

  const patient = selectedVisit?.patientId || {};
  const patientName = patient.fullName || patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Active Patient';
  const tokenDisplay = selectedVisit?.tokenString || (selectedVisit?.visitNumber ? selectedVisit.visitNumber.slice(-4) : '');

  const displayQueue = React.useMemo(() => {
    if (!activeOriginFilter || activeOriginFilter === 'ALL') return filteredQueue;
    return (filteredQueue || []).filter((v) => {
      const orders = v.labOrders || [];
      return orders.some((o) => o.origin === activeOriginFilter);
    });
  }, [filteredQueue, activeOriginFilter]);

  /* ─── Queue Pane ─── */
  const queuePane = (
    <LabWorkQueue
      visits={displayQueue}
      selectedVisitId={selectedVisit?._id}
      onSelectVisit={onSelectPatient}
      loading={!hasLoadedQueue || isRefreshing}
      error={queueError}
      onRefresh={fetchQueue}
      isRefreshing={isRefreshing}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      priorityCounts={priorityCounts}
      priorityFilter={priorityFilter}
      onPriorityFilterChange={setPriorityFilter}
      stationFilter={stationFilter}
      onStationFilterChange={setStationFilter}
      laboratories={laboratories}
      statusCounts={statusCounts}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      departmentName={user?.department || 'Phlebotomy Station'}
      showStationFilter={!isNurseMode && laboratories.length > 1}
    />
  );

  /* ─── Workspace Pane ─── */
  const workspacePane = (
    <LabResultWorksheet
      visit={selectedVisit}
      orderLabs={laboratories}
      tabMode="PROCESSING"
      isNurseMode={isNurseMode}
      currentUser={user}
      onCollectSample={handleCollectSample}
      onSubmitResult={handleSubmitResult}
      onRecordVitals={(order) => setVitalsModalOrder(order)}
      onSavePhlebotomyRisks={handleRecordPhlebotomyRisks}
      onDispatchVisit={handleDispatchVisit}
      onChangeField={handleResultFieldChange}
      onChangeNotes={handleNotesChange}
      disabled={Boolean(busyAction)}
      dirtyCount={dirtyCount}
      resultsForm={resultsForm}
      notesForm={notesForm}

      specimenTrackerSlot={selectedVisit ? (
        <SpecimenTracker
          orders={selectedVisit.labOrders || []}
          laboratories={laboratories}
          onCollect={handleCollectSample}
          busyCollecting={busyAction}
        />
      ) : null}
      resultsGridSlot={selectedVisit ? (
        <ResultsGrid
          completedOrders={(selectedVisit.labOrders || []).filter(
            (o) => (o.status || '').toUpperCase() === 'COMPLETED' || (o.status || '').toUpperCase() === 'VERIFIED'
          )}
          laboratories={laboratories}
          patient={selectedVisit.patientId}
          visit={selectedVisit}
        />
      ) : null}
    />
  );

  return (
    <div className="lab-processing-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* ── Mobile/Tablet Backdrop Scrim for Side-Based Drawer ── */}
      {isMobileDrawerOpen && (
        <div
          className="lab-drawer-backdrop ldc-drawer-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Real-Time Token & Waiting Queue Control Banner */}
      <LabTokenQueueBar
        activeToken={activeToken}
        waitingCount={displayQueue.length}
        onCallNextToken={callNextToken}
        activeOriginFilter={activeOriginFilter}
        onOriginFilterChange={setActiveOriginFilter}
      />

      {/* ── Mobile/Tablet Sticky/Top Toolbar (Muscle Memory Zone) ── */}
      <div className="ldc-mobile-toolbar lab-nurse-mobile-toolbar">
        <button
          type="button"
          className="ldc-mobile-drawer-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Waiting Patients Queue Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Waiting Patients</span>
          <span className="ldc-mobile-count-badge">{displayQueue?.length || 0}</span>
        </button>

        {selectedVisit && (
          <div className="ldc-mobile-patient-preview">
            {tokenDisplay && <span className="ldc-mobile-token-pill">Token: {tokenDisplay}</span>}
            <span className="ldc-mobile-patient-name">{patientName}</span>
          </div>
        )}
      </div>

      <div className={`lab-dashboard__desk ${isCollapsed ? 'lab-dashboard__desk--rail' : ''}`} role="region" aria-label="Laboratory workspace and queue">
        <aside
          className={`lab-dashboard__queue-pane ${isCollapsed ? 'lab-dashboard__queue-pane--rail' : ''} ${isMobileDrawerOpen ? 'is-mobile-open' : ''}`}
          aria-label="Laboratory patient queue"
        >
          {queuePane}
        </aside>
        <section className="lab-dashboard__workspace-pane" aria-label="Laboratory result workspace">
          {workspacePane}
          {selectedVisit && !isNurseMode && (
            <Md3FileUpload
              visit={selectedVisit}
              onUpload={handleFileUpload}
            />
          )}
        </section>
      </div>

      {/* Lab Pre-Vitals Intake Dialog */}
      {vitalsModalOrder && (
        <LabPreVitalsDialog
          isOpen={Boolean(vitalsModalOrder)}
          onClose={() => setVitalsModalOrder(null)}
          visit={selectedVisit}
          order={vitalsModalOrder}
          onSaveVitals={(vitalsData) =>
            handleRecordLabVitals(selectedVisit._id, vitalsModalOrder._id || vitalsModalOrder.id, vitalsData)
          }
        />
      )}
    </div>
  );
};

/**
 * LabSpecimensView — Specimen tracking and collection lifecycle log.
 */
export const LabSpecimensView = () => {
  const { flatAllOrders, laboratories, handleCollectSample, busyAction } = useOutletContext();

  return (
    <div className="lab-dashboard__single-view lab-dashboard__specimens-view">
      <SpecimenTracker
        orders={flatAllOrders}
        laboratories={laboratories}
        onCollect={handleCollectSample}
        busyCollecting={busyAction}
      />
    </div>
  );
};

/**
 * LabReportedView — Completed diagnostic results and historical records.
 * Provides unified, Material 3 Expressive patient history management with
 * complete cross-accountability between Lab Nurses and Doctors.
 */
export const LabReportedView = () => {
  const {
    allCompletedOrders,
    laboratories,
    user,
    historyVisits,
    isHistoryLoading,
    fetchHistory,
  } = useOutletContext();

  return (
    <div className="lab-dashboard__single-view lab-dashboard__history-view" style={{ width: '100%' }}>
      <Md3PatientHistoryManager
        history={historyVisits}
        isLoading={isHistoryLoading}
        onRefresh={fetchHistory}
        laboratories={laboratories}
        currentUser={user}
      />
    </div>
  );
};


/**
 * LabVerificationView — Pathologist medical verification & authorization cockpit.
 */
export const LabVerificationView = () => {
  const {
    queue,
    historyVisits,
    reportedVisits,
    selectedVisit,
    handleSelectVisit,
    handleVerifyResults,
    handleBroadcastPanicAlert,
    fetchPatientLabHistory,
    handleSubmitResult,
    handleCollectSample,
    handleDispatchVisit,
    laboratories,
    user,
  } = useOutletContext();

  return (
    <div className="lab-dashboard__single-view lab-dashboard__verification-view">
      <LabDoctorCockpit
        visits={queue}
        historyVisits={historyVisits}
        reportedVisits={reportedVisits}
        selectedVisit={selectedVisit}
        onSelectVisit={handleSelectVisit}
        onVerifyOrder={handleVerifyResults}
        onBroadcastPanic={handleBroadcastPanicAlert}
        onFetchPatientHistory={fetchPatientLabHistory}
        onSubmitResult={handleSubmitResult}
        onCollectSample={handleCollectSample}
        onDispatchVisit={handleDispatchVisit}
        laboratories={laboratories}
        currentUser={user}
      />
    </div>
  );
};
