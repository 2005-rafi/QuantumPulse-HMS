import React, { useCallback, useMemo, useState } from 'react';
import {
  Md3Card, Md3CardHeader, Icon, Md3EmptyState, Md3IconButton, Md3Tabs, Md3Section,
} from '../../components/md3/Md3Widgets';
import { Md3TextField } from '../../components/md3/Md3FormComponents';
import QueuePatientCard from './QueuePatientCard';
import { visitAPI } from '../../services/visitAPI';

/* ============================================================
   PatientQueue — Doctor's patient queue panel.

   SOLID:
     SRP — Renders queue; delegates API calls to visitAPI.
     OCP — Filtering / sorting logic extended via useMemo only.
     DIP — Depends on visitAPI abstraction, not raw fetch.

   FIFO guarantee: backend already sorts createdAt ASC.
   Frontend adds a defensive createdAt sort as a safety net.
   ============================================================ */

const timeSince = (dateString) => {
  if (!dateString) return '—';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const h = Math.floor(seconds / 3600);
  if (h >= 1) {
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const m = Math.floor(seconds / 60);
  return `${Math.max(m, 1)}m`;
};

const FILTER_TABS = [
  { id: 'all',                   label: 'All'      },
  { id: 'CALLED',                label: 'Called'   },
  { id: 'IN_PROGRESS',           label: 'In Consultation'   },
  { id: 'WAITING_DOCTOR_REVIEW', label: 'Review'   },
  { id: 'WAITING_DOCTOR',        label: 'Waiting'  },
  { id: 'COMPLETED',             label: 'Completed' },
];

/* ─── Mini stats strip ────────────────────────────────────── */
const QueueMiniStats = ({ queue }) => {
  const counts = useMemo(() => {
    const c = { CALLED: 0, IN_PROGRESS: 0, WAITING_DOCTOR_REVIEW: 0, WAITING_DOCTOR: 0, COMPLETED: 0 };
    queue.forEach((v) => { if (c[v.status] !== undefined) c[v.status]++; });
    return c;
  }, [queue]);

  return (
    <div className="queue-mini-stats" role="status" aria-label="Queue summary">
      <div className="queue-mini-stat queue-mini-stat--tertiary">
        <Icon.Volume2 size={13} />
        <span className="queue-mini-stat__label">Called</span>
        <span className="queue-mini-stat__value">{counts.CALLED}</span>
      </div>
      <div className="queue-mini-stat queue-mini-stat--default">
        <Icon.Activity size={13} />
        <span className="queue-mini-stat__label">Active</span>
        <span className="queue-mini-stat__value">{counts.IN_PROGRESS}</span>
      </div>
      <div className="queue-mini-stat queue-mini-stat--secondary">
        <Icon.Clipboard size={13} />
        <span className="queue-mini-stat__label">Review</span>
        <span className="queue-mini-stat__value">{counts.WAITING_DOCTOR_REVIEW}</span>
      </div>
      <div className="queue-mini-stat">
        <Icon.Clock size={13} />
        <span className="queue-mini-stat__label">Waiting</span>
        <span className="queue-mini-stat__value">{counts.WAITING_DOCTOR}</span>
      </div>
    </div>
  );
};

/* ─── Main PatientQueue ───────────────────────────────────── */
const PatientQueue = ({
  queue = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // visitId being acted on

  // ── FIFO defensive sort (backend also sorts ASC, this is a safety net)
  const sortedQueue = useMemo(() =>
    [...queue].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  [queue]);

  // ── Split skipped from active
  const { activeQueue, skippedQueue } = useMemo(() => ({
    activeQueue:  sortedQueue.filter((v) => v.status !== 'SKIPPED'),
    skippedQueue: sortedQueue.filter((v) => v.status === 'SKIPPED'),
  }), [sortedQueue]);

  const filteredActive = useMemo(() => {
    let list = activeQueue;
    if (filterStatus !== 'all') {
      list = list.filter((v) => v.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const p = v.patientId || {};
        return (
          `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q) ||
          (p.mrn || '').toLowerCase().includes(q) ||
          (v.tokenString || '').toLowerCase().includes(q) ||
          (v.vitals?.chiefComplaint || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [activeQueue, searchQuery, filterStatus]);

  // ── Queue action handlers (call / skip / requeue)
  const handleCall = useCallback(async (visitId) => {
    setActionLoading(visitId);
    try {
      await visitAPI.callPatient(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[PatientQueue] callPatient error:', err?.response?.data?.message || err.message);
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
      console.error('[PatientQueue] skipVisit error:', err?.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  const handleRequeue = useCallback(async (visitId) => {
    setActionLoading(visitId);
    try {
      await visitAPI.requeueVisit(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[PatientQueue] requeueVisit error:', err?.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  return (
    <div className="patient-queue">
      <div className="patient-queue__card">
        <div style={{ padding: 'var(--md-spacing-m) var(--md-spacing-m) var(--md-spacing-xs) var(--md-spacing-m)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-s)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px',
              borderRadius: 'var(--md-sys-shape-corner-small, 8px)',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              flexShrink: 0,
            }}>
              <Icon.Users size={18} />
            </span>
            <div>
              <h3 style={{ margin: 0, font: 'var(--md-sys-typescale-title-small-font)', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>My Queue</h3>
              <span style={{ font: 'var(--md-sys-typescale-body-small-font)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {activeQueue.length} patient{activeQueue.length !== 1 ? 's' : ''} in queue
              </span>
            </div>
          </div>
          <Md3IconButton
            icon={<Icon.Refresh />}
            onClick={onRefresh}
            variant="tonal"
            size="small"
            ariaLabel="Refresh queue"
          />
        </div>

        <QueueMiniStats queue={queue} />

        <div className="patient-queue__controls">
          <Md3TextField
            id="doctor-queue-search"
            label="Search by name, MRN, or token"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leadingIcon={<Icon.Search />}
            trailingIcon={searchQuery ? <Icon.Clear /> : null}
            onTrailingIconClick={() => setSearchQuery('')}
            trailingIconAriaLabel="Clear search"
          />
          <div className="patient-queue__filter-scroll">
            {FILTER_TABS.map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={['queue-filter-chip', isActive ? 'queue-filter-chip--active' : ''].filter(Boolean).join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active Queue ── */}
        <div className="patient-queue__list" role="list">
          {filteredActive.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.Inbox />}
              title={searchQuery ? 'No matching patients' : 'No patients in queue'}
              subtitle={
                searchQuery
                  ? 'Try adjusting your search or filter.'
                  : 'The waiting area is currently empty.'
              }
            />
          ) : (
            filteredActive.map((visit) => (
              <QueuePatientCard
                key={visit._id}
                visit={visit}
                isSelected={selectedVisitId === visit._id}
                onClick={() => onSelectVisit?.(visit)}
                waitTime={timeSince(visit.createdAt)}
                onCall={handleCall}
                onSkip={handleSkip}
              />
            ))
          )}
        </div>

        {/* ── Skipped Section (collapsible) ── */}
        {skippedQueue.length > 0 && (
          <div className="patient-queue__skipped">
            <Md3Section
              title={`Skipped · ${skippedQueue.length}`}
              subtitle="No-shows — click Re-queue to restore their token"
              icon={<Icon.SkipForward />}
              variant="error"
              collapsible
              defaultCollapsed
            >
              <div className="patient-queue__skipped-list" role="list">
                {skippedQueue.map((visit) => (
                  <QueuePatientCard
                    key={visit._id}
                    visit={visit}
                    isSelected={selectedVisitId === visit._id}
                    onClick={() => onSelectVisit?.(visit)}
                    waitTime={timeSince(visit.createdAt)}
                    onCall={handleRequeue} // Re-queue uses the call button slot
                    onSkip={null}
                  />
                ))}
              </div>
            </Md3Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientQueue;
