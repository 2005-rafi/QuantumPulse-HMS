import React from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import ConsultationDesk from './ConsultationDesk';
import DeletionRequestsView from './DeletionRequestsView';
import DoctorAppointmentView from '../appointments/DoctorAppointmentView';
import DoctorConsultationHistory from './DoctorConsultationHistory';
import PatientProfile from '../patients/PatientProfile';

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
 * DoctorConsultationHistoryView — Doctor's personal consultation encounters and immutable notes history.
 */
export const DoctorConsultationHistoryView = () => {
  return <DoctorConsultationHistory />;
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

/**
 * DoctorPatientProfileView — Clinical Patient Dossier with instant back navigation to consultation desk.
 */
export const DoctorPatientProfileView = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  return (
    <div
      className="doctor-patient-profile-view"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--md-sys-color-background, #faf9f5)',
      }}
    >
      <PatientProfile
        patientId={patientId}
        onBack={() => {
          navigate('/dashboard/doctor/consultation');
        }}
      />
    </div>
  );
};
