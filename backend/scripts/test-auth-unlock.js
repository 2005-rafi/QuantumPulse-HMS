const API_BASE = 'http://localhost:7722/api/v1';

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function get(url, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { method: 'GET', headers });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runUnlockTests() {
  console.log('\n--- Running Workstation Auth & Unlock Tests ---\n');

  try {
    // 1. Login with admin
    console.log('[Test 1] Logging in as admin...');
    const loginRes = await post('/auth/login', {
      username: 'admin',
      password: 'Password123!',
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    console.log('✓ Login successful. Status:', loginRes.status);
    const { accessToken, refreshToken, user } = loginRes.data.data;

    // 2. Test /auth/me returns username
    console.log('\n[Test 2] Verifying /auth/me returns username...');
    const meRes = await get('/auth/me', accessToken);
    if (!meRes.ok) throw new Error(`me failed: ${JSON.stringify(meRes.data)}`);
    console.log('✓ /auth/me response username:', meRes.data.data.username);
    if (!meRes.data.data.username) {
      throw new Error('Username missing from /auth/me payload!');
    }
    console.log('✓ Username verified successfully in /auth/me payload.');

    // 3. Test /auth/unlock with Bearer token
    console.log('\n[Test 3] Testing /auth/unlock with Bearer token and valid password...');
    const unlockRes1 = await post(
      '/auth/unlock',
      { password: 'Password123!' },
      accessToken
    );
    if (!unlockRes1.ok) throw new Error(`unlock 1 failed: ${JSON.stringify(unlockRes1.data)}`);
    console.log('✓ Workstation unlocked via Bearer token. New accessToken issued:', Boolean(unlockRes1.data.data.accessToken));

    // 4. Test /auth/unlock with explicit username
    console.log('\n[Test 4] Testing /auth/unlock with explicit username...');
    const unlockRes2 = await post(
      '/auth/unlock',
      { username: 'admin', password: 'Password123!' }
    );
    if (!unlockRes2.ok) throw new Error(`unlock 2 failed: ${JSON.stringify(unlockRes2.data)}`);
    console.log('✓ Workstation unlocked via explicit username. New accessToken issued:', Boolean(unlockRes2.data.data.accessToken));

    // 5. Test /auth/unlock with incorrect password
    console.log('\n[Test 5] Testing /auth/unlock with invalid password (should fail)...');
    const badUnlock = await post(
      '/auth/unlock',
      { username: 'admin', password: 'WrongPassword!' }
    );
    if (badUnlock.status === 401) {
      console.log('✓ Correctly rejected with 401 Unauthorized:', badUnlock.data.message);
    } else {
      throw new Error(`Expected 401 Unauthorized but got ${badUnlock.status}`);
    }

    console.log('\n===========================================');
    console.log('🎉 ALL 5 AUTH UNLOCK TESTS PASSED (100%)');
    console.log('===========================================\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runUnlockTests();
