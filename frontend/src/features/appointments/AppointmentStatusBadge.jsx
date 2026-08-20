import React from 'react';
import './AppointmentDashboard.css';

/**
 * AppointmentStatusBadge — MD3 styled status indicator chip.
 */
export const AppointmentStatusBadge = ({ status }) => {
  const getStatusConfig = (s) => {
    switch (s) {
      case 'SCHEDULED':
        return { label: 'Scheduled', variant: 'scheduled' };
      case 'CHECKED_IN':
        return { label: 'Checked In', variant: 'checked-in' };
      case 'COMPLETED':
        return { label: 'Completed', variant: 'completed' };
      case 'CANCELLED':
        return { label: 'Cancelled', variant: 'cancelled' };
      case 'MISSED':
        return { label: 'Missed', variant: 'missed' };
      case 'RESCHEDULED':
        return { label: 'Rescheduled', variant: 'rescheduled' };
      default:
        return { label: s || 'Unknown', variant: 'default' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`appt-status-badge appt-status-${config.variant}`}>
      <span className="appt-status-dot" />
      {config.label}
    </span>
  );
};

export default AppointmentStatusBadge;
