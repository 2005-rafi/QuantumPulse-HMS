import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTriageQueue } from '../hooks/useTriageQueue';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import DashboardStatsBar from '../components/dashboard/DashboardStatsBar';
import './NurseDashboard.css';

/**
 * NurseDashboard — Shell Component supporting OPD Triage & Inpatient Ward Stations.
 *
 * SOLID:
 *   SRP  — Renders top shell, navigation tabs, and child view outlet.
 *   OCP  — Extend features via child routes without modifying the shell.
 *   DIP  — Depends on useTriageQueue abstraction.
 */
const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    queue,
    loadingQueue,
    selectedVisit,
    department,
    triagedToday,
    fetchQueue,
    handleSelect,
    handleTriageComplete,
    handleTriageCancel,
    deptName,
  } = useTriageQueue();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const headerTabs = [
    {
      id: 'triage',
      label: 'OPD Triage Station',
      icon: <Icon.Stethoscope />,
    },
    {
      id: 'ipd',
      label: 'Inpatient Ward Station',
      icon: <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>hotel</span>,
    },
  ];

  // Derive active tab from URL path
  const activeTab = location.pathname.includes('/ipd') ? 'ipd' : 'triage';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/nurse/${tabId}`);
  };

  const stats = [
    {
      icon: <Icon.Stethoscope />,
      label: 'Waiting for Triage',
      value: queue.length >= 0 ? String(queue.length) : '—',
      variant: 'tertiary',
    },
    {
      icon: <Icon.Users />,
      label: 'Sent to Doctor',
      value: String(triagedToday),
      variant: 'secondary',
    },
    {
      icon: <Icon.Hospital />,
      label: 'Department',
      value: deptName,
      variant: 'default',
    },
  ];

  return (
    <div className="nurse-page">
      {/* ─── TOP APP BAR ─── */}
      <CommonHeader
        brandTitle={`Nursing Portal · ${deptName}`}
        brandSubtitle="OPD Triage &amp; Inpatient Clinical Care"
        centerSlot={
          <Md3Tabs tabs={headerTabs} activeTab={activeTab} onChange={handleTabChange} />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── STATS BAR (Only on Triage tab) ─── */}
      {activeTab === 'triage' && <DashboardStatsBar stats={stats} showToday />}

      {/* ─── MAIN WORKSPACE ROUTED VIEWS ─── */}
      <main className="nurse-main">
        <Outlet
          context={{
            user,
            queue,
            loadingQueue,
            selectedVisit,
            department,
            triagedToday,
            fetchQueue,
            handleSelect,
            handleTriageComplete,
            handleTriageCancel,
            deptName,
          }}
        />
      </main>
    </div>
  );
};

export default NurseDashboard;
