import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PatientList from '../patients/PatientList';
import PatientProfile from '../patients/PatientProfile';
import { patientAPI } from '../../services/patientAPI';

const AdminPatientManager = () => {
  const { openConfirm, closeConfirm, setConfirmLoading, showSuccess, showError } = useOutletContext();
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {selectedPatientId ? (
        <div style={{ position: 'relative' }}>
          <PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3f3', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
            <h3 style={{ color: '#b91c1c', marginBottom: '10px' }}>Admin Actions</h3>
            <button
              onClick={() => {
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
                          border: '1px solid var(--md-sys-color-outline-variant, #ccc)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#fafafa',
                          color: '#333',
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
                    if (!reason) { showError('Please provide a reason before submitting.'); return; }
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
              }}
              className="btn-primary"
              style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Request Patient Deletion
            </button>
          </div>
        </div>
      ) : (
        <PatientList onSelectPatient={(p) => setSelectedPatientId(p._id)} />
      )}
    </section>
  );
};

export default AdminPatientManager;
