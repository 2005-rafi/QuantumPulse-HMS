import React, { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../../services/appointmentAPI';
import { Icon } from '../../components/md3/Md3Widgets';
import { Md3Button, Md3DatePicker } from '../../components/md3/Md3FormComponents';
import ClinicalPatientOverlayDialog from '../../components/md3/ClinicalPatientOverlayDialog';
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
  const [activeOverlayType, setActiveOverlayType] = useState(null); // 'total' | 'checkedIn' | 'scheduled' | 'completed' | null

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

  const maskPhone = (phone) => {
    if (!phone) return null;
    const str = String(phone).trim();
    if (str.length <= 4) return str;
    return str.slice(0, 3) + '••••' + str.slice(-3);
  };

  const isNoneOrNkda = (text) => {
    if (!text) return true;
    if (typeof text === 'string') {
      const clean = text.trim().toUpperCase();
      return (
        clean === '' ||
        clean === 'NONE' ||
        clean === 'NIL' ||
        clean === 'NO' ||
        clean === 'NKDA' ||
        clean === 'NO KNOWN ALLERGIES' ||
        clean === 'NO KNOWN DRUG ALLERGIES' ||
        clean === 'N/A' ||
        clean === 'NULL' ||
        clean === 'UNDEFINED'
      );
    }
    return false;
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

      {/* ─── SUMMARY STATS STRIP (CLICKABLE ON-TAP OVERLAYS) ─── */}
      <div className="appt-doc-stats-grid">
        <div
          className="appt-doc-stat-card total clickable-stat-card"
          onClick={() => setActiveOverlayType('total')}
          title="Click to open full patients ledger overlay"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <Icon.Users />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{totalCount}</span>
            <span className="stat-card-label">Total Appointments</span>
          </div>
        </div>

        <div
          className="appt-doc-stat-card checked-in clickable-stat-card"
          onClick={() => setActiveOverlayType('checkedIn')}
          title="Click to open ready & checked-in patients ledger"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <Icon.UserCheck />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{checkedInCount}</span>
            <span className="stat-card-label">Ready / Checked In</span>
          </div>
        </div>

        <div
          className="appt-doc-stat-card scheduled clickable-stat-card"
          onClick={() => setActiveOverlayType('scheduled')}
          title="Click to open pre-booked patients awaiting arrival ledger"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <Icon.Clock />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-value">{scheduledCount}</span>
            <span className="stat-card-label">Awaiting Arrival</span>
          </div>
        </div>

        <div
          className="appt-doc-stat-card completed clickable-stat-card"
          onClick={() => setActiveOverlayType('completed')}
          title="Click to open completed consultations ledger"
          style={{ cursor: 'pointer' }}
        >
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
            const vitals = visit?.vitals || {};
            const hasVitals = !!(
              vitals.bloodPressureSystolic ||
              vitals.pulseRate ||
              vitals.temperature ||
              vitals.spO2 ||
              vitals.weightKg
            );
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

            // Allergies
            const rawAllergies = Array.isArray(patient.allergies)
              ? patient.allergies.filter(a => !isNoneOrNkda(a))
              : (typeof patient.allergies === 'string' && !isNoneOrNkda(patient.allergies))
                ? patient.allergies.split(',').map(s => s.trim()).filter(s => !isNoneOrNkda(s))
                : [];
            const hasAllergies = rawAllergies.length > 0;
            const allergyText = rawAllergies.join(', ');

            const maskedPhone = maskPhone(patient.phoneNumber);

            return (
              <div
                key={appt._id}
                className={`appt-doc-card ${isCheckedIn ? 'ready-consult' : ''} ${isCompleted ? 'done-consult' : ''}`}
              >
                {/* ── Left Schedule Box (Date & Slot) ── */}
                <div className="appt-card-schedule-box">
                  <div className="appt-date-header">
                    <Icon.Calendar size={13} />
                    <span>{apptDateFormatted}</span>
                  </div>
                  <div className="appt-time-slot">
                    <span className="appt-time-start">{appt.startTime || '—'}</span>
                    <span className="appt-time-sep">—</span>
                    <span className="appt-time-finish">{appt.endTime || '—'}</span>
                  </div>
                  <div className="appt-type-chip">
                    {appt.appointmentType === 'FOLLOW_UP' ? 'Follow-Up' : appt.appointmentType === 'WALK_IN' ? 'Walk-In' : 'Scheduled Consultation'}
                  </div>
                </div>

                {/* ── Center Patient Details & Clinical Snapshot ── */}
                <div className="appt-card-center-block">
                  {/* Row 1: Patient Demographics & Action */}
                  <div className="appt-patient-header-row">
                    <div className="appt-patient-identity-left">
                      <div className="appt-avatar-badge">
                        {getInitials(patient.firstName, patient.lastName)}
                      </div>
                      <div className="appt-patient-title-group">
                        <div className="appt-name-row">
                          <h4 className="appt-patient-name">
                            {patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown Patient'}
                          </h4>
                          <span className="appt-mrn-tag">MRN: {patient.mrn || '—'}</span>
                          <span className="appt-code-tag">Appt: {appt.appointmentNumber || '—'}</span>
                          <AppointmentStatusBadge status={appt.status} />
                        </div>

                        <div className="appt-demog-meta-row">
                          <span className="appt-demog-item">
                            <strong>{patient.age ? `${patient.age}y` : '—'}</strong> · {patient.gender || '—'}
                          </span>
                          {patient.bloodGroup && (
                            <span className="appt-blood-tag">
                              <Icon.Droplet />
                              <span>{patient.bloodGroup}</span>
                            </span>
                          )}
                          {maskedPhone && (
                            <span className="appt-phone-tag">
                              <Icon.Phone />
                              <span>{maskedPhone}</span>
                            </span>
                          )}
                          {hasAllergies ? (
                            <span className="appt-allergy-tag" title={`Allergy: ${allergyText}`}>
                              <Icon.Alert />
                              <span>Allergy: {allergyText}</span>
                            </span>
                          ) : (
                            <span className="appt-nkda-tag">
                              <Icon.Check />
                              <span>NKDA</span>
                            </span>
                          )}
                          {appt.departmentId?.name && (
                            <span className="appt-dept-tag">
                              <Icon.Activity />
                              <span>{appt.departmentId.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="appt-card-action-slot">
                      {visit ? (
                        <Md3Button
                          variant="primary"
                          onClick={() =>
                            onOpenVisit &&
                            onOpenVisit({
                              ...appt,
                              ...visit,
                              patientId: patient,
                              appointmentNumber: appt.appointmentNumber,
                              appointmentDate: appt.appointmentDate,
                              startTime: appt.startTime,
                              endTime: appt.endTime,
                              appointmentType: appt.appointmentType,
                              reason: appt.reason || visit.vitals?.chiefComplaint || visit.reason,
                            })
                          }
                          className="appt-start-btn"
                        >
                          <Icon.FileText />
                          <span>Open Patient File</span>
                        </Md3Button>
                      ) : (
                        <Md3Button
                          variant="secondary"
                          onClick={() =>
                            onOpenVisit &&
                            onOpenVisit({
                              ...appt,
                              patientId: patient,
                              appointmentNumber: appt.appointmentNumber,
                              appointmentDate: appt.appointmentDate,
                              startTime: appt.startTime,
                              endTime: appt.endTime,
                              appointmentType: appt.appointmentType,
                              reason: appt.reason,
                            })
                          }
                          className="appt-start-btn"
                          title="Review future patient chart & medical history"
                        >
                          <Icon.FileText />
                          <span>Preview Chart</span>
                        </Md3Button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Chief Complaint / Reason */}
                  <div className="appt-complaint-box">
                    <span className="appt-complaint-label">Chief Complaint / Reason:</span>
                    <span className="appt-complaint-value">{appt.reason || 'General Consultation & Follow-up'}</span>
                  </div>

                  {/* Row 3: Structured Triage Vitals Bar */}
                  {visit && (
                    <div className={`appt-vitals-strip ${hasVitals ? 'has-vitals' : 'awaiting-vitals'}`}>
                      <div className="appt-vitals-strip-left">
                        {hasVitals ? (
                          <>
                            <span className="appt-vitals-icon-badge">
                              <Icon.CheckCircle size={14} />
                            </span>
                            <span className="appt-vitals-heading">Triage Vitals:</span>
                            <div className="appt-vitals-chips-list">
                              {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
                                <span className="appt-vital-chip">
                                  <strong>BP</strong> {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
                                </span>
                              )}
                              {vitals.pulseRate && (
                                <span className="appt-vital-chip">
                                  <strong>Pulse</strong> {vitals.pulseRate} bpm
                                </span>
                              )}
                              {vitals.spO2 && (
                                <span className="appt-vital-chip">
                                  <strong>SpO2</strong> {vitals.spO2}%
                                </span>
                              )}
                              {vitals.temperature && (
                                <span className="appt-vital-chip">
                                  <strong>Temp</strong> {vitals.temperature}°F
                                </span>
                              )}
                              {vitals.weightKg && (
                                <span className="appt-vital-chip">
                                  <strong>Weight</strong> {vitals.weightKg} kg
                                </span>
                              )}
                              {vitals.bmi && (
                                <span className="appt-vital-chip">
                                  <strong>BMI</strong> {vitals.bmi}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="appt-vitals-icon-badge waiting">
                              <Icon.Clock size={14} />
                            </span>
                            <span className="appt-vitals-heading">Checked In:</span>
                            <span className="appt-vitals-sub">Patient in triage queue, waiting for nurse vitals recording</span>
                          </>
                        )}
                      </div>

                      {visit.tokenString && (
                        <div className="appt-vitals-strip-right">
                          <span className="appt-token-pill">
                            Token: <strong>{visit.tokenString}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── REUSABLE FULL-AXIS PATIENT LEDGER OVERLAY DIALOG ─── */}
      <ClinicalPatientOverlayDialog
        isOpen={!!activeOverlayType}
        onClose={() => setActiveOverlayType(null)}
        type={
          activeOverlayType === 'total'
            ? 'appointments_total'
            : activeOverlayType === 'checkedIn'
            ? 'appointments_checked_in'
            : activeOverlayType === 'scheduled'
            ? 'appointments_scheduled'
            : 'appointments_completed'
        }
        items={
          activeOverlayType === 'total'
            ? appointments
            : activeOverlayType === 'checkedIn'
            ? appointments.filter(
                (a) =>
                  a.status === 'CHECKED_IN' ||
                  a.visitId?.status === 'WAITING_DOCTOR' ||
                  a.visitId?.status === 'IN_PROGRESS'
              )
            : activeOverlayType === 'scheduled'
            ? appointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || !a.visitId)
            : appointments.filter((a) => a.status === 'COMPLETED' || a.visitId?.status === 'COMPLETED')
        }
        onSelectPatient={(item) => {
          if (onOpenVisit && item) {
            onOpenVisit(item);
          }
        }}
        doctorId={doctorId}
      />
    </div>
  );
};

export default DoctorAppointmentView;
