import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import './AppointmentDashboard.css';

/**
 * CheckInDialog — Controlled modal for checking in a scheduled patient.
 * Creates an active OPD Visit with department-prefixed token.
 */
export const CheckInDialog = ({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) => {
  const [checkedInResult, setCheckedInResult] = useState(null);

  if (!isOpen || !appointment) return null;

  const handleCheckIn = async () => {
    try {
      const res = await onConfirm(appointment._id);
      setCheckedInResult(res);
    } catch (e) {
      // Error handled by parent hook
    }
  };

  const patient = appointment.patientId || {};
  const doctor = appointment.doctorId || {};
  const department = appointment.departmentId || {};

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon check-in">
              <Icon.UserCheck />
            </div>
            <div>
              <h3 className="appt-modal-title">Patient Check-In</h3>
              <p className="appt-modal-subtitle">
                Confirm patient arrival & generate OPD Queue Token
              </p>
            </div>
          </div>
          <button className="appt-modal-close" onClick={onClose} aria-label="Close dialog">
            <Icon.X />
          </button>
        </div>

        {/* Success State */}
        {checkedInResult ? (
          <div className="appt-checkin-success">
            <div className="appt-token-pill">
              <span className="appt-token-label">Queue Token</span>
              <span className="appt-token-val">
                {checkedInResult.visit?.tokenString || 'GENERATED'}
              </span>
            </div>
            <p className="appt-success-msg">
              <strong>{patient.firstName} {patient.lastName}</strong> has been checked in.
            </p>
            <p className="appt-success-sub">
              Visit Ticket: <code>{checkedInResult.visit?.visitNumber}</code>
              <br />
              Status: <strong>Waiting for Nurse Triage</strong>
            </p>
            <div className="appt-modal-actions">
              <Md3Button variant="primary" onClick={onClose}>
                Done
              </Md3Button>
            </div>
          </div>
        ) : (
          /* Confirmation Content */
          <div className="appt-modal-body">
            {error && (
              <div className="appt-dialog-error">
                <Icon.AlertTriangle />
                <span>{error}</span>
              </div>
            )}

            <div className="appt-summary-card">
              <div className="appt-summary-row">
                <span className="appt-summary-label">Patient</span>
                <span className="appt-summary-value">
                  {patient.firstName} {patient.lastName} (MRN: {patient.mrn || '—'})
                </span>
              </div>
              <div className="appt-summary-row">
                <span className="appt-summary-label">Doctor</span>
                <span className="appt-summary-value">Dr. {doctor.fullName || '—'}</span>
              </div>
              <div className="appt-summary-row">
                <span className="appt-summary-label">Department</span>
                <span className="appt-summary-value">{department.name || 'General OPD'}</span>
              </div>
              <div className="appt-summary-row">
                <span className="appt-summary-label">Scheduled Time</span>
                <span className="appt-summary-value">
                  {appointment.startTime} – {appointment.endTime} (
                  {new Date(appointment.appointmentDate).toLocaleDateString()})
                </span>
              </div>
              {appointment.reason && (
                <div className="appt-summary-row">
                  <span className="appt-summary-label">Chief Reason</span>
                  <span className="appt-summary-value">{appointment.reason}</span>
                </div>
              )}
            </div>

            <p className="appt-checkin-tip">
              Checking in will immediately route the patient to the <strong>Nurse Triage Queue</strong>.
            </p>

            <div className="appt-modal-actions">
              <Md3Button variant="text" onClick={onClose} disabled={loading}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="primary"
                onClick={handleCheckIn}
                loading={loading}
                loadingText="Checking In..."
              >
                <Icon.Check />
                <span>Confirm Check-In</span>
              </Md3Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CheckInDialog;
