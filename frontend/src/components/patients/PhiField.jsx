/**
 * components/patients/PhiField.jsx
 * Reusable MD3 Masked Protected Health Information (PHI) Display Component.
 * 
 * Provides click-to-reveal for sensitive patient identifiers (Aadhaar, Phone, Email)
 * with auto-remasking after 30 seconds to prevent shoulder-surfing.
 */
import React from 'react';
import { usePHIMask } from '../../hooks/usePHIMask';

export const PhiField = ({
  value,
  type = 'text',
  allowReveal = true,
  className = '',
  style = {},
  showIcon = true,
}) => {
  const { displayValue, isRevealed, toggle } = usePHIMask(value, type);

  if (!value) {
    return <span className={`phi-field-empty ${className}`} style={{ color: 'var(--md-sys-color-outline, #79747e)', ...style }}>—</span>;
  }

  return (
    <span
      className={`phi-field-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: isRevealed ? 'normal' : '0.04em',
        ...style,
      }}
    >
      <span className="phi-field-value">{displayValue}</span>

      {allowReveal && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          title={isRevealed ? 'Mask value' : 'Reveal sensitive value (auto-masks in 30s)'}
          aria-label={isRevealed ? 'Mask value' : 'Reveal sensitive value'}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '2px 4px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isRevealed ? 'var(--md-sys-color-primary, #006a57)' : 'var(--md-sys-color-outline, #79747e)',
            borderRadius: '4px',
            fontSize: '14px',
            lineHeight: 1,
            transition: 'color 0.2s',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
            {isRevealed ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      )}
    </span>
  );
};

export default PhiField;
