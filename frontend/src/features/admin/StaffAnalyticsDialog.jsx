import React from 'react';
import { Md3BottomSheet } from '../../components/md3/Md3FormComponents';

const StaffAnalyticsDialog = ({ isOpen, onClose, staffList = [], departments = [], roles = [] }) => {
  // Aggregate data
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.status === 'Active').length;
  const disabledStaff = totalStaff - activeStaff;

  // Department aggregates
  const departmentStats = departments.map(dept => {
    const deptStaff = staffList.filter(s => s.departmentId?._id === dept._id || s.departmentId === dept._id);
    const total = deptStaff.length;
    const active = deptStaff.filter(s => s.status === 'Active').length;
    const disabled = total - active;
    return {
      _id: dept._id,
      name: dept.name,
      type: dept.type || 'CLINICAL',
      total,
      active,
      disabled
    };
  }).sort((a, b) => b.total - a.total); // Sort by total staff descending

  // Role aggregates
  const roleStats = roles.map(role => {
    const roleStaff = staffList.filter(s => s.roleId?._id === role._id || s.roleId === role._id || s.roleId?.name === role.name);
    const total = roleStaff.length;
    const active = roleStaff.filter(s => s.status === 'Active').length;
    const disabled = total - active;
    return {
      _id: role._id,
      name: role.name,
      total,
      active,
      disabled
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <Md3BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Directory Analytics"
      subtitle="Overview of hospital staffing levels, active departments, and role distribution"
      className="staff-analytics-sheet"
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
        
        {/* KPI Aggregates Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="staff-stat-chip chip-total">
            <span className="material-symbols-rounded">groups</span>
            <div className="stat-text-group">
              <span className="stat-val">{totalStaff}</span>
              <span className="stat-lbl">Total Staff</span>
            </div>
          </div>
          
          <div className="staff-stat-chip chip-active">
            <span className="material-symbols-rounded">person_play</span>
            <div className="stat-text-group">
              <span className="stat-val">{activeStaff}</span>
              <span className="stat-lbl">Active Accounts</span>
            </div>
          </div>
          
          <div className="staff-stat-chip chip-disabled">
            <span className="material-symbols-rounded">person_off</span>
            <div className="stat-text-group">
              <span className="stat-val">{disabledStaff}</span>
              <span className="stat-lbl">Disabled Accounts</span>
            </div>
          </div>
        </div>

        {/* Role Breakdowns (Moved above Department Staffing) */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--md-sys-color-primary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Role allocation
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {roleStats.map(role => (
              <div key={role._id} className="role-stat-badge">
                <span className="role-badge-name">{role.name}</span>
                <span className="role-badge-count">{role.total}</span>
                {role.disabled > 0 && (
                  <span className="role-badge-disabled-flag">({role.disabled} disabled)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Department Breakdowns (Scale-friendly scrollable container) */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--md-sys-color-primary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Department staffing ({departments.length} units)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
            {departmentStats.map(dept => {
              const deptTotal = Math.max(dept.total, 1);
              return (
                <div key={dept._id} className="dept-stat-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        className="dept-bullet" 
                        style={{ 
                          background: dept.type === 'DIAGNOSTIC' ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-primary)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%'
                        }} 
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>{dept.name}</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {dept.active} active / {dept.total} total
                    </span>
                  </div>
                  <div style={{ height: '10px', background: 'var(--md-sys-color-surface-container-highest)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(dept.active / deptTotal) * 100}%`, background: 'var(--md-sys-color-primary)', height: '100%', borderRadius: '9999px' }} />
                    <div style={{ width: `${(dept.disabled / deptTotal) * 100}%`, background: 'var(--md-sys-color-error)', height: '100%', borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Md3BottomSheet>
  );
};

export default StaffAnalyticsDialog;
