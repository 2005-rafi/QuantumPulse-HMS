import React, { useState } from 'react';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import './LabPreVitalsDialog.css';

const SKIP_REASONS = [
  'Patient already triaged in OPD / Inpatient Ward',
  'Routine non-invasive specimen collection',
  'Emergency STAT priority draw',
  'Patient clinically stable / Triaged within 2 hours',
  'Patient declined non-mandatory vitals check',
  'Other (Clinical justification in remarks)',
];

/**
 * LabPreVitalsDialog — Pre-analytical Lab Vitals Intake, Skip & Rollback Modal
 */
export const LabPreVitalsDialog = ({
  isOpen,
  onClose,
  visit,
  order,
  onSaveVitals,
}) => {
  const existingVitals = order?.labVitals || {};
  const hasExistingVitals = Boolean(
    existingVitals.isSkipped ||
    existingVitals.preScanBp ||
    existingVitals.pulse ||
    existingVitals.oxygenSaturation ||
    existingVitals.temperature ||
    existingVitals.bloodGlucose
  );

  const [activeTab, setActiveTab] = useState(existingVitals.isSkipped ? 'skip' : 'record');
  const [fastingHours, setFastingHours] = useState(existingVitals.fastingHours != null ? existingVitals.fastingHours : 8);
  const [preScanBp, setPreScanBp] = useState(existingVitals.preScanBp || '120/80');
  const [pulse, setPulse] = useState(existingVitals.pulse != null ? existingVitals.pulse : 72);
  const [oxygenSaturation, setOxygenSaturation] = useState(existingVitals.oxygenSaturation != null ? existingVitals.oxygenSaturation : 98);
  const [bloodGlucose, setBloodGlucose] = useState(existingVitals.bloodGlucose != null ? existingVitals.bloodGlucose : '');
  const [temperature, setTemperature] = useState(existingVitals.temperature != null ? existingVitals.temperature : 98.6);
  const [patientWeightKg, setPatientWeightKg] = useState(
    existingVitals.patientWeightKg || visit?.vitals?.weight || 70
  );
  const [clinicalNotes, setClinicalNotes] = useState(existingVitals.clinicalNotes || '');
  const [skipReason, setSkipReason] = useState(existingVitals.skipReason || SKIP_REASONS[0]);
  const [skipNotes, setSkipNotes] = useState('');
  const [isRollbackConfirm, setIsRollbackConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !order) return null;

  const isPolicyRequired = Boolean(order?.laboratory?.requireVitalsCollection);

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveVitals({
        isSkipped: false,
        fastingHours: fastingHours !== '' ? Number(fastingHours) : undefined,
        preScanBp: preScanBp.trim(),
        pulse: pulse !== '' ? Number(pulse) : undefined,
        oxygenSaturation: oxygenSaturation !== '' ? Number(oxygenSaturation) : undefined,
        bloodGlucose: bloodGlucose !== '' ? Number(bloodGlucose) : undefined,
        temperature: temperature !== '' ? Number(temperature) : undefined,
        patientWeightKg: patientWeightKg !== '' ? Number(patientWeightKg) : undefined,
        clinicalNotes: clinicalNotes.trim(),
      });
      onClose();
    } catch (err) {
      alert('Failed to record lab vitals: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleSkipSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalReason = skipReason === 'Other (Clinical justification in remarks)' && skipNotes.trim()
        ? `Other: ${skipNotes.trim()}`
        : (skipNotes.trim() ? `${skipReason} — ${skipNotes.trim()}` : skipReason);

      await onSaveVitals({
        isSkipped: true,
        skipReason: finalReason,
        clinicalNotes: skipNotes.trim(),
      });
      onClose();
    } catch (err) {
      alert('Failed to skip lab vitals: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async () => {
    setSaving(true);
    try {
      await onSaveVitals({ rollback: true });
      onClose();
    } catch (err) {
      alert('Failed to rollback vitals: ' + (err.message || err));
    } finally {
      setSaving(false);
      setIsRollbackConfirm(false);
    }
  };

  return (
    <div className="lab-vitals-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lab-vitals-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── MODAL HEADER ── */}
        <div className="lab-vitals-header">
          <div className="lab-vitals-brand">
            <span className="material-symbols-rounded">medical_information</span>
            <div>
              <h3 className="lab-vitals-title">Pre-Analytical Vitals Management</h3>
              <p className="lab-vitals-sub">
                Patient: <strong>{visit?.patientId?.fullName || 'Patient'}</strong> · Test: <strong>{order.testName}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="lab-vitals-close" onClick={onClose} aria-label="Close dialog">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* ── DEPARTMENT POLICY BANNER ── */}
        {isPolicyRequired && (
          <div className="lab-vitals-policy-banner">
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--md-sys-color-primary, #00668b)' }}>
              policy
            </span>
            <span>
              <strong>Station Policy Active:</strong> Pre-analytical vitals are designated as required for this laboratory department.
            </span>
          </div>
        )}

        {/* ── SEGMENTED MODE SELECTOR (Record vs Skip) ── */}
        <div className="lab-vitals-tab-bar">
          <button
            type="button"
            className={`lab-vitals-tab-btn ${activeTab === 'record' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('record')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>vital_signs</span>
            <span>Record Patient Vitals</span>
          </button>
          <button
            type="button"
            className={`lab-vitals-tab-btn ${activeTab === 'skip' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('skip')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>cancel</span>
            <span>Skip Vitals (Exemption)</span>
          </button>
        </div>

        {/* ── RECORD VITALS FORM ── */}
        {activeTab === 'record' && (
          <form onSubmit={handleRecordSubmit} className="lab-vitals-body">
            <div className="lab-vitals-grid">
              <Md3TextField
                label="Pre-Procedure Blood Pressure (mmHg)"
                value={preScanBp}
                onChange={(e) => setPreScanBp(e.target.value)}
                placeholder="120/80"
              />
              <Md3TextField
                label="Heart / Pulse Rate (bpm)"
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
              />
              <Md3TextField
                label="SpO2 Oxygen Saturation (%)"
                type="number"
                min="50"
                max="100"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="98"
              />
              <Md3TextField
                label="Blood Glucose (mg/dL)"
                type="number"
                value={bloodGlucose}
                onChange={(e) => setBloodGlucose(e.target.value)}
                placeholder="e.g. 95 (optional)"
              />
              <Md3TextField
                label="Body Temperature (°F)"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="98.6"
              />
              <Md3TextField
                label="Fasting Hours (Hrs)"
                type="number"
                value={fastingHours}
                onChange={(e) => setFastingHours(e.target.value)}
                placeholder="e.g. 8 or 12"
              />
              <Md3TextField
                label="Patient Weight (kg)"
                type="number"
                step="0.5"
                value={patientWeightKg}
                onChange={(e) => setPatientWeightKg(e.target.value)}
                placeholder="70"
              />
            </div>

            <Md3TextField
              label="Intake & Screening Remarks / Contrast Notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Fasting confirmed. No syncope history during venipuncture."
            />

            <div className="lab-vitals-footer">
              {hasExistingVitals && (
                <div className="lab-vitals-rollback-zone">
                  {!isRollbackConfirm ? (
                    <button
                      type="button"
                      className="lab-vitals-rollback-btn"
                      onClick={() => setIsRollbackConfirm(true)}
                      title="Rollback existing vitals to pending status"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>undo</span>
                      <span>Rollback Vitals</span>
                    </button>
                  ) : (
                    <div className="lab-vitals-rollback-confirm">
                      <span>Confirm rollback?</span>
                      <button
                        type="button"
                        className="lab-vitals-rollback-confirm-btn"
                        onClick={handleRollback}
                        disabled={saving}
                      >
                        Yes, Rollback
                      </button>
                      <button
                        type="button"
                        className="lab-vitals-rollback-cancel-btn"
                        onClick={() => setIsRollbackConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="lab-vitals-footer-actions">
                <Md3Button variant="secondary" onClick={onClose} type="button">
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={saving}>
                  <span className="material-symbols-rounded">save</span>
                  <span>Save Lab Vitals</span>
                </Md3Button>
              </div>
            </div>
          </form>
        )}

        {/* ── SKIP VITALS FORM ── */}
        {activeTab === 'skip' && (
          <form onSubmit={handleSkipSubmit} className="lab-vitals-body">
            <div className="lab-vitals-skip-notice">
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-sys-color-tertiary, #7d5260)' }}>
                info
              </span>
              <div>
                <strong>Pre-Analytical Vitals Exemption</strong>
                <p>
                  If patient was already triaged in OPD/Ward, or this is a routine non-invasive test, select a valid clinical justification below. This justification will be logged for the Pathologist and clinical doctor.
                </p>
              </div>
            </div>

            <div className="lab-vitals-select-wrapper">
              <label className="lab-vitals-select-label">Select Exemption Reason *</label>
              <select
                className="lab-vitals-native-select"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
              >
                {SKIP_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <Md3TextField
              label="Additional Exemption Remarks / Ward Note"
              value={skipNotes}
              onChange={(e) => setSkipNotes(e.target.value)}
              placeholder="e.g. Vitals verified normal in Emergency triage at 10:15 AM."
              multiline
              rows={2}
            />

            <div className="lab-vitals-footer">
              {hasExistingVitals && (
                <div className="lab-vitals-rollback-zone">
                  {!isRollbackConfirm ? (
                    <button
                      type="button"
                      className="lab-vitals-rollback-btn"
                      onClick={() => setIsRollbackConfirm(true)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>undo</span>
                      <span>Rollback Vitals</span>
                    </button>
                  ) : (
                    <div className="lab-vitals-rollback-confirm">
                      <span>Confirm rollback?</span>
                      <button
                        type="button"
                        className="lab-vitals-rollback-confirm-btn"
                        onClick={handleRollback}
                        disabled={saving}
                      >
                        Yes, Rollback
                      </button>
                      <button
                        type="button"
                        className="lab-vitals-rollback-cancel-btn"
                        onClick={() => setIsRollbackConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="lab-vitals-footer-actions">
                <Md3Button variant="secondary" onClick={onClose} type="button">
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={saving} style={{ backgroundColor: 'var(--md-sys-color-tertiary, #7d5260)' }}>
                  <span className="material-symbols-rounded">skip_next</span>
                  <span>Confirm &amp; Skip Vitals</span>
                </Md3Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LabPreVitalsDialog;
