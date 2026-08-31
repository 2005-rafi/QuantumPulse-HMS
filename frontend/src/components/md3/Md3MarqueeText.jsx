/**
 * components/md3/Md3MarqueeText.jsx
 * Reusable Material Design 3 Marquee Text Component.
 * Automatically detects if text overflows container, and triggers smooth horizontal marquee on hover.
 */
import React, { useRef, useState, useEffect } from 'react';
import './Md3MarqueeText.css';

export const Md3MarqueeText = ({
  text,
  className = '',
  style = {},
  title,
  as: Component = 'span',
  children,
}) => {
  const containerRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const displayText = text || children;

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const hasOverflow = containerRef.current.scrollWidth > containerRef.current.clientWidth + 2;
        setIsOverflow(hasOverflow);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [displayText]);

  return (
    <Component
      ref={containerRef}
      className={`md3-marquee-wrapper ${isOverflow ? 'is-overflow' : ''} ${className}`}
      style={style}
      title={title || (typeof displayText === 'string' ? displayText : undefined)}
    >
      <span className="md3-marquee-inner">{displayText}</span>
    </Component>
  );
};

export default Md3MarqueeText;
