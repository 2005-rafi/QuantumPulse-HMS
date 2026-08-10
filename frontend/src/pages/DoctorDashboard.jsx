import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDoctorWorkspace } from '../hooks/useDoctorWorkspace';
import CommonHeader from '../components/shell/CommonHeader';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import ConsultationDesk from '../features/doctor/ConsultationDesk';
import DeletionRequestsView from '../features/doctor/DeletionRequestsView';
import '../components/shell/shell.css';
import './DoctorDashboard.css';

/**
 * DoctorDashboard — Pure Presentation Component
 *
 * SOLID:
 *   SRP  — Renders UI only. All queue fetching, form state, consultation logic
 *           lives in useDoctorWorkspace hook.
 *   OCP  — New tabs or views extend via hook configuration, not this file.
 *   DIP  — Depends on useDoctorWorkspace abstraction, not raw API services.
 */
const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    queue,
    selectedVisit,
    form,
    laboratories,
    activeTab,
    setActiveTab,
    deletionRequests,
    savingDraft,
    finalizing,
    isRefreshing,
    fetchQueue,
    handleSelectVisit,
    handleFormChange,
    handleMedicationsChange,
    handleLabOrdersChange,
    handleNotesChange,
    handleSaveDraft,
    handleFinalize,
    canFinalize,
    queueStats,
    headerTabs,
  } = useDoctorWorkspace();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="doctor-page">

      {/* ─── TOP APP BAR with Tabs ─── */}
      <CommonHeader
        brandIcon={<Icon.Hospital />}
        brandTitle="Doctor Portal"
        brandSubtitle={user?.department || 'Department'}
        centerSlot={
          <Md3Tabs tabs={headerTabs} activeTab={activeTab} onChange={setActiveTab} />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="doctor-main">
        {activeTab === 'deletionRequests' ? (
          <DeletionRequestsView
            deletionRequests={deletionRequests}
            onRefresh={fetchQueue}
          />
        ) : (
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
            onFinalize={handleFinalize}
            savingDraft={savingDraft}
            finalizing={finalizing}
            canFinalize={canFinalize}
            queueStats={queueStats}
          />
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
