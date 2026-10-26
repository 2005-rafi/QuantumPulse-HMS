import React, { useState } from 'react';
import { useOutletContext, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import PatientList from '../patients/PatientList';
import PatientProfile from '../patients/PatientProfile';
import PatientRegistrationForm from '../patients/PatientRegistrationForm';
import AdminDeletedPatientsView from './AdminDeletedPatientsView';
import { Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { patientAPI } from '../../services/patientAPI';

const AdminPatientManager = () => {
  const { openConfirm, closeConfirm, setConfirmLoading } = useOutletContext();
  const { showSuccess, showError, showWarning } = useToast();
  const { patientId: routePatientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const activePatientId = routePatientId || searchParams.get('patientId') || selectedPatientId;

  const [isRegOpen, setIsRegOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'deleted'

  const handleRequestDeletion = () => {
    window._deletionReasonText = '';
    openConfirm({
      title: 'Request Patient Deletion',
      message: 'Please provide a clinical reason for this deletion request. This will be sent to doctors for approval.',
      confirmLabel: 'Submit Request',
      cancelLabel: 'Cancel',
      variant: 'warning',
      icon: 'person_remove',
      children: (
        <div style={{ marginTop: '16px', width: '100%' }}>
          <input
            type="text"
            placeholder="Clinical reason (e.g. entered in error)"
            className="md3-field-input"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
              outline: 'none',
              boxSizing: 'border-box',
              background: 'var(--md-sys-color-surface, #ffffff)',
              color: 'var(--md-sys-color-on-surface, #1c1c14)',
              fontSize: '14px',
            }}
            onChange={(e) => {
              window._deletionReasonText = e.target.value;
            }}
            autoFocus
          />
        </div>
      ),
      onConfirm: async () => {
        const reason = (window._deletionReasonText || '').trim();
        if (!reason) {
          showError('Please provide a reason before submitting.');
          return;
        }
        setConfirmLoading(true);
        try {
          await patientAPI.requestDeletion(activePatientId, reason);
          showSuccess('Deletion Request Submitted', 'Sent to clinicians for review and sign-off.');
          window._deletionReasonText = '';
          setRefreshKey((k) => k + 1);
          closeConfirm();
        } catch (err) {
          const status = err.response?.status;
          const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to submit deletion request.';
          if (status === 409) {
            showWarning('Request Already Pending', msg);
          } else {
            showError('Request Submission Failed', msg);
          }
          setRefreshKey((k) => k + 1);
          closeConfirm();
        }
      },
    });
  };

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {activePatientId ? (
        <div style={{ position: 'relative', width: '100%' }}>
          <PatientProfile
            key={`${activePatientId}-${refreshKey}`}
            patientId={activePatientId}
            onBack={() => {
              setSelectedPatientId(null);
              navigate('/dashboard/administrator/patients');
            }}
            headerActions={(patient) => {
              const isPending = Boolean(patient?.hasPendingDeletion || patient?.pendingDeletionRequest);
              if (isPending) {
                return (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 14px',
                      borderRadius: '16px',
                      background: 'var(--md-sys-color-surface-container-highest, #e6e1d6)',
                      border: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
                      color: 'var(--md-sys-color-on-surface-variant, #48473a)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                    }}
                    title="A patient deletion request is currently waiting for doctor sign-off"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#e65100' }}>pending_actions</span>
                    <span>Deletion Pending Doctor Sign-off</span>
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  className="md3-btn-danger-action"
                  onClick={handleRequestDeletion}
                  title="Request Patient Deletion (Requires Doctor Sign-off)"
                >
                  <span className="material-symbols-rounded">person_remove</span>
                  <span>Request Patient Deletion</span>
                </button>
              );
            }}
          />
        </div>
      ) : (
        <>
          {/* Top Tab Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
              paddingBottom: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: activeTab === 'active' ? 700 : 500,
                background: activeTab === 'active' ? 'var(--md-sys-color-primary, #446747)' : 'transparent',
                color: activeTab === 'active' ? '#ffffff' : 'var(--md-sys-color-on-surface-variant, #48473a)',
                transition: 'all 0.2s ease',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>groups</span>
              <span>Active Directory</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deleted')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: activeTab === 'deleted' ? 700 : 500,
                background: activeTab === 'deleted' ? 'var(--md-sys-color-error, #ba1a1a)' : 'transparent',
                color: activeTab === 'deleted' ? '#ffffff' : 'var(--md-sys-color-on-surface-variant, #48473a)',
                transition: 'all 0.2s ease',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>archive</span>
              <span>Archived / Deleted Patients</span>
            </button>
          </div>

          {activeTab === 'active' ? (
            <PatientList
              key={refreshKey}
              onSelectPatient={(p) => setSelectedPatientId(p._id)}
              onRegisterPatient={() => setIsRegOpen(true)}
            />
          ) : (
            <AdminDeletedPatientsView
              openConfirm={openConfirm}
              closeConfirm={closeConfirm}
              setConfirmLoading={setConfirmLoading}
              showSuccess={showSuccess}
              showError={showError}
              onRestoreSuccess={() => setRefreshKey((k) => k + 1)}
            />
          )}
        </>
      )}

      {/* Registration Bottom Sheet */}
      <Md3BottomSheet
        isOpen={isRegOpen}
        onClose={() => setIsRegOpen(false)}
        title="Register New Patient & Encounter"
        subtitle="Complete the form to register patient, inherit central tariffs & admit to IPD or OPD"
      >
        <PatientRegistrationForm
          onSuccess={() => {
            setIsRegOpen(false);
            showSuccess('Patient Registered', 'Encounter created with authoritative tariff applied.');
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setIsRegOpen(false)}
        />
      </Md3BottomSheet>
    </section>
  );
};

export default AdminPatientManager;

