/**
 * features/ipd/SurgicalHistoryManager.jsx
 * Enterprise Material 3 Surgical History & Post-Operative Case Management
 * Provides clinical quality segregation (Success vs Complications/Failures),
 * procedure duration analytics, operative records, and post-op transfer tracking.
 */
import React, { useState, useMemo } from 'react';
import { formatDoctorName, formatPatientName } from '../../utils/patientFormatters';
import {
  Md3Button,
  Md3TextField,
  Md3Select,
  Md3BottomSheet,
} from '../../components/md3/Md3FormComponents';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './OTScheduleBoard.css';

export const SurgicalHistoryManager = ({
  sessions = [],
  otRooms = [],
  onOpenConsumables,
  onRefresh,
}) => {
  // Filters State
  const [outcomeFilter, setOutcomeFilter] = useState('ALL'); // 'ALL' | 'SUCCESSFUL' | 'COMPLICATIONS' | 'FAILED'
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected session for detailed Case Summary Modal
  const [selectedCase, setSelectedCase] = useState(null);

  // ── All Completed & Terminated Sessions ─────────────────────
  const allHistoricalSessions = useMemo(() => {
    return sessions.filter((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED');
  }, [sessions]);

  // ── Quality Metrics Calculation ─────────────────────────────
  const metrics = useMemo(() => {
    const total = allHistoricalSessions.length;
    if (total === 0) {
      return {
        total: 0,
        successful: 0,
        complications: 0,
        failed: 0,
        successRate: 100,
        complicationRate: 0,
        avgDurationMinutes: 0,
      };
    }

    let successful = 0;
    let complications = 0;
    let failed = 0;
    let totalMinutes = 0;
    let countedMinutes = 0;

    allHistoricalSessions.forEach((s) => {
      const outcome = s.outcome || (s.status === 'CANCELLED' ? 'ABORTED' : 'SUCCESSFUL');
      if (outcome === 'SUCCESSFUL') {
        successful += 1;
      } else if (outcome === 'GUARDED' || outcome === 'COMPLICATIONS') {
        complications += 1;
      } else if (outcome === 'FAILED' || outcome === 'ABORTED' || s.status === 'CANCELLED') {
        failed += 1;
      } else {
        successful += 1;
      }

      if (s.actualDurationMinutes && s.actualDurationMinutes > 0) {
        totalMinutes += s.actualDurationMinutes;
        countedMinutes += 1;
      }
    });

    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
    const complicationRate = total > 0 ? Math.round((complications / total) * 100) : 0;
    const avgDurationMinutes = countedMinutes > 0 ? Math.round(totalMinutes / countedMinutes) : 0;

    return {
      total,
      successful,
      complications,
      failed,
      successRate,
      complicationRate,
      avgDurationMinutes,
    };
  }, [allHistoricalSessions]);

  // ── Filtered History Records ────────────────────────────────
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return allHistoricalSessions
      .filter((s) => {
        const outcome = s.outcome || (s.status === 'CANCELLED' ? 'ABORTED' : 'SUCCESSFUL');

        // 1. Outcome segregation filter
        if (outcomeFilter === 'SUCCESSFUL' && outcome !== 'SUCCESSFUL') return false;
        if (outcomeFilter === 'COMPLICATIONS' && outcome !== 'GUARDED' && outcome !== 'COMPLICATIONS') return false;
        if (outcomeFilter === 'FAILED' && outcome !== 'FAILED' && outcome !== 'ABORTED' && s.status !== 'CANCELLED') {
          return false;
        }

        // 2. OT Room filter
        if (roomFilter !== 'ALL') {
          const rId = s.roomId?._id || s.roomId;
          if (rId !== roomFilter) return false;
        }

        // 3. Date presets
        const sessionDate = s.actualStart || s.scheduledStart;
        if (sessionDate) {
          const sDateObj = new Date(sessionDate);
          const sDateStr = sDateObj.toISOString().split('T')[0];

          if (datePreset === 'TODAY' && sDateStr !== todayStr) return false;
          if (datePreset === 'WEEK') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (sDateObj < sevenDaysAgo) return false;
          }
          if (datePreset === 'MONTH') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (sDateObj < thirtyDaysAgo) return false;
          }
          if (datePreset === 'CUSTOM' && customDate && sDateStr !== customDate) return false;
        }

        // 4. Full-text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const patientName = formatPatientName(s.patientId).toLowerCase();
          const mrn = (s.patientId?.mrn || '').toLowerCase();
          const procedure = (s.procedureName || '').toLowerCase();
          const surgeon = formatDoctorName(s.leadSurgeonId).toLowerCase();

          if (!patientName.includes(q) && !mrn.includes(q) && !procedure.includes(q) && !surgeon.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const bDate = new Date(b.actualEnd || b.actualStart || b.scheduledStart || 0).getTime();
        const aDate = new Date(a.actualEnd || a.actualStart || a.scheduledStart || 0).getTime();
        return bDate - aDate;
      });
  }, [allHistoricalSessions, outcomeFilter, roomFilter, datePreset, customDate, searchQuery]);

  // Helper for outcome badge
  const renderOutcomeBadge = (session) => {
    const outcome = session.outcome || (session.status === 'CANCELLED' ? 'ABORTED' : 'SUCCESSFUL');
    if (outcome === 'SUCCESSFUL') {
      return (
        <span className="ot-history-badge ot-history-badge--success" title="Uncomplicated Surgical Recovery">
          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
            check_circle
          </span>
          <span>Successful</span>
        </span>
      );
    }
    if (outcome === 'GUARDED' || outcome === 'COMPLICATIONS') {
      return (
        <span className="ot-history-badge ot-history-badge--warning" title="Intra-Operative Complications / Guarded Prognosis">
          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
            warning
          </span>
          <span>{outcome === 'GUARDED' ? 'Guarded Post-Op' : 'Complications'}</span>
        </span>
      );
    }
    return (
      <span className="ot-history-badge ot-history-badge--danger" title="Failed Procedure or Aborted in Theatre">
        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
          cancel
        </span>
        <span>{outcome === 'ABORTED' || session.status === 'CANCELLED' ? 'Aborted' : 'Failed'}</span>
      </span>
    );
  };

  return (
    <div className="ot-history-workspace">
      {/* ── 1. Clinical Quality Analytics Ribbon ── */}
      <div className="ot-history-metrics-grid">
        <div className="ot-history-metric-card">
          <div className="ot-history-metric-icon" style={{ background: '#f3e8fd', color: '#7c3aed' }}>
            <span className="material-symbols-rounded">medical_information</span>
          </div>
          <div>
            <div className="ot-history-metric-val">{metrics.total}</div>
            <div className="ot-history-metric-label">Completed Cases</div>
          </div>
        </div>

        <div className="ot-history-metric-card" style={{ borderLeft: '4px solid #137333' }}>
          <div className="ot-history-metric-icon" style={{ background: '#e6f4ea', color: '#137333' }}>
            <span className="material-symbols-rounded">verified</span>
          </div>
          <div>
            <div className="ot-history-metric-val" style={{ color: '#137333' }}>
              {metrics.successRate}%
            </div>
            <div className="ot-history-metric-label">
              Success Rate ({metrics.successful} Cases)
            </div>
          </div>
        </div>

        <div className="ot-history-metric-card" style={{ borderLeft: '4px solid #825500' }}>
          <div className="ot-history-metric-icon" style={{ background: '#ffddb3', color: '#825500' }}>
            <span className="material-symbols-rounded">report_problem</span>
          </div>
          <div>
            <div className="ot-history-metric-val" style={{ color: '#825500' }}>
              {metrics.complicationRate}%
            </div>
            <div className="ot-history-metric-label">
              Complications ({metrics.complications} Cases)
            </div>
          </div>
        </div>

        <div className="ot-history-metric-card">
          <div className="ot-history-metric-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <span className="material-symbols-rounded">timer</span>
          </div>
          <div>
            <div className="ot-history-metric-val">{metrics.avgDurationMinutes} min</div>
            <div className="ot-history-metric-label">Avg Procedure Time</div>
          </div>
        </div>
      </div>

      {/* ── 2. Segregation Filters & Operational Controls ── */}
      <div className="ot-history-controls-bar">
        {/* Outcome Segregation Chips */}
        <div className="ot-history-outcome-chips">
          <button
            type="button"
            className={`ot-segregation-chip ${outcomeFilter === 'ALL' ? 'ot-segregation-chip--active' : ''}`}
            onClick={() => setOutcomeFilter('ALL')}
          >
            <span>All Completed</span>
            <span className="ot-segregation-chip-count">{metrics.total}</span>
          </button>

          <button
            type="button"
            className={`ot-segregation-chip ot-segregation-chip--success ${outcomeFilter === 'SUCCESSFUL' ? 'ot-segregation-chip--active' : ''}`}
            onClick={() => setOutcomeFilter('SUCCESSFUL')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
              check_circle
            </span>
            <span>Successful</span>
            <span className="ot-segregation-chip-count">{metrics.successful}</span>
          </button>

          <button
            type="button"
            className={`ot-segregation-chip ot-segregation-chip--warning ${outcomeFilter === 'COMPLICATIONS' ? 'ot-segregation-chip--active' : ''}`}
            onClick={() => setOutcomeFilter('COMPLICATIONS')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
              warning
            </span>
            <span>Complications</span>
            <span className="ot-segregation-chip-count">{metrics.complications}</span>
          </button>

          <button
            type="button"
            className={`ot-segregation-chip ot-segregation-chip--danger ${outcomeFilter === 'FAILED' ? 'ot-segregation-chip--active' : ''}`}
            onClick={() => setOutcomeFilter('FAILED')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
              cancel
            </span>
            <span>Failed / Aborted</span>
            <span className="ot-segregation-chip-count">{metrics.failed}</span>
          </button>
        </div>

        {/* Date and Search Controls */}
        <div className="ot-history-filter-inputs">
          {/* Quick Date Presets */}
          <div className="ot-date-preset-group">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'WEEK', label: 'Past 7 Days' },
              { id: 'MONTH', label: 'Past 30 Days' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ot-date-preset-btn ${datePreset === p.id ? 'ot-date-preset-btn--active' : ''}`}
                onClick={() => {
                  setDatePreset(p.id);
                  setCustomDate('');
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDatePreset('CUSTOM');
            }}
            title="Filter by specific surgery date"
            className="ot-history-date-input"
          />

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="ot-history-select"
          >
            <option value="ALL">All OT Rooms</option>
            {otRooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.roomName || `Room ${r.roomNumber}`}
              </option>
            ))}
          </select>

          <div className="ot-history-search-wrap">
            <span className="material-symbols-rounded ot-history-search-icon">search</span>
            <input
              type="text"
              placeholder="Search patient, MRN, procedure, surgeon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ot-history-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ot-history-search-clear"
                title="Clear Search"
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. History Case List ── */}
      {filteredSessions.length === 0 ? (
        <div className="ot-history-empty-card">
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#006a6a' }}>
            history_edu
          </span>
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem', color: '#191c1d' }}>
            No Historical Surgeries Found
          </h3>
          <p style={{ margin: '0 auto 16px', maxWidth: '440px', fontSize: '0.84rem', color: '#49454f' }}>
            {allHistoricalSessions.length === 0
              ? 'No surgical sessions have been finalized or completed yet. Completed sessions will be archived here automatically.'
              : 'No completed surgeries match the active filters or search terms.'}
          </p>
          {allHistoricalSessions.length > 0 && (
            <Md3Button
              variant="tonal"
              onClick={() => {
                setOutcomeFilter('ALL');
                setDatePreset('ALL');
                setCustomDate('');
                setRoomFilter('ALL');
                setSearchQuery('');
              }}
            >
              <span className="material-symbols-rounded">filter_alt_off</span>
              <span>Reset All Filters</span>
            </Md3Button>
          )}
        </div>
      ) : (
        <div className="ot-history-list">
          {filteredSessions.map((session) => {
            const roomName = session.roomId?.roomName || (session.roomId?.roomNumber ? `OT Room ${session.roomId.roomNumber}` : 'General Theatre');
            const patientName = formatPatientName(session.patientId);
            const surgeonName = formatDoctorName(session.leadSurgeonId);
            const anesthetistName = formatDoctorName(session.anesthetistId);
            const scrubNurseName = session.scrubNurseId ? `${session.scrubNurseId.firstName || ''} ${session.scrubNurseId.lastName || ''}`.trim() : null;

            const startDate = session.actualStart || session.scheduledStart;
            const formattedDate = startDate
              ? new Date(startDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
              : '—';
            const startTimeStr = startDate
              ? new Date(startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const endTimeStr = session.actualEnd
              ? new Date(session.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div key={session._id} className="ot-history-card">
                {/* Header Row: Room, Outcome Badge & Category */}
                <div className="ot-history-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="ot-room-badge">
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                        meeting_room
                      </span>
                      <span>{roomName}</span>
                    </div>

                    {renderOutcomeBadge(session)}

                    {session.procedureCategory === 'EMERGENCY_TRAUMA' && (
                      <span className="ot-tag-stat-trauma">★ STAT TRAUMA</span>
                    )}
                    {session.procedureCategory === 'EMERGENCY_MATERNITY_CSECTION' && (
                      <span className="ot-tag-stat-maternity">♥ STAT OBSTETRIC</span>
                    )}
                    {session.procedureCategory === 'EMERGENCY_ACUTE' && (
                      <span className="ot-tag-stat-acute">⚡ ACUTE STAT</span>
                    )}
                  </div>

                  <div className="ot-history-card-timing">
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      calendar_month
                    </span>
                    <strong>{formattedDate}</strong>
                    {startTimeStr && (
                      <span>
                        • {startTimeStr} {endTimeStr ? `– ${endTimeStr}` : ''}
                      </span>
                    )}
                    {session.actualDurationMinutes && (
                      <span className="ot-history-duration-pill">
                        ⏱ {session.actualDurationMinutes} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient & Procedure Identity */}
                <div className="ot-history-card-body">
                  <div className="ot-history-patient-strip">
                    <div className="ot-history-avatar">
                      {patientName.charAt(0) || 'P'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ot-history-proc-name">{session.procedureName}</div>
                      <div className="ot-history-patient-meta">
                        <span className="ot-history-patient-name">{patientName}</span>
                        {session.patientId?.mrn && (
                          <span className="ot-history-mrn-chip">MRN: {session.patientId.mrn}</span>
                        )}
                        {session.patientId?.gender && (
                          <span>• {session.patientId.gender}</span>
                        )}
                        {session.patientId?.age && (
                          <span>• {session.patientId.age} yrs</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Team & Destination Strip */}
                  <div className="ot-history-details-grid">
                    <div className="ot-history-detail-item">
                      <span className="ot-history-detail-label">Lead Surgeon</span>
                      <strong className="ot-history-detail-val">{surgeonName || '—'}</strong>
                    </div>

                    <div className="ot-history-detail-item">
                      <span className="ot-history-detail-label">Anesthetist</span>
                      <strong className="ot-history-detail-val">{anesthetistName || '—'}</strong>
                      {session.anesthesiaType && (
                        <span className="ot-history-sub-text">({session.anesthesiaType})</span>
                      )}
                    </div>

                    <div className="ot-history-detail-item">
                      <span className="ot-history-detail-label">Scrub Nurse</span>
                      <strong className="ot-history-detail-val">{scrubNurseName || '—'}</strong>
                    </div>

                    <div className="ot-history-detail-item">
                      <span className="ot-history-detail-label">Post-Op Destination</span>
                      <strong className="ot-history-detail-val" style={{ color: '#006a6a' }}>
                        {session.postOpDestination || 'POST_OP_RECOVERY'}
                        {session.postOpBedId?.bedNumber && (
                          <span style={{ fontWeight: 500, color: '#49454f' }}>
                            {' '}
                            (Bed {session.postOpBedId.bedNumber})
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Operative Notes Preview */}
                  {session.operativeNotes && (
                    <div className="ot-history-notes-preview">
                      <span className="ot-history-notes-tag">Operative Notes:</span>
                      <span className="ot-history-notes-text">{session.operativeNotes}</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="ot-history-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {session.isConsumablesBilled && (
                      <span className="ot-history-billed-pill">
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                          receipt_long
                        </span>
                        <span>Consumables Billed</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onOpenConsumables && (
                      <Md3Button
                        variant="tonal"
                        onClick={() => onOpenConsumables(session)}
                        style={{ fontSize: '0.80rem' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          inventory_2
                        </span>
                        <span>Consumables</span>
                      </Md3Button>
                    )}

                    <Md3Button
                      variant="filled"
                      onClick={() => setSelectedCase(session)}
                      style={{ background: '#006a6a', color: '#ffffff', fontSize: '0.80rem' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                        clinical_notes
                      </span>
                      <span>Operative Case Record</span>
                    </Md3Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Full Operative Record Modal ── */}
      <Md3BottomSheet
        isOpen={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        title="Operative Record &amp; Post-Op Audit"
        subtitle={
          selectedCase
            ? `Procedure: ${selectedCase.procedureName} • Patient: ${formatPatientName(selectedCase.patientId)} (${selectedCase.patientId?.mrn || 'N/A'})`
            : ''
        }
      >
        {selectedCase && (
          <div className="ot-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Outcome & Milestone Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--md-sys-color-surface-container, #f3edf7)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#49454f', fontWeight: 700 }}>
                  Clinical Outcome
                </div>
                <div style={{ marginTop: '4px' }}>{renderOutcomeBadge(selectedCase)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#49454f', fontWeight: 700 }}>
                  Actual Duration
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#191c1d' }}>
                  {selectedCase.actualDurationMinutes || '—'} minutes
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#49454f', fontWeight: 700 }}>
                  Transferred Post-Op
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#006a6a' }}>
                  {selectedCase.postOpDestination || 'POST_OP_RECOVERY'}
                  {selectedCase.postOpBedId?.bedNumber ? ` (Bed ${selectedCase.postOpBedId.bedNumber})` : ''}
                </div>
              </div>
            </div>

            {/* Surgical Team Matrix */}
            <div className="ot-case-section">
              <h4 className="ot-case-section-title">Surgical &amp; Anesthetic Team</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div className="ot-case-team-box">
                  <span className="ot-case-team-role">Lead Surgeon</span>
                  <strong>{formatDoctorName(selectedCase.leadSurgeonId) || '—'}</strong>
                  {selectedCase.leadSurgeonId?.position && (
                    <span className="ot-case-team-sub">{selectedCase.leadSurgeonId.position}</span>
                  )}
                </div>

                <div className="ot-case-team-box">
                  <span className="ot-case-team-role">Anesthetist</span>
                  <strong>{formatDoctorName(selectedCase.anesthetistId) || '—'}</strong>
                  <span className="ot-case-team-sub">Technique: {selectedCase.anesthesiaType || 'General'}</span>
                </div>

                <div className="ot-case-team-box">
                  <span className="ot-case-team-role">Scrub Nurse</span>
                  <strong>
                    {selectedCase.scrubNurseId
                      ? `${selectedCase.scrubNurseId.firstName || ''} ${selectedCase.scrubNurseId.lastName || ''}`.trim()
                      : '—'}
                  </strong>
                </div>

                <div className="ot-case-team-box">
                  <span className="ot-case-team-role">Circulating Nurse</span>
                  <strong>
                    {selectedCase.circulatingNurseId
                      ? `${selectedCase.circulatingNurseId.firstName || ''} ${selectedCase.circulatingNurseId.lastName || ''}`.trim()
                      : '—'}
                  </strong>
                </div>
              </div>
            </div>

            {/* WHO Surgical Safety Checklist Status */}
            <div className="ot-case-section">
              <h4 className="ot-case-section-title">WHO Surgical Safety Checklist Compliance</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {[
                  { key: 'consentSigned', label: '1. Identity & Consent Confirmed' },
                  { key: 'npoConfirmed', label: '2. NPO Fasting Verified' },
                  { key: 'siteMarked', label: '3. Incision Site Marked' },
                  { key: 'allergiesReviewed', label: '4. Allergies & Anaphylaxis Risk' },
                  { key: 'bloodCrossmatched', label: '5. Blood Products Crossmatched' },
                  { key: 'anesthesiaClearance', label: '6. Anesthesia Machine & Clearance' },
                ].map((item) => {
                  const verified = selectedCase.preOpChecklist?.[item.key];
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: verified ? '#e6f4ea' : '#fce8e6',
                        color: verified ? '#137333' : '#c5221f',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        {verified ? 'check_circle' : 'cancel'}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operative Technique & Notes */}
            <div className="ot-case-section">
              <h4 className="ot-case-section-title">Operative Technique &amp; Findings</h4>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  color: '#191c1d',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedCase.operativeNotes || 'No intraoperative notes recorded.'}
              </div>
            </div>

            {/* Post-Operative Nursing Instructions */}
            <div className="ot-case-section">
              <h4 className="ot-case-section-title">Post-Operative Orders &amp; Recovery Instructions</h4>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  color: '#191c1d',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedCase.postOpNotes || 'Standard PACU recovery protocol.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Md3Button variant="filled" onClick={() => setSelectedCase(null)}>
                Close Record
              </Md3Button>
            </div>
          </div>
        )}
      </Md3BottomSheet>
    </div>
  );
};

export default SurgicalHistoryManager;
