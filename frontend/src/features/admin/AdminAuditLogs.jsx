import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/auditAPI';
import { Icon } from '../../components/md3/Md3Widgets';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import Md3Pagination from '../../components/md3/Md3Pagination';

const AdminAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotalItems, setAuditTotalItems] = useState(0);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const showTopPagination = auditTotalItems > 20;

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>System Audit Logs</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Comprehensive security and operational event ledger
            </p>
          </div>
        </div>

        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={auditPage}
            totalItems={auditTotalItems}
            pageSize={auditPageSize}
            onPageChange={setAuditPage}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="audit logs"
            position="top"
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid md3-paginated-content-fade" key={`${auditPage}-${auditPageSize}`} style={{ flex: 1, paddingBottom: '20px' }}>
            {auditLogs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', width: '100%' }}>
                <Md3EmptyState
                  icon="history"
                  title="No audit events recorded"
                  description="System activity and security events will appear here chronologically as actions are performed."
                  variant="card"
                />
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log._id} className="md3-data-card" style={{ gap: '8px' }}>
                  <div className="md3-data-card-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3 className="md3-data-card-title">{log.action}</h3>
                      <span className="md3-data-card-subtitle">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="md3-status-chip md3-card-btn-secondary">
                      {log.actorRole}
                    </span>
                  </div>
                  <div className="md3-data-card-body" style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><span style={{ fontWeight: '500', color: 'var(--md-sys-color-on-surface-variant)' }}>Actor:</span> {log.actorId?.fullName || log.actorId?.username || 'System'}</div>
                      <div><span style={{ fontWeight: '500', color: 'var(--md-sys-color-on-surface-variant)' }}>Target ID:</span> <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', padding: '2px 4px', borderRadius: '4px' }}>{log.targetId || '—'}</span></div>
                    </div>
                  </div>
                  <div className="md3-data-card-actions" style={{ paddingTop: '8px', marginTop: '8px' }}>
                    <button 
                      onClick={() => setSelectedAuditDetail(log.details)} 
                      className="md3-card-btn md3-card-btn-secondary"
                      style={{ height: '36px' }}
                    >
                      View Payload JSON
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Pagination */}
          {auditTotalItems > 0 && (
            <Md3Pagination
              currentPage={auditPage}
              totalItems={auditTotalItems}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="audit logs"
              position="bottom"
            />
          )}
        </div>
      </section>

      {selectedAuditDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', padding: '20px', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginTop: '20px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '10px', color: 'var(--md-sys-color-primary)' }}>Audit Event Payload</h3>
            <pre style={{ background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', padding: '15px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              {JSON.stringify(selectedAuditDetail, null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button 
                onClick={() => setSelectedAuditDetail(null)} 
                className="md3-card-btn md3-card-btn-primary"
                style={{ width: 'auto', padding: '8px 24px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
