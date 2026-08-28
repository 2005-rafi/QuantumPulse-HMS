import React, { useState, useEffect, useCallback } from 'react';
import { patientAPI } from '../../services/patientAPI';
import { staffAPI } from '../../services/staffAPI';
import api from '../../services/api';
import { SearchSortFilterPanel } from '../../components/md3/SearchSortFilterPanel';
import PatientCard from '../../components/patients/PatientCard';
import PatientListView from '../../components/patients/PatientListView';
import { usePatientLayoutPreference } from '../../hooks/usePatientLayoutPreference';
import { Icon } from '../../components/md3/Md3Widgets';
import Md3Pagination from '../../components/md3/Md3Pagination';
import './PatientList.css';

/* ── Icons ── */
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconInbox = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

/* ── Empty State — Single Responsibility ── */
const PatientEmptyState = ({ isSearching }) => (
  <div className="patient-empty-state">
    <div className="patient-empty-icon" aria-hidden="true">
      <IconInbox />
    </div>
    <p className="patient-empty-title">
      {isSearching ? 'No matching patients found' : 'No patients registered yet'}
    </p>
    <p className="patient-empty-subtitle">
      {isSearching
        ? 'Try a different name, MRN, phone number or refine your filter options'
        : 'Use the Register Patient button to add the first patient'}
    </p>
  </div>
);

/* ── Loading State — Single Responsibility ── */
const PatientLoadingState = () => (
  <div className="patient-empty-state">
    <span className="md3-spinner" aria-hidden="true" />
    <p className="patient-empty-subtitle">Searching patient records...</p>
  </div>
);

/* ── Main Patient List ── */
const PatientList = ({ onSelectPatient, onTotalChange }) => {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { isListView, isCardView, setLayout } = usePatientLayoutPreference();
  const [limit, setLimit] = useState(50);

  // Fetch filters metadata on mount
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
          const staffItems = staffRes.value.data?.items || staffRes.value.data?.data?.items || [];
          setDoctors(staffItems.filter((s) => s.roleId?.name === 'Doctor'));
        }
      } catch (err) {
        console.error('[PatientList] Failed to load filters metadata', err);
      }
    };
    fetchFiltersMetadata();
  }, []);

  const fetchPatients = useCallback(async (searchQuery, currentPage, activeFilters) => {
    setLoading(true);
    try {
      // Map multi-select arrays to comma-separated lists for cleaner querystring serialization
      const apiFilters = { ...activeFilters };
      if (Array.isArray(apiFilters.visitType)) {
        apiFilters.visitType = apiFilters.visitType.join(',');
      }
      if (Array.isArray(apiFilters.departmentId)) {
        apiFilters.departmentId = apiFilters.departmentId.join(',');
      }
      if (Array.isArray(apiFilters.doctorId)) {
        apiFilters.doctorId = apiFilters.doctorId.join(',');
      }
      if (Array.isArray(apiFilters.city)) {
        apiFilters.city = apiFilters.city.join(',');
      }
      if (Array.isArray(apiFilters.cities)) {
        apiFilters.cities = apiFilters.cities.join(',');
      }
      if (Array.isArray(apiFilters.state)) {
        apiFilters.state = apiFilters.state.join(',');
      }

      const result = await patientAPI.search(searchQuery, currentPage, limit, apiFilters);
      const items = result.data?.items || result.items || [];
      const total = result.data?.total || result.total || 0;
      const pages = result.data?.pages || result.pages || 1;

      setPatients(items);
      setTotalItems(total);
      setTotalPages(pages);
      if (onTotalChange) onTotalChange(total);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  }, [limit, onTotalChange]);

  const handleFiltersChange = useCallback(({ query: q, filters: f }) => {
    setQuery(q);
    setFilters(f);
  }, []);

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce query and filters changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncedFilters(filters);
      setPage(1); // reset to page 1 on query/filter changes
    }, 250);
    return () => clearTimeout(timer);
  }, [query, filters]);

  // Fetch only when page, debouncedQuery, or debouncedFilters change
  useEffect(() => {
    fetchPatients(debouncedQuery, page, debouncedFilters);
  }, [debouncedQuery, page, debouncedFilters, fetchPatients]);

  const formatDob = (dob) => dob
    ? new Date(dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="patient-list-container">
      <div className="patient-list-card">

        {/* Header */}
        <div className="patient-list-header">
          <div className="patient-list-title-group">
            <h2>Patient Directory</h2>
            <p>
              {loading ? 'Loading records…' : `${totalItems.toLocaleString()} patient${totalItems !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <div className="patient-list-header-actions">
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

        {/* Controls Layer */}
        <div className="patient-list-controls-layer">
          <SearchSortFilterPanel
            placeholder="Search by name, MRN, or phone…"
            onFiltersChange={handleFiltersChange}
            departments={departments}
            doctors={doctors}
          />
        </div>

        {/* Top Pagination (rendered when total records exceed 20) */}
        {totalItems > 20 && (
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
          />
        )}

        {/* Table / Card List Area */}
        <div className="patient-table-wrapper">
          {loading ? (
            <PatientLoadingState />
          ) : patients.length === 0 ? (
            <PatientEmptyState isSearching={!!query || Object.values(filters).some(Boolean)} />
          ) : isListView ? (
            <PatientListView
              patients={patients}
              onSelectPatient={onSelectPatient}
            />
          ) : (
            <div className="patient-card-grid" role="list">
              {patients.map((p) => (
                <PatientCard
                  key={p._id || p.id}
                  patient={p}
                  typeIndicator="OPD"
                  onClick={onSelectPatient}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalItems > 0 && (
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
          />
        )}
      </div>
    </div>
  );
};

export default PatientList;
