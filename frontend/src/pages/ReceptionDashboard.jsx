import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useReceptionDashboard } from '../hooks/useReceptionDashboard';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import DashboardStatsBar from '../components/dashboard/DashboardStatsBar';
import './ReceptionDashboard.css';

/**
 * ReceptionDashboard — Layout & Navigation Shell Component
 *
 * SOLID:
 *   SRP  — Renders top shell, global stats, and child view outlet.
 *   OCP  — Extend by adding child routes, not modifying this layout.
 *   DIP  — Depends on useReceptionDashboard abstraction.
 */
const ReceptionDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    totalPatients,
    todaysVisits,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  } = useReceptionDashboard();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const tabs = [
    { id: 'patients', label: 'Walk-in & Patients', icon: <Icon.Users /> },
    { id: 'appointments', label: 'Appointments', icon: <Icon.Calendar /> },
  ];

  // Derive active tab directly from URL path
  const activeTab = location.pathname.includes('/appointments') ? 'appointments' : 'patients';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/reception/${tabId}`);
  };

  const stats = [
    {
      icon: <Icon.Users />,
      label: 'Registered Patients',
      value: totalPatients > 0 ? totalPatients.toLocaleString() : '—',
      variant: 'secondary',
    },
    {
      icon: <Icon.History />,
      label: "Today's Visits",
      value: todaysVisits > 0 ? String(todaysVisits) : '0',
      variant: 'tertiary',
    },
    {
      icon: <Icon.Activity />,
      label: 'Active Module',
      value: 'Reception',
      variant: 'default',
    },
  ];

  return (
    <div className="reception-page">
      {/* ─── TOP APP BAR WITH TABS IN CENTER SLOT ─── */}
      <CommonHeader
        brandTitle={config?.SHORT_NAME || 'HMS'}
        brandSubtitle="Clinical Reception"
        centerSlot={
          <Md3Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            className="reception-header-tabs"
          />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── STATS BAR ─── */}
      <DashboardStatsBar stats={stats} showToday />

      {/* ─── MAIN WORKSPACE ROUTED VIEWS ─── */}
      <main className="reception-main">
        <Outlet
          context={{
            user,
            selectedPatient,
            isRegSheetOpen,
            setIsRegSheetOpen,
            printData,
            totalPatients,
            todaysVisits,
            handlePatientSelect,
            handleVisitCreated,
            handlePrintDone,
            viewKey,
          }}
        />
      </main>
    </div>
  );
};

export default ReceptionDashboard;

