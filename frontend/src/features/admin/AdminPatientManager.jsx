import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PatientList from '../patients/PatientList';
import PatientProfile from '../patients/PatientProfile';
import { patientAPI } from '../../services/patientAPI';

const AdminPatientManager = () => {
  const { openConfirm, closeConfirm, setConfirmLoading, showSuccess, showError } = useOutletContext();
  const [selectedPatientId, setSelectedPatientId] = useState(null);

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
              fontSize: '14px'
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
          await patientAPI.requestDeletion(selectedPatientId, reason);
          showSuccess('Deletion request submitted to doctors successfully.');
          window._deletionReasonText = '';
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Failed to submit deletion request.');
          closeConfirm();
        }
      },
    });
  };

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {selectedPatientId ? (
        <div style={{ position: 'relative', width: '100%' }}>
          <PatientProfile
            patientId={selectedPatientId}
            onBack={() => setSelectedPatientId(null)}
            headerActions={
              <button
                type="button"
                className="md3-btn-danger-action"
                onClick={handleRequestDeletion}
                title="Request Patient Deletion (Requires Doctor Sign-off)"
              >
                <span className="material-symbols-rounded">person_remove</span>
                <span>Request Patient Deletion</span>
              </button>
            }
          />
        </div>
      ) : (
        <PatientList onSelectPatient={(p) => setSelectedPatientId(p._id)} />
      )}
    </section>
  );
};

export default AdminPatientManager;
