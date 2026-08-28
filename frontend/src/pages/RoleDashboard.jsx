import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
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
            <h2>🚧 Stage 1 Complete</h2>
            <p>
              Authentication and authorization are fully operational. This placeholder will be
              replaced with functional screens in subsequent stages.
            </p>
            <div className="stage-badges">
              <span className="stage-badge done">Stage 0 — Foundation ✓</span>
              <span className="stage-badge done">Stage 1 — IAM / Auth ✓</span>
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
