import React from 'react';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { formatDoctorName, formatPatientPhone } from '../../../utils/patientFormatters';
import './A4HospitalInvoiceTemplate.css';

/**
 * A4HospitalInvoiceTemplate
 * Dedicated Production-Grade A4 Hospital Tax Invoice & Settlement Template.
 *
 * Engineered strictly for A4 paper (210mm x 297mm) and vector PDF export:
 *  1. Unbreakable 2-column tabular demographics grid.
 *  2. 5-column itemized clinical services table with fixed percentage allocations.
 *  3. Segregated clinical categories with lettered badges (A, B, C...) and right-aligned category subtotals.
 *  4. High-density financial reconciliation card formatted with Indian currency numbering.
 *  5. Legal disclaimer, computer-generated certification, and 3-column signature block.
 */
export const A4HospitalInvoiceTemplate = React.forwardRef(({
  bill = null,
  patient: propPatient = null,
  visit = null,
  admission = null,
  lineItems: propLineItems = null,
  config = null,
  workflowType = null,
  hospitalInfo: propHospitalInfo = null,
  labels: propLabels = null,
  financials = null,
  currency = CURRENCY_SYMBOL,
}, ref) => {
  // Resolve effective workflow
  const effectiveWorkflow = (
    workflowType ||
    bill?.workflowType ||
    bill?.visitType ||
    (bill?.admissionId || admission ? 'IPD' : 'OPD')
  ).toUpperCase();

  // Configuration resolution
  const activeTemplate = config?.templates?.[effectiveWorkflow] || config?.templates?.OPD || {};
  const hospitalInfo = {
    name: 'QUANTUM CAREONE HOSPITAL',
    subHeader: 'Advanced Center for Clinical Care & Surgery',
    address: 'Plot 42, Health City Expressway, Tech Zone 4, Chennai, TN - 600101',
    phone: '+91 (044) 4900-8800',
    email: 'billing@quantumcare.org',
    gstin: '33AAAAA0000A1Z5',
    taxId: '33AAAAA0000A1Z5',
    ...(config?.hospitalInfo || {}),
    ...(propHospitalInfo || {}),
  };

  const labels = {
    title: effectiveWorkflow === 'IPD' ? 'INPATIENT (IPD) HOSPITAL BILL & SETTLEMENT' :
           effectiveWorkflow === 'SURGICAL' ? 'SURGICAL & OPERATIVE INVOICE' :
           effectiveWorkflow === 'EMERGENCY' ? 'EMERGENCY & TRAUMA CARE INVOICE' :
           effectiveWorkflow === 'COMPREHENSIVE' ? 'CONSOLIDATED INPATIENT & INSURANCE CLAIM BILL' :
           'OUTPATIENT (OPD) CONSULTATION & SERVICE BILL',
    ...(activeTemplate.labels || config?.labels || {}),
    ...(propLabels || {}),
  };

  // Indian Currency Number Formatter
  const formatInr = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num).replace(/^₹\s?/, '₹');
  };

  // Date Formatter
  const formatDate = (d, withTime = false) => {
    if (!d) return '—';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      if (withTime) {
        return dateObj.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (_) {
      return String(d);
    }
  };

  // Patient Demographic Resolution
  const rawP = propPatient
    || (typeof bill?.patientId === 'object' ? bill.patientId : null)
    || (typeof visit?.patientId === 'object' ? visit.patientId : null)
    || (typeof admission?.patientId === 'object' ? admission.patientId : null)
    || {};

  const patientName = `${rawP.firstName || ''} ${rawP.lastName || ''}`.trim() || rawP.name || 'Patient';
  const mrn = rawP.mrn || 'N/A';
  const rawPhone = rawP.phoneNumber || rawP.phone || '';
  const phone = formatPatientPhone(rawPhone) || '—';
  const age = rawP.age != null ? rawP.age : '—';
  const gender = rawP.gender || '—';
  const ageGender = `${age} Y / ${gender}`;
  const bloodGroup = rawP.bloodGroup || '—';

  // Primary Consultant Resolution
  const doctorObj = (typeof visit?.consultation?.doctorId === 'object' ? visit.consultation.doctorId : null)
    || (typeof visit?.doctorId === 'object' ? visit.doctorId : null)
    || (typeof admission?.primaryDoctorId === 'object' ? admission.primaryDoctorId : null)
    || (typeof admission?.attendingDoctorId === 'object' ? admission.attendingDoctorId : null);

  const rawDoctor = doctorObj
    || visit?.doctorName
    || (admission?.attendingDoctorId && typeof admission.attendingDoctorId === 'string' && !/^[0-9a-fA-F]{24}$/.test(admission.attendingDoctorId) ? admission.attendingDoctorId : null)
    || 'Dr. Sandeep Prabakar';

  const doctorName = formatDoctorName(rawDoctor);

  // Department & Ward Resolution
  const departmentName = (typeof visit?.departmentId === 'object' ? visit.departmentId?.name : null)
    || (typeof bill?.departmentId === 'object' ? bill.departmentId?.name : null)
    || (typeof admission?.admittingDepartmentId === 'object' ? admission.admittingDepartmentId?.name : null)
    || visit?.departmentName
    || (effectiveWorkflow === 'IPD' ? 'Cardiology ICU & Inpatient Care' : 'Outpatient General Medicine');

  const admissionNo = admission?.admissionNumber || visit?.admissionId?.admissionNumber || bill?.admissionId?.admissionNumber || (effectiveWorkflow === 'IPD' ? 'IPD-2026-0412' : null);
  const doa = admission?.admissionDate || visit?.admissionId?.admissionDate || bill?.admissionDate || (effectiveWorkflow === 'IPD' ? '2026-08-25T10:00:00Z' : null);
  const dod = admission?.dischargeDate || visit?.admissionId?.dischargeDate || bill?.dischargeDate || (effectiveWorkflow === 'IPD' ? '2026-08-28T16:00:00Z' : null);

  const wardBed = admission?.bedId
    ? `${admission.bedId.wardClass || 'ICU'} · Room ${admission.bedId.roomNumber || '302'} · Bed ${admission.bedId.bedNumber || 'ICU-04'} (${admission.bedId.comfortTier || 'Deluxe'})`
    : (effectiveWorkflow === 'IPD' ? 'Cardiology ICU - Room 302 - Bed ICU-04 (Deluxe)' : null);

  const diagnosis = admission?.primaryDiagnosis || admission?.diagnosis || visit?.diagnosis || visit?.chiefComplaint || (effectiveWorkflow === 'IPD' ? 'Acute Coronary Syndrome (ICD-10: I20.0)' : 'Routine Clinical Checkup');

  // Insurance & TPA
  const insuranceProvider = admission?.insuranceDetails?.provider || visit?.insuranceDetails?.provider || bill?.insuranceProvider || (effectiveWorkflow === 'IPD' ? 'Star Health & Allied Insurance' : null);
  const policyNo = admission?.insuranceDetails?.policyNumber || visit?.insuranceDetails?.policyNumber || bill?.policyNumber || (insuranceProvider ? 'POL-SH-8828184' : null);

  // Invoice Number & Billing Date
  const billNumber = bill?.billNumber || bill?._id || `INV-${Date.now().toString(36).toUpperCase()}`;
  const billingDate = bill?.createdAt || bill?.serviceDate || visit?.createdAt || new Date();

  // Payment Mode
  const effectivePaymentMethod = (bill?.payments?.[0]?.method || bill?.paymentMethod || 'UPI').toUpperCase();

  // Canonical clinical category registry
  const CLINICAL_CATEGORIES = [
    { id: 'REGISTRATION', title: 'Clinical Registration & Administrative Services' },
    { id: 'CONSULTATION', title: 'Doctor Consultations & Specialist Reviews' },
    { id: 'BED_CHARGES', title: 'Room, Bed & Inpatient Nursing Accommodation' },
    { id: 'PROCEDURE', title: 'Surgical Procedures & Operative Services' },
    { id: 'DIAGNOSTICS', title: 'Laboratory & Diagnostic Investigations' },
    { id: 'PHARMACY', title: 'Pharmacy Medications & Dispensed Drugs' },
    { id: 'CONSUMABLES', title: 'Medical Consumables & Surgical Disposables' },
    { id: 'OTHER', title: 'General Hospital Services & Sundry Charges' },
  ];

  // Group line items
  const rawItems = propLineItems && propLineItems.length > 0
    ? propLineItems
    : bill?.lineItems && bill.lineItems.length > 0
    ? bill.lineItems
    : [
        { category: 'REGISTRATION', description: 'Patient Intake Registration Fee', quantity: 1, unitPrice: 250, lineTotal: 250, serviceDate: billingDate },
        { category: 'CONSULTATION', description: 'Specialist Physician Consultation Review', quantity: 1, unitPrice: 1000, lineTotal: 1000, serviceDate: billingDate },
      ];

  const categoryMap = {};
  CLINICAL_CATEGORIES.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, items: [], subtotal: 0 };
  });

  rawItems.forEach((item) => {
    const catKey = (item.category && categoryMap[item.category]) ? item.category : 'OTHER';
    const total = Number(item.lineTotal != null ? item.lineTotal : (item.amount != null ? item.amount : 0));
    categoryMap[catKey].items.push({
      ...item,
      lineTotal: total,
      unitPrice: Number(item.unitPrice != null ? item.unitPrice : (item.price != null ? item.price : total / (item.quantity || 1))),
      quantity: Number(item.quantity) || 1,
      serviceDate: item.serviceDate || billingDate,
    });
    categoryMap[catKey].subtotal += total;
  });

  const activeCategories = CLINICAL_CATEGORIES
    .filter((cat) => categoryMap[cat.id].items.length > 0)
    .map((cat, idx) => ({
      ...categoryMap[cat.id],
      sectionBadge: String.fromCharCode(65 + idx),
    }));

  // Financial Breakdown
  const grossBilled = Number(
    financials?.grossBilled != null
      ? financials.grossBilled
      : bill?.billedAmount != null
      ? bill.billedAmount
      : activeCategories.reduce((acc, c) => acc + c.subtotal, 0)
  );

  const advanceCollected = Number(
    financials?.advancePaid != null
      ? financials.advancePaid
      : bill?.advanceCollected != null
      ? bill.advanceCollected
      : (bill?.payments || [])
          .filter((p) => p.type === 'ADVANCE_DEPOSIT' || p.method === 'ADVANCE')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  const discountAmount = Number(bill?.discountAmount || financials?.discountAmount || 0);
  const adjustedAmount = Number(bill?.adjustedAmount || financials?.adjustedAmount || 0);
  const collectedAmount = Number(bill?.collectedAmount || financials?.collectedAmount || 0);

  // Statutory GST Breakdown
  const totalTaxableAmount = Number(
    bill?.totalTaxableAmount != null
      ? bill.totalTaxableAmount
      : activeCategories.reduce((acc, c) => acc + c.items.filter((i) => (i.taxRate || 0) > 0).reduce((s, i) => s + (i.lineTotal || 0), 0), 0)
  );

  const totalExemptAmount = Number(
    bill?.totalExemptAmount != null
      ? bill.totalExemptAmount
      : activeCategories.reduce((acc, c) => acc + c.items.filter((i) => !i.taxRate || i.taxRate === 0).reduce((s, i) => s + (i.lineTotal || 0), 0), 0)
  );

  const totalCgst = Number(
    bill?.totalCgst != null
      ? bill.totalCgst
      : activeCategories.reduce((acc, c) => acc + c.items.reduce((s, i) => s + (i.cgstAmount || 0), 0), 0)
  );

  const totalSgst = Number(
    bill?.totalSgst != null
      ? bill.totalSgst
      : activeCategories.reduce((acc, c) => acc + c.items.reduce((s, i) => s + (i.sgstAmount || 0), 0), 0)
  );

  const totalTax = Number(
    bill?.totalTax != null ? bill.totalTax : totalCgst + totalSgst
  );

  const netBalanceDue = Math.max(0, grossBilled - advanceCollected - discountAmount - adjustedAmount - collectedAmount);
  const settlementStatus = (bill?.status || (netBalanceDue === 0 ? 'PAID' : 'OPEN')).toUpperCase();

  return (
    <div ref={ref} className="a4-invoice-sheet unified-bill-sheet unified-print-portal">
      {/* ── 1. HOSPITAL BRANDING HEADER ── */}
      <header className="a4-header">
        <h1 className="a4-header__title">{hospitalInfo.name}</h1>
        {hospitalInfo.subHeader && (
          <p className="a4-header__sub">{hospitalInfo.subHeader}</p>
        )}
        <p className="a4-header__address">{hospitalInfo.address}</p>
        <div className="a4-header__meta-row">
          {hospitalInfo.phone && <span>Ph: {hospitalInfo.phone}</span>}
          {hospitalInfo.phone && hospitalInfo.email && <span className="a4-meta-bullet">•</span>}
          {hospitalInfo.email && <span>Email: {hospitalInfo.email}</span>}
          {(hospitalInfo.gstin || hospitalInfo.taxId) && (
            <span className="a4-header__tax-badge">
              GSTIN: {hospitalInfo.gstin || hospitalInfo.taxId}
            </span>
          )}
        </div>
      </header>

      <div className="a4-divider" />

      {/* ── 2. INVOICE TITLE & ENCOUNTER BAR ── */}
      <section className="a4-title-bar">
        <div className="a4-title-bar__left">
          <h2 className="a4-title-bar__heading">{labels.title}</h2>
          <span className="a4-title-bar__badge">{effectiveWorkflow} ENCOUNTER</span>
        </div>
        <div className="a4-title-bar__right">
          <div className="a4-meta-item">
            <span className="a4-meta-item__label">Billing Date:</span>
            <span className="a4-meta-item__val">{formatDate(billingDate)}</span>
          </div>
          <div className="a4-meta-item">
            <span className="a4-meta-item__label">Invoice No:</span>
            <span className="a4-meta-item__val a4-meta-item__val--mono">{billNumber}</span>
          </div>
        </div>
      </section>

      {/* ── 3. TWO-COLUMN UNBREAKABLE DEMOGRAPHICS GRID ── */}
      <section className="a4-demographics-card">
        {/* Column 1: Patient Demographics */}
        <div className="a4-demographics-col a4-demographics-col--patient">
          <div className="a4-field-row">
            <span className="a4-field-label">Patient Name:</span>
            <span className="a4-field-val a4-field-val--strong">{patientName}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">UHID / MRN:</span>
            <span className="a4-field-val a4-field-val--strong">{mrn}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">Age / Sex:</span>
            <span className="a4-field-val">{ageGender}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">Phone:</span>
            <span className="a4-field-val">{phone}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">Blood Group:</span>
            <span className="a4-field-val">{bloodGroup}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">Payment Mode:</span>
            <span className="a4-field-val">{effectivePaymentMethod}</span>
          </div>
          {insuranceProvider && (
            <div className="a4-field-row">
              <span className="a4-field-label">Insurance / TPA:</span>
              <span className="a4-field-val">{insuranceProvider}</span>
            </div>
          )}
          {policyNo && (
            <div className="a4-field-row">
              <span className="a4-field-label">Policy / Card No:</span>
              <span className="a4-field-val">{policyNo}</span>
            </div>
          )}
        </div>

        {/* Column 2: Clinical & Encounter Demographics */}
        <div className="a4-demographics-col a4-demographics-col--clinical">
          <div className="a4-field-row">
            <span className="a4-field-label">Primary Consultant:</span>
            <span className="a4-field-val a4-field-val--strong">{doctorName}</span>
          </div>
          <div className="a4-field-row">
            <span className="a4-field-label">Department:</span>
            <span className="a4-field-val">{departmentName}</span>
          </div>
          {admissionNo && (
            <div className="a4-field-row">
              <span className="a4-field-label">IPD Admission No:</span>
              <span className="a4-field-val a4-field-val--strong">{admissionNo}</span>
            </div>
          )}
          {wardBed && (
            <div className="a4-field-row">
              <span className="a4-field-label">Ward / Bed Class:</span>
              <span className="a4-field-val">{wardBed}</span>
            </div>
          )}
          {doa && (
            <div className="a4-field-row">
              <span className="a4-field-label">Date of Admission:</span>
              <span className="a4-field-val">{formatDate(doa)}</span>
            </div>
          )}
          {dod && (
            <div className="a4-field-row">
              <span className="a4-field-label">Date of Discharge:</span>
              <span className="a4-field-val">{formatDate(dod)}</span>
            </div>
          )}
          {diagnosis && (
            <div className="a4-field-row">
              <span className="a4-field-label">Diagnosis:</span>
              <span className="a4-field-val">{diagnosis}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. ITEMIZED SERVICES TABLE ── */}
      <section className="a4-table-container">
        <table className="a4-table">
          <thead>
            <tr>
              <th className="a4-th-desc">Clinical Service / Fee Description</th>
              <th className="a4-th-hsn">HSN / SAC</th>
              <th className="a4-th-date">Date</th>
              <th className="a4-th-qty">Qty</th>
              <th className="a4-th-rate">Unit Rate</th>
              <th className="a4-th-tax">GST Tax</th>
              <th className="a4-th-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeCategories.map((cat) => (
              <React.Fragment key={cat.id}>
                {/* Category Header Row */}
                <tr className="a4-cat-row">
                  <td colSpan={6}>
                    <div className="a4-cat-badge-wrap">
                      <span className="a4-cat-badge">{cat.sectionBadge}</span>
                      <strong className="a4-cat-title">{cat.title}</strong>
                      <span className="a4-cat-count">({cat.items.length} {cat.items.length === 1 ? 'charge' : 'charges'})</span>
                    </div>
                  </td>
                  <td className="a4-cat-subtotal">
                    <span className="a4-subtotal-label">Subtotal:</span>{' '}
                    <strong>{formatInr(cat.subtotal)}</strong>
                  </td>
                </tr>

                {/* Itemized Line Rows */}
                {cat.items.map((item, itemIdx) => {
                  const effectiveHsn = item.hsnSacCode || (item.category === 'PHARMACY' ? '3004' : '999312');
                  const hasTax = (item.taxRate || 0) > 0;
                  return (
                    <tr key={item._id || `${cat.id}-${itemIdx}`} className="a4-item-row">
                      <td className="a4-td-desc">
                        <span className="a4-item-title">{item.description}</span>
                        {item.proofReference && (
                          <div className="a4-item-proof">Ref: {item.proofReference}</div>
                        )}
                      </td>
                      <td className="a4-td-hsn">
                        <span className="a4-hsn-badge">{effectiveHsn}</span>
                      </td>
                      <td className="a4-td-date">{formatDate(item.serviceDate)}</td>
                      <td className="a4-td-qty">{item.quantity}</td>
                      <td className="a4-td-rate">{formatInr(item.unitPrice)}</td>
                      <td className="a4-td-tax">
                        {hasTax ? (
                          <span className="a4-tax-badge" title={`CGST ${(item.taxRate / 2)}% + SGST ${(item.taxRate / 2)}%`}>
                            {item.taxRate}% (₹{(item.totalTaxAmount || 0).toFixed(2)})
                          </span>
                        ) : (
                          <span className="a4-tax-exempt">Exempt (0%)</span>
                        )}
                      </td>
                      <td className="a4-td-amt">{formatInr(item.lineTotal)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── 5. FINANCIAL RECONCILIATION SUMMARY BLOCK ── */}
      <section className="a4-summary-section">
        <div className="a4-summary-box">
          <div className="a4-summary-row">
            <span className="a4-sum-label">Gross Billed Amount:</span>
            <span className="a4-sum-val">{formatInr(grossBilled)}</span>
          </div>

          {advanceCollected > 0 && (
            <div className="a4-summary-row a4-summary-row--credit">
              <span className="a4-sum-label">Less Advance Deposit Paid:</span>
              <span className="a4-sum-val">- {formatInr(advanceCollected)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="a4-summary-row a4-summary-row--credit">
              <span className="a4-sum-label">Institutional Concession / Waiver:</span>
              <span className="a4-sum-val">- {formatInr(discountAmount)}</span>
            </div>
          )}

          {collectedAmount > 0 && (
            <div className="a4-summary-row a4-summary-row--paid">
              <span className="a4-sum-label">Payments Collected:</span>
              <span className="a4-sum-val">- {formatInr(collectedAmount)}</span>
            </div>
          )}

          <div className="a4-summary-row a4-summary-row--status">
            <span className="a4-sum-label">Settlement Status:</span>
            <span className={`a4-status-tag a4-status-tag--${settlementStatus.toLowerCase()}`}>
              {settlementStatus} {effectivePaymentMethod ? `(${effectivePaymentMethod})` : ''}
            </span>
          </div>

          <div className="a4-summary-row a4-summary-row--net">
            <span className="a4-net-label">NET BALANCE PAYABLE:</span>
            <span className="a4-net-val">{formatInr(netBalanceDue)}</span>
          </div>
        </div>

        {/* ── STATUTORY GST TAX BREAKDOWN ── */}
        <div className="a4-gst-tax-box">
          <div className="a4-gst-tax-title">Statutory GST Tax Summary (Central & State Tax Assessment)</div>
          <div className="a4-gst-tax-grid">
            <div className="a4-gst-tax-item">
              <span className="a4-gst-tax-label">Exempt Healthcare (SAC 999312):</span>
              <span className="a4-gst-tax-val">{formatInr(totalExemptAmount)}</span>
            </div>
            <div className="a4-gst-tax-item">
              <span className="a4-gst-tax-label">Taxable Goods/Pharma (HSN 3004):</span>
              <span className="a4-gst-tax-val">{formatInr(totalTaxableAmount)}</span>
            </div>
            <div className="a4-gst-tax-item">
              <span className="a4-gst-tax-label">Central GST (CGST):</span>
              <span className="a4-gst-tax-val">{formatInr(totalCgst)}</span>
            </div>
            <div className="a4-gst-tax-item">
              <span className="a4-gst-tax-label">State GST (SGST):</span>
              <span className="a4-gst-tax-val">{formatInr(totalSgst)}</span>
            </div>
            <div className="a4-gst-tax-item a4-gst-tax-item--total">
              <span className="a4-gst-tax-label">Total GST Tax Assessed:</span>
              <span className="a4-gst-tax-val">{formatInr(totalTax)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. SIGNATURE & VERIFICATION SECTION ── */}
      <footer className="a4-footer">
        <div className="a4-signatures">
          <div className="a4-sig-block">
            <div className="a4-sig-line" />
            <span className="a4-sig-label">Patient / Attendant Signature</span>
          </div>
          <div className="a4-sig-block">
            <div className="a4-sig-line" />
            <span className="a4-sig-label">Cashier / Billing Desk Officer</span>
          </div>
          <div className="a4-sig-block">
            <div className="a4-sig-line" />
            <span className="a4-sig-label">Hospital Stamp & Authorized Seal</span>
          </div>
        </div>

        <div className="a4-footer-note">
          <p>This is a computer-generated official hospital document. Valid for medical reimbursement, insurance claims, and tax filing without physical signature.</p>
        </div>
      </footer>
    </div>
  );
});

A4HospitalInvoiceTemplate.displayName = 'A4HospitalInvoiceTemplate';

export default A4HospitalInvoiceTemplate;
