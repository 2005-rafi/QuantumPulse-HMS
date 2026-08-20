import React from 'react';
import { Md3DataTable, Icon } from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import './AppointmentDashboard.css';

/**
 * AppointmentList — Operational data table with action buttons per status.
 */
export const AppointmentList = ({
  appointments = [],
  loading = false,
  onSelectAppointment,
  onCheckIn,
  onReschedule,
  onCancel,
  onMarkMissed,
}) => {
  const columns = [
    {
      key: 'appointmentNumber',
      header: 'Appt ID',
      render: (row) => (
        <span className="appt-id-code">
          {row.appointmentNumber || row._id?.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => {
        const p = row.patientId || {};
        return (
          <div className="appt-patient-cell">
            <span className="appt-patient-name">
              {p.firstName ? `${p.firstName} ${p.lastName || ''}` : 'Unknown Patient'}
            </span>
            <span className="appt-patient-mrn">MRN: {p.mrn || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => {
        const d = row.departmentId || {};
        return (
          <span className="appt-dept-badge">
            {d.name || 'General OPD'}
          </span>
        );
      },
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => {
        const doc = row.doctorId || {};
        return (
          <div className="appt-doctor-cell">
            <span className="appt-doctor-name">Dr. {doc.fullName || '—'}</span>
            <span className="appt-doctor-spec">{doc.primarySpecialization || doc.position || ''}</span>
          </div>
        );
      },
    },
    {
      key: 'dateTime',
      header: 'Schedule',
      render: (row) => (
        <div className="appt-time-cell">
          <span className="appt-time-val">{row.startTime} – {row.endTime}</span>
          <span className="appt-date-sub">
            {row.appointmentDate ? new Date(row.appointmentDate).toLocaleDateString() : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`appt-type-tag ${row.appointmentType?.toLowerCase() || 'scheduled'}`}>
          {row.appointmentType || 'SCHEDULED'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AppointmentStatusBadge status={row.status} />,
    },
    {
      key: 'token',
      header: 'Visit / Token',
      render: (row) => {
        const v = row.visitId;
        if (!v) return <span className="text-muted">—</span>;
        return (
          <div className="appt-token-cell">
            {v.tokenString ? (
              <span className="appt-token-pill small">{v.tokenString}</span>
            ) : (
              <span className="appt-visit-num">{v.visitNumber}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const isScheduled = row.status === 'SCHEDULED';
        const isCheckedIn = row.status === 'CHECKED_IN';

        return (
          <div className="appt-actions-cell" onClick={(e) => e.stopPropagation()}>
            {isScheduled && (
              <>
                <button
                  type="button"
                  className="appt-action-btn checkin"
                  title="Check In Patient"
                  onClick={() => onCheckIn && onCheckIn(row)}
                  aria-label="Check in patient"
                >
                  <Icon.UserCheck />
                  <span>Check In</span>
                </button>
                <button
                  type="button"
                  className="appt-action-btn secondary"
                  title="Reschedule"
                  onClick={() => onReschedule && onReschedule(row)}
                  aria-label="Reschedule appointment"
                >
                  <Icon.Calendar />
                </button>
                <button
                  type="button"
                  className="appt-action-btn danger"
                  title="Cancel"
                  onClick={() => onCancel && onCancel(row)}
                  aria-label="Cancel appointment"
                >
                  <Icon.X />
                </button>
              </>
            )}

            {isCheckedIn && (
              <span className="appt-checkedin-indicator">
                <Icon.CheckCircle />
                <span>In Triage</span>
              </span>
            )}

            <button
              type="button"
              className="appt-action-btn detail"
              title="View Details"
              onClick={() => onSelectAppointment && onSelectAppointment(row)}
              aria-label="View appointment details"
            >
              <Icon.Eye />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="appt-list-container">
      <Md3DataTable
        columns={columns}
        rows={appointments}
        loading={loading}
        emptyState={
          <div className="appt-empty-state">
            <Icon.Calendar />
            <h3>No Appointments Found</h3>
            <p>Try adjusting your search criteria or book a new appointment.</p>
          </div>
        }
      />
    </div>
  );
};

export default AppointmentList;
