import React, { useState, useMemo } from 'react';
import { formatDoctorName } from '../../utils/patientFormatters';
import PrintableLabReportDialog from '../../features/laboratory/PrintableLabReportDialog';
import Md3ScanViewerDialog from './Md3ScanViewerDialog';
import { Md3Button } from './Md3FormComponents';
import './Md3PatientHistoryManager.css';

/**
 * Specimen Vacutainer Tube Badge Helper
 */
const getTubeColor = (sampleType, testName) => {
  const name = (testName || '').toLowerCase();
  const type = (sampleType || '').toLowerCase();
  if (name.includes('cbc') || name.includes('hemogram') || type.includes('edta')) {
    return { className: 'mph-tube--edta', label: 'EDTA Lavender Top', shortLabel: 'EDTA' };
  }
  if (name.includes('coagulation') || name.includes('pt/inr') || type.includes('citrate')) {
    return { className: 'mph-tube--citrate', label: 'Sodium Citrate Light Blue', shortLabel: 'Citrate' };
  }
  if (name.includes('glucose') || type.includes('fluoride')) {
    return { className: 'mph-tube--fluoride', label: 'Sodium Fluoride Gray', shortLabel: 'Fluoride' };
  }
  if (name.includes('culture') || type.includes('swab')) {
    return { className: 'mph-tube--sterile', label: 'Sterile Swab', shortLabel: 'Sterile' };
  }
  return { className: 'mph-tube--sst', label: 'SST Gold Top', shortLabel: 'SST Gold' };
};

/**
 * Resolve Live Hospital Location & Status
 */
const resolveHospitalLocation = (visit) => {
  const status = visit?.status;

  if (status === 'WAITING_DOCTOR_REVIEW') {
    return {
      label: 'At Doctor (Review Pending)',
      shortLabel: 'At Doctor',
      icon: 'stethoscope',
      className: 'mph-status-pill--doctor',
      pulse: true,
      description: 'Awaiting Attending Physician clinical assessment & review',
    };
  }
  if (status === 'WAITING_DOCTOR') {
    return {
      label: 'At Doctor (Queue)',
      shortLabel: 'Doctor Queue',
      icon: 'schedule',
      className: 'mph-status-pill--doctor',
      pulse: true,
      description: 'Waiting in line at Doctor Consultation desk',
    };
  }
  if (status === 'IN_PROGRESS') {
    return {
      label: 'In Doctor Consultation',
      shortLabel: 'In Consultation',
      icon: 'clinical_notes',
      className: 'mph-status-pill--progress',
      pulse: true,
      description: 'Currently inside consultation room with Attending Doctor',
    };
  }
  if (status === 'WAITING_LAB') {
    return {
      label: 'In Pathology / Analysis',
      shortLabel: 'In Pathology',
      icon: 'biotech',
      className: 'mph-status-pill--pathology',
      pulse: true,
      description: 'Specimen under active biochemical analysis in Laboratory',
    };
  }
  if (status === 'WAITING_BILLING') {
    return {
      label: 'At Billing / Cashier',
      shortLabel: 'At Billing',
      icon: 'point_of_sale',
      className: 'mph-status-pill--billing',
      pulse: false,
      description: 'Routed to Cashier desk for fee settlement and invoice generation',
    };
  }
  if (status === 'WAITING_PHARMACY') {
    return {
      label: 'At Pharmacy',
      shortLabel: 'At Pharmacy',
      icon: 'prescriptions',
      className: 'mph-status-pill--pharmacy',
      pulse: false,
      description: 'Prescription orders dispatched to dispensary counter',
    };
  }
  if (status === 'COMPLETED') {
    return {
      label: 'Encounter Completed',
      shortLabel: 'Completed',
      icon: 'check_circle',
      className: 'mph-status-pill--completed',
      pulse: false,
      description: 'Medical encounter, lab verification, and checkout completed',
    };
  }

  return {
    label: status?.replace(/_/g, ' ') || 'Dispatched',
    shortLabel: 'Dispatched',
    icon: 'done_all',
    className: 'mph-status-pill--default',
    pulse: false,
    description: 'Patient in hospital clinical care workflow',
  };
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Md3PatientHistoryManager — Enterprise Material Design 3 Patient History & Audit Hub
 * Reusable for Lab Doctors, Lab Nurses, Clinical Doctors, and Clinical Nurses.
 */
export const Md3PatientHistoryManager = ({
  history = [],
  isLoading = false,
  onRefresh,
  roleMode = 'universal', // 'lab_doctor' | 'lab_nurse' | 'clinical_doctor' | 'clinical_nurse' | 'universal'
  laboratories = [],
  title = 'Patient History & Clinical Audit Ledger',
  subtitle = 'Longitudinal tracking of past patient encounters, clinical whereabouts, pre-vitals, and diagnostic findings.',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH'
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' | 'oldest' | 'name' | 'token'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (Cards) | 'table' (High-density list)
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);
  const [activeScanReportId, setActiveScanReportId] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    let atDoctor = 0;
    let inPath = 0;
    let atBilling = 0;
    let completed = 0;

    history.forEach((v) => {
      const s = v.status;
      if (s === 'WAITING_DOCTOR_REVIEW' || s === 'WAITING_DOCTOR' || s === 'IN_PROGRESS') {
        atDoctor++;
      } else if (s === 'WAITING_LAB') {
        inPath++;
      } else if (s === 'WAITING_BILLING') {
        atBilling++;
      } else if (s === 'COMPLETED') {
        completed++;
      }
    });

    return {
      total: history.length,
      atDoctor,
      inPath,
      atBilling,
      completed,
    };
  }, [history]);

  // Filtered & Sorted List
  const filteredList = useMemo(() => {
    let list = history.filter((visit) => {
      // 1. Status Filter
      if (statusFilter === 'AT_DOCTOR') {
        if (!['WAITING_DOCTOR_REVIEW', 'WAITING_DOCTOR', 'IN_PROGRESS'].includes(visit.status)) return false;
      } else if (statusFilter === 'IN_PATHOLOGY') {
        if (visit.status !== 'WAITING_LAB') return false;
      } else if (statusFilter === 'AT_BILLING') {
        if (visit.status !== 'WAITING_BILLING') return false;
      } else if (statusFilter === 'COMPLETED') {
        if (visit.status !== 'COMPLETED') return false;
      }

      // 2. Date Filter
      const visitDate = new Date(visit.phlebotomyDispatchedAt || visit.updatedAt || visit.createdAt);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        if (visitDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const past7 = new Date();
        past7.setDate(past7.getDate() - 7);
        if (visitDate < past7) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        if (visitDate.getMonth() !== now.getMonth() || visitDate.getFullYear() !== now.getFullYear()) return false;
      }

      // 3. Search Term Filter (Patient name, MRN, token, doctor, nurse, pathologist, test name)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const p = visit.patientId || {};
        const pName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || '';
        const mrn = p.mrn || '';
        const token = visit.tokenString || (visit.visitNumber || '');
        const doctor = formatDoctorName(visit.referredBy || visit.consultation?.doctorId || '');
        const nurse = (visit.phlebotomyDispatchedBy?.fullName || visit.phlebotomyDispatchedBy?.firstName || '').toLowerCase();
        const hasTestMatch = (visit.labOrders || []).some((o) =>
          (o.testName || '').toLowerCase().includes(q) ||
          (o.pathologistVerification?.verifiedBy?.fullName || '').toLowerCase().includes(q)
        );

        if (
          !pName.toLowerCase().includes(q) &&
          !mrn.toLowerCase().includes(q) &&
          !token.toLowerCase().includes(q) &&
          !doctor.toLowerCase().includes(q) &&
          !nurse.includes(q) &&
          !hasTestMatch
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortOrder === 'oldest') {
        const dateA = new Date(a.phlebotomyDispatchedAt || a.createdAt).getTime();
        const dateB = new Date(b.phlebotomyDispatchedAt || b.createdAt).getTime();
        return dateA - dateB;
      }
      if (sortOrder === 'name') {
        const nameA = a.patientId?.firstName || a.patientId?.name || '';
        const nameB = b.patientId?.firstName || b.patientId?.name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === 'token') {
        const tokenA = a.tokenString || '';
        const tokenB = b.tokenString || '';
        return tokenA.localeCompare(tokenB);
      }
      // default: latest
      const dateA = new Date(a.phlebotomyDispatchedAt || a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.phlebotomyDispatchedAt || b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return list;
  }, [history, statusFilter, dateFilter, searchTerm, sortOrder]);

  return (
    <div className="mph-container" role="region" aria-label={title}>
      {/* ─── 1. Header with Title & KPI Cards ─── */}
      <header className="mph-header">
        <div className="mph-header__titles">
          <div className="mph-header__badge">
            <span className="material-symbols-rounded">history_edu</span>
            <span>Enterprise Clinical Audit Ledger</span>
          </div>
          <h1 className="mph-header__title">{title}</h1>
          <p className="mph-header__subtitle">{subtitle}</p>
        </div>

        <div className="mph-metrics">
          <div className="mph-metric-chip" onClick={() => setStatusFilter('ALL')} role="button" tabIndex={0}>
            <span className="mph-metric-chip__val">{metrics.total}</span>
            <span className="mph-metric-chip__lbl">Total Encounters</span>
          </div>
          <div className="mph-metric-chip" onClick={() => setStatusFilter('AT_DOCTOR')} role="button" tabIndex={0}>
            <span className="mph-metric-chip__val mph-metric-chip__val--doctor">{metrics.atDoctor}</span>
            <span className="mph-metric-chip__lbl">At Doctor Desk</span>
          </div>
          <div className="mph-metric-chip" onClick={() => setStatusFilter('IN_PATHOLOGY')} role="button" tabIndex={0}>
            <span className="mph-metric-chip__val mph-metric-chip__val--path">{metrics.inPath}</span>
            <span className="mph-metric-chip__lbl">In Pathology</span>
          </div>
          <div className="mph-metric-chip" onClick={() => setStatusFilter('AT_BILLING')} role="button" tabIndex={0}>
            <span className="mph-metric-chip__val mph-metric-chip__val--billing">{metrics.atBilling}</span>
            <span className="mph-metric-chip__lbl">At Billing</span>
          </div>
          <div className="mph-metric-chip" onClick={() => setStatusFilter('COMPLETED')} role="button" tabIndex={0}>
            <span className="mph-metric-chip__val mph-metric-chip__val--completed">{metrics.completed}</span>
            <span className="mph-metric-chip__lbl">Completed</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Controls & Search Filter Bar ─── */}
      <div className="mph-controls">
        <div className="mph-search-box">
          <span className="material-symbols-rounded mph-search-icon">search</span>
          <input
            type="text"
            className="mph-search-input"
            placeholder="Search patient, MRN, token, doctor, nurse, pathologist, test name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="mph-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>

        {/* View Switcher, Sort, Date Presets */}
        <div className="mph-filters-row">
          <div className="mph-btn-group">
            <button
              type="button"
              className={`mph-filter-btn ${dateFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setDateFilter('ALL')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${dateFilter === 'TODAY' ? 'active' : ''}`}
              onClick={() => setDateFilter('TODAY')}
            >
              Today
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${dateFilter === 'LAST_7_DAYS' ? 'active' : ''}`}
              onClick={() => setDateFilter('LAST_7_DAYS')}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${dateFilter === 'THIS_MONTH' ? 'active' : ''}`}
              onClick={() => setDateFilter('THIS_MONTH')}
            >
              This Month
            </button>
          </div>

          <div className="mph-btn-group">
            <button
              type="button"
              className={`mph-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Statuses
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${statusFilter === 'AT_DOCTOR' ? 'active' : ''}`}
              onClick={() => setStatusFilter('AT_DOCTOR')}
            >
              <span className="material-symbols-rounded">stethoscope</span>
              <span>At Doctor</span>
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${statusFilter === 'IN_PATHOLOGY' ? 'active' : ''}`}
              onClick={() => setStatusFilter('IN_PATHOLOGY')}
            >
              <span className="material-symbols-rounded">biotech</span>
              <span>In Lab</span>
            </button>
            <button
              type="button"
              className={`mph-filter-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              <span className="material-symbols-rounded">check_circle</span>
              <span>Completed</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="mph-sort-box">
            <span className="material-symbols-rounded mph-sort-icon">sort</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mph-sort-select"
              aria-label="Sort Patient History"
            >
              <option value="latest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Patient Name (A-Z)</option>
              <option value="token">Token Number</option>
            </select>
          </div>

          {/* View Toggle (Grid / Table) */}
          <div className="mph-view-toggle">
            <button
              type="button"
              className={`mph-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              aria-label="Card Grid View"
            >
              <span className="material-symbols-rounded">grid_view</span>
            </button>
            <button
              type="button"
              className={`mph-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="High-Density Table View"
              aria-label="High-Density Table View"
            >
              <span className="material-symbols-rounded">table_rows</span>
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              className="mph-refresh-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh Patient History"
              aria-label="Refresh Patient History"
            >
              <span className={`material-symbols-rounded ${isLoading ? 'mph-spinning' : ''}`}>refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. Content Area: Grid View vs Table View ─── */}
      <div className="mph-content-area">
        {isLoading ? (
          <div className="mph-loading">
            <span className="material-symbols-rounded mph-spinning">progress_activity</span>
            <p>Loading patient history ledger...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="mph-empty">
            <span className="material-symbols-rounded">folder_open</span>
            <h3>No Patient History Records Found</h3>
            <p>No historical encounters match the active search and filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid View ── */
          <div className="mph-card-grid">
            {filteredList.map((visit) => {
              const p = visit.patientId || {};
              const pName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Unnamed Patient';
              const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
              const token = visit.tokenString || (visit.visitNumber ? visit.visitNumber.slice(-4) : 'GEN');
              const loc = resolveHospitalLocation(visit);
              const orders = visit.labOrders || [];
              const attendingDoctor = formatDoctorName(
                visit.referredBy || visit.consultation?.doctorId || visit.assignedDoctor || 'Attending Physician'
              );
              const phlebotomyNurse = visit.phlebotomyDispatchedBy?.fullName ||
                [visit.phlebotomyDispatchedBy?.firstName, visit.phlebotomyDispatchedBy?.lastName].filter(Boolean).join(' ') ||
                orders.find((o) => o.labVitals?.recordedBy)?.labVitals?.recordedBy?.fullName ||
                'Phlebotomy Nurse';
              const verifiedOrder = orders.find((o) => o.pathologistVerification?.verifiedBy || o.pathologistVerification?.signatureHash);
              const pathologist = verifiedOrder?.pathologistVerification?.verifiedBy?.fullName
                ? formatDoctorName(verifiedOrder.pathologistVerification.verifiedBy)
                : verifiedOrder?.pathologistVerification?.signatureHash
                ? 'Authorized Pathologist'
                : null;
              const formattedTime = formatTimeAgo(visit.phlebotomyDispatchedAt || visit.updatedAt || visit.createdAt);

              return (
                <div
                  key={visit._id}
                  className="mph-card"
                  onClick={() => setSelectedVisitDetail(visit)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedVisitDetail(visit);
                    }
                  }}
                  aria-label={`View history dossier for ${pName}, Token ${token}`}
                >
                  {/* Top: Token + Location Pill */}
                  <div className="mph-card__top">
                    <div className="mph-card__token">
                      <span className="material-symbols-rounded">tag</span>
                      <span>{token}</span>
                    </div>
                    <span className={`mph-status-pill ${loc.className}`} title={loc.description}>
                      <span className="material-symbols-rounded">{loc.icon}</span>
                      <span>{loc.label}</span>
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="mph-card__patient-row">
                    <div className="mph-card__avatar">{initials}</div>
                    <div className="mph-card__patient-info">
                      <h3 className="mph-card__patient-name" title={pName}>{pName}</h3>
                      <div className="mph-card__patient-meta">
                        {p.gender && <span>{p.gender}</span>}
                        {p.gender && p.age && <span>•</span>}
                        {p.age && <span>{p.age}y</span>}
                        {p.mrn && <span>• MRN: {p.mrn}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Accountability Triad (Doctor & Nurse Recognition) */}
                  <div className="mph-card__accountability-box">
                    <div className="mph-accountability-chip" title={`Attending Physician: ${attendingDoctor}`}>
                      <span className="material-symbols-rounded">stethoscope</span>
                      <span>Doc: {attendingDoctor}</span>
                    </div>
                    <div className="mph-accountability-chip" title={`Phlebotomy Nurse: ${phlebotomyNurse}`}>
                      <span className="material-symbols-rounded">bloodtype</span>
                      <span>Nurse: {phlebotomyNurse}</span>
                    </div>
                    {pathologist && (
                      <div className="mph-accountability-chip mph-accountability-chip--path" title={`Pathologist: ${pathologist}`}>
                        <span className="material-symbols-rounded">verified_user</span>
                        <span>Path: {pathologist}</span>
                      </div>
                    )}
                  </div>

                  {/* Diagnostic Tests */}
                  {orders.length > 0 && (
                    <div className="mph-card__tests-capsule">
                      <div className="mph-card__tests-header">
                        <span className="material-symbols-rounded">biotech</span>
                        <strong>{orders.length} {orders.length === 1 ? 'Diagnostic Test' : 'Diagnostic Tests'}</strong>
                      </div>
                      <div className="mph-card__tests-list">
                        {orders.slice(0, 2).map((o) => {
                          const tube = getTubeColor(o.sampleType, o.testName);
                          return (
                            <span key={o._id || o.id} className="mph-test-badge">
                              <span className={`mph-tube-dot ${tube.className}`} />
                              <span>{o.testName}</span>
                            </span>
                          );
                        })}
                        {orders.length > 2 && <span className="mph-test-more">+{orders.length - 2} more</span>}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mph-card__footer">
                    <div className="mph-card__time">
                      <span className="material-symbols-rounded">schedule</span>
                      <span>{formattedTime}</span>
                    </div>
                    <span className="mph-card__cta">
                      <span>View Dossier</span>
                      <span className="material-symbols-rounded">arrow_forward</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <div className="mph-table-wrap">
            <table className="mph-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Token &amp; Status</th>
                  <th style={{ width: '22%' }}>Patient Dossier</th>
                  <th style={{ width: '18%' }}>Attending Physician</th>
                  <th style={{ width: '16%' }}>Phlebotomy Nurse</th>
                  <th style={{ width: '16%' }}>Senior Pathologist</th>
                  <th style={{ width: '16%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((visit) => {
                  const p = visit.patientId || {};
                  const pName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Unnamed Patient';
                  const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
                  const token = visit.tokenString || (visit.visitNumber ? visit.visitNumber.slice(-4) : 'GEN');
                  const loc = resolveHospitalLocation(visit);
                  const orders = visit.labOrders || [];
                  const attendingDoctor = formatDoctorName(
                    visit.referredBy || visit.consultation?.doctorId || visit.assignedDoctor || 'Attending Physician'
                  );
                  const phlebotomyNurse = visit.phlebotomyDispatchedBy?.fullName ||
                    [visit.phlebotomyDispatchedBy?.firstName, visit.phlebotomyDispatchedBy?.lastName].filter(Boolean).join(' ') ||
                    orders.find((o) => o.labVitals?.recordedBy)?.labVitals?.recordedBy?.fullName ||
                    'Phlebotomy Nurse';
                  const verifiedOrder = orders.find((o) => o.pathologistVerification?.verifiedBy || o.pathologistVerification?.signatureHash);
                  const pathologist = verifiedOrder?.pathologistVerification?.verifiedBy?.fullName
                    ? formatDoctorName(verifiedOrder.pathologistVerification.verifiedBy)
                    : verifiedOrder?.pathologistVerification?.signatureHash
                    ? 'Authorized Pathologist'
                    : 'Pending Authorization';

                  return (
                    <tr key={visit._id} onClick={() => setSelectedVisitDetail(visit)} className="mph-table-row">
                      {/* Token & Status */}
                      <td>
                        <div className="mph-table-token-cell">
                          <span className="mph-card__token">{token}</span>
                          <span className={`mph-status-pill ${loc.className}`}>
                            <span className="material-symbols-rounded">{loc.icon}</span>
                            <span>{loc.shortLabel}</span>
                          </span>
                        </div>
                      </td>

                      {/* Patient Dossier */}
                      <td>
                        <div className="mph-table-patient-cell">
                          <div className="mph-card__avatar">{initials}</div>
                          <div>
                            <strong>{pName}</strong>
                            <div className="mph-table-sub">
                              {p.gender || 'Unknown'} · {p.age ? `${p.age}y` : 'Adult'} · MRN: {p.mrn || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Attending Physician */}
                      <td>
                        <div className="mph-table-doc-cell">
                          <span className="material-symbols-rounded">stethoscope</span>
                          <span>{attendingDoctor}</span>
                        </div>
                      </td>

                      {/* Phlebotomy Nurse */}
                      <td>
                        <div className="mph-table-nurse-cell">
                          <span className="material-symbols-rounded">bloodtype</span>
                          <span>{phlebotomyNurse}</span>
                        </div>
                      </td>

                      {/* Pathologist */}
                      <td>
                        <div className="mph-table-path-cell">
                          <span className="material-symbols-rounded">
                            {verifiedOrder ? 'verified_user' : 'hourglass_empty'}
                          </span>
                          <span>{pathologist}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <Md3Button
                          variant="tonal"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisitDetail(visit);
                          }}
                        >
                          <span className="material-symbols-rounded">visibility</span>
                          <span>View Dossier</span>
                        </Md3Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. One-Tap Detailed Patient History Dossier Workspace Modal ─── */}
      {selectedVisitDetail && (
        <div className="mph-modal-backdrop" onClick={() => setSelectedVisitDetail(null)}>
          <div className="mph-dossier-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* Header */}
            <div className="mph-dossier-dialog__header">
              <div className="mph-dossier-dialog__title-box">
                <span className="material-symbols-rounded mph-dossier-dialog__icon">clinical_notes</span>
                <div>
                  <h2 className="mph-dossier-dialog__title">Patient Clinical History &amp; Audit Dossier</h2>
                  <p className="mph-dossier-dialog__subtitle">
                    Encounter: <strong>{selectedVisitDetail.tokenString || selectedVisitDetail.visitNumber}</strong> · Registered: {new Date(selectedVisitDetail.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Md3Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowPrintModal(true)}
                >
                  <span className="material-symbols-rounded">print</span>
                  <span>Print Report</span>
                </Md3Button>
                <button
                  type="button"
                  className="mph-dossier-close"
                  onClick={() => setSelectedVisitDetail(null)}
                  aria-label="Close Dossier"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="mph-dossier-dialog__body">
              {/* 1. Patient Demographic Strip */}
              <div className="mph-dossier-section mph-dossier-patient-strip">
                <div className="mph-dossier-avatar">
                  {((selectedVisitDetail.patientId?.firstName?.charAt(0) || '') + (selectedVisitDetail.patientId?.lastName?.charAt(0) || '')).toUpperCase() || 'PT'}
                </div>
                <div className="mph-dossier-patient-info">
                  <h3>
                    {[selectedVisitDetail.patientId?.firstName, selectedVisitDetail.patientId?.lastName].filter(Boolean).join(' ') ||
                      selectedVisitDetail.patientId?.name ||
                      'Unnamed Patient'}
                  </h3>
                  <div className="mph-dossier-meta-grid">
                    <span>MRN: <strong>{selectedVisitDetail.patientId?.mrn || 'N/A'}</strong></span>
                    <span>Gender: <strong>{selectedVisitDetail.patientId?.gender || 'N/A'}</strong></span>
                    <span>Age: <strong>{selectedVisitDetail.patientId?.age ? `${selectedVisitDetail.patientId.age} yrs` : 'N/A'}</strong></span>
                    <span>Blood Group: <strong>{selectedVisitDetail.patientId?.bloodGroup || 'Not Recorded'}</strong></span>
                    {selectedVisitDetail.ipdAdmissionId?.currentBedId && (
                      <span className="mph-ipd-badge">
                        <span className="material-symbols-rounded">hotel</span>
                        <span>Ward Bed: {selectedVisitDetail.ipdAdmissionId.currentBedId.bedLabel || selectedVisitDetail.ipdAdmissionId.currentBedId.bedNumber}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Clinical Accountability Triad (Doctor, Nurse, Pathologist) */}
              <div className="mph-dossier-section">
                <h4 className="mph-section-heading">
                  <span className="material-symbols-rounded">group</span>
                  <span>Clinical Care Team &amp; Accountability Triad</span>
                </h4>
                <div className="mph-triad-grid">
                  {/* Prescribing Physician Card */}
                  <div className="mph-triad-card">
                    <div className="mph-triad-card__header">
                      <span className="material-symbols-rounded">stethoscope</span>
                      <strong>Attending / Prescribing Physician</strong>
                    </div>
                    <div className="mph-triad-card__body">
                      <div className="mph-triad-card__name">
                        {formatDoctorName(selectedVisitDetail.referredBy || selectedVisitDetail.consultation?.doctorId || selectedVisitDetail.assignedDoctor || 'Attending Physician')}
                      </div>
                      <div className="mph-triad-card__dept">
                        {selectedVisitDetail.departmentId?.name || 'General Medicine'}
                      </div>
                      {selectedVisitDetail.consultation?.diagnosis && (
                        <div className="mph-triad-card__notes">
                          Directive: <em>{selectedVisitDetail.consultation.diagnosis}</em>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phlebotomy / Lab Nurse Card */}
                  <div className="mph-triad-card">
                    <div className="mph-triad-card__header">
                      <span className="material-symbols-rounded">bloodtype</span>
                      <strong>Specimen Accessioning Nurse</strong>
                    </div>
                    <div className="mph-triad-card__body">
                      <div className="mph-triad-card__name">
                        {selectedVisitDetail.phlebotomyDispatchedBy?.fullName ||
                          [selectedVisitDetail.phlebotomyDispatchedBy?.firstName, selectedVisitDetail.phlebotomyDispatchedBy?.lastName].filter(Boolean).join(' ') ||
                          selectedVisitDetail.labOrders?.find((o) => o.labVitals?.recordedBy)?.labVitals?.recordedBy?.fullName ||
                          'Phlebotomy Nurse'}
                      </div>
                      <div className="mph-triad-card__dept">
                        Phlebotomy &amp; Specimen Intake
                      </div>
                      <div className="mph-triad-card__notes">
                        Dispatched: {selectedVisitDetail.phlebotomyDispatchedAt ? new Date(selectedVisitDetail.phlebotomyDispatchedAt).toLocaleString() : 'Confirmed'}
                      </div>
                    </div>
                  </div>

                  {/* Senior Pathologist Card */}
                  <div className="mph-triad-card">
                    <div className="mph-triad-card__header">
                      <span className="material-symbols-rounded">verified_user</span>
                      <strong>Senior Pathologist Authorization</strong>
                    </div>
                    <div className="mph-triad-card__body">
                      {(() => {
                        const verifiedOrder = (selectedVisitDetail.labOrders || []).find((o) => o.pathologistVerification?.verifiedBy || o.pathologistVerification?.signatureHash);
                        const pathologist = verifiedOrder?.pathologistVerification?.verifiedBy?.fullName
                          ? formatDoctorName(verifiedOrder.pathologistVerification.verifiedBy)
                          : verifiedOrder?.pathologistVerification?.signatureHash
                          ? 'Authorized Pathologist'
                          : 'Pending Authorization';
                        const hash = verifiedOrder?.pathologistVerification?.signatureHash;

                        return (
                          <>
                            <div className="mph-triad-card__name">{pathologist}</div>
                            <div className="mph-triad-card__dept">Diagnostic Verification</div>
                            {hash && (
                              <div className="mph-triad-seal-hash" title={hash}>
                                SHA-256: {hash.slice(0, 16)}...
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Recorded Clinical Pre-Vitals */}
              {(() => {
                const vVitals = selectedVisitDetail.vitals || {};
                const orderWithVitals = (selectedVisitDetail.labOrders || []).find((o) => o.labVitals);
                const oVitals = orderWithVitals?.labVitals || {};
                const isSkipped = Boolean(oVitals.isSkipped);
                const bp = oVitals.preScanBp || vVitals.bloodPressure;
                const pulse = oVitals.pulse || vVitals.pulse;
                const temp = oVitals.temperature || vVitals.temperature;
                const spo2 = oVitals.oxygenSaturation || vVitals.oxygenSaturation;
                const glucose = oVitals.bloodGlucose || vVitals.bloodGlucose;
                const weight = oVitals.patientWeightKg || vVitals.weight;
                const fasting = oVitals.fastingHours;

                return (
                  <div className="mph-dossier-section">
                    <h4 className="mph-section-heading">
                      <span className="material-symbols-rounded">vital_signs</span>
                      <span>Pre-Procedure Clinical Vitals &amp; Accessioning Context</span>
                      {isSkipped && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#be123c', background: '#ffe4e6', padding: '2px 8px', borderRadius: '4px' }}>
                          Vitals Exempted ({oVitals.skipReason || 'Skipped'})
                        </span>
                      )}
                    </h4>
                    {isSkipped ? (
                      <p className="mph-empty-note" style={{ fontStyle: 'normal', color: '#475569' }}>
                        <strong>Pre-Vitals Skipped by Lab Nurse:</strong> {oVitals.skipReason || 'Clinically exempted'}
                      </p>
                    ) : (bp || pulse || temp || spo2 || glucose || weight || fasting != null) ? (
                      <div className="mph-vitals-grid">
                        {bp && <div className="mph-vital-chip"><span>BP:</span><strong>{bp} mmHg</strong></div>}
                        {pulse && <div className="mph-vital-chip"><span>Pulse:</span><strong>{pulse} bpm</strong></div>}
                        {spo2 && <div className="mph-vital-chip"><span>SpO2:</span><strong>{spo2}%</strong></div>}
                        {temp && <div className="mph-vital-chip"><span>Temperature:</span><strong>{temp}°F</strong></div>}
                        {glucose && <div className="mph-vital-chip"><span>Blood Glucose:</span><strong>{glucose} mg/dL</strong></div>}
                        {weight && <div className="mph-vital-chip"><span>Weight:</span><strong>{weight} kg</strong></div>}
                        {fasting != null && <div className="mph-vital-chip"><span>Fasting:</span><strong>{fasting} hrs</strong></div>}
                      </div>
                    ) : (
                      <p className="mph-empty-note">No pre-vitals recorded for this encounter.</p>
                    )}
                  </div>
                );
              })()}

              {/* 4. Diagnostic Investigations & Analyte Findings Table */}
              <div className="mph-dossier-section">
                <h4 className="mph-section-heading">
                  <span className="material-symbols-rounded">science</span>
                  <span>Diagnostic Investigations &amp; Parameter Findings</span>
                </h4>
                {(selectedVisitDetail.labOrders || []).map((order) => {
                  const tube = getTubeColor(order.sampleType, order.testName);
                  const results = order.results ? (order.results instanceof Map ? Object.fromEntries(order.results) : order.results) : {};
                  const resultKeys = Object.keys(results).filter((k) => !k.startsWith('attachment_'));

                  return (
                    <div key={order._id || order.id} className="mph-order-box">
                      <div className="mph-order-box__header">
                        <div className="mph-order-box__title">
                          <span className={`mph-tube-tag ${tube.className}`}>{tube.shortLabel}</span>
                          <strong>{order.testName}</strong>
                          <span className="mph-order-code">({order.testCode || 'LAB-TEST'})</span>
                        </div>
                        <span className={`mph-status-pill mph-status-pill--${(order.status || '').toLowerCase()}`}>
                          {order.status || 'PENDING'}
                        </span>
                      </div>

                      {resultKeys.length > 0 ? (
                        <table className="mph-analyte-table">
                          <thead>
                            <tr>
                              <th>Analyte Parameter</th>
                              <th>Observed Finding</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultKeys.map((key) => (
                              <tr key={key}>
                                <td><strong>{key}</strong></td>
                                <td>{String(results[key])}</td>
                                <td><span className="mph-delta-normal">Recorded</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="mph-empty-note">No quantitative analyte results recorded for this test.</p>
                      )}

                      {order.pathologistVerification?.clinicalImpression && (
                        <div className="mph-order-impression">
                          <strong>Pathologist Impression:</strong> {order.pathologistVerification.clinicalImpression}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 5. Complete Longitudinal Journey Timeline */}
              <div className="mph-dossier-section">
                <h4 className="mph-section-heading">
                  <span className="material-symbols-rounded">timeline</span>
                  <span>Patient Encounter Longitudinal Journey</span>
                </h4>
                <div className="mph-timeline">
                  <div className="mph-timeline-item">
                    <span className="mph-timeline-dot mph-timeline-dot--green" />
                    <div className="mph-timeline-content">
                      <strong>Encounter Registered</strong>
                      <small>{new Date(selectedVisitDetail.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                  {selectedVisitDetail.phlebotomyDispatchedAt && (
                    <div className="mph-timeline-item">
                      <span className="mph-timeline-dot mph-timeline-dot--blue" />
                      <div className="mph-timeline-content">
                        <strong>Specimen Accessioned &amp; Pre-Vitals Logged</strong>
                        <small>{new Date(selectedVisitDetail.phlebotomyDispatchedAt).toLocaleString()}</small>
                      </div>
                    </div>
                  )}
                  {selectedVisitDetail.status === 'COMPLETED' && (
                    <div className="mph-timeline-item">
                      <span className="mph-timeline-dot mph-timeline-dot--purple" />
                      <div className="mph-timeline-content">
                        <strong>Medical Report Authorized &amp; Finalized</strong>
                        <small>{new Date(selectedVisitDetail.updatedAt).toLocaleString()}</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mph-dossier-dialog__footer">
              <Md3Button variant="tonal" onClick={() => setSelectedVisitDetail(null)}>
                Close Dossier
              </Md3Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Dialog */}
      {showPrintModal && selectedVisitDetail && (
        <PrintableLabReportDialog
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          visit={selectedVisitDetail}
          activeOrder={selectedVisitDetail.labOrders?.[0]}
          laboratories={laboratories}
          doctorNotes={selectedVisitDetail.labOrders?.[0]?.pathologistVerification?.doctorNotes || ''}
          clinicalImpression={selectedVisitDetail.labOrders?.[0]?.pathologistVerification?.clinicalImpression || ''}
          currentUser={null}
        />
      )}

      {/* Full Scan Viewer Dialog */}
      {activeScanReportId && (
        <Md3ScanViewerDialog
          isOpen={Boolean(activeScanReportId)}
          onClose={() => setActiveScanReportId(null)}
          scanId={activeScanReportId}
        />
      )}
    </div>
  );
};

export default Md3PatientHistoryManager;
