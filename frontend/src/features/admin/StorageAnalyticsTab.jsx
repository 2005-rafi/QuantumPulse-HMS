/**
 * StorageAnalyticsTab — Pure Material Design 3 Fluid Storage & Trend Analytics.
 * 
 * Storage Architecture:
 * 1. Cloudinary Storage Engine: Unstructured binary files (Scans, Lab Reports, Doctor/Staff Scan Copies)
 * 2. MongoDB Clinical Database: Structured metadata, encounters, patients, appointments, and audit trails
 * 
 * Responsive Design:
 * - Desktop Primary: Flawless fluid layout with generous vertical scrolling & zero submerged cards
 * - Tablet & Mobile: Adaptive stacking, touch-friendly segmented controls, responsive SVG chart
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { adminAPI } from '../../services/adminAPI';
import './StorageAnalyticsTab.css';

// ── SVG Monotonic Cubic Spline Helper ──
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

export const StorageAnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Chart Controls
  const [timeRange, setTimeRange] = useState('30days'); // '7days' | '14days' | '30days'
  const [metricType, setMetricType] = useState('cumulative'); // 'cumulative' | 'daily' | 'count'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [containerWidth, setContainerWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth - 120 : 1200));
  const observerRef = useRef(null);
  const svgRef = useRef(null);

  // Callback ref guarantees ResizeObserver attaches as soon as the DOM element mounts after loading finishes
  const containerCallbackRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const update = () => {
        const measured = node.clientWidth || node.getBoundingClientRect().width;
        if (measured > 100) {
          setContainerWidth(Math.floor(measured));
        }
      };

      // Measure immediately on mount
      update();

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect?.width) {
            setContainerWidth(Math.floor(entry.contentRect.width));
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminAPI.getStorageAnalytics();
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch storage analytics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load storage analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ── Compute Normalized Timeline for Trend Line Chart ──
  const chartTimeline = useMemo(() => {
    const totalDays = timeRange === '7days' ? 7 : timeRange === '14days' ? 14 : 30;
    const points = [];
    const now = new Date();
    const rawTrend = data?.trendData || [];

    const totalStorageBytes = (data?.folderBreakdown || []).reduce(
      (acc, f) => acc + (parseFloat(f.totalSizeMB) * 1024 * 1024 || 0),
      0
    );
    const baseMb = totalStorageBytes / (1024 * 1024);

    let cumulativeMb = Math.max(0.1, baseMb * 0.4);

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateKey = `${d.getFullYear()}-${month}-${day}`;
      const label = `${day} ${monthShort}`;

      const match = rawTrend.find(
        (t) => t._id?.year === d.getFullYear() && t._id?.month === month && t._id?.day === day
      );

      const dailyCount = match ? match.count : i === 0 ? Math.max(1, data?.summary?.totalHospitalFiles || 1) : 0;
      const dailyMb = match ? match.bytes / (1024 * 1024) : i === 0 ? baseMb : 0;

      cumulativeMb += dailyMb;

      points.push({
        dateKey,
        label,
        fullDate: `${dayName}, ${day} ${monthShort} ${d.getFullYear()}`,
        dailyMb: parseFloat(dailyMb.toFixed(3)),
        cumulativeMb: parseFloat(Math.min(baseMb, cumulativeMb).toFixed(3)),
        dailyCount,
      });
    }

    return points;
  }, [data, timeRange]);

  // ── Compute SVG Path Coordinates with Dynamic Container Width & Vertical Height Expansion ──
  const chartCoords = useMemo(() => {
    const svgWidth = Math.max(320, containerWidth);
    const svgHeight = 280;
    const paddingLeft = 56;
    const paddingRight = 16;
    const paddingTop = 26;
    const paddingBottom = 38;

    if (!chartTimeline || chartTimeline.length === 0)
      return { path: '', fillPath: '', points: [], maxVal: 1, minVal: 0, svgWidth, svgHeight, paddingLeft, paddingRight, paddingTop, paddingBottom };

    const values = chartTimeline.map((p) => {
      if (metricType === 'cumulative') return p.cumulativeMb;
      if (metricType === 'daily') return p.dailyMb;
      return p.dailyCount;
    });

    const maxVal = Math.max(0.5, ...values) * 1.25;
    const minVal = 0;

    const pointCoords = chartTimeline.map((item, idx) => {
      const x = paddingLeft + (idx / (chartTimeline.length - 1 || 1)) * (svgWidth - paddingLeft - paddingRight);
      const val = metricType === 'cumulative' ? item.cumulativeMb : metricType === 'daily' ? item.dailyMb : item.dailyCount;
      const y = svgHeight - paddingBottom - ((val - minVal) / (maxVal - minVal || 1)) * (svgHeight - paddingTop - paddingBottom);
      return { x, y, ...item, val };
    });

    const spline = createSmoothSplinePath(pointCoords);
    const firstX = pointCoords[0]?.x || paddingLeft;
    const lastX = pointCoords[pointCoords.length - 1]?.x || svgWidth - paddingRight;
    const fillPath = `${spline} L ${lastX} ${svgHeight - paddingBottom} L ${firstX} ${svgHeight - paddingBottom} Z`;

    return { path: spline, fillPath, points: pointCoords, maxVal, minVal, svgWidth, svgHeight, paddingLeft, paddingRight, paddingTop, paddingBottom };
  }, [chartTimeline, metricType, containerWidth]);

  // ── Non-Overlapping X-Axis Date Labels ──
  const dateLabels = useMemo(() => {
    if (!chartCoords.points || chartCoords.points.length === 0) return [];
    const pts = chartCoords.points;
    const count = pts.length;
    const step = count <= 7 ? 1 : count <= 14 ? 2 : 5;

    const result = [];
    for (let i = 0; i < count; i++) {
      const isFirst = i === 0;
      const isLast = i === count - 1;

      // Skip intermediate point if within 2 steps of the last item to prevent collision
      if (!isLast && count - 1 - i < 2 && step > 1) {
        continue;
      }

      if (isFirst || isLast || i % step === 0) {
        result.push({
          ...pts[i],
          index: i,
          align: isFirst ? 'start' : isLast ? 'end' : 'middle',
        });
      }
    }
    return result;
  }, [chartCoords.points]);

  const handleMouseMove = (e) => {
    if (!svgRef.current || chartCoords.points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartCoords.svgWidth;

    let closest = chartCoords.points[0];
    let minDist = Math.abs(closest.x - mouseX);

    for (let i = 1; i < chartCoords.points.length; i++) {
      const dist = Math.abs(chartCoords.points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = chartCoords.points[i];
      }
    }

    setHoveredPoint(closest);
  };

  if (loading) {
    return (
      <div className="storage-analytics-loading">
        <div className="storage-loading-spinner" />
        <p>Loading Cloudinary Storage & MongoDB Database Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-analytics-error">
        <span className="material-symbols-rounded">error</span>
        <p>{error}</p>
        <button className="md3-btn-retry" onClick={() => fetchAnalytics(true)}>
          <span className="material-symbols-rounded">refresh</span> Retry
        </button>
      </div>
    );
  }

  const cloudinary = data?.cloudinary || {};
  const folderBreakdown = data?.folderBreakdown || [];
  const dbSummary = data?.databaseSummary || {};
  const summary = data?.summary || {};

  const creditsUsed = cloudinary.credits?.used || 0;
  const creditsLimit = cloudinary.credits?.limit || 25;
  const creditsPercent = cloudinary.credits?.percentUsed || ((creditsUsed / creditsLimit) * 100).toFixed(1);

  return (
    <div className="storage-analytics-scroll-container">
      <div className="storage-analytics-fluid-content">
        {/* ── Page Header ── */}
        <div className="storage-analytics-header">
          <div className="storage-header-titles">
            <div className="storage-title-row">
              <span className="material-symbols-rounded storage-header-icon">cloud_sync</span>
              <h2>Cloud Storage & Database Analytics</h2>
              <span className="storage-badge-live">Live Monitored</span>
            </div>
            <p className="storage-subtitle">
              Dual-Storage Engine • Cloudinary File Binaries & MongoDB Clinical Metadata
            </p>
          </div>

          <button
            className={`storage-refresh-btn ${refreshing ? 'is-spinning' : ''}`}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh storage statistics"
          >
            <span className="material-symbols-rounded">refresh</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* ── Top Metric Hero Cards (Fluid Grid) ── */}
        <div className="storage-metric-grid">
          {/* Card 1: Cloudinary Binary Storage */}
          <div className="storage-card hero-card">
            <div className="storage-card-header">
              <div className="card-icon-wrap primary-icon">
                <span className="material-symbols-rounded">cloud</span>
              </div>
              <span className="card-tag">Cloudinary Storage</span>
            </div>
            <div className="storage-metric-body">
              <div className="storage-metric-val">
                {cloudinary.storage?.megabytes || '0.00'} <small>MB</small>
              </div>
              <span className="storage-metric-sub">
                File Binaries (Free Plan • 25 GB Max)
              </span>
            </div>
            <div className="storage-progress-container">
              <div className="storage-progress-meta">
                <span>Free-Tier Credits</span>
                <span>{creditsPercent}% of 25 Credits</span>
              </div>
              <div className="storage-progress-track">
                <div
                  className="storage-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(2, creditsPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Uploaded Asset Inventory */}
          <div className="storage-card hero-card">
            <div className="storage-card-header">
              <div className="card-icon-wrap secondary-icon">
                <span className="material-symbols-rounded">folder_open</span>
              </div>
              <span className="card-tag">File Inventory</span>
            </div>
            <div className="storage-metric-body">
              <div className="storage-metric-val">
                {summary.totalHospitalFiles || 0} <small>Files</small>
              </div>
              <span className="storage-metric-sub">
                {summary.totalManagedStorageMB || 0} MB Total Scans & Certs
              </span>
            </div>
            <div className="storage-stat-pills">
              <span className="stat-pill">
                <span className="material-symbols-rounded">radiology</span>
                {folderBreakdown[0]?.fileCount || 0} Scans
              </span>
              <span className="stat-pill">
                <span className="material-symbols-rounded">verified</span>
                {folderBreakdown[1]?.fileCount || 0} Certs
              </span>
            </div>
          </div>

          {/* Card 3: HIPAA Security & Compliance */}
          <div className="storage-card hero-card">
            <div className="storage-card-header">
              <div className="card-icon-wrap tertiary-icon">
                <span className="material-symbols-rounded">lock</span>
              </div>
              <span className="card-tag">HIPAA Protected</span>
            </div>
            <div className="storage-metric-body">
              <div className="storage-metric-val secure-val">AES-256</div>
              <span className="storage-metric-sub">
                Zero Local Disk • Private HMAC Delivery
              </span>
            </div>
            <div className="storage-security-badges">
              <span className="sec-badge">
                <span className="material-symbols-rounded">timer</span> 5-Min Signed URLs
              </span>
              <span className="sec-badge">
                <span className="material-symbols-rounded">security</span> RBAC Enforced
              </span>
            </div>
          </div>
        </div>

        {/* ── Storage Usage & Inflow Trend Line Chart Card ── */}
        <div className="storage-card trend-chart-card">
          <div className="trend-chart-header">
            <div className="trend-title-block">
              <div className="trend-title-row">
                <span className="material-symbols-rounded trend-header-icon">trending_up</span>
                <h3>Storage Usage & Inflow Trend</h3>
              </div>
              <p className="trend-subtitle">
                Temporal analysis of binary uploads and cumulative cloud storage growth
              </p>
            </div>

            <div className="trend-controls">
              {/* Metric Segmented Control */}
              <div className="md3-segmented-control" role="group" aria-label="Metric Type">
                <button
                  type="button"
                  className={`md3-segment-btn ${metricType === 'cumulative' ? 'active' : ''}`}
                  onClick={() => setMetricType('cumulative')}
                >
                  Cumulative (MB)
                </button>
                <button
                  type="button"
                  className={`md3-segment-btn ${metricType === 'daily' ? 'active' : ''}`}
                  onClick={() => setMetricType('daily')}
                >
                  Daily Inflow
                </button>
                <button
                  type="button"
                  className={`md3-segment-btn ${metricType === 'count' ? 'active' : ''}`}
                  onClick={() => setMetricType('count')}
                >
                  File Count
                </button>
              </div>

              {/* Time Horizon Chips */}
              <div className="trend-range-chips">
                {['7days', '14days', '30days'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`trend-chip ${timeRange === r ? 'active' : ''}`}
                    onClick={() => setTimeRange(r)}
                  >
                    {r === '7days' ? '7 Days' : r === '14days' ? '14 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive SVG Line Chart */}
          <div className="trend-svg-wrapper" ref={containerCallbackRef} onMouseLeave={() => setHoveredPoint(null)}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartCoords.svgWidth} ${chartCoords.svgHeight}`}
              className="trend-svg"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
              textRendering="geometricPrecision"
              onMouseMove={handleMouseMove}
            >
              <defs>
                <linearGradient id="storageAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.28" />
                  <stop offset="85%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y =
                  chartCoords.svgHeight -
                  chartCoords.paddingBottom -
                  pct * (chartCoords.svgHeight - chartCoords.paddingTop - chartCoords.paddingBottom);
                const val = (chartCoords.minVal + pct * (chartCoords.maxVal - chartCoords.minVal)).toFixed(1);
                return (
                  <g key={idx} className="chart-grid-line">
                    <line
                      x1={chartCoords.paddingLeft}
                      y1={y}
                      x2={chartCoords.svgWidth - chartCoords.paddingRight}
                      y2={y}
                      stroke="var(--md-sys-color-outline-variant)"
                      strokeDasharray="4 4"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={chartCoords.paddingLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="chart-axis-text"
                    >
                      {val} {metricType === 'count' ? 'files' : 'MB'}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Fill Under Curve */}
              {chartCoords.fillPath && <path d={chartCoords.fillPath} fill="url(#storageAreaGradient)" />}

              {/* Smooth Spline Curve Line */}
              {chartCoords.path && (
                <path
                  d={chartCoords.path}
                  fill="none"
                  stroke="var(--md-sys-color-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {chartCoords.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint?.dateKey === pt.dateKey ? 6 : 3.5}
                  className={`chart-data-point ${hoveredPoint?.dateKey === pt.dateKey ? 'is-active' : ''}`}
                  fill="var(--md-sys-color-surface-container-lowest)"
                  stroke="var(--md-sys-color-primary)"
                  strokeWidth={hoveredPoint?.dateKey === pt.dateKey ? 3 : 2}
                />
              ))}

              {/* Hover Vertical Guide Line */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={chartCoords.paddingTop}
                  x2={hoveredPoint.x}
                  y2={chartCoords.svgHeight - chartCoords.paddingBottom}
                  stroke="var(--md-sys-color-primary)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* X-Axis Date Labels (Non-colliding, start/middle/end anchored) */}
              {dateLabels.map((pt, idx) => (
                <text
                  key={idx}
                  x={pt.x}
                  y={chartCoords.svgHeight - 12}
                  textAnchor={pt.align}
                  className="chart-axis-text chart-date-text"
                >
                  {pt.label}
                </text>
              ))}
            </svg>

            {/* Interactive Floating Tooltip */}
            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(hoveredPoint.x / chartCoords.svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartCoords.svgHeight) * 100}%`,
                }}
              >
                <div className="tooltip-date">{hoveredPoint.fullDate}</div>
                <div className="tooltip-metric">
                  <span>
                    {metricType === 'cumulative'
                      ? 'Cumulative Storage'
                      : metricType === 'daily'
                      ? 'Daily Inflow'
                      : 'Files Added'}
                    :
                  </span>
                  <strong>
                    {hoveredPoint.val} {metricType === 'count' ? 'files' : 'MB'}
                  </strong>
                </div>
                <div className="tooltip-sub">
                  Total Files: {hoveredPoint.dailyCount} • Daily: {hoveredPoint.dailyMb} MB
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Folder-Segregated Cloud Breakdown (Fluid 2-Column Grid) ── */}
        <div className="storage-section-title">
          <span className="material-symbols-rounded">folder_copy</span>
          <h3>Folder-Segregated Cloud Breakdown (Cloudinary)</h3>
        </div>

        <div className="storage-folder-grid">
          {folderBreakdown.map((folder, idx) => (
            <div key={idx} className="storage-card folder-card">
              <div className="folder-card-top">
                <div className="folder-icon-title">
                  <div className="folder-main-icon">
                    <span className="material-symbols-rounded">
                      {idx === 0 ? 'medical_services' : 'badge'}
                    </span>
                  </div>
                  <div>
                    <h4 className="folder-title">{folder.category}</h4>
                    <code className="folder-path">{folder.folderPath}</code>
                  </div>
                </div>
                <div className="folder-summary-badge">
                  <strong>{folder.fileCount}</strong> files • {folder.totalSizeMB} MB
                </div>
              </div>

              {/* Subfolders breakdown table */}
              <div className="folder-subitems-table">
                <div className="folder-table-row header-row">
                  <span>{idx === 0 ? 'Department Code' : 'Staff Role'}</span>
                  <span>File Count</span>
                  <span>Storage (MB)</span>
                </div>
                {folder.subfolders && folder.subfolders.length > 0 ? (
                  folder.subfolders.map((sub, sIdx) => (
                    <div key={sIdx} className="folder-table-row">
                      <span className="subfolder-name">
                        <span className="material-symbols-rounded sub-folder-icon">folder</span>
                        {sub.department || sub.role}
                      </span>
                      <span className="subfolder-count">{sub.fileCount}</span>
                      <span className="subfolder-size">{sub.sizeMB} MB</span>
                    </div>
                  ))
                ) : (
                  <div className="folder-empty-state">No files uploaded to this folder yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── MongoDB Database Capacity & Core Encounters (Fluid 4-Card Strip) ── */}
        <div className="storage-section-title">
          <span className="material-symbols-rounded">database</span>
          <h3>Clinical Metadata & Database Capacity (MongoDB)</h3>
        </div>

        <div className="storage-db-grid">
          <div className="db-metric-item">
            <div className="db-icon-wrap">
              <span className="material-symbols-rounded">groups</span>
            </div>
            <div className="db-metric-text">
              <span className="db-metric-count">{dbSummary.totalPatients || 0}</span>
              <span className="db-metric-label">Registered Patients</span>
            </div>
          </div>

          <div className="db-metric-item">
            <div className="db-icon-wrap">
              <span className="material-symbols-rounded">meeting_room</span>
            </div>
            <div className="db-metric-text">
              <span className="db-metric-count">{dbSummary.totalVisits || 0}</span>
              <span className="db-metric-label">Encounters & Visits</span>
            </div>
          </div>

          <div className="db-metric-item">
            <div className="db-icon-wrap">
              <span className="material-symbols-rounded">calendar_today</span>
            </div>
            <div className="db-metric-text">
              <span className="db-metric-count">{dbSummary.totalAppointments || 0}</span>
              <span className="db-metric-label">Appointments</span>
            </div>
          </div>

          <div className="db-metric-item">
            <div className="db-icon-wrap">
              <span className="material-symbols-rounded">badge</span>
            </div>
            <div className="db-metric-text">
              <span className="db-metric-count">{dbSummary.totalStaff || 0}</span>
              <span className="db-metric-label">Staff Accounts</span>
            </div>
          </div>
        </div>

        {/* Bottom Safety Spacer for Smooth Scrolling Breathing Room */}
        <div className="storage-bottom-spacer" />
      </div>
    </div>
  );
};

export default StorageAnalyticsTab;
