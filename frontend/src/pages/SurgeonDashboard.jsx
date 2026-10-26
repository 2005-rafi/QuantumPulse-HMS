/**
 * pages/SurgeonDashboard.jsx
 * Enterprise Material 3 Surgeon & Operating Theatre Dashboard Shell
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommonHeader from '../components/shell/CommonHeader';
import { Md3Tabs } from '../components/md3/Md3Widgets';
import OTScheduleBoard from '../features/ipd/OTScheduleBoard';

export const SurgeonDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('LIVE_BOARD'); // 'LIVE_BOARD' | 'REQUESTS' | 'HISTORY'
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const headerTabs = useMemo(
    () => [
      { id: 'LIVE_BOARD', label: 'Live OT Board', icon: 'table_chart' },
      {
        id: 'REQUESTS',
        label: 'Surgical Requests',
        icon: 'pending_actions',
        badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      },
      { id: 'HISTORY', label: 'Surgical History', icon: 'history' },
    ],
    [pendingRequestsCount]
  );

  return (
    <div className="surgeon-dashboard" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Bar with Navigation Tabs */}
      <CommonHeader
        brandTitle="CareOne Surgical & Operating Theatre Suite"
        brandSubtitle={user?.department || 'Department of Surgery'}
        centerSlot={
          <Md3Tabs
            tabs={headerTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        }
        tabs={headerTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Operating Theatre Board */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <OTScheduleBoard
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPendingRequestsCountChange={setPendingRequestsCount}
          hasTopNav={true}
        />
      </main>
    </div>
  );
};

export default SurgeonDashboard;
