import React from 'react';

const HmsBrandIcon = ({ width = 34, height = 34, viewBox = "0 0 40 40", className = "" }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox={viewBox} 
    fill="none" 
    className={className}
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="10" fill="var(--md-sys-color-primary)" />
    <path 
      d="M20 10v20M10 20h20" 
      stroke="var(--md-sys-color-on-primary)" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
    />
  </svg>
);

export default HmsBrandIcon;
