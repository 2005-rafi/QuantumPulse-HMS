import React, { useCallback, useMemo, useState } from 'react';
import {
  Md3Card,
  Md3CardHeader,
  Md3Chip,
  Md3Avatar,
  Md3IconButton,
  Md3EmptyState,
  Md3Divider,
  Md3Section,
  Icon,
} from '../../components/md3/Md3Widgets';
import { visitAPI } from '../../services/visitAPI';
import './TriageQueue.css';

/* ============================================================
   TriageQueue — Nurse's WAITING_TRIAGE queue panel.

   SOLID:
     SRP — Renders triage queue; queue actions delegate to visitAPI.
     OCP — QueueItemCard is open for extension via className.
     DIP — Depends on visitAPI abstraction.

   Token is the PRIMARY visual identifier per design plan.
   Collision guards: masked phone + DOB below patient name.
   ============================================================ */

const timeSince = (dateString) => {
  if (!dateString) return '0m';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  if (h >= 1) {
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  return `${m}m`;
};

const urgencyFor = (createdAt) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins >= 60) return 'error';
  if (mins >= 30) return 'secondary';
  return 'default';
};

/* ─── Helpers ─────────────────────────────────────────────── */

const maskPhone = (phone = '') => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `+91 ${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const formatDob = (dob) => {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/* ─── QueueItemCard — single triage patient card ─────────── */
const QueueItemCard = ({ visit, selected, onSelect, onCall, onSkip, actionLoading }) => {
  const patient = visit.patientId || {};
  const urgencyVariant = urgencyFor(visit.createdAt);
  const waitDuration = timeSince(visit.createdAt);
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';

  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const dob   = formatDob(patient.dob);
  const phone = maskPhone(patient.phone);

  // Token hero: department-prefixed or fallback
  const tokenDisplay = visit.tokenString ?? (visit.visitNumber?.slice(-4) ?? '—');

  // Which visit status we're looking at
  const isCalled  = visit.status === 'CALLED';
  const isWaiting = visit.status === 'WAITING_TRIAGE' || visit.status === 'SKIPPED';

  const historyChips = useMemo(() => {
    if (!Array.isArray(patient.medicalHistory)) return [];
    return patient.medicalHistory.slice(0, 3).map((h, i) => ({
      key: `${visit._id}-h-${i}`,
      label: typeof h === 'string' ? h : h?.condition || 'Condition',
    }));
  }, [patient.medicalHistory, visit._id]);

  const isLoading = actionLoading === visit._id;

  return (
    <article
      className={[
        'triage-queue-card',
        selected           ? 'triage-queue-card--selected' : '',
        isCalled           ? 'triage-queue-card--called'   : '',
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
      {/* ── Token hero row ── */}
      <div className="triage-queue-card__token-row">
        <span className="triage-queue-card__token" aria-label={`Token ${tokenDisplay}`}>
          {tokenDisplay}
        </span>
        <Md3Chip variant={urgencyVariant} size="small" icon={<Icon.Clock />}
          className="triage-queue-card__wait-chip">
          {waitDuration}
        </Md3Chip>
        {/* ── Call / Skip buttons ── */}
        <div
          className="triage-queue-card__actions"
          onClick={(e) => e.stopPropagation()}
        >
          {isWaiting && onCall && (
            <Md3IconButton
              variant="tonal"
              icon={<Icon.Volume2 />}
              size="small"
              ariaLabel={`Call ${fullName}`}
              onClick={() => onCall(visit._id)}
              disabled={isLoading}
              title="Call patient"
            />
          )}
          {isCalled && onSkip && (
            <Md3IconButton
              variant="standard"
              icon={<Icon.SkipForward />}
              size="small"
              ariaLabel={`Skip ${fullName} (no-show)`}
              onClick={() => onSkip(visit._id)}
              disabled={isLoading}
              title="Mark as skipped (no-show)"
            />
          )}
        </div>
      </div>

      {/* ── Patient identity ── */}
      <div className="triage-queue-card__top">
        <Md3Avatar initials={initials} size="medium" variant={isCalled ? 'primary' : 'surface'} />
        <div className="triage-queue-card__main">
          <div className="triage-queue-card__name-row">
            <h3 className="triage-queue-card__name">{fullName}</h3>
          </div>
          <div className="triage-queue-card__meta">
            {patient.mrn && (
              <span className="triage-queue-card__mrn">MRN {patient.mrn}</span>
            )}
            {ageGender && (
              <span className="triage-queue-card__demog">{ageGender}</span>
            )}
          </div>
          {/* ── Collision-safe identifiers ── */}
          <div className="triage-queue-card__collision-guard">
            {dob && (
              <span className="triage-queue-card__dob">
                <Icon.Calendar className="triage-queue-card__meta-icon" aria-hidden="true" />
                {dob}
              </span>
            )}
            {phone && (
              <span className="triage-queue-card__phone">
                <Icon.Phone className="triage-queue-card__meta-icon" aria-hidden="true" />
                {phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {visit.reasonForVisit && (
        <div className="triage-queue-card__reason">
          <Icon.Clipboard />
          <span>{visit.reasonForVisit}</span>
        </div>
      )}

      {historyChips.length > 0 && (
        <div className="triage-queue-card__history">
          {historyChips.map((h) => (
            <Md3Chip key={h.key} variant="error" size="small" icon={<Icon.Alert />}>
              {h.label}
            </Md3Chip>
          ))}
        </div>
      )}

      <Md3Divider inset="start" />
    </article>
  );
};

/* ─── Main TriageQueue ────────────────────────────────────── */
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

  // ── FIFO defensive sort (oldest first = lowest token serial)
  const sortedVisits = useMemo(() =>
    [...visits].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  [visits]);

  // Split CALLED patients to the top for visual priority
  const { calledVisits, waitingVisits } = useMemo(() => ({
    calledVisits:  sortedVisits.filter((v) => v.status === 'CALLED'),
    waitingVisits: sortedVisits.filter((v) => v.status !== 'CALLED'),
  }), [sortedVisits]);

  const handleCall = useCallback(async (visitId) => {
    setActionLoading(visitId);
    try {
      await visitAPI.callPatient(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[TriageQueue] callPatient:', err?.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  const handleSkip = useCallback(async (visitId) => {
    setActionLoading(visitId);
    try {
      await visitAPI.skipVisit(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[TriageQueue] skipVisit:', err?.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

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
    <Md3Card
      variant="elevated"
      padding="none"
      className={['triage-queue', className].filter(Boolean).join(' ')}
      style={style}
    >
      <Md3CardHeader
        title={`Waiting for Triage${visits.length ? ` · ${visits.length}` : ''}`}
        subtitle="Token order is FIFO — oldest arrival first"
        icon={<Icon.Stethoscope />}
        variant="primary"
        action={
          <Md3IconButton
            variant="tonal"
            size="medium"
            icon={<Icon.Refresh />}
            onClick={onRefresh}
            ariaLabel="Refresh queue"
            disabled={loading}
          />
        }
      />
      <Md3Divider />

      <div className="triage-queue__body">
        {loading && visits.length === 0 ? (
          <div className="triage-queue__loading">
            <div className="triage-queue__spinner" aria-hidden="true" />
            <span>Loading queue…</span>
          </div>
        ) : visits.length === 0 ? (
          <Md3EmptyState
            icon={<Icon.Inbox />}
            title="No patients waiting"
            description="Queue will populate as patients check in at reception."
          />
        ) : (
          <div className="triage-queue__list" role="list">
            {/* Called patients at the top */}
            {calledVisits.length > 0 && (
              <div className="triage-queue__called-section" aria-label="Called patients">
                {calledVisits.map(renderCard)}
              </div>
            )}
            {/* Waiting patients in FIFO order */}
            {waitingVisits.map(renderCard)}
          </div>
        )}
      </div>
    </Md3Card>
  );
};

export default TriageQueue;
