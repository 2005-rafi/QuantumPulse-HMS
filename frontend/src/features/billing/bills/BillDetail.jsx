import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import Md3ConfirmDialog from '../../../components/md3/Md3ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { billingAPI } from '../../../services/billingAPI';
import PaymentRecordForm from './PaymentRecordForm';
import AdjustmentForm from './AdjustmentForm';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

export const BillDetail = ({ isOpen, onClose, bill, onRefresh }) => {
  const { showSuccess, showError } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    icon: 'lock',
    onConfirm: null,
  });

  if (!isOpen || !bill) return null;

  const handleFinalize = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Finalize & Lock Bill?',
      message: 'Are you sure you want to finalize and lock this invoice? No additional line items or changes can be made after finalization.',
      variant: 'warning',
      confirmLabel: 'Finalize & Lock',
      cancelLabel: 'Keep Draft',
      icon: 'lock',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await billingAPI.finalizeBill(bill._id);
          showSuccess('Bill Finalized', 'The invoice has been finalized and locked.');
          if (onRefresh) onRefresh();
        } catch (err) {
          showError('Finalization Failed', err.response?.data?.message || err.message || 'Failed to finalize bill');
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleApproveAdjustment = async (adjId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Tariff Adjustment?',
      message: 'Are you sure you want to approve this financial discount/adjustment on the bill?',
      variant: 'info',
      confirmLabel: 'Approve Adjustment',
      cancelLabel: 'Cancel',
      icon: 'check_circle',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await billingAPI.approveAdjustment(bill._id, adjId);
          showSuccess('Adjustment Approved', 'The billing adjustment has been approved.');
          if (onRefresh) onRefresh();
        } catch (err) {
          showError('Approval Failed', err.response?.data?.message || err.message || 'Failed to approve adjustment');
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const lineItems = bill.lineItems || [];
  const payments = bill.payments || [];
  const adjustments = bill.adjustments || [];

  return (
    <>
      {createPortal(
        <div className="appt-modal-backdrop" onClick={onClose}>
          <div className="appt-modal-container" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="appt-modal-header">
              <div className="appt-modal-title-group">
                <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  <span className="material-symbols-rounded">receipt</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="appt-modal-title">Bill #{bill.billNumber}</h3>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: bill.status === 'FINALIZED' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-secondary-container)',
                      color: bill.status === 'FINALIZED' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-secondary-container)',
                    }}>
                      {bill.status}
                    </span>
                  </div>
                  <p className="appt-modal-subtitle">
                    Patient: {bill.patientId?.firstName} {bill.patientId?.lastName} {bill.patientId?.mrn ? `(MRN: ${bill.patientId.mrn})` : ''} · {new Date(bill.serviceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button type="button" className="appt-modal-close" onClick={onClose} aria-label="Close">
                <Icon.X />
              </button>
            </div>

            {/* Body */}
            <div className="appt-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Financial 4-Stat Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--md-sys-color-surface-container)',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Billed Total</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{CURRENCY_SYMBOL}{bill.billedAmount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Collected</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2e7d32' }}>{CURRENCY_SYMBOL}{bill.collectedAmount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Adjusted / Credits</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e65100' }}>{CURRENCY_SYMBOL}{bill.adjustedAmount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Outstanding Due</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: bill.outstandingAmount > 0 ? 'var(--md-sys-color-error)' : '#2e7d32' }}>
                    {CURRENCY_SYMBOL}{bill.outstandingAmount || 0}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>list_alt</span>
                  Billed Line Items (Immutable Financial Fact)
                </h4>

                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <th style={{ padding: '10px 14px' }}>Category</th>
                        <th style={{ padding: '10px 14px' }}>Description</th>
                        <th style={{ padding: '10px 14px' }}>Tariff Snapshot / Resolution Path</th>
                        <th style={{ padding: '10px 14px' }}>Qty</th>
                        <th style={{ padding: '10px 14px' }}>Unit Price</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            No line items recorded yet.
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((li) => (
                          <tr key={li._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--md-sys-color-surface-container)', fontSize: '0.6875rem', fontWeight: 700 }}>
                                {li.category}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{li.description}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.75rem' }}>
                              {li.snapshotRulePath || 'Standard Tariff'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>{li.quantity}</td>
                            <td style={{ padding: '10px 14px' }}>{CURRENCY_SYMBOL}{li.snapshotPrice}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                              {CURRENCY_SYMBOL}{li.lineTotal}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Ledger */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#2e7d32' }}>check_circle</span>
                    Payments Received ({payments.length})
                  </h4>
                  {bill.outstandingAmount > 0 && bill.status !== 'CANCELLED' && (
                    <Md3Button type="button" onClick={() => setPayOpen(true)} style={{ height: '36px', fontSize: '0.8125rem' }}>
                      <span className="material-symbols-rounded">add_card</span>
                      <span>Record Payment</span>
                    </Md3Button>
                  )}
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <th style={{ padding: '10px 14px' }}>Date & Time</th>
                        <th style={{ padding: '10px 14px' }}>Method</th>
                        <th style={{ padding: '10px 14px' }}>Reference</th>
                        <th style={{ padding: '10px 14px' }}>Recorded By</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                            <td style={{ padding: '10px 14px' }}>{new Date(p.recordedAt).toLocaleString()}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.method}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--md-sys-color-on-surface-variant)' }}>{p.reference || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>{p.recordedBy?.fullName || 'Reception'}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                              {CURRENCY_SYMBOL}{p.amount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adjustments & Credit Notes */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#e65100' }}>price_check</span>
                    Adjustments, Credit Notes & Refunds ({adjustments.length})
                  </h4>
                  {bill.status === 'FINALIZED' && (
                    <Md3Button type="button" variant="secondary" onClick={() => setAdjOpen(true)} style={{ height: '36px', fontSize: '0.8125rem' }}>
                      <span className="material-symbols-rounded">note_add</span>
                      <span>Request Adjustment</span>
                    </Md3Button>
                  )}
                </div>

                {adjustments.length > 0 && (
                  <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                          <th style={{ padding: '10px 14px' }}>Type</th>
                          <th style={{ padding: '10px 14px' }}>Reason</th>
                          <th style={{ padding: '10px 14px' }}>Amount</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((a) => (
                          <tr key={a._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.type?.replace('_', ' ')}</td>
                            <td style={{ padding: '10px 14px' }}>{a.reason}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#e65100' }}>{CURRENCY_SYMBOL}{a.amount}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                background: a.status === 'APPROVED' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-tertiary-container)',
                                color: a.status === 'APPROVED' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-tertiary-container)',
                              }}>
                                {a.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              {a.status === 'PENDING_APPROVAL' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAdjustment(a._id)}
                                  disabled={actionLoading}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    background: '#2e7d32',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="appt-modal-actions">
              <Md3Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Md3Button>
              {bill.status === 'OPEN' && (
                <Md3Button type="button" onClick={handleFinalize} disabled={actionLoading} loading={actionLoading}>
                  <span className="material-symbols-rounded">lock</span>
                  <span>Finalize & Lock Bill</span>
                </Md3Button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Nested Dialogs */}
      <PaymentRecordForm
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        bill={bill}
        onSuccess={onRefresh}
      />

      <AdjustmentForm
        isOpen={adjOpen}
        onClose={() => setAdjOpen(false)}
        bill={bill}
        onSuccess={onRefresh}
      />

      {/* Reusable Material Confirm Dialog */}
      <Md3ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default BillDetail;
