import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ipdApi } from '../../services/ipdApi';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';
import InpatientCaseFileDialog from './InpatientCaseFileDialog';
import './DoctorIpdHistoryManager.css';

/**
 * DoctorIpdHistoryManager — Production-Grade Inpatient History Hub for Clinicians
 *
 * Implements authoritative Material 3 design metrics aligned with DoctorIpdCockpit (Image 02):
 * - Unified 42px compact telemetry metrics cards with click-to-filter drilldowns
 * - Seamless integration inside the persistent cockpit shell (preserving queue & layout)
 * - Structured 4-column clinical encounter cards matching IpdPatientBanner
 * - Zero text-wrapping bugs on demographics, MRNs, bed labels, and dates
 * - Dual view options: Responsive Cards Grid and High-Density Tabular Ledger
 */
export const DoctorIpdHistoryManager = ({
  onSwitchToActiveCockpit,
  embedded = false,
}) => {
  const { user } = useAuth();
  const doctorId = user?.staffId || user?._id || user?.id;

  // Query & Filter States
  const [historyList, setHistoryList] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    dischargedCount: 0,
    transferredCount: 0,
    avgLosDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'DISCHARGED' | 'ACTIVE' | 'TRANSFERRED'
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewFormat, setViewFormat] = useState('CARDS'); // 'CARDS' | 'TABLE'

  // Dialog State
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);

  // Compute Start & End Date Boundaries
  const { resolvedStart, resolvedEnd } = useMemo(() => {
    if (datePreset === 'ALL') return { resolvedStart: undefined, resolvedEnd: undefined };
    const now = new Date();
    if (datePreset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return { resolvedStart: todayStr, resolvedEnd: todayStr };
    }
    if (datePreset === 'LAST_7_DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return { resolvedStart: past.toISOString().split('T')[0], resolvedEnd: now.toISOString().split('T')[0] };
    }
    if (datePreset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { resolvedStart: firstDay.toISOString().split('T')[0], resolvedEnd: now.toISOString().split('T')[0] };
    }
    if (datePreset === 'CUSTOM') {
      return { resolvedStart: customStartDate || undefined, resolvedEnd: customEndDate || undefined };
    }
    return { resolvedStart: undefined, resolvedEnd: undefined };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch History from API
  const fetchDoctorHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        doctorId,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        startDate: resolvedStart,
        endDate: resolvedEnd,
        limit: 100,
      };

      const res = await ipdApi.getHistory(params);
      const data = res.data?.data || {};
      setHistoryList(data.items || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load doctor inpatient history:', err);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, statusFilter, searchQuery, resolvedStart, resolvedEnd]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctorHistory();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchDoctorHistory]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISCHARGED':
        return <span className="doc-ipd-badge doc-ipd-badge--discharged">Discharged</span>;
      case 'ADMITTED':
      case 'DISCHARGE_INITIATED':
        return <span className="doc-ipd-badge doc-ipd-badge--active">Active Inpatient</span>;
      case 'TRANSFERRED_OUT':
        return <span className="doc-ipd-badge doc-ipd-badge--transferred">Transferred Out</span>;
      default:
        return <span className="doc-ipd-badge">{status?.replace(/_/g, ' ') || 'Unknown'}</span>;
    }
  };

  return (
    <div className={`doc-ipd-history-hub ${embedded ? 'doc-ipd-history-hub--embedded' : ''}`}>
      {/* ── Standalone Hero Top Bar (Only rendered when not embedded) ── */}
      {!embedded && (
        <div className="doc-ipd-history-header">
          <div className="doc-ipd-history-header__left">
            <div className="doc-ipd-hero-avatar">
              <span className="material-symbols-rounded">history_edu</span>
            </div>
            <div>
              <h1 className="doc-ipd-title">Inpatient Clinical History &amp; Case Archival</h1>
              <p className="doc-ipd-subtitle">
                Comprehensive case records, daily SOAP rounds, orders, and discharge summaries for patients consulted by you.
              </p>
            </div>
          </div>

          {onSwitchToActiveCockpit && (
            <div className="ipd-view-mode-toggle">
              <button
                type="button"
                className="ipd-mode-btn"
                onClick={onSwitchToActiveCockpit}
              >
                <span className="material-symbols-rounded">hotel</span>
                <span>Switch to Active Cockpit</span>
              </button>
              <button
                type="button"
                className="ipd-mode-btn is-active"
                disabled
              >
                <span className="material-symbols-rounded">history_edu</span>
                <span>Inpatient History</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Telemetry Stats Deck (Exact 42px Compact Metrics from Image 02) ── */}
      <div className="md3-ipd-telemetry-deck doc-ipd-telemetry-deck" role="region" aria-label="Inpatient History Telemetry Metrics">
        {/* Total Encounters */}
        <div
          className={`md3-ipd-telemetry-card ${statusFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setStatusFilter('ALL')}
          title="Filter: All Inpatient Cases"
        >
          <div className="md3-ipd-telemetry-card-left">
            <span className="md3-ipd-telemetry-icon primary">
              <span className="material-symbols-rounded">folder_shared</span>
            </span>
            <div className="md3-ipd-telemetry-text">
              <span className="md3-ipd-telemetry-val">{stats.totalCount || 0}</span>
              <span className="md3-ipd-telemetry-lbl">Total Inpatient Cases</span>
            </div>
          </div>
          <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
        </div>

        {/* Discharges Finalized */}
        <div
          className={`md3-ipd-telemetry-card ${statusFilter === 'DISCHARGED' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('DISCHARGED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setStatusFilter('DISCHARGED')}
          title="Filter: Discharges Finalized"
        >
          <div className="md3-ipd-telemetry-card-left">
            <span className="md3-ipd-telemetry-icon discharge">
              <span className="material-symbols-rounded">check_circle</span>
            </span>
            <div className="md3-ipd-telemetry-text">
              <span className="md3-ipd-telemetry-val">{stats.dischargedCount || 0}</span>
              <span className="md3-ipd-telemetry-lbl">Discharges Finalized</span>
            </div>
          </div>
          <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
        </div>

        {/* Currently Under Care */}
        <div
          className={`md3-ipd-telemetry-card ${statusFilter === 'ACTIVE' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('ACTIVE')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setStatusFilter('ACTIVE')}
          title="Filter: Active Inpatient Admissions"
        >
          <div className="md3-ipd-telemetry-card-left">
            <span className="md3-ipd-telemetry-icon rounds">
              <span className="material-symbols-rounded">hotel</span>
            </span>
            <div className="md3-ipd-telemetry-text">
              <span className="md3-ipd-telemetry-val">{stats.activeCount || 0}</span>
              <span className="md3-ipd-telemetry-lbl">Currently Under Care</span>
            </div>
          </div>
          <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
        </div>

        {/* Avg Length of Stay */}
        <div
          className="md3-ipd-telemetry-card"
          title="Average Inpatient Length of Stay"
        >
          <div className="md3-ipd-telemetry-card-left">
            <span className="md3-ipd-telemetry-icon critical">
              <span className="material-symbols-rounded">timelapse</span>
            </span>
            <div className="md3-ipd-telemetry-text">
              <span className="md3-ipd-telemetry-val">
                {stats.avgLosDays || 0} <small style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>Days</small>
              </span>
              <span className="md3-ipd-telemetry-lbl">Avg Length of Stay (LOS)</span>
            </div>
          </div>
          <span className="material-symbols-rounded md3-ipd-telemetry-chevron">insights</span>
        </div>
      </div>

      {/* ── Control Bar: High-Density Search, View Switcher & Filter Matrix ── */}
      <div className="doc-ipd-filter-bar">
        {/* Search & Layout Toggle Strip */}
        <div className="doc-ipd-search-row">
          <div className="doc-ipd-search-box">
            <span className="material-symbols-rounded">search</span>
            <input
              type="text"
              placeholder="Search patient name, MRN, admission number, bed, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="doc-ipd-clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          <div className="doc-ipd-view-toggle">
            <button
              type="button"
              className={`doc-ipd-view-btn ${viewFormat === 'CARDS' ? 'is-active' : ''}`}
              onClick={() => setViewFormat('CARDS')}
              title="Cards Grid View"
            >
              <span className="material-symbols-rounded">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`doc-ipd-view-btn ${viewFormat === 'TABLE' ? 'is-active' : ''}`}
              onClick={() => setViewFormat('TABLE')}
              title="Dense Ledger View"
            >
              <span className="material-symbols-rounded">table_rows</span>
              <span>Ledger</span>
            </button>
          </div>

          <div className="doc-ipd-results-count">
            <span>{historyList.length} Case{historyList.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Combined Filter Chips Row (Status & Date Presets) */}
        <div className="doc-ipd-chips-container">
          <div className="doc-ipd-chips-row">
            <button
              type="button"
              className={`doc-ipd-chip ${statusFilter === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Encounters ({stats.totalCount || 0})
            </button>
            <button
              type="button"
              className={`doc-ipd-chip ${statusFilter === 'DISCHARGED' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('DISCHARGED')}
            >
              Discharged ({stats.dischargedCount || 0})
            </button>
            <button
              type="button"
              className={`doc-ipd-chip ${statusFilter === 'ACTIVE' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active Inpatient ({stats.activeCount || 0})
            </button>
            <button
              type="button"
              className={`doc-ipd-chip ${statusFilter === 'TRANSFERRED' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter('TRANSFERRED')}
            >
              Transferred ({stats.transferredCount || 0})
            </button>
          </div>

          <span className="doc-ipd-chips-divider" aria-hidden="true">|</span>

          <div className="doc-ipd-date-presets">
            <button
              type="button"
              className={`doc-ipd-date-btn ${datePreset === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setDatePreset('ALL')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`doc-ipd-date-btn ${datePreset === 'TODAY' ? 'is-active' : ''}`}
              onClick={() => setDatePreset('TODAY')}
            >
              Today
            </button>
            <button
              type="button"
              className={`doc-ipd-date-btn ${datePreset === 'LAST_7_DAYS' ? 'is-active' : ''}`}
              onClick={() => setDatePreset('LAST_7_DAYS')}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`doc-ipd-date-btn ${datePreset === 'THIS_MONTH' ? 'is-active' : ''}`}
              onClick={() => setDatePreset('THIS_MONTH')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`doc-ipd-date-btn ${datePreset === 'CUSTOM' ? 'is-active' : ''}`}
              onClick={() => setDatePreset('CUSTOM')}
            >
              Custom Range
            </button>
          </div>
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="doc-ipd-custom-date-box">
            <label className="doc-ipd-date-label">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="doc-ipd-date-input"
            />
            <span className="date-sep">to</span>
            <label className="doc-ipd-date-label">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="doc-ipd-date-input"
            />
          </div>
        )}
      </div>

      {/* ── Main Case Records Workspace ── */}
      <div className="doc-ipd-cases-container">
        {loading ? (
          <div className="doc-ipd-loading-state">
            <span className="material-symbols-rounded spin">progress_activity</span>
            <span>Retrieving inpatient clinical encounters...</span>
          </div>
        ) : historyList.length === 0 ? (
          <div className="doc-ipd-empty-state">
            <span className="material-symbols-rounded">medical_information</span>
            <h3>No Inpatient Records Found</h3>
            <p>No past or active inpatient admissions match the selected filter criteria.</p>
          </div>
        ) : viewFormat === 'TABLE' ? (
          /* ── Dense Ledger Table Mode ── */
          <div className="doc-ipd-table-wrapper">
            <table className="doc-ipd-ledger-table">
              <thead>
                <tr>
                  <th>Patient &amp; MRN</th>
                  <th>Bed &amp; Ward</th>
                  <th>Admission &amp; Stay</th>
                  <th>Diagnosis</th>
                  <th>Attending Doctor</th>
                  <th>Rounds</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((adm) => {
                  const p = adm.patientId || {};
                  const admDate = adm.admissionDate
                    ? new Date(adm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const disDate = adm.dischargeDate
                    ? new Date(adm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (adm.status === 'DISCHARGED' ? 'Discharged' : 'Active');
                  const los = adm.losDays || 1;
                  const bedLabel = adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '—';
                  const wardClass = adm.currentBedId?.wardClass || adm.currentBedId?.wardType || 'General Ward';

                  return (
                    <tr key={adm._id}>
                      <td>
                        <div className="table-patient-cell">
                          <div className="table-avatar">{getPatientInitials(p)}</div>
                          <div className="table-patient-info">
                            <span className="table-patient-name">{formatPatientName(p)}</span>
                            <span className="table-patient-mrn">MRN: {p.mrn || '—'} • {p.age ? `${p.age}y` : ''}{p.gender ? ` / ${p.gender}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-bed-cell">
                          <span className="doc-ipd-bed-pill">
                            <span className="material-symbols-rounded">hotel</span>
                            Bed {bedLabel}
                          </span>
                          <span className="table-ward-name">{wardClass}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-stay-cell">
                          <span className="table-date-range">{admDate} – {disDate}</span>
                          <span className="doc-ipd-stay-pill">{los} Day{los > 1 ? 's' : ''} Stay</span>
                        </div>
                      </td>
                      <td>
                        <span className="table-dx">
                          {adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || 'Admission Diagnosis'}
                        </span>
                      </td>
                      <td>
                        <span className="table-doctor">{formatDoctorName(adm.primaryDoctorId)}</span>
                      </td>
                      <td>
                        <span className="doc-ipd-rounds-pill">
                          <span className="material-symbols-rounded">clinical_notes</span>
                          {adm.wardRoundsCount || 0}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(adm.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="doc-ipd-casefile-btn"
                          onClick={() => setSelectedAdmissionId(adm._id)}
                          title="Inspect 360° Inpatient Case File"
                        >
                          <span>Case File</span>
                          <span className="material-symbols-rounded">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Rich Material 3 Patient Encounter Cards Grid (Image 02 Metrics) ── */
          <div className="doc-ipd-grid">
            {historyList.map((adm) => {
              const p = adm.patientId || {};
              const admDate = adm.admissionDate
                ? new Date(adm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              const disDate = adm.dischargeDate
                ? new Date(adm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : (adm.status === 'DISCHARGED' ? 'Discharged' : 'Active');
              const los = adm.losDays || 1;
              const bedLabel = adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '—';
              const wardClass = adm.currentBedId?.wardClass || adm.currentBedId?.wardType || 'General Ward';
              const roomNumber = adm.currentRoomId?.roomNumber || '—';
              const attendingDoc = formatDoctorName(adm.primaryDoctorId);
              const diagnosis = adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || 'Admission Diagnosis';

              return (
                <div key={adm._id} className="doc-ipd-card">
                  {/* Row 1: Patient Identity, Bed Pill & Status Badge */}
                  <div className="doc-ipd-card__top">
                    <div className="doc-ipd-card__identity">
                      <div className="doc-ipd-patient-avatar">
                        {getPatientInitials(p)}
                      </div>
                      <div className="doc-ipd-name-group">
                        <h2 className="doc-ipd-patient-name" title={formatPatientName(p)}>
                          {formatPatientName(p)}
                        </h2>
                        <span className="doc-ipd-bed-pill">
                          <span className="material-symbols-rounded">hotel</span>
                          Bed {bedLabel}
                        </span>
                      </div>
                    </div>

                    <div className="doc-ipd-card__status-zone">
                      {getStatusBadge(adm.status)}
                    </div>
                  </div>

                  {/* Row 2: Demographics Line (Single flex line with zero text-wrapping bugs) */}
                  <div className="doc-ipd-card__demographics">
                    <span className="demo-token">MRN: <strong>{p.mrn || '—'}</strong></span>
                    <span className="demo-sep">•</span>
                    <span className="demo-token">{p.age ? `${p.age}y` : '—'} / {p.gender || '—'}</span>
                    <span className="demo-sep">•</span>
                    <span className="demo-token">Adm: <strong>{adm.admissionNumber || '—'}</strong></span>
                    <span className="demo-sep">•</span>
                    <span className="demo-token">Blood: <strong style={{ color: p.bloodGroup ? '#ba1a1a' : 'inherit' }}>{p.bloodGroup || 'Unknown'}</strong></span>
                  </div>

                  {/* Row 3: Stay & Dates Strip */}
                  <div className="doc-ipd-card__duration">
                    <div className="duration-left">
                      <span className="material-symbols-rounded">calendar_month</span>
                      <span className="duration-dates">{admDate} – {disDate}</span>
                    </div>
                    <span className="doc-ipd-stay-pill">
                      {los} Day{los > 1 ? 's' : ''} Stay
                    </span>
                  </div>

                  {/* Row 4: 4-Column Structured Clinical Encounter Grid (Exact Image 02 Metrics) */}
                  <div className="doc-ipd-card__clinical-grid">
                    <div className="clinical-grid-col">
                      <span className="clinical-grid-label">Attending Doctor</span>
                      <strong className="clinical-grid-val" title={attendingDoc}>
                        {attendingDoc}
                      </strong>
                    </div>

                    <div className="clinical-grid-col">
                      <span className="clinical-grid-label">Admission Date &amp; Stay</span>
                      <span className="clinical-grid-val">
                        <strong style={{ color: 'var(--md-sys-color-primary, #6750a4)' }}>Day {los}</strong> ({admDate})
                      </span>
                    </div>

                    <div className="clinical-grid-col">
                      <span className="clinical-grid-label">Clinical Ward</span>
                      <strong className="clinical-grid-val" title={`${wardClass} • Room ${roomNumber}`}>
                        {wardClass} • Room {roomNumber}
                      </strong>
                    </div>

                    <div className="clinical-grid-col">
                      <span className="clinical-grid-label">Diagnosis</span>
                      <strong className="clinical-grid-val clinical-grid-val--dx" title={diagnosis}>
                        {diagnosis}
                      </strong>
                    </div>
                  </div>

                  {/* Row 5: Action Zone & SOAP Rounds Badge */}
                  <div className="doc-ipd-card__footer">
                    <div className="doc-ipd-rounds-pill">
                      <span className="material-symbols-rounded">clinical_notes</span>
                      <span>{adm.wardRoundsCount || 0} Daily Rounds Logged</span>
                    </div>

                    <button
                      type="button"
                      className="doc-ipd-casefile-btn"
                      onClick={() => setSelectedAdmissionId(adm._id)}
                      title="Inspect 360° Clinical Encounter Case File"
                    >
                      <span>View Case File</span>
                      <span className="material-symbols-rounded">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 360° Case File Modal ── */}
      {selectedAdmissionId && (
        <InpatientCaseFileDialog
          admissionId={selectedAdmissionId}
          isOpen={Boolean(selectedAdmissionId)}
          onClose={() => setSelectedAdmissionId(null)}
        />
      )}
    </div>
  );
};

export default DoctorIpdHistoryManager;
