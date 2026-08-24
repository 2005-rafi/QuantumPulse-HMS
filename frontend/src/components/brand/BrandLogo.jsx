import React, { useState, useMemo } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import './BrandLogo.css';

/**
 * Default Medical Vector Mark (Graceful SVG Fallback)
 */
const DefaultBrandFallback = ({ size = 'md' }) => (
  <div className={`brand-logo-fallback brand-logo-fallback--${size}`} aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none" className="brand-logo-fallback__svg">
      <rect width="40" height="40" rx="10" fill="var(--md-sys-color-primary, #00668b)" />
      <path d="M20 10v20M10 20h20" stroke="var(--md-sys-color-on-primary, #ffffff)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M26 26c1.5-2 2-5 0-7s-5 0-7 2" stroke="var(--md-sys-color-primary-container, #c2e8ff)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

/**
 * BrandLogo — Dynamic, Material 3 Scalable Brand Logo Component.
 *
 * Design Principles:
 * 1. Dynamic Vector Proportions: Preserves intrinsic SVG aspect ratio with 'object-fit: contain' (No arbitrary square clipping).
 * 2. Unrestricted Fluid Sizing: Expands and contracts gracefully according to surrounding layout or explicit variants.
 * 3. Reactive Theme Swapping: Automatically renders light.svg or dark.svg based on active ThemeContext (Daylight vs Night mode).
 * 4. Zero Layout Shift: Smooth transition animations and graceful fallback on network load errors.
 *
 * @param {Object} props
 * @param {'header'|'hero'|'card'|'compact'|'full'|'auto'} [props.variant='auto'] - Layout context variant.
 * @param {'sm'|'md'|'lg'|'xl'|'custom'} [props.size='md'] - Visual size scale.
 * @param {string|number} [props.maxHeight] - Optional custom max height (e.g. '42px', 48).
 * @param {string|number} [props.maxWidth] - Optional custom max width (e.g. '240px', 280).
 * @param {boolean} [props.forceDark] - Force dark mode SVG variant (e.g. on dark hero gradient).
 * @param {boolean} [props.forceLight] - Force light mode SVG variant.
 * @param {string} [props.className] - Extra CSS classes.
 * @param {Object} [props.style] - Inline styles.
 * @param {string} [props.alt] - Alt text description.
 * @param {React.ReactNode} [props.fallback] - Custom fallback node.
 */
export const BrandLogo = ({
  variant = 'auto',
  size = 'md',
  maxHeight,
  maxWidth,
  className = '',
  style = {},
  alt,
  fallback,
}) => {
  const config = useConfig();
  const [hasError, setHasError] = useState(false);

  // Single unified SVG logo
  const logoUrl = config?.LOGO_URL || '/logo.svg';
  const altText = alt || config?.HOSPITAL_NAME || config?.SHORT_NAME || 'Quantum CareOne Brand Logo';

  if (hasError || !logoUrl) {
    return fallback || <DefaultBrandFallback size={size} />;
  }

  // Dynamic inline dimension overrides
  const customDimensions = {};
  if (maxHeight) customDimensions.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  if (maxWidth) customDimensions.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div
      className={`brand-logo-wrap brand-logo-wrap--${variant} brand-logo-wrap--size-${size} ${className}`}
      style={{ ...customDimensions, ...style }}
    >
      <img
        src={logoUrl}
        alt={altText}
        className="brand-logo-img-dynamic"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default BrandLogo;
