/**
 * UnifiedPrintEngine.js
 * Centralized High-Fidelity Bill & Clinical Template Printing Engine.
 *
 * Capabilities:
 *  1. Isolated Iframe Print: Renders invoice DOM into an isolated off-screen frame
 *     with cloned styling tokens, eliminating all global CSS bleed (e.g. `body * { visibility: hidden }`).
 *  2. Direct Portal Print: Reliable native window.print() dispatcher with active print lock
 *     and lifecycle event hooks (beforeprint/afterprint) preventing premature unmounting.
 *  3. Canonical Data Normalizer: Standardizes live bills, historical ledger bills,
 *     and admission accounts into a uniform structure ready for BillingTemplate rendering.
 */

import { formatPatientPhone, formatDoctorName } from '../../../utils/patientFormatters';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

/**
 * Normalizes any bill, visit, or admission into a complete canonical bill structure.
 */
export const normalizeBillData = (rawBill = {}, rawPatient = null, rawVisit = null, rawAdmission = null) => {
  if (!rawBill && !rawVisit && !rawAdmission) {
    return null;
  }

  const bill = rawBill || {};
  const visit = rawVisit || (typeof bill.visitId === 'object' ? bill.visitId : null) || {};
  const admission = rawAdmission || (typeof bill.admissionId === 'object' ? bill.admissionId : null) || {};

  // Resolve Patient
  const rawP = rawPatient
    || (typeof bill.patientId === 'object' ? bill.patientId : null)
    || (typeof visit.patientId === 'object' ? visit.patientId : null)
    || (typeof admission.patientId === 'object' ? admission.patientId : null)
    || {};

  const firstName = rawP.firstName || rawP.name || '';
  const lastName = rawP.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
  const mrn = rawP.mrn || 'N/A';
  const rawPhone = rawP.phoneNumber || rawP.phone || '';
  const phone = formatPatientPhone(rawPhone) || '—';
  const age = rawP.age != null ? rawP.age : '—';
  const gender = rawP.gender || '—';
  const ageGender = `${age} Y / ${gender}`;
  const bloodGroup = rawP.bloodGroup || '—';

  const patient = {
    ...rawP,
    firstName,
    lastName,
    fullName,
    mrn,
    phone,
    age,
    gender,
    ageGender,
    bloodGroup,
  };

  // Resolve Workflow & Modality
  const effectiveWorkflow = (
    bill.visitType ||
    visit.visitType ||
    (bill.admissionId || admission._id ? 'IPD' : 'OPD')
  ).toUpperCase();

  // Resolve Invoice / Bill Number
  const billNumber = bill.billNumber || bill._id || `INV-${Date.now().toString(36).toUpperCase()}`;

  // Resolve Line Items
  const lineItems = (bill.lineItems || []).map((li, idx) => ({
    _id: li._id || `li-${idx}`,
    category: li.category || 'OTHER',
    description: li.description || 'Medical Service / Consumable',
    quantity: Number(li.quantity) || 1,
    unitPrice: Number(li.price != null ? li.price : (li.unitPrice != null ? li.unitPrice : 0)),
    lineTotal: Number(li.lineTotal != null ? li.lineTotal : (li.amount != null ? li.amount : 0)),
    serviceDate: li.serviceDate || bill.serviceDate || bill.createdAt,
    proofReference: li.proofReference || '',
  }));

  // Resolve Advance Payments
  const payments = bill.payments || [];
  const advanceFromPayments = payments
    .filter((p) => p.type === 'ADVANCE_DEPOSIT' || p.method === 'ADVANCE')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const advanceCollected = Number(bill.advanceCollected != null ? bill.advanceCollected : advanceFromPayments);

  // Financial Breakdown
  const grossBilled = Number(
    bill.billedAmount != null
      ? bill.billedAmount
      : bill.totalAmount != null
      ? bill.totalAmount
      : lineItems.reduce((acc, li) => acc + (li.lineTotal || 0), 0)
  );

  const discountAmount = Number(bill.discountAmount || 0);
  const adjustedAmount = Number(bill.adjustedAmount || 0);
  const collectedAmount = Number(bill.collectedAmount || 0);
  const netDue = Math.max(0, grossBilled - advanceCollected - discountAmount - adjustedAmount - collectedAmount);

  return {
    ...bill,
    billNumber,
    workflowType: effectiveWorkflow,
    patient,
    lineItems,
    payments,
    grossBilled,
    advanceCollected,
    discountAmount,
    adjustedAmount,
    collectedAmount,
    netDue,
    visit,
    admission,
  };
};

/**
 * Print via Isolated Hidden Iframe.
 * Clones the printable HTML and stylesheets into an isolated sandbox iframe.
 * Completely immune to main window CSS bleed, modals, and visibility rules.
 */
export const printViaIframe = (printableHtml, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Remove any leftover iframe
      const oldFrame = document.getElementById('unified-print-sandbox-frame');
      if (oldFrame && oldFrame.parentNode) {
        oldFrame.parentNode.removeChild(oldFrame);
      }

      // Create hidden sandbox iframe with REAL dimensions to prevent Chromium 0x0 canvas collapse
      const iframe = document.createElement('iframe');
      iframe.id = 'unified-print-sandbox-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1024px';
      iframe.style.height = '1400px';
      iframe.style.border = '0';
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'none';
      iframe.style.visibility = 'visible';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow.document;
      const pageTitle = options.title || 'Official Hospital Invoice';
      const paperSize = options.paperSize || 'A4 portrait';

      // Harvest active stylesheets (excluding main root-hiding rules)
      let stylesMarkup = '';
      document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
        stylesMarkup += node.outerHTML;
      });

      // Write isolated document with self-contained, high-fidelity medical invoice styling
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>${pageTitle}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            ${stylesMarkup}
            <style>
              @page {
                size: ${paperSize};
                margin: ${paperSize.includes('80mm') ? '0 !important' : '8mm 10mm'};
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
              .unified-print-sandbox-wrapper,
              .unified-print-portal,
              .billing-print-portal,
              .unified-bill-sheet {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                display: block !important;
                position: static !important;
              }

              /* ── A4 Hospital Invoice Styles ── */
              .a4-invoice-sheet {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
                color: #0f172a !important;
                font-size: 10.5px !important;
                line-height: 1.35 !important;
              }
              .a4-header {
                text-align: center !important;
                margin-bottom: 6px !important;
              }
              .a4-header__title {
                font-size: 16px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                margin: 0 0 2px 0 !important;
              }
              .a4-header__sub {
                font-size: 10px !important;
                color: #475569 !important;
                margin: 0 0 2px 0 !important;
              }
              .a4-header__address {
                font-size: 9.5px !important;
                color: #64748b !important;
                margin: 1px 0 !important;
              }
              .a4-header__meta-row {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                font-size: 9.5px !important;
                color: #475569 !important;
                margin-top: 2px !important;
              }
              .a4-header__tax-badge {
                font-size: 9px !important;
                font-weight: 700 !important;
                background: #f1f5f9 !important;
                padding: 1px 6px !important;
                border-radius: 3px !important;
                border: 1px solid #cbd5e1 !important;
              }
              .a4-divider {
                border: 0 !important;
                height: 1px !important;
                background: #cbd5e1 !important;
                margin: 8px 0 10px 0 !important;
              }
              .a4-title-bar {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                margin-bottom: 8px !important;
              }
              .a4-title-bar__heading {
                font-size: 12.5px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                margin: 0 !important;
              }
              .a4-title-bar__badge {
                font-size: 8.5px !important;
                font-weight: 700 !important;
                background: #eff6ff !important;
                color: #1e40af !important;
                padding: 1px 5px !important;
                border: 1px solid #bfdbfe !important;
                border-radius: 3px !important;
              }
              .a4-title-bar__right {
                display: flex !important;
                gap: 14px !important;
              }
              .a4-meta-item {
                font-size: 9.5px !important;
                display: flex !important;
                gap: 4px !important;
              }
              .a4-meta-item__label {
                color: #64748b !important;
                font-weight: 600 !important;
              }
              .a4-meta-item__val {
                color: #0f172a !important;
                font-weight: 700 !important;
              }
              .a4-demographics-card {
                display: flex !important;
                flex-direction: row !important;
                gap: 16px !important;
                background: #f8fafc !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                margin-bottom: 12px !important;
                page-break-inside: avoid !important;
              }
              .a4-demographics-col {
                flex: 1 1 50% !important;
                width: 50% !important;
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 3px !important;
              }
              .a4-field-row {
                display: flex !important;
                flex-direction: row !important;
                align-items: baseline !important;
                font-size: 9.5px !important;
                line-height: 1.35 !important;
              }
              .a4-field-label {
                flex: 0 0 115px !important;
                width: 115px !important;
                color: #475569 !important;
                font-weight: 600 !important;
                white-space: nowrap !important;
              }
              .a4-field-val {
                flex: 1 !important;
                min-width: 0 !important;
                color: #0f172a !important;
                word-break: break-word !important;
              }
              .a4-field-val--strong {
                font-weight: 700 !important;
              }
              .a4-table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 9.5px !important;
                line-height: 1.3 !important;
              }
              .a4-table th {
                background: #f1f5f9 !important;
                color: #0f172a !important;
                font-weight: 700 !important;
                padding: 6px 8px !important;
                border-top: 1px solid #cbd5e1 !important;
                border-bottom: 1.5px solid #94a3b8 !important;
              }
              .a4-th-desc, .a4-td-desc { width: 48% !important; text-align: left !important; }
              .a4-th-date, .a4-td-date { width: 14% !important; text-align: center !important; }
              .a4-th-qty, .a4-td-qty { width: 10% !important; text-align: center !important; }
              .a4-th-rate, .a4-td-rate { width: 13% !important; text-align: right !important; }
              .a4-th-amt, .a4-td-amt { width: 15% !important; text-align: right !important; }
              .a4-cat-row td {
                background: #f8fafc !important;
                border-top: 1.5px solid #cbd5e1 !important;
                border-bottom: 1px solid #cbd5e1 !important;
                padding: 4px 8px !important;
              }
              .a4-cat-badge-wrap { display: flex !important; align-items: center !important; gap: 6px !important; }
              .a4-cat-badge {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #1e40af !important;
                color: #ffffff !important;
                font-size: 8px !important;
                font-weight: 800 !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 3px !important;
              }
              .a4-cat-title { font-size: 9.5px !important; font-weight: 700 !important; text-transform: uppercase !important; }
              .a4-cat-subtotal { text-align: right !important; font-size: 9.5px !important; font-weight: 700 !important; }
              .a4-item-row td {
                padding: 4px 8px !important;
                border-bottom: 1px solid #e2e8f0 !important;
                vertical-align: top !important;
              }
              .a4-summary-section {
                display: flex !important;
                justify-content: flex-end !important;
                margin-top: 8px !important;
                page-break-inside: avoid !important;
              }
              .a4-summary-box {
                width: 320px !important;
                background: #f8fafc !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
              }
              .a4-summary-row {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                font-size: 9.5px !important;
                padding: 2px 0 !important;
              }
              .a4-summary-row--net {
                border-top: 1.5px solid #94a3b8 !important;
                margin-top: 4px !important;
                padding-top: 4px !important;
              }
              .a4-net-label { font-size: 10.5px !important; font-weight: 800 !important; color: #0f172a !important; }
              .a4-net-val { font-size: 13px !important; font-weight: 900 !important; color: #0f766e !important; }
              .a4-signatures {
                display: flex !important;
                justify-content: space-between !important;
                padding-top: 14px !important;
                border-top: 1px dashed #cbd5e1 !important;
                margin-top: 24px !important;
                page-break-inside: avoid !important;
              }
              .a4-sig-block { text-align: center !important; flex: 1 !important; max-width: 180px !important; }
              .a4-sig-line { border-top: 1px solid #0f172a !important; margin-bottom: 4px !important; }
              .a4-sig-label { font-size: 8.5px !important; font-weight: 600 !important; color: #475569 !important; }
              .a4-footer-note {
                text-align: center !important;
                font-size: 8px !important;
                color: #64748b !important;
                margin-top: 10px !important;
                border-top: 1px dotted #e2e8f0 !important;
                padding-top: 4px !important;
              }

              /* ── 80mm Thermal POS Slip Styles ── */
              .thermal-pos-slip {
                width: 100% !important;
                max-width: 76mm !important;
                margin: 0 auto !important;
                padding: 4mm 2mm !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 10px !important;
                line-height: 1.3 !important;
              }
              .pos-header { text-align: center !important; margin-bottom: 4px !important; }
              .pos-hospital-title { font-size: 13px !important; font-weight: 900 !important; text-transform: uppercase !important; margin: 0 0 2px 0 !important; }
              .pos-hospital-sub { font-size: 8.5px !important; font-weight: 700 !important; text-transform: uppercase !important; margin: 0 0 1px 0 !important; }
              .pos-hospital-contact { font-size: 8px !important; margin: 0 0 2px 0 !important; }
              .pos-time { font-size: 8.5px !important; font-family: ui-monospace, monospace !important; }
              .pos-divider--heavy { border: 0 !important; border-top: 2px solid #000000 !important; margin: 4px 0 !important; }
              .pos-divider--dashed { border: 0 !important; border-top: 1px dashed #000000 !important; margin: 4px 0 !important; }
              .pos-divider--cut { border: 0 !important; border-top: 1px dotted #000000 !important; margin: 8px 0 4px 0 !important; }
              .pos-token-block {
                text-align: center !important;
                border: 2px solid #000000 !important;
                border-radius: 4px !important;
                padding: 6px 2px !important;
                margin: 3px 0 !important;
              }
              .pos-token-tag { display: block !important; font-size: 8px !important; font-weight: 900 !important; text-transform: uppercase !important; }
              .pos-token-number { font-size: 32px !important; font-weight: 900 !important; letter-spacing: 1px !important; line-height: 1 !important; margin: 2px 0 !important; font-family: ui-monospace, monospace !important; }
              .pos-chamber-tag { display: inline-block !important; font-size: 9px !important; font-weight: 800 !important; border-top: 1px solid #000000 !important; padding-top: 2px !important; }
              .pos-barcode-wrap { display: flex !important; justify-content: center !important; margin: 4px 0 !important; }
              .pos-meta-list { display: flex !important; flex-direction: column !important; gap: 2px !important; }
              .pos-meta-row { display: flex !important; justify-content: space-between !important; font-size: 9.5px !important; }
              .pos-label { font-weight: 500 !important; color: #000000 !important; }
              .pos-val { font-weight: 600 !important; text-align: right !important; }
              .pos-val--bold { font-weight: 800 !important; }
              .pos-val--mono { font-family: ui-monospace, monospace !important; }
              .pos-fee-block { display: flex !important; flex-direction: column !important; gap: 2px !important; }
              .pos-meta-row--total { border-top: 1.5px solid #000000 !important; padding-top: 2px !important; }
              .pos-label--heavy, .pos-val--heavy { font-size: 11px !important; font-weight: 900 !important; }
              .pos-footer { text-align: center !important; font-size: 8px !important; line-height: 1.2 !important; margin-top: 4px !important; }
              .pos-cut-notice { font-size: 7.5px !important; font-weight: 800 !important; letter-spacing: 1px !important; margin-top: 4px !important; }

              /* ── Backwards-Compatible Legacy BillingTemplate Rules ── */
              .patient-info {
                background: #f8fafc !important;
                padding: 6px 10px !important;
                border-radius: 5px !important;
                border: 1px solid #cbd5e1 !important;
                margin-bottom: 8px !important;
              }
              .patient-info-grid {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 4px 14px !important;
              }
              .patient-info-row {
                flex: 1 1 calc(50% - 14px) !important;
                display: flex !important;
                align-items: baseline !important;
                font-size: 9.5px !important;
                line-height: 1.35 !important;
              }
              .patient-info-row .info-label {
                flex: 0 0 115px !important;
                width: 115px !important;
                color: #64748b !important;
                font-weight: 600 !important;
              }
              .patient-info-row .info-value {
                flex: 1 !important;
                color: #0f172a !important;
              }

              .no-print {
                display: none !important;
              }
            </style>
          </head>
          <body>
            <div class="unified-print-sandbox-wrapper unified-print-portal billing-print-portal unified-bill-sheet">
              ${printableHtml}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      const cleanup = () => {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          resolve(true);
        }, 600);
      };

      const triggerPrint = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } catch (err) {
              console.warn('[UnifiedPrintEngine] Iframe print call failed, triggering window.print():', err);
              window.print();
            }
            iframe.contentWindow.onafterprint = cleanup;

            // Fallback cleanup in case onafterprint is bypassed by user cancelling dialog
            setTimeout(cleanup, 12000);
          }, 300);
        });
      };

      if (iframe.contentWindow.document.readyState === 'complete') {
        triggerPrint();
      } else {
        iframe.contentWindow.onload = triggerPrint;
      }
    } catch (err) {
      console.error('[UnifiedPrintEngine] Iframe print failure, falling back to window.print:', err);
      window.print();
      resolve(false);
    }
  });
};

/**
 * Print a DOM element directly by cloning its HTML into the isolated iframe.
 */
export const printElement = (elementOrRef, options = {}) => {
  const node = elementOrRef?.current || elementOrRef;
  if (!node) {
    console.warn('[UnifiedPrintEngine] No DOM node provided for printing');
    return Promise.resolve(false);
  }
  // Preserve outer container attributes and structure if available
  const content = node.outerHTML || node.innerHTML;
  return printViaIframe(content, options);
};

export default {
  normalizeBillData,
  printViaIframe,
  printElement,
};
