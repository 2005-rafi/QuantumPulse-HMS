/**
 * components/ipd/VitalsFrequencyTimer.jsx
 * Clinical Timing & Frequency Control Engine for IPD Nursing.
 * Provides live countdown, overdue telemetry alarms, and interval adjustment (Q1H-PRN).
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './VitalsFrequencyTimer.css';

const FREQUENCY_OPTIONS = [
  { value: 'Q1H', label: 'Q1H — Hourly Telemetry (ICU/HDU/Critical)', intervalHours: 1 },
  { value: 'Q2H', label: 'Q2H — Every 2 Hours (Post-Op / Stepdown)', intervalHours: 2 },
  { value: 'Q4H', label: 'Q4H — Every 4 Hours (Acute Inpatient Standard)', intervalHours: 4 },
  { value: 'Q8H', label: 'Q8H — Every 8 Hours (Shift Routine)', intervalHours: 8 },
  { value: 'Q12H', label: 'Q12H — Twice Daily / BID (Convalescent)', intervalHours: 12 },
  { value: 'DAILY', label: 'Daily (Stable Rehabilitation)', intervalHours: 24 },
  { value: 'PRN', label: 'PRN — As Needed (Clinical Discretion)', intervalHours: null },
];

export const VitalsFrequencyTimer = ({
  monitoringPlan = {},
  lastRecordedAt = null,
  nextDueAt = null,
  onUpdateFrequency = null,
  onRecordVitalsClick = null,
  readOnly = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedFreq, setSelectedFreq] = useState(monitoringPlan?.frequency || 'Q4H');
  const [instructions, setInstructions] = useState(monitoringPlan?.specialInstructions || '');
  const [reason, setReason] = useState('');
  const [timeRemainingText, setTimeRemainingText] = useState('');
  const [timerStatus, setTimerStatus] = useState('NORMAL'); // 'NORMAL' | 'DUE' | 'OVERDUE' | 'PRN'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync internal state if prop updates
  useEffect(() => {
    if (monitoringPlan?.frequency) {
      setSelectedFreq(monitoringPlan.frequency);
    }
    if (monitoringPlan?.specialInstructions) {
      setInstructions(monitoringPlan.specialInstructions);
    }
  }, [monitoringPlan]);

  // Compute countdown ticker every 15 seconds
  useEffect(() => {
    const updateCountdown = () => {
      const freq = monitoringPlan?.frequency || 'Q4H';
      if (freq === 'PRN') {
        setTimeRemainingText('PRN (Clinical Discretion)');
        setTimerStatus('PRN');
        return;
      }

      if (!nextDueAt) {
        setTimeRemainingText('No schedule set');
        setTimerStatus('NORMAL');
        return;
      }

      const now = new Date().getTime();
      const dueTime = new Date(nextDueAt).getTime();
      const diffMs = dueTime - now;

      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
          setTimeRemainingText(`Due in ${hours}h ${minutes}m`);
        } else {
          setTimeRemainingText(`Due in ${minutes}m`);
        }
        setTimerStatus(minutes <= 15 ? 'DUE' : 'NORMAL');
      } else {
        const overdueMs = Math.abs(diffMs);
        const hours = Math.floor(overdueMs / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
          setTimeRemainingText(`OVERDUE by ${hours}h ${minutes}m`);
        } else {
          setTimeRemainingText(`OVERDUE by ${minutes}m`);
        }
        setTimerStatus('OVERDUE');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 15000);
    return () => clearInterval(interval);
  }, [nextDueAt, monitoringPlan]);

  const handleOpenModal = () => {
    setSelectedFreq(monitoringPlan?.frequency || 'Q4H');
    setInstructions(monitoringPlan?.specialInstructions || '');
    setReason('');
    setShowModal(true);
  };

  const handleSaveFrequency = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!onUpdateFrequency) {
      console.warn('[VitalsFrequencyTimer] No onUpdateFrequency handler connected');
      setShowModal(false);
      return;
    }
    try {
      setIsSubmitting(true);
      const justification = reason.trim() || `Adjusted telemetry protocol to ${selectedFreq}`;
      await onUpdateFrequency({
        frequency: selectedFreq,
        specialInstructions: instructions.trim(),
        reason: justification,
      });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to update monitoring frequency:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update vitals monitoring frequency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFrequencyLabel =
    FREQUENCY_OPTIONS.find((f) => f.value === (monitoringPlan?.frequency || 'Q4H'))?.value ||
    monitoringPlan?.frequency ||
    'Q4H';

  return (
    <aside
      className={`md3-freq-card md3-freq-card--${timerStatus.toLowerCase()}`}
      aria-label="Vitals Telemetry Schedule & Timing Engine"
    >
      <div className="md3-freq-top-row">
        {/* Left: Schedule Badge & Status */}
        <div className="md3-freq-info-group">
          <div className="md3-freq-pill-wrap">
            <span className="md3-freq-order-badge">
              <span className="material-symbols-rounded md3-freq-badge-icon">timer</span>
              {currentFrequencyLabel} Telemetry
            </span>
            <span className={`md3-freq-status-indicator md3-freq-status-indicator--${timerStatus.toLowerCase()}`}>
              {timerStatus === 'OVERDUE' && (
                <span className="material-symbols-rounded md3-freq-pulse-icon">emergency</span>
              )}
              {timerStatus === 'DUE' && (
                <span className="material-symbols-rounded md3-freq-due-icon">alarm</span>
              )}
              {timerStatus === 'NORMAL' && (
                <span className="material-symbols-rounded md3-freq-ok-icon">check_circle</span>
              )}
              {timerStatus === 'PRN' && (
                <span className="material-symbols-rounded md3-freq-prn-icon">vital_signs</span>
              )}
              <strong>{timeRemainingText}</strong>
            </span>
          </div>

          <div className="md3-freq-meta-timestamps">
            {lastRecordedAt && (
              <span className="md3-freq-last-rec">
                Last checked: {new Date(lastRecordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {nextDueAt && timerStatus !== 'PRN' && (
              <span className="md3-freq-next-due">
                Target: {new Date(nextDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {monitoringPlan?.specialInstructions && (
              <span className="md3-freq-special-tag" title={monitoringPlan.specialInstructions}>
                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>info</span>
                {monitoringPlan.specialInstructions}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="md3-freq-actions">
          {!readOnly && (
            <button
              type="button"
              className="md3-btn-subtle"
              onClick={handleOpenModal}
              title="Adjust monitoring timing (e.g. Q1H, Q2H, Q4H, Q8H)"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>tune</span>
              Change Protocol
            </button>
          )}

          {onRecordVitalsClick && (
            <button
              type="button"
              className="md3-btn-action"
              onClick={onRecordVitalsClick}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>add</span>
              Record Vitals
            </button>
          )}
        </div>
      </div>

      {/* Adjust Frequency Protocol Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="md3-freq-modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="md3-freq-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="freq-dialog-title"
          >
            <div className="md3-freq-modal-header">
              <div className="md3-freq-modal-title-wrap">
                <span className="material-symbols-rounded md3-freq-modal-icon">schedule</span>
                <h3 id="freq-dialog-title" className="md3-freq-modal-title">
                  Vitals Monitoring Frequency Order
                </h3>
              </div>
              <button
                type="button"
                className="md3-freq-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveFrequency} className="md3-freq-form">
              <p className="md3-freq-form-hint">
                Select clinical protocol interval. Shorter intervals (Q1H, Q2H) activate high-frequency telemetry alerts to prevent failure-to-rescue in unstable patients.
              </p>

              <div className="md3-freq-options-grid">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`md3-freq-option-card ${selectedFreq === opt.value ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={opt.value}
                      checked={selectedFreq === opt.value}
                      onChange={(e) => setSelectedFreq(e.target.value)}
                    />
                    <div className="md3-freq-option-label">
                      <span className="md3-freq-option-val">{opt.value}</span>
                      <span className="md3-freq-option-desc">{opt.label.split('—')[1] || opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="md3-freq-form-field">
                <label htmlFor="freq-instructions" className="md3-freq-label">
                  Special Protocol / Precautions (Optional)
                </label>
                <input
                  id="freq-instructions"
                  type="text"
                  className="md3-freq-input"
                  placeholder="e.g. Left arm BP only; strict SpO2 target > 94% on RA"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              <div className="md3-freq-form-field">
                <label htmlFor="freq-reason" className="md3-freq-label">
                  Clinical Order Justification <span className="md3-freq-label-opt">(Optional)</span>
                </label>
                <input
                  id="freq-reason"
                  type="text"
                  className="md3-freq-input"
                  placeholder="e.g. Post-operative stepdown; Extubation monitoring; Clinical improvement"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="md3-freq-modal-actions">
                <button
                  type="button"
                  className="md3-btn-subtle"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="md3-btn-action"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-rounded md3-spin" style={{ fontSize: '15px' }}>progress_activity</span>
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Commit Frequency Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
};

export default VitalsFrequencyTimer;
