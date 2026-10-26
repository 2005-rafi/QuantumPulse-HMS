import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { patientAPI } from '../../services/patientAPI';
import { staffAPI } from '../../services/staffAPI';
import api from '../../services/api';
import { SearchSortFilterPanel } from '../../components/md3/SearchSortFilterPanel';
import { FilterSideSheet } from '../../components/md3/FilterSideSheet';
import PatientCard from '../../components/patients/PatientCard';
import PatientListView from '../../components/patients/PatientListView';
import { usePatientLayoutPreference } from '../../hooks/usePatientLayoutPreference';
import { usePatientStatus } from '../../context/PatientStatusContext';
import { Icon } from '../../components/md3/Md3Widgets';
import Md3Pagination from '../../components/md3/Md3Pagination';
import Md3ExportDialog from '../../components/md3/Md3ExportDialog';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import './PatientList.css';

/* â”€â”€ Filter Options Definitions â”€â”€ */
const MODALITY_FILTERS = [
  { id: 'ALL', label: 'All Modalities' },
  { id: 'OPD', label: 'OPD' },
  { id: 'IPD', label: 'IPD' },
  { id: 'REGISTERED', label: 'Registered' },
];

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Statuses', icon: 'groups', variant: 'neutral' },
  { id: 'WAITING_TRIAGE', label: 'Waiting Nurse', icon: 'hourglass_top', variant: 'primary' },
  { id: 'WAITING_DOCTOR', label: 'Waiting Doctor', icon: 'stethoscope', variant: 'primary' },
  { id: 'IN_CONSULTATION', label: 'In Consultation', icon: 'clinical_notes', variant: 'info' },
  { id: 'WAITING_LAB', label: 'Lab / Phlebotomy', icon: 'science', variant: 'warning' },
  { id: 'SURGERY', label: 'Surgery / OT', icon: 'vital_signs', variant: 'error' },
  { id: 'ADMITTED_IPD', label: 'Inpatient Admitted', icon: 'bed', variant: 'secondary' },
  { id: 'COMPLETED', label: 'Visit Concluded', icon: 'check_circle', variant: 'success' },
  { id: 'REGISTERED_IDLE', label: 'Registered Only', icon: 'person', variant: 'neutral' },
];

/* â”€â”€ Empty State â”€â”€ */
const PatientEmptyState = ({ isSearching, onRegisterPatient }) => (
  isSearching ? (
    <div className="patient-empty-state">
      <div className="patient-empty-icon" aria-hidden="true">
        <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>inbox</span>
      </div>
      <p className="patient-empty-title">No matching patients found</p>
      <p className="patient-empty-subtitle">
        Try a different name, MRN, phone number or refine your filter options
      </p>
    </div>
  ) : (
    <div style={{ padding: '8px 0', width: '100%' }}>
      <ClinicalStationIdleDeck
        preset="RECEPTION"
        onAction={(key) => {
          if (key === 'REGISTER_PATIENT' && onRegisterPatient) onRegisterPatient();
        }}
      />
    </div>
  )
);

/* â”€â”€ Loading State â”€â”€ */
const PatientLoadingState = () => (
  <div className="patient-empty-state">
    <span className="md3-spinner" aria-hidden="true" />
    <p className="patient-empty-subtitle">Searching patient records...</p>
  </div>
);

/* â”€â”€ Main Patient List â”€â”€ */
const PatientList = ({ onSelectPatient, onTotalChange, onRegisterPatient, renderCardAction, renderRowAction, headerBanner }) => {
  const { isConnected, seedPatientStatuses } = usePatientStatus();
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isListView, isCardView, setLayout } = usePatientLayoutPreference();
  const [limit, setLimit] = useState(50);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch departments & doctors metadata on mount
  useEffect(() => {
    const fetchFiltersMetadata = async () => {
      try {
        const [deptRes, staffRes] = await Promise.allSettled([
          api.get('/departments'),
          staffAPI.list(1, 100),
        ]);
        if (deptRes.status === 'fulfilled') {
          setDepartments(deptRes.value.data?.data || []);
        }
        if (staffRes.status === 'fulfilled') {
          const rawStaff = staffRes.value?.data || staffRes.value;
          const staffItems =
            rawStaff?.items ||
            rawStaff?.data?.items ||
            rawStaff?.staff ||
            (Array.isArray(rawStaff) ? rawStaff : []);
          setDoctors(
            staffItems.filter(
              (s) =>
                /Doctor|Surgeon/i.test(s.roleId?.name || s.role || '') ||
                /Doctor|Surgeon|Physician/i.test(s.position || '')
            )
          );
        }
      } catch (err) {
        console.error('[PatientList] Failed to load filters metadata', err);
      }
    };
    fetchFiltersMetadata();
  }, []);

  // Compute active filters count for badge indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.visitType?.length) count += Array.isArray(filters.visitType) ? filters.visitType.length : 1;
    if (filters.departmentId?.length) count += Array.isArray(filters.departmentId) ? filters.departmentId.length : 1;
    if (filters.doctorId?.length) count += Array.isArray(filters.doctorId) ? filters.doctorId.length : 1;
    if (filters.city) count += 1;
    if (filters.startDate) count += 1;
    if (filters.endDate) count += 1;
    if (statusFilter !== 'ALL') count += 1;
    if (modalityFilter !== 'ALL') count += 1;
    return count;
  }, [filters, statusFilter, modalityFilter]);

  // Combine parent filters with modality & workflow status filters
  const combinedFilters = useMemo(() => {
    const combined = { ...filters };

    // Modality segregation
    if (modalityFilter === 'OPD') {
      combined.visitType = 'OPD';
    } else if (modalityFilter === 'IPD') {
      combined.visitType = 'IPD';
    } else if (modalityFilter === 'REGISTERED') {
      combined.status = 'REGISTERED_IDLE';
    }

    // Status segregation
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'WAITING_TRIAGE') {
        combined.status = 'WAITING_TRIAGE,IN_TRIAGE';
      } else if (statusFilter === 'WAITING_DOCTOR') {
        combined.status = 'WAITING_DOCTOR';
      } else if (statusFilter === 'IN_CONSULTATION') {
        combined.status = 'IN_CONSULTATION,IN_PROGRESS';
      } else if (statusFilter === 'WAITING_LAB') {
        combined.status = 'WAITING_LAB,IN_LAB,WAITING_DOCTOR_REVIEW';
      } else if (statusFilter === 'SURGERY') {
        combined.visitType = 'SURGERY,EMERGENCY';
      } else if (statusFilter === 'ADMITTED_IPD') {
        combined.status = 'ADMITTED_IPD';
      } else if (statusFilter === 'COMPLETED') {
        combined.status = 'COMPLETED';
      } else if (statusFilter === 'REGISTERED_IDLE') {
        combined.status = 'REGISTERED_IDLE';
      } else {
        combined.status = statusFilter;
      }
    }

    return combined;
  }, [filters, modalityFilter, statusFilter]);

  const fetchPatients = useCallback(async (searchQuery, currentPage, activeFilters) => {
    setLoading(true);
    try {
      const filterSource = activeFilters?.filters || activeFilters || {};
      const apiFilters = { ...filterSource };

      if (Array.isArray(apiFilters.visitType)) {
        apiFilters.visitType = apiFilters.visitType.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.status)) {
        apiFilters.status = apiFilters.status.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.departmentId)) {
        apiFilters.departmentId = apiFilters.departmentId.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.doctorId)) {
        apiFilters.doctorId = apiFilters.doctorId.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.roleId)) {
        apiFilters.roleId = apiFilters.roleId.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.city)) {
        apiFilters.city = apiFilters.city.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.patientType)) {
        apiFilters.patientType = apiFilters.patientType.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.gender)) {
        apiFilters.gender = apiFilters.gender.filter(Boolean).join(',');
      }
      if (Array.isArray(apiFilters.bloodGroup)) {
        apiFilters.bloodGroup = apiFilters.bloodGroup.filter(Boolean).join(',');
      }

      // Strip empty values
      Object.keys(apiFilters).forEach((k) => {
        if (
          apiFilters[k] === '' ||
          apiFilters[k] === undefined ||
          apiFilters[k] === null ||
          (Array.isArray(apiFilters[k]) && apiFilters[k].length === 0)
        ) {
          delete apiFilters[k];
        }
      });

      const res = await patientAPI.list(currentPage, limit, searchQuery, apiFilters);
      const data = res.data?.data || res.data || {};
      const items = data.patients || data.items || [];
      const total = data.total !== undefined ? data.total : (data.totalCount || items.length);
      const pages = data.pages || data.totalPages || Math.ceil(total / limit) || 1;

      setPatients(items);
      seedPatientStatuses(items);
      setTotalItems(total);
      setTotalPages(pages);
      onTotalChange?.(total);
    } catch (err) {
      console.error('[PatientList] fetchPatients failed', err);
      setPatients([]);
      setTotalItems(0);
      setTotalPages(1);
      onTotalChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [limit, onTotalChange, seedPatientStatuses]);

  const handleFiltersChange = useCallback((incoming) => {
    if (!incoming) return;
    const newQuery = incoming.query !== undefined ? incoming.query : (typeof incoming === 'string' ? incoming : '');
    const filterObj = incoming.filters || (typeof incoming === 'object' && !incoming.query ? incoming : {});
    setQuery(newQuery);
    setFilters(filterObj);
    setPage(1);
  }, []);

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedCombinedFilters, setDebouncedCombinedFilters] = useState(combinedFilters);

  // Debounce query and filters changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncedCombinedFilters(combinedFilters);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, combinedFilters]);

  // Fetch only when page, debouncedQuery, or debouncedCombinedFilters change
  useEffect(() => {
    fetchPatients(debouncedQuery, page, debouncedCombinedFilters);
  }, [debouncedQuery, page, debouncedCombinedFilters, fetchPatients]);

  return (
    <div className="patient-list-container">
      {headerBanner && <div className="patient-list-custom-banner" style={{ marginBottom: "16px" }}>{headerBanner}</div>}
      <div className="patient-list-card">

        {/* â”€â”€ 1. MOBILE & TABLET HEADER (< 1024px) â”€â”€ */}
        <div className="patient-mobile-header">
          <div className="patient-mobile-title-block">
            <div className="patient-mobile-title-row">
              <h2 className="patient-mobile-heading">Patient Directory</h2>
              {isConnected && (
                <span className="patient-mobile-live-dot" title="Live Real-time SSE updates active">
                  <span className="live-dot-pulse" />
                  <span className="live-dot-text">Live</span>
                </span>
              )}
            </div>
            <span className="patient-mobile-record-count">
              {loading ? 'Searchingâ€¦' : `${totalItems.toLocaleString()} registered`}
            </span>
          </div>

          <div className="patient-mobile-header-actions">
            {/* Search Trigger */}
            <button
              type="button"
              className={`patient-mobile-icon-btn ${isSearchExpanded || query ? 'is-active' : ''}`}
              onClick={() => setIsSearchExpanded((prev) => !prev)}
              title={isSearchExpanded ? 'Close Search' : 'Search Patients'}
              aria-label="Toggle patient search"
            >
              <span className="material-symbols-rounded">search</span>
            </button>

            {/* Filter Drawer Trigger */}
            <button
              type="button"
              className={`patient-mobile-icon-btn ${activeFiltersCount > 0 ? 'is-active' : ''}`}
              onClick={() => setIsFilterSheetOpen(true)}
              title="Filters (Department, Doctor, Date)"
              aria-label="Filter patients"
            >
              <span className="material-symbols-rounded">tune</span>
              {activeFiltersCount > 0 && (
                <span className="patient-mobile-badge-pill">{activeFiltersCount}</span>
              )}
            </button>

            {/* Export Trigger */}
            <button
              type="button"
              className="patient-mobile-icon-btn"
              onClick={() => setIsExportOpen(true)}
              title="Export CSV / JSON"
              aria-label="Export patient records"
            >
              <span className="material-symbols-rounded">download</span>
            </button>

            {/* Prominent + Register CTA */}
            {onRegisterPatient && (
              <button
                type="button"
                className="patient-mobile-register-btn"
                onClick={onRegisterPatient}
                title="Register New Patient"
              >
                <span className="material-symbols-rounded">person_add</span>
                <span className="patient-mobile-reg-label">Register</span>
              </button>
            )}
          </div>
        </div>

        {/* â”€â”€ 2. MOBILE EXPANDABLE SEARCH BAR â”€â”€ */}
        {(isSearchExpanded || query) && (
          <div className="patient-mobile-expandable-search">
            <div className="patient-mobile-search-inner">
              <span className="material-symbols-rounded patient-search-leading-icon">search</span>
              <input
                type="search"
                className="patient-mobile-search-input"
                placeholder="Search name, MRN, phoneâ€¦"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                autoFocus={isSearchExpanded}
              />
              {query && (
                <button
                  type="button"
                  className="patient-search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              )}
              <button
                type="button"
                className="patient-search-collapse-btn"
                onClick={() => setIsSearchExpanded(false)}
                title="Collapse search"
                aria-label="Collapse search"
              >
                <span className="material-symbols-rounded">expand_less</span>
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ 3. DESKTOP HEADER (â‰¥ 1024px) â”€â”€ */}
        <div className="patient-desktop-header">
          <div className="patient-list-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>Patient Directory</h2>
              {isConnected && (
                <span
                  className="patient-desktop-live-badge"
                  title="Real-Time Server Sent Events (SSE) active: Patient statuses update live without refreshing the page"
                >
                  <span className="patient-desktop-live-dot" />
                  Live Updates
                </span>
              )}
            </div>
            <p>
              {loading ? 'Loading recordsâ€¦' : `${totalItems.toLocaleString()} patient${totalItems !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <div className="patient-list-header-actions">
            <button
              type="button"
              className="patient-list-export-btn"
              onClick={() => setIsExportOpen(true)}
              title="Export Patient Data (CSV / JSON)"
            >
              <span className="material-symbols-rounded">download</span>
              <span>Export</span>
            </button>

            {onRegisterPatient && (
              <button
                type="button"
                className="patient-list-register-btn"
                onClick={onRegisterPatient}
                title="Register New Patient"
              >
                <span className="material-symbols-rounded">person_add</span>
                <span>Register Patient</span>
              </button>
            )}

            {/* Desktop View Toggle ([Cards] [List]) */}
            <div className="md3-view-toggle-group" role="group" aria-label="Directory layout view mode">
              <button
                type="button"
                className={`md3-view-toggle-btn ${isCardView ? 'active' : ''}`}
                onClick={() => setLayout('cards')}
                title="Card Grid View"
                aria-pressed={isCardView}
              >
                <span className="material-symbols-rounded">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`md3-view-toggle-btn ${isListView ? 'active' : ''}`}
                onClick={() => setLayout('list')}
                title="Tabular List View"
                aria-pressed={isListView}
              >
                <span className="material-symbols-rounded">view_list</span>
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€ 4. QUICK STATUS & MODALITY FILTER STRIP (Mobile, Tablet & Desktop) â”€â”€ */}
        <div className="patient-quick-filter-strip">
          {/* Segmented Modality Bar */}
          <div className="patient-modality-seg-group" role="tablist" aria-label="Modality Filter">
            {MODALITY_FILTERS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`patient-modality-seg-chip ${modalityFilter === m.id ? 'is-active' : ''}`}
                onClick={() => {
                  setModalityFilter(m.id);
                  setPage(1);
                }}
                role="tab"
                aria-selected={modalityFilter === m.id}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Workflow Status Horizontal Strip */}
          <div className="patient-status-chip-row" role="region" aria-label="Workflow Status Quick Filters">
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`patient-status-quick-chip ${isActive ? `is-active is-active--${s.variant || 'neutral'}` : ''}`}
                  onClick={() => {
                    setStatusFilter(s.id);
                    setPage(1);
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                    {s.icon}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* â”€â”€ 5. DESKTOP CONTROLS LAYER (â‰¥ 1024px) â”€â”€ */}
        <div className="patient-list-controls-layer">
          <SearchSortFilterPanel
            placeholder="Search by name, MRN, or phoneâ€¦"
            onFiltersChange={handleFiltersChange}
            departments={departments}
            doctors={doctors}
          />
        </div>

        {/* â”€â”€ 6. DESKTOP TOP PAGINATION â”€â”€ */}
        {totalItems > 20 && (
          <div className="patient-desktop-pagination-top">
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="patients"
              position="top"
              disabled={loading}
            />
          </div>
        )}

        {/* â”€â”€ 7. TABLE / CARD AREA â”€â”€ */}
        <div className="patient-table-wrapper">
          {loading ? (
            <PatientLoadingState />
          ) : patients.length === 0 ? (
            <PatientEmptyState
              isSearching={!!query || Object.values(filters).some(Boolean) || statusFilter !== 'ALL' || modalityFilter !== 'ALL'}
              onRegisterPatient={onRegisterPatient}
            />
          ) : (
            <>
              {/* MOBILE & TABLET: EXCLUSIVE CLINICAL CARD DECK (â‰¤ 1023px) */}
              <div className="patient-mobile-card-deck" role="list">
                {patients.map((p) => (
                  <PatientCard
                    key={p._id || p.id}
                    patient={p}
                    typeIndicator={p.currentState || p.lastVisitType || 'IDLE'}
                    onClick={onSelectPatient}
                    actionSlot={renderCardAction ? renderCardAction(p) : null}
                  />
                ))}
              </div>

              {/* DESKTOP: RESPECTS USER VIEW TOGGLE (â‰¥ 1024px) */}
              <div className="patient-desktop-content">
                {isListView ? (
                  <PatientListView
                    patients={patients}
                    onSelectPatient={onSelectPatient}
                    renderRowAction={renderRowAction || renderCardAction}
                  />
                ) : (
                  <div className="patient-card-grid" role="list">
                    {patients.map((p) => (
                      <PatientCard
                        key={p._id || p.id}
                        patient={p}
                        typeIndicator={p.currentState || p.lastVisitType || 'IDLE'}
                        onClick={onSelectPatient}
                        actionSlot={renderCardAction ? renderCardAction(p) : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* â”€â”€ 8. MOBILE COMPACT TOUCH PAGINATION (â‰¤ 1023px) â”€â”€ */}
        {totalItems > 0 && (
          <div className="patient-mobile-pagination-bar">
            <span className="patient-mobile-page-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} pts)
            </span>
            <div className="patient-mobile-page-actions">
              <button
                type="button"
                className="patient-mobile-page-nav-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous Page"
              >
                <span className="material-symbols-rounded">chevron_left</span>
                <span>Prev</span>
              </button>
              <button
                type="button"
                className="patient-mobile-page-nav-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                aria-label="Next Page"
              >
                <span>Next</span>
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ 9. DESKTOP BOTTOM PAGINATION (â‰¥ 1024px) â”€â”€ */}
        {totalItems > 0 && (
          <div className="patient-desktop-pagination-bottom">
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="patients"
              position="bottom"
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* â”€â”€ Reusable MD3 Streaming Export Dialog â”€â”€ */}
      <Md3ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* â”€â”€ Filter Side Sheet for Mobile Header & Detailed Filters â”€â”€ */}
      <FilterSideSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        initialFilters={filters}
        departments={departments}
        doctors={doctors}
      />
    </div>
  );
};

export default PatientList;

