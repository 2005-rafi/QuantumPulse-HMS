import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from './Md3FormComponents';
import './FilterSideSheet.css';

// Positions mapping matching constants/index.js for dynamic filtering
const POSITION_ROLE_MAP = {
  'Doctor': [
    'Chief Medical Officer', 'Medical Superintendent', 'Head of Department',
    'Senior Consultant', 'Consultant', 'Associate Consultant',
    'Junior Consultant', 'Resident Doctor', 'Intern'
  ],
  'Nurse': [
    'Chief Nursing Officer', 'Nursing Superintendent', 'Deputy Nursing Superintendent',
    'Head Nurse', 'Senior Staff Nurse', 'Staff Nurse', 'Junior Nurse', 'Nursing Assistant'
  ],
  'Laboratory': [
    'Laboratory Director', 'Laboratory Manager', 'Laboratory Supervisor',
    'Senior Technologist', 'Lab Technologist', 'Lab Technician', 'Lab Assistant'
  ],
  'Pharmacy': [
    'Chief Pharmacist', 'Pharmacy Manager', 'Senior Pharmacist',
    'Pharmacist', 'Pharmacy Technician', 'Pharmacy Assistant'
  ],
  'Reception': [
    'Front Office Manager', 'Reception Supervisor', 'Senior Receptionist',
    'Receptionist', 'Front Desk Assistant'
  ],
  'Administrator': [
    'Chief Executive Officer', 'Administrative Director', 'Admin Officer', 'Admin Assistant'
  ]
};

const ALL_POSITIONS = Object.values(POSITION_ROLE_MAP).flat();

export const StaffFilterSideSheet = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = {},
  departments = [],
  roles = [],
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Local filter states
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState([]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedStatuses(initialFilters.statuses || []);
      setSelectedRoles(initialFilters.roles || []);
      setSelectedDepartments(initialFilters.departments || []);
      setSelectedPositions(initialFilters.positions || []);
      setIsClosing(false);
    }
  }, [isOpen, initialFilters]);

  // Sorted departments A-Z
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  // Determine which positions to display based on selected roles
  const visiblePositions = useMemo(() => {
    if (selectedRoles.length === 0) {
      return ALL_POSITIONS;
    }
    return selectedRoles.flatMap(roleName => POSITION_ROLE_MAP[roleName] || []);
  }, [selectedRoles]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280); // matches CSS drawer slide-out animation time
  };

  const handleToggleStatus = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleToggleRole = (roleName) => {
    setSelectedRoles(prev => {
      const updated = prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName];
      // Clean up selected positions that are no longer valid under the updated roles list
      if (updated.length > 0) {
        const allowedPositions = updated.flatMap(r => POSITION_ROLE_MAP[r] || []);
        setSelectedPositions(posPrev => posPrev.filter(p => allowedPositions.includes(p)));
      }
      return updated;
    });
  };

  const handleToggleDepartment = (deptId) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]
    );
  };

  const handleTogglePosition = (position) => {
    setSelectedPositions(prev => 
      prev.includes(position) ? prev.filter(p => p !== position) : [...prev, position]
    );
  };

  const handleApply = () => {
    onApply({
      statuses: selectedStatuses,
      roles: selectedRoles,
      departments: selectedDepartments,
      positions: selectedPositions
    });
    handleClose();
  };

  const handleReset = () => {
    setSelectedStatuses([]);
    setSelectedRoles([]);
    setSelectedDepartments([]);
    setSelectedPositions([]);
  };

  return createPortal(
    <div className={`md3-side-sheet-backdrop ${isClosing ? 'is-closing' : ''}`} onClick={handleClose}>
      <div 
        className={`md3-side-sheet-container ${isClosing ? 'is-closing' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter staff records"
      >
        {/* Header */}
        <div className="md3-side-sheet-header">
          <div className="md3-side-sheet-header-title-group">
            <h3>Filters</h3>
            <span className="md3-side-sheet-subtitle">Refine staff directory</span>
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
          
          {/* Category: Account Status */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Account Status</span>
            <div className="md3-ssf-chips-deck">
              {['Active', 'Inactive'].map((status) => {
                const isSelected = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleToggleStatus(status)}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category: Roles */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Roles</span>
            <div className="md3-ssf-chips-deck">
              {roles.map((r) => {
                const isSelected = selectedRoles.includes(r.name);
                return (
                  <button
                    key={r._id || r.name}
                    type="button"
                    className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleToggleRole(r.name)}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category: Departments */}
          {sortedDepartments.length > 0 && (
            <div className="md3-ssf-category">
              <span className="md3-ssf-category-label">Departments</span>
              <div className="md3-ssf-chips-deck">
                {sortedDepartments.map((dept) => {
                  const isSelected = selectedDepartments.includes(dept._id);
                  return (
                    <button
                      key={dept._id}
                      type="button"
                      className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleToggleDepartment(dept._id)}
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

          {/* Category: Positions */}
          <div className="md3-ssf-category">
            <span className="md3-ssf-category-label">Positions</span>
            <div className="md3-ssf-chips-deck" style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '12px', background: 'var(--md-sys-color-surface-container-lowest)' }}>
              {visiblePositions.map((pos) => {
                const isSelected = selectedPositions.includes(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    className={`md3-filter-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleTogglePosition(pos)}
                    style={{ margin: '4px' }}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md3-chip-check-icon" width="12" height="12">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>
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
