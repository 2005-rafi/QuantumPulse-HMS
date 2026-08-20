import React from 'react';
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
  return (
    <div className="consultation-desk">
      <div className="consultation-desk__queue">
        <PatientQueue
          queue={queue}
          selectedVisitId={selectedVisit?._id}
          onSelectVisit={onSelectVisit}
          onRefresh={onRefreshQueue}
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
        />
      </div>
    </div>
  );
};

export default ConsultationDesk;
