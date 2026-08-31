import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import { formatRelativeTime, getActionCategory, getActorInitials, formatActionName } from './AuditCard';
import './AuditListView.css';

/**
 * Material 3 Clinical List View for Audit Logs.
 * Tabular component replicating StaffListView aesthetic and layout.
 */
export const AuditListView = ({
  auditLogs = [],
  onInspect,
}) => {
  if (!auditLogs || auditLogs.length === 0) return null;

  return (
    <div className="md3-audit-list-table-container" role="region" aria-label="System Audit Logs Table">
      <table className="md3-audit-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-audit-time">Time &amp; Date</th>
            <th scope="col" className="col-audit-action">Action &amp; Domain</th>
            <th scope="col" className="col-audit-actor">Actor &amp; Role</th>
            <th scope="col" className="col-audit-target">Target ID</th>
            <th scope="col" className="col-audit-ip">Origin IP</th>
            <th scope="col" className="col-audit-summary">Payload Details</th>
            <th scope="col" className="col-audit-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => {
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
            const ipAddress = log.ipAddress || 'Internal';

            const detailKeyCount = log.details && typeof log.details === 'object' ? Object.keys(log.details).length : 0;
            const detailSummary = detailKeyCount > 0
              ? `${detailKeyCount} ${detailKeyCount === 1 ? 'attribute' : 'attributes'}`
              : 'None';

            return (
              <tr key={log._id} className="md3-audit-list-row" tabIndex={0}>
                {/* 1. Time & Date */}
                <td className="col-audit-time">
                  <div className="md3-audit-time-cell">
                    <span className="md3-audit-rel-time">{relTime}</span>
                    <span className="md3-audit-iso-time" title={fullTime}>{fullTime}</span>
                  </div>
                </td>

                {/* 2. Action & Domain */}
                <td className="col-audit-action">
                  <span className={`md3-audit-action-badge md3-audit-action-badge--${category.type}`}>
                    <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                      {category.icon}
                    </span>
                    <span>{formattedAction}</span>
                  </span>
                </td>

                {/* 3. Actor & Role */}
                <td className="col-audit-actor">
                  <div className="md3-audit-actor-cell">
                    <Md3Avatar
                      initials={initials}
                      size="small"
                      variant={roleClass === 'admin' ? 'primary' : 'secondary'}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="md3-audit-actor-name">{actorName}</span>
                      <span className="md3-audit-actor-sub">{actorRole}</span>
                    </div>
                  </div>
                </td>

                {/* 4. Target ID */}
                <td className="col-audit-target">
                  {targetId ? (
                    <code className="md3-audit-target-code" title={`Target Resource: ${targetId}`}>
                      {targetId.length > 12 ? `${targetId.slice(0, 10)}...` : targetId}
                    </code>
                  ) : (
                    <span style={{ opacity: 0.4 }}>—</span>
                  )}
                </td>

                {/* 5. Origin IP */}
                <td className="col-audit-ip">
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {ipAddress}
                  </span>
                </td>

                {/* 6. Payload Summary */}
                <td className="col-audit-summary">
                  <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {detailSummary}
                  </span>
                </td>

                {/* 7. Action Button */}
                <td className="col-audit-actions text-right">
                  <button
                    type="button"
                    onClick={() => onInspect?.(log)}
                    className="md3-audit-table-btn"
                    title="View Full Audit Payload"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>visibility</span>
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AuditListView;
