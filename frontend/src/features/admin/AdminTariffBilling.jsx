import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import TariffManager from '../billing/tariff/TariffManager';
import BillsManager from '../billing/bills/BillsManager';
import FinancialAnalytics from '../billing/analytics/FinancialAnalytics';
import BillingTemplateEditor from '../billing/BillingTemplateEditor';
import { adminAPI } from '../../services/adminAPI';
import Md3TabSwitch from '../../components/md3/Md3TabSwitch';
import './AdminTariffBilling.css';

const TARIFF_TABS = [
  { id: 'rules', label: 'Tariff & Service Catalog', icon: 'price_change' },
  { id: 'bills', label: 'Patient Bills & Ledger', icon: 'receipt_long' },
  { id: 'analytics', label: 'Financial Analytics', icon: 'monitoring' },
  { id: 'template', label: 'Print Templates & Layout', icon: 'receipt' },
];

export const AdminTariffBilling = (props) => {
  const context = useOutletContext() || {};
  const departments = props.departments || context.departments || [];
  const billingSettings = props.billingSettings || context.billingSettings;
  const setBillingSettings = props.setBillingSettings || context.setBillingSettings;
  const showSuccess = props.showSuccess || context.showSuccess || console.log;
  const showError = props.showError || context.showError || console.error;

  const [activeSubTab, setActiveSubTab] = useState('rules');
  const [templateLoading, setTemplateLoading] = useState(false);

  const handleSaveBillingSettings = async (settings) => {
    setTemplateLoading(true);
    try {
      await adminAPI.updateSetting('billing_template', settings);
      showSuccess('Billing template settings saved successfully!');
      if (setBillingSettings) setBillingSettings(settings);
    } catch (err) {
      showError(err.response?.data?.message || 'Error saving settings');
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <div className="admin-tariff-billing">
      {/* Compact Top Header Card */}
      <div className="admin-tariff-header">
        <div className="admin-tariff-header__top-row">
          <div className="admin-tariff-header__title-group">
            <div className="admin-tariff-header__icon">
              <span className="material-symbols-rounded">payments</span>
            </div>
            <div>
              <h2 className="admin-tariff-header__title">Centralized Tariff &amp; Financial Governance</h2>
              <p className="admin-tariff-header__subtitle">
                Manage hospital pricing catalogs, authoritative tariff rules, clinical revenue flow, and official billing templates
              </p>
            </div>
          </div>
        </div>

        {/* Reusable Material Design 3 Tab Switcher */}
        <div className="admin-tariff-header__tabs-row">
          <Md3TabSwitch
            tabs={TARIFF_TABS}
            activeTab={activeSubTab}
            onChange={setActiveSubTab}
            size="medium"
          />
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="admin-tariff-content">
        {activeSubTab === 'rules' && (
          <TariffManager departments={departments} />
        )}

        {activeSubTab === 'bills' && (
          <BillsManager />
        )}

        {activeSubTab === 'analytics' && (
          <FinancialAnalytics />
        )}

        {activeSubTab === 'template' && (
          <BillingTemplateEditor
            initialSettings={billingSettings}
            onSave={handleSaveBillingSettings}
            loading={templateLoading}
          />
        )}
      </div>
    </div>
  );
};

export default AdminTariffBilling;
