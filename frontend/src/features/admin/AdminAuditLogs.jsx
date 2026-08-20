import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/auditAPI';
import { Icon } from '../../components/md3/Md3Widgets';

const AdminAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState(null);

  useEffect(() => {
    fetchAuditLogs(auditPage);
  }, [auditPage]);

  const fetchAuditLogs = async (page) => {
    try {
      const res = await auditAPI.getLogs({ page, limit: 20 });
      setAuditLogs(res.data.data?.items || []);
      setAuditTotalPages(res.data.data?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--md-sys-color-primary)' }}>System Audit Logs</h2>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid" style={{ flex: 1, paddingBottom: '32px' }}>
            {auditLogs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)', gridColumn: '1 / -1', minHeight: '50vh' }}>
                <Icon.History style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)' }}>No audit logs found</h3>
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
        </div>
      </section>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', color: 'var(--md-sys-color-on-surface)' }}>
        <button 
          disabled={auditPage === 1} 
          onClick={() => setAuditPage(p => Math.max(1, p - 1))}
          style={{ padding: '8px 16px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', cursor: auditPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        <span>Page {auditPage} of {auditTotalPages}</span>
        <button 
          disabled={auditPage >= auditTotalPages} 
          onClick={() => setAuditPage(p => p + 1)}
          style={{ padding: '8px 16px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', cursor: auditPage >= auditTotalPages ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>

      {selectedAuditDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', padding: '20px', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
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
