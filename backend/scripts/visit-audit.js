const API_URL = 'http://localhost:7722/api/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw { message: data.message, data };
  return data;
}

async function runAudit() {
  console.log('--- STARTING STAGE 3 VISIT AUDIT ---\n');

  try {
    // 1. Reception logs in
    console.log('1. Logging in as Reception...');
    const recLogin = await fetchJSON(`${API_URL}/auth/login`, {
      method: 'POST', body: JSON.stringify({ username: 'reception1', password: 'Password123!' })
    });
    const recToken = recLogin.data.accessToken;

    // 2. Register Patient
    console.log('2. Registering Patient...');
    const patientData = {
      firstName: 'Audit', lastName: 'Patient', dob: '1990-01-01', gender: 'Male', phone: '1234567890'
    };
    const patientRes = await fetchJSON(`${API_URL}/patients`, {
      method: 'POST', body: JSON.stringify(patientData),
      headers: { Authorization: `Bearer ${recToken}` }
    });
    const patientId = patientRes.data._id;
    console.log(`-> Patient created: ${patientId}`);

    // 3. Get Departments
    const deptRes = await fetchJSON(`${API_URL}/departments`, {
      headers: { Authorization: `Bearer ${recToken}` }
    });
    const deptId = deptRes.data[0]._id;

    // 4. Create Visit
    console.log('4. Checking in patient (Creating Visit)...');
    const visitRes = await fetchJSON(`${API_URL}/visits`, {
      method: 'POST', body: JSON.stringify({ patientId }),
      headers: { Authorization: `Bearer ${recToken}` }
    });
    const visitId = visitRes.data._id;
    console.log(`-> Visit created: ${visitRes.data.visitNumber}, Status: ${visitRes.data.status}`);

    // 5. Nurse logs in
    console.log('\n5. Logging in as Nurse...');
    const nurseLogin = await fetchJSON(`${API_URL}/auth/login`, {
      method: 'POST', body: JSON.stringify({ username: 'nurse1', password: 'Nurse@1234' })
    });
    const nurseToken = nurseLogin.data.accessToken;

    // 6. Nurse checks Triage Queue
    console.log('6. Nurse fetching WAITING_TRIAGE queue...');
    const triageQueue = await fetchJSON(`${API_URL}/visits/queue/WAITING_TRIAGE`, {
      headers: { Authorization: `Bearer ${nurseToken}` }
    });
    console.log(`-> Found ${triageQueue.data.total} patients waiting for triage.`);

    // 7. Nurse records vitals and assigns department
    console.log('7. Nurse recording vitals and assigning to department...');
    const vitalsRes = await fetchJSON(`${API_URL}/visits/${visitId}/vitals`, {
      method: 'PATCH', body: JSON.stringify({
        departmentId: deptId,
        height: 180, weight: 75, bloodPressure: '120/80', temperature: 98.6, pulse: 72, oxygenSaturation: 99
      }),
      headers: { Authorization: `Bearer ${nurseToken}` }
    });
    console.log(`-> Vitals recorded. New Status: ${vitalsRes.data.status}`);

    // 8. Doctor logs in
    console.log('\n8. Logging in as Doctor...');
    const docLogin = await fetchJSON(`${API_URL}/auth/login`, {
      method: 'POST', body: JSON.stringify({ username: 'doctor1', password: 'Doctor@1234' })
    });
    const docToken = docLogin.data.accessToken;

    // 9. Doctor checks Waiting Queue
    console.log('9. Doctor fetching WAITING_DOCTOR queue...');
    const docQueue = await fetchJSON(`${API_URL}/visits/queue/WAITING_DOCTOR`, {
      headers: { Authorization: `Bearer ${docToken}` }
    });
    console.log(`-> Found ${docQueue.data.total} patients waiting for doctor.`);

    // 9.5. Doctor starts consultation
    console.log('9.5 Doctor starting consultation...');
    const startRes = await fetchJSON(`${API_URL}/visits/${visitId}/start`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${docToken}` }
    });
    console.log(`-> Consultation started. Status: ${startRes.data.status}`);

    // 10. Doctor saves a draft note
    console.log('10. Doctor saving a draft consultation note...');
    const draftRes = await fetchJSON(`${API_URL}/visits/${visitId}/consultation/draft`, {
      method: 'PATCH', body: JSON.stringify({
        chiefComplaint: 'Fever and headache',
        notes: 'Patient looks pale.'
      }),
      headers: { Authorization: `Bearer ${docToken}` }
    });
    console.log(`-> Draft saved. Status: ${draftRes.data.status}`);

    // 11. Doctor finalizes consultation
    console.log('11. Doctor finalizing consultation...');
    const completeRes = await fetchJSON(`${API_URL}/visits/${visitId}/consultation/finalize`, {
      method: 'PATCH', body: JSON.stringify({
        chiefComplaint: 'Fever and headache',
        diagnosis: 'Viral Infection',
        treatmentPlan: 'Rest and hydration. Paracetamol 500mg.',
        prescribedMedications: ['Paracetamol 500mg'],
        orderedLabTests: ['CBC', 'Blood Culture']
      }),
      headers: { Authorization: `Bearer ${docToken}` }
    });
    console.log(`-> Consultation completed. Final Status: ${completeRes.data.status}`);

    // 12. Lab logs in
    console.log('\n12. Logging in as Lab Technician...');
    const labLogin = await fetchJSON(`${API_URL}/auth/login`, {
      method: 'POST', body: JSON.stringify({ username: 'lab1', password: 'Lab@12345' })
    });
    const labToken = labLogin.data.accessToken;

    // 13. Lab checks Waiting Queue
    console.log('13. Lab fetching WAITING_LAB queue...');
    const labQueue = await fetchJSON(`${API_URL}/visits/queue/WAITING_LAB`, {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    console.log(`-> Found ${labQueue.data.total} patients waiting for lab.`);

    // 14. Lab processes test
    console.log('14. Lab processing test results...');
    const labRes = await fetchJSON(`${API_URL}/laboratory/visits/${visitId}/process`, {
      method: 'PATCH', body: JSON.stringify({
        report: 'CBC results: WBC 8.5, RBC 4.2. All within normal limits.'
      }),
      headers: { Authorization: `Bearer ${labToken}` }
    });
    console.log(`-> Lab processed. Final Status: ${labRes.data.status}`);

    console.log('\n✅ ALL STAGE 4 AUDIT CHECKS PASSED!');

  } catch (err) {
    console.error('\n❌ AUDIT FAILED');
    console.error(JSON.stringify(err, null, 2));
  }
}

runAudit();
