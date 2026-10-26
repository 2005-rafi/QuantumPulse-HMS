/**
 * components/ipd/charts/VitalsLineChart.jsx
 * Pure React 19 SVG Vector Longitudinal Vitals Trend Engine.
 * Zero external bundle dependencies.
 * Features:
 * - Shaded Physiological Target Bands (Safe Green Zones)
 * - Warning & Critical Threshold Markers
 * - Dual-Trace Hemodynamics (Systolic & Diastolic BP with Pulse Pressure Fill)
 * - Touch & Hover Interactive Scrubber Crosshair with Nurse Notes
 * - Fully Responsive Vector SVG with Material Design 3 Tokens
 */
import React, { useState, useMemo, useRef } from 'react';
import './VitalsLineChart.css';

export const VitalsLineChart = ({
  data = [],
  parameter = 'systolicBp',
  secondaryParameter = null, // e.g. 'diastolicBp' for dual BP plotting
  title = 'Blood Pressure Progression',
  unit = 'mmHg',
  targetBand = { min: 90, max: 130, warnLow: 90, warnHigh: 140 },
  color = 'var(--md-sys-color-primary, #006a6a)',
  secondaryColor = 'var(--md-sys-color-secondary, #4a6363)',
  height = 240,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);

  // SVG coordinate dimensions
  const svgWidth = 720;
  const svgHeight = height;
  const padding = { top: 24, right: 32, bottom: 36, left: 48 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Extract series values
  const series = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.filter((d) => d[parameter] !== undefined && d[parameter] !== null && !isNaN(d[parameter]));
  }, [data, parameter]);

  // Compute dynamic scale boundaries (Y-axis)
  const { minY, maxY, yRange } = useMemo(() => {
    if (series.length === 0) return { minY: 0, maxY: 100, yRange: 100 };

    let allValues = series.map((d) => d[parameter]);
    if (secondaryParameter) {
      const secValues = series
        .map((d) => d[secondaryParameter])
        .filter((v) => v !== undefined && v !== null && !isNaN(v));
      allValues = allValues.concat(secValues);
    }

    if (targetBand) {
      if (targetBand.min !== undefined) allValues.push(targetBand.min);
      if (targetBand.max !== undefined) allValues.push(targetBand.max);
      if (targetBand.warnHigh !== undefined) allValues.push(targetBand.warnHigh);
      if (targetBand.warnLow !== undefined) allValues.push(targetBand.warnLow);
    }

    const minRaw = Math.min(...allValues);
    const maxRaw = Math.max(...allValues);
    const buffer = (maxRaw - minRaw) * 0.15 || 5;

    // Nicely rounded domain
    const calculatedMin = Math.max(0, Math.floor((minRaw - buffer) / 5) * 5);
    const calculatedMax = Math.ceil((maxRaw + buffer) / 5) * 5;
    const range = calculatedMax - calculatedMin || 1;

    return { minY: calculatedMin, maxY: calculatedMax, yRange: range };
  }, [series, parameter, secondaryParameter, targetBand]);

  // Coordinate mapping functions
  const getY = (val) => {
    if (val === null || val === undefined || isNaN(val)) return graphHeight + padding.top;
    const normalized = (val - minY) / yRange;
    return padding.top + (graphHeight - normalized * graphHeight);
  };

  const getX = (index) => {
    if (series.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (series.length - 1)) * graphWidth;
  };

  // Build SVG path strings
  const primaryPath = useMemo(() => {
    if (series.length === 0) return '';
    return series
      .map((d, i) => {
        const x = getX(i);
        const y = getY(d[parameter]);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [series, parameter, minY, yRange]);

  const secondaryPath = useMemo(() => {
    if (!secondaryParameter || series.length === 0) return '';
    return series
      .map((d, i) => {
        const val = d[secondaryParameter];
        if (val === undefined || val === null) return '';
        const x = getX(i);
        const y = getY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [series, secondaryParameter, minY, yRange]);

  // Shaded Pulse Pressure area between Systolic and Diastolic
  const areaBetweenPath = useMemo(() => {
    if (!secondaryParameter || series.length < 2) return '';
    const forward = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[parameter]).toFixed(1)}`).join(' ');
    const backward = series
      .slice()
      .reverse()
      .map((d, i) => {
        const origIdx = series.length - 1 - i;
        const val = d[secondaryParameter];
        return `L ${getX(origIdx).toFixed(1)} ${getY(val).toFixed(1)}`;
      })
      .join(' ');
    return `${forward} ${backward} Z`;
  }, [series, parameter, secondaryParameter, minY, yRange]);

  // Y-axis grid tick marks (4 horizontal divisions)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    const step = yRange / count;
    for (let i = 0; i <= count; i++) {
      const val = Math.round(minY + i * step);
      ticks.push({ value: val, y: getY(val) });
    }
    return ticks;
  }, [minY, yRange]);

  // Target safe band coordinate coordinates
  const bandYTop = targetBand?.max ? getY(targetBand.max) : null;
  const bandYBottom = targetBand?.min ? getY(targetBand.min) : null;
  const bandHeight = bandYTop && bandYBottom ? bandYBottom - bandYTop : 0;

  // Touch and Mouse interactive handlers
  const handlePointerMove = (e) => {
    if (!containerRef.current || series.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    if (!clientX) return;

    const relativeX = clientX - rect.left;
    const svgRelativeX = (relativeX / rect.width) * svgWidth;
    const clampedX = Math.max(padding.left, Math.min(svgWidth - padding.right, svgRelativeX));
    const ratio = (clampedX - padding.left) / graphWidth;
    const closestIdx = Math.round(ratio * (series.length - 1));
    setHoverIndex(closestIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && series[hoverIndex] ? series[hoverIndex] : null;

  if (series.length === 0) {
    return (
      <div className="md3-vitals-chart-empty">
        <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--md-sys-color-outline)' }}>
          show_chart
        </span>
        <p className="md3-vitals-chart-empty-text">No recorded telemetry trajectory available for {title} in this time window.</p>
      </div>
    );
  }

  return (
    <div
      className="md3-vitals-chart-container"
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      role="region"
      aria-label={`${title} Longitudinal Trend Chart`}
    >
      {/* Chart Header Bar */}
      <div className="md3-vitals-chart-header">
        <div className="md3-vitals-chart-title-wrap">
          <span className="md3-vitals-chart-title">{title}</span>
          <span className="md3-vitals-chart-unit">({unit})</span>
        </div>
        <div className="md3-vitals-chart-legend">
          {targetBand && (
            <div className="md3-vitals-legend-item">
              <span className="md3-vitals-legend-band" />
              <span>Target ({targetBand.min}–{targetBand.max} {unit})</span>
            </div>
          )}
          {secondaryParameter ? (
            <>
              <div className="md3-vitals-legend-item">
                <span className="md3-vitals-legend-dot" style={{ backgroundColor: color }} />
                <span>Systolic</span>
              </div>
              <div className="md3-vitals-legend-item">
                <span className="md3-vitals-legend-dot" style={{ backgroundColor: secondaryColor }} />
                <span>Diastolic</span>
              </div>
            </>
          ) : (
            <div className="md3-vitals-legend-item">
              <span className="md3-vitals-legend-dot" style={{ backgroundColor: color }} />
              <span>Measured Value</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Vector Engine */}
      <div className="md3-vitals-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="md3-vitals-svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient fill for single-parameter curve */}
            <linearGradient id={`grad-${parameter}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>

            {/* Gradient fill for pulse pressure ribbon */}
            <linearGradient id="pp-ribbon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.10" />
            </linearGradient>
          </defs>

          {/* 1. Shaded Target Physiological Band (Normal Zone) */}
          {bandYTop && bandHeight > 0 && (
            <rect
              x={padding.left}
              y={bandYTop}
              width={graphWidth}
              height={bandHeight}
              className="md3-vitals-target-band-rect"
            />
          )}

          {/* 2. Critical Threshold Lines */}
          {targetBand?.warnHigh && getY(targetBand.warnHigh) >= padding.top && (
            <line
              x1={padding.left}
              y1={getY(targetBand.warnHigh)}
              x2={padding.left + graphWidth}
              y2={getY(targetBand.warnHigh)}
              className="md3-vitals-threshold-line md3-vitals-threshold-line--high"
            />
          )}
          {targetBand?.warnLow && getY(targetBand.warnLow) <= padding.top + graphHeight && (
            <line
              x1={padding.left}
              y1={getY(targetBand.warnLow)}
              x2={padding.left + graphWidth}
              y2={getY(targetBand.warnLow)}
              className="md3-vitals-threshold-line md3-vitals-threshold-line--low"
            />
          )}

          {/* 3. Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + graphWidth}
                y2={tick.y}
                className="md3-vitals-grid-line"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                className="md3-vitals-axis-text"
                textAnchor="end"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {/* 4. Dual BP Range Ribbon Fill */}
          {secondaryParameter && areaBetweenPath && (
            <path d={areaBetweenPath} fill="url(#pp-ribbon)" />
          )}

          {/* 5. Primary Polyline Vector Trace */}
          {primaryPath && (
            <path
              d={primaryPath}
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 6. Secondary Polyline Vector Trace (Diastolic BP) */}
          {secondaryParameter && secondaryPath && (
            <path
              d={secondaryPath}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 7. Data Points Circles */}
          {series.map((d, i) => {
            const x = getX(i);
            const y1 = getY(d[parameter]);
            const isHovered = hoverIndex === i;
            return (
              <g key={`pt-${i}`}>
                <circle
                  cx={x}
                  cy={y1}
                  r={isHovered ? 5.5 : 3.2}
                  fill="var(--md-sys-color-surface, #ffffff)"
                  stroke={color}
                  strokeWidth={isHovered ? 2.8 : 2}
                  className="md3-vitals-point"
                />
                {secondaryParameter && d[secondaryParameter] !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(d[secondaryParameter])}
                    r={isHovered ? 5 : 2.8}
                    fill="var(--md-sys-color-surface, #ffffff)"
                    stroke={secondaryColor}
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    className="md3-vitals-point"
                  />
                )}
              </g>
            );
          })}

          {/* 8. Interactive Scrubber Crosshair Vertical Line */}
          {activePoint && hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + graphHeight}
              className="md3-vitals-crosshair-line"
            />
          )}

          {/* 9. X-Axis Time Labels (First, Middle, Last) */}
          {series.length > 0 && (
            <>
              <text x={padding.left} y={svgHeight - 10} className="md3-vitals-axis-text" textAnchor="start">
                {series[0].timeLabel || ''} ({series[0].dateLabel || ''})
              </text>
              {series.length > 2 && (
                <text
                  x={padding.left + graphWidth / 2}
                  y={svgHeight - 10}
                  className="md3-vitals-axis-text"
                  textAnchor="middle"
                >
                  {series[Math.floor(series.length / 2)].timeLabel || ''}
                </text>
              )}
              <text
                x={padding.left + graphWidth}
                y={svgHeight - 10}
                className="md3-vitals-axis-text"
                textAnchor="end"
              >
                {series[series.length - 1].timeLabel || ''}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* 10. Interactive Scrubber Detail Popover / Tooltip */}
      {activePoint && hoverIndex !== null && (
        <div
          className="md3-vitals-tooltip"
          style={{
            left: `${Math.min(84, Math.max(16, (getX(hoverIndex) / svgWidth) * 100))}%`,
          }}
        >
          <div className="md3-vitals-tooltip-header">
            <span className="material-symbols-rounded md3-vitals-tooltip-icon">schedule</span>
            <span>{activePoint.timeLabel} · {activePoint.dateLabel}</span>
            <span className="md3-vitals-tooltip-nurse">• {activePoint.nurseName}</span>
          </div>

          <div className="md3-vitals-tooltip-values">
            {secondaryParameter ? (
              <div className="md3-vitals-tooltip-val">
                <strong>{activePoint[parameter]} / {activePoint[secondaryParameter]}</strong> {unit}
                {activePoint.pulsePressure && (
                  <span className="md3-vitals-pp-badge" title="Arterial Pulse Pressure">
                    PP: {activePoint.pulsePressure} mmHg
                  </span>
                )}
              </div>
            ) : (
              <div className="md3-vitals-tooltip-val">
                <strong>{activePoint[parameter]}</strong> {unit}
                {activePoint.oxygenTherapy && parameter === 'spO2' && (
                  <span className="md3-vitals-o2-tag">On O2 ({activePoint.oxygenFlowRateLpm || 0}L)</span>
                )}
              </div>
            )}
          </div>

          {activePoint.news2Score !== undefined && (
            <div className="md3-vitals-tooltip-sub">
              <span>NEWS2 Score: <strong>{activePoint.news2Score}</strong> ({activePoint.news2RiskLevel})</span>
              {activePoint.shockIndex && (
                <span className={`md3-vitals-si-tag ${activePoint.shockIndexAlert ? 'is-alert' : ''}`}>
                  Shock Index: {activePoint.shockIndex}
                </span>
              )}
            </div>
          )}

          {activePoint.clinicalNotes && (
            <div className="md3-vitals-tooltip-note">
              <em>"{activePoint.clinicalNotes}"</em>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VitalsLineChart;
