import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  sanitizeInput,
  validateField,
  validateLoginForm,
  resolveAuthErrorMessage,
} from './authValidation';

const ROLE_ROUTES = {
  Reception: '/dashboard/reception',
  Nurse: '/dashboard/nurse',
  Doctor: '/dashboard/doctor',
  Laboratory: '/dashboard/laboratory',
  Pharmacy: '/dashboard/pharmacy',
  'Ward Operations': '/dashboard/ward-operations',
  Administrator: '/dashboard/administrator',
  Surgeon: '/dashboard/surgeon',
  Billing: '/dashboard/billing',
};

const REMEMBER_STORAGE_KEY = 'hms_saved_username';

/**
 * Custom Hook: useWorkstationAuth
 * 
 * Enforces UX Principles:
 * - On-Submit Error Validation: Errors are displayed ONLY when the submit button is pressed.
 * - Non-Intrusive Typing: Tapping or typing does NOT trigger premature red error states.
 * - Reactive Error Clearing: Once an error is shown after submission, typing a valid value clears it.
 * - Toast-Driven Notifications: Global notices & IT assistance rendered via Toast instead of cluttering UI.
 */
export const useWorkstationAuth = () => {
  const { login } = useAuth();
  const { showWarning, showError, showInfo } = useToast() || {};
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [focusedField, setFocusedField] = useState(null);

  // Restore saved username if previously remembered
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(REMEMBER_STORAGE_KEY) || localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (saved) {
        setForm((prev) => ({ ...prev, username: saved }));
        setRememberMe(true);
      }
    } catch {
      // Storage access safely handled
    }
  }, []);

  // Security countdown timer for failed login attempts lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Field change handler: Sanitizes input and clears existing errors as user fixes them
  const handleFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    const isPassword = name === 'password';
    const sanitized = sanitizeInput(value, isPassword);

    setForm((prev) => ({ ...prev, [name]: sanitized }));

    // If user previously submitted with errors, clear the error once they type valid content
    if (hasSubmitted) {
      const err = validateField(name, sanitized);
      setFieldErrors((prev) => {
        if (!err) {
          const next = { ...prev };
          delete next[name];
          return next;
        }
        return { ...prev, [name]: err };
      });
    }
  }, [hasSubmitted]);

  // Focus & Blur tracking: Strictly manages focus states without triggering premature error validation
  const handleFieldFocus = useCallback((fieldName) => {
    setFocusedField(fieldName);
  }, []);

  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  // IT Credential Assistance trigger: Shows compact toast notice without UI layout shift
  const handleNeedAssistance = useCallback(() => {
    if (showInfo) {
      showInfo(
        'IT Credential Assistance',
        'Password resets are restricted to protect patient records. Please contact your Department Administrator or Hospital IT at Ext. 4400.'
      );
    }
  }, [showInfo]);

  // Form submission: Single source of truth for validation triggers
  const submitLogin = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isSubmitting || lockoutSeconds > 0) return;

    setHasSubmitted(true);

    // Full validation gate upon submit button click
    const { isValid, errors } = validateLoginForm(form);
    if (!isValid) {
      setFieldErrors(errors);
      if (showWarning) {
        showWarning('Validation Notice', 'Please resolve highlighted credential errors before proceeding.');
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const user = await login(form.username.trim(), form.password);

      // Handle durable storage for Remember Workstation
      try {
        if (rememberMe) {
          sessionStorage.setItem(REMEMBER_STORAGE_KEY, form.username.trim());
          localStorage.setItem(REMEMBER_STORAGE_KEY, form.username.trim());
        } else {
          sessionStorage.removeItem(REMEMBER_STORAGE_KEY);
          localStorage.removeItem(REMEMBER_STORAGE_KEY);
        }
      } catch {
        // Storage access safely handled
      }

      // Route based on clinical role
      const targetRoute = ROLE_ROUTES[user?.role] || '/dashboard';
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);

      if (newFails >= 5) {
        setLockoutSeconds(30);
      }

      const message = resolveAuthErrorMessage(err, newFails);
      if (showError) {
        showError('Sign In Failed', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, lockoutSeconds, login, navigate, rememberMe, failedAttempts, showWarning, showError]);

  return {
    form,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    isSubmitting,
    hasSubmitted,
    fieldErrors,
    lockoutSeconds,
    focusedField,
    handleFieldChange,
    handleFieldFocus,
    handleFieldBlur,
    handleNeedAssistance,
    submitLogin,
  };
};
