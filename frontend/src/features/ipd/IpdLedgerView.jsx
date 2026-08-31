/**
 * features/ipd/IpdLedgerView.jsx
 * Inpatient Running Financial Ledger, Advance Deposit Collection & 3-Way Clearance Kanban.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import ipdApi from '../../services/ipdApi';

export const IpdLedgerView = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();

  const [admissionList, setAdmissionList] = useState([]);
  const [ledgerData, setLedgerData] = useState(null);
  const [clearanceData, setClearanceData] = useState(null);
  const [gatePassData, setGatePassData] = useState(null);
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Deposit Modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [txnRef, setTxnRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
        const list = res.data?.data || [];
        setAdmissionList(list);
        if (!admissionId && list.length > 0) {
          navigate(`/dashboard/ipd/billing/${list[0]._id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load active admissions:', err);
      }
    };
    fetchAdmissions();
  }, [admissionId, navigate]);

  const loadLedger = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const [ledRes, clrRes] = await Promise.all([
        ipdApi.getRunningLedger(admissionId),
        ipdApi.getClearanceStatus(admissionId).catch(() => ({ data: { data: null } })),
      ]);

      setLedgerData(ledRes.data?.data || null);
      setClearanceData(clrRes.data?.data || null);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load inpatient ledger:', err);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [admissionId]);

  // Record Deposit
  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    try {
      await ipdApi.recordAdvanceDeposit(admissionId, {
        amount: parseFloat(depositAmount),
        paymentMethod,
        transactionReference: txnRef,
        notes: depositNotes,
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setTxnRef('');
      setDepositNotes('');
      loadLedger();
      alert('Advance deposit recorded successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record deposit');
    }
  };

  // Ingest Daily Charges
  const handleIngestCharges = async () => {
    try {
      const res = await ipdApi.ingestDailyCharges(admissionId);
      alert(`Daily IPD charges ingested: ${res.data?.data?.chargesAdded} items added (₹${res.data?.data?.amountAdded})`);
      loadLedger();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to ingest daily charges');
    }
  };

  // 3-way Clearance Handlers
  const handleMarkClearance = async (dept, payload) => {
    try {
      await ipdApi.markClearance(admissionId, dept, payload);
      loadLedger();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to mark ${dept} clearance`);
    }
  };

  const handleFinalizeDischarge = async () => {
    try {
      const res = await ipdApi.finalizeDischarge(admissionId);
      alert('Discharge finalized! Official Gate Pass generated.');
      loadLedger();
      // Fetch Gate Pass
      const gpRes = await ipdApi.getGatePass(admissionId);
      setGatePassData(gpRes.data?.data || null);
      setShowGatePassModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize discharge');
    }
  };

  const handleViewGatePass = async () => {
    try {
      const gpRes = await ipdApi.getGatePass(admissionId);
      setGatePassData(gpRes.data?.data || null);
      setShowGatePassModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch Gate Pass');
    }
  };

  if (!admissionId && admissionList.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--md-sys-color-outline)' }}>
        No active inpatient admissions found.
      </div>
    );
  }

  const summary = ledgerData?.financialSummary || {
    totalBilled: 0,
    totalAdvanceDeposited: 0,
    outstandingDue: 0,
    excessCredit: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Top Header & Patient Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Inpatient Financial Ledger & Clearance Desk
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Live Inpatient Bill Accumulator • Advance Deposit Collection • 3-Way Discharge Clearance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '260px' }}>
            <Md3Select
              label="Select Inpatient"
              value={admissionId || ''}
              onChange={(e) => navigate(`/dashboard/ipd/billing/${e.target.value}`)}
            >
              {admissionList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.patientId?.firstName} {a.patientId?.lastName} (Bed: {a.currentBedId?.bedNumber || '—'})
                </option>
              ))}
            </Md3Select>
          </div>

          <Md3Button variant="tonal" onClick={handleIngestCharges}>
            + Ingest Today's Room & Care Charges
          </Md3Button>

          <Md3Button variant="filled" onClick={() => setShowDepositModal(true)}>
            + Collect Advance Deposit
          </Md3Button>
        </div>
      </div>

      {/* Patient Banner */}
      {ledgerData?.admission && <IpdPatientBanner admission={ledgerData.admission} />}

      {/* Financial KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
            Total Charges Billed
          </span>
          <strong style={{ fontSize: '1.6rem', color: 'var(--md-sys-color-on-surface)' }}>
            ₹{summary.totalBilled?.toLocaleString('en-IN') || 0}
          </strong>
        </div>

        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
            Advance Deposits Collected
          </span>
          <strong style={{ fontSize: '1.6rem', color: 'var(--md-sys-color-primary, #006a57)' }}>
            ₹{summary.totalAdvanceDeposited?.toLocaleString('en-IN') || 0}
          </strong>
        </div>

        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
            Outstanding Balance Due
          </span>
          <strong
            style={{
              fontSize: '1.6rem',
              color: summary.outstandingDue > 0 ? 'var(--md-sys-color-error, #ba1a1a)' : 'var(--md-sys-color-primary, #006a57)',
            }}
          >
            ₹{summary.outstandingDue?.toLocaleString('en-IN') || 0}
          </strong>
        </div>
      </div>

      {/* Running Ledger Line Items Table */}
      <div
        style={{
          background: 'var(--md-sys-color-surface, #ffffff)',
          border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Inpatient Running Tariff Line Items</h3>
        {(!ledgerData?.lineItems || ledgerData.lineItems.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
            No billable line items accumulated yet. Click "+ Ingest Today's Room & Care Charges".
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Item Description</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Rate (₹)</th>
                  <th style={{ padding: '10px' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.lineItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{item.description || item.name}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          background: 'var(--md-sys-color-surface-container-highest)',
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>₹{item.snapshotPrice || item.rate}</td>
                    <td style={{ padding: '10px' }}>{item.quantity || 1}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                      ₹{item.lineTotal || item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3-Way Discharge Clearance Kanban */}
      {clearanceData && (
        <DischargeKanban
          clearance={clearanceData}
          admission={ledgerData?.admission}
          onMarkClearance={handleMarkClearance}
          onFinalizeDischarge={handleFinalizeDischarge}
          onViewGatePass={handleViewGatePass}
        />
      )}

      {/* Advance Deposit Collection Modal */}
      {showDepositModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDepositModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>Collect Inpatient Advance Deposit</h3>
            <form onSubmit={handleSaveDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Md3TextField
                label="Deposit Amount (₹) *"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 15000"
                required
              />

              <Md3Select
                label="Payment Method *"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="INSURANCE_TPA">Insurance / TPA</option>
              </Md3Select>

              <Md3TextField
                label="Transaction Reference / Txn ID"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                placeholder="e.g. UPI Ref # 91028301"
              />

              <Md3TextField
                label="Cashier Remarks"
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="e.g. Received advance on Day 2"
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Md3Button variant="outlined" type="button" onClick={() => setShowDepositModal(false)}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit">
                  Generate Receipt & Collect
                </Md3Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Gate Pass Modal */}
      {showGatePassModal && gatePassData && (
        <GatePassPrintable
          gatePassData={gatePassData}
          onClose={() => setShowGatePassModal(false)}
        />
      )}
    </div>
  );
};

export default IpdLedgerView;
