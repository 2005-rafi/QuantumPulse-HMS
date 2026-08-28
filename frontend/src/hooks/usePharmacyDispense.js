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
import { medicinePriceAPI } from '../services/medicinePriceAPI';
import { useToast } from '../context/ToastContext';

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

export const usePharmacyDispense = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const [activeTab, setActiveTab] = useState('queue');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [medications, setMedications] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [consultationFee, setConsultationFee] = useState(0);
  const [labCharges, setLabCharges] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState(DEFAULT_HOSPITAL_INFO);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [fieldVisibility, setFieldVisibility] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [directDispenseOpen, setDirectDispenseOpen] = useState(false);
  const [catalogMedicines, setCatalogMedicines] = useState([]);

  const fetchCatalogMedicines = useCallback(async (query = '') => {
    try {
      const res = await medicinePriceAPI.list({ search: query || undefined, status: 'ACTIVE' });
      const items = res.data?.data?.items || res.data?.items || [];
      setCatalogMedicines(items);
      return items;
    } catch (err) {
      console.error('[usePharmacyDispense] fetchCatalogMedicines error:', err);
      return [];
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await visitAPI.getQueue('WAITING_PHARMACY');
      setQueue(res.data?.data || []);
    } catch (err) {
      console.error('[usePharmacyDispense] fetchQueue error:', err);
      setQueue([]);
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
        setFieldVisibility(res.data.data.fieldVisibility || {});
        setCustomFields(res.data.data.customFields || []);
      }
    } catch (err) {
      console.error('[usePharmacyDispense] fetchSettings error:', err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchSettings();
    fetchCatalogMedicines();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchSettings, fetchCatalogMedicines]);

  const handlePatientSelect = useCallback((patient) => {
    setSelectedPatient(patient);
    setActiveTab('profile');
  }, []);

  const selectVisit = useCallback(async (visit) => {
    setSelectedVisit(visit);
    const initialMeds = (visit.prescribedMedications || []).map(mapPrescribedMedication);
    setMedications(initialMeds);
    setValidationErrors({});
    setConsultationFee(visit.consultation?.doctorId ? 50 : 0);
    setLabCharges((visit.labOrders?.length || 0) > 0 ? 100 : 0);

    // Auto-lookup prices for prescribed medications from catalog
    if (initialMeds.length > 0) {
      const updatedMeds = [...initialMeds];
      for (let i = 0; i < updatedMeds.length; i++) {
        const medName = updatedMeds[i].recommended;
        if (medName) {
          try {
            const priceRes = await medicinePriceAPI.getByName(medName);
            const priceData = priceRes.data?.data || priceRes.data;
            if (priceData && priceData.unitPrice) {
              const qty = Number(updatedMeds[i].quantity) || 10;
              if (!updatedMeds[i].quantity) updatedMeds[i].quantity = '10';
              updatedMeds[i].amount = String((priceData.unitPrice * qty) + (priceData.dispensingFee || 0));
            }
          } catch (e) {
            // silent fallback
          }
        }
      }
      setMedications(updatedMeds);
    }
  }, []);

  const handleDirectPharmacy = useCallback((visit) => {
    fetchQueue();
    setActiveTab('queue');
    selectVisit(visit);
  }, [fetchQueue, selectVisit]);

  const handleStartDirectDispenseForPatient = useCallback(async (patientId) => {
    try {
      const res = await visitAPI.create({ patientId, isDirectPharmacy: true });
      const createdVisit = res.data?.data || res.data;
      showSuccess('Direct Cart Created', 'Patient added to pharmacy queue.');
      setDirectDispenseOpen(false);
      await fetchQueue();
      setActiveTab('queue');
      selectVisit(createdVisit);
    } catch (err) {
      console.error('Failed to create direct pharmacy visit:', err);
      showError('Error', err.response?.data?.message || 'Failed to start direct dispensing session');
    }
  }, [fetchQueue, selectVisit, showSuccess, showError]);

  const handleAddMedication = useCallback((medData = null) => {
    setMedications((prev) => [
      ...prev,
      {
        recommended: medData?.medicineName || '',
        alternativeGiven: '',
        quantity: medData ? '1' : '',
        amount: medData ? String(medData.unitPrice + (medData.dispensingFee || 0)) : '',
        dosageSchedule: DEFAULT_DOSAGE_SCHEDULE,
      },
    ]);
  }, []);

  const handleRemoveMedication = useCallback((index) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleMedChange = useCallback((index, field, value) => {
    setMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    // Auto-calculate amount if medicine name or quantity changes
    if (field === 'recommended' || field === 'alternativeGiven' || field === 'quantity') {
      const targetMedName = field === 'alternativeGiven' && value ? value : (field === 'recommended' ? value : (medications[index]?.alternativeGiven || medications[index]?.recommended));
      if (targetMedName && targetMedName.length >= 3) {
        medicinePriceAPI.getByName(targetMedName).then((res) => {
          const priceData = res.data?.data || res.data;
          if (priceData && priceData.unitPrice) {
            setMedications((prev) => {
              const next = [...prev];
              if (!next[index]) return prev;
              const qty = Number(field === 'quantity' ? value : next[index].quantity) || 1;
              const totalAmount = (priceData.unitPrice * qty) + (priceData.dispensingFee || 0);
              next[index] = { ...next[index], amount: String(totalAmount) };
              return next;
            });
          }
        }).catch(() => {});
      }
    }

    // Dynamically clear validation error on input change
    setValidationErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const next = { ...prev };
      const rowErrors = { ...next[index] };
      
      if (field === 'quantity' && value.trim()) {
        delete rowErrors.quantity;
      }
      if (field === 'amount' && value !== '' && !isNaN(Number(value)) && Number(value) >= 0) {
        delete rowErrors.amount;
      }
      
      if (Object.keys(rowErrors).length === 0) {
        delete next[index];
      } else {
        next[index] = rowErrors;
      }
      return next;
    });
  }, [medications]);

  const handleGeneratePreview = useCallback(() => {
    const errors = {};
    let hasError = false;

    // Validate medication rows only if there are medication rows entered
    if (medications.length > 0) {
      medications.forEach((med, idx) => {
        const rowErrors = {};
        if (!med.quantity || !med.quantity.trim()) {
          rowErrors.quantity = 'Required';
          hasError = true;
        }
        if (med.amount === '' || isNaN(Number(med.amount)) || Number(med.amount) < 0) {
          rowErrors.amount = 'Invalid price';
          hasError = true;
        }
        if (Object.keys(rowErrors).length > 0) {
          errors[idx] = rowErrors;
        }
      });
    }

    if (hasError) {
      setValidationErrors(errors);
      showError(
        'Validation Error',
        'Please enter valid quantities and prices for the highlighted medications.'
      );
      return;
    }

    setValidationErrors({});
    setShowPreview(true);
  }, [medications, showError]);

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
      showSuccess('Dispensation Complete', 'Visit completed and billing recorded successfully.');
      setShowPreview(false);
      setSelectedVisit(null);
      setMedications([]);
      setValidationErrors({});
      setConsultationFee(0);
      setLabCharges(0);
      fetchQueue();
    } catch (err) {
      console.error('[usePharmacyDispense] handleFinalize error:', err);
      showError(
        'Dispensation Failed',
        err.response?.data?.message || 'Failed to complete dispense. Please check connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedVisit, medications, consultationFee, labCharges, fetchQueue, showSuccess, showError]);

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
    validationErrors,
    consultationFee,
    setConsultationFee,
    labCharges,
    setLabCharges,
    submitting,
    showPreview,
    setShowPreview,
    hospitalInfo,
    labels,
    fieldVisibility,
    customFields,
    totalBillAmount,
    fetchQueue,
    handlePatientSelect,
    selectVisit,
    handleDirectPharmacy,
    handleAddMedication,
    handleRemoveMedication,
    handleMedChange,
    handleGeneratePreview,
    handleFinalize,
    directDispenseOpen,
    setDirectDispenseOpen,
    catalogMedicines,
    fetchCatalogMedicines,
    handleStartDirectDispenseForPatient,
  };
};
