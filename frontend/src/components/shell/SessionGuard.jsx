/**
 * components/shell/SessionGuard.jsx
 * Composed security guard wrapper enforcing:
 * 1. Automatic inactivity logoff & lock screen (HIPAA § 164.312(a)(2)(iii))
 * 2. Window/Tab switch privacy blur (Shoulder-surfing defense)
 * 3. Cross-tab session state synchrony
 */
import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { SessionLockOverlay } from './SessionLockOverlay';

export const SessionGuard = ({ children }) => {
  const { user, logout } = useAuth();

  const {
    isWarning,
    isLocked,
    remainingSeconds,
    resetTimer,
    extendSession,
  } = useIdleTimer({
    enabled: Boolean(user),
    warnTimeMs: 12 * 60 * 1000, // 12 minutes warning
    lockTimeMs: 15 * 60 * 1000, // 15 minutes lock
  });

  // Privacy Blur on Window/Tab Focus Loss (Shoulder-Surfing Defense)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      const rootEl = document.getElementById('root');
      if (!rootEl) return;

      if (document.visibilityState === 'hidden') {
        rootEl.classList.add('hms-privacy-blur');
      } else {
        rootEl.classList.remove('hms-privacy-blur');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.classList.remove('hms-privacy-blur');
    };
  }, [user]);

  return (
    <>
      {children}
      {user && (
        <SessionLockOverlay
          user={user}
          isLocked={isLocked}
          isWarning={isWarning}
          remainingSeconds={remainingSeconds}
          onUnlock={resetTimer}
          onLogout={logout}
          onExtend={extendSession}
        />
      )}
    </>
  );
};

export default SessionGuard;
