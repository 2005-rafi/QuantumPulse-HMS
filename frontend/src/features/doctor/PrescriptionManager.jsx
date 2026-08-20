import React, { useState } from 'react';
import {
  Icon, Md3IconButton, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';

const DEFAULT_MED_INPUT = {
  name: '',
  morning: '1',
  afternoon: '0',
  night: '1',
  timing: 'AFTER_FOOD',
  duration: '5 Days',
};

const TIMING_LABELS = {
  AFTER_FOOD: 'After Food',
  BEFORE_FOOD: 'Before Food',
  WITH_FOOD: 'With Food',
  EMPTY_STOMACH: 'Empty Stomach',
  BEDTIME: 'At Bedtime',
};

const PrescriptionManager = ({
  medications = [],
  onMedicationsChange,
}) => {
  const [medInput, setMedInput] = useState({ ...DEFAULT_MED_INPUT });

  const setField = (field, value) => {
    setMedInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumericDose = (field, rawValue) => {
    // Strictly accept only numbers or decimals
    const sanitized = rawValue.replace(/[^0-9.]/g, '');
    setMedInput((prev) => ({ ...prev, [field]: sanitized }));
  };

  const addMedication = () => {
    const medName = medInput.name.trim();
    if (!medName) return;

    const m = parseFloat(medInput.morning) || 0;
    const a = parseFloat(medInput.afternoon) || 0;
    const n = parseFloat(medInput.night) || 0;

    // Require at least one non-zero dosage
    if (m === 0 && a === 0 && n === 0) return;

    const medObj = {
      name: medName,
      dosageSummary: `${m}-${a}-${n}`,
      duration: medInput.duration?.trim() || '5 Days',
      timing: medInput.timing,
      dosageSchedule: {
        morning: { count: m, timing: m > 0 ? medInput.timing : 'N/A' },
        afternoon: { count: a, timing: a > 0 ? medInput.timing : 'N/A' },
        night: { count: n, timing: n > 0 ? medInput.timing : 'N/A' },
      },
    };

    onMedicationsChange([...medications, medObj]);
    setMedInput({
      ...DEFAULT_MED_INPUT,
      name: '',
    });
  };

  const removeMedication = (index) => {
    onMedicationsChange(medications.filter((_, i) => i !== index));
  };

  const hasValidDose = (parseFloat(medInput.morning) || 0) > 0 ||
                       (parseFloat(medInput.afternoon) || 0) > 0 ||
                       (parseFloat(medInput.night) || 0) > 0;

  return (
    <div className="rx-manager-card">
      <div className="rx-manager-header">
        <div className="rx-manager-title-wrap">
          <span className="rx-manager-icon">
            <Icon.Pill size={20} />
          </span>
          <div>
            <h4 className="rx-manager-title">Prescription & Medication Orders</h4>
            <p className="rx-manager-subtitle">Formulate structured dosing schedule and clinical instructions</p>
          </div>
        </div>
        <Md3Chip variant="default" size="small">
          {medications.length} Prescribed
        </Md3Chip>
      </div>

      {/* ── Single-Line Linear Prescription Composer ── */}
      <div className="rx-linear-composer">
        {/* 1. Medicine Name */}
        <div className="rx-col-name">
          <Md3TextField
            id="rx-med-name"
            name="name"
            label="Medicine / Generic Name *"
            value={medInput.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Amoxicillin 500mg, Paracetamol 650mg"
            leadingIcon={<Icon.Pill size={16} />}
          />
        </div>

        {/* 2. Structured 3-Part Dosage (Morning - Afternoon - Night) */}
        <div className="rx-col-dosage-cluster">
          <span className="rx-cluster-label">Dosage (M - A - N) *</span>
          <div className="rx-dosage-segments">
            {/* Morning */}
            <div className="rx-dose-tile">
              <span className="rx-dose-icon morning">
                <Icon.Sun size={14} />
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="rx-dose-input"
                value={medInput.morning}
                onChange={(e) => handleNumericDose('morning', e.target.value)}
                placeholder="1"
                aria-label="Morning Dosage"
                title="Morning Dosage (Numbers Only)"
              />
              <span className="rx-dose-caption">Morn</span>
            </div>

            <span className="rx-dose-separator">-</span>

            {/* Afternoon */}
            <div className="rx-dose-tile">
              <span className="rx-dose-icon noon">
                <Icon.WbSunny size={14} />
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="rx-dose-input"
                value={medInput.afternoon}
                onChange={(e) => handleNumericDose('afternoon', e.target.value)}
                placeholder="0"
                aria-label="Afternoon Dosage"
                title="Afternoon Dosage (Numbers Only)"
              />
              <span className="rx-dose-caption">Noon</span>
            </div>

            <span className="rx-dose-separator">-</span>

            {/* Night */}
            <div className="rx-dose-tile">
              <span className="rx-dose-icon night">
                <Icon.Moon size={14} />
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="rx-dose-input"
                value={medInput.night}
                onChange={(e) => handleNumericDose('night', e.target.value)}
                placeholder="1"
                aria-label="Night Dosage"
                title="Night Dosage (Numbers Only)"
              />
              <span className="rx-dose-caption">Night</span>
            </div>
          </div>
        </div>

        {/* 3. Meal Timing */}
        <div className="rx-col-timing">
          <Md3Select
            id="rx-med-timing"
            name="timing"
            label="Meal Timing"
            value={medInput.timing}
            onChange={(e) => setField('timing', e.target.value)}
          >
            <option value="AFTER_FOOD">After Food</option>
            <option value="BEFORE_FOOD">Before Food</option>
            <option value="WITH_FOOD">With Food</option>
            <option value="EMPTY_STOMACH">Empty Stomach</option>
            <option value="BEDTIME">At Bedtime</option>
          </Md3Select>
        </div>

        {/* 4. Duration */}
        <div className="rx-col-duration">
          <Md3TextField
            id="rx-med-duration"
            name="duration"
            label="Duration"
            value={medInput.duration}
            onChange={(e) => setField('duration', e.target.value)}
            placeholder="5 Days"
          />
        </div>

        {/* 5. Add Action Button */}
        <div className="rx-col-btn">
          <button
            type="button"
            className="rx-add-btn"
            onClick={addMedication}
            disabled={!medInput.name.trim() || !hasValidDose}
            title="Add Medication to Prescription"
          >
            <Icon.Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ── Active Prescribed Medications List ── */}
      {medications.length > 0 ? (
        <ul className="rx-active-list">
          {medications.map((m, i) => {
            const medName = typeof m === 'string' ? m : (m.name || 'Medication');
            const ds = typeof m === 'object' && m.dosageSchedule ? m.dosageSchedule : null;
            const timing = typeof m === 'object' && m.timing ? m.timing : 'AFTER_FOOD';
            const duration = typeof m === 'object' && m.duration ? m.duration : '5 Days';
            const dosageSummary = formatDosageSummary(ds, m);

            return (
              <li key={i} className="rx-active-card">
                <div className="rx-active-card__left">
                  <span className="rx-active-card__icon">
                    <Icon.Pill size={18} />
                  </span>
                  <div className="rx-active-card__details">
                    <span className="rx-active-card__name">{medName}</span>
                    <div className="rx-active-card__tags">
                      <span className="rx-badge dosage">
                        <Icon.Clock size={12} />
                        <span>{dosageSummary}</span>
                      </span>
                      <span className="rx-badge timing">
                        <span>{TIMING_LABELS[timing] || timing}</span>
                      </span>
                      {duration && (
                        <span className="rx-badge duration">
                          <Icon.Calendar size={12} />
                          <span>{duration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rx-active-card__right">
                  <Md3IconButton
                    icon={<Icon.Remove />}
                    onClick={() => removeMedication(i)}
                    variant="standard"
                    size="small"
                    ariaLabel={`Remove ${medName}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rx-empty-state">
          <Icon.Pill size={24} />
          <p className="rx-empty-text">No medications added to prescription yet. Fill in medicine name, morning/afternoon/night dosage, and click Add.</p>
        </div>
      )}
    </div>
  );
};

const formatDosageSummary = (ds, m) => {
  if (m?.dosageSummary) return m.dosageSummary;
  if (!ds) return '1-0-1';
  const morning = ds.morning?.count ?? 0;
  const noon = ds.afternoon?.count ?? 0;
  const night = ds.night?.count ?? 0;
  return `${morning}-${noon}-${night}`;
};

export default PrescriptionManager;
