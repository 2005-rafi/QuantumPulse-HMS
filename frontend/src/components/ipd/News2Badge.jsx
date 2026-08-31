/**
 * components/ipd/News2Badge.jsx
 * National Early Warning Score (NEWS2) visual risk badge.
 */
import React from 'react';

export const News2Badge = ({ score = 0, riskLevel = 'LOW' }) => {
  let bg = 'var(--md-sys-color-primary-container, #bbf2e1)';
  let color = 'var(--md-sys-color-on-primary-container, #00211a)';
  let label = 'Low Risk';

  if (riskLevel === 'MEDIUM' || (score >= 5 && score <= 6)) {
    bg = 'var(--md-sys-color-tertiary-container, #ffddb3)';
    color = 'var(--md-sys-color-on-tertiary-container, #2b1700)';
    label = 'Medium Risk';
  } else if (riskLevel === 'HIGH' || score >= 7) {
    bg = 'var(--md-sys-color-error-container, #ffdad6)';
    color = 'var(--md-sys-color-on-error-container, #410002)';
    label = 'High Risk (Critical)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '100px',
        fontSize: '0.78rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: '1px solid currentColor',
      }}
      title={`NEWS2 Score: ${score}/20 (${label})`}
    >
      <span style={{ fontSize: '10px' }}>●</span>
      NEWS2: {score} ({label})
    </span>
  );
};

export default News2Badge;
