import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDoctorWorkspace } from '../hooks/useDoctorWorkspace';
import CommonHeader from '../components/shell/CommonHeader';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import { useConfig } from '../contexts/ConfigContext';
import '../components/shell/shell.css';
import './DoctorDashboard.css';

/**
 * DoctorDashboard — Layout & Navigation Shell Component
 *
 * SOLID:
 *   SRP  — Renders top shell and child view outlet.
 *   OCP  — New tabs or views extend via child routes.
 *   DIP  — Depends on useDoctorWorkspace abstraction.
 */
const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const config = useConfig();

  const {
    queue,
    selectedVisit,
    form,
    laboratories,
    deletionRequests,
    savingDraft,
    routingToLab,
    finalizing,
    isRefreshing,
    fetchQueue,
    handleSelectVisit,
    handleFormChange,
    handleMedicationsChange,
    handleLabOrdersChange,
    handleNotesChange,
    handleSaveDraft,
    handleSendToLab,
    handleFinalize,
    canFinalize,
    queueStats,
    headerTabs,
  } = useDoctorWorkspace();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Centralized active tab resolution derived directly from URL path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentSubPath = pathParts[pathParts.length - 1];
  const matchedTab = headerTabs.find((t) => t.path === currentSubPath || t.id === currentSubPath);
  const activeTab = matchedTab
    ? matchedTab.id
    : location.pathname.includes('/ipd')
    ? 'ipd'
    : 'consultation';

  const handleTabChange = (tabId) => {
    const target = headerTabs.find((t) => t.id === tabId || t.path === tabId);
    const routePath = target?.path || tabId;
    React.startTransition(() => {
      navigate(`/dashboard/doctor/${routePath}`);
    });
  };

  const headerTabsWithIcons = React.useMemo(() => {
    return headerTabs.map((t) => {
      const icon = (
        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
          {t.iconName || 'stethoscope'}
        </span>
      );
      return { ...t, icon };
    });
  }, [headerTabs]);

  return (
    <div className="doctor-page">
      {/* ─── TOP APP BAR with Tabs ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'CareOne-QPT'} Doctor Portal`}
        brandSubtitle={user?.department || 'Department'}
        centerSlot={
          <Md3Tabs tabs={headerTabsWithIcons} activeTab={activeTab} onChange={handleTabChange} />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE ROUTED VIEWS ─── */}
      <main className="doctor-main">
        <Outlet
          context={{
            user,
            queue,
            selectedVisit,
            form,
            laboratories,
            deletionRequests,
            savingDraft,
            routingToLab,
            finalizing,
            isRefreshing,
            fetchQueue,
            handleSelectVisit,
            handleFormChange,
            handleMedicationsChange,
            handleLabOrdersChange,
            handleNotesChange,
            handleSaveDraft,
            handleSendToLab,
            handleFinalize,
            canFinalize,
            queueStats,
          }}
        />
      </main>
    </div>
  );
};

export default DoctorDashboard;

