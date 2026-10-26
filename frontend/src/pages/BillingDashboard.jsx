import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import CommonHeader from '../components/shell/CommonHeader';
import { Md3Tabs } from '../components/md3/Md3Widgets';
import { Md3ClinicalDrawer } from '../components/md3/Md3ClinicalDrawer';
import UnifiedBillingTerminal from '../features/billing/views/UnifiedBillingTerminal';
import BillHistoryViewer from '../features/billing/bills/BillHistoryViewer';
import FinancialAnalytics from '../features/billing/analytics/FinancialAnalytics';
import './BillingDashboard.css';

/**
 * BillingDashboard — Unified Workstation for Billing & Financial Management
 *
 * Navigation:
 *   - Reusable Topbar Md3Tabs injected directly into CommonHeader centerSlot
 *   - Clean, smooth animations during tab transitions
 *   - Fully responsive with Md3ClinicalDrawer on mobile/tablet viewports
 */
const BillingDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('terminal');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const billingTabs = [
    {
      id: 'terminal',
      label: 'Cashier Station',
      icon: <span className="material-symbols-rounded">point_of_sale</span>,
    },
    {
      id: 'history',
      label: 'Bill & Invoice History',
      icon: <span className="material-symbols-rounded">history_edu</span>,
    },
    {
      id: 'analytics',
      label: 'Revenue Analytics',
      icon: <span className="material-symbols-rounded">insights</span>,
    },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsDrawerOpen(false);
  };

  return (
    <div className="billing-page">
      {/* ─── TOP APP BAR WITH INTEGRATED REUSABLE TABS IN CENTER SLOT ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Billing Station`}
        brandSubtitle="Charges, Cashier & Financial Records"
        centerSlot={
          <Md3Tabs
            tabs={billingTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            className="billing-header-tabs"
          />
        }
        user={user}
        onLogout={handleLogout}
        onMenuClick={() => setIsDrawerOpen(true)}
      />

      {/* ─── MOBILE & TABLET CLINICAL DRAWER ─── */}
      <Md3ClinicalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Billing`}
        brandSubtitle="Financial Station"
        navItems={billingTabs}
        activeTab={activeTab}
        onNavigate={handleTabChange}
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE WITH SMOOTH ANIMATED TAB TRANSITIONS ─── */}
      <main className="billing-main">
        <div key={activeTab} className="billing-tab-panel">
          {activeTab === 'terminal' && (
            <UnifiedBillingTerminal />
          )}

          {activeTab === 'history' && (
            <BillHistoryViewer
              areaFilter="billing"
              title="Billing Station Invoices &amp; Receipts"
              subtitle="Search, audit, and reprint historical bills across surgical, ward, and outpatient care"
            />
          )}

          {activeTab === 'analytics' && (
            <FinancialAnalytics />
          )}
        </div>
      </main>
    </div>
  );
};

export default BillingDashboard;
