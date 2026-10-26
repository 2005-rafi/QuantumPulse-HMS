import React, { useCallback, useMemo, useState } from 'react';
import { visitAPI } from '../../services/visitAPI';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import './TriageQueue.css';

/* ============================================================
   TriageQueue — Material 3 Collapsible Clinical Queue Panel
   Path: frontend/src/features/nurse/TriageQueue.jsx
   
   Features:
   - Expanded (Card Deck): Clean, compact patient cards with arrival date/time.
   - Collapsed (Rail Mode): 76px compact sidebar with initials avatar, status dot,
     token capsule, and smooth marquee first name.
   - Independent vertical scrolling in both modes.
   ============================================================ */

/* ─── Helpers ─────────────────────────────────────────────── */

const formatPhone = (phone = '') => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length <= 4) return phone || '—';
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const first2 = digits.length === 10 ? digits.slice(0, 2) : digits.slice(-10, -8);
    return `+91 ${first2}••• •${last4}`;
  }
  return `•••• ${digits.slice(-4)}`;
};

/**
 * Formats arrival timestamp cleanly (e.g. "Today, 10:45 AM" or "28 Sep, 04:15 PM")
 */
const formatArrivalDateTime = (createdAt) => {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  return `${dateStr}, ${timeStr}`;
};

/* ─── NurseQueueRailItem — Compact 76px Sidebar Rail Item ─── */
const NurseQueueRailItem = ({ visit, selected, onSelect }) => {
  const patient = visit?.patientId || {};
  const firstName = patient.firstName || patient.name?.split(' ')[0] || 'Patient';
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Unnamed Patient';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const tokenDisplay = visit.tokenString ?? (visit.visitNumber?.slice(-4) ?? '—');
  const isCalled = visit.status === 'CALLED';
  const arrivalText = formatArrivalDateTime(visit.createdAt);
  const tooltipText = `${fullName} (${tokenDisplay}) • Arrived: ${arrivalText}`;

  return (
    <div
      className={`ntq-rail-item ${selected ? 'ntq-rail-item--selected' : ''} ${isCalled ? 'ntq-rail-item--called' : ''}`}
      onClick={() => onSelect?.(visit)}
      role="button"
      tabIndex={0}
      title={tooltipText}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(visit);
        }
      }}
      aria-label={`Select patient ${fullName}, Token ${tokenDisplay}`}
    >
      <div className="ntq-rail-item__avatar-wrapper">
        <div className="ntq-rail-item__avatar">{initials}</div>
        {isCalled && (
          <span className="ntq-rail-item__called-dot" title="Currently Called" />
        )}
      </div>

      <span className="ntq-rail-item__token">{tokenDisplay}</span>

      <div className="ntq-rail-item__name-box">
        <Md3MarqueeText text={firstName} className="ntq-rail-item__marquee" />
      </div>
    </div>
  );
};

/* ─── QueueItemCard — Compact Material 3 Patient Card (Expanded Deck) ─── */
const QueueItemCard = ({ visit, selected, onSelect, onCall, onSkip, actionLoading }) => {
  const patient = visit.patientId || {};
  const arrivalDisplay = formatArrivalDateTime(visit.createdAt);
  const initials = (
    (patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')
  ).toUpperCase() || 'P';

  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const phone = formatPhone(patient.phone);
  const tokenDisplay = visit.tokenString ?? (visit.visitNumber?.slice(-4) ?? '—');

  // Visit Status & Call Actions
  const isCalled = visit.status === 'CALLED';
  const isWaiting = visit.status === 'WAITING_TRIAGE' || visit.status === 'SKIPPED';
  const isLoading = actionLoading === (visit._id || visit.id);
  const visitTypeLabel = visit.appointmentType?.replace(/_/g, ' ') || visit.visitType || 'OPD';

  const mrnFormatted = patient.mrn ? (patient.mrn.startsWith('MRN') ? patient.mrn : `MRN: ${patient.mrn}`) : null;

  return (
    <article
      className={[
        'triage-queue-card',
        selected ? 'triage-queue-card--selected' : '',
        isCalled ? 'triage-queue-card--called' : '',
      ].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select ${fullName} for triage, token ${tokenDisplay}`}
      onClick={() => onSelect(visit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(visit);
        }
      }}
    >
      {/* ── 1. Top Meta Row: Token + Type Tag | Arrival Time + Call Action ── */}
      <div className="triage-queue-card__header-row">
        <div className="triage-queue-card__badge-cluster">
          <span className="triage-queue-card__token" title={`Token: ${tokenDisplay}`}>
            {tokenDisplay}
          </span>
          <span className="triage-queue-card__type-tag" title="Visit Type">
            {visitTypeLabel}
          </span>
        </div>

        <div className="triage-queue-card__time-cluster">
          <span className="triage-queue-card__arrival-pill" title={`Checked in: ${arrivalDisplay}`}>
            <span className="material-symbols-rounded">schedule</span>
            <span>{arrivalDisplay}</span>
          </span>

          {/* Quick Action Button (Call / Skip) */}
          <div className="triage-queue-card__actions" onClick={(e) => e.stopPropagation()}>
            {isWaiting && onCall && (
              <button
                type="button"
                className={`triage-card-action-btn triage-card-action-btn--call ${isLoading ? 'is-loading' : ''}`}
                onClick={() => onCall(visit._id || visit.id)}
                disabled={isLoading}
                title="Call patient to triage desk"
                aria-label={`Call ${fullName}`}
              >
                <span className="material-symbols-rounded">volume_up</span>
                <span className="triage-card-action-btn__label">Call</span>
              </button>
            )}
            {isCalled && onSkip && (
              <button
                type="button"
                className={`triage-card-action-btn triage-card-action-btn--skip ${isLoading ? 'is-loading' : ''}`}
                onClick={() => onSkip(visit._id || visit.id)}
                disabled={isLoading}
                title="Mark as skipped (no-show)"
                aria-label={`Skip ${fullName}`}
              >
                <span className="material-symbols-rounded">skip_next</span>
                <span className="triage-card-action-btn__label">Skip</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Patient Identity: Compact Avatar + Name + Tags ── */}
      <div className="triage-queue-card__identity-row">
        <div className="triage-queue-card__avatar">{initials}</div>

        <div className="triage-queue-card__identity-details">
          <div className="triage-queue-card__name-row">
            <h4 className="triage-queue-card__name" title={fullName}>
              {fullName}
            </h4>
          </div>

          <div className="triage-queue-card__tags-row">
            {mrnFormatted && (
              <span className="triage-queue-card__mrn-tag">
                {mrnFormatted}
              </span>
            )}
            {ageGender && (
              <span className="triage-queue-card__demog-tag">
                {ageGender}
              </span>
            )}
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <span className="triage-queue-card__blood-tag" title="Blood Group">
                <span className="material-symbols-rounded">bloodtype</span>
                {patient.bloodGroup}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Phone Contact (if available) ── */}
      {phone && phone !== '—' && (
        <div className="triage-queue-card__contact-row">
          <span className="material-symbols-rounded">phone</span>
          <span>{phone}</span>
        </div>
      )}

      {/* ── 4. Clinical Reason for Visit ── */}
      {visit.reasonForVisit && (
        <div className="triage-queue-card__reason-box" title={visit.reasonForVisit}>
          <span className="material-symbols-rounded">clinical_notes</span>
          <span className="triage-queue-card__reason-text">
            <strong>Reason:</strong> {visit.reasonForVisit}
          </span>
        </div>
      )}
    </article>
  );
};

/* ─── Main TriageQueue Component ───────────────────────────── */
const TriageQueue = ({
  visits = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
  departmentName,
  loading = false,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer,
  className = '',
  style = {},
}) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Defensive FIFO sort (oldest first) and exclusion of deleted records
  const sortedVisits = useMemo(() => {
    const validVisits = (visits || []).filter((v) => {
      const p = v.patientId;
      if (!p || p.isDeleted === true || p.isOrphaned === true || p.mrn === 'DELETED-RECORD') {
        return false;
      }
      return true;
    });

    const list = [...validVisits].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter((v) => {
      const p = v.patientId || {};
      const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const mrn = (p.mrn || '').toLowerCase();
      const token = (v.tokenString || v.visitNumber || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return name.includes(query) || mrn.includes(query) || token.includes(query) || phone.includes(query);
    });
  }, [visits, searchQuery]);

  // Split Called vs Waiting
  const { calledVisits, waitingVisits } = useMemo(() => ({
    calledVisits: sortedVisits.filter((v) => v.status === 'CALLED'),
    waitingVisits: sortedVisits.filter((v) => v.status !== 'CALLED'),
  }), [sortedVisits]);

  const handleCall = useCallback(
    async (visitId) => {
      setActionLoading(visitId);
      try {
        await visitAPI.callPatient(visitId);
        onRefresh?.();
      } catch (err) {
        console.error('[TriageQueue] callPatient error:', err?.response?.data?.message || err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [onRefresh]
  );

  const handleSkip = useCallback(
    async (visitId) => {
      setActionLoading(visitId);
      try {
        await visitAPI.skipVisit(visitId);
        onRefresh?.();
      } catch (err) {
        console.error('[TriageQueue] skipVisit error:', err?.response?.data?.message || err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [onRefresh]
  );

  const handleSelectPatient = (visit) => {
    onSelectVisit?.(visit);
    onCloseMobileDrawer?.();
  };

  const renderCard = (visit) => (
    <QueueItemCard
      key={visit._id || visit.id}
      visit={visit}
      selected={(visit._id || visit.id) === selectedVisitId}
      onSelect={handleSelectPatient}
      onCall={handleCall}
      onSkip={handleSkip}
      actionLoading={actionLoading}
    />
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
       * 1. COLLAPSED (RAIL) MODE (~76px Desktop Only)
       * ───────────────────────────────────────────────────────────── */}
      {isCollapsed && (
        <aside className={`ntq-rail ntq-rail--desktop-only ${className}`.trim()} style={style} aria-label="Collapsed Triage Queue Rail">
          <div className="ntq-rail__header">
            <button
              type="button"
              className="ntq-rail__toggle-btn"
              onClick={onToggleCollapse}
              title="Expand Triage Worklist"
              aria-label="Expand Triage Worklist"
            >
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
            <span className="ntq-rail__count-badge" title={`${sortedVisits.length} waiting patients`}>
              {sortedVisits.length}
            </span>
          </div>

          <div className="ntq-rail__body">
            {loading && sortedVisits.length === 0 ? (
              <div className="ntq-rail__spinner" title="Loading queue...">
                <span className="ntq-rail__spinner-ring" />
              </div>
            ) : sortedVisits.length === 0 ? (
              <div className="ntq-rail__empty" title="Queue is empty">
                <span className="material-symbols-rounded">hourglass_empty</span>
              </div>
            ) : (
              sortedVisits.map((v) => (
                <NurseQueueRailItem
                  key={v._id || v.id}
                  visit={v}
                  selected={Boolean(selectedVisitId && (v._id || v.id) === selectedVisitId)}
                  onSelect={handleSelectPatient}
                />
              ))
            )}
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * 2. FULL QUEUE CARDS DECK (Expanded on Desktop, Drawer on Mobile/Tablet)
       * ───────────────────────────────────────────────────────────── */}
      <aside
        className={[
          'triage-queue-panel',
          isCollapsed ? 'ntq-queue--collapsed-desktop' : '',
          className,
        ].filter(Boolean).join(' ')}
        style={style}
        aria-label="Triage Worklist Panel"
      >
        {/* ─── Compact Material 3 Queue Header ─── */}
        <header className="triage-queue__header">
          <div className="triage-queue__header-left">
            {onToggleCollapse && (
              <button
                type="button"
                className="triage-queue__collapse-btn"
                onClick={onToggleCollapse}
                title="Collapse into Compact Rail"
                aria-label="Collapse into Compact Rail"
              >
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
            )}

            <div className="triage-queue__header-icon">
              <span className="material-symbols-rounded">vital_signs</span>
            </div>

            <div className="triage-queue__header-titles">
              <div className="triage-queue__header-title-row">
                <h3 className="triage-queue__header-title">
                  {departmentName ? `${departmentName}` : 'Triage Worklist'}
                </h3>
                <span
                  className="triage-queue__count-badge"
                  title={`${visits.length} patient${visits.length === 1 ? '' : 's'} waiting`}
                >
                  {visits.length}
                </span>
              </div>
            </div>
          </div>

          <div className="triage-queue__header-actions">
            <button
              type="button"
              className={`triage-queue__refresh-btn ${loading ? 'is-loading' : ''}`}
              onClick={onRefresh}
              title="Refresh List"
              aria-label="Refresh List"
              disabled={loading}
            >
              <span className="material-symbols-rounded">refresh</span>
            </button>

            {onCloseMobileDrawer && (
              <button
                type="button"
                className="ntq-mobile-close-btn"
                onClick={onCloseMobileDrawer}
                title="Close Drawer"
                aria-label="Close Drawer"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>
        </header>

      {/* ─── Quick Filter Bar (if 3+ items) ─── */}
      {visits.length > 3 && (
        <div className="triage-queue__search-wrap">
          <span className="material-symbols-rounded triage-queue__search-icon">search</span>
          <input
            type="text"
            className="triage-queue__search-input"
            placeholder="Search token, name, MRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter patient list"
          />
          {searchQuery && (
            <button
              type="button"
              className="triage-queue__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Queue Card List with Independent Scrolling ─── */}
      <div className="triage-queue__body">
        {loading && visits.length === 0 ? (
          <div className="triage-queue__loading">
            <div className="triage-queue__spinner" aria-hidden="true" />
            <span>Loading worklist…</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="triage-queue__empty-state">
            <div className="triage-queue__empty-icon">
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <h4 className="triage-queue__empty-title">All Clear</h4>
            <p className="triage-queue__empty-desc">
              No patients currently waiting for triage.
            </p>
          </div>
        ) : sortedVisits.length === 0 ? (
          <div className="triage-queue__empty-state">
            <div className="triage-queue__empty-icon">
              <span className="material-symbols-rounded">search_off</span>
            </div>
            <h4 className="triage-queue__empty-title">No Matching Patients</h4>
            <p className="triage-queue__empty-desc">
              No results found for &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="triage-queue__list" role="list">
            {/* Called Patients First */}
            {calledVisits.length > 0 && (
              <div className="triage-queue__called-section" aria-label="Called patients">
                <div className="triage-queue__section-label">
                  <span className="material-symbols-rounded">volume_up</span>
                  <span>Currently Called</span>
                </div>
                {calledVisits.map(renderCard)}
              </div>
            )}

            {/* Waiting Queue */}
            {waitingVisits.map(renderCard)}
          </div>
        )}
      </div>
    </aside>
  </>
);
};

export default TriageQueue;
