/**
 * features/ipd/DoctorIpdCockpit.jsx
 * Physician Inpatient Clinical Cockpit (CPOE Orders, SOAP Ward Rounds, OT Booking, Discharge Workflow).
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import DischargeKanban from '../../components/ipd/DischargeKanban';
import GatePassPrintable from '../../components/ipd/GatePassPrintable';
import { Md3Button, Md3TextField, Md3Select, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';

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
        const res = await api.get('/ipd/beds/rooms');
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
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--md-sys-color-outline)' }}>
        No active inpatient admissions found. Admit a patient to access the Doctor Cockpit.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Header & Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Doctor Inpatient Clinical Cockpit
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Daily SOAP Ward Rounds • Computerized Physician Order Entry (CPOE) • 3-Way Discharge Governance
          </p>
        </div>

        <div style={{ width: '280px' }}>
          <Md3Select
            label="Select Inpatient"
            value={admissionId || ''}
            onChange={(e) => navigate(`/dashboard/doctor/ipd/${e.target.value}`)}
          >
            {admissionList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.patientId?.firstName} {a.patientId?.lastName} (Bed: {a.currentBedId?.bedLabel || a.currentBedId?.bedNumber || '—'})
              </option>
            ))}
          </Md3Select>
        </div>
      </div>

      {/* Sticky Patient Hero Banner */}
      {currentAdmission && <IpdPatientBanner admission={currentAdmission} />}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
        {[
          { id: 'ROUNDS', label: 'Daily SOAP Rounds', icon: 'edit_note' },
          { id: 'CPOE', label: 'CPOE Physician Orders', icon: 'prescriptions' },
          { id: 'DISCHARGE', label: 'Discharge & Clearance Kanban', icon: 'door_front' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '3px solid var(--md-sys-color-primary, #006a57)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--md-sys-color-primary, #006a57)' : 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: SOAP WARD ROUNDS ── */}
      {activeTab === 'ROUNDS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* New Round Form */}
          <div
            style={{
              background: 'var(--md-sys-color-surface, #ffffff)',
              border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Record Daily SOAP Ward Round</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '4px 8px', borderRadius: '100px' }}>
                Attending Round
              </span>
            </div>

            <form onSubmit={handleSaveRound} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Md3TextField
                label="[S] Subjective (Patient Symptoms & Feedback) *"
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                placeholder="e.g. Pain well controlled, afebrile, oral intake resumed"
                required
              />
              <Md3TextField
                label="[O] Objective (Physical Exam & Diagnostic Data)"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Vitals stable, chest clear bilateral, abdomen soft and non-tender"
              />
              <Md3TextField
                label="[A] Assessment (Clinical Evaluation & Progress) *"
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="e.g. Improving postoperative day 2, no signs of wound infection"
                required
              />
              <Md3TextField
                label="[P] Plan (Orders, Diet & Next Milestones) *"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="e.g. Step down IV to oral antibiotics, mobilize with physio, review evening"
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Md3Button variant="filled" type="submit" loading={savingRound}>
                  Save SOAP Ward Round Note
                </Md3Button>
              </div>
            </form>
          </div>

          {/* Historical Rounds Timeline */}
          <div
            style={{
              background: 'var(--md-sys-color-surface, #ffffff)',
              border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '600px',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Chronological Ward Rounds History ({wardRounds.length})
            </h3>
            {wardRounds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
                No prior ward rounds logged yet for this inpatient stay.
              </div>
            ) : (
              wardRounds.map((r, i) => (
                <div
                  key={r._id || i}
                  style={{
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                    <span>Round #{wardRounds.length - i} · {r.doctorId?.fullName || 'Attending Physician'}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
                      {new Date(r.createdAt || r.roundDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div><strong>S:</strong> {r.subjective}</div>
                  {r.objective && <div><strong>O:</strong> {r.objective}</div>}
                  <div><strong>A:</strong> {r.assessment}</div>
                  <div><strong>P:</strong> {r.plan}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CPOE PHYSICIAN ORDERS ── */}
      {activeTab === 'CPOE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Order Placement Panel */}
          <div
            style={{
              background: 'var(--md-sys-color-surface, #ffffff)',
              border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* CPOE Sub-tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'MEDICATION', label: 'Inpatient Rx' },
                { id: 'LAB', label: 'Diagnostic / Lab' },
                { id: 'DIET', label: 'Clinical Diet' },
                { id: 'OT', label: 'OT Booking' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setCpoeSubTab(sub.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    background: cpoeSubTab === sub.id ? 'var(--md-sys-color-primary)' : 'transparent',
                    color: cpoeSubTab === sub.id ? '#ffffff' : 'var(--md-sys-color-on-surface)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Sub-form 1: Inpatient Medication */}
            {cpoeSubTab === 'MEDICATION' && (
              <form onSubmit={handleSaveMedOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Md3TextField
                  label="Medication Name & Salt *"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Inj. Ceftriaxone, Tab. Paracetamol"
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Md3TextField
                    label="Dosage (Strength) *"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1g, 500mg"
                    required
                  />
                  <Md3Select label="Route *" value={route} onChange={(e) => setRoute(e.target.value)}>
                    <option value="ORAL">Oral (PO)</option>
                    <option value="IV">Intravenous (IV)</option>
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutaneous (SC)</option>
                    <option value="INHALATION">Inhalation</option>
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
                  placeholder="e.g. Infuse in 100ml NS over 30 mins"
                />

                <Md3Button variant="filled" type="submit" loading={savingOrder}>
                  Order &amp; Transcribe to e-MAR
                </Md3Button>
              </form>
            )}

            {/* Sub-form 2: Diagnostic / Lab Order */}
            {cpoeSubTab === 'LAB' && (
              <form onSubmit={handleSaveLabOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  placeholder="e.g. Rule out sepsis, monitor electrolytes"
                />

                <Md3Button variant="filled" type="submit" loading={savingOrder}>
                  Submit Inpatient Lab Order
                </Md3Button>
              </form>
            )}

            {/* Sub-form 3: Clinical Diet */}
            {cpoeSubTab === 'DIET' && (
              <form onSubmit={handleSaveDietOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                <Md3Button variant="filled" type="submit" loading={savingOrder}>
                  Prescribe Clinical Diet
                </Md3Button>
              </form>
            )}

            {/* Sub-form 4: OT Booking */}
            {cpoeSubTab === 'OT' && (
              <form onSubmit={handleSaveOtBooking} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  placeholder="e.g. Keep 2 units PRBC cross-matched, pre-op cefazolin"
                />

                <Md3Button variant="filled" type="submit" loading={savingOrder}>
                  Book Operating Theatre Session
                </Md3Button>
              </form>
            )}
          </div>

          {/* Active Orders List */}
          <div
            style={{
              background: 'var(--md-sys-color-surface, #ffffff)',
              border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '600px',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Active Inpatient Physician Orders ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
                No active CPOE physician orders recorded for this admission.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o._id}
                  style={{
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{o.orderType}: {o.medication?.name || o.testName || o.dietTier || 'Physician Order'}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '100px', background: '#dcfce7', color: '#166534' }}>
                      {o.status}
                    </span>
                  </div>
                  {o.medication && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
                      {o.medication.dosage} • {o.medication.route} • {o.medication.frequency}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                    Ordered: {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: DISCHARGE & CLEARANCE KANBAN ── */}
      {activeTab === 'DISCHARGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Discharge Initiation Form (Only if not yet initiated) */}
          {(!currentAdmission?.dischargeSummary?.finalDiagnosis || currentAdmission?.status === 'ADMITTED') && (
            <div
              style={{
                background: 'var(--md-sys-color-surface, #ffffff)',
                border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Initiate Inpatient Discharge Order</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
                  Authorizes patient discharge and opens the 3-Way Clearance Kanban across Pharmacy, Ward Nursing, and Billing.
                </p>
              </div>

              <form onSubmit={handleInitiateDischarge} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Md3TextField
                  label="Final Discharge Diagnosis *"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Cholecystitis — S/P Laparoscopic Cholecystectomy"
                  required
                />

                <Md3TextField
                  label="Hospital Course &amp; Treatment Summary *"
                  value={courseInHospital}
                  onChange={(e) => setCourseInHospital(e.target.value)}
                  placeholder="e.g. Admitted via ER, managed surgically on Day 2, post-op vitals stable, ambulating independently"
                  required
                />

                <Md3TextField
                  label="Discharge Advice &amp; Take-Home Instructions *"
                  value={dischargeAdvice}
                  onChange={(e) => setDischargeAdvice(e.target.value)}
                  placeholder="e.g. Continue oral antibiotics for 5 days, keep surgical dressing dry, low fat diet"
                  required
                />

                <Md3TextField
                  label="Follow-Up Outpatient Review Date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
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
    </div>
  );
};

export default DoctorIpdCockpit;
