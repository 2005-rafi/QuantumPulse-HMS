import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CommandCenterDetailDialog from './CommandCenterDetailDialog';

const AdminAnalytics = () => {
  const { stats, departments, staffList, roles, laboratories, recentAuditLogs } = useOutletContext();
  const navigate = useNavigate();
  const [activeDetailType, setActiveDetailType] = useState(null);

  return (
    <section className="analytics-section">
      <div className="analytics-header">
        <h2 className="analytics-title">Hospital Command Center</h2>
        <p className="analytics-subtitle">Real-time operational metrics and staffing breakdown</p>
      </div>

      {/* KPI Bento Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue clickable-card" onClick={() => setActiveDetailType('today_visits')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-blue">groups</span>
            <span className="kpi-label">Today's Visits</span>
          </div>
          <div className="kpi-value">{stats?.patientIn ?? 0}</div>
          <div className="kpi-footer">Total patients registered today (Click to view)</div>
        </div>

        <div className="kpi-card kpi-green clickable-card" onClick={() => setActiveDetailType('completed_visits')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="material-symbols-rounded icon-green">task_alt</span>
            <span className="kpi-label">Completed Visits</span>
          </div>
          <div className="kpi-value">{stats?.patientOut ?? 0}</div>
          <div className="kpi-footer">Patients treated and discharged (Click to view)</div>
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
        <h3 className="insights-card-title">Live Patient Flow Pipeline</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#e8f0fe', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #d2e3fc' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{stats?.waitingTriage ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>Triage Queue</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: '#dadce0', fontSize: '20px' }}>arrow_forward</span>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#fef7e0', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #feefc3' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f9ab00' }}>{stats?.waitingDoctor ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>Doctor Queue</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: '#dadce0', fontSize: '20px' }}>arrow_forward</span>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#e6f4ea', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ceead6' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#137333' }}>{stats?.inProgress ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>In Consultation</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: '#dadce0', fontSize: '20px' }}>arrow_forward</span>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#fce8e6', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fad2cf' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c5221f' }}>{stats?.pendingLab ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>Lab Diagnostics</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: '#dadce0', fontSize: '20px' }}>arrow_forward</span>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#eaf2f8', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #d4e6f1' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2980b9' }}>{stats?.pendingPharmacy ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>Pharmacy Queue</div>
          </div>
          
          <span className="material-symbols-rounded" style={{ color: '#dadce0', fontSize: '20px' }}>arrow_forward</span>
          
          <div style={{ flex: 1, minWidth: '120px', background: '#f5f5f5', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e0e8e4' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#616161' }}>{stats?.skipped ?? 0}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#5f6368', marginTop: '4px' }}>Skipped Calls</div>
          </div>
          
        </div>
      </div>

      {/* Split Insights Layout */}
      <div className="insights-row" style={{ marginTop: '20px' }}>
        {/* Column 1: Queue Throughput & Department lists */}
        <div className="insights-col-left">
          <div className="insights-card">
            <h3 className="insights-card-title">Queue Throughput Velocity</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Visit Fulfillment Rate</span>
                  <span className="velocity-value">
                    {stats?.patientIn > 0 ? Math.round((stats.patientOut / stats.patientIn) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-blue" 
                    style={{ width: `${stats?.patientIn > 0 ? (stats.patientOut / stats.patientIn) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Pending Lab Pressure</span>
                  <span className="velocity-value">
                    {stats?.patientIn > 0 ? Math.round((stats.pendingLab / stats.patientIn) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-orange" 
                    style={{ width: `${stats?.patientIn > 0 ? (stats.pendingLab / stats.patientIn) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="velocity-info">
                  <span className="velocity-label">Pending Pharmacy Pressure</span>
                  <span className="velocity-value">
                    {stats?.patientIn > 0 ? Math.round((stats.pendingPharmacy / stats.patientIn) * 100) : 0}%
                  </span>
                </div>
                <div className="velocity-progress-container">
                  <div 
                    className="velocity-progress-bar velocity-teal" 
                    style={{ width: `${stats?.patientIn > 0 ? (stats.pendingPharmacy / stats.patientIn) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="insights-card" style={{ marginTop: '16px' }}>
            <h3 className="insights-card-title">Department Topography & Active Loads</h3>
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="dept-stat-badge">
                <span className="badge-count count-clinical">
                  {departments.filter(d => d.type === 'CLINICAL').length}
                </span>
                <span className="badge-label">Clinical</span>
              </div>
              <div className="dept-stat-badge">
                <span className="badge-count count-diagnostic">
                  {departments.filter(d => d.type === 'DIAGNOSTIC').length}
                </span>
                <span className="badge-label">Diagnostic</span>
              </div>
              <div className="dept-stat-badge">
                <span className="badge-count" style={{ color: '#0277bd', background: '#e1f5fe' }}>
                  {departments.filter(d => d.type === 'CLINICAL/DIAGNOSTIC').length}
                </span>
                <span className="badge-label">Clin/Diag</span>
              </div>
              <div className="dept-stat-badge">
                <span className="badge-count count-support">
                  {departments.filter(d => d.type === 'SUPPORT' || !d.type).length}
                </span>
                <span className="badge-label">Support</span>
              </div>
            </div>
            
            <div className="dept-distribution-table" style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '16px' }}>
              {departments.map(d => {
                const staffCount = staffList.filter(s => s.departmentId?._id === d._id || s.departmentId === d._id).length;
                const activePatients = stats?.departmentLoads?.[d._id] || 0;
                return (
                  <div key={d._id} className="dept-distribution-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="dept-name" style={{ fontWeight: '600' }}>{d.name}</span>
                      <span style={{ fontSize: '11px', color: '#888' }}>
                        {staffCount} assigned staff
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activePatients > 0 && (
                        <span style={{ padding: '2px 8px', background: '#ffe0b2', color: '#e65100', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          {activePatients} active
                        </span>
                      )}
                      <span className={`dept-type-chip dept-type-${(d.type || 'CLINICAL').toLowerCase().replace('/', '-')}`}>
                        {d.type || 'CLINICAL'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Staff Load & Recent Activity Feed */}
        <div className="insights-col-right">
          <div className="insights-card">
            <h3 className="insights-card-title">Staff Load Allocation</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {roles.map(role => {
                const count = staffList.filter(s => s.roleId?.name === role.name || s.roleId === role._id).length;
                const maxCount = Math.max(...roles.map(r => staffList.filter(s => s.roleId?.name === r.name || s.roleId === r._id).length), 1);
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={role._id} className="staff-chart-row">
                    <span className="staff-role-label">{role.name}</span>
                    <div className="staff-bar-track">
                      <div 
                        className="staff-bar-fill" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="staff-role-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="insights-card" style={{ marginTop: '16px' }}>
            <h3 className="insights-card-title">Laboratory Queue Pressures</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {laboratories.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '10px' }}>No laboratories configured</div>
              ) : (
                laboratories.map(lab => {
                  const pendingTests = stats?.laboratoryPressures?.[lab._id] || 0;
                  return (
                    <div key={lab._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{lab.name}</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>{lab.description || 'No description'}</span>
                      </div>
                      <span style={{ 
                        padding: '2px 8px', 
                        background: pendingTests > 0 ? '#ffcdd2' : '#e8f5e9', 
                        color: pendingTests > 0 ? '#b71c1c' : '#2e7d32', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: '700' 
                      }}>
                        {pendingTests > 0 ? `${pendingTests} pending` : 'Idle'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="insights-card" style={{ marginTop: '16px' }}>
            <h3 className="insights-card-title">Live System Activity Feed</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentAuditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '13px' }}>
                  No recent system events.
                </div>
              ) : (
                recentAuditLogs.map(log => (
                  <div key={log._id} className="activity-feed-row">
                    <div className="activity-dot" />
                    <div className="activity-details">
                      <div className="activity-desc">
                        <span style={{ fontWeight: '600', color: '#333' }}>
                          {log.actorId?.fullName || log.actorId?.username || 'System'}
                        </span>{' '}
                        executed {log.action.replace(/_/g, ' ').toLowerCase()}
                      </div>
                      <div className="activity-meta">
                        <span>{log.actorRole}</span>
                        <span style={{ margin: '0 4px' }}>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
