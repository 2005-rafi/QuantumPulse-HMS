import React, { useState, useEffect } from 'react';
import { Md3Select, Md3DatePicker, Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import { adminAPI } from '../../services/adminAPI';
import { appointmentAPI } from '../../services/appointmentAPI';
import api from '../../services/api';
import './AppointmentDashboard.css';

/**
 * AppointmentFilters — Operational filter toolbar for Receptionist Dashboard.
 */
export const AppointmentFilters = ({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  onBookAppointment,
  loading = false,
}) => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Load active clinical departments
  useEffect(() => {
    let cancelled = false;
    api
      .get('/departments')
      .then((res) => {
        if (!cancelled) {
          const list = res.data?.data || res.data || [];
          setDepartments(list.filter((d) => d.status === 'Active' || d.type === 'CLINICAL'));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load doctors filtered by selected department
  useEffect(() => {
    let cancelled = false;
    const params = filters.departmentId ? { departmentId: filters.departmentId } : {};
    appointmentAPI
      .getDoctors(params)
      .then((res) => {
        if (!cancelled) {
          const list = res.data?.data || res.data || [];
          setDoctors(list);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filters.departmentId]);

  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map((d) => ({ value: d._id || d.id, label: `${d.name} (${d.code || 'GEN'})` })),
  ];

  const doctorOptions = [
    { value: '', label: 'All Doctors' },
    ...doctors.map((doc) => ({
      value: doc._id || doc.id,
      label: `Dr. ${doc.fullName} (${doc.primarySpecialization || doc.position || 'General'})`,
    })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'CHECKED_IN', label: 'Checked In' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'MISSED', label: 'Missed' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'WALK_IN', label: 'Walk-in' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
  ];

  return (
    <div className="appt-filters-toolbar">
      <div className="appt-filters-grid">
        {/* Date Selector */}
        <div className="appt-filter-item">
          <label className="appt-filter-label">Date</label>
          <Md3DatePicker
            id="appt-filter-date"
            value={filters.date || ''}
            onChange={(e) => onFilterChange('date', e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="appt-filter-item">
          <label className="appt-filter-label">Department</label>
          <Md3Select
            id="appt-filter-dept"
            value={filters.departmentId || ''}
            options={departmentOptions}
            onChange={(e) => onFilterChange('departmentId', e.target.value)}
          />
        </div>

        {/* Doctor Filter */}
        <div className="appt-filter-item">
          <label className="appt-filter-label">Doctor</label>
          <Md3Select
            id="appt-filter-doctor"
            value={filters.doctorId || ''}
            options={doctorOptions}
            onChange={(e) => onFilterChange('doctorId', e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="appt-filter-item">
          <label className="appt-filter-label">Status</label>
          <Md3Select
            id="appt-filter-status"
            value={filters.status || ''}
            options={statusOptions}
            onChange={(e) => onFilterChange('status', e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div className="appt-filter-item">
          <label className="appt-filter-label">Type</label>
          <Md3Select
            id="appt-filter-type"
            value={filters.appointmentType || ''}
            options={typeOptions}
            onChange={(e) => onFilterChange('appointmentType', e.target.value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="appt-filters-actions">
        <Md3Button variant="text" onClick={onReset} className="appt-filter-btn">
          <Icon.X />
          <span>Reset</span>
        </Md3Button>
        <Md3Button
          variant="secondary"
          onClick={onRefresh}
          loading={loading}
          className="appt-filter-btn"
        >
          <Icon.Refresh />
          <span>Refresh</span>
        </Md3Button>
        {onBookAppointment && (
          <Md3Button
            variant="filled"
            onClick={onBookAppointment}
            className="appt-filter-btn appt-filter-btn--primary"
          >
            <Icon.Plus />
            <span>Book Appointment</span>
          </Md3Button>
        )}
      </div>
    </div>
  );
};

export default AppointmentFilters;
