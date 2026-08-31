import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatActionName, getActionCategory } from './AuditCard';

/**
 * AuditDetailDialog — Pure Material Design 3 Top-Center Audit Event Inspector.
 * Uses createPortal with top-center layout and glassmorphism backdrop.
 */
export const AuditDetailDialog = ({
  log,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const actor = log.actorId || {};
  const actorName = actor.fullName || actor.username || 'System Administrator';
  const category = getActionCategory(log.action);
  const formattedAction = formatActionName(log.action);
  const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';
  const payloadString = JSON.stringify(log.details || {}, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.38)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 16px 24px',
        zIndex: 2000,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div
        style={{
          background: 'var(--md-sys-color-surface, #ffffff)',
          color: 'var(--md-sys-color-on-surface, #1d1b20)',
          borderRadius: '28px',
          border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          boxShadow: '0 20px 54px rgba(0, 0, 0, 0.20)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--md-sys-color-primary-container, #c2e8ff)',
                color: 'var(--md-sys-color-on-primary-container, #004d67)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                {category.icon}
              </span>
            </div>
            <div>
              <h3 id="audit-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
                {formattedAction}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                {log.action} · Log ID: {log._id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--md-sys-color-on-surface-variant, #49454f)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close dialog"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Body Metadata Grid */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
              borderRadius: '16px',
              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
              fontSize: '0.80rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block' }}>Actor:</span>
              <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{actorName}</strong> ({log.actorRole || 'SYSTEM'})
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block' }}>Timestamp:</span>
              <span style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{timestamp}</span>
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block' }}>Target Entity ID:</span>
              <code style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.targetId || 'None'}</code>
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block' }}>Origin IP / Node:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.ipAddress || 'Internal Terminal'}</span>
            </div>
          </div>

          {/* JSON Payload Viewer */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sanitized Payload JSON
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  background: 'transparent',
                  color: copied ? '#15803d' : 'var(--md-sys-color-primary, #00668b)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre
              style={{
                margin: 0,
                padding: '16px',
                background: 'var(--md-sys-color-surface-container-high, #ece6f0)',
                color: 'var(--md-sys-color-on-surface, #1d1b20)',
                borderRadius: '12px',
                border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                fontFamily: 'monospace',
                fontSize: '0.80rem',
                maxHeight: '260px',
                overflowX: 'auto',
                overflowY: 'auto',
                lineHeight: 1.45,
              }}
            >
              {payloadString}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 28px',
              borderRadius: '100px',
              background: 'var(--md-sys-color-primary, #00668b)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuditDetailDialog;
