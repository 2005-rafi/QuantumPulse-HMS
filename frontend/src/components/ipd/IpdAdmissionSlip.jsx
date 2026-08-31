import React from 'react';
import { createPortal } from 'react-dom';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './IpdAdmissionSlip.css';

/**
 * IpdAdmissionSlip — Official Inpatient Department Admission Order & Location Slip.
 * Replaces outpatient queue tokens with a structured Inpatient Admission Document.
 */
export const IpdAdmissionSlip = ({
  admissionData,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !admissionData) return null;

  const {
    admissionNumber = 'IPD-NEW',
    patient = {},
    primaryDoctor = {},
    department = {},
    bed = {},
    room = {},
    floor = {},
    admissionType = 'PLANNED',
    provisionalDiagnosis = 'Under Evaluation',
    dietTier = 'REGULAR_DIET',
    initialDepositAmount = 0,
    depositPaymentMethod = 'Cash',
    createdAt = new Date(),
  } = admissionData;

  const patientName = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const mrn = patient.mrn || '—';
  const age = patient.age || (patient.dob ? Math.floor((new Date() - new Date(patient.dob)) / 31557600000) : '—');
  const gender = patient.gender || '—';
  const bloodGroup = patient.bloodGroup || '—';
  const phone = patient.phone || '—';
  const doctorName = primaryDoctor.fullName || primaryDoctor.name || 'Attending Physician';
  const deptName = department.name || 'Clinical Inpatient';
  const bedLabel = bed.bedLabel || bed.bedNumber || 'Assigned Bed';
  const roomNumber = room.roomNumber || bed.roomNumber || '—';
  const floorName = floor.floorName || bed.floorName || 'Ward Floor';
  const dateStr = new Date(createdAt).toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="ipd-slip-overlay" onClick={onClose}>
      <div className="ipd-slip-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Toolbar */}
        <div className="ipd-slip-toolbar">
          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
            Inpatient Admission Order Generated
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="ipd-slip-toolbar-btn ipd-slip-toolbar-btn--primary"
              onClick={handlePrint}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>print</span>
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              className="ipd-slip-toolbar-btn"
              onClick={onClose}
            >
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="ipd-slip-sheet">
          {/* Header */}
          <div className="ipd-slip-header">
            <div className="ipd-slip-brand">
              <h2>Quantum CareOne Portal</h2>
              <p>Inpatient Department • Admission Order &amp; Bed Slip</p>
            </div>
            <div className="ipd-slip-doc-badge">
              <span className="badge-tag">IPD ADMISSION</span>
              <span className="doc-num">{admissionNumber}</span>
            </div>
          </div>

          {/* Location Highlight Banner */}
          <div className="ipd-slip-location-banner">
            <div>
              <div className="ipd-slip-location-main">
                {bedLabel} • Room {roomNumber}
              </div>
              <div className="ipd-slip-location-sub">
                {floorName} • {deptName}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px' }}>
                {admissionType} ADMISSION
              </span>
            </div>
          </div>

          {/* Grid: Patient & Medical Info */}
          <div className="ipd-slip-grid">
            {/* Patient Demographics */}
            <div className="ipd-slip-box">
              <div className="ipd-slip-box-title">
                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>person</span>
                <span>Patient Demographics</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Name:</span>
                <span className="val">{patientName}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">MRN:</span>
                <span className="val" style={{ fontFamily: 'monospace' }}>{mrn}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Age / Gender:</span>
                <span className="val">{age} yrs / {gender}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Blood Group:</span>
                <span className="val">{bloodGroup}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Contact:</span>
                <span className="val">{phone}</span>
              </div>
            </div>

            {/* Clinical Governance */}
            <div className="ipd-slip-box">
              <div className="ipd-slip-box-title">
                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>medical_services</span>
                <span>Clinical Governance</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Primary Doctor:</span>
                <span className="val">{doctorName}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Department:</span>
                <span className="val">{deptName}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Diagnosis:</span>
                <span className="val">{provisionalDiagnosis}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Diet Plan:</span>
                <span className="val">{dietTier.replace(/_/g, ' ')}</span>
              </div>
              <div className="ipd-slip-field">
                <span className="label">Admitted At:</span>
                <span className="val">{dateStr}</span>
              </div>
            </div>
          </div>

          {/* Financial Advance Deposit */}
          <div className="ipd-slip-box">
            <div className="ipd-slip-box-title">
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>payments</span>
              <span>Advance Financial Deposit</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Deposit Collected: </span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                  {CURRENCY_SYMBOL}{Number(initialDepositAmount).toLocaleString()}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>
                  via {depositPaymentMethod}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px' }}>
                Credited to 1:1 Inpatient Master Ledger
              </span>
            </div>
          </div>

          {/* Routing Notice */}
          <div className="ipd-slip-notice">
            <strong>Clinical Routing Notice:</strong> Patient is directly enrolled to Floor / Ward Inpatient Nursing Station. Ward nurses will immediately access flowsheet, e-MAR, and fluid I/O balance charts. No outpatient queue token is required.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IpdAdmissionSlip;
