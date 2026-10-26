import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { staffAPI } from '../../services/staffAPI';
import CreateStaffSheet from './CreateStaffSheet';
import StaffAnalyticsDialog from './StaffAnalyticsDialog';
import PositionProgressionDialog from './PositionProgressionDialog';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { StaffFilterSideSheet } from '../../components/md3/StaffFilterSideSheet';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
import StaffCard from '../../components/staff/StaffCard';
import StaffListView from '../../components/staff/StaffListView';
import { useStaffLayoutPreference } from '../../hooks/useStaffLayoutPreference';

const AdminStaffManager = () => {
  const outletCtx = useOutletContext() || {};
  const { user } = useAuth();
  const { showSuccess: toastSuccess, showError: toastError } = useToast();

  const [localStaffList, setLocalStaffList] = useState([]);
  const [localRoles, setLocalRoles] = useState([]);
  const [localDepartments, setLocalDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const isStandalone = !outletCtx.staffList;
  const staffList = outletCtx.staffList || localStaffList;
  const roles = outletCtx.roles || localRoles;
  const departments = outletCtx.departments || localDepartments;
  const showSuccess = outletCtx.showSuccess || toastSuccess;
  const showError = outletCtx.showError || toastError;

  // Standalone confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    icon: '',
    loading: false,
    onConfirm: null,
  });

  const openConfirm = outletCtx.openConfirm || ((opts) => setConfirmDialog({ isOpen: true, loading: false, ...opts }));
  const closeConfirm = outletCtx.closeConfirm || (() => setConfirmDialog((d) => ({ ...d, isOpen: false, loading: false, onConfirm: null })));
  const setConfirmLoading = outletCtx.setConfirmLoading || ((v) => setConfirmDialog((d) => ({ ...d, loading: v })));

  const fetchStandaloneData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes, deptRes] = await Promise.all([
        staffAPI.list({ limit: 100 }),
        api.get('/roles'),
        api.get('/departments'),
      ]);
      const staffItems = staffRes.data?.items || staffRes.data?.staff || (Array.isArray(staffRes.data) ? staffRes.data : []);
      const roleItems = rolesRes.data?.data || (Array.isArray(rolesRes.data) ? rolesRes.data : []);
      const deptItems = deptRes.data?.data || (Array.isArray(deptRes.data) ? deptRes.data : []);
      setLocalStaffList(staffItems);
      setLocalRoles(roleItems);
      setLocalDepartments(deptItems);
    } catch (err) {
      showError(err.response?.data?.message || 'Error loading departmental staff data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchStaff = outletCtx.fetchStaff || fetchStandaloneData;
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (isStandalone) {
      fetchStandaloneData();
    } else if (outletCtx.fetchStaff && (!outletCtx.staffList || outletCtx.staffList.length === 0)) {
      outletCtx.fetchStaff();
    }
  }, [isStandalone, fetchStandaloneData, outletCtx.fetchStaff, outletCtx.staffList]);

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

  const handleUnlockStaff = (staffId, staffName) => {
    openConfirm({
      title: 'Unlock Account',
      message: `Unlock ${staffName}'s account? This will reset failed login attempts and restore workstation access.`,
      confirmLabel: 'Unlock',
      variant: 'success',
      icon: 'lock_open',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await staffAPI.unlock(staffId);
          showSuccess('Account unlocked successfully.');
          fetchStaff();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error unlocking account');
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
        {user?.isHod && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            marginBottom: '16px',
            background: 'var(--md-sys-color-surface-container-high, #e8edf4)',
            borderLeft: '4px solid var(--md-sys-color-primary, #00668b)',
            borderRadius: '8px',
            color: 'var(--md-sys-color-on-surface, #1b1c1e)',
            fontSize: '13px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary, #00668b)' }}>
              badge
            </span>
            <span>
              <strong>Department Staff Purview:</strong> {user?.department || 'Department'}. As Head of Department, you have delegated authority to recruit, promote, and manage staff accounts within your department.
            </span>
          </div>
        )}

        <div className="admin-dir-header">
          <div className="admin-dir-title-group">
            <h2 className="admin-dir-title">
              {user?.isHod 
                ? `${user.department} Staff`
                : (filters.statuses.includes('Active') && filters.statuses.length === 1 
                  ? 'Active Staff Directory' 
                  : filters.statuses.includes('Disabled') && filters.statuses.length === 1 
                  ? 'Disabled Staff Directory' 
                  : 'Staff Directory')}
            </h2>
            <span className="admin-dir-count-sub">
              {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''} shown
            </span>
          </div>

          <div className="admin-dir-controls">
            <Md3SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search staff by name..." 
            />

            {!user?.isHod && (
              <button 
                type="button"
                onClick={() => setIsStaffAnalyticsOpen(true)}
                className="admin-btn admin-btn-secondary"
                title="View Staff Analytics"
              >
                <span className="material-symbols-rounded">analytics</span>
                <span>Analytics</span>
              </button>
            )}

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
              type="button"
              onClick={() => { fetchStaff(); showSuccess('Staff records synchronized.'); }}
              disabled={loading}
              className="admin-btn admin-btn-tonal"
              title="Refresh Staff Records"
            >
              <span className="material-symbols-rounded">refresh</span>
              <span>Refresh</span>
            </button>

            <button 
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`admin-btn ${activeFiltersCount > 0 ? 'admin-btn-secondary' : 'admin-btn-tonal'}`}
              title="Filter Staff Directory"
            >
              <span className="material-symbols-rounded">tune</span>
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{
                  background: 'var(--md-sys-color-primary, #00668b)',
                  color: 'var(--md-sys-color-on-primary, #ffffff)',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 800
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCreateStaffOpen(true)}
              className="admin-btn admin-btn-primary"
              title="Add New Staff Member"
            >
              <span className="material-symbols-rounded">add</span>
              <span>Add Staff</span>
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
                onUnlock={(id, name) => handleUnlockStaff(id, name)}
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
                  onUnlock={(id, name) => handleUnlockStaff(id, name)}
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

      {isStandalone && (
        <Md3ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          variant={confirmDialog.variant}
          icon={confirmDialog.icon}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
};

export default AdminStaffManager;
