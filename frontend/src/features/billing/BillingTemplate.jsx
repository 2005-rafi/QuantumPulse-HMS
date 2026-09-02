import React from 'react';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './BillingTemplate.css';

/**
 * Dynamic Multi-Workflow High-Density Billing Template Component
 * Designed for paper conservation (11px base print typography) and single-page A4 optimization.
 * Supports: OPD, IPD Inpatient Stay, Surgical & OT, Emergency, and Comprehensive Insurance Claims
 */
const BillingTemplate = React.forwardRef(({
  hospitalInfo = {},
  labels = {},
  fieldVisibility = {},
  customFields = [],
  workflowType = 'OPD', // 'OPD' | 'IPD' | 'SURGICAL' | 'EMERGENCY' | 'COMPREHENSIVE'
  visit = null,
  admission = null,
  lineItems = null,
  medications = [],
  consultationFee = 0,
  labCharges = 0,
  financials = null,
  total,
  currency = CURRENCY_SYMBOL,
}, ref) => {
  // Determine effective workflow from props or data
  const effectiveWorkflow = workflowType || (
    visit?.visitType === 'IPD' || admission ? 'IPD' :
    visit?.visitType === 'EMERGENCY' ? 'EMERGENCY' :
    'OPD'
  );

  const isVisible = (fieldKey) => fieldVisibility[fieldKey] !== false;

  // Extract patient details
  const patient = visit?.patientId || admission?.patientId || {};
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const mrn = patient.mrn || 'N/A';
  const ageGender = `${patient.age ? `${patient.age} Y` : '—'} / ${patient.gender || '—'}`;
  const phone = patient.phone || '—';
  const bloodGroup = patient.bloodGroup || '—';

  // Extract doctor / consultant
  const doctorName = visit?.consultation?.doctorId
    ? (typeof visit.consultation.doctorId === 'object'
        ? `Dr. ${visit.consultation.doctorId.firstName || ''} ${visit.consultation.doctorId.lastName || ''}`.trim()
        : `Dr. ${visit.consultation.doctorId}`)
    : admission?.attendingDoctorId
    ? (typeof admission.attendingDoctorId === 'object'
        ? `Dr. ${admission.attendingDoctorId.firstName || ''} ${admission.attendingDoctorId.lastName || ''}`.trim()
        : `Dr. ${admission.attendingDoctorId}`)
    : 'Dr. Arjun Desai (Consultant)';

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

  // Clean invoice number (convert raw 24-char ObjectId to clean INV-2026-XXXX)
  const formatInvoiceNumber = (rawId, vType) => {
    if (!rawId) return 'INV-2026-0894';
    const str = String(rawId);
    if (str.startsWith('INV-') || str.startsWith('OPD-') || str.startsWith('IPD-') || str.startsWith('EMG-')) {
      return str;
    }
    const clean = str.replace(/^[_\W]+/, '').replace(/^visit_mock_/, '');
    if (clean.length === 24) {
      const prefix = vType ? `${vType}-` : 'INV-';
      return `${prefix}${new Date().getFullYear()}-${clean.substring(clean.length - 8).toUpperCase()}`;
    }
    return `INV-${clean.toUpperCase()}`;
  };

  const cleanInvoiceNo = visit?.billNumber || formatInvoiceNumber(visit?._id, effectiveWorkflow);

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
    { id: 'CONSULTATION', title: 'Doctor Consultations & Specialist Reviews' },
    { id: 'BED_CHARGES', title: 'Room, Bed & Inpatient Nursing Accommodation' },
    { id: 'PROCEDURE', title: 'Surgical Procedures & Operative Services' },
    { id: 'DIAGNOSTICS', title: 'Laboratory & Diagnostic Investigations' },
    { id: 'PHARMACY', title: 'Pharmacy Medications & Dispensed Drugs' },
    { id: 'CONSUMABLES', title: 'Medical Consumables & Surgical Disposables' },
    { id: 'REGISTRATION', title: 'Clinical Registration & Administrative Services' },
    { id: 'OTHER', title: 'General Hospital Services & Sundry Charges' },
  ];

  // Compile itemized rows
  const effectiveLineItems = lineItems && lineItems.length > 0
    ? lineItems
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

    // Direct OPD / Pharmacy dispensation props
    const active = [];
    if (isVisible('consultationFee') && Number(consultationFee) > 0) {
      active.push({
        id: 'CONSULTATION',
        title: 'Doctor Consultations & Specialist Reviews',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: Number(consultationFee),
        items: [{
          description: labels.consultationFee || 'Doctor Consultation Fee',
          dateRange: new Date().toLocaleDateString('en-IN'),
          quantity: '1 Visit',
          amount: Number(consultationFee),
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
          dateRange: new Date().toLocaleDateString('en-IN'),
          quantity: '1 Panel',
          amount: Number(labCharges),
          category: 'DIAGNOSTICS',
        }],
      });
    }

    if (medications && medications.length > 0) {
      const medSubtotal = medications.reduce((sum, m) => sum + Number(m.amount || 0), 0);
      active.push({
        id: 'PHARMACY',
        title: 'Pharmacy Medications & Dispensed Drugs',
        sectionIndex: String.fromCharCode(65 + active.length),
        subtotal: medSubtotal,
        items: medications.map(med => ({
          description: med.recommended + (med.alternativeGiven ? ` (Given: ${med.alternativeGiven})` : ''),
          dosageSchedule: med.dosageSchedule,
          dateRange: new Date().toLocaleDateString('en-IN'),
          quantity: med.quantity,
          amount: Number(med.amount || 0),
          category: 'PHARMACY',
        })),
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
          dateRange: new Date().toLocaleDateString('en-IN'),
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
    : total != null
    ? Number(total)
    : categorizedGroups.reduce((sum, g) => sum + g.subtotal, 0);

  const advanceDeposits = financials?.advancePaid || (effectiveWorkflow === 'IPD' || effectiveWorkflow === 'COMPREHENSIVE' ? 10000 : 0);
  const insuranceApproved = financials?.insuranceApproved || (effectiveWorkflow === 'COMPREHENSIVE' ? 15000 : 0);
  const adjustments = financials?.adjustments || 0;
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

  return (
    <div ref={ref} className="billing-template-container">
      {/* 1. HOSPITAL BRANDING HEADER */}
      <div className="billing-header">
        <h1 className="hospital-name">{hospitalInfo.name || 'GLOBAL HEALTH HOSPITAL'}</h1>
        {isVisible('hospitalAddress') && hospitalInfo.address && (
          <p className="hospital-address">{hospitalInfo.address}</p>
        )}
        <div className="hospital-meta-row">
          {isVisible('hospitalContact') && hospitalInfo.contact && (
            <span className="hospital-contact">{hospitalInfo.contact}</span>
          )}
          {isVisible('hospitalTaxId') && (hospitalInfo.taxId || hospitalInfo.gstin) && (
            <span className="hospital-tax-tag">
              {hospitalInfo.taxId || `GSTIN: ${hospitalInfo.gstin || '29AAAAA0000A1Z5'}`}
            </span>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* 2. INVOICE TITLE & ENCOUNTER IDENTIFIERS */}
      <div className="billing-title">
        <div className="billing-title-left">
          <h2>{labels.title || (
            effectiveWorkflow === 'IPD' ? 'INPATIENT FINAL BILL & SETTLEMENT' :
            effectiveWorkflow === 'SURGICAL' ? 'SURGICAL & OPERATIVE INVOICE' :
            effectiveWorkflow === 'EMERGENCY' ? 'EMERGENCY & TRAUMA CARE INVOICE' :
            effectiveWorkflow === 'COMPREHENSIVE' ? 'CONSOLIDATED INPATIENT & INSURANCE CLAIM BILL' :
            'OFFICIAL MEDICAL BILL'
          )}</h2>
          <span className="workflow-badge-tag">{effectiveWorkflow} ENCOUNTER</span>
        </div>
        <div className="billing-title-right">
          <div className="title-meta-item">
            <span className="meta-label">{labels.date || 'Date'}:</span>
            <span className="meta-val">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="title-meta-item">
            <span className="meta-label">{labels.billNo || 'Bill No'}:</span>
            <span className="meta-val">{cleanInvoiceNo}</span>
          </div>
        </div>
      </div>

      {/* 3. COMPACT PATIENT & CLINICAL METADATA GRID */}
      <div className="patient-info">
        <div className="patient-info-grid">
          {/* Row 1: Demographics & Treating Consultant */}
          <div className="patient-info-row">
            <span className="info-label">{labels.patientName || 'Patient Name'}:</span>
            <span className="info-value">{patientName}</span>
          </div>
          {isVisible('doctor') && (
            <div className="patient-info-row">
              <span className="info-label">{labels.doctor || (effectiveWorkflow === 'SURGICAL' ? 'Surgeon' : 'Doctor')}:</span>
              <span className="info-value">{doctorName}</span>
            </div>
          )}

          {/* Row 2: Identifiers */}
          <div className="patient-info-row">
            <span className="info-label">{labels.mrn || 'MRN'}:</span>
            <span className="info-value">{mrn}</span>
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
              <span className="info-label">Phone:</span>
              <span className="info-value">{phone}</span>
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

      {/* 4. HIGH-DENSITY SEGREGATED ITEMIZED CHARGES TABLE */}
      <table className="billing-table">
        <thead>
          <tr>
            <th style={{ width: '50%' }}>{labels.description || 'Clinical Service / Medication Description'}</th>
            <th style={{ width: '20%' }}>{labels.serviceDate || 'Service Date'}</th>
            <th style={{ width: '12%', textAlign: 'center' }}>{labels.quantity || 'Qty / Units'}</th>
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
                      {item.notes && (
                        <div className="item-notes-text">{item.notes}</div>
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

      {/* 5. COMPACT FINANCIAL RECONCILIATION SUMMARY */}
      <div className="financial-reconciliation-section">
        <div className="reconciliation-table-wrapper">
          <table className="reconciliation-table">
            <tbody>
              <tr>
                <td className="recon-label">Gross Invoiced Total:</td>
                <td className="recon-value">{currency}{grossBilled.toFixed(2)}</td>
              </tr>

              {advanceDeposits > 0 && isVisible('advanceSummary') && (
                <tr className="recon-deduction">
                  <td className="recon-label">
                    Less Advance Paid (Receipt #ADV-0412):
                  </td>
                  <td className="recon-value">- {currency}{advanceDeposits.toFixed(2)}</td>
                </tr>
              )}

              {insuranceApproved > 0 && isVisible('insuranceSummary') && (
                <tr className="recon-deduction">
                  <td className="recon-label">
                    Less Insurance / TPA Approved Claim:
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

              <tr className="recon-net-total">
                <td className="recon-label-highlight">
                  {labels.totalAmount || (
                    advanceDeposits > 0 || insuranceApproved > 0
                      ? 'NET BALANCE PAYABLE'
                      : 'TOTAL AMOUNT DUE'
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

      {/* 6. COMPACT SIGNATURE & AUTHORIZATION SECTION */}
      {showSignatures && (
        <div className="signature-area">
          {isVisible('patientSignature') && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.patientSignature || 'Patient / Attendant Signature'}</p>
              <span className="signature-subtext">Received medicines/services in satisfactory condition</span>
            </div>
          )}

          {isVisible('pharmacistSignature') && Boolean(labels.pharmacistSignature) && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.pharmacistSignature || 'Dispensing Pharmacist'}</p>
            </div>
          )}

          {isVisible('hospitalSeal') && (
            <div className="signature-block">
              <div className="signature-line"></div>
              <p>{labels.hospitalSeal || 'Authorized Hospital Seal & Billing Desk'}</p>
            </div>
          )}
        </div>
      )}

      {/* 7. FOOTER NOTE & LEGAL DISCLAIMER */}
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


