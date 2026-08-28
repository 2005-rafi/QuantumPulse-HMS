import React from 'react';
import { useOutletContext } from 'react-router-dom';
import LabWorkQueue from './LabWorkQueue';
import LabResultWorksheet from './LabResultWorksheet';
import Md3FileUpload from '../../components/md3/Md3FileUpload';
import LabPriorityBar from './LabPriorityBar';
import SpecimenTracker from './SpecimenTracker';
import ResultsGrid from './ResultsGrid';

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
  } = useOutletContext();

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
      priorityCounts={priorityCounts}
      priorityFilter={priorityFilter}
      onPriorityFilterChange={setPriorityFilter}
      statusCounts={statusCounts}
    />
  );

  /* ─── Workspace Pane ─── */
  const workspacePane = (
    <LabResultWorksheet
      visit={selectedVisit}
      orderLabs={laboratories}
      tabMode="PROCESSING"
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
          patient={selectedVisit.patientId}
          visit={selectedVisit}
        />
      ) : null}
    />
  );

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
 */
export const LabReportedView = () => {
  const { allCompletedOrders, laboratories } = useOutletContext();

  return (
    <div className="lab-dashboard__single-view lab-dashboard__reported-view">
      <ResultsGrid
        completedOrders={allCompletedOrders}
        laboratories={laboratories}
      />
    </div>
  );
};
