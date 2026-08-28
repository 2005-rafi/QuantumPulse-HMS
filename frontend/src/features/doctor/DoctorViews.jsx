import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConsultationDesk from './ConsultationDesk';
import DeletionRequestsView from './DeletionRequestsView';
import DoctorAppointmentView from '../appointments/DoctorAppointmentView';

/**
 * DoctorConsultationView — Main clinical consultation workspace & patient queue.
 */
export const DoctorConsultationView = () => {
  const {
    queue,
    selectedVisit,
    handleSelectVisit,
    fetchQueue,
    user,
    form,
    handleFormChange,
    laboratories,
    handleMedicationsChange,
    handleLabOrdersChange,
    handleNotesChange,
    handleSaveDraft,
    handleSendToLab,
    handleFinalize,
    savingDraft,
    routingToLab,
    finalizing,
    canFinalize,
    queueStats,
  } = useOutletContext();

  return (
    <ConsultationDesk
      queue={queue}
      selectedVisit={selectedVisit}
      onSelectVisit={handleSelectVisit}
      onRefreshQueue={fetchQueue}
      user={user}
      form={form}
      onFormChange={handleFormChange}
      laboratories={laboratories}
      onMedicationsChange={handleMedicationsChange}
      onLabOrdersChange={handleLabOrdersChange}
      onNotesChange={handleNotesChange}
      onSaveDraft={handleSaveDraft}
      onSendToLab={handleSendToLab}
      onFinalize={handleFinalize}
      savingDraft={savingDraft}
      routingToLab={routingToLab}
      finalizing={finalizing}
      canFinalize={canFinalize}
      queueStats={queueStats}
    />
  );
};

/**
 * DoctorAppointmentsView — Doctor's daily scheduled appointments.
 */
export const DoctorAppointmentsView = () => {
  const { user, handleSelectVisit } = useOutletContext();
  const navigate = useNavigate();

  return (
    <DoctorAppointmentView
      doctorId={user?.staffId}
      onOpenVisit={(item) => {
        if (item) {
          handleSelectVisit(item);
          navigate('/dashboard/doctor/consultation');
        }
      }}
    />
  );
};

/**
 * DoctorDeletionRequestsView — Pending deletion requests requiring doctor approval.
 */
export const DoctorDeletionRequestsView = () => {
  const { deletionRequests, fetchQueue } = useOutletContext();

  return (
    <DeletionRequestsView
      deletionRequests={deletionRequests}
      onRefresh={fetchQueue}
    />
  );
};
