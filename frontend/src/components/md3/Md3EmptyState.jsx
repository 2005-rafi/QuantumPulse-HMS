import React from 'react';
import './Md3EmptyState.css';

/**
 * Md3EmptyState
 * Pure Material Design 3 compliant Empty State component.
 *
 * @param {Object} props
 * @param {string} [props.icon='inbox'] - Google Material Symbols icon name.
 * @param {string} props.title - Concise headline explaining the empty state.
 * @param {string} [props.description] - Helpful guidance or next steps.
 * @param {React.ReactNode} [props.action] - Optional CTA button or element.
 * @param {'default'|'compact'|'card'} [props.variant='default'] - Visual density variant.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 */
export const Md3EmptyState = ({
  icon = 'inbox',
  title,
  description,
  action,
  variant = 'default',
  className = '',
  style = {},
}) => {
  return (
    <div className={`md3-empty-state md3-empty-state--${variant} ${className}`} style={style} role="status">
      <div className="md3-empty-state__icon-box" aria-hidden="true">
        <span className="material-symbols-rounded md3-empty-state__icon">
          {icon}
        </span>
      </div>
      <h3 className="md3-empty-state__title">{title}</h3>
      {description && (
        <p className="md3-empty-state__description">{description}</p>
      )}
      {action && (
        <div className="md3-empty-state__action">
          {action}
        </div>
      )}
    </div>
  );
};

export default Md3EmptyState;
