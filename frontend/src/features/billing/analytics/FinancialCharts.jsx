import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import './FinancialCharts.css';

// ─── UTILITY HELPERS ───
const formatCompactNum = (num) => {
  if (num === undefined || num === null) return '0';
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return Number(num).toLocaleString('en-IN');
};

const formatFullCurrency = (num) => {
  return `${CURRENCY_SYMBOL}${(num || 0).toLocaleString('en-IN')}`;
};

// Monotonic Cubic Spline Generator for SVG <path d="..." />
const createSmoothSplinePath = (points) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
};

// Timeline Normalizer (Fills all continuous time slots in interval)
const generateNormalizedTimeline = (rawTrendData = [], range = '30days') => {
  const points = [];
  const now = new Date();
  
  if (range === 'today') {
    for (let h = 8; h <= 20; h += 2) {
      const label = `${String(h).padStart(2, '0')}:00`;
      points.push({ key: label, label, fullDate: `Today, ${label}`, billed: 0, collected: 0, outstanding: 0, count: 0 });
    }
  } else if (range === '7days') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const key = `${d.getFullYear()}-${month}-${day}`;
      const label = `${day} ${monthShort}`;
      points.push({ key, label, fullDate: `${dayName}, ${day} ${monthShort}`, day, month, year: d.getFullYear(), billed: 0, collected: 0, outstanding: 0, count: 0 });
    }
  } else if (range === '30days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const key = `${d.getFullYear()}-${month}-${day}`;
      const label = `${day} ${monthShort}`;
      points.push({ key, label, fullDate: `${dayName}, ${day} ${monthShort}`, day, month, year: d.getFullYear(), billed: 0, collected: 0, outstanding: 0, count: 0 });
    }
  } else if (range === '90days') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const label = `W-${12 - i}`;
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({ key: `W${12 - i}`, label, fullDate: `Week of ${fullDate}`, billed: 0, collected: 0, outstanding: 0, count: 0 });
    }
  } else if (range === '365days') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      points.push({ key: `${year}-${month}`, label: monthName, fullDate: `${monthName} ${year}`, month, year, billed: 0, collected: 0, outstanding: 0, count: 0 });
    }
  }

  // Merge raw database metrics into continuous timeline points
  if (rawTrendData && rawTrendData.length > 0) {
    rawTrendData.forEach((item) => {
      if (!item._id) return;
      let match = null;
      if (item._id.day && item._id.month) {
        match = points.find((p) => p.day === item._id.day && p.month === item._id.month);
      } else if (item._id.month && !item._id.day) {
        match = points.find((p) => p.month === item._id.month && (p.year === item._id.year || !item._id.year));
      } else if (item._id.week) {
        match = points[points.length - 1];
      }
      
      if (match) {
        match.billed += (item.billed || 0);
        match.collected += (item.collected || 0);
        match.outstanding += (item.outstanding || 0);
        match.count += (item.count || 0);
      } else if (points.length > 0) {
        const lastSlot = points[points.length - 1];
        lastSlot.billed += (item.billed || 0);
        lastSlot.collected += (item.collected || 0);
        lastSlot.outstanding += (item.outstanding || 0);
        lastSlot.count += (item.count || 0);
      }
    });
  }

  return points;
};

/* ==========================================================================
   1. DUAL-AXIS TIME-SERIES SPLINE & AREA (Billed vs Collected Velocity)
   ========================================================================== */
export const TimeSeriesSplineChart = ({ data = [], range = '30days' }) => {
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL' | 'BILLED' | 'COLLECTED'
  const [chartType, setChartType] = useState('SPLINE'); // 'SPLINE' | 'BAR'
  const [showTable, setShowTable] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1100);

  // Responsive dimension tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect?.width) {
        setContainerWidth(Math.round(entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // SVG Coordinates — generous vertical height with 1:1 true pixel aspect ratio
  const width = Math.max(760, containerWidth);
  const height = 360;
  const padLeft = 68;
  const padRight = 56;
  const padTop = 28;
  const padBottom = 42;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Continuous normalized timeline data
  const normalizedTimeline = useMemo(() => {
    return generateNormalizedTimeline(data, range);
  }, [data, range]);

  // Executive summary metrics across the continuous timeline
  const summaryMetrics = useMemo(() => {
    let maxBilled = 0;
    let peakDay = '—';
    let sumBilled = 0;
    let sumCollected = 0;
    let activeDays = 0;

    normalizedTimeline.forEach((p) => {
      sumBilled += p.billed;
      sumCollected += p.collected;
      if (p.billed > maxBilled) {
        maxBilled = p.billed;
        peakDay = p.label;
      }
      if (p.billed > 0 || p.collected > 0) {
        activeDays++;
      }
    });

    const dailyAvg = normalizedTimeline.length > 0 ? Math.round(sumBilled / normalizedTimeline.length) : 0;
    const efficiency = sumBilled > 0 ? Math.round((sumCollected / sumBilled) * 100) : 0;

    return { maxBilled, peakDay, dailyAvg, efficiency, activeDays, totalDays: normalizedTimeline.length };
  }, [normalizedTimeline]);

  // Process data points with scaled coordinate mappings
  const pointsData = useMemo(() => {
    if (normalizedTimeline.length === 0) return [];
    
    // Scale max value with 15% headroom
    const rawMax = Math.max(
      ...normalizedTimeline.map((d) => Math.max(d.billed || 0, d.collected || 0)),
      100
    );
    const maxVal = Math.ceil(rawMax * 1.15);

    const stepX = normalizedTimeline.length > 1 ? chartW / (normalizedTimeline.length - 1) : chartW / 2;

    return normalizedTimeline.map((d, i) => {
      const x = padLeft + (normalizedTimeline.length === 1 ? chartW / 2 : i * stepX);
      const billedY = padTop + chartH - ((d.billed || 0) / maxVal) * chartH;
      const collY = padTop + chartH - ((d.collected || 0) / maxVal) * chartH;
      
      return {
        ...d,
        x,
        billedY,
        collY,
        maxVal,
        efficiency: d.billed > 0 ? Math.round(((d.collected || 0) / d.billed) * 100) : 0,
      };
    });
  }, [normalizedTimeline, chartW, chartH]);

  const billedSpline = useMemo(() => {
    return createSmoothSplinePath(pointsData.map((p) => ({ x: p.x, y: p.billedY })));
  }, [pointsData]);

  const collectedSpline = useMemo(() => {
    return createSmoothSplinePath(pointsData.map((p) => ({ x: p.x, y: p.collY })));
  }, [pointsData]);

  const billedArea = useMemo(() => {
    if (pointsData.length === 0) return '';
    const spline = billedSpline;
    const first = pointsData[0];
    const last = pointsData[pointsData.length - 1];
    const bottomY = padTop + chartH;
    return `${spline} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pointsData, billedSpline, chartH]);

  const collectedArea = useMemo(() => {
    if (pointsData.length === 0) return '';
    const spline = collectedSpline;
    const first = pointsData[0];
    const last = pointsData[pointsData.length - 1];
    const bottomY = padTop + chartH;
    return `${spline} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pointsData, collectedSpline, chartH]);

  // Handle Mouse Move for Scrubber
  const handleMouseMove = (e) => {
    if (!containerRef.current || pointsData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    let closestIdx = 0;
    let minDiff = Infinity;
    pointsData.forEach((p, i) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    setHoverIndex(closestIdx);
  };

  const activePoint = hoverIndex !== null ? pointsData[hoverIndex] : null;
  const currentMax = pointsData.length > 0 ? pointsData[0].maxVal : 100;

  // Grid tick levels
  const yTicks = [
    { pct: 1.0, label: `${CURRENCY_SYMBOL}${formatCompactNum(currentMax)}`, eff: '100%' },
    { pct: 0.66, label: `${CURRENCY_SYMBOL}${formatCompactNum(currentMax * 0.66)}`, eff: '66%' },
    { pct: 0.33, label: `${CURRENCY_SYMBOL}${formatCompactNum(currentMax * 0.33)}`, eff: '33%' },
    { pct: 0.0, label: `${CURRENCY_SYMBOL}0`, eff: '0%' },
  ];

  return (
    <div className="fin-card">
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <h3 className="fin-card-title">
            <span className="material-symbols-rounded">show_chart</span>
            <span>Financial Invoicing &amp; Cash Velocity Trajectory</span>
          </h3>
          <p className="fin-card-subtitle">Continuous time-series analysis with dual-axis cashflow monitoring</p>
        </div>

        {/* View Controls */}
        <div className="fin-card-controls">
          {/* Chart Type Toggle */}
          <div style={{ display: 'inline-flex', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)', borderRadius: '6px', padding: '2px', border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)' }}>
            <button
              type="button"
              className={`fin-view-pill ${chartType === 'SPLINE' ? 'fin-view-pill--active' : ''}`}
              onClick={() => setChartType('SPLINE')}
              title="Spline Area Flow"
            >
              <span className="material-symbols-rounded">area_chart</span>
              <span>Spline</span>
            </button>
            <button
              type="button"
              className={`fin-view-pill ${chartType === 'BAR' ? 'fin-view-pill--active' : ''}`}
              onClick={() => setChartType('BAR')}
              title="Grouped Comparative Columns"
            >
              <span className="material-symbols-rounded">bar_chart</span>
              <span>Columns</span>
            </button>
          </div>

          {/* Metric View Filter */}
          <button
            type="button"
            className={`fin-view-pill ${viewMode === 'ALL' ? 'fin-view-pill--active' : ''}`}
            onClick={() => setViewMode('ALL')}
          >
            All Flows
          </button>
          <button
            type="button"
            className={`fin-view-pill ${viewMode === 'BILLED' ? 'fin-view-pill--active' : ''}`}
            onClick={() => setViewMode('BILLED')}
          >
            Billed
          </button>
          <button
            type="button"
            className={`fin-view-pill ${viewMode === 'COLLECTED' ? 'fin-view-pill--active' : ''}`}
            onClick={() => setViewMode('COLLECTED')}
          >
            Collected
          </button>

          {/* Data Table Drawer Toggle */}
          <button
            type="button"
            className={`fin-view-pill ${showTable ? 'fin-view-pill--active' : ''}`}
            onClick={() => setShowTable(!showTable)}
            title="Toggle Raw Timeline Data Table"
          >
            <span className="material-symbols-rounded">table_chart</span>
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Integrated Executive Analytical Summary Metrics Bar */}
      <div className="fin-timeseries-metrics-bar">
        <div className="fin-ts-metric">
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-primary, #6750a4)' }}>trending_up</span>
          <span className="fin-ts-metric-label">Peak Billing:</span>
          <span className="fin-ts-metric-value">{summaryMetrics.peakDay} ({formatCompactNum(summaryMetrics.maxBilled)})</span>
        </div>
        <div className="fin-ts-divider" />
        <div className="fin-ts-metric">
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#2e7d32' }}>speed</span>
          <span className="fin-ts-metric-label">Daily Avg:</span>
          <span className="fin-ts-metric-value">{formatFullCurrency(summaryMetrics.dailyAvg)}/day</span>
        </div>
        <div className="fin-ts-divider" />
        <div className="fin-ts-metric">
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#e65100' }}>verified</span>
          <span className="fin-ts-metric-label">Realization Index:</span>
          <span className="fin-ts-metric-value" style={{ color: summaryMetrics.efficiency >= 80 ? '#2e7d32' : '#e65100' }}>
            {summaryMetrics.efficiency}%
          </span>
        </div>
        <div className="fin-ts-divider" />
        <div className="fin-ts-metric">
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-outline, #79747e)' }}>calendar_today</span>
          <span className="fin-ts-metric-label">Active Days:</span>
          <span className="fin-ts-metric-value">{summaryMetrics.activeDays} / {summaryMetrics.totalDays}</span>
        </div>
      </div>

      {/* Main Dual-Axis Interactive SVG Container */}
      <div
        className="fin-timeseries-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="fin-timeseries-svg">
          <defs>
            <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6750a4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6750a4" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#006a57" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#006a57" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines and Y-Axis Ticks */}
          {yTicks.map((tick, i) => {
            const y = padTop + chartH * (1 - tick.pct);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} className="fin-grid-line" />
                {/* Left Y Axis Label (Currency) */}
                <text x={padLeft - 10} y={y + 4} className="fin-axis-label-left">
                  {tick.label}
                </text>
                {/* Right Y Axis Label (Efficiency %) */}
                <text x={width - padRight + 10} y={y + 4} className="fin-axis-label-right">
                  {tick.eff}
                </text>
              </g>
            );
          })}

          {/* Chart Mode: Spline Area Flow */}
          {chartType === 'SPLINE' && (
            <>
              {(viewMode === 'ALL' || viewMode === 'BILLED') && (
                <path d={billedArea} fill="url(#billedGrad)" />
              )}
              {(viewMode === 'ALL' || viewMode === 'COLLECTED') && (
                <path d={collectedArea} fill="url(#collectedGrad)" />
              )}

              {(viewMode === 'ALL' || viewMode === 'BILLED') && (
                <path d={billedSpline} className="fin-spline-path fin-spline-path--billed" />
              )}
              {(viewMode === 'ALL' || viewMode === 'COLLECTED') && (
                <path d={collectedSpline} className="fin-spline-path fin-spline-path--collected" />
              )}
            </>
          )}

          {/* Chart Mode: Grouped Column Bars */}
          {chartType === 'BAR' && pointsData.map((p, i) => {
            const colW = Math.max(3, Math.min(14, chartW / pointsData.length / 2 - 3));
            const billedH = padTop + chartH - p.billedY;
            const collH = padTop + chartH - p.collY;
            return (
              <g key={i}>
                {(viewMode === 'ALL' || viewMode === 'BILLED') && (
                  <rect
                    x={p.x - colW - 1}
                    y={p.billedY}
                    width={colW}
                    height={billedH}
                    fill="#6750a4"
                    rx={3}
                    opacity={hoverIndex === i ? 1 : 0.85}
                  />
                )}
                {(viewMode === 'ALL' || viewMode === 'COLLECTED') && (
                  <rect
                    x={p.x + 1}
                    y={p.collY}
                    width={colW}
                    height={collH}
                    fill="#006a57"
                    rx={3}
                    opacity={hoverIndex === i ? 1 : 0.85}
                  />
                )}
              </g>
            );
          })}

          {/* Crosshair Line on hover */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + chartH}
              className="fin-crosshair-line"
            />
          )}

          {/* Data Points and X-Axis Labels */}
          {pointsData.map((p, i) => {
            const isHovered = hoverIndex === i;
            const hasData = p.billed > 0 || p.collected > 0;
            
            // Smart step calculation based on container width
            const maxLabels = Math.max(4, Math.floor(chartW / 90));
            const step = Math.max(1, Math.ceil(pointsData.length / maxLabels));
            const showLabel = i === 0 || i === pointsData.length - 1 || i % step === 0;

            return (
              <g key={i}>
                {chartType === 'SPLINE' && (viewMode === 'ALL' || viewMode === 'BILLED') && (
                  <circle
                    cx={p.x}
                    cy={p.billedY}
                    r={isHovered ? 6 : hasData ? 4 : 2.5}
                    fill={isHovered ? '#6750a4' : hasData ? '#ffffff' : 'var(--md-sys-color-surface-container-high, #e6e0e9)'}
                    stroke="#6750a4"
                    strokeWidth={isHovered ? 2.5 : hasData ? 2 : 1}
                    className="fin-data-point"
                  />
                )}
                {chartType === 'SPLINE' && (viewMode === 'ALL' || viewMode === 'COLLECTED') && (
                  <circle
                    cx={p.x}
                    cy={p.collY}
                    r={isHovered ? 6 : hasData ? 4 : 2.5}
                    fill={isHovered ? '#006a57' : hasData ? '#ffffff' : 'var(--md-sys-color-surface-container-high, #e6e0e9)'}
                    stroke="#006a57"
                    strokeWidth={isHovered ? 2.5 : hasData ? 2 : 1}
                    className="fin-data-point"
                  />
                )}
                {/* X Axis Date Label */}
                {showLabel && (
                  <text x={p.x} y={height - 12} textAnchor="middle" className="fin-axis-label">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating High-Density Glassmorphic Tooltip */}
        {activePoint && (
          <div
            className="fin-chart-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.min(activePoint.billedY, activePoint.collY)}px`,
            }}
          >
            <div className="fin-tooltip-title">
              <span>{activePoint.fullDate || activePoint.label}</span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)' }}>
                {activePoint.count} bills
              </span>
            </div>
            <div className="fin-tooltip-row">
              <span style={{ color: '#d0bcff' }}>
                <span className="fin-tooltip-indicator" style={{ background: '#d0bcff' }} />
                Billed Invoiced:
              </span>
              <strong>{formatFullCurrency(activePoint.billed)}</strong>
            </div>
            <div className="fin-tooltip-row">
              <span style={{ color: '#a6e3a1' }}>
                <span className="fin-tooltip-indicator" style={{ background: '#a6e3a1' }} />
                Cash Collected:
              </span>
              <strong>{formatFullCurrency(activePoint.collected)}</strong>
            </div>
            <div className="fin-tooltip-row">
              <span style={{ color: '#ffb4ab' }}>
                <span className="fin-tooltip-indicator" style={{ background: '#ffb4ab' }} />
                Outstanding Dues:
              </span>
              <strong>{formatFullCurrency(Math.max(0, activePoint.billed - activePoint.collected))}</strong>
            </div>
            <div className="fin-tooltip-row" style={{ paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Realization Rate:</span>
              <strong style={{ color: activePoint.efficiency >= 80 ? '#a6e3a1' : '#fab387' }}>
                {activePoint.efficiency}%
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.74rem', borderTop: '1px solid var(--md-sys-color-outline-variant, #cac4d0)', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: 'var(--md-sys-color-primary, #6750a4)' }} />
            <span style={{ fontWeight: 600 }}>Billed Invoiced (Left Axis)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: '#2e7d32' }} />
            <span style={{ fontWeight: 600 }}>Cashflow Collected (Right Axis %)</span>
          </div>
        </div>

        <span style={{ color: 'var(--md-sys-color-outline, #79747e)', fontSize: '0.68rem' }}>
          {pointsData.length} continuous interval slots rendered
        </span>
      </div>

      {/* Expandable Data Table Drawer */}
      {showTable && (
        <div className="fin-timeline-table-drawer">
          <table className="fin-timeline-table">
            <thead>
              <tr>
                <th>Timeline Interval</th>
                <th>Billed Amount</th>
                <th>Collected</th>
                <th>Outstanding</th>
                <th>Realization Rate</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {pointsData.map((row, idx) => (
                <tr key={idx} style={{ background: row.billed > 0 ? 'var(--md-sys-color-surface-container-lowest, #ffffff)' : 'transparent' }}>
                  <td style={{ fontWeight: row.billed > 0 ? 700 : 400 }}>{row.fullDate || row.label}</td>
                  <td style={{ fontWeight: 700, color: row.billed > 0 ? 'var(--md-sys-color-primary, #6750a4)' : 'inherit' }}>
                    {formatFullCurrency(row.billed)}
                  </td>
                  <td style={{ fontWeight: 700, color: row.collected > 0 ? '#2e7d32' : 'inherit' }}>
                    {formatFullCurrency(row.collected)}
                  </td>
                  <td style={{ color: row.billed - row.collected > 0 ? '#d32f2f' : 'inherit' }}>
                    {formatFullCurrency(Math.max(0, row.billed - row.collected))}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: row.efficiency >= 80 ? '#2e7d32' : '#e65100' }}>
                      {row.efficiency}%
                    </span>
                  </td>
                  <td>{row.count} bills</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   2. SERVICE STREAM RADIAL DONUT & SUNBURST MATRIX
   ========================================================================== */
export const DonutStreamChart = ({ data = [] }) => {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const CAT_COLORS = {
    REGISTRATION: '#00897b',
    CONSULTATION: '#1976d2',
    DIAGNOSTICS: '#7b1fa2',
    PHARMACY: '#388e3c',
    PROCEDURE: '#f57c00',
    PACKAGE: '#c2185b',
  };

  const totalAmount = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  }, [data]);

  const totalTransactions = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [data]);

  // Donut Arc Calculations
  const radius = 68;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  const arcData = useMemo(() => {
    if (totalAmount === 0) return [];
    let acc = 0;
    return data.map((d) => {
      const pct = (d.totalAmount || 0) / totalAmount;
      const strokeDasharray = `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
      const strokeDashoffset = (-acc * circumference).toFixed(2);
      acc += pct;
      return {
        ...d,
        pct: Math.round(pct * 100),
        color: CAT_COLORS[d._id] || '#5c6bc0',
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [data, totalAmount, circumference]);

  const activeItem = hoveredCategory 
    ? arcData.find((a) => a._id === hoveredCategory) 
    : null;

  return (
    <div className="fin-card" style={{ height: '100%' }}>
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <h3 className="fin-card-title">
            <span className="material-symbols-rounded">donut_large</span>
            <span>Revenue by Clinical Service Stream</span>
          </h3>
          <p className="fin-card-subtitle">Share of turnover across clinical departments &amp; pharmacy</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="fin-empty-chart">
          <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.4 }}>pie_chart</span>
          <span>No departmental revenue records in this period.</span>
        </div>
      ) : (
        <div className="fin-donut-layout">
          {/* Radial Donut Graphic */}
          <div className="fin-donut-wrapper">
            <svg viewBox="0 0 170 170" className="fin-donut-svg">
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="none"
                stroke="var(--md-sys-color-surface-container-high, #ece6f0)"
                strokeWidth={strokeWidth}
              />
              {arcData.map((arc) => {
                const isHovered = hoveredCategory === arc._id;
                return (
                  <circle
                    key={arc._id}
                    cx="85"
                    cy="85"
                    r={radius}
                    stroke={arc.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    className={`fin-donut-arc ${isHovered ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredCategory(arc._id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Center HUD */}
            <div className="fin-donut-center-hud">
              <div className="fin-donut-hud-label">
                {activeItem ? activeItem._id : 'Total Stream'}
              </div>
              <div className="fin-donut-hud-val">
                {formatCompactNum(activeItem ? activeItem.totalAmount : totalAmount)}
              </div>
              <div className="fin-donut-hud-sub">
                {activeItem ? `${activeItem.pct}% share` : `${totalTransactions} items`}
              </div>
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="fin-donut-legend">
            {arcData.map((item) => {
              const isHovered = hoveredCategory === item._id;
              return (
                <div
                  key={item._id}
                  className={`fin-donut-legend-item ${isHovered ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredCategory(item._id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <div className="fin-donut-legend-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontWeight: 600 }}>{item._id}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-outline)' }}>
                        ({item.count})
                      </span>
                    </div>
                    <div>
                      <strong>{formatFullCurrency(item.totalAmount)}</strong>
                      <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--md-sys-color-outline)' }}>
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="fin-donut-legend-bar-bg">
                    <div
                      className="fin-donut-legend-bar-fill"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   3. SETTLEMENT CHANNEL MULTI-BAR & CONVERSION GAUGE
   ========================================================================== */
export const PaymentMethodBars = ({ data = [] }) => {
  const totalCollected = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  }, [data]);

  const METHOD_ICONS = {
    Cash: 'payments',
    UPI: 'qr_code_scanner',
    Card: 'credit_card',
    Insurance: 'health_and_safety',
    Other: 'account_balance',
  };

  return (
    <div className="fin-card" style={{ height: '100%' }}>
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <h3 className="fin-card-title">
            <span className="material-symbols-rounded">account_balance_wallet</span>
            <span>Payment Settlement Channels</span>
          </h3>
          <p className="fin-card-subtitle">Distribution by transaction modality</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="fin-empty-chart">
          <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.4 }}>credit_card_off</span>
          <span>No settlement transactions recorded in this period.</span>
        </div>
      ) : (
        <div className="fin-payment-list">
          {data.map((pm) => {
            const pct = totalCollected > 0 ? Math.round(((pm.totalAmount || 0) / totalCollected) * 100) : 0;
            const icon = METHOD_ICONS[pm._id] || 'payments';
            const avgTicket = pm.count > 0 ? Math.round((pm.totalAmount || 0) / pm.count) : 0;

            return (
              <div key={pm._id} className="fin-payment-card">
                <div className="fin-payment-icon">
                  <span className="material-symbols-rounded">{icon}</span>
                </div>
                <div className="fin-payment-bar-wrap">
                  <div className="fin-payment-info">
                    <span style={{ fontWeight: 700 }}>{pm._id}</span>
                    <span style={{ fontWeight: 800, color: '#2e7d32' }}>
                      {formatFullCurrency(pm.totalAmount)}
                    </span>
                  </div>
                  <div className="fin-donut-legend-bar-bg">
                    <div
                      className="fin-donut-legend-bar-fill"
                      style={{ width: `${pct}%`, background: 'var(--md-sys-color-primary, #6750a4)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--md-sys-color-outline)' }}>
                    <span>{pm.count} txns ({pct}%)</span>
                    <span>Avg Ticket: {formatFullCurrency(avgTicket)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   4. REVENUE REALIZATION WATERFALL FLOW
   ========================================================================== */
export const RevenueWaterfallChart = ({ summary = {} }) => {
  const billed = summary.totalBilled || 0;
  const collected = summary.totalCollected || 0;
  const adjusted = summary.totalAdjusted || 0;
  const outstanding = summary.totalOutstanding || 0;

  const maxVal = Math.max(billed, collected + adjusted + outstanding, 1);

  const steps = [
    {
      name: 'Total Invoiced',
      val: billed,
      color: '#6750a4',
      pct: 100,
      badge: 'Billed',
    },
    {
      name: 'Cash Collected',
      val: collected,
      color: '#2e7d32',
      pct: billed > 0 ? Math.round((collected / billed) * 100) : 0,
      badge: 'Realized',
    },
    {
      name: 'Waivers / Credits',
      val: adjusted,
      color: '#e65100',
      pct: billed > 0 ? Math.round((adjusted / billed) * 100) : 0,
      badge: 'Concessions',
    },
    {
      name: 'Outstanding Dues',
      val: outstanding,
      color: outstanding > 0 ? '#d32f2f' : '#2e7d32',
      pct: billed > 0 ? Math.round((outstanding / billed) * 100) : 0,
      badge: 'Overdue',
    },
  ];

  return (
    <div className="fin-card">
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <h3 className="fin-card-title">
            <span className="material-symbols-rounded">waterfall_chart</span>
            <span>Revenue Realization Waterfall</span>
          </h3>
          <p className="fin-card-subtitle">Financial conversion funnel from Billing to Realized Liquidity</p>
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(46, 125, 50, 0.12)',
            color: '#2e7d32',
          }}
        >
          {billed > 0 ? Math.round((collected / billed) * 100) : 0}% Realization Velocity
        </span>
      </div>

      <div className="fin-waterfall-container">
        {steps.map((step, idx) => {
          const heightPct = Math.max(8, Math.round((step.val / maxVal) * 110));
          return (
            <div key={idx} className="fin-waterfall-col">
              <span className="fin-waterfall-val-label" style={{ color: step.color }}>
                {formatFullCurrency(step.val)}
              </span>
              <div
                className="fin-waterfall-bar"
                style={{ height: `${heightPct}px`, background: step.color }}
                title={`${step.name}: ${formatFullCurrency(step.val)}`}
              />
              <span className="fin-waterfall-name-label">{step.name}</span>
              <span
                className="fin-waterfall-pct-badge"
                style={{
                  background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
                  color: step.color,
                }}
              >
                {step.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==========================================================================
   5. DAY-OF-WEEK REVENUE & OCCUPANCY HEATMAP
   ========================================================================== */
export const DayOfWeekHeatmap = ({ data = [] }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayMap = useMemo(() => {
    const map = {};
    DAYS.forEach((d, idx) => {
      map[idx + 1] = { day: d, totalBilled: 0, totalCollected: 0, billCount: 0 };
    });
    data.forEach((d) => {
      if (d._id?.dayOfWeek && map[d._id.dayOfWeek]) {
        map[d._id.dayOfWeek] = {
          day: DAYS[d._id.dayOfWeek - 1],
          totalBilled: d.totalBilled || 0,
          totalCollected: d.totalCollected || 0,
          billCount: d.billCount || 0,
        };
      }
    });
    return Object.values(map);
  }, [data]);

  const maxDayBilled = Math.max(...dayMap.map((d) => d.totalBilled), 1);

  return (
    <div className="fin-card">
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <h3 className="fin-card-title">
            <span className="material-symbols-rounded">calendar_view_week</span>
            <span>Day-of-Week Operational Revenue Heatmap</span>
          </h3>
          <p className="fin-card-subtitle">Peak transaction days and financial density profile</p>
        </div>
      </div>

      <div className="fin-heatmap-grid">
        {dayMap.map((d, idx) => {
          const intensity = Math.min(1, d.totalBilled / maxDayBilled);
          const bgAlpha = Math.max(0.06, intensity * 0.35);

          return (
            <div
              key={idx}
              className="fin-heatmap-cell"
              style={{
                background: `color-mix(in srgb, var(--md-sys-color-primary, #6750a4) ${Math.round(bgAlpha * 100)}%, var(--md-sys-color-surface-container-low, #f7f2fa))`,
                borderColor: intensity > 0.5 ? 'var(--md-sys-color-primary, #6750a4)' : 'var(--md-sys-color-outline-variant, #cac4d0)',
              }}
              title={`${d.day}: ${formatFullCurrency(d.totalBilled)} across ${d.billCount} patient bills`}
            >
              <span className="fin-heatmap-day">{d.day}</span>
              <span className="fin-heatmap-amt">{formatCompactNum(d.totalBilled)}</span>
              <span className="fin-heatmap-count">{d.billCount} txns</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
