import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { visitAPI } from '../../services/visitAPI';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import { Md3Button, Md3Select } from '../../components/md3/Md3FormComponents';
import { Md3SearchBar } from '../../components/md3/Md3SearchBar';
import { ClinicalTriageCard } from '../../components/clinical/ClinicalTriageCard';
import { formatDoctorName, formatNurseName } from '../../utils/patientFormatters';
import { ClinicalQueueSearchIndex } from '../../utils/dsaSearchFilter';
import './NurseTriageHistoryView.css';

/* ============================================================
   NurseTriageHistoryView — Material 3 Triage Activity Ledger
   Path: frontend/src/features/nurse/NurseTriageHistoryView.jsx

   SOLID:
     SRP — Displays department-scoped triage history with nurse attribution.
     OCP — Extensible via filter configurations and dialog slots.
     DIP — Relies on visitAPI abstraction.
   ============================================================ */

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeOnly = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatusBadge = (status, triageStatus) => {
  if (triageStatus === 'SKIPPED') {
    return {
      label: 'Fast-Tracked',
      icon: 'bolt',
      className: 'nth-status--skipped',
    };
  }
  switch (status) {
    case 'COMPLETED':
      return { label: 'Consultation Complete', icon: 'check_circle', className: 'nth-status--completed' };
    case 'IN_PROGRESS':
      return { label: 'In Doctor Consult', icon: 'stethoscope', className: 'nth-status--progress' };
    case 'WAITING_DOCTOR':
      return { label: 'Waiting for Doctor', icon: 'schedule', className: 'nth-status--waiting' };
    case 'WAITING_DOCTOR_REVIEW':
      return { label: 'Lab Results Ready', icon: 'biotech', className: 'nth-status--review' };
    case 'WAITING_LAB':
      return { label: 'At Laboratory', icon: 'science', className: 'nth-status--lab' };
    default:
      return { label: status?.replace(/_/g, ' ') || 'Triaged', icon: 'done_all', className: 'nth-status--default' };
  }
};

const calculateBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const hM = heightCm / 100;
  if (hM <= 0) return null;
  const bmi = (weightKg / (hM * hM)).toFixed(1);
  let category = 'Normal';
  let color = 'var(--md-sys-color-primary, #6750a4)';
  if (bmi < 18.5) {
    category = 'Underweight';
    color = '#0288d1';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'Overweight';
    color = '#f57c00';
  } else if (bmi >= 30) {
    category = 'Obese';
    color = '#d32f2f';
  }
  return { value: bmi, category, color };
};

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const NurseTriageHistoryView = () => {
  const context = useOutletContext() || {};
  const { user, deptName, fetchQueue: refreshLiveQueue } = context;

  const [history, setHistory] = useState([]);
  const [departmentNurses, setDepartmentNurses] = useState([]);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [nurseFilter, setNurseFilter] = useState('ALL'); // 'ALL' | 'MY' | specificStaffId
  const [triageFilter, setTriageFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'SKIPPED'
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'all'

  // Actions & Dialogs
  const [revokingId, setRevokingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [selectedVisitForModal, setSelectedVisitForModal] = useState(null);

  const currentNurseId = user?.staffId || user?.userId || user?.id;

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (triageFilter !== 'ALL') {
        params.triageStatus = triageFilter;
      }

      if (nurseFilter !== 'ALL') {
        params.nurseFilter = nurseFilter;
      }

      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = getLocalDateString(now);
        params.startDate = todayStr;
        params.endDate = todayStr;
      } else if (dateFilter === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateString(yest);
        params.startDate = yestStr;
        params.endDate = yestStr;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = getLocalDateString(weekAgo);
        params.endDate = getLocalDateString(now);
      }

      const res = await visitAPI.getNurseTriageHistory(params);
      const data = res.data?.data || {};
      const items = data.items || (Array.isArray(data) ? data : []);

      setHistory(Array.isArray(items) ? items : []);
      if (Array.isArray(data.departmentNurses)) {
        setDepartmentNurses(data.departmentNurses);
      }
      if (data.metrics) {
        setServerMetrics(data.metrics);
      }
    } catch (err) {
      console.error('[NurseTriageHistoryView] fetchHistory error:', err);
    } finally {
      setLoading(false);
    }
  }, [triageFilter, nurseFilter, dateFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRevoke = async (visitId) => {
    if (!window.confirm('Are you sure you want to revoke the triage fast-track and recall this patient for vitals intake?')) {
      return;
    }
    setRevokingId(visitId);
    setActionMessage(null);
    try {
      await visitAPI.revokeTriageSkip(visitId, { reason: 'Revoked by nurse for comprehensive vitals intake' });
      setActionMessage({ type: 'success', text: 'Triage fast-track revoked! Patient returned to your triage queue.' });
      fetchHistory();
      refreshLiveQueue?.();
    } catch (err) {
      const errText = err?.response?.data?.message || err?.message || 'Failed to revoke fast-track.';
      setActionMessage({ type: 'error', text: errText });
    } finally {
      setRevokingId(null);
    }
  };

  // DSA-based Prefix Trie & Inverted Index for instantaneous, ranked search
  const searchIndex = useMemo(() => {
    return new ClinicalQueueSearchIndex(history);
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    return searchIndex.search(searchQuery);
  }, [history, searchQuery, searchIndex]);

  // Derived metrics
  const displayMetrics = useMemo(() => {
    if (serverMetrics) return serverMetrics;
    const total = history.length;
    const skipped = history.filter((v) => v.triage?.status === 'SKIPPED').length;
    const completed = history.filter((v) => v.status === 'COMPLETED').length;
    const withVitals = history.filter((v) => v.vitals?.recordedAt || v.triage?.status === 'COMPLETED' || v.vitals?.bloodPressure).length;
    const myIntakes = history.filter((v) => {
      const rId = (v.vitals?.recordedBy?._id || v.vitals?.recordedBy)?.toString();
      const sId = (v.triage?.skippedBy?._id || v.triage?.skippedBy)?.toString();
      const cId = currentNurseId?.toString();
      return Boolean(cId && (rId === cId || sId === cId));
    }).length;
    return {
      totalIntakes: total,
      myIntakes,
      vitalsValidated: withVitals,
      fastTracked: skipped,
      completed,
    };
  }, [history, serverMetrics, currentNurseId]);

  return (
    <div className="nth-container">
      {/* ─── Compact Linear Metrics Bar ─── */}
      <div className="nth-metrics-bar">
        <div className="nth-metric-pill" title="Total patient triage intakes in this department">
          <span className="material-symbols-rounded nth-metric-pill__icon">analytics</span>
          <span className="nth-metric-pill__label">Total:</span>
          <strong className="nth-metric-pill__value">{displayMetrics.totalIntakes}</strong>
        </div>
        <div className="nth-metric-pill nth-metric-pill--my" title="Patients triaged or fast-tracked by you">
          <span className="material-symbols-rounded nth-metric-pill__icon">person</span>
          <span className="nth-metric-pill__label">My Intakes:</span>
          <strong className="nth-metric-pill__value">{displayMetrics.myIntakes}</strong>
        </div>
        <div className="nth-metric-pill nth-metric-pill--success" title="Patients with complete vitals assessment">
          <span className="material-symbols-rounded nth-metric-pill__icon">check_circle</span>
          <span className="nth-metric-pill__label">Vitals:</span>
          <strong className="nth-metric-pill__value">{displayMetrics.vitalsValidated}</strong>
        </div>
        <div className="nth-metric-pill nth-metric-pill--warning" title="Patients fast-tracked directly to doctor">
          <span className="material-symbols-rounded nth-metric-pill__icon">bolt</span>
          <span className="nth-metric-pill__label">Fast-Tracked:</span>
          <strong className="nth-metric-pill__value">{displayMetrics.fastTracked}</strong>
        </div>
      </div>

      {/* ─── Alert Feedback ─── */}
      {actionMessage && (
        <div className={`nth-alert nth-alert--${actionMessage.type}`} role="alert">
          <span className="material-symbols-rounded">
            {actionMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{actionMessage.text}</span>
          <button type="button" className="nth-alert__close" onClick={() => setActionMessage(null)}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      {/* ─── Unified Controls Bar (| Search | Filters | Refresh |) ─── */}
      <div className="nth-controls-bar">
        <div className="nth-search-box">
          <Md3SearchBar
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder="Search patient, MRN, token, complaint..."
            matchCount={searchQuery ? filteredHistory.length : undefined}
            compact={true}
          />
        </div>

        <div className="nth-filters-group">
          {/* Nurse Attribution Filter Reusable MD3 Select Dropdown */}
          <div className="nth-nurse-filter-container">
            <Md3Select
              id="nurse-filter-select"
              name="nurseFilter"
              value={nurseFilter}
              onChange={(e) => setNurseFilter(e.target.value)}
              compact={true}
              leadingIcon={<span className="material-symbols-rounded">badge</span>}
              className="nth-nurse-md3-select"
            >
              <option value="ALL">All Nurses ({deptName || 'Dept'})</option>
              <option value="MY">My Intakes ({formatNurseName(user?.fullName || 'Current Nurse')})</option>
              {departmentNurses.map((n) => (
                <option key={n._id} value={n._id}>
                  {formatNurseName(n.fullName)} {n.employeeId ? `(${n.employeeId})` : ''}
                </option>
              ))}
            </Md3Select>
          </div>

          {/* Triage Mode Filter Chips */}
          <div className="nth-pill-group" role="group" aria-label="Triage Type Filter">
            <button
              type="button"
              className={`nth-pill ${triageFilter === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setTriageFilter('ALL')}
            >
              All Types
            </button>
            <button
              type="button"
              className={`nth-pill ${triageFilter === 'COMPLETED' ? 'is-active' : ''}`}
              onClick={() => setTriageFilter('COMPLETED')}
            >
              Vitals Recorded
            </button>
            <button
              type="button"
              className={`nth-pill ${triageFilter === 'SKIPPED' ? 'is-active' : ''}`}
              onClick={() => setTriageFilter('SKIPPED')}
            >
              Fast-Tracked
            </button>
          </div>

          {/* Date Scope Filter Chips */}
          <div className="nth-pill-group" role="group" aria-label="Date Scope Filter">
            <button
              type="button"
              className={`nth-pill ${dateFilter === 'today' ? 'is-active' : ''}`}
              onClick={() => setDateFilter('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`nth-pill ${dateFilter === 'yesterday' ? 'is-active' : ''}`}
              onClick={() => setDateFilter('yesterday')}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`nth-pill ${dateFilter === 'week' ? 'is-active' : ''}`}
              onClick={() => setDateFilter('week')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`nth-pill ${dateFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setDateFilter('all')}
            >
              All Time
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`nth-refresh-btn ${loading ? 'is-loading' : ''}`}
          onClick={fetchHistory}
          disabled={loading}
          title="Refresh History"
          aria-label="Refresh History"
        >
          <span className="material-symbols-rounded">refresh</span>
        </button>
      </div>

      {/* ─── History Cards Ledger ─── */}
      <div className="nth-body">
        {loading && history.length === 0 ? (
          <div className="nth-state-box">
            <div className="nth-spinner" />
            <span>Loading triage activity records…</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="nth-state-box">
            <span className="material-symbols-rounded nth-state-icon">inbox</span>
            <h4>No Triage Records Found</h4>
            <p>No triage records matched your filters. Recorded vitals and fast-tracked patients will appear here.</p>
          </div>
        ) : (
          <div className="nth-grid">
            {filteredHistory.map((visit) => (
              <ClinicalTriageCard
                key={visit._id}
                visit={visit}
                currentStaffId={currentNurseId}
                onViewDetails={(v) => setSelectedVisitForModal(v)}
                onRevoke={(id) => handleRevoke(id)}
                isRevoking={revokingId === visit._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Comprehensive Vitals Modal / Dialog ─── */}
      {selectedVisitForModal && createPortal(
        <div className="nth-modal-backdrop" onClick={() => setSelectedVisitForModal(null)}>
          <div className="nth-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="nth-modal-header">
              <div className="nth-modal-header-icon">
                <span className="material-symbols-rounded">medical_information</span>
              </div>
              <div>
                <h3 className="nth-modal-title">
                  {selectedVisitForModal.patientId?.firstName} {selectedVisitForModal.patientId?.lastName}
                </h3>
                <p className="nth-modal-subtitle">
                  Token: {selectedVisitForModal.tokenString || selectedVisitForModal.visitNumber} · MRN: {selectedVisitForModal.patientId?.mrn || '—'} · {selectedVisitForModal.departmentId?.name || deptName || 'OPD'}
                </p>
              </div>
              <button
                type="button"
                className="nth-modal-close"
                onClick={() => setSelectedVisitForModal(null)}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="nth-modal-body">
              {/* Nurse Attribution Bar in Modal */}
              <div className="nth-modal-nurse-box">
                <span className="material-symbols-rounded">assignment_ind</span>
                <div>
                  <strong>Triaging Nurse:</strong>{' '}
                  Nurse {selectedVisitForModal.vitals?.recordedBy?.fullName || selectedVisitForModal.triage?.skippedBy?.fullName || 'Clinical Staff'}{' '}
                  {selectedVisitForModal.vitals?.recordedBy?.employeeId && (
                    <small>({selectedVisitForModal.vitals.recordedBy.employeeId})</small>
                  )}
                  <div className="nth-modal-nurse-box__sub">
                    Intake Recorded at: {formatDateTime(selectedVisitForModal.vitals?.recordedAt || selectedVisitForModal.triage?.skippedAt || selectedVisitForModal.createdAt)}
                  </div>
                </div>
              </div>

              {/* Standard Vitals Matrix */}
              <div className="nth-modal-section">
                <h4>Core Vital Signs</h4>
                <div className="nth-modal-vitals-grid">
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Blood Pressure</span>
                    <span className="nth-modal-vital-val">{selectedVisitForModal.vitals?.bloodPressure || '—'} mmHg</span>
                  </div>
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Pulse Rate</span>
                    <span className="nth-modal-vital-val">{selectedVisitForModal.vitals?.pulse || '—'} bpm</span>
                  </div>
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Body Temperature</span>
                    <span className="nth-modal-vital-val">{selectedVisitForModal.vitals?.temperature || '—'} °F</span>
                  </div>
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Oxygen Saturation</span>
                    <span className="nth-modal-vital-val">{selectedVisitForModal.vitals?.oxygenSaturation || '—'} %</span>
                  </div>
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Height / Weight</span>
                    <span className="nth-modal-vital-val">
                      {selectedVisitForModal.vitals?.height ? `${selectedVisitForModal.vitals.height} cm` : '—'} /{' '}
                      {selectedVisitForModal.vitals?.weight ? `${selectedVisitForModal.vitals.weight} kg` : '—'}
                    </span>
                  </div>
                  <div className="nth-modal-vital-card">
                    <span className="nth-modal-vital-label">Calculated BMI</span>
                    <span className="nth-modal-vital-val">
                      {calculateBmi(selectedVisitForModal.vitals?.weight, selectedVisitForModal.vitals?.height)?.value || '—'}{' '}
                      <small>({calculateBmi(selectedVisitForModal.vitals?.weight, selectedVisitForModal.vitals?.height)?.category || 'N/A'})</small>
                    </span>
                  </div>
                </div>
              </div>

              {/* Department Specific Vitals */}
              {selectedVisitForModal.vitals?.dynamicVitals && Object.keys(selectedVisitForModal.vitals.dynamicVitals).length > 0 && (
                <div className="nth-modal-section">
                  <h4>Department-Specific Dynamic Vitals</h4>
                  <div className="nth-modal-dynamic-grid">
                    {Object.entries(selectedVisitForModal.vitals.dynamicVitals).map(([k, v]) => (
                      <div key={k} className="nth-modal-dynamic-item">
                        <span className="nth-modal-dynamic-key">{k}:</span>
                        <span className="nth-modal-dynamic-val">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chief Complaint & History */}
              <div className="nth-modal-section">
                <h4>Chief Complaint &amp; Clinical Notes</h4>
                <p className="nth-modal-notes">
                  {selectedVisitForModal.vitals?.chiefComplaint || selectedVisitForModal.reasonForVisit || 'No specific complaint recorded.'}
                </p>
              </div>

              {/* Allergies & Operations */}
              {(selectedVisitForModal.patientId?.allergies || selectedVisitForModal.patientId?.operations) && (
                <div className="nth-modal-section">
                  <h4>Medical &amp; Surgical Background</h4>
                  {selectedVisitForModal.patientId?.allergies && (
                    <p className="nth-modal-allergy">
                      <strong>Allergies:</strong> {selectedVisitForModal.patientId.allergies}
                    </p>
                  )}
                  {selectedVisitForModal.patientId?.operations && (
                    <p className="nth-modal-operations">
                      <strong>Past Operations:</strong> {selectedVisitForModal.patientId.operations}
                    </p>
                  )}
                </div>
              )}

              {/* Clinical Metadata */}
              <div className="nth-modal-section">
                <h4>Consultation Routing Details</h4>
                <div className="nth-modal-meta-grid">
                  <div><strong>Attending Doctor:</strong> {formatDoctorName(selectedVisitForModal.consultation?.doctorId || 'Assigned Physician')}</div>
                  <div><strong>Encounter Status:</strong> {selectedVisitForModal.status}</div>
                  <div><strong>Visit Type:</strong> {selectedVisitForModal.visitType || 'OPD'}</div>
                  <div><strong>Check-in Arrival:</strong> {formatDateTime(selectedVisitForModal.createdAt)}</div>
                </div>
              </div>
            </div>

            <div className="nth-modal-footer">
              <Md3Button variant="primary" onClick={() => setSelectedVisitForModal(null)}>
                Close Details
              </Md3Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NurseTriageHistoryView;
