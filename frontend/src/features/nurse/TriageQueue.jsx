import React, { useCallback, useMemo, useState } from 'react';
import { visitAPI } from '../../services/visitAPI';
import './TriageQueue.css';

/* ============================================================
   TriageQueue — Pure Material 3 Clinical Queue Panel
   Path: frontend/src/features/nurse/TriageQueue.jsx

   SOLID:
     SRP — Renders patient triage queue; delegates state to useTriageQueue / visitAPI.
     OCP — Extensible via variant classes and clinical meta slots.
     DIP — Relies on visitAPI and utility abstractions.
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

const formatDob = (dob) => {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getUrgencyInfo = (createdAt) => {
  if (!createdAt) return { variant: 'default', text: 'Recent', mins: 0 };
  const createdDate = new Date(createdAt);
  const mins = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000));
  const timeStr = createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let text = `${mins}m wait`;
  if (mins < 1) text = 'Just now';
  else if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    text = `${hrs}h ${remMins}m wait`;
  }

  if (mins >= 45) {
    return { variant: 'error', text, timeStr, mins };
  }
  if (mins >= 20) {
    return { variant: 'secondary', text, timeStr, mins };
  }
  return { variant: 'default', text, timeStr, mins };
};

/* ─── QueueItemCard — Single Clinical Triage Patient Card ─── */
const QueueItemCard = ({ visit, selected, onSelect, onCall, onSkip, actionLoading }) => {
  const patient = visit.patientId || {};
  const urgency = getUrgencyInfo(visit.createdAt);
  const initials = (
    (patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')
  ).toUpperCase() || 'P';

  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const dob = formatDob(patient.dob);
  const phone = formatPhone(patient.phone);

  // Clean Token format
  const tokenDisplay = visit.tokenString ?? (visit.visitNumber?.slice(-4) ?? '—');

  // Visit Status
  const isCalled = visit.status === 'CALLED';
  const isWaiting = visit.status === 'WAITING_TRIAGE' || visit.status === 'SKIPPED';
  const isLoading = actionLoading === (visit._id || visit.id);

  // Visit Type badge (OPD / Walk-in / Follow-up)
  const visitTypeLabel = visit.appointmentType?.replace(/_/g, ' ') || visit.visitType || 'OPD';

  const historyChips = useMemo(() => {
    const list = [];
    if (patient.allergies) {
      list.push({ key: 'allergies', label: `Allergy: ${patient.allergies}`, isAlert: true });
    }
    if (Array.isArray(patient.medicalHistory)) {
      patient.medicalHistory.slice(0, 2).forEach((h, i) => {
        const text = typeof h === 'string' ? h : h?.condition || 'Condition';
        list.push({ key: `med-${i}`, label: text, isAlert: false });
      });
    }
    return list;
  }, [patient.allergies, patient.medicalHistory]);

  return (
    <article
      className={[
        'triage-queue-card',
        `triage-queue-card--urgency-${urgency.variant}`,
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
      {/* ── 1. Top Meta Row: Token Hero + Type + Urgency + Call Action ── */}
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
          <span
            className={`triage-queue-card__urgency-pill triage-queue-card__urgency-pill--${urgency.variant}`}
            title={`Checked in at ${urgency.timeStr || ''}`}
          >
            <span className="material-symbols-rounded">schedule</span>
            <span>{urgency.text}</span>
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

      {/* ── 2. Patient Identity: Avatar + Name + Demographics + Blood Group ── */}
      <div className="triage-queue-card__identity-row">
        <div className="triage-queue-card__avatar">
          {initials}
        </div>

        <div className="triage-queue-card__identity-details">
          <div className="triage-queue-card__name-row">
            <h4 className="triage-queue-card__name" title={fullName}>
              {fullName}
            </h4>
          </div>

          <div className="triage-queue-card__tags-row">
            {patient.mrn && (
              <span className="triage-queue-card__mrn-tag">
                {patient.mrn.startsWith('MRN') ? patient.mrn : `MRN: ${patient.mrn}`}
              </span>
            )}
            {ageGender && (
              <span className="triage-queue-card__demog-tag">
                {ageGender}
              </span>
            )}
            {patient.bloodGroup && (
              <span className="triage-queue-card__blood-tag" title="Blood Group">
                <span className="material-symbols-rounded">bloodtype</span>
                {patient.bloodGroup}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Collision Guard: DOB & Clean Masked Mobile ── */}
      <div className="triage-queue-card__collision-row">
        {dob && (
          <span className="triage-queue-card__collision-item" title="Date of Birth">
            <span className="material-symbols-rounded">cake</span>
            <span>{dob}</span>
          </span>
        )}
        {phone && (
          <span className="triage-queue-card__collision-item" title="Contact Number">
            <span className="material-symbols-rounded">phone</span>
            <span>{phone}</span>
          </span>
        )}
      </div>

      {/* ── 4. Clinical Reason for Visit ── */}
      {visit.reasonForVisit && (
        <div className="triage-queue-card__reason-box" title={visit.reasonForVisit}>
          <span className="material-symbols-rounded">clinical_notes</span>
          <span className="triage-queue-card__reason-text">
            <strong>Reason:</strong> {visit.reasonForVisit}
          </span>
        </div>
      )}

      {/* ── 5. Critical Alerts / Allergies ── */}
      {historyChips.length > 0 && (
        <div className="triage-queue-card__chips-cluster">
          {historyChips.map((h) => (
            <span
              key={h.key}
              className={`triage-queue-card__info-chip ${h.isAlert ? 'triage-queue-card__info-chip--alert' : ''}`}
            >
              <span className="material-symbols-rounded">{h.isAlert ? 'warning' : 'history'}</span>
              <span>{h.label}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
};

/* ─── Main TriageQueue Panel ────────────────────────────────── */
const TriageQueue = ({
  visits = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
  loading = false,
  className = '',
  style = {},
}) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Defensive FIFO sort (oldest first)
  const sortedVisits = useMemo(() => {
    const list = [...visits].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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

  const renderCard = (visit) => (
    <QueueItemCard
      key={visit._id || visit.id}
      visit={visit}
      selected={(visit._id || visit.id) === selectedVisitId}
      onSelect={onSelectVisit}
      onCall={handleCall}
      onSkip={handleSkip}
      actionLoading={actionLoading}
    />
  );

  return (
    <aside
      className={['triage-queue-panel', className].filter(Boolean).join(' ')}
      style={style}
    >
      {/* ─── Compact Material 3 Queue Header ─── */}
      <header className="triage-queue__header">
        <div className="triage-queue__header-left">
          <div className="triage-queue__header-icon">
            <span className="material-symbols-rounded">medical_information</span>
          </div>
          <div className="triage-queue__header-titles">
            <div className="triage-queue__header-title-row">
              <h3 className="triage-queue__header-title">Triage Queue</h3>
              <span
                className="triage-queue__count-badge"
                title={`${visits.length} patient${visits.length === 1 ? '' : 's'} waiting`}
              >
                {visits.length}
              </span>
            </div>
            <p className="triage-queue__header-sub">FIFO · Oldest check-in first</p>
          </div>
        </div>

        <div className="triage-queue__header-actions">
          <button
            type="button"
            className={`triage-queue__refresh-btn ${loading ? 'is-loading' : ''}`}
            onClick={onRefresh}
            title="Refresh Queue"
            aria-label="Refresh Queue"
            disabled={loading}
          >
            <span className="material-symbols-rounded">refresh</span>
          </button>
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
            aria-label="Filter triage queue"
          />
          {searchQuery && (
            <button
              type="button"
              className="triage-queue__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear filter"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Queue Card List ─── */}
      <div className="triage-queue__body">
        {loading && visits.length === 0 ? (
          <div className="triage-queue__loading">
            <div className="triage-queue__spinner" aria-hidden="true" />
            <span>Loading triage queue…</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="triage-queue__empty-state">
            <div className="triage-queue__empty-icon">
              <span className="material-symbols-rounded">inbox</span>
            </div>
            <h4 className="triage-queue__empty-title">No Patients Waiting</h4>
            <p className="triage-queue__empty-desc">
              Patients will appear here automatically when checked in by reception.
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
  );
};

export default TriageQueue;
