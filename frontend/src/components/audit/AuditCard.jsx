import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './AuditCard.css';

/**
 * Format relative time in compact clinical format (e.g. 2m ago, 3h ago, 4d ago)
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '—';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Categorize action into semantic domain for color tokens and icons
 */
export const getActionCategory = (action = '') => {
  const act = action.toUpperCase();
  if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH') || act.includes('TERMINAL') || act.includes('PASSWORD')) {
    return { type: 'auth', icon: 'lock', label: 'Auth & Access' };
  }
  if (act.includes('PATIENT') || act.includes('ADMISSION') || act.includes('DISCHARGE') || act.includes('CLINICAL') || act.includes('VITALS')) {
    return { type: 'patient', icon: 'personal_injury', label: 'Patient Record' };
  }
  if (act.includes('BILL') || act.includes('PAYMENT') || act.includes('TARIFF') || act.includes('LEDGER') || act.includes('ADJUSTMENT')) {
    return { type: 'billing', icon: 'payments', label: 'Financial' };
  }
  if (act.includes('STAFF') || act.includes('ROLE') || act.includes('PERMISSION') || act.includes('DEPT') || act.includes('HOD')) {
    return { type: 'staff', icon: 'badge', label: 'Staff & Governance' };
  }
  return { type: 'security', icon: 'shield', label: 'System Event' };
};

/**
 * Helper to get initials
 */
export const getActorInitials = (name, role) => {
  if (name && name !== 'System') {
    const clean = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '');
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  if (role) return role.slice(0, 2).toUpperCase();
  return 'SY';
};

/**
 * Format action name for clean readability
 */
export const formatActionName = (action = '') => {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * AuditCard — Compact, Insightful & Responsive Pure Material 3 Audit Log Card.
 * Replicates the spatial footprint, density and typography of StaffCard.
 */
export const AuditCard = ({
  log,
  onInspect,
  isSelected = false,
}) => {
  if (!log) return null;

  const actor = log.actorId || {};
  const actorName = actor.fullName || actor.username || 'System Administrator';
  const actorRole = log.actorRole || 'ADMINISTRATOR';
  const roleClass = actorRole.toLowerCase().includes('admin')
    ? 'admin'
    : actorRole.toLowerCase().includes('doc')
    ? 'doctor'
    : actorRole.toLowerCase().includes('nurse')
    ? 'nurse'
    : 'default';

  const category = getActionCategory(log.action);
  const formattedAction = formatActionName(log.action);
  const initials = getActorInitials(actorName, actorRole);
  const relTime = formatRelativeTime(log.timestamp);
  const fullTime = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';
  const targetId = log.targetId || (log.details?.patientId ? String(log.details.patientId) : null);
  const ipAddress = log.ipAddress || 'Internal Terminal';

  // Details insight summary
  const detailKeyCount = log.details && typeof log.details === 'object' ? Object.keys(log.details).length : 0;
  const detailSummary = detailKeyCount > 0
    ? `${detailKeyCount} ${detailKeyCount === 1 ? 'attribute' : 'attributes'} logged`
    : 'No extra payload';

  return (
    <div
      className={`md3-audit-card ${isSelected ? 'md3-audit-card--selected' : ''}`}
      role="article"
      aria-label={`Audit log: ${log.action} by ${actorName}`}
    >
      <div className="md3-audit-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER: AVATAR, ACTOR & ROLE ── */}
      <div className="md3-audit-card-header">
        <div className="md3-audit-card-avatar-wrap">
          <Md3Avatar
            initials={initials}
            size="small"
            variant={roleClass === 'admin' ? 'primary' : 'secondary'}
          />
        </div>

        <div className="md3-audit-card-identity">
          <h4 className="md3-audit-card-name" title={actorName}>
            {actorName}
          </h4>
          <span className="md3-audit-card-role-line" title={category.label}>
            {category.label}
          </span>
        </div>

        <div className="md3-audit-card-badges">
          <span className={`md3-audit-role-pill md3-audit-role-pill--${roleClass}`} title={`Role: ${actorRole}`}>
            {actorRole}
          </span>
        </div>
      </div>

      {/* ── SUB-HEADER: ACTION CHIP & TIME ── */}
      <div className="md3-audit-card-sub-header">
        <span className={`md3-audit-action-badge md3-audit-action-badge--${category.type}`} title={log.action}>
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
            {category.icon}
          </span>
          <span>{formattedAction}</span>
        </span>
        <span className="md3-audit-time-text" title={fullTime}>
          {relTime}
        </span>
      </div>

      {/* ── CARD BODY METADATA & INSIGHTS ── */}
      <div className="md3-audit-card-details">
        <div className="md3-audit-meta-row" title={`Target Resource ID: ${targetId || 'None'}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary, #00668b)' }}>
            tag
          </span>
          <span className="md3-audit-meta-text">
            Target: {targetId ? <code className="md3-audit-target-code">{targetId.length > 14 ? `${targetId.slice(0, 12)}...` : targetId}</code> : '—'}
          </span>
        </div>

        <div className="md3-audit-meta-row" title={`Network / Terminal: ${ipAddress}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
            lan
          </span>
          <span className="md3-audit-meta-text">
            {ipAddress}
          </span>
        </div>

        <div className="md3-audit-meta-row" title={detailSummary}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#6b7280' }}>
            data_object
          </span>
          <span className="md3-audit-meta-text">
            {detailSummary}
          </span>
        </div>
      </div>

      {/* ── CARD ACTION BUTTON ── */}
      <div className="md3-audit-card-actions">
        <button
          type="button"
          onClick={() => onInspect?.(log)}
          className="md3-audit-btn"
          title="Inspect full audit event payload"
        >
          <span className="material-symbols-rounded">visibility</span>
          <span>Inspect Payload</span>
        </button>
      </div>
    </div>
  );
};

export default AuditCard;
