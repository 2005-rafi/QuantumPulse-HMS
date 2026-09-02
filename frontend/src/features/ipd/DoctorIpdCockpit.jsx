/**
 * features/ipd/DoctorIpdCockpit.jsx
 * Enterprise Material 3 Inpatient Clinical Workstation & Cockpit
 * (CPOE Orders, SOAP Ward Rounds, OT Booking, 3-Way Discharge Governance).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import IpdTelemetryDetailDialog from './IpdTelemetryDetailDialog';
import { Md3Button, Md3TextField, Md3TextArea, Md3Select } from '../../components/md3/Md3FormComponents';
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

  const [admissionList, setAdmissionList] = useState([]);
  const [currentAdmission, setCurrentAdmission] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wardRounds, setWardRounds] = useState([]);
  const [clearance, setClearance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGatePassModal, setShowGatePassModal] = useState(false);

  // Active Telemetry Drilldown Modal: null | 'ADMITTED' | 'CRITICAL' | 'ROUNDS' | 'DISCHARGE'
  const [activeTelemetryModal, setActiveTelemetryModal] = useState(null);

  // Ward filter & search
  const [selectedWardFilter, setSelectedWardFilter] = useState('ALL'); // ALL, ICU_CCU, HDU, GENERAL
  const [patientSearch, setPatientSearch] = useState('');

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

  // CPOE Lab Order Form
  const [selectedLabTest, setSelectedLabTest] = useState('');
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [labClinicalNotes, setLabClinicalNotes] = useState('');

  // CPOE Diet Form
  const [selectedDietTier, setSelectedDietTier] = useState('REGULAR_DIET');
  const [dietInstructions, setDietInstructions] = useState('');

  // CPOE OT Form
  const [otProcedureName, setOtProcedureName] = useState('');
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
      alert('Please fill out Subjective, Assessment, and Plan fields.');
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
      alert('Daily SOAP ward round note recorded successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record round note');
    } finally {
      setSavingRound(false);
    }
  };

  // Submit CPOE Medication
  const handleSaveMedOrder = async (e) => {
    e.preventDefault();
    if (!medName.trim() || !dosage.trim()) {
      alert('Medication Name and Dosage are required.');
      return;
    }

    setSavingOrder(true);
    try {
      await ipdApi.createCpoeOrder(admissionId, {
        orderType: 'MEDICATION',
        medication: {
          name: medName.trim(),
          dosage: dosage.trim(),
          route,
          frequency: freq,
          instructions: medInstructions.trim(),
        },
      });
      setMedName('');
      setDosage('');
      setMedInstructions('');
      await loadData();
      alert('Medication ordered. Dose schedule automatically appended to Nursing e-MAR.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place medication order');
    } finally {
      setSavingOrder(false);
    }
  };

  // Submit CPOE Lab Order
  const handleSaveLabOrder = async (e) => {
    e.preventDefault();
    if (!selectedLabTest) {
      alert('Please select a diagnostic / laboratory investigation.');
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
      alert('Laboratory order submitted and routed to Diagnostic queue.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place laboratory order');
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
      alert('Clinical diet prescription updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update diet');
    } finally {
      setSavingOrder(false);
    }
  };

  // Submit CPOE OT Booking
  const handleSaveOtBooking = async (e) => {
    e.preventDefault();
    if (!otProcedureName.trim() || !otScheduledDate) {
      alert('Procedure Name and Scheduled Date are required.');
      return;
    }

    setSavingOrder(true);
    try {
      const scheduledStart = new Date(`${otScheduledDate}T${otScheduledTime}:00`);
      await ipdApi.bookOtSession({
        admissionId,
        procedureName: otProcedureName.trim(),
        scheduledStart,
        anesthesiaType: otAnesthesiaType,
        specialNotes: otSpecialNotes,
        roomId: otRooms[0]?._id,
      });
      setOtProcedureName('');
      setOtSpecialNotes('');
      await loadData();
      alert('Operating Theatre (OT) session requested and scheduled.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book OT session');
    } finally {
      setSavingOrder(false);
    }
  };

  // Initiate Discharge
  const handleInitiateDischarge = async (e) => {
    e.preventDefault();
    if (!finalDiagnosis.trim() || !courseInHospital.trim() || !dischargeAdvice.trim()) {
      alert('Please fill out all mandatory clinical discharge summary fields.');
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
      alert('Discharge initiated! 3-Way Clearance Kanban (Pharmacy, Ward, Billing) is now active.');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate discharge');
    } finally {
      setInitiatingDischarge(false);
    }
  };

  // Handle Kanban Clearances
  const handleMarkClearance = async (dept, payload) => {
    try {
      await ipdApi.markClearance(admissionId, dept, payload);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update ${dept} clearance`);
    }
  };

  // Finalize Discharge
  const handleFinalizeDischarge = async () => {
    try {
      await ipdApi.finalizeDischarge(admissionId);
      await loadData();
      setShowGatePassModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize discharge');
    }
  };

  if (!admissionId && admissionList.length === 0) {
    return (
      <div className="doctor-ipd-cockpit">
        <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '20px', border: '1px dashed var(--md-sys-color-outline-variant)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-sys-color-on-surface-variant)' }}>hotel</span>
          <h3 style={{ margin: '12px 0 4px', fontSize: '1.15rem', fontWeight: 800 }}>No active inpatient admissions found</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Admit a patient from the Reception or OPD module to access the Doctor Inpatient Clinical Cockpit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-ipd-cockpit">
      {/* ── 1. HERO WORKSPACE & INPATIENT TELEMETRY BANNER ── */}
      <div className="md3-ipd-hero">
        <div className="md3-ipd-hero-top">
          <div className="md3-ipd-hero-main">
            <div className="md3-ipd-hero-avatar">
              <span className="material-symbols-rounded">hotel</span>
            </div>
            <div className="md3-ipd-hero-content">
              <h1 className="md3-ipd-hero-title">Doctor Inpatient Clinical Cockpit</h1>
              <p className="md3-ipd-hero-subtitle">
                Daily SOAP Ward Rounds • Computerized Physician Order Entry (CPOE) • 3-Way Discharge Governance
              </p>
            </div>
          </div>

          {/* Quick Inpatient Selector */}
          <div className="md3-ipd-switcher-box">
            <Md3Select
              label="Select Inpatient"
              value={admissionId || ''}
              onChange={(e) => navigate(`/dashboard/doctor/ipd/${e.target.value}`)}
            >
              {filteredAdmissions.map((a) => (
                <option key={a._id} value={a._id}>
                  {formatPatientName(a.patientId)} (Bed: {a.currentBedId?.bedLabel || a.currentBedId?.bedNumber || '—'})
                </option>
              ))}
            </Md3Select>
          </div>
        </div>

        {/* Telemetry Stats Bar with OnTap interactive drilldowns */}
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
      </div>

      {/* ── 2. WARD FILTER & SEARCH BAR ── */}
      <div className="md3-ipd-filter-bar">
        <div className="md3-ipd-filter-chips">
          <span className="md3-ipd-filter-lbl">
            <span className="material-symbols-rounded">filter_alt</span>
            <span>Ward Unit:</span>
          </span>
          {[
            { id: 'ALL', label: 'All Inpatients' },
            { id: 'ICU_CCU', label: 'ICU & CCU' },
            { id: 'HDU', label: 'HDU High Care' },
            { id: 'GENERAL', label: 'General Ward' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`md3-ipd-filter-chip ${selectedWardFilter === chip.id ? 'active' : ''}`}
              onClick={() => setSelectedWardFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: '220px', flex: 1, maxWidth: '320px' }}>
          <input
            type="text"
            className="md3-search-input"
            placeholder="Search inpatient name, MRN, bed…"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          />
        </div>
      </div>

      {/* ── 3. PATIENT HERO BANNER ── */}
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
                wardRounds.map((r, i) => (
                  <div key={r._id || i} className="md3-ipd-round-item">
                    <div className="md3-ipd-round-header">
                      <span className="md3-ipd-round-num">
                        Round #{wardRounds.length - i} • {formatDoctorName(r.doctorId?.fullName || 'Attending Physician')}
                      </span>
                      <span className="md3-ipd-round-time">
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
                ))
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

            {/* Sub-form 4: OT Booking */}
            {cpoeSubTab === 'OT' && (
              <form onSubmit={handleSaveOtBooking} className="md3-cpoe-form">
                <Md3TextField
                  label="Surgical Procedure Name *"
                  value={otProcedureName}
                  onChange={(e) => setOtProcedureName(e.target.value)}
                  placeholder="e.g. Laparoscopic Appendectomy, Total Knee Replacement"
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3TextField
                    label="Surgery Date *"
                    type="date"
                    value={otScheduledDate}
                    onChange={(e) => setOtScheduledDate(e.target.value)}
                    required
                  />
                  <Md3TextField
                    label="Scheduled Start Time *"
                    type="time"
                    value={otScheduledTime}
                    onChange={(e) => setOtScheduledTime(e.target.value)}
                    required
                  />
                </div>

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

                <Md3TextField
                  label="Surgical &amp; Pre-Op Notes"
                  value={otSpecialNotes}
                  onChange={(e) => setOtSpecialNotes(e.target.value)}
                  placeholder="e.g. Keep 2 units PRBC cross-matched, pre-op antibiotic prophylaxis"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={savingOrder}>
                    Book Operating Theatre Session
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
      {activeTab === 'DISCHARGE' && (
        <div className="md3-ipd-discharge-stack">
          {/* Discharge Initiation Card (if not yet initiated or finalized) */}
          {(!currentAdmission?.dischargeSummary?.finalDiagnosis || currentAdmission?.status === 'ADMITTED') && (
            <div className="md3-ipd-card">
              <div className="md3-ipd-card-header">
                <div className="md3-ipd-card-title-group">
                  <span className="md3-ipd-card-title-icon">
                    <span className="material-symbols-rounded">door_front</span>
                  </span>
                  <div>
                    <h3 className="md3-ipd-card-title">Initiate Inpatient Discharge Order</h3>
                    <p className="md3-ipd-card-subtitle">
                      Authorizes patient discharge and opens the 3-Way Clearance Kanban across Pharmacy, Ward Nursing, and Billing
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInitiateDischarge} className="md3-ipd-soap-form">
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
                  placeholder="e.g. Admitted via ER, managed surgically on Day 2, post-op vitals stable, ambulating independently, surgical drain removed"
                  autoGrow={true}
                  minRows={2}
                  required
                />

                <Md3TextArea
                  label="Discharge Advice & Take-Home Instructions *"
                  value={dischargeAdvice}
                  onChange={(e) => setDischargeAdvice(e.target.value)}
                  placeholder="e.g. Continue oral antibiotics for 5 days, keep surgical dressing dry, low-fat diet, emergency review if fever > 100.4F"
                  autoGrow={true}
                  minRows={2}
                  required
                />

                <div style={{ maxWidth: '280px' }}>
                  <Md3TextField
                    label="Follow-Up Outpatient Review Date"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Md3Button variant="filled" type="submit" loading={initiatingDischarge}>
                    Authorize &amp; Open Clearance Kanban
                  </Md3Button>
                </div>
              </form>
            </div>
          )}

          {/* 3-Way Clearance Kanban */}
          {clearance && (
            <DischargeKanban
              clearance={clearance}
              admission={currentAdmission}
              onMarkClearance={handleMarkClearance}
              onFinalizeDischarge={handleFinalizeDischarge}
              onViewGatePass={() => setShowGatePassModal(true)}
            />
          )}
        </div>
      )}

      {/* Printable Gate Pass Modal */}
      {showGatePassModal && clearance && (
        <GatePassPrintable
          admission={currentAdmission}
          clearance={clearance}
          onClose={() => setShowGatePassModal(false)}
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
    </div>
  );
};

export default DoctorIpdCockpit;
