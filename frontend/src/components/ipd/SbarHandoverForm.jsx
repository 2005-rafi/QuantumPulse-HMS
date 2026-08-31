/**
 * components/ipd/SbarHandoverForm.jsx
 * SBAR Clinical Nursing Shift Handover Component.
 */
import React, { useState } from 'react';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';

export const SbarHandoverForm = ({
  handovers = [],
  onCreateHandover,
  onAcknowledge,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [shift, setShift] = useState('MORNING_TO_EVENING');
  const [situation, setSituation] = useState('');
  const [background, setBackground] = useState('');
  const [assessment, setAssessment] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateHandover({
      shift,
      situation,
      background,
      assessment,
      recommendation,
    });
    setShowForm(false);
    setSituation('');
    setBackground('');
    setAssessment('');
    setRecommendation('');
  };

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            SBAR Shift Handover Notes
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            Structured Situation • Background • Assessment • Recommendation
          </span>
        </div>
        <Md3Button variant="tonal" size="small" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New SBAR Handover'}
        </Md3Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--md-sys-color-surface-container, #f0f5f2)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <Md3Select label="Handover Shift" value={shift} onChange={(e) => setShift(e.target.value)}>
            <option value="MORNING_TO_EVENING">Morning to Evening Handover</option>
            <option value="EVENING_TO_NIGHT">Evening to Night Handover</option>
            <option value="NIGHT_TO_MORNING">Night to Morning Handover</option>
          </Md3Select>

          <Md3TextField
            label="[S] Situation *"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="e.g. 54y male admitted for chest pain, currently hemodynamically stable"
            required
          />

          <Md3TextField
            label="[B] Background *"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g. Day 2 of admission, post-thrombolysis, known diabetic on metformin"
            required
          />

          <Md3TextField
            label="[A] Assessment *"
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="e.g. NEWS2 is 1 (low risk), blood sugar 142 mg/dL, pain free"
            required
          />

          <Md3TextField
            label="[R] Recommendation *"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="e.g. Evening Troponin-I repeat at 20:00, monitor BP 4th hourly"
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Md3Button variant="filled" type="submit">
              Sign & Submit Handover
            </Md3Button>
          </div>
        </form>
      )}

      {/* Handover List */}
      {handovers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)', fontSize: '0.85rem' }}>
          No handover notes recorded for this patient yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {handovers.map((h) => (
            <div
              key={h._id}
              style={{
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: '12px',
                padding: '14px',
                background: 'var(--md-sys-color-surface-container-lowest)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  {h.shift.replace(/_/g, ' ')} • {new Date(h.handoverTime).toLocaleString('en-IN')}
                </span>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>
                  Outgoing: <strong>{h.nurseOut?.firstName || 'Nurse'}</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <strong>S:</strong> {h.situation}
                </div>
                <div>
                  <strong>B:</strong> {h.background}
                </div>
                <div>
                  <strong>A:</strong> {h.assessment}
                </div>
                <div>
                  <strong>R:</strong> {h.recommendation}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed var(--md-sys-color-outline-variant)' }}>
                {h.isAcknowledged ? (
                  <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>
                    ✓ Acknowledged by {h.nurseIn?.firstName || 'Incoming Nurse'} ({new Date(h.acknowledgedAt).toLocaleTimeString('en-IN')})
                  </span>
                ) : (
                  <Md3Button variant="tonal" size="small" onClick={() => onAcknowledge && onAcknowledge(h._id)}>
                    Acknowledge & Accept Patient Care
                  </Md3Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SbarHandoverForm;
