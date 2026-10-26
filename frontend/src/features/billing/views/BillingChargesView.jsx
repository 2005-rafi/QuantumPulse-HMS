import React, { useState, useEffect } from 'react';
import { billingAPI } from '../../../services/billingAPI';
import { Md3Select, Md3TextField, Md3Button } from '../../../components/md3/Md3FormComponents';
import { PermissionGate } from '../../../components/shell/PermissionGate';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { useToast } from '../../../context/ToastContext';

const PRESET_CHARGES = [
  { label: 'Select standard tariff preset (optional)', value: '', category: '', price: 0 },
  // Surgery & OT
  { label: 'Major OT Surgical Suite & Equipment (₹15,000)', value: 'Major OT Surgical Suite & Equipment', category: 'SURGERY', price: 15000 },
  { label: 'Minor OT Surgical Suite (₹5,000)', value: 'Minor OT Surgical Suite', category: 'SURGERY', price: 5000 },
  { label: 'Laparoscopic Surgery Suite & Tower (₹22,000)', value: 'Laparoscopic Surgery Suite & Tower', category: 'SURGERY', price: 22000 },
  { label: 'Surgical Consumables & Sterilization Pack (₹3,500)', value: 'Surgical Consumables & Sterilization Pack', category: 'SURGERY', price: 3500 },
  { label: 'General / Regional Anaesthesia & PAC (₹4,500)', value: 'General / Regional Anaesthesia & PAC Fee', category: 'SURGERY', price: 4500 },
  // Bed Stay & Wards
  { label: 'ICU Critical Care Day Stay (24h) (₹8,000)', value: 'ICU Critical Care Day Stay (24h)', category: 'BED_CHARGES', price: 8000 },
  { label: 'NICU Neonatal Intensive Care Stay (24h) (₹9,500)', value: 'NICU Neonatal Intensive Care Stay (24h)', category: 'BED_CHARGES', price: 9500 },
  { label: 'Private Deluxe AC Room (24h) (₹3,500)', value: 'Private Deluxe AC Room (24h)', category: 'BED_CHARGES', price: 3500 },
  { label: 'Semi-Private Room Day Stay (24h) (₹2,200)', value: 'Semi-Private Room Day Stay (24h)', category: 'BED_CHARGES', price: 2200 },
  { label: 'General Ward Day Stay (24h) (₹1,000)', value: 'General Ward Day Stay (24h)', category: 'BED_CHARGES', price: 1000 },
  // Nursing & Bed Support
  { label: 'Daily Inpatient Nursing Care (₹450)', value: 'Daily Inpatient Nursing Care & Vitals Monitoring', category: 'NURSING', price: 450 },
  { label: 'ICU Special Critical Nursing Monitoring (₹1,500)', value: 'ICU Special Critical Nursing Monitoring', category: 'NURSING', price: 1500 },
  { label: 'RMO Resident Medical Officer Daily Duty Round (₹500)', value: 'RMO Resident Medical Officer Daily Duty Round', category: 'BED_SUPPORT', price: 500 },
  // Procedures
  { label: 'Wound Dressing & Debridement (₹750)', value: 'Wound Dressing & Debridement', category: 'PROCEDURE', price: 750 },
  { label: 'Catheterization & Clinical Consumables (₹600)', value: 'Catheterization & Clinical Consumables', category: 'PROCEDURE', price: 600 },
  // Consultations & Diagnostics
  { label: 'Specialist Inpatient Physician Review (₹800)', value: 'Specialist Inpatient Physician Review', category: 'CONSULTATION', price: 800 },
  { label: 'Comprehensive Metabolic & CBC Panel (₹850)', value: 'Comprehensive Metabolic & CBC Panel', category: 'DIAGNOSTICS', price: 850 },
  { label: 'Renal & Liver Function Test Panel (₹1,200)', value: 'Renal & Liver Function Test Panel', category: 'DIAGNOSTICS', price: 1200 },
];

export const BillingChargesView = ({ selectedBill: initialBill, onProceedToPayment }) => {
  const { showSuccess, showError } = useToast();
  const [bill, setBill] = useState(initialBill || null);
  const [openBills, setOpenBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedPreset, setSelectedPreset] = useState('');
  const [category, setCategory] = useState('PROCEDURE');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');

  const fetchOpenBills = async () => {
    setLoading(true);
    try {
      const res = await billingAPI.listBills({ status: 'OPEN' });
      const items = res.data?.data?.items || res.data?.items || [];
      setOpenBills(items);
      if (!bill && items.length > 0) {
        // Auto-select first open bill if none selected
        loadBillDetail(items[0]._id);
      }
    } catch (err) {
      console.error('Failed to load open bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBillDetail = async (billId) => {
    try {
      const res = await billingAPI.getBillById(billId);
      const b = res.data?.data || res.data;
      setBill(b);
    } catch (err) {
      showError('Error', 'Failed to load bill detail');
    }
  };

  useEffect(() => {
    if (initialBill?._id) {
      loadBillDetail(initialBill._id);
    } else {
      fetchOpenBills();
    }
  }, [initialBill]);

  const handlePresetSelect = (presetVal) => {
    setSelectedPreset(presetVal);
    const found = PRESET_CHARGES.find((p) => p.value === presetVal);
    if (found && found.value) {
      setDescription(found.value);
      setCategory(found.category);
      setPrice(found.price);
    }
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    if (!bill?._id) {
      showError('Validation Error', 'Please select an open bill first');
      return;
    }
    if (!description.trim()) {
      showError('Validation Error', 'Please enter a charge description');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      showError('Validation Error', 'Please enter a valid price greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      const res = await billingAPI.addLineItem(bill._id, {
        category,
        description: description.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        price: numPrice,
        snapshotRulePath: selectedPreset ? `Tariff Preset: ${selectedPreset}` : 'Manual Charge Entry',
      });
      const updated = res.data?.data || res.data;
      setBill(updated);
      showSuccess('Charge Added', `Added ${description} (${CURRENCY_SYMBOL}${numPrice * (Number(quantity) || 1)})`);

      // Reset form
      setSelectedPreset('');
      setDescription('');
      setPrice('');
      setQuantity(1);
    } catch (err) {
      showError('Failed to add charge', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            Clinical Charge Capture &amp; Tariff Application
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Apply surgical operation theatre, inpatient ward stay, ICU, and procedural charges to patient accounts
          </p>
        </div>

        {bill && (
          <Md3Button
            type="button"
            variant="primary"
            onClick={() => onProceedToPayment && onProceedToPayment(bill)}
          >
            <span className="material-symbols-rounded">payments</span>
            <span>Proceed to Cashier &amp; Payment</span>
          </Md3Button>
        )}
      </div>

      {/* Bill selector bar */}
      <div style={{ background: 'var(--md-sys-color-surface-container-low)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px' }}>
          <Md3Select
            label="Select Active Patient Account"
            value={bill?._id || ''}
            onChange={(e) => loadBillDetail(e.target.value)}
            options={[
              { value: '', label: 'Choose an active patient...' },
              ...openBills.map((b) => {
                const p = b.patientId || {};
                return {
                  value: b._id,
                  label: `${b.billNumber} — ${p.firstName || ''} ${p.lastName || ''} (MRN: ${p.mrn || 'N/A'}) · Total: ${CURRENCY_SYMBOL}${b.billedAmount || 0}`,
                };
              }),
            ]}
          />
        </div>

        {bill && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>Current Total</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>{CURRENCY_SYMBOL}{bill.billedAmount || 0}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>Outstanding</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#e65100' }}>{CURRENCY_SYMBOL}{bill.outstandingAmount || 0}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>Account Status</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#2e7d32' }}>{bill.status}</span>
            </div>
          </div>
        )}
      </div>

      {bill ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '16px' }}>
          {/* Left: Charge capture card */}
          <div style={{ background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)' }}>add_circle</span>
              <span>Add Departmental Charge</span>
            </h4>

            <PermissionGate
              requires="BILL_GENERATE"
              fallback={
                <div style={{ padding: '18px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '12px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.6 }}>lock</span>
                  <h4 style={{ margin: '6px 0 4px 0' }}>Read-Only View</h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Billing authorization (<code>BILL_GENERATE</code>) required to manually attach charges.
                  </p>
                </div>
              }
            >
              <form onSubmit={handleAddCharge} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Md3Select
                  label="Standard Tariff Catalog"
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  options={PRESET_CHARGES.map((p) => ({ value: p.value, label: p.label }))}
                />

                <Md3Select
                  label="Charge Category *"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'SURGERY', label: 'Surgery & Operating Theatre (OT)' },
                    { value: 'PROCEDURE', label: 'Clinical Procedure & Intervention' },
                    { value: 'BED_CHARGES', label: 'Inpatient Bed & Room Charges' },
                    { value: 'NURSING', label: 'Nursing Care & Inpatient Monitoring' },
                    { value: 'BED_SUPPORT', label: 'RMO Rounds & Bed Support Charges' },
                    { value: 'CONSULTATION', label: 'Doctor Consultation & Specialist Review' },
                    { value: 'DIAGNOSTICS', label: 'Laboratory & Diagnostic Testing' },
                    { value: 'PHARMACY', label: 'Pharmacy & Medical Consumables' },
                  ]}
                />

                <Md3TextField
                  label="Charge Item Description *"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3TextField
                    label="Quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <Md3TextField
                    label="Unit Price (₹) *"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                {price && (
                  <div style={{ background: 'var(--md-sys-color-surface-container-low)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Line Item Total:</span>
                    <span style={{ fontWeight: 800, color: 'var(--md-sys-color-primary)', fontSize: '1rem' }}>
                      {CURRENCY_SYMBOL}{((Number(quantity) || 1) * (Number(price) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <Md3Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  loading={submitting}
                  style={{ height: '46px', marginTop: '6px' }}
                >
                  <span className="material-symbols-rounded">post_add</span>
                  <span>Attach Charge to Bill</span>
                </Md3Button>
              </form>
            </PermissionGate>
          </div>

          {/* Right: Bill line items table */}
          <div style={{ background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)' }}>receipt</span>
              <span>Account Ledger Items ({bill.lineItems?.length || 0})</span>
            </h4>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <th style={{ padding: '10px 12px' }}>Category</th>
                    <th style={{ padding: '10px 12px' }}>Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {!bill.lineItems || bill.lineItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                        No charges attached yet. Use the form on the left to add charges.
                      </td>
                    </tr>
                  ) : (
                    bill.lineItems.map((item, idx) => (
                      <tr key={item._id || idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700, background: 'var(--md-sys-color-surface-container-high)' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.description}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{CURRENCY_SYMBOL}{item.snapshotPrice}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                          {CURRENCY_SYMBOL}{item.lineTotal}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {bill.lineItems?.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', padding: '10px 0', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Total Attached Charges:</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>{CURRENCY_SYMBOL}{bill.billedAmount || 0}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-lowest)', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '44px', opacity: 0.5 }}>receipt_long</span>
          <h4>No Account Selected</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Select an open patient account above or pick a patient from the Live Billing Queue.
          </p>
        </div>
      )}
    </div>
  );
};

export default BillingChargesView;
