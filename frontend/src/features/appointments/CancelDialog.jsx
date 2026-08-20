import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import './AppointmentDashboard.css';

/**
 * CancelDialog — Controlled modal requiring explicit cancellation reason.
 */
export const CancelDialog = ({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) => {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen || !appointment) return null;

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setLocalError('Please provide a valid cancellation reason (at least 3 characters)');
      return;
    }

    setLocalError('');
    try {
      await onConfirm(appointment._id, reason.trim());
      onClose();
    } catch (err) {
      // Handled by parent hook
    }
  };

  const patient = appointment.patientId || {};

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon cancel">
              <Icon.AlertTriangle />
            </div>
            <div>
              <h3 className="appt-modal-title">Cancel Appointment</h3>
              <p className="appt-modal-subtitle">
                Appointment ID: <code>{appointment.appointmentNumber}</code>
              </p>
            </div>
          </div>
          <button className="appt-modal-close" onClick={onClose} aria-label="Close dialog">
            <Icon.X />
          </button>
        </div>

        <form onSubmit={handleCancel} className="appt-modal-body">
          {(error || localError) && (
            <div className="appt-dialog-error">
              <Icon.AlertTriangle />
              <span>{error || localError}</span>
            </div>
          )}

          <p className="appt-cancel-warning">
            Are you sure you want to cancel the appointment for{' '}
            <strong>
              {patient.firstName} {patient.lastName}
            </strong>{' '}
            on{' '}
            <strong>
              {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.startTime}
            </strong>
            ? This action cannot be undone.
          </p>

          <div className="appt-form-field">
            <label htmlFor="cancel-reason" className="appt-field-label">
              Cancellation Reason <span className="req">*</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              className="appt-textarea"
              placeholder="e.g. Patient called to cancel, Doctor emergency, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="appt-modal-actions">
            <Md3Button variant="text" onClick={onClose} disabled={loading}>
              Keep Appointment
            </Md3Button>
            <Md3Button
              type="submit"
              variant="error"
              loading={loading}
              loadingText="Cancelling..."
            >
              <Icon.Trash />
              <span>Confirm Cancellation</span>
            </Md3Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CancelDialog;
