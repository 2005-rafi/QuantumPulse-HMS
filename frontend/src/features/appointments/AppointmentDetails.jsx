import React from 'react';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import './AppointmentDashboard.css';

/**
 * AppointmentDetails — Comprehensive side sheet / dialog view for an appointment.
 */
export const AppointmentDetails = ({
  appointment,
  onClose,
  onCheckIn,
  onReschedule,
  onCancel,
  onMarkMissed,
}) => {
  if (!appointment) return null;

  const patient = appointment.patientId || {};
  const doctor = appointment.doctorId || {};
  const department = appointment.departmentId || {};
  const visit = appointment.visitId;

  const isScheduled = appointment.status === 'SCHEDULED';
  const isCheckedIn = appointment.status === 'CHECKED_IN';

  return (
    <div className="appt-details-panel">
      {/* Header */}
      <div className="appt-details-header">
        <div>
          <span className="appt-details-tag">{appointment.appointmentType || 'SCHEDULED'} APPOINTMENT</span>
          <h2 className="appt-details-title">{appointment.appointmentNumber}</h2>
        </div>
        <div className="appt-details-header-actions">
          <AppointmentStatusBadge status={appointment.status} />
          {onClose && (
            <button className="appt-details-close" onClick={onClose} aria-label="Close details">
              <Icon.X />
            </button>
          )}
        </div>
      </div>

      <div className="appt-details-body">
        {/* Patient Card */}
        <div className="appt-details-section">
          <div className="appt-section-header">
            <Icon.User />
            <h3>Patient Information</h3>
          </div>
          <div className="appt-info-grid">
            <div className="appt-info-item">
              <span className="appt-info-label">Full Name</span>
              <span className="appt-info-val">
                {patient.firstName} {patient.lastName || ''}
              </span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">MRN</span>
              <span className="appt-info-val"><code>{patient.mrn || '—'}</code></span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">Gender / Age</span>
              <span className="appt-info-val">
                {patient.gender || '—'} {patient.age ? `(${patient.age} yrs)` : ''}
              </span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">Contact Phone</span>
              <span className="appt-info-val">{patient.phone || '—'}</span>
            </div>
          </div>
        </div>

        {/* Clinical Assignment Card */}
        <div className="appt-details-section">
          <div className="appt-section-header">
            <Icon.Activity />
            <h3>Clinical Consultation Details</h3>
          </div>
          <div className="appt-info-grid">
            <div className="appt-info-item">
              <span className="appt-info-label">Assigned Doctor</span>
              <span className="appt-info-val">Dr. {doctor.fullName || '—'}</span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">Specialization</span>
              <span className="appt-info-val">{doctor.primarySpecialization || doctor.position || '—'}</span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">Department</span>
              <span className="appt-info-val">{department.name || 'General OPD'}</span>
            </div>
            <div className="appt-info-item">
              <span className="appt-info-label">Scheduled Date & Time</span>
              <span className="appt-info-val highlight">
                {appointment.startTime} – {appointment.endTime} (
                {new Date(appointment.appointmentDate).toLocaleDateString()})
              </span>
            </div>
          </div>
        </div>

        {/* Reason / Notes */}
        {(appointment.reason || appointment.notes) && (
          <div className="appt-details-section">
            <div className="appt-section-header">
              <Icon.FileText />
              <h3>Reason & Clinical Notes</h3>
            </div>
            {appointment.reason && (
              <div className="appt-notes-box">
                <strong>Chief Reason:</strong> {appointment.reason}
              </div>
            )}
            {appointment.notes && (
              <div className="appt-notes-box notes">
                <strong>Reception Notes:</strong> {appointment.notes}
              </div>
            )}
          </div>
        )}

        {/* Linked Visit & Token info (If Checked In) */}
        {visit && (
          <div className="appt-details-section visit-highlight">
            <div className="appt-section-header">
              <Icon.CheckCircle />
              <h3>Linked OPD Visit</h3>
            </div>
            <div className="appt-info-grid">
              <div className="appt-info-item">
                <span className="appt-info-label">Visit Number</span>
                <span className="appt-info-val"><code>{visit.visitNumber}</code></span>
              </div>
              <div className="appt-info-item">
                <span className="appt-info-label">Queue Token</span>
                <span className="appt-info-val token-big">{visit.tokenString || '—'}</span>
              </div>
              <div className="appt-info-item">
                <span className="appt-info-label">Visit Status</span>
                <span className="appt-info-val">{visit.status}</span>
              </div>
              <div className="appt-info-item">
                <span className="appt-info-label">Checked In At</span>
                <span className="appt-info-val">
                  {appointment.checkedInAt ? new Date(appointment.checkedInAt).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule history */}
        {appointment.rescheduledFrom && (
          <div className="appt-details-section audit-trail">
            <div className="appt-section-header">
              <Icon.History />
              <h3>Rescheduling History</h3>
            </div>
            <p className="appt-audit-text">
              Rescheduled from <strong>{appointment.rescheduledFrom.startTime}</strong> on{' '}
              <strong>{new Date(appointment.rescheduledFrom.appointmentDate).toLocaleDateString()}</strong>.
              <br />
              Reason: <em>"{appointment.rescheduledFrom.reason || 'N/A'}"</em>
            </p>
          </div>
        )}

        {/* Cancellation details */}
        {appointment.status === 'CANCELLED' && (
          <div className="appt-details-section cancellation-box">
            <div className="appt-section-header">
              <Icon.AlertTriangle />
              <h3>Cancellation Reason</h3>
            </div>
            <p className="appt-cancel-reason-text">
              "{appointment.cancellationReason || 'No reason specified'}"
            </p>
            {appointment.cancelledAt && (
              <span className="appt-timestamp-sub">
                Cancelled on {new Date(appointment.cancelledAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {isScheduled && (
        <div className="appt-details-footer">
          <div className="appt-footer-left">
            <Md3Button
              variant="error"
              onClick={() => onCancel && onCancel(appointment)}
            >
              <Icon.Trash />
              <span>Cancel</span>
            </Md3Button>
            <Md3Button
              variant="secondary"
              onClick={() => onMarkMissed && onMarkMissed(appointment)}
            >
              <span>Mark Missed</span>
            </Md3Button>
          </div>
          <div className="appt-footer-right">
            <Md3Button
              variant="secondary"
              onClick={() => onReschedule && onReschedule(appointment)}
            >
              <Icon.Calendar />
              <span>Reschedule</span>
            </Md3Button>
            <Md3Button
              variant="primary"
              onClick={() => onCheckIn && onCheckIn(appointment)}
            >
              <Icon.UserCheck />
              <span>Check In Patient</span>
            </Md3Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetails;
