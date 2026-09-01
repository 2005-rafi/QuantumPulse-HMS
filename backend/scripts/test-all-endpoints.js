/**
 * scripts/test-all-endpoints.js
 * Comprehensive automated QA test validating permissions, response structures,
 * and data handling across all HMS API endpoints (including newly mounted IPD module).
 */
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { connectDB } = require('../src/core/database/connection');
const { createApp } = require('../src/core/app');
const config = require('../src/core/config');

async function testAllEndpoints() {
  console.log('\n======================================================');
  console.log('🧪 HMS SYSTEM-WIDE API & PERMISSION VALIDATION SUITE');
  console.log('======================================================\n');

  // Connect to DB
  await connectDB();

  // Launch express app
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const results = [];

  const runCheck = async (name, urlPath, options = {}, expectedStatus = 200) => {
    try {
      const res = await fetch(`${baseUrl}${urlPath}`, options);
      const isExpected = res.status === expectedStatus;
      let body;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      results.push({
        name,
        path: urlPath,
        status: res.status,
        expected: expectedStatus,
        pass: isExpected,
        bodySuccess: body?.status === 'success' || (expectedStatus !== 200),
      });

      console.log(`  ${isExpected ? '✅' : '❌'} [HTTP ${res.status}] ${name} -> ${urlPath}`);
      return { res, body };
    } catch (err) {
      results.push({
        name,
        path: urlPath,
        status: 'ERROR',
        expected: expectedStatus,
        pass: false,
        error: err.message,
      });
      console.log(`  ❌ [FAILED] ${name} -> ${urlPath}: ${err.message}`);
      return { res: null, body: null };
    }
  };

  try {
    // ── 1. UNPROTECTED HEALTH CHECK ──
    console.log('👉 [1/6] Validating System Health Endpoint...');
    await runCheck('System Health Probe', '/health', {}, 200);

    // ── 2. AUTHENTICATION & LOGIN ──
    console.log('\n👉 [2/6] Validating Authentication & Token Generation...');
    const { body: loginData } = await runCheck(
      'Staff Login',
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.initialAdmin.username,
          password: config.initialAdmin.password,
        }),
      },
      200
    );

    const token = loginData?.data?.accessToken;
    if (!token) {
      throw new Error('Authentication failed: No access token returned in login response');
    }
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // ── 3. CORE PLATFORM & ADMINISTRATION ──
    console.log('\n👉 [3/6] Validating Administration & Staffing Endpoints...');
    await runCheck('Auth Current User (Me)', '/auth/me', { headers: authHeaders });
    await runCheck('List Roles', '/roles', { headers: authHeaders });
    await runCheck('List Permissions', '/permissions', { headers: authHeaders });
    await runCheck('List Departments', '/departments', { headers: authHeaders });
    await runCheck('Get System Setting', '/settings/billing_template', { headers: authHeaders });
    await runCheck('List Staff Members', '/staff?page=1&limit=5', { headers: authHeaders });

    // ── 4. CLINICAL CARE & VISITS ──
    console.log('\n👉 [4/6] Validating Clinical OPD & Patient Records...');
    await runCheck('List Patients', '/patients?page=1&limit=5', { headers: authHeaders });
    await runCheck('Visit Statistics', '/visits/stats', { headers: authHeaders });
    await runCheck('Appointments Listing', '/appointments?limit=5', { headers: authHeaders });
    await runCheck('Available Doctors', '/appointments/doctors', { headers: authHeaders });
    await runCheck('Tariff Consultation Resolution', '/tariff/resolve?category=CONSULTATION&visitType=OPD', { headers: authHeaders });
    await runCheck('Laboratory Master Config', '/laboratory/config?includeInactive=true', { headers: authHeaders });

    // ── 5. INPATIENT DEPARTMENT (IPD) MODULE ──
    console.log('\n👉 [5/6] Validating Newly Mounted IPD Module Endpoints...');
    const { body: bedMapData } = await runCheck('Live Inpatient Bed Map', '/ipd/beds/map', { headers: authHeaders });
    assert(Array.isArray(bedMapData?.data), 'Bed map data must return an array of hospital floors');

    await runCheck('Inpatient Floors', '/ipd/beds/floors', { headers: authHeaders });
    await runCheck('Inpatient Rooms Query', '/ipd/beds/rooms', { headers: authHeaders });
    await runCheck('Inpatient Beds Query', '/ipd/beds/beds', { headers: authHeaders });
    await runCheck('Inpatient Admissions Query', '/ipd/admissions', { headers: authHeaders });
    await runCheck('Pending Deletion Requests', '/patients/deletion-requests/pending', { headers: authHeaders });

    // ── 6. PERMISSION BOUNDARIES & ERROR HANDLING ──
    console.log('\n👉 [6/6] Validating Permission Enforcement & Error Sanitization...');
    await runCheck('Reject Unauthenticated Request', '/ipd/beds/map', {}, 401);
    await runCheck('Handle Non-Existent Route (404)', '/non-existent-clinical-route', { headers: authHeaders }, 404);

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  const passedCount = results.filter((r) => r.pass).length;
  const totalCount = results.length;
  console.log('\n======================================================');
  console.log(`📊 TEST SUMMARY: ${passedCount}/${totalCount} ENDPOINTS VALIDATED SUCCESSFULLY`);
  console.log('======================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

testAllEndpoints().catch((err) => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
