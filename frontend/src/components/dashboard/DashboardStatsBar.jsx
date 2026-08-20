import React from 'react';
import { Md3StatCard, Icon } from '../md3/Md3Widgets';
import { formatTodayLabel } from '../../utils/dateFormatting';
import './DashboardStatsBar.css';

/**
 * DashboardStatsBar
 * A generic, data-driven statistics bar for all role dashboards.
 * Replaces per-dashboard hardcoded stats bars (ReceptionStatsBar, NurseStatsBar, etc.)
 *
 * SOLID:
 *   SRP  — Renders stats cards only. No data fetching.
 *   OCP  — Extend by passing new stat objects; never modify this component.
 *   DIP  — Depends on Md3StatCard abstraction, not raw HTML.
 *
 * @param {Object} props
 * @param {Array<{icon, label, value, variant}>} props.stats - Array of stat objects
 * @param {boolean} [props.showToday=true] - Whether to prepend a "Today" stat card
 * @param {string} [props.className] - Additional CSS class
 */
const DashboardStatsBar = ({ stats = [], showToday = true, className = '' }) => {
  const todayStat = showToday
    ? { icon: <Icon.Calendar />, label: 'Today', value: formatTodayLabel(), variant: 'primary', key: '__today__' }
    : null;

  const allStats = todayStat ? [todayStat, ...stats] : stats;

  return (
    <div
      className={`dashboard-stats-bar ${className}`.trim()}
      role="complementary"
      aria-label="Dashboard statistics"
      style={{ '--stats-count': allStats.length }}
    >
      {allStats.map((stat, i) => (
        <Md3StatCard
          key={stat.key || `stat-${i}`}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          variant={stat.variant || 'default'}
        />
      ))}
    </div>
  );
};

export default DashboardStatsBar;
