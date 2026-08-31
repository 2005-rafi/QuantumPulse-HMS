/**
 * components/ipd/DischargeKanban.jsx
 * 3-Way Departmental Clearance Kanban (Pharmacy + Nursing + Billing) and Gate Pass Issuer.
 */
import React, { useState } from 'react';
import { Md3Button, Md3TextField } from '../md3/Md3FormComponents';

export const DischargeKanban = ({
  clearance,
  admission,
  onMarkClearance,
  onFinalizeDischarge,
  onViewGatePass,
}) => {
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [nursingNotes, setNursingNotes] = useState('');
  const [cannulaRemoved, setCannulaRemoved] = useState(true);
  const [billingNotes, setBillingNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!clearance) return null;

  const pharm = clearance.pharmacyClearance || {};
  const nurse = clearance.nursingClearance || {};
  const bill = clearance.billingClearance || {};
  const isAllCleared = pharm.isCleared && nurse.isCleared && bill.isCleared;

  const handleClear = async (dept) => {
    setLoading(true);
    let payload = {};
    if (dept === 'PHARMACY') payload = { notes: pharmacyNotes };
    if (dept === 'WARD') payload = { notes: nursingNotes, cannulaRemoved };
    if (dept === 'BILLING') payload = { notes: billingNotes };

    await onMarkClearance(dept, payload);
    setLoading(false);
  };

  const handleFinalize = async () => {
    setLoading(true);
    await onFinalizeDischarge();
    setLoading(false);
  };

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            3-Way Departmental Discharge Clearance
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            Mandatory Pharmacy, Ward Nursing, and Billing Sign-Offs
          </span>
        </div>

        {clearance.gatePassIssued ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '100px',
              fontWeight: 700,
              fontSize: '0.85rem',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
            }}
          >
            Gate Pass: {clearance.gatePassNumber}
          </span>
        ) : null}
      </div>

      {/* 3 Clearance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* 1. Pharmacy Clearance */}
        <div
          style={{
            border: `1.5px solid ${pharm.isCleared ? 'var(--md-sys-color-primary, #006a57)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '14px',
            padding: '16px',
            background: pharm.isCleared ? 'rgba(0, 106, 87, 0.03)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>1. Pharmacy Clearance</strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: pharm.isCleared ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)',
              }}
            >
              {pharm.isCleared ? '✓ CLEARED' : '● PENDING'}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', margin: 0 }}>
            Reconcile unconsumed ward medications and return unused items to central inventory.
          </p>

          {pharm.isCleared ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
              Cleared by {pharm.clearedBy?.firstName || 'Pharmacist'} ({new Date(pharm.clearedAt).toLocaleTimeString('en-IN')})
            </div>
          ) : (
            <>
              <Md3TextField
                label="Pharmacy Notes"
                value={pharmacyNotes}
                onChange={(e) => setPharmacyNotes(e.target.value)}
                placeholder="e.g. All floor stock returned"
              />
              <Md3Button variant="filled" size="small" onClick={() => handleClear('PHARMACY')} disabled={loading}>
                Sign Pharmacy Clearance
              </Md3Button>
            </>
          )}
        </div>

        {/* 2. Ward Nursing Clearance */}
        <div
          style={{
            border: `1.5px solid ${nurse.isCleared ? 'var(--md-sys-color-primary, #006a57)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '14px',
            padding: '16px',
            background: nurse.isCleared ? 'rgba(0, 106, 87, 0.03)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>2. Ward Nursing Clearance</strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: nurse.isCleared ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)',
              }}
            >
              {nurse.isCleared ? '✓ CLEARED' : '● PENDING'}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', margin: 0 }}>
            Remove IV cannula, Foley catheter, check stable vitals, and hand over discharge summary.
          </p>

          {nurse.isCleared ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
              Cleared by {nurse.clearedBy?.firstName || 'Nurse'} ({new Date(nurse.clearedAt).toLocaleTimeString('en-IN')})
            </div>
          ) : (
            <>
              <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={cannulaRemoved}
                  onChange={(e) => setCannulaRemoved(e.target.checked)}
                />
                IV Cannula & Lines Removed
              </label>
              <Md3TextField
                label="Nursing Notes"
                value={nursingNotes}
                onChange={(e) => setNursingNotes(e.target.value)}
                placeholder="e.g. Discharge summary handed over"
              />
              <Md3Button variant="filled" size="small" onClick={() => handleClear('WARD')} disabled={loading}>
                Sign Nursing Clearance
              </Md3Button>
            </>
          )}
        </div>

        {/* 3. Billing & Cashier Clearance */}
        <div
          style={{
            border: `1.5px solid ${bill.isCleared ? 'var(--md-sys-color-primary, #006a57)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '14px',
            padding: '16px',
            background: bill.isCleared ? 'rgba(0, 106, 87, 0.03)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>3. Billing Clearance</strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: bill.isCleared ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)',
              }}
            >
              {bill.isCleared ? '✓ CLEARED' : '● PENDING'}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', margin: 0 }}>
            Audit all daily room rents, pharmacy line items, doctor fees, and collect balance dues.
          </p>

          {bill.isCleared ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
              Cleared by {bill.clearedBy?.firstName || 'Cashier'} ({new Date(bill.clearedAt).toLocaleTimeString('en-IN')})
            </div>
          ) : (
            <>
              <Md3TextField
                label="Billing Notes"
                value={billingNotes}
                onChange={(e) => setBillingNotes(e.target.value)}
                placeholder="e.g. All charges settled in full"
              />
              <Md3Button variant="filled" size="small" onClick={() => handleClear('BILLING')} disabled={loading}>
                Sign Billing Clearance
              </Md3Button>
            </>
          )}
        </div>
      </div>

      {/* Gate Pass Issue Banner */}
      <div
        style={{
          background: 'var(--md-sys-color-surface-container, #f0f5f2)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <strong style={{ fontSize: '1rem' }}>Hospital Gate Pass Authorization</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            {clearance.gatePassIssued
              ? `Gate Pass #${clearance.gatePassNumber} issued on ${new Date(clearance.gatePassGeneratedAt).toLocaleString('en-IN')}`
              : isAllCleared
              ? 'All 3 departmental clearances completed! Ready for Gate Pass generation.'
              : 'Requires all 3 departmental clearances before Gate Pass can be authorized.'}
          </div>
        </div>

        {clearance.gatePassIssued ? (
          <Md3Button variant="filled" onClick={onViewGatePass}>
            Print / View Gate Pass
          </Md3Button>
        ) : (
          <Md3Button variant="filled" onClick={handleFinalize} disabled={!isAllCleared || loading}>
            {loading ? 'Issuing...' : 'Finalize & Issue Gate Pass'}
          </Md3Button>
        )}
      </div>
    </div>
  );
};

export default DischargeKanban;
