import React from 'react';
import './PatientListView.css';

/**
 * Material 3 Clinical List View for Patients.
 * Pure reusable presentation component following SOLID (SRP/OCP).
 *
 * Mandatory Fields Displayed:
 * 1. Name & Avatar Initials
 * 2. Age & Gender
 * 3. Mobile Number
 * 4. Location (City alone)
 * 5. Last Visit Date
 * 6. Latest Appointment Date & Time
 */
export const PatientListView = ({ patients = [], onSelectPatient }) => {
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
    if (!city) return '—';
    return String(city).trim();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
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
                      <span className="md3-patient-mrn">
                        <span className="material-symbols-rounded">tag</span>
                        {patient.mrn || 'N/A'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 2. Age & Gender */}
                <td className="col-age">
                  <div className="md3-age-cell">
                    <span className="md3-age-val">
                      {patient.age !== undefined && patient.age !== null ? `${patient.age} yrs` : '—'}
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
                    <span className="md3-text-muted">—</span>
                  )}
                </td>

                {/* 4. Location (City alone) */}
                <td className="col-location">
                  <div className="md3-location-cell">
                    <span className="material-symbols-rounded">location_on</span>
                    <span className="md3-city-text">{city}</span>
                  </div>
                </td>

                {/* 5. Last Visit Date */}
                <td className="col-last-visit">
                  {patient.lastVisitDate ? (
                    <div className="md3-visit-cell">
                      <span className="material-symbols-rounded">event_available</span>
                      <span className="md3-visit-date">{lastVisit}</span>
                      {patient.lastVisitType && (
                        <span className="md3-visit-type-chip">{patient.lastVisitType}</span>
                      )}
                    </div>
                  ) : (
                    <span className="md3-badge-none">No past visits</span>
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
                  <button
                    type="button"
                    className="md3-btn-view-profile"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPatient && onSelectPatient(patient);
                    }}
                    title={`Open record for ${fullName}`}
                  >
                    <span>View</span>
                    <span className="material-symbols-rounded">chevron_right</span>
                  </button>
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
