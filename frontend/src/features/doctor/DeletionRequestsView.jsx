import React, { useState } from 'react';
import {
  Md3EmptyState, Icon,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { patientAPI } from '../../services/patientAPI';
import { useToast } from '../../context/ToastContext';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import Md3ModalPortal from '../../components/md3/Md3ModalPortal';
import './DeletionRequestsView.css';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return `${f}${l}`.toUpperCase() || 'PT';
};

const DeletionRequestsView = ({ deletionRequests = [], onRefresh }) => {
  const { showSuccess, showError, showWarning } = useToast();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    icon: '',
    loading: false,
    onConfirm: null,
  });

  const openConfirm = (opts) => setConfirmDialog((d) => ({ ...d, isOpen: true, loading: false, ...opts }));
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, isOpen: false, loading: false, onConfirm: null }));
  const setConfirmLoading = (v) => setConfirmDialog((d) => ({ ...d, loading: v }));

  const handleApprove = (req) => {
    if (!req) return;
    const patientName = req.patientId?.firstName
      ? `${req.patientId.firstName} ${req.patientId.lastName || ''}`.trim()
      : req.patientSnapshot?.fullName || 'this patient';

    openConfirm({
      title: 'Approve Data Deletion',
      message: `Permanently delete all clinical records for ${patientName}? This action is irreversible.`,
      confirmLabel: 'Approve & Delete',
      variant: 'danger',
      icon: 'delete_forever',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await patientAPI.approveDeletion(req._id);
          showSuccess('Patient Deletion Approved', `Records for ${patientName} were archived successfully.`);
          setSelectedRequest(null);
          if (onRefresh) onRefresh();
          closeConfirm();
        } catch (e) {
          const status = e.response?.status;
          const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Unable to approve deletion request.';
          if (status === 409 || status === 422) {
            showWarning('Deletion Blocked by Clinical Policy', msg);
          } else {
            showError('Deletion Approval Failed', msg);
          }
          closeConfirm();
        }
      },
    });
  };

  const handleReject = (req) => {
    if (!req) return;
    const patientName = req.patientId?.firstName
      ? `${req.patientId.firstName} ${req.patientId.lastName || ''}`.trim()
      : req.patientSnapshot?.fullName || 'this patient';

    openConfirm({
      title: 'Reject Deletion Request',
      message: `Keep patient data intact for ${patientName}?`,
      confirmLabel: 'Reject Request',
      variant: 'info',
      icon: 'cancel',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await patientAPI.rejectDeletion(req._id);
          showSuccess('Deletion Request Rejected', `Patient records for ${patientName} remain active and intact.`);
          setSelectedRequest(null);
          if (onRefresh) onRefresh();
          closeConfirm();
        } catch (e) {
          const msg = e.response?.data?.message || e.response?.data?.detail || e.message || 'Unable to reject request.';
          showError('Rejection Failed', msg);
          closeConfirm();
        }
      },
    });
  };

  return (
    <div className="deletion-view">
      {/* ── Header Card ── */}
      <div className="deletion-header-card">
        <div className="deletion-header-main">
          <div className="deletion-header-icon" aria-hidden="true">
            <span className="material-symbols-rounded">person_remove</span>
          </div>
          <div className="deletion-header-titles">
            <h3 className="deletion-header-title">Pending Deletion Requests</h3>
            <p className="deletion-header-subtitle">
              Review and action on patient data deletion requests submitted by staff members.
            </p>
          </div>
        </div>
        <div className="deletion-pending-badge">
          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>hourglass_top</span>
          <span>{deletionRequests.length} Pending</span>
        </div>
      </div>

      {/* ── Table / Compact List Container ── */}
      <div className="deletion-table-container">
        {deletionRequests.length === 0 ? (
          <div style={{ padding: '32px 16px' }}>
            <Md3EmptyState
              icon={<Icon.Inbox />}
              title="No pending deletion requests"
              subtitle="All deletion requests have been processed. Check back later."
            />
          </div>
        ) : (
          <table className="deletion-table" role="table">
            <thead>
              <tr>
                <th scope="col" className="col-del-patient">Patient &amp; MRN</th>
                <th scope="col" className="col-del-requestor">Requested By</th>
                <th scope="col" className="col-del-reason">Deletion Reason</th>
                <th scope="col" className="col-del-actions text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletionRequests.map((req) => {
                const patient = req.patientId || req.patientSnapshot || req.patientDisplay || {};
                const fullName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || req.patientSnapshot?.fullName || 'Unknown Patient';
                const initials = getInitials(patient.firstName || fullName.split(' ')[0], patient.lastName || fullName.split(' ')[1]);
                const mrn = patient.mrn || req.patientSnapshot?.mrn || 'N/A';
                const requestorName = req.requestedBy?.fullName || req.requestedBy?.name || 'Staff Member';
                const requestDate = formatDate(req.createdAt);
                const reasonText = req.reason || 'No specific reason provided';

                return (
                  <tr
                    key={req._id || req.id}
                    className="deletion-row"
                    onClick={() => setSelectedRequest(req)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRequest(req);
                      }
                    }}
                  >
                    {/* 1. Patient Profile */}
                    <td className="col-del-patient">
                      <div className="deletion-patient-cell">
                        <div className="deletion-patient-avatar" aria-hidden="true">
                          {initials}
                        </div>
                        <div className="deletion-patient-meta">
                          <span className="deletion-patient-name">{fullName}</span>
                          <div className="deletion-patient-sub">
                            <span className="deletion-patient-mrn">
                              <span className="material-symbols-rounded">tag</span>
                              {mrn}
                            </span>
                            <span className="deletion-mobile-extra">
                              • By {requestorName.split(' ')[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Requested By */}
                    <td className="col-del-requestor">
                      <div className="deletion-requestor-cell">
                        <span className="deletion-requestor-name">{requestorName}</span>
                        <span className="deletion-requestor-date">
                          <span className="material-symbols-rounded">calendar_today</span>
                          <span>{requestDate}</span>
                        </span>
                      </div>
                    </td>

                    {/* 3. Reason Glimpse */}
                    <td className="col-del-reason">
                      <div className="deletion-reason-cell">
                        <span className="deletion-reason-text" title={reasonText}>
                          {reasonText}
                        </span>
                      </div>
                    </td>

                    {/* 4. Actions */}
                    <td className="col-del-actions text-right">
                      {/* Desktop Action Buttons */}
                      <div className="deletion-actions-cell deletion-desktop-only">
                        <button
                          type="button"
                          className="deletion-btn deletion-btn--reject"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(req);
                          }}
                          title="Reject Request"
                        >
                          <span className="material-symbols-rounded">close</span>
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          className="deletion-btn deletion-btn--approve"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(req);
                          }}
                          title="Approve & Delete"
                        >
                          <span className="material-symbols-rounded">delete_forever</span>
                          <span>Approve Delete</span>
                        </button>
                      </div>

                      {/* Mobile Review Glimpse Chip + Chevron */}
                      <div className="deletion-mobile-action-chip">
                        <span>Review</span>
                      </div>
                      <span className="material-symbols-rounded deletion-mobile-chevron" aria-hidden="true">
                        chevron_right
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Material 3 On-Tap Detail Overlay Modal (Centered Dialog) ── */}
      <Md3ModalPortal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        variant="center"
        className="deletion-modal-container"
        ariaLabel="Deletion Request Detail"
      >
        {selectedRequest && (() => {
          const patient = selectedRequest.patientId || selectedRequest.patientSnapshot || selectedRequest.patientDisplay || {};
          const fullName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || selectedRequest.patientSnapshot?.fullName || 'Unknown Patient';
          const initials = getInitials(patient.firstName || fullName.split(' ')[0], patient.lastName || fullName.split(' ')[1]);
          const mrn = patient.mrn || selectedRequest.patientSnapshot?.mrn || 'N/A';
          const requestorName = selectedRequest.requestedBy?.fullName || selectedRequest.requestedBy?.name || 'Staff Member';
          const requestorRole = selectedRequest.requestedBy?.role || 'Clinical Staff';
          const requestDate = formatDate(selectedRequest.createdAt);
          const reasonText = selectedRequest.reason || 'No specific reason provided';

          return (
            <div className="deletion-detail-modal">
              {/* Header */}
              <div className="deletion-detail-header">
                <div className="deletion-detail-header-left">
                  <div className="deletion-detail-header-icon" aria-hidden="true">
                    <span className="material-symbols-rounded">delete_sweep</span>
                  </div>
                  <div className="deletion-detail-title-group">
                    <h4 className="deletion-detail-title">Patient Deletion Request</h4>
                    <span className="deletion-detail-subtitle">Pending doctor verification &amp; authorization</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="deletion-detail-close-btn"
                  onClick={() => setSelectedRequest(null)}
                  aria-label="Close dialog"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="deletion-detail-body">
                {/* Patient Profile */}
                <div className="deletion-detail-patient-box">
                  <div className="deletion-detail-patient-avatar" aria-hidden="true">
                    {initials}
                  </div>
                  <div className="deletion-detail-patient-meta">
                    <span className="deletion-detail-patient-name" style={{ fontSize: '15px' }}>{fullName}</span>
                    <span className="deletion-detail-patient-mrn">
                      <span className="material-symbols-rounded">tag</span>
                      MRN: {mrn}
                    </span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="deletion-detail-meta-grid">
                  <div className="deletion-detail-meta-item">
                    <span className="deletion-detail-meta-label">Requested By</span>
                    <span className="deletion-detail-meta-val">{requestorName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>{requestorRole}</span>
                  </div>
                  <div className="deletion-detail-meta-item">
                    <span className="deletion-detail-meta-label">Date Submitted</span>
                    <span className="deletion-detail-meta-val">{requestDate}</span>
                  </div>
                </div>

                {/* Deletion Rationale */}
                <div className="deletion-detail-reason-box">
                  <div className="deletion-detail-reason-title">
                    <span className="material-symbols-rounded">warning</span>
                    <span>Reason for Deletion</span>
                  </div>
                  <p className="deletion-detail-reason-content">
                    {reasonText}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="deletion-detail-actions">
                <button
                  type="button"
                  className="deletion-btn deletion-btn--reject deletion-detail-btn"
                  onClick={() => handleReject(selectedRequest)}
                >
                  <span className="material-symbols-rounded">close</span>
                  <span>Reject Request</span>
                </button>
                <button
                  type="button"
                  className="deletion-btn deletion-btn--approve deletion-detail-btn"
                  onClick={() => handleApprove(selectedRequest)}
                >
                  <span className="material-symbols-rounded">delete_forever</span>
                  <span>Approve &amp; Delete</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Md3ModalPortal>

      {/* ── Confirmation Dialog ── */}
      <Md3ConfirmDialog
        {...confirmDialog}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default DeletionRequestsView;
