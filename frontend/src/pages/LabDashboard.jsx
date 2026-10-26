import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useLabQueue } from '../hooks/useLabQueue';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import './LabDashboard.css';

/**
 * Lab tab definitions — open for extension via config, closed for modification.
 */
const TABS = {
  PROCESSING:   { id: 'processing',   label: 'Processing Queue',        icon: <Icon.Microscope /> },
  VERIFICATION: { id: 'verification', label: 'Pathologist Verification', icon: <span className="material-symbols-rounded">verified_user</span> },
  SPECIMENS:    { id: 'specimens',    label: 'Specimen Log',            icon: <Icon.Activity /> },
  REPORTED:     { id: 'reported',     label: 'Reported Results',        icon: <Icon.FileSearch /> },
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
    stationFilter,
    setStationFilter,
    searchValue,
    setSearchValue,
    activeOriginFilter,
    setActiveOriginFilter,
    activeToken,
    callNextToken,
    handleRecordLabVitals,
    handleRecordPhlebotomyRisks,
    handleBroadcastPanicAlert,
    fetchPatientLabHistory,
    handleVerifyResults,
    handleDispatchVisit,
    fetchQueue,
    historyVisits,
    isHistoryLoading,
    fetchHistory,
    handleSelectVisit,
    handleCollectSample,
    handleSubmitResult,
    handleFileUpload,
    handleResultFieldChange,
    handleNotesChange,
    filteredQueue,
    allCompletedOrders,
    allPendingOrders,
    allVerificationOrders,
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

  const isLabDoctor = user?.role === 'Laboratory' || user?.isDoctor;
  const isLabNurse = user?.role === 'Lab Nurse';

  const headerTabs = React.useMemo(() => {
    if (isLabDoctor) {
      return [
        {
          id: 'verification',
          label: (allVerificationOrders?.length || 0) > 0
            ? `Pathologist Verification (${allVerificationOrders.length})`
            : 'Pathologist Verification',
          icon: <span className="material-symbols-rounded">verified_user</span>,
        },
        {
          id: 'specimens',
          label: allPendingOrders.length > 0
            ? `Analytical Oversight (${allPendingOrders.length})`
            : 'Analytical Oversight',
          icon: <span className="material-symbols-rounded">biotech</span>,
        },
        {
          id: 'reported',
          label: (historyVisits?.length || 0) > 0
            ? `Patient History & Archives (${historyVisits.length})`
            : 'Patient History & Archives',
          icon: <span className="material-symbols-rounded">manage_search</span>,
        },
        ...(user?.isHod
          ? [
              {
                id: 'staff',
                label: 'Department Governance',
                icon: <span className="material-symbols-rounded">admin_panel_settings</span>,
              },
            ]
          : []),
      ];
    }

    // Default: Lab Nurse Workstation Tabs
    return [
      {
        id: 'processing',
        label: 'Phlebotomy & Intake Queue',
        icon: <span className="material-symbols-rounded">bloodtype</span>,
      },
      {
        id: 'specimens',
        label: allPendingOrders.length > 0
          ? `Specimen Tracker (${allPendingOrders.length})`
          : 'Specimen Tracker',
        icon: <span className="material-symbols-rounded">science</span>,
      },
      {
        id: 'reported',
        label: (historyVisits?.length || 0) > 0
          ? `Patient History & Status Tracker (${historyVisits.length})`
          : 'Patient History & Status Tracker',
        icon: <span className="material-symbols-rounded">manage_search</span>,
      },
      ...(user?.isHod
        ? [
            {
              id: 'staff',
              label: 'Department Staff',
              icon: <span className="material-symbols-rounded">badge</span>,
            },
          ]
        : []),
    ];
  }, [isLabDoctor, allVerificationOrders?.length, allPendingOrders.length, allCompletedOrders.length, historyVisits?.length, user?.isHod]);


  // Derive active tab directly from URL path
  const activeTab = location.pathname.includes('/staff')
    ? 'staff'
    : location.pathname.includes('/verification')
    ? 'verification'
    : location.pathname.includes('/specimens')
    ? 'specimens'
    : location.pathname.includes('/reported')
    ? 'reported'
    : isLabDoctor ? 'verification' : 'processing';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/laboratory/${tabId}`);
  };

  const brandTitle = isLabDoctor
    ? `${config?.SHORT_NAME || 'HMS'} Pathology Cockpit`
    : `${config?.SHORT_NAME || 'HMS'} Phlebotomy Station`;

  const brandSubtitle = isLabDoctor
    ? `Clinical Pathology, Diagnostic Interpretation & Medical Authorization · ${departmentName}`
    : `Specimen Accessioning, Pre-Vitals & Analytical Intake · ${departmentName}`;

  return (
    <div className="lab-dashboard">
      {/* ─── Top App Bar with Tabs ─── */}
      <CommonHeader
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
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
            isLabDoctor,
            isLabNurse,
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
            stationFilter,
            setStationFilter,
            searchValue,
            setSearchValue,
            activeOriginFilter,
            setActiveOriginFilter,
            activeToken,
            callNextToken,
            handleRecordLabVitals,
            handleRecordPhlebotomyRisks,
            handleBroadcastPanicAlert,
            fetchPatientLabHistory,
            handleVerifyResults,
            handleDispatchVisit,
            fetchQueue,
            historyVisits,
            isHistoryLoading,
            fetchHistory,
            handleSelectVisit,

            handleCollectSample,
            handleSubmitResult,
            handleFileUpload,
            handleResultFieldChange,
            handleNotesChange,
            filteredQueue,
            allCompletedOrders,
            allPendingOrders,
            allVerificationOrders,
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
