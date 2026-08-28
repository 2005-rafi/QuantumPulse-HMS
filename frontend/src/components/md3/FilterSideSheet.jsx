import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { State, City } from 'country-state-city';
import { Icon } from './Md3Widgets';
import { formatDoctorName } from '../../utils/patientFormatters';
import './FilterSideSheet.css';

/**
 * FilterSideSheet — Streamlined Single-Column Clinical Filter Sheet with Breathing Space.
 * Features:
 * - Single-column clutter-free layout with generous spacing.
 * - Department selection dropdown -> multi-select removable chips.
 * - Doctor selection dropdown (cascaded by department) -> multi-select removable chips.
 * - State selection dropdown -> City selection dropdown -> multi-select removable chips.
 * - Quick date presets and pure MD3 state-layer interactions.
 */
export const FilterSideSheet = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = {},
  departments = [],
  doctors = [],
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Local state for filter criteria
  const [selectedVisitTypes, setSelectedVisitTypes] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Temporary dropdown values for adding choices
  const [deptSelectVal, setDeptSelectVal] = useState('');
  const [doctorSelectVal, setDoctorSelectVal] = useState('');
  const [citySelectVal, setCitySelectVal] = useState('');

  // Load Indian states
  const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);

  // Compute available cities when state is selected
  const availableCities = useMemo(() => {
    if (!selectedState) return [];
    const stateObj = indianStates.find((s) => s.name === selectedState || s.isoCode === selectedState);
    if (!stateObj) return [];
    return City.getCitiesOfState('IN', stateObj.isoCode);
  }, [selectedState, indianStates]);

  // Synchronize state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setSelectedVisitTypes(initialFilters.visitType || []);
      setSelectedDepartments(initialFilters.departmentId || []);
      setSelectedDoctors(initialFilters.doctorId || []);
      setSelectedState(initialFilters.state || '');
      // Handle city as array or string
      if (Array.isArray(initialFilters.city)) {
        setSelectedCities(initialFilters.city);
      } else if (initialFilters.city) {
        setSelectedCities([initialFilters.city]);
      } else {
        setSelectedCities([]);
      }
      setStartDate(initialFilters.startDate || '');
      setEndDate(initialFilters.endDate || '');
      setSortBy(initialFilters.sortBy || 'newest');
      setDeptSelectVal('');
      setDoctorSelectVal('');
      setCitySelectVal('');
      setIsClosing(false);
    }
  }, [isOpen, initialFilters]);

  // Sorted departments list (A-Z)
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  // Doctors available for selection (filtered by selected departments if any)
  const availableDoctors = useMemo(() => {
    let list = [...doctors];
    if (selectedDepartments.length > 0) {
      list = list.filter((doc) => {
        const deptId = doc.departmentId?._id || doc.departmentId?.id || doc.departmentId;
        return selectedDepartments.includes(deptId);
      });
    }
    return list.sort((a, b) => {
      const nameA = (a.fullName || `${a.firstName} ${a.lastName}`).toLowerCase();
      const nameB = (b.fullName || `${b.firstName} ${b.lastName}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [doctors, selectedDepartments]);

  // Total active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    count += selectedVisitTypes.length;
    count += selectedDepartments.length;
    count += selectedDoctors.length;
    if (selectedState) count += 1;
    count += selectedCities.length;
    if (startDate || endDate) count += 1;
    if (sortBy && sortBy !== 'newest') count += 1;
    return count;
  }, [selectedVisitTypes, selectedDepartments, selectedDoctors, selectedState, selectedCities, startDate, endDate, sortBy]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  // ── Visit Type Toggle ──
  const handleToggleVisitType = (type) => {
    setSelectedVisitTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ── Department Multi-Select ──
  const handleAddDepartment = (id) => {
    if (!id) return;
    if (!selectedDepartments.includes(id)) {
      setSelectedDepartments((prev) => [...prev, id]);
    }
    setDeptSelectVal('');
  };

  const handleRemoveDepartment = (id) => {
    setSelectedDepartments((prev) => prev.filter((dId) => dId !== id));
  };

  // ── Doctor Multi-Select ──
  const handleAddDoctor = (id) => {
    if (!id) return;
    if (!selectedDoctors.includes(id)) {
      setSelectedDoctors((prev) => [...prev, id]);
    }
    setDoctorSelectVal('');
  };

  const handleRemoveDoctor = (id) => {
    setSelectedDoctors((prev) => prev.filter((docId) => docId !== id));
  };

  // ── Geographic State & City ──
  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    setSelectedCities([]);
    setCitySelectVal('');
  };

  const handleAddCity = (cityName) => {
    if (!cityName) return;
    if (!selectedCities.includes(cityName)) {
      setSelectedCities((prev) => [...prev, cityName]);
    }
    setCitySelectVal('');
  };

  const handleRemoveCity = (cityName) => {
    setSelectedCities((prev) => prev.filter((c) => c !== cityName));
  };

  // ── Date Range Presets ──
  const setDatePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      setStartDate(lastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstOfMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'CLEAR') {
      setStartDate('');
      setEndDate('');
    }
  };

  // ── Apply & Reset ──
  const handleApply = () => {
    onApply({
      visitType: selectedVisitTypes,
      departmentId: selectedDepartments,
      doctorId: selectedDoctors,
      state: selectedState,
      city: selectedCities.length > 0 ? selectedCities.join(',') : '',
      cities: selectedCities.length > 0 ? selectedCities.join(',') : '',
      startDate,
      endDate,
      sortBy,
    });
    handleClose();
  };

  const handleReset = () => {
    setSelectedVisitTypes([]);
    setSelectedDepartments([]);
    setSelectedDoctors([]);
    setSelectedState('');
    setSelectedCities([]);
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setDeptSelectVal('');
    setDoctorSelectVal('');
    setCitySelectVal('');
  };

  return createPortal(
    <div className={`md3-side-sheet-backdrop ${isClosing ? 'is-closing' : ''}`} onClick={handleClose}>
      <div
        className={`md3-side-sheet-container ${isClosing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter patient directory records"
      >
        {/* ── HEADER ── */}
        <div className="md3-side-sheet-header">
          <div className="md3-side-sheet-header-title-group">
            <div className="md3-ssf-title-row">
              <Icon.Filter />
              <h3>Filters</h3>
              {activeCount > 0 && (
                <span className="md3-filter-active-badge">{activeCount} active</span>
              )}
            </div>
            <span className="md3-side-sheet-subtitle">Refine patient directory records with breathing room</span>
          </div>

          <div className="md3-side-sheet-header-actions">
            {activeCount > 0 && (
              <button type="button" className="md3-filter-clear-link" onClick={handleReset}>
                Reset all
              </button>
            )}
            <button
              type="button"
              className="md3-side-sheet-close-btn"
              onClick={handleClose}
              aria-label="Close filter drawer"
            >
              <Icon.X />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE SINGLE COLUMN WORKSPACE ── */}
        <div className="md3-side-sheet-content">
          <div className="md3-ssf-single-col">

            {/* 1. Sort Order Card */}
            <div className="md3-ssf-card">
              <div className="md3-ssf-card-header">
                <Icon.Clock />
                <span className="md3-ssf-card-title">Sort Order</span>
              </div>
              <div className="md3-ssf-chips-deck">
                {[
                  { value: 'newest', label: 'Registered (Newest)' },
                  { value: 'oldest', label: 'Registered (Oldest)' },
                  { value: 'nameA-Z', label: 'Name (A-Z)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`md3-filter-chip ${sortBy === opt.value ? 'is-selected' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {sortBy === opt.value && (
                      <span className="md3-chip-check-icon"><Icon.CheckCircle /></span>
                    )}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Visit Modality Card */}
            <div className="md3-ssf-card">
              <div className="md3-ssf-card-header">
                <Icon.Activity />
                <span className="md3-ssf-card-title">Visit Modality</span>
              </div>
              <div className="md3-ssf-chips-deck">
                {[
                  { value: 'OPD', label: 'OPD (Outpatient)' },
                  { value: 'IPD', label: 'IPD (Inpatient)' },
                ].map((opt) => {
                  const isSelected = selectedVisitTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleToggleVisitType(opt.value)}
                    >
                      {isSelected && (
                        <span className="md3-chip-check-icon"><Icon.CheckCircle /></span>
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Visit Timeline Card */}
            <div className="md3-ssf-card">
              <div className="md3-ssf-card-header">
                <Icon.Calendar />
                <span className="md3-ssf-card-title">Visit Timeline</span>
              </div>

              {/* Quick Presets */}
              <div className="md3-ssf-preset-bar">
                <button type="button" className="md3-ssf-preset-btn" onClick={() => setDatePreset('TODAY')}>
                  Today
                </button>
                <button type="button" className="md3-ssf-preset-btn" onClick={() => setDatePreset('WEEK')}>
                  Last 7 Days
                </button>
                <button type="button" className="md3-ssf-preset-btn" onClick={() => setDatePreset('MONTH')}>
                  This Month
                </button>
                {(startDate || endDate) && (
                  <button type="button" className="md3-ssf-preset-btn clear" onClick={() => setDatePreset('CLEAR')}>
                    Clear
                  </button>
                )}
              </div>

              <div className="md3-ssf-date-range-group">
                <div className="md3-ssf-date-field-wrapper">
                  <label className="md3-ssf-date-field-label">From Date</label>
                  <input
                    type="date"
                    className="md3-ssf-date-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Filter start date"
                  />
                </div>
                <div className="md3-ssf-date-field-wrapper">
                  <label className="md3-ssf-date-field-label">To Date</label>
                  <input
                    type="date"
                    className="md3-ssf-date-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="Filter end date"
                  />
                </div>
              </div>
            </div>

            {/* 4. Clinical Staffing (Department & Cascaded Doctors) */}
            <div className="md3-ssf-card">
              <div className="md3-ssf-card-header">
                <Icon.Hospital />
                <span className="md3-ssf-card-title">Clinical Department & Doctors</span>
              </div>

              {/* Department Dropdown */}
              <div className="md3-ssf-field-block">
                <label className="md3-ssf-field-label">Department</label>
                <select
                  className="md3-ssf-select-input"
                  value={deptSelectVal}
                  onChange={(e) => handleAddDepartment(e.target.value)}
                >
                  <option value="">Choose department to add...</option>
                  {sortedDepartments
                    .filter((d) => !selectedDepartments.includes(d._id || d.id))
                    .map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                </select>

                {/* Selected Department Removable Chips */}
                {selectedDepartments.length > 0 && (
                  <div className="md3-ssf-selected-chips">
                    {selectedDepartments.map((deptId) => {
                      const dept = departments.find((d) => (d._id || d.id) === deptId);
                      return (
                        <span key={deptId} className="md3-removable-chip">
                          <span>{dept?.name || 'Department'}</span>
                          <button
                            type="button"
                            className="md3-removable-chip-del"
                            onClick={() => handleRemoveDepartment(deptId)}
                            title="Remove department"
                            aria-label={`Remove ${dept?.name || 'department'}`}
                          >
                            <Icon.X />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Doctor Dropdown (Cascaded under department) */}
              <div className="md3-ssf-field-block">
                <label className="md3-ssf-field-label">
                  Consulting Doctor {selectedDepartments.length > 0 ? '(Filtered by department)' : ''}
                </label>
                <select
                  className="md3-ssf-select-input"
                  value={doctorSelectVal}
                  onChange={(e) => handleAddDoctor(e.target.value)}
                >
                  <option value="">Choose doctor to add...</option>
                  {availableDoctors
                    .filter((doc) => !selectedDoctors.includes(doc._id || doc.id))
                    .map((doc) => (
                      <option key={doc._id || doc.id} value={doc._id || doc.id}>
                        {formatDoctorName(doc.fullName || `${doc.firstName} ${doc.lastName}`)} (
                        {doc.primarySpecialization || doc.position || 'General'})
                      </option>
                    ))}
                </select>

                {/* Selected Doctor Removable Chips */}
                {selectedDoctors.length > 0 && (
                  <div className="md3-ssf-selected-chips">
                    {selectedDoctors.map((docId) => {
                      const doc = doctors.find((d) => (d._id || d.id) === docId);
                      return (
                        <span key={docId} className="md3-removable-chip">
                          <span>
                            {doc
                              ? formatDoctorName(doc.fullName || `${doc.firstName} ${doc.lastName}`)
                              : 'Doctor'}
                          </span>
                          <button
                            type="button"
                            className="md3-removable-chip-del"
                            onClick={() => handleRemoveDoctor(docId)}
                            title="Remove doctor"
                            aria-label="Remove doctor"
                          >
                            <Icon.X />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Geographic Demographics (State & Cascaded Cities) */}
            <div className="md3-ssf-card">
              <div className="md3-ssf-card-header">
                <Icon.Building />
                <span className="md3-ssf-card-title">Geographic Location</span>
              </div>

              {/* State Dropdown */}
              <div className="md3-ssf-field-block">
                <label className="md3-ssf-field-label">State / Union Territory</label>
                <select
                  className="md3-ssf-select-input"
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                >
                  <option value="">All States / UTs</option>
                  {indianStates.map((st) => (
                    <option key={st.isoCode} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Dropdown (Cascaded under selected state) */}
              {selectedState && (
                <div className="md3-ssf-field-block">
                  <label className="md3-ssf-field-label">City in {selectedState}</label>
                  <select
                    className="md3-ssf-select-input"
                    value={citySelectVal}
                    onChange={(e) => handleAddCity(e.target.value)}
                  >
                    <option value="">Choose city to add...</option>
                    {availableCities
                      .filter((c) => !selectedCities.includes(c.name))
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>

                  {/* Selected City Removable Chips */}
                  {selectedCities.length > 0 && (
                    <div className="md3-ssf-selected-chips">
                      {selectedCities.map((cityName) => (
                        <span key={cityName} className="md3-removable-chip">
                          <span>{cityName}</span>
                          <button
                            type="button"
                            className="md3-removable-chip-del"
                            onClick={() => handleRemoveCity(cityName)}
                            title="Remove city"
                            aria-label={`Remove ${cityName}`}
                          >
                            <Icon.X />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── STICKY FOOTER ── */}
        <div className="md3-side-sheet-footer">
          <div className="md3-ssf-footer-summary">
            {activeCount > 0 ? (
              <span><strong>{activeCount}</strong> filter criteria active</span>
            ) : (
              <span>No filters active</span>
            )}
          </div>
          <div className="md3-ssf-footer-buttons">
            <button
              type="button"
              className="md3-ssf-action-btn md3-ssf-action-btn--reset"
              onClick={handleReset}
            >
              <Icon.X />
              <span>Reset</span>
            </button>
            <button
              type="button"
              className="md3-ssf-action-btn md3-ssf-action-btn--apply"
              onClick={handleApply}
            >
              <Icon.CheckCircle />
              <span>Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FilterSideSheet;
