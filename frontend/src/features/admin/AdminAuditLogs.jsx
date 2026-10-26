import React, { useState, useEffect, useCallback } from 'react';
import { auditAPI } from '../../services/auditAPI';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import Md3Pagination from '../../components/md3/Md3Pagination';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { useAuditLayoutPreference } from '../../hooks/useAuditLayoutPreference';
import AuditCard from '../../components/audit/AuditCard';
import AuditListView from '../../components/audit/AuditListView';
import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import './AdminAuditLogs.css';

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'All Audits', icon: 'list_alt' },
  { id: 'CLINICAL', label: 'Clinical & Triage', icon: 'stethoscope' },
  { id: 'AUTH', label: 'Auth & Access', icon: 'lock' },
  { id: 'ADMINISTRATIVE', label: 'Admin & Staff', icon: 'badge' },
  { id: 'FINANCIAL', label: 'Billing & Ledger', icon: 'payments' },
  { id: 'SECURITY', label: 'Security & Access', icon: 'shield' },
  { id: 'SYSTEM', label: 'Engine & System', icon: 'dns' },
];

const SEVERITY_FILTERS = [
  { id: 'ALL', label: 'All Severities' },
  { id: 'INFO', label: 'Info' },
  { id: 'WARNING', label: 'Warning' },
  { id: 'CRITICAL', label: 'Critical' },
];

const DATE_RANGE_OPTIONS = [
  { id: 'ALL', label: 'All Time' },
  { id: '24H', label: 'Last 24 Hours' },
  { id: '7D', label: 'Last 7 Days' },
  { id: '30D', label: 'Last 30 Days' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const AdminAuditLogs = () => {
  const { layout, setLayout, isCardView, isListView } = useAuditLayoutPreference();
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotalItems, setAuditTotalItems] = useState(0);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeSeverity, setActiveSeverity] = useState('ALL');
  const [activeDateRange, setActiveDateRange] = useState('ALL');

  // Enterprise Ingestion Metrics
  const [metrics, setMetrics] = useState({
    inMemoryBufferLength: 0,
    maxCapacity: 20000,
    isFlushing: false,
    total24h: 0,
    velocityPerMinute: 0,
    categoryBreakdown: {},
    severityBreakdown: {},
  });

  // Cryptographic Ledger Verification State
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // CSV Export State
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  // Debounce search query changes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setAuditPage(1);
  }, [activeCategory, activeSeverity, activeDateRange, debouncedSearch]);

  // Fetch metrics every 15s
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await auditAPI.getMetrics();
      const data = res.data?.data || res.data;
      if (data) {
        setMetrics(data);
      }
    } catch (err) {
      console.warn('[AdminAuditLogs] Could not fetch audit metrics:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Fetch audit logs when parameters change
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: auditPage,
        limit: auditPageSize,
      };

      if (activeCategory && activeCategory !== 'ALL') {
        params.category = activeCategory;
      }
      if (activeSeverity && activeSeverity !== 'ALL') {
        params.severity = activeSeverity;
      }
      if (debouncedSearch) {
        params.q = debouncedSearch;
      }

      if (activeDateRange === '24H') {
        params.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      } else if (activeDateRange === '7D') {
        params.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (activeDateRange === '30D') {
        params.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await auditAPI.getLogs(params);
      const data = res.data?.data || res.data || {};
      const items = data.items || [];
      const total = data.total ?? data.totalItems ?? data.totalCount ?? items.length;

      setAuditLogs(items);
      setAuditTotalItems(total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setAuditLogs([]);
      setAuditTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [auditPage, auditPageSize, activeCategory, activeSeverity, activeDateRange, debouncedSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle Verify Integrity
  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    setVerificationResult(null);
    try {
      const res = await auditAPI.verifyIntegrity(1000);
      const data = res.data?.data || res.data;
      setVerificationResult(data);
    } catch (err) {
      setVerificationResult({
        verified: false,
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setVerifyingChain(false);
    }
  };

  // Handle Export CSV
  const handleExportCsv = async () => {
    setExportingCsv(true);
    setExportNotice(null);
    try {
      const params = {};
      if (activeCategory !== 'ALL') params.category = activeCategory;
      if (activeSeverity !== 'ALL') params.severity = activeSeverity;
      if (debouncedSearch) params.q = debouncedSearch;

      const result = await auditAPI.exportLogs(params);
      setExportNotice(`Exported ${result.filename} (${Math.round(result.size / 1024)} KB) successfully.`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      setExportNotice(`Export failed: ${err.message}`);
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setExportingCsv(false);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setAuditPageSize(newSize);
    setAuditPage(1);
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setAuditPage(1);
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* ── METRICS RIBBON (ENTERPRISE HIGH-SPEED ENGINE) ── */}
        <div className="md3-audit-metrics-ribbon" role="region" aria-label="Audit Engine Performance Metrics">
          {/* Card 1: Velocity */}
          <div className="md3-audit-metric-card">
            <div className="md3-audit-metric-icon" style={{ background: '#dcfce7', color: '#166534' }}>
              <span className="material-symbols-rounded">speed</span>
            </div>
            <div className="md3-audit-metric-info">
              <div className="md3-audit-metric-value">
                <span className="md3-audit-pulse-dot" title="Micro-batch Engine Active" />
                {metrics.velocityPerMinute || 0}
                <span style={{ fontSize: '0.70rem', fontWeight: 500, color: '#4b5563', marginLeft: '4px' }}>ev/min</span>
              </div>
              <div className="md3-audit-metric-label">Ingestion Velocity</div>
            </div>
          </div>

          {/* Card 2: 24h Ledger Volume */}
          <div className="md3-audit-metric-card">
            <div className="md3-audit-metric-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <span className="material-symbols-rounded">timeline</span>
            </div>
            <div className="md3-audit-metric-info">
              <div className="md3-audit-metric-value">
                {Number(metrics.total24h || 0).toLocaleString()}
              </div>
              <div className="md3-audit-metric-label">Last 24h Volume</div>
            </div>
          </div>

          {/* Card 3: In-Memory Ring Buffer Status */}
          <div className="md3-audit-metric-card">
            <div className="md3-audit-metric-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
              <span className="material-symbols-rounded">buffer</span>
            </div>
            <div className="md3-audit-metric-info">
              <div className="md3-audit-metric-value">
                {metrics.inMemoryBufferLength || 0}
                <span style={{ fontSize: '0.70rem', fontWeight: 500, color: '#6b7280', marginLeft: '4px' }}>
                  / {metrics.maxCapacity || 20000}
                </span>
              </div>
              <div className="md3-audit-metric-label">In-Flight Buffer</div>
            </div>
          </div>

          {/* Card 4: Critical Alerts */}
          <div className="md3-audit-metric-card">
            <div
              className="md3-audit-metric-icon"
              style={{
                background: (metrics.severityBreakdown?.CRITICAL || 0) > 0 ? '#fee2e2' : '#f1f5f9',
                color: (metrics.severityBreakdown?.CRITICAL || 0) > 0 ? '#b91c1c' : '#475569',
              }}
            >
              <span className="material-symbols-rounded">warning</span>
            </div>
            <div className="md3-audit-metric-info">
              <div className="md3-audit-metric-value">
                {metrics.severityBreakdown?.CRITICAL || 0}
              </div>
              <div className="md3-audit-metric-label">Critical Security Alerts</div>
            </div>
          </div>
        </div>

        {/* ── INTEGRITY VERIFICATION BANNER (FEEDBACK) ── */}
        {verificationResult && (
          <div
            className={`md3-audit-integrity-banner ${verificationResult.verified ? 'is-valid' : 'is-invalid'}`}
            role="status"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                {verificationResult.verified ? 'verified_user' : 'gpp_bad'}
              </span>
              <div>
                <strong>
                  {verificationResult.verified
                    ? 'Cryptographic Chain Integrity Verified'
                    : 'Tamper Detection Alert!'}
                </strong>
                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                  {verificationResult.verified
                    ? `Successfully verified ${verificationResult.verifiedCount || 0} cryptographic blocks. Zero tampering detected across SHA-256 chain-of-custody.`
                    : `Chain broke at block #${verificationResult.brokenIndex}: ${verificationResult.reason || verificationResult.error}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label="Dismiss banner"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        )}

        {/* Export Notification */}
        {exportNotice && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.80rem',
              fontWeight: 600,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>download_done</span>
              <span>{exportNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#15803d' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>close</span>
            </button>
          </div>
        )}

        {/* ── HEADER & SEARCH BAR ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
            <div>
              <h2 style={{ color: 'var(--md-sys-color-primary, #00668b)', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                System Audit Studio
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                Immutable, cryptographic SHA-256 clinical and administrative ledger
              </p>
            </div>

            <div style={{ maxWidth: '340px', flex: 1, minWidth: '220px' }}>
              <Md3SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search action, actor, target or IP..."
              />
            </div>
          </div>

          {/* Action Tools: Verify Integrity, Export CSV, and Card/List switcher */}
          <div className="md3-audit-toolbar-actions">
            <button
              type="button"
              className="md3-audit-btn-tonal"
              onClick={handleVerifyChain}
              disabled={verifyingChain}
              title="Verify cryptographic SHA-256 block chain integrity against DB records"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#0284c7' }}>
                {verifyingChain ? 'progress_activity' : 'verified_user'}
              </span>
              <span>{verifyingChain ? 'Verifying...' : 'Verify Hash Chain'}</span>
            </button>

            <button
              type="button"
              className="md3-audit-btn-tonal"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              title="Export filtered audit logs as standardized CSV"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#059669' }}>
                {exportingCsv ? 'progress_activity' : 'file_download'}
              </span>
              <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {/* View Mode Switcher: Cards vs List */}
            <div className="md3-view-toggle-group" role="group" aria-label="Audit logs layout view mode">
              <button
                type="button"
                className={`md3-view-toggle-btn ${isCardView ? 'active' : ''}`}
                onClick={() => setLayout('cards')}
                title="Card Grid View"
                aria-pressed={isCardView}
              >
                <span className="material-symbols-rounded">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`md3-view-toggle-btn ${isListView ? 'active' : ''}`}
                onClick={() => setLayout('list')}
                title="Tabular List View"
                aria-pressed={isListView}
              >
                <span className="material-symbols-rounded">view_list</span>
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── FILTER CONTROLS: CATEGORY CHIPS & SECONDARY DROPDOWNS ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          {/* Domain Category Quick Filters */}
          <div className="md3-audit-chips-bar" role="tablist" aria-label="Audit Domain Filters" style={{ marginBottom: 0 }}>
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`md3-audit-chip-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleCategoryChange(cat.id)}
                  role="tab"
                  aria-selected={isActive}
                >
                  <span className="material-symbols-rounded">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Filters: Severity & Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Severity Filter */}
            <select
              value={activeSeverity}
              onChange={(e) => setActiveSeverity(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                color: 'var(--md-sys-color-on-surface, #1d1b20)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              aria-label="Filter by severity"
            >
              {SEVERITY_FILTERS.map((sev) => (
                <option key={sev.id} value={sev.id}>
                  {sev.label}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={activeDateRange}
              onChange={(e) => setActiveDateRange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                color: 'var(--md-sys-color-on-surface, #1d1b20)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              aria-label="Filter by date range"
            >
              {DATE_RANGE_OPTIONS.map((rng) => (
                <option key={rng.id} value={rng.id}>
                  {rng.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── TOP PAGINATION ── */}
        {auditTotalItems > 0 && (
          <div style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Md3Pagination
              currentPage={auditPage}
              totalItems={auditTotalItems}
              pageSize={auditPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setAuditPage}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="audit events"
              position="top"
              disabled={loading}
            />
          </div>
        )}

        {/* ── MAIN CONTENT AREA (CARDS OR LIST) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="md3-spinner" style={{ display: 'inline-block', marginBottom: '8px' }} />
              <div>Synchronizing cryptographic audit ledger...</div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ padding: '24px 0', width: '100%' }}>
              <Md3EmptyState
                icon="history"
                title={searchQuery || activeCategory !== 'ALL' || activeSeverity !== 'ALL' ? 'No matching audit events' : 'No audit events recorded'}
                description={
                  searchQuery || activeCategory !== 'ALL' || activeSeverity !== 'ALL'
                    ? 'Try clearing the search query or adjusting your filters.'
                    : 'System activity and security events will appear here chronologically as actions are performed.'
                }
                variant="card"
              />
            </div>
          ) : isCardView ? (
            <div
              className="audit-card-grid md3-paginated-content-fade"
              key={`cards-${auditPage}-${auditPageSize}`}
              style={{ flex: 1, paddingBottom: '20px' }}
            >
              {auditLogs.map((log) => (
                <AuditCard
                  key={log._id}
                  log={log}
                  onInspect={(item) => setSelectedAuditLog(item)}
                />
              ))}
            </div>
          ) : (
            <div
              className="md3-paginated-content-fade"
              key={`list-${auditPage}-${auditPageSize}`}
              style={{ flex: 1, paddingBottom: '20px' }}
            >
              <AuditListView
                auditLogs={auditLogs}
                onInspect={(item) => setSelectedAuditLog(item)}
              />
            </div>
          )}

          {/* ── BOTTOM PAGINATION ── */}
          {auditTotalItems > 0 && (
            <Md3Pagination
              currentPage={auditPage}
              totalItems={auditTotalItems}
              pageSize={auditPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setAuditPage}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="audit events"
              position="bottom"
              disabled={loading}
            />
          )}
        </div>
      </section>

      {/* ── TOP-CENTER AUDIT PAYLOAD & CRYPTOGRAPHIC BLOCK INSPECTOR ── */}
      {selectedAuditLog && (
        <AuditDetailDialog
          log={selectedAuditLog}
          isOpen={!!selectedAuditLog}
          onClose={() => setSelectedAuditLog(null)}
        />
      )}
    </div>
  );
};

export default AdminAuditLogs;
