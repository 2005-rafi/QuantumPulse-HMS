/**
 * components/ipd/GatePassPrintable.jsx
 * Official Inpatient Discharge Gate Pass printable document.
 */
import React from 'react';
import { Md3Button } from '../md3/Md3FormComponents';

export const GatePassPrintable = ({
  gatePassData,
  onClose,
}) => {
  if (!gatePassData) return null;

  const adm = gatePassData.admissionId || {};
  const patient = adm.patientId || {};
  const doctor = adm.primaryDoctorId || {};
  const bed = adm.currentBedId || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
          color: '#191c1b',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #006a57', paddingBottom: '16px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#006a57', fontSize: '1.4rem', fontWeight: 800 }}>
            QUANTUM CAREONE MULTISPECIALITY HOSPITAL
          </h1>
          <div style={{ fontSize: '0.8rem', color: '#6f7975', marginTop: '4px' }}>
            Inpatient Department • Security & Exit Authorization Gate Pass
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '4px 14px',
              background: '#bbf2e1',
              color: '#00211a',
              borderRadius: '100px',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.04em',
            }}
          >
            GATE PASS: {gatePassData.gatePassNumber}
          </div>
        </div>

        {/* Inpatient Demographics Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: '20px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975', width: '35%' }}>Patient Name:</td>
              <td style={{ padding: '8px 4px', fontWeight: 700 }}>
                {patient.firstName} {patient.lastName}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Medical Record # (MRN):</td>
              <td style={{ padding: '8px 4px', fontWeight: 700 }}>{patient.mrn}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Admission Number:</td>
              <td style={{ padding: '8px 4px' }}>{adm.admissionNumber}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Discharged Bed / Ward:</td>
              <td style={{ padding: '8px 4px' }}>
                {bed.bedLabel || '—'} ({bed.wardClass || 'General'})
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Primary Consultant:</td>
              <td style={{ padding: '8px 4px' }}>Dr. {doctor.firstName} {doctor.lastName}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Admission Date:</td>
              <td style={{ padding: '8px 4px' }}>
                {adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString('en-IN') : '—'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e0e8e4' }}>
              <td style={{ padding: '8px 4px', color: '#6f7975' }}>Discharge Timestamp:</td>
              <td style={{ padding: '8px 4px', fontWeight: 700, color: '#006a57' }}>
                {gatePassData.gatePassGeneratedAt ? new Date(gatePassData.gatePassGeneratedAt).toLocaleString('en-IN') : '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Clearances Verified Box */}
        <div
          style={{
            border: '1px dashed #006a57',
            borderRadius: '12px',
            padding: '12px 16px',
            background: '#f0fbf7',
            fontSize: '0.82rem',
            marginBottom: '24px',
          }}
        >
          <strong style={{ display: 'block', color: '#006a57', marginBottom: '4px' }}>
            ✓ Multi-Departmental Clearances Verified:
          </strong>
          <div>• Pharmacy Stock Return: Cleared</div>
          <div>• Ward Nursing & Vitals Stability: Cleared</div>
          <div>• Accounts & Cashier Dues Settlement: Cleared (Zero Balance Due)</div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', fontSize: '0.8rem', textAlign: 'center' }}>
          <div>
            <div style={{ borderTop: '1px solid #6f7975', width: '140px', paddingTop: '4px' }}>
              Nurse In-Charge
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #6f7975', width: '140px', paddingTop: '4px' }}>
              Billing / Cashier
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #6f7975', width: '140px', paddingTop: '4px' }}>
              Security Guard Exit Sign
            </div>
          </div>
        </div>

        {/* Print Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px' }}>
          <Md3Button variant="outlined" onClick={onClose}>
            Close
          </Md3Button>
          <Md3Button variant="filled" onClick={handlePrint}>
            Print Official Gate Pass
          </Md3Button>
        </div>
      </div>
    </div>
  );
};

export default GatePassPrintable;
