import React, { useCallback, useMemo, useState } from 'react';
import QueuePatientCard from './QueuePatientCard';
import { visitAPI } from '../../services/visitAPI';
import { formatQueueWaitTime as timeSince } from '../../utils/dateFormatting';
import { ClinicalQueueSearchIndex } from '../../utils/dsaSearchFilter';
import { Md3SearchBar } from '../../components/md3/Md3SearchBar';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';

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

/* ─── DoctorQueueRailItem — Compact 76px Sidebar Rail Item ─── */
const DoctorQueueRailItem = ({ visit, selected, onSelect }) => {
  const patient = visit?.patientId || {};
  const firstName = patient.firstName || patient.name?.split(' ')[0] || 'Patient';
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Unnamed Patient';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const tokenDisplay = visit.tokenString ?? (visit.visitNumber?.slice(-4) ?? '—');
  const isCalled = visit.status === 'CALLED';
  const isInProgress = visit.status === 'IN_PROGRESS';
  const isReview = visit.status === 'WAITING_DOCTOR_REVIEW';
  const tooltipText = `${fullName} (${tokenDisplay}) • Status: ${visit.status}`;

  return (
    <div
      className={`doc-rail-item ${selected ? 'doc-rail-item--selected' : ''} ${isCalled ? 'doc-rail-item--called' : ''} ${isInProgress ? 'doc-rail-item--in-progress' : ''}`}
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
      <div className="doc-rail-item__avatar-wrapper">
        <div className="doc-rail-item__avatar">{initials}</div>
        {isCalled && (
          <span className="doc-rail-item__called-dot" title="Currently Called" />
        )}
        {isInProgress && (
          <span className="doc-rail-item__in-progress-dot" title="In Consultation" />
        )}
        {isReview && (
          <span className="doc-rail-item__review-dot" title="Awaiting Review" />
        )}
      </div>

      <span className="doc-rail-item__token">{tokenDisplay}</span>

      <div className="doc-rail-item__name-box">
        <Md3MarqueeText text={firstName} className="doc-rail-item__marquee" />
      </div>
    </div>
  );
};

/* ─── Main PatientQueue Component ─────────────────────────── */
const PatientQueue = ({
  queue = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // FIFO defensive sort (oldest first) and filter out deleted/orphaned patient records
  const sortedQueue = useMemo(() => {
    const validQueue = (queue || []).filter((v) => {
      const p = v.patientId;
      if (!p || p.isDeleted === true || p.isOrphaned === true || p.mrn === 'DELETED-RECORD') {
        return false;
      }
      return true;
    });
    return [...validQueue].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [queue]);

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

  /* ─── Collapsed Desktop Rail Mode ─── */
  if (isCollapsed) {
    return (
      <aside className="doc-queue-rail" aria-label="Doctor patient queue collapsed rail">
        <div className="doc-rail__header">
          <button
            type="button"
            className="doc-rail__toggle-btn"
            onClick={onToggleCollapse}
            title="Expand Doctor Queue"
            aria-label="Expand Doctor Queue"
          >
            <span className="material-symbols-rounded">right_panel_open</span>
          </button>
          <span className="doc-rail__count-badge" title={`${activeQueue.length} Active Patients`}>
            {activeQueue.length}
          </span>
        </div>

        <div className="doc-rail__body">
          {activeQueue.map((visit) => (
            <DoctorQueueRailItem
              key={visit._id}
              visit={visit}
              selected={selectedVisitId === visit._id}
              onSelect={onSelectVisit}
            />
          ))}
          {activeQueue.length === 0 && (
            <div className="doc-rail__empty">
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>inbox</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="doc-queue-panel">
      {/* ─── 1. Compact Header Bar ─── */}
      <div className="doc-queue__header">
        <div className="doc-queue__header-left">
          {onToggleCollapse && (
            <button
              type="button"
              className="doc-queue__collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse Doctor Queue to Rail"
              aria-label="Collapse Queue"
            >
              <span className="material-symbols-rounded">left_panel_close</span>
            </button>
          )}
          <div className="doc-queue__header-icon">
            <span className="material-symbols-rounded">event</span>
          </div>
          <div className="doc-queue__header-titles">
            <div className="doc-queue__header-title-row">
              <h3 className="doc-queue__header-title">{todayDay}</h3>
              <span className="doc-queue__count-badge" title={`${activeQueue.length} Active Patients`}>
                {activeQueue.length}
              </span>
            </div>
            <p className="doc-queue__header-sub">{todayDate}</p>
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
          {onCloseMobileDrawer && (
            <button
              type="button"
              className="doc-queue__mobile-close-btn"
              onClick={onCloseMobileDrawer}
              title="Close Queue Drawer"
              aria-label="Close Queue Drawer"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
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
                : 'Patients will appear here once checked in or assessed by nurse.'}
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
