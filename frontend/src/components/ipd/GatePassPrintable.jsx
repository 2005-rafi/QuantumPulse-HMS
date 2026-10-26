/**
 * components/ipd/GatePassPrintable.jsx
 * Official Inpatient Discharge Gate Pass printable document.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from '../md3/Md3FormComponents';
import { formatDoctorName } from '../../utils/patientFormatters';
import './GatePassPrintable.css';

export const GatePassPrintable = ({
  gatePassData: propGatePassData,
  admission,
  clearance,
  onClose,
}) => {
  // Normalize gate pass data from either direct gatePassData prop or admission+clearance props
  const gatePassData = propGatePassData || (clearance && (clearance.admissionId || admission) ? {
    ...clearance,
    admissionId: clearance.admissionId || admission,
    gatePassNumber: clearance.gatePassNumber || (admission?.admissionNumber ? `GP-${admission.admissionNumber}` : 'GP-PENDING'),
    gatePassGeneratedAt: clearance.gatePassGeneratedAt || new Date(),
    finalDiagnosis: admission?.dischargeSummary?.finalDiagnosis || clearance.finalDiagnosis,
  } : null);

  if (!gatePassData) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const adm = gatePassData.admissionId || {};
  const patient = adm.patientId || {};
  const doctor = adm.primaryDoctorId || {};
  const bed = adm.currentBedId || {};

  const handlePrint = () => {
    window.print();
  };

  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`
    : gatePassData.patientName || 'Patient';
  const mrn = patient.mrn || gatePassData.mrn || '—';
  const admissionNumber = adm.admissionNumber || gatePassData.id || '—';
  const bedLabel = bed.bedLabel
    ? `Bed ${bed.bedLabel} (${bed.wardClass || 'General'})`
    : gatePassData.wardClass || '—';
  const doctorName = doctor.firstName ? formatDoctorName(doctor) : gatePassData.doctor || '—';
  const admissionDate = adm.admissionDate
    ? new Date(adm.admissionDate).toLocaleDateString('en-IN')
    : gatePassData.admitDate || '—';
  const dischargeTimestamp = gatePassData.gatePassGeneratedAt
    ? new Date(gatePassData.gatePassGeneratedAt).toLocaleString('en-IN')
    : gatePassData.dischargeDate || 'Today';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="ipd-gatepass-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Security Exit Gate Pass"
      onClick={onClose}
    >
      <div
        className="ipd-gatepass-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ipd-gatepass-header">
          <div className="ipd-gatepass-hospital-brand">
            <div className="ipd-gatepass-logo-badge">
              <span className="material-symbols-rounded">local_hospital</span>
            </div>
            <div>
              <h2 className="ipd-gatepass-hospital-title">QUANTUM CAREONE MULTISPECIALITY HOSPITAL</h2>
              <div className="ipd-gatepass-hospital-sub">
                Inpatient Department • Official Security &amp; Exit Authorization Gate Pass
              </div>
            </div>
          </div>

          <div className="ipd-gatepass-badge-strip">
            <span className="ipd-gatepass-num-badge">
              PASS #{gatePassData.gatePassNumber}
            </span>
            <button
              type="button"
              className="ipd-gatepass-close-btn"
              onClick={onClose}
              aria-label="Close Gate Pass"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* Inpatient Demographics Table */}
        <div className="ipd-gatepass-table-wrap">
          <table className="ipd-gatepass-table">
            <tbody>
              <tr>
                <td className="ipd-gp-label">Patient Name:</td>
                <td className="ipd-gp-value ipd-gp-value--bold">{patientName}</td>
                <td className="ipd-gp-label">MRN:</td>
                <td className="ipd-gp-value ipd-gp-value--code">{mrn}</td>
              </tr>
              <tr>
                <td className="ipd-gp-label">Admission ID:</td>
                <td className="ipd-gp-value">{admissionNumber}</td>
                <td className="ipd-gp-label">Ward / Bed:</td>
                <td className="ipd-gp-value">{bedLabel}</td>
              </tr>
              <tr>
                <td className="ipd-gp-label">Primary Consultant:</td>
                <td className="ipd-gp-value">{doctorName}</td>
                <td className="ipd-gp-label">Final Diagnosis:</td>
                <td className="ipd-gp-value">{gatePassData.finalDiagnosis || 'Clinical Stability Achieved'}</td>
              </tr>
              <tr>
                <td className="ipd-gp-label">Admission Date:</td>
                <td className="ipd-gp-value">{admissionDate}</td>
                <td className="ipd-gp-label">Discharge Time:</td>
                <td className="ipd-gp-value ipd-gp-value--highlight">{dischargeTimestamp}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3-Way Clearance Verified Card */}
        <div className="ipd-gatepass-clearance-card">
          <div className="ipd-gp-clearance-title">
            <span className="material-symbols-rounded">verified</span>
            <span>Mandatory 3-Way Exit Clearance Verified</span>
          </div>
          <div className="ipd-gp-clearance-badges">
            <span className="ipd-gp-badge">
              <span className="material-symbols-rounded">check_circle</span>
              <span>1. Clinical Summary Signed</span>
            </span>
            <span className="ipd-gp-badge">
              <span className="material-symbols-rounded">check_circle</span>
              <span>2. Pharmacy Returns Cleared</span>
            </span>
            <span className="ipd-gp-badge">
              <span className="material-symbols-rounded">check_circle</span>
              <span>
                3. Cashier &amp; Billing Settled
                {gatePassData.billingClearance?.totalBilled ? ` (₹${Number(gatePassData.billingClearance.totalBilled).toLocaleString('en-IN')} Paid in Full)` : ' (Zero Balance)'}
              </span>
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="ipd-gatepass-signatures">
          <div className="ipd-gp-sign-col">
            <div className="ipd-gp-sign-line" />
            <span>Nurse In-Charge</span>
          </div>
          <div className="ipd-gp-sign-col">
            <div className="ipd-gp-sign-line" />
            <span>Accounts / Billing</span>
          </div>
          <div className="ipd-gp-sign-col">
            <div className="ipd-gp-sign-line" />
            <span>Hospital Security Exit Sign</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="ipd-gatepass-actions">
          <Md3Button variant="secondary" onClick={onClose}>
            Close
          </Md3Button>
          <Md3Button
            variant="filled"
            onClick={handlePrint}
            leadingIcon={<span className="material-symbols-rounded" style={{ fontSize: '18px' }}>print</span>}
          >
            Print Security Gate Pass
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GatePassPrintable;
