import React, { useState, useMemo } from 'react';
import { formatDoctorName } from '../../utils/patientFormatters';
import './laboratory.tokens.css';
import './LabNurseHistoryView.css';

const getTubeColor = (sampleType, testName) => {
  const name = (testName || '').toLowerCase();
  const type = (sampleType || '').toLowerCase();
  if (name.includes('cbc') || name.includes('hemogram') || type.includes('edta')) {
    return { className: 'ldc-tube--edta', label: 'EDTA Lavender Top' };
  }
  if (name.includes('coagulation') || name.includes('pt/inr') || type.includes('citrate')) {
    return { className: 'ldc-tube--citrate', label: 'Sodium Citrate Light Blue' };
  }
  if (name.includes('glucose') || type.includes('fluoride')) {
    return { className: 'ldc-tube--fluoride', label: 'Sodium Fluoride Gray' };
  }
  if (name.includes('culture') || type.includes('swab')) {
    return { className: 'ldc-tube--sterile', label: 'Sterile Swab' };
  }
  return { className: 'ldc-tube--sst', label: 'SST Gold Top' };
};

const resolveHospitalLocation = (visit) => {
  const status = visit?.status;
  const dispositionStatus = visit?.disposition?.status;

  if (status === 'WAITING_DOCTOR_REVIEW') {
    return {
      label: 'At Doctor (Review Pending)',
      icon: 'stethoscope',
      className: 'lnh-location-pill--doctor',
      pulse: true,
      description: 'Awaiting Attending Physician clinical assessment & diagnosis',
    };
  }
  if (status === 'WAITING_DOCTOR') {
    return {
      label: 'At Doctor (Queue)',
      icon: 'schedule',
      className: 'lnh-location-pill--doctor',
      pulse: true,
      description: 'Waiting in line at Doctor Consultation desk',
    };
  }
  if (status === 'IN_PROGRESS') {
    return {
      label: 'In Doctor Consultation',
      icon: 'clinical_notes',
      className: 'lnh-location-pill--progress',
      pulse: true,
      description: 'Currently inside consultation room with Attending Doctor',
    };
  }
  if (status === 'WAITING_LAB') {
    return {
      label: 'In Pathology / Analysis',
      icon: 'biotech',
      className: 'lnh-location-pill--pathology',
      pulse: true,
      description: 'Specimen under active biochemical analysis in Laboratory',
    };
  }
  if (status === 'WAITING_BILLING') {
    return {
      label: 'At Billing / Cashier',
      icon: 'point_of_sale',
      className: 'lnh-location-pill--billing',
      pulse: false,
      description: 'Routed to Cashier desk for fee settlement and invoice generation',
    };
  }
  if (status === 'WAITING_PHARMACY') {
    return {
      label: 'At Pharmacy',
      icon: 'prescriptions',
      className: 'lnh-location-pill--pharmacy',
      pulse: false,
      description: 'Prescription orders dispatched to dispensary counter',
    };
  }
  if (status === 'COMPLETED') {
    return {
      label: 'Encounter Completed',
      icon: 'check_circle',
      className: 'lnh-location-pill--completed',
      pulse: false,
      description: 'Medical encounter, lab verification, and checkout completed',
    };
  }

  return {
    label: status?.replace(/_/g, ' ') || 'Dispatched',
    icon: 'done_all',
    className: 'lnh-location-pill--doctor',
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
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

export const LabNurseHistoryView = ({
  history = [],
  isLoading = false,
  onRefresh,
  laboratories = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' or 'TODAY'
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

  // Summary Metrics
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

  // Filtered List
  const filteredList = useMemo(() => {
    return history.filter((visit) => {
      // 1. Status Filter
      if (statusFilter === 'AT_DOCTOR') {
        if (!['WAITING_DOCTOR_REVIEW', 'WAITING_DOCTOR', 'IN_PROGRESS'].includes(visit.status)) {
          return false;
        }
      } else if (statusFilter === 'IN_PATHOLOGY') {
        if (visit.status !== 'WAITING_LAB') return false;
      } else if (statusFilter === 'AT_BILLING') {
        if (visit.status !== 'WAITING_BILLING') return false;
      } else if (statusFilter === 'COMPLETED') {
        if (visit.status !== 'COMPLETED') return false;
      }

      // 2. Date Filter
      if (dateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const visitDateStr = new Date(visit.phlebotomyDispatchedAt || visit.createdAt).toISOString().slice(0, 10);
        if (visitDateStr !== todayStr) return false;
      }

      // 3. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const p = visit.patientId || {};
        const pName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const token = (visit.tokenString || '').toLowerCase();
        const doctor = (visit.referredBy || visit.consultation?.doctorId?.fullName || '').toLowerCase();
        const hasTestMatch = (visit.labOrders || []).some((o) =>
          (o.testName || '').toLowerCase().includes(q)
        );

        if (!pName.includes(q) && !mrn.includes(q) && !token.includes(q) && !doctor.includes(q) && !hasTestMatch) {
          return false;
        }
      }

      return true;
    });
  }, [history, statusFilter, dateFilter, searchTerm]);

  return (
    <div className="lnh-container" role="region" aria-label="Phlebotomy patient history and whereabouts">
      {/* ─── 1. Header with Title & KPI Cards ─── */}
      <header className="lnh-header">
        <div className="lnh-header__titles">
          <div className="lnh-header__badge">
            <span className="material-symbols-rounded">history_edu</span>
            <span>Phlebotomy & Intake Audit Trail</span>
          </div>
          <h1 className="lnh-header__title">Patient History & Live Hospital Tracker</h1>
          <p className="lnh-header__subtitle">
            Real-time tracking of patients dispatched from Phlebotomy, their clinical whereabouts, and recorded pre-vitals.
          </p>
        </div>

        <div className="lnh-metrics">
          <div className="lnh-metric-chip">
            <span className="lnh-metric-chip__val">{metrics.total}</span>
            <span className="lnh-metric-chip__lbl">Total Intake</span>
          </div>
          <div className="lnh-metric-chip">
            <span className="lnh-metric-chip__val lnh-metric-chip__val--doctor">{metrics.atDoctor}</span>
            <span className="lnh-metric-chip__lbl">At Doctor Desk</span>
          </div>
          <div className="lnh-metric-chip">
            <span className="lnh-metric-chip__val lnh-metric-chip__val--path">{metrics.inPath}</span>
            <span className="lnh-metric-chip__lbl">In Pathology</span>
          </div>
          <div className="lnh-metric-chip">
            <span className="lnh-metric-chip__val lnh-metric-chip__val--billing">{metrics.atBilling}</span>
            <span className="lnh-metric-chip__lbl">At Billing</span>
          </div>
          <div className="lnh-metric-chip">
            <span className="lnh-metric-chip__val lnh-metric-chip__val--completed">{metrics.completed}</span>
            <span className="lnh-metric-chip__lbl">Completed</span>
          </div>
        </div>
      </header>

      {/* ─── 2. Controls & Search Filter Bar ─── */}
      <div className="lnh-controls">
        <div className="lnh-search-box">
          <span className="material-symbols-rounded" style={{ color: '#94a3b8', fontSize: 20 }}>search</span>
          <input
            type="text"
            placeholder="Search patient, MRN, token, test name, or doctor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        <div className="lnh-filters">
          <button
            className={`lnh-filter-btn ${statusFilter === 'ALL' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All States ({metrics.total})
          </button>
          <button
            className={`lnh-filter-btn ${statusFilter === 'AT_DOCTOR' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('AT_DOCTOR')}
          >
            <span className="material-symbols-rounded">stethoscope</span>
            <span>At Doctor ({metrics.atDoctor})</span>
          </button>
          <button
            className={`lnh-filter-btn ${statusFilter === 'IN_PATHOLOGY' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('IN_PATHOLOGY')}
          >
            <span className="material-symbols-rounded">biotech</span>
            <span>In Pathology ({metrics.inPath})</span>
          </button>
          <button
            className={`lnh-filter-btn ${statusFilter === 'AT_BILLING' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('AT_BILLING')}
          >
            <span className="material-symbols-rounded">point_of_sale</span>
            <span>At Billing ({metrics.atBilling})</span>
          </button>
          <button
            className={`lnh-filter-btn ${statusFilter === 'COMPLETED' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            <span className="material-symbols-rounded">check_circle</span>
            <span>Completed ({metrics.completed})</span>
          </button>

          <div style={{ height: 20, width: 1, background: '#cbd5e1', margin: '0 4px' }} />

          <button
            className={`lnh-filter-btn ${dateFilter === 'TODAY' ? 'lnh-filter-btn--active' : ''}`}
            onClick={() => setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY')}
            title="Toggle between today and all historical visits"
          >
            <span className="material-symbols-rounded">calendar_today</span>
            <span>{dateFilter === 'TODAY' ? 'Today Only' : 'All Dates'}</span>
          </button>

          {onRefresh && (
            <button
              className="lnh-filter-btn"
              onClick={() => onRefresh()}
              title="Refresh ledger records"
              disabled={isLoading}
            >
              <span className={`material-symbols-rounded ${isLoading ? 'animate-spin' : ''}`}>sync</span>
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. Ledger Grid / Patient Cards ─── */}
      {isLoading && filteredList.length === 0 ? (
        <div className="lnh-empty">
          <span className="material-symbols-rounded animate-spin">progress_activity</span>
          <h3>Loading Phlebotomy History…</h3>
          <p>Retrieving real-time hospital whereabouts and intake audit records.</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="lnh-empty">
          <span className="material-symbols-rounded">manage_search</span>
          <h3>No Dispatched Patients Found</h3>
          <p>
            {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filter chips above.'
              : 'Patients dispatched from the Phlebotomy & Intake queue will appear here with live tracking.'}
          </p>
        </div>
      ) : (
        <div className="lnh-ledger" role="list">
          {filteredList.map((visit) => {
            const p = visit.patientId || {};
            const isDeleted = Boolean(p.isDeleted || p.isOrphaned);
            const fullName = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown Patient';
            const initials = isDeleted ? 'DP' : (((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PT');
            const validAge = p.age && p.age !== '—' && !isNaN(Number(p.age)) ? `${p.age} yrs` : null;
            const ageGender = [validAge, p.gender].filter(Boolean).join(' • ') || '—';
            const mrnText = p.mrn ? (p.mrn === 'DELETED-RECORD' || p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`) : 'MRN: —';
            const doctorName = formatDoctorName(visit.referredBy || visit.consultation?.doctorId || visit.assignedDoctor || 'Attending Physician');
            const location = resolveHospitalLocation(visit);
            const dispatchedTime = visit.phlebotomyDispatchedAt || visit.updatedAt || visit.createdAt;

            // Extract pre-vitals recorded
            const orderWithVitals = (visit.labOrders || []).find((o) => o.labVitals);
            const labVitals = orderWithVitals?.labVitals || visit.vitals;

            return (
              <article
                key={visit._id}
                className="lnh-card"
                onClick={() => setSelectedVisitDetail(visit)}
                tabIndex={0}
                role="listitem"
                aria-label={`History record for ${fullName}`}
              >
                {/* Header: Patient info + Live Location Pill */}
                <div className="lnh-card__header">
                  <div className="lnh-card__patient">
                    <div className="lnh-avatar">{initials}</div>
                    <div className="lnh-card__meta">
                      <div className="lnh-card__name-line">
                        <span className="lnh-card__name">{fullName}</span>
                        <span className="lnh-token-badge">{visit.tokenString || 'TOKEN'}</span>
                        <span className="lnh-mrn-badge">{mrnText}</span>
                      </div>
                      <div className="lnh-card__demographics">
                        <span>{ageGender}</span>
                        <span>•</span>
                        <span style={{ color: '#0f766e', fontWeight: 600 }}>{doctorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`lnh-location-pill ${location.className}`}>
                    {location.pulse && <span className="lnh-pulsing-dot" />}
                    <span className="material-symbols-rounded">{location.icon}</span>
                    <span>{location.label}</span>
                  </div>
                </div>

                {/* Body: Recorded Pre-Vitals & Specimen Orders */}
                <div className="lnh-card__body">
                  {/* Left Box: Pre-Vitals */}
                  <div>
                    <div className="lnh-section-title">
                      <span className="material-symbols-rounded">monitor_heart</span>
                      <span>Recorded Intake Vitals</span>
                    </div>
                    {labVitals?.isSkipped ? (
                      <span className="lnh-vital-tag" style={{ background: '#ffe4e6', color: '#be123c', border: '1px dashed #fecdd3' }}>
                        Pre-Vitals Skipped: {labVitals.skipReason || 'Clinically Exempt'}
                      </span>
                    ) : labVitals && (labVitals.preScanBp || labVitals.bloodPressure || labVitals.temperature || labVitals.pulse || labVitals.oxygenSaturation || labVitals.bloodGlucose || labVitals.patientWeightKg || labVitals.weight) ? (
                      <div className="lnh-vitals-chips">
                        {(labVitals.preScanBp || labVitals.bloodPressure) && (
                          <span className="lnh-vital-tag">
                            BP: {labVitals.preScanBp || labVitals.bloodPressure}
                          </span>
                        )}
                        {(labVitals.pulse) && (
                          <span className="lnh-vital-tag">
                            Pulse: {labVitals.pulse} bpm
                          </span>
                        )}
                        {(labVitals.oxygenSaturation) && (
                          <span className="lnh-vital-tag">
                            SpO2: {labVitals.oxygenSaturation}%
                          </span>
                        )}
                        {(labVitals.temperature) && (
                          <span className="lnh-vital-tag">
                            Temp: {labVitals.temperature}°F
                          </span>
                        )}
                        {(labVitals.bloodGlucose) && (
                          <span className="lnh-vital-tag">
                            Glu: {labVitals.bloodGlucose} mg/dL
                          </span>
                        )}
                        {(labVitals.patientWeightKg || labVitals.weight) && (
                          <span className="lnh-vital-tag">
                            Weight: {labVitals.patientWeightKg || labVitals.weight} kg
                          </span>
                        )}
                        {labVitals.fastingHours != null && (
                          <span className="lnh-vital-tag">
                            Fasting: {labVitals.fastingHours} hrs
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        No pre-vitals logged at intake.
                      </span>
                    )}
                  </div>

                  {/* Right Box: Specimen & Orders */}
                  <div>
                    <div className="lnh-section-title">
                      <span className="material-symbols-rounded">biotech</span>
                      <span>Diagnostic Tests & Specimen Tubes ({(visit.labOrders || []).length})</span>
                    </div>
                    <div className="lnh-orders-list">
                      {(visit.labOrders || []).slice(0, 3).map((ord) => {
                        const tube = getTubeColor(ord.sampleType, ord.testName);
                        const isRedrawn = (ord.retakeCount > 0) || (ord.phlebotomyRetakes && ord.phlebotomyRetakes.length > 0);
                        return (
                          <div key={ord._id || ord.id} className="lnh-order-item">
                            <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {ord.testName}
                              {isRedrawn && (
                                <span className="lnh-redraw-tag" title={`Retaken ${ord.retakeCount || ord.phlebotomyRetakes?.length} times`}>
                                  <span className="material-symbols-rounded" style={{ fontSize: 11 }}>sync_problem</span>
                                  <span>Retake #{ord.retakeCount || ord.phlebotomyRetakes?.length}</span>
                                </span>
                              )}
                            </span>
                            <span className="lnh-tube-tag" style={{ backgroundColor: tube.color }}>
                              {tube.label}
                            </span>
                          </div>
                        );
                      })}
                      {(visit.labOrders || []).length > 3 && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          +{(visit.labOrders || []).length - 3} additional tests
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Handover Remarks & Timestamp */}
                <div className="lnh-card__footer">
                  <div className="lnh-card__handover-notes">
                    <span className="material-symbols-rounded">format_quote</span>
                    <span>
                      {visit.phlebotomyNotes || visit.disposition?.notes || 'Patient dispatched from Phlebotomy station.'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>
                      Dispatched: <strong>{formatTimeAgo(dispatchedTime)}</strong>
                    </span>
                    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#94a3b8' }}>
                      chevron_right
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ─── 4. Detailed Modal View for Selected Visit ─── */}
      {selectedVisitDetail && (
        <div
          className="lwp-handoff-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedVisitDetail(null)}
        >
          <div
            className="lwp-handoff-modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="lwp-handoff-modal__header">
              <div className="lwp-handoff-modal__header-icon">
                <span className="material-symbols-rounded">medical_information</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="lwp-handoff-modal__title">
                  {selectedVisitDetail.patientId?.fullName || [selectedVisitDetail.patientId?.firstName, selectedVisitDetail.patientId?.lastName].filter(Boolean).join(' ') || 'Patient Details'}
                </h3>
                <p className="lwp-handoff-modal__subtitle">
                  {selectedVisitDetail.patientId?.mrn ? (selectedVisitDetail.patientId.mrn === 'DELETED-RECORD' || selectedVisitDetail.patientId.mrn.startsWith('MRN-') ? selectedVisitDetail.patientId.mrn : `MRN-${selectedVisitDetail.patientId.mrn}`) : 'MRN: —'} • Token {selectedVisitDetail.tokenString || '—'}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitDetail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </header>

            <div className="lwp-handoff-modal__body">
              {/* Current Status Banner */}
              {(() => {
                const loc = resolveHospitalLocation(selectedVisitDetail);
                return (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`lnh-location-pill ${loc.className}`}>
                        <span className="material-symbols-rounded">{loc.icon}</span>
                        <span>{loc.label}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {loc.description}
                    </span>
                  </div>
                );
              })()}

              {/* Patient Care Team */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                <div style={{ background: '#f1f5f9', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '0.72rem' }}>Attending Physician</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                    {formatDoctorName(selectedVisitDetail.referredBy || selectedVisitDetail.consultation?.doctorId || 'Attending Doctor')}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '0.72rem' }}>Department</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                    {selectedVisitDetail.departmentId?.name || 'Clinical Pathology & Diagnostics'}
                  </div>
                </div>
              </div>

              {/* Test Orders Breakdown */}
              <div>
                <div className="lnh-section-title">
                  <span className="material-symbols-rounded">receipt_long</span>
                  <span>Diagnostic Orders & Specimen Status</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(selectedVisitDetail.labOrders || []).map((ord) => {
                    const tube = getTubeColor(ord.sampleType, ord.testName);
                    const retakes = ord.phlebotomyRetakes || [];
                    const hasRetakes = (ord.retakeCount > 0) || retakes.length > 0;
                    return (
                      <div
                        key={ord._id || ord.id}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>{ord.testName}</strong>
                              {hasRetakes && (
                                <span className="lnh-redraw-tag">
                                  <span className="material-symbols-rounded" style={{ fontSize: 11 }}>sync_problem</span>
                                  <span>{ord.retakeCount || retakes.length} Recollection(s) Logged</span>
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                              Status: <span style={{ fontWeight: 600, color: ord.status === 'COMPLETED' ? '#16a34a' : '#d97706' }}>{ord.status}</span>
                              {ord.sampleCollectedAt && ` • Last Collected at ${new Date(ord.sampleCollectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                          </div>
                          <span className="lnh-tube-tag" style={{ backgroundColor: tube.color }}>
                            {tube.label}
                          </span>
                        </div>

                        {/* Chronological Retake Audit Trail */}
                        {retakes.length > 0 && (
                          <div className="lnh-redraw-timeline">
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>history</span>
                              <span>Specimen Retake Audit Trail</span>
                            </div>
                            {retakes.map((rt, idx) => (
                              <div key={idx} className="lnh-redraw-step">
                                <div className="lnh-redraw-step__badge">#{rt.retakeNumber || idx + 1}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: '#431407' }}>
                                    Recollected at {new Date(rt.collectedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#7c2d12', marginTop: 1 }}>
                                    Reason: <em>{rt.reason || 'Specimen recollected by phlebotomist'}</em>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <div className="lnh-section-title">
                  <span className="material-symbols-rounded">clinical_notes</span>
                  <span>Phlebotomy Handover Remarks</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', color: '#334155' }}>
                  {selectedVisitDetail.phlebotomyNotes || selectedVisitDetail.disposition?.notes || 'No custom handover notes recorded.'}
                </div>
              </div>
            </div>

            <footer className="lwp-handoff-modal__footer">
              <button
                className="lnh-filter-btn lnh-filter-btn--active"
                onClick={() => setSelectedVisitDetail(null)}
              >
                <span>Close Details</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabNurseHistoryView;
