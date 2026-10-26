import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { billingAPI } from '../../../services/billingAPI';
import { adminAPI } from '../../../services/adminAPI';
import { Md3Select, Md3TextField, Md3Button } from '../../../components/md3/Md3FormComponents';
import { PermissionGate } from '../../../components/shell/PermissionGate';
import { UnifiedBillPrintModal } from '../print';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { useToast } from '../../../context/ToastContext';

export const BillingPaymentsView = ({ initialBill }) => {
  const { showSuccess, showError } = useToast();
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(initialBill || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  // Print template branding
  const [templateConfig, setTemplateConfig] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    adminAPI
      .getSetting('billing_template')
      .then((res) => {
        if (res.data?.data?.value) {
          setTemplateConfig(res.data.data.value);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOutstandingBills = async () => {
    setLoading(true);
    try {
      const res = await billingAPI.listBills({ outstandingOnly: true });
      const items = res.data?.data?.items || res.data?.items || [];
      setBills(items);
      if (!selectedBill && items.length > 0) {
        loadBillDetail(items[0]._id);
      }
    } catch (err) {
      console.error('Failed to load outstanding bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBillDetail = async (billId) => {
    try {
      const res = await billingAPI.getBillById(billId);
      const b = res.data?.data || res.data;
      setSelectedBill(b);
      setPaymentAmount(b.outstandingAmount ? String(b.outstandingAmount) : '');
    } catch (err) {
      showError('Error', 'Failed to load bill');
    }
  };

  useEffect(() => {
    if (initialBill?._id) {
      loadBillDetail(initialBill._id);
    } else {
      fetchOutstandingBills();
    }
  }, [initialBill]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill?._id) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showError('Validation Error', 'Please enter a valid payment amount');
      return;
    }
    if (amt > (selectedBill.outstandingAmount || 0)) {
      showError('Validation Error', `Amount cannot exceed outstanding balance of ${CURRENCY_SYMBOL}${selectedBill.outstandingAmount}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await billingAPI.recordPayment(selectedBill._id, {
        amount: amt,
        method: paymentMethod,
        reference: paymentRef.trim(),
      });
      const updated = res.data?.data || res.data;
      setSelectedBill(updated);
      setPaymentAmount(updated.outstandingAmount ? String(updated.outstandingAmount) : '');
      setPaymentRef('');
      showSuccess('Payment Recorded', `Received ${CURRENCY_SYMBOL}${amt} via ${paymentMethod}`);
      fetchOutstandingBills();
    } catch (err) {
      showError('Payment Failed', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeBill = async () => {
    if (!selectedBill?._id) return;
    setSubmitting(true);
    try {
      const res = await billingAPI.finalizeBill(selectedBill._id);
      const updated = res.data?.data || res.data;
      setSelectedBill(updated);
      showSuccess('Invoice Finalized & Visit Concluded', 'The bill has been locked and patient visit is officially marked as COMPLETED.');
      fetchOutstandingBills();
    } catch (err) {
      showError('Finalization Failed', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            Cashier &amp; Payment Settlement Station
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Central Station: Collect patient dues, record payments, lock bills, and complete visits
          </p>
        </div>

        {selectedBill && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Md3Button type="button" variant="secondary" onClick={handlePrint}>
              <span className="material-symbols-rounded">print</span>
              <span>Print Official Invoice</span>
            </Md3Button>
            {selectedBill.status === 'OPEN' && selectedBill.outstandingAmount === 0 && (
              <Md3Button type="button" variant="primary" onClick={handleFinalizeBill} disabled={submitting}>
                <span className="material-symbols-rounded">task_alt</span>
                <span>Finalize Bill &amp; Complete Visit</span>
              </Md3Button>
            )}
          </div>
        )}
      </div>

      {/* Bill selector & Financial Ledger Bar */}
      <div style={{ background: 'var(--md-sys-color-surface-container-low)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <Md3Select
            label="Select Account with Due Balance"
            value={selectedBill?._id || ''}
            onChange={(e) => loadBillDetail(e.target.value)}
            options={[
              { value: '', label: 'Select an account to collect payment...' },
              ...bills.map((b) => {
                const p = b.patientId || {};
                return {
                  value: b._id,
                  label: `${b.billNumber} — ${p.firstName || ''} ${p.lastName || ''} · Due: ${CURRENCY_SYMBOL}${b.outstandingAmount || 0}`,
                };
              }),
            ]}
          />
        </div>

        {selectedBill && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>Billed Total</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{CURRENCY_SYMBOL}{selectedBill.billedAmount || 0}</div>
            </div>
            {selectedBill.advanceCollected > 0 && (
              <div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1565c0', textTransform: 'uppercase' }}>Advance / Reg Paid</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1565c0' }}>{CURRENCY_SYMBOL}{selectedBill.advanceCollected}</div>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase' }}>Collected</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#2e7d32' }}>{CURRENCY_SYMBOL}{selectedBill.collectedAmount || 0}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: selectedBill.outstandingAmount > 0 ? '#e65100' : '#2e7d32', textTransform: 'uppercase' }}>
                {selectedBill.outstandingAmount > 0 ? 'Remaining Due' : 'Balance'}
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: selectedBill.outstandingAmount > 0 ? '#e65100' : '#2e7d32' }}>
                {CURRENCY_SYMBOL}{selectedBill.outstandingAmount || 0}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>Status</span>
              <div>
                {selectedBill.status === 'FINALIZED' ? (
                  <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    FINALIZED &amp; COMPLETED
                  </span>
                ) : selectedBill.outstandingAmount === 0 ? (
                  <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    SETTLED (READY)
                  </span>
                ) : (
                  <span style={{ background: '#fff3e0', color: '#ef6c00', padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    OPEN DUE
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedBill ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '16px' }}>
          {/* Left: Payment collection form */}
          <div style={{ background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#2e7d32' }}>add_card</span>
              <span>Record Cashier Payment</span>
            </h4>

            {selectedBill.status === 'FINALIZED' ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px', border: '1px solid #2e7d32' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '42px', color: '#2e7d32' }}>verified</span>
                <h4 style={{ margin: '8px 0 4px 0', color: '#2e7d32' }}>Account Finalized &amp; Visit Completed</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  This bill is locked and the patient encounter has been officially marked as COMPLETED.
                </p>
                <Md3Button type="button" variant="secondary" onClick={handlePrint}>
                  <span className="material-symbols-rounded">print</span>
                  <span>Print Official Receipt</span>
                </Md3Button>
              </div>
            ) : selectedBill.outstandingAmount === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#2e7d32' }}>check_circle</span>
                <h4 style={{ margin: '8px 0 4px 0' }}>Bill Fully Settled</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  All patient dues have been collected. Click below to lock the bill and complete the patient's visit.
                </p>
                {selectedBill.status === 'OPEN' && (
                  <PermissionGate
                    requires="BILL_FINALIZE"
                    fallback={
                      <div style={{ padding: '10px 14px', background: 'rgba(255,152,0,0.1)', color: '#e65100', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <span className="material-symbols-rounded" style={{ verticalAlign: 'middle', fontSize: '18px', marginRight: '6px' }}>lock</span>
                        Administrative / Billing clearance required to finalize bill.
                      </div>
                    }
                  >
                    <Md3Button type="button" variant="primary" onClick={handleFinalizeBill} disabled={submitting}>
                      <span className="material-symbols-rounded">task_alt</span>
                      <span>Finalize Bill &amp; Complete Visit</span>
                    </Md3Button>
                  </PermissionGate>
                )}
              </div>
            ) : (
              <PermissionGate
                requires="PAYMENT_RECORD"
                fallback={
                  <div style={{ padding: '18px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.6 }}>lock</span>
                    <h4 style={{ margin: '6px 0 4px 0' }}>Read-Only View</h4>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Cashier or Billing role permission (<code>PAYMENT_RECORD</code>) required to collect payments.
                    </p>
                  </div>
                }
              >
                <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Md3TextField
                    label="Amount to Pay (₹) *"
                    type="number"
                    min="0.01"
                    max={selectedBill.outstandingAmount}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />

                  <Md3Select
                    label="Payment Channel *"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={[
                      { value: 'UPI', label: 'UPI / QR Code / Instant Transfer' },
                      { value: 'Cash', label: 'Cash Counter' },
                      { value: 'Card', label: 'Debit / Credit Card POS' },
                      { value: 'Insurance', label: 'Health Insurance TPA Claim' },
                      { value: 'WaivedOff', label: 'Hospital Discretionary Waiver' },
                    ]}
                  />

                  <Md3TextField
                    label="Transaction / Authorization Reference"
                    placeholder="e.g. UPI Ref / Bank Auth Code / Policy #"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />

                  <Md3Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    loading={submitting}
                    style={{ height: '46px', marginTop: '6px' }}
                  >
                    <span className="material-symbols-rounded">receipt</span>
                    <span>Collect Payment ({CURRENCY_SYMBOL}{paymentAmount || 0})</span>
                  </Md3Button>
                </form>
              </PermissionGate>
            )}
          </div>

          {/* Right: Payment history ledger */}
          <div style={{ background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#2e7d32' }}>receipt_long</span>
              <span>Recorded Payment Receipts ({selectedBill.payments?.length || 0})</span>
            </h4>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <th style={{ padding: '10px 12px' }}>Date &amp; Time</th>
                    <th style={{ padding: '10px 12px' }}>Method</th>
                    <th style={{ padding: '10px 12px' }}>Reference</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedBill.payments || selectedBill.payments.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                        No payments received yet.
                      </td>
                    </tr>
                  ) : (
                    selectedBill.payments.map((p, idx) => (
                      <tr key={p._id || idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <td style={{ padding: '10px 12px' }}>{new Date(p.recordedAt).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.method}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{p.reference || '—'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>
                          {CURRENCY_SYMBOL}{p.amount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-lowest)', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '44px', opacity: 0.5 }}>payments</span>
          <h4>No Account Selected</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Select an account from the dropdown above to view dues and record payments.
          </p>
        </div>
      )}

      {/* ─── UNIFIED BILL PRINT MODAL & RENDERING ENGINE ─── */}
      <UnifiedBillPrintModal
        isOpen={isPrinting && !!selectedBill}
        onClose={() => setIsPrinting(false)}
        bill={selectedBill}
        patient={selectedBill?.patientId}
        config={templateConfig}
        defaultMode="INVOICE"
        title="Official Tax Invoice & Settlement Receipt"
      />
    </div>
  );
};

export default BillingPaymentsView;
