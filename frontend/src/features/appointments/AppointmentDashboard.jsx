import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppointments } from '../../hooks/useAppointments';
import { useAppointmentActions } from '../../hooks/useAppointmentActions';
import AppointmentFilters from './AppointmentFilters';
import AppointmentList from './AppointmentList';
import AppointmentForm from './AppointmentForm';
import AppointmentDetails from './AppointmentDetails';
import CheckInDialog from './CheckInDialog';
import CancelDialog from './CancelDialog';
import RescheduleDialog from './RescheduleDialog';
import DoctorScheduleManager from './DoctorScheduleManager';
import { Md3BottomSheet, Md3Fab, Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import './AppointmentDashboard.css';

/**
 * AppointmentDashboard — Full operational workspace for Receptionists & Admins.
 * SOLID: SRP — orchestrates appointment views, filters, and modal dialogues.
 */
export const AppointmentDashboard = ({ user, onVisitCreated }) => {
  const {
    appointments,
    summary,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters,
    refresh,
  } = useAppointments();

  // Dialog / Sheet states
  const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
  const [isScheduleManagerOpen, setIsScheduleManagerOpen] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState(null);
  const [appointmentForCheckIn, setAppointmentForCheckIn] = useState(null);
  const [appointmentForCancel, setAppointmentForCancel] = useState(null);
  const [appointmentForReschedule, setAppointmentForReschedule] = useState(null);

  const handleActionSuccess = (actionType, data) => {
    refresh();
    if (actionType === 'CHECK_IN' && onVisitCreated && data?.visit) {
      onVisitCreated({ patient: data.appointment?.patientId, visit: data.visit });
    }
  };

  const {
    checkIn,
    reschedule,
    cancel,
    markMissed,
    loading: actionLoading,
    error: actionError,
    clearError,
  } = useAppointmentActions(handleActionSuccess);

  const [appointmentForMissed, setAppointmentForMissed] = useState(null);

  const handleOpenCheckIn = (appt) => {
    clearError();
    setAppointmentForCheckIn(appt);
  };

  const handleOpenCancel = (appt) => {
    clearError();
    setAppointmentForCancel(appt);
  };

  const handleOpenReschedule = (appt) => {
    clearError();
    setAppointmentForReschedule(appt);
  };

  const handleMarkMissed = (appt) => {
    clearError();
    setAppointmentForMissed(appt);
  };

  const handleConfirmMissed = async () => {
    if (appointmentForMissed) {
      await markMissed(appointmentForMissed._id);
      setAppointmentForMissed(null);
    }
  };

  const handleBookingSuccess = (createdAppt) => {
    setIsBookSheetOpen(false);
    refresh();
  };

  const isAdmin = user?.role === 'Administrator';

  return (
    <div className="appt-dashboard">
      {/* Top Header & Admin Schedule Trigger */}
      <div className="appt-stats-grid">
        <div className="appt-stat-card">
          <div className="appt-stat-icon total">
            <Icon.Calendar />
          </div>
          <div>
            <div className="appt-stat-val">{summary.total || 0}</div>
            <div className="appt-stat-label">Total Today</div>
          </div>
        </div>

        <div className="appt-stat-card">
          <div className="appt-stat-icon scheduled">
            <Icon.Clock />
          </div>
          <div>
            <div className="appt-stat-val">{summary.SCHEDULED || 0}</div>
            <div className="appt-stat-label">Scheduled / Pending</div>
          </div>
        </div>

        <div className="appt-stat-card">
          <div className="appt-stat-icon checked-in">
            <Icon.UserCheck />
          </div>
          <div>
            <div className="appt-stat-val">{summary.CHECKED_IN || 0}</div>
            <div className="appt-stat-label">Checked In / Triage</div>
          </div>
        </div>

        <div className="appt-stat-card">
          <div className="appt-stat-icon completed">
            <Icon.CheckCircle />
          </div>
          <div>
            <div className="appt-stat-val">{summary.COMPLETED || 0}</div>
            <div className="appt-stat-label">Consulted</div>
          </div>
        </div>

        <div className="appt-stat-card">
          <div className="appt-stat-icon cancelled">
            <Icon.XCircle />
          </div>
          <div>
            <div className="appt-stat-val">{summary.CANCELLED || 0}</div>
            <div className="appt-stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Admin Schedule Configuration Button */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Md3Button
            variant="secondary"
            onClick={() => setIsScheduleManagerOpen(true)}
            className="appt-manage-schedules-btn"
          >
            <Icon.Settings />
            <span>Manage Doctor Schedules</span>
          </Md3Button>
        </div>
      )}

      {/* Filter Toolbar with Book Appointment primary action */}
      <AppointmentFilters
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        onRefresh={refresh}
        onBookAppointment={() => setIsBookSheetOpen(true)}
        loading={loading}
      />

      {/* Appointment Data Table */}
      <AppointmentList
        appointments={appointments}
        loading={loading}
        onSelectAppointment={(appt) => setSelectedAppointmentForDetails(appt)}
        onCheckIn={handleOpenCheckIn}
        onReschedule={handleOpenReschedule}
        onCancel={handleOpenCancel}
        onMarkMissed={handleMarkMissed}
      />

      {/* Floating Action Button for Booking (Portalled directly to body for true viewport docking) */}
      {createPortal(
        <div className="reception-fab-dock">
          <Md3Fab
            icon={<Icon.Plus />}
            label="Book Appointment"
            onClick={() => setIsBookSheetOpen(true)}
            ariaLabel="Book New Appointment"
          />
        </div>,
        document.body
      )}

      {/* ── BOTTOM SHEETS & DIALOGS (Portalled directly to document.body for true full-screen overlay) ── */}

      {/* ── Book Appointment Wizard Dialog ── */}
      {isBookSheetOpen && createPortal(
        <div className="appt-modal-backdrop" onClick={() => setIsBookSheetOpen(false)}>
          <div className="appt-modal-container modal-expanded" onClick={(e) => e.stopPropagation()}>
            <div className="appt-modal-header">
              <div className="appt-modal-title-group">
                <div className="appt-modal-icon booking">
                  <Icon.Calendar />
                </div>
                <div>
                  <h3 className="appt-modal-title">Book Doctor Appointment</h3>
                  <p className="appt-modal-subtitle">
                    Schedule planned consultation and assign time slot
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="appt-modal-close"
                onClick={() => setIsBookSheetOpen(false)}
                aria-label="Close dialog"
              >
                <Icon.X />
              </button>
            </div>

            <div className="appt-modal-body no-padding">
              <AppointmentForm
                onSuccess={handleBookingSuccess}
                onCancel={() => setIsBookSheetOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Details Dialog */}
      {selectedAppointmentForDetails && createPortal(
        <div className="appt-modal-backdrop" onClick={() => setSelectedAppointmentForDetails(null)}>
          <div className="appt-modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
            <AppointmentDetails
              appointment={selectedAppointmentForDetails}
              onClose={() => setSelectedAppointmentForDetails(null)}
              onCheckIn={(appt) => {
                setSelectedAppointmentForDetails(null);
                handleOpenCheckIn(appt);
              }}
              onReschedule={(appt) => {
                setSelectedAppointmentForDetails(null);
                handleOpenReschedule(appt);
              }}
              onCancel={(appt) => {
                setSelectedAppointmentForDetails(null);
                handleOpenCancel(appt);
              }}
              onMarkMissed={(appt) => {
                setSelectedAppointmentForDetails(null);
                handleMarkMissed(appt);
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Check In Dialog */}
      <CheckInDialog
        appointment={appointmentForCheckIn}
        isOpen={!!appointmentForCheckIn}
        onClose={() => setAppointmentForCheckIn(null)}
        onConfirm={checkIn}
        loading={actionLoading}
        error={actionError}
      />

      {/* Cancel Dialog */}
      <CancelDialog
        appointment={appointmentForCancel}
        isOpen={!!appointmentForCancel}
        onClose={() => setAppointmentForCancel(null)}
        onConfirm={cancel}
        loading={actionLoading}
        error={actionError}
      />

      {/* Reschedule Dialog */}
      <RescheduleDialog
        appointment={appointmentForReschedule}
        isOpen={!!appointmentForReschedule}
        onClose={() => setAppointmentForReschedule(null)}
        onConfirm={reschedule}
        loading={actionLoading}
        error={actionError}
      />

      {/* Missed Appointment Confirmation Dialog */}
      <Md3ConfirmDialog
        isOpen={!!appointmentForMissed}
        onClose={() => setAppointmentForMissed(null)}
        onConfirm={handleConfirmMissed}
        title="Mark Appointment as Missed?"
        message={`Are you sure you want to mark appointment ${appointmentForMissed?.appointmentNumber || ''} (${appointmentForMissed?.patientId?.fullName || 'Patient'}) as MISSED?`}
        confirmLabel="Mark Missed"
        cancelLabel="Keep Scheduled"
        variant="warning"
        icon="event_busy"
        loading={actionLoading}
      />

      {/* Admin Schedule Manager Sheet / Dialog */}
      {isScheduleManagerOpen && createPortal(
        <div className="appt-modal-backdrop" onClick={() => setIsScheduleManagerOpen(false)}>
          <div className="appt-modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
            <DoctorScheduleManager onClose={() => setIsScheduleManagerOpen(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AppointmentDashboard;
