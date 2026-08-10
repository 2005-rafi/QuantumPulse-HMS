import React, { useEffect, useMemo, useState } from 'react';
import {
  Md3Card,
  Md3CardHeader,
  Md3Chip,
  Md3Avatar,
  Md3Section,
  Md3Grid,
  Md3GridItem,
  Md3InfoRow,
  Md3ActionBar,
  Md3EmptyState,
  Md3Tabs,
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
import './PatientTriageSheet.css';

/* ============================================================
   PatientTriageSheet — SOLID 6 sub-components
   SRP: Each sub-component does one triage section.
   LSP: All accept className / style.
   IFace Seg: Props are narrow & focused.
   2-Level Stack: NurseDashboard → PatientTriageSheet → Md3Widgets ✓
   ============================================================ */

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr.trim();
  if (typeof addr === 'object') {
    return [addr.street, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ');
  }
  return '';
};

/* ─── 1. TriagePatientIdentity — top header with patient info & compressed details ─── */
const TriagePatientIdentity = ({ visit, waitingSince }) => {
  const patient = visit?.patientId || {};
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');

  const dobText = patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN') : null;
  const addressText = formatAddress(patient.address) || [patient.city, patient.pinCode].filter(Boolean).join(', ');

  return (
    <Md3Card variant="elevated" padding="none" className="pts-identity-card">
      <div className="pts-identity-card__inner" style={{ padding: '20px' }}>
        <div className="pts-identity" style={{ padding: 0 }}>
          <div className="pts-identity__main">
            <Md3Avatar initials={initials} size="large" variant="primary" />
            <div className="pts-identity__info">
              <div className="pts-identity__row-1">
                <h2 className="pts-identity__name">{name}</h2>
                <Md3Chip variant="primary" size="small" icon={<Icon.CreditCard />}>
                  MRN {patient.mrn || '—'}
                </Md3Chip>
              </div>
              <div className="pts-identity__row-2">
                {ageGender && <Md3Chip variant="tertiary" size="small" icon={<Icon.Person />}>{ageGender}</Md3Chip>}
                {patient.bloodGroup && <Md3Chip variant="error" size="small" icon={<Icon.Droplet />}>{patient.bloodGroup}</Md3Chip>}
                {/* Token chip — primary queue identifier */}
                {visit?.tokenString && (
                  <Md3Chip variant="primary" size="medium" icon={<Icon.Activity />}>
                    {visit.tokenString}
                  </Md3Chip>
                )}
                {waitingSince && (
                  <Md3Chip variant="default" size="small" icon={<Icon.Clock />}>
                    Waiting {waitingSince}
                  </Md3Chip>
                )}
                {!visit?.tokenString && visit?.visitNumber && (
                  <Md3Chip variant="default" size="small" icon={<Icon.Activity />}>
                    {visit.visitNumber}
                  </Md3Chip>
                )}
              </div>
            </div>
          </div>

          {/* Compressed Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            fontSize: '0.82rem',
            color: 'var(--md-sys-color-on-surface-variant)'
          }}>
            {dobText && <div><strong>DOB:</strong> {dobText}</div>}
            {patient.phone && <div><strong>Mobile:</strong> {patient.phone}</div>}
            {patient.aadhaar && <div><strong>Aadhaar:</strong> {patient.aadhaar}</div>}
            {patient.parentsName && <div><strong>Guardian:</strong> {patient.parentsName}</div>}
            {addressText && <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {addressText}</div>}
          </div>
        </div>
      </div>
    </Md3Card>
  );
};

/* ─── 3. ChiefComplaintSection — reason / initial description ─── */
const ChiefComplaintSection = ({ value, onChange, error }) => (
  <Md3Section variant="highlight" title="Chief Complaint / Reason for Visit" icon={<Icon.Clipboard />}>
    <Md3TextField
      label="Describe in detail the patient's presenting complaints, duration, severity, and any relevant history reported"
      variant="outlined"
      required
      multiline
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. Patient presents with severe headache for 3 days, associated with vomiting and mild fever. No history of trauma."
      error={error}
      fullWidth
    />
  </Md3Section>
);

/* ─── 4. ClinicalVitalsSection — 6 MD3 text fields in 2-col grid ─── */
const ClinicalVitalsSection = ({ vitals, setVitals, errors = {} }) => {
  const update = (field) => (v) => setVitals((prev) => ({ ...prev, [field]: v }));
  return (
    <Md3Section variant="tertiary" title="Clinical Vitals" icon={<Icon.Heart />}>
      <Md3Grid columns={2}>
        <Md3TextField
          label="Blood Pressure (mmHg)"
          placeholder="120/80"
          value={vitals.bloodPressure}
          onChange={(e) => update('bloodPressure')(e.target.value)}
          leadingIcon={<Icon.Activity />}
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
          leadingIcon={<Icon.Thermometer />}
          error={errors.temperature}
          fullWidth
        />
        <Md3TextField
          label="Pulse Rate (bpm)"
          type="number"
          placeholder="72"
          value={vitals.pulse}
          onChange={(e) => update('pulse')(e.target.value)}
          leadingIcon={<Icon.Heart />}
          error={errors.pulse}
          fullWidth
        />
        <Md3TextField
          label="SpO₂ — Oxygen Saturation (%)"
          type="number"
          placeholder="98"
          value={vitals.oxygenSaturation}
          onChange={(e) => update('oxygenSaturation')(e.target.value)}
          leadingIcon={<Icon.Droplet />}
          error={errors.oxygenSaturation}
          fullWidth
        />
        <Md3TextField
          label="Height (cm)"
          type="number"
          placeholder="175"
          value={vitals.height}
          onChange={(e) => update('height')(e.target.value)}
          leadingIcon={<Icon.Ruler />}
          error={errors.height}
          fullWidth
        />
        <Md3TextField
          label="Weight (kg)"
          type="number"
          placeholder="70"
          value={vitals.weight}
          onChange={(e) => update('weight')(e.target.value)}
          leadingIcon={<Icon.Scale />}
          error={errors.weight}
          fullWidth
        />
      </Md3Grid>
      {vitals.height && vitals.weight && !Number.isNaN(Number(vitals.height)) && !Number.isNaN(Number(vitals.weight)) && (
        <div className="pts-bmi-row" role="status" aria-live="polite">
          <Md3Chip variant="tertiary" size="small" icon={<Icon.Activity />}>
            {(() => {
              const h = Number(vitals.height) / 100;
              const w = Number(vitals.weight);
              const bmi = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : '—';
              return `BMI ${bmi} · ${Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'}`;
            })()}
          </Md3Chip>
        </div>
      )}
    </Md3Section>
  );
};

/* ─── 5. DepartmentVitalsSection — dynamic fields from Department.vitalFields ─── */
const DepartmentVitalsSection = ({ fields = {}, values = {}, onChange, errors = {} }) => {
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const cols = fields.length >= 4 ? 2 : 1;
  return (
    <Md3Section variant="highlight" title="Department Specific Vitals" icon={<Icon.Stethoscope />}>
      <Md3Grid columns={cols}>
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
      </Md3Grid>
    </Md3Section>
  );
};

/* ─── 6. TriageActionsBar — Submit / Cancel / Error ─── */
const TriageActionsBar = ({ onSubmit, onCancel, submitting, error }) => (
  <div className="pts-actions">
    {error && (
      <div className="pts-form-error" role="alert">
        <Icon.Alert />
        <span>{error}</span>
      </div>
    )}
    <Md3ActionBar alignment="end">
      <Md3Button
        variant="secondary"
        onClick={onCancel}
        disabled={submitting}
      >
        Cancel
      </Md3Button>
      <Md3Button
        variant="primary"
        onClick={onSubmit}
        loading={submitting}
        leadingIcon={<Icon.Send />}
      >
        Record Vitals & Route to Doctor
      </Md3Button>
    </Md3ActionBar>
  </div>
);

/* ============================================================
   Main PatientTriageSheet — wires state + 6 sections above.
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

  // New triage UX & history states
  const [triageTab, setTriageTab] = useState('vitals');
  const [allergies, setAllergies] = useState('');
  const [operations, setOperations] = useState('');
  const [pastVisits, setPastVisits] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

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
          
          // Pre-select doctor if visit already has one assigned
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
      
      // Inject doctor routing, allergies and operations updates
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
      <Md3Card variant="elevated" padding="large" className={['pts-empty', className].filter(Boolean).join(' ')} style={style}>
        <Md3EmptyState
          icon={<Icon.Stethoscope />}
          title="Select a patient to begin"
          description="Choose a patient from the waiting queue to start triage assessment, record vitals, and route to the attending doctor."
        />
      </Md3Card>
    );
  }

  return (
    <div
      className={['pts-sheet', className].filter(Boolean).join(' ')}
      style={{ ...style, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Header demogs display */}
      <div style={{ flexShrink: 0 }}>
        <TriagePatientIdentity visit={visit} waitingSince={waitingSince} />
        
        {/* Modern Tab Bar */}
        <div className="pts-tabs" style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', marginBottom: '16px' }}>
          <Md3Tabs
            activeTab={triageTab}
            onChange={setTriageTab}
            tabs={[
              { id: 'vitals', label: 'Vitals & Complaint', icon: <Icon.Heart /> },
              { id: 'history', label: 'Patient History', icon: <Icon.History /> },
              { id: 'doctor', label: 'Attending Doctor', icon: <Icon.Stethoscope /> },
            ]}
          />
        </div>
      </div>

      {/* Tab Panels with Scrollable Content Pane */}
      <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
        {triageTab === 'vitals' && (
          <div className="pts-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {triageTab === 'history' && (
          <div className="pts-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Md3Section title="Allergies & Operations / Surgeries" icon={<Icon.Alert />} variant="error">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                <Md3TextField
                  label="Allergies"
                  placeholder="Specify drug, food, or contact allergies..."
                  multiline
                  rows={2}
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  fullWidth
                />
                <Md3TextField
                  label="Previous Operations / Surgical History"
                  placeholder="List any past operations, surgeries, and dates..."
                  multiline
                  rows={2}
                  value={operations}
                  onChange={(e) => setOperations(e.target.value)}
                  fullWidth
                />
              </div>
            </Md3Section>

            <Md3Section title="Past Visits Timeline" icon={<Icon.History />} variant="default">
              {loadingHistory ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Loading clinical history...
                </div>
              ) : pastVisits.filter(v => v.status === 'COMPLETED').length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.9rem' }}>
                  New Patient — No previous clinical history on record.
                </div>
              ) : (
                <div className="pts-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  {pastVisits
                    .filter(v => v.status === 'COMPLETED')
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((pv) => (
                      <div key={pv._id} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-low)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', borderRight: '1px solid var(--md-sys-color-outline-variant)', paddingRight: '12px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--md-sys-color-primary)' }}>
                            {new Date(pv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {new Date(pv.createdAt).getFullYear()}
                          </span>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '2px 6px', background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', borderRadius: '4px', marginTop: '6px', fontWeight: 'bold' }}>
                            {pv.departmentId?.code || 'GEN'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>Complaint:</strong> {pv.vitals?.chiefComplaint || 'No symptoms noted'}
                          </div>
                          {pv.consultation?.diagnosis && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-primary)' }}>
                              <strong>Diagnosis:</strong> {pv.consultation.diagnosis}
                            </div>
                          )}
                          {pv.consultation?.treatmentPlan && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                              <strong>Plan:</strong> {pv.consultation.treatmentPlan}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Md3Section>
          </div>
        )}

        {triageTab === 'doctor' && (
          <div className="pts-panel animate-fade-in">
            <Md3Section title="Assign Attending Doctor" icon={<Icon.Stethoscope />}>
              {doctors.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No active doctors available in {department?.name || 'General Medicine'}.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {doctors.map((doc) => {
                    const isSelected = doc._id === selectedDoctorId;
                    return (
                      <div
                        key={doc._id}
                        onClick={() => setSelectedDoctorId(doc._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid var(--md-sys-color-primary)' : '1px solid var(--md-sys-color-outline-variant)',
                          background: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-low)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '20px',
                          background: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                          color: isSelected ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                        }}>
                          {doc.fullName?.charAt(0) || 'D'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)' }}>
                            Dr. {doc.fullName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {doc.primarySpecialization || doc.position || 'Physician'}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--md-sys-color-secondary)' }}>
                            Fee: ₹{doc.consultingFee || 0}
                          </span>
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            color: 'var(--md-sys-color-primary)',
                          }}>
                            <Icon.Check />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Md3Section>
          </div>
        )}
      </div>

      {/* Fixed Actions strip at bottom */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '12px' }}>
        <TriageActionsBar
          onSubmit={handleSubmit}
          onCancel={onCancel}
          submitting={submitting}
          error={submitError}
        />
      </div>
    </div>
  );
};

export default PatientTriageSheet;
