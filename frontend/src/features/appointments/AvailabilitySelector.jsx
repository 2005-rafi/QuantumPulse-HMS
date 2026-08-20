import React from 'react';
import { Icon } from '../../components/md3/Md3Widgets';
import './AppointmentDashboard.css';

/**
 * AvailabilitySelector — Interactive MD3 Slot Grid for booking & rescheduling.
 */
export const AvailabilitySelector = ({
  slots = [],
  selectedSlot = null,
  onSelectSlot,
  loading = false,
  error = null,
  hasConfiguredSchedule = true,
}) => {
  if (loading) {
    return (
      <div className="appt-slots-loading">
        <span className="md3-spinner md3-spinner--sm" />
        <span>Calculating available time slots...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="appt-slots-error">
        <Icon.AlertTriangle />
        <span>{error}</span>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="appt-slots-empty">
        <Icon.Calendar />
        <p>No available appointment slots found for the selected doctor and date.</p>
      </div>
    );
  }

  return (
    <div className="appt-slots-container">
      {!hasConfiguredSchedule && (
        <div className="appt-schedule-notice">
          <Icon.Info />
          <span>Showing standard clinic hours (09:00 - 17:00)</span>
        </div>
      )}

      <div className="appt-slots-grid">
        {slots.map((slot) => {
          const isSelected = selectedSlot && selectedSlot.startTime === slot.startTime;
          const isFull = slot.status === 'FULL';
          const isPast = slot.status === 'PAST';
          const isDisabled = isFull || isPast;

          return (
            <button
              key={slot.slotId || `${slot.startTime}-${slot.endTime}`}
              type="button"
              className={`appt-slot-card ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''} ${isPast ? 'past' : ''}`}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectSlot && onSelectSlot(slot)}
              aria-label={`Time slot ${slot.startTime} to ${slot.endTime} (${slot.status})`}
            >
              <span className="appt-slot-time">
                {slot.startTime} – {slot.endTime}
              </span>
              <span className="appt-slot-badge">
                {isPast ? 'Past' : isFull ? 'Full' : `${slot.remainingCapacity} Left`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilitySelector;
