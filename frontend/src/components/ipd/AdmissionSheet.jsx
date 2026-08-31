/**
 * components/ipd/AdmissionSheet.jsx
 * Modal/Sheet dialog for admitting a patient to a vacant bed.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';
import api from '../../services/api';
import ipdApi from '../../services/ipdApi';
import './BedDetailDrawer.css';

export const AdmissionSheet = ({
  bed,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [primaryDoctorId, setPrimaryDoctorId] = useState('');
  const [admittingDepartmentId, setAdmittingDepartmentId] = useState('');
  const [admissionType, setAdmissionType] = useState('PLANNED');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [dietTier, setDietTier] = useState('REGULAR_DIET');
  const [initialDepositAmount, setInitialDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionReference, setTransactionReference] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial master data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, deptRes] = await Promise.all([
          api.get('/staff', { params: { limit: 100 } }),
          api.get('/departments'),
        ]);
        if (docRes.data?.data) {
          const docs = (docRes.data.data.staff || docRes.data.data || []).filter(
            (s) => s.role === 'DOCTOR' || (s.position && /doctor|consultant|physician/i.test(s.position))
          );
          setDoctors(docs);
          if (docs.length > 0) setPrimaryDoctorId(docs[0]._id);
        }
        if (deptRes.data?.data) {
          const depts = deptRes.data.data.departments || deptRes.data.data || [];
          setDepartments(depts);
          if (depts.length > 0) setAdmittingDepartmentId(depts[0]._id);
        }
      } catch (err) {
        console.error('Error fetching admission dependencies:', err);
      }
    };
    fetchData();
  }, []);

  // Search patients on typing
  useEffect(() => {
    if (!searchPatient || searchPatient.trim().length < 2) {
      setPatients([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/patients', { params: { search: searchPatient.trim(), limit: 10 } });
        setPatients(res.data?.data?.patients || res.data?.data || []);
      } catch (err) {
        console.error('Failed to search patients:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchPatient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please search and select a patient');
      return;
    }
    if (!primaryDoctorId) {
      setError('Please select an attending doctor');
      return;
    }
    if (!admittingDepartmentId) {
      setError('Please select an admitting department');
      return;
    }
    if (!provisionalDiagnosis.trim()) {
      setError('Provisional diagnosis is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        patientId: selectedPatientId,
        primaryDoctorId,
        admittingDepartmentId,
        bedId: bed._id,
        admissionType,
        provisionalDiagnosis: provisionalDiagnosis.trim(),
        chiefComplaints: chiefComplaints.trim(),
        dietTier,
        initialDepositAmount: initialDepositAmount ? parseFloat(initialDepositAmount) : 0,
        paymentMethod,
        transactionReference: transactionReference.trim(),
      };

      await ipdApi.admitPatient(payload);
      setLoading(false);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.userMessage || 'Failed to admit patient');
    }
  };

  return createPortal(
    <div className="ipd-drawer-backdrop" onClick={onClose}>
      <div className="ipd-drawer-panel" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ipd-drawer-header">
          <div>
            <h2 className="ipd-drawer-title">Inpatient Bed Admission</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
              Allocating {bed.bedLabel} ({bed.wardClass})
            </span>
          </div>
          <button type="button" className="ipd-drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ipd-drawer-content">
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {/* 1. Patient Selection */}
          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">1. Patient Identification</span>
            <Md3TextField
              label="Search Patient (Name, Phone, or MRN)"
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              placeholder="e.g. John Doe or MRN-..."
            />

            {patients.length > 0 && (
              <div
                style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: '8px',
                  padding: '4px',
                  background: 'var(--md-sys-color-surface-container-lowest)',
                }}
              >
                {patients.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      setSelectedPatientId(p._id);
                      setSearchPatient(`${p.firstName} ${p.lastName || ''} (MRN: ${p.mrn})`);
                      setPatients([]);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: selectedPatientId === p._id ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    }}
                  >
                    <strong>{p.firstName} {p.lastName}</strong> • MRN: {p.mrn} • {p.age}y / {p.gender} • Ph: {p.phone}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Clinical Care Team & Diagnosis */}
          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">2. Clinical Details</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Md3Select
                label="Attending Doctor"
                value={primaryDoctorId}
                onChange={(e) => setPrimaryDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.firstName} {d.lastName} ({d.position || 'Consultant'})
                  </option>
                ))}
              </Md3Select>

              <Md3Select
                label="Admitting Department"
                value={admittingDepartmentId}
                onChange={(e) => setAdmittingDepartmentId(e.target.value)}
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </Md3Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Md3Select
                label="Admission Type"
                value={admissionType}
                onChange={(e) => setAdmissionType(e.target.value)}
              >
                <option value="PLANNED">Planned Admission</option>
                <option value="EMERGENCY">Emergency Admission</option>
                <option value="TRANSFER">Inter-hospital Transfer</option>
                <option value="DAYCARE">Daycare Procedure</option>
              </Md3Select>

              <Md3Select
                label="Diet Plan"
                value={dietTier}
                onChange={(e) => setDietTier(e.target.value)}
              >
                <option value="REGULAR_DIET">Regular Diet</option>
                <option value="DIABETIC">Diabetic Diet</option>
                <option value="RENAL">Renal Diet</option>
                <option value="CARDIAC">Cardiac Low Sodium</option>
                <option value="LIQUID">Liquid Diet</option>
                <option value="SOFT">Soft Diet</option>
                <option value="NPO">NPO (Nil Per Os)</option>
              </Md3Select>
            </div>

            <Md3TextField
              label="Provisional Diagnosis *"
              value={provisionalDiagnosis}
              onChange={(e) => setProvisionalDiagnosis(e.target.value)}
              placeholder="e.g. Acute Gastroenteritis with severe dehydration"
              required
            />

            <Md3TextField
              label="Chief Complaints & Presenting Illness"
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              placeholder="e.g. Loose stools x 3 days, vomiting, lethargy"
            />
          </div>

          {/* 3. Advance Financial Deposit */}
          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">3. Initial Financial Advance Deposit</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Md3TextField
                label="Deposit Amount (₹)"
                type="number"
                value={initialDepositAmount}
                onChange={(e) => setInitialDepositAmount(e.target.value)}
                placeholder="e.g. 10000"
              />

              <Md3Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="INSURANCE_TPA">Insurance / TPA Approval</option>
              </Md3Select>
            </div>

            {initialDepositAmount > 0 && (
              <Md3TextField
                label="Transaction Reference / Txn ID"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g. UPI Ref # 129482018402"
              />
            )}
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Md3Button variant="outlined" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Md3Button>
            <Md3Button variant="filled" type="submit" disabled={loading}>
              {loading ? 'Admitting Inpatient...' : 'Complete Admission'}
            </Md3Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AdmissionSheet;
