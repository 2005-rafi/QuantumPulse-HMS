/**
 * src/components/common/StatusBadge/StatusBadge.jsx
 * SOLID Polymorphic Status Badge Component.
 * Supports patient workflow statuses, appointment statuses, bed statuses, and custom statuses.
 */
import React from 'react';
import { getPatientStatus } from '../../../constants/patientStatus';
import './StatusBadge.css';

const APPOINTMENT_VARIANTS = {
  SCHEDULED: { label: 'Scheduled', variant: 'primary', icon: 'event' },
  CHECKED_IN: { label: 'Checked In', variant: 'secondary', icon: 'how_to_reg' },
  IN_PROGRESS: { label: 'In Progress', variant: 'tertiary', icon: 'pending' },
  COMPLETED: { label: 'Completed', variant: 'success', icon: 'check_circle' },
  CANCELLED: { label: 'Cancelled', variant: 'error', icon: 'cancel' },
  MISSED: { label: 'Missed', variant: 'neutral', icon: 'event_busy' },
  RESCHEDULED: { label: 'Rescheduled', variant: 'warning', icon: 'update' },
};

const BED_VARIANTS = {
  AVAILABLE: { label: 'Available', variant: 'success', icon: 'check_circle' },
  OCCUPIED: { label: 'Occupied', variant: 'primary', icon: 'person' },
  CLEANING: { label: 'Cleaning', variant: 'warning', icon: 'cleaning_services' },
  MAINTENANCE: { label: 'Maintenance', variant: 'error', icon: 'build' },
  RESERVED: { label: 'Reserved', variant: 'secondary', icon: 'bookmark' },
  ISOLATION: { label: 'Isolation', variant: 'tertiary', icon: 'shield' },
};

export const StatusBadge = ({
  status,
  type = 'patient',
  label = null,
  variant = null,
  size = 'md',
  showDot = false,
  showIcon = true,
  icon = null,
  className = '',
  style = {},
  onClick,
}) => {
  let resolvedLabel = label || status || 'Unknown';
  let resolvedVariant = variant || 'neutral';
  let resolvedIcon = icon;

  if (type === 'patient') {
    const meta = getPatientStatus(status);
    resolvedLabel = label || meta.label;
    resolvedVariant = variant || (meta.badgeVariant === 'danger' ? 'error' : meta.badgeVariant || 'neutral');
    resolvedIcon = icon || meta.icon;
  } else if (type === 'appointment') {
    const norm = String(status || '').toUpperCase();
    const conf = APPOINTMENT_VARIANTS[norm];
    if (conf) {
      resolvedLabel = label || conf.label;
      resolvedVariant = variant || conf.variant;
      resolvedIcon = icon || conf.icon;
    }
  } else if (type === 'bed') {
    const norm = String(status || '').toUpperCase();
    const conf = BED_VARIANTS[norm];
    if (conf) {
      resolvedLabel = label || conf.label;
      resolvedVariant = variant || conf.variant;
      resolvedIcon = icon || conf.icon;
    }
  }

  const sizeClass = `status-badge--${size}`;
  const variantClass = `status-badge--${resolvedVariant}`;

  return (
    <span
      className={`status-badge ${sizeClass} ${variantClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {showDot && <span className="status-badge__dot" />}
      {showIcon && resolvedIcon && (
        <span className="material-symbols-rounded status-badge__icon">
          {resolvedIcon}
        </span>
      )}
      <span>{resolvedLabel}</span>
    </span>
  );
};

export default StatusBadge;
