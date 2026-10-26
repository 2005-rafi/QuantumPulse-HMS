import React from 'react';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import { formatDoctorName } from '../../utils/patientFormatters';
import './BillingTemplate.css';

/**
 * Dynamic Multi-Workflow High-Density Billing & Clinical Slip Template Component
 * Designed for paper conservation (11px base print typography) and single-page A4 / A5 / POS optimization.
 * Supports: OPD, IPD Inpatient Stay, Surgical & OT, Emergency, and Comprehensive Insurance Claims
 * Modes:
 *   - 'INVOICE': Authoritative Financial Bill & Settlement Receipt
 *   - 'TOKEN_SLIP': OPD Consultation Queue Routing Slip & Clinical Triage Ticket
 *   - 'COMBINED': Two-part document containing Queue Token Routing + Official Fee Receipt
 */
const BillingTemplate = React.forwardRef(({
  hospitalInfo: propHospitalInfo = {},
  labels: propLabels = {},
  fieldVisibility: propFieldVisibility = {},
  customFields: propCustomFields = [],
  workflowType = 'OPD', // 'OPD' | 'IPD' | 'SURGICAL' | 'EMERGENCY' | 'COMPREHENSIVE'
  patient: propPatient = null,
  visit = null,
  admission = null,
  lineItems: propLineItems = null,
  medications = [],
  consultationFee = 0,
  labCharges = 0,
  financials = null,
  total,
  currency = CURRENCY_SYMBOL,
  bill = null,
  config = null,
  documentMode = 'COMBINED', // 'COMBINED' | 'INVOICE' | 'TOKEN_SLIP'
}, ref) => {
  // Determine effective workflow from props or data
  const effectiveWorkflow = workflowType || (
    bill?.visitType ||
    visit?.visitType === 'IPD' || admission ? 'IPD' :
    visit?.visitType === 'EMERGENCY' ? 'EMERGENCY' :
    'OPD'
  );

  // Centralized configuration resolution
  const activeTemplate = config?.templates?.[effectiveWorkflow] || config?.templates?.OPD || {};
  const hospitalInfo = {
    ...(config?.hospitalInfo || {}),
    ...propHospitalInfo,
  };
  const labels = {
    ...(activeTemplate.labels || config?.labels || {}),
    ...propLabels,
  };
  const fieldVisibility = {
    ...(activeTemplate.fieldVisibility || config?.fieldVisibility || {}),
    ...propFieldVisibility,
  };
  const customFields = propCustomFields.length > 0 ? propCustomFields : (activeTemplate.customFields || config?.customFields || []);

  const isVisible = (fieldKey) => fieldVisibility[fieldKey] !== false;

  // Extract patient details (from direct prop, bill, visit, or admission)
  const patient = propPatient || (typeof bill?.patientId === 'object' ? bill.patientId : null) || (typeof visit?.patientId === 'object' ? visit.patientId : null) || (typeof admission?.patientId === 'object' ? admission.patientId : null) || {};
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'Patient';
  const mrn = patient.mrn || 'N/A';
  const ageGender = `${patient.age ? `${patient.age} Y` : (patient.age != null ? `${patient.age} Y` : '—')} / ${patient.gender || '—'}`;
  const phone = patient.phone || '—';
  const bloodGroup = patient.bloodGroup || '—';

  const isHexId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

  // Extract doctor / consultant
  const doctorObj = (typeof visit?.consultation?.doctorId === 'object' ? visit.consultation.doctorId : null)
    || (typeof visit?.doctorId === 'object' ? visit.doctorId : null)
    || (typeof admission?.primaryDoctorId === 'object' ? admission.primaryDoctorId : null)
    || (typeof admission?.attendingDoctorId === 'object' ? admission.attendingDoctorId : null);

  const rawDoctor = doctorObj
    || (visit?.doctorName && !isHexId(visit.doctorName) ? visit.doctorName : null)
    || (visit?.consultation?.doctorId && typeof visit.consultation.doctorId === 'string' && !isHexId(visit.consultation.doctorId) ? visit.consultation.doctorId : null)
    || (admission?.attendingDoctorId && typeof admission.attendingDoctorId === 'string' && !isHexId(admission.attendingDoctorId) ? admission.attendingDoctorId : null)
    || 'Dr. Arjun Desai (Consultant)';

  const doctorName = formatDoctorName(rawDoctor);

  // Extract department & tokens
  const departmentName = (typeof visit?.departmentId === 'object' ? visit.departmentId?.name : null)
    || (typeof bill?.departmentId === 'object' ? bill.departmentId?.name : null)
    || (typeof admission?.admittingDepartmentId === 'object' ? admission.admittingDepartmentId?.name : null)
    || (visit?.departmentName && !isHexId(visit.departmentName) ? visit.departmentName : null)
    || (typeof visit?.departmentId === 'string' && !isHexId(visit.departmentId) ? visit.departmentId : null)
    || 'Outpatient General Care';
  const tokenString = visit?.tokenString || (visit?.visitNumber ? visit.visitNumber.slice(-4) : 'GENME-001');
  const reasonForVisit = visit?.reasonForVisit || visit?.chiefComplaint || 'Routine Medical Checkup';

  // Extract IPD stay details
  const admissionNo = admission?.admissionNumber || visit?.admissionId?.admissionNumber || (effectiveWorkflow === 'IPD' || effectiveWorkflow === 'COMPREHENSIVE' || effectiveWorkflow === 'SURGICAL' ? 'IPD-2026-0412' : null);
  const doa = admission?.admissionDate || visit?.admissionId?.admissionDate || (effectiveWorkflow !== 'OPD' ? '2026-08-25T10:00:00Z' : null);
  const dod = admission?.dischargeDate || visit?.admissionId?.dischargeDate || (effectiveWorkflow !== 'OPD' ? '2026-08-29T16:00:00Z' : null);
  const wardBed = admission?.bedId
    ? `${admission.bedId.wardClass || 'General Ward'} · Bed ${admission.bedId.bedNumber || '102'} (${admission.bedId.comfortTier || 'Standard'})`
    : (effectiveWorkflow !== 'OPD' ? 'Cardiology ICU · Room 302 · Bed ICU-04 (Deluxe)' : null);
  const diagnosis = admission?.diagnosis || visit?.diagnosis || (effectiveWorkflow !== 'OPD' ? 'Acute Coronary Syndrome (ICD-10: I20.0)' : 'General Consultation / Viral Fever');
  const insuranceProvider = admission?.insuranceDetails?.provider || visit?.insuranceProvider || (effectiveWorkflow === 'COMPREHENSIVE' || isVisible('insuranceTpa') ? 'Star Health & Allied Insurance' : null);
  const policyNo = admission?.insuranceDetails?.policyNumber || visit?.policyNumber || (effectiveWorkflow === 'COMPREHENSIVE' || isVisible('policyNo') ? 'POL-SH-9928194' : null);

  // Extract payment method from reception payment, ledger bill payment, or visit
  const effectivePaymentMethod = 
    visit?.receptionPayment?.paymentMethod ||
    (bill?.payments && bill.payments.length > 0 ? bill.payments[0].method : null) ||
    visit?.paymentMethod ||
    null;

  // Clean invoice number
  const formatInvoiceNumber = (rawId, vType) => {
    if (!rawId) return 'INV-2026-0894';
    const str = String(rawId);
    if (str.startsWith('INV-') || str.startsWith('OPD-') || str.startsWith('IPD-') || str.startsWith('EMG-') || str.startsWith('VST-')) {
      return str;
    }
    const clean = str.replace(/^[_\W]+/, '').replace(/^visit_mock_/, '');
    if (clean.length === 24) {
      const prefix = vType ? `${vType}-` : 'INV-';
      return `${prefix}${new Date().getFullYear()}-${clean.substring(clean.length - 8).toUpperCase()}`;
    }
    return `INV-${clean.toUpperCase()}`;
  };

  const cleanInvoiceNo = bill?.billNumber || visit?.billNumber || formatInvoiceNumber(bill?._id || visit?._id, effectiveWorkflow);

  const getDynamicValue = (fieldPath) => {
    if (!fieldPath) return '';
    if (fieldPath === 'patient.phone') return phone;
    if (fieldPath === 'patient.email') return patient.email || 'N/A';
    if (fieldPath === 'patient.bloodGroup') return bloodGroup;
    if (fieldPath === 'patient.city') return patient.address?.city || 'N/A';
    if (fieldPath === 'admission.wardBed') return wardBed || 'N/A';
    if (fieldPath === 'admission.admissionNo') return admissionNo || 'N/A';
    if (fieldPath === 'admission.diagnosis') return diagnosis || 'N/A';
    if (fieldPath === 'insurance.provider') return insuranceProvider || 'N/A';
    if (fieldPath === 'insurance.policyNo') return policyNo || 'N/A';
    if (fieldPath === 'visit.date') return visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    return 'N/A';
  };

  const renderCustomField = (field) => {
    const displayVal = field.valueType === 'static' ? field.staticValue : getDynamicValue(field.dynamicField);
    return (
      <div key={field.id} className="patient-info-row">
        <span className="info-label">{field.label}:</span>
        <span className="info-value">{displayVal}</span>
      </div>
    );
  };

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

  // Compile itemized rows
  const effectiveLineItems = propLineItems && propLineItems.length > 0
    ? propLineItems
    : bill?.lineItems && bill.lineItems.length > 0
    ? bill.lineItems
    : null;

  // Build segregated category groups
  const getCategorizedGroups = () => {
    if (effectiveLineItems && effectiveLineItems.length > 0) {
      const map = {};
      CLINICAL_CATEGORIES.forEach(cat => {
        map[cat.id] = { ...cat, items: [], subtotal: 0 };
      });

      effectiveLineItems.forEach(item => {
        const catKey = (item.category && map[item.category]) ? item.category : 'OTHER';
        const cost = Number(item.lineTotal != null ? item.lineTotal : item.amount || 0);
        map[catKey].items.push(item);
        map[catKey].subtotal += cost;
      });

      return CLINICAL_CATEGORIES
        .filter(cat => map[cat.id].items.length > 0)
        .map((cat, idx) => ({
          ...map[cat.id],
          sectionIndex: String.fromCharCode(65 + idx), // A, B, C...
        }));
    }

    // Direct OPD / Pharmacy dispensation props & visit fallbacks
    const active = [];

    const effectiveRegFee = Number(
      visit?.registrationFee != null ? visit.registrationFee :
      visit?.receptionPayment?.registrationFee != null ? visit.receptionPayment.registrationFee :
      visit?.billing?.registrationFee != null ? visit.billing.registrationFee :
      bill?.registrationFee != null ? bill.registrationFee :
      0
    );

    const effectiveConsultFee = Number(
      consultationFee > 0 ? consultationFee :
      visit?.consultationFee != null ? visit.consultationFee :
      visit?.receptionPayment?.consultationFee != null ? visit.receptionPayment.consultationFee :
      visit?.billing?.consultationFee != null ? visit.billing.consultationFee :
      0
    );

    if (effectiveRegFee > 0 && isVisible('registrationFee')) {
      active.push({
        id: 'REGISTRATION',
        title: 'Clinical Registration & Administrative Services',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: effectiveRegFee,
        items: [{
          description: labels.registrationFee || 'Patient Registration Fee',
          dateRange: visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          quantity: '1 Token',
          amount: effectiveRegFee,
          category: 'REGISTRATION',
        }],
      });
    }

    if (isVisible('consultationFee') && (effectiveConsultFee > 0 || (effectiveRegFee === 0 && visit?.consultationFee != null))) {
      active.push({
        id: 'CONSULTATION',
        title: effectiveConsultFee === 0 ? 'Doctor Consultation (Complimentary / Waived)' : 'Doctor Consultations & Specialist Reviews',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: effectiveConsultFee,
        items: [{
          description: labels.consultationFee || (effectiveConsultFee === 0 ? 'Doctor Consultation Fee (Complimentary)' : 'Doctor Consultation Fee'),
          dateRange: visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          quantity: '1 Visit',
          amount: effectiveConsultFee,
          category: 'CONSULTATION',
        }],
      });
    }

    if (isVisible('labCharges') && Number(labCharges) > 0) {
      active.push({
        id: 'DIAGNOSTICS',
        title: 'Laboratory & Diagnostic Investigations',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: Number(labCharges),
        items: [{
          description: labels.labCharges || 'Laboratory Diagnostic Investigation',
          dateRange: visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          quantity: '1 Panel',
          amount: Number(labCharges),
          category: 'DIAGNOSTICS',
        }],
      });
    }

    if (medications && medications.length > 0) {
      const medSubtotal = medications.reduce((sum, m) => {
        const q = Number(m.quantity) || 0;
        const up = Number(m.unitPrice) || 0;
        const lineAmt = m.amount !== undefined && m.amount !== '' && !isNaN(Number(m.amount)) ? Number(m.amount) : (q * up);
        return sum + lineAmt;
      }, 0);

      active.push({
        id: 'PHARMACY',
        title: 'Pharmacy Medications & Dispensed Drugs',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: medSubtotal,
        items: medications.map(med => {
          const qty = Number(med.quantity) || 1;
          const unitPrice = med.unitPrice !== undefined && med.unitPrice !== '' ? Number(med.unitPrice) : (Number(med.amount || 0) / qty);
          const totalAmt = Number(med.amount != null && med.amount !== '' ? med.amount : (qty * unitPrice));
          return {
            description: med.recommended + (med.alternativeGiven ? ` (Given: ${med.alternativeGiven})` : '') + (unitPrice > 0 ? ` @ ${currency}${unitPrice.toFixed(2)}/unit` : ''),
            dosageSchedule: med.dosageSchedule,
            dateRange: visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            quantity: `${qty} Units`,
            unitPrice,
            amount: totalAmt,
            category: 'PHARMACY',
          };
        }),
      });
    }

    if (active.length === 0) {
      active.push({
        id: 'CONSULTATION',
        title: 'Clinical Consultation (Nil Charge)',
        sectionIndex: 'A',
        subtotal: 0,
        items: [{
          description: 'Clinical Review & Consultation',
          dateRange: visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          quantity: 1,
          amount: 0,
          category: 'CONSULTATION',
        }],
      });
    }

    return active;
  };

  const categorizedGroups = getCategorizedGroups();

  // Compute subtotal and financials
  const grossBilled = financials?.grossBilled != null
    ? financials.grossBilled
    : bill?.billedAmount != null
    ? bill.billedAmount
    : total != null
    ? Number(total)
    : categorizedGroups.reduce((sum, g) => sum + g.subtotal, 0);

  const advanceDeposits = financials?.advancePaid != null
    ? financials.advancePaid
    : bill?.advanceCollected != null
    ? bill.advanceCollected
    : (effectiveWorkflow === 'IPD' && !bill && !visit ? 10000 : 0);

  const insuranceApproved = financials?.insuranceApproved || (effectiveWorkflow === 'COMPREHENSIVE' && !bill && !visit ? 15000 : 0);
  const adjustments = financials?.adjustments != null
    ? financials.adjustments
    : bill?.adjustedAmount != null
    ? bill.adjustedAmount
    : 0;

  const collectedAmount = financials?.collectedAmount != null
    ? financials.collectedAmount
    : bill?.collectedAmount != null
    ? bill.collectedAmount
    : (visit?.receptionPayment?.registrationFee ? Number(visit.receptionPayment.registrationFee) : 0);

  const isFullySettled = bill?.status === 'PAID' || (collectedAmount >= grossBilled && grossBilled > 0);
  const netPayable = Math.max(0, grossBilled - advanceDeposits - insuranceApproved - adjustments);

  const showSignatures = isVisible('pharmacistSignature') || isVisible('hospitalSeal') || isVisible('patientSignature') || isVisible('billingOfficer');
  const showFooterNote = isVisible('footerNote') && Boolean(labels.footerNote);

  // Compact Dosage Formatter for Pharmacy Line Items
  const formatDosageSchedule = (ds) => {
    if (!ds) return null;
    const m = ds.morning?.count ?? 0;
    const a = ds.afternoon?.count ?? 0;
    const n = ds.night?.count ?? 0;
    const rawTiming = ds.morning?.timing || ds.night?.timing || ds.afternoon?.timing;
    const timingLabel = rawTiming === 'AFTER_MEAL' ? 'After Meals' :
                        rawTiming === 'BEFORE_MEAL' ? 'Before Meals' :
                        rawTiming && rawTiming !== 'N/A' ? rawTiming.replace(/_/g, ' ') : '';
    return {
      pill: `${m}-${a}-${n}`,
      timing: timingLabel,
      full: `M:${m} · A:${a} · N:${n}${timingLabel ? ` (${timingLabel})` : ''}`,
    };
  };

  const isTokenOnly = documentMode === 'TOKEN_SLIP';
  const isInvoiceOnly = documentMode === 'INVOICE';
  const isCombined = documentMode === 'COMBINED';

  return (
    <div ref={ref} className={`billing-template-container billing-template-container--${effectiveWorkflow.toLowerCase()} ${isTokenOnly ? 'billing-template--token-only' : ''}`}>
      {/* 1. HOSPITAL BRANDING HEADER */}
      <div className="billing-header">
        <h1 className="hospital-name">{hospitalInfo.name || 'QUANTUM CAREONE HOSPITAL'}</h1>
        {hospitalInfo.subHeader && (
          <p className="hospital-subheader">{hospitalInfo.subHeader}</p>
        )}
        {isVisible('hospitalAddress') && hospitalInfo.address && (
          <p className="hospital-address">{hospitalInfo.address}</p>
        )}
        <div className="hospital-meta-row">
          {isVisible('hospitalContact') && hospitalInfo.phone && (
            <span className="hospital-contact">Ph: {hospitalInfo.phone}</span>
          )}
          {isVisible('hospitalContact') && hospitalInfo.email && (
            <span className="hospital-contact">Email: {hospitalInfo.email}</span>
          )}
          {isVisible('hospitalTaxId') && (hospitalInfo.gstin || hospitalInfo.taxId) && (
            <span className="hospital-tax-tag">
              GSTIN: {hospitalInfo.gstin || hospitalInfo.taxId}
            </span>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* 2. CLINICAL OPD QUEUE TOKEN & ROUTING CARD (When in TOKEN_SLIP or COMBINED mode) */}
      {(isTokenOnly || isCombined) && (
        <div className="billing-token-routing-card">
          <div className="token-routing-badge">
            <span className="token-routing-tag">QUEUE TOKEN</span>
            <span className="token-routing-number">{tokenString}</span>
          </div>
          <div className="token-routing-details">
            <div className="token-routing-item">
              <span className="token-item-label">{labels.department || 'Department'}:</span>
              <span className="token-item-val">{departmentName}</span>
            </div>
            <div className="token-routing-item">
              <span className="token-item-label">{labels.doctor || 'Physician'}:</span>
              <span className="token-item-val">{doctorName}</span>
            </div>
            <div className="token-routing-item">
              <span className="token-item-label">Visit Type:</span>
              <span className="token-item-val">{effectiveWorkflow} Walk-in</span>
            </div>
            <div className="token-routing-item">
              <span className="token-item-label">Reason:</span>
              <span className="token-item-val">{reasonForVisit}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. INVOICE TITLE & ENCOUNTER IDENTIFIERS (When in INVOICE or COMBINED mode) */}
      {!isTokenOnly && (
        <div className="billing-title">
          <div className="billing-title-left">
            <h2>{labels.title || (
              effectiveWorkflow === 'IPD' ? 'INPATIENT FINAL BILL & SETTLEMENT' :
              effectiveWorkflow === 'SURGICAL' ? 'SURGICAL & OPERATIVE INVOICE' :
              effectiveWorkflow === 'EMERGENCY' ? 'EMERGENCY & TRAUMA CARE INVOICE' :
              effectiveWorkflow === 'COMPREHENSIVE' ? 'CONSOLIDATED INPATIENT & INSURANCE CLAIM BILL' :
              'OUTPATIENT OPD VISIT BILL & RECEIPT'
            )}</h2>
            <span className="workflow-badge-tag">{effectiveWorkflow} ENCOUNTER</span>
          </div>
          <div className="billing-title-right">
            <div className="title-meta-item">
              <span className="meta-label">{labels.date || 'Date'}:</span>
              <span className="meta-val">{visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="title-meta-item">
              <span className="meta-label">{labels.billNo || 'Receipt No'}:</span>
              <span className="meta-val">{cleanInvoiceNo}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMPACT PATIENT & CLINICAL METADATA GRID */}
      <div className="patient-info">
        <div className="patient-info-grid">
          {/* Row 1: Demographics & Treating Consultant */}
          <div className="patient-info-row">
            <span className="info-label">{labels.patientName || 'Patient Name'}:</span>
            <span className="info-value"><strong>{patientName}</strong></span>
          </div>
          {isVisible('doctor') && (
            <div className="patient-info-row">
              <span className="info-label">{labels.doctor || (effectiveWorkflow === 'SURGICAL' ? 'Surgeon' : 'Doctor')}:</span>
              <span className="info-value">{doctorName}</span>
            </div>
          )}

          {/* Row 2: Identifiers */}
          <div className="patient-info-row">
            <span className="info-label">{labels.mrn || 'UHID / MRN'}:</span>
            <span className="info-value"><strong>{mrn}</strong></span>
          </div>
          {isVisible('ageGender') && (
            <div className="patient-info-row">
              <span className="info-label">{labels.ageGender || 'Age / Sex'}:</span>
              <span className="info-value">{ageGender}</span>
            </div>
          )}

          {/* Row 3: Contact & IPD Details */}
          {isVisible('phone') && phone && (
            <div className="patient-info-row">
              <span className="info-label">{labels.phone || 'Phone'}:</span>
              <span className="info-value">{phone}</span>
            </div>
          )}
          {bloodGroup && (
            <div className="patient-info-row">
              <span className="info-label">Blood Group:</span>
              <span className="info-value">{bloodGroup}</span>
            </div>
          )}
          {effectivePaymentMethod && (
            <div className="patient-info-row">
              <span className="info-label">Payment Mode:</span>
              <span className="info-value">{effectivePaymentMethod}</span>
            </div>
          )}

          {(effectiveWorkflow === 'IPD' || effectiveWorkflow === 'SURGICAL' || effectiveWorkflow === 'COMPREHENSIVE') && (
            <>
              {admissionNo && isVisible('admissionNo') && (
                <div className="patient-info-row">
                  <span className="info-label">{labels.admissionNo || 'IPD No'}:</span>
                  <span className="info-value">{admissionNo}</span>
                </div>
              )}
              {wardBed && isVisible('bedInfo') && (
                <div className="patient-info-row">
                  <span className="info-label">{labels.bedInfo || 'Ward / Bed'}:</span>
                  <span className="info-value">{wardBed}</span>
                </div>
              )}
              {doa && isVisible('admissionDate') && (
                <div className="patient-info-row">
                  <span className="info-label">{labels.admissionDate || 'DOA'}:</span>
                  <span className="info-value">{new Date(doa).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {dod && isVisible('dischargeDate') && (
                <div className="patient-info-row">
                  <span className="info-label">{labels.dischargeDate || 'DOD'}:</span>
                  <span className="info-value">{new Date(dod).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {diagnosis && isVisible('diagnosis') && (
                <div className="patient-info-row" style={{ gridColumn: 'span 2' }}>
                  <span className="info-label">{labels.diagnosis || 'Diagnosis'}:</span>
                  <span className="info-value">{diagnosis}</span>
                </div>
              )}
            </>
          )}

          {/* Insurance / TPA details */}
          {(effectiveWorkflow === 'COMPREHENSIVE' || isVisible('insuranceTpa')) && insuranceProvider && (
            <>
              <div className="patient-info-row">
                <span className="info-label">{labels.insuranceTpa || 'Insurance / TPA'}:</span>
                <span className="info-value">{insuranceProvider}</span>
              </div>
              {policyNo && (
                <div className="patient-info-row">
                  <span className="info-label">{labels.policyNo || 'Policy / Card No'}:</span>
                  <span className="info-value">{policyNo}</span>
                </div>
              )}
            </>
          )}

          {customFields.filter(f => f.position === 'patientInfo').map(field => renderCustomField(field))}
        </div>
      </div>

      {/* 5. CLINICAL ASSESSMENT SECTION (In Token Slip mode only) */}
      {isTokenOnly && (
        <div className="token-clinical-notes-block">
          <span className="token-notes-label">Attending Doctor Assessment &amp; Clinical Prescription:</span>
          <div className="token-notes-blank-area"></div>
        </div>
      )}

      {/* 6. HIGH-DENSITY SEGREGATED ITEMIZED CHARGES TABLE (In Invoice & Combined modes) */}
      {!isTokenOnly && (
        <>
          <table className="billing-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>{labels.description || 'Clinical Service / Fee Description'}</th>
                <th style={{ width: '20%' }}>{labels.serviceDate || 'Service Date'}</th>
                <th style={{ width: '12%', textAlign: 'center' }}>{labels.quantity || 'Qty'}</th>
                <th className="amount-col" style={{ width: '18%' }}>{labels.amount || 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {categorizedGroups.map((group) => (
                <React.Fragment key={group.id}>
                  {/* Category Subheader Banner with Subtotal */}
                  <tr className="billing-category-header-row">
                    <td colSpan="3" className="billing-category-title-cell">
                      <span className="billing-category-index-badge">{group.sectionIndex}</span>
                      <span className="billing-category-title-text">{group.title}</span>
                      <span className="billing-category-count-tag">({group.items.length} {group.items.length === 1 ? 'charge' : 'charges'})</span>
                    </td>
                    <td className="billing-category-subtotal-cell amount-col">
                      <span className="billing-category-subtotal-label">Subtotal:</span>{' '}
                      <span className="billing-category-subtotal-val">{currency}{group.subtotal.toFixed(2)}</span>
                    </td>
                  </tr>

                  {/* Categorized Line Items */}
                  {group.items.map((item, idx) => {
                    const dsInfo = item.dosageSchedule ? formatDosageSchedule(item.dosageSchedule) : null;
                    return (
                      <tr key={idx} className="billing-item-row">
                        <td className="billing-item-desc-cell">
                          <div className="item-name-row">
                            <span className="item-title">{item.description || item.name}</span>
                          </div>
                          {item.snapshotRulePath && (
                            <div className="item-notes-text" style={{ fontSize: '9px', color: '#64748b' }}>
                              Policy: {item.snapshotRulePath}
                            </div>
                          )}
                          {dsInfo && (
                            <div className="dosage-tabular-strip">
                              <span className="dosage-pill-badge">{dsInfo.pill}</span>
                              {dsInfo.timing && <span className="dosage-timing-text">{dsInfo.timing}</span>}
                            </div>
                          )}
                        </td>
                        <td className="item-date-text">
                          {item.dateRange || (item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'))}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity || 1}</td>
                        <td className="amount-col">
                          {currency}{Number(item.lineTotal != null ? item.lineTotal : item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* 7. COMPACT FINANCIAL RECONCILIATION SUMMARY */}
          <div className="financial-reconciliation-section">
            <div className="reconciliation-table-wrapper">
              <table className="reconciliation-table">
                <tbody>
                  <tr>
                    <td className="recon-label">Gross Billed Amount:</td>
                    <td className="recon-value">{currency}{grossBilled.toFixed(2)}</td>
                  </tr>

                  {advanceDeposits > 0 && isVisible('advanceSummary') && (
                    <tr className="recon-deduction">
                      <td className="recon-label">
                        Less Advance Deposit Paid:
                      </td>
                      <td className="recon-value">- {currency}{advanceDeposits.toFixed(2)}</td>
                    </tr>
                  )}

                  {insuranceApproved > 0 && isVisible('insuranceSummary') && (
                    <tr className="recon-deduction">
                      <td className="recon-label">
                        Less Insurance / TPA Coverage:
                      </td>
                      <td className="recon-value">- {currency}{insuranceApproved.toFixed(2)}</td>
                    </tr>
                  )}

                  {adjustments > 0 && (
                    <tr className="recon-deduction">
                      <td className="recon-label">Less Authorized Concessions:</td>
                      <td className="recon-value">- {currency}{adjustments.toFixed(2)}</td>
                    </tr>
                  )}

                  {isFullySettled && (
                    <tr className="recon-payment-status">
                      <td className="recon-label" style={{ color: '#16a34a', fontWeight: '600' }}>
                        Settlement Status:
                      </td>
                      <td className="recon-value" style={{ color: '#16a34a', fontWeight: '700' }}>
                        PAID ({effectivePaymentMethod || 'Cash'})
                      </td>
                    </tr>
                  )}

                  <tr className="recon-net-total">
                    <td className="recon-label-highlight">
                      {labels.totalAmount || (
                        advanceDeposits > 0 || insuranceApproved > 0
                          ? 'NET BALANCE PAYABLE'
                          : isFullySettled
                          ? 'TOTAL AMOUNT PAID'
                          : 'TOTAL AMOUNT PAID / DUE'
                      )}:
                    </td>
                    <td className="recon-value-highlight">
                      {currency}{netPayable.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 8. COMPACT SIGNATURE & AUTHORIZATION SECTION */}
      {showSignatures && (
        <div className="signature-area">
          {isVisible('patientSignature') && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.patientSignature || 'Patient / Attendant Signature'}</p>
            </div>
          )}

          {isVisible('billingOfficer') && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.billingOfficer || 'Cashier / Billing Desk'}</p>
            </div>
          )}

          {isVisible('hospitalSeal') && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.hospitalSeal || 'Hospital Stamp & Seal'}</p>
            </div>
          )}
        </div>
      )}

      {/* 9. FOOTER NOTE & LEGAL DISCLAIMER */}
      {(showFooterNote || customFields.filter(f => f.position === 'footer').length > 0) && (
        <div className="footer-note">
          {showFooterNote && <p>{labels.footerNote}</p>}
          {customFields.filter(f => f.position === 'footer').map(field => renderCustomField(field))}
        </div>
      )}
    </div>
  );
});

export default BillingTemplate;
