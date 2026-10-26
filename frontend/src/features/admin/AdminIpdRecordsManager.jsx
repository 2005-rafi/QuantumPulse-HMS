import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import { ipdApi } from '../../services/ipdApi';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';
import InpatientCaseFileDialog from '../ipd/InpatientCaseFileDialog';
import './AdminIpdRecordsManager.css';

/**
 * AdminIpdRecordsManager — Enterprise Inpatient Census & Segregated Records Export
 *
 * Capabilities:
 * 1. Segregated Inpatient (IPD) Admissions vs Outpatient (OPD) Visits tabs.
 * 2. Live Census & Encounters Telemetry (Admitted, Active Rounds, Discharges, LOS).
 * 3. Multi-State Filter Matrix: ADMITTED, DISCHARGE_INITIATED, DISCHARGED, TRANSFERRED_OUT, CANCELLED.
 * 4. Multi-format streaming export: CSV, JSON, and Formal Printable Census Ledger.
 * 5. Full Inpatient Case File 360° Inspection.
 */
export const AdminIpdRecordsManager = () => {
  const { openConfirm, closeConfirm, showSuccess, showError } = useOutletContext() || {};

  // Modality Segregation: 'IPD' | 'OPD'
  const [selectedModality, setSelectedModality] = useState('IPD');

  // IPD Query & Filter States
  const [ipdList, setIpdList] = useState([]);
  const [ipdLoading, setIpdLoading] = useState(true);
  const [ipdSearch, setIpdSearch] = useState('');
  const [ipdStatus, setIpdStatus] = useState('ALL'); // 'ALL' | 'ADMITTED' | 'DISCHARGE_INITIATED' | 'DISCHARGED' | 'TRANSFERRED_OUT'
  const [dateScope, setDateScope] = useState('ALL'); // 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [ipdStats, setIpdStats] = useState({
    totalCount: 0,
    activeCount: 0,
    dischargedCount: 0,
    transferredCount: 0,
    avgLosDays: 0,
  });

  // OPD Query & Filter States
  const [opdList, setOpdList] = useState([]);
  const [opdLoading, setOpdLoading] = useState(false);
  const [opdSearch, setOpdSearch] = useState('');
  const [opdStatus, setOpdStatus] = useState('ALL');

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);

  // Inpatient Case File Modal State
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Compute Date Boundaries
  const { startDateStr, endDateStr } = useMemo(() => {
    if (dateScope === 'ALL') return { startDateStr: undefined, endDateStr: undefined };
    const now = new Date();
    if (dateScope === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return { startDateStr: todayStr, endDateStr: todayStr };
    }
    if (dateScope === 'LAST_7_DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return { startDateStr: past.toISOString().split('T')[0], endDateStr: now.toISOString().split('T')[0] };
    }
    if (dateScope === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDateStr: first.toISOString().split('T')[0], endDateStr: now.toISOString().split('T')[0] };
    }
    if (dateScope === 'CUSTOM') {
      return { startDateStr: customStart || undefined, endDateStr: customEnd || undefined };
    }
    return { startDateStr: undefined, endDateStr: undefined };
  }, [dateScope, customStart, customEnd]);

  // Fetch IPD History
  const fetchIpdRecords = useCallback(async () => {
    setIpdLoading(true);
    try {
      const params = {
        status: ipdStatus !== 'ALL' ? ipdStatus : undefined,
        search: ipdSearch.trim() || undefined,
        startDate: startDateStr,
        endDate: endDateStr,
        limit: 150,
      };

      const res = await ipdApi.getHistory(params);
      const data = res.data?.data || {};
      setIpdList(data.items || []);
      if (data.stats) {
        setIpdStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load IPD records:', err);
      setIpdList([]);
    } finally {
      setIpdLoading(false);
    }
  }, [ipdStatus, ipdSearch, startDateStr, endDateStr]);

  // Fetch OPD Visits
  const fetchOpdRecords = useCallback(async () => {
    setOpdLoading(true);
    try {
      const params = {
        limit: 150,
        status: opdStatus !== 'ALL' ? opdStatus : undefined,
        q: opdSearch.trim() || undefined,
        startDate: startDateStr,
        endDate: endDateStr,
      };

      const res = await api.get('/visits', { params });
      const data = res.data?.data || {};
      setOpdList(data.items || data || []);
    } catch (err) {
      console.error('Failed to load OPD visits:', err);
      setOpdList([]);
    } finally {
      setOpdLoading(false);
    }
  }, [opdStatus, opdSearch, startDateStr, endDateStr]);

  useEffect(() => {
    if (selectedModality === 'IPD') {
      const timer = setTimeout(() => {
        fetchIpdRecords();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        fetchOpdRecords();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedModality, fetchIpdRecords, fetchOpdRecords]);

  // Trigger File Download from Blob
  const triggerDownload = (blobData, filename) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Export Handler (CSV or JSON)
  const handleExport = async (format = 'csv') => {
    setIsExporting(true);
    try {
      const nowStr = new Date().toISOString().slice(0, 10);

      if (selectedModality === 'IPD') {
        const payload = {
          scope: dateScope === 'ALL' ? 'all' : (dateScope === 'TODAY' ? 'today' : 'dateRange'),
          startDate: startDateStr,
          endDate: endDateStr,
          status: ipdStatus !== 'ALL' ? ipdStatus : undefined,
          format,
        };

        const res = await ipdApi.exportAdmissions(payload);
        const filename = `inpatient_census_report_${dateScope}_${nowStr}.${format}`;
        triggerDownload(res.data, filename);
        if (showSuccess) showSuccess('Inpatient Census Exported', `Generated ${filename} successfully.`);
      } else {
        const payload = {
          reportType: 'walkin',
          scope: dateScope === 'ALL' ? 'all' : (dateScope === 'TODAY' ? 'today' : 'dateRange'),
          startDate: startDateStr,
          endDate: endDateStr,
          format,
        };

        const res = await api.post('/patients/export', payload, { responseType: 'blob' });
        const filename = `outpatient_opd_report_${dateScope}_${nowStr}.${format}`;
        triggerDownload(res.data, filename);
        if (showSuccess) showSuccess('Outpatient Records Exported', `Generated ${filename} successfully.`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      if (showError) showError('Export Failed', err.response?.data?.message || 'Failed to stream export records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const getIpdStatusBadge = (status) => {
    switch (status) {
      case 'DISCHARGED':
        return <span className="admin-status-badge admin-status-badge--discharged">Discharged</span>;
      case 'ADMITTED':
        return <span className="admin-status-badge admin-status-badge--admitted">Admitted</span>;
      case 'DISCHARGE_INITIATED':
        return <span className="admin-status-badge admin-status-badge--initiated">Discharge Initiated</span>;
      case 'TRANSFERRED_OUT':
        return <span className="admin-status-badge admin-status-badge--transferred">Transferred Out</span>;
      case 'CANCELLED':
        return <span className="admin-status-badge admin-status-badge--cancelled">Cancelled</span>;
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-ipd-manager">
      {/* ── Top Header & Modality Segregation ── */}
      <div className="admin-ipd-header">
        <div className="admin-ipd-header__left">
          <div className="admin-ipd-icon-circle">
            <span className="material-symbols-rounded">inventory</span>
          </div>
          <div>
            <h1 className="admin-ipd-title">Hospital Inpatient Census & Patient Records</h1>
            <p className="admin-ipd-subtitle">
              Administrator ledger for admitted, active rounding, and discharged inpatient encounters with segregated OPD archives.
            </p>
          </div>
        </div>

        {/* Modality Segregation Buttons */}
        <div className="admin-modality-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={selectedModality === 'IPD'}
            className={`admin-modality-tab ${selectedModality === 'IPD' ? 'is-active' : ''}`}
            onClick={() => setSelectedModality('IPD')}
          >
            <span className="material-symbols-rounded">hotel</span>
            <span>Inpatient (IPD) Census</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedModality === 'OPD'}
            className={`admin-modality-tab ${selectedModality === 'OPD' ? 'is-active' : ''}`}
            onClick={() => setSelectedModality('OPD')}
          >
            <span className="material-symbols-rounded">stethoscope</span>
            <span>Outpatient (OPD) Visits</span>
          </button>
        </div>
      </div>

      {/* ── Inpatient Telemetry KPI Ribbon (Visible on IPD Tab) ── */}
      {selectedModality === 'IPD' && (
        <div className="admin-census-ribbon">
          <div className="census-kpi-card">
            <span className="kpi-label">Total Inpatient Stays</span>
            <span className="kpi-value">{ipdStats.totalCount || 0}</span>
            <span className="kpi-sub">Total Tracked Inpatients</span>
          </div>
          <div className="census-kpi-card census-kpi-card--admitted">
            <span className="kpi-label">Currently Admitted</span>
            <span className="kpi-value">{ipdStats.activeCount || 0}</span>
            <span className="kpi-sub">Occupying Physical Beds</span>
          </div>
          <div className="census-kpi-card census-kpi-card--discharged">
            <span className="kpi-label">Discharges Finalized</span>
            <span className="kpi-value">{ipdStats.dischargedCount || 0}</span>
            <span className="kpi-sub">Clearance & Gate Pass Issued</span>
          </div>
          <div className="census-kpi-card census-kpi-card--transferred">
            <span className="kpi-label">Transferred Out</span>
            <span className="kpi-value">{ipdStats.transferredCount || 0}</span>
            <span className="kpi-sub">Referral / External Transfer</span>
          </div>
          <div className="census-kpi-card">
            <span className="kpi-label">Average LOS</span>
            <span className="kpi-value">{ipdStats.avgLosDays || 0} <small>Days</small></span>
            <span className="kpi-sub">Hospital Inpatient Stay</span>
          </div>
        </div>
      )}

      {/* ── Filter Deck & Multi-Format Export Action Bar ── */}
      <div className="admin-filter-deck">
        <div className="admin-filter-deck__top">
          {/* Search Box */}
          <div className="admin-search-box">
            <span className="material-symbols-rounded">search</span>
            <input
              type="text"
              placeholder={
                selectedModality === 'IPD'
                  ? 'Search by patient name, MRN, admission number, bed, diagnosis, doctor...'
                  : 'Search by patient name, MRN, visit number, token...'
              }
              value={selectedModality === 'IPD' ? ipdSearch : opdSearch}
              onChange={(e) => selectedModality === 'IPD' ? setIpdSearch(e.target.value) : setOpdSearch(e.target.value)}
            />
          </div>

          {/* Export Action Deck */}
          <div className="admin-export-deck">
            <button
              type="button"
              className="admin-export-btn admin-export-btn--csv"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              <span className="material-symbols-rounded">csv</span>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              className="admin-export-btn admin-export-btn--json"
              onClick={() => handleExport('json')}
              disabled={isExporting}
            >
              <span className="material-symbols-rounded">data_object</span>
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              className="admin-export-btn admin-export-btn--print"
              onClick={handlePrintLedger}
            >
              <span className="material-symbols-rounded">print</span>
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {/* State Filters & Date Boundaries */}
        <div className="admin-filter-deck__bottom">
          {selectedModality === 'IPD' ? (
            <div className="admin-state-chips">
              <button
                type="button"
                className={`admin-state-chip ${ipdStatus === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setIpdStatus('ALL')}
              >
                All Admissions ({ipdStats.totalCount || 0})
              </button>
              <button
                type="button"
                className={`admin-state-chip ${ipdStatus === 'ADMITTED' ? 'is-active' : ''}`}
                onClick={() => setIpdStatus('ADMITTED')}
              >
                Admitted / Rounds Active ({ipdStats.activeCount || 0})
              </button>
              <button
                type="button"
                className={`admin-state-chip ${ipdStatus === 'DISCHARGED' ? 'is-active' : ''}`}
                onClick={() => setIpdStatus('DISCHARGED')}
              >
                Discharged ({ipdStats.dischargedCount || 0})
              </button>
              <button
                type="button"
                className={`admin-state-chip ${ipdStatus === 'TRANSFERRED_OUT' ? 'is-active' : ''}`}
                onClick={() => setIpdStatus('TRANSFERRED_OUT')}
              >
                Transferred ({ipdStats.transferredCount || 0})
              </button>
            </div>
          ) : (
            <div className="admin-state-chips">
              <button
                type="button"
                className={`admin-state-chip ${opdStatus === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setOpdStatus('ALL')}
              >
                All OPD Visits
              </button>
              <button
                type="button"
                className={`admin-state-chip ${opdStatus === 'IN_CONSULTATION' ? 'is-active' : ''}`}
                onClick={() => setOpdStatus('IN_CONSULTATION')}
              >
                In Consultation
              </button>
              <button
                type="button"
                className={`admin-state-chip ${opdStatus === 'COMPLETED' ? 'is-active' : ''}`}
                onClick={() => setOpdStatus('COMPLETED')}
              >
                Completed Visits
              </button>
            </div>
          )}

          {/* Date Scope Chips */}
          <div className="admin-date-chips">
            <span className="date-group-tag">Scope:</span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Range…' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                className={`admin-date-chip ${dateScope === d.id ? 'is-active' : ''}`}
                onClick={() => setDateScope(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {dateScope === 'CUSTOM' && (
            <div className="admin-custom-date-row">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="admin-date-field"
              />
              <span>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="admin-date-field"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Main Data Viewport ── */}
      <div className="admin-records-viewport">
        {selectedModality === 'IPD' ? (
          /* ── IPD Inpatient Table ── */
          ipdLoading ? (
            <div className="admin-loading-state">
              <span className="material-symbols-rounded spin">progress_activity</span>
              <span>Loading inpatient census ledger...</span>
            </div>
          ) : ipdList.length === 0 ? (
            <div className="admin-empty-state">
              <span className="material-symbols-rounded">hotel</span>
              <h3>No Inpatient Admission Records</h3>
              <p>No patient admissions match the selected criteria.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Admission No</th>
                    <th>Patient Demographics</th>
                    <th>Ward / Bed Location</th>
                    <th>Attending Doctor & Dept</th>
                    <th>Admission Dates & Stay</th>
                    <th>Clinical Diagnosis</th>
                    <th>Status</th>
                    <th className="th-action">Case File</th>
                  </tr>
                </thead>
                <tbody>
                  {ipdList.map((adm) => {
                    const p = adm.patientId || {};
                    const admDate = adm.admissionDate
                      ? new Date(adm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    const disDate = adm.dischargeDate
                      ? new Date(adm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : (adm.status === 'DISCHARGED' ? 'Discharged' : 'Active');
                    const los = adm.losDays || 1;

                    return (
                      <tr key={adm._id}>
                        <td>
                          <strong className="adm-num-text">{adm.admissionNumber || '—'}</strong>
                          <div className="adm-type-sub">{adm.admissionType || 'PLANNED'}</div>
                        </td>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar-mini">
                              {getPatientInitials(p)}
                            </div>
                            <div>
                              <div className="patient-name-bold">{formatPatientName(p)}</div>
                              <div className="patient-meta-mini">
                                <span>MRN: <strong>{p.mrn || '—'}</strong></span>
                                <span>•</span>
                                <span>{p.age || '—'} Y / {p.gender || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="bed-badge">
                            <span className="material-symbols-rounded">single_bed</span>
                            <span>{adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || 'Bed —'}</span>
                          </div>
                          <div className="ward-sub-text">
                            {adm.currentBedId?.wardClass || 'General Ward'} • Room {adm.currentRoomId?.roomNumber || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="doctor-text">{formatDoctorName(adm.primaryDoctorId)}</div>
                          <div className="dept-sub-text">{adm.admittingDepartmentId?.name || 'Department'}</div>
                        </td>
                        <td>
                          <div className="stay-date-text">{admDate} → {disDate}</div>
                          <div className="los-badge">{los} Day{los > 1 ? 's' : ''} Stay</div>
                        </td>
                        <td>
                          <div className="dx-text" title={adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis}>
                            {adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || '—'}
                          </div>
                          {adm.wardRoundsCount > 0 && (
                            <div className="rounds-count-sub">
                              ✓ {adm.wardRoundsCount} Ward Round{adm.wardRoundsCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          {getIpdStatusBadge(adm.status)}
                        </td>
                        <td className="td-action">
                          <button
                            type="button"
                            className="admin-case-file-btn"
                            onClick={() => setSelectedCaseId(adm._id)}
                            title="Inspect complete inpatient clinical case file"
                          >
                            <span className="material-symbols-rounded">visibility</span>
                            <span>Case File</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── OPD Outpatient Table ── */
          opdLoading ? (
            <div className="admin-loading-state">
              <span className="material-symbols-rounded spin">progress_activity</span>
              <span>Loading outpatient encounters...</span>
            </div>
          ) : opdList.length === 0 ? (
            <div className="admin-empty-state">
              <span className="material-symbols-rounded">stethoscope</span>
              <h3>No Outpatient Visit Records</h3>
              <p>No outpatient encounters match the current filter selection.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Visit No / Token</th>
                    <th>Patient Demographics</th>
                    <th>Department</th>
                    <th>Consulting Doctor</th>
                    <th>Visit Date & Time</th>
                    <th>Registration & Consult Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {opdList.map((vis) => {
                    const p = vis.patientId || {};
                    const vDate = vis.createdAt
                      ? new Date(vis.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    const vTime = vis.createdAt
                      ? new Date(vis.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—';
                    const regFee = Number(vis.receptionPayment?.registrationFee || 0);
                    const consultFee = Number(vis.receptionPayment?.consultationFee || 0);
                    const totalFee = regFee + consultFee;

                    return (
                      <tr key={vis._id}>
                        <td>
                          <div className="adm-num-text">{vis.visitNumber || '—'}</div>
                          <div className="token-sub-badge">Token: {vis.tokenString || '—'}</div>
                        </td>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar-mini">
                              {getPatientInitials(p)}
                            </div>
                            <div>
                              <div className="patient-name-bold">{formatPatientName(p)}</div>
                              <div className="patient-meta-mini">
                                <span>MRN: <strong>{p.mrn || '—'}</strong></span>
                                <span>•</span>
                                <span>{p.age || '—'} Y / {p.gender || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{vis.departmentId?.name || 'General OPD'}</td>
                        <td>{formatDoctorName(vis.assignedDoctorId || vis.consultation?.doctorId)}</td>
                        <td>
                          <div>{vDate}</div>
                          <div className="time-sub-text">{vTime}</div>
                        </td>
                        <td>
                          <div className="fee-text">₹{totalFee.toFixed(2)}</div>
                          <div className="fee-sub-text">Reg: ₹{regFee} | Doc: ₹{consultFee}</div>
                        </td>
                        <td>
                          <span className={`opd-status-badge opd-status-badge--${(vis.status || '').toLowerCase()}`}>
                            {vis.status || 'WAITING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Inpatient Case File Modal ── */}
      {selectedCaseId && (
        <InpatientCaseFileDialog
          admissionId={selectedCaseId}
          isOpen={Boolean(selectedCaseId)}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </div>
  );
};

export default AdminIpdRecordsManager;
