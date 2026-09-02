import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import { Md3BedComfortBadge } from '../../components/md3/Md3BedComfortBadge';
import { CURRENCY_SYMBOL } from '../../constants/currency';
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
  const [depositType, setDepositType] = useState('INTERIM_TOP_UP');

  // Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementDiscount, setSettlementDiscount] = useState('0');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState('UPI');
  const [settlementTxnRef, setSettlementTxnRef] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);
  const [settling, setSettling] = useState(false);

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
        depositType,
        transactionReference: txnRef,
        notes: depositNotes,
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setTxnRef('');
      setDepositNotes('');
      loadLedger();
      alert('Advance deposit voucher generated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record deposit');
    }
  };

  // Finalize Settlement
  const handleFinalizeSettlement = async (e) => {
    e.preventDefault();
    setSettling(true);
    try {
      const summary = ledgerData?.financialSummary || {};
      const discount = parseFloat(settlementDiscount || 0);
      const netPayable = Math.max(0, summary.totalGrossBilled - discount);
      const totalDeposits = summary.totalAdvanceDeposited || 0;
      const outstandingDue = Math.max(0, netPayable - totalDeposits);

      const payload = {
        discountAmount: discount,
        issueRefund,
      };

      if (outstandingDue > 0) {
        payload.payment = {
          method: settlementPaymentMethod,
          reference: settlementTxnRef,
        };
      }

      await ipdApi.finalizeSettlement(admissionId, payload);
      setShowSettlementModal(false);
      loadLedger();
      alert('Inpatient bill settled and finalized successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize settlement');
    } finally {
      setSettling(false);
    }
  };

  // Ingest Daily Charges
  const handleIngestCharges = async () => {
    try {
      const res = await ipdApi.ingestDailyCharges(admissionId);
      alert(`Daily IPD charges ingested: ${res.data?.data?.chargesAdded} items added (${CURRENCY_SYMBOL}${res.data?.data?.amountAdded})`);
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
      await ipdApi.finalizeDischarge(admissionId);
      alert('Discharge finalized! Official Gate Pass generated.');
      loadLedger();
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
    totalGrossBilled: 0,
    bedStayCharges: 0,
    totalStayHours: 0,
    totalAdvanceDeposited: 0,
    outstandingDue: 0,
    excessCredit: 0,
  };

  const bedSegments = ledgerData?.bedChargesData?.segments || [];
  const deposits = ledgerData?.deposits || [];
  const breakdown = ledgerData?.categoryBreakdown || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Top Header & Patient Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Inpatient Financial Ledger & Tariff Desk
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Live Stay Accumulator • Advance Deposit Collection • 3-Way Discharge Clearance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
            + Ingest Routine Care Charges
          </Md3Button>

          <Md3Button variant="filled" onClick={() => setShowDepositModal(true)}>
            + Collect Advance Deposit
          </Md3Button>

          {summary.status !== 'FINALIZED' && (
            <Md3Button variant="primary" style={{ background: '#006a57', color: '#ffffff' }} onClick={() => setShowSettlementModal(true)}>
              Final Settlement & Closure
            </Md3Button>
          )}
        </div>
      </div>

      {/* Patient Banner */}
      {ledgerData?.admission && <IpdPatientBanner admission={ledgerData.admission} />}

      {/* Financial KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
            Gross Inpatient Charges
          </span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--md-sys-color-on-surface)' }}>
            {CURRENCY_SYMBOL}{summary.totalGrossBilled?.toLocaleString('en-IN') || 0}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', display: 'block', marginTop: '2px' }}>
            Live Bed: {CURRENCY_SYMBOL}{summary.bedStayCharges?.toLocaleString('en-IN') || 0} ({summary.totalStayHours || 0} hrs)
          </span>
        </div>

        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
            Advance Deposits Held
          </span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--md-sys-color-primary, #006a57)' }}>
            {CURRENCY_SYMBOL}{summary.totalAdvanceDeposited?.toLocaleString('en-IN') || 0}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', display: 'block', marginTop: '2px' }}>
            {deposits.length} Deposit Receipts
          </span>
        </div>

        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
            Outstanding Due
          </span>
          <strong style={{ fontSize: '1.5rem', color: summary.outstandingDue > 0 ? 'var(--md-sys-color-error, #ba1a1a)' : '#2e7d32' }}>
            {CURRENCY_SYMBOL}{summary.outstandingDue?.toLocaleString('en-IN') || 0}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', display: 'block', marginTop: '2px' }}>
            {summary.excessCredit > 0 ? `Excess Refundable: ${CURRENCY_SYMBOL}${summary.excessCredit}` : 'Payable at discharge'}
          </span>
        </div>

        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
            Ledger Status
          </span>
          <strong style={{ fontSize: '1.3rem', color: summary.status === 'FINALIZED' ? '#2e7d32' : '#b45309' }}>
            {summary.status}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', display: 'block', marginTop: '2px' }}>
            Bill #{ledgerData?.bill?.billNumber || 'PENDING'}
          </span>
        </div>
      </div>

      {/* Multi-Bed Stay Segmentation Timeline */}
      <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)' }}>hotel</span>
            Bed Stay Occupancy & Transfer Timeline
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            Total Stay: {summary.totalStayHours || 0} hours
          </span>
        </div>

        {bedSegments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--md-sys-color-outline)' }}>
            No bed allocation records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Bed & Location</th>
                  <th style={{ padding: '8px 10px' }}>Comfort Tier</th>
                  <th style={{ padding: '8px 10px' }}>Allocated Interval</th>
                  <th style={{ padding: '8px 10px' }}>Duration</th>
                  <th style={{ padding: '8px 10px' }}>Daily / Hourly Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Calculated Charge</th>
                </tr>
              </thead>
              <tbody>
                {bedSegments.map((seg, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{seg.bedLabel}</strong> ({seg.bedNumber})
                      <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                        {seg.wardClass} • {seg.floorName}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Md3BedComfortBadge tier={seg.comfortTier} size="small" />
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.8rem' }}>
                      <div>From: {new Date(seg.allocatedFrom).toLocaleString()}</div>
                      <div style={{ color: seg.isActive ? '#006a57' : 'var(--md-sys-color-outline)', fontWeight: seg.isActive ? 700 : 400 }}>
                        {seg.isActive ? 'Active (Current)' : `To: ${new Date(seg.allocatedTo).toLocaleString()}`}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <strong>{seg.fullDays}d {seg.billableRemainingHours}h</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>
                        ({seg.totalHoursFormatted} hrs)
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {CURRENCY_SYMBOL}{seg.dailyRate}/d • {CURRENCY_SYMBOL}{seg.hourlyRate}/hr
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>
                      {CURRENCY_SYMBOL}{seg.segmentAmount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdown & Line Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Category Breakdown */}
        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 700 }}>Charge Distribution by Category</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <span>Bed & Room Stay Charges</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.BED_CHARGES || summary.bedStayCharges || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <span>Pharmacy & Medications</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.PHARMACY || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <span>Lab & Diagnostics</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.DIAGNOSTICS || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <span>Procedures & Nursing Care</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.PROCEDURE || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <span>Doctor Rounds & Consultations</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.CONSULTATION || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Advance Deposit Receipts Table */}
        <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Advance Deposit Ledger</h3>
            <Md3Button variant="tonal" onClick={() => setShowDepositModal(true)}>
              + Add Deposit
            </Md3Button>
          </div>

          {deposits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)' }}>
              No advance deposits recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Receipt #</th>
                    <th style={{ padding: '6px' }}>Type / Mode</th>
                    <th style={{ padding: '6px' }}>Date</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((dep, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{dep.receiptNumber}</td>
                      <td style={{ padding: '6px' }}>
                        {dep.depositType} ({dep.paymentMethod})
                      </td>
                      <td style={{ padding: '6px', color: 'var(--md-sys-color-outline)' }}>
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#006a57' }}>
                        {CURRENCY_SYMBOL}{dep.amount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Running Ledger Line Items Table */}
      <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Inpatient Clinical Service Line Items</h3>
        {(!ledgerData?.lineItems || ledgerData.lineItems.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
            No billable line items accumulated yet. Click "+ Ingest Routine Care Charges".
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Item Description</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Rate</th>
                  <th style={{ padding: '10px' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.lineItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{item.description || item.name}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', background: 'var(--md-sys-color-surface-container-highest)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>{CURRENCY_SYMBOL}{item.snapshotPrice || item.rate}</td>
                    <td style={{ padding: '10px' }}>{item.quantity || 1}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                      {CURRENCY_SYMBOL}{item.lineTotal || item.amount}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDepositModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>Collect Inpatient Advance Deposit</h3>
            <form onSubmit={handleSaveDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Md3Select
                label="Deposit Purpose / Type *"
                value={depositType}
                onChange={(e) => setDepositType(e.target.value)}
              >
                <option value="INTERIM_TOP_UP">Interim Top-Up Deposit</option>
                <option value="ADMISSION_ADVANCE">Initial Admission Advance</option>
                <option value="SURGERY_ADVANCE">OT / Surgery Advance</option>
                <option value="EMERGENCY_DEPOSIT">Emergency Stabilization Deposit</option>
              </Md3Select>

              <Md3TextField
                label={`Deposit Amount (${CURRENCY_SYMBOL}) *`}
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
                placeholder="e.g. Received advance top-up"
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

      {/* Final Settlement & Closure Modal */}
      {showSettlementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowSettlementModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '520px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800 }}>Final IPD Bill Settlement & Ledger Closure</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--md-sys-color-outline)' }}>
              Computes all live bed occupancy charges across transfers, deducts advance deposits, and closes the bill.
            </p>

            <form onSubmit={handleFinalizeSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '14px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Gross Total Charges:</span>
                  <strong>{CURRENCY_SYMBOL}{summary.totalGrossBilled?.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Total Advance Deposits Held:</span>
                  <strong style={{ color: '#006a57' }}>-{CURRENCY_SYMBOL}{summary.totalAdvanceDeposited?.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', paddingTop: '6px', fontSize: '1rem' }}>
                  <span>Net Balance Due:</span>
                  <strong style={{ color: summary.outstandingDue > 0 ? 'var(--md-sys-color-error, #ba1a1a)' : '#2e7d32' }}>
                    {CURRENCY_SYMBOL}{summary.outstandingDue?.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {summary.outstandingDue > 0 && (
                <>
                  <Md3Select
                    label="Settlement Payment Method *"
                    value={settlementPaymentMethod}
                    onChange={(e) => setSettlementPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="INSURANCE_TPA">Insurance / TPA</option>
                  </Md3Select>

                  <Md3TextField
                    label="Transaction Reference / Txn ID"
                    value={settlementTxnRef}
                    onChange={(e) => setSettlementTxnRef(e.target.value)}
                    placeholder="e.g. Card Auth Code 891023"
                  />
                </>
              )}

              {summary.excessCredit > 0 && (
                <div style={{ padding: '10px 14px', background: '#e0f2fe', borderRadius: '8px', color: '#0369a1', fontSize: '0.85rem' }}>
                  <strong>Excess Advance Refund: {CURRENCY_SYMBOL}{summary.excessCredit}</strong>
                  <div style={{ marginTop: '4px' }}>An approved refund adjustment will be recorded in the final bill.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Md3Button variant="outlined" type="button" onClick={() => setShowSettlementModal(false)} disabled={settling}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" disabled={settling}>
                  {settling ? 'Settling Bill...' : 'Confirm Settlement & Finalize'}
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

