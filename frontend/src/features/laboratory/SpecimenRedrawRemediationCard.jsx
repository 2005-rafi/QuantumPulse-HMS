/**
 * SpecimenRedrawRemediationCard.jsx
 * Dynamic Phlebotomy Remediation & Specimen Recollection Engine.
 * 
 * Clinical Purpose:
 * When a specimen is rejected (due to hemolysis, clotting, QNS, or tube failure),
 * this component diagnoses the exact cause, provides automated clinical corrective protocols,
 * displays previous vs new specimen comparison, and guides the phlebotomist to collect a valid redraw.
 */

import React, { useState } from 'react';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import './SpecimenRedrawRemediationCard.css';

/**
 * Knowledge Base for Phlebotomy Failure Modes & Clinical Corrective Protocols
 */
const REMEDIATION_PROTOCOLS = {
  HEMOLYSIS: {
    category: 'Hemolysis / RBC Lysis',
    tips: [
      'Use a 21G or 22G needle instead of a smaller 23G/25G needle to prevent shear stress on RBCs.',
      'Allow the 70% isopropyl alcohol antiseptic swab to air dry completely (at least 30 seconds) before venipuncture.',
      'Do NOT leave tourniquet applied for longer than 1 minute (prevents hemoconcentration).',
      'Invert vacutainer tube 8–10 times gently — NEVER shake or vortex the blood tube vigorously.',
      'Ensure vacuum tube fills completely to the indicator line before withdrawing needle.',
    ],
  },
  CLOTTED: {
    category: 'Specimen Clotting / Fibrin Formations',
    tips: [
      'Immediately invert the anticoagulant tube (EDTA Lavender / Citrate Blue) 8–10 times upon draw.',
      'Ensure rapid venipuncture flow into the tube; avoid slow, dripping collection.',
      'Do not delay mixing while filling multiple tubes — invert each tube immediately after removing from holder.',
      'Verify tube expiration date to ensure anticoagulant vacuum potency.',
    ],
  },
  QNS: {
    category: 'Quantity Not Sufficient (QNS)',
    tips: [
      'Fill blood tube to the designated minimum volume fill line (minimum 2.0 mL for EDTA CBC).',
      'For Sodium Citrate tubes (Coagulation/PT-INR), maintain a strict 9:1 blood-to-anticoagulant ratio.',
      'If patient has difficult veins, use a pediatric collection tube or butterfly infusion set with safety lock.',
    ],
  },
  COMPROMISED: {
    category: 'Compromised / Leaking Tube / Contamination',
    tips: [
      'Inspect vacutainer tube for hairline cracks or compromised rubber stopper seals prior to puncture.',
      'Maintain strict sterile asepsis; ensure tube stopper remains dry and upright during transport.',
      'Affix fresh thermal barcode sticker vertically without covering the tube fill indicator window.',
    ],
  },
  DEFAULT: {
    category: 'Specimen Quality Assurance Failure',
    tips: [
      'Perform fresh venipuncture on the contralateral arm if possible.',
      'Confirm patient identity and diagnostic requisition before repuncturing.',
      'Invert tube gently 8–10 times and immediately affix the new specimen barcode.',
    ],
  },
};

const resolveProtocol = (reasonStr) => {
  const r = (reasonStr || '').toLowerCase();
  if (r.includes('hemoly') || r.includes('lysis') || r.includes('rbc')) return REMEDIATION_PROTOCOLS.HEMOLYSIS;
  if (r.includes('clot') || r.includes('fibrin') || r.includes('coagul')) return REMEDIATION_PROTOCOLS.CLOTTED;
  if (r.includes('qns') || r.includes('volume') || r.includes('insufficient') || r.includes('quantity')) return REMEDIATION_PROTOCOLS.QNS;
  if (r.includes('leak') || r.includes('compromis') || r.includes('contamin') || r.includes('tube')) return REMEDIATION_PROTOCOLS.COMPROMISED;
  return REMEDIATION_PROTOCOLS.DEFAULT;
};

export default function SpecimenRedrawRemediationCard({
  order,
  visit,
  onCollectRedraw,
  onOpenBarcode,
  disabled = false,
}) {
  const [correctiveNotes, setCorrectiveNotes] = useState('');

  const rejectionReason = order.rejectionReason || 'Specimen compromised or inconclusive; recollection commanded by Clinical Pathologist.';
  const protocol = resolveProtocol(rejectionReason);
  const retakeNumber = (order.retakeCount || (order.phlebotomyRetakes || []).length) + 1;
  const previousBarcode = order.specimenBarcode || `SPEC-${order._id?.toString().slice(-4).toUpperCase() || 'OLD'}`;
  const newBarcodeCandidate = `SPEC-${visit?.tokenString || 'LAB'}-${order._id?.toString().slice(-4).toUpperCase()}-R${retakeNumber}`;

  const handleRedrawClick = () => {
    if (onCollectRedraw) {
      onCollectRedraw(order, { correctiveNotes, isRedraw: true });
    }
  };

  return (
    <div className="srr-card" role="alert" aria-live="polite">
      {/* ── 1. Alert Strip Header ── */}
      <div className="srr-card__header">
        <div className="srr-card__header-left">
          <div className="srr-card__alert-icon">
            <span className="material-symbols-rounded">sync_problem</span>
          </div>
          <div>
            <h4 className="srr-card__title">Specimen Redraw &amp; Recollection Required</h4>
            <p className="srr-card__subtitle">
              Diagnostic test sample was rejected by Pathology. Follow the corrective protocol below to redraw a clean sample.
            </p>
          </div>
        </div>

        <div className="srr-card__attempt-badge">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>replay</span>
          <span>Redraw Attempt #{retakeNumber}</span>
        </div>
      </div>

      {/* ── 2. Rejection Diagnostics Cause ── */}
      <div className="srr-card__failure-box">
        <div className="srr-card__failure-label">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>report_problem</span>
          <span>Pathologist Rejection Diagnosis: {protocol.category}</span>
        </div>
        <div className="srr-card__failure-reason">
          &ldquo;{rejectionReason}&rdquo;
        </div>
        <div className="srr-card__failure-meta">
          <span>Rejected By: <strong>{order.rejectedBy?.fullName || 'Clinical Pathologist'}</strong></span>
          <span>•</span>
          <span>Status: <strong>PENDING FRESH RECOLLECTION</strong></span>
        </div>
      </div>

      {/* ── 3. Step-by-Step Clinical Corrective Protocol ── */}
      <div className="srr-card__remediation-guide">
        <div className="srr-card__guide-title">
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>fact_check</span>
          <span>Mandatory Corrective Phlebotomy Protocol:</span>
        </div>
        <ul className="srr-card__guide-list">
          {protocol.tips.map((tip, idx) => (
            <li key={idx}>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 4. Specimen Ledger Comparison (Old vs New) ── */}
      <div className="srr-card__comparison-grid">
        {/* Previous Compromised Specimen */}
        <div className="srr-card__specimen-col srr-card__specimen-col--previous">
          <div className="srr-card__col-title">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>cancel</span>
            <span>Previous Rejected Specimen</span>
          </div>
          <div className="srr-card__specimen-meta">
            <div>Barcode: <code>{previousBarcode}</code></div>
            <div>Outcome: <strong>Rejected &amp; Discarded</strong></div>
            <div>Reason: <em>{rejectionReason}</em></div>
          </div>
        </div>

        {/* Fresh Specimen to Collect */}
        <div className="srr-card__specimen-col srr-card__specimen-col--new">
          <div className="srr-card__col-title">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>add_circle</span>
            <span>New Replacement Specimen (Fresh)</span>
          </div>
          <div className="srr-card__specimen-meta">
            <div>Assigned Barcode: <code>{newBarcodeCandidate}</code></div>
            <div>Tube Required: <strong>{order.sampleType || 'EDTA Purple / SST Gold'}</strong></div>
            <div>Target: <strong>Clean Venipuncture (Contralateral Arm)</strong></div>
          </div>
        </div>
      </div>

      {/* ── 5. Corrective Action & Redraw Conclude ── */}
      <div className="srr-card__actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onOpenBarcode && (
            <Md3Button
              variant="outlined"
              size="small"
              onClick={() => onOpenBarcode(order)}
              title="Print replacement barcode label"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>barcode_scanner</span>
              <span>Print Replacement Label</span>
            </Md3Button>
          )}
        </div>

        <Md3Button
          variant="filled"
          size="medium"
          className="srr-card__btn-redraw"
          onClick={handleRedrawClick}
          loading={disabled}
        >
          <span className="material-symbols-rounded">check_circle</span>
          <span>Confirm Fresh Redraw Collected</span>
        </Md3Button>
      </div>
    </div>
  );
}
