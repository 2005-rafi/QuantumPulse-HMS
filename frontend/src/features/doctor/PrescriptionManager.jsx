import React, { useState } from 'react';
import {
  Md3Section, Icon, Md3IconButton, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';

const DEFAULT_MED_INPUT = {
  name: '',
  dose: '',
  timing: 'AFTER_FOOD',
};

const PRETTY_TIMING = {
  BEFORE_FOOD: 'Before Food',
  AFTER_FOOD: 'After Food',
  'N/A': 'N/A',
};

const PrescriptionManager = ({
  medications = [],
  onMedicationsChange,
}) => {
  const [medInput, setMedInput] = useState({ ...DEFAULT_MED_INPUT });

  const setField = (field, value) => {
    setMedInput((prev) => ({ ...prev, [field]: value }));
  };

  const parseDoseCode = (code) => {
    const parts = code.split('-').map((v) => parseInt(v.trim()) || 0);
    return {
      morning: parts[0] || 0,
      afternoon: parts[1] || 0,
      night: parts[2] || 0,
    };
  };

  const addMedication = () => {
    if (!medInput.name.trim() || !medInput.dose.trim()) return;

    const { morning, afternoon, night } = parseDoseCode(medInput.dose);
    const medObj = {
      name: medInput.name.trim(),
      dosageSchedule: {
        morning: { count: morning, timing: morning > 0 ? medInput.timing : 'N/A' },
        afternoon: { count: afternoon, timing: afternoon > 0 ? medInput.timing : 'N/A' },
        night: { count: night, timing: night > 0 ? medInput.timing : 'N/A' },
      },
    };
    onMedicationsChange([...medications, medObj]);
    setMedInput({ ...DEFAULT_MED_INPUT });
  };

  const removeMedication = (index) => {
    onMedicationsChange(medications.filter((_, i) => i !== index));
  };

  return (
    <Md3Section
      title="Prescriptions"
      icon={<Icon.Pill />}
    >
      <div className="rx-entry-row">
        <div className="rx-entry-row__name">
          <Md3TextField
            id="med-name"
            name="name"
            label="Medicine Name"
            value={medInput.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Amoxicillin 500mg"
          />
        </div>
        <div className="rx-entry-row__dose">
          <Md3TextField
            id="med-dose"
            name="dose"
            label="Dosage (M-A-N)"
            value={medInput.dose}
            onChange={(e) => setField('dose', e.target.value)}
            placeholder="1-0-1"
          />
        </div>
        <div className="rx-entry-row__timing">
          <Md3Select
            id="med-timing"
            name="timing"
            label="Timing"
            value={medInput.timing}
            onChange={(e) => setField('timing', e.target.value)}
          >
            <option value="AFTER_FOOD">After Food</option>
            <option value="BEFORE_FOOD">Before Food</option>
          </Md3Select>
        </div>
        <div className="rx-entry-row__btn">
          <Md3Button
            variant="filled"
            onClick={addMedication}
            disabled={!medInput.name.trim() || !medInput.dose.trim()}
          >
            Add
          </Md3Button>
        </div>
      </div>

      {medications.length > 0 && (
        <ul className="rx-list">
          {medications.map((m, i) => {
            const name = typeof m === 'string' ? m : (m.name || 'Medication');
            const ds = typeof m === 'object' && m.dosageSchedule ? m.dosageSchedule : null;
            return (
              <li key={i} className="rx-row">
                <div className="rx-row__info">
                  <span className="rx-row__name">{name}</span>
                  {ds && (
                    <Md3Chip variant="secondary" size="small" icon={<Icon.Clock />}>
                      {formatDosageSummary(ds)}
                    </Md3Chip>
                  )}
                </div>
                <Md3IconButton
                  icon={<Icon.Remove />}
                  onClick={() => removeMedication(i)}
                  variant="standard"
                  size="small"
                  ariaLabel={`Remove ${name}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Md3Section>
  );
};

const formatDosageSummary = (ds) => {
  if (!ds) return '';
  const m = ds.morning?.count ?? 0;
  const a = ds.afternoon?.count ?? 0;
  const n = ds.night?.count ?? 0;
  const timing = ds.morning?.timing && ds.morning?.timing !== 'N/A'
    ? PRETTY_TIMING[ds.morning.timing]
    : (ds.night?.timing && ds.night?.timing !== 'N/A' ? PRETTY_TIMING[ds.night.timing] : '');
  const timingStr = timing ? ` (${timing})` : '';
  return `${m}-${a}-${n}${timingStr}`;
};

export default PrescriptionManager;
