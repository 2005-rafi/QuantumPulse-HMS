import React, { useState, useEffect } from 'react';
import { Md3Button, Md3Select } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import Md3ConfirmDialog from '../../../components/md3/Md3ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { tariffAPI } from '../../../services/tariffAPI';
import TariffRuleForm from './TariffRuleForm';
import TariffRuleDetail from './TariffRuleDetail';
import MedicinePriceManager from './MedicinePriceManager';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import Md3Pagination from '../../../components/md3/Md3Pagination';
import usePagination from '../../../hooks/usePagination';
import Md3TabSwitch from '../../../components/md3/Md3TabSwitch';
import './TariffManager.css';

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'All Services' },
  { id: 'REGISTRATION', label: 'Registration' },
  { id: 'CONSULTATION', label: 'Consultation' },
  { id: 'DIAGNOSTICS', label: 'Diagnostics' },
  { id: 'PROCEDURE', label: 'Procedures' },
  { id: 'PHARMACY', label: 'Pharmacy Catalog' },
];

export const TariffManager = ({ departments = [] }) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('ALL');
  const [rules, setRules] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    icon: 'info',
    onConfirm: null,
  });

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'ALL' && activeTab !== 'PHARMACY') {
        params.category = activeTab;
      }
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.departmentId = deptFilter;

      const [rulesRes, servicesRes] = await Promise.allSettled([
        tariffAPI.listRules(params),
        tariffAPI.listServices(),
      ]);

      if (rulesRes.status === 'fulfilled') {
        setRules(rulesRes.value.data?.data?.items || rulesRes.value.data?.items || []);
      }
      if (servicesRes.status === 'fulfilled') {
        setServices(servicesRes.value.data?.data || servicesRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load tariffs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'PHARMACY') {
      fetchTariffs();
    }
  }, [activeTab, statusFilter, deptFilter]);

  const handlePublish = (rule) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Publish Tariff Rule?',
      message: `Are you sure you want to publish the tariff rule for "${rule.serviceName || rule.name || 'this service'}"? It will immediately apply to active OPD registrations and visits.`,
      variant: 'success',
      confirmLabel: 'Publish Rule',
      cancelLabel: 'Cancel',
      icon: 'publish',
      onConfirm: async () => {
        try {
          await tariffAPI.publishRule(rule._id, { reason: 'Published from Tariff Manager' });
          showSuccess('Tariff Published', 'The tariff rule is now active and published.');
          fetchTariffs();
          if (detailOpen) setDetailOpen(false);
        } catch (err) {
          showError('Publish Failed', err.response?.data?.message || err.message || 'Failed to publish rule');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCancelRule = (rule) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Tariff Rule?',
      message: `Are you sure you want to cancel and deactivate "${rule.serviceName || rule.name || 'this rule'}"? This rule will be retired and no longer used in billing calculations.`,
      variant: 'danger',
      confirmLabel: 'Deactivate Rule',
      cancelLabel: 'Keep Active',
      icon: 'block',
      onConfirm: async () => {
        try {
          await tariffAPI.cancelRule(rule._id, { reason: 'Cancelled by admin' });
          showSuccess('Tariff Deactivated', 'The tariff rule has been successfully cancelled and deactivated.');
          fetchTariffs();
          if (detailOpen) setDetailOpen(false);
        } catch (err) {
          showError('Deactivation Failed', err.response?.data?.message || err.message || 'Failed to cancel rule');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleOpenDetail = (rule) => {
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedRules,
    showTopPagination,
  } = usePagination(rules, 50, [activeTab, statusFilter, deptFilter]);

  return (
    <div className="tariff-manager">
      {/* Category Pills Bar */}
      <div className="tariff-chips-bar">
        <Md3TabSwitch
          tabs={CATEGORY_CHIPS}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="small"
        />

        {activeTab !== 'PHARMACY' && (
          <Md3Button type="button" onClick={handleCreate} style={{ height: '36px', padding: '0 14px' }}>
            <Icon.Plus />
            <span>Create Tariff Rule</span>
          </Md3Button>
        )}
      </div>

      {activeTab === 'PHARMACY' ? (
        <MedicinePriceManager />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="tariff-filter-row">
            <div style={{ width: '220px' }}>
              <Md3Select
                id="tf-status"
                name="statusFilter"
                label="Status Filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses (Active/Draft)' },
                  { value: 'PUBLISHED', label: 'Published (Active)' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div style={{ width: '280px' }}>
              <Md3Select
                id="tf-dept"
                name="deptFilter"
                label="Department Scope"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Departments (Hospital-wide)' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="tariff-refresh-btn"
                onClick={fetchTariffs}
                aria-label="Refresh tariffs"
                title="Refresh Tariff Rules"
              >
                <Icon.Refresh />
              </button>
            </div>
          </div>

          {/* Top Pagination (rendered when total records exceed 20) */}
          {showTopPagination && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="tariff rules"
              position="top"
            />
          )}

          {/* Rules Table */}
          <div className="tariff-table-container md3-paginated-content-fade" key={page}>
            <table className="tariff-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Service / Code</th>
                  <th>Scope & Applicability</th>
                  <th>Rate</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Effective From</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Loading authoritative tariff rules…
                    </td>
                  </tr>
                ) : paginatedRules.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      No tariff rules found for this criteria. Click "Create Tariff Rule" to configure one.
                    </td>
                  </tr>
                ) : (
                  paginatedRules.map((rule) => {
                    const scope = rule.scope || {};
                    const scopeSummary = [
                      scope.departmentId?.name || (scope.departmentId ? 'Dept' : null),
                      scope.tariffGrade || null,
                      scope.visitType || null,
                      scope.appointmentType || null,
                    ].filter(Boolean).join(' · ') || 'Global (All Scopes)';

                    return (
                      <tr key={rule._id} className="tariff-row" onClick={() => handleOpenDetail(rule)}>
                        <td>
                          <span className={`tariff-cat-pill tariff-cat-pill--${rule.category.toLowerCase()}`}>
                            {rule.category}
                          </span>
                        </td>
                        <td>
                          <strong>{rule.serviceMasterId?.name || (rule.testCode ? `Lab Test: ${rule.testCode}` : 'General Category')}</strong>
                          {rule.serviceMasterId?.code && (
                            <span className="tariff-code-badge">{rule.serviceMasterId.code}</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8125rem' }}>
                          {scopeSummary}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--md-sys-color-primary)' }}>
                          {CURRENCY_SYMBOL}{rule.amount}
                        </td>
                        <td>{rule.unit?.replace('PER_', 'Per ').toLowerCase()}</td>
                        <td>
                          <span className={`tariff-status-badge tariff-status-badge--${rule.status.toLowerCase()}`}>
                            {rule.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-outline)' }}>
                          {new Date(rule.effectiveFrom).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {rule.status === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  className="tariff-action-btn tariff-action-btn--edit"
                                  onClick={() => handleEdit(rule)}
                                  title="Edit Draft Rule"
                                >
                                  <span className="material-symbols-rounded">edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="tariff-action-btn tariff-action-btn--publish"
                                  onClick={() => handlePublish(rule)}
                                  title="Publish Rule"
                                >
                                  <span className="material-symbols-rounded">publish</span>
                                </button>
                              </>
                            )}
                            {rule.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                className="tariff-action-btn tariff-action-btn--cancel"
                                onClick={() => handleCancelRule(rule)}
                                title="Cancel Rule"
                              >
                                <span className="material-symbols-rounded">block</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="tariff-action-btn"
                              onClick={() => handleOpenDetail(rule)}
                              title="View Details & Audit Trail"
                            >
                              <span className="material-symbols-rounded">info</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="tariff rules"
              position="bottom"
            />
          )}
        </>
      )}

      {/* Form Drawer / Modal */}
      <TariffRuleForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchTariffs}
        rule={editingRule}
        departments={departments}
        services={services}
      />

      {/* Detail View */}
      <TariffRuleDetail
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        rule={selectedRule}
        onPublish={handlePublish}
        onCancelRule={handleCancelRule}
      />

      {/* Confirmation Dialog */}
      <Md3ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default TariffManager;
