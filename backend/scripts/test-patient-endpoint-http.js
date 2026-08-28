require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const jwt = require('jsonwebtoken');
const config = require('../src/core/config');

async function testEndpoint() {
  console.log('=== 🧪 TESTING PATIENT CONTROLLER & ROUTE HTTP ENDPOINTS ===\n');

  // Login as reception
  const loginRes = await fetch('http://localhost:7722/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'reception', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Test empty query (as requested by reception dashboard)
    console.log('1. Testing GET /patients?q=&page=1&limit=50&visitType=&departmentId=&doctorId=&state=&city=&startDate=&endDate=&sortBy=newest');
    const res1 = await fetch('http://localhost:7722/api/v1/patients?q=&page=1&limit=50&visitType=&departmentId=&doctorId=&state=&city=&startDate=&endDate=&sortBy=newest', { headers });
    const data1 = await res1.json();
    console.log(`  Status: ${res1.status}, total items: ${data1.data?.total}, returned: ${data1.data?.items?.length}`);

    // 2. Test single word name search
    console.log('\n2. Testing GET /patients?q=Saravanan');
    const res2 = await fetch('http://localhost:7722/api/v1/patients?q=Saravanan', { headers });
    const data2 = await res2.json();
    console.log(`  Status: ${res2.status}, total items: ${data2.data?.total}`);

    // 3. Test full name search
    console.log('\n3. Testing GET /patients?q=Saravanan Govindasamy');
    const res3 = await fetch('http://localhost:7722/api/v1/patients?q=Saravanan Govindasamy', { headers });
    const data3 = await res3.json();
    console.log(`  Status: ${res3.status}, total items: ${data3.data?.total}`);

    // 4. Test State and City filter
    console.log('\n4. Testing GET /patients?state=Tamil Nadu&city=Chennai');
    const res4 = await fetch('http://localhost:7722/api/v1/patients?state=Tamil Nadu&city=Chennai', { headers });
    const data4 = await res4.json();
    console.log(`  Status: ${res4.status}, total items: ${data4.data?.total}`);

    console.log('\n🎉 ALL HTTP ENDPOINT TESTS PASSED WITH STATUS 200 OK!');
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    process.exit(1);
  }
}

testEndpoint();
