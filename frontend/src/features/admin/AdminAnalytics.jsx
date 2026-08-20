import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CommandCenterDetailDialog from './CommandCenterDetailDialog';

const AdminAnalytics = () => {
  const { 
    stats, 
    lastUpdated, 
    isRefreshingStats, 
    fetchStats, 
    departments = [], 
    staffList = [], 
    roles = [], 
    laboratories = [], 
    recentAuditLogs = [] 
  } = useOutletContext();
  const navigate = useNavigate();
  const [activeDetailType, setActiveDetailType] = useState(null);

  // Department Topography filter & search state
  const [selectedDeptType, setSelectedDeptType] = useState('ALL');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Just now';
    return new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const totalRegisteredVisits = stats?.totalVisits || stats?.patientIn || 0;
  const totalCompletedVisits = stats?.totalCompleted || stats?.patientOut || 0;
  const totalStaffCount = staffList.length;

  // Icon mapping for clinical specialties
  const getDeptIcon = (dept) => {
    const name = (dept.name || '').toLowerCase();
    const type = (dept.type || '').toUpperCase();
    if (name.includes('cardio')) return 'cardiology';
    if (name.includes('radio') || name.includes('imaging') || name.includes('x-ray')) return 'radiology';
    if (name.includes('patho') || name.includes('hemat') || name.includes('lab')) return 'biotech';
    if (name.includes('pharm')) return 'medication';
    if (name.includes('pediatr') || name.includes('child')) return 'child_care';
    if (name.includes('ortho')) return 'orthopedics';
    if (name.includes('neuro') || name.includes('psych')) return 'psychiatry';
    if (name.includes('dental')) return 'dentistry';
    if (name.includes('eye') || name.includes('ophthal')) return 'visibility';
    if (name.includes('emergen') || name.includes('triage') || name.includes('icu')) return 'emergency';
    if (name.includes('admin')) return 'admin_panel_settings';
    if (type === 'DIAGNOSTIC') return 'biotech';
    if (type === 'SUPPORT') return 'support';
    return 'medical_services';
  };

  // Icon mapping for staff roles
  const getRoleIcon = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('doc') || r.includes('physician')) return 'stethoscope';
    if (r.includes('nurse')) return 'vital_signs';
    if (r.includes('lab')) return 'biotech';
    if (r.includes('pharm')) return 'medication';
    if (r.includes('recep')) return 'desk';
    if (r.includes('admin')) return 'admin_panel_settings';
    return 'badge';
  };

  // Color container mapping for roles
  const getRoleColorTheme = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('doc')) return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)', fill: 'var(--md-sys-color-primary)' };
    if (r.includes('nurse')) return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)', fill: 'var(--md-sys-color-secondary)' };
    if (r.includes('lab')) return { bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)', fill: 'var(--md-sys-color-tertiary)' };
    if (r.includes('pharm')) return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)', fill: 'var(--md-sys-color-secondary)' };
    if (r.includes('admin')) return { bg: 'var(--md-sys-color-surface-container-highest)', fg: 'var(--md-sys-color-on-surface-variant)', fill: 'var(--md-sys-color-primary)' };
    return { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)', fill: 'var(--md-sys-color-outline)' };
  };

  // Icon mapping for audit log actions
  const getAuditActionIcon = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('login') || a.includes('auth')) return { icon: 'lock_open', bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
    if (a.includes('patient') || a.includes('search')) return { icon: 'person_search', bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
    if (a.includes('consult') || a.includes('vitals') || a.includes('draft') || a.includes('finalize')) return { icon: 'clinical_notes', bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)' };
    if (a.includes('lab') || a.includes('specimen') || a.includes('order')) return { icon: 'biotech', bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)' };
    if (a.includes('bill') || a.includes('pharmacy') || a.includes('dispense')) return { icon: 'receipt_long', bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
    return { icon: 'history', bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)' };
  };

  // Helper for type styling class
  const getDeptTypeClass = (type) => {
    const t = (type || 'CLINICAL').toUpperCase();
    if (t === 'CLINICAL') return 'clinical';
    if (t === 'DIAGNOSTIC') return 'diagnostic';
    if (t === 'CLINICAL/DIAGNOSTIC') return 'clinical-diagnostic';
    return 'support';
  };

  // Counts by type
  const deptCounts = useMemo(() => {
    return {
      ALL: departments.length,
      CLINICAL: departments.filter(d => d.type === 'CLINICAL').length,
      DIAGNOSTIC: departments.filter(d => d.type === 'DIAGNOSTIC').length,
      'CLINICAL/DIAGNOSTIC': departments.filter(d => d.type === 'CLINICAL/DIAGNOSTIC').length,
      SUPPORT: departments.filter(d => d.type === 'SUPPORT' || !d.type || d.type === 'ADMINISTRATIVE').length,
    };
  }, [departments]);

  // Filtered department list
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      const matchesType = selectedDeptType === 'ALL' || (
        selectedDeptType === 'SUPPORT' 
          ? (d.type === 'SUPPORT' || !d.type || d.type === 'ADMINISTRATIVE')
          : d.type === selectedDeptType
      );

      if (!matchesType) return false;
      if (!deptSearchTerm.trim()) return true;

      const q = deptSearchTerm.toLowerCase();
      const name = (d.name || '').toLowerCase();
      const code = (d.code || '').toLowerCase();
      const hod = (d.headOfDepartment?.fullName || '').toLowerCase();
      const floor = (d.floor || '').toLowerCase();

      return name.includes(q) || code.includes(q) || hod.includes(q) || floor.includes(q);
    });
  }, [departments, selectedDeptType, deptSearchTerm]);

  return (
    <section className="analytics-section">
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="analytics-title">Hospital Command Center</h2>
          <p className="analytics-subtitle">Real-time operational metrics, live queue pipeline, and clinical workforce telemetry</p>
        </div>

        {/* Live System Telemetry & Refresh Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '999px', fontSize: '12px', color: 'var(--md-sys-color-on-surface)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--md-sys-color-primary)', display: 'inline-block', boxShadow: '0 0 8px var(--md-sys-color-primary)' }} />
            <span style={{ fontWeight: 600 }}>Live Telemetry</span>
            <span style={{ opacity: 0.7, marginLeft: '2px' }}>· Sync: {formatLastUpdated()}</span>
          </div>

          <button
            onClick={() => fetchStats && fetchStats(false)}
            disabled={isRefreshingStats}
            title="Refresh All Real-time Metrics"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', cursor: isRefreshingStats ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px color-mix(in srgb, var(--md-sys-color-primary) 25%, transparent)', transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)' }}
          >
            <span className={`material-symbols-rounded ${isRefreshingStats ? 'spin-animation' : ''}`} style={{ fontSize: '16px' }}>
              refresh
            </span>
            {isRefreshingStats ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue clickable-card" onClick={() => setActiveDetailType('today_visits')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-blue">groups</span>
            <span className="kpi-label">Today's Visits</span>
          </div>
          <div className="kpi-value">{stats?.patientIn ?? 0}</div>
          <div className="kpi-footer">
            {stats?.patientIn > 0 
              ? 'Total patients registered today (Click to view)' 
              : `Total All-Time: ${stats?.totalVisits || 0} (Click to view)`}
          </div>
        </div>

        <div className="kpi-card kpi-green clickable-card" onClick={() => setActiveDetailType('completed_visits')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-green">task_alt</span>
            <span className="kpi-label">Completed Visits</span>
          </div>
          <div className="kpi-value">{stats?.patientOut ?? stats?.totalCompleted ?? 0}</div>
          <div className="kpi-footer">
            {stats?.patientOut > 0 
              ? 'Patients discharged today (Click to view)' 
              : `Total Discharged: ${stats?.totalCompleted || 0} (Click to view)`}
          </div>
        </div>

        <div className="kpi-card kpi-orange clickable-card" onClick={() => setActiveDetailType('pending_lab')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-orange">biotech</span>
            <span className="kpi-label">Pending Lab Queue</span>
          </div>
          <div className="kpi-value">{stats?.pendingLab ?? 0}</div>
          <div className="kpi-footer">Specimens waiting for diagnostic runs (Click to view)</div>
        </div>

        <div className="kpi-card kpi-teal clickable-card" onClick={() => setActiveDetailType('pending_pharmacy')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-teal">prescriptions</span>
            <span className="kpi-label">Pending Pharmacy</span>
          </div>
          <div className="kpi-value">{stats?.pendingPharmacy ?? 0}</div>
          <div className="kpi-footer">Prescriptions waiting to be filled (Click to view)</div>
        </div>

        <div className="kpi-card kpi-purple clickable-card" onClick={() => navigate('/dashboard/administrator/staff', { state: { statusFilter: 'Active' } })} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-purple">badge</span>
            <span className="kpi-label">Active Staff</span>
          </div>
          <div className="kpi-value">{staffList.filter(s => s.status === 'Active').length}</div>
          <div className="kpi-footer">Active personnel in system (Click to view)</div>
        </div>

        <div className="kpi-card kpi-indigo clickable-card" onClick={() => navigate('/dashboard/administrator/staff', { state: { statusFilter: 'All' } })} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-indigo">groups</span>
            <span className="kpi-label">Total Staff</span>
          </div>
          <div className="kpi-value">{staffList.length}</div>
          <div className="kpi-footer">Total registered employee accounts (Click to view)</div>
        </div>

        <div className="kpi-card kpi-red clickable-card" onClick={() => navigate('/dashboard/administrator/staff', { state: { statusFilter: 'Disabled' } })} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-red">no_accounts</span>
            <span className="kpi-label">Disabled Accounts</span>
          </div>
          <div className="kpi-value">{staffList.filter(s => s.status !== 'Active').length}</div>
          <div className="kpi-footer">Disabled/inactive staff accounts (Click to view)</div>
        </div>

        <div className="kpi-card kpi-blue clickable-card" onClick={() => navigate('/dashboard/administrator/departments')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-blue">corporate_fare</span>
            <span className="kpi-label">Departments</span>
          </div>
          <div className="kpi-value">{departments.length}</div>
          <div className="kpi-footer">Configured clinical units (Click to view)</div>
        </div>

        <div className="kpi-card kpi-cyan clickable-card" onClick={() => navigate('/dashboard/administrator/laboratories')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-cyan">science</span>
            <span className="kpi-label">Laboratories</span>
          </div>
          <div className="kpi-value">{laboratories.length}</div>
          <div className="kpi-footer">Active diagnostic lab facilities (Click to view)</div>
        </div>
      </div>

      {/* Patient Flow Tracker */}
      <div className="insights-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="insights-card-title" style={{ margin: 0 }}>Live Patient Flow Pipeline</h3>
          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Click any queue stage to inspect patient ledger</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          
          {/* 1. Triage Queue */}
          <div 
            onClick={() => setActiveDetailType('triage_queue')}
            title="Click to view Triage Queue patients"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-primary-container)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-primary-container)' }}>{stats?.waitingTriage ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-primary-container)', marginTop: '4px' }}>Triage Queue</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-primary-container)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline-variant)', fontSize: '20px' }}>arrow_forward</span>
          
          {/* 2. Doctor Queue */}
          <div 
            onClick={() => setActiveDetailType('doctor_queue')}
            title="Click to view Doctor Queue patients"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-tertiary-container)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-tertiary-container)' }}>{stats?.waitingDoctor ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-tertiary-container)', marginTop: '4px' }}>Doctor Queue</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-tertiary-container)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline-variant)', fontSize: '20px' }}>arrow_forward</span>
          
          {/* 3. In Consultation */}
          <div 
            onClick={() => setActiveDetailType('in_consultation')}
            title="Click to view In-Consultation patients"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-secondary-container)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-secondary-container)' }}>{stats?.inProgress ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-secondary-container)', marginTop: '4px' }}>In Consultation</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline-variant)', fontSize: '20px' }}>arrow_forward</span>
          
          {/* 4. Lab Diagnostics */}
          <div 
            onClick={() => setActiveDetailType('pending_lab')}
            title="Click to view Pending Lab patients"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-error-container)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-error-container)' }}>{stats?.pendingLab ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-error-container)', marginTop: '4px' }}>Lab Diagnostics</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-error-container)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline-variant)', fontSize: '20px' }}>arrow_forward</span>
          
          {/* 5. Pharmacy Queue */}
          <div 
            onClick={() => setActiveDetailType('pending_pharmacy')}
            title="Click to view Pharmacy Queue patients"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-surface-container-high)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-primary)' }}>{stats?.pendingPharmacy ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>Pharmacy Queue</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline-variant)', fontSize: '20px' }}>arrow_forward</span>
          
          {/* 6. Skipped Calls */}
          <div 
            onClick={() => setActiveDetailType('skipped')}
            title="Click to view Skipped Calls"
            style={{ 
              flex: 1, minWidth: '120px', 
              background: 'var(--md-sys-color-surface-container)', 
              padding: '14px 12px', borderRadius: '14px', 
              textAlign: 'center', 
              border: '1px solid var(--md-sys-color-outline-variant)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)',
              transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px color-mix(in srgb, var(--md-sys-color-shadow, #000) 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow, #000) 4%, transparent)'; }}
          >
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--md-sys-color-on-surface-variant)' }}>{stats?.skipped ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>Skipped Calls</div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8, marginTop: '2px' }}>Click to view</div>
          </div>
          
        </div>
      </div>

      {/* Split Insights Layout */}
      <div className="insights-row" style={{ marginTop: '20px' }}>
        
        {/* Column 1: Queue Throughput & Clinical Department Topography */}
        <div className="insights-col-left">
          
          {/* Velocity Card */}
          <div className="insights-card">
            <h3 className="insights-card-title">Queue Throughput Velocity</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Visit Fulfillment Rate</span>
                  <span className="velocity-value">
                    {totalRegisteredVisits > 0 ? Math.round((totalCompletedVisits / totalRegisteredVisits) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-blue" 
                    style={{ width: `${totalRegisteredVisits > 0 ? Math.min(100, (totalCompletedVisits / totalRegisteredVisits) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Pending Lab Pressure</span>
                  <span className="velocity-value">
                    {totalRegisteredVisits > 0 ? Math.round(((stats?.pendingLab || 0) / totalRegisteredVisits) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-orange" 
                    style={{ width: `${totalRegisteredVisits > 0 ? Math.min(100, ((stats?.pendingLab || 0) / totalRegisteredVisits) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Pending Pharmacy Pressure</span>
                  <span className="velocity-value">
                    {totalRegisteredVisits > 0 ? Math.round(((stats?.pendingPharmacy || 0) / totalRegisteredVisits) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-teal" 
                    style={{ width: `${totalRegisteredVisits > 0 ? Math.min(100, ((stats?.pendingPharmacy || 0) / totalRegisteredVisits) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upgraded Department Topography & Active Loads Card */}
          <div className="insights-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <h3 className="insights-card-title" style={{ margin: 0 }}>Department Topography & Active Loads</h3>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Interactive facility topography and real-time clinical loads
                </span>
              </div>

              {/* Quick Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--md-sys-color-surface-container)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-on-surface-variant)' }}>search</span>
                <input 
                  type="text" 
                  placeholder="Search units..." 
                  value={deptSearchTerm} 
                  onChange={(e) => setDeptSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface)', fontSize: '12px', outline: 'none', width: '110px' }}
                />
                {deptSearchTerm && (
                  <button onClick={() => setDeptSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', padding: 0 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Material 3 Interactive Filter Chips */}
            <div className="dept-filter-chips-row">
              <button 
                className={`dept-filter-chip ${selectedDeptType === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedDeptType('ALL')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>domain</span>
                <span>All Units</span>
                <span className="chip-count">{deptCounts.ALL}</span>
              </button>

              <button 
                className={`dept-filter-chip ${selectedDeptType === 'CLINICAL' ? 'active' : ''}`}
                onClick={() => setSelectedDeptType('CLINICAL')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>stethoscope</span>
                <span>Clinical</span>
                <span className="chip-count">{deptCounts.CLINICAL}</span>
              </button>

              <button 
                className={`dept-filter-chip ${selectedDeptType === 'DIAGNOSTIC' ? 'active' : ''}`}
                onClick={() => setSelectedDeptType('DIAGNOSTIC')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>biotech</span>
                <span>Diagnostic</span>
                <span className="chip-count">{deptCounts.DIAGNOSTIC}</span>
              </button>

              <button 
                className={`dept-filter-chip ${selectedDeptType === 'CLINICAL/DIAGNOSTIC' ? 'active' : ''}`}
                onClick={() => setSelectedDeptType('CLINICAL/DIAGNOSTIC')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>sync_alt</span>
                <span>Clin/Diag</span>
                <span className="chip-count">{deptCounts['CLINICAL/DIAGNOSTIC']}</span>
              </button>

              <button 
                className={`dept-filter-chip ${selectedDeptType === 'SUPPORT' ? 'active' : ''}`}
                onClick={() => setSelectedDeptType('SUPPORT')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>support</span>
                <span>Support</span>
                <span className="chip-count">{deptCounts.SUPPORT}</span>
              </button>
            </div>
            
            {/* Department Rich Cards Container */}
            <div className="dept-distribution-table">
              {filteredDepartments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.5, marginBottom: '6px' }}>domain_disabled</span>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>No departments match the current filter.</div>
                </div>
              ) : (
                filteredDepartments.map(d => {
                  const staffCount = staffList.filter(s => s.departmentId?._id === d._id || s.departmentId === d._id).length;
                  const activePatients = stats?.departmentLoads?.[d._id] || 0;
                  const typeClass = getDeptTypeClass(d.type);
                  const iconName = getDeptIcon(d);
                  const hod = d.headOfDepartment;
                  const hodInitials = hod?.fullName
                    ? hod.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : null;

                  return (
                    <div 
                      key={d._id} 
                      className="dept-card-item"
                      onClick={() => {
                        if (activePatients > 0) {
                          setActiveDetailType('today_visits');
                        }
                      }}
                      style={{ cursor: activePatients > 0 ? 'pointer' : 'default' }}
                      title={activePatients > 0 ? `Click to view active queue for ${d.name}` : d.name}
                    >
                      {/* Top Row: Identity & Classification */}
                      <div className="dept-card-top">
                        <div className="dept-card-identity">
                          <div className={`dept-icon-box ${typeClass}`}>
                            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>{iconName}</span>
                          </div>

                          <div className="dept-title-group">
                            <div className="dept-main-name">{d.name}</div>
                            <div className="dept-meta-pills">
                              <span className="dept-code-pill">{d.code}</span>
                              {d.floor && (
                                <span className="dept-floor-pill">
                                  <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>stairs</span>
                                  {d.floor}
                                </span>
                              )}
                              <span className={`dept-type-chip dept-type-${typeClass}`}>
                                {d.type || 'CLINICAL'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Active Load Status Badge */}
                        <div className="dept-load-indicator">
                          {activePatients > 0 ? (
                            <span className={`dept-load-pill ${activePatients >= 4 ? 'heavy' : 'active'}`}>
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                                {activePatients >= 4 ? 'warning' : 'person_play'}
                              </span>
                              {activePatients} active {activePatients >= 4 ? '(High Load)' : 'waiting'}
                            </span>
                          ) : (
                            <span className="dept-load-pill idle">
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span>
                              Idle
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: HOD & Staffing Telemetry */}
                      <div className="dept-card-bottom">
                        <div className="dept-hod-info">
                          {hod?.fullName ? (
                            <>
                              <div className="dept-hod-avatar">{hodInitials}</div>
                              <span>HOD: <strong>{hod.fullName}</strong></span>
                            </>
                          ) : (
                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '13px', verticalAlign: 'text-bottom', marginRight: '2px' }}>person_outline</span>
                              No HOD assigned
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>badge</span>
                          <span style={{ fontWeight: 600 }}>{staffCount}</span> staff assigned
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Staff Load & Recent Activity Feed */}
        <div className="insights-col-right">
          
          {/* Upgraded Staff Load Allocation Card */}
          <div className="insights-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 className="insights-card-title">Staff Workforce Allocation</h3>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Active clinical & operational headcount distribution
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Total: {totalStaffCount}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roles.map(role => {
                const count = staffList.filter(s => s.roleId?.name === role.name || s.roleId === role._id).length;
                const percentage = totalStaffCount > 0 ? ((count / totalStaffCount) * 100).toFixed(1) : 0;
                const maxCount = Math.max(...roles.map(r => staffList.filter(s => s.roleId?.name === r.name || s.roleId === r._id).length), 1);
                const barFillWidth = Math.min(100, Math.round((count / maxCount) * 100));
                const theme = getRoleColorTheme(role.name);
                const icon = getRoleIcon(role.name);

                return (
                  <div 
                    key={role._id} 
                    className="staff-role-card"
                    onClick={() => navigate('/dashboard/administrator/staff', { state: { roleFilter: role.name } })}
                    title={`Click to view all ${role.name} staff members`}
                  >
                    <div className="staff-role-header">
                      <div className="staff-role-identity">
                        <div className="staff-role-icon-box" style={{ background: theme.bg, color: theme.fg }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{icon}</span>
                        </div>
                        <div>
                          <div className="staff-role-name">{role.name}</div>
                          <div className="staff-role-meta">{percentage}% of total workforce</div>
                        </div>
                      </div>

                      <div className="staff-role-count-chip">
                        {count} Active
                      </div>
                    </div>

                    <div className="staff-role-track">
                      <div 
                        className="staff-role-fill" 
                        style={{ width: `${barFillWidth}%`, background: theme.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgraded Laboratory Pressures Card */}
          <div className="insights-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 className="insights-card-title">Laboratory Diagnostic Loads</h3>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Diagnostic facility testing capacity & specimen queue
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {laboratories.length} Facilities
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
              {laboratories.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', padding: '24px' }}>
                  No laboratories configured
                </div>
              ) : (
                laboratories.map(lab => {
                  const pendingTests = stats?.laboratoryPressures?.[lab._id] || 0;
                  const isBusy = pendingTests > 0;

                  return (
                    <div 
                      key={lab._id} 
                      className="lab-pressure-card"
                      onClick={() => navigate('/dashboard/administrator/laboratories')}
                      title="Click to manage laboratory configurations"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: isBusy ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-tertiary-container)', color: isBusy ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>science</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)' }}>{lab.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {lab.description || 'Primary clinical diagnostic runs'}
                          </span>
                        </div>
                      </div>

                      <span style={{ 
                        padding: '4px 12px', 
                        background: isBusy ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)', 
                        color: isBusy ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-primary-container)', 
                        borderRadius: '999px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                          {isBusy ? 'pending_actions' : 'check_circle'}
                        </span>
                        {isBusy ? `${pendingTests} pending` : 'Ready'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upgraded Live System Activity Feed Card */}
          <div className="insights-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 className="insights-card-title">Live Clinical & Security Audit</h3>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Real-time operational event ledger across all roles
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                Real-Time
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentAuditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.5, marginBottom: '6px' }}>history_toggle_off</span>
                  <div>No recent system audit events logged.</div>
                </div>
              ) : (
                recentAuditLogs.map(log => {
                  const theme = getAuditActionIcon(log.action);
                  const actorName = log.actorId?.fullName || log.actorId?.username || 'System Administrator';
                  const initials = actorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <div key={log._id} className="audit-timeline-item">
                      <div className="audit-icon-box" style={{ background: theme.bg, color: theme.fg }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{theme.icon}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--md-sys-color-on-surface)' }}>
                              {actorName}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--md-sys-color-surface-container-highest)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                              {log.actorRole}
                            </span>
                          </div>

                          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="activity-desc">
                          performed <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--md-sys-color-primary)', background: 'var(--md-sys-color-surface-container-high)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{log.action.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/dashboard/administrator/audit')}
                style={{ background: 'transparent', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', padding: '6px 18px', color: 'var(--md-sys-color-primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 150ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span>View Full Audit Ledger</span>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <CommandCenterDetailDialog
        isOpen={!!activeDetailType}
        onClose={() => setActiveDetailType(null)}
        type={activeDetailType}
      />
    </section>
  );
};

export default AdminAnalytics;
