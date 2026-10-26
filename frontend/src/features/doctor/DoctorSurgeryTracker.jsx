import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDoctorName, formatPatientName, getPatientInitials } from '../../utils/patientFormatters';
import { Md3Avatar } from '../../components/md3/Md3Widgets';
import { Md3Button, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import './DoctorSurgeryTracker.css';

const MILESTONES = [
  { key: 'REQUESTED', label: 'Requested', icon: 'pending_actions', color: '#6750a4' },
  { key: 'SCHEDULED', label: 'OT Scheduled', icon: 'event_available', color: '#006a6a' },
  { key: 'IN_OT', label: 'In OT Pre-Op', icon: 'meeting_room', color: '#0062a0' },
  { key: 'WAITING_FOR_SURGEON', label: 'Waiting Surgeon', icon: 'hourglass_top', color: '#825500' },
  { key: 'ANESTHESIA_ADMINISTERED', label: 'Anesthesia Given', icon: 'vaccines', color: '#7a5900' },
  { key: 'IN_PROGRESS', label: 'Surgery Active', icon: 'medical_services', color: '#ba1a1a' },
  { key: 'POST_OP_PACU', label: 'PACU Recovery', icon: 'healing', color: '#386663' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check_circle', color: '#146c2e' },
];

export const DoctorSurgeryTracker = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, ACTIVE, EMERGENCY, SCHEDULED, COMPLETED
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  const fetchDoctorSurgeries = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      // Fetch sessions requested by or involving current doctor
      const res = await ipdApi.getOtSessions({ myRequests: 'true' });
      setSessions(res.data?.data || []);
      if (!isSilent) setLoading(false);
    } catch (err) {
      if (!isSilent) {
        setLoading(false);
        showError('Sync Failed', 'Could not refresh surgical tracker data.');
      }
      console.warn('Failed to load doctor surgeries:', err);
    }
  }, [showError]);

  useEffect(() => {
    fetchDoctorSurgeries();

    const interval = setInterval(() => {
      fetchDoctorSurgeries(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDoctorSurgeries]);

  // Telemetry KPIs
  const kpis = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((s) =>
      ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)
    ).length;
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'REQUESTED').length;
    const emergency = sessions.filter((s) =>
      ['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(s.procedureCategory) ||
      s.urgency === 'EMERGENCY_STAT' ||
      s.surgeryType === 'EMERGENCY'
    ).length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;

    return { total, active, scheduled, emergency, completed };
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Category filter
      if (filterCategory === 'ACTIVE') {
        if (!['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)) {
          return false;
        }
      } else if (filterCategory === 'EMERGENCY') {
        const isEmerg =
          ['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(s.procedureCategory) ||
          s.urgency === 'EMERGENCY_STAT' ||
          s.surgeryType === 'EMERGENCY';
        if (!isEmerg) return false;
      } else if (filterCategory === 'SCHEDULED') {
        if (s.status !== 'SCHEDULED' && s.status !== 'REQUESTED') return false;
      } else if (filterCategory === 'COMPLETED') {
        if (s.status !== 'COMPLETED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = `${s.patientId?.firstName || ''} ${s.patientId?.lastName || ''}`.toLowerCase();
        const mrn = (s.patientId?.mrn || '').toLowerCase();
        const proc = (s.procedureName || '').toLowerCase();
        const room = (s.roomId?.roomName || s.roomId?.roomNumber || '').toLowerCase();
        return pName.includes(q) || mrn.includes(q) || proc.includes(q) || room.includes(q);
      }

      return true;
    });
  }, [sessions, filterCategory, searchQuery]);

  const getMilestoneIndex = (status) => {
    const idx = MILESTONES.findIndex((m) => m.key === status);
    return idx >= 0 ? idx : 0;
  };

  const getEmergencyTag = (session) => {
    const cat = session.procedureCategory || session.surgeryType;
    if (cat === 'EMERGENCY_TRAUMA') {
      return { label: 'STAT Trauma & Accident', icon: 'emergency', className: 'doc-surgery-tag--trauma' };
    }
    if (cat === 'EMERGENCY_MATERNITY_CSECTION') {
      return { label: 'Maternity Childbirth / C-Section', icon: 'child_care', className: 'doc-surgery-tag--maternity' };
    }
    if (cat === 'EMERGENCY_ACUTE' || session.urgency === 'EMERGENCY_STAT') {
      return { label: 'Acute Surgical Emergency', icon: 'bolt', className: 'doc-surgery-tag--acute' };
    }
    return { label: 'Planned Elective', icon: 'event_note', className: 'doc-surgery-tag--elective' };
  };

  return (
    <div className="doc-surgery-tracker">
      {/* ─── Unified Hero & Compact Telemetry Banner ─── */}
      <div className="doc-surgery-hero">
        <div className="doc-surgery-hero__top">
          <div className="doc-surgery-hero__title-group">
            <div className="doc-surgery-hero__icon">
              <span className="material-symbols-rounded">medical_services</span>
            </div>
            <div>
              <h2 className="doc-surgery-hero__title">Surgical Orders &amp; Live OT Tracker</h2>
              <p className="doc-surgery-hero__subtitle">
                Real-time surgical lifecycle, theatre room allocations, and patient intraoperative telemetry
              </p>
            </div>
          </div>

          <div className="doc-surgery-hero__actions">
            <button
              type="button"
              className="doc-surgery-refresh-btn"
              onClick={() => fetchDoctorSurgeries(false)}
              disabled={loading}
              title="Refresh OT telemetry"
            >
              <span className={`material-symbols-rounded ${loading ? 'spinning' : ''}`}>sync</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Dense 5-Metric Telemetry Ribbon */}
        <div className="doc-surgery-telemetry-deck" role="region" aria-label="Surgical Metrics">
          <div
            className={`doc-surgery-telemetry-card ${filterCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterCategory('ALL')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFilterCategory('ALL')}
            title="Click to view all surgical orders"
          >
            <span className="doc-telemetry-icon primary">
              <span className="material-symbols-rounded">folder_open</span>
            </span>
            <div className="doc-telemetry-text">
              <span className="doc-telemetry-val">{kpis.total}</span>
              <span className="doc-telemetry-lbl">Total Orders</span>
            </div>
          </div>

          <div
            className={`doc-surgery-telemetry-card ${filterCategory === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setFilterCategory('ACTIVE')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFilterCategory('ACTIVE')}
            title="Click to filter active surgeries in OT / PACU"
          >
            <span className="doc-telemetry-icon active-ot">
              <span className="material-symbols-rounded">vital_signs</span>
            </span>
            <div className="doc-telemetry-text">
              <span className="doc-telemetry-val">{kpis.active}</span>
              <span className="doc-telemetry-lbl">Active in OT / PACU</span>
            </div>
          </div>

          <div
            className={`doc-surgery-telemetry-card ${filterCategory === 'EMERGENCY' ? 'active' : ''}`}
            onClick={() => setFilterCategory('EMERGENCY')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFilterCategory('EMERGENCY')}
            title="Click to filter emergency procedures"
          >
            <span className="doc-telemetry-icon emergency">
              <span className="material-symbols-rounded">e911_emergency</span>
            </span>
            <div className="doc-telemetry-text">
              <span className="doc-telemetry-val">{kpis.emergency}</span>
              <span className="doc-telemetry-lbl">Emergencies</span>
            </div>
          </div>

          <div
            className={`doc-surgery-telemetry-card ${filterCategory === 'SCHEDULED' ? 'active' : ''}`}
            onClick={() => setFilterCategory('SCHEDULED')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFilterCategory('SCHEDULED')}
            title="Click to filter scheduled procedures"
          >
            <span className="doc-telemetry-icon scheduled">
              <span className="material-symbols-rounded">event_available</span>
            </span>
            <div className="doc-telemetry-text">
              <span className="doc-telemetry-val">{kpis.scheduled}</span>
              <span className="doc-telemetry-lbl">Scheduled &amp; Queued</span>
            </div>
          </div>

          <div
            className={`doc-surgery-telemetry-card ${filterCategory === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setFilterCategory('COMPLETED')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setFilterCategory('COMPLETED')}
            title="Click to filter completed procedures"
          >
            <span className="doc-telemetry-icon completed">
              <span className="material-symbols-rounded">verified</span>
            </span>
            <div className="doc-telemetry-text">
              <span className="doc-telemetry-val">{kpis.completed}</span>
              <span className="doc-telemetry-lbl">Concluded</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search and Quick Filter Bar (Responsive Horizontal Strip) ─── */}
      <div className="doc-surgery-controls-card">
        <div className="doc-surgery-controls-row">
          <div className="doc-surgery-search-box">
            <span className="material-symbols-rounded doc-surgery-search-icon">search</span>
            <input
              type="text"
              className="doc-surgery-search-input"
              placeholder="Search patient, MRN, procedure name, or OT suite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="doc-surgery-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          <div className="doc-surgery-chips-strip">
            {[
              { id: 'ALL', label: 'All Procedures', icon: 'list_alt' },
              { id: 'ACTIVE', label: 'Live in OT', icon: 'vital_signs', colorClass: 'active-ot' },
              { id: 'EMERGENCY', label: 'Emergencies', icon: 'e911_emergency', colorClass: 'emergency' },
              { id: 'SCHEDULED', label: 'Scheduled', icon: 'event_available', colorClass: 'scheduled' },
              { id: 'COMPLETED', label: 'Completed', icon: 'verified', colorClass: 'completed' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`doc-surgery-filter-chip ${filterCategory === chip.id ? 'active' : ''} ${chip.colorClass || ''}`}
                onClick={() => setFilterCategory(chip.id)}
              >
                <span className="material-symbols-rounded">{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Surgical Cards Grid ─── */}
      {loading && sessions.length === 0 ? (
        <div className="doc-surgery-loading">
          <span className="material-symbols-rounded doc-surgery-loading__spinner">progress_activity</span>
          <p>Connecting to Operating Theatre telemetry...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="doc-surgery-empty">
          <span className="material-symbols-rounded doc-surgery-empty__icon">clinical_notes</span>
          <h3>No surgical records matching your filter</h3>
          <p>Surgical orders created during consultations or ward rounds will stream here in real time.</p>
        </div>
      ) : (
        <div className="doc-surgery-grid">
          {filteredSessions.map((session) => {
            const emerg = getEmergencyTag(session);
            const curStepIdx = getMilestoneIndex(session.status);
            const p = session.patientId || {};
            const pName = formatPatientName(p) || 'Patient';
            const pInitials = getPatientInitials(p);
            const mrn = p.mrn || '—';
            const roomName = session.roomId ? (session.roomId.roomName || `Room ${session.roomId.roomNumber}`) : 'Pending Allocation';

            const formatStaffName = (staff, fallback = 'On-Duty') => {
              if (!staff) return fallback;
              if (typeof staff === 'string') return staff;
              if (staff.fullName) return staff.fullName;
              const parts = [staff.firstName, staff.lastName].filter(Boolean);
              if (parts.length > 0) return parts.join(' ');
              return staff.name || fallback;
            };

            const leadSurgeonObj = session.leadSurgeonId || session.suggestedSurgeonId;
            const surgeonName = formatDoctorName(formatStaffName(leadSurgeonObj, 'Unassigned Surgeon'));
            const anesStaff = session.anesthetistId;
            const rawAnesName = formatStaffName(anesStaff, '');
            const anesMode = session.anesthesiaType || 'General';
            const anesDisplay = rawAnesName ? `${anesMode} (${rawAnesName})` : anesMode;

            const isCurrentActive = ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(session.status);
            const isCompleted = session.status === 'COMPLETED';

            const formattedTime = session.scheduledStart
              ? new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : (session.targetDate ? new Date(session.targetDate).toLocaleDateString() : 'Pending Schedule');

            const currentMilestone = MILESTONES.find((m) => m.key === session.status) || MILESTONES[0];
            const currentStepNum = isCompleted ? MILESTONES.length : curStepIdx + 1;

            return (
              <article
                key={session._id}
                className={`doc-surgery-card ${isCurrentActive ? 'doc-surgery-card--active' : ''} ${isCompleted ? 'doc-surgery-card--completed' : ''}`}
              >
                {/* 1. Patient Identity & Urgency Header */}
                <div className="doc-surgery-card__head">
                  <div className="doc-surgery-card__patient-block">
                    <Md3Avatar
                      initials={pInitials}
                      size="small"
                      variant={emerg.className.includes('trauma') || emerg.className.includes('acute') ? 'error' : isCurrentActive ? 'tertiary' : 'primary'}
                    />
                    <div className="doc-surgery-card__patient-identity">
                      <h4 className="doc-surgery-card__patient-name" title={pName}>{pName}</h4>
                      <div className="doc-surgery-card__patient-meta">
                        <span className="doc-surgery-mrn-chip">MRN: {mrn}</span>
                        {(p.age || p.gender) && (
                          <span className="doc-surgery-demog-chip">
                            {[p.age ? `${p.age}y` : null, p.gender].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`doc-surgery-tag ${emerg.className}`}>
                    <span className="material-symbols-rounded">{emerg.icon}</span>
                    <span>{emerg.label}</span>
                  </span>
                </div>

                {/* 2. Clinical Procedure Banner */}
                <div className="doc-surgery-card__proc-wrap">
                  <span className="material-symbols-rounded doc-surgery-card__proc-icon">medical_services</span>
                  <div className="doc-surgery-card__proc-text">
                    <Md3MarqueeText text={session.procedureName || 'Surgical Procedure'} speed={28} />
                  </div>
                  <span className={`doc-surgery-card__stage-pill stage-${session.status.toLowerCase()}`}>
                    {currentMilestone.label}
                  </span>
                </div>

                {/* 3. Integrated Logistics & Team Matrix (Cohesive 2x2 Grid) */}
                <div className="doc-surgery-card__team-matrix">
                  <div className="doc-matrix-cell">
                    <span className="doc-matrix-lbl">
                      <span className="material-symbols-rounded">meeting_room</span>
                      <span>Operating Suite</span>
                    </span>
                    <span className="doc-matrix-val" title={roomName}>{roomName}</span>
                  </div>

                  <div className="doc-matrix-cell">
                    <span className="doc-matrix-lbl">
                      <span className="material-symbols-rounded">schedule</span>
                      <span>Schedule / Timing</span>
                    </span>
                    <span className="doc-matrix-val">{formattedTime}</span>
                  </div>

                  <div className="doc-matrix-cell">
                    <span className="doc-matrix-lbl">
                      <span className="material-symbols-rounded">person_pin</span>
                      <span>Lead Surgeon</span>
                    </span>
                    <span className="doc-matrix-val" title={surgeonName}>{surgeonName}</span>
                  </div>

                  <div className="doc-matrix-cell">
                    <span className="doc-matrix-lbl">
                      <span className="material-symbols-rounded">vaccines</span>
                      <span>Anesthesia Mode</span>
                    </span>
                    <span className="doc-matrix-val" title={anesDisplay}>{anesDisplay}</span>
                  </div>
                </div>

                {/* 4. Surgical Lifecycle (Progress Meter & Segmented Bar) */}
                <div className="doc-surgery-lifecycle">
                  <div className="doc-lifecycle-header">
                    <span className="doc-lifecycle-title">
                      <span className="material-symbols-rounded">timeline</span>
                      <span>Lifecycle Progress</span>
                    </span>
                    <span className="doc-lifecycle-counter">
                      Stage {currentStepNum} of {MILESTONES.length} • {currentMilestone.label}
                    </span>
                  </div>

                  {/* Segmented Milestone Progress Bar */}
                  <div className="doc-lifecycle-segments">
                    {MILESTONES.map((m, idx) => {
                      const isFilled = idx < curStepIdx || isCompleted;
                      const isCurrent = idx === curStepIdx && !isCompleted;
                      return (
                        <div
                          key={m.key}
                          className={`doc-lifecycle-segment ${isFilled ? 'filled' : ''} ${isCurrent ? 'current' : ''}`}
                          title={`${m.label} (${isFilled ? 'Done' : isCurrent ? 'Active Now' : 'Pending'})`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 5. Card Action Footer */}
                <div className="doc-surgery-card__foot">
                  <div className="doc-surgery-card__request-meta">
                    <span className="material-symbols-rounded">history</span>
                    <span>Requested {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    type="button"
                    className="doc-surgery-detail-btn"
                    onClick={() => setSelectedSessionDetail(session)}
                  >
                    <span className="material-symbols-rounded">visibility</span>
                    <span>Notes &amp; Checklist</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ─── Detail Inspection Bottom Sheet ─── */}
      {selectedSessionDetail && (
        <Md3BottomSheet
          isOpen={Boolean(selectedSessionDetail)}
          onClose={() => setSelectedSessionDetail(null)}
          title={`Surgical Encounter: ${selectedSessionDetail.procedureName}`}
          subtitle={`Patient: ${formatPatientName(selectedSessionDetail.patientId)} (MRN: ${selectedSessionDetail.patientId?.mrn || '—'})`}
        >
          <div className="doc-surgery-sheet-content">
            {/* Urgency & Status Overview */}
            <div className="doc-surgery-sheet-badge-row">
              <span className={`doc-surgery-tag ${getEmergencyTag(selectedSessionDetail).className}`}>
                {getEmergencyTag(selectedSessionDetail).label}
              </span>
              <span className="doc-surgery-tag doc-surgery-tag--neutral">
                Status: {selectedSessionDetail.status}
              </span>
              {selectedSessionDetail.roomId && (
                <span className="doc-surgery-tag doc-surgery-tag--room">
                  <span className="material-symbols-rounded" style={{ fontSize: '15px', marginRight: '4px' }}>meeting_room</span>
                  <span>{selectedSessionDetail.roomId.roomName || `Room ${selectedSessionDetail.roomId.roomNumber}`}</span>
                </span>
              )}
            </div>

            {/* Surgical Notes & Clinical Indications */}
            {selectedSessionDetail.requestNotes && (
              <div className="doc-surgery-sheet-section">
                <h5>Clinical Indications &amp; Request Notes</h5>
                <p className="doc-surgery-sheet-text">{selectedSessionDetail.requestNotes}</p>
              </div>
            )}

            {/* Pre-Op Safety Checklist Verification */}
            <div className="doc-surgery-sheet-section">
              <h5>Advisory Pre-Operative Safety Checklist</h5>
              <div className="doc-surgery-checklist-grid">
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.consentSigned ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.consentSigned ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>Informed Surgical Consent</span>
                </div>
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.npoConfirmed ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.npoConfirmed ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>NPO Fasting Verified</span>
                </div>
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.siteMarked ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.siteMarked ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>Surgical Site Marked</span>
                </div>
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.allergiesReviewed ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.allergiesReviewed ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>Allergies Reviewed</span>
                </div>
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.bloodCrossmatched ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.bloodCrossmatched ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>Blood Crossmatched</span>
                </div>
                <div className={`doc-surgery-chk-item ${selectedSessionDetail.preOpChecklist?.anesthesiaClearance ? 'doc-surgery-chk-item--ok' : ''}`}>
                  <span className="material-symbols-rounded">{selectedSessionDetail.preOpChecklist?.anesthesiaClearance ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>Anesthesia Clearance</span>
                </div>
              </div>
            </div>

            {/* Operative & Post-Op Notes */}
            {(selectedSessionDetail.operativeNotes || selectedSessionDetail.postOpNotes) && (
              <div className="doc-surgery-sheet-section">
                <h5>Operative &amp; Post-Op Documentation</h5>
                {selectedSessionDetail.operativeNotes && (
                  <div style={{ marginBottom: '8px' }}>
                    <small style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>Intraoperative Findings:</small>
                    <p className="doc-surgery-sheet-text">{selectedSessionDetail.operativeNotes}</p>
                  </div>
                )}
                {selectedSessionDetail.postOpNotes && (
                  <div>
                    <small style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>Post-Op PACU Hand-Off Notes:</small>
                    <p className="doc-surgery-sheet-text">{selectedSessionDetail.postOpNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Milestone Audit Trail */}
            {selectedSessionDetail.milestones && selectedSessionDetail.milestones.length > 0 && (
              <div className="doc-surgery-sheet-section">
                <h5>Intraoperative Milestone Audit Trail</h5>
                <div className="doc-surgery-audit-list">
                  {selectedSessionDetail.milestones.map((m, idx) => (
                    <div key={idx} className="doc-surgery-audit-item">
                      <div className="doc-surgery-audit-item__dot" />
                      <div className="doc-surgery-audit-item__content">
                        <strong>{m.status}</strong>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        {m.notes && <p>{m.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Md3Button variant="primary" onClick={() => setSelectedSessionDetail(null)}>
                Close Detail
              </Md3Button>
            </div>
          </div>
        </Md3BottomSheet>
      )}
    </div>
  );
};

export default DoctorSurgeryTracker;
