import React, { useMemo } from 'react';
import {
  Icon, Md3Chip, Md3EmptyState,
} from '../../components/md3/Md3Widgets';

const decodeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

const STANDARD_VITAL_KEYS = new Set([
  'BP', 'BLOODPRESSURE', 'BLOOD_PRESSURE',
  'PULSE', 'PULSERATE', 'PULSE_RATE', 'HEART_RATE',
  'TEMP', 'TEMPERATURE',
  'SPO2', 'SPO2LEVEL', 'SPO2_LEVEL', 'OXYGEN_SATURATION', 'OXYGENSATURATION',
  'RESP_RATE', 'RESPIRATORY_RATE', 'RESPIRATORYRATE',
  'HEIGHT', 'WEIGHT', 'BODY_WEIGHT', 'BODYWEIGHT',
  'BMI', 'CALCULATED_BMI',
  'CHIEF_COMPLAINT', 'CHIEFCOMPLAINT'
]);

const isStandardVitalKey = (rawKey) => {
  if (!rawKey) return false;
  const clean = String(rawKey).toUpperCase().replace(/[\s_\-]/g, '');
  return STANDARD_VITAL_KEYS.has(clean) || STANDARD_VITAL_KEYS.has(String(rawKey).toUpperCase());
};

const formatVitalKey = (key) => {
  if (!key) return '';
  const keyUpper = key.toUpperCase();
  const map = {
    BP: 'Blood Pressure',
    PULSE: 'Pulse Rate',
    TEMP: 'Temperature',
    SPO2: 'SpO2 Level',
    RESP_RATE: 'Respiratory Rate',
    RESPIRATORY_RATE: 'Respiratory Rate',
    HEIGHT: 'Height',
    WEIGHT: 'Weight',
    CHIEF_COMPLAINT: 'Chief Complaint',
    PAIN_SCALE: 'Pain Scale (0-10)',
    PAINSCALE: 'Pain Scale (0-10)',
    BLOOD_SUGAR: 'Blood Glucose (Sugar)',
    SUGAR: 'Blood Glucose (Sugar)',
    RBS: 'Random Blood Sugar (RBS)',
    FBS: 'Fasting Blood Sugar (FBS)',
  };
  if (map[keyUpper]) return map[keyUpper];

  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

const formatVitalValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const k = key.toLowerCase();
  const v = String(value).trim();
  if (k.includes('pain') && !v.includes('/')) return `${v} / 10`;
  if ((k.includes('sugar') || k.includes('glucose') || k.includes('rbs') || k.includes('fbs')) && !v.toLowerCase().includes('mg')) return `${v} mg/dL`;
  return v;
};

const calculateBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = (weightKg / (heightM * heightM)).toFixed(1);
  const num = parseFloat(bmi);

  let category = 'Normal';
  let variant = 'success';

  if (num < 18.5) {
    category = 'Underweight';
    variant = 'tertiary';
  } else if (num >= 18.5 && num < 25) {
    category = 'Normal';
    variant = 'success';
  } else if (num >= 25 && num < 30) {
    category = 'Overweight';
    variant = 'secondary';
  } else {
    category = 'Obese';
    variant = 'error';
  }

  return { bmi, category, variant };
};

const TriageVitalsPanel = ({ vitals = {} }) => {
  const hasVitals = vitals && Object.keys(vitals).some((key) => vitals[key] !== null && vitals[key] !== undefined && vitals[key] !== '');

  const bmiData = calculateBmi(vitals.weight, vitals.height);

  // Filter department-specific vitals that are not already present in the standard 2x4 matrix
  const dynamicEntries = useMemo(() => {
    if (!vitals?.dynamicVitals || typeof vitals.dynamicVitals !== 'object') return [];
    return Object.entries(vitals.dynamicVitals).filter(([key, val]) => {
      if (val === null || val === undefined || val === '') return false;
      return !isStandardVitalKey(key);
    });
  }, [vitals?.dynamicVitals]);

  const hasDynamic = dynamicEntries.length > 0;

  return (
    <div className="summary-card">
      <div className="summary-card__header">
        <div className="summary-card__title-wrap">
          <span className="summary-card__icon error">
            <Icon.Heart size={18} />
          </span>
          <div>
            <h4 className="summary-card__title">Triage Vitals &amp; Clinical Measurements</h4>
            <p className="summary-card__subtitle">Recorded at check-in triage by nursing staff</p>
          </div>
        </div>
        <Md3Chip variant="default" size="small">
          {hasVitals ? '✓ Vitals Recorded' : 'Pending Triage'}
        </Md3Chip>
      </div>

      {!hasVitals ? (
        <div className="summary-card__empty">
          <Icon.Heart size={28} />
          <p className="summary-card__empty-title">No Vitals Recorded</p>
          <p className="summary-card__empty-sub">
            Check-in vitals have not been logged for this visit yet.
          </p>
        </div>
      ) : (
        <div className="summary-card__body">
          {/* ── 2x4 Symmetric Vitals Grid ── */}
          <div className="triage-vitals-matrix">
            {/* Blood Pressure */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon default">
                <Icon.BloodPressure size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Blood Pressure</span>
                <span className="triage-tile-val">{vitals.bloodPressure || '—'}</span>
              </div>
            </div>

            {/* Heart Rate / Pulse */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon tertiary">
                <Icon.Pulse size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Pulse Rate</span>
                <span className="triage-tile-val">{vitals.pulse ? `${vitals.pulse} bpm` : '—'}</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon secondary">
                <Icon.ThermoStat size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Temperature</span>
                <span className="triage-tile-val">{vitals.temperature ? `${vitals.temperature}°F` : '—'}</span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon error">
                <Icon.Activity size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Oxygen (SpO2)</span>
                <span className="triage-tile-val">{vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : '—'}</span>
              </div>
            </div>

            {/* Weight */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon default">
                <Icon.Scale size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Body Weight</span>
                <span className="triage-tile-val">{vitals.weight ? `${vitals.weight} kg` : '—'}</span>
              </div>
            </div>

            {/* Height */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon default">
                <Icon.Ruler size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Height</span>
                <span className="triage-tile-val">{vitals.height ? `${vitals.height} cm` : '—'}</span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon secondary">
                <Icon.Activity size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Respiratory Rate</span>
                <span className="triage-tile-val">
                  {vitals.respiratoryRate ? `${vitals.respiratoryRate} /min` : (vitals.dynamicVitals?.RESP_RATE || '—')}
                </span>
              </div>
            </div>

            {/* BMI */}
            <div className="triage-vital-tile">
              <div className="triage-tile-icon tertiary">
                <Icon.Heart size={16} />
              </div>
              <div className="triage-tile-info">
                <span className="triage-tile-label">Calculated BMI</span>
                <div className="triage-bmi-wrap">
                  <span className="triage-tile-val">{bmiData ? bmiData.bmi : '—'}</span>
                  {bmiData && (
                    <Md3Chip variant={bmiData.variant} size="small">
                      {bmiData.category}
                    </Md3Chip>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Chief Complaint Banner ── */}
          {vitals.chiefComplaint && (
            <div className="summary-complaint-box">
              <div className="summary-complaint-icon">
                <Icon.Alert size={16} />
              </div>
              <div className="summary-complaint-content">
                <span className="summary-complaint-label">Triage Chief Complaint</span>
                <span className="summary-complaint-text">{decodeHtml(vitals.chiefComplaint)}</span>
              </div>
            </div>
          )}

          {/* ── Dynamic Department Specific Vitals (if any) ── */}
          {hasDynamic && (
            <div className="summary-dynamic-box">
              <span className="summary-dynamic-title">
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>assignment</span>
                Department Specific Assessment
              </span>
              <div className="summary-dynamic-grid">
                {dynamicEntries.map(([key, value]) => (
                  <div key={key} className="summary-dynamic-item">
                    <span className="summary-dynamic-key">{formatVitalKey(key)}</span>
                    <span className="summary-dynamic-val">{formatVitalValue(key, value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TriageVitalsPanel;
