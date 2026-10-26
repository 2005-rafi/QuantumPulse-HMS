import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitAPI } from '../../services/visitAPI';
import { useAuth } from '../../context/AuthContext';
import { Md3Avatar } from '../../components/md3/Md3Widgets';
import { formatPatientName, getPatientInitials, formatDoctorName, formatVisitStatus } from '../../utils/patientFormatters';
import './DoctorConsultationHistory.css';

/**
 * DoctorConsultationHistory — Enterprise Material Design 3 Clinical Encounters Tracking Hub
 *
 * Capabilities:
 * 1. Infinite Horizontal & Vertical Layout Expansion (Desktop fluid multi-column, Tablet dual, Mobile single).
 * 2. Date-Wise Chronological Segregation with sticky date headers and encounter telemetry.
 * 3. Full Modality & State Tracking: OPD (Outpatient), IPD (Inpatient Ward), and Emergency.
 * 4. Rich search, modality chips, date presets, and status filter matrix.
 * 5. Interactive Material 3 Clinical Encounter Detail Dialog.
 */
export const DoctorConsultationHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Query and filter states
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState('ALL'); // ALL, OPD, IPD, EMERGENCY
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // ALL, TODAY, YESTERDAY, LAST_7_DAYS, THIS_MONTH, CUSTOM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  // UI interaction states
  const [collapsedDates, setCollapsedDates] = useState({});
  const [selectedEncounterDetail, setSelectedEncounterDetail] = useState(null);

  // Calculate resolved start & end dates based on dateFilterMode
  const { resolvedStartDate, resolvedEndDate } = useMemo(() => {
    if (dateFilterMode === 'ALL') return { resolvedStartDate: undefined, resolvedEndDate: undefined };

    const now = new Date();
    if (dateFilterMode === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return { resolvedStartDate: todayStr, resolvedEndDate: todayStr };
    }
    if (dateFilterMode === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { resolvedStartDate: yStr, resolvedEndDate: yStr };
    }
    if (dateFilterMode === 'LAST_7_DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return { resolvedStartDate: past.toISOString().split('T')[0], resolvedEndDate: now.toISOString().split('T')[0] };
    }
    if (dateFilterMode === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { resolvedStartDate: firstDay.toISOString().split('T')[0], resolvedEndDate: now.toISOString().split('T')[0] };
    }
    if (dateFilterMode === 'CUSTOM') {
      return { resolvedStartDate: customStartDate || undefined, resolvedEndDate: customEndDate || undefined };
    }
    return { resolvedStartDate: undefined, resolvedEndDate: undefined };
  }, [dateFilterMode, customStartDate, customEndDate]);

  // Fetch consultation history from backend
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        q: searchQuery,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        visitType: selectedModality !== 'ALL' ? selectedModality : undefined,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
      };
      const res = await visitAPI.getDoctorConsultationHistory(params);
      const data = res.data?.data || res.data || {};
      const items = data.items || [];
      setVisits(items);
      setTotalRecords(data.total || items.length);
    } catch (err) {
      console.error('[DoctorConsultationHistory] fetch error', err);
      setVisits([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedModality, resolvedStartDate, resolvedEndDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  // Date-wise Grouping Algorithm
  const dateGroups = useMemo(() => {
    const groups = {};
    visits.forEach((visit) => {
      const dateVal = visit.consultation?.recordedAt || visit.createdAt;
      let dateKey = 'Unknown Date';
      let sortTimestamp = 0;
      if (dateVal) {
        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateKey = `${year}-${month}-${day}`;
            sortTimestamp = new Date(year, d.getMonth(), d.getDate()).getTime();
          }
        } catch {
          dateKey = 'Unknown Date';
        }
      }
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          sortTimestamp,
          visits: [],
        };
      }
      groups[dateKey].visits.push(visit);
    });

    return Object.values(groups).sort((a, b) => b.sortTimestamp - a.sortTimestamp);
  }, [visits]);

  // Telemetry metric counters
  const metrics = useMemo(() => {
    let opdCount = 0;
    let ipdCount = 0;
    let emergencyCount = 0;
    let finalizedCount = 0;

    visits.forEach((v) => {
      const type = (v.visitType || 'OPD').toUpperCase();
      if (type === 'IPD') ipdCount++;
      else if (type === 'EMERGENCY') emergencyCount++;
      else opdCount++;

      if (v.consultation?.status === 'FINALIZED' || v.status === 'COMPLETED') {
        finalizedCount++;
      }
    });

    return { opdCount, ipdCount, emergencyCount, finalizedCount };
  }, [visits]);

  // Friendly date label formatter
  const getFriendlyDateLabel = (dateKey) => {
    if (dateKey === 'Unknown Date') return 'Uncategorized Encounters';
    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const isToday =
        targetDate.getFullYear() === today.getFullYear() &&
        targetDate.getMonth() === today.getMonth() &&
        targetDate.getDate() === today.getDate();

      const isYesterday =
        targetDate.getFullYear() === yesterday.getFullYear() &&
        targetDate.getMonth() === yesterday.getMonth() &&
        targetDate.getDate() === yesterday.getDate();

      const formatted = targetDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (isToday) return `Today • ${formatted}`;
      if (isYesterday) return `Yesterday • ${formatted}`;
      return formatted;
    } catch {
      return dateKey;
    }
  };

  // Toggle collapse for a date section
  const toggleDateCollapse = (dateKey) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const collapseAllDates = () => {
    const all = {};
    dateGroups.forEach((g) => {
      all[g.dateKey] = true;
    });
    setCollapsedDates(all);
  };

  const expandAllDates = () => {
    setCollapsedDates({});
  };

  const cleanDocName = formatDoctorName(user?.fullName || user?.firstName || 'Physician');

  return (
    <div className="md3-doc-history-page">
      {/* ── 1. HERO TELEMETRY & WORKSPACE BANNER ── */}
      <div className="md3-doc-history-hero">
        <div className="md3-doc-hero-main">
          <div className="md3-doc-hero-avatar">
            <span className="material-symbols-rounded">medical_information</span>
          </div>
          <div className="md3-doc-hero-content">
            <h1 className="md3-doc-hero-title">
              <span>Consultation History &amp; Patient Care Records</span>
            </h1>
            <p className="md3-doc-hero-subtitle">
              Comprehensive chronological audit trail of clinical encounters, diagnoses, prescriptions &amp; immutable clinical notes documented by <strong>{cleanDocName}</strong>
            </p>
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        {/* Telemetry Stats Bar with OnTap filtering */}
        <div className="md3-doc-telemetry-deck" role="region" aria-label="Consultation Metrics">
          <div
            className="md3-doc-telemetry-card"
            onClick={() => {
              setSelectedModality('ALL');
              setSelectedStatus('ALL');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSelectedModality('ALL');
                setSelectedStatus('ALL');
              }
            }}
            title="Click to view all encounters"
          >
            <span className="md3-telemetry-icon primary">
              <span className="material-symbols-rounded">clinical_notes</span>
            </span>
            <div className="md3-telemetry-text">
              <span className="md3-telemetry-val">{totalRecords}</span>
              <span className="md3-telemetry-lbl">Total Encounters</span>
            </div>
          </div>

          <div
            className="md3-doc-telemetry-card"
            onClick={() => setSelectedStatus('COMPLETED')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedStatus('COMPLETED')}
            title="Click to filter locked/finalized encounters"
          >
            <span className="md3-telemetry-icon success">
              <span className="material-symbols-rounded">lock</span>
            </span>
            <div className="md3-telemetry-text">
              <span className="md3-telemetry-val">{metrics.finalizedCount}</span>
              <span className="md3-telemetry-lbl">Locked / Finalized</span>
            </div>
          </div>

          <div
            className="md3-doc-telemetry-card"
            onClick={() => setSelectedModality('OPD')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedModality('OPD')}
            title="Click to filter Outpatient (OPD) consultations"
          >
            <span className="md3-telemetry-icon opd">
              <span className="material-symbols-rounded">stethoscope</span>
            </span>
            <div className="md3-telemetry-text">
              <span className="md3-telemetry-val">{metrics.opdCount}</span>
              <span className="md3-telemetry-lbl">OPD Consultations</span>
            </div>
          </div>

          <div
            className="md3-doc-telemetry-card"
            onClick={() => setSelectedModality('IPD')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedModality('IPD')}
            title="Click to filter Inpatient (IPD) encounters"
          >
            <span className="md3-telemetry-icon ipd">
              <span className="material-symbols-rounded">hotel</span>
            </span>
            <div className="md3-telemetry-text">
              <span className="md3-telemetry-val">{metrics.ipdCount}</span>
              <span className="md3-telemetry-lbl">Inpatient (IPD)</span>
            </div>
          </div>

          <div
            className="md3-doc-telemetry-card"
            onClick={() => setSelectedModality('EMERGENCY')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedModality('EMERGENCY')}
            title="Click to filter Emergency / Acute cases"
          >
            <span className="md3-telemetry-icon emergency">
              <span className="material-symbols-rounded">e911_emergency</span>
            </span>
            <div className="md3-telemetry-text">
              <span className="md3-telemetry-val">{metrics.emergencyCount}</span>
              <span className="md3-telemetry-lbl">Emergency Cases</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH CONTROL MATRIX ── */}
      <div className="md3-doc-controls-card">
        {/* Row 1: Search Bar & Modality Segments */}
        <div className="md3-doc-controls-row">
          <div className="md3-doc-search-box">
            <span className="material-symbols-rounded md3-search-icon">search</span>
            <input
              type="text"
              className="md3-search-input"
              placeholder="Search across patient name, MRN, encounter token, diagnosis, symptoms, medications…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search patient encounters"
            />
            {searchQuery && (
              <button
                type="button"
                className="md3-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          {/* Care Modality Filter Chips (OPD, IPD, EMERGENCY) */}
          <div className="md3-modality-segment-group" role="radiogroup" aria-label="Care Modality">
            {[
              { id: 'ALL', label: 'All Modalities', icon: 'layers' },
              { id: 'OPD', label: 'OPD Outpatient', icon: 'stethoscope' },
              { id: 'IPD', label: 'IPD Inpatient', icon: 'hotel' },
              { id: 'EMERGENCY', label: 'Emergency / Acute', icon: 'e911_emergency' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selectedModality === m.id}
                className={`md3-modality-btn ${selectedModality === m.id ? 'active ' + m.id.toLowerCase() : ''}`}
                onClick={() => setSelectedModality(m.id)}
              >
                <span className="material-symbols-rounded">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedModality === 'IPD' && (
          <div className="doc-ipd-callout-banner">
            <div className="callout-left">
              <span className="material-symbols-rounded">hotel</span>
              <div>
                <strong>Looking for Inpatient Stay History & Full Case Files?</strong>
                <span>Review all past admissions, daily SOAP ward rounds, CPOE orders, and discharge summaries in the dedicated Inpatient History Manager.</span>
              </div>
            </div>
            <button
              type="button"
              className="callout-btn"
              onClick={() => navigate('/dashboard/doctor/ipd')}
            >
              <span>Open Inpatient History Manager</span>
              <span className="material-symbols-rounded">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Row 2: Date Range Presets & Status Chips */}
        <div className="md3-doc-controls-secondary">
          {/* Date Range Chips */}
          <div className="md3-date-filter-deck">
            <span className="md3-filter-group-label">
              <span className="material-symbols-rounded">calendar_today</span>
              <span>Date Filter:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Past 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Range…' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                className={`md3-date-chip ${dateFilterMode === d.id ? 'active' : ''}`}
                onClick={() => setDateFilterMode(d.id)}
              >
                {d.label}
              </button>
            ))}

            {dateFilterMode === 'CUSTOM' && (
              <div className="md3-custom-date-inputs">
                <input
                  type="date"
                  className="md3-date-input"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  title="From Date"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>to</span>
                <input
                  type="date"
                  className="md3-date-input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  title="To Date"
                />
              </div>
            )}
          </div>

          {/* Status Matrix */}
          <div className="md3-status-filter-deck">
            <span className="md3-filter-group-label">
              <span className="material-symbols-rounded">filter_list</span>
              <span>Status:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Statuses' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'WAITING_PHARMACY', label: 'Rx Dispensing' },
              { id: 'WAITING_LAB', label: 'Lab Pending' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                className={`md3-status-chip ${selectedStatus === s.id ? 'active' : ''}`}
                onClick={() => setSelectedStatus(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Timeline View Controls */}
          {dateGroups.length > 1 && (
            <div className="md3-timeline-view-actions">
              <button
                type="button"
                className="md3-text-btn"
                onClick={expandAllDates}
                title="Expand all date sections"
              >
                <span className="material-symbols-rounded">unfold_more</span>
                <span>Expand All</span>
              </button>
              <button
                type="button"
                className="md3-text-btn"
                onClick={collapseAllDates}
                title="Collapse all date sections"
              >
                <span className="material-symbols-rounded">unfold_less</span>
                <span>Collapse All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. DATE-WISE SEGREGATED TIMELINE CONTENT ── */}
      <div className="md3-doc-timeline-feed">
        {loading ? (
          <div className="md3-feed-loading-box">
            <span className="md3-spinner" />
            <span className="md3-loading-text">Retrieving patient consultation records &amp; clinical logs…</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="md3-feed-empty-box">
            <div className="md3-empty-icon-wrap">
              <span className="material-symbols-rounded">event_busy</span>
            </div>
            <h3 className="md3-empty-title">No consultation records match your filter</h3>
            <p className="md3-empty-subtitle">
              {searchQuery || selectedModality !== 'ALL' || selectedStatus !== 'ALL' || dateFilterMode !== 'ALL'
                ? 'Try adjusting your search keywords, clearing date filters, or switching care modalities.'
                : 'Consultation encounters finalized or recorded by you across OPD, IPD, and Emergency will appear here automatically.'}
            </p>
            {(searchQuery || selectedModality !== 'ALL' || selectedStatus !== 'ALL' || dateFilterMode !== 'ALL') && (
              <button
                type="button"
                className="md3-reset-filter-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModality('ALL');
                  setSelectedStatus('ALL');
                  setDateFilterMode('ALL');
                }}
              >
                <span className="material-symbols-rounded">filter_alt_off</span>
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          dateGroups.map((group) => {
            const isCollapsed = Boolean(collapsedDates[group.dateKey]);
            const friendlyDate = getFriendlyDateLabel(group.dateKey);

            // Group breakdown
            let opdInGroup = 0;
            let ipdInGroup = 0;
            let emgInGroup = 0;
            group.visits.forEach((v) => {
              const t = (v.visitType || 'OPD').toUpperCase();
              if (t === 'IPD') ipdInGroup++;
              else if (t === 'EMERGENCY') emgInGroup++;
              else opdInGroup++;
            });

            return (
              <section key={group.dateKey} className="md3-date-section">
                {/* Sticky Material 3 Date Section Header */}
                <div
                  className="md3-date-header"
                  onClick={() => toggleDateCollapse(group.dateKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleDateCollapse(group.dateKey)}
                  title="Click to expand/collapse date encounters"
                >
                  <div className="md3-date-header-left">
                    <span className="md3-date-badge-icon">
                      <span className="material-symbols-rounded">event</span>
                    </span>
                    <div className="md3-date-title-wrap">
                      <h3 className="md3-date-heading">{friendlyDate}</h3>
                      <span className="md3-date-subtext">
                        {group.visits.length} {group.visits.length === 1 ? 'Patient Encounter' : 'Patient Encounters'}
                      </span>
                    </div>
                  </div>

                  <div className="md3-date-header-right">
                    <div className="md3-date-pills-row">
                      {opdInGroup > 0 && <span className="md3-modality-mini-pill opd">{opdInGroup} OPD</span>}
                      {ipdInGroup > 0 && <span className="md3-modality-mini-pill ipd">{ipdInGroup} IPD</span>}
                      {emgInGroup > 0 && <span className="md3-modality-mini-pill emg">{emgInGroup} Emergency</span>}
                    </div>
                    <span className={`material-symbols-rounded md3-collapse-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Fluid Grid of Patient Encounter Cards */}
                {!isCollapsed && (
                  <div className="md3-encounters-grid">
                    {group.visits.map((visit) => {
                      const patient = visit.patientId || {};
                      const fullName = formatPatientName(patient) || 'Unknown Patient';
                      const initials = getPatientInitials(patient);
                      const age = patient.age ? `${patient.age} yrs` : '';
                      const gender = patient.gender || '';
                      const demographics = [age, gender].filter(Boolean).join(' • ');
                      const token = visit.tokenString || visit.visitNumber || 'N/A';
                      const modality = (visit.visitType || 'OPD').toUpperCase();

                      const consultDate = visit.consultation?.recordedAt || visit.createdAt;
                      let timeFormatted = '—';
                      if (consultDate) {
                        try {
                          const parsed = new Date(consultDate);
                          if (!isNaN(parsed.getTime())) {
                            timeFormatted = parsed.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            });
                          }
                        } catch {
                          timeFormatted = '—';
                        }
                      }

                      const diagnosis = visit.consultation?.diagnosis || 'Clinical evaluation completed';
                      const chiefComplaint = visit.vitals?.chiefComplaint || visit.consultation?.chiefComplaint || visit.reasonForVisit;
                      const notes = visit.consultation?.notes || 'Patient examined, advised treatment, and instructed on follow-up.';
                      const isFinalized = visit.consultation?.status === 'FINALIZED' || visit.status === 'COMPLETED';

                      const rawMeds = Array.isArray(visit.prescribedMedications)
                        ? visit.prescribedMedications
                        : (Array.isArray(visit.consultation?.prescribedMedications) ? visit.consultation.prescribedMedications : []);
                      const meds = rawMeds.filter(Boolean);

                      const rawLabs = Array.isArray(visit.labOrders) ? visit.labOrders : [];
                      const labOrders = rawLabs.filter(Boolean);

                      // Modality Pill Config
                      let modalityClass = 'opd';
                      let modalityIcon = 'stethoscope';
                      let modalityLabel = 'OPD';
                      if (modality === 'IPD') {
                        modalityClass = 'ipd';
                        modalityIcon = 'hotel';
                        modalityLabel = visit.admission?.bedNumber ? `IPD • Bed ${visit.admission.bedNumber}` : 'IPD Ward';
                      } else if (modality === 'EMERGENCY') {
                        modalityClass = 'emergency';
                        modalityIcon = 'e911_emergency';
                        modalityLabel = visit.triageLevel ? `EMERGENCY • Acuity Level ${visit.triageLevel}` : 'EMERGENCY';
                      }

                      return (
                        <article
                          key={visit._id || visit.id || Math.random()}
                          className={`md3-encounter-card ${modalityClass}-accent`}
                          onClick={() => setSelectedEncounterDetail(visit)}
                        >
                          {/* Card Top: Avatar, Patient Name, Token & Timestamp */}
                          <div className="md3-ec-top">
                            <div className="md3-ec-patient-block">
                              <Md3Avatar initials={initials} size="small" variant={modalityClass === 'emergency' ? 'error' : modalityClass === 'ipd' ? 'tertiary' : 'primary'} />
                              <div className="md3-ec-identity">
                                <h4 className="md3-ec-name" title={fullName}>
                                  {fullName}
                                </h4>
                                <span className="md3-ec-demographics">
                                  {demographics || 'Demographics on file'}
                                </span>
                              </div>
                            </div>

                            <div className="md3-ec-token-time">
                              <span className="md3-ec-token">{token}</span>
                              <span className="md3-ec-time">
                                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>schedule</span>
                                <span>{timeFormatted}</span>
                              </span>
                            </div>
                          </div>

                          {/* Sub-header: MRN, Blood Group & Modality Badge */}
                          <div className="md3-ec-sub-header">
                            <span className="md3-ec-mrn">
                              <strong>MRN:</strong> {patient.mrn || 'N/A'}
                            </span>
                            <div className="md3-ec-sub-badges">
                              {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                                <span className="md3-ec-blood-pill">
                                  {patient.bloodGroup}
                                </span>
                              )}
                              <span className={`md3-ec-modality-pill ${modalityClass}`}>
                                <span className="material-symbols-rounded">{modalityIcon}</span>
                                <span>{modalityLabel}</span>
                              </span>
                            </div>
                          </div>

                          {/* Clinical Diagnosis Block */}
                          <div className="md3-ec-diagnosis-block">
                            <span className="md3-ec-section-label">
                              <span className="material-symbols-rounded">stethoscope</span>
                              <span>Clinical Diagnosis</span>
                            </span>
                            <div className="md3-ec-diagnosis-text">{diagnosis}</div>
                            {chiefComplaint && (
                              <div className="md3-ec-complaint">
                                <strong>Symptoms:</strong> {chiefComplaint}
                              </div>
                            )}
                          </div>

                          {/* Immutable Doctor Clinical Observations */}
                          <div className="md3-ec-notes-box">
                            <div className="md3-ec-notes-header">
                              <span className="md3-ec-notes-title">
                                <span className="material-symbols-rounded">edit_note</span>
                                <span>Doctor Clinical Observation</span>
                              </span>
                              <span className="md3-ec-locked-pill" title="Locked clinical record">
                                <span className="material-symbols-rounded">lock</span>
                                <span>Immutable</span>
                              </span>
                            </div>
                            <div className="md3-ec-notes-body">{notes}</div>
                          </div>

                          {/* Structured Prescribed Medications Deck */}
                          {meds.length > 0 && (
                            <div className="md3-ec-rx-deck">
                              <span className="md3-ec-section-label">
                                <span className="material-symbols-rounded">pill</span>
                                <span>Prescribed Medications ({meds.length})</span>
                              </span>
                              <div className="md3-ec-rx-list">
                                {meds.slice(0, 3).map((m, idx) => {
                                  const medName = typeof m === 'string' ? m : (m?.name || m?.medicineName || m?.drugName || 'Medication');
                                  const medDosing = typeof m === 'object'
                                    ? [m?.dosage, m?.frequency, m?.duration].filter(Boolean).join(' • ')
                                    : '';
                                  return (
                                    <div key={idx} className="md3-ec-rx-pill">
                                      <span className="md3-ec-rx-drug">{medName}</span>
                                      {medDosing && <span className="md3-ec-rx-schedule">{medDosing}</span>}
                                    </div>
                                  );
                                })}
                                {meds.length > 3 && (
                                  <span className="md3-ec-rx-more">+{meds.length - 3} more medications</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Lab Investigations Status */}
                          {labOrders.length > 0 && (
                            <div className="md3-ec-lab-bar">
                              <span className="md3-ec-lab-label">
                                <span className="material-symbols-rounded">science</span>
                                <span>Lab Orders ({labOrders.length} tests)</span>
                              </span>
                              <span className={`md3-ec-lab-status ${labOrders.every(l => l?.status === 'COMPLETED') ? 'ready' : 'pending'}`}>
                                {labOrders.every(l => l?.status === 'COMPLETED') ? 'Results Ready' : 'In Progress'}
                              </span>
                            </div>
                          )}

                          {/* Card Footer: Status & Attending Clinician */}
                          <div className="md3-ec-footer">
                            <span className={`md3-ec-status-badge ${isFinalized ? 'finalized' : 'active'}`}>
                              {isFinalized ? 'Finalized & Concluded' : (visit.status ? formatVisitStatus(visit.status) : 'Active')}
                            </span>
                            <span className="md3-ec-doctor-tag">
                              <span>Attending: {cleanDocName}</span>
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* ── 4. CLINICAL ENCOUNTER DETAIL DIALOG (MATERIAL 3 STRUCTURED MODAL) ── */}
      {selectedEncounterDetail && (() => {
        const p = selectedEncounterDetail.patientId || {};
        const patientName = formatPatientName(p);
        const patientInitials = getPatientInitials(p);
        const consult = selectedEncounterDetail.consultation || {};
        const vitals = selectedEncounterDetail.vitals || {};
        const modality = (selectedEncounterDetail.visitType || 'OPD').toUpperCase();
        const modalityClass = modality === 'EMERGENCY' ? 'emergency' : modality === 'IPD' ? 'ipd' : 'opd';
        const isFinalized = consult.status === 'FINALIZED' || selectedEncounterDetail.status === 'COMPLETED';
        const encounterToken = selectedEncounterDetail.tokenString || selectedEncounterDetail.visitNumber || 'N/A';
        const recordedDate = consult.recordedAt || selectedEncounterDetail.createdAt;
        const formattedDate = recordedDate
          ? new Date(recordedDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
          : 'Date not recorded';

        const meds = (selectedEncounterDetail.prescribedMedications && selectedEncounterDetail.prescribedMedications.length > 0)
          ? selectedEncounterDetail.prescribedMedications
          : (consult.prescribedMedications || []);

        const labs = (selectedEncounterDetail.labOrders && selectedEncounterDetail.labOrders.length > 0)
          ? selectedEncounterDetail.labOrders
          : (consult.labOrders || []);

        // Check if any vitals are available
        const hasVitals = vitals.bloodPressure || vitals.bp || vitals.heartRate || vitals.pulse ||
          vitals.temperature || vitals.temp || vitals.oxygenSaturation || vitals.spo2 ||
          vitals.respiratoryRate || vitals.rr || vitals.weight || vitals.bmi;

        const symptoms = vitals.chiefComplaint || consult.chiefComplaint || selectedEncounterDetail.reasonForVisit;

        return (
          <div className="md3-dialog-backdrop" onClick={() => setSelectedEncounterDetail(null)}>
            <div className="md3-dialog-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
              {/* Modal Header */}
              <div className="md3-dialog-header">
                <div className="md3-dialog-header-left">
                  <div className="md3-dialog-avatar">
                    <Md3Avatar initials={patientInitials} size="small" variant={modalityClass === 'emergency' ? 'error' : modalityClass === 'ipd' ? 'tertiary' : 'primary'} />
                  </div>
                  <div className="md3-dialog-header-title-group">
                    <div className="md3-dialog-title-row">
                      <h2 id="dialog-title" className="md3-dialog-title">
                        {patientName}
                      </h2>
                      <span className="md3-dialog-token-pill">{encounterToken}</span>
                      <span className={`md3-ec-modality-pill ${modalityClass}`}>
                        <span className="material-symbols-rounded">
                          {modality === 'IPD' ? 'hotel' : modality === 'EMERGENCY' ? 'e911_emergency' : 'stethoscope'}
                        </span>
                        <span>{modality}</span>
                      </span>
                      <span className={`md3-ec-status-badge ${isFinalized ? 'finalized' : 'active'}`}>
                        {isFinalized ? 'Locked & Finalized' : 'In Progress'}
                      </span>
                    </div>
                    <div className="md3-dialog-subtitle">
                      <span className="material-symbols-rounded">event</span>
                      <span>Encounter recorded on {formattedDate}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="md3-dialog-close-btn"
                  onClick={() => setSelectedEncounterDetail(null)}
                  title="Close encounter details"
                  aria-label="Close dialog"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="md3-dialog-body">
                {/* 1. Patient Demographics & Identification Matrix */}
                <div className="md3-dialog-card-section">
                  <div className="md3-dialog-section-header">
                    <span className="md3-dialog-section-icon">
                      <span className="material-symbols-rounded">person</span>
                    </span>
                    <h3 className="md3-dialog-section-title">Patient Identification &amp; Demographics</h3>
                  </div>
                  <div className="md3-dialog-data-grid">
                    <div className="md3-dialog-data-cell">
                      <span className="md3-data-label">Medical Record Number (MRN)</span>
                      <span className="md3-data-value mrn-code">{p.mrn || '—'}</span>
                    </div>
                    <div className="md3-dialog-data-cell">
                      <span className="md3-data-label">Age &amp; Gender</span>
                      <span className="md3-data-value">{p.age ? `${p.age} yrs` : '—'} • {p.gender || '—'}</span>
                    </div>
                    <div className="md3-dialog-data-cell">
                      <span className="md3-data-label">Blood Group</span>
                      <span className="md3-data-value">
                        {p.bloodGroup && p.bloodGroup !== 'Unknown' ? (
                          <span className="md3-blood-badge">{p.bloodGroup}</span>
                        ) : 'Not Documented'}
                      </span>
                    </div>
                    <div className="md3-dialog-data-cell">
                      <span className="md3-data-label">Contact Number</span>
                      <span className="md3-data-value">{p.phoneNumber || p.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Clinical Vitals Telemetry (When recorded) */}
                {hasVitals && (
                  <div className="md3-dialog-card-section">
                    <div className="md3-dialog-section-header">
                      <span className="md3-dialog-section-icon vitals">
                        <span className="material-symbols-rounded">monitor_heart</span>
                      </span>
                      <h3 className="md3-dialog-section-title">Clinical Vitals Telemetry</h3>
                    </div>
                    <div className="md3-dialog-vitals-grid">
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">speed</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Blood Pressure</span>
                          <span className="md3-vitals-val">{vitals.bloodPressure || vitals.bp || '—'} <small>mmHg</small></span>
                        </div>
                      </div>
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">favorite</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Heart Rate</span>
                          <span className="md3-vitals-val">{vitals.heartRate || vitals.pulse || '—'} <small>bpm</small></span>
                        </div>
                      </div>
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">device_thermostat</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Temperature</span>
                          <span className="md3-vitals-val">{vitals.temperature || vitals.temp || '—'} <small>°F</small></span>
                        </div>
                      </div>
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">air</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Oxygen Saturation</span>
                          <span className="md3-vitals-val">{vitals.oxygenSaturation || vitals.spo2 || '—'} <small>%</small></span>
                        </div>
                      </div>
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">pulmonology</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Respiratory Rate</span>
                          <span className="md3-vitals-val">{vitals.respiratoryRate || vitals.rr || '—'} <small>/min</small></span>
                        </div>
                      </div>
                      <div className="md3-vitals-cell">
                        <span className="md3-vitals-icon"><span className="material-symbols-rounded">scale</span></span>
                        <div className="md3-vitals-content">
                          <span className="md3-vitals-lbl">Weight / BMI</span>
                          <span className="md3-vitals-val">
                            {vitals.weight ? `${vitals.weight} kg` : ''}
                            {vitals.bmi ? ` • BMI ${vitals.bmi}` : (!vitals.weight ? '—' : '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Clinical Findings & Diagnoses */}
                <div className="md3-dialog-card-section">
                  <div className="md3-dialog-section-header">
                    <span className="md3-dialog-section-icon diagnosis">
                      <span className="material-symbols-rounded">stethoscope</span>
                    </span>
                    <h3 className="md3-dialog-section-title">Clinical Findings &amp; Diagnosis</h3>
                  </div>
                  <div className="md3-dialog-diagnosis-box">
                    <div className="md3-diagnosis-primary-row">
                      <span className="md3-diagnosis-tag">Primary Diagnosis</span>
                      <span className="md3-diagnosis-title">
                        {consult.diagnosis || 'Clinical evaluation completed'}
                      </span>
                    </div>
                    {symptoms && (
                      <div className="md3-diagnosis-detail-row">
                        <span className="md3-diagnosis-sublabel">Presenting Symptoms / Chief Complaints:</span>
                        <span className="md3-diagnosis-subtext">{symptoms}</span>
                      </div>
                    )}
                    {consult.treatmentPlan && (
                      <div className="md3-diagnosis-detail-row">
                        <span className="md3-diagnosis-sublabel">Treatment &amp; Care Protocol:</span>
                        <span className="md3-diagnosis-subtext">{consult.treatmentPlan}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Immutable Attending Doctor Clinical Observations */}
                <div className="md3-dialog-card-section">
                  <div className="md3-dialog-section-header">
                    <span className="md3-dialog-section-icon notes">
                      <span className="material-symbols-rounded">edit_note</span>
                    </span>
                    <h3 className="md3-dialog-section-title">Doctor Clinical Observations</h3>
                    <span className="md3-ec-locked-pill" title="Locked clinical record">
                      <span className="material-symbols-rounded">lock</span>
                      <span>Immutable Clinical Record</span>
                    </span>
                  </div>
                  <div className="md3-dialog-notes-box">
                    <div className="md3-dialog-notes-content">
                      {consult.notes || 'Patient examined and advised on clinical protocol.'}
                    </div>
                    <div className="md3-dialog-notes-signature">
                      <span className="material-symbols-rounded">verified_user</span>
                      <span>Documented by <strong>{cleanDocName}</strong></span>
                    </div>
                  </div>
                </div>

                {/* 5. Prescribed Medications Table */}
                {meds.length > 0 && (
                  <div className="md3-dialog-card-section">
                    <div className="md3-dialog-section-header">
                      <span className="md3-dialog-section-icon rx">
                        <span className="material-symbols-rounded">pill</span>
                      </span>
                      <h3 className="md3-dialog-section-title">Prescribed Medications ({meds.length})</h3>
                    </div>
                    <div className="md3-dialog-table-wrapper">
                      <table className="md3-dialog-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Medication / Drug Name</th>
                            <th>Dosage &amp; Frequency</th>
                            <th>Duration</th>
                            <th>Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meds.map((m, idx) => {
                            const name = typeof m === 'string' ? m : (m?.name || m?.medicineName || m?.drugName || 'Medication');
                            const dosage = typeof m === 'object' ? (m?.dosage || '—') : '—';
                            const freq = typeof m === 'object' ? (m?.frequency || '—') : '—';
                            const duration = typeof m === 'object' ? (m?.duration || '—') : '—';
                            const instructions = typeof m === 'object' ? (m?.instructions || 'As directed') : 'As directed';

                            return (
                              <tr key={idx}>
                                <td className="row-num">{idx + 1}</td>
                                <td className="rx-name">
                                  <span className="rx-name-text">{name}</span>
                                </td>
                                <td>
                                  <span className="rx-badge">{dosage}</span>
                                  {freq !== '—' && <span className="rx-freq">{freq}</span>}
                                </td>
                                <td>{duration}</td>
                                <td className="rx-instructions">{instructions}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. Laboratory Investigations Table */}
                {labs.length > 0 && (
                  <div className="md3-dialog-card-section">
                    <div className="md3-dialog-section-header">
                      <span className="md3-dialog-section-icon lab">
                        <span className="material-symbols-rounded">science</span>
                      </span>
                      <h3 className="md3-dialog-section-title">Laboratory Investigations ({labs.length})</h3>
                    </div>
                    <div className="md3-dialog-table-wrapper">
                      <table className="md3-dialog-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Investigation / Test Name</th>
                            <th>Category / Code</th>
                            <th>Current Status</th>
                            <th>Clinical Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {labs.map((lo, idx) => {
                            const testName = lo?.testName || lo?.name || 'Laboratory Investigation';
                            const category = lo?.category || lo?.testCode || 'Diagnostic Lab';
                            const status = lo?.status || 'ORDERED';
                            const isDone = status === 'COMPLETED';
                            const instructions = lo?.instructions || lo?.notes || 'Standard protocol';

                            return (
                              <tr key={idx}>
                                <td className="row-num">{idx + 1}</td>
                                <td className="lab-test-name">
                                  <strong>{testName}</strong>
                                </td>
                                <td className="lab-cat">{category}</td>
                                <td>
                                  <span className={`md3-lab-order-badge ${isDone ? 'completed' : 'pending'}`}>
                                    <span className="material-symbols-rounded">
                                      {isDone ? 'check_circle' : 'hourglass_top'}
                                    </span>
                                    <span>{status.replace('_', ' ')}</span>
                                  </span>
                                </td>
                                <td className="lab-instructions">{instructions}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="md3-dialog-actions">
                <div className="md3-dialog-footer-info">
                  <span className="material-symbols-rounded">shield</span>
                  <span>Confidential Clinical Record • Authorized Personnel Only</span>
                </div>
                <button
                  type="button"
                  className="md3-dialog-btn secondary"
                  onClick={() => setSelectedEncounterDetail(null)}
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DoctorConsultationHistory;
