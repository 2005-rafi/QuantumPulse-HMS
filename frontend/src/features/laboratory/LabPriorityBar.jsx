import React from 'react';
import { Icon, Md3Chip } from '../../components/md3/Md3Widgets';

const PRIORITY_FILTERS = [
  { id: 'all', label: 'All orders', icon: <Icon.Inbox />, variant: 'default' },
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
    { key: 'visits', label: 'Active visits', value: statusCounts.visits ?? 0, icon: <Icon.Users />, variant: 'default' },
    { key: 'tests', label: 'Pending tests', value: statusCounts.tests ?? 0, icon: <Icon.Microscope />, variant: 'primary' },
    { key: 'samples', label: 'Awaiting sample', value: statusCounts.samples ?? 0, icon: <Icon.Beaker />, variant: 'secondary' },
    { key: 'processing', label: 'In analysis', value: statusCounts.processing ?? 0, icon: <Icon.Activity />, variant: 'tertiary' },
  ];

  return (
    <div
      className={`lab-priority-bar ${className}`.trim()}
      role="group"
      aria-label="Laboratory filters and status summary"
    >
      <div className="lab-priority-bar__group" role="tablist" aria-label="Priority filter">
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

      <div className="lab-priority-bar__divider" role="separator" aria-orientation="vertical" />

      <div className="lab-priority-bar__group lab-priority-bar__group--status" role="group" aria-label="Queue status counters">
        {statusChips.map((s) => (
          <Md3Chip key={s.key} variant={s.variant} size="small" icon={s.icon} className="lab-priority-bar__status-chip">
            <span className="lab-priority-bar__status-label">{s.label}</span>
            <span className="lab-priority-bar__status-value">{String(s.value)}</span>
          </Md3Chip>
        ))}
      </div>
    </div>
  );
};

export default LabPriorityBar;
