/**
 * components/ipd/AdmissionSheet.jsx
 * Modal/Sheet dialog for admitting a patient to a vacant bed.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';
import { Md3BedComfortBadge } from '../md3/Md3BedComfortBadge';
import api from '../../services/api';
import ipdApi from '../../services/ipdApi';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import { formatDoctorName } from '../../utils/patientFormatters';
import './BedDetailDrawer.css';

export const AdmissionSheet = ({
  bed,
  initialAdvice,
  onClose,
  onSuccess,
}) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [primaryDoctorId, setPrimaryDoctorId] = useState('');
  const [admittingDepartmentId, setAdmittingDepartmentId] = useState('');
  const [admissionType, setAdmissionType] = useState('PLANNED');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [dietTier, setDietTier] = useState('REGULAR_DIET');
  const [initialDepositAmount, setInitialDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionReference, setTransactionReference] = useState('');

  const [resolvedTariff, setResolvedTariff] = useState(null);
  const [tariffLoading, setTariffLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill when doctor advice is provided
  useEffect(() => {
    if (initialAdvice) {
      const p = initialAdvice.patientId;
      if (p) {
        setSelectedPatientId(p._id || p);
        setSelectedPatient(p);
        setSearchPatient(`${p.firstName || ''} ${p.lastName || ''} (MRN: ${p.mrn || ''})`.trim());
      }
      const advice = initialAdvice.ipdAdmissionAdvice || {};
      const docId =
        advice.suggestedSurgeonId?._id ||
        advice.suggestedSurgeonId ||
        advice.advisingDoctorId?._id ||
        advice.advisingDoctorId ||
        initialAdvice.consultation?.doctorId?._id ||
        initialAdvice.consultation?.doctorId;
      if (docId) setPrimaryDoctorId(docId);
      const deptId = initialAdvice.departmentId?._id || initialAdvice.departmentId;
      if (deptId) setAdmittingDepartmentId(deptId);
      if (advice.admissionType) setAdmissionType(advice.admissionType);
      if (advice.provisionalDiagnosis || initialAdvice.consultation?.diagnosis) {
        setProvisionalDiagnosis(advice.provisionalDiagnosis || initialAdvice.consultation?.diagnosis || '');
      }
      if (advice.chiefComplaints || initialAdvice.consultation?.chiefComplaint) {
        setChiefComplaints(advice.chiefComplaints || initialAdvice.consultation?.chiefComplaint || '');
      }
      if (advice.dietTier) setDietTier(advice.dietTier);
    }
  }, [initialAdvice]);

  // Gender compatibility helper
  const checkBedGenderMatch = (p, b) => {
    if (!p || !b) return { isMatch: true };
    const pGender = (p.gender || '').toUpperCase();
    if (!pGender || pGender === 'OTHER' || pGender === 'NON_BINARY' || pGender === 'TRANSGENDER' || pGender === 'UNKNOWN') {
      return { isMatch: true };
    }
    const rawRestriction = (b.genderRestriction || b.roomId?.genderRestriction || b.room?.genderRestriction || 'UNRESTRICTED').toUpperCase();
    const bedLabel = (b.bedLabel || b.bedNumber || '').toUpperCase();

    const isFemaleWard = rawRestriction === 'FEMALE_ONLY' || rawRestriction === 'FEMALE' || bedLabel.includes('FEMALE') || bedLabel.startsWith('F-');
    const isMaleWard = rawRestriction === 'MALE_ONLY' || rawRestriction === 'MALE' || (bedLabel.includes('MALE') && !bedLabel.includes('FEMALE')) || bedLabel.startsWith('M-');

    if (isFemaleWard && pGender !== 'FEMALE') {
      return {
        isMatch: false,
        reason: `Bed "${b.bedLabel || b.bedNumber}" is in a Female-only ward. Cannot assign Male patient (${p.gender}).`,
      };
    }
    if (isMaleWard && pGender !== 'MALE') {
      return {
        isMatch: false,
        reason: `Bed "${b.bedLabel || b.bedNumber}" is in a Male-only ward. Cannot assign Female patient (${p.gender}).`,
      };
    }
    return { isMatch: true };
  };

  const genderWarning = selectedPatient ? checkBedGenderMatch(selectedPatient, bed) : { isMatch: true };

  // Fetch Authoritative Bed Tariff on load
  useEffect(() => {
    if (bed) {
      setTariffLoading(true);
      ipdApi.resolveBedTariff({
        bedId: bed._id,
        floorId: bed.floorId?._id || bed.floorId,
        wardClass: bed.wardClass,
        comfortTier: bed.comfortTier,
        sharingType: bed.sharingType,
      })
        .then((res) => {
          const t = res.data?.data || res.data;
          setResolvedTariff(t);
          if (t?.minAdvanceDeposit > 0) {
            setInitialDepositAmount(String(t.minAdvanceDeposit));
          }
        })
        .catch((err) => {
          console.warn('Could not resolve dynamic tariff:', err);
        })
        .finally(() => {
          setTariffLoading(false);
        });
    }
  }, [bed?._id]);

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

    if (!genderWarning.isMatch) {
      setError(genderWarning.reason);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (initialAdvice?._id) {
        const payload = {
          visitId: initialAdvice._id,
          bedId: bed._id,
          primaryDoctorId,
          admittingDepartmentId,
          admissionType,
          provisionalDiagnosis: provisionalDiagnosis.trim(),
          chiefComplaints: chiefComplaints.trim(),
          carePlan: (initialAdvice.ipdAdmissionAdvice?.carePlan || initialAdvice.consultation?.treatmentPlan || '').trim(),
          dietTier,
          initialDepositAmount: initialDepositAmount ? parseFloat(initialDepositAmount) : 0,
          paymentMethod,
          transactionReference: transactionReference.trim(),
        };
        await ipdApi.convertFromOpd(payload);
      } else {
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
      }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h2 className="ipd-drawer-title" style={{ margin: 0 }}>Inpatient Bed Admission</h2>
              <Md3BedComfortBadge
                tier={bed.comfortTier || resolvedTariff?.comfortTier || 'STANDARD'}
                sharing={bed.sharingType}
                size="small"
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
              Allocating {bed.bedLabel} ({bed.wardClass})
            </span>
          </div>
          <button type="button" className="ipd-drawer-close-btn" onClick={onClose} aria-label="Close sheet">
            <span className="material-symbols-rounded">close</span>
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

          {/* Doctor Admission Advice Banner */}
          {initialAdvice && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'var(--md-sys-color-secondary-container, #e8f0fe)',
                border: '1px solid var(--md-sys-color-outline-variant, #b6c4e2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.82rem',
                color: 'var(--md-sys-color-on-secondary-container, #041e49)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>
                    assignment
                  </span>
                  Doctor Inpatient Advice #{initialAdvice.visitNumber || ''}
                </strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background:
                      initialAdvice.ipdAdmissionAdvice?.urgency === 'EMERGENCY_STAT'
                        ? '#fee2e2'
                        : initialAdvice.ipdAdmissionAdvice?.urgency === 'URGENT'
                        ? '#fef3c7'
                        : '#e0f2fe',
                    color:
                      initialAdvice.ipdAdmissionAdvice?.urgency === 'EMERGENCY_STAT'
                        ? '#991b1b'
                        : initialAdvice.ipdAdmissionAdvice?.urgency === 'URGENT'
                        ? '#92400e'
                        : '#075985',
                  }}
                >
                  {initialAdvice.ipdAdmissionAdvice?.urgency || 'ROUTINE'}
                </span>
              </div>
              <div>
                <span>Advising Physician: </span>
                <strong>
                  {formatDoctorName(initialAdvice.ipdAdmissionAdvice?.advisingDoctorId)}
                </strong>
              </div>
              {initialAdvice.ipdAdmissionAdvice?.suggestedSurgeonId && (
                <div>
                  <span>Suggested Surgeon: </span>
                  <strong>
                    {formatDoctorName(initialAdvice.ipdAdmissionAdvice.suggestedSurgeonId)}
                    {initialAdvice.ipdAdmissionAdvice.suggestedSurgeonId.specialization
                      ? ` (${initialAdvice.ipdAdmissionAdvice.suggestedSurgeonId.specialization})`
                      : ''}
                  </strong>
                </div>
              )}
              {initialAdvice.ipdAdmissionAdvice?.otSessionId && (
                <div>
                  <span>Associated Surgical Procedure: </span>
                  <strong>
                    {initialAdvice.ipdAdmissionAdvice.otSessionId.procedureName} (
                    {initialAdvice.ipdAdmissionAdvice.otSessionId.surgeryType})
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Bed Tariff Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--md-sys-color-surface-container-low, #f7fbf8)',
              border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary, #006874)' }}>
                  hotel
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {tariffLoading ? 'Resolving Institutional Tariff...' : (resolvedTariff?.explanation || 'Inpatient Bed Tariff Policy')}
                </span>
              </div>
              {resolvedTariff?.policyBadge && (
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'var(--md-sys-color-surface-container-high, #e6eded)',
                  color: 'var(--md-sys-color-on-surface-variant, #3f484a)',
                  border: '1px solid var(--md-sys-color-outline-variant, rgba(0,0,0,0.08))'
                }}>
                  {resolvedTariff.policyBadge}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant, #e0e0e0)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>Daily Rate</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--md-sys-color-primary)' }}>
                  {CURRENCY_SYMBOL}{resolvedTariff?.dailyRate ?? bed.dailyRateOverride ?? 0}/day
                </strong>
              </div>

              <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant, #e0e0e0)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>Hourly Rate</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--md-sys-color-on-surface)' }}>
                  {CURRENCY_SYMBOL}{resolvedTariff?.hourlyRate ?? bed.hourlyRateOverride ?? 0}/hr
                </strong>
              </div>

              <div style={{ background: 'var(--md-sys-color-surface, #ffffff)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant, #e0e0e0)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>Min Advance</span>
                <strong style={{ fontSize: '0.92rem', color: resolvedTariff?.minAdvanceDeposit > 0 ? '#b45309' : 'inherit' }}>
                  {CURRENCY_SYMBOL}{resolvedTariff?.minAdvanceDeposit ?? 0}
                </strong>
              </div>
            </div>

            {resolvedTariff?.instructionNote && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.9 }}>
                {resolvedTariff.instructionNote}
              </p>
            )}
          </div>

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
                      setSelectedPatient(p);
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

            {selectedPatient && !genderWarning.isMatch && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fdf2f8',
                  border: '1.5px solid #fbcfe8',
                  color: '#9d174d',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                role="alert"
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', flexShrink: 0, color: '#be185d' }}>
                  lock
                </span>
                <span><strong>Gender Restriction:</strong> {genderWarning.reason}</span>
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
                    {formatDoctorName(d)} ({d.position || 'Consultant'})
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
