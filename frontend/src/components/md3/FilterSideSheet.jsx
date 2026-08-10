import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from './Md3FormComponents';
import './FilterSideSheet.css';

export const FilterSideSheet = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = {},
  departments = [],
  doctors = [],
}) => {
  const [isClosing, setIsClosing] = useState(false);
  
  // Local state for filter selections
  const [selectedVisitTypes, setSelectedVisitTypes] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Synchronize state when sheet is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedVisitTypes(initialFilters.visitType || []);
      setSelectedDepartments(initialFilters.departmentId || []);
      setSelectedDoctors(initialFilters.doctorId || []);
      setStartDate(initialFilters.startDate || '');
      setEndDate(initialFilters.endDate || '');
      setSortBy(initialFilters.sortBy || 'newest');
      setIsClosing(false);
    }
  }, [isOpen, initialFilters]);

  // Alphabetically sort departments (A-Z)
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  // Alphabetically sort doctors (A-Z)
  const sortedDoctors = useMemo(() => {
    return [...doctors].sort((a, b) => {
      const nameA = (a.fullName || `${a.firstName} ${a.lastName}`).toLowerCase();
      const nameB = (b.fullName || `${b.firstName} ${b.lastName}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [doctors]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280); // matches CSS drawer slide-out animation time
  };

  const handleToggleVisitType = (type) => {
    setSelectedVisitTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleToggleDepartment = (id) => {
    setSelectedDepartments(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleToggleDoctor = (id) => {
    setSelectedDoctors(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onApply({
      visitType: selectedVisitTypes,
      departmentId: selectedDepartments,
      doctorId: selectedDoctors,
      startDate,
      endDate,
      sortBy
    });
    handleClose();
  };

  const handleReset = () => {
    setSelectedVisitTypes([]);
    setSelectedDepartments([]);
    setSelectedDoctors([]);
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  return createPortal(
    <div className={`md3-side-sheet-backdrop ${isClosing ? 'is-closing' : ''}`} onClick={handleClose}>
      <div 
        className={`md3-side-sheet-container ${isClosing ? 'is-closing' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter patient records"
      >
        {/* Header */}
        <div className="md3-side-sheet-header">
          <div className="md3-side-sheet-header-title-group">
            <h3>Filters</h3>
            <span className="md3-side-sheet-subtitle">Refine patient directory</span>
          </div>
          <button type="button" className="md3-side-sheet-close-btn" onClick={handleClose} aria-label="Close filters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="md3-side-sheet-content">
          
          {/* Category: Sort By */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Sort By</span>
            <div className="md3-ssf-chips-deck">
              {[
                { value: 'newest', label: 'Registered (Newest)' },
                { value: 'oldest', label: 'Registered (Oldest)' },
                { value: 'nameA-Z', label: 'Name (A-Z)' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`md3-filter-chip ${sortBy === opt.value ? 'is-selected' : ''}`}
                  onClick={() => setSortBy(opt.value)}
                >
                  {sortBy === opt.value && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category: Visit Type */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Visit Type</span>
            <div className="md3-ssf-chips-deck">
              {[
                { value: 'OPD', label: 'OPD (Outpatient)' },
                { value: 'IPD', label: 'IPD (Inpatient)' }
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category: Visit Date Range */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Visit Date Range</span>
            <div className="md3-ssf-date-range-group">
              <div className="md3-ssf-date-field-wrapper">
                <label className="md3-ssf-date-field-label">Start Date</label>
                <input
                  type="date"
                  className="md3-ssf-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Filter start date"
                />
              </div>
              <div className="md3-ssf-date-field-wrapper">
                <label className="md3-ssf-date-field-label">End Date</label>
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

          {/* Category: Departments */}
          {sortedDepartments.length > 0 && (
            <div className="md3-ssf-category">
              <span className="md3-ssf-category-label">Departments</span>
              <div className="md3-ssf-chips-deck">
                {sortedDepartments.map((dept) => {
                  const isSelected = selectedDepartments.includes(dept._id || dept.id);
                  return (
                    <button
                      key={dept._id || dept.id}
                      type="button"
                      className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleToggleDepartment(dept._id || dept.id)}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {dept.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category: Consulting Doctors */}
          {sortedDoctors.length > 0 && (
            <div className="md3-ssf-category">
              <span className="md3-ssf-category-label">Consulting Doctors</span>
              <div className="md3-ssf-chips-deck">
                {sortedDoctors.map((doc) => {
                  const isSelected = selectedDoctors.includes(doc._id || doc.id);
                  return (
                    <button
                      key={doc._id || doc.id}
                      type="button"
                      className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleToggleDoctor(doc._id || doc.id)}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {doc.fullName || `${doc.firstName} ${doc.lastName}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="md3-side-sheet-footer">
          <Md3Button variant="outlined" onClick={handleReset} style={{ flex: 1, minHeight: '44px' }}>
            Reset
          </Md3Button>
          <Md3Button variant="primary" onClick={handleApply} style={{ flex: 1, minHeight: '44px' }}>
            Apply Filters
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
