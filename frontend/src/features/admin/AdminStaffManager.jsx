import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { staffAPI } from '../../services/staffAPI';
import CreateStaffSheet from './CreateStaffSheet';
import StaffAnalyticsDialog from './StaffAnalyticsDialog';
import PositionProgressionDialog from './PositionProgressionDialog';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { StaffFilterSideSheet } from '../../components/md3/StaffFilterSideSheet';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { CURRENCY_SYMBOL } from '../../constants/currency';

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

  useEffect(() => {
    if (location.state?.statusFilter) {
      setFilters(prev => ({
        ...prev,
        statuses: [location.state.statusFilter]
      }));
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
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(s.status);
    const matchesDept = filters.departments.length === 0 || filters.departments.includes(s.departmentId?._id);
    const matchesPosition = filters.positions.length === 0 || filters.positions.includes(s.position);
    const matchesSearch = searchQuery.trim() === '' || 
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesDept && matchesPosition && matchesSearch;
  });

  const activeFiltersCount = 
    filters.statuses.length + 
    filters.roles.length + 
    filters.departments.length + 
    filters.positions.length;

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
            <button 
              onClick={() => setIsFilterOpen(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                background: activeFiltersCount > 0 ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)', 
                color: activeFiltersCount > 0 ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)', 
                border: 'none', 
                borderRadius: '100px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold',
                transition: 'background 200ms ease',
                height: '44px',
                position: 'relative',
                boxSizing: 'border-box'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>filter_list</span>
              Filters
              {activeFiltersCount > 0 && (
                <span style={{
                  background: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
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
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid" style={{ flex: 1, paddingBottom: '80px' }}>
            {filteredStaff.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)', gridColumn: '1 / -1', minHeight: '50vh', opacity: 0.8 }}>
                <Icon.Users style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5, color: 'var(--md-sys-color-on-surface-variant)' }} />
                <h3 style={{ margin: 0, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>No staff found</h3>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>There are no staff members matching the selected filters.</p>
              </div>
            ) : (
              filteredStaff.map(staff => (
                <div key={staff._id} className="md3-data-card">
                  <div className="md3-data-card-header">
                    <h3 className="md3-data-card-title">{staff.fullName}</h3>
                    <span className={`md3-status-chip ${staff.status === 'Active' ? 'md3-card-btn-primary' : 'md3-card-btn-error'}`}>
                      {staff.status}
                    </span>
                  </div>
                  <div className="md3-data-card-body">
                    <div className="md3-card-meta-list">
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Department</span>
                        <span className="md3-card-meta-value">{staff.departmentId?.name || '—'}</span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Role</span>
                        <span className="md3-status-chip md3-card-btn-secondary" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '11px', fontWeight: 600 }}>
                          {staff.roleId?.name || '—'}
                        </span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Position</span>
                        <span className="md3-status-chip md3-card-btn-primary" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '11px', fontWeight: 600 }}>
                          {staff.position || '—'}
                        </span>
                      </div>
                      {staff.medicalLicenseNumber && (
                        <div className="md3-card-meta-item">
                          <span className="md3-card-meta-label">Medical License</span>
                          <span className="md3-card-meta-value">{staff.medicalLicenseNumber}</span>
                        </div>
                      )}
                      {staff.consultingFee !== undefined && staff.consultingFee > 0 && (
                        <div className="md3-card-meta-item">
                          <span className="md3-card-meta-label">Consulting Fee</span>
                          <span className="md3-card-meta-value">{CURRENCY_SYMBOL}{staff.consultingFee}</span>
                        </div>
                      )}
                      {staff.nursingLicenseNumber && (
                        <div className="md3-card-meta-item">
                          <span className="md3-card-meta-label">Nursing License</span>
                          <span className="md3-card-meta-value">{staff.nursingLicenseNumber}</span>
                        </div>
                      )}
                      {staff.labCertificationCode && (
                        <div className="md3-card-meta-item">
                          <span className="md3-card-meta-label">Lab Certification</span>
                          <span className="md3-card-meta-value">{staff.labCertificationCode}</span>
                        </div>
                      )}
                      {staff.pharmacyLicenseNumber && (
                        <div className="md3-card-meta-item">
                          <span className="md3-card-meta-label">Pharmacy License</span>
                          <span className="md3-card-meta-value">{staff.pharmacyLicenseNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md3-data-card-actions">
                    <button
                      onClick={() => setEditingStaff(staff)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setProgressingStaff(staff)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Progression
                    </button>
                    {staff.status === 'Active' ? (
                      <button
                        onClick={() => handleDisableStaff(staff._id, staff.fullName)}
                        className="md3-card-btn md3-card-btn-error"
                        style={{ gridColumn: 'span 2' }}
                      >
                        Disable Account
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnableStaff(staff._id, staff.fullName)}
                        className="md3-card-btn md3-card-btn-primary"
                        style={{ gridColumn: 'span 2' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>check_circle</span>
                        Re-enable
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      
      <Md3Fab 
        icon={<Icon.Plus />} 
        label="Add User" 
        onClick={() => setIsCreateStaffOpen(true)} 
        style={{ position: 'fixed', bottom: '32px', right: '32px' }} 
      />

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
