/**
 * components/shell/SessionLockOverlay.jsx
 * MD3 Clinical Lock Screen & Inactivity Modal Portal.
 * 
 * Provides fast, contextual PIN/password re-authentication without losing
 * clinician form state or unsaved medical chart inputs.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { authAPI } from '../../services/api';
import { setTokens } from '../../core/useSessionStore';
import './SessionLockOverlay.css';

export const SessionLockOverlay = ({
  user,
  isLocked,
  isWarning,
  remainingSeconds,
  onUnlock,
  onLogout,
  onExtend,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLocked && !isWarning) return null;

  // Warning Toast/Banner
  if (isWarning && !isLocked) {
    return createPortal(
      <div className="hms-warn-banner" role="alert">
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <div>
          <strong>Session Expiring Soon</strong>
          <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
            Inactivity detected. Securing workstation in {remainingSeconds}s
          </div>
        </div>
        <button type="button" className="hms-warn-btn" onClick={onExtend}>
          Stay Active
        </button>
      </div>,
      document.body
    );
  }

  // Full Clinical Lock Screen
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your account password to resume.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const username = user?.username || user?.staffDetails?.username || (typeof window !== 'undefined' ? sessionStorage.getItem('hms_auth_username') : null);
      const { data } = await authAPI.unlock({ username, password });
      const { accessToken, refreshToken } = data.data;

      // Update tokens in memory & local store
      setTokens(accessToken, refreshToken);
      setPassword('');
      setShowPassword(false);
      if (onUnlock) onUnlock();
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect password. Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.fullName || user?.staffDetails?.fullName || user?.username || 'Attending Staff';
  const roleName = user?.role || 'Clinician';

  return createPortal(
    <div className="hms-lock-portal" role="dialog" aria-modal="true" aria-labelledby="hms-lock-title">
      <div className="hms-lock-card">
        <div className="hms-lock-badge">
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>lock</span>
        </div>

        <h2 id="hms-lock-title" className="hms-lock-title">Workstation Secured</h2>
        <p className="hms-lock-desc">
          This clinical terminal has been secured due to inactivity to protect patient records.
        </p>

        <div className="hms-lock-user-chip">
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>person</span>
          <span>{displayName}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>{roleName}</span>
        </div>

        <form onSubmit={handleUnlock} className="hms-lock-form">
          <div className="hms-lock-input-group">
            <label htmlFor="hms-lock-pwd" className="hms-lock-label">Confirm Password to Resume</label>
            <div className="hms-lock-input-wrapper">
              <input
                id="hms-lock-pwd"
                type={showPassword ? 'text' : 'password'}
                className="hms-lock-input"
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="hms-lock-pwd-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && <div className="hms-lock-error">{error}</div>}

          <div className="hms-lock-actions">
            <button type="submit" className="hms-btn-primary" disabled={loading}>
              {loading ? 'Verifying Credentials...' : 'Unlock & Resume Session'}
            </button>
            <button type="button" className="hms-btn-secondary" onClick={onLogout} disabled={loading}>
              Switch Account / Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SessionLockOverlay;
