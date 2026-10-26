import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { billingAPI } from '../../../services/billingAPI';
import { adminAPI } from '../../../services/adminAPI';
import { Md3Select, Md3TextField, Md3Button } from '../../../components/md3/Md3FormComponents';
import ClinicalStationIdleDeck from '../../../components/md3/ClinicalStationIdleDeck';
import { PermissionGate } from '../../../components/shell/PermissionGate';
import BillingTemplate from '../BillingTemplate';
import { UnifiedBillPrintModal } from '../print';
import { useBillingTemplateSettings } from '../../../hooks/useBillingTemplateSettings';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { useToast } from '../../../context/ToastContext';
import { usePatientStatus } from '../../../context/PatientStatusContext';
import { timeSince } from '../../../utils/dateFormatting';
import { formatPatientName, getPatientInitials, formatPatientPhone } from '../../../utils/patientFormatters';
import ipdApi from '../../../services/ipdApi';
import './UnifiedBillingTerminal.css';

const CLINICAL_CATEGORIES_CONFIG = {
  BED_CHARGES: { label: 'Room Rent & Bed Stay Accommodation', icon: 'hotel', order: 1 },
  CONSULTATION: { label: 'Doctor Visits & Specialist Consultations', icon: 'stethoscope', order: 2 },
  NURSING: { label: 'Nursing & Critical Care Support', icon: 'medical_services', order: 3 },
  BED_SUPPORT: { label: 'Inpatient Bed & Duty Care', icon: 'health_and_safety', order: 4 },
  PROCEDURE: { label: 'Clinical Procedures & Interventions', icon: 'healing', order: 5 },
  SURGERY: { label: 'Operating Theatre & Surgical Suite', icon: 'medical_services', order: 6 },
  DIAGNOSTICS: { label: 'Diagnostic Laboratory & Imaging', icon: 'biotech', order: 7 },
  PHARMACY: { label: 'Pharmacy, Infusions & Consumables', icon: 'medication', order: 8 },
  REGISTRATION: { label: 'Hospital Registration & Admission Fee', icon: 'how_to_reg', order: 9 },
  MISCELLANEOUS: { label: 'General Hospital Consumables & Services', icon: 'receipt', order: 10 },
};

const ENCOUNTER_CATEGORIES = [
  { id: 'ALL', label: 'All', icon: 'group' },
  { id: 'OPD', label: 'OPD', icon: 'stethoscope' },
  { id: 'PHARMACY', label: 'Pharmacy', icon: 'medication' },
  { id: 'LAB', label: 'Lab Tests', icon: 'biotech' },
  { id: 'OT', label: 'OT Surgery', icon: 'medical_services' },
  { id: 'IPD', label: 'IPD Stay', icon: 'hotel' },
];

const PRESET_CHARGES = [
  { label: 'Select standard tariff preset (optional)', value: '', category: '', price: 0 },
  // Surgery & OT
  { label: 'Major OT Surgical Suite & Equipment (₹15,000)', value: 'Major OT Surgical Suite & Equipment', category: 'SURGERY', price: 15000 },
  { label: 'Minor OT Surgical Suite (₹5,000)', value: 'Minor OT Surgical Suite', category: 'SURGERY', price: 5000 },
  { label: 'Laparoscopic Surgery Suite & Tower (₹22,000)', value: 'Laparoscopic Surgery Suite & Tower', category: 'SURGERY', price: 22000 },
  { label: 'Surgical Consumables & Sterilization Pack (₹3,500)', value: 'Surgical Consumables & Sterilization Pack', category: 'SURGERY', price: 3500 },
  { label: 'General / Regional Anaesthesia & PAC (₹4,500)', value: 'General / Regional Anaesthesia & PAC Fee', category: 'SURGERY', price: 4500 },
  // Bed Stay & Wards
  { label: 'ICU Critical Care Day Stay (24h) (₹8,000)', value: 'ICU Critical Care Day Stay (24h)', category: 'BED_CHARGES', price: 8000 },
  { label: 'NICU Neonatal Intensive Care Stay (24h) (₹9,500)', value: 'NICU Neonatal Intensive Care Stay (24h)', category: 'BED_CHARGES', price: 9500 },
  { label: 'Private Deluxe AC Room (24h) (₹3,500)', value: 'Private Deluxe AC Room (24h)', category: 'BED_CHARGES', price: 3500 },
  { label: 'Semi-Private Room Day Stay (24h) (₹2,200)', value: 'Semi-Private Room Day Stay (24h)', category: 'BED_CHARGES', price: 2200 },
  { label: 'General Ward Day Stay (24h) (₹1,000)', value: 'General Ward Day Stay (24h)', category: 'BED_CHARGES', price: 1000 },
  // Nursing & Bed Support
  { label: 'Daily Inpatient Nursing Care (₹450)', value: 'Daily Inpatient Nursing Care & Vitals Monitoring', category: 'NURSING', price: 450 },
  { label: 'ICU Special Critical Nursing Monitoring (₹1,500)', value: 'ICU Special Critical Nursing Monitoring', category: 'NURSING', price: 1500 },
  { label: 'RMO Resident Medical Officer Daily Duty Round (₹500)', value: 'RMO Resident Medical Officer Daily Duty Round', category: 'BED_SUPPORT', price: 500 },
  // Procedures
  { label: 'Wound Dressing & Debridement (₹750)', value: 'Wound Dressing & Debridement', category: 'PROCEDURE', price: 750 },
  { label: 'Catheterization & Clinical Consumables (₹600)', value: 'Catheterization & Clinical Consumables', category: 'PROCEDURE', price: 600 },
  // Consultations & Diagnostics
  { label: 'Specialist Inpatient Physician Review (₹800)', value: 'Specialist Inpatient Physician Review', category: 'CONSULTATION', price: 800 },
  { label: 'Comprehensive Metabolic & CBC Panel (₹850)', value: 'Comprehensive Metabolic & CBC Panel', category: 'DIAGNOSTICS', price: 850 },
  { label: 'Renal & Liver Function Test Panel (₹1,200)', value: 'Renal & Liver Function Test Panel', category: 'DIAGNOSTICS', price: 1200 },
];

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI / QR', icon: 'qr_code_2' },
  { id: 'Cash', label: 'Cash', icon: 'payments' },
  { id: 'Card', label: 'Card (POS)', icon: 'credit_card' },
  { id: 'Insurance', label: 'Insurance / TPA', icon: 'health_and_safety' },
  { id: 'WaivedOff', label: 'Concession / Waiver', icon: 'loyalty' },
];

export const UnifiedBillingTerminal = ({ initialBill = null }) => {
  const { showSuccess, showError } = useToast();
  const { subscribeToStatusChanges, subscribeToLedgerUpdates } = usePatientStatus();

  // Mode & Data states
  const [queue, setQueue] = useState([]);
  const [serverCounts, setServerCounts] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [activeBill, setActiveBill] = useState(initialBill);
  const [ipdLedgerData, setIpdLedgerData] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileQueueDrawerOpen, setIsMobileQueueDrawerOpen] = useState(false);

  const [loadingBill, setLoadingBill] = useState(false);
  const [submittingCharge, setSubmittingCharge] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingFinalize, setSubmittingFinalize] = useState(false);
  const [submittingClearance, setSubmittingClearance] = useState(false);
  const [clearanceData, setClearanceData] = useState(null);

  const refreshActiveBill = async (billId, admId = null) => {
    if (!billId) return;
    try {
      const res = await billingAPI.getBillById(billId);
      const b = res.data?.data || res.data;
      setActiveBill(b);
      setPaymentAmount(b.outstandingAmount ? String(b.outstandingAmount) : '');
      const targetAdmId = admId || b.admissionId;
      if (targetAdmId) {
        const [lRes, cRes] = await Promise.all([
          ipdApi.getRunningLedger(targetAdmId).catch(() => null),
          ipdApi.getClearanceStatus(targetAdmId).catch(() => null),
        ]);
        if (lRes?.data?.data) setIpdLedgerData(lRes.data.data);
        if (cRes?.data?.data) setClearanceData(cRes.data.data);
      }
    } catch (_) {}
  };

  const [searchParams] = useSearchParams();
  const urlBillId = searchParams.get('billId');
  const urlAdmissionId = searchParams.get('admissionId');
  const urlPatientId = searchParams.get('patientId');

  // Handle incoming deep-link parameters from Omnisearch or external navigation
  useEffect(() => {
    let isCancelled = false;

    const loadParamTarget = async () => {
      if (urlBillId) {
        setLoadingBill(true);
        try {
          const res = await billingAPI.getBillById(urlBillId);
          const b = res.data?.data || res.data;
          if (!isCancelled && b) {
            setActiveBill(b);
            setPaymentAmount(b.outstandingAmount ? String(b.outstandingAmount) : '');
            if (b.admissionId) {
              const [lRes, cRes] = await Promise.all([
                ipdApi.getRunningLedger(b.admissionId).catch(() => null),
                ipdApi.getClearanceStatus(b.admissionId).catch(() => null),
              ]);
              if (!isCancelled && lRes?.data?.data) setIpdLedgerData(lRes.data.data);
              if (!isCancelled && cRes?.data?.data) setClearanceData(cRes.data.data);
            }
          }
        } catch (err) {
          console.warn('[UnifiedBillingTerminal] Could not load urlBillId:', err);
        } finally {
          if (!isCancelled) setLoadingBill(false);
        }
      } else if (urlAdmissionId) {
        setLoadingBill(true);
        try {
          const [res, ledgerRes, clearRes] = await Promise.all([
            billingAPI.getOrCreateForAdmission(urlAdmissionId, { issuingArea: 'BILLING' }),
            ipdApi.getRunningLedger(urlAdmissionId).catch(() => null),
            ipdApi.getClearanceStatus(urlAdmissionId).catch(() => null),
          ]);
          if (!isCancelled) {
            const b = res.data?.data || res.data;
            setActiveBill(b);
            setPaymentAmount(b?.outstandingAmount ? String(b.outstandingAmount) : '');
            setIpdLedgerData(ledgerRes?.data?.data || null);
            setClearanceData(clearRes?.data?.data || null);
          }
        } catch (err) {
          console.warn('[UnifiedBillingTerminal] Could not load urlAdmissionId:', err);
        } finally {
          if (!isCancelled) setLoadingBill(false);
        }
      } else if (urlPatientId) {
        try {
          const res = await billingAPI.listBills({ patientId: urlPatientId, limit: 1 });
          const items = res.data?.data?.items || res.data?.items || res.data?.data || [];
          if (!isCancelled && Array.isArray(items) && items.length > 0) {
            const b = items[0];
            setActiveBill(b);
            setPaymentAmount(b?.outstandingAmount ? String(b.outstandingAmount) : '');
          }
        } catch (_) {}
      }
    };

    if (urlBillId || urlAdmissionId || urlPatientId) {
      loadParamTarget();
    }

    return () => {
      isCancelled = true;
    };
  }, [urlBillId, urlAdmissionId, urlPatientId]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Supplemental Charge Capture form state & inline errors
  const [selectedPreset, setSelectedPreset] = useState('');
  const [chargeCategory, setChargeCategory] = useState('PROCEDURE');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeQty, setChargeQty] = useState(1);
  const [chargePrice, setChargePrice] = useState('');
  const [proofReference, setProofReference] = useState('');
  const [showSupplementalForm, setShowSupplementalForm] = useState(false);
  const [chargeErrors, setChargeErrors] = useState({
    description: '',
    price: '',
    proof: '',
  });

  // Cashier Payment form state & inline errors
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentErrors, setPaymentErrors] = useState({
    amount: '',
  });

  // Print Invoice state & Authoritative Settings
  const { templateConfig } = useBillingTemplateSettings();
  const [isPrinting, setIsPrinting] = useState(false);

  // Close print modal & mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isPrinting) setIsPrinting(false);
        if (isMobileQueueDrawerOpen) setIsMobileQueueDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrinting, isMobileQueueDrawerOpen]);

  // Prevent background scroll when mobile queue drawer is open
  useEffect(() => {
    if (isMobileQueueDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileQueueDrawerOpen]);

  // Fetch Live Unified Encounter Queue (OPD + IPD)
  const fetchQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await billingAPI.getEncountersQueue({
        category: categoryFilter,
        search: searchQuery,
      });
      const data = res.data?.data || res.data || {};
      const items = data.items || (Array.isArray(data) ? data : []);
      setQueue(items);
      if (data.categoryCounts) {
        setServerCounts(data.categoryCounts);
      }
    } catch (err) {
      // Fallback to legacy OPD queue if needed
      try {
        const fallbackRes = await api.get('/visits/queue/WAITING_BILLING');
        const items = fallbackRes.data?.data || fallbackRes.data || [];
        setQueue(Array.isArray(items) ? items : []);
      } catch (_) {}
    } finally {
      setLoadingQueue(false);
    }
  };

  // Real-Time Reactive Push Synchronization via SSE (Stock-Market / Bloomberg Style)
  useEffect(() => {
    fetchQueue();

    // Subscribe to SSE status and ledger mutations across hospital
    const unsubStatus = subscribeToStatusChanges ? subscribeToStatusChanges(() => fetchQueue()) : null;
    const unsubLedger = subscribeToLedgerUpdates ? subscribeToLedgerUpdates((payload) => {
      fetchQueue();
      if (activeBill?._id) {
        refreshActiveBill(activeBill._id, selectedVisit?.admissionId || activeBill.admissionId);
      }
    }) : null;

    // Safety fallback heartbeat (30s)
    const interval = setInterval(fetchQueue, 30000);

    return () => {
      if (unsubStatus) unsubStatus();
      if (unsubLedger) unsubLedger();
      clearInterval(interval);
    };
  }, [categoryFilter, searchQuery, subscribeToStatusChanges, subscribeToLedgerUpdates, activeBill?._id, selectedVisit?.admissionId]);

  // Select patient encounter from queue
  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setSelectedVisitId(visit._id);
    setIsMobileQueueDrawerOpen(false);
    setLoadingBill(true);
    try {
      let bill;
      if (visit.modality === 'IPD' || visit.admissionId || visit.admissionNumber) {
        const admissionId = visit.admissionId || visit._id;
        const [res, ledgerRes, clearRes] = await Promise.all([
          billingAPI.getOrCreateForAdmission(admissionId, { issuingArea: 'BILLING' }),
          ipdApi.getRunningLedger(admissionId).catch(() => null),
          ipdApi.getClearanceStatus(admissionId).catch(() => null),
        ]);
        bill = res.data?.data || res.data;
        setIpdLedgerData(ledgerRes?.data?.data || null);
        setClearanceData(clearRes?.data?.data || null);
      } else {
        setIpdLedgerData(null);
        setClearanceData(null);
        const res = await billingAPI.getOrCreateForVisit(visit.visitId || visit._id, { issuingArea: 'BILLING' });
        bill = res.data?.data || res.data;
      }
      setActiveBill(bill);
      setPaymentAmount(bill.outstandingAmount ? String(bill.outstandingAmount) : '');
      setChargeErrors({ description: '', price: '', proof: '' });
      setPaymentErrors({ amount: '' });
    } catch (err) {
      showError('Error', 'Failed to load or initialize bill for patient encounter');
    } finally {
      setLoadingBill(false);
    }
  };

  const handlePresetSelect = (presetVal) => {
    setSelectedPreset(presetVal);
    const found = PRESET_CHARGES.find((p) => p.value === presetVal);
    if (found && found.value) {
      setChargeDescription(found.value);
      setChargeCategory(found.category);
      setChargePrice(String(found.price));
      setChargeErrors((prev) => ({ ...prev, description: '', price: '' }));
    }
  };

  // Add Supplemental Charge with inline validation
  const handleAddSupplementalCharge = async (e) => {
    e.preventDefault();
    if (!activeBill?._id) return;

    const errors = {};
    if (!chargeDescription.trim()) {
      errors.description = 'Please enter a charge description';
    }
    const numPrice = Number(chargePrice);
    if (chargePrice === '' || isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Please enter a valid price greater than zero';
    }
    if (!proofReference.trim()) {
      errors.proof = 'Clinical justification / order proof reference is required (e.g. OT Log #, Nurse Slip, Physician Memo)';
    }

    if (Object.keys(errors).length > 0) {
      setChargeErrors(errors);
      return;
    }
    setChargeErrors({ description: '', price: '', proof: '' });

    setSubmittingCharge(true);
    try {
      const qty = Math.max(1, Number(chargeQty) || 1);
      const res = await billingAPI.addLineItem(activeBill._id, {
        category: chargeCategory,
        description: chargeDescription.trim(),
        quantity: qty,
        price: numPrice,
        proofReference: proofReference.trim(),
        snapshotRulePath: selectedPreset ? `Tariff: ${selectedPreset}` : 'Supplemental Charge Capture',
      });
      const updated = res.data?.data || res.data;
      setActiveBill(updated);
      setPaymentAmount(updated.outstandingAmount ? String(updated.outstandingAmount) : '');
      showSuccess('Charge Attached', `Added ${chargeDescription} (${CURRENCY_SYMBOL}${numPrice * qty}) with audit proof.`);

      // Reset form
      setSelectedPreset('');
      setChargeDescription('');
      setChargePrice('');
      setChargeQty(1);
      setProofReference('');
      setShowSupplementalForm(false);
    } catch (err) {
      showError('Failed to add charge', err.response?.data?.message || err.message);
    } finally {
      setSubmittingCharge(false);
    }
  };

  // Record Cashier Payment with inline validation
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!activeBill?._id) return;

    const amt = Number(paymentAmount);
    if (paymentAmount === '' || isNaN(amt) || amt <= 0) {
      setPaymentErrors({ amount: 'Please enter a valid payment amount' });
      return;
    }
    if (amt > (activeBill.outstandingAmount || 0)) {
      setPaymentErrors({ amount: `Amount cannot exceed outstanding balance of ${CURRENCY_SYMBOL}${activeBill.outstandingAmount}` });
      return;
    }
    setPaymentErrors({ amount: '' });

    setSubmittingPayment(true);
    try {
      const res = await billingAPI.recordPayment(activeBill._id, {
        amount: amt,
        method: paymentMethod,
        reference: paymentRef.trim(),
      });
      const updated = res.data?.data || res.data;
      setActiveBill(updated);
      setPaymentAmount(updated.outstandingAmount ? String(updated.outstandingAmount) : '');
      setPaymentRef('');
      showSuccess('Payment Settled', `Received ${CURRENCY_SYMBOL}${amt} via ${paymentMethod}`);
      if (activeBill.admissionId) {
        const [lRes, cRes] = await Promise.all([
          ipdApi.getRunningLedger(activeBill.admissionId).catch(() => null),
          ipdApi.getClearanceStatus(activeBill.admissionId).catch(() => null),
        ]);
        if (lRes?.data?.data) setIpdLedgerData(lRes.data.data);
        if (cRes?.data?.data) setClearanceData(cRes.data.data);
      }
      fetchQueue();
    } catch (err) {
      showError('Payment Failed', err.response?.data?.message || err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Grant Billing Discharge Clearance (for settled IPD admissions)
  const handleGrantBillingClearance = async () => {
    const admId = activeBill?.admissionId || selectedVisit?.admissionId;
    if (!admId) return;
    setSubmittingClearance(true);
    try {
      const res = await ipdApi.markClearance(admId, 'BILLING', {
        notes: `Cleared at Cashier Desk (Bill #${activeBill.billNumber})`,
      });
      const cData = res.data?.data || res.data;
      setClearanceData(cData);
      showSuccess('Billing Clearance Granted', 'Patient is now authorized for hospital exit Gate Pass.');
      await refreshActiveBill(activeBill._id, admId);
      fetchQueue();
    } catch (err) {
      showError('Clearance Failed', err.response?.data?.message || err.message);
    } finally {
      setSubmittingClearance(false);
    }
  };

  // Finalize Bill & Conclude Visit
  const handleFinalizeBill = async () => {
    if (!activeBill?._id) return;
    setSubmittingFinalize(true);
    try {
      const res = await billingAPI.finalizeBill(activeBill._id);
      const updated = res.data?.data || res.data;
      setActiveBill(updated);
      showSuccess('Invoice Finalized & Visit Completed', 'The bill is locked and patient encounter is officially marked as COMPLETED.');
      fetchQueue();
    } catch (err) {
      showError('Finalization Failed', err.response?.data?.message || err.message);
    } finally {
      setSubmittingFinalize(false);
    }
  };

  const getEncounterTag = (visit) => {
    if (visit.tag) return visit.tag;
    if (visit.modality === 'IPD' || visit.admissionId || visit.visitType === 'IPD' || visit.visitType === 'IPD_MEDICAL') {
      return { id: 'IPD', label: visit.isDischargePending ? 'Discharge Clearance' : 'IPD Stay', icon: 'hotel' };
    }
    if (visit.metadata?.source === 'OT' || visit.visitType === 'IPD_SURGICAL' || visit.surgicalDetails) {
      return { id: 'OT', label: 'Day Surgery', icon: 'medical_services' };
    }
    if (visit.pharmacyWork?.status === 'DISPENSED' || visit.metadata?.source === 'PHARMACY') {
      return { id: 'PHARMACY', label: 'Pharmacy', icon: 'medication' };
    }
    if (visit.labOrders && visit.labOrders.length > 0 && visit.disposition?.status === 'ROUTED_TO_BILLING') {
      return { id: 'LAB', label: 'Lab Tests', icon: 'biotech' };
    }
    if (visit.visitType === 'EMERGENCY') {
      return { id: 'EMERGENCY', label: 'Emergency', icon: 'emergency' };
    }
    return { id: 'OPD', label: 'OPD Consult', icon: 'stethoscope' };
  };

  const filteredQueue = useMemo(() => {
    return queue.filter((v) => {
      const tag = getEncounterTag(v);
      if (categoryFilter !== 'ALL' && tag.id !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${v.patientId?.firstName || ''} ${v.patientId?.lastName || ''}`.toLowerCase();
      const mrn = (v.patientId?.mrn || '').toLowerCase();
      const token = (v.tokenString || '').toLowerCase();
      const bed = (v.bed?.bedLabel || '').toLowerCase();
      return name.includes(q) || mrn.includes(q) || token.includes(q) || bed.includes(q);
    });
  }, [queue, categoryFilter, searchQuery]);

  const rawPatient = activeBill?.patientId || selectedVisit?.patientId;
  const patient = typeof rawPatient === 'object' && rawPatient !== null ? rawPatient : (selectedVisit?.patientId || {});
  const patientFullName = formatPatientName(patient) ||
    activeBill?.patientName ||
    (patient.mrn ? `Patient (${patient.mrn})` : 'Patient');
  const patientInitials = getPatientInitials(patient) || (patientFullName.charAt(0) || 'P').toUpperCase();

  const isFinalized = activeBill?.status === 'FINALIZED';
  const outstanding = activeBill?.outstandingAmount || 0;
  const lineItems = activeBill?.lineItems || [];
  const payments = activeBill?.payments || [];

  const groupedLineItems = useMemo(() => {
    const groups = {};
    lineItems.forEach((item) => {
      const cat = item.category || 'MISCELLANEOUS';
      if (!groups[cat]) {
        const cfg = CLINICAL_CATEGORIES_CONFIG[cat] || {
          label: cat.replace(/_/g, ' '),
          icon: 'receipt',
          order: 99,
        };
        groups[cat] = {
          category: cat,
          label: cfg.label,
          icon: cfg.icon,
          order: cfg.order,
          subtotal: 0,
          items: [],
        };
      }
      const total = item.lineTotal || (item.snapshotPrice * (item.quantity || 1)) || 0;
      groups[cat].subtotal += total;
      groups[cat].items.push(item);
    });

    return Object.values(groups).sort((a, b) => a.order - b.order);
  }, [lineItems]);

  const categoryCounts = useMemo(() => {
    if (serverCounts) return serverCounts;
    const c = {
      ALL: queue.length,
      OPD: 0,
      PHARMACY: 0,
      LAB: 0,
      OT: 0,
      IPD: 0,
    };
    queue.forEach((v) => {
      const tag = getEncounterTag(v);
      if (c[tag.id] !== undefined) c[tag.id]++;
    });
    return c;
  }, [queue, serverCounts]);

  const renderQueueContent = () => (
    <>
      <div className="unified-terminal__sidebar-header">
        <div className="unified-terminal__sidebar-header-left">
          <button
            type="button"
            className="unified-terminal__collapse-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Patient Queue Sidebar"
            aria-label="Collapse Queue"
          >
            <span className="material-symbols-rounded">left_panel_close</span>
          </button>
          <span className="unified-terminal__sidebar-count" title={`${filteredQueue.length} Patients in Queue`}>
            {filteredQueue.length}
          </span>
        </div>

        <div className="unified-terminal__sidebar-header-actions">
          <button
            type="button"
            className={`unified-terminal__icon-btn ${loadingQueue ? 'is-loading' : ''}`}
            onClick={fetchQueue}
            disabled={loadingQueue}
            title="Refresh Billing Queue"
            aria-label="Refresh Billing Queue"
          >
            <span className={`material-symbols-rounded ${loadingQueue ? 'unified-terminal__spin' : ''}`}>
              sync
            </span>
          </button>

          <button
            type="button"
            className="unified-terminal__mobile-close-btn"
            onClick={() => setIsMobileQueueDrawerOpen(false)}
            title="Close Queue Drawer"
            aria-label="Close Queue Drawer"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>

      {/* 2x3 Structured Category Filter Matrix */}
      <div className="billing-filter-matrix" role="tablist" aria-label="Billing Queue Category Filters">
        {ENCOUNTER_CATEGORIES.map((item) => {
          const isSelected = categoryFilter === item.id;
          const count = categoryCounts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`billing-matrix-tile ${isSelected ? 'billing-matrix-tile--active' : ''}`}
              onClick={() => setCategoryFilter(item.id)}
              title={`Filter by ${item.label} (${count})`}
            >
              <div className="billing-matrix-tile__top">
                <span className="material-symbols-rounded billing-matrix-tile__icon">{item.icon}</span>
                <span className="billing-matrix-tile__count">{count}</span>
              </div>
              <span className="billing-matrix-tile__label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="unified-terminal__sidebar-search">
        <Md3TextField
          label="Quick Search (Name, MRN, Token)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patient..."
        />
      </div>

      {/* Queue Cards */}
      <div className="unified-terminal__card-list">
        {filteredQueue.length === 0 ? (
          <div className="unified-terminal__queue-empty">
            <span className="material-symbols-rounded unified-terminal__queue-empty-icon">inbox</span>
            <p className="unified-terminal__queue-empty-text">No patients waiting in queue</p>
          </div>
        ) : (
          filteredQueue.map((visit) => {
            const p = visit.patientId || {};
            const tag = getEncounterTag(visit);
            const visitName = [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.mrn || visit.tokenString}`;
            const isSelected = selectedVisitId === visit._id || (activeBill?.visitId && (String(activeBill.visitId) === String(visit._id) || String(activeBill.visitId?._id) === String(visit._id)));

            return (
              <div
                key={visit._id}
                role="button"
                tabIndex={0}
                className={`unified-terminal__queue-card ${isSelected ? 'unified-terminal__queue-card--active' : ''}`}
                onClick={() => handleSelectVisit(visit)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectVisit(visit)}
              >
                <div className="unified-terminal__card-top">
                  <span className="unified-terminal__card-token">{visit.tokenString || 'Token'}</span>
                  <span className="unified-terminal__card-tag">
                    <span className="material-symbols-rounded unified-terminal__card-tag-icon">{tag.icon}</span>
                    <span>{tag.label}</span>
                  </span>
                </div>

                <div>
                  <h4 className="unified-terminal__patient-name">{visitName}</h4>
                  <div className="unified-terminal__patient-meta">
                    <span><strong>MRN:</strong> {p.mrn || 'N/A'}</span>
                    <span>{p.gender || ''}{p.age ? `, ${p.age}y` : ''}</span>
                    {visit.bed ? (
                      <span><strong>Bed:</strong> {visit.bed.bedLabel} ({visit.bed.wardClass})</span>
                    ) : (
                      <span><strong>Dept:</strong> {visit.departmentId?.name || 'General'}</span>
                    )}
                  </div>
                </div>

                <div className="unified-terminal__card-footer">
                  <span className="unified-terminal__card-time">
                    <span className="material-symbols-rounded unified-terminal__card-time-icon">schedule</span>
                    {timeSince(visit.updatedAt || visit.createdAt)}
                  </span>
                  {visit.financialSummary?.outstandingDue > 0 ? (
                    <span className="unified-terminal__queue-due">
                      Due: {CURRENCY_SYMBOL}{visit.financialSummary.outstandingDue.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="unified-terminal__queue-action">
                      {isSelected ? 'Desk Active' : 'Tap to Settle'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="unified-terminal">
      {/* ─── Mobile/Tablet Dedicated Patient Queue Drawer Portal ─── */}
      {isMobileQueueDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="billing-queue-drawer-portal" role="dialog" aria-modal="true" aria-label="Waiting Patients Queue Drawer">
            {/* Backdrop Scrim */}
            <div
              className="billing-queue-drawer-scrim"
              onClick={() => setIsMobileQueueDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Surface */}
            <div className="billing-queue-drawer-surface">
              {renderQueueContent()}
            </div>
          </div>,
          document.body
        )}

      {/* ─── Mobile/Tablet Sticky Toolbar (Muscle Memory Queue Launcher) ─── */}
      <div className="billing-mobile-toolbar">
        <button
          type="button"
          className="billing-mobile-drawer-btn"
          onClick={() => setIsMobileQueueDrawerOpen(true)}
          aria-label="Open Waiting Patients Queue Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Waiting Encounters</span>
          <span className="billing-mobile-count-badge">{filteredQueue.length}</span>
        </button>

        {activeBill && (
          <div className="billing-mobile-patient-preview">
            <span className="billing-mobile-token-pill" title={patientFullName}>
              {patientFullName}
            </span>
            <button
              type="button"
              className="billing-mobile-back-btn"
              onClick={() => {
                setActiveBill(null);
                setSelectedVisit(null);
                setSelectedVisitId(null);
              }}
              title="Deselect patient and return to queue"
              aria-label="Back to Queue"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        )}
      </div>



      {/* ─── MASTER-DETAIL 2-PANE WORKSPACE ─── */}
      <div className={`unified-terminal__layout ${activeBill ? 'has-active-bill' : ''} ${isSidebarCollapsed ? 'unified-terminal__layout--rail' : ''}`}>
        {/* ─── LEFT MASTER: COLLAPSIBLE / RAIL PATIENT QUEUE SIDEBAR (DESKTOP) ─── */}
        {isSidebarCollapsed ? (
          <aside className="unified-terminal__rail" aria-label="Collapsed Billing Queue Rail">
            <div className="unified-terminal__rail-header">
              <button
                type="button"
                className="unified-terminal__rail-toggle-btn"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Patient Queue Sidebar"
                aria-label="Expand Queue"
              >
                <span className="material-symbols-rounded">right_panel_open</span>
              </button>
              <span className="unified-terminal__rail-count-badge" title={`${filteredQueue.length} Waiting Encounters`}>
                {filteredQueue.length}
              </span>
            </div>

            <div className="unified-terminal__rail-body">
              {filteredQueue.map((visit) => {
                const p = visit.patientId || {};
                const firstName = p.firstName || p.name?.split(' ')[0] || 'Patient';
                const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
                const tokenDisplay = visit.tokenString || (visit.visitNumber ? visit.visitNumber.slice(-4) : '—');
                const isSelected = selectedVisitId === visit._id || (activeBill?.visitId && (String(activeBill.visitId) === String(visit._id) || String(activeBill.visitId?._id) === String(visit._id)));

                return (
                  <div
                    key={visit._id}
                    role="button"
                    tabIndex={0}
                    className={`unified-terminal__rail-item ${isSelected ? 'unified-terminal__rail-item--selected' : ''}`}
                    onClick={() => handleSelectVisit(visit)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectVisit(visit)}
                    title={`${p.firstName || ''} ${p.lastName || ''} (${tokenDisplay})`}
                  >
                    <div className="unified-terminal__rail-avatar">{initials}</div>
                    <span className="unified-terminal__rail-token">{tokenDisplay}</span>
                    <span className="unified-terminal__rail-name">{firstName}</span>
                  </div>
                );
              })}
              {filteredQueue.length === 0 && (
                <div className="unified-terminal__rail-empty">
                  <span className="material-symbols-rounded unified-terminal__rail-empty-icon">inbox</span>
                </div>
              )}
            </div>
          </aside>
        ) : (
          <aside
            className="unified-terminal__sidebar"
            aria-label="Live Patient Billing Queue"
          >
            {renderQueueContent()}
          </aside>
        )}

        {/* ─── RIGHT DETAIL: SPACIOUS CASHIER DESK WORKSPACE ─── */}
        <section className="unified-terminal__main" aria-label="Settlement Desk Workspace">
          {!activeBill ? (
            /* ─── IDLE CLINICAL STATION DECK ─── */
            <div className="unified-terminal__idle-wrap">
              <ClinicalStationIdleDeck
                preset="BILLING"
                title="Cashier &amp; Settlement Desk"
                description="Select a waiting patient from the queue to process charges, collect payments, and finalize bills."
                icon="point_of_sale"
              >
                {/* Live Queue Overview Pills */}
                <div className="unified-terminal__idle-stats">
                  <div className="unified-terminal__idle-stat-card">
                    <span className="unified-terminal__idle-stat-count">{queue.length}</span>
                    <span className="unified-terminal__idle-stat-label">Total In Queue</span>
                  </div>
                  <div className="unified-terminal__idle-stat-card">
                    <span className="unified-terminal__idle-stat-count">
                      {queue.filter((v) => getEncounterTag(v).id === 'OPD').length}
                    </span>
                    <span className="unified-terminal__idle-stat-label">OPD Consults</span>
                  </div>
                  <div className="unified-terminal__idle-stat-card">
                    <span className="unified-terminal__idle-stat-count">
                      {queue.filter((v) => getEncounterTag(v).id === 'PHARMACY').length}
                    </span>
                    <span className="unified-terminal__idle-stat-label">Pharmacy Dispenses</span>
                  </div>
                  <div className="unified-terminal__idle-stat-card">
                    <span className="unified-terminal__idle-stat-count">
                      {queue.filter((v) => ['OT', 'IPD'].includes(getEncounterTag(v).id)).length}
                    </span>
                    <span className="unified-terminal__idle-stat-label">OT &amp; Inpatient</span>
                  </div>
                </div>

                {filteredQueue.length > 0 && (
                  <div className="unified-terminal__idle-btn-wrap">
                    <Md3Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSelectVisit(filteredQueue[0])}
                    >
                      <span className="material-symbols-rounded">start</span>
                      <span>Settle First Patient ({filteredQueue[0].tokenString || 'In Queue'})</span>
                    </Md3Button>
                  </div>
                )}
              </ClinicalStationIdleDeck>
            </div>
          ) : (
            /* ─── ACTIVE PATIENT SETTLEMENT DESK ─── */
            <>
              {/* Master Demographic & Financial Banner */}
              <div className="unified-terminal__banner">
                <div className="unified-terminal__banner-patient">
                  <div className="unified-terminal__banner-avatar">
                    {patientInitials}
                  </div>
                  <div className="unified-terminal__banner-details">
                    <h3>{patientFullName}</h3>
                    <div className="unified-terminal__banner-sub">
                      <span><strong>MRN:</strong> {patient.mrn || 'N/A'}</span>
                      <span><strong>Bill #:</strong> {activeBill.billNumber}</span>
                      <span><strong>Type:</strong> {activeBill.visitType || selectedVisit?.visitType || 'OPD'}</span>
                      {(selectedVisit?.bed || ipdLedgerData?.bedChargesData?.activeBedLabel) && (
                        <span>
                          <strong>Bed:</strong> {ipdLedgerData?.bedChargesData?.activeBedLabel || selectedVisit?.bed?.bedLabel} ({ipdLedgerData?.bedChargesData?.activeWardClass || selectedVisit?.bed?.wardClass || 'Standard'})
                        </span>
                      )}
                      <span><strong>Phone:</strong> {formatPatientPhone(patient.phoneNumber || patient.phone)}</span>
                      {patient.gender && <span><strong>Gender:</strong> {patient.gender}{patient.age ? `, ${patient.age}y` : ''}</span>}
                    </div>
                  </div>
                </div>

                <div className="unified-terminal__banner-financials">
                  <div className="unified-terminal__fin-pill">
                    <span className="unified-terminal__fin-label">Total Charges</span>
                    <span className="unified-terminal__fin-val">{CURRENCY_SYMBOL}{activeBill.billedAmount || 0}</span>
                  </div>

                  {(activeBill.advanceCollected > 0 || activeBill.visitType === 'IPD' || ipdLedgerData?.financialSummary?.totalAdvanceDeposited > 0) && (
                    <div className="unified-terminal__fin-pill">
                      <span className="unified-terminal__fin-label">Advance Deposit</span>
                      <span className="unified-terminal__fin-val unified-terminal__fin-val--advance">
                        {CURRENCY_SYMBOL}{activeBill.advanceCollected || ipdLedgerData?.financialSummary?.totalAdvanceDeposited || 0}
                      </span>
                    </div>
                  )}

                  <div className="unified-terminal__fin-pill">
                    <span className="unified-terminal__fin-label">Collected</span>
                    <span className="unified-terminal__fin-val unified-terminal__fin-val--paid">{CURRENCY_SYMBOL}{activeBill.collectedAmount || 0}</span>
                  </div>

                  <div className="unified-terminal__fin-pill">
                    <span className="unified-terminal__fin-label">Outstanding Balance</span>
                    <span className="unified-terminal__fin-val unified-terminal__fin-val--due">
                      {CURRENCY_SYMBOL}{outstanding}
                    </span>
                  </div>

                  <div
                    className={`unified-terminal__status-pill ${
                      isFinalized ? 'unified-terminal__status-pill--finalized' : 'unified-terminal__status-pill--open'
                    }`}
                  >
                    {activeBill.status}
                  </div>

                  <div className="unified-terminal__banner-actions">
                    <Md3Button
                      type="button"
                      variant="tonal"
                      onClick={() => setIsPrinting(true)}
                      title="Preview & Print Official Tax Invoice"
                    >
                      <span className="material-symbols-rounded">print</span>
                      <span>Print Invoice</span>
                    </Md3Button>

                    <Md3Button
                      type="button"
                      variant="outlined"
                      onClick={() => {
                        setActiveBill(null);
                        setSelectedVisit(null);
                        setSelectedVisitId(null);
                        setIpdLedgerData(null);
                      }}
                    >
                      <span className="material-symbols-rounded">arrow_back</span>
                      <span>Back to Queue</span>
                    </Md3Button>
                  </div>
                </div>
              </div>

              {/* Inpatient Stay Duration & Tariff Accommodation Intelligence Card */}
              {(activeBill.visitType === 'IPD' || selectedVisit?.modality === 'IPD' || ipdLedgerData) && (
                <div className="unified-terminal__stay-card">
                  <div className="unified-terminal__stay-header">
                    <div className="unified-terminal__stay-title-wrap">
                      <span className="material-symbols-rounded unified-terminal__stay-icon">hotel_class</span>
                      <div>
                        <h4 className="unified-terminal__stay-title">Inpatient Stay &amp; Accommodation Tariff Breakdown</h4>
                        <span className="unified-terminal__stay-subtitle">
                          Authoritative room rent calculation adhering to hospital day-tier tariffs
                        </span>
                      </div>
                    </div>
                    <div className="unified-terminal__stay-badge">
                      <span className="material-symbols-rounded">bed</span>
                      <span>
                        {ipdLedgerData?.bedChargesData?.activeBedLabel || selectedVisit?.bed?.bedLabel || 'Inpatient Bed'} ({ipdLedgerData?.bedChargesData?.activeWardClass || selectedVisit?.bed?.wardClass || 'Standard'})
                      </span>
                    </div>
                  </div>

                  <div className="unified-terminal__stay-grid">
                    <div className="unified-terminal__stay-metric">
                      <span className="unified-terminal__stay-metric-label">Admission Stay Period</span>
                      <span className="unified-terminal__stay-metric-val">
                        {new Date(ipdLedgerData?.admission?.admissionDate || selectedVisit?.registeredAt || activeBill.serviceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' → '}
                        {selectedVisit?.isDischargePending ? 'Discharge Pending' : 'Present (Active Stay)'}
                      </span>
                    </div>

                    <div className="unified-terminal__stay-metric">
                      <span className="unified-terminal__stay-metric-label">Duration of Stay</span>
                      <span className="unified-terminal__stay-metric-val unified-terminal__stay-metric-val--highlight">
                        ⏱️ {ipdLedgerData?.bedChargesData?.stayDurationFormatted || `${lineItems.find((i) => i.category === 'BED_CHARGES')?.quantity || 1} Days`}
                        {ipdLedgerData?.bedChargesData?.totalStayHours ? ` (${ipdLedgerData.bedChargesData.totalStayHours} hrs)` : ''}
                      </span>
                    </div>

                    <div className="unified-terminal__stay-metric">
                      <span className="unified-terminal__stay-metric-label">Daily Tariff Rate</span>
                      <span className="unified-terminal__stay-metric-val">
                        {CURRENCY_SYMBOL}{ipdLedgerData?.bedChargesData?.dailyRate || lineItems.find((i) => i.category === 'BED_CHARGES')?.snapshotPrice || 0} / day
                      </span>
                    </div>

                    <div className="unified-terminal__stay-metric">
                      <span className="unified-terminal__stay-metric-label">Accrued Bed Stay Total</span>
                      <span className="unified-terminal__stay-metric-val unified-terminal__stay-metric-val--amount">
                        {CURRENCY_SYMBOL}{ipdLedgerData?.bedChargesData?.totalBedStayAmount || lineItems.filter((i) => i.category === 'BED_CHARGES').reduce((s, i) => s + (i.lineTotal || 0), 0)}
                      </span>
                    </div>
                  </div>

                  {ipdLedgerData?.bedChargesData?.segments && ipdLedgerData.bedChargesData.segments.length > 1 && (
                    <div className="unified-terminal__segments-history">
                      <span className="unified-terminal__segments-label">Ward / Bed Transfer History:</span>
                      {ipdLedgerData.bedChargesData.segments.map((seg, sIdx) => (
                        <span key={sIdx} className="unified-terminal__segment-pill">
                          {seg.bedLabel} ({seg.wardClass}) • {seg.fullDays}d {seg.billableRemainingHours}h • {CURRENCY_SYMBOL}{seg.segmentAmount}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2-Column Split Layout */}
              <div className="unified-terminal__workspace">
                {/* ─── LEFT COLUMN: ITEMIZED LEDGER & SUPPLEMENTAL CHARGES ─── */}
                <div className="unified-terminal__col">
                  {/* Itemized Accrued Ledger */}
                  <div className="unified-terminal__card">
                    <div className="unified-terminal__card-header">
                      <h3 className="unified-terminal__card-title">
                        <span className="material-symbols-rounded">receipt_long</span>
                        Authoritative Accrued Ledger ({lineItems.length} items)
                      </h3>

                      {!isFinalized && (
                        <Md3Button
                          type="button"
                          variant={showSupplementalForm ? 'tonal' : 'outlined'}
                          onClick={() => setShowSupplementalForm(!showSupplementalForm)}
                        >
                          <span className="material-symbols-rounded">
                            {showSupplementalForm ? 'close' : 'add_circle'}
                          </span>
                          <span>{showSupplementalForm ? 'Close Form' : 'Add Supplemental Charge'}</span>
                        </Md3Button>
                      )}
                    </div>

                    {/* Supplemental Charge Accordion Form */}
                    {showSupplementalForm && !isFinalized && (
                      <div className="unified-terminal__charge-preset-card">
                        <h4 className="unified-terminal__charge-preset-title">
                          Attach Supplemental Clinical / OT / Procedure Charge
                        </h4>

                        <form onSubmit={handleAddSupplementalCharge} className="unified-terminal__charge-form">
                          <div className="unified-terminal__form-row-2">
                            <Md3Select
                              label="Standard Tariff Catalog"
                              value={selectedPreset}
                              onChange={(e) => handlePresetSelect(e.target.value)}
                              options={PRESET_CHARGES}
                            />

                            <Md3Select
                              label="Charge Category *"
                              value={chargeCategory}
                              onChange={(e) => setChargeCategory(e.target.value)}
                              options={[
                                { value: 'PROCEDURE', label: 'Clinical Procedure & Intervention' },
                                { value: 'SURGERY', label: 'Surgery & OT Suite' },
                                { value: 'BED_CHARGES', label: 'Bed Stay Accommodation' },
                                { value: 'NURSING', label: 'Nursing & Critical Care Support' },
                                { value: 'CONSULTATION', label: 'Doctor / Specialist Consultation' },
                                { value: 'DIAGNOSTICS', label: 'Diagnostic / Laboratory' },
                                { value: 'MISCELLANEOUS', label: 'Miscellaneous / Consumable' },
                              ]}
                            />
                          </div>

                          <div className="unified-terminal__form-row-3">
                            <Md3TextField
                              label="Charge Description *"
                              value={chargeDescription}
                              error={chargeErrors.description}
                              onChange={(e) => {
                                setChargeDescription(e.target.value);
                                if (chargeErrors.description) setChargeErrors((prev) => ({ ...prev, description: '' }));
                              }}
                              placeholder="e.g. Minor Debridement, OT Consumables"
                            />

                            <Md3TextField
                              label="Quantity *"
                              type="number"
                              min="1"
                              value={chargeQty}
                              onChange={(e) => setChargeQty(Math.max(1, parseInt(e.target.value) || 1))}
                            />

                            <Md3TextField
                              label={`Unit Price (${CURRENCY_SYMBOL}) *`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={chargePrice}
                              error={chargeErrors.price}
                              onChange={(e) => {
                                setChargePrice(e.target.value);
                                if (chargeErrors.price) setChargeErrors((prev) => ({ ...prev, price: '' }));
                              }}
                              placeholder="0.00"
                            />
                          </div>

                          <Md3TextField
                            label="Clinical Justification / Order Proof Reference *"
                            value={proofReference}
                            error={chargeErrors.proof}
                            onChange={(e) => {
                              setProofReference(e.target.value);
                              if (chargeErrors.proof) setChargeErrors((prev) => ({ ...prev, proof: '' }));
                            }}
                            placeholder="e.g. OT-LOG-2026-441 / Surgeon Dr. Rao Rx / ER Slip #88"
                          />

                          <div className="unified-terminal__charge-form-actions">
                            <PermissionGate permissions={['BILL_GENERATE', 'BILLING_CAPTURE']}>
                              <Md3Button
                                type="submit"
                                variant="primary"
                                disabled={submittingCharge}
                              >
                                <span className="material-symbols-rounded">post_add</span>
                                <span>{submittingCharge ? 'Attaching...' : 'Attach Charge to Bill'}</span>
                              </Md3Button>
                            </PermissionGate>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Categorized Authoritative Ledger Items Table */}
                    <div className="unified-terminal__table-wrap">
                      <table className="unified-terminal__table">
                        <thead>
                          <tr>
                            <th className="billing-col--category">Category</th>
                            <th className="billing-col--desc">Description &amp; Proof</th>
                            <th className="billing-col--qty">Qty</th>
                            <th className="billing-col--price">Unit Price</th>
                            <th className="billing-col--total">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="unified-terminal__empty-cell">
                                No charges accrued yet on this account.
                              </td>
                            </tr>
                          ) : (
                            groupedLineItems.map((group) => (
                              <React.Fragment key={`group-${group.category}`}>
                                <tr className="unified-terminal__category-group-header">
                                  <td colSpan="5" className="unified-terminal__category-group-cell">
                                    <div className="unified-terminal__category-group-wrap">
                                      <div className="unified-terminal__category-group-info">
                                        <span className="material-symbols-rounded">{group.icon}</span>
                                        <span>{group.label}</span>
                                        <span className="unified-terminal__cat-count">
                                          ({group.items.length} {group.items.length === 1 ? 'item' : 'items'})
                                        </span>
                                      </div>
                                      <span className="unified-terminal__category-subtotal-badge">
                                        Subtotal: {CURRENCY_SYMBOL}{group.subtotal.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {group.items.map((item, idx) => (
                                  <tr key={item._id || `${group.category}-${idx}`} className="unified-terminal__table-row">
                                    <td className="billing-cell--category" data-label="Category">
                                      <span className="unified-terminal__cat-badge">{item.category}</span>
                                    </td>
                                    <td className="billing-cell--desc" data-label="Description">
                                      <div className="unified-terminal__item-desc">{item.description}</div>
                                      {item.proofReference && (
                                        <div className="unified-terminal__proof-tag">
                                          <span className="material-symbols-rounded unified-terminal__proof-icon">verified</span>
                                          <span>Proof: {item.proofReference}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="billing-cell--qty" data-label="Qty">
                                      {item.category === 'BED_CHARGES' && (item.quantity > 1 || item.quantity === 1)
                                        ? `${item.quantity} ${item.quantity > 1 ? 'Days' : 'Day'}`
                                        : item.quantity || 1}
                                    </td>
                                    <td className="billing-cell--price" data-label="Unit Price">
                                      {CURRENCY_SYMBOL}{(item.snapshotPrice || item.unitPrice || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="billing-cell--total" data-label="Total">
                                      {CURRENCY_SYMBOL}{(item.lineTotal ?? (item.snapshotPrice * (item.quantity || 1)) ?? 0).toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Authoritative Financial Reconciliation Breakdown */}
                    <div className="unified-terminal__financial-reconciliation">
                      <div className="unified-terminal__recon-row">
                        <span>Gross Attached Charges:</span>
                        <strong>{CURRENCY_SYMBOL}{(activeBill.billedAmount || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      {(activeBill.discountAmount > 0 || activeBill.concessionAmount > 0) && (
                        <div className="unified-terminal__recon-row unified-terminal__recon-row--discount">
                          <span>Concessions &amp; Institutional Rebate:</span>
                          <span>- {CURRENCY_SYMBOL}{(activeBill.discountAmount || activeBill.concessionAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {(activeBill.advanceCollected > 0 || ipdLedgerData?.financialSummary?.totalAdvanceDeposited > 0) && (
                        <div className="unified-terminal__recon-row unified-terminal__recon-row--advance">
                          <span>Advance Deposit Credited:</span>
                          <span>- {CURRENCY_SYMBOL}{(activeBill.advanceCollected || ipdLedgerData?.financialSummary?.totalAdvanceDeposited || 0).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {activeBill.collectedAmount > 0 && (
                        <div className="unified-terminal__recon-row unified-terminal__recon-row--collected">
                          <span>Desk Payments Collected:</span>
                          <span>- {CURRENCY_SYMBOL}{(activeBill.collectedAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="unified-terminal__recon-row unified-terminal__recon-row--net">
                        <span>Net Outstanding Balance Due:</span>
                        <span className="unified-terminal__recon-net-amount">
                          {CURRENCY_SYMBOL}{(outstanding || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT COLUMN: CASHIER PAYMENTS & SETTLEMENT ─── */}
                <div className="unified-terminal__col">
                  {/* Payment Collection Card */}
                  {outstanding > 0 && (
                    <div className="unified-terminal__card">
                      <div className="unified-terminal__card-header">
                        <h3 className="unified-terminal__card-title">
                          <span className="material-symbols-rounded">payments</span>
                          {isFinalized ? 'Post-Finalization Payment Entry' : 'Cashier Payment Entry'}
                        </h3>
                        <span className="unified-terminal__due-badge">
                          Due: {CURRENCY_SYMBOL}{outstanding.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {isFinalized && (
                        <div className="unified-terminal__post-final-banner">
                          <span className="material-symbols-rounded unified-terminal__post-final-icon">price_change</span>
                          <div>
                            <div className="unified-terminal__post-final-title">Post-Finalization Balance Settlement</div>
                            <p className="unified-terminal__post-final-text">
                              Additional consumed charges were accrued after initial invoice finalization. Collect payment or apply an authorized waiver to clear this patient for discharge.
                            </p>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleRecordPayment} className="unified-terminal__payment-form">
                        <div className="unified-terminal__pay-modes">
                          {PAYMENT_METHODS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`unified-terminal__pay-mode-btn ${paymentMethod === m.id ? 'unified-terminal__pay-mode-btn--active' : ''}`}
                              onClick={() => {
                                setPaymentMethod(m.id);
                                if (m.id === 'WaivedOff' && !paymentRef) {
                                  setPaymentRef('Authorized Administrative / Clinical Waiver');
                                }
                              }}
                            >
                              <span className="material-symbols-rounded unified-terminal__pay-mode-icon">{m.icon}</span>
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>

                        <Md3TextField
                          label={`Payment Amount (${CURRENCY_SYMBOL}) *`}
                          type="number"
                          min="0.01"
                          max={outstanding}
                          step="0.01"
                          value={paymentAmount}
                          error={paymentErrors.amount}
                          onChange={(e) => {
                            setPaymentAmount(e.target.value);
                            if (paymentErrors.amount) setPaymentErrors({ amount: '' });
                          }}
                          placeholder="0.00"
                        />

                        <Md3TextField
                          label="Transaction Ref / Auth Code / Cheque #"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder={paymentMethod === 'UPI' ? 'e.g. UPI Ref / UTR #' : paymentMethod === 'Cash' ? 'Cash Counter Slip (Optional)' : paymentMethod === 'Card' ? 'e.g. Card TXN / Auth ID' : paymentMethod === 'WaivedOff' ? 'e.g. Waiver Approval / Dispute Note' : 'e.g. Approval / Policy Ref'}
                        />

                        <PermissionGate permissions={['PAYMENT_RECORD', 'BILL_GENERATE']}>
                          <Md3Button
                            type="submit"
                            variant="primary"
                            disabled={submittingPayment}
                            className="unified-terminal__payment-submit-btn"
                          >
                            <span className="material-symbols-rounded">check_circle</span>
                            <span>{submittingPayment ? 'Processing...' : paymentMethod === 'WaivedOff' ? `Apply ${CURRENCY_SYMBOL}${paymentAmount || 0} Waiver` : `Receive ${CURRENCY_SYMBOL}${paymentAmount || 0}`}</span>
                          </Md3Button>
                        </PermissionGate>
                      </form>
                    </div>
                  )}

                  {/* Settlement / Finalize Banner */}
                  <div className="unified-terminal__card">
                    <div className="unified-terminal__card-header">
                      <h3 className="unified-terminal__card-title">
                        <span className="material-symbols-rounded">task_alt</span>
                        Settlement &amp; Discharge Clearance
                      </h3>
                    </div>

                    {outstanding > 0 ? (
                      <div className="unified-terminal__settlement-due">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span className="material-symbols-rounded unified-terminal__settlement-due-icon">info</span>
                          <div>
                            <span>
                              An outstanding balance of <strong>{CURRENCY_SYMBOL}{outstanding.toLocaleString('en-IN')}</strong> must be collected or adjusted before final billing clearance and exit authorization.
                            </span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="unified-terminal__recon-action-btn"
                                onClick={() => {
                                  setPaymentAmount(String(outstanding));
                                  setPaymentMethod('UPI');
                                }}
                              >
                                <span className="material-symbols-rounded">payments</span>
                                <span>Pay Full Balance ({CURRENCY_SYMBOL}{outstanding.toLocaleString('en-IN')})</span>
                              </button>
                              <button
                                type="button"
                                className="unified-terminal__recon-action-btn unified-terminal__recon-action-btn--waiver"
                                onClick={() => {
                                  setPaymentAmount(String(outstanding));
                                  setPaymentMethod('WaivedOff');
                                  setPaymentRef('Post-Discharge Recurring Tariff Waiver');
                                }}
                              >
                                <span className="material-symbols-rounded">loyalty</span>
                                <span>Apply Waiver</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : !isFinalized ? (
                      <div className="unified-terminal__settlement-box">
                        <span className="material-symbols-rounded unified-terminal__settlement-box-icon">check_circle</span>
                        <h4 className="unified-terminal__settlement-box-title">
                          Account Settled in Full (₹0.00 Due)
                        </h4>
                        <p className="unified-terminal__settlement-box-text">
                          All accrued clinical charges are fully paid. Finalizing locks this invoice and automatically concludes the patient encounter.
                        </p>

                        <PermissionGate permissions={['BILL_FINALIZE', 'BILL_GENERATE']}>
                          <Md3Button
                            type="button"
                            variant="primary"
                            disabled={submittingFinalize}
                            onClick={handleFinalizeBill}
                          >
                            <span className="material-symbols-rounded">lock_reset</span>
                            <span>{submittingFinalize ? 'Finalizing...' : 'Finalize Bill & Complete Visit'}</span>
                          </Md3Button>
                        </PermissionGate>
                      </div>
                    ) : (
                      <div className="unified-terminal__settlement-finalized">
                        <span className="material-symbols-rounded unified-terminal__settlement-finalized-icon">verified</span>
                        <h4 className="unified-terminal__settlement-finalized-title">
                          {activeBill?.admissionId ? 'Billing Discharge Clearance' : 'Invoice Finalized & Visit Completed'}
                        </h4>
                        <p className="unified-terminal__settlement-finalized-text">
                          {activeBill?.admissionId
                            ? (clearanceData?.billingClearance?.isCleared
                                ? 'Account is fully settled. Inpatient billing sign-off is active for Exit Gate Pass.'
                                : 'Account has zero balance. Click below to grant billing clearance and unblock patient discharge.')
                            : 'This invoice is audited and locked against changes.'}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {activeBill?.admissionId && (!clearanceData?.billingClearance?.isCleared) && (
                            <PermissionGate permissions={['BILL_FINALIZE', 'BILL_GENERATE', 'PAYMENT_RECORD']}>
                              <Md3Button
                                type="button"
                                variant="primary"
                                disabled={submittingClearance}
                                onClick={handleGrantBillingClearance}
                              >
                                <span className="material-symbols-rounded">approval</span>
                                <span>{submittingClearance ? 'Granting...' : 'Grant Billing Discharge Clearance'}</span>
                              </Md3Button>
                            </PermissionGate>
                          )}

                          <Md3Button
                            type="button"
                            variant="tonal"
                            onClick={() => setIsPrinting(true)}
                          >
                            <span className="material-symbols-rounded">print</span>
                            <span>Print Official Tax Invoice</span>
                          </Md3Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recorded Payments History Card */}
                  {payments.length > 0 && (
                    <div className="unified-terminal__card">
                      <div className="unified-terminal__card-header">
                        <h3 className="unified-terminal__card-title">
                          <span className="material-symbols-rounded">history</span>
                          Receipts &amp; Payments Audit ({payments.length})
                        </h3>
                      </div>

                      <div className="unified-terminal__payment-list">
                        {payments.map((pay, i) => {
                          const isAdvance = pay.reference && /DEPOSIT/i.test(pay.reference);
                          return (
                            <div
                              key={pay._id || i}
                              className={`unified-terminal__payment-item ${isAdvance ? 'unified-terminal__payment-item--advance' : ''}`}
                            >
                              <div className="unified-terminal__payment-meta-left">
                                <div className="unified-terminal__payment-meta-title">
                                  <span>{CURRENCY_SYMBOL}{pay.amount} • <span className="unified-terminal__payment-meta-method">{pay.method}</span></span>
                                  {isAdvance && <span className="unified-terminal__advance-badge">Advance Deposit</span>}
                                </div>
                                <div className="unified-terminal__payment-meta-sub">
                                  {pay.reference ? `Ref: ${pay.reference}` : 'Direct counter collection'}
                                </div>
                              </div>
                              <div className="unified-terminal__payment-meta-date">
                                {new Date(pay.recordedAt || pay.paidAt || Date.now()).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ─── UNIFIED BILL PRINT MODAL & HIGH-FIDELITY RENDERING ENGINE ─── */}
      <UnifiedBillPrintModal
        isOpen={isPrinting && !!activeBill}
        onClose={() => setIsPrinting(false)}
        bill={activeBill}
        patient={activeBill?.patientId || patient}
        visit={selectedVisit}
        config={templateConfig}
        defaultMode="INVOICE"
        title="Official Tax Invoice & Settlement Receipt"
      />
    </div>
  );
};

export default UnifiedBillingTerminal;
