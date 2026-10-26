import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import CommonHeader from '../components/shell/CommonHeader';
import './Dashboard.css';

const ROLE_CONFIG = {
  Reception: {
    color: '#1565c0',
    bg: '#e3f2fd',
    icon: 'local_hospital',
    label: 'Reception',
    description: 'Patient registration, visit creation, and billing management.',
    capabilities: [
      'Register new patients',
      'Create and manage visits',
      'View patient queue',
      'Generate and process bills',
      'Record payments',
    ],
  },
  'OPD Nurse': {
    color: '#558b2f',
    bg: '#f1f8e9',
    icon: 'vital_signs',
    label: 'OPD Nurse',
    description: 'Outpatient triage, initial vitals recording, queue prioritization, and consultation prep.',
    capabilities: [
      'Record outpatient vitals and NEWS2',
      'Conduct queue triage & observations',
      'View doctor consultation queue',
      'Check in patient appointments',
    ],
  },
  'IPD Nurse': {
    color: '#2e7d32',
    bg: '#e8f5e9',
    icon: 'hotel',
    label: 'IPD Nurse',
    description: 'Inpatient ward station — vitals, e-MAR drug administration, fluid I/O, care plans, and handovers.',
    capabilities: [
      'Administer e-MAR inpatient medications',
      'Log fluid intake & output balance',
      'Conduct SBAR shift handovers',
      'Maintain nursing care plans',
      'Monitor bed status & turnaround',
    ],
  },
  'Lab Nurse': {
    color: '#00838f',
    bg: '#e0f7fa',
    icon: 'biotech',
    label: 'Lab Nurse',
    description: 'Diagnostic specimen collection, phlebotomy, running lab tests & diagnostics, entering results.',
    capabilities: [
      'Collect blood and laboratory specimens',
      'Process diagnostic orders and assays',
      'Record lab findings and numerical values',
      'Verify and sign off laboratory reports',
    ],
  },
  Nurse: {
    color: '#558b2f',
    bg: '#f1f8e9',
    icon: 'vital_signs',
    label: 'Nurse',
    description: 'Record patient vitals, observations, and open doctor consultations.',
    capabilities: [
      'Record vitals and assessments',
      'View patient visit details',
      'Open doctor consultation notes',
      'View chief complaints',
    ],
  },
  Doctor: {
    color: '#6a1b9a',
    bg: '#f3e5f5',
    icon: 'stethoscope',
    label: 'Doctor',
    description: 'Full clinical workflow — diagnose, prescribe, order investigations.',
    capabilities: [
      'View full patient history',
      'Write and finalize consultation notes',
      'Create prescriptions',
      'Order laboratory investigations',
      'Submit amendments to finalized notes',
    ],
  },
  Laboratory: {
    color: '#e65100',
    bg: '#fff3e0',
    icon: 'biotech',
    label: 'Laboratory',
    description: 'Process lab orders — collect samples, run tests, verify results.',
    capabilities: [
      'View assigned lab orders',
      'Record sample collection',
      'Upload test results',
      'Verify and finalize reports',
    ],
  },
  Pharmacy: {
    color: '#00695c',
    bg: '#e0f2f1',
    icon: 'medication',
    label: 'Pharmacy',
    description: 'Dispense medicines against finalized prescriptions.',
    capabilities: [
      'View pending prescriptions',
      'Dispense prescription items',
      'Record partial dispensing',
      'View dispensing history',
    ],
  },
  Administrator: {
    color: '#bf360c',
    bg: '#fbe9e7',
    icon: 'admin_panel_settings',
    label: 'Administrator',
    description: 'Full system administration — users, roles, permissions, audit logs.',
    capabilities: [
      'Create and manage staff records',
      'Manage login accounts',
      'Assign roles and permissions',
      'View audit logs',
      'Approve deletion requests',
      'System configuration',
    ],
  },
};

const RoleDashboard = ({ role }) => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.Reception;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-page">
      <CommonHeader 
        brandTitle={`${config.SHORT_NAME} Portal`}
        user={user}
        onLogout={handleLogout}
      />

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <span className="material-symbols-rounded role-icon">{roleConfig.icon}</span>
          <div>
            <h1 className="dashboard-title">Welcome, {user?.fullName?.split(' ')[0]}!</h1>
            <p className="dashboard-role-label">{roleConfig.label} Dashboard</p>
          </div>
        </div>

        <div className="dashboard-cards">
          <div className="info-card" style={{ borderLeftColor: roleConfig.color }}>
            <h2>Your Role</h2>
            <p>{roleConfig.description}</p>
            <div className="capability-list">
              {roleConfig.capabilities.map((cap) => (
                <div key={cap} className="capability-item">
                  <span className="material-symbols-rounded cap-check" style={{ fontSize: '16px', color: roleConfig.color }}>check</span>
                  {cap}
                </div>
              ))}
            </div>
          </div>

          <div className="info-card">
            <h2>Account Details</h2>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-key">Employee ID</span>
                <span className="detail-val">{user?.employeeId || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Role</span>
                <span className="detail-val detail-badge" style={{ background: roleConfig.bg, color: roleConfig.color }}>
                  {user?.role}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Department</span>
                <span className="detail-val">{user?.department}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Permissions</span>
                <span className="detail-val">{user?.permissions?.length || 0} granted</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Status</span>
                <span className="detail-val" style={{ color: '#0e6b5c', fontWeight: 600 }}>
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="info-card placeholder-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary, #00668b)' }}>construction</span>
              <span>Stage 1 Complete</span>
            </h2>
            <p>
              Authentication and authorization are fully operational. This placeholder will be
              replaced with functional screens in subsequent stages.
            </p>
            <div className="stage-badges">
              <span className="stage-badge done" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Stage 0 — Foundation</span>
                <span className="material-symbols-rounded" style={{ fontSize: 13 }}>check</span>
              </span>
              <span className="stage-badge done" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Stage 1 — IAM / Auth</span>
                <span className="material-symbols-rounded" style={{ fontSize: 13 }}>check</span>
              </span>
              <span className="stage-badge pending">Stage 2 — Patients</span>
              <span className="stage-badge pending">Stage 3 — Visits</span>
              <span className="stage-badge pending">Stage 4 — Nursing</span>
              <span className="stage-badge pending">Stage 5 — Doctor Notes</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoleDashboard;
