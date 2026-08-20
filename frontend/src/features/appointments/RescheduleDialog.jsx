import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3DatePicker } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import { useAppointmentAvailability } from '../../hooks/useAppointmentAvailability';
import AvailabilitySelector from './AvailabilitySelector';
import './AppointmentDashboard.css';

/**
 * RescheduleDialog — Controlled modal for selecting new date & time slot.
 */
export const RescheduleDialog = ({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) => {
  if (!isOpen || !appointment) return null;

  const doctorId = appointment.doctorId?._id || appointment.doctorId;
  const departmentId = appointment.departmentId?._id || appointment.departmentId;

  const [newDate, setNewDate] = useState(() => {
    // Tomorrow by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const {
    slots,
    loading: slotsLoading,
    error: slotsError,
    hasConfiguredSchedule,
  } = useAppointmentAvailability(doctorId, departmentId, newDate);

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setLocalError('Please select a new available time slot.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setLocalError('Please provide a reason for rescheduling (at least 3 characters).');
      return;
    }

    setLocalError('');
    try {
      await onConfirm(appointment._id, {
        appointmentDate: newDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      // Handled by parent hook
    }
  };

  const patient = appointment.patientId || {};
  const doctor = appointment.doctorId || {};

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon reschedule">
              <Icon.Calendar />
            </div>
            <div>
              <h3 className="appt-modal-title">Reschedule Appointment</h3>
              <p className="appt-modal-subtitle">
                Patient: <strong>{patient.firstName} {patient.lastName}</strong> | Current: {appointment.startTime} ({new Date(appointment.appointmentDate).toLocaleDateString()})
              </p>
            </div>
          </div>
          <button className="appt-modal-close" onClick={onClose} aria-label="Close dialog">
            <Icon.X />
          </button>
        </div>

        <form onSubmit={handleReschedule} className="appt-modal-body">
          {(error || localError || slotsError) && (
            <div className="appt-dialog-error">
              <Icon.AlertTriangle />
              <span>{error || localError || slotsError}</span>
            </div>
          )}

          <div className="appt-reschedule-layout">
            {/* New Date Picker */}
            <div className="appt-form-field">
              <label htmlFor="reschedule-date" className="appt-field-label">
                Select New Date <span className="req">*</span>
              </label>
              <Md3DatePicker
                id="reschedule-date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setSelectedSlot(null);
                }}
              />
            </div>

            {/* Slots Selection */}
            <div className="appt-form-field">
              <label className="appt-field-label">
                Select New Available Slot <span className="req">*</span>
              </label>
              <AvailabilitySelector
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                loading={slotsLoading}
                error={slotsError}
                hasConfiguredSchedule={hasConfiguredSchedule}
              />
            </div>

            {/* Reason */}
            <div className="appt-form-field">
              <label htmlFor="reschedule-reason" className="appt-field-label">
                Reason for Rescheduling <span className="req">*</span>
              </label>
              <input
                id="reschedule-reason"
                type="text"
                className="appt-input"
                placeholder="e.g. Patient requested morning slot instead"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="appt-modal-actions">
            <Md3Button variant="text" onClick={onClose} disabled={loading}>
              Cancel
            </Md3Button>
            <Md3Button
              type="submit"
              variant="primary"
              disabled={!selectedSlot || loading}
              loading={loading}
              loadingText="Rescheduling..."
            >
              <Icon.Check />
              <span>Confirm Reschedule</span>
            </Md3Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RescheduleDialog;
