import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './md3/Md3Widgets';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { CURRENCY_SYMBOL } from '../constants/currency';
import './PrintableVisitSlip.css';

/* ─────────────────────────────────────────────────────────────────────────────
   PrintableVisitSlip — Full MD3-compliant visit document renderer.

   Renders 3 distinct slips:
     1. OPD Visit Slip — patient + department routing info
     2. Payment Receipt — fee breakdown
     3. Queue Token Card — the primary queue identifier (hero: DEPT-XXX)

   Design compliance: docs/design.md §1–§3 (MD3 tokens, BEM, zero hardcoded values).
   No inline style={{}} per design.md §6.4.
   All colours via var(--md-sys-color-*), spacing via var(--md-spacing-*).
   ─────────────────────────────────────────────────────────────────────────────*/

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Mask phone: last 4 digits visible, rest replaced with •
 * e.g., "+91 9876543210" → "+91 ••••••3210"
 */
const maskPhone = (phone = '') => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  const visible = cleaned.slice(-4);
  const masked = '•'.repeat(Math.max(0, cleaned.length - 4));
  return `+91 ${masked}${visible}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/* ─── Slip 1: OPD Visit Slip ─────────────────────────────────────────────── */
const OpdVisitSlip = ({ patient, visit }) => {
  const deptName = visit.departmentId?.name || 'Triage / General';
  const doctorName = visit.consultation?.doctorId
    ? `Dr. ${visit.consultation.doctorId.firstName || ''} ${visit.consultation.doctorId.lastName || ''}`.trim()
    : 'To Be Assigned';

  return (
    <article className="print-slip print-slip--opd" aria-label="OPD Visit Slip">
      <SlipHeader title="OUTPATIENT DEPARTMENT" subtitle="OPD VISIT SLIP" />

      <div className="print-slip__row-2col">
        <div className="print-slip__field">
          <span className="print-slip__label">Visit No.</span>
          <span className="print-slip__value print-slip__value--mono">{visit.visitNumber}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Token</span>
          <span className="print-slip__value print-slip__value--token">
            {visit.tokenString ?? visit.visitNumber?.slice(-4) ?? '—'}
          </span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Date & Time</span>
          <span className="print-slip__value print-slip__value--mono">{formatDateTime(visit.createdAt)}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Department</span>
          <span className="print-slip__value">{deptName}</span>
        </div>
      </div>

      <div className="print-slip__divider" role="separator" />

      <div className="print-slip__patient-block">
        <div className="print-slip__patient-name">
          {patient.firstName} {patient.lastName}
        </div>
        <div className="print-slip__row-2col">
          <div className="print-slip__field">
            <span className="print-slip__label">MRN (UHID)</span>
            <span className="print-slip__value print-slip__value--mono">{patient.mrn}</span>
          </div>
          <div className="print-slip__field">
            <span className="print-slip__label">Age / Gender</span>
            <span className="print-slip__value">{patient.age ?? '—'} yrs / {patient.gender}</span>
          </div>
          <div className="print-slip__field">
            <span className="print-slip__label">Date of Birth</span>
            <span className="print-slip__value print-slip__value--mono">{formatDate(patient.dob)}</span>
          </div>
          <div className="print-slip__field">
            <span className="print-slip__label">Phone</span>
            <span className="print-slip__value print-slip__value--mono">{maskPhone(patient.phone)}</span>
          </div>
          <div className="print-slip__field">
            <span className="print-slip__label">Blood Group</span>
            <span className="print-slip__value">{patient.bloodGroup || '—'}</span>
          </div>
          <div className="print-slip__field">
            <span className="print-slip__label">Doctor</span>
            <span className="print-slip__value">{doctorName}</span>
          </div>
        </div>
      </div>

      <div className="print-slip__divider" role="separator" />

      <div className="print-slip__complaint">
        <span className="print-slip__label">Chief Complaint / Reason for Visit</span>
        <span className="print-slip__value">{visit.reasonForVisit || '—'}</span>
      </div>

      <div className="print-slip__notes-area" aria-label="Doctor notes area (to be filled)">
        <span className="print-slip__notes-placeholder">Doctor's Assessment & Plan (to be filled)</span>
      </div>
    </article>
  );
};

/* ─── Slip 2: Payment Receipt ────────────────────────────────────────────── */
const PaymentReceipt = ({ patient, visit }) => {
  const regFee = visit.receptionPayment?.registrationFee ?? 0;
  const consultFee = visit.receptionPayment?.consultationFee ?? 0;
  const total = regFee + consultFee;

  return (
    <article className="print-slip print-slip--receipt" aria-label="Payment Receipt">
      <SlipHeader title="HOSPITAL MANAGEMENT SYSTEM" subtitle="PAYMENT RECEIPT" />

      <div className="print-slip__row-2col">
        <div className="print-slip__field">
          <span className="print-slip__label">Receipt No.</span>
          <span className="print-slip__value print-slip__value--mono">{visit.visitNumber}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Date & Time</span>
          <span className="print-slip__value print-slip__value--mono">{formatDateTime(visit.createdAt)}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Patient Name</span>
          <span className="print-slip__value">{patient.firstName} {patient.lastName}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">MRN (UHID)</span>
          <span className="print-slip__value print-slip__value--mono">{patient.mrn}</span>
        </div>
        <div className="print-slip__field">
          <span className="print-slip__label">Payment Mode</span>
          <span className="print-slip__value">{visit.receptionPayment?.paymentMethod || 'Cash'}</span>
        </div>
      </div>

      <div className="print-slip__divider" role="separator" />

      <table className="print-slip__fee-table" aria-label="Fee breakdown">
        <thead>
          <tr>
            <th className="print-slip__th">Description</th>
            <th className="print-slip__th print-slip__th--right">Amount ({CURRENCY_SYMBOL})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="print-slip__td">Registration Fee</td>
            <td className="print-slip__td print-slip__td--right">{CURRENCY_SYMBOL}{regFee.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="print-slip__td">Consultation Fee</td>
            <td className="print-slip__td print-slip__td--right">{CURRENCY_SYMBOL}{consultFee.toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="print-slip__total-row">
            <td className="print-slip__td print-slip__td--total">Total Paid</td>
            <td className="print-slip__td print-slip__td--right print-slip__td--total">
              {CURRENCY_SYMBOL}{total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="print-slip__signature-area">
        <span className="print-slip__label">Authorized Signatory</span>
      </div>
    </article>
  );
};

/* ─── Slip 3: Queue Token Card (HERO) ───────────────────────────────────── */
const QueueTokenCard = ({ patient, visit }) => {
  const tokenDisplay = visit.tokenString ?? `T-${visit.visitNumber?.slice(-4) ?? '???'}`;
  const deptName = visit.departmentId?.name || 'General OPD';
  const firstName = patient.firstName || '';
  const lastInitial = patient.lastName ? `${patient.lastName[0]}.` : '';

  return (
    <article className="print-slip print-slip--token" aria-label="Queue Token Card">
      <SlipHeader title="QUEUE TOKEN" subtitle={deptName} compact />

      {/* ── Hero Token Number ── */}
      <div className="print-slip__token-hero" aria-label={`Token number ${tokenDisplay}`}>
        {tokenDisplay}
      </div>

      <div className="print-slip__divider" role="separator" />

      {/* ── Patient Identity (collision-safe) ── */}
      <div className="print-slip__token-identity">
        <div className="print-slip__token-name">
          {firstName} {lastInitial}
        </div>
        <div className="print-slip__token-meta">
          <span>{patient.age ?? '—'} yrs · {patient.gender}</span>
          <span className="print-slip__value--mono">{formatDate(patient.dob)}</span>
          <span className="print-slip__value--mono">{maskPhone(patient.phone)}</span>
          <span className="print-slip__value--mono">{patient.mrn}</span>
        </div>
      </div>

      <div className="print-slip__divider" role="separator" />

      {/* ── Registration Time ── */}
      <div className="print-slip__token-time">
        <Icon.Clock className="print-slip__icon" aria-hidden="true" />
        <span className="print-slip__value--mono">{formatDateTime(visit.createdAt)}</span>
      </div>

      {/* ── Routing Instruction ── */}
      <p className="print-slip__token-instruction">
        Please proceed to the <strong>{deptName}</strong> waiting area.
        Your token will be called in order — please remain nearby.
      </p>

      {/* ── Lost token note ── */}
      <p className="print-slip__token-footnote">
        If you lose this slip, inform reception with your MRN or phone number.
        Your place is digitally saved.
      </p>
    </article>
  );
};

/* ─── Shared: Slip Header ────────────────────────────────────────────────── */
const SlipHeader = ({ title, subtitle, compact = false }) => {
  const config = useConfig();
  return (
    <header className={`print-slip__header${compact ? ' print-slip__header--compact' : ''}`}>
      <h2 className="print-slip__hospital-name">
        {config?.SHORT_NAME || 'HMS'} — {config?.HOSPITAL_NAME || 'Hospital Management System'}
      </h2>
      <h3 className="print-slip__slip-title">{title}</h3>
      {subtitle && <p className="print-slip__slip-subtitle">{subtitle}</p>}
    </header>
  );
};

/* ─── Shared: Print Audit Watermark (HIPAA Integrity) ─────────────────────── */
const PrintWatermark = ({ user, visit }) => {
  const staffName = user?.staffDetails?.fullName || user?.username || 'Attending Staff';
  const roleName = user?.role || 'Staff';
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className="print-audit-watermark">
      CONFIDENTIAL MEDICAL RECORD • Printed by: {staffName} ({roleName}) • {timestamp} • Visit #{visit?.visitNumber || 'N/A'}
    </div>
  );
};

/* ─── Root Component ─────────────────────────────────────────────────────── */
const PrintableVisitSlip = ({ patient, visit, onClose }) => {
  const { user } = useAuth();
  if (!patient || !visit) return null;

  const handlePrint = () => {
    window.print();
  };

  const SlipsContent = () => (
    <>
      <div className="print-slip-wrapper">
        <OpdVisitSlip patient={patient} visit={visit} />
        <PrintWatermark user={user} visit={visit} />
      </div>
      <div className="print-slip-wrapper">
        <PaymentReceipt patient={patient} visit={visit} />
        <PrintWatermark user={user} visit={visit} />
      </div>
      <div className="print-slip-wrapper">
        <QueueTokenCard patient={patient} visit={visit} />
        <PrintWatermark user={user} visit={visit} />
      </div>
    </>
  );

  return (
    <>
      {/* ── Screen Preview (Visible on screen, hidden on print) ── */}
      <div className="visit-slip-overlay screen-only-preview" role="dialog" aria-modal="true" aria-label="Visit documents">
        <div className="visit-slip-overlay__controls">
          <h1 className="visit-slip-overlay__title">Visit Documents</h1>
          <div className="visit-slip-overlay__actions">
            {onClose && (
              <button
                className="visit-slip-overlay__btn visit-slip-overlay__btn--outlined"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            )}
            <button
              className="visit-slip-overlay__btn visit-slip-overlay__btn--filled"
              onClick={handlePrint}
              type="button"
            >
              Print Slips
            </button>
          </div>
        </div>
        <div className="visit-slip-overlay__print-area">
          <SlipsContent />
        </div>
      </div>

      {/* ── Print Output Portal (Hidden on screen, visible on print) ── */}
      {createPortal(
        <div className="print-only-document">
          <div className="visit-slip-overlay__print-area">
            <SlipsContent />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PrintableVisitSlip;
