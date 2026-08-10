import React from 'react';
import { createPortal } from 'react-dom';
import { formatDob, getPatientInitials } from '../../utils/patientFormatters';
import './PrintablePatientIdCard.css';

/* ── SVG Icons ── */
const IconMedicalCross = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconPrint = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── Vector Barcode Graphic ── */
const SvgBarcode = () => (
  <svg className="id-card-barcode-svg" viewBox="0 0 200 30" preserveAspectRatio="none">
    <rect x="0" y="0" width="3" height="30" fill="currentColor" />
    <rect x="5" y="0" width="1" height="30" fill="currentColor" />
    <rect x="8" y="0" width="4" height="30" fill="currentColor" />
    <rect x="15" y="0" width="2" height="30" fill="currentColor" />
    <rect x="20" y="0" width="5" height="30" fill="currentColor" />
    <rect x="27" y="0" width="1" height="30" fill="currentColor" />
    <rect x="30" y="0" width="3" height="30" fill="currentColor" />
    <rect x="35" y="0" width="2" height="30" fill="currentColor" />
    <rect x="40" y="0" width="6" height="30" fill="currentColor" />
    <rect x="48" y="0" width="2" height="30" fill="currentColor" />
    <rect x="52" y="0" width="4" height="30" fill="currentColor" />
    <rect x="58" y="0" width="1" height="30" fill="currentColor" />
    <rect x="62" y="0" width="3" height="30" fill="currentColor" />
    <rect x="67" y="0" width="5" height="30" fill="currentColor" />
    <rect x="74" y="0" width="2" height="30" fill="currentColor" />
    <rect x="78" y="0" width="1" height="30" fill="currentColor" />
    <rect x="81" y="0" width="4" height="30" fill="currentColor" />
    <rect x="87" y="0" width="2" height="30" fill="currentColor" />
    <rect x="91" y="0" width="5" height="30" fill="currentColor" />
    <rect x="98" y="0" width="1" height="30" fill="currentColor" />
    <rect x="101" y="0" width="3" height="30" fill="currentColor" />
    <rect x="106" y="0" width="2" height="30" fill="currentColor" />
    <rect x="110" y="0" width="6" height="30" fill="currentColor" />
    <rect x="118" y="0" width="2" height="30" fill="currentColor" />
    <rect x="122" y="0" width="4" height="30" fill="currentColor" />
    <rect x="128" y="0" width="1" height="30" fill="currentColor" />
    <rect x="131" y="0" width="3" height="30" fill="currentColor" />
    <rect x="136" y="0" width="5" height="30" fill="currentColor" />
    <rect x="143" y="0" width="2" height="30" fill="currentColor" />
    <rect x="147" y="0" width="4" height="30" fill="currentColor" />
    <rect x="153" y="0" width="1" height="30" fill="currentColor" />
    <rect x="156" y="0" width="3" height="30" fill="currentColor" />
    <rect x="161" y="0" width="5" height="30" fill="currentColor" />
    <rect x="168" y="0" width="2" height="30" fill="currentColor" />
    <rect x="172" y="0" width="1" height="30" fill="currentColor" />
    <rect x="175" y="0" width="4" height="30" fill="currentColor" />
    <rect x="181" y="0" width="2" height="30" fill="currentColor" />
    <rect x="185" y="0" width="5" height="30" fill="currentColor" />
    <rect x="192" y="0" width="1" height="30" fill="currentColor" />
    <rect x="195" y="0" width="3" height="30" fill="currentColor" />
  </svg>
);

const PrintablePatientIdCard = ({ patient, onClose, inline = false }) => {
  if (!patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const CardContent = () => (
    <div className="id-card-physical">
      {/* Card Header Banner */}
      <div className="id-card-brand-header">
        <div className="id-card-brand-logo">
          <IconMedicalCross />
        </div>
        <div className="id-card-brand-text">
          <span className="id-card-hospital-name">HMS CLINICAL CENTER</span>
          <span className="id-card-doc-type">PATIENT IDENTIFICATION CARD</span>
        </div>
      </div>

      {/* Card Main Body */}
      <div className="id-card-content">
        
        {/* Identity Row: Avatar + Name & UHID */}
        <div className="id-card-identity-row">
          <div className="id-card-avatar">
            {getPatientInitials(patient)}
          </div>
          <div className="id-card-identity-info">
            <h4 className="id-card-patient-name">
              {patient.firstName} {patient.lastName}
            </h4>
            <div className="id-card-mrn-badge">
              <span className="mrn-label">UHID:</span>
              <span className="mrn-code">{patient.mrn}</span>
            </div>
          </div>
        </div>

        {/* Patient Key-Value Grid */}
        <div className="id-card-data-grid">
          <div className="id-card-data-item">
            <span className="data-label">Date of Birth</span>
            <span className="data-value">{formatDob(patient.dob)}</span>
          </div>
          <div className="id-card-data-item">
            <span className="data-label">Gender</span>
            <span className="data-value">{patient.gender || '—'}</span>
          </div>
          <div className="id-card-data-item">
            <span className="data-label">Blood Group</span>
            <span className="data-value">{patient.bloodGroup || '—'}</span>
          </div>
          <div className="id-card-data-item">
            <span className="data-label">Phone</span>
            <span className="data-value">{patient.phone || '—'}</span>
          </div>
        </div>

        {/* Barcode Graphic */}
        <div className="id-card-barcode-section">
          <SvgBarcode />
          <span className="barcode-text">{patient.mrn}</span>
        </div>

      </div>

      {/* Card Footer */}
      <div className="id-card-footer">
        <span>Present this card at every visit</span>
        <span className="issue-date">Issued: {new Date().toLocaleDateString('en-IN')}</span>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="id-card-inline-container screen-only-preview">
        <div className="id-card-inline-preview-pane">
          <CardContent />
        </div>
        <div className="id-card-inline-controls-pane">
          <h3 className="id-card-inline-title">Patient Identification Card</h3>
          <p className="id-card-inline-desc">
            Generate and print a standard CR80 wallet-sized medical identification card for <strong>{patient.firstName} {patient.lastName}</strong>. This card contains the unique Patient UHID barcode required for quick registration and scan-ins at the hospital.
          </p>

          <div className="id-card-tips-box">
            <h4 className="id-card-tips-title">Printing Guidelines</h4>
            <ul>
              <li>Use standard <strong>CR80 card paper</strong> or cardstock.</li>
              <li>Ensure printer settings are set to <strong>100% scale</strong> (do not scale to fit).</li>
              <li>Laminate the card after printing for long-term durability.</li>
            </ul>
          </div>

          <button className="id-card-inline-print-btn" onClick={handlePrint} type="button">
            <IconPrint />
            <span>Spool Print Job</span>
          </button>
        </div>

        {/* ── Print Portal ── */}
        {createPortal(
          <div className="id-card-print-portal print-only-document">
            <CardContent />
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Screen Preview Overlay ── */}
      <div className="id-card-print-overlay screen-only-preview" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className="id-card-glass-canvas">
          
          {/* Floating Action Pill Bar */}
          <div className="id-card-floating-actions no-print">
            <button className="id-card-pill-btn id-card-pill-btn-secondary" onClick={onClose} aria-label="Close Preview" type="button">
              <IconClose />
              <span>Close</span>
            </button>
            <button className="id-card-pill-btn id-card-pill-btn-primary" onClick={handlePrint} aria-label="Print Card" type="button">
              <IconPrint />
              <span>Print ID Card</span>
            </button>
          </div>

          <CardContent />
        </div>
      </div>

      {/* ── Print Portal ── */}
      {createPortal(
        <div className="id-card-print-portal print-only-document">
          <CardContent />
        </div>,
        document.body
      )}
    </>
  );
};

export default PrintablePatientIdCard;
