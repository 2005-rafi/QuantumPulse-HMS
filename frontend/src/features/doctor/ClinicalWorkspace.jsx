import React, { useState } from 'react';
import {
  Md3WorkspaceIdleState, Md3Card, Icon, Md3Tabs
} from '../../components/md3/Md3Widgets';
import PatientIdentityHeader from './PatientIdentityHeader';
import ConsultationActionBar from './ConsultationActionBar';
import SummaryTab from './SummaryTab';
import ConsultationTab from './ConsultationTab';
import OrdersResultsTab from './OrdersResultsTab';
import HistoryTab from './HistoryTab';

const WORKSPACE_TIPS = [
  'Select a patient card from "My Queue" on the left to activate their consultation desk.',
  'Triage vitals recorded by nursing staff will automatically sync into the vitals panel.',
  'Prescriptions and Laboratory orders added during consultation will route automatically upon finalization.',
  'Diagnosis and Treatment Plan are mandatory fields to finalize and route a patient.',
];

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
  onFinalize,
  savingDraft,
  finalizing,
  canFinalize,
  queueStats,
}) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!visit) {
    // Build dynamic stats from live data — zero hardcoding
    const userName = user?.fullName
      ? user.fullName.replace(/^Dr\.\s*/i, '')
      : '';
    const department = user?.department || '';
    const activeConsultations = queueStats?.IN_PROGRESS ?? '—';
    const pendingReviews = queueStats?.WAITING_DOCTOR_REVIEW ?? '—';
    const waitingPatients = queueStats?.WAITING_DOCTOR ?? '—';

    return (
      <div className="clinical-workspace clinical-workspace--empty">
        <Md3WorkspaceIdleState
          role="Physician"
          userName={userName}
          department={department}
          stats={[
            { icon: <Icon.Activity />, label: 'Active Consultations', value: String(activeConsultations) },
            { icon: <Icon.Clock />, label: 'Awaiting Doctor', value: String(waitingPatients) },
            { icon: <Icon.Microscope />, label: 'Pending Reviews', value: String(pendingReviews) },
          ]}
          tips={WORKSPACE_TIPS}
        />
      </div>
    );
  }

  const patient = visit.patientId || {};

  return (
    <div className="clinical-workspace">
      <Md3Card variant="elevated" padding="none" className="clinical-workspace__card">
        <PatientIdentityHeader visit={visit} />
        
        <div className="clinical-workspace__tab-rail">
          <div className="clinical-workspace__tab-rail">
            <Md3Tabs
              tabs={[
                { id: 'summary', label: 'Summary' },
                { id: 'consultation', label: 'Consultation' },
                { id: 'orders', label: 'Orders & Results' },
                { id: 'history', label: 'History' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>

        <div className="clinical-workspace__scroll">
          {activeTab === 'summary' && (
            <SummaryTab visit={visit} patient={patient} />
          )}
          {activeTab === 'consultation' && (
            <ConsultationTab
              visit={visit}
              form={form}
              onFormChange={onFormChange}
              onMedicationsChange={onMedicationsChange}
              onNotesChange={onNotesChange}
            />
          )}
          {activeTab === 'orders' && (
            <OrdersResultsTab
              visit={visit}
              form={form}
              laboratories={laboratories}
              onLabOrdersChange={onLabOrdersChange}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab patient={patient} />
          )}
        </div>

        <ConsultationActionBar
          onSaveDraft={onSaveDraft}
          onFinalize={onFinalize}
          canFinalize={canFinalize}
          savingDraft={savingDraft}
          finalizing={finalizing}
        />
      </Md3Card>
    </div>
  );
};

export default ClinicalWorkspace;
