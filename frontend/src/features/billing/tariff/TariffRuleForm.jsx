import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select, Md3UnsavedChangesDialog } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { tariffAPI } from '../../../services/tariffAPI';
import { staffAPI } from '../../../services/staffAPI';
import api from '../../../services/api';

import { useToast } from '../../../context/ToastContext';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import './TariffRuleForm.css';

const CATEGORIES = [
  { value: 'BED_CHARGES', label: 'Bed & Ward Tariff', icon: 'hotel', desc: 'Inpatient daily/hourly rates, comfort tiers & deposits' },
  { value: 'REGISTRATION', label: 'Registration Fees', icon: 'how_to_reg', desc: 'IPD admission check-in, OPD tickets & emergency' },
  { value: 'CONSULTATION', label: 'Doctor Consultation', icon: 'stethoscope', desc: 'Inpatient rounds, OPD clinic & surgeon visits' },
  { value: 'DIAGNOSTICS', label: 'Laboratory Diagnostics', icon: 'biotech', desc: 'Pathology & radiology investigation rates' },
  { value: 'PROCEDURE', label: 'Clinical Procedures', icon: 'healing', desc: 'Surgery, OT time & nursing procedures' },
  { value: 'PACKAGE', label: 'Health Packages', icon: 'inventory_2', desc: 'Bundled surgery & wellness packages' },
];

const VISIT_TYPES = [
  { value: '', label: 'All Visit Types (Global Hospital Baseline)' },
  { value: 'IPD', label: 'IPD (Inpatient Admission & Stay)' },
  { value: 'OPD', label: 'OPD (Outpatient Clinic Visit)' },
  { value: 'EMERGENCY', label: 'Emergency & Trauma Care' },
  { value: 'SURGERY', label: 'Surgery / Operating Theatre (OT)' },
  { value: 'DAY_CARE', label: 'Day Care / Dialysis / Chemo' },
  { value: 'HEALTH_CHECKUP', label: 'Preventive Health Checkup Packages' },
];

const COMFORT_TIERS = [
  { value: '', label: 'All Comfort Tiers (Global)' },
  { value: 'STANDARD', label: 'Standard Clinical Cot' },
  { value: 'COMFORT', label: 'Comfort (Semi-Motorized)' },
  { value: 'DELUXE', label: 'Deluxe (Motorized Suite)' },
  { value: 'SUPER_DELUXE_SUITE', label: 'Super Deluxe VIP Suite' },
  { value: 'EXECUTIVE_PRESIDENTIAL', label: 'Executive Presidential' },
];

const SHARING_TYPES = [
  { value: '', label: 'All Sharing Types' },
  { value: 'GENERAL_WARD', label: 'General Ward (Multi-Bed 6-12)' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private (Twin Sharing)' },
  { value: 'PRIVATE_SINGLE', label: 'Private Single Occupancy' },
  { value: 'VIP_ISOLATION', label: 'VIP Isolation Suite' },
];

const WARD_CLASSES = [
  { value: '', label: 'All Ward Classes' },
  { value: 'GENERAL_WARD', label: 'General Ward' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private' },
  { value: 'PRIVATE', label: 'Private Room' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Private Suite' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'CCU', label: 'Coronary Care Unit (CCU)' },
  { value: 'HDU', label: 'High Dependency Unit (HDU)' },
  { value: 'NICU', label: 'Neonatal ICU (NICU)' },
  { value: 'PICU', label: 'Pediatric ICU (PICU)' },
  { value: 'ISOLATION', label: 'Negative Pressure Isolation' },
  { value: 'POST_OP_RECOVERY', label: 'Post-Op Recovery' },
];

const TARIFF_GRADES = [
  { value: '', label: 'All Grades (Global)' },
  { value: 'GRADE_1', label: 'Grade 1 — Intern / Junior' },
  { value: 'GRADE_2', label: 'Grade 2 — Resident / Associate' },
  { value: 'GRADE_3', label: 'Grade 3 — Consultant / Senior Consultant' },
  { value: 'GRADE_4', label: 'Grade 4 — Head of Dept / Superintendent' },
  { value: 'GRADE_5', label: 'Grade 5 — Chief Medical Officer' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const calculateSpecificityScore = (item) => {
  let score = 0;
  if (item.category === 'BED_CHARGES') {
    if (item.floorId) score += 10;
    if (item.comfortTier) score += 8;
    if (item.wardClass) score += 6;
    if (item.sharingType) score += 6;
    if (item.visitType) score += 2;
  } else if (item.category === 'CONSULTATION') {
    if (item.staffId) score += 16;
    if (item.departmentId) score += 8;
    if (item.tariffGrade) score += 4;
    if (item.visitType) score += 2;
    if (item.appointmentType) score += 1;
  } else if (item.category === 'REGISTRATION') {
    if (item.departmentId) score += 8;
    if (item.visitType) score += 4; // High weight for IPD vs OPD vs Emergency registration
    if (item.appointmentType) score += 1;
  } else if (item.category === 'DIAGNOSTICS') {
    if (item.testCode) score += 10;
    if (item.serviceMasterId) score += 6;
    if (item.departmentId) score += 4;
    if (item.visitType) score += 2;
  } else if (item.category === 'PROCEDURE' || item.category === 'PACKAGE') {
    if (item.serviceMasterId) score += 8;
    if (item.departmentId) score += 4;
    if (item.visitType) score += 2;
  }
  return score;
};

const createEmptyRule = (category = 'CONSULTATION', overrides = {}) => ({
  id: generateId(),
  ruleNumber: '',
  name: '',
  description: '',
  inclusions: '',
  category,
  serviceMasterId: '',
  testCode: '',
  wardClass: '',
  comfortTier: '',
  sharingType: '',
  floorId: '',
  departmentId: '',
  tariffGrade: '',
  staffId: '',
  visitType: category === 'PACKAGE' ? 'HEALTH_CHECKUP' : '',
  appointmentType: '',
  amount: '',
  hourlyRate: '',
  minAdvanceDeposit: '',
  gracePeriodMinutes: '60',
  unit: category === 'BED_CHARGES' ? 'PER_DAY' : category === 'DIAGNOSTICS' ? 'PER_TEST' : category === 'PACKAGE' ? 'PER_PACKAGE' : 'PER_VISIT',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  isExpanded: true,
  errors: {},
  ...overrides,
});

export const TariffRuleForm = ({
  isOpen,
  onClose,
  onSuccess,
  rule = null,
  initialCategory = 'CONSULTATION',
  departments = [],
  services = [],
  floors = [],
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('CONSULTATION');
  const [staffList, setStaffList] = useState([]);
  const [labCatalogTests, setLabCatalogTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEdit = Boolean(rule && rule._id);

  // ── Multi-Rule Builder State ──
  const [rulesList, setRulesList] = useState([createEmptyRule('CONSULTATION')]);

  // ── Single Edit State ──
  const [singleRule, setSingleRule] = useState(createEmptyRule('CONSULTATION'));

  const prevIsOpenRef = useRef(false);
  const prevRuleRef = useRef(null);

  // Fetch staff list & active laboratory catalogs for doctor/test linking
  useEffect(() => {
    if (isOpen) {
      staffAPI.list({ limit: 100 })
        .then((res) => {
          const items = res.data?.items || res.data?.staff || (Array.isArray(res.data) ? res.data : []);
          setStaffList(items);
        })
        .catch((err) => console.warn('Could not load staff list for tariff form:', err));

      api.get('/laboratory/config?includeInactive=false')
        .then((res) => {
          const labs = res.data?.data || res.data?.laboratories || (Array.isArray(res.data) ? res.data : []);
          const tests = [];
          const seenCodes = new Set();
          labs.forEach((l) => {
            (l.testCatalog || []).forEach((t) => {
              const code = (t.testCode || t.code || '').trim().toUpperCase();
              if (code && !seenCodes.has(code)) {
                seenCodes.add(code);
                tests.push({
                  testCode: code,
                  name: t.name || t.testName || code,
                  labName: l.name,
                  departmentId: l.departmentId?._id || l.departmentId || '',
                  sampleType: t.sampleType || t.specimen || '',
                });
              }
            });
          });
          setLabCatalogTests(tests);
        })
        .catch((err) => console.warn('Could not load lab catalog tests for tariff form:', err));
    }
  }, [isOpen]);

  // Initialize or reset state on open
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const ruleChanged = isEdit && rule !== prevRuleRef.current;

    if (isOpen && (justOpened || ruleChanged)) {
      setShowDiscardConfirm(false);
      const defaultCat = initialCategory && initialCategory !== 'ALL' && initialCategory !== 'PHARMACY'
        ? initialCategory
        : 'CONSULTATION';

      setSelectedCategory(defaultCat);

      if (isEdit && rule) {
        setSingleRule({
          id: rule._id,
          ruleNumber: rule.ruleNumber || '',
          name: rule.name || '',
          description: rule.description || '',
          inclusions: rule.inclusions || '',
          category: rule.category || defaultCat,
          serviceMasterId: rule.serviceMasterId?._id || rule.serviceMasterId || '',
          testCode: rule.testCode || '',
          wardClass: rule.scope?.wardClass || '',
          comfortTier: rule.scope?.comfortTier || '',
          sharingType: rule.scope?.sharingType || '',
          floorId: rule.scope?.floorId?._id || rule.scope?.floorId || '',
          departmentId: rule.scope?.departmentId?._id || rule.scope?.departmentId || '',
          tariffGrade: rule.scope?.tariffGrade || '',
          staffId: rule.scope?.staffId?._id || rule.scope?.staffId || '',
          visitType: rule.scope?.visitType || '',
          appointmentType: rule.scope?.appointmentType || '',
          amount: rule.amount != null ? String(rule.amount) : '',
          hourlyRate: rule.scope?.hourlyRate != null ? String(rule.scope.hourlyRate) : '',
          minAdvanceDeposit: rule.scope?.minAdvanceDeposit != null ? String(rule.scope.minAdvanceDeposit) : '',
          gracePeriodMinutes: rule.scope?.gracePeriodMinutes != null ? String(rule.scope.gracePeriodMinutes) : '60',
          unit: rule.unit || (rule.category === 'BED_CHARGES' ? 'PER_DAY' : rule.category === 'DIAGNOSTICS' ? 'PER_TEST' : rule.category === 'PACKAGE' ? 'PER_PACKAGE' : 'PER_VISIT'),
          effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          isExpanded: true,
          errors: {},
        });
      } else {
        setRulesList([createEmptyRule(defaultCat)]);
      }
      setError(null);
    }
    prevIsOpenRef.current = isOpen;
    prevRuleRef.current = rule;
  }, [isOpen, rule, isEdit, initialCategory]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (isEdit) {
      if (!rule) return false;
      return (
        (singleRule.name || '') !== (rule.name || '') ||
        (singleRule.amount || '') !== String(rule.amount ?? '') ||
        (singleRule.category || '') !== (rule.category || '') ||
        (singleRule.departmentId || '') !== (rule.scope?.departmentId?._id || rule.scope?.departmentId || '') ||
        (singleRule.wardClass || '') !== (rule.scope?.wardClass || '')
      );
    } else {
      if (rulesList.length > 1) return true;
      const first = rulesList[0];
      if (!first) return false;
      return Boolean(first.name.trim() || first.amount || first.wardClass || first.testCode || first.inclusions.trim());
    }
  }, [isEdit, rule, singleRule, rulesList]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Intercept Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDiscardConfirm) {
        e.preventDefault();
        e.stopPropagation();
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, showDiscardConfirm]);


  // ══════════════════════════════════════════════════════════════
  // MULTI-RULE BUILDER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleCategorySwitch = (cat) => {
    setSelectedCategory(cat);
    if (!isEdit) {
      // If there's only 1 rule and it's empty, switch its category
      if (rulesList.length === 1 && !rulesList[0].amount && !rulesList[0].wardClass && !rulesList[0].testCode && !rulesList[0].inclusions) {
        setRulesList([createEmptyRule(cat)]);
      }
    }
  };

  const handleAddRuleItem = (overrides = {}) => {
    setRulesList((prev) => [
      ...prev.map((r) => ({ ...r, isExpanded: false })), // collapse earlier cards for clean overview
      createEmptyRule(overrides.category || selectedCategory, overrides),
    ]);
  };

  const handleRemoveRuleItem = (id) => {
    if (rulesList.length <= 1) {
      setRulesList([createEmptyRule(selectedCategory)]);
      return;
    }
    setRulesList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleExpand = (id) => {
    setRulesList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isExpanded: !r.isExpanded } : r))
    );
  };

  // One-click quick suite presets
  const handleSeedCompleteIpdSuite = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRulesList([
      createEmptyRule('REGISTRATION', {
        ruleNumber: 'TR-REG-01',
        name: 'IPD Inpatient Admission Check-in',
        visitType: 'IPD',
        amount: '500',
        unit: 'PER_VISIT',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('CONSULTATION', {
        ruleNumber: 'TR-CON-01',
        name: 'Senior Consultant Inpatient Assessment',
        visitType: 'IPD',
        tariffGrade: 'GRADE_3',
        amount: '600',
        unit: 'PER_VISIT',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('BED_CHARGES', {
        ruleNumber: 'TR-BED-01',
        name: 'General Multi-Bed Ward Standard',
        wardClass: 'GENERAL_WARD',
        comfortTier: 'STANDARD',
        sharingType: 'GENERAL_WARD',
        amount: '1500',
        hourlyRate: '63',
        minAdvanceDeposit: '10000',
        gracePeriodMinutes: '60',
        unit: 'PER_DAY',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('BED_CHARGES', {
        ruleNumber: 'TR-BED-02',
        name: 'ICU Critical Care Deluxe Suite',
        wardClass: 'ICU',
        comfortTier: 'DELUXE',
        sharingType: 'PRIVATE_SINGLE',
        amount: '6500',
        hourlyRate: '271',
        minAdvanceDeposit: '25000',
        gracePeriodMinutes: '60',
        unit: 'PER_DAY',
        effectiveFrom: today,
        isExpanded: true,
      }),
    ]);
    setSelectedCategory('BED_CHARGES');
    showSuccess('IPD Inpatient Suite loaded (4 rules). Review and Publish.');
  };

  const handleSeedCompletePackageSuite = () => {
    const today = new Date().toISOString().slice(0, 10);
    const genMedDept = departments.find((d) => d.name?.includes('General Medicine'))?._id || '';
    const cardioDept = departments.find((d) => d.name?.includes('Cardiology'))?._id || '';
    const nephroDept = departments.find((d) => d.name?.includes('Nephrology'))?._id || '';
    const otDept = departments.find((d) => d.name?.includes('Operation Theatre'))?._id || '';

    setRulesList([
      createEmptyRule('PACKAGE', {
        ruleNumber: 'TR-PKG-01',
        name: 'Executive Master Health Checkup Package',
        departmentId: genMedDept,
        visitType: 'HEALTH_CHECKUP',
        amount: '4999',
        unit: 'PER_PACKAGE',
        inclusions: 'Physician Consult + CBC + LFT + RFT + ECG + Chest X-Ray + Urine Routine',
        description: 'Annual comprehensive preventive health checkup package',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('PACKAGE', {
        ruleNumber: 'TR-PKG-02',
        name: 'Comprehensive Cardiac Wellness Screening',
        departmentId: cardioDept,
        visitType: 'HEALTH_CHECKUP',
        amount: '6500',
        unit: 'PER_PACKAGE',
        inclusions: 'Cardiologist Consult + hs-Troponin + ECG + Echo + Lipid Profile',
        description: 'Advanced cardiovascular risk assessment package',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('PACKAGE', {
        ruleNumber: 'TR-PKG-03',
        name: 'Monthly Hemodialysis Maintenance Package',
        departmentId: nephroDept,
        visitType: 'DAY_CARE',
        amount: '22000',
        unit: 'PER_PACKAGE',
        inclusions: '10 Dialysis Sessions + Bi-weekly RFT & Serum Electrolytes + Nephrologist Review',
        description: 'Subsidized monthly maintenance package for ESRD patients',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('PACKAGE', {
        ruleNumber: 'TR-PKG-04',
        name: 'Daycare Laparoscopic Inguinal Hernia Package',
        departmentId: otDept,
        visitType: 'SURGERY',
        amount: '38000',
        unit: 'PER_PACKAGE',
        inclusions: 'Pre-Op PAC + Laparoscopic Mesh Hernioplasty + 1-Day Semi-Private Recovery + Meds',
        description: 'All-inclusive daycare minimally invasive surgical bundle',
        effectiveFrom: today,
        isExpanded: true,
      }),
    ]);
    setSelectedCategory('PACKAGE');
    showSuccess('Bundled Health & Surgical Packages loaded (4 packages). Review and Publish.');
  };

  const handleSeedCompleteDiagnosticSuite = () => {
    const today = new Date().toISOString().slice(0, 10);
    const labDept = departments.find((d) => d.type === 'DIAGNOSTIC' || d.type === 'BOTH' || d.name?.toLowerCase().includes('pathology') || d.name?.toLowerCase().includes('lab'))?._id || '';

    setRulesList([
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-001',
        name: 'Complete Blood Count (CBC) with Differential',
        testCode: 'CBC-001',
        departmentId: labDept,
        amount: '350',
        unit: 'PER_TEST',
        description: 'Automated 6-part haematology differential cell count & hemoglobin assessment',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-002',
        name: 'Liver Function Test (LFT Panel)',
        testCode: 'LFT-002',
        departmentId: labDept,
        amount: '750',
        unit: 'PER_TEST',
        description: 'Comprehensive liver enzymes (SGOT, SGPT, ALP), bilirubin and total protein panel',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-003',
        name: 'Kidney Function Test (KFT / RFT Panel)',
        testCode: 'KFT-001',
        departmentId: labDept,
        amount: '650',
        unit: 'PER_TEST',
        description: 'Serum creatinine, blood urea nitrogen (BUN), uric acid and serum electrolytes',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-004',
        name: 'Lipid Profile (Complete Heart Risk Panel)',
        testCode: 'LIPID-001',
        departmentId: labDept,
        amount: '600',
        unit: 'PER_TEST',
        description: 'Cholesterol total, HDL, LDL, VLDL and triglyceride fractions',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-005',
        name: 'Thyroid Profile Total (T3, T4, TSH)',
        testCode: 'THYROID-001',
        departmentId: labDept,
        amount: '550',
        unit: 'PER_TEST',
        description: 'CLIA chemiluminescent triiodothyronine, thyroxine and thyroid stimulating hormone',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-006',
        name: 'Complete Urine Routine & Microscopy (CUE)',
        testCode: 'URINE-001',
        departmentId: labDept,
        amount: '200',
        unit: 'PER_TEST',
        description: 'Physical, chemical dipstick and sediment microscopic examination',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-007',
        name: 'Fasting Blood Glucose (FBS)',
        testCode: 'BS-001',
        departmentId: labDept,
        amount: '100',
        unit: 'PER_TEST',
        description: 'Hexokinase / GOD-POD plasma fasting glucose estimation',
        effectiveFrom: today,
        isExpanded: false,
      }),
      createEmptyRule('DIAGNOSTICS', {
        ruleNumber: 'TR-DX-008',
        name: 'Glycated Hemoglobin (HbA1c)',
        testCode: 'HBA1C-001',
        departmentId: labDept,
        amount: '450',
        unit: 'PER_TEST',
        description: 'HPLC-certified whole blood 3-month glycemic control monitoring',
        effectiveFrom: today,
        isExpanded: true,
      }),
    ]);
    setSelectedCategory('DIAGNOSTICS');
    showSuccess('Diagnostic Lab Test Suite loaded (8 standard NABL test rules). Review and Publish.');
  };

  const handleUpdateRuleField = (id, field, value) => {
    setRulesList((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (updated.errors && updated.errors[field]) {
          delete updated.errors[field];
        }

        // Auto calculate hourly rate for bed charges if empty
        if (field === 'amount' && updated.category === 'BED_CHARGES' && (!updated.hourlyRate || Number(updated.hourlyRate) === 0)) {
          const amt = Number(value);
          if (amt > 0) updated.hourlyRate = String(Math.round(amt / 24));
        }

        if (field === 'category') {
          if (value === 'BED_CHARGES') updated.unit = 'PER_DAY';
          else if (value === 'DIAGNOSTICS') updated.unit = 'PER_TEST';
          else if (value === 'PACKAGE') {
            updated.unit = 'PER_PACKAGE';
            if (!updated.visitType) updated.visitType = 'HEALTH_CHECKUP';
          } else updated.unit = 'PER_VISIT';
        }

        return updated;
      })
    );
  };

  const handleUpdateSingleField = (field, value) => {
    setSingleRule((prev) => {
      const updated = { ...prev, [field]: value };
      if (updated.errors && updated.errors[field]) {
        delete updated.errors[field];
      }
      if (field === 'amount' && updated.category === 'BED_CHARGES' && (!updated.hourlyRate || Number(updated.hourlyRate) === 0)) {
        const amt = Number(value);
        if (amt > 0) updated.hourlyRate = String(Math.round(amt / 24));
      }
      if (field === 'category') {
        if (value === 'BED_CHARGES') updated.unit = 'PER_DAY';
        else if (value === 'DIAGNOSTICS') updated.unit = 'PER_TEST';
        else if (value === 'PACKAGE') {
          updated.unit = 'PER_PACKAGE';
          if (!updated.visitType) updated.visitType = 'HEALTH_CHECKUP';
        } else updated.unit = 'PER_VISIT';
      }
      return updated;
    });
  };

  // ══════════════════════════════════════════════════════════════
  // SUBMISSION LOGIC (DRAFT vs PUBLISH NOW)
  // ══════════════════════════════════════════════════════════════
  const buildPayloadFromItem = (item) => {
    const payload = {
      ruleNumber: item.ruleNumber ? item.ruleNumber.trim().toUpperCase() : undefined,
      name: item.name ? item.name.trim() : undefined,
      description: item.description ? item.description.trim() : undefined,
      inclusions: item.inclusions ? item.inclusions.trim() : undefined,
      category: item.category,
      amount: Number(item.amount),
      unit: item.unit || (item.category === 'BED_CHARGES' ? 'PER_DAY' : item.category === 'PACKAGE' ? 'PER_PACKAGE' : 'PER_VISIT'),
      effectiveFrom: item.effectiveFrom || new Date().toISOString().slice(0, 10),
      scope: {
        departmentId: item.departmentId || null,
        tariffGrade: item.tariffGrade || null,
        staffId: item.staffId || null,
        visitType: item.visitType || null,
        appointmentType: item.appointmentType || null,
        wardClass: item.wardClass || null,
        comfortTier: item.comfortTier || null,
        sharingType: item.sharingType || null,
        floorId: item.floorId || null,
        hourlyRate: item.hourlyRate ? Number(item.hourlyRate) : null,
        minAdvanceDeposit: item.minAdvanceDeposit ? Number(item.minAdvanceDeposit) : 0,
        gracePeriodMinutes: item.gracePeriodMinutes ? Number(item.gracePeriodMinutes) : 60,
      },
    };

    if (item.category === 'DIAGNOSTICS') {
      payload.testCode = item.testCode ? item.testCode.trim().toUpperCase() : undefined;
    }
    if (item.serviceMasterId) {
      payload.serviceMasterId = item.serviceMasterId;
    }

    return payload;
  };

  const handleSubmit = async (shouldPublish = false) => {
    setError(null);

    // ── Single Edit Mode ──
    if (isEdit) {
      const errors = {};
      if (singleRule.amount === '' || singleRule.amount === null || isNaN(Number(singleRule.amount)) || Number(singleRule.amount) < 0) {
        errors.amount = 'Valid rate is required (>= 0)';
      }
      if (singleRule.category === 'DIAGNOSTICS' && !singleRule.testCode.trim()) {
        errors.testCode = 'Test Code is required for Diagnostic tariffs';
      }

      if (Object.keys(errors).length > 0) {
        setSingleRule((prev) => ({ ...prev, errors }));
        showError('Please correct the highlighted fields');
        return;
      }

      try {
        setLoading(true);
        const payload = buildPayloadFromItem(singleRule);
        const res = await tariffAPI.updateRule(rule._id, payload);
        const savedId = res.data?.data?._id || res.data?._id || rule._id;

        if (shouldPublish && savedId) {
          await tariffAPI.publishRule(savedId, { reason: 'Published via Tariff Form' });
        }

        setLoading(false);
        const successMsg = shouldPublish
          ? `Tariff rule updated and published successfully.`
          : `Tariff rule draft updated successfully.`;
        if (onSuccess) onSuccess(successMsg);
        showSuccess(successMsg);
        onClose();
      } catch (err) {
        setLoading(false);
        const errMsg = err.response?.data?.message || err.message || 'Error updating tariff rule';
        setError(errMsg);
        showError(errMsg);
      }
      return;
    }

    // ── Multi-Rule Batch Creation Mode ──
    let hasValidationError = false;
    const validatedList = rulesList.map((r) => {
      const errors = {};
      if (r.amount === '' || r.amount === null || isNaN(Number(r.amount)) || Number(r.amount) < 0) {
        errors.amount = 'Amount is required (>= 0)';
      }
      if (r.category === 'DIAGNOSTICS' && !r.testCode.trim()) {
        errors.testCode = 'Lab Test Code is required';
      }
      if (Object.keys(errors).length > 0) {
        hasValidationError = true;
        return { ...r, errors, isExpanded: true };
      }
      return { ...r, errors: {} };
    });

    if (hasValidationError) {
      setRulesList(validatedList);
      showError('Please complete all required fields highlighted in red');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let publishedCount = 0;
      const errorsOccurred = [];

      for (let i = 0; i < rulesList.length; i++) {
        const item = rulesList[i];
        try {
          const payload = buildPayloadFromItem(item);
          const res = await tariffAPI.createRule(payload);
          const createdId = res.data?.data?._id || res.data?._id;
          successCount++;

          if (shouldPublish && createdId) {
            try {
              await tariffAPI.publishRule(createdId, { reason: 'Instant batch publish' });
              publishedCount++;
            } catch (pubErr) {
              console.warn('Batch publish warning:', pubErr);
            }
          }
        } catch (itemErr) {
          errorsOccurred.push(`Rule #${i + 1} (${item.category}): ${itemErr.response?.data?.message || itemErr.message}`);
        }
      }

      setLoading(false);

      if (errorsOccurred.length > 0) {
        const errorMsg = `Encountered issues: ${errorsOccurred.join('; ')}`;
        setError(errorMsg);
        showError(errorMsg);
        if (successCount > 0) {
          onSuccess && onSuccess(`Created ${successCount} rule(s) with some notices.`);
        }
      } else {
        const successMsg = shouldPublish
          ? `${successCount} Tariff Rule${successCount > 1 ? 's' : ''} created & published live.`
          : `${successCount} Tariff Rule${successCount > 1 ? 's' : ''} saved as draft.`;
        if (onSuccess) onSuccess(successMsg);
        showSuccess(successMsg);
        onClose();
      }
    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create tariff rules';
      setError(errMsg);
      showError(errMsg);
    }
  };

  if (!isOpen) return null;

  // ══════════════════════════════════════════════════════════════
  // RENDER CARD FIELDS HELPER
  // ══════════════════════════════════════════════════════════════
  // RENDER PER-CARD INPUT FIELDS
  // ══════════════════════════════════════════════════════════════
  const renderCardFields = (item, onUpdate, isSingle = false) => {
    const isBedCategory = item.category === 'BED_CHARGES';
    const isDiagnostics = item.category === 'DIAGNOSTICS';
    const isConsultation = item.category === 'CONSULTATION';
    const isRegistration = item.category === 'REGISTRATION';
    const isPackage = item.category === 'PACKAGE';
    const filteredServices = services.filter((s) => s.category === item.category);
    const specificityScore = calculateSpecificityScore(item);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Rule Recognition Header (Rule # & Procedure/Tariff Name) */}
        <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)' }}>
          <div className="tariff-form-section-title">
            <span className="material-symbols-rounded">badge</span>
            {isPackage ? 'Health Package Recognition & Deliverables' : 'Rule Recognition & Master Identification'}
          </div>
          <div className="tariff-form-row" style={{ marginTop: '10px' }}>
            <Md3TextField
              label={isPackage ? 'Package Code / Rule #' : 'Rule Code / Number'}
              placeholder={isPackage ? 'e.g. TR-PKG-01 (Auto if blank)' : 'e.g. TR-PRC-01 (Auto if blank)'}
              value={item.ruleNumber || ''}
              onChange={(e) => onUpdate('ruleNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            />
            <Md3TextField
              label={isPackage ? 'Health Package Name *' : 'Tariff / Procedure Name *'}
              placeholder={isPackage ? 'e.g. Executive Master Health Checkup Package' : 'e.g. Major Laparoscopic Cholecystectomy Suite'}
              value={item.name || ''}
              onChange={(e) => onUpdate('name', e.target.value)}
            />
          </div>
          {isPackage && (
            <div className="tariff-form-row" style={{ marginTop: '12px' }}>
              <Md3TextField
                label="Package Inclusions & Deliverables *"
                placeholder="e.g. Physician Consult + CBC + LFT + RFT + ECG + Chest X-Ray + Urine Routine"
                value={item.inclusions || ''}
                onChange={(e) => onUpdate('inclusions', e.target.value)}
              />
            </div>
          )}
          <div className="tariff-form-row" style={{ marginTop: '12px' }}>
            <Md3TextField
              label="Description / Clinical Billing Notes (Optional)"
              placeholder={isPackage ? 'e.g. Comprehensive annual executive full body screening suite' : 'e.g. Includes OT anesthesia suite, consumable bundle, surgeon primary fee'}
              value={item.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
            />
          </div>
        </div>

        {/* Category Selector (Single mode or card switcher) */}
        <div className="tariff-form-row">
          <Md3Select
            label="Tariff Category *"
            value={item.category}
            onChange={(e) => onUpdate('category', e.target.value)}
            disabled={loading || (isSingle && isEdit && rule?.status !== 'DRAFT')}
            options={CATEGORIES.map((c) => ({ value: c.value, label: `${c.label}` }))}
          />

          {isDiagnostics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: labCatalogTests.length > 0 ? '1.2fr 1fr' : '1fr', gap: '10px' }}>
                {labCatalogTests.length > 0 && (
                  <Md3Select
                    label="Link Configured Lab Catalog Test"
                    value={labCatalogTests.some((t) => t.testCode === item.testCode) ? item.testCode : ''}
                    onChange={(e) => {
                      const selectedCode = e.target.value;
                      if (selectedCode) {
                        const matched = labCatalogTests.find((t) => t.testCode === selectedCode);
                        if (matched) {
                          onUpdate('testCode', matched.testCode);
                          if (!item.name || item.name.includes('Diagnostic') || item.name.includes('Test') || item.name.trim() === '') {
                            onUpdate('name', `${matched.name} Diagnostic Tariff`);
                          }
                          if (matched.departmentId && !item.departmentId) {
                            onUpdate('departmentId', matched.departmentId);
                          }
                        }
                      }
                    }}
                    disabled={loading}
                    options={[
                      { value: '', label: 'Select configured lab test (or enter custom code)...' },
                      ...labCatalogTests.map((t) => ({
                        value: t.testCode,
                        label: `${t.name} [${t.testCode}]${t.labName ? ` · ${t.labName}` : ''}`,
                      })),
                    ]}
                  />
                )}
                <Md3TextField
                  label="Lab Test Code * (e.g. CBC-001)"
                  placeholder="CBC-001, LFT-002, KFT-001..."
                  value={item.testCode}
                  onChange={(e) => onUpdate('testCode', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  error={item.errors?.testCode}
                  required
                />
              </div>
            </div>
          ) : !isBedCategory && (
            <Md3Select
              label="Service Master (Optional)"
              value={item.serviceMasterId}
              onChange={(e) => onUpdate('serviceMasterId', e.target.value)}
              disabled={loading}
              options={[
                { value: '', label: 'General / Unlinked' },
                ...filteredServices.map((s) => ({ value: s._id, label: `${s.name} (${s.code})` })),
              ]}
            />
          )}
        </div>

        {/* ── Spatial & Bed Hierarchy Scope ── */}
        {isBedCategory ? (
          <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)' }}>
            <div className="tariff-form-section-title">
              <span className="material-symbols-rounded">hotel</span>
              Bed Comfort, Ward Classification & Spatial Scope
            </div>

            <div className="tariff-form-row" style={{ marginTop: '10px' }}>
              <Md3Select
                label="Ward Classification *"
                value={item.wardClass}
                onChange={(e) => onUpdate('wardClass', e.target.value)}
                disabled={loading}
                options={WARD_CLASSES}
              />
              <Md3Select
                label="Comfort Hierarchy Tier"
                value={item.comfortTier}
                onChange={(e) => onUpdate('comfortTier', e.target.value)}
                disabled={loading}
                options={COMFORT_TIERS}
              />
            </div>

            <div className="tariff-form-row" style={{ marginTop: '12px' }}>
              <Md3Select
                label="Sharing Configuration"
                value={item.sharingType}
                onChange={(e) => onUpdate('sharingType', e.target.value)}
                disabled={loading}
                options={SHARING_TYPES}
              />
              <Md3Select
                label="Floor / Wing (Optional)"
                value={item.floorId}
                onChange={(e) => onUpdate('floorId', e.target.value)}
                disabled={loading}
                options={[
                  { value: '', label: 'All Floors (Hospital-wide)' },
                  ...floors.map((f) => ({ value: f._id, label: f.floorName || `Floor ${f.floorNumber}` })),
                ]}
              />
            </div>

            <div className="tariff-form-row" style={{ marginTop: '12px' }}>
              <Md3Select
                label="Applicable Clinical Flow"
                value={item.visitType}
                onChange={(e) => onUpdate('visitType', e.target.value)}
                disabled={loading}
                options={VISIT_TYPES}
              />
            </div>
          </div>
        ) : (
          /* ── General Scope (Consultation / Registration / Diagnostics / Procedure) ── */
          <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)' }}>
            <div className="tariff-form-section-title">
              <span className="material-symbols-rounded">tune</span>
              Pricing Scope & Applicability (IPD, OPD, ER & Surgery)
            </div>

            <div className="tariff-form-row" style={{ marginTop: '10px' }}>
              <Md3Select
                label="Department Scope"
                value={item.departmentId}
                onChange={(e) => onUpdate('departmentId', e.target.value)}
                disabled={loading}
                options={[
                  { value: '', label: 'All Departments (Hospital-wide)' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />

              {isConsultation && (
                <Md3Select
                  label="Staff Tariff Grade"
                  value={item.tariffGrade}
                  onChange={(e) => onUpdate('tariffGrade', e.target.value)}
                  disabled={loading}
                  options={TARIFF_GRADES}
                />
              )}

              {isConsultation && (
                <Md3Select
                  label="Consulting Doctor / Staff (Optional Override)"
                  value={item.staffId || ''}
                  onChange={(e) => {
                    const sId = e.target.value;
                    onUpdate('staffId', sId);
                    if (sId) {
                      const doc = staffList.find((s) => s._id === sId);
                      if (doc) {
                        if (!item.name || item.name.includes('Consultation') || item.name.includes('Doctor')) {
                          onUpdate('name', `${doc.fullName} (${doc.position || doc.roleId?.name || 'Doctor'}) Consultation`);
                        }
                        if (doc.departmentId?._id || doc.departmentId) {
                          onUpdate('departmentId', doc.departmentId?._id || doc.departmentId);
                        }
                        if (doc.tariffGrade) {
                          onUpdate('tariffGrade', doc.tariffGrade);
                        }
                        if (doc.consultingFee && (!item.amount || Number(item.amount) === 0)) {
                          onUpdate('amount', String(doc.consultingFee));
                        }
                      }
                    }
                  }}
                  disabled={loading}
                  options={[
                    { value: '', label: 'All Doctors in Grade / Department (Institutional)' },
                    ...staffList
                      .filter((s) => s.roleId?.name === 'Doctor' || s.roleId?.name === 'Surgeon' || s.consultingFee > 0 || s.tariffGrade)
                      .map((s) => ({
                        value: s._id,
                        label: `${s.fullName} (${s.tariffGrade ? `${s.tariffGrade} · ` : ''}Rank ${s.positionRank || 1} · ${s.position || s.roleId?.name || 'Staff'})`,
                      })),
                  ]}
                />
              )}

              {isDiagnostics && (
                <Md3Select
                  label="Service Master (Optional)"
                  value={item.serviceMasterId}
                  onChange={(e) => onUpdate('serviceMasterId', e.target.value)}
                  disabled={loading}
                  options={[
                    { value: '', label: 'General / Unlinked' },
                    ...filteredServices.map((s) => ({ value: s._id, label: `${s.name} (${s.code})` })),
                  ]}
                />
              )}
            </div>

            <div className="tariff-form-row" style={{ marginTop: '12px' }}>
              <Md3Select
                label="Visit Type / Clinical Workflow *"
                value={item.visitType}
                onChange={(e) => onUpdate('visitType', e.target.value)}
                disabled={loading}
                options={VISIT_TYPES}
              />
              <Md3Select
                label="Appointment Type"
                value={item.appointmentType}
                onChange={(e) => onUpdate('appointmentType', e.target.value)}
                disabled={loading}
                options={[
                  { value: '', label: 'All Appointment Types' },
                  { value: 'WALK_IN', label: 'Walk-in' },
                  { value: 'FOLLOW_UP', label: 'Follow-up' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                ]}
              />
            </div>
          </div>
        )}

        {/* ── Pricing & Rates Controls ── */}
        <div>
          <div className="tariff-form-section-title">
            <span className="material-symbols-rounded">payments</span>
            {isBedCategory ? 'Bed Rates, Advance Deposit & Effective Period' : 'Tariff Amount & Effective Period'}
          </div>

          {isBedCategory ? (
            <>
              <div className="tariff-form-row" style={{ marginTop: '10px' }}>
                <Md3TextField
                  label={`Daily Rate (${CURRENCY_SYMBOL}/day) *`}
                  type="number"
                  min="0"
                  placeholder="2500"
                  value={item.amount}
                  onChange={(e) => onUpdate('amount', e.target.value)}
                  error={item.errors?.amount}
                  required
                />
                <Md3TextField
                  label={`Hourly Rate (${CURRENCY_SYMBOL}/hr)`}
                  type="number"
                  min="0"
                  placeholder="110"
                  value={item.hourlyRate}
                  onChange={(e) => onUpdate('hourlyRate', e.target.value)}
                />
              </div>
              <div className="tariff-form-row" style={{ marginTop: '12px' }}>
                <Md3TextField
                  label={`Min Advance Deposit (${CURRENCY_SYMBOL})`}
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={item.minAdvanceDeposit}
                  onChange={(e) => onUpdate('minAdvanceDeposit', e.target.value)}
                />
                <Md3TextField
                  label="Grace Period (Minutes)"
                  type="number"
                  min="0"
                  value={item.gracePeriodMinutes}
                  onChange={(e) => onUpdate('gracePeriodMinutes', e.target.value)}
                />
              </div>
              <div className="tariff-form-row" style={{ marginTop: '12px' }}>
                <Md3TextField
                  label="Effective From *"
                  type="date"
                  value={item.effectiveFrom}
                  onChange={(e) => onUpdate('effectiveFrom', e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="tariff-form-row" style={{ marginTop: '10px' }}>
              <Md3TextField
                label={`Rate (${CURRENCY_SYMBOL}) *`}
                type="number"
                min="0"
                step="1"
                placeholder="500"
                value={item.amount}
                onChange={(e) => onUpdate('amount', e.target.value)}
                error={item.errors?.amount}
                required
              />
              <Md3Select
                label="Billing Unit *"
                value={item.unit}
                onChange={(e) => onUpdate('unit', e.target.value)}
                disabled={loading}
                options={[
                  { value: 'PER_VISIT', label: 'Per Visit' },
                  { value: 'PER_TEST', label: 'Per Test' },
                  { value: 'PER_PROCEDURE', label: 'Per Procedure' },
                  { value: 'PER_PACKAGE', label: 'Per Package' },
                  { value: 'PER_ITEM', label: 'Per Item' },
                  { value: 'PER_DAY', label: 'Per Day' },
                ]}
              />
              <Md3TextField
                label="Effective From *"
                type="date"
                value={item.effectiveFrom}
                onChange={(e) => onUpdate('effectiveFrom', e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* ── Specificity Score & Impact Preview Banner ── */}
        <div className="tariff-impact-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>
              priority_high
            </span>
            <span>Tariff Specificity Match Priority:</span>
          </div>
          <div className="tariff-impact-score">
            {specificityScore > 0 ? `+${specificityScore} pts (High Specificity)` : '0 pts (Hospital Baseline)'}
          </div>
        </div>
      </div>
    );
  };

  const activeCategoryObj = CATEGORIES.find((c) => c.value === selectedCategory) || CATEGORIES[0];

  return createPortal(
    <>
      <div className="tariff-sheet-backdrop" onClick={handleAttemptClose}>
        <div className="tariff-sheet-container" onClick={(e) => e.stopPropagation()}>
          {/* ── 1. Sheet Header ── */}
          <div className="tariff-sheet-header">
            <div className="tariff-sheet-header__top">
              <div className="tariff-sheet-header__title-group">
                <span className="material-symbols-rounded tariff-sheet-header__icon">
                  {isEdit ? 'edit_document' : activeCategoryObj.icon}
                </span>
                <div>
                  <h2 className="tariff-sheet-header__title">
                    {isEdit ? 'Edit Tariff Rule' : 'Configure Hospital Tariffs'}
                  </h2>
                  <p className="tariff-sheet-header__desc">
                    {isEdit
                      ? 'Modify pricing parameters and scope hierarchy'
                      : 'Centralized master pricing engine for IPD, OPD, Emergency, Surgery & Diagnostics'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="tariff-sheet-header__close-btn"
                onClick={handleAttemptClose}
                title="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>


          {/* Quick-switch category chips */}
          {!isEdit && (
            <div className="tariff-category-selector">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`tariff-category-chip ${selectedCategory === cat.value ? 'tariff-category-chip--active' : ''}`}
                  onClick={() => handleCategorySwitch(cat.value)}
                >
                  <span className="material-symbols-rounded">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 2. Scrollable Body ── */}
        <div className="tariff-sheet-body">
          {error && (
            <div className="tariff-error-banner">
              <Icon.Alert />
              <span>{error}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              MODE A: SINGLE EDIT
             ════════════════════════════════════════════════════════════ */}
          {isEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {renderCardFields(singleRule, handleUpdateSingleField, true)}
              <div className="tariff-lifecycle-banner">
                <span className="material-symbols-rounded">info</span>
                <div>
                  <strong>Lifecycle Notice:</strong> Updating and publishing a tariff rule will immediately supersede any previous matching rule for this scope across all billing modules.
                </div>
              </div>
            </div>
          ) : (
            /* ════════════════════════════════════════════════════════════
                MODE B: MULTI-RULE BATCH ACCORDION BUILDER
               ════════════════════════════════════════════════════════════ */
            <div className="tariff-accordion-section">
              <div className="tariff-section-header">
                <span className="tariff-section-title">
                  Configured Tariff Rules ({rulesList.length})
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tariff-category-chip"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}
                    onClick={handleSeedCompleteIpdSuite}
                    title="Load IPD Registration, Consultant Round, and Ward/ICU Bed Tariffs in 1 click"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>hotel</span>
                    <span>+ Load IPD Suite Preset</span>
                  </button>
                  <button
                    type="button"
                    className="tariff-category-chip"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--md-sys-color-secondary-container, #d5e4f7)', color: 'var(--md-sys-color-on-secondary-container, #0d324f)' }}
                    onClick={handleSeedCompleteDiagnosticSuite}
                    title="Load standard NABL Laboratory Diagnostic Test Tariffs (CBC, LFT, KFT, Lipid, Thyroid, Urine, Sugar, HbA1c) in 1 click"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>biotech</span>
                    <span>+ Load Diagnostic Test Suite</span>
                  </button>
                  <button
                    type="button"
                    className="tariff-category-chip"
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--md-sys-color-tertiary-container, #ffd8e4)', color: 'var(--md-sys-color-on-tertiary-container, #31111d)' }}
                    onClick={handleSeedCompletePackageSuite}
                    title="Load Executive, Cardiac, Dialysis, and Laparoscopic Hernia Health Packages in 1 click"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>inventory_2</span>
                    <span>+ Load Health Package Presets</span>
                  </button>
                </div>
              </div>

              <div className="tariff-accordion-list">
                {rulesList.map((item, idx) => {
                  const catObj = CATEGORIES.find((c) => c.value === item.category);
                  const specificity = calculateSpecificityScore(item);
                  const isBed = item.category === 'BED_CHARGES';

                  let titleLabel = item.name ? item.name : item.category;
                  if (!item.name) {
                    if (isBed) {
                      titleLabel = item.wardClass ? `[${item.wardClass}] Bed Tariff` : 'Bed & Ward Tariff';
                    } else if (item.category === 'REGISTRATION') {
                      titleLabel = item.visitType ? `[${item.visitType}] Registration Fee` : 'Hospital Registration Fee';
                    } else if (item.category === 'CONSULTATION') {
                      const deptObj = departments.find((d) => d._id === item.departmentId);
                      titleLabel = deptObj ? `[${deptObj.name}] Consultation` : (item.visitType ? `[${item.visitType}] Consultation` : 'Consultation Tariff');
                    } else if (item.category === 'DIAGNOSTICS') {
                      titleLabel = item.testCode ? `[${item.testCode}] Lab Diagnostic` : 'Lab Diagnostic Tariff';
                    } else if (item.serviceMasterId) {
                      const sObj = services.find((s) => s._id === item.serviceMasterId);
                      titleLabel = sObj ? `[${sObj.name}] Procedure` : 'Procedure Tariff';
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      className={`tariff-accordion-card ${item.isExpanded ? 'tariff-accordion-card--expanded' : ''} ${Object.keys(item.errors || {}).length > 0 ? 'tariff-accordion-card--error' : ''}`}
                    >
                      {/* Accordion Card Header */}
                      <div
                        className="tariff-accordion-header"
                        onClick={() => handleToggleExpand(item.id)}
                      >
                        <div className="tariff-accordion-header__left">
                          <span className="tariff-item-badge">#{idx + 1}</span>
                          {item.ruleNumber && (
                            <span className="tariff-rule-number-badge">{item.ruleNumber}</span>
                          )}
                          <div className="tariff-accordion-header__titles">
                            <div className="tariff-accordion-header__main">
                              <span>{titleLabel}</span>
                              {item.amount !== '' && item.amount !== null && !isNaN(Number(item.amount)) && (
                                <span className={`tariff-rate-chip ${Number(item.amount) === 0 ? 'tariff-rate-chip--free' : ''}`}>
                                  {Number(item.amount) === 0 ? `Free (${CURRENCY_SYMBOL}0)` : `${CURRENCY_SYMBOL}${item.amount}`}/{item.unit?.replace('PER_', '').toLowerCase()}
                                </span>
                              )}
                            </div>
                            <div className="tariff-accordion-header__sub">
                              <span>{catObj?.label || item.category}</span>
                              {item.visitType && <span>• {item.visitType}</span>}
                              {specificity > 0 && (
                                <span className="tariff-specificity-tag">
                                  +{specificity} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="tariff-accordion-header__actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rulesList.length > 1 && (
                            <button
                              type="button"
                              className="tariff-item-btn tariff-item-btn--delete"
                              title="Delete this rule"
                              onClick={() => handleRemoveRuleItem(item.id)}
                            >
                              <span className="material-symbols-rounded">delete_outline</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="tariff-item-btn"
                            title={item.isExpanded ? 'Collapse' : 'Expand'}
                            onClick={() => handleToggleExpand(item.id)}
                          >
                            <span className="material-symbols-rounded">
                              {item.isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Accordion Card Body */}
                      {item.isExpanded && (
                        <div className="tariff-accordion-body">
                          {renderCardFields(item, (field, val) => handleUpdateRuleField(item.id, field, val))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Centered Add Another Tariff Rule Trigger Button */}
              <div className="tariff-add-trigger-row">
                <button
                  type="button"
                  className="tariff-add-another-btn"
                  onClick={() => handleAddRuleItem()}
                >
                  <span className="material-symbols-rounded">add_circle</span>
                  <span>Add Another Tariff Rule</span>
                </button>
              </div>

              <div className="tariff-lifecycle-banner">
                <span className="material-symbols-rounded">info</span>
                <div>
                  <strong>Centralized Money Management:</strong> These tariff rules automatically govern IPD Admissions, Bed Stay calculations, OPD Registrations, Surgeries, and Lab tests. Individual departments and rooms dynamically inherit these rates with zero manual price typing.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Sticky Sheet Footer ── */}
        <div className="tariff-sheet-footer">
          <Md3Button variant="text" type="button" onClick={handleAttemptClose} disabled={loading}>
            Cancel
          </Md3Button>
          <div className="tariff-sheet-footer__right">
            <Md3Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              loading={loading}
              loadingText="Saving Draft…"
            >
              {isEdit ? 'Save Draft Changes' : 'Save as Draft'}
            </Md3Button>
            <Md3Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              loading={loading}
              loadingText="Publishing…"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                publish
              </span>
              {isEdit
                ? 'Update & Publish'
                : `Save & Publish ${rulesList.length} Rule${rulesList.length > 1 ? 's' : ''}`}
            </Md3Button>
          </div>
        </div>
      </div>
    </div>

    <Md3UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      title="Discard unsaved tariff rules?"
      message={isEdit
        ? "You have unsaved changes to this tariff rule. Are you sure you want to discard your edits?"
        : "You have uncommitted tariff rules in this builder. If you exit now, your unsaved progress will be lost."
      }
      confirmLabel="Discard & Exit"
      cancelLabel="Keep Editing"
      onConfirm={handleConfirmDiscard}
      onCancel={() => setShowDiscardConfirm(false)}
    />
  </>,
  document.body
);
};

export default TariffRuleForm;

