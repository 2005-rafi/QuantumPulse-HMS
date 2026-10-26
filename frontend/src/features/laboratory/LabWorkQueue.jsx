import React, { useMemo, useState } from 'react';
import {
  Md3Card,
  Md3Divider,
  Md3EmptyState,
  Icon,
} from '../../components/md3/Md3Widgets';
import { Md3SearchBar } from '../../components/md3/Md3SearchBar';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import PriorityQueueEngine from '../../components/common/PriorityQueue/PriorityQueueEngine';
import './LabWorkQueue.css';

const urgencyFor = (createdAt) => {
  if (!createdAt) return { variant: 'default', label: 'New' };
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins >= 90) return { variant: 'error', label: `${Math.floor(mins / 60)}h ${mins % 60}m` };
  if (mins >= 45) return { variant: 'warning', label: `${mins}m` };
  return { variant: 'default', label: mins > 0 ? `${mins}m` : 'Now' };
};

const priorityChip = (p, isRedraw = false, isEmergency = false) => {
  if (isEmergency) return { variant: 'emergency', label: 'PANIC ALERT', icon: 'emergency', dotColor: 'var(--md-sys-color-error, #ba1a1a)' };
  if (isRedraw) return { variant: 'redraw', label: 'REDRAW SAMPLE', icon: 'sync_problem', dotColor: '#d97706' };
  const key = (p || 'ROUTINE').toUpperCase();
  if (key === 'STAT') return { variant: 'error', label: 'STAT', icon: 'flag', dotColor: '#dc2626' };
  if (key === 'URGENT') return { variant: 'warning', label: 'URGENT', icon: 'warning', dotColor: '#f59e0b' };
  return { variant: 'secondary', label: 'ROUTINE', icon: 'monitor_heart', dotColor: 'var(--md-sys-color-primary, #006a6a)' };
};

/**
 * Rail Item Component for Collapsed Queue View (Width ~78px)
 * Displays Avatar + Priority Dot + Token Badge + Marquee First Name
 */
const LabQueueRailItem = ({ visit, selected, onSelect }) => {
  const patient = (visit?.patientId && typeof visit.patientId === 'object') ? visit.patientId : {};
  const firstName = patient.firstName || patient.name?.split(' ')[0] || 'Patient';
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.name || 'Unnamed Patient';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
  const mrnDisplay = patient.mrn?.startsWith('MRN-') ? patient.mrn : (patient.mrn ? `MRN-${patient.mrn}` : '');
  const tokenDisplay = visit?.tokenString || (visit?.visitNumber ? visit.visitNumber.slice(-4) : 'GEN');

  const orders = visit?.labOrders || [];
  const pendingOrders = orders.filter((o) => (o.status || '').toUpperCase() !== 'COMPLETED');
  const hasRedraw = orders.some((o) => Boolean(o.recollectionRequested));
  const hasEmergency = orders.some((o) => Boolean(o.panicAlertBroadcasted || o.pathologistVerification?.panicValueFlag));

  const highestPriority = pendingOrders.reduce((acc, o) => {
    const rankMap = { STAT: 3, URGENT: 2, ROUTINE: 1 };
    const r = rankMap[(o.priority || 'ROUTINE').toUpperCase()] || 1;
    return r > acc.rank ? { rank: r, priority: (o.priority || 'ROUTINE').toUpperCase() } : acc;
  }, { rank: 0, priority: 'ROUTINE' });

  const prio = priorityChip(highestPriority.priority, hasRedraw, hasEmergency);
  const testNames = pendingOrders.map((o) => o.testName || o.testCode || 'Lab Test').join(', ') || 'Diagnostics';

  const tooltipText = `${fullName} (${mrnDisplay})\nToken: ${tokenDisplay}\nPriority: ${prio.label}\nTests: ${testNames}`;

  return (
    <div
      className={`lwq-rail-item ${selected ? 'lwq-rail-item--selected' : ''}`}
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
      <div className="lwq-rail-item__avatar-wrapper">
        <div className="lwq-rail-item__avatar">{initials}</div>
        <span
          className="lwq-rail-item__priority-dot"
          style={{ backgroundColor: prio.dotColor }}
          aria-hidden="true"
        />
      </div>

      <span className="lwq-rail-item__token">{tokenDisplay}</span>

      <div className="lwq-rail-item__name-box">
        <Md3MarqueeText text={firstName} className="lwq-rail-item__marquee" />
      </div>
    </div>
  );
};

/**
 * Full Queue Card Component for Expanded Queue View
 */
const LabQueueCard = ({ visit, selected, onSelect }) => {
  const patient = (visit?.patientId && typeof visit.patientId === 'object') ? visit.patientId : {};
  const isDeleted = Boolean(patient.isDeleted || patient.isOrphaned);
  const name = patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.name || 'Unnamed Patient';
  const initials = isDeleted ? 'DP' : (((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PT');
  const mrnDisplay = patient.mrn === 'DELETED-RECORD' || patient.mrn?.startsWith('MRN-') ? patient.mrn : (patient.mrn ? `MRN-${patient.mrn}` : 'MRN: —');

  const orders = visit?.labOrders || [];
  const pendingOrders = orders.filter((o) => (o.status || '').toUpperCase() !== 'COMPLETED');

  const hasRedraw = orders.some((o) => Boolean(o.recollectionRequested));
  const hasEmergency = orders.some((o) => Boolean(o.panicAlertBroadcasted || o.pathologistVerification?.panicValueFlag));

  const highestPriority = pendingOrders.reduce((acc, o) => {
    const rankMap = { STAT: 3, URGENT: 2, ROUTINE: 1 };
    const r = rankMap[(o.priority || 'ROUTINE').toUpperCase()] || 1;
    return r > acc.rank ? { rank: r, priority: (o.priority || 'ROUTINE').toUpperCase() } : acc;
  }, { rank: 0, priority: 'ROUTINE' });

  const wait = urgencyFor(visit.createdAt);
  const prio = priorityChip(highestPriority.priority, hasRedraw, hasEmergency);

  const validAge = patient.age && patient.age !== '—' && !isNaN(Number(patient.age)) ? `${patient.age} yrs` : null;
  const ageGender = [
    validAge,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const tokenDisplay = visit?.tokenString || (visit?.visitNumber ? visit.visitNumber.slice(-4) : 'GEN-—');
  const isIpd = visit?.visitType === 'IPD' || Boolean(visit?.ipdAdmissionId);
  const bedInfo = visit?.ipdAdmissionId?.currentBedId?.bedLabel || visit?.ipdAdmissionId?.currentBedId?.bedNumber || '';
  const samplePendingCount = pendingOrders.filter((o) => (o.status || '').toUpperCase() === 'PENDING_SAMPLE').length;
  const processingCount = pendingOrders.filter((o) => (o.status || '').toUpperCase() === 'PROCESSING').length;
  const verifyCount = pendingOrders.filter((o) => (o.status || '').toUpperCase() === 'AWAITING_VERIFICATION').length;

  let statusLabel = 'Ready';
  let statusVariant = 'ready';
  if (samplePendingCount > 0) {
    statusLabel = 'Awaiting Sample';
    statusVariant = 'pending';
  } else if (processingCount > 0) {
    statusLabel = 'In Analysis';
    statusVariant = 'processing';
  } else if (verifyCount > 0) {
    statusLabel = 'Awaiting Verification';
    statusVariant = 'verification';
  } else if (pendingOrders.length === 0) {
    statusLabel = 'Reported';
    statusVariant = 'completed';
  }

  const testNames = pendingOrders.map((o) => o.testName || o.testCode || 'Lab Test').join(', ');

  const doctor = visit?.consultation?.doctorId || visit?.doctor || visit?.assignedDoctor || visit?.referredBy;
  const doctorName = typeof doctor === 'object' && doctor
    ? (doctor.name || [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || doctor.username || '')
    : (typeof doctor === 'string' ? doctor : '');

  return (
    <div
      className={`lab-queue-card ${selected ? 'lab-queue-card--selected' : ''}`}
      onClick={() => onSelect?.(visit)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(visit);
        }
      }}
      aria-label={`Select patient ${name}, ${tokenDisplay}`}
    >
      {/* ── 1. Top Header Row: Token (Left) | Priority + Wait Time (Right) ── */}
      <div className="lab-queue-card__header-row">
        <div className="lab-queue-card__header-left">
          <span className="lab-queue-card__token">{tokenDisplay}</span>
        </div>

        <div className="lab-queue-card__header-right">
          <span className={`lab-queue-card__priority-tag lab-queue-card__priority-tag--${prio.variant}`}>
            <span className="material-symbols-rounded">{prio.icon}</span>
            <span>{prio.label}</span>
          </span>
          {wait.label && (
            <span className={`lab-queue-card__wait-pill lab-queue-card__wait-pill--${wait.variant}`} title="Queue wait time">
              <span className="material-symbols-rounded">schedule</span>
              <span>{wait.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Patient Identity Row: Avatar + Name + Demographics ── */}
      <div className="lab-queue-card__identity-row">
        <div className="lab-queue-card__avatar">{initials}</div>
        <div className="lab-queue-card__identity-details">
          <div className="lab-queue-card__name-row">
            <h4 className="lab-queue-card__name" title={name}>{name}</h4>
            {ageGender && <span className="lab-queue-card__demog-tag">{ageGender}</span>}
          </div>
        </div>
      </div>

      {/* ── 3. Scrollable Clinical Chips Strip (Single Row, Smooth Horizontal Scroll) ── */}
      <div
        className="lab-queue-card__chips-strip"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        title="Scroll horizontally to view all clinical badges"
      >
        {/* 1. Workflow / Clinical Status */}
        <span className={`lab-queue-card__chip lab-queue-card__chip--status-${statusVariant}`}>
          <span className="lab-queue-card__status-dot" />
          <span>{statusLabel}</span>
        </span>

        {/* 2. MRN Identifier */}
        <span className="lab-queue-card__chip lab-queue-card__chip--mrn" title={mrnDisplay}>
          <span className="material-symbols-rounded">badge</span>
          <span>{mrnDisplay}</span>
        </span>

        {/* 3. Inpatient / Ward Bed / Room Location */}
        {isIpd && (
          <span className="lab-queue-card__chip lab-queue-card__chip--ipd" title={`Inpatient Ward Admission: ${bedInfo || 'IPD'}`}>
            <span className="material-symbols-rounded">hotel</span>
            <span>IPD {bedInfo ? `• ${bedInfo}` : ''}</span>
          </span>
        )}

        {/* 4. Blood Group */}
        {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
          <span className="lab-queue-card__chip lab-queue-card__chip--blood" title={`Blood Group: ${patient.bloodGroup}`}>
            <span className="material-symbols-rounded">bloodtype</span>
            <span>{patient.bloodGroup}</span>
          </span>
        )}

        {/* 5. Attending Doctor / Referral Context */}
        {doctorName && (
          <span className="lab-queue-card__chip lab-queue-card__chip--doctor" title={`Consulting Doctor: ${doctorName}`}>
            <span className="material-symbols-rounded">stethoscope</span>
            <span>{doctorName}</span>
          </span>
        )}
      </div>

      {/* ── 4. Test Orders Requisition Capsule ── */}
      {pendingOrders.length > 0 && (
        <div className="lab-queue-card__orders-bar" title={`Diagnostic Tests: ${testNames}`}>
          <div className="lab-queue-card__orders-badge">
            <span className="material-symbols-rounded">science</span>
            <span>{pendingOrders.length} {pendingOrders.length === 1 ? 'Test' : 'Tests'}</span>
          </div>
          <span className="lab-queue-card__orders-text">
            {testNames}
          </span>
        </div>
      )}
    </div>
  );
};

const PRIORITY_FILTERS = [
  { id: 'all', label: 'All', variant: 'default' },
  { id: 'STAT', label: 'STAT', variant: 'error' },
  { id: 'URGENT', label: 'Urgent', variant: 'warning' },
  { id: 'ROUTINE', label: 'Routine', variant: 'secondary' },
];

const LabWorkQueue = ({
  visits = [],
  selectedVisitId,
  onSelectVisit,
  onRefresh,
  loading,
  priorityBar,
  priorityCounts = {},
  priorityFilter = 'all',
  onPriorityFilterChange,
  stationFilter = 'ALL',
  onStationFilterChange,
  laboratories = [],
  statusCounts = {},
  searchValue = '',
  onSearchChange,
  error,
  isRefreshing,
  className = '',
  style,
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
  onCloseMobileDrawer,
  title,
  departmentName,
  showStationFilter = true,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;
  const handleToggleCollapse = onToggleCollapse || (() => setInternalCollapsed((prev) => !prev));

  const displayTitle = title || departmentName || 'Phlebotomy Station';

  const pqEngine = useMemo(() => new PriorityQueueEngine(), []);

  const { items: visible, metrics: pqMetrics } = useMemo(() => {
    if (!Array.isArray(visits)) return { items: [], metrics: {} };
    return pqEngine.processQueue(visits, searchValue, priorityFilter === 'all' ? 'ALL' : priorityFilter);
  }, [pqEngine, visits, searchValue, priorityFilter]);

  const getPriorityCount = (id) => {
    if (id === 'all') return visits.length;
    if (id === 'REDRAW') return pqMetrics.redraws || 0;
    if (id === 'EMERGENCY') return pqMetrics.emergency || 0;
    if (id === 'STAT') return pqMetrics.stat || priorityCounts.STAT || 0;
    if (id === 'URGENT') return priorityCounts.URGENT || 0;
    if (id === 'ROUTINE') return pqMetrics.routine || priorityCounts.ROUTINE || 0;
    return priorityCounts[id] || 0;
  };

  const statusChips = [
    { filterKey: 'visits', label: 'Active visits', value: statusCounts.visits ?? 0, icon: <span className="material-symbols-rounded">group</span>, variant: 'default' },
    { filterKey: 'tests', label: 'Pending tests', value: statusCounts.tests ?? 0, icon: <span className="material-symbols-rounded">biotech</span>, variant: 'primary' },
    { filterKey: 'PENDING_SAMPLE', label: 'Awaiting sample', value: statusCounts.samples ?? 0, icon: <span className="material-symbols-rounded">science</span>, variant: 'secondary' },
    { filterKey: 'PROCESSING', label: 'In analysis', value: statusCounts.processing ?? 0, icon: <span className="material-symbols-rounded">hourglass_top</span>, variant: 'tertiary' },
  ];

  /* ─────────────────────────────────────────────────────────────
   * 1. COLLAPSED (RAIL) MODE (Width ~78px)
   * ───────────────────────────────────────────────────────────── */
  if (isCollapsed) {
    return (
      <aside className={`lwq-rail ${className}`.trim()} style={style} aria-label="Collapsed Laboratory Queue">
        <div className="lwq-rail__header">
          <button
            type="button"
            className="lwq-rail__toggle-btn"
            onClick={handleToggleCollapse}
            title="Expand Laboratory Patient Queue"
            aria-label="Expand Laboratory Patient Queue"
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
          <span className="lwq-rail__count-badge" title={`${visible.length} patients in queue`}>
            {visible.length}
          </span>
        </div>

        <div className="lwq-rail__body">
          {loading ? (
            <div className="lwq-rail__spinner" title="Loading queue...">
              <span className="lwq__spinner-ring" />
            </div>
          ) : visible.length === 0 ? (
            <div className="lwq-rail__empty" title="Queue is empty">
              <span className="material-symbols-rounded">hourglass_empty</span>
            </div>
          ) : (
            visible.map((v) => (
              <LabQueueRailItem
                key={v._id || v.id}
                visit={v}
                selected={Boolean(selectedVisitId && (v._id || v.id) === selectedVisitId)}
                onSelect={onSelectVisit}
              />
            ))
          )}
        </div>
      </aside>
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * 2. EXPANDED (IDLE) MODE (Full Queue Cards)
   * ───────────────────────────────────────────────────────────── */
  return (
    <div className={`lwq ${className}`.trim()} style={style}>
      <Md3Card variant="elevated" padding="none" className="lwq__card">
        {/* ─── 1. Header: Title + Count Badge + Refresh (Left) | Mobile Close (Right) ─── */}
        <div className="lwq__header">
          <div className="lwq__header-left">
            {!onCloseMobileDrawer && onToggleCollapse && (
              <button
                type="button"
                className="lwq__collapse-btn"
                onClick={handleToggleCollapse}
                title="Collapse into Compact Rail"
                aria-label="Collapse into Compact Rail"
              >
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
            )}

            <div className="lwq__header-title-box">
              <h3 className="lwq__header-title" title={displayTitle}>{displayTitle}</h3>
              <span className="lwq__header-count-badge" title={`${visible.length} patients in queue`}>
                {visible.length}
              </span>
              {onRefresh && (
                <button
                  type="button"
                  className={`lwq__refresh-btn ${isRefreshing ? 'lwq__refresh--spinning' : ''}`}
                  onClick={onRefresh}
                  disabled={Boolean(isRefreshing)}
                  title="Refresh laboratory queue"
                  aria-label="Refresh laboratory queue"
                >
                  <span className="material-symbols-rounded">refresh</span>
                </button>
              )}
            </div>
          </div>

          <div className="lwq__header-actions-right">
            {onCloseMobileDrawer && (
              <button
                type="button"
                className="lwq__mobile-close-btn"
                onClick={onCloseMobileDrawer}
                title="Close Queue Drawer"
                aria-label="Close Queue Drawer"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>
        </div>

        <Md3Divider />

        {/* ─── 1.2. Diagnostic Station / Bench Selector (Only if multi-station enabled) ─── */}
        {showStationFilter && laboratories && laboratories.length > 1 && onStationFilterChange && (
          <div
            className="lwq__station-bar-wrapper"
          >
            <div
              className="lwq__station-bar"
              role="tablist"
              aria-label="Diagnostic laboratory stations"
            >
              <button
                type="button"
                role="tab"
                aria-selected={stationFilter === 'ALL'}
                onClick={() => onStationFilterChange('ALL')}
                className={`lwq__station-btn ${stationFilter === 'ALL' ? 'lwq__station-btn--active' : ''}`}
              >
                All Labs
              </button>
              {laboratories.map((lab) => {
                const isSelected = String(stationFilter) === String(lab._id) || String(stationFilter) === String(lab.name);
                const labShortName = lab.name.replace(/\s+Laboratory/i, '');
                return (
                  <button
                    key={lab._id}
                    type="button"
                    role="tab"
                    title={lab.name}
                    aria-selected={isSelected}
                    onClick={() => onStationFilterChange(lab._id)}
                    className={`lwq__station-btn ${isSelected ? 'lwq__station-btn--active' : ''}`}
                  >
                    <span className="lwq__station-btn-text">{labShortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 1.4. Dedicated Priority Segmented Filter Strip ─── */}
        {onPriorityFilterChange && (
          <div className="lwq__priority-strip-wrapper">
            <div className="lwq__priority-strip" role="tablist" aria-label="Priority filter">
              {PRIORITY_FILTERS.map((item) => {
                const count = getPriorityCount(item.id);
                const isActive = (priorityFilter || 'all') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Filter ${item.label} (${count})`}
                    onClick={() => onPriorityFilterChange?.(item.id)}
                    className={[
                      'lwq__priority-pill',
                      `lwq__priority-pill--${item.variant}`,
                      isActive ? `lwq__priority-pill--active-${item.variant}` : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="lwq__priority-pill-label">{item.label}</span>
                    <span className={[
                      'lwq__priority-pill-count',
                      `lwq__priority-pill-count--${isActive ? item.variant : 'muted'}`,
                    ].filter(Boolean).join(' ')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 2. 4 Box Buttons (2x2 Status Metric Grid) ─── */}
        {onPriorityFilterChange ? (
          <div className="lwq__status-container">
            <div className="lab-priority-bar__status-grid" role="tablist" aria-label="Queue status metric filters">
              {statusChips.map((s) => {
                const isActive = (priorityFilter || 'all') === s.filterKey;
                return (
                  <button
                    key={s.filterKey}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Filter queue by ${s.label}: ${s.value} items`}
                    onClick={() => onPriorityFilterChange(s.filterKey)}
                    className={[
                      'lab-priority-bar__status-card',
                      `lab-priority-bar__status-card--${s.variant}`,
                      isActive ? 'lab-priority-bar__status-card--active' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="lab-priority-bar__status-icon" aria-hidden="true">
                      {s.icon}
                    </span>
                    <div className="lab-priority-bar__status-info">
                      <span className="lab-priority-bar__status-value">{String(s.value)}</span>
                      <span className="lab-priority-bar__status-label">{s.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : priorityBar ? (
          <div className="lwq__priority">{priorityBar}</div>
        ) : null}

        <div className="lwq__search">
          <Md3SearchBar
            value={searchValue}
            onChange={(val) => onSearchChange?.(val)}
            placeholder="Search by patient name, MRN, test..."
            matchCount={searchValue ? visible.length : undefined}
            compact
          />
        </div>
        <Md3Divider />
        <div className="lwq__body" aria-label="Laboratory patient queue list">
          {loading ? (
            <div className="lwq__spinner" aria-label="Loading queue">
              <span className="lwq__spinner-ring" />
              <span className="lwq__spinner-text">Loading laboratory queue…</span>
            </div>
          ) : error ? (
            <Md3EmptyState
              icon={<Icon.Alert />}
              title="Unable to load the queue"
              subtitle={error}
              actionLabel="Retry"
              onAction={onRefresh}
            />
          ) : visible.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.Microscope />}
              title="No patients in the laboratory queue"
              subtitle="Completed or discharged patients appear in the Reported tab."
            />
          ) : (
            <div className="lwq__list">
              {visible.map((v) => (
                <LabQueueCard
                  key={v._id || v.id}
                  visit={v}
                  selected={Boolean(selectedVisitId && (v._id || v.id) === selectedVisitId)}
                  onSelect={onSelectVisit}
                />
              ))}
            </div>
          )}
        </div>
      </Md3Card>
    </div>
  );
};

export default LabWorkQueue;
