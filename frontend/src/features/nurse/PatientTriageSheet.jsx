import React, { useEffect, useMemo, useState } from 'react';
import {
  Md3Card,
  Md3Chip,
  Md3Avatar,
  Md3Section,
  Md3Grid,
  Md3EmptyState,
  Icon,
} from '../../components/md3/Md3Widgets';
import {
  Md3TextField,
  Md3Button,
  Md3Select,
  Md3Checkbox,
} from '../../components/md3/Md3FormComponents';
import { visitAPI } from '../../services/visitAPI';
import api from '../../services/api';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './PatientTriageSheet.css';

/* ============================================================
   PatientTriageSheet — Pure Material Design 3 Triage Assessment
   ============================================================ */

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr.trim();
  if (typeof addr === 'object') {
    return [addr.street, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ');
  }
  return '';
};

/* ─── 1. TriagePatientIdentity — 2-Way Column Layout Hero Card ─── */
const TriagePatientIdentity = ({ visit, waitingSince }) => {
  const patient = visit?.patientId || {};
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' · ');

  const dobText = patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const addressText = formatAddress(patient.address) || [patient.city, patient.pinCode].filter(Boolean).join(', ');

  return (
    <div className="pts-identity-card">
      {/* ── Left Column: Identity & Primary Status ── */}
      <div className="pts-identity-card__col pts-identity-card__col--left">
        <div className="pts-identity-card__avatar">
          {initials}
        </div>
        <div className="pts-identity-card__details">
          <div className="pts-identity-card__title-row">
            <h2 className="pts-identity-card__name">{name}</h2>
            {patient.mrn && (
              <span className="pts-identity-card__mrn-pill">
                MRN: {patient.mrn}
              </span>
            )}
          </div>
          <div className="pts-identity-card__chips-row">
            {ageGender && (
              <span className="pts-identity-card__tag">
                <span className="material-symbols-rounded">person</span>
                <span>{ageGender}</span>
              </span>
            )}
            {patient.bloodGroup && (
              <span className="pts-identity-card__tag pts-identity-card__tag--blood">
                <span className="material-symbols-rounded">water_drop</span>
                <span>Blood: {patient.bloodGroup}</span>
              </span>
            )}
            {visit?.tokenString && (
              <span className="pts-identity-card__tag pts-identity-card__tag--token">
                <span className="material-symbols-rounded">confirmation_number</span>
                <span>Token {visit.tokenString}</span>
              </span>
            )}
            {waitingSince && (
              <span className="pts-identity-card__tag pts-identity-card__tag--wait">
                <span className="material-symbols-rounded">schedule</span>
                <span>Waiting {waitingSince}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Center Divider ── */}
      <div className="pts-identity-card__divider" />

      {/* ── Right Column: Structured Key Demographic & Contact Grid ── */}
      <div className="pts-identity-card__col pts-identity-card__col--right">
        <div className="pts-identity-card__grid">
          <div className="pts-identity-card__item">
            <span className="material-symbols-rounded pts-identity-card__item-icon">cake</span>
            <div className="pts-identity-card__item-content">
              <span className="pts-identity-card__item-label">DOB:</span>
              <span className="pts-identity-card__item-val">{dobText || '—'}</span>
            </div>
          </div>

          <div className="pts-identity-card__item">
            <span className="material-symbols-rounded pts-identity-card__item-icon">call</span>
            <div className="pts-identity-card__item-content">
              <span className="pts-identity-card__item-label">Mobile:</span>
              <span className="pts-identity-card__item-val">{patient.phone || '—'}</span>
            </div>
          </div>

          <div className="pts-identity-card__item">
            <span className="material-symbols-rounded pts-identity-card__item-icon">badge</span>
            <div className="pts-identity-card__item-content">
              <span className="pts-identity-card__item-label">Aadhaar:</span>
              <span className="pts-identity-card__item-val">{patient.aadhaar || '—'}</span>
            </div>
          </div>

          {patient.parentsName && (
            <div className="pts-identity-card__item">
              <span className="material-symbols-rounded pts-identity-card__item-icon">family_restroom</span>
              <div className="pts-identity-card__item-content">
                <span className="pts-identity-card__item-label">Guardian:</span>
                <span className="pts-identity-card__item-val">{patient.parentsName}</span>
              </div>
            </div>
          )}

          {addressText && (
            <div className="pts-identity-card__item pts-identity-card__item--full">
              <span className="material-symbols-rounded pts-identity-card__item-icon">location_on</span>
              <div className="pts-identity-card__item-content">
                <span className="pts-identity-card__item-label">Address:</span>
                <span className="pts-identity-card__item-val pts-identity-card__item-val--address" title={addressText}>{addressText}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── 2. ChiefComplaintSection ─── */
const ChiefComplaintSection = ({ value, onChange, error }) => (
  <div className="pts-section-card">
    <div className="pts-section-card__header">
      <div className="pts-section-card__icon-wrap">
        <span className="material-symbols-rounded">clinical_notes</span>
      </div>
      <div className="pts-section-card__titles">
        <h3 className="pts-section-card__title">Chief Complaint &amp; Reason for Visit</h3>
        <p className="pts-section-card__subtitle">Presenting symptoms reported by patient during triage intake</p>
      </div>
    </div>
    <div className="pts-section-card__body">
      <Md3TextField
        label="Presenting Complaints & Clinical History"
        variant="outlined"
        required
        multiline
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe patient symptoms, duration, severity, and any relevant clinical history reported..."
        error={error}
        fullWidth
      />
    </div>
  </div>
);

/* ─── 3. ClinicalVitalsSection ─── */
const ClinicalVitalsSection = ({ vitals, setVitals, errors = {} }) => {
  const update = (field) => (v) => setVitals((prev) => ({ ...prev, [field]: v }));
  
  const bmiInfo = useMemo(() => {
    const h = Number(vitals.height) / 100;
    const w = Number(vitals.weight);
    if (h > 0 && w > 0) {
      const val = (w / (h * h)).toFixed(1);
      const num = Number(val);
      let status = 'Normal';
      let variant = 'tertiary';
      if (num < 18.5) { status = 'Underweight'; variant = 'secondary'; }
      else if (num >= 25 && num < 30) { status = 'Overweight'; variant = 'secondary'; }
      else if (num >= 30) { status = 'Obese'; variant = 'error'; }
      return { val, status, variant };
    }
    return null;
  }, [vitals.height, vitals.weight]);

  return (
    <div className="pts-section-card">
      <div className="pts-section-card__header">
        <div className="pts-section-card__icon-wrap">
          <span className="material-symbols-rounded">vital_signs</span>
        </div>
        <div className="pts-section-card__titles">
          <h3 className="pts-section-card__title">Clinical Vitals Assessment</h3>
          <p className="pts-section-card__subtitle">Standard physiological baseline measurements</p>
        </div>
      </div>
      <div className="pts-section-card__body">
        <div className="pts-vitals-grid">
          <Md3TextField
            label="Blood Pressure (mmHg)"
            placeholder="120/80"
            value={vitals.bloodPressure}
            onChange={(e) => update('bloodPressure')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">speed</span>}
            error={errors.bloodPressure}
            fullWidth
          />
          <Md3TextField
            label="Temperature (°F)"
            type="number"
            step="0.1"
            placeholder="98.6"
            value={vitals.temperature}
            onChange={(e) => update('temperature')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">device_thermostat</span>}
            error={errors.temperature}
            fullWidth
          />
          <Md3TextField
            label="Pulse Rate (bpm)"
            type="number"
            placeholder="72"
            value={vitals.pulse}
            onChange={(e) => update('pulse')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">favorite</span>}
            error={errors.pulse}
            fullWidth
          />
          <Md3TextField
            label="SpO₂ — Oxygen Saturation (%)"
            type="number"
            placeholder="98"
            value={vitals.oxygenSaturation}
            onChange={(e) => update('oxygenSaturation')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">air</span>}
            error={errors.oxygenSaturation}
            fullWidth
          />
          <Md3TextField
            label="Height (cm)"
            type="number"
            placeholder="175"
            value={vitals.height}
            onChange={(e) => update('height')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">straighten</span>}
            error={errors.height}
            fullWidth
          />
          <Md3TextField
            label="Weight (kg)"
            type="number"
            placeholder="70"
            value={vitals.weight}
            onChange={(e) => update('weight')(e.target.value)}
            leadingIcon={<span className="material-symbols-rounded">scale</span>}
            error={errors.weight}
            fullWidth
          />
        </div>

        {bmiInfo && (
          <div className="pts-bmi-banner">
            <span className="material-symbols-rounded">health_metrics</span>
            <span>Calculated BMI: <strong>{bmiInfo.val} kg/m²</strong> — Status: <strong className={`pts-bmi-status pts-bmi-status--${bmiInfo.variant}`}>{bmiInfo.status}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── 4. DepartmentVitalsSection ─── */
const DepartmentVitalsSection = ({ fields = [], values = {}, onChange, errors = {} }) => {
  if (!Array.isArray(fields) || fields.length === 0) return null;
  return (
    <div className="pts-section-card">
      <div className="pts-section-card__header">
        <div className="pts-section-card__icon-wrap">
          <span className="material-symbols-rounded">medical_services</span>
        </div>
        <div className="pts-section-card__titles">
          <h3 className="pts-section-card__title">Department Specific Vitals</h3>
          <p className="pts-section-card__subtitle">Specialty diagnostic parameters</p>
        </div>
      </div>
      <div className="pts-section-card__body">
        <div className="pts-vitals-grid">
          {fields.map((field) => {
            const key = field.name || field.label;
            const req = field.required;
            const label = field.unit ? `${field.label} (${field.unit})` : field.label;
            if (field.type === 'boolean' || field.type?.toLowerCase() === 'boolean') {
              return (
                <Md3Checkbox
                  key={key}
                  label={label + (req ? ' *' : '')}
                  checked={values[key] === true || values[key] === 'true'}
                  onChange={(checked) => onChange(key, checked)}
                  error={errors[key]}
                />
              );
            }
            if (field.type === 'select' || field.options?.length) {
              const options = (field.options || []).map((v) => ({ value: String(v.value ?? v), label: String(v.label ?? v) }));
              return (
                <Md3Select
                  key={key}
                  label={label + (req ? ' *' : '')}
                  value={values[key] ?? ''}
                  onChange={(v) => onChange(key, v)}
                  options={[{ value: '', label: 'Select...' }, ...options]}
                  required={req}
                  error={errors[key]}
                  fullWidth
                />
              );
            }
            return (
              <Md3TextField
                key={key}
                label={label}
                type={field.type === 'number' ? 'number' : 'text'}
                required={req}
                value={values[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                error={errors[key]}
                placeholder={field.placeholder || ''}
                fullWidth
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Main PatientTriageSheet Component
   ============================================================ */

const EMPTY_VITALS = {
  chiefComplaint: '',
  height: '',
  weight: '',
  bloodPressure: '',
  temperature: '',
  pulse: '',
  oxygenSaturation: '',
};

const timeSince = (dateString) => {
  if (!dateString) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  let interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    const mins = Math.floor((seconds % 3600) / 60);
    return `${interval}h ${mins}m`;
  }
  interval = Math.floor(seconds / 60);
  return `${interval}m`;
};

const getStatusMeta = (status) => {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)', icon: 'check_circle' };
    case 'IN_CONSULTATION':
      return { label: 'In Consultation', bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)', icon: 'medical_services' };
    case 'WAITING_DOCTOR':
    case 'TRIAGED':
      return { label: 'Triaged / In Queue', bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)', icon: 'schedule' };
    case 'WAITING_TRIAGE':
    case 'CALLED':
      return { label: 'Waiting Triage', bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)', icon: 'hourglass_empty' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-error)', icon: 'cancel' };
    default:
      return { label: status?.replace(/_/g, ' ') || 'Registered', bg: 'var(--md-sys-color-surface-container)', fg: 'var(--md-sys-color-on-surface)', icon: 'info' };
  }
};

const PatientTriageSheet = ({
  visit,
  department,
  onComplete,
  onCancel,
  className = '',
  style = {},
}) => {
  const [vitals, setVitals] = useState(EMPTY_VITALS);
  const [dynamicVitals, setDynamicVitals] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Triage Tabs
  const [triageTab, setTriageTab] = useState('vitals');
  const [allergies, setAllergies] = useState('');
  const [operations, setOperations] = useState('');
  const [pastVisits, setPastVisits] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const filteredHistoryVisits = useMemo(() => {
    const sorted = [...pastVisits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (historyFilter === 'COMPLETED') {
      return sorted.filter((v) => v.status === 'COMPLETED');
    }
    if (historyFilter === 'ACTIVE') {
      return sorted.filter((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED');
    }
    if (historyFilter === 'CANCELLED') {
      return sorted.filter((v) => v.status === 'CANCELLED');
    }
    return sorted;
  }, [pastVisits, historyFilter]);

  const historyCounts = useMemo(() => {
    return {
      all: pastVisits.length,
      completed: pastVisits.filter((v) => v.status === 'COMPLETED').length,
      active: pastVisits.filter((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED').length,
      cancelled: pastVisits.filter((v) => v.status === 'CANCELLED').length,
    };
  }, [pastVisits]);

  // Reset fields on visit change
  useEffect(() => {
    setVitals(EMPTY_VITALS);
    setDynamicVitals({});
    setErrors({});
    setSubmitError(null);
    setTriageTab('vitals');

    if (visit?.patientId) {
      setAllergies(visit.patientId.allergies || '');
      setOperations(visit.patientId.operations || '');
    } else {
      setAllergies('');
      setOperations('');
    }
  }, [visit?._id || visit?.id, visit?.patientId]);

  // Load patient past visits history
  useEffect(() => {
    const patientId = visit?.patientId?._id || visit?.patientId;
    if (patientId) {
      setLoadingHistory(true);
      visitAPI.getPatientVisits(patientId)
        .then((res) => {
          setPastVisits(res.data?.data || []);
        })
        .catch((err) => console.error('Failed to load past visits:', err))
        .finally(() => setLoadingHistory(false));
    } else {
      setPastVisits([]);
    }
  }, [visit?.patientId?._id || visit?.patientId]);

  // Load active doctors in current department
  useEffect(() => {
    const deptId = visit?.departmentId?._id || visit?.departmentId;
    if (deptId) {
      api.get(`/staff?role=Doctor&departmentId=${deptId}`)
        .then((res) => {
          const docList = res.data?.data?.items || [];
          setDoctors(docList);
          
          const preAssigned = visit?.consultation?.doctorId?._id || visit?.consultation?.doctorId;
          if (preAssigned) {
            setSelectedDoctorId(preAssigned);
          } else if (docList.length > 0) {
            setSelectedDoctorId(docList[0]._id);
          }
        })
        .catch((err) => console.error('Failed to load department doctors:', err));
    } else {
      setDoctors([]);
      setSelectedDoctorId('');
    }
  }, [visit?.departmentId, visit?.consultation?.doctorId]);

  const waitingSince = useMemo(() => timeSince(visit?.createdAt), [visit?.createdAt]);
  const deptVitalFields = department?.vitalFields || [];

  const setDynamicField = (key, value) => {
    setDynamicVitals((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const e = {};
    if (!vitals.chiefComplaint || vitals.chiefComplaint.trim().length < 3) {
      e.chiefComplaint = 'Please enter chief complaint (min 3 chars)';
    }

    if (vitals.height !== '') {
      const h = Number(vitals.height);
      if (Number.isNaN(h) || h < 30 || h > 250) {
        e.height = 'Height must be between 30 and 250 cm';
      }
    }

    if (vitals.weight !== '') {
      const w = Number(vitals.weight);
      if (Number.isNaN(w) || w < 1 || w > 500) {
        e.weight = 'Weight must be between 1 and 500 kg';
      }
    }

    if (vitals.temperature !== '') {
      const t = Number(vitals.temperature);
      if (Number.isNaN(t) || t < 80 || t > 115) {
        e.temperature = 'Temperature must be between 80 and 115 °F';
      }
    }

    if (vitals.pulse !== '') {
      const p = Number(vitals.pulse);
      if (Number.isNaN(p) || p < 20 || p > 300) {
        e.pulse = 'Pulse must be between 20 and 300 bpm';
      }
    }

    if (vitals.oxygenSaturation !== '') {
      const o = Number(vitals.oxygenSaturation);
      if (Number.isNaN(o) || o < 0 || o > 100) {
        e.oxygenSaturation = 'SpO₂ must be between 0 and 100%';
      }
    }

    if (vitals.bloodPressure !== '') {
      const bpPattern = /^\d{2,3}\/\d{2,3}$/;
      if (!bpPattern.test(vitals.bloodPressure.trim())) {
        e.bloodPressure = 'BP must be in systolic/diastolic format (e.g. 120/80)';
      }
    }

    deptVitalFields.forEach((f) => {
      if (f.required && (dynamicVitals[f.name] === undefined || dynamicVitals[f.name] === null || String(dynamicVitals[f.name]).trim() === '')) {
        e[f.name] = `${f.label} is required`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      setTriageTab('vitals');
      return;
    }

    if (!selectedDoctorId) {
      setTriageTab('doctor');
      setSubmitError('Please select an attending doctor to route this patient.');
      return;
    }

    setSubmitting(true);
    try {
      const visitId = visit._id || visit.id;
      const numericKeys = ['height', 'weight', 'temperature', 'pulse', 'oxygenSaturation'];
      const payload = { ...vitals };
      numericKeys.forEach((k) => {
        if (payload[k] !== '' && !Number.isNaN(Number(payload[k]))) payload[k] = Number(payload[k]);
      });
      if (Object.keys(dynamicVitals).length > 0) payload.dynamicVitals = dynamicVitals;
      
      payload.doctorId = selectedDoctorId;
      payload.allergies = allergies;
      payload.operations = operations;

      await visitAPI.recordVitals(visitId, payload);
      if (onComplete) onComplete({ visit, vitals: payload });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record vitals. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visit) {
    return (
      <div className={['pts-empty-wrapper', className].filter(Boolean).join(' ')} style={style}>
        <div className="pts-empty-card">
          <div className="pts-empty-icon">
            <span className="material-symbols-rounded">stethoscope</span>
          </div>
          <h3 className="pts-empty-title">Select a Patient for Triage</h3>
          <p className="pts-empty-desc">
            Choose a patient from the waiting queue on the left to review demographics, record vital signs, and assign an attending doctor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={['pts-sheet', className].filter(Boolean).join(' ')}
      style={style}
    >
      {/* ─── 1. Patient Demographics Hero Header ─── */}
      <TriagePatientIdentity visit={visit} waitingSince={waitingSince} />
      
      {/* ─── 2. Material 3 Secondary Navigation Tabs ─── */}
      <div className="pts-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={triageTab === 'vitals'}
          className={`pts-tab-item ${triageTab === 'vitals' ? 'pts-tab-item--active' : ''}`}
          onClick={() => setTriageTab('vitals')}
        >
          <span className="material-symbols-rounded">vital_signs</span>
          <span>Vitals &amp; Assessment</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={triageTab === 'history'}
          className={`pts-tab-item ${triageTab === 'history' ? 'pts-tab-item--active' : ''}`}
          onClick={() => setTriageTab('history')}
        >
          <span className="material-symbols-rounded">history_edu</span>
          <span>Medical History</span>
          {pastVisits.length > 0 && (
            <span className="pts-tab-badge">{pastVisits.length}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={triageTab === 'doctor'}
          className={`pts-tab-item ${triageTab === 'doctor' ? 'pts-tab-item--active' : ''}`}
          onClick={() => setTriageTab('doctor')}
        >
          <span className="material-symbols-rounded">stethoscope</span>
          <span>Attending Doctor</span>
          {selectedDoctorId && <span className="pts-tab-check material-symbols-rounded">check</span>}
        </button>
      </div>

      {/* ─── 3. Scrollable Tab Panel Area ─── */}
      <div className="pts-content-area">
        {/* Tab 1: Vitals & Complaint */}
        {triageTab === 'vitals' && (
          <div className="pts-tab-panel">
            <ChiefComplaintSection
              value={vitals.chiefComplaint}
              onChange={(v) => setVitals((p) => ({ ...p, chiefComplaint: v }))}
              error={errors.chiefComplaint}
            />
            <ClinicalVitalsSection
              vitals={vitals}
              setVitals={setVitals}
              errors={errors}
            />
            {deptVitalFields.length > 0 && (
              <DepartmentVitalsSection
                fields={deptVitalFields}
                values={dynamicVitals}
                onChange={setDynamicField}
                errors={errors}
              />
            )}
          </div>
        )}

        {/* Tab 2: Patient History */}
        {triageTab === 'history' && (
          <div className="pts-tab-panel">
            <div className="pts-section-card">
              <div className="pts-section-card__header">
                <div className="pts-section-card__icon-wrap">
                  <span className="material-symbols-rounded">medical_information</span>
                </div>
                <div className="pts-section-card__titles">
                  <h3 className="pts-section-card__title">Allergies &amp; Surgical Background</h3>
                  <p className="pts-section-card__subtitle">Record contraindications, known drug reactions, and past procedures</p>
                </div>
              </div>
              <div className="pts-section-card__body">
                <div className="pts-history-grid">
                  <Md3TextField
                    label="Known Drug & Food Allergies"
                    placeholder="Specify any active allergies (e.g. Penicillin, Peanuts, Latex)..."
                    multiline
                    rows={2}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    fullWidth
                  />
                  <Md3TextField
                    label="Past Surgeries & Major Operations"
                    placeholder="List any past operations, approximate dates, or surgical notes..."
                    multiline
                    rows={2}
                    value={operations}
                    onChange={(e) => setOperations(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>
            </div>

            <div className="pts-section-card">
              <div className="pts-section-card__header">
                <div className="pts-section-card__icon-wrap">
                  <span className="material-symbols-rounded">manage_history</span>
                </div>
                <div className="pts-section-card__titles">
                  <h3 className="pts-section-card__title">Encounter History &amp; Previous Diagnoses</h3>
                  <p className="pts-section-card__subtitle">Chronological record of past hospital consultations</p>
                </div>
              </div>
              <div className="pts-section-card__body">
                {/* Encounter Filter Bar */}
                {pastVisits.length > 0 && (
                  <div className="pts-history-filter-bar">
                    <button
                      type="button"
                      className={`pts-history-filter-chip ${historyFilter === 'ALL' ? 'is-active' : ''}`}
                      onClick={() => setHistoryFilter('ALL')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>list_alt</span>
                      <span>All Records ({historyCounts.all})</span>
                    </button>

                    <button
                      type="button"
                      className={`pts-history-filter-chip ${historyFilter === 'COMPLETED' ? 'is-active' : ''}`}
                      onClick={() => setHistoryFilter('COMPLETED')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span>
                      <span>Completed ({historyCounts.completed})</span>
                    </button>

                    <button
                      type="button"
                      className={`pts-history-filter-chip ${historyFilter === 'ACTIVE' ? 'is-active' : ''}`}
                      onClick={() => setHistoryFilter('ACTIVE')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>pending_actions</span>
                      <span>Active / Queue ({historyCounts.active})</span>
                    </button>

                    {historyCounts.cancelled > 0 && (
                      <button
                        type="button"
                        className={`pts-history-filter-chip ${historyFilter === 'CANCELLED' ? 'is-active' : ''}`}
                        onClick={() => setHistoryFilter('CANCELLED')}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>cancel</span>
                        <span>Cancelled ({historyCounts.cancelled})</span>
                      </button>
                    )}
                  </div>
                )}

                {loadingHistory ? (
                  <div className="pts-loading-history">
                    <span className="pts-spinner" />
                    <span>Loading patient encounter records...</span>
                  </div>
                ) : filteredHistoryVisits.length === 0 ? (
                  <div className="pts-empty-history">
                    <span className="material-symbols-rounded">inventory_2</span>
                    <p>
                      {pastVisits.length === 0
                        ? 'New Patient — No previous consultation history on record.'
                        : `No ${historyFilter.toLowerCase()} encounters found for this patient.`}
                    </p>
                  </div>
                ) : (
                  <div className="pts-timeline">
                    {filteredHistoryVisits.map((pv) => {
                      const statusMeta = getStatusMeta(pv.status);
                      const isCurrent = pv._id === (visit?._id || visit?.id);

                      return (
                        <div
                          key={pv._id}
                          className={`pts-timeline-item ${isCurrent ? 'is-current' : ''}`}
                        >
                          <div className="pts-timeline-date">
                            <span className="pts-timeline-day">
                              {new Date(pv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="pts-timeline-year">
                              {new Date(pv.createdAt).getFullYear()}
                            </span>
                            <span className="pts-timeline-dept">
                              {pv.departmentId?.code || pv.departmentId?.name || 'GEN'}
                            </span>
                          </div>

                          <div className="pts-timeline-content">
                            {/* Header row: Token + Status badge + Current visit marker */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--md-sys-color-on-surface)' }}>
                                  {pv.tokenString || pv.visitNumber}
                                </span>
                                {isCurrent && (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'var(--md-sys-color-primary)',
                                    color: 'var(--md-sys-color-on-primary)'
                                  }}>
                                    Current Intake
                                  </span>
                                )}
                              </div>

                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: statusMeta.bg,
                                color: statusMeta.fg
                              }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>{statusMeta.icon}</span>
                                <span>{statusMeta.label}</span>
                              </span>
                            </div>

                            {/* Chief Complaint / Reason */}
                            <div className="pts-timeline-complaint">
                              <strong>Chief Complaint:</strong> {pv.vitals?.chiefComplaint || pv.reasonForVisit || 'Routine Consultation'}
                            </div>

                            {/* Recorded Vitals Summary Pill */}
                            {pv.vitals && (pv.vitals.bloodPressure || pv.vitals.pulse || pv.vitals.temperature || pv.vitals.oxygenSaturation) && (
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                background: 'var(--md-sys-color-surface-container-high)',
                                borderRadius: '6px',
                                color: 'var(--md-sys-color-on-surface-variant)',
                                margin: '2px 0'
                              }}>
                                {pv.vitals.bloodPressure && <span>BP: <strong>{pv.vitals.bloodPressure}</strong></span>}
                                {pv.vitals.pulse && <span>· Pulse: <strong>{pv.vitals.pulse} bpm</strong></span>}
                                {pv.vitals.temperature && <span>· Temp: <strong>{pv.vitals.temperature}°F</strong></span>}
                                {pv.vitals.oxygenSaturation && <span>· SpO₂: <strong>{pv.vitals.oxygenSaturation}%</strong></span>}
                                {pv.vitals.bmi && <span>· BMI: <strong>{pv.vitals.bmi}</strong></span>}
                              </div>
                            )}

                            {/* Doctor Consultation Diagnosis & Plan */}
                            {pv.consultation?.diagnosis && (
                              <div className="pts-timeline-diagnosis">
                                <strong>Diagnosis:</strong> {pv.consultation.diagnosis}
                              </div>
                            )}
                            {pv.consultation?.treatmentPlan && (
                              <div className="pts-timeline-plan">
                                <strong>Plan:</strong> {pv.consultation.treatmentPlan}
                              </div>
                            )}

                            {/* Attending Physician */}
                            {(pv.consultation?.doctorId?.fullName || pv.consultation?.doctorId?.name || pv.doctorId?.fullName || pv.doctorId?.name) && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                                Attending: <strong>{pv.consultation?.doctorId?.fullName || pv.consultation?.doctorId?.name || pv.doctorId?.fullName || pv.doctorId?.name}</strong>
                              </div>
                            )}

                            {/* Cancellation Details */}
                            {pv.status === 'CANCELLED' && pv.cancellationReason && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-error)', fontStyle: 'italic', marginTop: '2px' }}>
                                Cancellation Reason: {pv.cancellationReason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Attending Doctor */}
        {triageTab === 'doctor' && (
          <div className="pts-tab-panel">
            <div className="pts-section-card">
              <div className="pts-section-card__header">
                <div className="pts-section-card__icon-wrap">
                  <span className="material-symbols-rounded">stethoscope</span>
                </div>
                <div className="pts-section-card__titles">
                  <h3 className="pts-section-card__title">Assign Attending Physician</h3>
                  <p className="pts-section-card__subtitle">Select doctor on-duty for clinical consultation</p>
                </div>
              </div>
              <div className="pts-section-card__body">
                {doctors.length === 0 ? (
                  <div className="pts-empty-history">
                    <span className="material-symbols-rounded">person_off</span>
                    <p>No active doctors available in {department?.name || 'this department'}.</p>
                  </div>
                ) : (
                  <div className="pts-doctors-grid">
                    {doctors.map((doc) => {
                      const isSelected = doc._id === selectedDoctorId;
                      return (
                        <div
                          key={doc._id}
                          className={`pts-doctor-card ${isSelected ? 'pts-doctor-card--selected' : ''}`}
                          onClick={() => setSelectedDoctorId(doc._id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="pts-doctor-avatar">
                            {doc.fullName?.charAt(0) || 'D'}
                          </div>
                          <div className="pts-doctor-info">
                            <span className="pts-doctor-name">
                              Dr. {doc.fullName}
                            </span>
                            <span className="pts-doctor-spec">
                              {doc.primarySpecialization || doc.position || 'Physician'}
                            </span>
                            <span className="pts-doctor-fee">
                              Fee: {CURRENCY_SYMBOL}{doc.consultingFee || 0}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="pts-doctor-check">
                              <span className="material-symbols-rounded">check_circle</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. Fixed Actions Bar at Bottom ─── */}
      <div className="pts-footer-bar">
        {submitError && (
          <div className="pts-form-error" role="alert">
            <span className="material-symbols-rounded">error</span>
            <span>{submitError}</span>
          </div>
        )}
        <div className="pts-footer-actions">
          <Md3Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel Assessment
          </Md3Button>
          <Md3Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            leadingIcon={<span className="material-symbols-rounded">send</span>}
          >
            Record Vitals &amp; Route to Doctor
          </Md3Button>
        </div>
      </div>
    </div>
  );
};

export default PatientTriageSheet;
