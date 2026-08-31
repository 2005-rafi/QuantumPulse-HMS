/**
 * pages/WardOperationsDashboard.jsx
 * Master Layout & Navigation Shell for Ward Operations (Bed & Facility Manager) Role.
 *
 * Positions supported:
 *   - Head of Department (HOD) [Rank 5]
 *   - Operations Manager [Rank 4]
 *   - Senior Ward Executive [Rank 3]
 *   - Junior Ward Executive [Rank 2]
 *   - Housekeeping [Rank 1]
 *
 * SOLID:
 *   SRP — Shell component managing top app bar and tab navigation.
 *   OCP — Extended via child routes (/bed-map, /time-monitoring, /facility-builder, /transfers).
 *   DIP — Consumes AuthContext, ConfigContext abstractions.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { Md3Tabs } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import Md3ClinicalDrawer from '../components/md3/Md3ClinicalDrawer';
import './WardOperationsDashboard.css';

const WardOperationsDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isHousekeeping = user?.position === 'Housekeeping';

  const tabs = [
    {
      id: 'bed-map',
      label: 'Spatial Bed Map',
      icon: <span className="material-symbols-rounded">bed</span>,
    },
    {
      id: 'time-monitoring',
      label: 'Time & Turnaround',
      icon: <span className="material-symbols-rounded">timer</span>,
    },
    ...(!isHousekeeping
      ? [
          {
            id: 'facility-builder',
            label: 'Facility Builder',
            icon: <span className="material-symbols-rounded">domain</span>,
          },
          {
            id: 'transfers',
            label: 'Transfer Ledger',
            icon: <span className="material-symbols-rounded">sync_alt</span>,
          },
        ]
      : []),
  ];

  // Derive active tab directly from URL path
  const activeTab = location.pathname.includes('/time-monitoring')
    ? 'time-monitoring'
    : location.pathname.includes('/facility-builder')
    ? 'facility-builder'
    : location.pathname.includes('/transfers')
    ? 'transfers'
    : 'bed-map';

  const handleTabChange = (tabId) => {
    navigate(`/dashboard/ward-operations/${tabId}`);
  };

  return (
    <div className="ward-ops-page">
      {/* ─── TOP APP BAR WITH TABS IN CENTER SLOT & DRAWER TRIGGER ─── */}
      <CommonHeader
        brandTitle={config?.SHORT_NAME || 'HMS'}
        brandSubtitle="Ward Operations &amp; Facility Management"
        centerSlot={
          <Md3Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            className="ward-ops-header-tabs"
          />
        }
        user={user}
        onLogout={handleLogout}
        onMenuClick={() => setIsDrawerOpen(true)}
      />

      {/* ─── MAIN CONTENT OUTLET ─── */}
      <main className="ward-ops-main">
        <Outlet />
      </main>

      {/* ─── CLINICAL DRAWER NAVIGATION FOR MOBILE/RESPONSIVE ─── */}
      <Md3ClinicalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeSection={activeTab}
        onSelectSection={(secId) => {
          handleTabChange(secId);
          setIsDrawerOpen(false);
        }}
        sections={[
          {
            title: 'Ward Operations Workstation',
            items: tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
          },
        ]}
      />
    </div>
  );
};

export default WardOperationsDashboard;
