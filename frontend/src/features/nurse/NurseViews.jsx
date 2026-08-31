import React from 'react';
import { useOutletContext } from 'react-router-dom';
import TriageQueue from './TriageQueue';
import PatientTriageSheet from './PatientTriageSheet';

/**
 * NurseTriageView — Standard OPD triage queue and vital assessment workspace.
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
  } = useOutletContext();

  return (
    <div className="nurse-layout">
      <section className="nurse-col nurse-col--queue" aria-label="Waiting triage queue">
        <TriageQueue
          visits={queue}
          selectedVisitId={selectedVisit?._id || selectedVisit?.id || null}
          onSelectVisit={handleSelect}
          onRefresh={fetchQueue}
          loading={loadingQueue}
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
