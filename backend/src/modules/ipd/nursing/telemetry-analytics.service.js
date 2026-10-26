/**
 * modules/ipd/nursing/telemetry-analytics.service.js
 * Longitudinal Telemetry Analytics & Multi-Parameter Time-Series Vector Engine.
 * Adheres to ACID query standards, SOLID principles, and provides deterministic mathematical vectors for SVG rendering.
 */

// Canonical Normal Physiological Target Ranges (Adult Inpatient Gold Standards)
const PHYSIOLOGICAL_TARGET_BANDS = Object.freeze({
  temperature: { min: 36.5, max: 37.5, unit: '°C', label: 'Body Temp', warnLow: 36.0, warnHigh: 38.0 },
  systolicBp: { min: 90, max: 130, unit: 'mmHg', label: 'Systolic BP', warnLow: 90, warnHigh: 140 },
  diastolicBp: { min: 60, max: 85, unit: 'mmHg', label: 'Diastolic BP', warnLow: 60, warnHigh: 90 },
  heartRate: { min: 60, max: 100, unit: 'bpm', label: 'Pulse / Heart Rate', warnLow: 50, warnHigh: 110 },
  respirationRate: { min: 12, max: 20, unit: 'bpm', label: 'Respiration Rate', warnLow: 10, warnHigh: 24 },
  spO2: { min: 95, max: 100, unit: '%', label: 'Oxygen Saturation', warnLow: 92, warnHigh: 100 },
  news2Score: { min: 0, max: 4, unit: 'pts', label: 'NEWS2 Risk Score', warnLow: 0, warnHigh: 5 },
  shockIndex: { min: 0.5, max: 0.7, unit: '', label: 'Shock Index (HR/SysBP)', warnLow: 0.5, warnHigh: 0.9 },
});

class TelemetryAnalyticsService {
  /**
   * Filters vitals records by time window.
   * @param {Array} rawRecords Chronological or reverse records
   * @param {string} windowCode E.g. '8H', '24H', '72H', 'ALL'
   * @returns {Array} Filtered records sorted chronologically ascending
   */
  filterByWindow(rawRecords = [], windowCode = '24H') {
    if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];

    const now = new Date();
    let cutoff = null;

    if (windowCode === '8H') {
      cutoff = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    } else if (windowCode === '24H') {
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (windowCode === '72H') {
      cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    }

    const filtered = cutoff
      ? rawRecords.filter((r) => r.recordedAt && new Date(r.recordedAt) >= cutoff)
      : [...rawRecords];

    // Guarantee strictly ascending chronological sort for vector plotting
    return filtered.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }

  /**
   * Calculates summary statistics for a given numerical parameter across the series.
   * @param {Array} records
   * @param {string} key
   * @returns {object} Summary stats
   */
  calculateParamStats(records = [], key) {
    const valid = records
      .map((r) => r[key])
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    if (valid.length === 0) {
      return { min: null, max: null, avg: null, latest: null, delta: 0, trend: 'STABLE' };
    }

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const sum = valid.reduce((acc, v) => acc + v, 0);
    const avg = Math.round((sum / valid.length) * 10) / 10;
    const latest = valid[valid.length - 1];
    const earliest = valid[0];
    const delta = Math.round((latest - earliest) * 10) / 10;

    let trend = 'STABLE';
    if (Math.abs(delta) > 0.05 * (avg || 1)) {
      trend = delta > 0 ? 'RISING' : 'FALLING';
    }

    return { min, max, avg, latest, delta, trend, sampleCount: valid.length };
  }

  /**
   * Builds the comprehensive telemetry payload for frontend SVG charting and analysis.
   * @param {Array} rawRecords
   * @param {string} windowCode
   * @returns {object}
   */
  generateTelemetryPayload(rawRecords = [], windowCode = '24H') {
    const windowRecords = this.filterByWindow(rawRecords, windowCode);

    // Build synchronized time-series data points
    const series = windowRecords.map((r) => {
      const dt = new Date(r.recordedAt);
      const hr = r.heartRate || null;
      const sbp = r.systolicBp || null;
      const calculatedShockIndex = hr && sbp && sbp > 0 ? Math.round((hr / sbp) * 100) / 100 : null;

      return {
        id: r._id || r.id,
        timestamp: dt.toISOString(),
        timeLabel: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        dateLabel: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        temperature: r.temperature ?? null,
        systolicBp: r.systolicBp ?? null,
        diastolicBp: r.diastolicBp ?? null,
        pulsePressure: r.systolicBp && r.diastolicBp ? r.systolicBp - r.diastolicBp : null,
        heartRate: r.heartRate ?? null,
        respirationRate: r.respirationRate ?? null,
        spO2: r.spO2 ?? null,
        oxygenTherapy: !!r.oxygenTherapy,
        oxygenFlowRateLpm: r.oxygenFlowRateLpm || 0,
        avpu: r.avpu || 'ALERT',
        news2Score: r.news2Score ?? 0,
        news2RiskLevel: r.news2RiskLevel || 'LOW',
        shockIndex: r.shockIndex ?? calculatedShockIndex,
        shockIndexAlert: r.shockIndexAlert || (calculatedShockIndex !== null && calculatedShockIndex >= 0.9),
        nurseName: r.recordedBy?.firstName ? `${r.recordedBy.firstName} ${r.recordedBy.lastName || ''}`.trim() : 'Nurse',
        clinicalNotes: r.clinicalNotes || '',
      };
    });

    // Compute parameter-level statistical summaries
    const summaries = {
      temperature: this.calculateParamStats(series, 'temperature'),
      systolicBp: this.calculateParamStats(series, 'systolicBp'),
      diastolicBp: this.calculateParamStats(series, 'diastolicBp'),
      heartRate: this.calculateParamStats(series, 'heartRate'),
      respirationRate: this.calculateParamStats(series, 'respirationRate'),
      spO2: this.calculateParamStats(series, 'spO2'),
      news2Score: this.calculateParamStats(series, 'news2Score'),
      shockIndex: this.calculateParamStats(series, 'shockIndex'),
    };

    // Calculate Latest Shock Index Flag
    const latestReading = series[series.length - 1] || null;
    const isShockIndexElevated = latestReading?.shockIndexAlert || false;

    return {
      window: windowCode,
      totalReadingsInWindow: series.length,
      latestReading,
      isShockIndexElevated,
      targetBands: PHYSIOLOGICAL_TARGET_BANDS,
      summaries,
      series,
    };
  }
}

module.exports = new TelemetryAnalyticsService();
module.exports.PHYSIOLOGICAL_TARGET_BANDS = PHYSIOLOGICAL_TARGET_BANDS;
