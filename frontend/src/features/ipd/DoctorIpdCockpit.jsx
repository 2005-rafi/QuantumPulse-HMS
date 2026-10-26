/**
 * features/ipd/DoctorIpdCockpit.jsx
 * Enterprise Material 3 Inpatient Clinical Workstation & Cockpit
 * (CPOE Orders, SOAP Ward Rounds, OT Booking, 3-Way Discharge Governance).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import IpdTelemetryDetailDialog from './IpdTelemetryDetailDialog';
import IpdPatientQueue from './IpdPatientQueue';
import DoctorIpdHistoryManager from './DoctorIpdHistoryManager';
import { Md3Button, Md3TextField, Md3TextArea, Md3Select } from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import { useToast } from '../../context/ToastContext';
import { usePatientStatus } from '../../context/PatientStatusContext';
import { formatPatientName, formatDoctorName } from '../../utils/patientFormatters';
import ipdApi from '../../services/ipdApi';
import './DoctorIpdCockpit.css';

const LAB_CATALOG_SAMPLE = [
  { code: 'CBC', name: 'Complete Blood Count (CBC)', dept: 'HAEMATOLOGY' },
  { code: 'LFT', name: 'Liver Function Test (LFT)', dept: 'BIOCHEMISTRY' },
  { code: 'RFT', name: 'Renal Function Test (RFT)', dept: 'BIOCHEMISTRY' },
  { code: 'SERUM_ELECTROLYTES', name: 'Serum Electrolytes (Na/K/Cl)', dept: 'BIOCHEMISTRY' },
  { code: 'BLOOD_GLUCOSE_RBS', name: 'Random Blood Sugar (RBS)', dept: 'BIOCHEMISTRY' },
  { code: 'URINE_ROUTINE', name: 'Urine Routine & Microscopy', dept: 'PATHOLOGY' },
  { code: 'CHEST_XRAY', name: 'Chest X-Ray (PA View)', dept: 'RADIOLOGY' },
  { code: 'ECG_12_LEAD', name: '12-Lead Electrocardiogram (ECG)', dept: 'CARDIOLOGY' },
  { code: 'ABG', name: 'Arterial Blood Gas (ABG)', dept: 'CRITICAL_CARE' },
  { code: 'PT_INR', name: 'Coagulation Profile (PT/INR)', dept: 'HAEMATOLOGY' },
];

export const DoctorIpdCockpit = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const { subscribeToLedgerUpdates, subscribeToStatusChanges } = usePatientStatus();

  // Simple Reusable Dialog Box for User Notifications
  const [notifyDialog, setNotifyDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info', // 'success' | 'danger' | 'warning' | 'info'
    confirmLabel: 'OK',
  });

  const showNotificationDialog = (title, message, variant = 'info', confirmLabel = 'OK') => {
    setNotifyDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmLabel,
    });
  };

  const closeNotificationDialog = () => {
    setNotifyDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const [admissionList, setAdmissionList] = useState([]);
  const [currentAdmission, setCurrentAdmission] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wardRounds, setWardRounds] = useState([]);
  const [clearance, setClearance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [gatePassData, setGatePassData] = useState(null);

  // Queue Rail / Mobile Drawer State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active Telemetry Drilldown Modal: null | 'ADMITTED' | 'CRITICAL' | 'ROUNDS' | 'DISCHARGE'
  const [activeTelemetryModal, setActiveTelemetryModal] = useState(null);

  // Ward filter & search
  const [selectedWardFilter, setSelectedWardFilter] = useState('ALL'); // ALL, ICU_CCU, HDU, GENERAL
  const [patientSearch, setPatientSearch] = useState('');

  // View Mode: 'COCKPIT' (Active live beds) | 'HISTORY' (Case archival & history)
  const [viewMode, setViewMode] = useState('COCKPIT');

  // Tabs: 'ROUNDS' | 'CPOE' | 'DISCHARGE'
  const [activeTab, setActiveTab] = useState('ROUNDS');

  // CPOE Sub-Tabs: 'MEDICATION' | 'LAB' | 'DIET' | 'OT'
  const [cpoeSubTab, setCpoeSubTab] = useState('MEDICATION');

  // SOAP Round Form
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [savingRound, setSavingRound] = useState(false);

  // CPOE Medication Order Form
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('ORAL');
  const [freq, setFreq] = useState('TDS');
  const [medInstructions, setMedInstructions] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // CDSS Drug-Allergy Safety Interceptor Dialog State
  const [cdssAlert, setCdssAlert] = useState({
    isOpen: false,
    message: '',
    details: {},
    overrideReason: '',
    pendingOrder: null,
  });

  // CPOE Lab Order Form
  const [selectedLabTest, setSelectedLabTest] = useState('');
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [labClinicalNotes, setLabClinicalNotes] = useState('');

  // CPOE Diet Form
  const [selectedDietTier, setSelectedDietTier] = useState('REGULAR_DIET');
  const [dietInstructions, setDietInstructions] = useState('');

  // CPOE OT Request Form
  const [otProcedureName, setOtProcedureName] = useState('');
  const [otSurgeryType, setOtSurgeryType] = useState('ELECTIVE');
  const [otUrgency, setOtUrgency] = useState('ROUTINE');
  const [otScheduledDate, setOtScheduledDate] = useState('');
  const [otScheduledTime, setOtScheduledTime] = useState('09:00');
  const [otAnesthesiaType, setOtAnesthesiaType] = useState('GENERAL');
  const [otSpecialNotes, setOtSpecialNotes] = useState('');
  const [otRooms, setOtRooms] = useState([]);

  // Discharge Form
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [courseInHospital, setCourseInHospital] = useState('');
  const [dischargeAdvice, setDischargeAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [initiatingDischarge, setInitiatingDischarge] = useState(false);
  const [isEditingDischargeSummary, setIsEditingDischargeSummary] = useState(false);

  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
        const list = res.data?.data || [];
        setAdmissionList(list);
        if (!admissionId && list.length > 0) {
          navigate(`/dashboard/doctor/ipd/${list[0]._id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load active admissions:', err);
      }
    };
    fetchAdmissions();
  }, [admissionId, navigate]);

  // Load OT rooms metadata
  useEffect(() => {
    const loadOtRooms = async () => {
      try {
        const res = await ipdApi.getRooms();
        const allRooms = res.data?.data || [];
        const otOnly = allRooms.filter(r => r.roomType === 'OT' || r.roomType === 'OPERATING_THEATRE');
        setOtRooms(otOnly.length > 0 ? otOnly : allRooms);
      } catch {
        setOtRooms([]);
      }
    };
    loadOtRooms();
  }, []);

  const loadData = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const [admRes, ordRes, roundRes, clearRes] = await Promise.allSettled([
        ipdApi.getAdmissionById(admissionId),
        ipdApi.getCpoeOrders(admissionId),
        ipdApi.getWardRounds(admissionId),
        ipdApi.getClearance(admissionId),
      ]);

      if (admRes.status === 'fulfilled') {
        const adm = admRes.value.data?.data || null;
        setCurrentAdmission(adm);
        if (adm?.provisionalDiagnosis && !finalDiagnosis) {
          setFinalDiagnosis(adm.provisionalDiagnosis);
        }
      }
      if (ordRes.status === 'fulfilled') {
        setOrders(ordRes.value.data?.data || []);
      }
      if (roundRes.status === 'fulfilled') {
        setWardRounds(roundRes.value.data?.data || []);
      }
      if (clearRes.status === 'fulfilled') {
        setClearance(clearRes.value.data?.data || null);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load physician cockpit data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [admissionId]);

  // Real-Time Reactive Push Synchronization for IPD Clearance & Financial Settlement
  useEffect(() => {
    if (!subscribeToLedgerUpdates) return;
    const unsubLedger = subscribeToLedgerUpdates((payload) => {
      if (!payload) return;
      if (!admissionId || String(payload.admissionId) === String(admissionId)) {
        loadData();
      }
    });

    const unsubStatus = subscribeToStatusChanges ? subscribeToStatusChanges(() => {
      handleRefreshQueue();
    }) : null;

    return () => {
      if (unsubLedger) unsubLedger();
      if (unsubStatus) unsubStatus();
    };
  }, [admissionId, subscribeToLedgerUpdates, subscribeToStatusChanges]);

  // Telemetry metric counters
  const telemetry = useMemo(() => {
    const totalAdmitted = admissionList.length;
    let criticalCount = 0;
    let dischargePendingCount = 0;

    admissionList.forEach((adm) => {
      const ward = (adm.currentBedId?.wardClass || adm.currentBedId?.wardType || '').toUpperCase();
      if (ward.includes('ICU') || ward.includes('CCU') || ward.includes('HDU')) {
        criticalCount++;
      }
      if (adm.status === 'DISCHARGE_INITIATED' || adm.dischargeSummary?.finalDiagnosis) {
        dischargePendingCount++;
      }
    });

    return {
      totalAdmitted,
      criticalCount,
      roundsCount: wardRounds.length,
      dischargePendingCount,
    };
  }, [admissionList, wardRounds]);

  // Filtered admissions based on search & ward chip
  const filteredAdmissions = useMemo(() => {
    return admissionList.filter((adm) => {
      const patient = adm.patientId || {};
      const fullName = formatPatientName(patient).toLowerCase();
      const mrn = (patient.mrn || '').toLowerCase();
      const bedLabel = (adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '').toLowerCase();
      const ward = (adm.currentBedId?.wardClass || adm.currentBedId?.wardType || '').toUpperCase();

      const matchesSearch = !patientSearch || fullName.includes(patientSearch.toLowerCase()) || mrn.includes(patientSearch.toLowerCase()) || bedLabel.includes(patientSearch.toLowerCase());

      let matchesWard = true;
      if (selectedWardFilter === 'ICU_CCU') {
        matchesWard = ward.includes('ICU') || ward.includes('CCU');
      } else if (selectedWardFilter === 'HDU') {
        matchesWard = ward.includes('HDU');
      } else if (selectedWardFilter === 'GENERAL') {
        matchesWard = !ward.includes('ICU') && !ward.includes('CCU') && !ward.includes('HDU');
      }

      return matchesSearch && matchesWard;
    });
  }, [admissionList, patientSearch, selectedWardFilter]);

  // Submit SOAP Round
  const handleSaveRound = async (e) => {
    e.preventDefault();
    if (!subjective.trim() || !assessment.trim() || !plan.trim()) {
      showNotificationDialog(
        'Incomplete Ward Round Note',
        'Please fill out the Subjective, Assessment, and Plan fields before saving.',
        'warning'
      );
      return;
    }

    setSavingRound(true);
    try {
      await ipdApi.recordWardRound(admissionId, {
        subjective,
        objective,
        assessment,
        plan,
      });
      setSubjective('');
      setObjective('');
      setAssessment('');
      setPlan('');
      await loadData();
      showNotificationDialog(
        'Ward Round Recorded',
        'Daily SOAP ward round note recorded successfully.',
        'success'
      );
      showSuccess('Ward Round Recorded', 'Daily SOAP note added to patient stay history.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record round note';
      showNotificationDialog('Ward Round Error', msg, 'danger');
      showError('Ward Round Failed', msg);
    } finally {
      setSavingRound(false);
    }
  };

  // Submit CPOE Medication
  const handleSaveMedOrder = async (e) => {
    e.preventDefault();
    if (!medName.trim() || !dosage.trim()) {
      showNotificationDialog(
        'Missing Information',
        'Medication Name and Dosage are required to place an order.',
        'warning'
      );
      return;
    }

    const payload = {
      orderType: 'MEDICATION',
      medication: {
        name: medName.trim(),
        dosage: dosage.trim(),
        route,
        frequency: freq,
        instructions: medInstructions.trim(),
      },
    };

    setSavingOrder(true);
    try {
      await ipdApi.createCpoeOrder(admissionId, payload);
      setMedName('');
      setDosage('');
      setMedInstructions('');
      await loadData();
      showNotificationDialog(
        'Medication Prescribed',
        'Medication ordered successfully. Dose schedule automatically appended to Nursing e-MAR.',
        'success'
      );
      showSuccess('Medication Ordered', 'Prescription active on patient e-MAR.');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errorCode === 'CDSS_001') {
        // CDSS Drug-Allergy Safety Interception
        setCdssAlert({
          isOpen: true,
          message: errData.message || 'Critical Drug-Allergy Contraindication detected.',
          details: errData.details || {},
          overrideReason: '',
          pendingOrder: payload,
        });
      } else {
        const msg = errData?.message || 'Failed to place medication order';
        showNotificationDialog('Prescription Error', msg, 'danger');
        showError('Order Failed', msg);
      }
    } finally {
      setSavingOrder(false);
    }
  };

  // Confirm CDSS Drug-Allergy Safety Override with clinical justification
  const handleConfirmCdssOverride = async () => {
    if (!cdssAlert.overrideReason.trim()) {
      showWarning(
        'Override Reason Required',
        'Please enter a documented clinical justification to override this CDSS allergy warning.'
      );
      return;
    }

    setSavingOrder(true);
    try {
      await ipdApi.createCpoeOrder(admissionId, {
        ...cdssAlert.pendingOrder,
        clinicalOverrideReason: cdssAlert.overrideReason.trim(),
      });
      setCdssAlert((prev) => ({ ...prev, isOpen: false }));
      setMedName('');
      setDosage('');
      setMedInstructions('');
      await loadData();
      showNotificationDialog(
        'Prescription Saved with Override',
        'Medication ordered with documented clinical override. Safety intercept logged in hospital audit trail.',
        'warning'
      );
      showSuccess('Prescription Logged', 'Clinical override recorded in audit trail.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit clinical override';
      showNotificationDialog('Override Failed', msg, 'danger');
      showError('Override Failed', msg);
    } finally {
      setSavingOrder(false);
    }
  };

  // Submit CPOE Lab Order
  const handleSaveLabOrder = async (e) => {
    e.preventDefault();
    if (!selectedLabTest) {
      showNotificationDialog(
        'Investigation Required',
        'Please select a diagnostic / laboratory investigation from the catalog.',
        'warning'
      );
      return;
    }

    setSavingOrder(true);
    try {
      await ipdApi.createCpoeOrder(admissionId, {
        orderType: 'DIAGNOSTIC',
        testName: selectedLabTest,
        priority: labPriority,
        instructions: labClinicalNotes,
      });
      setSelectedLabTest('');
      setLabClinicalNotes('');
      await loadData();
      showNotificationDialog(
        'Laboratory Order Placed',
        'Diagnostic requisition submitted and routed to Laboratory Phlebotomy queue.',
        'success'
      );
      showSuccess('Diagnostic Order Placed', 'Test routed to Pathology queue.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place laboratory order';
      showNotificationDialog('Laboratory Order Error', msg, 'danger');
      showError('Order Failed', msg);
    } finally {
      setSavingOrder(false);
    }
  };

  // Submit CPOE Diet
  const handleSaveDietOrder = async (e) => {
    e.preventDefault();
    setSavingOrder(true);
    try {
      await ipdApi.createCpoeOrder(admissionId, {
        orderType: 'DIET',
        dietTier: selectedDietTier,
        instructions: dietInstructions,
      });
      setDietInstructions('');
      await loadData();
      showNotificationDialog(
        'Diet Order Updated',
        'Clinical diet prescription updated successfully for ward nursing & pantry.',
        'success'
      );
      showSuccess('Diet Prescription Updated', 'Ward dietary plan saved.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update diet';
      showNotificationDialog('Diet Order Error', msg, 'danger');
      showError('Diet Update Failed', msg);
    } finally {
      setSavingOrder(false);
    }
  };

  // Submit CPOE OT Booking Request (Dispatched to Surgeon & OT Board for scheduling)
  const handleSaveOtBooking = async (e) => {
    e.preventDefault();
    if (!otProcedureName.trim()) {
      showNotificationDialog(
        'Procedure Name Required',
        'Please enter the surgical procedure name before requesting OT allocation.',
        'warning'
      );
      return;
    }

    setSavingOrder(true);
    try {
      await ipdApi.requestSurgery({
        admissionId,
        procedureName: otProcedureName.trim(),
        surgeryType: otSurgeryType,
        urgency: otUrgency,
        targetDate: otScheduledDate ? new Date(otScheduledDate) : new Date(),
        anesthesiaType: otAnesthesiaType,
        requestNotes: otSpecialNotes.trim(),
      });
      setOtProcedureName('');
      setOtSpecialNotes('');
      setOtUrgency('ROUTINE');
      setOtSurgeryType('ELECTIVE');
      await loadData();
      showNotificationDialog(
        'Surgery Request Dispatched',
        'Surgery request submitted to the Operating Theatre Board. The surgical team will allocate an OT room and schedule the surgical team.',
        'success'
      );
      showSuccess('Surgery Requested', 'Dispatched to Operating Theatre Suite.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit surgery request';
      showNotificationDialog('OT Request Error', msg, 'danger');
      showError('Surgery Request Failed', msg);
    } finally {
      setSavingOrder(false);
    }
  };

  // Initiate Discharge
  const handleInitiateDischarge = async (e) => {
    e.preventDefault();
    if (!finalDiagnosis.trim() || !courseInHospital.trim() || !dischargeAdvice.trim()) {
      showNotificationDialog(
        'Incomplete Discharge Summary',
        'Please fill out all mandatory clinical discharge summary fields (Final Diagnosis, Course in Hospital, Discharge Advice).',
        'warning'
      );
      return;
    }

    setInitiatingDischarge(true);
    try {
      await ipdApi.initiateDischarge(admissionId, {
        finalDiagnosis: finalDiagnosis.trim(),
        courseInHospital: courseInHospital.trim(),
        dischargeAdvice: dischargeAdvice.trim(),
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      });
      showNotificationDialog(
        'Discharge Initiated',
        'Discharge initiated! 3-Way Clearance Kanban (Pharmacy, Ward, Billing) is now active.',
        'success'
      );
      showSuccess('Discharge Initiated', '3-Way Clearance Kanban active.');
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate discharge';
      showNotificationDialog('Discharge Initiation Error', msg, 'danger');
      showError('Discharge Failed', msg);
    } finally {
      setInitiatingDischarge(false);
    }
  };

  // Handle Kanban Clearances
  const handleMarkClearance = async (dept, payload) => {
    try {
      await ipdApi.markClearance(admissionId, dept, payload);
      await loadData();
      showSuccess('Clearance Updated', `${dept} clearance recorded.`);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to update ${dept} clearance`;
      showNotificationDialog('Clearance Error', msg, 'danger');
      showError('Clearance Failed', msg);
    }
  };

  const handleSelectAdmission = (adm) => {
    setViewMode('COCKPIT');
    navigate(`/dashboard/doctor/ipd/${adm._id}`);
    setIsMobileDrawerOpen(false);
  };

  const handleRefreshQueue = async () => {
    try {
      const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
      const list = res.data?.data || [];
      setAdmissionList(list);
      if (admissionId) await loadData();
    } catch (err) {
      console.error('Failed to refresh inpatient queue:', err);
    }
  };

  // View Official Exit Gate Pass
  const handleViewGatePass = async () => {
    if (!admissionId) return;
    try {
      const res = await ipdApi.getGatePass(admissionId);
      setGatePassData(res.data?.data || null);
      setShowGatePassModal(true);
    } catch (err) {
      if (clearance && currentAdmission) {
        setGatePassData({
          ...clearance,
          admissionId: currentAdmission,
          gatePassNumber: clearance.gatePassNumber || `GP-${currentAdmission.admissionNumber}`,
          gatePassGeneratedAt: clearance.gatePassGeneratedAt || new Date(),
        });
        setShowGatePassModal(true);
      } else {
        const msg = err.response?.data?.message || 'Failed to fetch Gate Pass details';
        showNotificationDialog('Gate Pass Error', msg, 'danger');
      }
    }
  };

  // Finalize Discharge
  const handleFinalizeDischarge = async () => {
    try {
      await ipdApi.finalizeDischarge(admissionId);
      await loadData();
      await handleViewGatePass();
      showSuccess('Discharge Finalized', 'Official Gate Pass generated.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to finalize discharge';
      showNotificationDialog('Finalization Error', msg, 'danger');
      showError('Finalization Failed', msg);
    }
  };

  // Note: viewMode === 'HISTORY' is now seamlessly rendered within the main workspace below,
  // preserving the outer layout shell and patient queue just like Image 02.

  if (!admissionId && admissionList.length === 0) {
    return (
      <div className="doctor-ipd-cockpit" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="doc-ipd-switch-btn"
            onClick={() => setViewMode('HISTORY')}
          >
            <span className="material-symbols-rounded">history_edu</span>
            <span>View Inpatient History & Archival</span>
          </button>
        </div>
        <ClinicalStationIdleDeck preset="DOCTOR_IPD" />
      </div>
    );
  }

  return (
    <div className={`doctor-ipd-cockpit ${isCollapsed ? 'doctor-ipd-cockpit--rail' : ''}`}>
      {/* ── Mobile/Tablet Backdrop Scrim Portaled to Root Body for Full Viewport Blur ── */}
      {isMobileDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="ipd-drawer-backdrop"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* ── Collapsible Inpatient Queue (Rail on Desktop, Drawer on Mobile/Tablet) ── */}
      <div className={`ipd-cockpit__queue ${isCollapsed ? 'ipd-cockpit__queue--rail' : ''} ${isMobileDrawerOpen ? 'is-mobile-open' : ''}`}>
        <IpdPatientQueue
          admissionList={admissionList}
          selectedAdmissionId={admissionId}
          onSelectAdmission={handleSelectAdmission}
          onRefresh={handleRefreshQueue}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
      </div>

      {/* ── Main Inpatient Clinical Workspace ── */}
      <div className="ipd-cockpit__workspace">
        {/* Mobile/Tablet Sticky/Top Toolbar */}
        <div className="ipd-mobile-toolbar">
          <button
            type="button"
            className="ipd-mobile-drawer-btn"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open Inpatient Queue Drawer"
          >
            <span className="material-symbols-rounded">hotel</span>
            <span>Inpatient Queue</span>
            <span className="ipd-mobile-count-badge">{admissionList.length}</span>
          </button>

          {currentAdmission && (
            <div className="ipd-mobile-patient-preview">
              <span className="ipd-mobile-bed-pill">
                Bed {currentAdmission.currentBedId?.bedLabel || currentAdmission.currentBedId?.bedNumber || '—'}
              </span>
            </div>
          )}
        </div>

        {/* ── 1. HERO WORKSPACE & INPATIENT TELEMETRY BANNER ── */}
        <div className="md3-ipd-hero">
          <div className="md3-ipd-hero-top">
            <div className="md3-ipd-hero-main">
              <div className="md3-ipd-hero-avatar">
                <span className="material-symbols-rounded">
                  {viewMode === 'HISTORY' ? 'history_edu' : 'hotel'}
                </span>
              </div>
              <div className="md3-ipd-hero-content">
                <h1 className="md3-ipd-hero-title">
                  {viewMode === 'HISTORY' ? 'Inpatient Clinical History & Case Archival' : 'Doctor Inpatient Clinical Cockpit'}
                </h1>
              </div>
            </div>

            <div className="ipd-view-mode-toggle">
              <button
                type="button"
                className={`ipd-mode-btn ${viewMode === 'COCKPIT' ? 'is-active' : ''}`}
                onClick={() => setViewMode('COCKPIT')}
              >
                <span className="material-symbols-rounded">hotel</span>
                <span>Active Cockpit ({admissionList.length})</span>
              </button>
              <button
                type="button"
                className={`ipd-mode-btn ${viewMode === 'HISTORY' ? 'is-active' : ''}`}
                onClick={() => setViewMode('HISTORY')}
              >
                <span className="material-symbols-rounded">history_edu</span>
                <span>Inpatient History</span>
              </button>
            </div>
          </div>

          {/* Telemetry Stats Bar with OnTap interactive drilldowns — Active in Cockpit mode */}
          {viewMode === 'COCKPIT' && (
            <div className="md3-ipd-telemetry-deck" role="region" aria-label="Inpatient Telemetry Metrics">
              <div
                className="md3-ipd-telemetry-card"
                onClick={() => setActiveTelemetryModal('ADMITTED')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTelemetryModal('ADMITTED')}
                title="Click to view full admitted inpatients directory"
              >
                <div className="md3-ipd-telemetry-card-left">
                  <span className="md3-ipd-telemetry-icon primary">
                    <span className="material-symbols-rounded">hotel</span>
                  </span>
                  <div className="md3-ipd-telemetry-text">
                    <span className="md3-ipd-telemetry-val">{telemetry.totalAdmitted}</span>
                    <span className="md3-ipd-telemetry-lbl">Admitted Patients</span>
                  </div>
                </div>
                <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
              </div>

              <div
                className="md3-ipd-telemetry-card"
                onClick={() => setActiveTelemetryModal('CRITICAL')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTelemetryModal('CRITICAL')}
                title="Click to view ICU, CCU & HDU high dependency patients"
              >
                <div className="md3-ipd-telemetry-card-left">
                  <span className="md3-ipd-telemetry-icon critical">
                    <span className="material-symbols-rounded">e911_emergency</span>
                  </span>
                  <div className="md3-ipd-telemetry-text">
                    <span className="md3-ipd-telemetry-val">{telemetry.criticalCount}</span>
                    <span className="md3-ipd-telemetry-lbl">ICU / CCU / HDU</span>
                  </div>
                </div>
                <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
              </div>

              <div
                className="md3-ipd-telemetry-card"
                onClick={() => setActiveTelemetryModal('ROUNDS')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTelemetryModal('ROUNDS')}
                title="Click to view chronological ward rounds ledger"
              >
                <div className="md3-ipd-telemetry-card-left">
                  <span className="md3-ipd-telemetry-icon rounds">
                    <span className="material-symbols-rounded">edit_note</span>
                  </span>
                  <div className="md3-ipd-telemetry-text">
                    <span className="md3-ipd-telemetry-val">{telemetry.roundsCount}</span>
                    <span className="md3-ipd-telemetry-lbl">Ward Rounds (Active Stay)</span>
                  </div>
                </div>
                <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
              </div>

              <div
                className="md3-ipd-telemetry-card"
                onClick={() => setActiveTelemetryModal('DISCHARGE')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTelemetryModal('DISCHARGE')}
                title="Click to view inpatients undergoing 3-way discharge clearance"
              >
                <div className="md3-ipd-telemetry-card-left">
                  <span className="md3-ipd-telemetry-icon discharge">
                    <span className="material-symbols-rounded">door_front</span>
                  </span>
                  <div className="md3-ipd-telemetry-text">
                    <span className="md3-ipd-telemetry-val">{telemetry.dischargePendingCount}</span>
                    <span className="md3-ipd-telemetry-lbl">Discharges in Progress</span>
                  </div>
                </div>
                <span className="material-symbols-rounded md3-ipd-telemetry-chevron">chevron_right</span>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'HISTORY' ? (
          <DoctorIpdHistoryManager
            embedded={true}
            onSwitchToActiveCockpit={() => setViewMode('COCKPIT')}
          />
        ) : (
          <>
            {/* ── 2. PATIENT HERO BANNER ── */}
            {currentAdmission && <IpdPatientBanner admission={currentAdmission} />}

      {/* ── 4. WORKSPACE TAB NAVIGATION ── */}
      <div className="md3-ipd-tabs-nav" role="tablist">
        {[
          { id: 'ROUNDS', label: 'Daily SOAP Rounds', icon: 'edit_note', badge: wardRounds.length },
          { id: 'CPOE', label: 'CPOE Physician Orders', icon: 'prescriptions', badge: orders.length },
          { id: 'DISCHARGE', label: 'Discharge & Clearance Kanban', icon: 'door_front', badge: clearance?.isDischarged ? 'Cleared' : null },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`md3-ipd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-rounded">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== null && tab.badge !== undefined && (
              <span className="md3-ipd-tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── 5. TAB 1: DAILY SOAP WARD ROUNDS ── */}
      {activeTab === 'ROUNDS' && (
        <div className="md3-ipd-workspace-grid">
          {/* Left Column: Record Daily Round Form */}
          <div className="md3-ipd-card">
            <div className="md3-ipd-card-header">
              <div className="md3-ipd-card-title-group">
                <span className="md3-ipd-card-title-icon">
                  <span className="material-symbols-rounded">edit_document</span>
                </span>
                <div>
                  <h3 className="md3-ipd-card-title">Record Daily SOAP Ward Round</h3>
                  <p className="md3-ipd-card-subtitle">Document subjective findings, physical exam, assessment &amp; treatment plan</p>
                </div>
              </div>
              <span className="md3-ipd-pill-badge success">Attending Round</span>
            </div>

            <form onSubmit={handleSaveRound} className="md3-ipd-soap-form">
              <Md3TextArea
                label="[S] Subjective (Symptoms, Pain Score & Patient Feedback) *"
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                placeholder="e.g. Pain well controlled, afebrile, oral intake resumed, tolerating light diet"
                autoGrow={true}
                minRows={2}
                required
              />
              <Md3TextArea
                label="[O] Objective (Physical Exam, Vitals & Diagnostic Data)"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Vitals stable: BP 120/80, HR 76, SpO2 98% RA. Chest clear bilaterally, abdomen soft, surgical wound clean"
                autoGrow={true}
                minRows={2}
              />
              <Md3TextArea
                label="[A] Assessment (Clinical Evaluation, Response & Progress) *"
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="e.g. Post-operative Day 2 following laparoscopic procedure, recovering well, no signs of sepsis"
                autoGrow={true}
                minRows={2}
                required
              />
              <Md3TextArea
                label="[P] Plan (Orders, Medication Changes & Next Milestones) *"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="e.g. Step down IV antibiotics to oral, encourage full ambulation, remove surgical drain tomorrow, discharge target Day 4"
                autoGrow={true}
                minRows={2}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Md3Button variant="filled" type="submit" loading={savingRound}>
                  Save SOAP Ward Round Note
                </Md3Button>
              </div>
            </form>
          </div>

          {/* Right Column: Historical Ward Rounds Timeline */}
          <div className="md3-ipd-card">
            <div className="md3-ipd-card-header">
              <div className="md3-ipd-card-title-group">
                <span className="md3-ipd-card-title-icon">
                  <span className="material-symbols-rounded">history_edu</span>
                </span>
                <div>
                  <h3 className="md3-ipd-card-title">Chronological Ward Rounds History</h3>
                  <p className="md3-ipd-card-subtitle">{wardRounds.length} notes logged during current inpatient stay</p>
                </div>
              </div>
            </div>

            <div className="md3-ipd-timeline-feed">
              {wardRounds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '40px', opacity: 0.5, marginBottom: '8px' }}>clinical_notes</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>No prior ward rounds recorded yet</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Fill out the SOAP form on the left to record the patient's first ward round note.</div>
                </div>
              ) : (
                wardRounds.map((r, i) => {
                  const docObj = r.doctorId || {};
                  const docName = formatDoctorName(
                    docObj.fullName || `${docObj.firstName || ''} ${docObj.lastName || ''}`.trim() || 'Attending Physician'
                  );
                  const positionTitle = docObj.position?.title || (typeof docObj.position === 'string' ? docObj.position : '') || 'Attending Physician';
                  const positionRank = docObj.position?.rank ? `Rank ${docObj.position.rank}` : null;
                  const condition = r.conditionAssessment || 'STABLE';

                  const conditionColors = {
                    IMPROVING: { bg: '#e6f4ea', text: '#137333', border: '#ceead6' },
                    STABLE: { bg: '#e8f0fe', text: '#1a73e8', border: '#d2e3fc' },
                    GUARDED: { bg: '#fef7e0', text: '#b06000', border: '#feefc3' },
                    CRITICAL: { bg: '#fce8e6', text: '#c5221f', border: '#fad2cf' },
                  };
                  const condStyle = conditionColors[condition] || conditionColors.STABLE;

                  return (
                    <div
                      key={r._id || i}
                      className="md3-ipd-round-item"
                      style={{ borderLeft: `4px solid ${condStyle.text}` }}
                    >
                      <div className="md3-ipd-round-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="md3-ipd-round-num" style={{ fontWeight: 700 }}>
                              Round #{wardRounds.length - i} • {docName}
                            </span>
                            <span style={{
                              fontSize: '0.70rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'var(--md-sys-color-surface-container, #e2eaf4)',
                              color: 'var(--md-sys-color-on-surface-variant, #334155)',
                            }}>
                              {positionTitle}{positionRank ? ` (${positionRank})` : ''}
                            </span>
                            <span style={{
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: condStyle.bg,
                              color: condStyle.text,
                              border: `1px solid ${condStyle.border}`,
                            }}>
                              {condition}
                            </span>
                          </div>
                        </div>
                        <span className="md3-ipd-round-time" style={{ fontSize: '0.76rem', color: 'var(--md-sys-color-outline, #6b7280)' }}>
                          {new Date(r.createdAt || r.roundDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="md3-ipd-soap-segment">
                        <span className="md3-ipd-soap-key">[S] Subjective:</span>
                        <span className="md3-ipd-soap-val">{r.subjective}</span>
                      </div>
                      {r.objective && (
                        <div className="md3-ipd-soap-segment">
                          <span className="md3-ipd-soap-key">[O] Objective:</span>
                          <span className="md3-ipd-soap-val">{r.objective}</span>
                        </div>
                      )}
                      <div className="md3-ipd-soap-segment">
                        <span className="md3-ipd-soap-key">[A] Assessment:</span>
                        <span className="md3-ipd-soap-val">{r.assessment}</span>
                      </div>
                      <div className="md3-ipd-soap-segment">
                        <span className="md3-ipd-soap-key">[P] Plan:</span>
                        <span className="md3-ipd-soap-val">{r.plan}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB 2: CPOE PHYSICIAN ORDERS ── */}
      {activeTab === 'CPOE' && (
        <div className="md3-ipd-workspace-grid">
          {/* Left Column: Order Placement Console */}
          <div className="md3-ipd-card">
            <div className="md3-ipd-card-header">
              <div className="md3-ipd-card-title-group">
                <span className="md3-ipd-card-title-icon">
                  <span className="material-symbols-rounded">prescriptions</span>
                </span>
                <div>
                  <h3 className="md3-ipd-card-title">Computerized Physician Order Entry</h3>
                  <p className="md3-ipd-card-subtitle">Direct order transmission to Nursing e-MAR, Laboratory &amp; OT</p>
                </div>
              </div>
            </div>

            {/* CPOE Sub-tabs */}
            <div className="md3-cpoe-subtabs">
              {[
                { id: 'MEDICATION', label: 'Inpatient Rx', icon: 'pill' },
                { id: 'LAB', label: 'Diagnostic / Lab', icon: 'science' },
                { id: 'DIET', label: 'Clinical Diet', icon: 'restaurant' },
                { id: 'OT', label: 'OT Booking', icon: 'medical_services' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setCpoeSubTab(sub.id)}
                  className={`md3-cpoe-subtab-btn ${cpoeSubTab === sub.id ? 'active' : ''}`}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>{sub.icon}</span>
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-form 1: Inpatient Medication */}
            {cpoeSubTab === 'MEDICATION' && (
              <form onSubmit={handleSaveMedOrder} className="md3-cpoe-form">
                {currentAdmission?.patientId?.allergies && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--md-sys-color-error-container, #ffdad6)',
                      color: 'var(--md-sys-color-on-error-container, #410002)',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      marginBottom: '10px',
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-error, #ba1a1a)' }}>
                      warning
                    </span>
                    <span>
                      <strong>Patient Documented Allergies:</strong> {currentAdmission.patientId.allergies}
                    </span>
                  </div>
                )}
                <Md3TextField
                  label="Medication Name & Salt *"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Inj. Ceftriaxone, Tab. Paracetamol, Infusion Normal Saline"
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3TextField
                    label="Dosage (Strength) *"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1g, 500mg, 100ml/hr"
                    required
                  />
                  <Md3Select label="Route *" value={route} onChange={(e) => setRoute(e.target.value)}>
                    <option value="ORAL">Oral (PO)</option>
                    <option value="IV">Intravenous (IV)</option>
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutaneous (SC)</option>
                    <option value="INHALATION">Inhalation / Nebulization</option>
                    <option value="TOPICAL">Topical</option>
                  </Md3Select>
                </div>

                <Md3Select label="Dosing Frequency *" value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="OD">Once Daily (OD — 08:00)</option>
                  <option value="BD">Twice Daily (BD — 08:00, 20:00)</option>
                  <option value="TDS">Thrice Daily (TDS — 08:00, 14:00, 20:00)</option>
                  <option value="QID">Four Times Daily (QID — 06:00, 12:00, 18:00, 24:00)</option>
                  <option value="PRN">As Needed (SOS / PRN)</option>
                  <option value="STAT">Stat Immediately (STAT)</option>
                </Md3Select>

                <Md3TextField
                  label="Special Administration Notes"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="e.g. Infuse in 100ml NS over 30 mins, check BP before administering"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={savingOrder}>
                    Order &amp; Transcribe to e-MAR
                  </Md3Button>
                </div>
              </form>
            )}

            {/* Sub-form 2: Diagnostic / Lab Order */}
            {cpoeSubTab === 'LAB' && (
              <form onSubmit={handleSaveLabOrder} className="md3-cpoe-form">
                <Md3Select
                  label="Select Investigation *"
                  value={selectedLabTest}
                  onChange={(e) => setSelectedLabTest(e.target.value)}
                  required
                >
                  <option value="">-- Choose Diagnostic Test --</option>
                  {LAB_CATALOG_SAMPLE.map((t) => (
                    <option key={t.code} value={t.name}>
                      {t.name} ({t.dept})
                    </option>
                  ))}
                </Md3Select>

                <Md3Select label="Order Priority *" value={labPriority} onChange={(e) => setLabPriority(e.target.value)}>
                  <option value="ROUTINE">Routine Morning Run</option>
                  <option value="URGENT">Urgent (Within 2 Hours)</option>
                  <option value="STAT">STAT / Emergency (Immediate)</option>
                </Md3Select>

                <Md3TextField
                  label="Clinical Indication / Notes"
                  value={labClinicalNotes}
                  onChange={(e) => setLabClinicalNotes(e.target.value)}
                  placeholder="e.g. Rule out post-op sepsis, monitor renal profile"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={savingOrder}>
                    Submit Inpatient Lab Order
                  </Md3Button>
                </div>
              </form>
            )}

            {/* Sub-form 3: Clinical Diet */}
            {cpoeSubTab === 'DIET' && (
              <form onSubmit={handleSaveDietOrder} className="md3-cpoe-form">
                <Md3Select
                  label="Inpatient Diet Tier *"
                  value={selectedDietTier}
                  onChange={(e) => setSelectedDietTier(e.target.value)}
                >
                  <option value="REGULAR_DIET">Regular Hospital Diet</option>
                  <option value="DIABETIC_DIET">Diabetic Diet (Low Glycemic)</option>
                  <option value="RENAL_DIET">Renal Diet (Low Sodium/Potassium)</option>
                  <option value="HIGH_PROTEIN">High Protein Diet</option>
                  <option value="SOFT_DIET">Soft / Semi-Solid Diet</option>
                  <option value="LIQUID_DIET">Clear Liquid Diet</option>
                  <option value="NPO">NPO (Nil Per Os - Strict Fasting)</option>
                </Md3Select>

                <Md3TextField
                  label="Dietary Restrictions / Instructions"
                  value={dietInstructions}
                  onChange={(e) => setDietInstructions(e.target.value)}
                  placeholder="e.g. Strict fluid restriction 1.2L/day, salt-free"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={savingOrder}>
                    Prescribe Clinical Diet
                  </Md3Button>
                </div>
              </form>
            )}

            {/* Sub-form 4: OT Request (Polled/Requested by Doctor, Scheduled by Surgeon) */}
            {cpoeSubTab === 'OT' && (
              <form onSubmit={handleSaveOtBooking} className="md3-cpoe-form">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  background: 'var(--md-sys-color-surface-container-high, #f0f4f8)',
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-outline-variant, #d2deec)',
                  fontSize: '0.78rem',
                  color: 'var(--md-sys-color-on-surface-variant, #334155)',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary, #0b57d0)' }}>surgical</span>
                  <span><strong>Operating Theatre Request:</strong> Doctors submit surgery requests here. The Surgeon / OT Board reviews, allocates an OT room, and assigns surgical and nursing teams.</span>
                </div>

                <Md3TextField
                  label="Surgical Procedure Name *"
                  value={otProcedureName}
                  onChange={(e) => setOtProcedureName(e.target.value)}
                  placeholder="e.g. Laparoscopic Appendectomy, Total Knee Replacement"
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3Select
                    label="Surgery Type *"
                    value={otSurgeryType}
                    onChange={(e) => setOtSurgeryType(e.target.value)}
                  >
                    <option value="ELECTIVE">Elective (Planned Surgery)</option>
                    <option value="EMERGENCY">Emergency Surgery</option>
                  </Md3Select>

                  <Md3Select
                    label="Urgency Level *"
                    value={otUrgency}
                    onChange={(e) => setOtUrgency(e.target.value)}
                  >
                    <option value="ROUTINE">Routine (Normal OT list)</option>
                    <option value="URGENT">Urgent (Within 24-48 hours)</option>
                    <option value="EMERGENCY_STAT">STAT / Critical Emergency (Immediate OT)</option>
                  </Md3Select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3TextField
                    label="Target Surgery Date"
                    type="date"
                    value={otScheduledDate}
                    onChange={(e) => setOtScheduledDate(e.target.value)}
                  />

                  <Md3Select
                    label="Anesthesia Type *"
                    value={otAnesthesiaType}
                    onChange={(e) => setOtAnesthesiaType(e.target.value)}
                  >
                    <option value="GENERAL">General Anesthesia (GA)</option>
                    <option value="SPINAL">Spinal Anesthesia</option>
                    <option value="EPIDURAL">Epidural Anesthesia</option>
                    <option value="LOCAL">Local / Sedation</option>
                  </Md3Select>
                </div>

                <Md3TextField
                  label="Clinical &amp; Pre-Op Notes"
                  value={otSpecialNotes}
                  onChange={(e) => setOtSpecialNotes(e.target.value)}
                  placeholder="e.g. Keep 2 units PRBC cross-matched, pre-op antibiotic prophylaxis"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={savingOrder}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>send</span>
                    <span>Submit Surgery Request to OT</span>
                  </Md3Button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Active Inpatient Orders Timeline */}
          <div className="md3-ipd-card">
            <div className="md3-ipd-card-header">
              <div className="md3-ipd-card-title-group">
                <span className="md3-ipd-card-title-icon">
                  <span className="material-symbols-rounded">checklist</span>
                </span>
                <div>
                  <h3 className="md3-ipd-card-title">Active Inpatient Orders</h3>
                  <p className="md3-ipd-card-subtitle">{orders.length} orders on record for this admission</p>
                </div>
              </div>
            </div>

            <div className="md3-cpoe-orders-feed">
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '40px', opacity: 0.5, marginBottom: '8px' }}>prescriptions</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>No CPOE orders placed yet</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Use the order console on the left to prescribe medications, labs, or clinical diet.</div>
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o._id} className="md3-cpoe-order-card">
                    <div className="md3-cpoe-order-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>
                          {o.orderType === 'MEDICATION' ? 'pill' : o.orderType === 'DIAGNOSTIC' ? 'science' : o.orderType === 'DIET' ? 'restaurant' : 'medical_services'}
                        </span>
                        <span className="md3-cpoe-order-name">
                          {o.orderType}: {o.medication?.name || o.testName || (o.dietTier ? o.dietTier.replace(/_/g, ' ') : null) || o.procedureName || 'Order'}
                        </span>
                      </div>
                      <span className={`md3-cpoe-order-status ${o.status === 'COMPLETED' ? 'completed' : o.status === 'ACTIVE' ? 'active' : 'pending'}`}>
                        {o.status || 'ACTIVE'}
                      </span>
                    </div>

                    {o.medication && (
                      <div className="md3-cpoe-order-meta">
                        {o.medication.dosage} • {o.medication.route} • {o.medication.frequency} {o.medication.instructions && `(${o.medication.instructions})`}
                      </div>
                    )}

                    {o.instructions && !o.medication && (
                      <div className="md3-cpoe-order-meta">
                        {o.instructions}
                      </div>
                    )}

                    <div style={{ fontSize: '0.70rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                      Ordered: {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TAB 3: DISCHARGE & CLEARANCE KANBAN ── */}
      {/* ── 7. TAB 3: DISCHARGE & CLEARANCE KANBAN ── */}
      {activeTab === 'DISCHARGE' && (
        <div className="md3-ipd-discharge-stack">
          {clearance ? (
            <>
              {/* Primary Focus: 3-Way Departmental Clearance Kanban */}
              <DischargeKanban
                clearance={clearance}
                admission={currentAdmission}
                onMarkClearance={handleMarkClearance}
                onFinalizeDischarge={handleFinalizeDischarge}
                onViewGatePass={handleViewGatePass}
                onRefresh={loadData}
              />

              {/* Secondary Review: Collapsible / Compact Discharge Summary Record */}
              <div className="md3-ipd-discharge-summary-card">
                <div className="md3-ipd-discharge-summary-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary, #6750a4)' }}>clinical_notes</span>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>Authorized Discharge Summary &amp; Orders</strong>
                  </div>
                  <button
                    type="button"
                    className="md3-cpoe-subtab-btn"
                    onClick={() => setIsEditingDischargeSummary(!isEditingDischargeSummary)}
                    style={{ fontSize: '0.74rem' }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      {isEditingDischargeSummary ? 'visibility' : 'edit_document'}
                    </span>
                    <span>{isEditingDischargeSummary ? 'View Summary' : 'Amend Summary'}</span>
                  </button>
                </div>

                {isEditingDischargeSummary ? (
                  <form onSubmit={handleInitiateDischarge} className="md3-ipd-soap-form">
                    <div className="md3-ipd-discharge-grid">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Md3TextArea
                          label="Final Discharge Diagnosis *"
                          value={finalDiagnosis}
                          onChange={(e) => setFinalDiagnosis(e.target.value)}
                          placeholder="e.g. Acute Cholecystitis — S/P Laparoscopic Cholecystectomy (Resolved)"
                          autoGrow={true}
                          minRows={2}
                          required
                        />
                        <Md3TextArea
                          label="Hospital Course & Treatment Summary *"
                          value={courseInHospital}
                          onChange={(e) => setCourseInHospital(e.target.value)}
                          placeholder="e.g. Admitted via ER, managed surgically on Day 2, post-op vitals stable..."
                          autoGrow={true}
                          minRows={2}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Md3TextArea
                          label="Discharge Advice & Take-Home Instructions *"
                          value={dischargeAdvice}
                          onChange={(e) => setDischargeAdvice(e.target.value)}
                          placeholder="e.g. Continue oral antibiotics for 5 days, keep surgical dressing dry..."
                          autoGrow={true}
                          minRows={2}
                          required
                        />
                        <Md3TextField
                          label="Follow-Up Outpatient Review Date"
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <Md3Button variant="filled" type="submit" loading={initiatingDischarge}>
                        Update Discharge Summary
                      </Md3Button>
                    </div>
                  </form>
                ) : (
                  <div className="md3-ipd-discharge-grid">
                    <div className="md3-ipd-discharge-field">
                      <span className="md3-ipd-discharge-label">Final Diagnosis</span>
                      <span className="md3-ipd-discharge-value">
                        {currentAdmission?.dischargeSummary?.finalDiagnosis || finalDiagnosis || 'Diagnosis Recorded'}
                      </span>
                    </div>

                    <div className="md3-ipd-discharge-field">
                      <span className="md3-ipd-discharge-label">Follow-Up Review Date</span>
                      <span className="md3-ipd-discharge-value">
                        {currentAdmission?.dischargeSummary?.followUpDate
                          ? new Date(currentAdmission.dischargeSummary.followUpDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                          : followUpDate || 'Not scheduled'}
                      </span>
                    </div>

                    <div className="md3-ipd-discharge-field">
                      <span className="md3-ipd-discharge-label">Hospital Course &amp; Treatment</span>
                      <span className="md3-ipd-discharge-value">
                        {currentAdmission?.dischargeSummary?.courseInHospital || courseInHospital || 'Documented in EHR'}
                      </span>
                    </div>

                    <div className="md3-ipd-discharge-field">
                      <span className="md3-ipd-discharge-label">Discharge Advice &amp; Take-Home Rx</span>
                      <span className="md3-ipd-discharge-value">
                        {currentAdmission?.dischargeSummary?.dischargeAdvice || dischargeAdvice || 'Standard take-home care advice'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Discharge Not Yet Initiated: Clean 2-Column Initiation Form */
            <div className="md3-ipd-card">
              <div className="md3-ipd-card-header">
                <div className="md3-ipd-card-title-group">
                  <span className="md3-ipd-card-title-icon">
                    <span className="material-symbols-rounded">door_front</span>
                  </span>
                  <div>
                    <h3 className="md3-ipd-card-title">Initiate Inpatient Discharge Order</h3>
                    <p className="md3-ipd-card-subtitle">
                      Authorizes patient discharge and activates the 3-Way Clearance Kanban across Pharmacy, Ward Nursing, and Billing
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInitiateDischarge} className="md3-ipd-soap-form">
                <div className="md3-ipd-discharge-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Md3TextArea
                      label="Final Discharge Diagnosis *"
                      value={finalDiagnosis}
                      onChange={(e) => setFinalDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Cholecystitis — S/P Laparoscopic Cholecystectomy (Resolved)"
                      autoGrow={true}
                      minRows={3}
                      required
                    />
                    <Md3TextArea
                      label="Hospital Course & Treatment Summary *"
                      value={courseInHospital}
                      onChange={(e) => setCourseInHospital(e.target.value)}
                      placeholder="e.g. Admitted via ER, managed surgically on Day 2, post-op vitals stable..."
                      autoGrow={true}
                      minRows={3}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Md3TextArea
                      label="Discharge Advice & Take-Home Instructions *"
                      value={dischargeAdvice}
                      onChange={(e) => setDischargeAdvice(e.target.value)}
                      placeholder="e.g. Continue oral antibiotics for 5 days, keep surgical dressing dry, low-fat diet..."
                      autoGrow={true}
                      minRows={3}
                      required
                    />
                    <Md3TextField
                      label="Follow-Up Outpatient Review Date"
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Md3Button variant="filled" type="submit" loading={initiatingDischarge}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>send</span>
                    <span>Authorize &amp; Open Clearance Kanban</span>
                  </Md3Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* Printable Gate Pass Modal */}
      {showGatePassModal && (gatePassData || clearance) && (
        <GatePassPrintable
          gatePassData={gatePassData}
          admission={currentAdmission}
          clearance={clearance}
          onClose={() => {
            setShowGatePassModal(false);
            setGatePassData(null);
          }}
        />
      )}

      {/* Interactive Inpatient Telemetry Drilldown Dialog */}
      <IpdTelemetryDetailDialog
        isOpen={Boolean(activeTelemetryModal)}
        type={activeTelemetryModal}
        onClose={() => setActiveTelemetryModal(null)}
        admissionList={admissionList}
        wardRounds={wardRounds}
        currentAdmission={currentAdmission}
        onSelectInpatient={(newAdmId) => {
          navigate(`/dashboard/doctor/ipd/${newAdmId}`);
        }}
      />

      {/* Simple Reusable User Notification Dialog */}
      <Md3ConfirmDialog
        isOpen={notifyDialog.isOpen}
        onClose={closeNotificationDialog}
        onConfirm={closeNotificationDialog}
        title={notifyDialog.title}
        message={notifyDialog.message}
        variant={notifyDialog.variant}
        confirmLabel={notifyDialog.confirmLabel || 'OK'}
        showCancel={false}
      />

      {/* CDSS Drug-Allergy Safety Interceptor Dialog */}
      <Md3ConfirmDialog
        isOpen={cdssAlert.isOpen}
        onClose={() => setCdssAlert((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmCdssOverride}
        title="⚠️ CDSS Drug-Allergy Safety Alert"
        message={cdssAlert.message}
        variant="danger"
        icon="report"
        confirmLabel="Confirm Clinical Override"
        cancelLabel="Abort Prescription"
        loading={savingOrder}
      >
        <div style={{ marginTop: '14px', textAlign: 'left' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface, #1d1b20)',
              marginBottom: '6px',
            }}
          >
            Clinical Override Justification * <span style={{ fontWeight: 400, color: 'var(--md-sys-color-error, #ba1a1a)' }}>(Mandatory for audit trail)</span>
          </label>
          <textarea
            value={cdssAlert.overrideReason}
            onChange={(e) => setCdssAlert((prev) => ({ ...prev, overrideReason: e.target.value }))}
            placeholder="e.g. Desensitization protocol initiated under ICU supervision / No alternative therapeutic drug available"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--md-sys-color-outline, #79747e)',
              background: 'var(--md-sys-color-surface, #fff)',
              color: 'var(--md-sys-color-on-surface, #1d1b20)',
              fontSize: '0.85rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      </Md3ConfirmDialog>
      </div>
    </div>
  );
};

export default DoctorIpdCockpit;
