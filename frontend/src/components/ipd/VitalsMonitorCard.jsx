/**
 * components/ipd/VitalsMonitorCard.jsx
 * Advanced Material Design 3 Telemetry Deck & Bedside Flowsheet Monitor.
 * Features:
 * - View Switcher: [Bedside Matrix] | [Longitudinal Charts] | [Flowsheet Grid]
 * - Telemetry Timing & Protocol Countdown (VitalsFrequencyTimer)
 * - Occult Sepsis & Hemorrhage Shock Index Warning Banner (HR / SysBP >= 0.9)
 * - Pure SVG Longitudinal Vector Charts with Target Safe Zones & Crosshair Scrubber
 * - Glanceable Bedside Micro-Sparklines for rapid multi-parameter assessment
 * - Full Responsive Adaptation for Mobile Nursing Rounds & Bedside Tablets
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import VitalsFrequencyTimer from './VitalsFrequencyTimer';
import { VitalsLineChart } from './charts/VitalsLineChart';
import { VitalsTrendSparkline } from './charts/VitalsTrendSparkline';
import ipdApi from '../../services/ipdApi';
import './VitalsMonitorCard.css';

// Canonical telemetry metrics configuration
const TELEMETRY_METRICS = {
  BP: {
    id: 'BP',
    label: 'Blood Pressure',
    shortLabel: 'BP',
    icon: 'speed',
    primary: 'systolicBp',
    secondary: 'diastolicBp',
    title: 'Arterial Blood Pressure (Systolic / Diastolic)',
    unit: 'mmHg',
    targetBand: { min: 90, max: 130, warnLow: 90, warnHigh: 140 },
    color: 'var(--md-sys-color-primary, #006a6a)',
    secondaryColor: 'var(--md-sys-color-secondary, #4a6363)',
  },
  HR: {
    id: 'HR',
    label: 'Heart Rate',
    shortLabel: 'HR',
    icon: 'favorite',
    primary: 'heartRate',
    title: 'Pulse / Heart Rate Progression',
    unit: 'bpm',
    targetBand: { min: 60, max: 100, warnLow: 50, warnHigh: 110 },
    color: '#b3261e',
  },
  RR: {
    id: 'RR',
    label: 'Respiration',
    shortLabel: 'RR',
    icon: 'air',
    primary: 'respirationRate',
    title: 'Respiratory Rate Progression',
    unit: 'bpm',
    targetBand: { min: 12, max: 20, warnLow: 10, warnHigh: 24 },
    color: '#0f766e',
  },
  SPO2: {
    id: 'SPO2',
    label: 'SpO2 Saturation',
    shortLabel: 'SpO2',
    icon: 'vital_signs',
    primary: 'spO2',
    title: 'Pulse Oximetry Oxygen Saturation (SpO2)',
    unit: '%',
    targetBand: { min: 95, max: 100, warnLow: 92, warnHigh: 100 },
    color: '#0284c7',
  },
  TEMP: {
    id: 'TEMP',
    label: 'Core Temperature',
    shortLabel: 'Temp',
    icon: 'device_thermostat',
    primary: 'temperature',
    title: 'Body Core Temperature Progression',
    unit: '°C',
    targetBand: { min: 36.5, max: 37.5, warnLow: 36.0, warnHigh: 38.0 },
    color: '#d97706',
  },
  NEWS2: {
    id: 'NEWS2',
    label: 'NEWS2 Risk Score',
    shortLabel: 'NEWS2',
    icon: 'warning',
    primary: 'news2Score',
    title: 'National Early Warning Score (NEWS2) Trajectory',
    unit: 'pts',
    targetBand: { min: 0, max: 2, warnLow: 0, warnHigh: 5 },
    color: '#7c3aed',
  },
};

const TIME_WINDOWS = [
  { id: '8h', label: '8h Shift' },
  { id: '24h', label: '24h Day' },
  { id: '72h', label: '72h (3D)' },
  { id: 'all', label: 'All Stay' },
];

export const VitalsMonitorCard = ({
  latestVitals,
  vitalsList = [],
  admissionId = null,
  monitoringPlan = {},
  lastVitalsRecordedAt = null,
  nextVitalsDueAt = null,
  onOpenRecordSheet = null,
  onUpdateFrequency = null,
  readOnly = false,
}) => {
  // Navigation / View states
  const [activeView, setActiveView] = useState('MATRIX'); // 'MATRIX' | 'CHARTS' | 'FLOWSHEET'
  const [selectedMetricId, setSelectedMetricId] = useState('BP');
  const [timeWindow, setTimeWindow] = useState('24h');

  // Async trends data from backend
  const [trendsPayload, setTrendsPayload] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Fetch telemetry trends when admission or window changes
  const fetchTrends = useCallback(async () => {
    if (!admissionId) return;
    try {
      setLoadingTrends(true);
      const res = await ipdApi.getVitalsTrends(admissionId, { window: timeWindow });
      if (res.data?.data) {
        const payload = res.data.data.telemetry || res.data.data;
        setTrendsPayload(payload);
      }
    } catch (err) {
      console.warn('Could not fetch backend telemetry trends, falling back to vitalsList:', err);
    } finally {
      setLoadingTrends(false);
    }
  }, [admissionId, timeWindow]);

  useEffect(() => {
    if (activeView === 'CHARTS' || activeView === 'MATRIX') {
      fetchTrends();
    }
  }, [fetchTrends, activeView]);

  // Telemetry series data points
  const chartSeries = useMemo(() => {
    const list = trendsPayload?.series || trendsPayload?.records;
    if (list && list.length > 0) {
      return list;
    }
    // Fallback formatting from local vitalsList
    return vitalsList
      .slice()
      .reverse()
      .map((v) => ({
        id: v._id || v.id,
        recordedAt: v.recordedAt,
        timeLabel: v.recordedAt ? new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        dateLabel: v.recordedAt ? new Date(v.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
        systolicBp: v.systolicBp,
        diastolicBp: v.diastolicBp,
        pulsePressure: v.systolicBp && v.diastolicBp ? v.systolicBp - v.diastolicBp : null,
        heartRate: v.heartRate,
        respirationRate: v.respirationRate,
        spO2: v.spO2,
        temperature: v.temperature,
        news2Score: v.news2Score,
        news2RiskLevel: v.news2RiskLevel,
        shockIndex: v.shockIndex || (v.heartRate && v.systolicBp ? parseFloat((v.heartRate / v.systolicBp).toFixed(2)) : null),
        shockIndexAlert: v.shockIndex ? v.shockIndex >= 0.9 : v.heartRate && v.systolicBp ? v.heartRate / v.systolicBp >= 0.9 : false,
        clinicalNotes: v.clinicalNotes,
        nurseName: v.recordedBy?.firstName || 'Nurse',
      }));
  }, [trendsPayload, vitalsList]);

  // Hemodynamic Shock Index evaluation
  const shockIndexInfo = useMemo(() => {
    const hr = latestVitals?.heartRate;
    const sys = latestVitals?.systolicBp;
    let si = latestVitals?.shockIndex;
    if (si === undefined || si === null) {
      if (hr && sys && sys > 0) {
        si = parseFloat((hr / sys).toFixed(2));
      }
    }
    const isAlert = si !== null && si !== undefined && si >= 0.9;
    return { value: si, isAlert };
  }, [latestVitals]);

  // Qualitative Tag Helpers
  const getTempStatus = (temp) => {
    if (!temp) return { color: 'var(--md-sys-color-outline, #707979)', tag: '—' };
    if (temp >= 38.0) return { color: 'var(--md-sys-color-error, #ba1a1a)', tag: 'Febrile' };
    if (temp >= 37.5) return { color: '#c2410c', tag: 'Elevated' };
    if (temp < 36.0) return { color: '#0369a1', tag: 'Hypothermic' };
    return { color: '#166534', tag: 'Normal' };
  };

  const getHrStatus = (hr) => {
    if (!hr) return { color: 'var(--md-sys-color-outline, #707979)', tag: '—' };
    if (hr > 100) return { color: 'var(--md-sys-color-error, #ba1a1a)', tag: 'Tachycardia' };
    if (hr < 60) return { color: '#c2410c', tag: 'Bradycardia' };
    return { color: '#166534', tag: 'Normal' };
  };

  const getBpStatus = (sys, dia) => {
    if (!sys || !dia) return { color: 'var(--md-sys-color-outline, #707979)', tag: '—' };
    if (sys >= 140 || dia >= 90) return { color: 'var(--md-sys-color-error, #ba1a1a)', tag: 'High BP' };
    if (sys < 90 || dia < 60) return { color: '#c2410c', tag: 'Low BP' };
    return { color: '#166534', tag: 'Optimal' };
  };

  const getSpo2Status = (spo2) => {
    if (!spo2) return { color: 'var(--md-sys-color-outline, #707979)', tag: '—' };
    if (spo2 < 92) return { color: 'var(--md-sys-color-error, #ba1a1a)', tag: 'Hypoxia' };
    if (spo2 < 96) return { color: '#c2410c', tag: 'Mild Low' };
    return { color: '#166534', tag: 'Optimal' };
  };

  const getNews2TagStyle = (score = 0, riskLevel = 'LOW') => {
    if (riskLevel === 'HIGH' || score >= 7) {
      return { bg: '#fee2e2', color: '#991b1b', text: `NEWS2: ${score} (Critical)` };
    }
    if (riskLevel === 'MEDIUM' || (score >= 5 && score <= 6)) {
      return { bg: '#fef3c7', color: '#92400e', text: `NEWS2: ${score} (Medium)` };
    }
    return { bg: '#dcfce7', color: '#166534', text: `NEWS2: ${score} (Low)` };
  };

  const activeMetricConfig = TELEMETRY_METRICS[selectedMetricId] || TELEMETRY_METRICS.BP;

  // Selected parameter statistical summary
  const metricStats = useMemo(() => {
    if (!chartSeries || chartSeries.length === 0) return null;
    const values = chartSeries
      .map((d) => d[activeMetricConfig.primary])
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const baseline = values[0];
    const current = values[values.length - 1];
    const delta = current - baseline;

    let trajectory = 'Stable';
    if (Math.abs(delta) > 0.05 * baseline) {
      trajectory = delta > 0 ? 'Trending Up' : 'Trending Down';
    }

    return { min, max, baseline, current, delta, trajectory, count: values.length };
  }, [chartSeries, activeMetricConfig]);

  const tempStat = getTempStatus(latestVitals?.temperature);
  const hrStat = getHrStatus(latestVitals?.heartRate);
  const bpStat = getBpStatus(latestVitals?.systolicBp, latestVitals?.diastolicBp);
  const spo2Stat = getSpo2Status(latestVitals?.spO2);
  const news2Tag = getNews2TagStyle(latestVitals?.news2Score, latestVitals?.news2RiskLevel);

  return (
    <div className="md3-telemetry-deck" role="region" aria-label="Inpatient Bedside Telemetry Monitor">
      {/* 1. Header & Segmented View Switchers */}
      <div className="md3-telemetry-header">
        <div className="md3-telemetry-title-group">
          <span className="material-symbols-rounded md3-telemetry-icon">vital_signs</span>
          <div>
            <h3 className="md3-telemetry-title">Bedside Telemetry &amp; Progression Flowsheet</h3>
            <span className="md3-telemetry-subtitle">
              Longitudinal Physiological Monitoring &amp; NEWS2 Early Warning
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="md3-telemetry-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'MATRIX'}
            className={`md3-telemetry-tab-btn ${activeView === 'MATRIX' ? 'is-active' : ''}`}
            onClick={() => setActiveView('MATRIX')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>grid_view</span>
            Bedside Matrix
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'CHARTS'}
            className={`md3-telemetry-tab-btn ${activeView === 'CHARTS' ? 'is-active' : ''}`}
            onClick={() => setActiveView('CHARTS')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>monitoring</span>
            Longitudinal Charts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'FLOWSHEET'}
            className={`md3-telemetry-tab-btn ${activeView === 'FLOWSHEET' ? 'is-active' : ''}`}
            onClick={() => setActiveView('FLOWSHEET')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>table_chart</span>
            Flowsheet
            {vitalsList.length > 0 && (
              <span className="md3-telemetry-tab-badge">{vitalsList.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Telemetry Timing Engine & Frequency Controller */}
      <VitalsFrequencyTimer
        monitoringPlan={monitoringPlan}
        lastRecordedAt={lastVitalsRecordedAt || latestVitals?.recordedAt}
        nextDueAt={nextVitalsDueAt}
        onUpdateFrequency={onUpdateFrequency}
        onRecordVitalsClick={onOpenRecordSheet}
        readOnly={readOnly}
      />

      {/* 3. Hemodynamic Shock Index Alert Banner */}
      {shockIndexInfo.isAlert && (
        <div className="md3-shock-alert-banner" role="alert">
          <span className="material-symbols-rounded md3-shock-alert-icon">emergency</span>
          <div className="md3-shock-alert-content">
            <div className="md3-shock-alert-title-wrap">
              <span className="md3-shock-alert-title">Critical Hemodynamic Alert</span>
              <span className="md3-shock-alert-badge">
                Shock Index: {shockIndexInfo.value} (Threshold ≥ 0.90)
              </span>
            </div>
            <p className="md3-shock-alert-desc">
              Patient exhibits elevated Shock Index (Heart Rate {latestVitals?.heartRate} / Systolic BP {latestVitals?.systolicBp} mmHg).
              Indicates occult hemorrhage, septic vasodilation, or acute hypovolemic decompensation before overt hypotension occurs.
              <strong> Initiate urgent SBAR notification to the attending physician.</strong>
            </p>
          </div>
        </div>
      )}

      {/* 4. Tab Panels */}
      {!latestVitals && vitalsList.length === 0 ? (
        <div className="md3-telemetry-empty">
          <div className="md3-telemetry-empty-info">
            <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--md-sys-color-outline)' }}>
              favorite
            </span>
            <span className="md3-telemetry-empty-text">No baseline vitals recorded for this inpatient encounter.</span>
          </div>
          {onOpenRecordSheet && !readOnly && (
            <button
              type="button"
              className="md3-btn-action"
              onClick={onOpenRecordSheet}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>add</span>
              Record Baseline Vitals
            </button>
          )}
        </div>
      ) : (
        <>
          {/* TAB 1: BEDSIDE MATRIX VIEW */}
          {activeView === 'MATRIX' && (
            <div className="md3-telemetry-matrix-wrapper">
              <table className="md3-telemetry-table">
                <thead>
                  <tr>
                    <th className="md3-telemetry-th">Body Temp</th>
                    <th className="md3-telemetry-th">Blood Pressure</th>
                    <th className="md3-telemetry-th">Pulse / HR</th>
                    <th className="md3-telemetry-th">Respiration</th>
                    <th className="md3-telemetry-th">Oxygen (SpO2)</th>
                    <th className="md3-telemetry-th">Consciousness / NEWS2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* 1. Temp */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">{latestVitals?.temperature ?? '—'}</span>
                        <span className="md3-telemetry-unit">°C</span>
                        <span className="md3-telemetry-tag" style={{ color: tempStat.color }}>{tempStat.tag}</span>
                      </div>
                      <div className="md3-telemetry-normal-ref">36.5–37.5°C</div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="temperature"
                          color="#d97706"
                          ariaLabel="Temperature progression"
                        />
                      </div>
                    </td>

                    {/* 2. BP */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">
                          {latestVitals?.systolicBp && latestVitals?.diastolicBp
                            ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
                            : '—'}
                        </span>
                        <span className="md3-telemetry-unit">mmHg</span>
                        <span className="md3-telemetry-tag" style={{ color: bpStat.color }}>{bpStat.tag}</span>
                      </div>
                      <div className="md3-telemetry-normal-ref">120/80 mmHg</div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="systolicBp"
                          color="var(--md-sys-color-primary, #006a6a)"
                          ariaLabel="Systolic BP progression"
                        />
                      </div>
                    </td>

                    {/* 3. Pulse */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">{latestVitals?.heartRate ?? '—'}</span>
                        <span className="md3-telemetry-unit">bpm</span>
                        <span className="md3-telemetry-tag" style={{ color: hrStat.color }}>{hrStat.tag}</span>
                      </div>
                      <div className="md3-telemetry-normal-ref">60–100 bpm</div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="heartRate"
                          color="#b3261e"
                          ariaLabel="Heart rate progression"
                        />
                      </div>
                    </td>

                    {/* 4. Respiration */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">{latestVitals?.respirationRate ?? '—'}</span>
                        <span className="md3-telemetry-unit">bpm</span>
                        <span className="md3-telemetry-tag" style={{ color: '#166534' }}>Normal</span>
                      </div>
                      <div className="md3-telemetry-normal-ref">12–20 bpm</div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="respirationRate"
                          color="#0f766e"
                          ariaLabel="Respiration progression"
                        />
                      </div>
                    </td>

                    {/* 5. SpO2 */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">{latestVitals?.spO2 ?? '—'}</span>
                        <span className="md3-telemetry-unit">%</span>
                        <span className="md3-telemetry-tag" style={{ color: spo2Stat.color }}>
                          {latestVitals?.oxygenTherapy ? `O2 ${latestVitals.oxygenFlowRateLpm || ''}L` : spo2Stat.tag}
                        </span>
                      </div>
                      <div className="md3-telemetry-normal-ref">
                        {latestVitals?.oxygenTherapy ? 'Supplemental O2' : 'Room Air (≥96%)'}
                      </div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="spO2"
                          color="#0284c7"
                          ariaLabel="Oxygen saturation progression"
                        />
                      </div>
                    </td>

                    {/* 6. AVPU & NEWS2 */}
                    <td className="md3-telemetry-td">
                      <div className="md3-telemetry-val-group">
                        <span className="md3-telemetry-primary-val">{latestVitals?.avpu || 'ALERT'}</span>
                        <span
                          style={{
                            background: news2Tag.bg,
                            color: news2Tag.color,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {news2Tag.text}
                        </span>
                      </div>
                      <div className="md3-telemetry-normal-ref">
                        {latestVitals?.recordedAt
                          ? new Date(latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                        {latestVitals?.recordedBy?.firstName ? ` · ${latestVitals.recordedBy.firstName}` : ''}
                      </div>
                      <div className="md3-telemetry-sparkline-row">
                        <VitalsTrendSparkline
                          data={chartSeries}
                          parameter="news2Score"
                          color="#7c3aed"
                          ariaLabel="NEWS2 score trajectory"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {latestVitals?.clinicalNotes && (
                <div className="md3-telemetry-notes-bar">
                  <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-primary)' }}>
                    chat
                  </span>
                  <span><strong>Nurse Observation:</strong> {latestVitals.clinicalNotes}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LONGITUDINAL CHARTS & TRAJECTORY VIEW */}
          {activeView === 'CHARTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Metric & Window Selector Bar */}
              <div className="md3-chart-controls-bar">
                {/* Metric Selector Pills */}
                <div className="md3-metric-pills">
                  {Object.values(TELEMETRY_METRICS).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`md3-metric-pill-btn ${selectedMetricId === m.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedMetricId(m.id)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>{m.icon}</span>
                      {m.shortLabel}
                    </button>
                  ))}
                </div>

                {/* Time Window Pills */}
                <div className="md3-window-pills">
                  {TIME_WINDOWS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`md3-window-pill-btn ${timeWindow === w.id ? 'is-active' : ''}`}
                      onClick={() => setTimeWindow(w.id)}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vector SVG Chart Engine */}
              <VitalsLineChart
                data={chartSeries}
                parameter={activeMetricConfig.primary}
                secondaryParameter={activeMetricConfig.secondary}
                title={activeMetricConfig.title}
                unit={activeMetricConfig.unit}
                targetBand={activeMetricConfig.targetBand}
                color={activeMetricConfig.color}
                secondaryColor={activeMetricConfig.secondaryColor}
                height={230}
              />

              {/* Statistical Telemetry Progression Strip */}
              {metricStats && (
                <div className="md3-telemetry-stats-grid">
                  <div className="md3-telemetry-stat-card">
                    <span className="md3-telemetry-stat-label">Baseline</span>
                    <span className="md3-telemetry-stat-val">
                      {metricStats.baseline} {activeMetricConfig.unit}
                    </span>
                    <span className="md3-telemetry-stat-sub">Earliest in window</span>
                  </div>

                  <div className="md3-telemetry-stat-card">
                    <span className="md3-telemetry-stat-label">Current</span>
                    <span className="md3-telemetry-stat-val">
                      {metricStats.current} {activeMetricConfig.unit}
                    </span>
                    <span className="md3-telemetry-stat-sub">Latest reading</span>
                  </div>

                  <div className="md3-telemetry-stat-card">
                    <span className="md3-telemetry-stat-label">Min / Max</span>
                    <span className="md3-telemetry-stat-val">
                      {metricStats.min} / {metricStats.max}
                    </span>
                    <span className="md3-telemetry-stat-sub">{activeMetricConfig.unit} range</span>
                  </div>

                  <div className="md3-telemetry-stat-card">
                    <span className="md3-telemetry-stat-label">Net Shift</span>
                    <span
                      className="md3-telemetry-stat-val"
                      style={{
                        color:
                          metricStats.delta === 0
                            ? 'var(--md-sys-color-on-surface)'
                            : metricStats.delta > 0
                            ? '#b3261e'
                            : '#0f766e',
                      }}
                    >
                      {metricStats.delta > 0 ? `+${metricStats.delta.toFixed(1)}` : metricStats.delta.toFixed(1)} {activeMetricConfig.unit}
                    </span>
                    <span className="md3-telemetry-stat-sub">{metricStats.trajectory}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FLOWSHEET AUDIT LOG TABLE VIEW */}
          {activeView === 'FLOWSHEET' && (
            <div className="md3-flowsheet-table-wrap">
              <table className="md3-flowsheet-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Temp (°C)</th>
                    <th>BP (mmHg)</th>
                    <th>Pulse (bpm)</th>
                    <th>RR (bpm)</th>
                    <th>SpO2</th>
                    <th>AVPU</th>
                    <th>NEWS2</th>
                    <th>Shock Index</th>
                    <th>Nurse</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsList.map((v) => {
                    const tag = getNews2TagStyle(v.news2Score, v.news2RiskLevel);
                    const si = v.shockIndex || (v.heartRate && v.systolicBp ? (v.heartRate / v.systolicBp).toFixed(2) : null);
                    const siAlert = si !== null && si >= 0.9;
                    return (
                      <tr key={v._id || v.id}>
                        <td>
                          {v.recordedAt
                            ? `${new Date(v.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                          {v.isCorrection && (
                            <span className="md3-flowsheet-corr-badge" title={v.correctionReason || 'Corrected record'}>
                              CORR
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{v.temperature ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{v.heartRate ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>{v.respirationRate ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {v.spO2 ?? '—'}% {v.oxygenTherapy ? `(O2 ${v.oxygenFlowRateLpm || ''}L)` : ''}
                        </td>
                        <td>{v.avpu || 'ALERT'}</td>
                        <td>
                          <span
                            style={{
                              background: tag.bg,
                              color: tag.color,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                            }}
                          >
                            {v.news2Score ?? 0}
                          </span>
                        </td>
                        <td>
                          {si ? (
                            <span
                              style={{
                                color: siAlert ? 'var(--md-sys-color-error, #ba1a1a)' : 'inherit',
                                fontWeight: siAlert ? 700 : 500,
                              }}
                            >
                              {si} {siAlert ? '⚠️' : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ color: 'var(--md-sys-color-outline)' }}>
                          {v.recordedBy?.firstName || 'Nurse'}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.clinicalNotes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VitalsMonitorCard;
