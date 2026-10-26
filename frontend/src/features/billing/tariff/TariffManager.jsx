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
import { Md3BedComfortBadge } from '../../../components/md3/Md3BedComfortBadge';
import ipdApi from '../../../services/ipdApi';
import StaffTariffSalaryMatrix from './StaffTariffSalaryMatrix';
import './TariffManager.css';

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'All Services' },
  { id: 'BED_CHARGES', label: 'Bed & Ward Tariff' },
  { id: 'REGISTRATION', label: 'Registration' },
  { id: 'CONSULTATION', label: 'Consultation' },
  { id: 'STAFFING_TARIFF', label: 'Staffing & Salary Matrix' },
  { id: 'DIAGNOSTICS', label: 'Diagnostics' },
  { id: 'PROCEDURE', label: 'Procedures' },
  { id: 'PACKAGE', label: 'Health Packages' },
  { id: 'PHARMACY', label: 'Pharmacy Catalog' },
];

export const TariffManager = ({ departments = [] }) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('ALL');
  const [rules, setRules] = useState([]);
  const [services, setServices] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');

  // Fetch floors for bed tariff spatial scoping
  useEffect(() => {
    const loadFloors = async () => {
      try {
        const res = await ipdApi.getFloors();
        setFloors(res.data?.data || res.data || []);
      } catch (err) {
        console.warn('Failed to load floors for tariff scoping', err);
      }
    };
    loadFloors();
  }, []);

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
      if (activeTab !== 'ALL' && activeTab !== 'PHARMACY' && activeTab !== 'STAFFING_TARIFF') {
        params.category = activeTab;
      }
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (visitTypeFilter) params.visitType = visitTypeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

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
    if (activeTab !== 'PHARMACY' && activeTab !== 'STAFFING_TARIFF') {
      const timer = setTimeout(() => {
        fetchTariffs();
      }, searchQuery ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, statusFilter, deptFilter, visitTypeFilter, searchQuery]);

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
  } = usePagination(rules, 50, [activeTab, statusFilter, deptFilter, visitTypeFilter, searchQuery]);

  const isBedTab = activeTab === 'BED_CHARGES';
  const isPackageTab = activeTab === 'PACKAGE';

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

        {activeTab !== 'PHARMACY' && activeTab !== 'STAFFING_TARIFF' && (
          <Md3Button type="button" onClick={handleCreate} style={{ height: '36px', padding: '0 14px' }}>
            <Icon.Plus />
            <span>
              {activeTab === 'BED_CHARGES'
                ? 'Configure Bed Tariff'
                : activeTab === 'CONSULTATION'
                ? 'Configure Consultation Tariff'
                : activeTab === 'DIAGNOSTICS'
                ? 'Configure Diagnostic Tariff'
                : activeTab === 'REGISTRATION'
                ? 'Configure Registration Fee'
                : activeTab === 'PROCEDURE'
                ? 'Configure Procedure Fee'
                : activeTab === 'PACKAGE'
                ? 'Configure Health Package'
                : 'Create Tariff Rule'}
            </span>
          </Md3Button>
        )}
      </div>

      {activeTab === 'PHARMACY' ? (
        <MedicinePriceManager />
      ) : activeTab === 'STAFFING_TARIFF' ? (
        <StaffTariffSalaryMatrix
          onConfigureConsultation={() => handleCreate()}
          departments={departments}
        />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="tariff-filter-row">
            {/* Search Input */}
            <div className="tariff-search-wrapper">
              <span className="material-symbols-rounded tariff-search-icon">search</span>
              <input
                type="text"
                className="tariff-search-input"
                placeholder={isPackageTab ? "Search by Package Rule #, Name or Inclusions..." : "Search by Rule # (e.g. TR-PRC-01), Name or Code..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                  title="Clear search"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>close</span>
                </button>
              )}
            </div>

            <div className="tariff-filter-select-wrapper">
              <Md3Select
                id="tf-status"
                name="statusFilter"
                label="Status Filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'PUBLISHED', label: 'Published (Active)' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SUPERSEDED', label: 'Superseded (Archived)' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div className="tariff-filter-select-wrapper">
              <Md3Select
                id="tf-dept"
                name="deptFilter"
                label="Department Scope"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
            </div>

            <div className="tariff-filter-select-wrapper">
              <Md3Select
                id="tf-visitType"
                name="visitTypeFilter"
                label="Clinical Flow"
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Clinical Flows' },
                  { value: 'IPD', label: 'IPD (Inpatient Admission)' },
                  { value: 'OPD', label: 'OPD (Outpatient Visit)' },
                  { value: 'EMERGENCY', label: 'Emergency & Trauma' },
                  { value: 'SURGERY', label: 'Surgery / OT' },
                  { value: 'DAY_CARE', label: 'Day Care / Dialysis' },
                  { value: 'HEALTH_CHECKUP', label: 'Health Checkup / Wellness' },
                ]}
              />
            </div>

            <div className="tariff-filter-actions">
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
                  <th style={{ width: '90px' }}>Rule #</th>
                  <th>{isPackageTab ? 'Package Name' : 'Procedure / Tariff Name'}</th>
                  <th className="col-hide-mobile">{isPackageTab ? 'Department' : 'Department & Scope'}</th>
                  {isBedTab && <th className="col-hide-tablet">Comfort & Tier</th>}
                  <th>Rate ({CURRENCY_SYMBOL})</th>
                  {isPackageTab ? <th className="col-hide-tablet">Inclusions</th> : <th className="col-hide-tablet">Billing Unit</th>}
                  {isBedTab && <th className="col-hide-tablet">Hourly Rate</th>}
                  {isBedTab && <th className="col-hide-tablet">Min Advance</th>}
                  <th className="col-hide-tablet">Effective Date</th>
                  <th className="col-hide-mobile">Status</th>
                  <th style={{ textAlign: 'right', width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isBedTab ? 11 : (isPackageTab ? 8 : 8)} style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Loading authoritative tariff rules…
                    </td>
                  </tr>
                ) : paginatedRules.length === 0 ? (
                  <tr>
                    <td colSpan={isBedTab ? 11 : (isPackageTab ? 8 : 8)} style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      No tariff rules found for this criteria. Click "Create Tariff Rule" to configure one.
                    </td>
                  </tr>
                ) : (
                  paginatedRules.map((rule) => {
                    const scope = rule.scope || {};
                    const isBedRule = rule.category === 'BED_CHARGES';
                    const isPkgRule = rule.category === 'PACKAGE';

                    const ruleDisplayName = rule.name || (
                      isBedRule
                        ? (scope.wardClass ? `${scope.wardClass} Ward Bed Stay` : 'Bed & Ward Tariff')
                        : isPkgRule
                        ? 'Bundled Health Package'
                        : rule.serviceMasterId?.name || (rule.testCode ? `Lab Test: ${rule.testCode}` : `${rule.category} Tariff`)
                    );

                    const hourlyRate = scope.hourlyRate != null && scope.hourlyRate > 0
                      ? scope.hourlyRate
                      : (isBedRule ? Math.round(rule.amount / 24) : null);

                    const unitLabel = rule.unit
                      ? rule.unit.replace('PER_', 'Per ').replace('_', ' ')
                      : (isBedRule ? 'Per Day' : (isPkgRule ? 'Per Package' : 'Per Visit'));

                    return (
                      <tr key={rule._id} className="tariff-row table-row-tap-affordance" onClick={() => handleOpenDetail(rule)}>
                        {/* 1. Rule # Badge */}
                        <td>
                          <span className="tariff-rule-number-badge">
                            {rule.ruleNumber || '—'}
                          </span>
                        </td>

                        {/* 2. Package / Procedure / Tariff Name */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface)' }}>
                              {ruleDisplayName}
                            </span>
                            {/* Mobile inline metadata snippet */}
                            <div className="col-show-mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              <span className={`tariff-cat-pill tariff-cat-pill--${rule.category.toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                {rule.category === 'BED_CHARGES' ? 'Bed' : rule.category}
                              </span>
                              <span className={`tariff-status-badge tariff-status-badge--${rule.status.toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                {rule.status}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-outline)' }}>
                                {scope.departmentId?.name || (isBedRule ? (scope.wardClass || 'All Wards') : 'Global')}
                              </span>
                            </div>
                            {rule.description ? (
                              <span className="col-hide-mobile" style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.72rem', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rule.description}
                              </span>
                            ) : rule.serviceMasterId?.code || rule.testCode ? (
                              <span className="tariff-code-badge col-hide-mobile" style={{ width: 'fit-content' }}>
                                {rule.serviceMasterId?.code || rule.testCode}
                              </span>
                            ) : !isPackageTab && rule.inclusions ? (
                              <span className="col-hide-mobile" style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.72rem', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Inclusions: {rule.inclusions}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. Department & Category Scope (Hidden on Mobile) */}
                        <td className="col-hide-mobile">
                          {isPackageTab ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface)' }}>
                                {scope.departmentId?.name || 'General Medicine / All'}
                              </span>
                              {scope.departmentId?.code && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-outline)' }}>
                                  ({scope.departmentId.code})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span className={`tariff-cat-pill tariff-cat-pill--${rule.category.toLowerCase()}`}>
                                  {rule.category === 'BED_CHARGES' ? 'Bed' : rule.category}
                                </span>
                                {scope.visitType && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    background: scope.visitType === 'IPD' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                                    color: scope.visitType === 'IPD' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                                  }}>
                                    {scope.visitType}
                                  </span>
                                )}
                              </div>
                              <span style={{ color: 'var(--md-sys-color-outline)', fontSize: '0.71rem' }}>
                                {scope.departmentId?.name || (isBedRule ? (scope.wardClass || 'All Wards') : 'Hospital-wide')}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Comfort & Tier (Bed-only, Hidden on Tablet) */}
                        {isBedTab && (
                          <td className="col-hide-tablet">
                            {isBedRule ? (
                              <Md3BedComfortBadge
                                tier={scope.comfortTier || 'STANDARD'}
                                sharing={scope.sharingType}
                                size="small"
                              />
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>—</span>
                            )}
                          </td>
                        )}

                        {/* 4. Rate (₹) */}
                        <td style={{ fontWeight: 800, fontSize: '0.875rem', color: Number(rule.amount) === 0 ? '#15803d' : 'var(--md-sys-color-primary)', whiteSpace: 'nowrap' }}>
                          {Number(rule.amount) === 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(22, 101, 52, 0.1)',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: '1px solid rgba(22, 101, 52, 0.2)'
                            }}>
                              Free
                            </span>
                          ) : (
                            `${CURRENCY_SYMBOL}${Number(rule.amount).toLocaleString('en-IN')}`
                          )}
                        </td>

                        {/* 5. Inclusions (Package-tab) OR Billing Unit (General) (Hidden on Tablet) */}
                        {isPackageTab ? (
                          <td className="col-hide-tablet" style={{ maxWidth: '260px' }}>
                            <div className="tariff-inclusions-cell" title={rule.inclusions || 'No inclusions specified'}>
                              {rule.inclusions || '—'}
                            </div>
                          </td>
                        ) : (
                          <td className="col-hide-tablet" style={{ fontWeight: 500, fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                            {unitLabel}
                          </td>
                        )}

                        {/* Hourly Rate & Min Advance (Bed-only, Hidden on Tablet) */}
                        {isBedTab && (
                          <td className="col-hide-tablet" style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {hourlyRate != null ? `${CURRENCY_SYMBOL}${hourlyRate}/hr` : '—'}
                          </td>
                        )}
                        {isBedTab && (
                          <td className="col-hide-tablet" style={{ fontWeight: 600, fontSize: '0.8125rem', color: scope.minAdvanceDeposit > 0 ? '#b45309' : 'var(--md-sys-color-outline)' }}>
                            {scope.minAdvanceDeposit > 0 ? `${CURRENCY_SYMBOL}${scope.minAdvanceDeposit}` : 'None'}
                          </td>
                        )}

                        {/* 6. Effective Date (Hidden on Tablet) */}
                        <td className="col-hide-tablet" style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                          {rule.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().slice(0, 10) : '—'}
                        </td>

                        {/* 7. Status (Hidden on Mobile) */}
                        <td className="col-hide-mobile">
                          <span className={`tariff-status-badge tariff-status-badge--${rule.status.toLowerCase()}`}>
                            {rule.status}
                          </span>
                        </td>

                        {/* 8. Actions */}
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            {/* Desktop Full Actions */}
                            <div className="col-hide-tablet" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                  title="Deactivate / Cancel Rule"
                                >
                                  <span className="material-symbols-rounded">block</span>
                                </button>
                              )}
                            </div>
                            {/* Universal Detail Action / Tap Indicator */}
                            <button
                              type="button"
                              className="tariff-action-btn"
                              onClick={() => handleOpenDetail(rule)}
                              title="View Details & Actions"
                              aria-label="View Rule Details"
                            >
                              <span className="material-symbols-rounded">chevron_right</span>
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
        initialCategory={activeTab !== 'ALL' && activeTab !== 'PHARMACY' ? activeTab : 'CONSULTATION'}
        departments={departments}
        services={services}
        floors={floors}
      />

      {/* Detail View with onEdit */}
      <TariffRuleDetail
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        rule={selectedRule}
        onPublish={handlePublish}
        onCancelRule={handleCancelRule}
        onEdit={handleEdit}
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
