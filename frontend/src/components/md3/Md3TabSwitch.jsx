import React from 'react';
import './Md3TabSwitch.css';

/**
 * Md3TabSwitch — Reusable Material Design 3 Expressive Tab Switcher
 * 
 * Features:
 * - Semi-sharp corners (8px) with subtle rounded finish.
 * - Explicit color theory for IDLE, HOVER, and ACTIVE / ONTAP states.
 * - Supports icon + label + optional count badge.
 * - High-density clinical sizing.
 * 
 * Props:
 * @param {Array<{id: string, label: string, icon?: string|React.ReactNode, badge?: number|string}>} tabs - Array of tab definitions
 * @param {string} activeTab - ID of the currently selected tab
 * @param {Function} onChange - (tabId: string) => void
 * @param {'small'|'medium'|'large'} [size='medium'] - Sizing modifier
 * @param {boolean} [fullWidth=false] - Whether tabs should expand to fill horizontal width
 * @param {string} [className=''] - Additional class names
 * @param {object} [style={}] - Inline styling overrides
 */
export const Md3TabSwitch = ({
  tabs = [],
  activeTab,
  onChange,
  size = 'medium',
  fullWidth = false,
  className = '',
  style = {},
}) => {
  return (
    <nav
      className={`md3-tab-switch-container md3-tab-switch-container--${size} ${fullWidth ? 'md3-tab-switch-container--full-width' : ''} ${className}`}
      role="tablist"
      aria-label="Tab navigation"
      style={style}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconElement = typeof tab.icon === 'string' ? (
          <span className="material-symbols-rounded">{tab.icon}</span>
        ) : (
          tab.icon
        );

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`md3-tab-switch-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange && onChange(tab.id)}
            title={tab.label}
          >
            {iconElement}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="md3-tab-switch-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default Md3TabSwitch;
