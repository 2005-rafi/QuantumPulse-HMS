import React from 'react';

/**
 * Md3BedComfortBadge
 * Displays standardized Material Design 3 visual badges for Bed Comfort Tiers,
 * Ward Sharing types, and Critical Care classifications.
 */
export const COMFORT_CONFIG = {
  STANDARD: {
    label: 'Standard',
    icon: 'single_bed',
    bg: 'var(--md-sys-color-surface-container, #e8f0ec)',
    fg: 'var(--md-sys-color-on-surface-variant, #404944)',
    border: 'var(--md-sys-color-outline-variant, #c0c9c4)',
  },
  COMFORT: {
    label: 'Comfort',
    icon: 'hotel',
    bg: 'var(--md-sys-color-secondary-container, #cce8e0)',
    fg: 'var(--md-sys-color-on-secondary-container, #05201a)',
    border: 'color-mix(in srgb, var(--md-sys-color-secondary) 30%, transparent)',
  },
  DELUXE: {
    label: 'Deluxe',
    icon: 'king_bed',
    bg: 'var(--md-sys-color-primary-container, #c3e7ff)',
    fg: 'var(--md-sys-color-on-primary-container, #001e2e)',
    border: 'color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent)',
  },
  SUPER_DELUXE_SUITE: {
    label: 'Super Deluxe Suite',
    icon: 'star',
    bg: 'var(--md-sys-color-tertiary-container, #ffdcc2)',
    fg: 'var(--md-sys-color-on-tertiary-container, #2e1500)',
    border: 'color-mix(in srgb, var(--md-sys-color-tertiary) 40%, transparent)',
  },
  EXECUTIVE_PRESIDENTIAL: {
    label: 'Executive Presidential',
    icon: 'workspace_premium',
    bg: '#f3e5f5',
    fg: '#4a148c',
    border: '#ce93d8',
  },
};

export const SHARING_CONFIG = {
  GENERAL_WARD: { label: 'General Ward (Shared)', icon: 'groups' },
  SEMI_PRIVATE: { label: 'Semi-Private (Twin)', icon: 'group' },
  PRIVATE_SINGLE: { label: 'Private Single', icon: 'person' },
  VIP_ISOLATION: { label: 'VIP Isolation', icon: 'shield' },
};

export const Md3BedComfortBadge = ({
  tier = 'STANDARD',
  sharing = null,
  size = 'medium',
  showIcon = true,
  style = {},
}) => {
  const conf = COMFORT_CONFIG[tier] || COMFORT_CONFIG.STANDARD;
  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        backgroundColor: conf.bg,
        color: conf.fg,
        border: `1px solid ${conf.border}`,
        fontSize: isSmall ? '0.72rem' : '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`Comfort Tier: ${conf.label}${sharing ? ` • ${SHARING_CONFIG[sharing]?.label || sharing}` : ''}`}
    >
      {showIcon && (
        <span
          className="material-symbols-rounded"
          style={{ fontSize: isSmall ? '13px' : '15px', lineHeight: 1 }}
        >
          {conf.icon}
        </span>
      )}
      <span>{conf.label}</span>
      {sharing && (
        <span style={{ opacity: 0.75, fontWeight: 500, fontSize: isSmall ? '0.68rem' : '0.75rem' }}>
          • {SHARING_CONFIG[sharing]?.label?.split(' ')[0] || sharing}
        </span>
      )}
    </span>
  );
};

export default Md3BedComfortBadge;
