/**
 * components/md3/Md3MarqueeText.jsx
 * Reusable Material Design 3 Marquee Text Component.
 * Automatically detects if text overflows container, and triggers smooth horizontal marquee.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import './Md3MarqueeText.css';

export const Md3MarqueeText = ({
  text,
  className = '',
  style = {},
  title,
  as: Component = 'span',
  autoAnimate = true,
  speed = 28, // px per second for smooth, readable glide
  children,
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [duration, setDuration] = useState(6);
  const displayText = text !== undefined ? text : children;

  const checkOverflow = useCallback(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const diff = textWidth - containerWidth;

      if (diff > 2) {
        setIsOverflow(true);
        const dist = diff + 12;
        setScrollDistance(dist);
        // Duration based on distance for consistent smooth speed
        const dur = Math.max(4.5, Math.min(22, dist / speed));
        setDuration(dur);
      } else {
        setIsOverflow(false);
        setScrollDistance(0);
      }
    }
  }, [speed]);

  useEffect(() => {
    checkOverflow();
    const observer = new ResizeObserver(() => checkOverflow());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', checkOverflow);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [displayText, checkOverflow]);

  const customStyle = {
    ...style,
    '--marquee-distance': `-${scrollDistance}px`,
    '--marquee-duration': `${duration}s`,
  };

  return (
    <Component
      ref={containerRef}
      className={`md3-marquee-wrapper ${isOverflow ? 'is-overflow' : ''} ${autoAnimate && isOverflow ? 'is-auto-marquee' : ''} ${className}`}
      style={customStyle}
      title={title || (typeof displayText === 'string' ? displayText : undefined)}
    >
      <span ref={textRef} className="md3-marquee-inner">
        {displayText}
      </span>
    </Component>
  );
};

export default Md3MarqueeText;

