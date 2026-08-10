import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTriageQueue } from '../hooks/useTriageQueue';
import TriageQueue from '../features/nurse/TriageQueue';
import PatientTriageSheet from '../features/nurse/PatientTriageSheet';
import { Icon } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import DashboardStatsBar from '../components/dashboard/DashboardStatsBar';
import './NurseDashboard.css';

/**
 * NurseDashboard — Pure Presentation Component
 *
 * SOLID:
 *   SRP  — This component renders UI only. All logic lives in useTriageQueue hook.
 *   OCP  — Extend features via the hook, not by modifying this component.
 *   DIP  — Depends on useTriageQueue abstraction, not raw visitAPI calls.
 */
const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    queue,
    loadingQueue,
    selectedVisit,
    department,
    triagedToday,
    fetchQueue,
    handleSelect,
    handleTriageComplete,
    handleTriageCancel,
    deptName,
  } = useTriageQueue();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const stats = [
    {
      icon: <Icon.Stethoscope />,
      label: 'Waiting for Triage',
      value: queue.length >= 0 ? String(queue.length) : '—',
      variant: 'tertiary',
    },
    {
      icon: <Icon.Users />,
      label: 'Sent to Doctor',
      value: String(triagedToday),
      variant: 'secondary',
    },
    {
      icon: <Icon.Hospital />,
      label: 'Department',
      value: deptName,
      variant: 'default',
    },
  ];

  return (
    <div className="nurse-page">

      {/* ─── TOP APP BAR ─── */}
      <CommonHeader
        brandTitle={`Triage Station · ${deptName}`}
        brandSubtitle="Nursing Assessment · Route to Doctor"
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── STATS BAR ─── */}
      <DashboardStatsBar stats={stats} showToday />

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="nurse-main">
        <div className="nurse-layout">

          <section className="nurse-col nurse-col--queue" aria-label="Waiting triage queue">
            <TriageQueue
              visits={queue}
              selectedVisitId={selectedVisit?._id || selectedVisit?.id || null}
              onSelectVisit={handleSelect}
              onRefresh={fetchQueue}
              loading={loadingQueue}
            />
          </section>

          <section className="nurse-col nurse-col--sheet" aria-label="Patient triage assessment sheet">
            <PatientTriageSheet
              visit={selectedVisit}
              department={department}
              onComplete={handleTriageComplete}
              onCancel={handleTriageCancel}
            />
          </section>

        </div>
      </main>
    </div>
  );
};

export default NurseDashboard;
