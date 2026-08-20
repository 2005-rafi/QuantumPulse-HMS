/**
 * useDoctorWorkspace.js
 * Encapsulates all state and logic for the Doctor Consultation Dashboard.
 *
 * SOLID:
 *   SRP — Manages doctor queue, consultation form state, and API operations only.
 *   OCP — Tab configuration is data-driven; extend without modifying this hook.
 *   DIP — Depends on visitAPI/patientAPI abstractions, not raw fetch.
 *
 * Bug fix: Original DoctorDashboard.jsx had a typo (`fontally` instead of `finally`).
 * That is corrected here.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { visitAPI } from '../services/visitAPI';
import { patientAPI } from '../services/patientAPI';
import api from '../services/api';
import { Icon } from '../components/md3/Md3Widgets';

const CONSULTATION_TAB = {
  id: 'consultation',
  label: 'Consultation Desk',
  icon: null, // Rendered in DoctorDashboard
};

const APPOINTMENTS_TAB = {
  id: 'appointments',
  label: 'Appointments',
  icon: null,
};

const DELETION_TAB = {
  id: 'deletionRequests',
  label: 'Deletion Requests',
  icon: null,
};

const DEFAULT_LABORATORIES = [
  {
    _id: 'lab-haematology',
    name: 'Haematology Laboratory',
    code: 'HAEM',
    description: 'Complete blood analysis and haematology investigations',
    testCatalog: [
      { name: 'Complete Blood Count (CBC)', testCode: 'CBC', sampleType: 'EDTA Blood (3 mL)' },
      { name: 'Erythrocyte Sedimentation Rate (ESR)', testCode: 'ESR', sampleType: 'Citrate Blood (1.8 mL)' },
      { name: 'Peripheral Blood Smear', testCode: 'PBS', sampleType: 'Whole Blood' },
      { name: 'Coagulation Profile (PT/INR, aPTT)', testCode: 'COAG', sampleType: 'Citrate Plasma' },
    ],
  },
  {
    _id: 'lab-biochemistry',
    name: 'Biochemistry Laboratory',
    code: 'BIOCHEM',
    description: 'Blood chemistry, metabolic panel, and organ function tests',
    testCatalog: [
      { name: 'Liver Function Test (LFT)', testCode: 'LFT', sampleType: 'Serum (5 mL)' },
      { name: 'Renal Function Test (RFT)', testCode: 'RFT', sampleType: 'Serum (5 mL)' },
      { name: 'Blood Glucose (Fasting / Random / PP)', testCode: 'GLU', sampleType: 'Fluoride Plasma' },
      { name: 'Lipid Profile', testCode: 'LIPID', sampleType: 'Serum (3 mL)' },
      { name: 'Serum Electrolytes (Na, K, Cl)', testCode: 'LYTES', sampleType: 'Serum (2 mL)' },
      { name: 'HbA1c (Glycated Haemoglobin)', testCode: 'HBA1C', sampleType: 'EDTA Blood (2 mL)' },
    ],
  },
  {
    _id: 'lab-microbiology',
    name: 'Microbiology Laboratory',
    code: 'MICRO',
    description: 'Cultures, smears, staining, and antibiotic sensitivity testing',
    testCatalog: [
      { name: 'Urine Routine & Microscopy', testCode: 'URINE_RM', sampleType: 'Clean-Catch Midstream Urine' },
      { name: 'Urine Culture & Sensitivity', testCode: 'URINE_CS', sampleType: 'Sterile Urine Container' },
      { name: 'Blood Culture & Sensitivity', testCode: 'BLOOD_CS', sampleType: 'Blood Culture Bottle' },
      { name: 'Sputum for AFB / Gram Stain', testCode: 'SPUTUM', sampleType: 'Early Morning Sputum' },
      { name: 'Stool Routine & Occult Blood', testCode: 'STOOL_RM', sampleType: 'Stool Sample' },
    ],
  },
  {
    _id: 'lab-radiology',
    name: 'Radiology & Imaging',
    code: 'RADIO',
    description: 'X-Ray, Ultrasound, CT, and MRI diagnostic imaging',
    testCatalog: [
      { name: 'Chest X-Ray (PA View)', testCode: 'CXR', sampleType: 'Diagnostic Imaging' },
      { name: 'Ultrasound Whole Abdomen', testCode: 'USG_ABD', sampleType: 'Diagnostic Imaging' },
      { name: 'CT Scan Brain (Plain / Contrast)', testCode: 'CT_BRAIN', sampleType: 'Diagnostic Imaging' },
      { name: 'MRI Lumbar Spine', testCode: 'MRI_LS', sampleType: 'Diagnostic Imaging' },
      { name: 'ECG (12-Lead Electrocardiogram)', testCode: 'ECG', sampleType: 'Diagnostic Imaging' },
    ],
  },
  {
    _id: 'lab-histopathology',
    name: 'Histopathology Laboratory',
    code: 'HISTO',
    description: 'Biopsy analysis and surgical pathology specimens',
    testCatalog: [
      { name: 'Tissue Biopsy Examination', testCode: 'BIOPSY', sampleType: 'Formalin-Fixed Tissue' },
      { name: 'Fine Needle Aspiration Cytology (FNAC)', testCode: 'FNAC', sampleType: 'Aspiration Smear' },
      { name: 'Pap Smear Cervical Cytology', testCode: 'PAP', sampleType: 'Cervical Smear' },
    ],
  },
];

/**
 * @returns {{
 *   queue: Array,
 *   selectedVisit: Object|null,
 *   form: Object,
 *   laboratories: Array,
 *   activeTab: string,
 *   setActiveTab: Function,
 *   deletionRequests: Array,
 *   savingDraft: boolean,
 *   finalizing: boolean,
 *   isRefreshing: boolean,
 *   fetchQueue: Function,
 *   handleSelectVisit: Function,
 *   handleFormChange: Function,
 *   handleMedicationsChange: Function,
 *   handleLabOrdersChange: Function,
 *   handleNotesChange: Function,
 *   handleSaveDraft: Function,
 *   handleFinalize: Function,
 *   canFinalize: boolean,
 *   queueStats: Object,
 *   headerTabs: Array
 * }}
 */
export const useDoctorWorkspace = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [laboratories, setLaboratories] = useState(DEFAULT_LABORATORIES);
  const [form, setForm] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    differentials: '',
    prognosis: '',
    diagnosis: '',
    treatmentPlan: '',
    notes: '',
    prescribedMedications: [],
    labOrders: [],
  });
  const [activeTab, setActiveTab] = useState('consultation');
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [routingToLab, setRoutingToLab] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      setIsRefreshing(true);
      if (!user?.departmentId) return;

      const [waitRes, progRes, reviewRes] = await Promise.all([
        visitAPI.getQueue('WAITING_DOCTOR', { departmentId: user.departmentId }),
        visitAPI.getQueue('IN_PROGRESS', { departmentId: user.departmentId }),
        visitAPI.getQueue('WAITING_DOCTOR_REVIEW', { departmentId: user.departmentId }),
      ]);

      const combined = [
        ...(reviewRes.data?.data || []),
        ...(progRes.data?.data || []),
        ...(waitRes.data?.data || []),
      ];
      setQueue(combined);

      try {
        const delReqRes = await patientAPI.getPendingDeletionRequests();
        setDeletionRequests(delReqRes.data || []);
      } catch (delErr) {
        // Auxiliary compliance feature — do not block clinical queue
        setDeletionRequests([]);
      }
    } catch (err) {
      console.error('[useDoctorWorkspace] fetchQueue error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  const fetchLaboratories = useCallback(async () => {
    try {
      const res = await api.get('/laboratory/config');
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setLaboratories(data);
      } else {
        setLaboratories(DEFAULT_LABORATORIES);
      }
    } catch (err) {
      console.error('[useDoctorWorkspace] fetchLaboratories error:', err);
      setLaboratories(DEFAULT_LABORATORIES);
    }
  }, []);

  useEffect(() => {
    fetchLaboratories();
  }, [fetchLaboratories]);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, [fetchQueue]);

  const handleSelectVisit = useCallback(async (visit) => {
    let activeVisit = visit;
    if (visit.status === 'WAITING_DOCTOR') {
      try {
        const res = await visitAPI.startConsultation(visit._id);
        activeVisit = res.data?.data || res.data;
        fetchQueue();
      } catch (err) {
        showError('Failed to start consultation');
        return;
      }
    }

    setSelectedVisit(activeVisit);
    const existingConsult = activeVisit.consultation || {};
    setForm({
      chiefComplaint: existingConsult.chiefComplaint || activeVisit.vitals?.chiefComplaint || '',
      historyOfPresentIllness: existingConsult.historyOfPresentIllness || '',
      physicalExamination: existingConsult.physicalExamination || '',
      differentials: existingConsult.differentials || '',
      prognosis: existingConsult.prognosis || '',
      diagnosis: existingConsult.diagnosis || '',
      treatmentPlan: existingConsult.treatmentPlan || '',
      notes: existingConsult.notes || '',
      prescribedMedications: activeVisit.prescribedMedications || [],
      labOrders: activeVisit.labOrders || [],
    });
  }, [fetchQueue, showError]);

  const handleFormChange = useCallback((newForm) => {
    setForm((prev) => ({ ...prev, ...newForm }));
  }, []);

  const handleMedicationsChange = useCallback((meds) => {
    setForm((prev) => ({ ...prev, prescribedMedications: meds }));
  }, []);

  const handleLabOrdersChange = useCallback((orders) => {
    setForm((prev) => ({ ...prev, labOrders: orders }));
  }, []);

  const handleNotesChange = useCallback((notes) => {
    setForm((prev) => ({ ...prev, notes }));
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedVisit) return;
    setSavingDraft(true);
    try {
      await visitAPI.saveDraft(selectedVisit._id, form);
      showSuccess('Draft saved successfully!');
      fetchQueue();
    } catch (err) {
      showError('Failed to save draft: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingDraft(false);
    }
  }, [selectedVisit, form, fetchQueue, showSuccess, showError]);

  const handleSendToLab = useCallback(async () => {
    if (!selectedVisit) return;
    if (!form.labOrders || form.labOrders.length === 0) {
      showError('Please add at least one laboratory investigation before routing to laboratory.');
      return;
    }
    setRoutingToLab(true);
    try {
      await visitAPI.orderLabsAndRoute(selectedVisit._id, form);
      setSelectedVisit(null);
      fetchQueue();
      showSuccess(`Patient routed to Laboratory for ${form.labOrders.length} test(s)!`);
    } catch (err) {
      showError('Failed to route patient to laboratory: ' + (err.response?.data?.message || err.message));
    } finally {
      setRoutingToLab(false);
    }
  }, [selectedVisit, form, fetchQueue, showSuccess, showError]);

  const handleFinalize = useCallback(async () => {
    if (!selectedVisit) return;
    if (!form.diagnosis?.trim() || !form.treatmentPlan?.trim()) {
      showError('Diagnosis and Treatment Plan are required to finalize.');
      return;
    }
    setFinalizing(true);
    try {
      await visitAPI.finalizeConsultation(selectedVisit._id, form);
      setSelectedVisit(null);
      fetchQueue();
      showSuccess('Consultation finalized and patient routed!');
    } catch (err) {
      showError('Failed to finalize: ' + (err.response?.data?.message || err.message));
    } finally {
      // BUG FIX: was `fontally` in original DoctorDashboard.jsx
      setFinalizing(false);
    }
  }, [selectedVisit, form, fetchQueue, showSuccess, showError]);

  const canFinalize = useMemo(() => !!(
    selectedVisit &&
    form.diagnosis?.trim() &&
    form.treatmentPlan?.trim() &&
    !finalizing
  ), [selectedVisit, form, finalizing]);

  const queueStats = useMemo(() => {
    const counts = { IN_PROGRESS: 0, WAITING_DOCTOR_REVIEW: 0, WAITING_DOCTOR: 0 };
    queue.forEach((v) => {
      if (counts[v.status] !== undefined) counts[v.status]++;
    });
    return counts;
  }, [queue]);

  const headerTabs = useMemo(() => [
    CONSULTATION_TAB,
    APPOINTMENTS_TAB,
    {
      ...DELETION_TAB,
      label: deletionRequests.length > 0
        ? `${DELETION_TAB.label} (${deletionRequests.length})`
        : DELETION_TAB.label,
    },
  ], [deletionRequests.length]);

  return {
    queue,
    selectedVisit,
    form,
    laboratories,
    activeTab,
    setActiveTab,
    deletionRequests,
    savingDraft,
    routingToLab,
    finalizing,
    isRefreshing,
    fetchQueue,
    handleSelectVisit,
    handleFormChange,
    handleMedicationsChange,
    handleLabOrdersChange,
    handleNotesChange,
    handleSaveDraft,
    handleSendToLab,
    handleFinalize,
    canFinalize,
    queueStats,
    headerTabs,
  };
};
