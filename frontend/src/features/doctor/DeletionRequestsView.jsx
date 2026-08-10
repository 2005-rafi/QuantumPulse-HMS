import React from 'react';
import {
  Md3Card, Md3CardHeader, Md3EmptyState, Icon, Md3DataTable, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import { patientAPI } from '../../services/patientAPI';

import { useToast } from '../../context/ToastContext';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const DeletionRequestsView = ({ deletionRequests = [], onRefresh }) => {
  const { showSuccess, showError } = useToast();
  const [confirmDialog, setConfirmDialog] = React.useState({
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

  const openConfirm = (opts) => setConfirmDialog({ ...confirmDialog, isOpen: true, loading: false, ...opts });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, isOpen: false, loading: false, onConfirm: null }));
  const setConfirmLoading = (v) => setConfirmDialog((d) => ({ ...d, loading: v }));

  const handleApprove = (req) => {
    openConfirm({
      title: 'Approve Data Deletion',
      message: `Permanently delete all data for ${req.patientId?.firstName} ${req.patientId?.lastName}? This action is irreversible.`,
      confirmLabel: 'Approve & Delete',
      variant: 'danger',
      icon: 'delete_forever',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await patientAPI.approveDeletion(req._id);
          showSuccess('Patient deletion approved successfully.');
          if (onRefresh) onRefresh();
          closeConfirm();
        } catch (e) {
          const msg = e.response?.data?.message || e.message || 'Unknown error';
          showError(`Failed to approve deletion: ${msg}`);
          closeConfirm();
        }
      }
    });
  };

  const handleReject = (req) => {
    openConfirm({
      title: 'Reject Deletion Request',
      message: `Keep patient data intact for ${req.patientId?.firstName} ${req.patientId?.lastName}?`,
      confirmLabel: 'Reject Request',
      variant: 'info',
      icon: 'cancel',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await patientAPI.rejectDeletion(req._id);
          showSuccess('Deletion request rejected. Patient data remains intact.');
          if (onRefresh) onRefresh();
          closeConfirm();
        } catch (e) {
          const msg = e.response?.data?.message || e.message || 'Unknown error';
          showError(`Failed to reject deletion: ${msg}`);
          closeConfirm();
        }
      }
    });
  };

  const columns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div className="deletion-patient">
          <div className="deletion-patient__avatar">
            {`${row.patientId?.firstName?.[0] || '?'}${row.patientId?.lastName?.[0] || '?'}`.toUpperCase()}
          </div>
          <div className="deletion-patient__info">
            <span className="deletion-patient__name">
              {row.patientId?.firstName} {row.patientId?.lastName}
            </span>
            <span className="deletion-patient__mrn">
              MRN: {row.patientId?.mrn}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (row) => (
        <div className="deletion-requestor">
          <span className="deletion-requestor__name">
            {row.requestedBy?.fullName || 'Unknown'}
          </span>
          <span className="deletion-requestor__date">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="deletion-reason">
          {row.reason || 'No reason provided'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="deletion-actions">
          <Md3Button
            variant="outlined"
            onClick={() => handleReject(row)}
            className="deletion-actions__reject"
          >
            Reject
          </Md3Button>
          <Md3Button
            variant="primary"
            onClick={() => handleApprove(row)}
            className="deletion-actions__approve"
          >
            Approve Delete
          </Md3Button>
        </div>
      ),
    },
  ];

  return (
    <div className="deletion-view">
      <Md3Card variant="outlined" padding="none">
        <Md3CardHeader
          icon={<Icon.FileText />}
          title="Pending Deletion Requests"
          subtitle="Review and action on patient data deletion requests submitted by staff members."
          action={
            <Md3Chip variant="tertiary" size="medium">
              {deletionRequests.length} Pending
            </Md3Chip>
          }
        />
        <div className="deletion-view__content">
          {deletionRequests.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.Inbox />}
              title="No pending deletion requests"
              subtitle="All deletion requests have been processed. Check back later."
            />
          ) : (
            <Md3DataTable columns={columns} rows={deletionRequests} />
          )}
        </div>
      </Md3Card>
      <Md3ConfirmDialog
        {...confirmDialog}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default DeletionRequestsView;
