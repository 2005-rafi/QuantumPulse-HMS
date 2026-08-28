import React, { useCallback, useMemo, useState } from 'react';
import QueuePatientCard from './QueuePatientCard';
import { visitAPI } from '../../services/visitAPI';
import { formatQueueWaitTime as timeSince } from '../../utils/dateFormatting';
import { ClinicalQueueSearchIndex } from '../../utils/dsaSearchFilter';
import { Md3SearchBar } from '../../components/md3/Md3SearchBar';

/* ============================================================
   PatientQueue — Doctor's Patient Queue Sidebar
   Path: frontend/src/features/doctor/PatientQueue.jsx
   ============================================================ */

const MATRIX_FILTERS = [
  { id: 'all',                   label: 'All',             icon: 'group' },
  { id: 'WAITING_DOCTOR',        label: 'Waiting',         icon: 'schedule' },
  { id: 'CALLED',                label: 'Called',          icon: 'volume_up' },
  { id: 'IN_PROGRESS',           label: 'In Consult',      icon: 'stethoscope' },
  { id: 'WAITING_DOCTOR_REVIEW', label: 'Review',          icon: 'biotech' },
  { id: 'COMPLETED',             label: 'Done',            icon: 'check_circle' },
];

/* ─── Compact 2x3 Queue Filter Matrix ─────────────────────── */
const QueueFilterMatrix = ({ counts, filterStatus, onSelectFilter }) => {
  return (
    <div className="doc-filter-matrix" role="tablist" aria-label="Doctor Queue Filters">
      {MATRIX_FILTERS.map((item) => {
        const isSelected = filterStatus === item.id;
        const count = counts[item.id] ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`doc-matrix-tile ${isSelected ? 'doc-matrix-tile--active' : ''}`}
            onClick={() => onSelectFilter(item.id)}
          >
            <div className="doc-matrix-tile__top">
              <span className="material-symbols-rounded doc-matrix-tile__icon">{item.icon}</span>
              <span className="doc-matrix-tile__count">{count}</span>
            </div>
            <span className="doc-matrix-tile__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ─── Main PatientQueue Component ─────────────────────────── */
const PatientQueue = ({
  queue = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // FIFO defensive sort (oldest first)
  const sortedQueue = useMemo(() =>
    [...queue].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  [queue]);

  // Split skipped from active
  const { activeQueue, skippedQueue } = useMemo(() => ({
    activeQueue: sortedQueue.filter((v) => v.status !== 'SKIPPED'),
    skippedQueue: sortedQueue.filter((v) => v.status === 'SKIPPED'),
  }), [sortedQueue]);

  // Live counts for the 2x3 filter matrix
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

  // ── Pluggable DSA Multi-Field Prefix Trie & Relevance Search ──
  const searchIndex = useMemo(() => new ClinicalQueueSearchIndex(activeQueue), [activeQueue]);

  const filteredActive = useMemo(() => {
    return searchIndex.search(searchQuery, filterStatus);
  }, [searchIndex, searchQuery, filterStatus]);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Queue action handlers (call / skip / requeue)
  const handleCall = useCallback(async (visitId) => {
    try {
      await visitAPI.callPatient(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[PatientQueue] call error:', err?.response?.data?.message || err.message);
    }
  }, [onRefresh]);

  const handleSkip = useCallback(async (visitId) => {
    try {
      await visitAPI.skipVisit(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[PatientQueue] skip error:', err?.response?.data?.message || err.message);
    }
  }, [onRefresh]);

  const handleRequeue = useCallback(async (visitId) => {
    try {
      await visitAPI.requeueVisit(visitId);
      onRefresh?.();
    } catch (err) {
      console.error('[PatientQueue] requeue error:', err?.response?.data?.message || err.message);
    }
  }, [onRefresh]);

  return (
    <div className="doc-queue-panel">
      {/* ─── 1. Compact Header Bar ─── */}
      <div className="doc-queue__header">
        <div className="doc-queue__header-left">
          <div className="doc-queue__header-icon">
            <span className="material-symbols-rounded">group</span>
          </div>
          <div className="doc-queue__header-titles">
            <div className="doc-queue__header-title-row">
              <h3 className="doc-queue__header-title">My Queue</h3>
              <span className="doc-queue__count-badge">{activeQueue.length}</span>
            </div>
            <p className="doc-queue__header-sub">
              {activeQueue.length === 1 ? '1 patient waiting' : `${activeQueue.length} patients in queue`}
            </p>
          </div>
        </div>

        <div className="doc-queue__header-actions">
          <button
            type="button"
            className={`doc-queue__refresh-btn ${isRefreshing ? 'is-loading' : ''}`}
            onClick={handleRefreshClick}
            title="Refresh Doctor Queue"
            aria-label="Refresh Queue"
          >
            <span className="material-symbols-rounded">refresh</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Compact 2x3 Matrix Filter & Status Badges ─── */}
      <div className="doc-queue__filter-wrap">
        <QueueFilterMatrix
          counts={matrixCounts}
          filterStatus={filterStatus}
          onSelectFilter={setFilterStatus}
        />
      </div>

      {/* ─── 3. Pure Material 3 Search Component with DSA Index ─── */}
      <div className="doc-queue__search-wrap">
        <Md3SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, MRN, token, reason..."
          matchCount={searchQuery ? filteredActive.length : undefined}
          compact
        />
      </div>

      {/* ─── 4. Active Queue List ─── */}
      <div className="doc-queue__body">
        {filteredActive.length === 0 ? (
          <div className="doc-queue__empty-state">
            <div className="doc-queue__empty-icon">
              <span className="material-symbols-rounded">inbox</span>
            </div>
            <h4 className="doc-queue__empty-title">
              {searchQuery ? 'No matching patients' : 'No patients in this view'}
            </h4>
            <p className="doc-queue__empty-desc">
              {searchQuery
                ? 'Check spelling or clear the search query.'
                : 'Patients will appear here once checked in or triaged.'}
            </p>
          </div>
        ) : (
          <div className="doc-queue__list">
            {filteredActive.map((visit) => (
              <QueuePatientCard
                key={visit._id}
                visit={visit}
                isSelected={selectedVisitId === visit._id}
                onClick={() => onSelectVisit?.(visit)}
                waitTime={timeSince(visit.createdAt)}
                onCall={handleCall}
                onSkip={handleSkip}
              />
            ))}
          </div>
        )}

        {/* ─── 5. Skipped Section (If any) ─── */}
        {skippedQueue.length > 0 && (
          <div className="doc-queue__skipped-section">
            <div className="doc-queue__skipped-header">
              <span className="material-symbols-rounded">forward_media</span>
              <span>Skipped ({skippedQueue.length})</span>
            </div>
            <div className="doc-queue__list">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientQueue;
