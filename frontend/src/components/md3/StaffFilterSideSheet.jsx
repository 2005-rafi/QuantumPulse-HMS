import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from './Md3FormComponents';
import Md3SearchMultiSelect from './Md3SearchMultiSelect';
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
  'Ward Operations': [
    'Head of Department', 'Operations Manager', 'Senior Ward Executive',
    'Junior Ward Executive', 'Housekeeping'
  ],
  'Administrator': [
    'Chief Executive Officer', 'Administrative Director', 'Admin Officer', 'Admin Assistant'
  ]
};

const ALL_POSITIONS = Object.values(POSITION_ROLE_MAP).flat();

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', badge: 'Active' },
  { value: 'Inactive', label: 'Inactive', badge: 'Inactive' },
  { value: 'Disabled', label: 'Disabled', badge: 'Disabled' },
];

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
      const initStatuses = (initialFilters.statuses || []).filter(s => (s || '').toLowerCase() !== 'all');
      setSelectedStatuses(initStatuses);
      setSelectedRoles(initialFilters.roles || []);
      setSelectedDepartments(initialFilters.departments || []);
      setSelectedPositions(initialFilters.positions || []);
      setIsClosing(false);
    }
  }, [isOpen, initialFilters]);

  // Sorted departments A-Z
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [departments]);

  // 1. Roles Options
  const roleOptions = useMemo(() => {
    return roles.map((r) => ({
      value: r.name,
      label: r.name,
      badge: r.description || null,
    }));
  }, [roles]);

  // 2. Department Options
  const departmentOptions = useMemo(() => {
    return sortedDepartments.map((d) => ({
      value: d._id,
      label: d.name,
      badge: d.code || null,
    }));
  }, [sortedDepartments]);

  // 3. Dynamic Positions based on selected roles
  const visiblePositions = useMemo(() => {
    if (selectedRoles.length === 0) {
      return ALL_POSITIONS;
    }
    return selectedRoles.flatMap((roleName) => POSITION_ROLE_MAP[roleName] || []);
  }, [selectedRoles]);

  const positionOptions = useMemo(() => {
    return visiblePositions.map((pos) => ({
      value: pos,
      label: pos,
    }));
  }, [visiblePositions]);

  // Handle role changes and auto-prune stale selected positions
  const handleRolesChange = (newRoles) => {
    setSelectedRoles(newRoles);
    if (newRoles.length > 0) {
      const allowedPositions = newRoles.flatMap((r) => POSITION_ROLE_MAP[r] || []);
      setSelectedPositions((posPrev) => posPrev.filter((p) => allowedPositions.includes(p)));
    }
  };

  const activeFiltersCount =
    selectedStatuses.length +
    selectedRoles.length +
    selectedDepartments.length +
    selectedPositions.length;

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  const handleApply = () => {
    onApply({
      statuses: selectedStatuses.filter((s) => (s || '').toLowerCase() !== 'all'),
      roles: selectedRoles,
      departments: selectedDepartments,
      positions: selectedPositions,
    });
    handleClose();
  };

  const handleResetAll = () => {
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
        aria-label="Filter staff directory"
      >
        {/* ── Header ── */}
        <div className="md3-side-sheet-header">
          <div className="md3-side-sheet-header-title-group">
            <div className="md3-ssf-title-row">
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)' }}>
                tune
              </span>
              <h3>Filters</h3>
              {activeFiltersCount > 0 && (
                <span className="md3-filter-active-badge">{activeFiltersCount} Active</span>
              )}
            </div>
            <span className="md3-side-sheet-subtitle">Refine staff directory</span>
          </div>

          <div className="md3-side-sheet-header-actions">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="md3-filter-clear-link"
                onClick={handleResetAll}
                title="Reset all filters"
              >
                Reset All
              </button>
            )}
            <button
              type="button"
              className="md3-side-sheet-close-btn"
              onClick={handleClose}
              aria-label="Close filters"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Content: 4 Organized Multi-Select Filter Components ── */}
        <div className="md3-side-sheet-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Component 1: Account Status */}
            <Md3SearchMultiSelect
              title="Account Status"
              icon="toggle_on"
              placeholder="Search status (Active, Inactive, Disabled)..."
              options={STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholderText="All account statuses (No filter)"
            />

            {/* Component 2: Roles */}
            <Md3SearchMultiSelect
              title="Roles"
              icon="badge"
              placeholder="Search & select roles..."
              options={roleOptions}
              selectedValues={selectedRoles}
              onChange={handleRolesChange}
              placeholderText="All staff roles (No filter)"
            />

            {/* Component 3: Departments */}
            <Md3SearchMultiSelect
              title="Departments"
              icon="domain"
              placeholder="Search & select hospital departments..."
              options={departmentOptions}
              selectedValues={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholderText="All hospital departments (No filter)"
            />

            {/* Component 4: Positions */}
            <Md3SearchMultiSelect
              title={selectedRoles.length > 0 ? `Positions (${selectedRoles.join(', ')})` : 'Positions'}
              icon="work"
              placeholder="Search & select job positions..."
              options={positionOptions}
              selectedValues={selectedPositions}
              onChange={setSelectedPositions}
              placeholderText={
                selectedRoles.length > 0
                  ? `All positions under ${selectedRoles.join(', ')}`
                  : 'All staff positions (No filter)'
              }
            />
          </div>
        </div>

        {/* ── Sticky Footer Actions ── */}
        <div className="md3-side-sheet-footer">
          <Md3Button
            type="button"
            variant="secondary"
            onClick={handleResetAll}
            disabled={activeFiltersCount === 0}
          >
            Reset
          </Md3Button>
          <Md3Button
            type="button"
            variant="filled"
            onClick={handleApply}
            style={{ minWidth: '130px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
              filter_alt
            </span>
            Apply Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StaffFilterSideSheet;
