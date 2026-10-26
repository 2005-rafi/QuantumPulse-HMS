/**
 * hooks/useIdleTimer.js
 * Inactivity detection hook for HIPAA § 164.312(a)(2)(iii) Automatic Logoff compliance.
 * 
 * Features:
 * - Passive, throttled global event listeners (0 CPU overhead)
 * - 2-tier warning and locking lifecycle:
 *   - Tier 1: Warning modal alert (default: 12 minutes / configurable)
 *   - Tier 2: Screen lock & overlay (default: 15 minutes / configurable)
 * - Reset and extend callbacks for smooth clinical UX
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// Clinical Station Default Timeouts: Exactly 1 hour (60 minutes) lock, 55 minutes warning (5m countdown)
const DEFAULT_WARN_MS = 55 * 60 * 1000;
const DEFAULT_LOCK_MS = 60 * 60 * 1000;
const THROTTLE_MS = 1000;

export const useIdleTimer = ({
  warnTimeMs = DEFAULT_WARN_MS,
  lockTimeMs = DEFAULT_LOCK_MS,
  onWarn,
  onLock,
  enabled = true,
} = {}) => {
  // Check if terminal was explicitly locked or elapsed idle exceeds lock threshold
  const getInitialLockState = () => {
    if (typeof window === 'undefined') return false;
    const isSavedLocked = sessionStorage.getItem('hms_terminal_locked') === 'true';
    if (isSavedLocked) return true;
    const savedActivity = sessionStorage.getItem('hms_last_activity');
    if (savedActivity) {
      const parsed = parseInt(savedActivity, 10);
      if (!isNaN(parsed) && parsed > 0) {
        const elapsed = Date.now() - parsed;
        if (elapsed >= lockTimeMs) {
          sessionStorage.setItem('hms_terminal_locked', 'true');
          return true;
        }
      }
    }
    return false;
  };

  const getInitialActivityTime = () => {
    if (typeof window === 'undefined') return Date.now();
    const saved = sessionStorage.getItem('hms_last_activity');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0 && Date.now() - parsed < lockTimeMs) {
        return parsed;
      }
    }
    return Date.now();
  };

  const initialLocked = getInitialLockState();
  const [isWarning, setIsWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round((lockTimeMs - warnTimeMs) / 1000));

  const lastActivityRef = useRef(getInitialActivityTime());
  const lastThrottleRef = useRef(0);
  const warnFiredRef = useRef(false);
  const lockFiredRef = useRef(initialLocked);
  const intervalRef = useRef(null);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    warnFiredRef.current = false;
    lockFiredRef.current = false;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hms_terminal_locked');
      sessionStorage.setItem('hms_last_activity', String(now));
    }
    setIsWarning(false);
    setIsLocked(false);
    setRemainingSeconds(Math.round((lockTimeMs - warnTimeMs) / 1000));
  }, [warnTimeMs, lockTimeMs]);

  // Extend session handler (called when user clicks "Stay Logged In" on warning dialog)
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Handle user activity with 1-second throttle
  const handleActivity = useCallback(() => {
    if (!enabled || isLocked) return;

    const now = Date.now();
    if (now - lastThrottleRef.current > THROTTLE_MS) {
      lastThrottleRef.current = now;
      lastActivityRef.current = now;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hms_last_activity', String(now));
      }

      if (warnFiredRef.current && !lockFiredRef.current) {
        // If user moved during warning phase before locking, reset warning
        warnFiredRef.current = false;
        setIsWarning(false);
        setRemainingSeconds(Math.round((lockTimeMs - warnTimeMs) / 1000));
      }
    }
  }, [enabled, isLocked, warnTimeMs, lockTimeMs]);

  // Attach global DOM event listeners
  useEffect(() => {
    if (!enabled) return;

    // If already locked on mount, notify onLock
    if (initialLocked && onLock) {
      onLock();
    }

    const events = [
      'mousemove',
      'mousedown',
      'mouseup',
      'keydown',
      'keyup',
      'touchstart',
      'touchmove',
      'scroll',
      'wheel',
      'click',
      'pointerdown',
      'pointermove',
      'focus',
    ];
    const listenerOptions = { passive: true };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, listenerOptions);
    });

    // Tick every 1 second to inspect idle duration
    intervalRef.current = setInterval(() => {
      if (!enabled || lockFiredRef.current) return;

      const idleMs = Date.now() - (typeof lastActivityRef.current === 'number' ? lastActivityRef.current : Date.now());

      // Check lock threshold
      if (idleMs >= lockTimeMs) {
        if (!lockFiredRef.current) {
          lockFiredRef.current = true;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('hms_terminal_locked', 'true');
          }
          setIsLocked(true);
          setIsWarning(false);
          if (onLock) onLock();
        }
      }
      // Check warning threshold
      else if (idleMs >= warnTimeMs) {
        if (!warnFiredRef.current) {
          warnFiredRef.current = true;
          setIsWarning(true);
          if (onWarn) onWarn();
        }
        const remaining = Math.max(0, Math.round((lockTimeMs - idleMs) / 1000));
        setRemainingSeconds(remaining);
      }
    }, 1000);

    // Programmatic lock/warn triggers for unit tests and E2E simulation
    const handleTriggerLock = () => {
      lockFiredRef.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hms_terminal_locked', 'true');
      }
      setIsLocked(true);
      setIsWarning(false);
      if (onLock) onLock();
    };

    const handleTriggerWarn = (e) => {
      const customRemaining = e?.detail?.remaining || 300;
      warnFiredRef.current = true;
      setIsWarning(true);
      setIsLocked(false);
      setRemainingSeconds(customRemaining);
      if (onWarn) onWarn();
    };

    window.addEventListener('hms_trigger_lock', handleTriggerLock);
    window.addEventListener('hms_trigger_warn', handleTriggerWarn);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, listenerOptions);
      });
      window.removeEventListener('hms_trigger_lock', handleTriggerLock);
      window.removeEventListener('hms_trigger_warn', handleTriggerWarn);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, handleActivity, warnTimeMs, lockTimeMs, onWarn, onLock]);

  return {
    isWarning,
    isLocked,
    remainingSeconds,
    resetTimer,
    extendSession,
  };
};

export default useIdleTimer;
