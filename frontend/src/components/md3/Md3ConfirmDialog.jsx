import React from 'react';
import { createPortal } from 'react-dom';
import './Md3ConfirmDialog.css';

/**
 * Md3ConfirmDialog — Reusable Material Design 3 Confirmation Dialog
 *
 * Follows SOLID principles and is fully decoupled from page logic.
 * Replaces all window.confirm / window.alert / window.prompt patterns.
 *
 * Props:
 *   isOpen        {boolean}   Controls visibility
 *   onClose       {function}  Called when dialog is dismissed (cancel/backdrop)
 *   onConfirm     {function}  Called when user confirms the action
 *   title         {string}    Dialog headline
 *   message       {string}    Supporting text body
 *   confirmLabel  {string}    Text for the confirm button (default: "Confirm")
 *   cancelLabel   {string}    Text for the cancel button (default: "Cancel")
 *   variant       {string}    "danger" | "warning" | "info" | "success" (default: "info")
 *   icon          {string}    Material Symbol icon name (optional)
 *   loading       {boolean}   Shows a spinner on confirm button while action runs
 */
const Md3ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  icon,
  loading = false,
  children
}) => {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
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

  // Body scroll lock & Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) onClose?.();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!shouldRender) return null;

  const defaultIcons = {
    danger: 'delete_forever',
    warning: 'warning',
    info: 'info',
    success: 'check_circle',
  };

  const resolvedIcon = icon || defaultIcons[variant] || 'info';

  return createPortal(
    <div
      className={`md3-dialog-overlay ${isClosing ? 'md3-dialog-overlay--closing' : 'md3-dialog-overlay--open'}`}
      onClick={!loading ? onClose : undefined}
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="md3-dialog-title"
      aria-describedby="md3-dialog-message"
    >
      <div
        className={`md3-dialog-surface md3-dialog-surface--${variant} ${isClosing ? 'md3-dialog-surface--closing' : 'md3-dialog-surface--open'}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Icon header */}
        <div className={`md3-dialog-icon-wrap md3-dialog-icon-wrap--${variant}`}>
          <span className="material-symbols-rounded md3-dialog-icon">{resolvedIcon}</span>
        </div>

        {/* Content */}
        <div className="md3-dialog-content">
          {title && (
            <h2 id="md3-dialog-title" className="md3-dialog-title">{title}</h2>
          )}
          {message && (
            <p id="md3-dialog-message" className="md3-dialog-message">{message}</p>
          )}
          {children}
        </div>

        {/* Actions */}
        <div className="md3-dialog-actions">
          <button
            type="button"
            className="md3-dialog-btn md3-dialog-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`md3-dialog-btn md3-dialog-btn--confirm md3-dialog-btn--confirm-${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="md3-dialog-spinner" />
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
