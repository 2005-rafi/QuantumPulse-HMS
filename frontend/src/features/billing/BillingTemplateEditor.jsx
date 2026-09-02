import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Section, Md3Card, Md3IconButton, Icon } from '../../components/md3/Md3Widgets';
import { Md3TextField, Md3Button, Md3Select } from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import Md3TabSwitch from '../../components/md3/Md3TabSwitch';
import { useToast } from '../../context/ToastContext';
import BillingTemplate from './BillingTemplate';
import './BillingTemplateEditor.css';

/* ─── 1. WORKFLOW PRESET DEFINITIONS & METADATA ─── */
const WORKFLOW_TABS = [
  { id: 'OPD', label: 'Outpatient (OPD)', icon: 'stethoscope' },
  { id: 'IPD', label: 'Inpatient (IPD)', icon: 'hotel' },
  { id: 'SURGICAL', label: 'Surgical & OT', icon: 'healing' },
  { id: 'EMERGENCY', label: 'Emergency Care', icon: 'emergency' },
  { id: 'COMPREHENSIVE', label: 'Comprehensive / Insurance', icon: 'verified_user' },
];

const DEFAULT_HOSPITAL_INFO = {
  name: 'GLOBAL HEALTH HOSPITAL',
  address: '123 Medical Center Blvd, City, Country',
  contact: 'Phone: +1 234 567 890 | Email: billing@globalhealth.com',
  taxId: 'GSTIN / TAX-ID: 29AAAAA0000A1Z5',
  facilityRegNo: 'HOSP-REG-KA-2024-0982',
};

const WORKFLOW_DEFAULTS = {
  OPD: {
    title: 'OFFICIAL MEDICAL BILL',
    labels: {
      title: 'OFFICIAL MEDICAL BILL',
      date: 'Date',
      billNo: 'Bill No',
      patientName: 'Patient Name',
      mrn: 'MRN',
      ageGender: 'Age / Gender',
      doctor: 'Consulting Doctor',
      description: 'Description',
      serviceDate: 'Service Date',
      quantity: 'Qty',
      amount: 'Amount',
      consultationFee: 'Doctor Consultation Fee',
      labCharges: 'Laboratory Charges',
      totalAmount: 'TOTAL AMOUNT DUE',
      pharmacistSignature: 'Pharmacist Signature',
      hospitalSeal: 'Authorized Hospital Seal',
      footerNote: 'Thank you for your visit. Wishing you a speedy recovery!',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      ageGender: true,
      phone: true,
      doctor: true,
      consultationFee: true,
      labCharges: true,
      pharmacistSignature: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
  IPD: {
    title: 'INPATIENT FINAL BILL & SETTLEMENT',
    labels: {
      title: 'INPATIENT FINAL BILL & SETTLEMENT',
      date: 'Invoice Date',
      billNo: 'IPD Bill No',
      patientName: 'Patient Name',
      mrn: 'MRN',
      ageGender: 'Age / Gender',
      doctor: 'Primary Inpatient Consultant',
      admissionNo: 'IPD Admission No',
      admissionDate: 'Date of Admission (DOA)',
      dischargeDate: 'Date of Discharge (DOD)',
      bedInfo: 'Ward / Bed / Room',
      diagnosis: 'Clinical Diagnosis',
      description: 'Service Description & Stay Scope',
      serviceDate: 'Service Period / Stay Dates',
      quantity: 'Days / Units',
      amount: 'Amount',
      totalAmount: 'NET BALANCE PAYABLE BY PATIENT',
      patientSignature: 'Patient / Attendant Signature',
      hospitalSeal: 'Authorized Hospital Seal & Billing Desk',
      footerNote: 'All inpatient accommodation and clinical services rendered in accordance with NABH hospital protocols.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      ageGender: true,
      phone: true,
      doctor: true,
      admissionNo: true,
      admissionDate: true,
      dischargeDate: true,
      bedInfo: true,
      diagnosis: true,
      advanceSummary: true,
      patientSignature: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
  SURGICAL: {
    title: 'SURGICAL & OPERATIVE INVOICE',
    labels: {
      title: 'SURGICAL & OPERATIVE INVOICE',
      date: 'Invoice Date',
      billNo: 'OT Bill No',
      patientName: 'Patient Name',
      mrn: 'MRN',
      ageGender: 'Age / Gender',
      doctor: 'Chief Operating Surgeon',
      admissionNo: 'IPD Case No',
      admissionDate: 'OT Procedure Date',
      dischargeDate: 'Recovery Date',
      bedInfo: 'OT Suite / HDU Recovery',
      diagnosis: 'Pre- & Post-Operative Diagnosis',
      description: 'Surgical Procedure & Implants',
      serviceDate: 'Date & Time / Duration',
      quantity: 'Units / Hours',
      amount: 'Amount',
      totalAmount: 'NET SURGICAL BILL PAYABLE',
      patientSignature: 'Patient / Guardian Signature',
      hospitalSeal: 'OT Superintendent & Billing Officer',
      footerNote: 'Surgical implants and specialized disposables documented in accordance with hospital OT protocol.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      ageGender: true,
      phone: true,
      doctor: true,
      admissionNo: true,
      admissionDate: true,
      dischargeDate: true,
      bedInfo: true,
      diagnosis: true,
      advanceSummary: true,
      patientSignature: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
  EMERGENCY: {
    title: 'EMERGENCY & TRAUMA CARE INVOICE',
    labels: {
      title: 'EMERGENCY & TRAUMA CARE INVOICE',
      date: 'Bill Date & Time',
      billNo: 'ER Bill No',
      patientName: 'Patient Name',
      mrn: 'MRN',
      ageGender: 'Age / Gender',
      doctor: 'Emergency Physician / CMO',
      description: 'Emergency Resuscitation & Procedures',
      serviceDate: 'Date & Time',
      quantity: 'Qty / Hours',
      amount: 'Amount',
      totalAmount: 'TOTAL EMERGENCY CHARGES',
      patientSignature: 'Patient / Attendant Signature',
      hospitalSeal: 'Emergency Billing Desk Seal',
      footerNote: 'Emergency care rendered in accordance with clinical emergency trauma guidelines.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      ageGender: true,
      phone: true,
      doctor: true,
      patientSignature: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
  COMPREHENSIVE: {
    title: 'CONSOLIDATED INPATIENT & INSURANCE CLAIM BILL',
    labels: {
      title: 'CONSOLIDATED INPATIENT & INSURANCE CLAIM BILL',
      date: 'Settlement Date',
      billNo: 'Final Claim Invoice No',
      patientName: 'Patient Name',
      mrn: 'MRN',
      ageGender: 'Age / Gender',
      doctor: 'Primary Treating Consultant',
      admissionNo: 'IPD Admission No',
      admissionDate: 'Date of Admission',
      dischargeDate: 'Date of Discharge',
      bedInfo: 'Room & Ward Trajectory',
      diagnosis: 'Final Clinical Diagnosis',
      insuranceTpa: 'Insurance / TPA Provider',
      policyNo: 'TPA Card / Policy / Pre-Auth No',
      description: 'Itemized Encounter Services & Pharmacy',
      serviceDate: 'Service Period / Stay Dates',
      quantity: 'Qty / Days',
      amount: 'Amount',
      totalAmount: 'NET PATIENT CO-PAY RESPONSIBILITY',
      patientSignature: 'Patient / Insured Person Signature',
      hospitalSeal: 'Authorized Hospital Seal & TPA Desk',
      footerNote: 'Official itemized claim invoice for insurance reimbursement. All dates, pre-authorizations, and clinical notes attached.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      ageGender: true,
      phone: true,
      doctor: true,
      admissionNo: true,
      admissionDate: true,
      dischargeDate: true,
      bedInfo: true,
      diagnosis: true,
      insuranceTpa: true,
      policyNo: true,
      advanceSummary: true,
      insuranceSummary: true,
      patientSignature: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
};

/* ─── 2. AUTHENTIC MOCK DATASETS PER WORKFLOW ─── */
const MOCK_DATASETS = {
  OPD: {
    visit: {
      _id: 'visit_mock_opd_012',
      visitType: 'OPD',
      createdAt: new Date().toISOString(),
      patientId: {
        firstName: 'Siva',
        lastName: 'Kumar',
        mrn: 'PT-20260803-0012',
        age: 36,
        gender: 'Male',
        phone: '+91 98765 43210',
        email: 'siva.kumar@email.com',
        bloodGroup: 'O+',
        address: { city: 'Bangalore' },
      },
      consultation: {
        doctorId: { firstName: 'Arjun', lastName: 'Desai' },
      },
    },
    medications: [
      {
        recommended: 'Paracetamol 650mg',
        quantity: 10,
        amount: 15,
        dosageSchedule: {
          morning: { count: 1, timing: 'AFTER_MEAL' },
          afternoon: { count: 0 },
          night: { count: 1, timing: 'AFTER_MEAL' },
        },
      },
      {
        recommended: 'Amoxicillin 500mg',
        quantity: 15,
        amount: 85,
        dosageSchedule: {
          morning: { count: 1, timing: 'BEFORE_MEAL' },
          afternoon: { count: 1, timing: 'BEFORE_MEAL' },
          night: { count: 1, timing: 'BEFORE_MEAL' },
        },
      },
    ],
    consultationFee: 50,
    labCharges: 35,
    total: 185,
  },
  IPD: {
    admission: {
      admissionNumber: 'IPD-2026-0412',
      admissionDate: '2026-08-25T10:00:00Z',
      dischargeDate: '2026-08-29T16:00:00Z',
      diagnosis: 'Acute Coronary Syndrome (ICD-10: I20.0)',
      attendingDoctorId: { firstName: 'Arjun', lastName: 'Desai' },
      patientId: {
        firstName: 'Siva',
        lastName: 'Kumar',
        mrn: 'PT-20260803-0012',
        age: 36,
        gender: 'Male',
        phone: '+91 98765 43210',
        address: { city: 'Bangalore' },
      },
      bedId: {
        wardClass: 'Cardiology Ward',
        bedNumber: '102',
        comfortTier: 'Semi-Private',
      },
    },
    lineItems: [
      {
        description: 'Bed Accommodation: Semi-Private Twin Sharing Room',
        category: 'BED_CHARGES',
        dateRange: '25/08/2026 – 29/08/2026 (4 Days)',
        quantity: '4 Days',
        lineTotal: 10000,
      },
      {
        description: 'Nursing Care & Vitals Monitoring (Semi-Private)',
        category: 'PROCEDURE',
        dateRange: '25/08/2026 – 29/08/2026 (4 Days)',
        quantity: '4 Days',
        lineTotal: 2000,
      },
      {
        description: 'Daily RMO & Senior Consultant Rounds',
        category: 'CONSULTATION',
        dateRange: '25/08/2026 – 29/08/2026 (4 Days)',
        quantity: '4 Days',
        lineTotal: 1600,
      },
      {
        description: 'Diagnostic Panel: Cardiac Enzymes (Troponin-I, CK-MB) & Lipid Profile',
        category: 'DIAGNOSTICS',
        dateRange: '25/08/2026',
        quantity: '1 Panel',
        lineTotal: 3500,
      },
      {
        description: 'Inpatient Pharmacy Medications, IV Fluids & Infusion Sets',
        category: 'PHARMACY',
        dateRange: '25/08/2026 – 29/08/2026',
        quantity: '1 Lot',
        lineTotal: 5400,
      },
    ],
    financials: {
      grossBilled: 22500,
      advancePaid: 10000,
      insuranceApproved: 0,
      adjustments: 500,
    },
  },
  SURGICAL: {
    admission: {
      admissionNumber: 'IPD-2026-0399',
      admissionDate: '2026-08-26T08:00:00Z',
      dischargeDate: '2026-08-28T12:00:00Z',
      diagnosis: 'Calculus of Gallbladder with Cholecystitis (ICD-10: K80.0)',
      attendingDoctorId: { firstName: 'Arjun', lastName: 'Desai' },
      patientId: {
        firstName: 'Priya',
        lastName: 'Sharma',
        mrn: 'PT-20260801-0008',
        age: 42,
        gender: 'Female',
        phone: '+91 98111 22334',
        address: { city: 'Bangalore' },
      },
      bedId: {
        wardClass: 'Surgical Recovery HDU',
        bedNumber: 'HDU-03',
        comfortTier: 'Deluxe',
      },
    },
    lineItems: [
      {
        description: 'Laparoscopic Cholecystectomy Operating Surgeon Fee',
        category: 'PROCEDURE',
        dateRange: '26/08/2026 (14:00 – 16:30)',
        quantity: '1 Surgery',
        lineTotal: 25000,
      },
      {
        description: 'Major Operation Theater (OT) Facility & Monitoring Charges',
        category: 'PROCEDURE',
        dateRange: '26/08/2026 (2.5 hrs)',
        quantity: '2.5 hrs',
        lineTotal: 12000,
      },
      {
        description: 'General Anesthesia Administration & Pre-Op Assessment',
        category: 'PROCEDURE',
        dateRange: '26/08/2026',
        quantity: '1 Case',
        lineTotal: 8000,
      },
      {
        description: 'Surgical Disposables, Laparoscopic Trocar & Clip Cartridges',
        category: 'PHARMACY',
        dateRange: '26/08/2026',
        quantity: '1 Kit',
        lineTotal: 9500,
      },
      {
        description: 'Post-Op Recovery Room Monitoring (HDU)',
        category: 'BED_CHARGES',
        dateRange: '26/08/2026 – 28/08/2026 (2 Days)',
        quantity: '2 Days',
        lineTotal: 4500,
      },
    ],
    financials: {
      grossBilled: 59000,
      advancePaid: 25000,
      insuranceApproved: 0,
      adjustments: 0,
    },
  },
  EMERGENCY: {
    visit: {
      _id: 'visit_mock_er_089',
      visitType: 'EMERGENCY',
      createdAt: '2026-08-28T21:15:00Z',
      patientId: {
        firstName: 'Rajesh',
        lastName: 'Patel',
        mrn: 'PT-20260805-0033',
        age: 51,
        gender: 'Male',
        phone: '+91 97777 88888',
        address: { city: 'Bangalore' },
      },
      consultation: {
        doctorId: { firstName: 'Vikram', lastName: 'Seth' },
      },
    },
    lineItems: [
      {
        description: 'Emergency Room Triage & Trauma Resuscitation Protocol',
        category: 'PROCEDURE',
        dateRange: '28/08/2026 21:15',
        quantity: '1 Protocol',
        lineTotal: 3500,
      },
      {
        description: 'Emergency 12-Lead ECG, Blood Gas Analysis & Cardiac Biomarkers',
        category: 'DIAGNOSTICS',
        dateRange: '28/08/2026 21:30',
        quantity: '1 STAT Panel',
        lineTotal: 2800,
      },
      {
        description: 'Emergency Crash-Cart Medications, IV Cannulation & Oxygen Therapy',
        category: 'PHARMACY',
        dateRange: '28/08/2026',
        quantity: '1 Kit',
        lineTotal: 4200,
      },
      {
        description: 'Emergency Observation Bay Care & Monitoring (Overnight)',
        category: 'BED_CHARGES',
        dateRange: '28/08/2026 21:15 – 29/08/2026 06:00 (9 hrs)',
        quantity: '9 hrs',
        lineTotal: 2200,
      },
    ],
    financials: {
      grossBilled: 12700,
      advancePaid: 0,
      insuranceApproved: 0,
      adjustments: 0,
    },
  },
  COMPREHENSIVE: {
    admission: {
      admissionNumber: 'IPD-2026-0412',
      admissionDate: '2026-08-25T10:00:00Z',
      dischargeDate: '2026-08-29T16:00:00Z',
      diagnosis: 'Acute Myocardial Infarction · Primary Angioplasty (ICD-10: I21.0)',
      attendingDoctorId: { firstName: 'Arjun', lastName: 'Desai' },
      insuranceDetails: {
        provider: 'Star Health & Allied Insurance',
        policyNumber: 'POL-SH-9928194',
      },
      patientId: {
        firstName: 'Siva',
        lastName: 'Kumar',
        mrn: 'PT-20260803-0012',
        age: 36,
        gender: 'Male',
        phone: '+91 98765 43210',
        address: { city: 'Bangalore' },
      },
      bedId: {
        wardClass: 'Cardiology ICU & Deluxe Suite',
        bedNumber: 'ICU-04 / Room 302',
        comfortTier: 'Deluxe (Motorized Suite)',
      },
    },
    lineItems: [
      {
        description: 'Initial Emergency Triage & Cardiac Evaluation (OPD/ER)',
        category: 'CONSULTATION',
        dateRange: '25/08/2026 09:30',
        quantity: '1 Visit',
        lineTotal: 1200,
      },
      {
        description: 'Cardiac Intensive Care Unit (ICU) Accommodation',
        category: 'BED_CHARGES',
        dateRange: '25/08/2026 – 27/08/2026 (2 Days @ ₹8,000/day)',
        quantity: '2 Days',
        lineTotal: 16000,
      },
      {
        description: 'Deluxe Private Post-Op Room Accommodation',
        category: 'BED_CHARGES',
        dateRange: '27/08/2026 – 29/08/2026 (2 Days @ ₹4,000/day)',
        quantity: '2 Days',
        lineTotal: 8000,
      },
      {
        description: 'Coronary Angioplasty with Drug-Eluting Stent Placement',
        category: 'PROCEDURE',
        dateRange: '26/08/2026 · Dr. Arjun Desai',
        quantity: '1 Procedure',
        lineTotal: 45000,
      },
      {
        description: 'Cath Lab Diagnostics, Blood Gas & Daily Inpatient Lab Panels',
        category: 'DIAGNOSTICS',
        dateRange: '25/08/2026 – 28/08/2026',
        quantity: '1 Set',
        lineTotal: 6800,
      },
      {
        description: 'Inpatient Pharmacy Medications, Anticoagulants, Stents & Consumables',
        category: 'PHARMACY',
        dateRange: '25/08/2026 – 29/08/2026',
        quantity: '1 Lot',
        lineTotal: 8600,
      },
    ],
    financials: {
      grossBilled: 85600,
      advancePaid: 20000,
      insuranceApproved: 55000,
      adjustments: 600,
    },
  },
};

const ExpandMoreIcon = () => (
  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>expand_more</span>
);

const ExpandLessIcon = () => (
  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>expand_less</span>
);

/* ─── 3. MAIN BILLING TEMPLATE EDITOR COMPONENT ─── */
export const BillingTemplateEditor = ({ initialSettings, onSave, loading }) => {
  const { showSuccess, showError } = useToast();

  const [activeWorkflow, setActiveWorkflow] = useState('OPD');
  const [hospitalInfo, setHospitalInfo] = useState(DEFAULT_HOSPITAL_INFO);

  // Workflow template store (holds templates for OPD, IPD, SURGICAL, EMERGENCY, COMPREHENSIVE)
  const [templates, setTemplates] = useState(WORKFLOW_DEFAULTS);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    icon: 'delete',
    onConfirm: null,
  });

  // Collapsible section accordions
  const [openSections, setOpenSections] = useState({
    hospital: true,
    workflowHeaders: true,
    inpatientScope: true,
    tableColumns: true,
    insuranceSettlement: false,
    signatures: false,
    customFields: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Load initial settings from server (with multi-workflow or legacy fallback)
  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.hospitalInfo) {
        setHospitalInfo((prev) => ({ ...prev, ...initialSettings.hospitalInfo }));
      }

      if (initialSettings.templates) {
        // Modern multi-workflow payload
        setTemplates((prev) => {
          const merged = { ...prev };
          Object.keys(initialSettings.templates).forEach((wf) => {
            merged[wf] = {
              ...prev[wf],
              ...initialSettings.templates[wf],
              labels: { ...(prev[wf]?.labels || {}), ...(initialSettings.templates[wf]?.labels || {}) },
              fieldVisibility: { ...(prev[wf]?.fieldVisibility || {}), ...(initialSettings.templates[wf]?.fieldVisibility || {}) },
              customFields: initialSettings.templates[wf]?.customFields || prev[wf]?.customFields || [],
            };
          });
          return merged;
        });
      } else if (initialSettings.labels || initialSettings.fieldVisibility) {
        // Legacy single-template migration into OPD/IPD
        setTemplates((prev) => ({
          ...prev,
          OPD: {
            ...prev.OPD,
            labels: { ...prev.OPD.labels, ...(initialSettings.labels || {}) },
            fieldVisibility: { ...prev.OPD.fieldVisibility, ...(initialSettings.fieldVisibility || {}) },
            customFields: initialSettings.customFields || [],
          },
        }));
      }

      if (initialSettings.activeWorkflow && WORKFLOW_DEFAULTS[initialSettings.activeWorkflow]) {
        setActiveWorkflow(initialSettings.activeWorkflow);
      }
    }
  }, [initialSettings]);

  // Current active template configuration
  const currentTemplate = templates[activeWorkflow] || WORKFLOW_DEFAULTS.OPD;
  const currentLabels = currentTemplate.labels || {};
  const currentVisibility = currentTemplate.fieldVisibility || {};
  const currentCustomFields = currentTemplate.customFields || [];

  // Mutators for current workflow
  const handleHospitalChange = (e) => {
    const { name, value } = e.target;
    setHospitalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleLabelChange = (fieldKey, value) => {
    setTemplates((prev) => ({
      ...prev,
      [activeWorkflow]: {
        ...prev[activeWorkflow],
        labels: {
          ...prev[activeWorkflow].labels,
          [fieldKey]: value,
        },
      },
    }));
  };

  const handleToggleVisibility = (fieldKey, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setTemplates((prev) => ({
      ...prev,
      [activeWorkflow]: {
        ...prev[activeWorkflow],
        fieldVisibility: {
          ...prev[activeWorkflow].fieldVisibility,
          [fieldKey]: !prev[activeWorkflow].fieldVisibility[fieldKey],
        },
      },
    }));
  };

  // Custom Fields Builder
  const [newCustomField, setNewCustomField] = useState({
    label: '',
    position: 'patientInfo',
    valueType: 'static',
    staticValue: '',
    dynamicField: 'patient.phone',
  });

  const handleAddCustomField = () => {
    if (!newCustomField.label.trim()) {
      showError('Validation Error', 'Field label is required');
      return;
    }

    const fieldToAdd = {
      id: `custom_${Date.now()}`,
      ...newCustomField,
    };

    setTemplates((prev) => ({
      ...prev,
      [activeWorkflow]: {
        ...prev[activeWorkflow],
        customFields: [...(prev[activeWorkflow].customFields || []), fieldToAdd],
      },
    }));

    setNewCustomField({
      label: '',
      position: 'patientInfo',
      valueType: 'static',
      staticValue: '',
      dynamicField: 'patient.phone',
    });

    showSuccess('Custom Field Added', `Field "${fieldToAdd.label}" added to ${activeWorkflow} template.`);
  };

  const handleDeleteCustomField = (fieldId) => {
    setTemplates((prev) => ({
      ...prev,
      [activeWorkflow]: {
        ...prev[activeWorkflow],
        customFields: prev[activeWorkflow].customFields.filter((f) => f.id !== fieldId),
      },
    }));
  };

  // Reset current workflow to defaults
  const handlePromptResetWorkflow = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Reset ${activeWorkflow} Template?`,
      message: `Are you sure you want to restore the default labels and layout for the ${activeWorkflow} billing workflow?`,
      variant: 'danger',
      confirmLabel: 'Reset to Defaults',
      cancelLabel: 'Cancel',
      icon: 'restart_alt',
      onConfirm: () => {
        setTemplates((prev) => ({
          ...prev,
          [activeWorkflow]: { ...WORKFLOW_DEFAULTS[activeWorkflow] },
        }));
        showSuccess('Template Reset', `${activeWorkflow} template restored to standard defaults.`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Save full configuration payload
  const handleSaveAll = () => {
    const payload = {
      activeWorkflow,
      hospitalInfo,
      templates,
    };
    onSave(payload);
  };

  // Active mock data for preview desk
  const activeMock = MOCK_DATASETS[activeWorkflow] || MOCK_DATASETS.OPD;

  return (
    <div className="billing-editor-layout">
      {/* LEFT COLUMN: Controls & Workflow Switcher */}
      <div className="billing-editor-form">
        {/* Top Header Card & Workflow Switcher */}
        <Md3Card className="billing-editor-header-card" style={{ padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                Billing Template Designer &amp; Workflow Layouts
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Configure segregated templates for OPD, IPD, Surgical, Emergency, and Insurance Claims
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Md3Button
                type="button"
                variant="secondary"
                onClick={handlePromptResetWorkflow}
                style={{ height: '36px', padding: '0 12px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px' }}>restart_alt</span>
                <span>Reset Tab</span>
              </Md3Button>

              <Md3Button
                type="button"
                onClick={handleSaveAll}
                disabled={loading}
                loading={loading}
                style={{ height: '36px', padding: '0 16px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px' }}>check</span>
                <span>Save All Templates</span>
              </Md3Button>
            </div>
          </div>

          {/* Workflow Selector Tabs */}
          <Md3TabSwitch
            tabs={WORKFLOW_TABS}
            activeTab={activeWorkflow}
            onChange={setActiveWorkflow}
            size="small"
          />
        </Md3Card>

        {/* 1. Hospital Branding & Tax Info (Global) */}
        <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div
            className="billing-editor-card-header"
            onClick={() => toggleSection('hospital')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                1. Hospital Branding &amp; Legal Entity (Global)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Hospital name, location, contact lines, and GSTIN/tax registration
              </p>
            </div>
            {openSections.hospital ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>

          {openSections.hospital && (
            <div className="billing-editor-card-content">
              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="h-name"
                    name="name"
                    label="Hospital Legal Name"
                    value={hospitalInfo.name}
                    onChange={handleHospitalChange}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
              </div>

              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="h-address"
                    name="address"
                    label="Hospital Address / Facility Location"
                    value={hospitalInfo.address}
                    onChange={handleHospitalChange}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                <button
                  type="button"
                  className="template-field-delete-btn"
                  onClick={(e) => handleToggleVisibility('hospitalAddress', e)}
                  title={currentVisibility.hospitalAddress ? 'Hide address from invoice' : 'Show address'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {currentVisibility.hospitalAddress ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>

              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="h-contact"
                    name="contact"
                    label="Hospital Contact / Email / Phone"
                    value={hospitalInfo.contact}
                    onChange={handleHospitalChange}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                <button
                  type="button"
                  className="template-field-delete-btn"
                  onClick={(e) => handleToggleVisibility('hospitalContact', e)}
                  title={currentVisibility.hospitalContact ? 'Hide contact from invoice' : 'Show contact'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {currentVisibility.hospitalContact ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>

              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="h-taxId"
                    name="taxId"
                    label="GSTIN / Hospital Tax Registration / NABH ID"
                    value={hospitalInfo.taxId}
                    onChange={handleHospitalChange}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                <button
                  type="button"
                  className="template-field-delete-btn"
                  onClick={(e) => handleToggleVisibility('hospitalTaxId', e)}
                  title={currentVisibility.hospitalTaxId ? 'Hide tax registration' : 'Show tax registration'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {currentVisibility.hospitalTaxId ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </Md3Card>

        {/* 2. Titles & Core Metadata Labels */}
        <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div
            className="billing-editor-card-header"
            onClick={() => toggleSection('workflowHeaders')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                2. {activeWorkflow} Header &amp; Patient Metadata Labels
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Custom titles, bill number prefix, date formats, and demographic fields
              </p>
            </div>
            {openSections.workflowHeaders ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>

          {openSections.workflowHeaders && (
            <div className="billing-editor-card-content">
              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="lbl-title"
                    label="Invoice Title"
                    value={currentLabels.title || ''}
                    onChange={(e) => handleLabelChange('title', e.target.value)}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-date"
                      label="Date Label"
                      value={currentLabels.date || ''}
                      onChange={(e) => handleLabelChange('date', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-billNo"
                      label="Bill No Label"
                      value={currentLabels.billNo || ''}
                      onChange={(e) => handleLabelChange('billNo', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-patientName"
                      label="Patient Name Label"
                      value={currentLabels.patientName || ''}
                      onChange={(e) => handleLabelChange('patientName', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-mrn"
                      label="MRN Label"
                      value={currentLabels.mrn || ''}
                      onChange={(e) => handleLabelChange('mrn', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-ageGender"
                      label="Age & Gender Label"
                      value={currentLabels.ageGender || ''}
                      onChange={(e) => handleLabelChange('ageGender', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('ageGender', e)}
                    title={currentVisibility.ageGender ? 'Hide age/gender' : 'Show age/gender'}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {currentVisibility.ageGender ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-doctor"
                      label={activeWorkflow === 'SURGICAL' ? 'Surgeon Label' : 'Doctor / Consultant Label'}
                      value={currentLabels.doctor || ''}
                      onChange={(e) => handleLabelChange('doctor', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('doctor', e)}
                    title={currentVisibility.doctor ? 'Hide doctor' : 'Show doctor'}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {currentVisibility.doctor ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </Md3Card>

        {/* 3. Inpatient & Spatial Stay Fields (IPD, Surgical, Comprehensive) */}
        {(activeWorkflow === 'IPD' || activeWorkflow === 'SURGICAL' || activeWorkflow === 'COMPREHENSIVE') && (
          <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div
              className="billing-editor-card-header"
              onClick={() => toggleSection('inpatientScope')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  3. Inpatient Stay, Spatial Scope &amp; Diagnosis
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Admission number, DOA/DOD, ward/room/bed allocation, and ICD diagnosis
                </p>
              </div>
              {openSections.inpatientScope ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </div>

            {openSections.inpatientScope && (
              <div className="billing-editor-card-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-admissionNo"
                        label="Admission No Label"
                        value={currentLabels.admissionNo || 'IPD Admission No'}
                        onChange={(e) => handleLabelChange('admissionNo', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                  </div>

                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-bedInfo"
                        label="Ward / Bed / Room Label"
                        value={currentLabels.bedInfo || 'Ward / Bed / Room'}
                        onChange={(e) => handleLabelChange('bedInfo', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-doa"
                        label="Date of Admission (DOA)"
                        value={currentLabels.admissionDate || 'Date of Admission'}
                        onChange={(e) => handleLabelChange('admissionDate', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                  </div>

                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-dod"
                        label="Date of Discharge (DOD)"
                        value={currentLabels.dischargeDate || 'Date of Discharge'}
                        onChange={(e) => handleLabelChange('dischargeDate', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={(e) => handleToggleVisibility('dischargeDate', e)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        {currentVisibility.dischargeDate ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-diagnosis"
                      label="Diagnosis & ICD-10 Code Label"
                      value={currentLabels.diagnosis || 'Clinical Diagnosis'}
                      onChange={(e) => handleLabelChange('diagnosis', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('diagnosis', e)}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {currentVisibility.diagnosis ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </Md3Card>
        )}

        {/* 4. Insurance, TPA & Advance Settlement (IPD & Comprehensive) */}
        {(activeWorkflow === 'IPD' || activeWorkflow === 'COMPREHENSIVE' || activeWorkflow === 'SURGICAL') && (
          <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div
              className="billing-editor-card-header"
              onClick={() => toggleSection('insuranceSettlement')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  4. Insurance, TPA &amp; Advance Settlement
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  TPA provider labels, policy numbers, advance deposit credits, and approved claims
                </p>
              </div>
              {openSections.insuranceSettlement ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </div>

            {openSections.insuranceSettlement && (
              <div className="billing-editor-card-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-insuranceTpa"
                        label="Insurance / TPA Provider Label"
                        value={currentLabels.insuranceTpa || 'Insurance / TPA'}
                        onChange={(e) => handleLabelChange('insuranceTpa', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={(e) => handleToggleVisibility('insuranceTpa', e)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        {currentVisibility.insuranceTpa ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>

                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="lbl-policyNo"
                        label="Policy / Pre-Auth Claim No Label"
                        value={currentLabels.policyNo || 'Policy / Card No'}
                        onChange={(e) => handleLabelChange('policyNo', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={(e) => handleToggleVisibility('policyNo', e)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        {currentVisibility.policyNo ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'var(--md-sys-color-surface-container-low)' }}>
                  <div>
                    <strong style={{ fontSize: '0.84rem' }}>Inpatient Advance Deposit Deductions</strong>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      Deduct collected admission deposits and print receipt vouchers in the reconciliation summary
                    </p>
                  </div>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('advanceSummary', e)}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                      {currentVisibility.advanceSummary ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </Md3Card>
        )}

        {/* 5. Itemized Table Column Labels & Service Date Ranges */}
        <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div
            className="billing-editor-card-header"
            onClick={() => toggleSection('tableColumns')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                5. Itemized Table Columns &amp; Date Range Transparency
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Headers for clinical descriptions, service period dates, quantity, and total net amount
              </p>
            </div>
            {openSections.tableColumns ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>

          {openSections.tableColumns && (
            <div className="billing-editor-card-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-desc"
                      label="Service Description Header"
                      value={currentLabels.description || 'Description'}
                      onChange={(e) => handleLabelChange('description', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-serviceDate"
                      label="Service Date / Period Header"
                      value={currentLabels.serviceDate || 'Service Period / Date Range'}
                      onChange={(e) => handleLabelChange('serviceDate', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-qty"
                      label="Quantity / Units Header"
                      value={currentLabels.quantity || 'Qty / Units'}
                      onChange={(e) => handleLabelChange('quantity', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-amt"
                      label="Amount Header"
                      value={currentLabels.amount || 'Amount'}
                      onChange={(e) => handleLabelChange('amount', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
                </div>
              </div>

              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="lbl-totalAmt"
                    label="Final Net Balance Due Label"
                    value={currentLabels.totalAmount || 'TOTAL AMOUNT DUE'}
                    onChange={(e) => handleLabelChange('totalAmount', e.target.value)}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--mandatory">Mandatory</span>
              </div>
            </div>
          )}
        </Md3Card>

        {/* 6. Signatures, Seals & Terms */}
        <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div
            className="billing-editor-card-header"
            onClick={() => toggleSection('signatures')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                6. Signatures, Seals &amp; Disclaimers
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Patient signature acknowledgements, hospital seal, and footer legal notes
              </p>
            </div>
            {openSections.signatures ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>

          {openSections.signatures && (
            <div className="billing-editor-card-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-ptSig"
                      label="Patient / Attendant Signature Label"
                      value={currentLabels.patientSignature || 'Patient / Attendant Signature'}
                      onChange={(e) => handleLabelChange('patientSignature', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('patientSignature', e)}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {currentVisibility.patientSignature ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>

                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="lbl-seal"
                      label="Hospital Seal & Billing Officer"
                      value={currentLabels.hospitalSeal || 'Authorized Hospital Seal'}
                      onChange={(e) => handleLabelChange('hospitalSeal', e.target.value)}
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                  <button
                    type="button"
                    className="template-field-delete-btn"
                    onClick={(e) => handleToggleVisibility('hospitalSeal', e)}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {currentVisibility.hospitalSeal ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="template-field-row">
                <div className="template-field-row__input">
                  <Md3TextField
                    id="lbl-footerNote"
                    label="Footer Policy / Disclaimer Note"
                    value={currentLabels.footerNote || ''}
                    onChange={(e) => handleLabelChange('footerNote', e.target.value)}
                  />
                </div>
                <span className="template-field-row__badge template-field-row__badge--optional">Optional</span>
                <button
                  type="button"
                  className="template-field-delete-btn"
                  onClick={(e) => handleToggleVisibility('footerNote', e)}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {currentVisibility.footerNote ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </Md3Card>

        {/* 7. Custom Fields Builder */}
        <Md3Card className="billing-editor-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div
            className="billing-editor-card-header"
            onClick={() => toggleSection('customFields')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-low, #f7f2fa)' }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                7. Custom Dynamic &amp; Static Fields Builder
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Add arbitrary custom fields to patient info, spatial scope, or invoice footer
              </p>
            </div>
            {openSections.customFields ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>

          {openSections.customFields && (
            <div className="billing-editor-card-content">
              {/* Existing custom fields */}
              {currentCustomFields.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentCustomFields.map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--md-sys-color-surface-container-low)', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                      <div>
                        <strong>{f.label}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)', marginLeft: '8px' }}>
                          ({f.position} · {f.valueType === 'static' ? `Static: "${f.staticValue}"` : `Dynamic: ${f.dynamicField}`})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="template-field-delete-btn"
                        onClick={() => handleDeleteCustomField(f.id)}
                        title="Delete custom field"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', fontStyle: 'italic' }}>
                  No custom fields configured for this workflow template yet.
                </p>
              )}

              {/* Add field form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <Md3TextField
                  id="cf-label"
                  label="Field Label"
                  placeholder="e.g. Attendant Contact"
                  value={newCustomField.label}
                  onChange={(e) => setNewCustomField((prev) => ({ ...prev, label: e.target.value }))}
                />

                <Md3Select
                  id="cf-pos"
                  label="Position"
                  value={newCustomField.position}
                  onChange={(e) => setNewCustomField((prev) => ({ ...prev, position: e.target.value }))}
                  options={[
                    { value: 'patientInfo', label: 'Patient Info' },
                    { value: 'footer', label: 'Invoice Footer' },
                  ]}
                />

                <Md3Select
                  id="cf-type"
                  label="Value Type"
                  value={newCustomField.valueType}
                  onChange={(e) => setNewCustomField((prev) => ({ ...prev, valueType: e.target.value }))}
                  options={[
                    { value: 'static', label: 'Static Text' },
                    { value: 'dynamic', label: 'Dynamic Field' },
                  ]}
                />
              </div>

              {newCustomField.valueType === 'static' ? (
                <Md3TextField
                  id="cf-static"
                  label="Static Text Value"
                  placeholder="e.g. Non-Smoking Zone"
                  value={newCustomField.staticValue}
                  onChange={(e) => setNewCustomField((prev) => ({ ...prev, staticValue: e.target.value }))}
                />
              ) : (
                <Md3Select
                  id="cf-dyn"
                  label="Select Dynamic Field Source"
                  value={newCustomField.dynamicField}
                  onChange={(e) => setNewCustomField((prev) => ({ ...prev, dynamicField: e.target.value }))}
                  options={[
                    { value: 'patient.phone', label: 'Patient Phone Number' },
                    { value: 'patient.email', label: 'Patient Email' },
                    { value: 'patient.bloodGroup', label: 'Blood Group' },
                    { value: 'patient.city', label: 'Patient City / Location' },
                    { value: 'admission.admissionNo', label: 'Inpatient Admission Number' },
                    { value: 'admission.wardBed', label: 'Ward & Bed Assignment' },
                    { value: 'admission.diagnosis', label: 'Clinical Diagnosis' },
                    { value: 'insurance.provider', label: 'Insurance Provider' },
                    { value: 'insurance.policyNo', label: 'Insurance Policy Number' },
                  ]}
                />
              )}

              <Md3Button
                type="button"
                variant="secondary"
                onClick={handleAddCustomField}
                style={{ width: 'fit-content', marginTop: '6px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '4px' }}>add</span>
                <span>Add Custom Field</span>
              </Md3Button>
            </div>
          )}
        </Md3Card>
      </div>

      {/* RIGHT COLUMN: Live Print Preview */}
      <div className="billing-preview-panel">
        <div className="billing-preview-header">
          <div>
            <h3>Live Print Preview</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>
              {activeWorkflow} Workflow · A4 Paper Scale
            </span>
          </div>
          <Md3Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
            style={{ height: '32px', fontSize: '0.78rem', padding: '0 10px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>print</span>
            <span>Print Preview</span>
          </Md3Button>
        </div>

        <div className="billing-preview-desk">
          <div className="billing-preview-sheet">
            <BillingTemplate
              hospitalInfo={hospitalInfo}
              labels={currentLabels}
              fieldVisibility={currentVisibility}
              customFields={currentCustomFields}
              workflowType={activeWorkflow}
              visit={activeMock.visit}
              admission={activeMock.admission}
              lineItems={activeMock.lineItems}
              medications={activeMock.medications}
              consultationFee={activeMock.consultationFee}
              labCharges={activeMock.labCharges}
              financials={activeMock.financials}
              total={activeMock.total}
            />
          </div>
        </div>
      </div>

      {/* Hidden Printable Invoice Portal (renders into document.body during window.print()) */}
      {createPortal(
        <div className="billing-print-portal">
          <BillingTemplate
            hospitalInfo={hospitalInfo}
            labels={currentLabels}
            fieldVisibility={currentVisibility}
            customFields={currentCustomFields}
            workflowType={activeWorkflow}
            visit={activeMock.visit}
            admission={activeMock.admission}
            lineItems={activeMock.lineItems}
            medications={activeMock.medications}
            consultationFee={activeMock.consultationFee}
            labCharges={activeMock.labCharges}
            financials={activeMock.financials}
            total={activeMock.total}
          />
        </div>,
        document.body
      )}

      {/* Confirmation Dialog */}
      <Md3ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default BillingTemplateEditor;
