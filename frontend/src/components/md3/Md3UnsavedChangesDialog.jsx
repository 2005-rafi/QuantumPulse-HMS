import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from './Md3FormComponents';
import './Md3UnsavedChangesDialog.css';

/**
 * Md3UnsavedChangesDialog
 * Expert-grade Material 3 confirmation dialog to intercept accidental form dismissals
 * and prevent data loss when sidebars or modals are tapped outside or closed.
 */
export const Md3UnsavedChangesDialog = ({
  isOpen,
  title = 'Discard unsaved changes?',
  message = 'You have unsaved changes in this form. If you discard, all entered progress will be lost.',
  confirmLabel = 'Discard Changes',
  cancelLabel = 'Keep Editing',
  saveDraftLabel,
  onConfirm,
  onCancel,
  onSaveDraft,
  zIndex = 999999,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="md3-unsaved-dialog-backdrop"
      style={{ zIndex }}
      onClick={(e) => {
        e.stopPropagation();
        onCancel?.();
      }}
      role="presentation"
    >
      <div
        className="md3-unsaved-dialog-surface"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
      >
        <div className="md3-unsaved-dialog-icon-badge">
          <span className="material-symbols-rounded">warning</span>
        </div>

        <div className="md3-unsaved-dialog-content">
          <h3 id="unsaved-dialog-title" className="md3-unsaved-dialog-title">
            {title}
          </h3>
          <p id="unsaved-dialog-desc" className="md3-unsaved-dialog-desc">
            {message}
          </p>
        </div>

        <div className="md3-unsaved-dialog-actions">
          {saveDraftLabel && onSaveDraft && (
            <Md3Button
              variant="tonal"
              type="button"
              onClick={onSaveDraft}
              className="md3-unsaved-draft-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                save_as
              </span>
              {saveDraftLabel}
            </Md3Button>
          )}
          <Md3Button
            variant="text"
            type="button"
            onClick={onConfirm}
            className="md3-unsaved-discard-btn"
          >
            {confirmLabel}
          </Md3Button>
          <Md3Button
            variant="filled"
            type="button"
            onClick={onCancel}
            className="md3-unsaved-keep-btn"
          >
            {cancelLabel}
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Md3UnsavedChangesDialog;
