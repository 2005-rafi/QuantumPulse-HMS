import React, { useState, useEffect } from 'react';
import { Md3Button, Md3Select, Md3TextField } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import { formatDoctorName } from '../../utils/patientFormatters';
import { appointmentAPI } from '../../services/appointmentAPI';
import api from '../../services/api';
import './AppointmentDashboard.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * DoctorScheduleManager — Admin tool for configuring doctor availability and slot capacities.
 */
export const DoctorScheduleManager = ({ onClose }) => {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form for single day schedule
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(15);
  const [maxPatientsPerSlot, setMaxPatientsPerSlot] = useState(1);

  useEffect(() => {
    // Load departments
    api.get('/departments').then((res) => {
      const depts = res.data?.data || res.data || [];
      setDepartments(depts);
      if (depts.length > 0) setSelectedDepartmentId(depts[0]._id || depts[0].id);
    }).catch(() => {});

    // Load doctors
    appointmentAPI.getDoctors().then((res) => {
      const docs = res.data?.data || res.data || [];
      setDoctors(docs);
      if (docs.length > 0) setSelectedDoctorId(docs[0]._id || docs[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDoctorId) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    appointmentAPI
      .getSchedules(selectedDoctorId)
      .then((res) => {
        setSchedules(res.data?.data || res.data || []);
      })
      .catch((err) => console.error('Failed to load schedules:', err))
      .finally(() => setLoading(false));
  }, [selectedDoctorId]);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDepartmentId) return;

    try {
      setSaving(true);
      setStatusMsg(null);

      const payload = {
        doctorId: selectedDoctorId,
        departmentId: selectedDepartmentId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        slotDurationMinutes: Number(slotDurationMinutes),
        maxPatientsPerSlot: Number(maxPatientsPerSlot),
        isActive: true,
      };

      await appointmentAPI.createSchedule(payload);
      setStatusMsg({ type: 'success', text: `Schedule for ${DAYS[dayOfWeek]} saved successfully!` });

      // Refresh doctor's schedule list
      const res = await appointmentAPI.getSchedules(selectedDoctorId);
      setSchedules(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save schedule' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="appt-schedule-manager">
      <div className="appt-schedule-header">
        <div className="appt-schedule-title-group">
          <Icon.Clock />
          <div>
            <h3>Doctor Schedule & Capacity Manager</h3>
            <p>Define weekly consulting hours, slot duration, and max patients per slot</p>
          </div>
        </div>
        {onClose && (
          <button className="appt-modal-close" onClick={onClose}>
            <Icon.X />
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`appt-alert ${statusMsg.type === 'success' ? 'success' : 'error'}`}>
          {statusMsg.type === 'success' ? <Icon.CheckCircle /> : <Icon.AlertTriangle />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="appt-schedule-body">
        {/* Doctor Selection */}
        <div className="appt-schedule-selectors">
          <div className="appt-form-field">
            <label className="appt-field-label">Doctor</label>
            <Md3Select
              id="sched-doc"
              value={selectedDoctorId}
              options={doctors.map((d) => ({
                value: d._id || d.id,
                label: `${formatDoctorName(d.fullName)} (${d.primarySpecialization || d.position || 'General'})`,
              }))}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            />
          </div>

          <div className="appt-form-field">
            <label className="appt-field-label">Department</label>
            <Md3Select
              id="sched-dept"
              value={selectedDepartmentId}
              options={departments.map((d) => ({
                value: d._id || d.id,
                label: d.name,
              }))}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
            />
          </div>
        </div>

        {/* Existing Schedules Overview */}
        <div className="appt-existing-schedules">
          <h4>Current Weekly Schedules</h4>
          {loading ? (
            <p className="text-muted">Loading configured schedules...</p>
          ) : schedules.length > 0 ? (
            <div className="appt-schedule-chips-grid">
              {schedules.map((s) => (
                <div key={s._id} className="appt-schedule-day-chip">
                  <span className="day-name">{DAYS[s.dayOfWeek]}</span>
                  <span className="day-hours">{s.startTime} – {s.endTime}</span>
                  <span className="day-meta">{s.slotDurationMinutes}m slots ({s.maxPatientsPerSlot}/slot)</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No explicit schedule configured yet. Defaults to 09:00 - 17:00 (15 min slots).</p>
          )}
        </div>

        {/* Add/Update Day Form */}
        <form onSubmit={handleSaveSchedule} className="appt-schedule-form">
          <h4>Configure Day Schedule</h4>
          <div className="appt-schedule-form-grid">
            <div className="appt-form-field">
              <label className="appt-field-label">Day of Week</label>
              <Md3Select
                id="sched-day"
                value={dayOfWeek}
                options={DAYS.map((d, idx) => ({ value: idx, label: d }))}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              />
            </div>

            <div className="appt-form-field">
              <label className="appt-field-label">Start Time (HH:mm)</label>
              <input
                type="time"
                className="appt-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="appt-form-field">
              <label className="appt-field-label">End Time (HH:mm)</label>
              <input
                type="time"
                className="appt-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div className="appt-form-field">
              <label className="appt-field-label">Slot Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                className="appt-input"
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(e.target.value)}
                required
              />
            </div>

            <div className="appt-form-field">
              <label className="appt-field-label">Max Patients Per Slot</label>
              <input
                type="number"
                min={1}
                max={50}
                className="appt-input"
                value={maxPatientsPerSlot}
                onChange={(e) => setMaxPatientsPerSlot(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="appt-schedule-actions">
            <Md3Button
              type="submit"
              variant="primary"
              loading={saving}
              loadingText="Saving Schedule..."
            >
              <Icon.Save />
              <span>Save Schedule</span>
            </Md3Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorScheduleManager;
