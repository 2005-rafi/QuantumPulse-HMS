import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import { Md3BedComfortBadge } from '../../components/md3/Md3BedComfortBadge';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import { usePatientStatus } from '../../context/PatientStatusContext';
import ipdApi from '../../services/ipdApi';
import './IpdLedgerView.css';

export const IpdLedgerView = ({ admissionId: propAdmissionId, embedded = false, onBack = null }) => {
  const { admissionId: routeAdmissionId } = useParams();
  const navigate = useNavigate();
  const { subscribeToLedgerUpdates } = usePatientStatus();

  const [currentAdmissionId, setCurrentAdmissionId] = useState(propAdmissionId || routeAdmissionId || '');
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
    if (propAdmissionId) {
      setCurrentAdmissionId(propAdmissionId);
    } else if (routeAdmissionId) {
      setCurrentAdmissionId(routeAdmissionId);
    }
  }, [propAdmissionId, routeAdmissionId]);

  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
        const list = res.data?.data || [];
        setAdmissionList(list);
        if (!currentAdmissionId && list.length > 0) {
          const firstId = list[0]._id;
          setCurrentAdmissionId(firstId);
          if (!embedded && !propAdmissionId && !routeAdmissionId) {
            navigate(`/dashboard/ipd/billing/${firstId}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to load active admissions:', err);
      }
    };
    fetchAdmissions();
  }, [currentAdmissionId, embedded, propAdmissionId, routeAdmissionId, navigate]);

  const loadLedger = async () => {
    if (!currentAdmissionId) return;
    try {
      setLoading(true);
      const [ledRes, clrRes] = await Promise.all([
        ipdApi.getRunningLedger(currentAdmissionId),
        ipdApi.getClearanceStatus(currentAdmissionId).catch(() => ({ data: { data: null } })),
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
  }, [currentAdmissionId]);

  // Real-Time Reactive Push Synchronization for IPD Financial Ledger & Settlement
  useEffect(() => {
    if (!subscribeToLedgerUpdates) return;
    const unsubscribe = subscribeToLedgerUpdates((payload) => {
      if (!payload) return;
      if (!currentAdmissionId || String(payload.admissionId) === String(currentAdmissionId)) {
        loadLedger();
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentAdmissionId, subscribeToLedgerUpdates]);

  const handlePatientSelect = (e) => {
    const nextId = e.target.value;
    setCurrentAdmissionId(nextId);
    if (!embedded) {
      navigate(`/dashboard/ipd/billing/${nextId}`);
    }
  };

  // Record Deposit
  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !currentAdmissionId) return;
    try {
      await ipdApi.recordAdvanceDeposit(currentAdmissionId, {
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
    if (!currentAdmissionId) return;
    try {
      setSettling(true);
      const payload = {
        discountAmount: parseFloat(settlementDiscount) || 0,
        issueRefundOnExcess: issueRefund,
      };

      if (summary.outstandingDue > 0) {
        payload.paymentMethod = settlementPaymentMethod;
        payload.transactionReference = settlementTxnRef;
      }

      await ipdApi.finalizeSettlement(currentAdmissionId, payload);
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
    if (!currentAdmissionId) return;
    try {
      const res = await ipdApi.ingestDailyCharges(currentAdmissionId);
      alert(`Daily IPD charges ingested: ${res.data?.data?.chargesAdded} items added (${CURRENCY_SYMBOL}${res.data?.data?.amountAdded})`);
      loadLedger();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to ingest daily charges');
    }
  };

  // 3-way Clearance Handlers
  const handleMarkClearance = async (dept, payload) => {
    if (!currentAdmissionId) return;
    try {
      await ipdApi.markClearance(currentAdmissionId, dept, payload);
      loadLedger();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to mark ${dept} clearance`);
    }
  };

  const handleFinalizeDischarge = async () => {
    if (!currentAdmissionId) return;
    try {
      await ipdApi.finalizeDischarge(currentAdmissionId);
      alert('Discharge finalized! Official Gate Pass generated.');
      loadLedger();
      const gpRes = await ipdApi.getGatePass(currentAdmissionId);
      setGatePassData(gpRes.data?.data || null);
      setShowGatePassModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize discharge');
    }
  };

  const handleViewGatePass = async () => {
    if (!currentAdmissionId) return;
    try {
      const gpRes = await ipdApi.getGatePass(currentAdmissionId);
      setGatePassData(gpRes.data?.data || null);
      setShowGatePassModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch Gate Pass');
    }
  };

  if (!currentAdmissionId && admissionList.length === 0) {
    return (
      <div className="ipd-ledger-view">
        {!embedded && (
          <div className="ipd-ledger-rollback-bar">
            <button
              type="button"
              className="ipd-ledger-back-btn"
              onClick={() => (onBack ? onBack() : navigate('/dashboard/administrator/billing'))}
            >
              <span className="material-symbols-rounded">arrow_back</span>
              <span>Back to Admin Billing</span>
            </button>
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
          No active inpatient admissions found.
        </div>
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
    <div className="ipd-ledger-view">
      {/* ── Standalone Rollback Bar ── */}
      {!embedded && (
        <div className="ipd-ledger-rollback-bar">
          <button
            type="button"
            className="ipd-ledger-back-btn"
            onClick={() => (onBack ? onBack() : navigate('/dashboard/administrator/billing'))}
          >
            <span className="material-symbols-rounded">arrow_back</span>
            <span>Back to Admin Billing</span>
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
            Dedicated Inpatient Tariff Desk
          </span>
        </div>
      )}

      {/* Top Header & Patient Switcher */}
      <div className="ipd-ledger-header-card">
        <div className="ipd-ledger-title-group">
          <h2>Inpatient Financial Ledger &amp; Tariff Desk</h2>
        </div>

        <div className="ipd-ledger-actions-bar">
          <div className="ipd-ledger-patient-select">
            <Md3Select
              label="Select Inpatient"
              value={currentAdmissionId || ''}
              onChange={handlePatientSelect}
            >
              {admissionList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.patientId?.firstName} {a.patientId?.lastName} (Bed: {a.currentBedId?.bedNumber || '—'})
                </option>
              ))}
            </Md3Select>
          </div>

          <Md3Button variant="tonal" onClick={handleIngestCharges}>
            <span className="material-symbols-rounded">sync</span>
            <span>Ingest Routine Charges</span>
          </Md3Button>

          <Md3Button variant="filled" onClick={() => setShowDepositModal(true)}>
            <span className="material-symbols-rounded">add_card</span>
            <span>Collect Deposit</span>
          </Md3Button>

          {summary.status !== 'FINALIZED' && (
            <Md3Button variant="primary" style={{ background: '#006a57', color: '#ffffff' }} onClick={() => setShowSettlementModal(true)}>
              <span className="material-symbols-rounded">check_circle</span>
              <span>Final Settlement</span>
            </Md3Button>
          )}
        </div>
      </div>

      {/* Patient Banner */}
      {ledgerData?.admission && <IpdPatientBanner admission={ledgerData.admission} />}

      {/* Financial KPI Summary Cards (4 Columns) */}
      <div className="ipd-ledger-kpis-grid">
        <div className="ipd-ledger-kpi-card">
          <span className="ipd-ledger-kpi-label">Gross Charges</span>
          <strong className="ipd-ledger-kpi-val">
            {CURRENCY_SYMBOL}{summary.totalGrossBilled?.toLocaleString('en-IN') || 0}
          </strong>
          <span className="ipd-ledger-kpi-sub">
            Live Bed: {CURRENCY_SYMBOL}{summary.bedStayCharges?.toLocaleString('en-IN') || 0} ({summary.totalStayHours || 0}h)
          </span>
        </div>

        <div className="ipd-ledger-kpi-card" style={{ borderLeft: '3px solid #006a57' }}>
          <span className="ipd-ledger-kpi-label">Deposits Held</span>
          <strong className="ipd-ledger-kpi-val" style={{ color: '#006a57' }}>
            {CURRENCY_SYMBOL}{summary.totalAdvanceDeposited?.toLocaleString('en-IN') || 0}
          </strong>
          <span className="ipd-ledger-kpi-sub">
            {deposits.length} Deposit Receipts
          </span>
        </div>

        <div className="ipd-ledger-kpi-card" style={{ borderLeft: summary.outstandingDue > 0 ? '3px solid #ba1a1a' : '3px solid #2e7d32' }}>
          <span className="ipd-ledger-kpi-label">Outstanding Due</span>
          <strong className="ipd-ledger-kpi-val" style={{ color: summary.outstandingDue > 0 ? 'var(--md-sys-color-error, #ba1a1a)' : '#2e7d32' }}>
            {CURRENCY_SYMBOL}{summary.outstandingDue?.toLocaleString('en-IN') || 0}
          </strong>
          <span className="ipd-ledger-kpi-sub">
            {summary.excessCredit > 0 ? `Excess Refund: ${CURRENCY_SYMBOL}${summary.excessCredit}` : 'Payable at discharge'}
          </span>
        </div>

        <div className="ipd-ledger-kpi-card" style={{ borderLeft: summary.status === 'FINALIZED' ? '3px solid #2e7d32' : '3px solid #b45309' }}>
          <span className="ipd-ledger-kpi-label">Ledger Status</span>
          <strong className="ipd-ledger-kpi-val" style={{ color: summary.status === 'FINALIZED' ? '#2e7d32' : '#b45309', fontSize: '1.15rem' }}>
            {summary.status || 'OPEN'}
          </strong>
          <span className="ipd-ledger-kpi-sub">
            Bill #{ledgerData?.bill?.billNumber || 'PENDING'}
          </span>
        </div>
      </div>

      {/* Multi-Bed Stay Segmentation Timeline */}
      <div className="ipd-ledger-card">
        <div className="ipd-ledger-card-header">
          <h3 className="ipd-ledger-card-title">
            <span className="material-symbols-rounded">hotel</span>
            <span>Bed Stay Occupancy &amp; Transfer Timeline</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
            Total Stay: {summary.totalStayHours || 0} hours
          </span>
        </div>

        {bedSegments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--md-sys-color-outline)', fontSize: '0.82rem' }}>
            No bed allocation records found.
          </div>
        ) : (
          <div className="ipd-ledger-table-wrap">
            <table className="ipd-ledger-table">
              <thead>
                <tr>
                  <th>Bed &amp; Location</th>
                  <th>Comfort Tier</th>
                  <th>Allocated Interval</th>
                  <th>Duration</th>
                  <th>Daily / Hourly Rate</th>
                  <th style={{ textAlign: 'right' }}>Calculated Charge</th>
                </tr>
              </thead>
              <tbody>
                {bedSegments.map((seg, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{seg.bedLabel}</strong> ({seg.bedNumber})
                      <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                        {seg.wardClass} • {seg.floorName}
                      </div>
                    </td>
                    <td>
                      <Md3BedComfortBadge tier={seg.comfortTier} size="small" />
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <div>From: {new Date(seg.allocatedFrom).toLocaleDateString()}</div>
                      <div style={{ color: seg.isActive ? '#006a57' : 'var(--md-sys-color-outline)', fontWeight: seg.isActive ? 700 : 400 }}>
                        {seg.isActive ? 'Active (Current)' : `To: ${new Date(seg.allocatedTo).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td>
                      <strong>{seg.fullDays}d {seg.billableRemainingHours}h</strong>
                      <span style={{ fontSize: '0.70rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'block' }}>
                        ({seg.totalHoursFormatted} hrs)
                      </span>
                    </td>
                    <td>
                      {CURRENCY_SYMBOL}{seg.dailyRate}/d • {CURRENCY_SYMBOL}{seg.hourlyRate}/hr
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>
                      {CURRENCY_SYMBOL}{seg.segmentAmount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdown & Advance Deposit Receipts Grid */}
      <div className="ipd-ledger-two-col-grid">
        {/* Category Breakdown */}
        <div className="ipd-ledger-card">
          <h3 className="ipd-ledger-card-title">
            <span className="material-symbols-rounded">pie_chart</span>
            <span>Charge Distribution by Category</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ipd-ledger-breakdown-row">
              <span>Bed &amp; Room Stay Charges</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.BED_CHARGES || summary.bedStayCharges || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="ipd-ledger-breakdown-row">
              <span>Pharmacy &amp; Medications</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.PHARMACY || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="ipd-ledger-breakdown-row">
              <span>Lab &amp; Diagnostics</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.DIAGNOSTICS || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="ipd-ledger-breakdown-row">
              <span>Procedures &amp; Nursing Care</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.PROCEDURE || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="ipd-ledger-breakdown-row">
              <span>Doctor Rounds &amp; Consultations</span>
              <strong>{CURRENCY_SYMBOL}{(breakdown.CONSULTATION || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Advance Deposit Receipts Table */}
        <div className="ipd-ledger-card">
          <div className="ipd-ledger-card-header">
            <h3 className="ipd-ledger-card-title">
              <span className="material-symbols-rounded">receipt</span>
              <span>Advance Deposit Ledger</span>
            </h3>
            <Md3Button variant="tonal" onClick={() => setShowDepositModal(true)} style={{ height: '32px', fontSize: '0.78rem' }}>
              <span className="material-symbols-rounded">add</span>
              <span>Deposit</span>
            </Md3Button>
          </div>

          {deposits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--md-sys-color-outline)', fontSize: '0.82rem' }}>
              No advance deposits recorded yet.
            </div>
          ) : (
            <div className="ipd-ledger-table-wrap" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="ipd-ledger-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Type / Mode</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((dep, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{dep.receiptNumber}</td>
                      <td>
                        {dep.depositType} ({dep.paymentMethod})
                      </td>
                      <td style={{ color: 'var(--md-sys-color-outline)' }}>
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#006a57' }}>
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
      <div className="ipd-ledger-card">
        <h3 className="ipd-ledger-card-title">
          <span className="material-symbols-rounded">list_alt</span>
          <span>Inpatient Clinical Service Line Items</span>
        </h3>
        {(!ledgerData?.lineItems || ledgerData.lineItems.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)', fontSize: '0.82rem' }}>
            No billable line items accumulated yet. Click "Ingest Routine Charges".
          </div>
        ) : (
          <div className="ipd-ledger-table-wrap">
            <table className="ipd-ledger-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Category</th>
                  <th>Rate</th>
                  <th>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.description || item.name}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.70rem', background: 'var(--md-sys-color-surface-container-highest)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>{CURRENCY_SYMBOL}{item.snapshotPrice || item.rate}</td>
                    <td>{item.quantity || 1}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
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
        <div className="ipd-ledger-modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="ipd-ledger-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: 800 }}>Collect Inpatient Advance Deposit</h3>
            <form onSubmit={handleSaveDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  Generate Receipt &amp; Collect
                </Md3Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Settlement & Closure Modal */}
      {showSettlementModal && (
        <div className="ipd-ledger-modal-overlay" onClick={() => setShowSettlementModal(false)}>
          <div className="ipd-ledger-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800 }}>Final IPD Bill Settlement &amp; Ledger Closure</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
              Computes all live bed occupancy charges across transfers, deducts advance deposits, and closes the bill.
            </p>

            <form onSubmit={handleFinalizeSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '12px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                  <span>Gross Total Charges:</span>
                  <strong>{CURRENCY_SYMBOL}{summary.totalGrossBilled?.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                  <span>Total Advance Deposits Held:</span>
                  <strong style={{ color: '#006a57' }}>-{CURRENCY_SYMBOL}{summary.totalAdvanceDeposited?.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', paddingTop: '6px', fontSize: '0.95rem' }}>
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
                <div style={{ padding: '8px 12px', background: '#e0f2fe', borderRadius: '8px', color: '#0369a1', fontSize: '0.82rem' }}>
                  <strong>Excess Advance Refund: {CURRENCY_SYMBOL}{summary.excessCredit}</strong>
                  <div style={{ marginTop: '2px' }}>An approved refund adjustment will be recorded in the final bill.</div>
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
