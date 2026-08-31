/**
 * features/ipd/NurseIpdStation.jsx
 * Inpatient Nursing Clinical Workstation (Vitals & NEWS2, e-MAR, Fluid I/O, SBAR Handovers).
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import EmarMedicationGrid from '../../components/ipd/EmarMedicationGrid';
import IoBalanceCard from '../../components/ipd/IoBalanceCard';
import SbarHandoverForm from '../../components/ipd/SbarHandoverForm';
import { Md3Button, Md3TextField, Md3Select, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import ipdApi from '../../services/ipdApi';

export const NurseIpdStation = () => {
  const { admissionId } = useParams();
  const navigate = useNavigate();

  const [admissionList, setAdmissionList] = useState([]);
  const [currentAdmission, setCurrentAdmission] = useState(null);
  const [vitalsList, setVitalsList] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [emarRecords, setEmarRecords] = useState([]);
  const [ioRecords, setIoRecords] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vitals record bottom sheet
  const [showVitalsSheet, setShowVitalsSheet] = useState(false);
  const [temp, setTemp] = useState('37.0');
  const [sysBp, setSysBp] = useState('120');
  const [diaBp, setDiaBp] = useState('80');
  const [hr, setHr] = useState('75');
  const [rr, setRr] = useState('16');
  const [spo2, setSpo2] = useState('98');
  const [o2Therapy, setO2Therapy] = useState(false);
  const [o2Flow, setO2Flow] = useState('0');
  const [avpu, setAvpu] = useState('ALERT');
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);

  // Load admissions list if no specific admissionId
  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
        const list = res.data?.data || [];
        setAdmissionList(list);
        if (!admissionId && list.length > 0) {
          navigate(`/dashboard/nurse/ipd/${list[0]._id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load active admissions:', err);
      }
    };
    fetchAdmissions();
  }, [admissionId, navigate]);

  // Load admission clinical data
  const loadClinicalData = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const [admRes, vitRes, emarRes, ioRes, handRes] = await Promise.allSettled([
        ipdApi.getAdmissionById(admissionId),
        ipdApi.getVitals(admissionId),
        ipdApi.getEmarGrid(admissionId),
        ipdApi.getIO(admissionId),
        ipdApi.getHandovers(admissionId),
      ]);

      if (admRes.status === 'fulfilled') {
        setCurrentAdmission(admRes.value.data?.data || null);
      }
      if (vitRes.status === 'fulfilled') {
        const vList = vitRes.value.data?.data || [];
        setVitalsList(vList);
        setLatestVitals(vList[0] || null);
      }
      if (emarRes.status === 'fulfilled') {
        setEmarRecords(emarRes.value.data?.data || []);
      }
      if (ioRes.status === 'fulfilled') {
        setIoRecords(ioRes.value.data?.data || []);
      }
      if (handRes.status === 'fulfilled') {
        setHandovers(handRes.value.data?.data || []);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load inpatient clinical records:', err);
    }
  };

  useEffect(() => {
    loadClinicalData();
  }, [admissionId]);

  // Record vitals & NEWS2
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    setSavingVitals(true);
    try {
      await ipdApi.recordVitals(admissionId, {
        temperature: parseFloat(temp),
        systolicBp: parseInt(sysBp, 10),
        diastolicBp: parseInt(diaBp, 10),
        heartRate: parseInt(hr, 10),
        respirationRate: parseInt(rr, 10),
        spO2: parseInt(spo2, 10),
        oxygenTherapy: o2Therapy,
        oxygenFlowRateLpm: parseFloat(o2Flow) || 0,
        avpu,
        clinicalNotes: vitalsNotes,
      });
      setShowVitalsSheet(false);
      await loadClinicalData();
      alert('Vitals evaluated & NEWS2 score calculated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setSavingVitals(false);
    }
  };

  // e-MAR updates
  const handleUpdateEmar = async (emarId, status, details) => {
    try {
      await ipdApi.updateEmarStatus(emarId, status, details);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update e-MAR dose');
    }
  };

  // Log I/O
  const handleLogIO = async (data) => {
    try {
      await ipdApi.logIO(admissionId, data);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log fluid balance');
    }
  };

  // SBAR Handover
  const handleCreateHandover = async (data) => {
    try {
      await ipdApi.createHandover(admissionId, data);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create handover');
    }
  };

  const handleAcknowledgeHandover = async (handoverId) => {
    try {
      await ipdApi.acknowledgeHandover(handoverId);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge handover');
    }
  };

  if (!admissionId && admissionList.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--md-sys-color-outline)' }}>
        No currently active inpatient admissions found. Admit a patient from Reception / Bed Map to open the Nursing Station.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Patient Switcher & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Inpatient Nursing Station &amp; Care Deck
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Automated NEWS2 Telemetry • 24-Hr e-MAR Charting • Shift Fluid I/O • SBAR Handover Notes
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '280px' }}>
            <Md3Select
              label="Switch Inpatient Roster"
              value={admissionId || ''}
              onChange={(e) => navigate(`/dashboard/nurse/ipd/${e.target.value}`)}
            >
              {admissionList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.patientId?.firstName} {a.patientId?.lastName} (Bed: {a.currentBedId?.bedLabel || a.currentBedId?.bedNumber || '—'})
                </option>
              ))}
            </Md3Select>
          </div>

          <Md3Button variant="filled" onClick={() => setShowVitalsSheet(true)}>
            + Record Vitals &amp; NEWS2
          </Md3Button>
        </div>
      </div>

      {/* Sticky Inpatient Banner */}
      {currentAdmission && (
        <IpdPatientBanner admission={currentAdmission} latestVitals={latestVitals} />
      )}

      {/* Main Clinical Grid: e-MAR & I/O & SBAR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* e-MAR 24-hr Medication Matrix */}
        <EmarMedicationGrid
          records={emarRecords}
          onUpdateStatus={handleUpdateEmar}
        />

        {/* Fluid I/O Balance */}
        <IoBalanceCard
          ioRecords={ioRecords}
          onLogIO={handleLogIO}
        />

        {/* SBAR Shift Handover */}
        <SbarHandoverForm
          handovers={handovers}
          onCreateHandover={handleCreateHandover}
          onAcknowledge={handleAcknowledgeHandover}
        />
      </div>

      {/* Record Vitals Bottom Sheet */}
      <Md3BottomSheet
        isOpen={showVitalsSheet}
        onClose={() => setShowVitalsSheet(false)}
        title="Record Inpatient Vitals &amp; NEWS2 Telemetry"
        subtitle="System evaluates early clinical deterioration risk score according to NHS NEWS2 protocol"
      >
        <form onSubmit={handleSaveVitals} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Body Temp (°C) *" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} required />
            <Md3TextField label="Heart Rate (BPM) *" type="number" value={hr} onChange={(e) => setHr(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Systolic BP (mmHg) *" type="number" value={sysBp} onChange={(e) => setSysBp(e.target.value)} required />
            <Md3TextField label="Diastolic BP (mmHg) *" type="number" value={diaBp} onChange={(e) => setDiaBp(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Respiration Rate (bpm) *" type="number" value={rr} onChange={(e) => setRr(e.target.value)} required />
            <Md3TextField label="SpO2 (%) *" type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={o2Therapy} onChange={(e) => setO2Therapy(e.target.checked)} />
              <span>Supplemental Oxygen Therapy</span>
            </label>
            {o2Therapy && (
              <Md3TextField label="Flow Rate (L/min)" type="number" value={o2Flow} onChange={(e) => setO2Flow(e.target.value)} />
            )}
          </div>

          <Md3Select label="Consciousness Level (AVPU Scale) *" value={avpu} onChange={(e) => setAvpu(e.target.value)}>
            <option value="ALERT">Alert (A)</option>
            <option value="VOICE">Responds to Voice (V)</option>
            <option value="PAIN">Responds to Pain (P)</option>
            <option value="UNRESPONSIVE">Unresponsive (U)</option>
          </Md3Select>

          <Md3TextField
            label="Clinical Observation Notes"
            value={vitalsNotes}
            onChange={(e) => setVitalsNotes(e.target.value)}
            placeholder="e.g. Chest clear, patient calm and resting comfortably"
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '14px' }}>
            <Md3Button variant="secondary" type="button" onClick={() => setShowVitalsSheet(false)}>
              Cancel
            </Md3Button>
            <Md3Button variant="filled" type="submit" loading={savingVitals}>
              Evaluate &amp; Save Vitals
            </Md3Button>
          </div>
        </form>
      </Md3BottomSheet>
    </div>
  );
};

export default NurseIpdStation;
