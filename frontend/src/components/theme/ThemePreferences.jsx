import React from 'react';
import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import './ThemePreferences.css';

/**
 * ThemePreferences — Reusable Material 3 theme preferences component.
 * Allows users to choose between Light and Dark modes in profile settings.
 * Default is Light mode.
 */
export const ThemePreferences = ({ showHeader = true, compact = false }) => {
  const { effectiveTheme, setThemeMode } = useTheme();

  const themeOptions = [
    {
      id: THEME_MODES.LIGHT,
      name: 'Light Theme',
      tagline: 'Recommended default',
      description: 'Clean, high-readability daylight theme engineered for clinical desktop workstations.',
      icon: 'light_mode',
      previewClass: 'light-preview',
    },
    {
      id: THEME_MODES.DARK,
      name: 'Dark Theme',
      tagline: 'Low-glare night shift',
      description: 'Restful, high-contrast dark palette optimized for night shifts and low-light wards.',
      icon: 'dark_mode',
      previewClass: 'dark-preview',
    },
  ];

  return (
    <div className={`theme-preferences-card ${compact ? 'compact' : ''}`}>
      {showHeader && (
        <div className="theme-preferences-header">
          <div className="theme-preferences-title-group">
            <div className="theme-preferences-icon">
              <span className="material-symbols-rounded">palette</span>
            </div>
            <div>
              <h3 className="theme-preferences-title">Theme &amp; Display Appearance</h3>
              <p className="theme-preferences-subtitle">
                Customize your visual interface theme. Default is Light Mode; your preference is securely remembered across visits.
              </p>
            </div>
          </div>

          <div className="theme-status-pill">
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
              {effectiveTheme === THEME_MODES.DARK ? 'dark_mode' : 'light_mode'}
            </span>
            <span>
              Active: <strong>{effectiveTheme === THEME_MODES.DARK ? 'Dark Mode' : 'Light Mode'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 2-Mode Choice Grid (Light vs Dark) */}
      <div className="theme-options-grid theme-options-grid-duo" role="radiogroup" aria-label="Choose interface theme">
        {themeOptions.map((option) => {
          const isSelected = effectiveTheme === option.id;
          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              className={`theme-option-tile ${isSelected ? 'active' : ''}`}
              onClick={() => setThemeMode(option.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setThemeMode(option.id);
                }
              }}
            >
              {/* Mini Visual Preview */}
              <div className={`theme-preview-box ${option.previewClass}`} aria-hidden="true">
                <div className="tp-header">
                  <div className="tp-dot" />
                  <div className="tp-dot" />
                  <span className="tp-preview-label">{option.name}</span>
                </div>
                <div className="tp-body">
                  <div className="tp-card" />
                  <div className="tp-card" />
                </div>
              </div>

              {/* Tile Details */}
              <div className="theme-tile-content">
                <div className="theme-tile-text">
                  <div className="theme-tile-header-row">
                    <span className="theme-tile-name">{option.name}</span>
                    <span className="theme-tile-tag">{option.tagline}</span>
                  </div>
                  <span className="theme-tile-desc">{option.description}</span>
                </div>

                {isSelected ? (
                  <div className="theme-check-badge" title="Selected theme">
                    <span className="material-symbols-rounded">check</span>
                  </div>
                ) : (
                  <div className="theme-radio-circle" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThemePreferences;

