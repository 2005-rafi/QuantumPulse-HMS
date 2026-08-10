/**
 * usePharmacyDispense.js
 * Encapsulates all state and logic for the Pharmacy Dispensing Dashboard.
 *
 * SOLID:
 *   SRP — Manages pharmacy queue, medication dispense, billing state, and settings only.
 *   OCP — Medication row shape is defined centrally; extend without modifying.
 *   DIP — Depends on visitAPI and adminAPI abstractions, not raw fetch.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { visitAPI } from '../services/visitAPI';
import { adminAPI } from '../services/adminAPI';

const DEFAULT_DOSAGE_SCHEDULE = {
  morning:   { count: 1, timing: 'AFTER_FOOD' },
  afternoon: { count: 0, timing: 'N/A' },
  night:     { count: 1, timing: 'AFTER_FOOD' },
};

const DEFAULT_HOSPITAL_INFO = {
  name: 'HMS Hospital',
  address: '123 Medical Center, City',
  contact: 'Phone: +91 000 000 0000',
};

const DEFAULT_LABELS = {
  title: 'OFFICIAL MEDICAL BILL',
  date: 'Date',
  billNo: 'Bill No',
  patientName: 'Patient Name',
  mrn: 'MRN',
  ageGender: 'Age / Gender',
  doctor: 'Consulting Doctor',
  description: 'Description',
  quantity: 'Qty',
  amount: 'Amount',
  consultationFee: 'Doctor Consultation Fee',
  labCharges: 'Laboratory Charges',
  totalAmount: 'TOTAL AMOUNT DUE',
  pharmacistSignature: 'Pharmacist Signature',
  hospitalSeal: 'Authorized Hospital Seal',
  footerNote: 'Thank you for your visit. Wishing you a speedy recovery!',
};

/**
 * Maps a prescribed medication from doctor's consultation form into the pharmacy dispense row shape.
 * @param {Object|string} med - Medication object or string name
 * @returns {Object} Pharmacy medication row
 */
const mapPrescribedMedication = (med) => {
  const isObj = typeof med === 'object' && med !== null;
  return {
    recommended: isObj ? (med.name || '') : String(med),
    alternativeGiven: '',
    quantity: '',
    amount: '',
    dosageSchedule: isObj ? (med.dosageSchedule || DEFAULT_DOSAGE_SCHEDULE) : DEFAULT_DOSAGE_SCHEDULE,
  };
};

/**
 * @returns {{
 *   activeTab, setActiveTab, selectedPatient, setSelectedPatient, queue, selectedVisit,
 *   medications, consultationFee, setConsultationFee, labCharges, setLabCharges,
 *   submitting, showPreview, setShowPreview, hospitalInfo, labels, customFields,
 *   fetchQueue, handlePatientSelect, handleDirectPharmacy, selectVisit,
 *   handleAddMedication, handleRemoveMedication, handleMedChange,
 *   handleGeneratePreview, handleFinalize, totalBillAmount
 * }}
 */
export const usePharmacyDispense = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [medications, setMedications] = useState([]);
  const [consultationFee, setConsultationFee] = useState(0);
  const [labCharges, setLabCharges] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState(DEFAULT_HOSPITAL_INFO);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [customFields, setCustomFields] = useState([]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await visitAPI.getQueue('WAITING_PHARMACY');
      setQueue(res.data?.data || []);
    } catch (err) {
      console.error('[usePharmacyDispense] fetchQueue error:', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await adminAPI.getSetting('billing_template');
      if (res.data?.data) {
        setHospitalInfo(res.data.data.hospitalInfo || DEFAULT_HOSPITAL_INFO);
        let fetchedLabels = res.data.data.labels;
        if (Array.isArray(fetchedLabels)) {
          fetchedLabels = fetchedLabels.reduce(
            (acc, curr) => ({ ...acc, [curr.key]: curr.value }),
            {}
          );
        }
        setLabels(fetchedLabels || DEFAULT_LABELS);
        setCustomFields(res.data.data.customFields || []);
      }
    } catch (err) {
      console.error('[usePharmacyDispense] fetchSettings error:', err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchSettings();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchSettings]);

  const handlePatientSelect = useCallback((patient) => {
    setSelectedPatient(patient);
    setActiveTab('profile');
  }, []);

  const selectVisit = useCallback((visit) => {
    setSelectedVisit(visit);
    const initialMeds = (visit.prescribedMedications || []).map(mapPrescribedMedication);
    setMedications(initialMeds);
    setConsultationFee(visit.consultation?.doctorId ? 50 : 0);
    setLabCharges((visit.labOrders?.length || 0) > 0 ? 100 : 0);
  }, []);

  const handleDirectPharmacy = useCallback((visit) => {
    fetchQueue();
    setActiveTab('queue');
    selectVisit(visit);
  }, [fetchQueue, selectVisit]);

  const handleAddMedication = useCallback(() => {
    setMedications((prev) => [
      ...prev,
      {
        recommended: '',
        alternativeGiven: '',
        quantity: '',
        amount: '',
        dosageSchedule: DEFAULT_DOSAGE_SCHEDULE,
      },
    ]);
  }, []);

  const handleRemoveMedication = useCallback((index) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMedChange = useCallback((index, field, value) => {
    setMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleGeneratePreview = useCallback(() => {
    for (const med of medications) {
      if (!med.quantity.trim()) {
        alert(`Please enter quantity for ${med.recommended || 'all medications'}`);
        return;
      }
      if (med.amount === '' || isNaN(Number(med.amount)) || Number(med.amount) < 0) {
        alert(`Please enter a valid amount (price) for ${med.recommended || 'all medications'}`);
        return;
      }
    }
    setShowPreview(true);
  }, [medications]);

  const handleFinalize = useCallback(async () => {
    try {
      setSubmitting(true);
      const payload = {
        consultationFee: Number(consultationFee),
        labCharges: Number(labCharges),
        dispensedMedications: medications.map((m) => ({
          recommended: m.recommended.trim(),
          alternativeGiven: m.alternativeGiven.trim(),
          quantity: m.quantity.trim(),
          amount: Number(m.amount),
          dosageSchedule: m.dosageSchedule,
        })),
      };
      await visitAPI.dispenseMedicine(selectedVisit._id, payload);
      alert('Visit completed and saved successfully!');
      setShowPreview(false);
      setSelectedVisit(null);
      setMedications([]);
      setConsultationFee(0);
      setLabCharges(0);
      fetchQueue();
    } catch (err) {
      console.error('[usePharmacyDispense] handleFinalize error:', err);
      alert('Failed to dispense medications.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedVisit, medications, consultationFee, labCharges, fetchQueue]);

  const totalBillAmount = useMemo(
    () =>
      (
        Number(consultationFee || 0) +
        Number(labCharges || 0) +
        medications.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
      ).toFixed(2),
    [consultationFee, labCharges, medications]
  );

  return {
    activeTab,
    setActiveTab,
    selectedPatient,
    setSelectedPatient,
    queue,
    selectedVisit,
    medications,
    consultationFee,
    setConsultationFee,
    labCharges,
    setLabCharges,
    submitting,
    showPreview,
    setShowPreview,
    hospitalInfo,
    labels,
    customFields,
    fetchQueue,
    handlePatientSelect,
    handleDirectPharmacy,
    selectVisit,
    handleAddMedication,
    handleRemoveMedication,
    handleMedChange,
    handleGeneratePreview,
    handleFinalize,
    totalBillAmount,
  };
};
