import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useReceptionDashboard } from '../hooks/useReceptionDashboard';
import PatientList from '../features/patients/PatientList';
import PatientRegistrationForm from '../features/patients/PatientRegistrationForm';
import PatientProfile from '../features/patients/PatientProfile';
import PrintableVisitSlip from '../components/PrintableVisitSlip';
import { Md3BottomSheet, Md3Fab, Md3Button } from '../components/md3/Md3FormComponents';
import { Icon } from '../components/md3/Md3Widgets';
import CommonHeader from '../components/shell/CommonHeader';
import DashboardStatsBar from '../components/dashboard/DashboardStatsBar';
import './ReceptionDashboard.css';

/**
 * ReceptionDashboard — Pure Presentation Component
 *
 * SOLID:
 *   SRP  — This component renders UI only. All logic lives in useReceptionDashboard hook.
 *   OCP  — Add features by extending the hook, not modifying this file.
 *   DIP  — Depends on useReceptionDashboard abstraction, not raw API calls.
 *   LSP  — All sub-components honor their prop contracts.
 *   ISP  — Props are minimal and purposeful.
 */
const ReceptionDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

  const {
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    totalPatients,
    todaysVisits,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  } = useReceptionDashboard();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const stats = [
    {
      icon: <Icon.Users />,
      label: 'Registered Patients',
      value: totalPatients > 0 ? totalPatients.toLocaleString() : '—',
      variant: 'secondary',
    },
    {
      icon: <Icon.History />,
      label: "Today's Visits",
      value: todaysVisits > 0 ? String(todaysVisits) : '0',
      variant: 'tertiary',
    },
    {
      icon: <Icon.Activity />,
      label: 'Active Module',
      value: 'Reception',
      variant: 'default',
    },
  ];

  return (
    <div className="reception-page">

      {/* ─── TOP APP BAR ─── */}
      <CommonHeader
        brandTitle={config?.SHORT_NAME || 'HMS'}
        brandSubtitle="Clinical Reception"
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── STATS BAR ─── */}
      <DashboardStatsBar stats={stats} showToday />

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="reception-main">

        {viewKey === 'print' && (
          <div key="print" className="reception-view reception-print-container">
            <div className="reception-print-header">
              <div className="reception-print-success-label">
                <div className="reception-print-success-icon" aria-hidden="true">
                  <Icon.Activity />
                </div>
                <div>
                  <h2 className="reception-print-title">Visit Slip Generated</h2>
                  <p className="reception-print-subtitle">
                    Patient registered &amp; OPD ticket created successfully
                  </p>
                </div>
              </div>
              <Md3Button
                variant="secondary"
                onClick={handlePrintDone}
                style={{ width: 'auto', minWidth: '160px' }}
              >
                Done &amp; Return to List
              </Md3Button>
            </div>
            <PrintableVisitSlip patient={printData.patient} visit={printData.visit} />
          </div>
        )}

        {viewKey === 'profile' && (
          <div key="profile" className="reception-view">
            <div className="profile-view-header">
              <button
                type="button"
                className="profile-view-back-btn"
                onClick={() => handlePatientSelect(null)}
                aria-label="Back to patient directory"
              >
                <Icon.ChevronLeft />
                <span>Back</span>
              </button>
              <nav className="profile-view-breadcrumb" aria-label="Breadcrumb">
                <span>Patient Directory</span>
                <span className="profile-view-breadcrumb-sep">›</span>
                <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 600 }}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
              </nav>
            </div>
            <PatientProfile
              patientId={selectedPatient._id || selectedPatient.id}
              onBack={() => handlePatientSelect(null)}
              onVisitCreated={handleVisitCreated}
            />
          </div>
        )}

        {viewKey === 'list' && (
          <div key="list" className="reception-view">
            <PatientList
              onSelectPatient={handlePatientSelect}
            />
          </div>
        )}

      </main>

      {/* ─── FAB: Register Patient ─── */}
      {viewKey !== 'print' && (
        <div className="reception-fab-dock">
          <Md3Fab
            icon={<Icon.Plus />}
            label="Register Patient"
            onClick={() => setIsRegSheetOpen(true)}
            ariaLabel="Register New Patient"
          />
        </div>
      )}

      {/* ─── BOTTOM SHEET: Registration Form ─── */}
      <Md3BottomSheet
        isOpen={isRegSheetOpen}
        onClose={() => setIsRegSheetOpen(false)}
        title="Register New Patient"
        subtitle="Complete the form to register patient & create OPD visit ticket"
      >
        <PatientRegistrationForm
          onSuccess={handleVisitCreated}
          onCancel={() => setIsRegSheetOpen(false)}
        />
      </Md3BottomSheet>
    </div>
  );
};

export default ReceptionDashboard;
