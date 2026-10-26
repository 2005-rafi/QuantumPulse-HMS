import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatActionName, getActionCategory } from './AuditCard';

/**
 * AuditDetailDialog — Enterprise Material 3 Audit Event & Cryptographic Inspector.
 * Displays:
 * 1. Actor, Timestamp, Entity Target, Origin IP
 * 2. Status Transition Diff (Before -> After with Reason)
 * 3. Cryptographic Chain-of-Custody Proof (Block Index, PrevHash, Hash)
 * 4. Sanitized Payload JSON Viewer with Clipboard copy
 */
export const AuditDetailDialog = ({
  log,
  isOpen,
  onClose,
}) => {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !log) return null;

  const actor = log.actorSnapshot || log.actorId || {};
  const actorName = actor.fullName || actor.username || log.actorRole || 'System Administrator';
  const category = getActionCategory(log.action);
  const formattedAction = formatActionName(log.action);
  const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';
  const payloadString = JSON.stringify(log.details || {}, null, 2);

  const severity = (log.severity || 'INFO').toUpperCase();
  const severityColors = {
    CRITICAL: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    WARNING: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    INFO: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  }[severity] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payloadString);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyHash = () => {
    if (!log.hash) return;
    navigator.clipboard.writeText(log.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
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
          borderRadius: '24px',
          border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.22)',
          maxWidth: '740px',
          width: '100%',
          maxHeight: 'calc(100vh - 64px)',
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
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 id="audit-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
                  {formattedAction}
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    backgroundColor: severityColors.bg,
                    color: severityColors.text,
                    border: `1px solid ${severityColors.border}`,
                    letterSpacing: '0.04em',
                  }}
                >
                  {severity}
                </span>
                {log.category && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '100px',
                      backgroundColor: 'var(--md-sys-color-surface-container, #f3edf7)',
                      color: 'var(--md-sys-color-on-surface-variant, #49454f)',
                    }}
                  >
                    {log.category}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                {log.action} · Log ID: <code style={{ fontFamily: 'monospace' }}>{log._id}</code>
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

        {/* Body */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
              borderRadius: '16px',
              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Actor:</span>
              <strong style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{actorName}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline, #79747e)' }}>Role: {log.actorRole || 'SYSTEM'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Timestamp:</span>
              <span style={{ color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>{timestamp}</span>
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Target Entity ID:</span>
              <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{log.targetId || 'None'}</code>
            </div>
            <div>
              <span style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500, display: 'block', marginBottom: '2px' }}>Origin IP / Terminal:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.ipAddress || 'Internal Microservice'}</span>
            </div>
          </div>

          {/* Status Change Before/After Inspector (If Available) */}
          {log.statusChange && (log.statusChange.from || log.statusChange.to) && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: '1px solid #fed7aa',
                background: '#fffaf0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#c2410c', fontWeight: 700, fontSize: '0.82rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>swap_horiz</span>
                <span>STATUS TRANSITION AUDIT</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>Previous State</span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '0.82rem', marginTop: '2px' }}>
                    {log.statusChange.from || 'INITIAL'}
                  </span>
                </div>
                <span className="material-symbols-rounded" style={{ color: '#9a3412', fontSize: '20px' }}>arrow_forward</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>New Transitioned State</span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.82rem', marginTop: '2px' }}>
                    {log.statusChange.to || 'UNKNOWN'}
                  </span>
                </div>
                {log.statusChange.reason && (
                  <div style={{ flex: 1, minWidth: '180px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600, display: 'block' }}>Documented Reason</span>
                    <span style={{ fontSize: '0.80rem', color: '#451a03', fontStyle: 'italic' }}>
                      "{log.statusChange.reason}"
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cryptographic Proof Block */}
          {log.hash && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: '1px solid #bfdbfe',
                background: '#f0f9ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700, fontSize: '0.82rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>verified</span>
                  <span>CRYPTOGRAPHIC CHAIN-OF-CUSTODY SEAL (SHA-256)</span>
                </div>
                {log.chainIndex !== undefined && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#bae6fd', color: '#0369a1' }}>
                    Block #{log.chainIndex}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ color: '#0284c7', fontWeight: 600, width: '70px', flexShrink: 0 }}>Prev Hash:</span>
                  <code style={{ fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all' }}>
                    {log.prevHash || '0000000000000000000000000000000000000000000000000000000000000000 (GENESIS)'}
                  </code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0284c7', fontWeight: 600, width: '70px', flexShrink: 0 }}>Block Hash:</span>
                  <code style={{ fontFamily: 'monospace', color: '#047857', fontWeight: 700, wordBreak: 'break-all', flex: 1 }}>
                    {log.hash}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedHash ? '#047857' : '#0284c7',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copy SHA-256 Block Hash"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      {copiedHash ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JSON Payload Viewer */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sanitized Payload JSON
              </span>
              <button
                type="button"
                onClick={handleCopyPayload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  background: 'transparent',
                  color: copiedPayload ? '#15803d' : 'var(--md-sys-color-primary, #00668b)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                  {copiedPayload ? 'check' : 'content_copy'}
                </span>
                <span>{copiedPayload ? 'Copied!' : 'Copy JSON'}</span>
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
                maxHeight: '220px',
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
            padding: '14px 24px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: '100px',
              background: 'var(--md-sys-color-primary, #00668b)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuditDetailDialog;
