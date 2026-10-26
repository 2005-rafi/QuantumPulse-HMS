import React, { useState, useEffect, useCallback } from 'react';
import { patientAPI } from '../../services/patientAPI';
import './AdminDeletedPatientsView.css';

const AdminDeletedPatientsView = ({ onRestoreSuccess, openConfirm, closeConfirm, setConfirmLoading, showSuccess, showError }) => {
  const [deletedPatients, setDeletedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientAPI.getDeleted(page, limit, searchQuery);
      const payload = res?.data !== undefined ? res.data : res;
      const items = payload?.items || (Array.isArray(payload) ? payload : []);
      const total = payload?.total !== undefined ? payload.total : items.length;
      setDeletedPatients(items);
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to fetch deleted patients:', err);
      if (showError) showError(err.response?.data?.message || 'Failed to fetch archived patient records');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeleted();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDeleted]);

  const handleRestore = (patient) => {
    if (!openConfirm) return;
    openConfirm({
      title: 'Restore Patient Record',
      message: `Are you sure you want to restore the record for ${patient.fullName || 'this patient'} (MRN: ${patient.mrn}) back to the active clinical directory?`,
      confirmLabel: 'Restore Record',
      cancelLabel: 'Cancel',
      variant: 'primary',
      icon: 'settings_backup_restore',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await patientAPI.restore(patient._id);
          if (showSuccess) showSuccess(`Patient record ${patient.mrn} successfully restored to active directory.`);
          closeConfirm();
          fetchDeleted();
          if (onRestoreSuccess) onRestoreSuccess();
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to restore patient record.';
          if (showError) showError('Restoration Failed', msg);
          closeConfirm();
        }
      },
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="admin-deleted-patients-container">
      {/* Top Toolbar */}
      <div className="deleted-patients-toolbar">
        <div className="deleted-search-box">
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-outline, #78776b)' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search archived patients by Name, MRN or Phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="deleted-stats-badge">
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>archive</span>
            <span>{totalCount} Archived Records</span>
          </div>

          <button
            type="button"
            className="md3-icon-button"
            onClick={fetchDeleted}
            title="Refresh list"
            style={{
              background: 'var(--md-sys-color-surface, #fff)',
              border: '1px solid var(--md-sys-color-outline-variant, #c9c7b6)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>refresh</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="deleted-table-wrapper">
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #48473a)' }}>
            Loading archived patients...
          </div>
        ) : deletedPatients.length === 0 ? (
          <div className="deleted-empty-state">
            <span className="material-symbols-rounded">folder_off</span>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>No Archived Patients Found</div>
            <div style={{ fontSize: '13px', maxWidth: '360px' }}>
              {searchQuery
                ? 'No deleted patient matches your search query.'
                : 'There are currently no soft-deleted patient records in the hospital archive.'}
            </div>
          </div>
        ) : (
          <table className="deleted-patients-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>MRN & Contact</th>
                <th>Deletion Date & Time</th>
                <th>Audited Approval Trail</th>
                <th>Clinical Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedPatients.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <div className="patient-primary-cell">
                      <span className="patient-name-title">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</span>
                      <span className="patient-sub-info">
                        {patient.gender || 'Unknown'} • {patient.age ? `${patient.age} yrs` : 'Age N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div><span className="mrn-chip">{patient.mrn || 'N/A'}</span></div>
                      <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant, #48473a)' }}>
                        {patient.phone || 'No phone'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', fontWeight: 500 }}>
                      {formatDate(patient.deletedAt)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="doctor-badge" title="Authorizing Clinician">
                        <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>verified_user</span>
                        <span>{patient.approvedBy?.fullName || patient.deletedBy?.fullName || patient.deletedBy?.name || 'Doctor Sign-off'}</span>
                      </div>
                      {patient.requestedBy && (
                        <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant, #48473a)' }}>
                          Req by: {patient.requestedBy.fullName || patient.requestedBy.name || 'Admin'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="deletion-reason-text" title={patient.deletionReason || 'Approved Deletion Request'}>
                      {patient.deletionReason || 'Approved Deletion Request'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-restore-action"
                      onClick={() => handleRestore(patient)}
                      title="Restore to Active Directory"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>settings_backup_restore</span>
                      <span>Restore</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDeletedPatientsView;
