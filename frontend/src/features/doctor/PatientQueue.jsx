import React, { useCallback, useMemo, useState } from 'react';
import {
  Icon, Md3EmptyState, Md3IconButton, Md3Section,
} from '../../components/md3/Md3Widgets';
import { Md3TextField } from '../../components/md3/Md3FormComponents';
import QueuePatientCard from './QueuePatientCard';
import { visitAPI } from '../../services/visitAPI';
import { formatQueueWaitTime as timeSince } from '../../utils/dateFormatting';

/* ============================================================
   PatientQueue — Doctor's patient queue panel.
   Unified 2x3 Matrix Component for combined stats & filtering.
   ============================================================ */

const MATRIX_FILTERS = [
  { id: 'all',                   label: 'All',             icon: <Icon.Users size={14} /> },
  { id: 'WAITING_DOCTOR',        label: 'Waiting',         icon: <Icon.Clock size={14} /> },
  { id: 'CALLED',                label: 'Called',          icon: <Icon.Volume2 size={14} /> },
  { id: 'IN_PROGRESS',           label: 'In Consultation', icon: <Icon.Activity size={14} /> },
  { id: 'WAITING_DOCTOR_REVIEW', label: 'Review',          icon: <Icon.Clipboard size={14} /> },
  { id: 'COMPLETED',             label: 'Completed',       icon: <Icon.CheckCircle size={14} /> },
];

/* ─── Unified 2x3 Queue Filter Matrix ─────────────────────── */
const QueueFilterMatrix = ({ counts, filterStatus, onSelectFilter }) => {
  return (
    <div className="queue-filter-matrix" role="tablist" aria-label="Queue Filters">
      {MATRIX_FILTERS.map((item) => {
        const isSelected = filterStatus === item.id;
        const count = counts[item.id] ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`queue-matrix-tile ${isSelected ? 'queue-matrix-tile--active' : ''}`}
            onClick={() => onSelectFilter(item.id)}
          >
            <div className="matrix-tile-header">
              <span className="matrix-tile-icon">{item.icon}</span>
              <span className="matrix-tile-count">{count}</span>
            </div>
            <span className="matrix-tile-label">{item.label}</span>
          </button>
        );
      })}
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

  // ── Live counts for the 2x3 filter matrix
  const matrixCounts = useMemo(() => {
    const c = {
      all: activeQueue.length,
      WAITING_DOCTOR: 0,
      CALLED: 0,
      IN_PROGRESS: 0,
      WAITING_DOCTOR_REVIEW: 0,
      COMPLETED: 0,
    };
    sortedQueue.forEach((v) => {
      if (c[v.status] !== undefined) c[v.status]++;
    });
    return c;
  }, [activeQueue, sortedQueue]);

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
        {/* Header Title & Refresh */}
        <div className="patient-queue__header">
          <div className="patient-queue__header-left">
            <span className="patient-queue__header-icon">
              <Icon.Users size={18} />
            </span>
            <div>
              <h3 className="patient-queue__header-title">My Queue</h3>
              <span className="patient-queue__header-subtitle">
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

        {/* ── Singular 2x3 Matrix Filter & Stat Component ── */}
        <div className="patient-queue__matrix-container">
          <QueueFilterMatrix
            counts={matrixCounts}
            filterStatus={filterStatus}
            onSelectFilter={setFilterStatus}
          />
        </div>

        {/* ── Search Bar ── */}
        <div className="patient-queue__search-wrap">
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
        </div>

        {/* ── Active Queue List ── */}
        <div className="patient-queue__list" role="list">
          {filteredActive.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.Inbox />}
              title={searchQuery ? 'No matching patients' : 'No patients in this filter'}
              subtitle={
                searchQuery
                  ? 'Try adjusting your search or filter.'
                  : 'There are currently no patients under this status.'
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
                    onCall={handleRequeue}
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
