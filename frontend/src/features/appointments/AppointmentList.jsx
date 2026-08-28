import React from 'react';
import { Md3DataTable, Icon } from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { formatDoctorName } from '../../utils/patientFormatters';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
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
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedAppointments,
    showTopPagination,
  } = usePagination(appointments, 50, [appointments.length]);

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
            <span className="appt-doctor-name">{formatDoctorName(doc.fullName)}</span>
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
        if (!v) return <span className="appt-empty-token">—</span>;
        return (
          <span className="appt-token-chip">
            #{v.tokenNumber || '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const isScheduled = row.status === 'SCHEDULED';
        const isCheckedIn = row.status === 'CHECKED_IN';
        const isCompleted = row.status === 'COMPLETED';
        const isCancelled = row.status === 'CANCELLED';
        const isMissed = row.status === 'MISSED';

        return (
          <div className="appt-row-actions" onClick={(e) => e.stopPropagation()}>
            {isScheduled && (
              <>
                <button
                  type="button"
                  className="appt-action-btn checkin"
                  title="Check In Patient"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckIn && onCheckIn(row);
                  }}
                >
                  <Icon.Check />
                  <span>Check In</span>
                </button>

                <button
                  type="button"
                  className="appt-action-btn secondary"
                  title="Reschedule Appointment"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReschedule && onReschedule(row);
                  }}
                  aria-label="Reschedule appointment"
                >
                  <Icon.Clock />
                </button>

                <button
                  type="button"
                  className="appt-action-btn danger"
                  title="Cancel Appointment"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel && onCancel(row);
                  }}
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
              onClick={(e) => {
                e.stopPropagation();
                onSelectAppointment && onSelectAppointment(row);
              }}
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
      {/* Top Pagination (rendered when total records exceed 20) */}
      {showTopPagination && (
        <Md3Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="appointments"
          position="top"
        />
      )}

      <div className="md3-paginated-content-fade" key={page}>
        <Md3DataTable
          columns={columns}
          rows={paginatedAppointments}
          loading={loading}
          onRowClick={onSelectAppointment}
          emptyState={
            <div className="appt-empty-state">
              <Icon.Calendar />
              <h3>No Appointments Found</h3>
              <p>Try adjusting your search criteria or book a new appointment.</p>
            </div>
          }
        />
      </div>

      {/* Bottom Pagination */}
      {totalItems > 0 && (
        <Md3Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="appointments"
          position="bottom"
        />
      )}
    </div>
  );
};

export default AppointmentList;
