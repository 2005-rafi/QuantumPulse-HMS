import React from 'react';
import { usePatientStatus } from '../../context/PatientStatusContext';
import { getPatientStatus } from '../../constants/patientStatus';
import './PatientListView.css';

/**
 * Material 3 Clinical List View for Patients.
 * Pure reusable presentation component following SOLID (SRP/OCP).
 *
 * Sizing & Responsiveness:
 * - Desktop (>= 1024px): Full 8-column clinical data grid with comfortable spacing.
 * - Tablet (641px - 1023px): High-density compact table with optimized column widths.
 * - Mobile (<= 640px): Ultra-compact billing-style clinical list tile (~58px height)
 *   highlighting Avatar, Name, MRN, Age/Gender, Status Pill, and Chevron action.
 */
export const PatientListView = ({ patients = [], onSelectPatient, renderRowAction }) => {
  const { getLiveStatus } = usePatientStatus();
  if (!patients || patients.length === 0) return null;

  const getInitials = (name) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatCity = (patient) => {
    const city = patient.address?.city || patient.city;
    if (!city) return 'â€”';
    return String(city).trim();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'â€”';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'â€”';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'â€”';
    }
  };

  const formatAppointment = (apt) => {
    if (!apt || !apt.date) return null;
    try {
      const d = new Date(apt.date);
      const datePart = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = apt.startTime || '';
      return { datePart, timePart, status: apt.status || 'SCHEDULED' };
    } catch {
      return null;
    }
  };

  return (
    <div className="md3-patient-list-table-container" role="region" aria-label="Patient Directory Table">
      <table className="md3-patient-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-patient">Patient &amp; MRN</th>
            <th scope="col" className="col-status">Clinical Status</th>
            <th scope="col" className="col-age">Age / Gender</th>
            <th scope="col" className="col-phone">Mobile No</th>
            <th scope="col" className="col-location">Location (City)</th>
            <th scope="col" className="col-last-visit">Last Visit Date</th>
            <th scope="col" className="col-appointment">Latest Appointment</th>
            <th scope="col" className="col-actions text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const patientId = patient._id || patient.id;
            const fullName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
            const initials = getInitials(fullName);
            const city = formatCity(patient);
            const lastVisit = formatDate(patient.lastVisitDate);
            const appt = formatAppointment(patient.latestAppointment);

            const ageText = patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : '';
            const genderText = patient.gender || '';
            const demographics = [ageText, genderText].filter(Boolean).join(' â€¢ ');

            // Live status integration from real-time state management
            const fallbackStatus = patient.currentState || patient.lastVisitStatus || 'REGISTERED_IDLE';
            const liveInfo = getLiveStatus(patientId, fallbackStatus);
            const statusMeta = liveInfo.statusMeta || getPatientStatus(liveInfo.status);
            const currentToken = liveInfo.tokenString || patient.activeVisit?.tokenString;
            const currentDept = patient.activeVisit?.department;

            return (
              <tr
                key={patientId}
                className="md3-patient-list-row"
                onClick={() => onSelectPatient && onSelectPatient(patient)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPatient && onSelectPatient(patient);
                  }
                }}
              >
                {/* 1. Patient & MRN */}
                <td className="col-patient">
                  <div className="md3-patient-cell-profile">
                    <div className="md3-patient-avatar" aria-hidden="true">
                      {initials}
                    </div>
                    <div className="md3-patient-meta">
                      <span className="md3-patient-name">{fullName}</span>
                      <div className="md3-patient-sub-line">
                        <span className="md3-patient-mrn">
                          <span className="material-symbols-rounded">tag</span>
                          {patient.mrn || 'N/A'}
                        </span>
                        {demographics && (
                          <span className="md3-mobile-demographics">
                            â€¢ {demographics}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Clinical Status & Live Queue Token */}
                <td className="col-status">
                  <div className="md3-status-container">
                    <span
                      className={`md3-status-pill ${statusMeta.badgeClass || 'md3-status-badge--neutral'}`}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px', lineHeight: 1 }}>
                        {statusMeta.icon || 'fiber_manual_record'}
                      </span>
                      <span>{statusMeta.label}</span>
                    </span>
                    {currentToken && (
                      <span className="md3-status-token">
                        <span className="material-symbols-rounded md3-status-token-icon">confirmation_number</span>
                        <span>{currentToken}</span>
                        {currentDept ? <span className="md3-status-dept-text">â€¢ {currentDept}</span> : null}
                      </span>
                    )}
                  </div>
                </td>

                {/* 2. Age & Gender */}
                <td className="col-age">
                  <div className="md3-age-cell">
                    <span className="md3-age-val">
                      {patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : 'â€”'}
                    </span>
                    <span className="md3-gender-val">
                      {patient.gender || 'Unknown'}
                    </span>
                  </div>
                </td>

                {/* 3. Mobile Number */}
                <td className="col-phone">
                  {patient.phone ? (
                    <span className="md3-phone-badge">
                      <span className="material-symbols-rounded">call</span>
                      <span>{patient.phone}</span>
                    </span>
                  ) : (
                    <span className="md3-text-muted">â€”</span>
                  )}
                </td>

                {/* 4. Location (City alone) */}
                <td className="col-location">
                  <div className="md3-location-cell">
                    <span className="material-symbols-rounded">location_on</span>
                    <span className="md3-city-text">{city}</span>
                  </div>
                </td>

                {/* 5. Last Visit / Inpatient State */}
                <td className="col-last-visit">
                  {patient.activeAdmission ? (
                    <div className="md3-visit-cell">
                      <span className="material-symbols-rounded md3-desktop-only">hotel</span>
                      <span className="md3-visit-date md3-desktop-only">
                        {patient.activeAdmission.bedNumber ? `Bed ${patient.activeAdmission.bedNumber}` : 'Admitted'}
                      </span>
                      <span className={`md3-visit-type-chip ${patient.activeAdmission.admissionType === 'EMERGENCY' ? 'md3-visit-type-chip--emergency' : 'md3-visit-type-chip--ipd'}`}>
                        {patient.activeAdmission.bedNumber ? `Bed ${patient.activeAdmission.bedNumber}` : (patient.activeAdmission.admissionType === 'EMERGENCY' ? 'EMERGENCY' : 'IPD')}
                      </span>
                    </div>
                  ) : patient.lastVisitDate ? (
                    <div className="md3-visit-cell">
                      <span className="material-symbols-rounded md3-desktop-only">event_available</span>
                      <span className="md3-visit-date md3-desktop-only">{lastVisit}</span>
                      <span
                        className={`md3-visit-type-chip ${
                          patient.lastVisitType === 'EMERGENCY'
                            ? 'md3-visit-type-chip--emergency'
                            : patient.lastVisitType === 'IPD'
                            ? 'md3-visit-type-chip--ipd'
                            : 'md3-visit-type-chip--opd'
                        }`}
                      >
                        {patient.lastVisitType || 'OPD'}
                      </span>
                    </div>
                  ) : (
                    <span className="md3-badge-none md3-desktop-only">No past visits</span>
                  )}
                </td>

                {/* 6. Latest Appointment */}
                <td className="col-appointment">
                  {appt ? (
                    <div className="md3-appointment-cell">
                      <div className="md3-appt-top">
                        <span className="material-symbols-rounded">calendar_clock</span>
                        <span className="md3-appt-date">{appt.datePart}</span>
                      </div>
                      {appt.timePart && (
                        <span className="md3-appt-time">
                          <span className="material-symbols-rounded">schedule</span>
                          {appt.timePart}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="md3-badge-none">No appointment</span>
                  )}
                </td>

                {/* 7. Action */}
                <td className="col-actions text-right">
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    {renderRowAction && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {renderRowAction(patient)}
                      </div>
                    )}
                    <button
                      type="button"
                      className="md3-btn-view-profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient && onSelectPatient(patient);
                      }}
                      title={`Open record for ${fullName}`}
                      aria-label={`Open record for ${fullName}`}
                    >
                      <span className="md3-desktop-only">View</span>
                      <span className="material-symbols-rounded">chevron_right</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PatientListView;

