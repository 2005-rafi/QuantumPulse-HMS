import React, { useState, useEffect } from 'react';
import { Md3Button, Md3Select, Md3DatePicker, Md3TextField } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import { formatDoctorName } from '../../utils/patientFormatters';
import { patientAPI } from '../../services/patientAPI';
import { appointmentAPI } from '../../services/appointmentAPI';
import { useAppointmentAvailability } from '../../hooks/useAppointmentAvailability';
import AvailabilitySelector from './AvailabilitySelector';
import api from '../../services/api';
import './AppointmentDashboard.css';

/**
 * AppointmentForm — Multi-step booking wizard for Receptionists.
 * SOLID: SRP — Only manages new appointment creation steps and state.
 */
export const AppointmentForm = ({ onSuccess, onCancel, preselectedPatient = null }) => {
  const [step, setStep] = useState(preselectedPatient ? 2 : 1);

  // Step 1: Patient
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient);

  // Step 2: Department, Doctor, Date & Slot
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Tomorrow by default
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 3: Type & Reason
  const [appointmentType, setAppointmentType] = useState('SCHEDULED');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load slot availability
  const {
    slots,
    schedule,
    hasConfiguredSchedule,
    loading: slotsLoading,
    error: slotsError,
  } = useAppointmentAvailability(selectedDoctorId, selectedDepartmentId, selectedDate);

  // Load clinical departments
  useEffect(() => {
    let cancelled = false;
    api.get('/departments').then((res) => {
      if (!cancelled) {
        const list = res.data?.data || res.data || [];
        const clinical = list.filter(
          (d) => d.status === 'Active' && (d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC' || (!d.type && d.code !== 'ADM'))
        );
        const finalList = clinical.length > 0 ? clinical : list.filter((d) => d.status === 'Active');
        setDepartments(finalList);
        if (finalList.length > 0 && !selectedDepartmentId) {
          setSelectedDepartmentId(finalList[0]._id || finalList[0].id);
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load doctors filtered by department
  useEffect(() => {
    let cancelled = false;
    if (!selectedDepartmentId) return;

    appointmentAPI.getDoctors({ departmentId: selectedDepartmentId }).then((res) => {
      if (!cancelled) {
        const list = res.data?.data || res.data || [];
        setDoctors(list);
        if (list.length > 0) {
          setSelectedDoctorId(list[0]._id || list[0].id);
        } else {
          setSelectedDoctorId('');
        }
        setSelectedSlot(null);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedDepartmentId]);

  // Helper to extract patient array from various API response formats
  const extractPatients = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data?.items)) return res.data.items;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    return [];
  };

  // Helper to get patient initials
  const getPatientInitials = (p) => {
    if (!p) return 'PT';
    const first = p.firstName?.[0] || '';
    const last = p.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'PT';
  };

  // Patient directory & live search handler
  useEffect(() => {
    let cancelled = false;

    const fetchPatients = async () => {
      try {
        setIsSearchingPatient(true);
        const query = patientSearch.trim();
        const res = await patientAPI.search(query, 1, 15);
        if (!cancelled) {
          const items = extractPatients(res);
          setPatientResults(items);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Patient search error:', err);
          setPatientResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearchingPatient(false);
        }
      }
    };

    const debounceTime = patientSearch.trim() ? 250 : 0;
    const timer = setTimeout(fetchPatients, debounceTime);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [patientSearch]);

  const handleDepartmentChange = (deptId) => {
    setSelectedDepartmentId(deptId);
    setSelectedSlot(null);
  };

  const handleDoctorChange = (docId) => {
    setSelectedDoctorId(docId);
    setSelectedSlot(null);
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedDoctorId || !selectedDepartmentId || !selectedSlot) {
      setFormError('Please fill out all required fields before confirming.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const payload = {
        patientId: selectedPatient._id || selectedPatient.id,
        departmentId: selectedDepartmentId,
        doctorId: selectedDoctorId,
        appointmentType,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason: reason.trim(),
        notes: notes.trim(),
        source: 'RECEPTION',
      };

      const res = await appointmentAPI.create(payload);
      const createdAppt = res.data?.data || res.data;

      if (onSuccess) {
        onSuccess(createdAppt);
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setFormError(err.response?.data?.message || err.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctorObj = doctors.find((d) => (d._id || d.id) === selectedDoctorId);
  const selectedDeptObj = departments.find((d) => (d._id || d.id) === selectedDepartmentId);

  return (
    <div className="appt-form-wizard">
      {/* Wizard Step Progress Indicator */}
      <div className="appt-wizard-steps">
        <div className={`appt-step-badge ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <span className="step-num">{step > 1 ? <Icon.Check /> : '1'}</span>
          <span className="step-label">Patient</span>
        </div>
        <div className="step-connector" />
        <div className={`appt-step-badge ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <span className="step-num">{step > 2 ? <Icon.Check /> : '2'}</span>
          <span className="step-label">Doctor & Slot</span>
        </div>
        <div className="step-connector" />
        <div className={`appt-step-badge ${step >= 3 ? 'active' : ''}`}>
          <span className="step-num">3</span>
          <span className="step-label">Summary & Confirm</span>
        </div>
      </div>

      {formError && (
        <div className="appt-dialog-error">
          <Icon.AlertTriangle />
          <span>{formError}</span>
        </div>
      )}

      {/* ── STEP 1: PATIENT SELECTION ── */}
      {step === 1 && (
        <div className="appt-step-content">
          <div className="appt-step-header-wrap">
            <div>
              <h3 className="appt-step-heading">Select Patient</h3>
              <p className="appt-step-sub">Choose from registered patients or search by Name, UHID/MRN, or Phone</p>
            </div>
            {selectedPatient && (
              <span className="appt-patient-selected-pill">
                <Icon.UserCheck />
                <span>1 Selected</span>
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="appt-form-field">
            <div className="appt-search-input-wrapper">
              <Icon.Search />
              <input
                type="text"
                className="appt-search-input"
                placeholder="Search by patient name, MRN (e.g. PT-...), or phone number..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                autoFocus
              />
              {patientSearch && (
                <button
                  type="button"
                  className="appt-search-clear-btn"
                  onClick={() => setPatientSearch('')}
                  aria-label="Clear search"
                >
                  <Icon.X />
                </button>
              )}
              {isSearchingPatient && <span className="md3-spinner md3-spinner--sm" />}
            </div>
          </div>

          {/* Patient Directory / Search Results List */}
          <div className="appt-patient-results-container">
            {isSearchingPatient && patientResults.length === 0 ? (
              <div className="appt-patient-loading-state">
                <span className="md3-spinner" />
                <span>Searching patient records…</span>
              </div>
            ) : patientResults.length > 0 ? (
              <div className="appt-patient-results-list" role="list">
                {patientResults.map((p) => {
                  const isChosen = selectedPatient && (selectedPatient._id || selectedPatient.id) === (p._id || p.id);
                  return (
                    <div
                      key={p._id || p.id}
                      className={`appt-patient-result-item ${isChosen ? 'selected' : ''}`}
                      onClick={() => setSelectedPatient(p)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPatient(p)}
                    >
                      <div className="appt-patient-avatar">
                        {getPatientInitials(p)}
                      </div>
                      <div className="appt-patient-result-info">
                        <div className="appt-patient-header-row">
                          <span className="appt-patient-name">{p.firstName} {p.lastName || ''}</span>
                          <span className="appt-patient-mrn-chip">{p.mrn}</span>
                          {p.bloodGroup && (
                            <span className="appt-patient-blood-chip">{p.bloodGroup}</span>
                          )}
                        </div>
                        <div className="appt-patient-meta-row">
                          <span className="appt-patient-meta-item">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>person</span>
                            {p.gender || '—'}{p.age ? `, ${p.age} yrs` : ''}
                          </span>
                          <span className="appt-patient-meta-item">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>call</span>
                            {p.phone || 'No phone'}
                          </span>
                          {p.address?.city && (
                            <span className="appt-patient-meta-item">
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>location_on</span>
                              {p.address.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="appt-patient-select-action">
                        {isChosen ? (
                          <span className="appt-chosen-badge">
                            <span className="material-symbols-rounded">check_circle</span>
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="appt-select-pill">Select</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="appt-empty-patients">
                <span className="material-symbols-rounded" style={{ fontSize: '36px', color: 'var(--md-sys-color-on-surface-variant)' }}>person_search</span>
                <p>No registered patients found {patientSearch ? `matching "${patientSearch}"` : 'in system'}.</p>
                {patientSearch && (
                  <button type="button" className="appt-reset-search-link" onClick={() => setPatientSearch('')}>
                    View all patients
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected Patient Confirmation Banner */}
          {selectedPatient && (
            <div className="appt-selected-patient-card">
              <div className="appt-selected-patient-avatar">
                {getPatientInitials(selectedPatient)}
              </div>
              <div className="card-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>verified_user</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    {selectedPatient.firstName} {selectedPatient.lastName || ''}
                  </h4>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  UHID: <strong>{selectedPatient.mrn}</strong> · Phone: <strong>{selectedPatient.phone || '—'}</strong> · {selectedPatient.gender || '—'}, {selectedPatient.age ? `${selectedPatient.age} yrs` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="appt-step-actions">
            <Md3Button variant="secondary" onClick={onCancel} style={{ width: 'auto', minWidth: '100px' }}>
              Cancel
            </Md3Button>
            <Md3Button
              variant="filled"
              disabled={!selectedPatient}
              onClick={() => setStep(2)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <span>Next: Doctor & Slot</span>
              <Icon.ChevronRight />
            </Md3Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: DEPARTMENT, DOCTOR, DATE & TIME SLOT ── */}
      {step === 2 && (
        <div className="appt-step-content">
          <h3 className="appt-step-heading">Department, Doctor & Availability</h3>
          <p className="appt-step-sub">Choose clinical specialty, physician, date, and available slot</p>

          <div className="appt-booking-grid">
            {/* Department */}
            <div className="appt-form-field">
              <label className="appt-field-label">Department <span className="req">*</span></label>
              <Md3Select
                id="booking-dept"
                value={selectedDepartmentId}
                options={departments.map((d) => ({
                  value: d._id || d.id,
                  label: `${d.name} (${d.code || 'GEN'})`,
                }))}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              />
            </div>

            {/* Doctor */}
            <div className="appt-form-field">
              <label className="appt-field-label">Doctor <span className="req">*</span></label>
              <Md3Select
                id="booking-doctor"
                value={selectedDoctorId}
                options={doctors.map((doc) => ({
                  value: doc._id || doc.id,
                  label: `${formatDoctorName(doc.fullName)} (${doc.primarySpecialization || doc.position || 'General'})`,
                }))}
                onChange={(e) => handleDoctorChange(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="appt-form-field">
              <label htmlFor="booking-date" className="appt-field-label">Date <span className="req">*</span></label>
              <Md3DatePicker
                id="booking-date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
              />
            </div>

            {/* Appointment Type */}
            <div className="appt-form-field">
              <label className="appt-field-label">Appointment Type</label>
              <Md3Select
                id="booking-type"
                value={appointmentType}
                options={[
                  { value: 'SCHEDULED', label: 'Regular Scheduled Consultation' },
                  { value: 'FOLLOW_UP', label: 'Follow-Up Consultation' },
                  { value: 'WALK_IN', label: 'Walk-in' },
                ]}
                onChange={(e) => setAppointmentType(e.target.value)}
              />
            </div>
          </div>

          {/* Time Slots */}
          <div className="appt-form-field" style={{ marginTop: '16px' }}>
            <label className="appt-field-label">
              Available Time Slots <span className="req">*</span>
            </label>
            <AvailabilitySelector
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              loading={slotsLoading}
              error={slotsError}
              hasConfiguredSchedule={hasConfiguredSchedule}
            />
          </div>

          <div className="appt-step-actions">
            <Md3Button variant="text" onClick={() => setStep(1)}>
              <Icon.ChevronLeft />
              <span>Back</span>
            </Md3Button>
            <Md3Button
              variant="primary"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
            >
              <span>Next: Confirm Details</span>
              <Icon.ChevronRight />
            </Md3Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: REASON, NOTES & SUMMARY CONFIRMATION ── */}
      {step === 3 && (
        <div className="appt-step-content">
          <h3 className="appt-step-heading">Booking Confirmation & Notes</h3>
          <p className="appt-step-sub">Review appointment details and enter visit reason</p>

          <div className="appt-summary-card">
            <div className="appt-summary-row">
              <span className="appt-summary-label">Patient</span>
              <span className="appt-summary-value">
                {selectedPatient?.firstName} {selectedPatient?.lastName || ''} (MRN: {selectedPatient?.mrn})
              </span>
            </div>
            <div className="appt-summary-row">
              <span className="appt-summary-label">Department</span>
              <span className="appt-summary-value">{selectedDeptObj?.name || 'General OPD'}</span>
            </div>
            <div className="appt-summary-row">
              <span className="appt-summary-label">Consulting Doctor</span>
              <span className="appt-summary-value">{formatDoctorName(selectedDoctorObj?.fullName)}</span>
            </div>
            <div className="appt-summary-row">
              <span className="appt-summary-label">Schedule Slot</span>
              <span className="appt-summary-value highlight">
                {selectedSlot?.startTime} – {selectedSlot?.endTime} ({new Date(selectedDate).toLocaleDateString()})
              </span>
            </div>
            <div className="appt-summary-row">
              <span className="appt-summary-label">Type</span>
              <span className="appt-summary-value">{appointmentType}</span>
            </div>
          </div>

          <div className="appt-form-field" style={{ marginTop: '16px' }}>
            <label htmlFor="booking-reason" className="appt-field-label">
              Chief Complaint / Reason for Visit
            </label>
            <input
              id="booking-reason"
              type="text"
              className="appt-input"
              placeholder="e.g. Chest pain, Follow-up for blood pressure, Fever"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="appt-form-field">
            <label htmlFor="booking-notes" className="appt-field-label">
              Special Notes / Instructions
            </label>
            <textarea
              id="booking-notes"
              rows={2}
              className="appt-textarea"
              placeholder="e.g. Needs wheelchair assistance, bringing past reports"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="appt-step-actions">
            <Md3Button variant="text" onClick={() => setStep(2)} disabled={isSubmitting}>
              <Icon.ChevronLeft />
              <span>Back</span>
            </Md3Button>
            <Md3Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Booking Appointment..."
            >
              <Icon.Check />
              <span>Confirm & Book Appointment</span>
            </Md3Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
