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
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
        
        {/* KPI Aggregates Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

        {/* Department Breakdowns (Scale-friendly scrollable container) */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: '#1a3b5c', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Department staffing ({departments.length} units)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
            {departmentStats.map(dept => {
              const maxTotal = Math.max(...departmentStats.map(d => d.total), 1);
              return (
                <div key={dept._id} className="dept-stat-row">
                  <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="dept-bullet" style={{ background: dept.type === 'DIAGNOSTIC' ? '#e65100' : '#1565c0' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{dept.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#555' }}>
                      {dept.active} active / {dept.total} total
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(dept.active / maxTotal) * 100}%`, background: '#2e7d32', height: '100%' }} />
                    <div style={{ width: `${(dept.disabled / maxTotal) * 100}%`, background: '#c62828', height: '100%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Breakdowns */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: '#1a3b5c', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

      </div>
    </Md3BottomSheet>
  );
};

export default StaffAnalyticsDialog;
