import React, { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../../services/appointmentAPI';
import { Icon } from '../../components/md3/Md3Widgets';
import { Md3Button, Md3DatePicker } from '../../components/md3/Md3FormComponents';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import './AppointmentDashboard.css';

/**
 * DoctorAppointmentView — Screen: Doctor Pre-Booked Appointments & Schedule.
 * Full Material Design 3 Expressive workstation for doctors.
 */
export const DoctorAppointmentView = ({ doctorId, onOpenVisit }) => {
  const [filterMode, setFilterMode] = useState('upcoming'); // 'today' | 'tomorrow' | 'upcoming' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTargetDate = (mode) => {
    const today = new Date();
    if (mode === 'today') {
      return today.toISOString().split('T')[0];
    }
    if (mode === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (mode === 'custom') {
      return customDate;
    }
    return null;
  };

  const fetchDoctorAppointments = useCallback(async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      setError(null);

      const targetDate = getTargetDate(filterMode);
      let res;

      if (filterMode === 'all') {
        res = await appointmentAPI.getAll({ doctorId, limit: 100 });
      } else if (filterMode === 'upcoming') {
        const todayStr = new Date().toISOString().split('T')[0];
        res = await appointmentAPI.getAll({ doctorId, startDate: todayStr, limit: 100 });
      } else if (targetDate) {
        res = await appointmentAPI.getDoctorAppointments(doctorId, { date: targetDate });
      } else {
        res = await appointmentAPI.getAll({ doctorId, limit: 100 });
      }

      const data = res.data?.data || res.data || {};
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];

      setAppointments(items);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
      setError(err.response?.data?.message || 'Unable to load appointment schedule');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, filterMode, customDate]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  // Statistics calculation
  const totalCount = appointments.length;
  const checkedInCount = appointments.filter((a) => a.status === 'CHECKED_IN').length;
  const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0].toUpperCase() : '';
    const l = lastName ? lastName[0].toUpperCase() : '';
    return `${f}${l}` || 'PT';
  };

  return (
    <div className="appt-doctor-schedule-view">
      {/* ─── HEADER & CONTROLS ─── */}
      <div className="appt-doc-sched-header">
        <div className="appt-doc-sched-title-group">
          <div className="appt-doc-icon-badge">
            <Icon.Calendar />
          </div>
          <div>
            <h3>Doctor's Appointment Schedule</h3>
            <p>Pre-booked patient consultations, arrival status & triage vitals</p>
          </div>
        </div>

        <div className="appt-doc-sched-controls">
          <div className="appt-doc-filter-chips">
            <button
              type="button"
              className={`appt-filter-chip ${filterMode === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilterMode('upcoming')}
            >
              Upcoming ({appointments.length > 0 && filterMode === 'upcoming' ? appointments.length : 'All'})
            </button>
            <button
              type="button"
              className={`appt-filter-chip ${filterMode === 'today' ? 'active' : ''}`}
              onClick={() => setFilterMode('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`appt-filter-chip ${filterMode === 'tomorrow' ? 'active' : ''}`}
              onClick={() => setFilterMode('tomorrow')}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`appt-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Records
            </button>
          </div>

          <div className="appt-doc-date-picker-wrap">
            <Md3DatePicker
              id="doc-sched-date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setFilterMode('custom');
              }}
            />
          </div>

          <Md3Button
            variant="secondary"
            onClick={fetchDoctorAppointments}
            loading={loading}
            className="appt-doc-refresh-btn"
          >
            <Icon.Refresh />
            <span>Refresh</span>
          </Md3Button>
        </div>
      </div>

      {/* ─── SUMMARY STATS STRIP ─── */}
      <div className="appt-doc-stats-grid">
        <div className="appt-doc-stat-card total">
          <div className="stat-card-icon">
            <Icon.Users />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{totalCount}</span>
            <span className="stat-card-label">Total Appointments</span>
          </div>
        </div>

        <div className="appt-doc-stat-card checked-in">
          <div className="stat-card-icon">
            <Icon.UserCheck />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{checkedInCount}</span>
            <span className="stat-card-label">Ready / Checked In</span>
          </div>
        </div>

        <div className="appt-doc-stat-card scheduled">
          <div className="stat-card-icon">
            <Icon.Clock />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{scheduledCount}</span>
            <span className="stat-card-label">Awaiting Arrival</span>
          </div>
        </div>

        <div className="appt-doc-stat-card completed">
          <div className="stat-card-icon">
            <Icon.CheckCircle />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{completedCount}</span>
            <span className="stat-card-label">Consulted</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN TIMELINE LIST ─── */}
      {loading && appointments.length > 0 && (
        <div className="appt-doc-progress-track">
          <div className="appt-doc-progress-indicator" />
        </div>
      )}

      {loading && appointments.length === 0 ? (
        <div className="appt-doc-loading-container">
          <span className="md3-spinner md3-spinner--md" />
          <span>Loading appointment schedule...</span>
        </div>
      ) : error ? (
        <div className="appt-doc-error-container">
          <Icon.AlertTriangle />
          <span>{error}</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="appt-doc-empty-state">
          <div className="empty-icon-circle">
            <Icon.Calendar />
          </div>
          <h4>No Appointments Found</h4>
          <p>
            {filterMode === 'today'
              ? 'You have no pre-booked consultations scheduled for today.'
              : filterMode === 'tomorrow'
              ? 'You have no pre-booked consultations scheduled for tomorrow.'
              : 'There are no pre-booked appointments matching the selected date criteria.'}
          </p>
          {filterMode !== 'upcoming' && filterMode !== 'all' && (
            <Md3Button variant="primary" onClick={() => setFilterMode('upcoming')} style={{ marginTop: '12px' }}>
              <Icon.Calendar />
              <span>View All Upcoming Appointments</span>
            </Md3Button>
          )}
        </div>
      ) : (
        <div className={`appt-doc-card-list ${loading ? 'is-fetching' : ''}`}>
          {appointments.map((appt) => {
            const patient = appt.patientId || {};
            const visit = appt.visitId;
            const vitals = visit?.vitals;
            const hasVitals = !!(vitals?.bloodPressureSystolic || vitals?.pulseRate || vitals?.chiefComplaint);
            const isCheckedIn = appt.status === 'CHECKED_IN' || visit?.status === 'WAITING_DOCTOR' || visit?.status === 'IN_PROGRESS';
            const isCompleted = appt.status === 'COMPLETED' || visit?.status === 'COMPLETED';

            const apptDateFormatted = appt.appointmentDate
              ? new Date(appt.appointmentDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            return (
              <div
                key={appt._id}
                className={`appt-doc-card ${isCheckedIn ? 'ready-consult' : ''} ${isCompleted ? 'done-consult' : ''}`}
              >
                {/* Time Badge Column */}
                <div className="appt-card-time-block">
                  <span className="appt-time-main">{appt.startTime || '—'}</span>
                  <span className="appt-time-end">to {appt.endTime || '—'}</span>
                  <span className="appt-date-pill">{apptDateFormatted}</span>
                  <span className="appt-type-pill">{appt.appointmentType || 'SCHEDULED'}</span>
                </div>

                {/* Patient Information Column */}
                <div className="appt-card-main-block">
                  <div className="appt-patient-hero-row">
                    <div className="appt-avatar-circle">
                      {getInitials(patient.firstName, patient.lastName)}
                    </div>
                    <div className="appt-patient-info">
                      <div className="appt-patient-name-line">
                        <h4>
                          {patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown Patient'}
                        </h4>
                        <span className="appt-mrn-pill">MRN: {patient.mrn || '—'}</span>
                        <AppointmentStatusBadge status={appt.status} />
                      </div>
                      <div className="appt-patient-demographics">
                        <span>
                          <strong>Age / Gender:</strong> {patient.age ? `${patient.age} yrs` : '—'}, {patient.gender || '—'}
                        </span>
                        {patient.bloodGroup && (
                          <span className="appt-blood-pill">
                            <Icon.Heart /> {patient.bloodGroup}
                          </span>
                        )}
                        <span className="appt-code-tag">
                          Appt #: <strong>{appt.appointmentNumber || '—'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason & Notes Row */}
                  <div className="appt-reason-row">
                    <div className="appt-reason-item">
                      <span className="reason-label">Chief Complaint / Reason:</span>
                      <span className="reason-text">{appt.reason || 'General Consultation'}</span>
                    </div>
                    {appt.departmentId?.name && (
                      <span className="appt-dept-pill">
                        <Icon.Activity /> {appt.departmentId.name}
                      </span>
                    )}
                  </div>

                  {/* Triage Vitals / Check-in Live Status Ribbon */}
                  {visit ? (
                    <div className={`appt-triage-ribbon ${hasVitals ? 'vitals-done' : 'vitals-waiting'}`}>
                      <div className="triage-ribbon-left">
                        {hasVitals ? (
                          <>
                            <Icon.CheckCircle />
                            <span className="triage-status-title">Triage Vitals Recorded</span>
                            <span className="triage-vitals-preview">
                              {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic
                                ? `BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg • `
                                : ''}
                              {vitals.pulseRate ? `Pulse: ${vitals.pulseRate} bpm • ` : ''}
                              {vitals.spO2 ? `SpO2: ${vitals.spO2}% • ` : ''}
                              {vitals.temperature ? `Temp: ${vitals.temperature}°F • ` : ''}
                              {vitals.weightKg ? `Weight: ${vitals.weightKg} kg` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <Icon.Clock />
                            <span className="triage-status-title">Checked In</span>
                            <span className="triage-status-sub">Patient in triage queue, waiting for nurse vitals</span>
                          </>
                        )}
                      </div>
                      <div className="triage-ribbon-right">
                        <span className="token-badge">
                          Token: <strong>{visit.tokenString || visit.visitNumber}</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="appt-triage-ribbon awaiting-arrival">
                      <Icon.Info />
                      <span>Pre-booked appointment. Patient has not yet checked in at reception.</span>
                    </div>
                  )}
                </div>

                {/* Action Column */}
                <div className="appt-card-action-block">
                  {visit ? (
                    <Md3Button
                      variant="primary"
                      onClick={() => onOpenVisit && onOpenVisit(visit._id || visit.id || visit)}
                      className="appt-start-btn"
                    >
                      <Icon.FileText />
                      <span>Open Patient File</span>
                    </Md3Button>
                  ) : (
                    <span className="appt-awaiting-badge">
                      <Icon.Clock />
                      <span>Awaiting Arrival</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentView;
