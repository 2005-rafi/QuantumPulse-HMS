import React from 'react';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { formatDoctorName, formatPatientPhone } from '../../../utils/patientFormatters';
import { BarcodeRenderer } from '../../../components/common/BarcodeRenderer';
import './ThermalPosTokenSlip.css';

/**
 * ThermalPosTokenSlip
 * Dedicated Production-Grade 80mm Thermal POS Continuous Roll Slip.
 *
 * Engineered strictly for OPD Consultation Queue Tokens, Triage Tickets,
 * and Counter Walk-in Fee Receipts:
 *  1. Pure monochrome high-contrast layout (no washed-out gray tints).
 *  2. High-impact 34px bold Queue Token Number.
 *  3. Vector ISO/IEC 15417 Code 128 Barcode for scanner workflow.
 *  4. Clinical chamber routing (Doctor, Department, Room Number, Wait Estimate).
 *  5. Compact key-value patient summary and fee settlement.
 *  6. Zero-margin `@page` print rules preventing continuous roll paper waste.
 */
export const ThermalPosTokenSlip = React.forwardRef(({
  bill = null,
  patient: propPatient = null,
  visit = null,
  admission = null,
  config = null,
  hospitalInfo: propHospitalInfo = null,
  currency = CURRENCY_SYMBOL,
}, ref) => {
  const hospitalInfo = {
    name: 'QUANTUM CAREONE HOSPITAL',
    subHeader: 'Outpatient Triage & Consultation Slip',
    address: 'Plot 42, Health City, Chennai - 600101',
    phone: '+91 (044) 4900-8800',
    ...(config?.hospitalInfo || {}),
    ...(propHospitalInfo || {}),
  };

  // Demographic Resolution
  const rawP = propPatient
    || (typeof bill?.patientId === 'object' ? bill.patientId : null)
    || (typeof visit?.patientId === 'object' ? visit.patientId : null)
    || {};

  const patientName = `${rawP.firstName || ''} ${rawP.lastName || ''}`.trim() || rawP.name || 'Walk-in Patient';
  const mrn = rawP.mrn || 'N/A';
  const rawPhone = rawP.phoneNumber || rawP.phone || '';
  const phone = formatPatientPhone(rawPhone) || '—';
  const age = rawP.age != null ? rawP.age : '—';
  const gender = rawP.gender || '—';
  const ageGender = `${age} Y / ${gender}`;

  // Doctor & Department Resolution
  const doctorObj = (typeof visit?.consultation?.doctorId === 'object' ? visit.consultation.doctorId : null)
    || (typeof visit?.doctorId === 'object' ? visit.doctorId : null);

  const rawDoctor = doctorObj || visit?.doctorName || 'Dr. Sandeep Prabakar';
  const doctorName = formatDoctorName(rawDoctor);

  const departmentName = (typeof visit?.departmentId === 'object' ? visit.departmentId?.name : null)
    || (typeof bill?.departmentId === 'object' ? bill.departmentId?.name : null)
    || visit?.departmentName
    || 'General Medicine';

  // Queue Token & Routing
  const tokenString = visit?.tokenString
    || (bill?.billNumber ? bill.billNumber.slice(-4) : null)
    || (visit?.visitNumber ? visit.visitNumber.slice(-4) : 'OPD-042');

  const chamber = visit?.consultation?.chamber || visit?.chamber || 'Room 104 · 1st Floor';
  const reason = visit?.reasonForVisit || visit?.chiefComplaint || 'Clinical Review';

  // Financial Registration / Fee Details
  const regFee = Number(
    visit?.registrationFee != null ? visit.registrationFee :
    visit?.receptionPayment?.registrationFee != null ? visit.receptionPayment.registrationFee :
    bill?.registrationFee != null ? bill.registrationFee : 0
  );

  const consultFee = Number(
    visit?.consultationFee != null ? visit.consultationFee :
    visit?.receptionPayment?.consultationFee != null ? visit.receptionPayment.consultationFee :
    bill?.billedAmount != null ? bill.billedAmount : 0
  );

  const totalFee = regFee + consultFee;
  const paymentMethod = (bill?.payments?.[0]?.method || visit?.receptionPayment?.paymentMethod || 'UPI').toUpperCase();
  const billNumber = bill?.billNumber || visit?.visitNumber || `TKN-${Date.now().toString(36).toUpperCase()}`;

  // Current Timestamp with seconds
  const currentTimestamp = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div ref={ref} className="thermal-pos-slip unified-bill-sheet unified-print-portal">
      {/* ── 1. HEADER ── */}
      <div className="pos-header">
        <h1 className="pos-hospital-title">{hospitalInfo.name}</h1>
        <p className="pos-hospital-sub">{hospitalInfo.subHeader}</p>
        <p className="pos-hospital-contact">Ph: {hospitalInfo.phone}</p>
        <div className="pos-time">{currentTimestamp}</div>
      </div>

      <div className="pos-divider pos-divider--heavy" />

      {/* ── 2. HIGH-IMPACT QUEUE TOKEN CARD ── */}
      <div className="pos-token-block">
        <span className="pos-token-tag">QUEUE TOKEN NUMBER</span>
        <div className="pos-token-number">{tokenString}</div>
        <div className="pos-chamber-tag">{chamber}</div>
      </div>

      {/* ── 3. VECTOR BARCODE ── */}
      <div className="pos-barcode-wrap">
        <BarcodeRenderer
          value={tokenString || mrn || 'TKN001'}
          width={1.6}
          height={32}
          showText={true}
        />
      </div>

      <div className="pos-divider pos-divider--dashed" />

      {/* ── 4. ROUTING & CLINICAL METADATA ── */}
      <div className="pos-meta-list">
        <div className="pos-meta-row">
          <span className="pos-label">Department:</span>
          <span className="pos-val pos-val--bold">{departmentName}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">Physician:</span>
          <span className="pos-val pos-val--bold">{doctorName}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">Reason:</span>
          <span className="pos-val">{reason}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">Est. Wait:</span>
          <span className="pos-val pos-val--bold">15 - 20 Mins</span>
        </div>
      </div>

      <div className="pos-divider pos-divider--dashed" />

      {/* ── 5. PATIENT DETAILS ── */}
      <div className="pos-meta-list">
        <div className="pos-meta-row">
          <span className="pos-label">Patient:</span>
          <span className="pos-val pos-val--bold">{patientName}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">UHID/MRN:</span>
          <span className="pos-val pos-val--mono">{mrn}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">Age / Sex:</span>
          <span className="pos-val">{ageGender}</span>
        </div>
        <div className="pos-meta-row">
          <span className="pos-label">Phone:</span>
          <span className="pos-val">{phone}</span>
        </div>
      </div>

      {/* ── 6. COUNTER FEE SUMMARY (IF COLLECTED) ── */}
      {totalFee > 0 && (
        <>
          <div className="pos-divider pos-divider--dashed" />
          <div className="pos-fee-block">
            <div className="pos-meta-row">
              <span className="pos-label">Intake Reg Fee:</span>
              <span className="pos-val">{currency}{regFee.toFixed(2)}</span>
            </div>
            <div className="pos-meta-row">
              <span className="pos-label">Consultation:</span>
              <span className="pos-val">{currency}{consultFee.toFixed(2)}</span>
            </div>
            <div className="pos-meta-row pos-meta-row--total">
              <span className="pos-label pos-label--heavy">TOTAL PAID:</span>
              <span className="pos-val pos-val--heavy">{currency}{totalFee.toFixed(2)}</span>
            </div>
            <div className="pos-fee-sub">
              <span>Mode: {paymentMethod}</span>
              <span>•</span>
              <span>Ref: {billNumber}</span>
            </div>
          </div>
        </>
      )}

      <div className="pos-divider pos-divider--cut" />

      {/* ── 7. TEAR-OFF FOOTER INSTRUCTIONS ── */}
      <div className="pos-footer">
        <p className="pos-footer-p">
          Please be seated in the Waiting Area outside {chamber}.
        </p>
        <p className="pos-footer-p">
          Watch the digital calling display for your Token: <strong>{tokenString}</strong>.
        </p>
        <div className="pos-cut-notice">- - - - TEAR HERE - - - -</div>
      </div>
    </div>
  );
});

ThermalPosTokenSlip.displayName = 'ThermalPosTokenSlip';

export default ThermalPosTokenSlip;
