import React, { useMemo } from 'react';
import {
  Md3Card,
  Md3CardHeader,
  Md3Divider,
  Md3EmptyState,
  Icon,
  Md3IconButton,
} from '../../components/md3/Md3Widgets';
import { Md3SearchBar } from '../../components/md3/Md3SearchBar';
import './LabWorkQueue.css';

const urgencyFor = (createdAt) => {
  if (!createdAt) return { variant: 'default', label: 'New' };
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins >= 90) return { variant: 'error', label: `${Math.floor(mins / 60)}h ${mins % 60}m` };
  if (mins >= 45) return { variant: 'warning', label: `${mins}m` };
  return { variant: 'default', label: mins > 0 ? `${mins}m` : 'Now' };
};

const priorityChip = (p) => {
  const key = (p || 'ROUTINE').toUpperCase();
  if (key === 'STAT') return { variant: 'error', label: 'STAT', icon: 'flag' };
  if (key === 'URGENT') return { variant: 'warning', label: 'URGENT', icon: 'warning' };
  return { variant: 'secondary', label: 'ROUTINE', icon: 'monitor_heart' };
};

const LabQueueCard = ({ visit, selected, onSelect }) => {
  const patient = (visit?.patientId && typeof visit.patientId === 'object') ? visit.patientId : {};
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.name || 'Unnamed Patient';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
  const mrnDisplay = patient.mrn?.startsWith('MRN-') ? patient.mrn : (patient.mrn ? `MRN-${patient.mrn}` : 'MRN: —');

  const orders = visit?.labOrders || [];
  const pendingOrders = orders.filter((o) => (o.status || '').toUpperCase() !== 'COMPLETED');

  const highestPriority = pendingOrders.reduce((acc, o) => {
    const rankMap = { STAT: 3, URGENT: 2, ROUTINE: 1 };
    const r = rankMap[(o.priority || 'ROUTINE').toUpperCase()] || 1;
    return r > acc.rank ? { rank: r, priority: (o.priority || 'ROUTINE').toUpperCase() } : acc;
  }, { rank: 0, priority: 'ROUTINE' });

  const wait = urgencyFor(visit.createdAt);
  const prio = priorityChip(highestPriority.priority);

  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const tokenDisplay = visit?.tokenString || (visit?.visitNumber ? visit.visitNumber.slice(-4) : 'GEN-—');
  const samplePendingCount = pendingOrders.filter((o) => (o.status || '').toUpperCase() === 'PENDING_SAMPLE').length;
  const processingCount = pendingOrders.filter((o) => (o.status || '').toUpperCase() === 'PROCESSING').length;

  let statusLabel = 'Ready';
  if (samplePendingCount > 0) statusLabel = 'Awaiting Sample';
  else if (processingCount > 0) statusLabel = 'In Analysis';
  else if (pendingOrders.length === 0) statusLabel = 'Reported';

  const testNames = pendingOrders.map((o) => o.testName || o.testCode || 'Lab Test').slice(0, 3).join(', ');
  const extraCount = pendingOrders.length > 3 ? `+${pendingOrders.length - 3} more` : '';

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
      {/* ── 1. Top Meta Row: Token + Status on Left | Priority + Wait on Right ── */}
      <div className="lab-queue-card__header-row">
        <div className="lab-queue-card__header-left">
          <span className="lab-queue-card__token">{tokenDisplay}</span>
          <span className="lab-queue-card__status-tag">{statusLabel}</span>
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
            <h4 className="lab-queue-card__name">{name}</h4>
            {ageGender && <span className="lab-queue-card__demog-tag">{ageGender}</span>}
          </div>
          <div className="lab-queue-card__tags-row">
            <span className="lab-queue-card__mrn-tag">{mrnDisplay}</span>
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <span className="lab-queue-card__blood-tag" title="Blood Group">
                <span className="material-symbols-rounded">bloodtype</span>
                <span>{patient.bloodGroup}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Test Orders Requisition Snapshot ── */}
      {pendingOrders.length > 0 && (
        <div className="lab-queue-card__orders-bar" title="Requisitioned Diagnostic Tests">
          <span className="material-symbols-rounded lab-queue-card__orders-icon">science</span>
          <span className="lab-queue-card__orders-text">
            <strong>{pendingOrders.length} {pendingOrders.length === 1 ? 'Test' : 'Tests'}:</strong> {testNames} {extraCount}
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
  statusCounts = {},
  searchValue = '',
  onSearchChange,
  error,
  isRefreshing,
  className = '',
  style,
}) => {
  const visible = useMemo(() => {
    if (!Array.isArray(visits)) return [];
    if (!searchValue || !searchValue.trim()) return visits;
    const key = String(searchValue).toLowerCase().trim();
    return visits.filter((v) => {
      const p = v?.patientId || {};
      const searchTokens = [
        p.firstName,
        p.lastName,
        `${p.firstName || ''} ${p.lastName || ''}`,
        p.mrn,
        v.tokenString,
        v.visitNumber,
        v.reasonForVisit,
        v.vitals?.chiefComplaint,
        ...(v.labOrders || []).map((o) => o.testName || o.testCode),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchTokens.includes(key);
    });
  }, [visits, searchValue]);

  const getPriorityCount = (id) => (id === 'all'
    ? Object.values(priorityCounts).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : (priorityCounts[id] || 0));

  const statusChips = [
    { filterKey: 'visits', label: 'Active visits', value: statusCounts.visits ?? 0, icon: <Icon.Users />, variant: 'default' },
    { filterKey: 'tests', label: 'Pending tests', value: statusCounts.tests ?? 0, icon: <Icon.Microscope />, variant: 'primary' },
    { filterKey: 'PENDING_SAMPLE', label: 'Awaiting sample', value: statusCounts.samples ?? 0, icon: <Icon.Beaker />, variant: 'secondary' },
    { filterKey: 'PROCESSING', label: 'In analysis', value: statusCounts.processing ?? 0, icon: <Icon.Activity />, variant: 'tertiary' },
  ];

  return (
    <div className={`lwq ${className}`.trim()} style={style}>
      <Md3Card variant="elevated" padding="none" className="lwq__card">
        {/* ─── 1. Combined Header: Title + 2x2 Priority Pills on Right ─── */}
        <div className="lwq__header">
          <div className="lwq__header-left">
            <div className="lwq__header-icon" aria-hidden="true">
              <Icon.Microscope />
            </div>
            <div className="lwq__header-title-box">
              <h3 className="lwq__header-title">Laboratory Queue</h3>
              {onRefresh && (
                <button
                  type="button"
                  className={`lwq__refresh-btn ${isRefreshing ? 'lwq__refresh--spinning' : ''}`}
                  onClick={onRefresh}
                  disabled={Boolean(isRefreshing)}
                  title="Refresh laboratory queue"
                  aria-label="Refresh laboratory queue"
                >
                  <Icon.Refresh />
                </button>
              )}
            </div>
          </div>

          <div className="lwq__priority-grid" role="tablist" aria-label="Priority filter">
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

        <Md3Divider />

        {/* ─── 2. 4 Box Buttons (2x2 Status Metric Grid Intact) ─── */}
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
