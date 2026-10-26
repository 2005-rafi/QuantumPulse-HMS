import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select, Md3Checkbox } from './Md3FormComponents';

// Clinical Specialty Presets for quick department setup per docs/staffing departments.md
const CLINICAL_PRESETS = {
  Cardiology: [
    { label: 'Mean Arterial Pressure (MAP)', type: 'number', unit: 'mmHg', min: 40, max: 160, clinicalPurpose: 'Evaluates organ perfusion pressure in cardiac failure/shock.', required: true },
    { label: 'ECG Rhythm Status', type: 'select', unit: '', options: ['Normal Sinus', 'Atrial Fibrillation', 'Sinus Tachycardia', 'Bradycardia', 'Ectopics'], clinicalPurpose: 'Screen for dysrhythmias and cardiac rhythm abnormalities.', required: true },
    { label: 'Jugular Venous Pulse', type: 'select', unit: '', options: ['Normal (<3cm)', 'Elevated (3-5cm)', 'Markedly Engorged (>5cm)'], clinicalPurpose: 'Estimation of central venous pressure and right ventricular overload.', required: true },
    { label: 'Peripheral Pulse Volume', type: 'select', unit: '', options: ['Bounding (4+)', 'Normal (3+)', 'Weak/Thready (1+)', 'Absent (0)'], clinicalPurpose: 'Assessment of cardiac output, peripheral vascular tone and systemic perfusion.', required: false },
  ],
  General: [
    { label: 'Random Blood Sugar (RBS)', type: 'number', unit: 'mg/dL', min: 30, max: 600, clinicalPurpose: 'Immediate detection of diabetic ketoacidosis or hypoglycaemia.', required: true },
    { label: 'Body Mass Index (BMI)', type: 'number', unit: 'kg/m²', min: 10, max: 65, clinicalPurpose: 'Obesity assessment and nutritional stratification.', required: false },
    { label: 'Waist-to-Hip Ratio', type: 'number', unit: 'ratio', min: 0.4, max: 2.5, clinicalPurpose: 'Visceral adiposity and cardiovascular risk indicator.', required: false },
    { label: 'Pain Score (VAS 1-10)', type: 'number', unit: '1-10', min: 1, max: 10, clinicalPurpose: 'Subjective acute/chronic somatic and visceral pain quantification.', required: false },
  ],
  Pulmonology: [
    { label: 'Peak Expiratory Flow (PEFR)', type: 'number', unit: 'L/min', min: 40, max: 850, clinicalPurpose: 'Bronchial obstruction assessment in acute asthma and COPD.', required: true },
    { label: 'Fraction of Inspired O2 (FiO2)', type: 'number', unit: '%', min: 21, max: 100, clinicalPurpose: 'Ambient air (21%) vs Supplemental O2 nasal cannula or BiPAP.', required: true },
    { label: 'Work of Breathing', type: 'select', unit: '', options: ['Normal / Eupneic', 'Mild Accessory Muscle Use', 'Severe Retractions / Gasping'], clinicalPurpose: 'Respiratory muscle fatigue, accessory muscle engagement and dyspnoea severity.', required: true },
    { label: '6-Minute Walk Distance', type: 'number', unit: 'meters', min: 0, max: 1000, clinicalPurpose: 'Exercise tolerance in interstitial lung disease and pulmonary hypertension.', required: false },
  ],
  Nephrology: [
    { label: '24-Hour Urine Output', type: 'number', unit: 'mL/24h', min: 0, max: 6000, clinicalPurpose: 'Detection of oliguria (<400mL), anuria (<100mL) or polyuria.', required: true },
    { label: 'Dry Weight Target', type: 'number', unit: 'kg', min: 15, max: 220, clinicalPurpose: 'Target normovolemic body weight post-dialysis session.', required: true },
    { label: 'Interdialytic Weight Gain (IDWG)', type: 'number', unit: 'kg', min: 0, max: 15, clinicalPurpose: 'Fluid accumulation between successive haemodialysis cycles.', required: true },
    { label: 'Pedal Edema Assessment', type: 'select', unit: '', options: ['Nil (0)', 'Mild 1+ (2mm)', 'Moderate 2+ (4mm)', 'Severe 3+ (6mm)', 'Brawny 4+ (8mm)'], clinicalPurpose: 'Assessment of interstitial volume expansion and peripheral venous congestion.', required: true },
  ],
  Pediatrics: [
    { label: 'Head Circumference', type: 'number', unit: 'cm', min: 25, max: 60, clinicalPurpose: 'Neurodevelopmental monitoring and micro/macrocephaly detection.', required: true },
    { label: 'Mid-Upper Arm Circumference (MUAC)', type: 'number', unit: 'cm', min: 8, max: 25, clinicalPurpose: 'Screening for severe acute malnutrition (SAM) in under-5 age group.', required: false },
    { label: 'Immunization Up-to-Date', type: 'boolean', unit: '', clinicalPurpose: 'Universal immunization schedule compliance and milestone verification.', required: true },
    { label: 'Fontanelle Status', type: 'select', unit: '', options: ['Normal / Flat', 'Bulging', 'Sunken / Depressed'], clinicalPurpose: 'Assessment of intracranial pressure and hydration status in infants.', required: false },
  ],
  Ophthalmology: [
    { label: 'Intraocular Pressure (IOP) Right Eye', type: 'number', unit: 'mmHg', min: 5, max: 60, clinicalPurpose: 'Glaucoma screening and ocular hypertension measurement.', required: false },
    { label: 'Intraocular Pressure (IOP) Left Eye', type: 'number', unit: 'mmHg', min: 5, max: 60, clinicalPurpose: 'Glaucoma screening and ocular hypertension measurement.', required: false },
    { label: 'Visual Acuity Right (OD)', type: 'text', unit: 'Snellen', clinicalPurpose: 'Distance visual acuity assessment for refractive errors.', required: false },
    { label: 'Visual Acuity Left (OS)', type: 'text', unit: 'Snellen', clinicalPurpose: 'Distance visual acuity assessment for refractive errors.', required: false },
  ],
};

const COMMON_UNITS = ['mg/dL', 'mmHg', 'bpm', '°F', '°C', 'cm', 'kg', 'mL', 'mL/24h', 'L/min', '%', 'kg/m²', 'ratio', 'meters', '1-10', 'Snellen', 'AVPU'];

const slugifyName = (label, existingNames = [], currentName = '') => {
  if (!label) return '';
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  if (!base) return 'vital_field';
  if (currentName && currentName.startsWith(base)) return currentName;

  let name = base;
  let counter = 1;
  while (existingNames.includes(name)) {
    name = `${base}_${counter}`;
    counter++;
  }
  return name;
};

/**
 * Md3DynamicVitalsConfigurator — Pure Material Design 3 Modal Component
 * Allows hospital administrators to configure department-scoped dynamic vitals schemas
 * with rich validation, clinical presets, and responsive layout.
 */
export const Md3DynamicVitalsConfigurator = ({
  department,
  isOpen = true,
  onClose,
  onSave,
}) => {
  const [fields, setFields] = useState(
    () => JSON.parse(JSON.stringify(department?.vitalFields || []))
  );
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  if (!isOpen || !department) return null;

  const handleAddField = (preset = null) => {
    const existingNames = fields.map((f) => f.name);
    const newLabel = preset?.label || '';
    const newName = preset ? slugifyName(newLabel, existingNames) : '';
    
    const newField = {
      name: newName,
      label: newLabel,
      type: preset?.type || 'number',
      unit: preset?.unit || '',
      min: preset?.min !== undefined && preset?.min !== null ? preset.min : '',
      max: preset?.max !== undefined && preset?.max !== null ? preset.max : '',
      options: preset?.options || [],
      clinicalPurpose: preset?.clinicalPurpose || '',
      required: preset?.required || false,
    };

    setFields([...fields, newField]);
    setErrorBanner('');
  };

  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
    setErrorBanner('');
  };

  const handleFieldChange = (index, key, value) => {
    const updated = [...fields];
    updated[index][key] = value;

    if (key === 'label') {
      const otherNames = fields.filter((_, i) => i !== index).map((f) => f.name);
      updated[index].name = slugifyName(value, otherNames);
    }

    setFields(updated);
  };

  const handleApplyPreset = (presetName) => {
    const presetList = CLINICAL_PRESETS[presetName] || [];
    const existingLabels = new Set(fields.map((f) => f.label.toLowerCase().trim()));
    const existingNames = fields.map((f) => f.name);

    const toAdd = presetList.filter((p) => !existingLabels.has(p.label.toLowerCase().trim()));
    if (toAdd.length === 0) {
      setErrorBanner(`All parameters from "${presetName}" preset are already added.`);
      return;
    }

    const newEntries = toAdd.map((p) => ({
      name: slugifyName(p.label, existingNames),
      label: p.label,
      type: p.type,
      unit: p.unit || '',
      min: p.min !== undefined && p.min !== null ? p.min : '',
      max: p.max !== undefined && p.max !== null ? p.max : '',
      options: p.options || [],
      clinicalPurpose: p.clinicalPurpose || '',
      required: p.required || false,
    }));

    setFields([...fields, ...newEntries]);
    setErrorBanner('');
  };

  const handleSave = async () => {
    setErrorBanner('');

    // Validation
    const processedFields = [];
    for (let i = 0; i < fields.length; i++) {
      const f = { ...fields[i] };
      if (!f.label || !f.label.trim()) {
        setErrorBanner(`Parameter #${i + 1} must have a display label.`);
        return;
      }
      if (!f.name || !f.name.trim()) {
        f.name = slugifyName(f.label, fields.filter((_, idx) => idx !== i).map((item) => item.name));
      }

      // Min/Max validation for numeric fields
      if (f.type === 'number') {
        const hasMin = f.min !== '' && f.min !== null && f.min !== undefined;
        const hasMax = f.max !== '' && f.max !== null && f.max !== undefined;
        
        const minNum = hasMin ? Number(f.min) : null;
        const maxNum = hasMax ? Number(f.max) : null;

        if (hasMin && Number.isNaN(minNum)) {
          setErrorBanner(`Parameter "${f.label}": Min value must be a valid number.`);
          return;
        }
        if (hasMax && Number.isNaN(maxNum)) {
          setErrorBanner(`Parameter "${f.label}": Max value must be a valid number.`);
          return;
        }
        if (hasMin && hasMax && minNum > maxNum) {
          setErrorBanner(`Parameter "${f.label}": Min value (${minNum}) cannot be greater than Max value (${maxNum}).`);
          return;
        }

        f.min = hasMin ? minNum : null;
        f.max = hasMax ? maxNum : null;
      } else {
        f.min = null;
        f.max = null;
      }

      // Format options for select
      if (f.type === 'select') {
        if (typeof f.options === 'string') {
          f.options = f.options.split(',').map((s) => s.trim()).filter(Boolean);
        } else if (!Array.isArray(f.options)) {
          f.options = [];
        }
      } else {
        f.options = [];
      }

      // Sanitize clinicalPurpose
      f.clinicalPurpose = typeof f.clinicalPurpose === 'string' ? f.clinicalPurpose.trim() : '';

      processedFields.push(f);
    }

    // Check duplicate machine names
    const names = processedFields.map((f) => f.name.toLowerCase());
    const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
    if (duplicates.length > 0) {
      setErrorBanner(`Duplicate parameter identifier detected: "${duplicates[0]}". Please use unique labels.`);
      return;
    }

    setSaving(true);
    try {
      await onSave(processedFields);
      onClose();
    } catch (err) {
      setErrorBanner(err.response?.data?.message || err.message || 'Failed to update department vitals schema');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.38)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--md-sys-color-surface, #fdf9ec)',
          color: 'var(--md-sys-color-on-surface, #1c1c14)',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: 'calc(100vh - 48px)',
          margin: '0 auto',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
          border: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'md3DialogPop 0.22s cubic-bezier(0.1, 0.9, 0.2, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dialog Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
            background: 'var(--md-sys-color-surface-container-low, #f8f6ea)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'var(--md-sys-color-primary-container, #c2e8ff)',
                color: 'var(--md-sys-color-on-primary-container, #004d67)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '26px' }}>
                monitor_heart
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                  Configure Dynamic Vitals
                </h3>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--md-sys-color-secondary-container)',
                    color: 'var(--md-sys-color-on-secondary-container)',
                  }}
                >
                  {department.code || 'DEPT'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {department.name} · Specialized nurse vital parameters recorded during intake
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
            aria-label="Close dialog"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* ── Dialog Body ── */}
        <div
          style={{
            padding: '24px 28px',
            flex: '1 1 auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overscrollBehavior: 'contain',
          }}
        >
          {/* Error Banner */}
          {errorBanner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'var(--md-sys-color-error-container, #ffdad6)',
                color: 'var(--md-sys-color-error, #ba1a1a)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: '1px solid var(--md-sys-color-error)',
              }}
              role="alert"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>error</span>
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Quick Specialty Presets Bar */}
          <div
            style={{
              background: 'var(--md-sys-color-surface-container-high, #eae7da)',
              padding: '14px 18px',
              borderRadius: '18px',
              border: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>
                  auto_fix_high
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                  Specialty Quick Presets
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                One-click standard clinical schemas
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.keys(CLINICAL_PRESETS).map((presetKey) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => handleApplyPreset(presetKey)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    background: 'var(--md-sys-color-surface)',
                    color: 'var(--md-sys-color-on-surface)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--md-sys-color-primary-container)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--md-sys-color-surface)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-surface)';
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                  <span>{presetKey}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Parameters List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--md-sys-color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>tune</span>
                <span>Configured Clinical Parameters ({fields.length})</span>
              </h4>

              <button
                type="button"
                onClick={() => handleAddField()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>add_circle</span>
                <span>Add Parameter</span>
              </button>
            </div>

            {/* Empty State */}
            {fields.length === 0 ? (
              <div
                style={{
                  padding: '40px 24px',
                  background: 'var(--md-sys-color-surface-container-low)',
                  border: '1.5px dashed var(--md-sys-color-outline-variant)',
                  borderRadius: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--md-sys-color-surface-container-high)',
                    color: 'var(--md-sys-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>vital_signs</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--md-sys-color-on-surface)' }}>
                    No Dynamic Vitals Configured
                  </div>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.8125rem',
                      color: 'var(--md-sys-color-on-surface-variant)',
                      maxWidth: '480px',
                      lineHeight: '1.4',
                    }}
                  >
                    Nurses currently record standard hospital vitals (BP, Pulse, Temp, SpO₂, Height, Weight).
                    Add specialized parameters or load a clinical preset above.
                  </p>
                </div>
                <Md3Button variant="tonal" onClick={() => handleAddField()} style={{ marginTop: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                  <span>Add First Parameter</span>
                </Md3Button>
              </div>
            ) : (
              fields.map((field, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'all 180ms ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* Parameter Card Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--md-sys-color-on-surface)' }}>
                        {field.label || `Parameter #${idx + 1}`}
                      </span>
                      {field.name && (
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8 }}>
                          ({field.name})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background:
                            field.type === 'number'
                              ? 'var(--md-sys-color-secondary-container)'
                              : field.type === 'boolean'
                              ? 'var(--md-sys-color-tertiary-container)'
                              : field.type === 'select'
                              ? 'var(--md-sys-color-primary-container)'
                              : 'var(--md-sys-color-surface-container-high)',
                          color:
                            field.type === 'number'
                              ? 'var(--md-sys-color-on-secondary-container)'
                              : field.type === 'boolean'
                              ? 'var(--md-sys-color-on-tertiary-container)'
                              : field.type === 'select'
                              ? 'var(--md-sys-color-on-primary-container)'
                              : 'var(--md-sys-color-on-surface-variant)',
                        }}
                      >
                        {field.type === 'number' ? 'Numeric' : field.type === 'boolean' ? 'Yes / No' : field.type === 'select' ? 'Dropdown' : 'Text'}
                        {field.unit ? ` · ${field.unit}` : ''}
                        {field.type === 'number' && ((field.min !== '' && field.min !== null && field.min !== undefined) || (field.max !== '' && field.max !== null && field.max !== undefined))
                          ? ` · [${(field.min !== '' && field.min !== null && field.min !== undefined) ? field.min : '—'} to ${(field.max !== '' && field.max !== null && field.max !== undefined) ? field.max : '—'}]`
                          : ''}
                      </span>

                      {field.required && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--md-sys-color-error-container)',
                            color: 'var(--md-sys-color-error)',
                          }}
                        >
                          Mandatory
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--md-sys-color-error)',
                          padding: '4px',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Remove vital parameter"
                        aria-label="Remove parameter"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>delete_outline</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {/* Display Label */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <Md3TextField
                        id={`vital-label-${idx}`}
                        name="label"
                        label="Display Label *"
                        placeholder="e.g. Random Blood Sugar, Intraocular Pressure..."
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      />
                    </div>

                    {/* Type Select */}
                    <div>
                      <Md3Select
                        id={`vital-type-${idx}`}
                        name="type"
                        label="Data Type *"
                        value={field.type}
                        onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                        options={[
                          { value: 'number', label: 'Numeric (Measurement)' },
                          { value: 'text', label: 'Text (Observation)' },
                          { value: 'boolean', label: 'Binary (Yes / No)' },
                          { value: 'select', label: 'Dropdown (Categorical)' },
                        ]}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <Md3TextField
                        id={`vital-unit-${idx}`}
                        name="unit"
                        label="Unit (Optional)"
                        placeholder="e.g. mg/dL, mmHg, °F"
                        value={field.unit || ''}
                        onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                        disabled={field.type === 'boolean'}
                      />
                    </div>

                    {/* Min & Max Inputs (Rendered for Numeric Data Types) */}
                    {field.type === 'number' && (
                      <>
                        <div>
                          <Md3TextField
                            id={`vital-min-${idx}`}
                            name="min"
                            label="Min Value (Optional)"
                            type="number"
                            placeholder="e.g. 30"
                            value={field.min ?? ''}
                            onChange={(e) => handleFieldChange(idx, 'min', e.target.value)}
                          />
                        </div>
                        <div>
                          <Md3TextField
                            id={`vital-max-${idx}`}
                            name="max"
                            label="Max Value (Optional)"
                            type="number"
                            placeholder="e.g. 600"
                            value={field.max ?? ''}
                            onChange={(e) => handleFieldChange(idx, 'max', e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Dropdown Options (Rendered for Select Data Type) */}
                    {field.type === 'select' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <Md3TextField
                          id={`vital-options-${idx}`}
                          name="options"
                          label="Dropdown Options (Comma-separated) *"
                          placeholder="e.g. Normal, Elevated, Critical, Unknown"
                          value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')}
                          onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Clinical Purpose / Medical Rationale */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Md3TextField
                        id={`vital-purpose-${idx}`}
                        name="clinicalPurpose"
                        label="Clinical Purpose / Diagnostic Rationale (Optional)"
                        placeholder="e.g. Immediate detection of diabetic ketoacidosis or hypoglycaemia (guides nurse triage assessment)"
                        value={field.clinicalPurpose || ''}
                        onChange={(e) => handleFieldChange(idx, 'clinicalPurpose', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick Unit Chips & Required Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {field.type !== 'boolean' && field.type !== 'select' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
                          Quick Units:
                        </span>
                        {COMMON_UNITS.slice(0, 10).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleFieldChange(idx, 'unit', u)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--md-sys-color-outline-variant)',
                              background: field.unit === u ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface)',
                              color: field.unit === u ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ marginLeft: 'auto' }}>
                      <Md3Checkbox
                        checked={field.required}
                        onChange={(checked) => handleFieldChange(idx, 'required', checked)}
                        label="Mandatory at Nurse Intake"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Dialog Footer (Pinned) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 28px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
            background: 'var(--md-sys-color-surface, #fdf9ec)',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {fields.length} parameter{fields.length !== 1 ? 's' : ''} configured
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Md3Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Md3Button>
            <Md3Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              loadingText="Saving Vitals Schema…"
              style={{ minWidth: '180px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>
              <span>Save Vitals Schema</span>
            </Md3Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Md3DynamicVitalsConfigurator;
