import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { staffAPI } from '../../services/staffAPI';
import CreateStaffSheet from './CreateStaffSheet';
import StaffAnalyticsDialog from './StaffAnalyticsDialog';
import PositionProgressionDialog from './PositionProgressionDialog';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { StaffFilterSideSheet } from '../../components/md3/StaffFilterSideSheet';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
import StaffCard from '../../components/staff/StaffCard';
import StaffListView from '../../components/staff/StaffListView';
import { useStaffLayoutPreference } from '../../hooks/useStaffLayoutPreference';

const AdminStaffManager = () => {
  const { 
    staffList, 
    roles, 
    departments, 
    fetchStaff, 
    openConfirm, 
    closeConfirm, 
    setConfirmLoading, 
    showSuccess, 
    showError 
  } = useOutletContext();

  const location = useLocation();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    statuses: [],
    roles: [],
    departments: [],
    positions: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [isStaffAnalyticsOpen, setIsStaffAnalyticsOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [progressingStaff, setProgressingStaff] = useState(null);
  const { isListView, isCardView, setLayout } = useStaffLayoutPreference();

  useEffect(() => {
    if (location.state?.statusFilter) {
      const sf = location.state.statusFilter;
      if (sf.toLowerCase() === 'all') {
        setFilters(prev => ({
          ...prev,
          statuses: []
        }));
      } else {
        setFilters(prev => ({
          ...prev,
          statuses: [sf]
        }));
      }
    }
  }, [location.state]);

  const displayMessage = (msg, isError = false) => {
    if (isError) {
      showError(msg);
    } else {
      showSuccess(msg);
    }
  };

  const handleDisableStaff = (staffId, staffName) => {
    openConfirm({
      title: 'Disable Account',
      message: `Disable ${staffName}'s account? They will immediately lose system access.`,
      confirmLabel: 'Disable',
      variant: 'danger',
      icon: 'block',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await staffAPI.disable(staffId);
          showSuccess('Account disabled successfully.');
          fetchStaff();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error disabling account');
          closeConfirm();
        }
      },
    });
  };

  const handleEnableStaff = (staffId, staffName) => {
    openConfirm({
      title: 'Re-enable Account',
      message: `Re-enable ${staffName}'s account? They will regain system access immediately.`,
      confirmLabel: 'Re-enable',
      variant: 'success',
      icon: 'check_circle',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await staffAPI.enable(staffId);
          showSuccess('Account re-enabled successfully.');
          fetchStaff();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error re-enabling account');
          closeConfirm();
        }
      },
    });
  };

  const filteredStaff = staffList.filter(s => {
    const matchesRole = filters.roles.length === 0 || filters.roles.includes(s.roleId?.name);
    
    // Status filter: empty array or 'All' matches all staff
    const matchesStatus = 
      filters.statuses.length === 0 ||
      filters.statuses.some(st => st.toLowerCase() === 'all') ||
      filters.statuses.some(st => {
        const normalizedFilter = st.toLowerCase();
        const staffStatus = (s.status || 'Active').toLowerCase();
        if (normalizedFilter === 'inactive' || normalizedFilter === 'disabled') {
          return staffStatus === 'inactive' || staffStatus === 'disabled';
        }
        return staffStatus === normalizedFilter;
      });

    const matchesDept = filters.departments.length === 0 || filters.departments.includes(s.departmentId?._id);
    const matchesPosition = filters.positions.length === 0 || filters.positions.includes(s.position);
    const matchesSearch = searchQuery.trim() === '' || 
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesDept && matchesPosition && matchesSearch;
  });

  const activeFiltersCount = 
    filters.statuses.filter(s => s.toLowerCase() !== 'all').length + 
    filters.roles.length + 
    filters.departments.length + 
    filters.positions.length;

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedStaff,
    showTopPagination,
  } = usePagination(filteredStaff, 50, [searchQuery, filters]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
            <h2 style={{ color: 'var(--md-sys-color-primary)', margin: 0 }}>
              {filters.statuses.includes('Active') && filters.statuses.length === 1 ? 'Active Staff Directory' : filters.statuses.includes('Disabled') && filters.statuses.length === 1 ? 'Disabled Staff Directory' : 'Staff Directory'}
            </h2>
            <Md3SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search staff by name..." 
            />
            <button 
              onClick={() => setIsStaffAnalyticsOpen(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                background: 'var(--md-sys-color-secondary-container, #e8def8)', 
                color: 'var(--md-sys-color-on-secondary-container, #1d192b)', 
                border: 'none', 
                borderRadius: '100px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold',
                transition: 'background 200ms ease',
                height: '44px'
              }}
              className="staff-analytics-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>analytics</span>
              Analytics
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
            {/* View Mode Toggle: Cards vs List */}
            <div className="md3-view-toggle-group" role="group" aria-label="Staff directory layout view mode">
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

            <button 
              onClick={() => setIsFilterOpen(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                background: activeFiltersCount > 0 ? 'var(--md-sys-color-primary-container, #eaddff)' : 'var(--md-sys-color-surface-container-high, #ece6f0)', 
                color: activeFiltersCount > 0 ? 'var(--md-sys-color-on-primary-container, #21005d)' : 'var(--md-sys-color-on-surface, #1d1b20)', 
                border: activeFiltersCount > 0 ? '1px solid var(--md-sys-color-primary, #6750a4)' : '1px solid var(--md-sys-color-outline-variant, #cac4d0)', 
                borderRadius: '100px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold',
                transition: 'all 200ms ease',
                height: '44px'
              }}
              className="staff-filter-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>tune</span>
              Filters
              {activeFiltersCount > 0 && (
                <span style={{ 
                  background: 'var(--md-sys-color-primary, #6750a4)', 
                  color: 'var(--md-sys-color-on-primary, #ffffff)', 
                  borderRadius: '50%', 
                  minWidth: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px',
                  boxSizing: 'border-box'
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsCreateStaffOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: 'var(--md-sys-color-primary, #00668b)',
                color: 'var(--md-sys-color-on-primary, #ffffff)',
                border: 'none',
                borderRadius: '100px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'all 200ms ease',
                height: '44px',
                boxShadow: 'var(--md-sys-elevation-1, 0 1px 3px rgba(0,0,0,0.12))'
              }}
              className="staff-add-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
              Add Staff
            </button>
          </div>
        </div>
        
        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="staff"
            position="top"
          />
        )}
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {paginatedStaff.length === 0 ? (
            <div style={{ width: '100%', padding: '20px 0' }}>
              <Md3EmptyState
                icon="badge"
                title="No staff members found"
                description="There are no staff members matching the selected filters. Try searching with a different keyword or resetting filters."
                variant="card"
              />
            </div>
          ) : isListView ? (
            <div className="md3-paginated-content-fade" key={`list-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              <StaffListView
                staffList={paginatedStaff}
                onEdit={(staff) => setEditingStaff(staff)}
                onProgress={(staff) => setProgressingStaff(staff)}
                onDisable={(id, name) => handleDisableStaff(id, name)}
                onEnable={(id, name) => handleEnableStaff(id, name)}
              />
            </div>
          ) : (
            <div className="staff-card-grid md3-paginated-content-fade" key={`cards-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              {paginatedStaff.map((staff) => (
                <StaffCard
                  key={staff._id}
                  staff={staff}
                  onEdit={(s) => setEditingStaff(s)}
                  onProgress={(s) => setProgressingStaff(s)}
                  onDisable={(id, name) => handleDisableStaff(id, name)}
                  onEnable={(id, name) => handleEnableStaff(id, name)}
                />
              ))}
            </div>
          )}

          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="staff"
              position="bottom"
            />
          )}
        </div>
      </section>

      <CreateStaffSheet 
        isOpen={isCreateStaffOpen || !!editingStaff} 
        onClose={() => { setIsCreateStaffOpen(false); setEditingStaff(null); }}
        onSuccess={(msg) => { displayMessage(msg); fetchStaff(); setIsCreateStaffOpen(false); setEditingStaff(null); }}
        departments={departments}
        roles={roles}
        staff={editingStaff}
      />

      <StaffAnalyticsDialog
        isOpen={isStaffAnalyticsOpen}
        onClose={() => setIsStaffAnalyticsOpen(false)}
        staffList={staffList}
        departments={departments}
        roles={roles}
      />

      <PositionProgressionDialog
        isOpen={!!progressingStaff}
        onClose={() => setProgressingStaff(null)}
        staff={progressingStaff}
        onUpdate={() => {
          fetchStaff();
        }}
      />

      <StaffFilterSideSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
        departments={departments}
        roles={roles}
      />
    </div>
  );
};

export default AdminStaffManager;
