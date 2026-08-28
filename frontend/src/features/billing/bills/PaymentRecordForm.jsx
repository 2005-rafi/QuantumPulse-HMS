import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { billingAPI } from '../../../services/billingAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

export const PaymentRecordForm = ({ isOpen, onClose, bill, onSuccess }) => {
  const [amount, setAmount] = useState(bill ? String(bill.outstandingAmount || 0) : '0');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bill) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payAmount = Number(amount);
      if (isNaN(payAmount) || payAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      await billingAPI.recordPayment(bill._id, {
        amount: payAmount,
        method,
        reference: reference.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to record payment', err);
      setError(err.response?.data?.message || err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
              <span className="material-symbols-rounded">payments</span>
            </div>
            <div>
              <h3 className="appt-modal-title">Record Payment</h3>
              <p className="appt-modal-subtitle">Bill #{bill.billNumber}</p>
            </div>
          </div>
          <button type="button" className="appt-modal-close" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>

        <div className="appt-modal-body">
          {error && (
            <div className="appt-dialog-error" style={{ marginBottom: '14px' }}>
              <Icon.Alert />
              <span>{error}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'var(--md-sys-color-surface-container)',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}>
            <span>Current Outstanding Dues:</span>
            <strong style={{ fontSize: '1.125rem', color: 'var(--md-sys-color-primary)' }}>
              {CURRENCY_SYMBOL}{bill.outstandingAmount}
            </strong>
          </div>

          <form id="payment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Md3TextField
              id="pay-amount"
              name="amount"
              label={`Payment Amount (${CURRENCY_SYMBOL}) *`}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              required
            />

            <Md3Select
              id="pay-method"
              name="method"
              label="Payment Method *"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={loading}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI / QR Code' },
                { value: 'Card', label: 'Debit / Credit Card' },
                { value: 'Insurance', label: 'Insurance / TPA' },
                { value: 'WaivedOff', label: 'Waived Off / Charity' },
              ]}
            />

            {(method === 'UPI' || method === 'Card' || method === 'Insurance') && (
              <Md3TextField
                id="pay-ref"
                name="reference"
                label={method === 'UPI' ? 'UPI Transaction ID / UTR' : method === 'Card' ? 'Card Authorization / Approval Code' : 'Insurance Claim / Policy No.'}
                placeholder="Enter transaction reference / auth code"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={loading}
              />
            )}
          </form>
        </div>

        <div className="appt-modal-actions">
          <Md3Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Md3Button>
          <Md3Button type="submit" form="payment-form" onClick={handleSubmit} disabled={loading || !amount} loading={loading}>
            Confirm Payment Receipt
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentRecordForm;
