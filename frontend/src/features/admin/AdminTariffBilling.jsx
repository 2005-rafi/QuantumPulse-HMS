import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import TariffManager from '../billing/tariff/TariffManager';
import BillsManager from '../billing/bills/BillsManager';
import FinancialAnalytics from '../billing/analytics/FinancialAnalytics';
import BillingTemplateEditor from '../billing/BillingTemplateEditor';
import BillingQueueView from '../billing/views/BillingQueueView';
import BillingChargesView from '../billing/views/BillingChargesView';
import BillingPaymentsView from '../billing/views/BillingPaymentsView';
import IpdLedgerView from '../ipd/IpdLedgerView';
import { adminAPI } from '../../services/adminAPI';
import Md3TabSwitch from '../../components/md3/Md3TabSwitch';
import './AdminTariffBilling.css';

const TARIFF_TABS = [
  { id: 'queue', label: 'Live Queue & Cashier', icon: 'point_of_sale' },
  { id: 'ipd_ledger', label: 'Inpatient (IPD) Ledger', icon: 'hotel' },
  { id: 'bills', label: 'Invoices & History', icon: 'receipt_long' },
  { id: 'rules', label: 'Tariff & Service Catalog', icon: 'price_change' },
  { id: 'analytics', label: 'Revenue Analytics', icon: 'monitoring' },
  { id: 'template', label: 'Print Templates', icon: 'receipt' },
];

export const AdminTariffBilling = (props) => {
  const context = useOutletContext() || {};
  const departments = props.departments || context.departments || [];
  const billingSettings = props.billingSettings || context.billingSettings;
  const setBillingSettings = props.setBillingSettings || context.setBillingSettings;
  const showSuccess = props.showSuccess || context.showSuccess || console.log;
  const showError = props.showError || context.showError || console.error;

  const [activeSubTab, setActiveSubTab] = useState('queue');
  const [templateLoading, setTemplateLoading] = useState(false);

  // Queue sub-flow states
  const [queueSubView, setQueueSubView] = useState('list'); // 'list' | 'charges' | 'payments'
  const [selectedBillForCharges, setSelectedBillForCharges] = useState(null);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

  const handleSelectVisitForBilling = (visit, bill) => {
    setSelectedBillForCharges(bill);
    setQueueSubView('charges');
  };

  const handleProceedToPayment = (bill) => {
    setSelectedBillForPayment(bill);
    setQueueSubView('payments');
  };

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
              <h2 className="admin-tariff-header__title">Hospital Financial &amp; Billing Command</h2>
            </div>
          </div>
        </div>

        {/* Reusable Material Design 3 Tab Switcher */}
        <div className="admin-tariff-header__tabs-row">
          <Md3TabSwitch
            tabs={TARIFF_TABS}
            activeTab={activeSubTab}
            onChange={(tabId) => {
              setActiveSubTab(tabId);
              if (tabId === 'queue') {
                setQueueSubView('list');
              }
            }}
            size="medium"
          />
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="admin-tariff-content">
        {/* Tab 1: Live Queue & Cashier */}
        {activeSubTab === 'queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {queueSubView !== 'list' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setQueueSubView('list')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    background: 'var(--md-sys-color-surface-container-high)',
                    color: 'var(--md-sys-color-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_back</span>
                  Back to Queue
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {queueSubView === 'charges' ? 'Charge Capture in progress' : 'Cashier Payment processing'}
                </span>
              </div>
            )}

            {queueSubView === 'list' && (
              <BillingQueueView onSelectVisitForBilling={handleSelectVisitForBilling} />
            )}

            {queueSubView === 'charges' && (
              <BillingChargesView
                selectedBill={selectedBillForCharges}
                onProceedToPayment={handleProceedToPayment}
              />
            )}

            {queueSubView === 'payments' && (
              <BillingPaymentsView
                selectedBill={selectedBillForPayment}
                onPaymentComplete={() => {
                  setQueueSubView('list');
                  showSuccess('Payment settled successfully!');
                }}
              />
            )}
          </div>
        )}

        {/* Tab 2: Inpatient IPD Ledger */}
        {activeSubTab === 'ipd_ledger' && (
          <IpdLedgerView embedded={true} />
        )}

        {/* Tab 3: Invoices & History */}
        {activeSubTab === 'bills' && (
          <BillsManager />
        )}

        {/* Tab 4: Tariff & Catalog Rules */}
        {activeSubTab === 'rules' && (
          <TariffManager departments={departments} />
        )}

        {/* Tab 5: Revenue Analytics */}
        {activeSubTab === 'analytics' && (
          <FinancialAnalytics />
        )}

        {/* Tab 6: Print Templates */}
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
