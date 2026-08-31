import React, { useState, useMemo } from 'react';
import { Md3BottomSheet, Md3TextField } from '../../components/md3/Md3FormComponents';

const StaffAnalyticsDialog = ({ isOpen, onClose, staffList = [], departments = [], roles = [] }) => {
  const [deptSearch, setDeptSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Aggregate data
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.status === 'Active').length;
  const disabledStaff = totalStaff - activeStaff;

  // Department aggregates
  const departmentStats = useMemo(() => {
    return departments.map(dept => {
      const deptStaff = staffList.filter(s => s.departmentId?._id === dept._id || s.departmentId === dept._id);
      const total = deptStaff.length;
      const active = deptStaff.filter(s => s.status === 'Active').length;
      const disabled = total - active;
      return {
        _id: dept._id,
        name: dept.name,
        code: dept.code || '',
        type: dept.type || 'CLINICAL',
        total,
        active,
        disabled
      };
    }).sort((a, b) => b.total - a.total); // Sort by total staff descending
  }, [departments, staffList]);

  // Filtered department list
  const filteredDepartments = useMemo(() => {
    return departmentStats.filter(dept => {
      if (typeFilter !== 'ALL' && dept.type !== typeFilter) {
        return false;
      }
      if (deptSearch.trim()) {
        const q = deptSearch.toLowerCase();
        return dept.name.toLowerCase().includes(q) || dept.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [departmentStats, typeFilter, deptSearch]);

  // Role aggregates
  const roleStats = useMemo(() => {
    return roles.map(role => {
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
  }, [roles, staffList]);

  const deptTypeCounts = useMemo(() => {
    const counts = { ALL: departmentStats.length, CLINICAL: 0, DIAGNOSTIC: 0, SUPPORT: 0, ADMINISTRATIVE: 0 };
    departmentStats.forEach(d => {
      if (counts[d.type] !== undefined) counts[d.type]++;
    });
    return counts;
  }, [departmentStats]);

  return (
    <Md3BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Directory Analytics"
      subtitle="Overview of hospital staffing levels, active departments, and role distribution"
      className="staff-analytics-sheet"
      initialHeightVh={90}
      maxHeightVh={96}
    >
      <div 
        style={{ 
          padding: '24px 28px 48px 28px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '28px', 
          overflowY: 'auto',
          scrollbarGutter: 'stable',
          flex: 1
        }}
      >
        
        {/* KPI Aggregates Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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

        {/* Role Breakdowns */}
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

        {/* Department Breakdowns (Expanded Vertical Boundary & Responsive Multi-Column Grid) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--md-sys-color-primary)', fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Department staffing ({departmentStats.length} units)
            </h4>

            {/* Quick Search */}
            <div style={{ width: '260px' }}>
              <Md3TextField
                placeholder="Search department..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Department Classification Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              { id: 'ALL', label: `All (${deptTypeCounts.ALL})` },
              { id: 'CLINICAL', label: `Clinical (${deptTypeCounts.CLINICAL})` },
              { id: 'DIAGNOSTIC', label: `Diagnostic (${deptTypeCounts.DIAGNOSTIC})` },
              { id: 'SUPPORT', label: `Support (${deptTypeCounts.SUPPORT})` },
              { id: 'ADMINISTRATIVE', label: `Administrative (${deptTypeCounts.ADMINISTRATIVE})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  backgroundColor: typeFilter === tab.id ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                  color: typeFilter === tab.id ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fully Expanded, Naturally Scrollable 2-Column Responsive Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
              gap: '12px',
            }}
          >
            {filteredDepartments.map(dept => {
              const deptTotal = Math.max(dept.total, 1);
              return (
                <div key={dept._id} className="dept-stat-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        className="dept-bullet" 
                        style={{ 
                          background: dept.type === 'DIAGNOSTIC' 
                            ? 'var(--md-sys-color-tertiary)' 
                            : dept.type === 'SUPPORT'
                            ? '#ff9800'
                            : dept.type === 'ADMINISTRATIVE'
                            ? '#9c27b0'
                            : 'var(--md-sys-color-primary)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          flexShrink: 0
                        }} 
                      />
                      <strong style={{ fontSize: '0.875rem', color: 'var(--md-sys-color-on-surface)' }}>
                        {dept.name}
                      </strong>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.8125rem', 
                        fontWeight: '700', 
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: dept.total > 0 ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
                        color: dept.total > 0 ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-outline)' 
                      }}
                    >
                      {dept.active} active / {dept.total} total
                    </span>
                  </div>

                  <div style={{ height: '8px', background: 'var(--md-sys-color-surface-container-highest)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div 
                      style={{ 
                        width: `${(dept.active / deptTotal) * 100}%`, 
                        background: 'var(--md-sys-color-primary)', 
                        height: '100%', 
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                    <div 
                      style={{ 
                        width: `${(dept.disabled / deptTotal) * 100}%`, 
                        background: 'var(--md-sys-color-error)', 
                        height: '100%', 
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDepartments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
              No departments match the selected filter.
            </div>
          )}
        </div>

      </div>
    </Md3BottomSheet>
  );
};

export default StaffAnalyticsDialog;
