import React from 'react';
import { Icon } from '../../components/md3/Md3Widgets';

const PRIORITY_FILTERS = [
  { id: 'all', label: 'All', icon: <Icon.Inbox />, variant: 'default' },
  { id: 'STAT', label: 'STAT', icon: <Icon.Flag />, variant: 'error' },
  { id: 'URGENT', label: 'Urgent', icon: <Icon.Alert />, variant: 'warning' },
  { id: 'ROUTINE', label: 'Routine', icon: <Icon.Activity />, variant: 'secondary' },
];

const LabPriorityBar = ({
  counts = {},
  activeFilter = 'all',
  onFilterChange,
  statusCounts = {},
  className = '',
}) => {
  const getCount = (id) => (id === 'all'
    ? Object.values(counts).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : (counts[id] || 0));

  const statusChips = [
    { filterKey: 'visits', label: 'Active visits', value: statusCounts.visits ?? 0, icon: <Icon.Users />, variant: 'default' },
    { filterKey: 'tests', label: 'Pending tests', value: statusCounts.tests ?? 0, icon: <Icon.Microscope />, variant: 'primary' },
    { filterKey: 'PENDING_SAMPLE', label: 'Awaiting sample', value: statusCounts.samples ?? 0, icon: <Icon.Beaker />, variant: 'secondary' },
    { filterKey: 'PROCESSING', label: 'In analysis', value: statusCounts.processing ?? 0, icon: <Icon.Activity />, variant: 'tertiary' },
  ];

  return (
    <div
      className={`lab-priority-bar ${className}`.trim()}
      role="group"
      aria-label="Laboratory filters and status summary"
    >
      <div className="lab-priority-bar__filters" role="tablist" aria-label="Priority filter">
        {PRIORITY_FILTERS.map((item) => {
          const count = getCount(item.id);
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Filter ${item.label} (${count})`}
              onClick={() => typeof onFilterChange === 'function' && onFilterChange(item.id)}
              className={[
                'lab-priority-bar__chip',
                isActive ? `lab-priority-bar__chip--active-${item.variant}` : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="lab-priority-bar__chip-icon" aria-hidden="true">{item.icon}</span>
              <span className="lab-priority-bar__chip-label">{item.label}</span>
              <span className={[
                'lab-priority-bar__chip-count',
                `lab-priority-bar__chip-count--${isActive ? item.variant : 'muted'}`,
              ].filter(Boolean).join(' ')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="lab-priority-bar__status-grid" role="tablist" aria-label="Queue status metric filters">
        {statusChips.map((s) => {
          const isActive = activeFilter === s.filterKey;
          return (
            <button
              key={s.filterKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Filter queue by ${s.label}: ${s.value} items`}
              onClick={() => typeof onFilterChange === 'function' && onFilterChange(s.filterKey)}
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
  );
};

export default LabPriorityBar;
