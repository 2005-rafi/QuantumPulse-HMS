import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const CommandCenterDetailDialog = ({ isOpen, onClose, type }) => {
  const { showError } = useToast();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Date picker filters for completed visits (defaulting to today's date in local time)
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen && type) {
      fetchDetails();
    }
  }, [isOpen, type, startDate, endDate]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = {};

      if (type === 'today_visits') {
        const allStatuses = 'WAITING_TRIAGE,CALLED,WAITING_DOCTOR,IN_PROGRESS,WAITING_LAB,WAITING_DOCTOR_REVIEW,WAITING_PHARMACY,SKIPPED,COMPLETED';
        endpoint = `/visits/queue/${allStatuses}`;
        const today = getTodayISO();
        params.startDate = today;
        params.endDate = today;
      } else if (type === 'completed_visits') {
        endpoint = '/visits/queue/COMPLETED';
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (type === 'pending_lab') {
        endpoint = '/visits/queue/WAITING_LAB';
      } else if (type === 'pending_pharmacy') {
        endpoint = '/visits/queue/WAITING_PHARMACY';
      }

      if (endpoint) {
        const res = await api.get(endpoint, { params });
        setDataList(res.data.data || []);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Error fetching queue details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !type) return null;

  const getDuration = (visit) => {
    const start = new Date(visit.createdAt);
    const end = visit.status === 'COMPLETED' && visit.billing?.billedAt 
      ? new Date(visit.billing.billedAt) 
      : new Date();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const getTitle = () => {
    switch (type) {
      case 'today_visits':
        return "Today's Patient Visits";
      case 'completed_visits':
        return 'Completed Visits History';
      case 'pending_lab':
        return 'Pending Laboratory Queue';
      case 'pending_pharmacy':
        return 'Pending Pharmacy Dispenses';
      default:
        return 'Queue Details';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'today_visits':
        return 'List of all outpatient/inpatient admissions registered today';
      case 'completed_visits':
        return 'Audit log of patients discharged and billed during the selected range';
      case 'pending_lab':
        return 'Patients awaiting diagnostic results from laboratories';
      case 'pending_pharmacy':
        return 'Patients in queue for final prescription checks and dispensation';
      default:
        return 'Command center detail lookup';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'WAITING_LAB':
        return { bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-on-error-container)' };
      case 'WAITING_PHARMACY':
        return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
      case 'IN_PROGRESS':
        return { bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)' };
      default:
        return { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)' };
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7f2fa)', color: 'var(--md-sys-color-on-surface)', padding: '24px', borderRadius: '28px', maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflow: 'hidden', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)' }}>{getTitle()}</h3>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{getSubtitle()}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface)' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Date Filters for Completed Visits */}
        {type === 'completed_visits' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--md-sys-color-surface-container-high)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Filter Date Range:</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>From:</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>To:</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)' }}
              />
            </div>
          </div>
        )}

        {/* Table Body Container */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)' }}>Loading data...</div>
          ) : dataList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
              No visit records found in this queue.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Patient MRN</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Visit ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Full Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Age/Sex</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>City</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Department</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Visit Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.map((visit) => {
                    const badge = getStatusBadgeStyle(visit.status);
                    return (
                      <tr key={visit._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{visit.patientId?.mrn || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{visit.visitNumber}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>{visit.patientId?.fullName || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{visit.patientId?.age || '—'} / {visit.patientId?.gender || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{visit.patientId?.city || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', background: 'var(--md-sys-color-surface-container-high)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {visit.visitType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{visit.departmentId?.name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--md-sys-color-on-surface-variant)' }}>{getDuration(visit)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 10px', background: badge.bg, color: badge.fg, borderRadius: '100px', fontSize: '11px', fontWeight: 'bold' }}>
                            {visit.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '10px 24px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default CommandCenterDetailDialog;
