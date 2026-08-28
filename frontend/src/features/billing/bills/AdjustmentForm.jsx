import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { billingAPI } from '../../../services/billingAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

export const AdjustmentForm = ({ isOpen, onClose, bill, onSuccess }) => {
  const [type, setType] = useState('CREDIT_NOTE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bill) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const adjAmount = Number(amount);
      if (isNaN(adjAmount) || adjAmount <= 0) {
        throw new Error('Adjustment amount must be greater than 0');
      }
      if (!reason.trim()) {
        throw new Error('Reason for adjustment is mandatory for audit trail');
      }

      await billingAPI.requestAdjustment(bill._id, {
        type,
        amount: adjAmount,
        reason: reason.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to request adjustment', err);
      setError(err.response?.data?.message || err.message || 'Adjustment request failed');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)' }}>
              <span className="material-symbols-rounded">price_check</span>
            </div>
            <div>
              <h3 className="appt-modal-title">Financial Adjustment</h3>
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
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'var(--md-sys-color-surface-container)',
            fontSize: '0.8125rem',
            color: 'var(--md-sys-color-on-surface-variant)',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}>
            Financial adjustments preserve the immutable billing fact while recording post-finalization credit notes, refunds, or fee writeoffs with administrative audit trail.
          </div>

          <form id="adjustment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Md3Select
              id="adj-type"
              name="type"
              label="Adjustment Category *"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
              options={[
                { value: 'CREDIT_NOTE', label: 'Credit Note (Discount / Correction)' },
                { value: 'REFUND', label: 'Patient Refund' },
                { value: 'WRITEOFF', label: 'Bad Debt / Compassionate Writeoff' },
              ]}
            />

            <Md3TextField
              id="adj-amount"
              name="amount"
              label={`Adjustment Amount (${CURRENCY_SYMBOL}) *`}
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              required
            />

            <Md3TextField
              id="adj-reason"
              name="reason"
              label="Reason & Justification *"
              placeholder="State reason for credit note / refund (e.g. Senior citizen discount, cancelled lab order)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              multiline
              rows={3}
              required
            />
          </form>
        </div>

        <div className="appt-modal-actions">
          <Md3Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Md3Button>
          <Md3Button type="submit" form="adjustment-form" onClick={handleSubmit} disabled={loading || !amount || !reason.trim()} loading={loading}>
            Submit Adjustment Request
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdjustmentForm;
