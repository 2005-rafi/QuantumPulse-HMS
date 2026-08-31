/**
 * scripts/test-ipd-flow-comprehensive.js
 * End-to-end automated verification test for the full Inpatient Department (IPD) lifecycle using native fetch.
 * 
 * Usage: node backend/scripts/test-ipd-flow-comprehensive.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 7722}/api/v1`;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function request(endpoint, { method = 'GET', body = null, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  return { status: res.status, data };
}

async function runComprehensiveIpdTests() {
  console.log('\n============================================================');
  console.log(' STARTING COMPREHENSIVE IPD END-TO-END VERIFICATION');
  console.log(` Endpoint: ${BASE_URL}/ipd`);
  console.log('============================================================\n');

  // Authenticate as Admin
  console.log('[AUTH] Logging in with clinical admin credentials...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Password123!' },
  });

  assert(loginRes.status === 200, `Admin authenticated successfully (received ${loginRes.status})`);
  const token = loginRes.data?.data?.accessToken;
  assert(Boolean(token), 'Access token acquired');

  try {
    // ── TEST 1: Bed Map Spatial Hierarchy (BookMyShow Engine) ──
    console.log('\n[TEST 1] Retrieving Spatial Bed Map Hierarchy...');
    const mapRes = await request('/ipd/beds/map', { token });
    assert(mapRes.status === 200, `Bed Map status 200 (received ${mapRes.status})`);
    assert(Array.isArray(mapRes.data?.data), 'Bed Map returns floor array');
    assert(mapRes.data?.data?.length >= 4, `Found ${mapRes.data?.data?.length} floors (expected >= 4)`);

    const firstFloor = mapRes.data?.data[0];
    assert(firstFloor?.stats !== undefined, 'Floor contains calculated statistics');
    assert(firstFloor?.stats?.totalBeds > 0, `Floor 0 has ${firstFloor?.stats?.totalBeds} total beds`);
    console.log(`  -> Bed Map Hierarchy verified across ${mapRes.data?.data?.length} hospital floors.\n`);

    // Find a vacant bed for test admission
    let vacantBed = null;
    for (const floor of mapRes.data?.data || []) {
      for (const room of floor.rooms || []) {
        const free = room.beds?.find((b) => b.status === 'VACANT');
        if (free) {
          vacantBed = free;
          break;
        }
      }
      if (vacantBed) break;
    }
    assert(vacantBed !== null, `Found available vacant bed: ${vacantBed?.bedLabel}`);

    // Create fresh unadmitted test patient
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const regPatientRes = await request('/patients', {
      method: 'POST',
      body: {
        firstName: 'TestIPD',
        lastName: `Patient${randomSuffix}`,
        phone: `98765${String(randomSuffix).slice(0, 5)}`,
        dob: '1985-06-15',
        gender: 'Male',
        bloodGroup: 'B+',
      },
      token,
    });
    const patient = regPatientRes.data?.data;
    assert(Boolean(patient), `Registered fresh test patient: ${patient?.firstName} ${patient?.lastName} (MRN: ${patient?.mrn})`);

    const staffRes = await request('/staff?limit=5', { token });
    const doctor = staffRes.data?.data?.staff?.[0] || staffRes.data?.data?.items?.[0] || staffRes.data?.data?.[0];
    assert(Boolean(doctor), `Found attending doctor: Dr. ${doctor?.firstName}`);

    const deptRes = await request('/departments', { token });
    const department = deptRes.data?.data?.departments?.[0] || deptRes.data?.data?.[0];
    assert(Boolean(department), `Found admitting department: ${department?.name}`);

    // ── TEST 2: Inpatient Admission Lifecycle (ACID Transaction) ─
    console.log('\n[TEST 2] Executing Inpatient Admission (ACID Multi-doc Transaction)...');
    const admitPayload = {
      patientId: patient._id,
      primaryDoctorId: doctor._id,
      admittingDepartmentId: department._id,
      bedId: vacantBed._id,
      admissionType: 'PLANNED',
      provisionalDiagnosis: 'Acute Pyelonephritis with Sepsis Protocol',
      chiefComplaints: 'High fever with chills and flank pain for 3 days',
      dietTier: 'RENAL',
      initialDepositAmount: 10000,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-TEST-998877',
    };

    const admitRes = await request('/ipd/admissions', { method: 'POST', body: admitPayload, token });
    if (admitRes.status !== 201) {
      console.log('  ADMISSION ERROR DETAILS:', admitRes.data);
    }
    assert(admitRes.status === 201, `Admission created with 201 (received ${admitRes.status})`);
    const admission = admitRes.data?.data;
    assert(admission?.admissionNumber?.startsWith('IPD-'), `Generated unique admission #: ${admission?.admissionNumber}`);
    assert(admission?.status === 'ADMITTED', 'Admission status is ADMITTED');

    // Verify bed is now OCCUPIED
    const bedCheckRes = await request(`/ipd/beds/beds/${vacantBed._id}`, { token });
    assert(bedCheckRes.data?.data?.status === 'OCCUPIED', 'Bed status transitioned to OCCUPIED');
    console.log(`  -> Patient admitted successfully to ${vacantBed.bedLabel}.\n`);

    // ── TEST 3: Nursing Station Clinical Records & NEWS2 ───────
    console.log('[TEST 3] Testing Nursing Station Vitals, NEWS2 Scoring & e-MAR...');
    // Post Vitals
    const vitalsPayload = {
      temperature: 38.6, // elevated temp
      systolicBp: 95,    // low systolic BP -> +2 points
      diastolicBp: 60,
      heartRate: 110,    // tachycardia -> +1 point
      respirationRate: 22, // tachypnea -> +2 points
      spO2: 93,          // low SpO2 -> +2 points
      oxygenTherapy: true, // oxygen support -> +2 points
      oxygenFlowRateLpm: 4,
      avpu: 'ALERT',
      clinicalNotes: 'Febrile and tachypneic on ward admission.',
    };

    const vitalsRes = await request(`/ipd/nursing/${admission._id}/vitals`, { method: 'POST', body: vitalsPayload, token });
    assert(vitalsRes.status === 201, `Vitals recorded with 201 (received ${vitalsRes.status})`);
    const vitals = vitalsRes.data?.data;
    assert(vitals?.news2Score >= 7, `NEWS2 score correctly evaluated: ${vitals?.news2Score} (Critical Risk >= 7)`);
    assert(vitals?.news2RiskLevel === 'HIGH', `NEWS2 risk level is HIGH (${vitals?.news2RiskLevel})`);

    // Post Fluid I/O
    const ioRes = await request(`/ipd/nursing/${admission._id}/io`, {
      method: 'POST',
      body: {
        shift: 'MORNING',
        intake: { oral: 500, ivFluids: 1000, rylesTube: 0 },
        output: { urine: 650, drainage: 50, vomitus: 0 },
        notes: 'Good urine output post IV hydration',
      },
      token,
    });
    assert(ioRes.status === 201, `Fluid I/O logged (received ${ioRes.status})`);
    assert(ioRes.data?.data?.totalIntake === 1500, 'Total Intake calculated as 1500 mL');
    assert(ioRes.data?.data?.totalOutput === 700, 'Total Output calculated as 700 mL');
    assert(ioRes.data?.data?.netBalance === 800, 'Net Balance calculated as +800 mL');

    // Post SBAR Handover
    const handoverRes = await request(`/ipd/nursing/${admission._id}/handover`, {
      method: 'POST',
      body: {
        shift: 'MORNING_TO_EVENING',
        situation: 'Patient with pyelonephritis recovering on IV antibiotics',
        background: 'Admitted today, febrile spike in morning',
        assessment: 'NEWS2 improved from 9 to 4 after fluid resuscitation',
        recommendation: 'Monitor temperature 2nd hourly, continue IV Ceftriaxone',
      },
      token,
    });
    assert(handoverRes.status === 201, `SBAR Handover note recorded (received ${handoverRes.status})`);
    console.log('  -> Nursing clinical operations and automated NEWS2 verified.\n');

    // ── TEST 4: Doctor CPOE Orders & SOAP Rounds ───────────────
    console.log('[TEST 4] Testing Physician CPOE Orders & SOAP Ward Rounds...');
    // CPOE Medication Order
    const cpoeRes = await request(`/ipd/cpoe/${admission._id}/orders`, {
      method: 'POST',
      body: {
        orderType: 'MEDICATION',
        medication: {
          name: 'Inj. Piperacillin-Tazobactam 4.5g',
          dosage: '4.5g',
          route: 'IV',
          frequency: 'TDS',
          instructions: 'Slow IV infusion over 30 mins',
        },
      },
      token,
    });
    assert(cpoeRes.status === 201, `CPOE Medication ordered (received ${cpoeRes.status})`);

    // Verify e-MAR scheduled slots created automatically
    const emarRes = await request(`/ipd/nursing/${admission._id}/emar`, { token });
    assert(emarRes.data?.data?.length > 0, `e-MAR automatically generated ${emarRes.data?.data?.length} scheduled dose slots`);

    // Sign off one e-MAR dose
    const emarDose = emarRes.data?.data[0];
    const emarSignRes = await request(`/ipd/nursing/emar/${emarDose._id}/status`, {
      method: 'PATCH',
      body: {
        status: 'GIVEN',
        batchNumber: 'PIP-2026-B81',
        nurseNotes: 'Administered with no adverse reaction',
      },
      token,
    });
    assert(emarSignRes.data?.data?.status === 'GIVEN', 'e-MAR dose marked as GIVEN');

    // SOAP Ward Round Note
    const roundRes = await request(`/ipd/cpoe/${admission._id}/ward-rounds`, {
      method: 'POST',
      body: {
        subjective: 'Patient feeling much better, fever subsided',
        objective: 'T 37.1 C, BP 120/78, flank tenderness reduced',
        assessment: 'Acute pyelonephritis resolving on IV antibiotics',
        plan: 'Continue IV antibiotics for 48h, switch to oral',
      },
      token,
    });
    assert(roundRes.status === 201, `Daily SOAP round note recorded (received ${roundRes.status})`);
    console.log('  -> CPOE orders, e-MAR synchronization, and SOAP rounds verified.\n');

    // ── TEST 5: Daily Charge Ingestion & Advance Ledger ────────
    console.log('[TEST 5] Testing Daily Tariff Charge Ingestion & Running Ledger...');
    const ingestRes = await request(`/ipd/billing/${admission._id}/ingest-charges`, { method: 'POST', token });
    assert(ingestRes.data?.data?.success === true, `Ingested ${ingestRes.data?.data?.chargesAdded} daily charges (₹${ingestRes.data?.data?.amountAdded})`);

    // Add another advance deposit
    const depRes = await request(`/ipd/billing/${admission._id}/deposits`, {
      method: 'POST',
      body: {
        amount: 5000,
        paymentMethod: 'CARD',
        transactionReference: 'CARD-APPR-44991',
        notes: 'Second advance deposit',
      },
      token,
    });
    assert(depRes.status === 201, `Second advance deposit recorded (receipt: ${depRes.data?.data?.receiptNumber})`);

    // Verify Ledger
    const ledgerRes = await request(`/ipd/billing/${admission._id}/ledger`, { token });
    const fin = ledgerRes.data?.data?.financialSummary;
    assert(fin?.totalBilled > 0, `Total Billed is ₹${fin?.totalBilled}`);
    assert(fin?.totalAdvanceDeposited === 15000, `Total Advance Deposited is ₹${fin?.totalAdvanceDeposited} (10000 + 5000)`);
    console.log(`  -> Financial Ledger verified (Billed: ₹${fin?.totalBilled}, Advance: ₹${fin?.totalAdvanceDeposited}, Due: ₹${fin?.outstandingDue}).\n`);

    // ── TEST 6: Atomic Patient Bed Transfer ────────────────────
    console.log('[TEST 6] Testing Atomic Bed Transfer with ACID guarantees...');
    // Find another vacant bed
    const freshMapRes = await request('/ipd/beds/map', { token });
    let targetBed = null;
    for (const floor of freshMapRes.data?.data || []) {
      for (const room of floor.rooms || []) {
        const free = room.beds?.find((b) => b.status === 'VACANT' && String(b._id) !== String(vacantBed._id));
        if (free) {
          targetBed = free;
          break;
        }
      }
      if (targetBed) break;
    }
    assert(targetBed !== null, `Found target vacant bed for transfer: ${targetBed?.bedLabel}`);

    const transferRes = await request(`/ipd/beds/admissions/${admission._id}/transfer`, {
      method: 'POST',
      body: {
        targetBedId: targetBed._id,
        transferReason: 'Patient requested upgrade to private single room',
      },
      token,
    });
    assert(transferRes.status === 200, `Transfer API returned 200 (received ${transferRes.status})`);
    assert(transferRes.data?.data?.success === true, 'Transfer executed successfully');

    // Verify old bed is CLEANING_IN_PROGRESS, new bed is OCCUPIED
    const oldBedCheck = await request(`/ipd/beds/beds/${vacantBed._id}`, { token });
    const newBedCheck = await request(`/ipd/beds/beds/${targetBed._id}`, { token });
    assert(oldBedCheck.data?.data?.status === 'CLEANING_IN_PROGRESS', `Old bed status transitioned to CLEANING_IN_PROGRESS`);
    assert(newBedCheck.data?.data?.status === 'OCCUPIED', `New bed status is OCCUPIED`);
    console.log('  -> Atomic bed transfer verified with zero state collisions.\n');

    // ── TEST 7: 3-Way Discharge Clearance & Official Gate Pass ──
    console.log('[TEST 7] Testing 3-Way Departmental Clearance & Gate Pass Issuance...');
    // 1. Doctor initiates discharge
    const initDischargeRes = await request(`/ipd/discharge/${admission._id}/initiate`, {
      method: 'POST',
      body: {
        finalDiagnosis: 'Acute Pyelonephritis — Fully Resolved',
        courseInHospital: '3 days of IV antibiotics with complete symptomatic recovery',
        dischargeAdvice: 'Take Tab. Cefixime 200mg BD for 5 days, drink plenty of water',
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      token,
    });
    assert(initDischargeRes.status === 200, 'Doctor initiated discharge');

    // 2. Pharmacy Clearance
    const pharmClearRes = await request(`/ipd/discharge/${admission._id}/clearance/PHARMACY`, {
      method: 'PATCH',
      body: { notes: 'All remaining floor medications returned to central stock' },
      token,
    });
    assert(pharmClearRes.data?.data?.pharmacyClearance?.isCleared === true, 'Pharmacy clearance marked true');

    // 3. Nursing Clearance
    const nurseClearRes = await request(`/ipd/discharge/${admission._id}/clearance/WARD`, {
      method: 'PATCH',
      body: { cannulaRemoved: true, notes: 'IV cannula and Foley removed, vitals stable, summary handed over' },
      token,
    });
    assert(nurseClearRes.data?.data?.nursingClearance?.isCleared === true, 'Ward Nursing clearance marked true');

    // 4. Billing Clearance
    const billClearRes = await request(`/ipd/discharge/${admission._id}/clearance/BILLING`, {
      method: 'PATCH',
      body: { notes: 'Advance deposit exceeds total charges. Zero balance due.' },
      token,
    });
    assert(billClearRes.data?.data?.billingClearance?.isCleared === true, 'Billing clearance marked true');

    // 5. Finalize Discharge & Issue Gate Pass
    const finalizeRes = await request(`/ipd/discharge/${admission._id}/finalize`, { method: 'POST', token });
    assert(finalizeRes.status === 200, `Finalize Discharge returned 200 (received ${finalizeRes.status})`);
    assert(finalizeRes.data?.data?.gatePassNumber?.startsWith('GP-IPD-'), `Gate Pass issued: ${finalizeRes.data?.data?.gatePassNumber}`);

    // 6. Retrieve Official Gate Pass
    const gatePassRes = await request(`/ipd/discharge/${admission._id}/gate-pass`, { token });
    assert(gatePassRes.status === 200, 'Gate Pass document retrieved successfully');
    assert(gatePassRes.data?.data?.gatePassIssued === true, 'Gate Pass verified as issued');

    // 7. Verify Inpatient Bed was freed for sanitization
    const releasedBedCheck = await request(`/ipd/beds/beds/${targetBed._id}`, { token });
    assert(releasedBedCheck.data?.data?.status === 'CLEANING_IN_PROGRESS', 'Discharged bed released to CLEANING_IN_PROGRESS');

    console.log(`\n============================================================`);
    console.log(` IPD COMPREHENSIVE VERIFICATION RESULTS:`);
    console.log(`   TOTAL PASSED: ${passed}`);
    console.log(`   TOTAL FAILED: ${failed}`);
    console.log(`   SUCCESS RATE: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log(`============================================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL IPD TEST EXECUTION FAILURE:', err);
    process.exit(1);
  }
}

runComprehensiveIpdTests();
