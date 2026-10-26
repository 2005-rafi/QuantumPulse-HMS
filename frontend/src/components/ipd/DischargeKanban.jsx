/**
 * components/ipd/DischargeKanban.jsx
 * 3-Way Departmental Clearance Kanban (Pharmacy + Nursing + Billing) and Gate Pass Issuer.
 * Enterprise Material 3 styling with clean visual hierarchy.
 */
import React, { useState } from 'react';
import { Md3Button, Md3TextField } from '../md3/Md3FormComponents';

export const DischargeKanban = ({
  clearance,
  admission,
  onMarkClearance,
  onFinalizeDischarge,
  onViewGatePass,
  onRefresh,
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
  const fin = clearance.financialSummary || {};
  const outstandingAmount = fin.outstandingDue != null ? fin.outstandingDue : (bill.balanceDue || 0);
  const totalGross = fin.totalGrossBilled != null ? fin.totalGrossBilled : (bill.totalBilled || 0);
  const totalPaid = fin.totalCollected != null
    ? fin.totalCollected
    : (bill.totalCollected != null ? bill.totalCollected : (fin.totalAdvanceDeposited || 0));
  const hasOutstandingDue = outstandingAmount > 0;
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
    <div className="md3-kanban-container">
      <div className="md3-kanban-header">
        <div className="md3-kanban-title-group">
          <div className="md3-kanban-title-icon">
            <span className="material-symbols-rounded">door_front</span>
          </div>
          <div>
            <h3 className="md3-kanban-title">3-Way Departmental Discharge Clearance</h3>
            <p className="md3-kanban-subtitle">Mandatory Pharmacy, Ward Nursing, and Billing Sign-Offs</p>
          </div>
        </div>

        {clearance.gatePassIssued ? (
          <span className="md3-kanban-status-badge ready">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>verified</span>
            <span>Gate Pass: {clearance.gatePassNumber}</span>
          </span>
        ) : isAllCleared && !hasOutstandingDue ? (
          <span className="md3-kanban-status-badge ready">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span>
            <span>Ready for Gate Pass</span>
          </span>
        ) : (
          <span className="md3-kanban-status-badge pending">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>pending_actions</span>
            <span>Clearance in Progress</span>
          </span>
        )}
      </div>

      {/* 3 Clearance Cards */}
      <div className="md3-kanban-grid">
        {/* 1. Pharmacy Clearance */}
        <div className={`md3-kanban-card ${pharm.isCleared ? 'cleared' : 'pending'}`}>
          <div className="md3-kanban-card-top">
            <div className="md3-kanban-card-title">
              <span className="material-symbols-rounded icon-dept">local_pharmacy</span>
              <span>1. Pharmacy Clearance</span>
            </div>
            {pharm.isCleared ? (
              <span className="md3-kanban-card-badge cleared">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : (
              <span className="md3-kanban-card-badge pending">
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p className="md3-kanban-card-desc">
            Reconcile unconsumed ward medications and return unused items to central inventory.
          </p>

          <div className="md3-kanban-card-action-zone">
            {pharm.isCleared ? (
              <div className="md3-kanban-cleared-info">
                <span className="material-symbols-rounded">badge</span>
                <span>Cleared by {pharm.clearedBy?.firstName || 'Pharmacist'} ({new Date(pharm.clearedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</span>
              </div>
            ) : (
              <div className="md3-kanban-form-group">
                <Md3TextField
                  label="Pharmacy Notes"
                  value={pharmacyNotes}
                  onChange={(e) => setPharmacyNotes(e.target.value)}
                  placeholder="e.g. All floor stock returned"
                />
                <Md3Button variant="filled" size="small" onClick={() => handleClear('PHARMACY')} disabled={loading}>
                  Sign Pharmacy Clearance
                </Md3Button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Ward Nursing Clearance */}
        <div className={`md3-kanban-card ${nurse.isCleared ? 'cleared' : 'pending'}`}>
          <div className="md3-kanban-card-top">
            <div className="md3-kanban-card-title">
              <span className="material-symbols-rounded icon-dept">medical_services</span>
              <span>2. Ward Nursing Clearance</span>
            </div>
            {nurse.isCleared ? (
              <span className="md3-kanban-card-badge cleared">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : (
              <span className="md3-kanban-card-badge pending">
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p className="md3-kanban-card-desc">
            Remove IV cannula, Foley catheter, check stable vitals, and hand over discharge summary.
          </p>

          <div className="md3-kanban-card-action-zone">
            {nurse.isCleared ? (
              <div className="md3-kanban-cleared-info">
                <span className="material-symbols-rounded">badge</span>
                <span>Cleared by {nurse.clearedBy?.firstName || 'Nurse'} ({new Date(nurse.clearedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</span>
              </div>
            ) : (
              <div className="md3-kanban-form-group">
                <label className="md3-kanban-checkbox-label">
                  <input
                    type="checkbox"
                    checked={cannulaRemoved}
                    onChange={(e) => setCannulaRemoved(e.target.checked)}
                  />
                  <span>IV Cannula &amp; Lines Removed</span>
                </label>
                <Md3TextField
                  label="Nursing Notes"
                  value={nursingNotes}
                  onChange={(e) => setNursingNotes(e.target.value)}
                  placeholder="e.g. Summary handed over"
                />
                <Md3Button variant="filled" size="small" onClick={() => handleClear('WARD')} disabled={loading}>
                  Sign Nursing Clearance
                </Md3Button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Billing & Cashier Clearance */}
        <div className={`md3-kanban-card ${bill.isCleared ? 'cleared' : 'pending'}`}>
          <div className="md3-kanban-card-top">
            <div className="md3-kanban-card-title">
              <span className="material-symbols-rounded icon-dept">receipt_long</span>
              <span>3. Billing Clearance</span>
            </div>
            {bill.isCleared ? (
              <span className="md3-kanban-card-badge cleared">
                <span className="material-symbols-rounded">check_circle</span> Cleared
              </span>
            ) : hasOutstandingDue ? (
              <span className="md3-kanban-card-badge pending" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}>
                <span className="material-symbols-rounded">payment</span> Due: ₹{outstandingAmount.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="md3-kanban-card-badge pending">
                <span className="material-symbols-rounded">pending</span> Pending
              </span>
            )}
          </div>

          <p className="md3-kanban-card-desc">
            Audit all consumed bed occupancy, pharmacy, diagnostic, and doctor fees, ensuring zero outstanding dues.
          </p>

          <div className="md3-kanban-card-action-zone">
            {bill.isCleared ? (
              <div className="md3-kanban-cleared-info">
                <span className="material-symbols-rounded">verified</span>
                <div>
                  <strong>System Verified — Settled</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {bill.notes || 'All consumed charges settled in full'}
                    {bill.clearedBy?.firstName && ` • Cleared by ${bill.clearedBy.firstName}`}
                  </div>
                </div>
              </div>
            ) : hasOutstandingDue ? (
              <div className="md3-kanban-financial-block alert">
                <div className="md3-kanban-fin-due-strip">
                  <span className="material-symbols-rounded" style={{ color: '#b91c1c', fontSize: '20px' }}>warning</span>
                  <div>
                    <div className="md3-kanban-fin-due-title">Unsettled Consumed Charges</div>
                    <div className="md3-kanban-fin-metrics">
                      <span>Total: ₹{totalGross.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>Collected: ₹{totalPaid.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <strong style={{ color: '#b91c1c' }}>Due: ₹{outstandingAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                <p className="md3-kanban-fin-instruction">
                  System Verification Required: Patient must pay consumed charges before billing clearance is granted.
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <a
                    href={`/dashboard/billing?admissionId=${admission?._id || ''}&patientId=${admission?.patientId?._id || admission?.patientId || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="md3-kanban-action-link"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>point_of_sale</span>
                    <span>Open Cashier Billing Desk</span>
                  </a>
                  {onRefresh && (
                    <button
                      type="button"
                      className="md3-kanban-recheck-btn"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await onRefresh();
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      title="Re-check live clearance status"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>sync</span>
                      <span>Re-check Clearance</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="md3-kanban-financial-block cleared">
                <div className="md3-kanban-fin-due-strip" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                  <span className="material-symbols-rounded" style={{ color: '#15803d', fontSize: '18px' }}>check_circle</span>
                  <div>
                    <div className="md3-kanban-fin-due-title" style={{ color: '#15803d' }}>Charges Settled (Zero Balance Due)</div>
                    <div className="md3-kanban-fin-metrics" style={{ color: '#166534' }}>
                      <span>Total Consumed: ₹{totalGross.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>Deposits/Settled: ₹{totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="md3-kanban-form-group" style={{ marginTop: '8px' }}>
                  <Md3TextField
                    label="Billing Notes"
                    value={billingNotes}
                    onChange={(e) => setBillingNotes(e.target.value)}
                    placeholder="e.g. All charges verified and settled"
                  />
                  <Md3Button variant="filled" size="small" onClick={() => handleClear('BILLING')} disabled={loading}>
                    Verify &amp; Sign Billing Clearance
                  </Md3Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gate Pass Issue Banner */}
      <div className="md3-kanban-gatepass-banner">
        <div className="md3-kanban-gatepass-left">
          <div className="md3-kanban-gatepass-icon">
            <span className="material-symbols-rounded">exit_to_app</span>
          </div>
          <div>
            <strong className="md3-kanban-gatepass-title">Hospital Gate Pass Authorization</strong>
            <p className="md3-kanban-gatepass-desc">
              {clearance.gatePassIssued
                ? `Gate Pass #${clearance.gatePassNumber} issued on ${new Date(clearance.gatePassGeneratedAt).toLocaleString('en-IN')}`
                : isAllCleared && !hasOutstandingDue
                ? 'All 3 departmental clearances completed and system-verified! Ready for Gate Pass generation.'
                : hasOutstandingDue
                ? `Requires all 3 departmental clearances (Billing: ₹${outstandingAmount.toLocaleString('en-IN')} pending payment) before Doctor can authorize Gate Pass.`
                : 'Requires all 3 departmental clearances before Gate Pass can be authorized.'}
            </p>
          </div>
        </div>

        <div>
          {clearance.gatePassIssued ? (
            <Md3Button variant="filled" onClick={onViewGatePass}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>print</span>
              <span>Print / View Gate Pass</span>
            </Md3Button>
          ) : (
            <Md3Button variant="filled" onClick={handleFinalize} disabled={!isAllCleared || hasOutstandingDue || loading}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>verified</span>
              <span>{loading ? 'Authorizing...' : 'Authorize & Issue Gate Pass'}</span>
            </Md3Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DischargeKanban;
