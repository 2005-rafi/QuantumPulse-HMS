import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';

const CommandCenterDetailDialog = ({ isOpen, onClose, type }) => {
  const { showError } = useToast();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Date mode: 'all' | 'today' | 'custom'
  const [dateFilterMode, setDateFilterMode] = useState(type === 'completed_visits' ? 'all' : 'all');
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen && type) {
      fetchDetails();
    }
  }, [isOpen, type, dateFilterMode, startDate, endDate]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = {};

      if (dateFilterMode === 'today') {
        const today = getTodayISO();
        params.startDate = today;
        params.endDate = today;
      } else if (dateFilterMode === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      if (type === 'today_visits') {
        endpoint = '/visits/queue/ALL';
      } else if (type === 'completed_visits') {
        endpoint = '/visits/queue/COMPLETED';
      } else if (type === 'triage_queue') {
        endpoint = '/visits/queue/WAITING_TRIAGE,CALLED';
      } else if (type === 'doctor_queue') {
        endpoint = '/visits/queue/WAITING_DOCTOR,WAITING_DOCTOR_REVIEW';
      } else if (type === 'in_consultation') {
        endpoint = '/visits/queue/IN_PROGRESS';
      } else if (type === 'pending_lab') {
        endpoint = '/visits/queue/WAITING_LAB';
      } else if (type === 'pending_pharmacy') {
        endpoint = '/visits/queue/WAITING_PHARMACY';
      } else if (type === 'skipped') {
        endpoint = '/visits/queue/SKIPPED';
      }

      if (endpoint) {
        const res = await api.get(endpoint, { params });
        setDataList(res.data?.data || []);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Error fetching queue details');
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = (p) => {
    if (!p) return 'Unknown Patient';
    if (typeof p === 'string') return p;
    if (p.fullName && p.fullName.trim()) return p.fullName.trim();
    const combined = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    if (combined) return combined;
    if (p.name && p.name.trim()) return p.name.trim();
    return 'Unknown Patient';
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return dataList;
    const q = searchTerm.toLowerCase();
    return dataList.filter((v) => {
      const pName = getPatientName(v.patientId);
      const mrn = v.patientId?.mrn || '';
      const vNum = v.visitNumber || '';
      const token = v.tokenString || '';
      const dept = v.departmentId?.name || '';
      const doc = v.consultation?.doctorId?.fullName || '';
      const chiefComplaint = v.vitals?.chiefComplaint || v.reason || '';
      return (
        pName.toLowerCase().includes(q) ||
        mrn.toLowerCase().includes(q) ||
        vNum.toLowerCase().includes(q) ||
        token.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        doc.toLowerCase().includes(q) ||
        chiefComplaint.toLowerCase().includes(q)
      );
    });
  }, [dataList, searchTerm]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedQueue,
    showTopPagination,
  } = usePagination(filteredData, 50, [searchTerm, dateFilterMode, startDate, endDate, type]);

  if (!isOpen || !type) return null;

  const getDuration = (visit) => {
    const start = new Date(visit.createdAt);
    const end = visit.status === 'COMPLETED' && visit.billing?.billedAt 
      ? new Date(visit.billing.billedAt) 
      : new Date();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getTitle = () => {
    switch (type) {
      case 'today_visits':
        return 'Today’s Patient Registrations';
      case 'completed_visits':
        return 'Completed & Discharged Patient Visits';
      case 'triage_queue':
        return 'Triage Queue — Waiting for Vitals';
      case 'doctor_queue':
        return 'Doctor Queue — Waiting for Consultation';
      case 'in_consultation':
        return 'Active In-Consultation Visits';
      case 'pending_lab':
        return 'Diagnostic Lab Investigation Queue';
      case 'pending_pharmacy':
        return 'Pharmacy Dispensation Queue';
      case 'skipped':
        return 'Skipped / Unattended Queue Calls';
      default:
        return 'Hospital Queue Ledger';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'today_visits':
        return 'Comprehensive ledger of all patient encounters registered in the system';
      case 'completed_visits':
        return 'Historical and today’s record of patients whose clinical visits have been finalized';
      case 'triage_queue':
        return 'Live queue of walk-in & appointment patients awaiting nursing triage assessment';
      case 'doctor_queue':
        return 'Live queue of patients with triage vitals recorded, awaiting medical consultation';
      case 'in_consultation':
        return 'Patients currently inside doctor consultation rooms across all clinical departments';
      case 'pending_lab':
        return 'Patients with ordered diagnostic investigations awaiting specimen analysis';
      case 'pending_pharmacy':
        return 'Patients with finalized clinical prescriptions awaiting pharmacy checks & billing';
      case 'skipped':
        return 'Patients who missed their token call and require queue repositioning';
      default:
        return 'Live command center queue telemetry';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'WAITING_LAB':
        return { bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-on-error-container)' };
      case 'WAITING_PHARMACY':
      case 'IN_PROGRESS':
        return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
      case 'WAITING_DOCTOR':
      case 'WAITING_DOCTOR_REVIEW':
        return { bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)' };
      case 'WAITING_TRIAGE':
      case 'CALLED':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'SKIPPED':
      default:
        return { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        zIndex: 2000,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
          color: 'var(--md-sys-color-on-surface, #1c1b1f)',
          padding: '20px 24px',
          borderRadius: 'var(--md-sys-shape-corner-extra-large, 24px)',
          width: 'min(1560px, 96vw)',
          maxHeight: 'calc(100vh - 48px)',
          height: 'min(900px, calc(100vh - 48px))',
          overflow: 'hidden',
          border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{getTitle()}</h3>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 12px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', borderRadius: '999px' }}>
                {filteredData.length} records
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', display: 'block' }}>{getSubtitle()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchDetails}
              disabled={loading}
              title="Refresh Queue Data"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', color: 'var(--md-sys-color-primary)', cursor: loading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 700, transition: 'all 150ms ease' }}
            >
              <span className={`material-symbols-rounded ${loading ? 'spin-animation' : ''}`} style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </button>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-highest)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: 'var(--md-sys-color-surface-container)', padding: '10px 16px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', flexWrap: 'wrap' }}>
          
          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-on-surface-variant)' }}>search</span>
            <input 
              type="text" 
              placeholder="Search patient name, MRN, token, department, doctor, complaint..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface)', fontSize: '13px', outline: 'none' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', padding: 0 }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>clear</span>
              </button>
            )}
          </div>

          {/* Date Range Selector for visit ledgers */}
          {(type === 'today_visits' || type === 'completed_visits') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: 'var(--md-sys-color-surface-container-high)', borderRadius: '999px', padding: '2px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <button
                  onClick={() => setDateFilterMode('all')}
                  style={{ border: 'none', background: dateFilterMode === 'all' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'all' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  All Records
                </button>
                <button
                  onClick={() => setDateFilterMode('today')}
                  style={{ border: 'none', background: dateFilterMode === 'today' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'today' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  Today Only
                </button>
                <button
                  onClick={() => setDateFilterMode('custom')}
                  style={{ border: 'none', background: dateFilterMode === 'custom' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'custom' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  Custom Range
                </button>
              </div>

              {dateFilterMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', fontSize: '12px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>to</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="queue entries"
            position="top"
          />
        )}

        {/* Table Body Container */}
        <div className="md3-paginated-content-fade" key={page} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', scrollbarWidth: 'thin' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="md3-spinner md3-spinner--md" style={{ display: 'inline-block', marginBottom: '8px' }} />
              <div>Fetching real-time clinical queue records...</div>
            </div>
          ) : paginatedQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.4, marginBottom: '8px' }}>inbox</span>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>No patient records found in this queue.</div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                {searchTerm ? 'No results matched your search term.' : 'Patients entering this queue will automatically appear here in real-time.'}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Token / ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Patient & MRN</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Age / Gender</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Department</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Assigned Doctor</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Chief Complaint</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Registered</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Wait Duration</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((visit) => {
                  const badge = getStatusBadgeStyle(visit.status);
                  const p = visit.patientId || {};
                  const patientFullName = getPatientName(p);
                  const initials = patientFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT';
                  const token = visit.tokenString || visit.visitNumber;
                  const docName = visit.consultation?.doctorId?.fullName;
                  const complaint = visit.vitals?.chiefComplaint || visit.reason || 'General Consultation';

                  return (
                    <tr 
                      key={visit._id} 
                      style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', transition: 'background 120ms ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-lowest)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface)'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                          {token}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--md-sys-color-on-surface)', fontSize: '13px' }}>
                              {patientFullName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'monospace', marginTop: '1px' }}>
                              MRN: {p.mrn || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                          {p.age ? `${p.age} yrs` : '—'}
                        </span>{' '}
                        / <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{p.gender || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                          {visit.departmentId?.name || 'General OPD'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface)' }}>
                        {docName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>stethoscope</span>
                            <span>Dr. {docName}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }} title={complaint}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--md-sys-color-on-surface)' }}>
                          {complaint}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {new Date(visit.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>
                        {getDuration(visit)}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 12px', background: badge.bg, color: badge.fg, borderRadius: '999px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                          {visit.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalItems > 0 && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="queue entries"
            position="bottom"
          />
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--md-sys-color-outline-variant)', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 24px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 150ms ease' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default CommandCenterDetailDialog;
