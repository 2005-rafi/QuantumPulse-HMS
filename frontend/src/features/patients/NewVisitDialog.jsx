import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import { Icon, Md3Avatar, Md3Divider } from '../../components/md3/Md3Widgets';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import api from '../../services/api';
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
 * NewVisitDialog — Standalone, reusable Material Design 3 modal for checking in patients into OPD triage.
 * Features:
 * - Department-filtered physician assignment (no cross-department leakage).
 * - Decongested, pure Material 3 two-tier dropdown layout.
 * - Always-visible, anchored modal confirmation and cancel buttons.
 * - Multi-encounter active awareness and same-department duplicate warnings.
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
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [visitForm, setVisitForm] = useState({
    visitType: 'OPD',
    departmentId: initialDepartmentId,
    doctorId: initialDoctorId,
    reasonForVisit: '',
    registrationFee: 0,
    consultationFee: 500,
    paymentMethod: 'Cash',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Active encounters for this patient
  const activeVisits = (existingVisits || []).filter(
    (v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED'
  );

  // Check if chosen department is already active
  const isSameDeptActive = visitForm.departmentId 
    ? activeVisits.find((v) => (v.departmentId?._id || v.departmentId) === visitForm.departmentId)
    : null;

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setVisitForm({
        visitType: 'OPD',
        departmentId: initialDepartmentId,
        doctorId: initialDoctorId,
        reasonForVisit: '',
        registrationFee: 0,
        consultationFee: 500,
        paymentMethod: 'Cash',
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

  const selectedDeptObj = departments.find((d) => d._id === visitForm.departmentId);

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

      const regFee = Number(visitForm.registrationFee) || 0;
      const consFee = Number(visitForm.consultationFee) || 0;

      const payload = {
        patientId: String(pId),
        visitType: visitForm.visitType || 'OPD',
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
        onSuccess({ patient, visit: createdVisit });
      }
      onClose();
    } catch (err) {
      console.error('[NewVisitDialog] Create visit error', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to create new visit');
    } finally {
      setFormLoading(false);
    }
  };

  const totalFee = (Number(visitForm.registrationFee) || 0) + (Number(visitForm.consultationFee) || 0);
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container new-visit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon check-in">
              <Icon.Plus />
            </div>
            <div>
              <h3 className="appt-modal-title">Create New OPD Visit</h3>
              <p className="appt-modal-subtitle">
                Register consultation routing and issue live OPD Queue Token
              </p>
            </div>
          </div>
          <button
            type="button"
            className="appt-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon.X />
          </button>
        </div>

        {/* Modal Body (Scrollable Container) */}
        <div className="appt-modal-body">
          {formError && (
            <div className="appt-dialog-error" role="alert" style={{ marginBottom: '8px' }}>
              <Icon.Alert />
              <span>{formError}</span>
            </div>
          )}

          {/* Patient Header Strip */}
          <div className="new-visit-patient-badge">
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
              gap: '10px',
              padding: '12px 16px',
              background: 'var(--md-sys-color-secondary-container)',
              color: 'var(--md-sys-color-on-secondary-container)',
              borderRadius: '14px',
              border: '1px solid var(--md-sys-color-outline-variant)',
              fontSize: '0.8125rem',
              lineHeight: '1.4'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>info</span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  Patient has {activeVisits.length} Active Clinical Encounter{activeVisits.length > 1 ? 's' : ''}
                </div>
                <div style={{ marginTop: '2px', opacity: 0.9 }}>
                  {activeVisits.map(v => `${v.tokenString || v.visitNumber} (${v.departmentId?.name || 'General OPD'} · ${v.status.replace(/_/g, ' ')})`).join(', ')}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                  Creating this visit will issue an additional concurrent queue token for the selected department.
                </div>
              </div>
            </div>
          )}

          <form id="new-visit-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
            {/* Section 1: Clinical Department & Doctor Routing (Decongested 2-Tier Layout) */}
            <div>
              <h4 className="new-visit-section-title" style={{ marginBottom: '12px' }}>
                <Icon.Calendar />
                <span>Clinical Routing & Physician</span>
              </h4>

              {/* Tier 1: Visit Type & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '12px' }}>
                <Md3Select
                  id="nv-visitType"
                  name="visitType"
                  label="Visit Type *"
                  value={visitForm.visitType}
                  onChange={handleField}
                  disabled={formLoading}
                  options={[
                    { value: 'OPD', label: 'OPD (Outpatient Consultation)' },
                    { value: 'EMERGENCY', label: 'Emergency / Urgent Care' },
                  ]}
                />

                <Md3Select
                  id="nv-departmentId"
                  name="departmentId"
                  label="Department *"
                  value={visitForm.departmentId}
                  onChange={handleField}
                  disabled={formLoading || loadingMeta}
                  options={[
                    { value: '', label: loadingMeta ? 'Loading departments…' : 'Select Clinical Department' },
                    ...departments.map((d) => ({ value: d._id, label: `${d.name} (${d.code || 'GEN'})` })),
                  ]}
                />
              </div>

              {/* Tier 2: Department-Filtered Physician Selection */}
              <div>
                <Md3Select
                  id="nv-doctorId"
                  name="doctorId"
                  label={visitForm.departmentId && selectedDeptObj ? `Assigned Doctor (${selectedDeptObj.name})` : 'Assigned Doctor (Optional)'}
                  value={visitForm.doctorId}
                  onChange={handleField}
                  disabled={formLoading || loadingMeta}
                  options={[
                    { 
                      value: '', 
                      label: visitForm.departmentId && availableDoctors.length === 0 
                        ? 'No specific doctor assigned — Route to General Department Triage' 
                        : 'Any Available Doctor / General Queue' 
                    },
                    ...availableDoctors.map((doc) => ({
                      value: doc._id,
                      label: `${formatDoctorName(doc.fullName || doc.name)} (${doc.departmentId?.name || selectedDeptObj?.name || 'Physician'})`,
                    })),
                  ]}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', paddingLeft: '4px' }}>
                  {visitForm.departmentId
                    ? `${availableDoctors.length} physician(s) available for ${selectedDeptObj?.name || 'this department'}`
                    : 'Select a department above to filter doctors by medical specialty.'}
                </div>
              </div>
            </div>

            {/* Same Department Duplicate Warning */}
            {isSameDeptActive && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'var(--md-sys-color-tertiary-container)',
                color: 'var(--md-sys-color-on-tertiary-container)',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>warning</span>
                <span>Notice: Patient already has an active visit in this department ({isSameDeptActive.tokenString || isSameDeptActive.visitNumber}).</span>
              </div>
            )}

            {/* Section 2: Chief Complaint */}
            <div className="new-visit-field-full">
              <Md3TextField
                id="nv-reasonForVisit"
                name="reasonForVisit"
                label="Reason for Visit / Chief Complaint"
                placeholder="Describe presenting symptoms, chief complaints, or purpose of visit…"
                value={visitForm.reasonForVisit}
                onChange={handleField}
                disabled={formLoading}
                multiline
                rows={2}
              />
            </div>

            {/* Quick Complaint Chips */}
            <div className="new-visit-chips-wrap">
              <span className="new-visit-chips-label">Quick Symptoms:</span>
              <div className="new-visit-chips-list">
                {QUICK_COMPLAINTS.map((complaint) => (
                  <button
                    key={complaint}
                    type="button"
                    className={`new-visit-chip ${
                      visitForm.reasonForVisit.includes(complaint) ? 'active' : ''
                    }`}
                    onClick={() => handleChipClick(complaint)}
                    disabled={formLoading}
                  >
                    + {complaint}
                  </button>
                ))}
              </div>
            </div>

            <Md3Divider />

            {/* Section 3: Reception Billing & Fee Collection */}
            <h4 className="new-visit-section-title">
              <Icon.CreditCard />
              <span>Reception Billing & Fee Collection</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <Md3TextField
                id="nv-registrationFee"
                name="registrationFee"
                label={`Registration Fee (${CURRENCY_SYMBOL})`}
                type="number"
                min="0"
                step="10"
                value={visitForm.registrationFee}
                onChange={handleField}
                disabled={formLoading}
              />

              <Md3TextField
                id="nv-consultationFee"
                name="consultationFee"
                label={`Doctor Fee (${CURRENCY_SYMBOL})`}
                type="number"
                min="0"
                step="50"
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
                  { value: 'UPI', label: 'UPI / QR Code' },
                  { value: 'Card', label: 'Debit / Credit Card' },
                  { value: 'Insurance', label: 'Insurance' },
                ]}
              />
            </div>

            {/* Fee Summary */}
            <div className="new-visit-fee-summary">
              <span className="new-visit-fee-label">Total Payment Collectible at Reception:</span>
              <span className="new-visit-fee-total">{CURRENCY_SYMBOL}{totalFee.toFixed(2)}</span>
            </div>
          </form>
        </div>

        {/* Modal Actions Footer (Pinned, always visible) */}
        <div className="appt-modal-actions">
          <Md3Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={formLoading}
            style={{ width: 'auto', minWidth: '110px' }}
          >
            Cancel
          </Md3Button>
          <Md3Button
            type="submit"
            form="new-visit-form"
            onClick={handleSubmit}
            disabled={formLoading}
            loading={formLoading}
            loadingText="Generating Token…"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            <Icon.Plus />
            <span>Confirm & Check In Patient</span>
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewVisitDialog;