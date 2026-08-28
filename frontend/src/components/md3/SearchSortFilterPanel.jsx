import React, { useState, useEffect } from 'react';
import { Md3TextField, Md3Button } from './Md3FormComponents';
import { FilterSideSheet } from './FilterSideSheet';
import './SearchSortFilterPanel.css';

export const SearchSortFilterPanel = ({
  placeholder = 'Search...',
  onFiltersChange,
  showVisitFilters = true,
  showStaffFilters = false,
  departments = [],
  doctors = [],
  roles = [],
}) => {
  const [query, setQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    visitType: [],
    departmentId: [],
    doctorId: [],
    roleId: [],
    state: '',
    city: '',
    startDate: '',
    endDate: '',
    sortBy: 'newest',
  });

  // Emit search and filters changes back to parent
  useEffect(() => {
    onFiltersChange?.({ query, filters });
  }, [query, filters, onFiltersChange]);

  const handleClearSearch = () => setQuery('');

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({
      visitType: [],
      departmentId: [],
      doctorId: [],
      roleId: [],
      state: '',
      city: '',
      startDate: '',
      endDate: '',
      sortBy: 'newest',
    });
    setQuery('');
  };

  // Count active selections for button badge indicator
  const activeFiltersCount = [
    filters.visitType?.length || 0,
    filters.departmentId?.length || 0,
    filters.doctorId?.length || 0,
    filters.roleId?.length || 0,
    filters.state ? 1 : 0,
    filters.city ? 1 : 0,
    filters.startDate ? 1 : 0,
    filters.endDate ? 1 : 0,
    filters.sortBy !== 'newest' ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  return (
    <div className="md3-ssf-panel">
      <div className="md3-ssf-main-row">
        <div className="md3-ssf-search-wrapper">
          <Md3TextField
            id="ssf-search-input"
            name="q"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leadingIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            trailingIcon={
              query ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : null
            }
            onTrailingIconClick={handleClearSearch}
            trailingIconAriaLabel="Clear search"
          />
        </div>
        <div className="md3-ssf-actions">
          <Md3Button
            variant={activeFiltersCount > 0 ? 'filled' : 'outlined'}
            onClick={() => setIsSheetOpen(true)}
            className="md3-ssf-filter-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ marginRight: '6px' }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
          </Md3Button>
          {(query || activeFiltersCount > 0) && (
            <Md3Button
              variant="text"
              onClick={handleReset}
              className="md3-ssf-reset-btn"
            >
              Reset
            </Md3Button>
          )}
        </div>
      </div>

      <FilterSideSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        departments={departments}
        doctors={doctors}
      />
    </div>
  );
};
