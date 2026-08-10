import React from 'react';
import {
  Md3Section, Md3Grid, Md3GridItem, Md3StatCard, Icon, Md3InfoRow, Md3Chip, Md3EmptyState,
} from '../../components/md3/Md3Widgets';

const camelToWords = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
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

const TriageVitalsPanel = ({ vitals }) => {
  const hasVitals = vitals && Object.keys(vitals).some((key) => vitals[key] !== null && vitals[key] !== undefined && vitals[key] !== '');

  if (!hasVitals) {
    return (
      <Md3Section
        title="Triage Vitals"
        subtitle="Nursing Assessment & Check-in Vitals"
        icon={<Icon.Heart />}
        variant="default"
        className="triage-vitals-panel"
      >
        <Md3EmptyState
          icon={<Icon.Heart />}
          title="Vitals Pending Nursing Triage"
          subtitle="Check-in vitals have not been recorded yet. You may proceed with the consultation or record notes directly below."
          variant="tonal"
        />
      </Md3Section>
    );
  }

  const bmiData = calculateBmi(vitals.weight, vitals.height);
  const hasDynamic = vitals.dynamicVitals && Object.keys(vitals.dynamicVitals).length > 0;

  return (
    <Md3Section
      title="Triage Vitals"
      subtitle="Recorded at check-in by nursing staff"
      icon={<Icon.Heart />}
      variant="highlight"
      className="triage-vitals-panel"
    >
      <Md3Grid columns={4} gap="default" className="triage-vitals__vitals-grid">
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.BloodPressure />}
            label="Blood Pressure"
            value={vitals.bloodPressure || '—'}
            variant="default"
          />
        </Md3GridItem>
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.ThermoStat />}
            label="Temperature"
            value={vitals.temperature ? `${vitals.temperature}°F` : '—'}
            variant="secondary"
          />
        </Md3GridItem>
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.Pulse />}
            label="Pulse"
            value={vitals.pulse ? `${vitals.pulse} bpm` : '—'}
            variant="tertiary"
          />
        </Md3GridItem>
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.Activity />}
            label="SpO2"
            value={vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : '—'}
            variant="error"
          />
        </Md3GridItem>
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.Scale />}
            label="Weight"
            value={vitals.weight ? `${vitals.weight} kg` : '—'}
            variant="default"
          />
        </Md3GridItem>
        <Md3GridItem>
          <Md3StatCard
            icon={<Icon.Ruler />}
            label="Height"
            value={vitals.height ? `${vitals.height} cm` : '—'}
            variant="default"
          />
        </Md3GridItem>
        <Md3GridItem span={2}>
          <Md3StatCard
            icon={<Icon.Heart />}
            label="Calculated BMI"
            value={
              bmiData ? (
                <div className="triage-vitals__bmi-stack">
                  <span className="triage-vitals__bmi-value">{bmiData.bmi}</span>
                  <Md3Chip variant={bmiData.variant} size="small">
                    {bmiData.category}
                  </Md3Chip>
                </div>
              ) : (
                '—'
              )
            }
            variant="tertiary"
          />
        </Md3GridItem>
      </Md3Grid>

      {vitals.chiefComplaint && (
        <Md3InfoRow
          icon={<Icon.Alert />}
          label="Triage Chief Complaint"
          value={vitals.chiefComplaint}
          className="triage-vitals__complaint"
        />
      )}

      {hasDynamic && (
        <>
          <div className="triage-vitals__divider" />
          <div className="triage-vitals__dynamic-section">
            <span className="triage-vitals__dynamic-label">
              Department Specific Assessment
            </span>
            <Md3Grid columns={1} gap="small" className="triage-vitals__dynamic-grid">
              {Object.entries(vitals.dynamicVitals).map(([key, value]) => {
                const displayValue =
                  typeof value === 'boolean'
                    ? value
                      ? 'Yes'
                      : 'No'
                    : value !== null && value !== undefined
                    ? String(value)
                    : '—';
                return (
                  <Md3GridItem key={key}>
                    <Md3InfoRow label={camelToWords(key)} value={displayValue} />
                  </Md3GridItem>
                );
              })}
            </Md3Grid>
          </div>
        </>
      )}
    </Md3Section>
  );
};

export default TriageVitalsPanel;
