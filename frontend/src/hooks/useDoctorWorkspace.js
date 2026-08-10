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

const DELETION_TAB = {
  id: 'deletionRequests',
  label: 'Deletion Requests',
  icon: null,
};

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
  const [laboratories, setLaboratories] = useState([]);
  const [activeTab, setActiveTab] = useState('consultation');
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      setIsRefreshing(true);
      if (!user?.departmentId) return;

      const [waitRes, progRes, reviewRes] = await Promise.all([
        visitAPI.getQueue('WAITING_DOCTOR', { departmentId: user.departmentId }),
        visitAPI.getQueue('IN_PROGRESS', { 'consultation.doctorId': user.staffId }),
        visitAPI.getQueue('WAITING_DOCTOR_REVIEW', { 'consultation.doctorId': user.staffId }),
      ]);

      const combined = [
        ...(reviewRes.data?.data || []),
        ...(progRes.data?.data || []),
        ...(waitRes.data?.data || []),
      ];
      setQueue(combined);

      const delReqRes = await patientAPI.getPendingDeletionRequests();
      setDeletionRequests(delReqRes.data || []);
    } catch (err) {
      console.error('[useDoctorWorkspace] fetchQueue error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  const fetchLaboratories = useCallback(async () => {
    try {
      const res = await api.get('/laboratory/config');
      setLaboratories(res.data?.data || []);
    } catch (err) {
      console.error('[useDoctorWorkspace] fetchLaboratories error:', err);
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
    finalizing,
    isRefreshing,
    fetchQueue,
    handleSelectVisit,
    handleFormChange,
    handleMedicationsChange,
    handleLabOrdersChange,
    handleNotesChange,
    handleSaveDraft,
    handleFinalize,
    canFinalize,
    queueStats,
    headerTabs,
  };
};
