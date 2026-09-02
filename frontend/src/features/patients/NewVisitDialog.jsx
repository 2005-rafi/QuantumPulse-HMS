import React, { useState, useEffect, useMemo } from 'react';
import { Md3Button, Md3TextField, Md3Select, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { Icon, Md3Avatar } from '../../components/md3/Md3Widgets';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import { tariffAPI } from '../../services/tariffAPI';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';
import BedAllocationPicker from '../../components/ipd/BedAllocationPicker';
import IpdAdmissionSlip from '../../components/ipd/IpdAdmissionSlip';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import '../appointments/AppointmentDashboard.css';

const QUICK_COMPLAINTS = [
  'Routine Consultation',
  'Fever & Cold',
  'Body Pain / Fatigue',
  'Headache & Dizziness',
  'Follow-up Review',
  'General Medical Checkup',
];

/**
 * Format doctor name ensuring no duplicate "Dr. Dr." prefix.
 */
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  const cleaned = name.trim();
  return cleaned.startsWith('Dr.') ? cleaned : `Dr. ${cleaned}`;
};

/**
 * NewVisitDialog — Bottom Sheet for checking in existing patients
 * into either Outpatient (OPD) queue or Inpatient (IPD) admission.
 */
export const NewVisitDialog = ({
  patient,
  isOpen,
  onClose,
  onSuccess,
  initialDepartmentId = '',
  initialDoctorId = '',
  existingVisits = [],
}) => {
  const [mode, setMode] = useState('OPD'); // 'OPD' | 'IPD_MEDICAL' | 'IPD_SURGICAL'
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [visitForm, setVisitForm] = useState({
    departmentId: initialDepartmentId,
    doctorId: initialDoctorId,
    reasonForVisit: '',
    registrationFee: 0,
    consultationFee: 500,
    paymentMethod: 'Cash',
    // IPD fields
    selectedBedId: '',
    selectedBed: null,
    admissionType: 'PLANNED',
    provisionalDiagnosis: '',
    chiefComplaints: '',
    carePlan: '',
    dietTier: 'REGULAR_DIET',
    initialDepositAmount: 5000,
    depositPaymentMethod: 'Cash',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [generatedAdmission, setGeneratedAdmission] = useState(null);

  // Active encounters for this patient
  const activeVisits = (existingVisits || []).filter(
    (v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED'
  );

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setMode('OPD');
      setVisitForm({
        departmentId: initialDepartmentId,
        doctorId: initialDoctorId,
        reasonForVisit: '',
        registrationFee: 0,
        consultationFee: 500,
        paymentMethod: 'Cash',
        selectedBedId: '',
        selectedBed: null,
        admissionType: 'PLANNED',
        provisionalDiagnosis: '',
        chiefComplaints: '',
        carePlan: '',
        dietTier: 'REGULAR_DIET',
        initialDepositAmount: 5000,
        depositPaymentMethod: 'Cash',
      });
      setFormError(null);
    }
  }, [isOpen, initialDepartmentId, initialDoctorId]);

  // Load departments and doctors metadata when opened
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadMetadata = async () => {
      setLoadingMeta(true);
      try {
        const [deptRes, staffRes] = await Promise.allSettled([
          api.get('/departments'),
          staffAPI.list(1, 100),
        ]);

        if (cancelled) return;

        if (deptRes.status === 'fulfilled') {
          const raw = deptRes.value.data?.data || deptRes.value.data || [];
          setDepartments(Array.isArray(raw) ? raw : []);
        }

        if (staffRes.status === 'fulfilled') {
          const staffItems = staffRes.value.data?.items || staffRes.value.data?.data?.items || [];
          setDoctors(staffItems.filter((s) => s.roleId?.name === 'Doctor'));
        }
      } catch (err) {
        console.error('[NewVisitDialog] Failed to load metadata', err);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Filter doctors strictly by chosen department
  const availableDoctors = useMemo(() => {
    if (!visitForm.departmentId) return doctors;
    return doctors.filter((doc) => {
      const docDeptId = doc.departmentId?._id || doc.departmentId?.id || doc.departmentId;
      return String(docDeptId) === String(visitForm.departmentId);
    });
  }, [doctors, visitForm.departmentId]);

  // Auto-reset doctor selection if department changes and current doctor is not in that department
  useEffect(() => {
    if (visitForm.doctorId && visitForm.departmentId) {
      const isDocInDept = availableDoctors.some((d) => d._id === visitForm.doctorId);
      if (!isDocInDept) {
        setVisitForm((prev) => ({ ...prev, doctorId: '' }));
      }
    }
  }, [visitForm.departmentId, availableDoctors]);

  // Auto-resolve authoritative tariff pricing for Consultation in OPD
  useEffect(() => {
    if (!isOpen || mode !== 'OPD') return;

    let isMounted = true;
    const resolveTariffs = async () => {
      try {
        const consRes = await tariffAPI.resolvePrice({
          category: 'CONSULTATION',
          departmentId: visitForm.departmentId || undefined,
          staffId: visitForm.doctorId || undefined,
          visitType: 'OPD',
        });
        const resolvedConsFee = consRes.data?.data?.amount ?? consRes.data?.amount ?? 500;

        if (isMounted) {
          setVisitForm((prev) => ({
            ...prev,
            consultationFee: resolvedConsFee,
          }));
        }
      } catch (err) {
        console.warn('[NewVisitDialog] Tariff resolution fallback', err);
      }
    };

    resolveTariffs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, mode, visitForm.departmentId, visitForm.doctorId]);

  if (!isOpen || !patient) return null;

  const handleField = (e) => {
    const { name, value } = e.target;
    setVisitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChipClick = (complaint) => {
    setVisitForm((prev) => {
      if (!prev.reasonForVisit) return { ...prev, reasonForVisit: complaint };
      if (prev.reasonForVisit.includes(complaint)) return prev;
      return { ...prev, reasonForVisit: `${prev.reasonForVisit}, ${complaint}` };
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const pId = patient._id || patient.id;
      if (!pId) {
        throw new Error('Patient ID is missing. Please re-open the patient profile.');
      }

      // Case A: Inpatient Admission (Medical or Surgical)
      if (mode === 'IPD_MEDICAL' || mode === 'IPD_SURGICAL') {
        if (!visitForm.departmentId) throw new Error('Please select an admitting department.');
        if (!visitForm.doctorId) throw new Error('Please select an attending doctor.');
        if (!visitForm.selectedBedId) throw new Error('Please select a vacant bed from the bed map.');
        if (!visitForm.provisionalDiagnosis.trim()) throw new Error('Provisional diagnosis is required.');

        const admissionPayload = {
          patientId: String(pId),
          primaryDoctorId: visitForm.doctorId,
          admittingDepartmentId: visitForm.departmentId,
          bedId: visitForm.selectedBedId,
          admissionType: mode === 'IPD_SURGICAL' ? 'SURGICAL' : (visitForm.admissionType || 'PLANNED'),
          provisionalDiagnosis: visitForm.provisionalDiagnosis.trim(),
          chiefComplaints: visitForm.chiefComplaints || visitForm.reasonForVisit || '',
          carePlan: visitForm.carePlan || '',
          dietTier: visitForm.dietTier || 'REGULAR_DIET',
          initialDepositAmount: Number(visitForm.initialDepositAmount) || 0,
          depositPaymentMethod: visitForm.depositPaymentMethod || 'Cash',
        };

        const res = await ipdApi.admitPatient(admissionPayload);
        const createdAdmission = res.data?.data;

        const completeSlip = {
          ...createdAdmission,
          patient,
          primaryDoctor: doctors.find(d => d._id === visitForm.doctorId) || {},
          department: departments.find(d => d._id === visitForm.departmentId) || {},
          bed: visitForm.selectedBed || {},
          initialDepositAmount: visitForm.initialDepositAmount,
          depositPaymentMethod: visitForm.depositPaymentMethod,
        };

        setGeneratedAdmission(completeSlip);

        if (onSuccess) {
          onSuccess({ patient, admission: createdAdmission, isIpd: true });
        }
      }
      // Case B: Standard OPD Visit
      else {
        const regFee = Number(visitForm.registrationFee) || 0;
        const consFee = Number(visitForm.consultationFee) || 0;

        const payload = {
          patientId: String(pId),
          visitType: 'OPD',
          ...(visitForm.departmentId ? { departmentId: visitForm.departmentId } : {}),
          ...(visitForm.doctorId ? { doctorId: visitForm.doctorId } : {}),
          ...(visitForm.reasonForVisit ? { reasonForVisit: visitForm.reasonForVisit.trim() } : {}),
          receptionPayment: {
            registrationFee: regFee,
            consultationFee: consFee,
            paymentMethod: visitForm.paymentMethod || 'Cash',
          },
        };

        const res = await visitAPI.create(payload);
        const createdVisit = res.data?.data || res.data;

        if (onSuccess) {
          onSuccess({ patient, visit: createdVisit, isIpd: false });
        }
        onClose();
      }
    } catch (err) {
      console.error('[NewVisitDialog] Encounter error', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to process encounter');
    } finally {
      setFormLoading(false);
    }
  };

  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  return (
    <>
      <Md3BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Patient Check-In &amp; Inpatient Admission"
        subtitle="Create an OPD consultation queue token or directly admit as Inpatient (IPD)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0 10px 0' }}>
          {formError && (
            <div className="appt-dialog-error" role="alert">
              <Icon.Alert />
              <span>{formError}</span>
            </div>
          )}

          {/* Patient Header Strip */}
          <div className="new-visit-patient-badge" style={{ margin: 0 }}>
            <div className="new-visit-patient-info">
              <Md3Avatar initials={initials} size="medium" variant="primary" />
              <div>
                <div className="new-visit-patient-name">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="new-visit-patient-meta">
                  {patient.mrn && <span>MRN: <strong>{patient.mrn}</strong></span>}
                  {patient.gender && <span>· {patient.gender}</span>}
                  {patient.age != null && <span>· {patient.age} yrs</span>}
                  {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                    <span>· Blood: <strong>{patient.bloodGroup}</strong></span>
                  )}
                </div>
              </div>
            </div>
            {patient.phone && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Phone: <strong>{patient.phone}</strong>
              </div>
            )}
          </div>

          {/* Active Encounters Warning Banner */}
          {activeVisits.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 18px',
              background: 'var(--md-sys-color-secondary-container)',
              color: 'var(--md-sys-color-on-secondary-container)',
              borderRadius: '16px',
              border: '1px solid var(--md-sys-color-outline-variant)',
              fontSize: '0.8125rem',
              lineHeight: '1.45'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>info</span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  Patient has {activeVisits.length} Active Clinical Encounter{activeVisits.length > 1 ? 's' : ''}
                </div>
                <div style={{ marginTop: '3px', opacity: 0.9 }}>
                  {activeVisits.map(v => `${v.tokenString || v.visitNumber} (${v.departmentId?.name || 'General OPD'} · ${v.status.replace(/_/g, ' ')})`).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Workflow Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <button
              type="button"
              className={`reg-workflow-btn ${mode === 'OPD' ? 'is-active' : ''}`}
              onClick={() => setMode('OPD')}
            >
              <span className="material-symbols-rounded">stethoscope</span>
              <div>
                <span className="reg-workflow-btn-label">OPD Walk-in</span>
                <span className="reg-workflow-btn-sub">Outpatient queue token</span>
              </div>
            </button>

            <button
              type="button"
              className={`reg-workflow-btn ${mode === 'IPD_MEDICAL' ? 'is-active' : ''}`}
              onClick={() => setMode('IPD_MEDICAL')}
            >
              <span className="material-symbols-rounded">hotel</span>
              <div>
                <span className="reg-workflow-btn-label">Direct IPD Admission</span>
                <span className="reg-workflow-btn-sub">Bed allocation &amp; Nursing</span>
              </div>
            </button>

            <button
              type="button"
              className={`reg-workflow-btn ${mode === 'IPD_SURGICAL' ? 'is-active' : ''}`}
              onClick={() => setMode('IPD_SURGICAL')}
            >
              <span className="material-symbols-rounded">surgical</span>
              <div>
                <span className="reg-workflow-btn-label">Surgical / OT</span>
                <span className="reg-workflow-btn-sub">Pre/Post-Op admission</span>
              </div>
            </button>
          </div>

          <form id="new-visit-bottom-sheet-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} noValidate>
            
            {/* ── OPD MODE ── */}
            {mode === 'OPD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <Md3Select
                    id="nv-departmentId"
                    name="departmentId"
                    label="Department *"
                    value={visitForm.departmentId}
                    onChange={handleField}
                    disabled={formLoading || loadingMeta}
                    required
                  >
                    <option value="">-- Select Clinical Department --</option>
                    {departments
                      .filter((d) => d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC')
                      .map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                  </Md3Select>

                  <Md3Select
                    id="nv-doctorId"
                    name="doctorId"
                    label="Attending Doctor (Optional)"
                    value={visitForm.doctorId}
                    onChange={handleField}
                    disabled={formLoading || loadingMeta}
                  >
                    <option value="">-- Any Available Doctor --</option>
                    {availableDoctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {formatDoctorName(d.fullName)}
                      </option>
                    ))}
                  </Md3Select>
                </div>

                <div>
                  <Md3TextField
                    id="nv-reasonForVisit"
                    name="reasonForVisit"
                    label="Reason for Visit / Chief Complaint"
                    value={visitForm.reasonForVisit}
                    onChange={handleField}
                    placeholder="e.g. High fever, headache, routine review"
                    disabled={formLoading}
                  />
                  <div className="new-visit-chips-row" style={{ marginTop: '10px' }}>
                    {QUICK_COMPLAINTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="new-visit-chip"
                        onClick={() => handleChipClick(c)}
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <Md3TextField
                    id="nv-consultationFee"
                    name="consultationFee"
                    type="number"
                    label={`Consultation Fee (${CURRENCY_SYMBOL})`}
                    value={visitForm.consultationFee}
                    onChange={handleField}
                    disabled={formLoading}
                  />
                  <Md3Select
                    id="nv-paymentMethod"
                    name="paymentMethod"
                    label="Payment Method *"
                    value={visitForm.paymentMethod}
                    onChange={handleField}
                    disabled={formLoading}
                    options={[
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Card', label: 'Card' },
                      { value: 'UPI', label: 'UPI' },
                      { value: 'Insurance', label: 'Insurance' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* ── IPD MODE ── */}
            {(mode === 'IPD_MEDICAL' || mode === 'IPD_SURGICAL') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <Md3Select
                    id="nv-ipd-departmentId"
                    name="departmentId"
                    label="Admitting Department *"
                    value={visitForm.departmentId}
                    onChange={handleField}
                    disabled={formLoading || loadingMeta}
                    required
                  >
                    <option value="">-- Select Inpatient Department --</option>
                    {departments
                      .filter((d) => d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC')
                      .map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                  </Md3Select>

                  <Md3Select
                    id="nv-ipd-doctorId"
                    name="doctorId"
                    label={mode === 'IPD_SURGICAL' ? 'Operating Surgeon *' : 'Attending Consultant *'}
                    value={visitForm.doctorId}
                    onChange={handleField}
                    disabled={formLoading || loadingMeta}
                    required
                  >
                    <option value="">-- Select Attending Consultant --</option>
                    {availableDoctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {formatDoctorName(d.fullName)}
                      </option>
                    ))}
                  </Md3Select>
                </div>

                {/* Interactive Bed & Room Allocator */}
                <BedAllocationPicker
                  selectedBedId={visitForm.selectedBedId}
                  onSelectBed={(bedObj) => {
                    setVisitForm((prev) => ({
                      ...prev,
                      selectedBedId: bedObj._id,
                      selectedBed: bedObj,
                    }));
                  }}
                  patientGender={patient.gender}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <Md3TextField
                    id="nv-provisionalDiagnosis"
                    name="provisionalDiagnosis"
                    label="Provisional Diagnosis *"
                    value={visitForm.provisionalDiagnosis}
                    onChange={handleField}
                    placeholder="e.g. Acute Cholecystitis, Dengue with Thrombocytopenia"
                    disabled={formLoading}
                    required
                  />

                  <Md3Select
                    id="nv-dietTier"
                    name="dietTier"
                    label="Inpatient Diet Tier *"
                    value={visitForm.dietTier}
                    onChange={handleField}
                    disabled={formLoading}
                    options={[
                      { value: 'REGULAR_DIET', label: 'Regular Hospital Diet' },
                      { value: 'DIABETIC_DIET', label: 'Diabetic Diet' },
                      { value: 'RENAL_DIET', label: 'Renal Diet' },
                      { value: 'HIGH_PROTEIN', label: 'High Protein Diet' },
                      { value: 'SOFT_DIET', label: 'Soft / Semi-Solid Diet' },
                      { value: 'LIQUID_DIET', label: 'Clear Liquid Diet' },
                      { value: 'NPO', label: 'NPO (Nil Per Os - Fasting)' },
                    ]}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <Md3TextField
                    id="nv-initialDepositAmount"
                    name="initialDepositAmount"
                    type="number"
                    label={`Initial Advance Deposit (${CURRENCY_SYMBOL})`}
                    value={visitForm.initialDepositAmount}
                    onChange={handleField}
                    disabled={formLoading}
                  />
                  <Md3Select
                    id="nv-depositPaymentMethod"
                    name="depositPaymentMethod"
                    label="Deposit Payment Method *"
                    value={visitForm.depositPaymentMethod}
                    onChange={handleField}
                    disabled={formLoading}
                    options={[
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Card', label: 'Credit / Debit Card' },
                      { value: 'UPI', label: 'UPI / Digital' },
                      { value: 'Insurance', label: 'Insurance Pre-Auth' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Bottom Sheet Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '16px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '18px' }}>
              <Md3Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={formLoading}
                style={{ width: 'auto', minWidth: '120px' }}
              >
                Cancel
              </Md3Button>
              <Md3Button
                type="submit"
                variant="primary"
                loading={formLoading}
                disabled={formLoading}
                style={{ width: 'auto', minWidth: '220px' }}
              >
                {mode === 'OPD' ? 'Create OPD Visit & Token' : mode === 'IPD_MEDICAL' ? 'Admit to Inpatient (IPD)' : 'Confirm Surgical Admission'}
              </Md3Button>
            </div>
          </form>
        </div>
      </Md3BottomSheet>

      {/* Printable IPD Admission Slip Modal */}
      {generatedAdmission && (
        <IpdAdmissionSlip
          admissionData={generatedAdmission}
          isOpen={!!generatedAdmission}
          onClose={() => {
            setGeneratedAdmission(null);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default NewVisitDialog;