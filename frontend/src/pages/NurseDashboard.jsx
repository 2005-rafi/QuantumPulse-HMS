import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTriageQueue } from '../hooks/useTriageQueue';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
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

  const isOpdNurse = user?.role === 'OPD Nurse';
  const isIpdNurse = user?.role === 'IPD Nurse';

  // Role-directed navigation guard
  React.useEffect(() => {
    if (isIpdNurse && !location.pathname.includes('/ipd')) {
      navigate('/dashboard/nurse/ipd', { replace: true });
    } else if (isOpdNurse && location.pathname.includes('/ipd')) {
      navigate('/dashboard/nurse/triage', { replace: true });
    }
  }, [isIpdNurse, isOpdNurse, location.pathname, navigate]);

  const headerTabs = React.useMemo(() => {
    const opdTabs = [
      {
        id: 'triage',
        label: 'OPD Nursing Station',
        icon: <Icon.Stethoscope />,
      },
      {
        id: 'history',
        label: 'Triage History',
        icon: <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>history_edu</span>,
      },
    ];
    const ipdTabs = [
      {
        id: 'ipd',
        label: 'Patient Clinical Care',
        icon: <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>personal_injury</span>,
      },
      {
        id: 'ipd-operations',
        label: 'Ward Operations & Logistics',
        icon: <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>domain</span>,
      },
    ];

    if (isIpdNurse) {
      return ipdTabs;
    }
    if (isOpdNurse) return opdTabs;
    return [
      ...opdTabs,
      ...ipdTabs,
    ];
  }, [isOpdNurse, isIpdNurse]);

  // Derive active tab from URL path
  const activeTab = location.pathname.includes('/ipd-operations')
    ? 'ipd-operations'
    : location.pathname.includes('/ipd')
    ? 'ipd'
    : location.pathname.includes('/history')
    ? 'history'
    : 'triage';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/nurse/${tabId}`);
  };

  return (
    <div className="nurse-page">
      {/* ─── TOP APP BAR ─── */}
      <CommonHeader
        brandTitle={`Nursing Portal · ${deptName}`}
        brandSubtitle="OPD Nursing &amp; Inpatient Clinical Care"
        centerSlot={
          <Md3Tabs tabs={headerTabs} activeTab={activeTab} onChange={handleTabChange} />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE ROUTED VIEWS (Full Height) ─── */}
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
