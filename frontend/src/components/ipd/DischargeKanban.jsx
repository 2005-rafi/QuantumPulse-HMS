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
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            3-Way Departmental Discharge Clearance
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Mandatory Pharmacy, Ward Nursing, and Billing Sign-Offs
          </span>
        </div>

        {clearance.gatePassIssued ? (
          <span className="clinical-status-pill clinical-status-pill--ready">
            <span className="material-symbols-rounded">verified</span>
            Gate Pass: {clearance.gatePassNumber}
          </span>
        ) : null}
      </div>

      {/* 3 Clearance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* 1. Pharmacy Clearance */}
        <div
          style={{
            border: `1px solid ${pharm.isCleared ? 'var(--md-sys-color-primary, #6750a4)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '10px',
            padding: '12px',
            background: pharm.isCleared ? 'color-mix(in srgb, var(--md-sys-color-primary-container, #eaddff) 25%, transparent)' : 'var(--md-sys-color-surface-container-low, #f7f2fa)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>local_pharmacy</span>
              <strong style={{ fontSize: '0.84rem', color: 'var(--md-sys-color-on-surface)' }}>1. Pharmacy Clearance</strong>
            </div>
            {pharm.isCleared ? (
              <span className="clinical-status-pill clinical-status-pill--completed">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : (
              <span className="clinical-status-pill" style={{ color: 'var(--md-sys-color-error)', background: 'var(--md-sys-color-error-container)' }}>
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0, lineHeight: 1.35 }}>
            Reconcile unconsumed ward medications and return unused items to central inventory.
          </p>

          {pharm.isCleared ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>badge</span>
              Cleared by {pharm.clearedBy?.firstName || 'Pharmacist'} ({new Date(pharm.clearedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
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
            border: `1px solid ${nurse.isCleared ? 'var(--md-sys-color-primary, #6750a4)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '10px',
            padding: '12px',
            background: nurse.isCleared ? 'color-mix(in srgb, var(--md-sys-color-primary-container, #eaddff) 25%, transparent)' : 'var(--md-sys-color-surface-container-low, #f7f2fa)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>medical_services</span>
              <strong style={{ fontSize: '0.84rem', color: 'var(--md-sys-color-on-surface)' }}>2. Ward Nursing Clearance</strong>
            </div>
            {nurse.isCleared ? (
              <span className="clinical-status-pill clinical-status-pill--completed">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : (
              <span className="clinical-status-pill" style={{ color: 'var(--md-sys-color-error)', background: 'var(--md-sys-color-error-container)' }}>
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0, lineHeight: 1.35 }}>
            Remove IV cannula, Foley catheter, check stable vitals, and hand over discharge summary.
          </p>

          {nurse.isCleared ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>badge</span>
              Cleared by {nurse.clearedBy?.firstName || 'Nurse'} ({new Date(nurse.clearedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
            </div>
          ) : (
            <>
              <label style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cannulaRemoved}
                  onChange={(e) => setCannulaRemoved(e.target.checked)}
                />
                IV Cannula &amp; Lines Removed
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
            border: `1px solid ${bill.isCleared ? 'var(--md-sys-color-primary, #6750a4)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: '10px',
            padding: '12px',
            background: bill.isCleared ? 'color-mix(in srgb, var(--md-sys-color-primary-container, #eaddff) 25%, transparent)' : 'var(--md-sys-color-surface-container-low, #f7f2fa)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>receipt_long</span>
              <strong style={{ fontSize: '0.84rem', color: 'var(--md-sys-color-on-surface)' }}>3. Billing Clearance</strong>
            </div>
            {bill.isCleared ? (
              <span className="clinical-status-pill clinical-status-pill--completed">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : (
              <span className="clinical-status-pill" style={{ color: 'var(--md-sys-color-error)', background: 'var(--md-sys-color-error-container)' }}>
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0, lineHeight: 1.35 }}>
            Audit all daily room rents, pharmacy line items, doctor fees, and collect balance dues.
          </p>

          {bill.isCleared ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>badge</span>
              Cleared by {bill.clearedBy?.firstName || 'Cashier'} ({new Date(bill.clearedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
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
          background: 'var(--md-sys-color-surface-container, #f3edf7)',
          border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--md-sys-color-primary-container, #eaddff)',
              color: 'var(--md-sys-color-primary, #6750a4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>exit_to_app</span>
          </div>
          <div>
            <strong style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>Hospital Gate Pass Authorization</strong>
            <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {clearance.gatePassIssued
                ? `Gate Pass #${clearance.gatePassNumber} issued on ${new Date(clearance.gatePassGeneratedAt).toLocaleString('en-IN')}`
                : isAllCleared
                ? 'All 3 departmental clearances completed! Ready for Gate Pass generation.'
                : 'Requires all 3 departmental clearances before Gate Pass can be authorized.'}
            </div>
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
