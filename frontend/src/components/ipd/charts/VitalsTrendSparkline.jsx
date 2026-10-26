/**
 * components/ipd/charts/VitalsTrendSparkline.jsx
 * Ultra-lightweight Pure SVG Sparkline for IPD bedside vitals glanceable telemetry.
 * Displays trajectory at a glance without layout thrash or external libraries.
 */
import React, { useMemo } from 'react';

export const VitalsTrendSparkline = ({
  data = [],
  parameter = null,
  width = 64,
  height = 22,
  color = 'var(--md-sys-color-primary, #006a6a)',
  strokeWidth = 1.6,
  showDirection = true,
  ariaLabel = 'Vitals progression sparkline',
}) => {
  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data
      .map((d) => {
        if (typeof d === 'number') return d;
        if (parameter && d && typeof d === 'object') return d[parameter];
        return null;
      })
      .filter((v) => v !== null && v !== undefined && !isNaN(v));
  }, [data, parameter]);

  const { pathD, direction, lastVal, firstVal } = useMemo(() => {
    if (points.length < 2) {
      return { pathD: '', direction: 'flat', lastVal: points[0], firstVal: points[0] };
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 2;
    const usableHeight = height - pad * 2;
    const stepX = (width - pad * 2) / (points.length - 1);

    const coords = points.map((val, idx) => {
      const x = pad + idx * stepX;
      const normalized = (val - min) / range;
      const y = pad + (usableHeight - normalized * usableHeight);
      return { x, y };
    });

    const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

    const first = points[0];
    const last = points[points.length - 1];
    const delta = last - first;
    let dir = 'flat';
    if (Math.abs(delta) > range * 0.08) {
      dir = delta > 0 ? 'up' : 'down';
    }

    return { pathD: d, direction: dir, lastVal: last, firstVal: first };
  }, [points, width, height]);

  if (points.length === 0) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--md-sys-color-outline, #707979)',
        }}
      >
        —
      </span>
    );
  }

  const iconName =
    direction === 'up' ? 'trending_up' : direction === 'down' ? 'trending_down' : 'trending_flat';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        verticalAlign: 'middle',
      }}
      role="img"
      aria-label={`${ariaLabel}: current ${lastVal}, ${direction} trend`}
      title={`Telemetry: ${points.length} measurements. Current: ${lastVal} (${direction})`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.length > 0 && (
          <circle
            cx={width - 2}
            cy={
              points.length === 1
                ? height / 2
                : 2 +
                  (height - 4 -
                    ((lastVal - Math.min(...points)) /
                      (Math.max(...points) - Math.min(...points) || 1)) *
                      (height - 4))
            }
            r="2.2"
            fill={color}
          />
        )}
      </svg>

      {showDirection && points.length > 1 && (
        <span
          className="material-symbols-rounded"
          style={{
            fontSize: '14px',
            color:
              direction === 'flat'
                ? 'var(--md-sys-color-outline, #707979)'
                : color,
          }}
        >
          {iconName}
        </span>
      )}
    </div>
  );
};

export default VitalsTrendSparkline;
