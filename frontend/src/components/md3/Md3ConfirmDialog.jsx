import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Md3ConfirmDialog.css';

/**
 * Md3ConfirmDialog — Dedicated Pure Material Design 3 Confirmation & Cancellation Dialog Component.
 *
 * Plug-in architecture:
 *   - Positioned DEAD CENTER of the screen in a dedicated top layer (z-index: 10000+).
 *   - Used exclusively for critical action confirmations, destructive deletions, and cancellations.
 *   - Form dialogs & multi-input editors remain top-centered in the standard modal layer.
 *
 * Props:
 *   isOpen        {boolean}   Controls dialog visibility
 *   onClose       {function}  Called when user cancels, dismisses, or presses Escape
 *   onConfirm     {function}  Called when user confirms the primary action
 *   title         {string}    Headline prompt (e.g. "Deactivate Tariff Rule?")
 *   message       {string}    Supporting explanation of consequences
 *   confirmLabel  {string}    Action button label (default: "Confirm")
 *   cancelLabel   {string}    Cancel button label (default: "Cancel")
 *   variant       {string}    "danger" | "warning" | "info" | "success" (default: "danger")
 *   icon          {string}    Material Symbol icon name (optional)
 *   loading       {boolean}   Displays loading spinner on confirm button
 *   zIndex        {number}    Layer elevation (default: 10000)
 */
export const Md3ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon,
  loading = false,
  zIndex = 10000,
  children,
}) => {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!loading && onClose) {
      onClose();
    }
  }, [loading, onClose]);

  // Lock body scroll & listen to Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, loading, handleClose]);

  if (!shouldRender) return null;

  const defaultIcons = {
    danger: 'block',
    warning: 'warning',
    info: 'info',
    success: 'check_circle',
  };

  const resolvedIcon = icon || defaultIcons[variant] || 'help';

  return createPortal(
    <div
      className={`md3-confirm-scrim ${isClosing ? 'md3-confirm-scrim--closing' : 'md3-confirm-scrim--open'}`}
      style={{ zIndex }}
      onClick={handleClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="md3-confirm-title"
      aria-describedby="md3-confirm-message"
    >
      <div
        className={`md3-confirm-surface md3-confirm-surface--${variant} ${isClosing ? 'md3-confirm-surface--closing' : 'md3-confirm-surface--open'}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Icon Pill Header */}
        <div className={`md3-confirm-icon-wrap md3-confirm-icon-wrap--${variant}`}>
          <span className="material-symbols-rounded md3-confirm-icon">{resolvedIcon}</span>
        </div>

        {/* Content Group */}
        <div className="md3-confirm-content">
          {title && (
            <h3 id="md3-confirm-title" className="md3-confirm-title">
              {title}
            </h3>
          )}
          {message && (
            <p id="md3-confirm-message" className="md3-confirm-message">
              {message}
            </p>
          )}
          {children}
        </div>

        {/* Action Button Row */}
        <div className="md3-confirm-actions">
          <button
            type="button"
            className="md3-confirm-btn md3-confirm-btn--cancel"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`md3-confirm-btn md3-confirm-btn--confirm md3-confirm-btn--confirm-${variant}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? (
              <span className="md3-confirm-spinner" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Md3ConfirmDialog;
