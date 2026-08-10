import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './Md3Toast.css';

// OOP Class definition for a Toast entity (Single Responsibility Principle)
export class Toast {
  constructor(message, reason, type = 'success', duration = 5000) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.message = message;
    this.reason = reason;
    this.type = type; // 'success' | 'error' | 'info' | 'warning'
    this.duration = duration;
    this.isExiting = false;
  }
}

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Dismiss a specific toast by triggering its exit animation first
  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    
    // Remove completely after animation finishes (300ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  // Dispatch a new toast
  const addToast = useCallback((message, reason, type = 'success', duration = 5000) => {
    const newToast = new Toast(message, reason, type, duration);
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after duration
    setTimeout(() => {
      dismissToast(newToast.id);
    }, duration);
  }, [dismissToast]);

  const showSuccess = useCallback((message, reason) => {
    addToast(message, reason, 'success');
  }, [addToast]);

  const showError = useCallback((message, reason) => {
    addToast(message, reason, 'error');
  }, [addToast]);

  const showInfo = useCallback((message, reason) => {
    addToast(message, reason, 'info');
  }, [addToast]);

  const showWarning = useCallback((message, reason) => {
    addToast(message, reason, 'warning');
  }, [addToast]);

  // Combined context API
  const contextValue = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss: dismissToast,
    toasts
  };

  // Helper to determine MD3 icons for each toast type
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Overlay Layer rendered via React Portal to prevent layout shifts or stutters */}
      {ReactDOM.createPortal(
        <div className="md3-toast-container" aria-live="assertive">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`md3-toast-card md3-toast-${toast.type} ${toast.isExiting ? 'md3-toast-exit' : 'md3-toast-enter'}`}
              role="alert"
            >
              <div className="md3-toast-content">
                <span className="material-symbols-rounded md3-toast-icon">
                  {getIcon(toast.type)}
                </span>
                <div className="md3-toast-text-wrapper">
                  <div className="md3-toast-title">{toast.message}</div>
                  {toast.reason && <div className="md3-toast-reason">{toast.reason}</div>}
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="md3-toast-close-btn"
                  aria-label="Dismiss notification"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
              {/* Dynamic progress bar showing duration indicator */}
              <div 
                className="md3-toast-progress" 
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
