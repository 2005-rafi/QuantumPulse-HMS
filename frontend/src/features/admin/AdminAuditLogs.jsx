import React, { useState, useEffect, useMemo } from 'react';
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
  { id: 'AUTH', label: 'Auth & Access', icon: 'lock' },
  { id: 'PATIENT', label: 'Patient Data', icon: 'personal_injury' },
  { id: 'STAFF', label: 'Staff & Governance', icon: 'badge' },
  { id: 'BILLING', label: 'Financial & Billing', icon: 'payments' },
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
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    fetchAuditLogs(auditPage, auditPageSize);
  }, [auditPage, auditPageSize]);

  const fetchAuditLogs = async (page, limit) => {
    setLoading(true);
    try {
      const res = await auditAPI.getLogs({ page, limit });
      const data = res.data?.data || {};
      setAuditLogs(data.items || []);
      setAuditTotalItems(data.totalItems || (data.items || []).length);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setAuditPageSize(newSize);
    setAuditPage(1);
  };

  // Client-side category and query filtering on the loaded batch for ultra-responsive feedback
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Category filter
      if (activeCategory !== 'ALL') {
        const act = (log.action || '').toUpperCase();
        if (activeCategory === 'AUTH' && !(act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH') || act.includes('TERMINAL') || act.includes('PASSWORD'))) {
          return false;
        }
        if (activeCategory === 'PATIENT' && !(act.includes('PATIENT') || act.includes('ADMISSION') || act.includes('DISCHARGE') || act.includes('CLINICAL') || act.includes('VITALS'))) {
          return false;
        }
        if (activeCategory === 'STAFF' && !(act.includes('STAFF') || act.includes('ROLE') || act.includes('PERMISSION') || act.includes('DEPT') || act.includes('HOD'))) {
          return false;
        }
        if (activeCategory === 'BILLING' && !(act.includes('BILL') || act.includes('PAYMENT') || act.includes('TARIFF') || act.includes('LEDGER') || act.includes('ADJUSTMENT'))) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const actorName = (log.actorId?.fullName || log.actorId?.username || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const targetId = (log.targetId || '').toLowerCase();
        const role = (log.actorRole || '').toLowerCase();
        const ip = (log.ipAddress || '').toLowerCase();
        return actorName.includes(q) || action.includes(q) || targetId.includes(q) || role.includes(q) || ip.includes(q);
      }

      return true;
    });
  }, [auditLogs, activeCategory, searchQuery]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* ── HEADER & SEARCH BAR ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
            <div>
              <h2 style={{ color: 'var(--md-sys-color-primary, #00668b)', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                System Audit Logs
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                Comprehensive security and clinical operational ledger
              </p>
            </div>

            <div style={{ maxWidth: '340px', flex: 1 }}>
              <Md3SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by action, actor, target or IP..."
              />
            </div>
          </div>

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

        {/* ── DOMAIN CATEGORY QUICK FILTERS ── */}
        <div className="md3-audit-chips-bar" role="tablist" aria-label="Audit Domain Filters">
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`md3-audit-chip-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="material-symbols-rounded">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TOP PAGINATION (with 100 items per page option) ── */}
        {auditTotalItems > 0 && (
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <Md3Pagination
              currentPage={auditPage}
              totalItems={auditTotalItems}
              pageSize={auditPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setAuditPage}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="audit events"
              position="top"
            />
          </div>
        )}

        {/* ── MAIN CONTENT AREA (CARDS OR LIST) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Loading audit ledger...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '24px 0', width: '100%' }}>
              <Md3EmptyState
                icon="history"
                title={searchQuery || activeCategory !== 'ALL' ? 'No matching audit events' : 'No audit events recorded'}
                description={
                  searchQuery || activeCategory !== 'ALL'
                    ? 'Try clearing the search query or selecting a different category filter.'
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
              {filteredLogs.map((log) => (
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
                auditLogs={filteredLogs}
                onInspect={(item) => setSelectedAuditLog(item)}
              />
            </div>
          )}

          {/* ── BOTTOM PAGINATION (with 100 items per page option) ── */}
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
            />
          )}
        </div>
      </section>

      {/* ── TOP-CENTER AUDIT PAYLOAD INSPECTION MODAL ── */}
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
