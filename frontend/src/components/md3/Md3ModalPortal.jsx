import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Md3ModalPortal.css';

/**
 * Md3ModalPortal — Production-Grade Pure Material Design 3 Scrim & Modal Portal.
 *
 * Guarantees 100% viewport coverage (X and Y axes to infinity) across Desktop, Tablet, and Mobile
 * by mounting directly to document.body, avoiding CSS containing block traps (transform/filter).
 *
 * Variants:
 *   - 'center'       : Dedicated confirmation / alert dialogs (DEAD CENTER of screen, z-index: 10000).
 *   - 'top-center'   : Form-like dialogs, multi-field editors & ledgers (TOP-CENTER of screen, z-index: 2000).
 *   - 'drawer-right' : Edge-to-edge right slide-over inspector sheet (100vh).
 *   - 'bottom-sheet' : Mobile/Tablet friendly bottom sheet with rounded top corners.
 */
export const Md3ModalPortal = ({
  isOpen,
  onClose,
  children,
  variant = 'center',
  className = '',
  scrimClassName = '',
  zIndex,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  ariaLabel = 'Modal Dialog',
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);

  // Default z-index: 10000 for center confirmations, 2000 for top-center forms/drawers
  const resolvedZIndex = zIndex !== undefined 
    ? zIndex 
    : (variant === 'center' ? 10000 : 2000);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      setAnimating(false);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    },
    [closeOnEscape, isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!mounted || (!isOpen && !animating)) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const portalContent = (
    <div
      className={`md3-modal-scrim md3-modal-scrim--${variant} ${isOpen ? 'md3-modal-scrim--open' : 'md3-modal-scrim--closing'} ${scrimClassName}`}
      style={{ zIndex: resolvedZIndex }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={`md3-modal-container md3-modal-container--${variant} ${isOpen ? 'md3-modal-container--open' : 'md3-modal-container--closing'} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default Md3ModalPortal;
