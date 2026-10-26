import React, { useState, useEffect } from 'react';
import { Md3Button, Md3TextField, Md3Select, Md3TextArea, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { useToast } from '../../context/ToastContext';
import { formatDoctorName } from '../../utils/patientFormatters';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';

const ADMISSION_TYPES = [
  { value: 'PLANNED', label: 'Planned Medical Admission' },
  { value: 'SURGICAL', label: 'Surgical Admission' },
  { value: 'EMERGENCY', label: 'Emergency Observation' },
  { value: 'DAY_CARE', label: 'Day Care Procedure' },
];

const WARD_CLASSES = [
  { value: 'GENERAL_WARD', label: 'General Ward' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private Ward' },
  { value: 'PRIVATE', label: 'Single Private Room' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Private Suite' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'DAY_CARE', label: 'Day Care / Recovery Unit' },
];

const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: 'Routine (Standard Ward Allocation)' },
  { value: 'URGENT', label: 'Urgent (Priority Placement within 2-4 hrs)' },
  { value: 'EMERGENCY_STAT', label: 'STAT / Emergency (Immediate Placement)' },
];

const DIET_TIERS = [
  { value: 'REGULAR_DIET', label: 'Regular Hospital Diet' },
  { value: 'DIABETIC', label: 'Diabetic Diet' },
  { value: 'RENAL', label: 'Renal / Low Sodium' },
  { value: 'CARDIAC', label: 'Cardiac Diet' },
  { value: 'LIQUID', label: 'Clear Liquid Diet' },
  { value: 'SOFT', label: 'Soft Diet' },
  { value: 'NPO', label: 'NPO (Nil Per Os / Fasting)' },
];

export const RecommendIpdAdmissionModal = ({ isOpen, onClose, visit, onSuccess }) => {
  const { showSuccess, showError } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [surgeons, setSurgeons] = useState([]);

  // Form fields
  const [targetWardClass, setTargetWardClass] = useState('GENERAL_WARD');
  const [admissionType, setAdmissionType] = useState('PLANNED');
  const [urgency, setUrgency] = useState('ROUTINE');
  const [suggestedSurgeonId, setSuggestedSurgeonId] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [carePlan, setCarePlan] = useState('');
  const [dietTier, setDietTier] = useState('REGULAR_DIET');

  // Prefill consultation info & load surgeons
  useEffect(() => {
    if (isOpen && visit) {
      setProvisionalDiagnosis(visit.consultation?.diagnosis || visit.reasonForVisit || '');
      setChiefComplaints(visit.consultation?.chiefComplaint || visit.vitals?.chiefComplaint || visit.reasonForVisit || '');
      setCarePlan(visit.consultation?.treatmentPlan || '');
      setAdmissionType('PLANNED');
      setTargetWardClass('GENERAL_WARD');
      setUrgency('ROUTINE');
      setSuggestedSurgeonId('');
      setDietTier('REGULAR_DIET');

      const loadStaff = async () => {
        try {
          setLoadingStaff(true);
          const res = await api.get('/staff', { params: { limit: 100, status: 'Active' } });
          const rawStaff = res.data?.data || res.data;
          const staffList =
            rawStaff?.items ||
            rawStaff?.data?.items ||
            rawStaff?.staff ||
            (Array.isArray(rawStaff) ? rawStaff : []);
          const eligible = staffList.filter((s) => {
            const role = s.roleId?.name || s.role || '';
            const pos = s.position || s.designation || '';
            return /Doctor|Surgeon/i.test(role) || /Surgeon|Doctor|Physician/i.test(pos);
          });
          setSurgeons(eligible);
          setLoadingStaff(false);
        } catch (err) {
          console.warn('Failed to load specialists list:', err.message);
          setLoadingStaff(false);
        }
      };
      loadStaff();
    }
  }, [isOpen, visit]);

  const surgeonOptions = [
    { value: '', label: loadingStaff ? 'Loading specialists...' : 'Unassigned / Any Available Specialist' },
    ...surgeons.map((s) => ({
      value: s._id,
      label: `${formatDoctorName(s.fullName || `${s.firstName} ${s.lastName}`)}${s.specialization ? ` — ${s.specialization}` : ` (${s.roleId?.name || s.role || s.position || 'Specialist'})`}`,
    })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!provisionalDiagnosis.trim()) {
      showError('Diagnosis Required', 'Please enter a provisional diagnosis for admission advice.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        visitId: visit._id,
        targetWardClass,
        admissionType,
        urgency,
        suggestedSurgeonId: suggestedSurgeonId || undefined,
        provisionalDiagnosis: provisionalDiagnosis.trim(),
        chiefComplaints: chiefComplaints.trim(),
        carePlan: carePlan.trim(),
        dietTier,
      };

      const res = await ipdApi.recommendAdmission(payload);
      showSuccess(
        'Inpatient Admission Recommended',
        `Admission advice dispatched to Ward Management. Patient queued for bed allocation.`
      );
      setSubmitting(false);
      onClose();
      if (onSuccess) onSuccess(res.data?.data);
    } catch (err) {
      setSubmitting(false);
      const msg = err.response?.data?.message || err.message || 'Failed to submit admission recommendation.';
      showError('Admission Recommendation Failed', msg);
    }
  };

  const patientName = visit?.patientId?.fullName || `${visit?.patientId?.firstName || ''} ${visit?.patientId?.lastName || ''}`.trim() || 'Patient';
  const mrn = visit?.patientId?.mrn || '—';

  return (
    <Md3BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Recommend Inpatient (IPD) Admission"
      subtitle={`Advise inpatient admission and ward orders for ${patientName} (MRN: ${mrn}). Ward Management will allocate the physical bed.`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0 24px' }}>
        {/* Provisional Diagnosis */}
        <Md3TextField
          name="provisionalDiagnosis"
          label="Provisional Diagnosis *"
          value={provisionalDiagnosis}
          onChange={(e) => setProvisionalDiagnosis(e.target.value)}
          placeholder="e.g. Acute Appendicitis, Uncontrolled Hyperglycemia, Pyelonephritis"
          disabled={submitting}
        />

        {/* Target Ward Class & Admission Pathway */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Md3Select
            name="targetWardClass"
            label="Recommended Ward Accommodation *"
            value={targetWardClass}
            onChange={(e) => setTargetWardClass(e.target.value)}
            options={WARD_CLASSES}
            disabled={submitting}
          />
          <Md3Select
            name="admissionType"
            label="Admission Pathway *"
            value={admissionType}
            onChange={(e) => setAdmissionType(e.target.value)}
            options={ADMISSION_TYPES}
            disabled={submitting}
          />
        </div>

        {/* Urgency & Suggested Surgeon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Md3Select
            name="urgency"
            label="Clinical Urgency *"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            options={URGENCY_LEVELS}
            disabled={submitting}
          />
          <Md3Select
            name="suggestedSurgeonId"
            label="Suggested Surgeon / Specialist"
            value={suggestedSurgeonId}
            onChange={(e) => setSuggestedSurgeonId(e.target.value)}
            options={surgeonOptions}
            disabled={submitting}
          />
        </div>

        {/* Chief Complaints */}
        <Md3TextArea
          name="chiefComplaints"
          label="Chief Clinical Complaints & Symptoms"
          value={chiefComplaints}
          onChange={(e) => setChiefComplaints(e.target.value)}
          placeholder="Detailed clinical complaints observed during outpatient visit..."
          rows={2}
          disabled={submitting}
        />

        {/* Initial Care Plan */}
        <Md3TextArea
          name="carePlan"
          label="Initial Inpatient Care Plan & Doctor Orders"
          value={carePlan}
          onChange={(e) => setCarePlan(e.target.value)}
          placeholder="e.g. IV fluids, serial vitals Q4H, surgical evaluation, NPO after midnight..."
          rows={2}
          disabled={submitting}
        />

        {/* Diet Tier */}
        <Md3Select
          name="dietTier"
          label="Inpatient Nutrition / Diet Protocol *"
          value={dietTier}
          onChange={(e) => setDietTier(e.target.value)}
          options={DIET_TIERS}
          disabled={submitting}
        />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Md3Button type="button" variant="text" onClick={onClose} disabled={submitting}>
            Cancel
          </Md3Button>
          <Md3Button
            type="submit"
            variant="primary"
            loading={submitting}
            loadingText="Advising..."
            disabled={submitting}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>recommend</span>
            <span>Dispatch Admission Advice</span>
          </Md3Button>
        </div>
      </form>
    </Md3BottomSheet>
  );
};

// Aliases for compatibility
export const ConvertOpdToIpdModal = RecommendIpdAdmissionModal;
export default RecommendIpdAdmissionModal;
