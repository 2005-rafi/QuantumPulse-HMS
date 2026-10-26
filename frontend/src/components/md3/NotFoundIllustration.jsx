import React from 'react';
import './NotFoundIllustration.css';

/**
 * NotFoundIllustration — High-Fidelity Clinical Vector Animation.
 * Pure SVG + 60fps CSS keyframes (Lottie-grade fidelity with zero external dependencies).
 * Features:
 * - Dynamic ECG oscilloscope cardiac waveform
 * - Orbital radar scanner seeking the route beacon
 * - Floating glassmorphic 404 typography
 * - Medical cross with heartbeat glow aura
 */
export const NotFoundIllustration = ({ className = '', size = 'large' }) => {
  return (
    <div className={`clinical-404-illu clinical-404-illu--${size} ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 560 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="clinical-404-illu__svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="c404-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--md-sys-color-primary, #006a6a)" />
            <stop offset="100%" stopColor="var(--md-sys-color-tertiary, #008272)" />
          </linearGradient>

          <linearGradient id="c404-grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 106, 106, 0.25)" />
            <stop offset="100%" stopColor="rgba(0, 168, 143, 0.03)" />
          </linearGradient>

          <linearGradient id="c404-grad-card" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--md-sys-color-surface-container-high, #e8efec)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--md-sys-color-surface-container-low, #f2f7f4)" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="c404-ecg-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 106, 106, 0.15)" />
            <stop offset="40%" stopColor="var(--md-sys-color-primary, #006a6a)" />
            <stop offset="70%" stopColor="#00b49c" />
            <stop offset="100%" stopColor="rgba(0, 106, 106, 0.2)" />
          </linearGradient>

          <filter id="c404-shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="rgba(0, 75, 75, 0.12)" />
          </filter>

          <filter id="c404-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Oscilloscope Background Grid Panel */}
        <rect
          x="40"
          y="30"
          width="480"
          height="260"
          rx="24"
          fill="url(#c404-grad-card)"
          stroke="var(--md-sys-color-outline-variant, #c0c9c5)"
          strokeWidth="1.5"
          filter="url(#c404-shadow)"
        />

        {/* Clinical Grid Lines */}
        <g className="c404-grid-lines" opacity="0.35" stroke="var(--md-sys-color-outline-variant, #a6b5af)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="40" y1="95" x2="520" y2="95" />
          <line x1="40" y1="160" x2="520" y2="160" />
          <line x1="40" y1="225" x2="520" y2="225" />
          <line x1="120" y1="30" x2="120" y2="290" />
          <line x1="200" y1="30" x2="200" y2="290" />
          <line x1="280" y1="30" x2="280" y2="290" />
          <line x1="360" y1="30" x2="360" y2="290" />
          <line x1="440" y1="30" x2="440" y2="290" />
        </g>

        {/* Ambient Radar Beacon Scanning Circles */}
        <g className="c404-radar-group" transform="translate(280, 160)">
          <circle r="45" className="c404-radar-ring c404-radar-ring--1" />
          <circle r="85" className="c404-radar-ring c404-radar-ring--2" />
          <circle r="125" className="c404-radar-ring c404-radar-ring--3" />
        </g>

        {/* Animated ECG Pulse Waveform Trace */}
        <path
          d="M 50 160 L 140 160 L 155 145 L 168 175 L 182 110 L 198 210 L 212 145 L 225 168 L 238 160 L 320 160 L 335 142 L 348 180 L 362 105 L 378 215 L 392 148 L 405 166 L 418 160 L 510 160"
          fill="none"
          stroke="url(#c404-ecg-stroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="c404-ecg-path"
        />

        {/* Moving Telemetry Lead Dot */}
        <circle r="5.5" fill="#00d8bc" className="c404-telemetry-dot" filter="url(#c404-glow-filter)" />

        {/* Central 404 Floating Badge Deck */}
        <g className="c404-center-deck" transform="translate(280, 145)">
          {/* Shadow & Aura */}
          <circle r="68" fill="url(#c404-grad-glow)" className="c404-glow-aura" />

          {/* Central Medical Vessel Badge */}
          <rect
            x="-75"
            y="-52"
            width="150"
            height="104"
            rx="20"
            fill="var(--md-sys-color-surface, #ffffff)"
            stroke="var(--md-sys-color-outline-variant, #b2c2bc)"
            strokeWidth="2"
            filter="url(#c404-shadow)"
          />

          {/* Medical Cross Header */}
          <g transform="translate(0, -26)" className="c404-med-cross">
            <rect x="-14" y="-14" width="28" height="28" rx="8" fill="var(--md-sys-color-primary-container, #cce8e3)" />
            <path
              d="M 0 -8 L 0 8 M -8 0 L 8 0"
              stroke="var(--md-sys-color-primary, #006a6a)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* 404 Bold Typography */}
          <text
            x="0"
            y="26"
            textAnchor="middle"
            fill="var(--md-sys-color-primary, #006a6a)"
            fontWeight="900"
            fontSize="38"
            fontFamily="'Inter', system-ui, -apple-system, sans-serif"
            letterSpacing="-1.5"
            className="c404-numbers"
          >
            404
          </text>
        </g>

        {/* Satellite Floating Mini Chips */}
        {/* Left Chip: Domain Route Beacon */}
        <g className="c404-floating-chip c404-floating-chip--left" transform="translate(90, 80)">
          <rect x="0" y="0" width="130" height="34" rx="17" fill="var(--md-sys-color-surface, #ffffff)" stroke="#c2d4ce" strokeWidth="1" />
          <circle cx="16" cy="17" r="4.5" fill="#00a88f" className="c404-pulse-indicator" />
          <text x="28" y="21" fill="var(--md-sys-color-on-surface, #2d3b36)" fontSize="11" fontWeight="600" fontFamily="'Inter', system-ui, sans-serif">
            Route Search Active
          </text>
        </g>

        {/* Right Chip: Hospital System Protected */}
        <g className="c404-floating-chip c404-floating-chip--right" transform="translate(365, 230)">
          <rect x="0" y="0" width="135" height="34" rx="17" fill="var(--md-sys-color-surface, #ffffff)" stroke="#c2d4ce" strokeWidth="1" />
          <path d="M14 17l4 4 8-8" stroke="#008272" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="32" y="21" fill="var(--md-sys-color-on-surface, #2d3b36)" fontSize="11" fontWeight="600" fontFamily="'Inter', system-ui, sans-serif">
            Data 100% Secured
          </text>
        </g>
      </svg>
    </div>
  );
};

export default NotFoundIllustration;
