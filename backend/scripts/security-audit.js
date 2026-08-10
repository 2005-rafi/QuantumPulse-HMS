const http = require('http');

function req(method, path, body, token) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path: '/api/v1' + path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    };
    const r = http.request(opts, (resp) => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try { res({ status: resp.statusCode, headers: resp.headers, body: JSON.parse(d) }); }
        catch { res({ status: resp.statusCode, headers: resp.headers, body: d }); }
      });
    });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

const results = [];
const PASS = (name, note = '') => { console.log('  PASS  ' + name + (note ? ' | ' + note : '')); results.push({ name, status: 'PASS', note }); };
const FAIL = (name, note = '') => { console.log('  FAIL  ' + name + (note ? ' | ' + note : '')); results.push({ name, status: 'FAIL', note }); };
const INFO = (name, note = '') => { console.log('  INFO  ' + name + (note ? ' | ' + note : '')); results.push({ name, status: 'INFO', note }); };

async function audit() {
  // ── Bootstrap ────────────────────────────────────────────────────────────
  let r = await req('POST', '/auth/login', { username: 'admin', password: 'Admin@1234' });
  const adminToken = r.body.data.accessToken;
  const adminRefresh = r.body.data.refreshToken;

  r = await req('POST', '/auth/login', { username: 'reception1', password: 'Reception@1234' });
  const recToken = r.body.data.accessToken;

  r = await req('POST', '/auth/login', { username: 'nurse1', password: 'Nurse@1234' });
  const nurseToken = r.body.data.accessToken;

  // ── SECTION 1: Authentication Flow ───────────────────────────────────────
  console.log('\n=== SECTION 1: Authentication Flow ===');

  // All 6 roles login
  const accounts = [
    { u: 'admin', p: 'Admin@1234', role: 'Administrator' },
    { u: 'reception1', p: 'Reception@1234', role: 'Reception' },
    { u: 'nurse1', p: 'Nurse@1234', role: 'Nurse' },
    { u: 'doctor1', p: 'Doctor@1234', role: 'Doctor' },
    { u: 'lab1', p: 'Lab@12345', role: 'Laboratory' },
    { u: 'pharmacy1', p: 'Pharma@1234', role: 'Pharmacy' },
  ];
  for (const acc of accounts) {
    r = await req('POST', '/auth/login', { username: acc.u, password: acc.p });
    const got = r.body.data?.user?.role;
    (r.status === 200 && got === acc.role) ? PASS('Login ' + acc.u + ' -> ' + got) : FAIL('Login ' + acc.u, 'Expected ' + acc.role + ' got ' + got);
  }

  // Wrong password - no field enumeration
  r = await req('POST', '/auth/login', { username: 'admin', password: 'WRONG' });
  (r.status === 401 && r.body.errorCode === 'AUTH_001') ? PASS('Wrong password -> AUTH_001') : FAIL('Wrong password', JSON.stringify(r.body));

  // Wrong username - same code as wrong password (no enumeration)
  r = await req('POST', '/auth/login', { username: 'nonexistentXYZ999', password: 'anything' });
  (r.status === 401 && r.body.errorCode === 'AUTH_001') ? PASS('Wrong username -> AUTH_001 (no user enumeration)') : FAIL('Wrong username enumeration', JSON.stringify(r.body));

  // Long username
  r = await req('POST', '/auth/login', { username: 'a'.repeat(200), password: 'x' });
  r.status === 422 ? PASS('Long username (200 chars) -> 422') : FAIL('Long username not rejected', 'Status: ' + r.status);

  // Empty fields
  r = await req('POST', '/auth/login', { password: 'Admin@1234' });
  r.status === 422 ? PASS('Missing username -> 422') : FAIL('Missing username not caught', 'Status: ' + r.status);

  r = await req('POST', '/auth/login', { username: 'admin' });
  r.status === 422 ? PASS('Missing password -> 422') : FAIL('Missing password not caught', 'Status: ' + r.status);

  // No token
  r = await req('GET', '/auth/me');
  (r.status === 401 && r.body.errorCode === 'AUTH_007') ? PASS('No token -> AUTH_007') : FAIL('No token handling', JSON.stringify(r.body));

  // Malformed token
  r = await req('GET', '/auth/me', null, 'not.a.valid.jwt.token');
  r.status === 401 ? PASS('Malformed JWT -> 401') : FAIL('Malformed JWT accepted', 'Status: ' + r.status);

  // ── SECTION 2: RBAC Matrix ────────────────────────────────────────────────
  console.log('\n=== SECTION 2: RBAC Authorization Matrix ===');

  // Reception cannot access admin endpoints
  r = await req('GET', '/staff', null, recToken);
  (r.status === 403 && r.body.errorCode === 'AUTHZ_001') ? PASS('Reception: /staff -> AUTHZ_001') : FAIL('Reception /staff not blocked', JSON.stringify(r.body));

  r = await req('GET', '/roles', null, recToken);
  r.status === 403 ? PASS('Reception: /roles -> 403') : FAIL('Reception /roles not blocked', 'Status: ' + r.status);

  r = await req('GET', '/permissions', null, recToken);
  r.status === 403 ? PASS('Reception: /permissions -> 403') : FAIL('Reception /permissions not blocked', 'Status: ' + r.status);

  r = await req('POST', '/staff', { fullName: 'Hacker', roleId: '000000000000000000000001', departmentId: '000000000000000000000001' }, recToken);
  r.status === 403 ? PASS('Reception: POST /staff -> 403') : FAIL('Reception can create staff!', 'Status: ' + r.status);

  r = await req('POST', '/identity', { staffId: '000000000000000000000001', username: 'hacked', password: 'hacked' }, recToken);
  r.status === 403 ? PASS('Reception: POST /identity -> 403') : FAIL('Reception can create identities!', 'Status: ' + r.status);

  // Nurse cannot access admin
  r = await req('GET', '/staff', null, nurseToken);
  r.status === 403 ? PASS('Nurse: /staff -> 403') : FAIL('Nurse /staff not blocked', 'Status: ' + r.status);

  // Admin has access
  r = await req('GET', '/staff', null, adminToken);
  r.status === 200 ? PASS('Admin: /staff -> 200') : FAIL('Admin /staff blocked', r.body.errorCode);

  r = await req('GET', '/roles', null, adminToken);
  (r.status === 200 && r.body.data.length === 6) ? PASS('Admin: /roles -> 200 (6 roles)') : FAIL('Admin /roles wrong', JSON.stringify(r.body));

  r = await req('GET', '/departments', null, nurseToken);
  r.status === 200 ? PASS('Nurse: /departments -> 200 (any authenticated user)') : FAIL('Departments blocked', r.status);

  // ── SECTION 3: Security Headers ────────────────────────────────────────
  console.log('\n=== SECTION 3: Security Headers and Response Quality ===');

  r = await req('GET', '/health');
  const h = r.headers;
  h['x-content-type-options'] ? PASS('x-content-type-options: ' + h['x-content-type-options']) : FAIL('x-content-type-options MISSING');
  h['x-frame-options'] ? PASS('x-frame-options: ' + h['x-frame-options']) : FAIL('x-frame-options MISSING');
  h['x-request-id'] ? PASS('X-Request-Id present') : FAIL('X-Request-Id MISSING');
  h['content-type']?.includes('application/json') ? PASS('Content-Type: application/json') : FAIL('Content-Type wrong', h['content-type']);
  (h['x-powered-by'] === undefined) ? PASS('X-Powered-By header suppressed (helmet)') : FAIL('X-Powered-By exposed: ' + h['x-powered-by']);

  // Error response quality
  r = await req('GET', '/staff/bad-id', null, adminToken);
  const errJSON = JSON.stringify(r.body);
  (errJSON.includes('.js:') || errJSON.includes('at Object')) ? FAIL('Stack trace LEAKED in error response!') : PASS('No stack trace in error response');
  r.body.errorCode ? PASS('errorCode field in error: ' + r.body.errorCode) : FAIL('errorCode MISSING from error response');
  r.body.requestId ? PASS('requestId in error response') : FAIL('requestId MISSING from error response');

  // Sensitive field leakage check  
  r = await req('GET', '/auth/me', null, adminToken);
  const meStr = JSON.stringify(r.body).toLowerCase();
  meStr.includes('passwordhash') ? FAIL('passwordHash LEAKED in /me response!') : PASS('passwordHash not leaked');
  meStr.includes('refreshtokenhash') ? FAIL('refreshTokenHash LEAKED!') : PASS('refreshTokenHash not leaked');

  // ── SECTION 4: CORS ────────────────────────────────────────────────────
  console.log('\n=== SECTION 4: CORS Policy ===');
  const corsR = await new Promise((res, rej) => {
    const opts = { hostname: 'localhost', port: 5000, path: '/api/v1/health', method: 'GET',
      headers: { 'Origin': 'http://evil.com', 'Content-Type': 'application/json' } };
    http.request(opts, resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers }));
    }).on('error', rej).end();
  });
  const ao = corsR.headers['access-control-allow-origin'];
  ao === 'http://evil.com' ? FAIL('CORS: evil.com origin allowed - CRITICAL') :
    ao === 'http://localhost:5173' ? PASS('CORS: only localhost:5173 allowed') :
    INFO('CORS: access-control-allow-origin = ' + (ao || 'not set (not echoed)'));

  // ── SECTION 5: Input Validation ────────────────────────────────────────
  console.log('\n=== SECTION 5: Input Validation ===');

  // Invalid ObjectId
  r = await req('POST', '/staff', { fullName: 'Test', roleId: 'abc', departmentId: 'abc' }, adminToken);
  r.status === 422 ? PASS('Invalid ObjectId length in staff -> 422') : FAIL('Invalid ObjectId not caught', 'Status: ' + r.status + ' ' + r.body.errorCode);

  // 23-char ObjectId (one short)
  r = await req('POST', '/staff', { fullName: 'Test', roleId: '000000000000000000000001'.slice(0, 23), departmentId: '000000000000000000000001' }, adminToken);
  r.status === 422 ? PASS('23-char ObjectId -> 422') : FAIL('23-char ObjectId not caught', 'Status: ' + r.status);

  // Duplicate username
  r = await req('POST', '/identity', { staffId: '6a699eae1bbee3e109b9cbe8', username: 'reception1', password: 'SomePass@1' }, adminToken);
  (r.status === 409 || r.status === 400) ? PASS('Duplicate username -> ' + r.status + ' (' + r.body.errorCode + ')') : FAIL('Duplicate username not caught', 'Status: ' + r.status + ' ' + r.body.errorCode);

  // Invalid status value
  r = await req('PATCH', '/identity/000000000000000000000001/status', { status: 'Hacked' }, adminToken);
  r.status === 422 ? PASS('Invalid status value -> 422') : FAIL('Invalid status not rejected', 'Status: ' + r.status);

  // Missing required fields POST /staff
  r = await req('POST', '/staff', { fullName: 'No Role' }, adminToken);
  r.status === 422 ? PASS('Missing roleId/departmentId -> 422') : FAIL('Missing required staff fields not caught', 'Status: ' + r.status);

  // ── SECTION 6: Account Lockout ─────────────────────────────────────────
  console.log('\n=== SECTION 6: Account Lockout ===');

  const rolesR = await req('GET', '/roles', null, adminToken);
  if (!rolesR.body.data) throw new Error('Failed to fetch roles: ' + JSON.stringify(rolesR.body));
  const deptsR = await req('GET', '/departments', null, adminToken);
  if (!deptsR.body.data) throw new Error('Failed to fetch depts: ' + JSON.stringify(deptsR.body));

  const nurseRoleId = rolesR.body.data.find(x => x.name === 'Nurse')._id;
  const nurseDeptId = deptsR.body.data.find(x => x.name === 'Nursing')._id;

  let sr = await req('POST', '/staff', { fullName: 'Lockout Test ' + Date.now(), roleId: nurseRoleId, departmentId: nurseDeptId }, adminToken);
  if (!sr.body.data) throw new Error('Failed to create staff: ' + JSON.stringify(sr.body));
  const lockStaffId = sr.body.data._id;

  let ir = await req('POST', '/identity', { staffId: lockStaffId, username: 'lockout' + Date.now(), password: 'Test@12345' }, adminToken);
  if (!ir.body.data) throw new Error('Failed to create identity: ' + JSON.stringify(ir.body));
  const lockIdId = ir.body.data._id;
  const uname = ir.body.data.username;

  for (let i = 1; i <= 5; i++) {
    r = await req('POST', '/auth/login', { username: uname, password: 'wrongpass' });
  }
  r = await req('POST', '/auth/login', { username: uname, password: 'wrongpass' });
  (r.status === 401 && r.body.errorCode === 'AUTH_004') ? PASS('Locked after 5 failures') : FAIL('Lockout not triggered', 'Code: ' + r.body.errorCode);

  r = await req('POST', '/auth/login', { username: uname, password: 'Test@12345' });
  (r.status === 401 && r.body.errorCode === 'AUTH_004') ? PASS('Correct password blocked when locked') : FAIL('Locked account bypassed!', r.body.errorCode);

  // Unlock
  r = await req('PATCH', '/identity/' + lockIdId + '/status', { status: 'Active' }, adminToken);
  r.status === 200 ? PASS('Admin unlocks account') : FAIL('Unlock failed', JSON.stringify(r.body));

  r = await req('POST', '/auth/login', { username: uname, password: 'Test@12345' });
  r.status === 200 ? PASS('Login OK after unlock') : FAIL('Login still failing after unlock', r.body.errorCode);

  // ── SECTION 7: Disable Flow ────────────────────────────────────────────
  console.log('\n=== SECTION 7: Account Disable / Terminal State ===');

  r = await req('PATCH', '/identity/' + lockIdId + '/status', { status: 'Disabled' }, adminToken);
  r.status === 200 ? PASS('Admin disables account') : FAIL('Disable failed', JSON.stringify(r.body));

  r = await req('POST', '/auth/login', { username: uname, password: 'Test@12345' });
  (r.status === 401 && r.body.errorCode === 'AUTH_005') ? PASS('Disabled account -> AUTH_005') : FAIL('Disabled not blocked', r.body.errorCode);

  // Terminal state - Disabled cannot go Active
  r = await req('PATCH', '/identity/' + lockIdId + '/status', { status: 'Active' }, adminToken);
  (r.status === 409 && r.body.errorCode === 'BUSINESS_002') ? PASS('Disabled terminal state: cannot re-activate') : FAIL('Terminal state violated!', 'Status: ' + r.status + ' Code: ' + r.body.errorCode);

  // ── SECTION 8: Token Rotation ─────────────────────────────────────────
  console.log('\n=== SECTION 8: Refresh Token Rotation Security ===');

  r = await req('POST', '/auth/login', { username: 'doctor1', password: 'Doctor@1234' });
  const docAccess = r.body.data.accessToken;
  const docRefresh = r.body.data.refreshToken;

  r = await req('POST', '/auth/refresh', { refreshToken: docRefresh });
  r.status === 200 ? PASS('Refresh works') : FAIL('Refresh broken', r.body.errorCode);
  const docRefresh2 = r.body.data.refreshToken;

  // Old token invalidated
  r = await req('POST', '/auth/refresh', { refreshToken: docRefresh });
  r.status === 401 ? PASS('Old refresh token invalidated after rotation') : FAIL('OLD REFRESH TOKEN STILL VALID - CRITICAL!', 'Status: ' + r.status);

  // Invalid token string
  r = await req('POST', '/auth/refresh', { refreshToken: 'eyJhbGciOiJIUzI1NiJ9.invalid.sig' });
  r.status === 401 ? PASS('Forged refresh token -> 401') : FAIL('Forged token accepted!', 'Status: ' + r.status);

  // Logout invalidates
  r = await req('POST', '/auth/refresh', { refreshToken: docRefresh2 });
  const docAccess2 = r.body.data.accessToken;
  const docRefresh3 = r.body.data.refreshToken;
  await req('POST', '/auth/logout', null, docAccess2);
  r = await req('POST', '/auth/refresh', { refreshToken: docRefresh3 });
  r.status === 401 ? PASS('Refresh invalidated after logout') : FAIL('Refresh still valid after logout - CRITICAL!', 'Status: ' + r.status);

  // ── SECTION 9: 404 + Health ────────────────────────────────────────────
  console.log('\n=== SECTION 9: Edge Cases ===');

  r = await req('GET', '/nonexistentroute123');
  r.status === 404 ? PASS('Unknown route -> 404') : FAIL('Unknown route not 404', 'Status: ' + r.status);

  r = await req('GET', '/health');
  r.status === 200 ? PASS('Health check -> 200') : FAIL('Health check broken', r.status);

  // /me still works with access token after refresh (stateless JWT)
  r = await req('GET', '/auth/me', null, docAccess);
  r.status === 200 ? PASS('Access token still valid after refresh (stateless - expected)') : INFO('Access token invalidated (stricter but not standard JWT behavior)');

  // ── Summary ────────────────────────────────────────────────────────────
  const passed = results.filter(x => x.status === 'PASS').length;
  const failed = results.filter(x => x.status === 'FAIL').length;
  const info = results.filter(x => x.status === 'INFO').length;

  console.log('\n========================================');
  console.log('SECURITY AUDIT SUMMARY');
  console.log('  PASS: ' + passed);
  console.log('  FAIL: ' + failed);
  console.log('  INFO: ' + info);
  console.log('  TOTAL: ' + (passed + failed + info));
  console.log('========================================');

  if (failed > 0) {
    console.log('\nFAILED TESTS:');
    results.filter(x => x.status === 'FAIL').forEach(x => console.log('  - ' + x.name + (x.note ? ' | ' + x.note : '')));
  }
}

audit().catch(e => { console.error('Audit script error:', e.message); process.exit(1); });
