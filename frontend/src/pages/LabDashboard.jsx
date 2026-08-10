import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useLabQueue } from '../hooks/useLabQueue';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import { Md3Button } from '../components/md3/Md3FormComponents';
import CommonHeader from '../components/shell/CommonHeader';
import LabWorkQueue from '../features/laboratory/LabWorkQueue';
import LabResultWorksheet from '../features/laboratory/LabResultWorksheet';
import Md3FileUpload from '../components/md3/Md3FileUpload';
import LabPriorityBar from '../features/laboratory/LabPriorityBar';
import SpecimenTracker from '../features/laboratory/SpecimenTracker';
import ResultsGrid from '../features/laboratory/ResultsGrid';
import './LabDashboard.css';

/**
 * Lab tab definitions — open for extension via config, closed for modification.
 */
const TABS = {
  PROCESSING: { id: 'processing', label: 'Processing Queue', icon: <Icon.Microscope /> },
  SPECIMENS:  { id: 'specimens',  label: 'Specimen Log',     icon: <Icon.Activity /> },
  REPORTED:   { id: 'reported',   label: 'Reported Results', icon: <Icon.FileSearch /> },
};

/**
 * LabDashboard — Pure Presentation Component
 *
 * SOLID:
 *   SRP  — Renders UI only. All queue management, result submission, and file upload
 *           logic lives in useLabQueue hook.
 *   OCP  — New lab views extend via TABS config or hook, not this component.
 *   DIP  — Depends on useLabQueue abstraction, not raw api calls.
 *
 * Removes: HmsBrandIcon, UserProfileButton (both replaced by CommonHeader).
 */
const LabDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

  const {
    queue,
    selectedVisit,
    laboratories,
    isRefreshing,
    hasLoadedQueue,
    queueError,
    busyAction,
    resultsForm,
    notesForm,
    activeTab,
    setActiveTab,
    priorityFilter,
    setPriorityFilter,
    searchValue,
    setSearchValue,
    fetchQueue,
    handleSelectVisit,
    handleCollectSample,
    handleSubmitResult,
    handleFileUpload,
    handleResultFieldChange,
    handleNotesChange,
    filteredQueue,
    allCompletedOrders,
    allPendingOrders,
    flatAllOrders,
    statusCounts,
    priorityCounts,
    dirtyCount,
    departmentName,
  } = useLabQueue();

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.warn('Logout cleanup error:', e); }
    finally { navigate('/login', { replace: true }); }
  };

  const headerTabs = React.useMemo(() => ([
    TABS.PROCESSING,
    {
      ...TABS.SPECIMENS,
      label: allPendingOrders.length > 0
        ? `${TABS.SPECIMENS.label} (${allPendingOrders.length})`
        : TABS.SPECIMENS.label,
    },
    {
      ...TABS.REPORTED,
      label: allCompletedOrders.length > 0
        ? `${TABS.REPORTED.label} (${allCompletedOrders.length})`
        : TABS.REPORTED.label,
    },
  ]), [allPendingOrders.length, allCompletedOrders.length]);

  /* ─── Queue Pane ─── */
  const queuePane = (
    <LabWorkQueue
      visits={filteredQueue}
      selectedVisitId={selectedVisit?._id}
      onSelectVisit={handleSelectVisit}
      loading={!hasLoadedQueue || isRefreshing}
      error={queueError}
      onRefresh={fetchQueue}
      isRefreshing={isRefreshing}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      priorityBar={(
        <LabPriorityBar
          counts={priorityCounts}
          activeFilter={priorityFilter}
          onFilterChange={setPriorityFilter}
          statusCounts={statusCounts}
        />
      )}
    />
  );

  /* ─── Workspace Pane ─── */
  const workspacePane = (
    <LabResultWorksheet
      visit={selectedVisit}
      orderLabs={laboratories}
      tabMode={
        activeTab === TABS.REPORTED.id  ? 'REPORTED'
        : activeTab === TABS.SPECIMENS.id ? 'SPECIMENS'
        : 'PROCESSING'
      }
      onCollectSample={handleCollectSample}
      onSubmitResult={handleSubmitResult}
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
            (o) => (o.status || '').toUpperCase() === 'COMPLETED'
          )}
          laboratories={laboratories}
        />
      ) : null}
    />
  );

  /* ─── Main Content Renderer ─── */
  const renderMain = () => {
    if (activeTab === TABS.SPECIMENS.id) {
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
    }
    if (activeTab === TABS.REPORTED.id) {
      return (
        <div className="lab-dashboard__single-view lab-dashboard__reported-view">
          <ResultsGrid
            completedOrders={allCompletedOrders}
            laboratories={laboratories}
          />
        </div>
      );
    }
    return (
      <div className="lab-dashboard__desk" role="region" aria-label="Laboratory workspace and queue">
        <aside className="lab-dashboard__queue-pane" aria-label="Laboratory patient queue">
          {queuePane}
        </aside>
        <section className="lab-dashboard__workspace-pane" aria-label="Laboratory result workspace">
          {workspacePane}
          {selectedVisit && (
            <Md3FileUpload
              visit={selectedVisit}
              onUpload={handleFileUpload}
            />
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="lab-dashboard">

      {/* ─── TOP APP BAR with Tabs ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Laboratory`}
        brandSubtitle={departmentName}
        centerSlot={
          <Md3Tabs tabs={headerTabs} activeTab={activeTab} onChange={setActiveTab} />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="lab-dashboard__main" role="main">
        {renderMain()}
      </main>
    </div>
  );
};

export default LabDashboard;
