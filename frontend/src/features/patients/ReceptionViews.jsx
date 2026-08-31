import React from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import PatientList from './PatientList';
import PatientRegistrationForm from './PatientRegistrationForm';
import PatientProfile from './PatientProfile';
import AppointmentDashboard from '../appointments/AppointmentDashboard';
import PrintableVisitSlip from '../../components/PrintableVisitSlip';
import { Md3BottomSheet, Md3Fab, Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';

/**
 * ReceptionPatientsView — Handles Walk-in & Patient directory, profile view,
 * visit slip printing, and patient registration sheet.
 */
export const ReceptionPatientsView = () => {
  const {
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  } = useOutletContext();

  return (
    <>
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
          <PatientProfile
            patientId={selectedPatient._id || selectedPatient.id}
            onBack={() => handlePatientSelect(null)}
            onVisitCreated={handleVisitCreated}
          />
        </div>
      )}

      {viewKey === 'list' && (
        <div key="patients-list" className="reception-view">
          <PatientList
            onSelectPatient={handlePatientSelect}
            onRegisterPatient={() => setIsRegSheetOpen(true)}
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
    </>
  );
};

/**
 * ReceptionAppointmentsView — Handles Reception appointment scheduling & token operations.
 */
export const ReceptionAppointmentsView = () => {
  const { user, handleVisitCreated } = useOutletContext();

  return (
    <div key="appointments-dashboard" className="reception-view">
      <AppointmentDashboard
        user={user}
        onVisitCreated={handleVisitCreated}
      />
    </div>
  );
};
