import React from 'react';
import './Md3Widgets.css'; // Reusing MD3 tokens and styles

/**
 * BentoGrid - A CSS Grid container optimized for Bento-box style layouts.
 * Ensures consistent gaps, responsive column counts, and safe component containment.
 */
export const BentoGrid = ({
  children,
  columns = 3, // Default for large screens
  gap = 'large', // default spacing from tokens
  className = '',
  style = {},
}) => {
  const classes = [
    'bento-grid',
    `bento-grid--cols-${columns}`,
    `bento-grid--gap-${gap}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};

/**
 * BentoGridItem - A wrapper for individual bento box items.
 * Allows components to span multiple rows or columns safely.
 */
export const BentoGridItem = ({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = '',
  style = {},
}) => {
  const classes = [
    'bento-grid__item',
    colSpan > 1 ? `bento-grid__item--col-span-${colSpan}` : '',
    rowSpan > 1 ? `bento-grid__item--row-span-${rowSpan}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};
