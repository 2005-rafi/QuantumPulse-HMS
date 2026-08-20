import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useLabQueue } from '../hooks/useLabQueue';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import './LabDashboard.css';

/**
 * Lab tab definitions — open for extension via config, closed for modification.
 */
const TABS = {
  PROCESSING: { id: 'processing', label: 'Processing Queue', icon: <Icon.Microscope /> },
  SPECIMENS:  { id: 'specimens',  label: 'Specimen Log',     icon: <Icon.Activity /> },
  REPORTED:   { id: 'reported',   label: 'Reported Results', icon: <Icon.FileSearch /> },
};

/**
 * LabDashboard — Layout & Navigation Shell Component
 *
 * SOLID:
 *   SRP  — Renders top shell, dynamic count tabs, and child view outlet.
 *   OCP  — Extend by adding child routes, not modifying this layout.
 *   DIP  — Depends on useLabQueue abstraction.
 */
const LabDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    queue,
    selectedVisit,
    laboratories,
    isRefreshing,
    hasLoadedQueue,
    queueError,
    busyAction,
    resultsForm,
    notesForm,
    priorityFilter,
    setPriorityFilter,
    searchValue,
    setSearchValue,
    fetchQueue,
    handleSelectVisit,
    handleCollectSample,
    handleSubmitResult,
    handleFileUpload,
    handleResultFieldChange,
    handleNotesChange,
    filteredQueue,
    allCompletedOrders,
    allPendingOrders,
    flatAllOrders,
    statusCounts,
    priorityCounts,
    dirtyCount,
    departmentName,
  } = useLabQueue();

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.warn('Logout cleanup error:', e); }
    finally { navigate('/login', { replace: true }); }
  };

  const headerTabs = React.useMemo(() => ([
    TABS.PROCESSING,
    {
      ...TABS.SPECIMENS,
      label: allPendingOrders.length > 0
        ? `${TABS.SPECIMENS.label} (${allPendingOrders.length})`
        : TABS.SPECIMENS.label,
    },
    {
      ...TABS.REPORTED,
      label: allCompletedOrders.length > 0
        ? `${TABS.REPORTED.label} (${allCompletedOrders.length})`
        : TABS.REPORTED.label,
    },
  ]), [allPendingOrders.length, allCompletedOrders.length]);

  // Derive active tab directly from URL path
  const activeTab = location.pathname.includes('/specimens')
    ? 'specimens'
    : location.pathname.includes('/reported')
    ? 'reported'
    : 'processing';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/laboratory/${tabId}`);
  };

  return (
    <div className="lab-dashboard">
      {/* ─── Top App Bar with Tabs ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Laboratory`}
        brandSubtitle={departmentName}
        centerSlot={
          <Md3Tabs
            tabs={headerTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        }
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── Main Workspace Routed Views ─── */}
      <main className="lab-dashboard__main" role="main">
        <Outlet
          context={{
            user,
            queue,
            selectedVisit,
            laboratories,
            isRefreshing,
            hasLoadedQueue,
            queueError,
            busyAction,
            resultsForm,
            notesForm,
            priorityFilter,
            setPriorityFilter,
            searchValue,
            setSearchValue,
            fetchQueue,
            handleSelectVisit,
            handleCollectSample,
            handleSubmitResult,
            handleFileUpload,
            handleResultFieldChange,
            handleNotesChange,
            filteredQueue,
            allCompletedOrders,
            allPendingOrders,
            flatAllOrders,
            statusCounts,
            priorityCounts,
            dirtyCount,
            departmentName,
          }}
        />
      </main>
    </div>
  );
};

export default LabDashboard;
