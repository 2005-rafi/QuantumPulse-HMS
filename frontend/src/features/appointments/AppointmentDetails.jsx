import React from 'react';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import { formatDoctorName } from '../../utils/patientFormatters';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import './AppointmentDashboard.css';

/**
 * AppointmentDetails — Expanded Dual-Axis Material 3 Clinical Modal View.
 * Balanced 2-column clinical dashboard architecture with clear typography,
 * contextual iconography, and pure Material 3 visual hierarchy.
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

  // Sanitize notes in case of repeated Dr. prefixes
  const sanitizeNotes = (notes) => {
    if (!notes) return '';
    return notes.replace(/Dr\.\s+Dr\./gi, 'Dr.');
  };

  return (
    <div className="appt-details-panel">
      {/* ── HEADER ── */}
      <div className="appt-details-header">
        <div className="appt-details-header-left">
          <div className="appt-details-type-pill">
            <Icon.Calendar />
            <span>{appointment.appointmentType || 'SCHEDULED'} APPOINTMENT</span>
          </div>
          <h2 className="appt-details-title">{appointment.appointmentNumber}</h2>
        </div>
        <div className="appt-details-header-actions">
          <AppointmentStatusBadge status={appointment.status} />
          {onClose && (
            <button className="appt-details-close" onClick={onClose} aria-label="Close details dialog">
              <Icon.X />
            </button>
          )}
        </div>
      </div>

      {/* ── BODY (2-COLUMN DUAL-AXIS EXPANDED GRID) ── */}
      <div className="appt-details-body">
        <div className="appt-details-2col-grid">

          {/* ──── LEFT COLUMN: PATIENT & CLINICAL NOTES ──── */}
          <div className="appt-details-col">
            
            {/* Card 1: Patient Information */}
            <div className="appt-details-section">
              <div className="appt-section-header">
                <div className="appt-section-icon-wrap">
                  <Icon.Person />
                </div>
                <h3>Patient Information</h3>
              </div>
              <div className="appt-info-grid">
                <div className="appt-info-item">
                  <span className="appt-info-label">Full Name</span>
                  <span className="appt-info-val appt-info-val--highlight">
                    {patient.firstName} {patient.lastName || ''}
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Medical Record Number</span>
                  <span className="appt-info-val">
                    <code className="appt-code-badge">{patient.mrn || '—'}</code>
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Gender & Age</span>
                  <span className="appt-info-val">
                    {patient.gender || '—'} {patient.age ? `(${patient.age} yrs)` : ''}
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Contact Phone</span>
                  <span className="appt-info-val">
                    {patient.phone ? (
                      <span className="appt-phone-link">
                        <Icon.Phone />
                        <span>{patient.phone}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                {patient.address?.city && (
                  <div className="appt-info-item appt-info-item--full">
                    <span className="appt-info-label">Location</span>
                    <span className="appt-info-val">
                      <Icon.Location /> {patient.address.city}
                      {patient.address.state ? `, ${patient.address.state}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Clinical Reason & Notes */}
            {(appointment.reason || appointment.notes) && (
              <div className="appt-details-section">
                <div className="appt-section-header">
                  <div className="appt-section-icon-wrap">
                    <Icon.FileText />
                  </div>
                  <h3>Reason & Clinical Notes</h3>
                </div>
                <div className="appt-notes-stack">
                  {appointment.reason && (
                    <div className="appt-notes-box appt-notes-box--reason">
                      <span className="appt-notes-tag">Chief Reason</span>
                      <p className="appt-notes-content">{appointment.reason}</p>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="appt-notes-box appt-notes-box--reception">
                      <span className="appt-notes-tag">Reception Notes</span>
                      <p className="appt-notes-content">{sanitizeNotes(appointment.notes)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card 3: Rescheduling History (if any) */}
            {appointment.rescheduledFrom && (
              <div className="appt-details-section appt-details-section--history">
                <div className="appt-section-header">
                  <div className="appt-section-icon-wrap">
                    <Icon.History />
                  </div>
                  <h3>Rescheduling History</h3>
                </div>
                <div className="appt-audit-box">
                  <p className="appt-audit-text">
                    Rescheduled from <strong>{appointment.rescheduledFrom.startTime}</strong> on{' '}
                    <strong>{new Date(appointment.rescheduledFrom.appointmentDate).toLocaleDateString()}</strong>.
                  </p>
                  {appointment.rescheduledFrom.reason && (
                    <p className="appt-audit-reason">
                      Reason: <em>"{appointment.rescheduledFrom.reason}"</em>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Card 4: Cancellation Alert (if cancelled) */}
            {appointment.status === 'CANCELLED' && (
              <div className="appt-details-section appt-details-section--cancelled">
                <div className="appt-section-header">
                  <div className="appt-section-icon-wrap appt-section-icon-wrap--error">
                    <Icon.Alert />
                  </div>
                  <h3>Cancellation Record</h3>
                </div>
                <div className="appt-cancel-box">
                  <p className="appt-cancel-reason-text">
                    "{appointment.cancellationReason || 'No specific cancellation reason provided.'}"
                  </p>
                  {appointment.cancelledAt && (
                    <span className="appt-timestamp-sub">
                      Cancelled on {new Date(appointment.cancelledAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ──── RIGHT COLUMN: CLINICAL CONSULTATION & LINKED VISIT ──── */}
          <div className="appt-details-col">

            {/* Card 5: Clinical Consultation Details */}
            <div className="appt-details-section">
              <div className="appt-section-header">
                <div className="appt-section-icon-wrap">
                  <Icon.Stethoscope />
                </div>
                <h3>Clinical Consultation</h3>
              </div>
              <div className="appt-info-grid">
                <div className="appt-info-item">
                  <span className="appt-info-label">Assigned Doctor</span>
                  <span className="appt-info-val appt-info-val--highlight">
                    {formatDoctorName(doctor.fullName || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim())}
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Specialization</span>
                  <span className="appt-info-val">
                    {doctor.primarySpecialization || doctor.position || 'General Practice'}
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Department</span>
                  <span className="appt-info-val">
                    <span className="appt-dept-pill">
                      <Icon.Hospital />
                      <span>{department.name || 'General OPD'}</span>
                    </span>
                  </span>
                </div>
                <div className="appt-info-item">
                  <span className="appt-info-label">Scheduled Date & Time</span>
                  <span className="appt-info-val appt-slot-highlight">
                    <Icon.Clock />
                    <span>
                      {appointment.startTime} – {appointment.endTime} ({new Date(appointment.appointmentDate).toLocaleDateString()})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 6: Linked OPD Visit & Queue Token */}
            {visit ? (
              <div className="appt-details-section appt-details-section--visit">
                <div className="appt-section-header">
                  <div className="appt-section-icon-wrap appt-section-icon-wrap--success">
                    <Icon.CheckCircle />
                  </div>
                  <h3>Linked OPD Visit & Queue</h3>
                </div>
                <div className="appt-info-grid">
                  <div className="appt-info-item">
                    <span className="appt-info-label">Visit Number</span>
                    <span className="appt-info-val">
                      <code className="appt-code-badge">{visit.visitNumber}</code>
                    </span>
                  </div>
                  <div className="appt-info-item">
                    <span className="appt-info-label">Queue Token</span>
                    <span className="appt-token-hero">
                      {visit.tokenString || '—'}
                    </span>
                  </div>
                  <div className="appt-info-item">
                    <span className="appt-info-label">Visit Status</span>
                    <span className="appt-info-val appt-visit-status-badge">
                      {visit.status}
                    </span>
                  </div>
                  <div className="appt-info-item">
                    <span className="appt-info-label">Checked In At</span>
                    <span className="appt-info-val">
                      {appointment.checkedInAt ? new Date(appointment.checkedInAt).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="appt-details-section appt-details-section--pending-checkin">
                <div className="appt-section-header">
                  <div className="appt-section-icon-wrap">
                    <Icon.Activity />
                  </div>
                  <h3>OPD Visit Status</h3>
                </div>
                <div className="appt-pending-visit-notice">
                  <Icon.Clock />
                  <div>
                    <strong>Patient has not checked in yet</strong>
                    <p>Upon check-in, an active OPD Visit record and dynamic Queue Token will be generated automatically.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── FOOTER ACTIONS (Only rendered when scheduling actions exist) ── */}
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
