/**
 * src/components/common/StatCard/StatCard.jsx
 * SOLID Reusable Metric & KPI Card Component.
 * Supports icon, numerical value, descriptive label, trend indicators, and click handling.
 */
import React from 'react';
import './StatCard.css';

export const StatCard = ({
  icon,
  label,
  value,
  variant = 'default',
  trend = null,
  onClick,
  className = '',
  style = {},
}) => {
  const isInteractive = typeof onClick === 'function';
  const variantClass = `stat-card--${variant}`;
  const interactiveClass = isInteractive ? 'stat-card--interactive' : '';

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <span className="material-symbols-rounded stat-card__icon">{icon}</span>;
    }
    return icon;
  };

  return (
    <div
      className={`stat-card ${variantClass} ${interactiveClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
      role={isInteractive ? 'button' : 'region'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={`${label}: ${value}`}
    >
      {icon && (
        <div className="stat-card__icon-box">
          {renderIcon()}
        </div>
      )}
      <div className="stat-card__content">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {trend && (
          <div className={`stat-card__trend stat-card__trend--${trend.direction}`}>
            <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
