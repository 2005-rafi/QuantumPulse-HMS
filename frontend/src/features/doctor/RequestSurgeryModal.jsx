import React, { useState, useEffect } from 'react';
import { Md3Button, Md3TextField, Md3Select, Md3TextArea, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { useToast } from '../../context/ToastContext';
import { formatDoctorName } from '../../utils/patientFormatters';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';

const SURGERY_TYPES = [
  { value: 'ELECTIVE', label: 'Elective (Planned Surgery)' },
  { value: 'EMERGENCY_TRAUMA', label: 'STAT Trauma & Accident Surgery' },
  { value: 'EMERGENCY_MATERNITY_CSECTION', label: 'Maternity Emergency (Childbirth / C-Section)' },
  { value: 'EMERGENCY_ACUTE', label: 'Acute Surgical Emergency (Acute Abdomen / Sepsis)' },
];

const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: 'Routine (Within normal elective schedule)' },
  { value: 'URGENT', label: 'Urgent (Within 24-48 hours)' },
  { value: 'EMERGENCY_STAT', label: 'STAT / Critical Emergency (Immediate OT Allocation)' },
];

const WARD_CLASSES = [
  { value: 'GENERAL_WARD', label: 'General Ward' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private Ward' },
  { value: 'PRIVATE', label: 'Single Private Room' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Private Suite' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'DAY_CARE', label: 'Day Care / Recovery Unit' },
];

const ANESTHESIA_TYPES = [
  { value: 'GENERAL', label: 'General Anesthesia (GA)' },
  { value: 'SPINAL', label: 'Spinal Anesthesia' },
  { value: 'EPIDURAL', label: 'Epidural' },
  { value: 'LOCAL', label: 'Local Anesthesia' },
  { value: 'SEDATION', label: 'Conscious Sedation' },
  { value: 'NONE', label: 'None / Topical' },
];

export const RequestSurgeryModal = ({ isOpen, onClose, admissionId, patient, visit, onSuccess }) => {
  const { showSuccess, showError } = useToast();

  const [procedureName, setProcedureName] = useState('');
  const [suggestedSurgeonId, setSuggestedSurgeonId] = useState('');
  const [surgeryType, setSurgeryType] = useState('ELECTIVE');
  const [urgency, setUrgency] = useState('ROUTINE');
  const [targetDate, setTargetDate] = useState('');
  const [targetWardClass, setTargetWardClass] = useState('GENERAL_WARD');
  const [anesthesiaType, setAnesthesiaType] = useState('GENERAL');
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [surgeons, setSurgeons] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProcedureName('');
      setSuggestedSurgeonId('');
      setSurgeryType('ELECTIVE');
      setUrgency('ROUTINE');
      setTargetWardClass('GENERAL_WARD');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTargetDate(tomorrow.toISOString().split('T')[0]);
      setAnesthesiaType('GENERAL');
      setRequestNotes(visit?.consultation?.notes || visit?.reasonForVisit || '');

      // Fetch surgeons/doctors
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
          console.warn('Failed to load surgeons list:', err.message);
          setLoadingStaff(false);
        }
      };
      loadStaff();
    }
  }, [isOpen, visit]);

  const handleSurgeryTypeChange = (newType) => {
    setSurgeryType(newType);
    if (newType !== 'ELECTIVE') {
      setUrgency('EMERGENCY_STAT');
      setTargetDate(new Date().toISOString().split('T')[0]);
      if (newType === 'EMERGENCY_TRAUMA' || newType === 'EMERGENCY_MATERNITY_CSECTION') {
        setTargetWardClass('ICU');
      }
    } else {
      setUrgency('ROUTINE');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTargetDate(tomorrow.toISOString().split('T')[0]);
    }
  };

  const surgeonOptions = [
    { value: '', label: loadingStaff ? 'Loading surgeons...' : 'Unassigned / Any Available Surgeon' },
    ...surgeons.map((s) => ({
      value: s._id,
      label: `${formatDoctorName(s.fullName || `${s.firstName} ${s.lastName}`)}${s.specialization ? ` — ${s.specialization}` : ` (${s.roleId?.name || s.role || s.position || 'Surgeon'})`}`,
    })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!procedureName.trim()) {
      showError('Procedure Name Required', 'Please specify the proposed surgery or surgical procedure.');
      return;
    }

    const targetAdmissionId = admissionId || visit?.ipdAdmissionId || visit?.convertedToAdmissionId || null;
    const targetVisitId = visit?._id || null;
    const targetPatientId = patient?._id || visit?.patientId?._id || visit?.patientId || null;

    if (!targetAdmissionId && !targetVisitId && !targetPatientId) {
      showError('Patient Context Required', 'Could not identify patient or visit to dispatch surgery request.');
      return;
    }

    try {
      setSubmitting(true);
      const isEmergency = surgeryType !== 'ELECTIVE';
      const payload = {
        admissionId: targetAdmissionId,
        visitId: targetVisitId,
        patientId: targetPatientId,
        procedureName: procedureName.trim(),
        procedureCategory: surgeryType,
        surgeryType: isEmergency ? surgeryType : 'ELECTIVE',
        urgency,
        targetDate: targetDate ? new Date(targetDate) : new Date(),
        targetWardClass,
        anesthesiaType,
        leadSurgeonId: suggestedSurgeonId || undefined,
        suggestedSurgeonId: suggestedSurgeonId || undefined,
        requestNotes: requestNotes.trim(),
      };

      const res = await ipdApi.requestSurgery(payload);
      showSuccess(
        isEmergency ? 'Emergency Surgery Order Dispatched' : 'Surgery Request Dispatched',
        `Surgery request for "${procedureName.trim()}" dispatched. Patient scheduled for surgical planning & OT suite allocation.`
      );
      setSubmitting(false);
      onClose();
      if (onSuccess) onSuccess(res.data?.data);
    } catch (err) {
      setSubmitting(false);
      const msg = err.response?.data?.message || err.message || 'Failed to submit surgery request.';
      showError('Surgery Request Failed', msg);
    }
  };

  const patientName = patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Patient';
  const mrn = patient?.mrn || '—';

  return (
    <Md3BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Request Surgery & Surgical Management"
      subtitle={`Submit surgery request for ${patientName} (MRN: ${mrn}) for surgical evaluation, surgeon assignment, and OT scheduling`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0 24px' }}>
        {/* Procedure Name */}
        <Md3TextField
          name="procedureName"
          label="Proposed Surgery / Procedure Name *"
          value={procedureName}
          onChange={(e) => setProcedureName(e.target.value)}
          placeholder="e.g. Laparoscopic Appendectomy, Total Knee Replacement, Hernioplasty"
          disabled={submitting}
        />

        {/* Suggested Surgeon */}
        <Md3Select
          name="suggestedSurgeonId"
          label="Suggested Surgeon (Optional / Doctor Recommendation)"
          value={suggestedSurgeonId}
          onChange={(e) => setSuggestedSurgeonId(e.target.value)}
          options={surgeonOptions}
          disabled={submitting}
        />

        {/* Surgery Type & Urgency */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Md3Select
            name="surgeryType"
            label="Surgery Classification *"
            value={surgeryType}
            onChange={(e) => handleSurgeryTypeChange(e.target.value)}
            options={SURGERY_TYPES}
            disabled={submitting}
          />
          <Md3Select
            name="urgency"
            label="Clinical Urgency *"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            options={URGENCY_LEVELS}
            disabled={submitting}
          />
        </div>

        {/* Target Date & Ward Accommodation Recommendation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Md3TextField
            name="targetDate"
            label="Target / Preferred Date *"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            disabled={submitting}
          />
          <Md3Select
            name="targetWardClass"
            label="Post-Op Ward Class Advice"
            value={targetWardClass}
            onChange={(e) => setTargetWardClass(e.target.value)}
            options={WARD_CLASSES}
            disabled={submitting}
          />
        </div>

        {/* Anesthesia Mode */}
        <Md3Select
          name="anesthesiaType"
          label="Preferred Anesthesia Mode"
          value={anesthesiaType}
          onChange={(e) => setAnesthesiaType(e.target.value)}
          options={ANESTHESIA_TYPES}
          disabled={submitting}
        />

        {/* Clinical Indications / Request Notes */}
        <Md3TextArea
          name="requestNotes"
          label="Clinical Indications, Diagnostic Findings & Pre-Op Notes"
          value={requestNotes}
          onChange={(e) => setRequestNotes(e.target.value)}
          placeholder="Pre-op diagnosis, co-morbidities, surgical indications, special equipment requirements..."
          rows={3}
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
            loadingText="Submitting..."
            disabled={submitting}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>medical_services</span>
            <span>Dispatch Surgery Request</span>
          </Md3Button>
        </div>
      </form>
    </Md3BottomSheet>
  );
};

export default RequestSurgeryModal;
