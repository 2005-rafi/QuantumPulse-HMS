/**
 * hooks/usePHIMask.js
 * Composable PHI masking hook with timed auto-remask for HIPAA Privacy Rule § 164.514 compliance.
 * 
 * Masking Patterns:
 * - Aadhaar:   XXXX-XXXX-1234
 * - Phone:     +91 ••••••1234
 * - Email:     j•••••@example.com
 * - Default:   ••••••••
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const DEFAULT_AUTOREMASK_MS = 30 * 1000; // 30 seconds auto-remask

export const maskPhiValue = (value, type = 'text') => {
  if (!value || typeof value !== 'string') return '—';

  const trimmed = value.trim();
  if (!trimmed) return '—';

  switch (type.toLowerCase()) {
    case 'aadhaar': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 4) {
        const last4 = digits.slice(-4);
        return `••••-••••-${last4}`;
      }
      return '••••-••••-••••';
    }

    case 'phone': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 4) {
        const last4 = digits.slice(-4);
        const prefix = trimmed.startsWith('+91') ? '+91 ' : '';
        return `${prefix}••••••${last4}`;
      }
      return '••••••••••';
    }

    case 'email': {
      const parts = trimmed.split('@');
      if (parts.length === 2) {
        const [name, domain] = parts;
        const visibleChar = name.length > 0 ? name[0] : '';
        return `${visibleChar}•••••@${domain}`;
      }
      return '••••@••••';
    }

    default: {
      if (trimmed.length <= 4) return '••••';
      return `${trimmed.slice(0, 1)}••••${trimmed.slice(-1)}`;
    }
  }
};

export const usePHIMask = (rawValue, type = 'text', timeoutMs = DEFAULT_AUTOREMASK_MS) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const timerRef = useRef(null);

  const mask = useCallback(() => {
    setIsRevealed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reveal = useCallback(() => {
    setIsRevealed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (timeoutMs > 0) {
      timerRef.current = setTimeout(() => {
        setIsRevealed(false);
        timerRef.current = null;
      }, timeoutMs);
    }
  }, [timeoutMs]);

  const toggle = useCallback(() => {
    if (isRevealed) {
      mask();
    } else {
      reveal();
    }
  }, [isRevealed, mask, reveal]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const displayValue = useMemo(() => {
    if (isRevealed) return rawValue || '—';
    return maskPhiValue(rawValue, type);
  }, [rawValue, type, isRevealed]);

  return {
    displayValue,
    isRevealed,
    toggle,
    reveal,
    mask,
    rawValue,
  };
};

export default usePHIMask;
