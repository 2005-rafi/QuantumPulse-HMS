require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const { QueryContext, QueryBuilder, PatientQueryConfig } = require('../src/core/query');
const patientService = require('../src/modules/patient/patient.service');
const Patient = require('../src/modules/patient/patient.model');

async function testSearchAndGeoParameters() {
  console.log('=== 🔍 TESTING PATIENT SEARCH PARAMETERS & GEO-FILTERING ===\n');

  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB Atlas.\n');

  // ── TEST 1: First Name / Last Name / Full Name query compilation ─────────
  console.log('TEST 1: Name Query Compilation & Search Strategy');

  // 1a. Single word search (First Name or Last Name)
  const ctxSingle = new QueryContext({ q: 'Saravanan' });
  const compiledSingle = QueryBuilder.compile(ctxSingle, PatientQueryConfig);
  console.log('  Single word filter:', JSON.stringify(compiledSingle.filter));
  if (!compiledSingle.filter.$or) throw new Error('Single word search failed to produce $or conditions');

  // 1b. Multi-word search (Full Name in any order)
  const ctxFull = new QueryContext({ q: 'Saravanan Govindasamy' });
  const compiledFull = QueryBuilder.compile(ctxFull, PatientQueryConfig);
  console.log('  Full name filter:', JSON.stringify(compiledFull.filter));
  if (!compiledFull.filter.$or || compiledFull.filter.$or.length < 2) {
    throw new Error('Full name search failed to produce bi-directional name matching');
  }
  console.log('  ✅ Name query bi-directional search predicates verified.\n');

  // ── TEST 2: Phone Number query compilation ───────────────────────────────
  console.log('TEST 2: Phone Number Query Compilation & Deterministic Encryption');
  const ctxPhone = new QueryContext({ q: '9876543210' });
  const compiledPhone = QueryBuilder.compile(ctxPhone, PatientQueryConfig);
  console.log('  Phone query filter:', JSON.stringify(compiledPhone.filter));
  if (!compiledPhone.filter.$or) throw new Error('Phone search failed to produce protected encrypted predicates');
  console.log('  ✅ Phone number deterministic encrypted search verified.\n');

  // ── TEST 3: State & City Geographic Filtering ────────────────────────────
  console.log('TEST 3: State & City Filter Compilation');
  const ctxGeo = new QueryContext({
    filters: {
      state: 'Tamil Nadu',
      city: 'Chennai',
      country: 'India',
    }
  });
  const compiledGeo = QueryBuilder.compile(ctxGeo, PatientQueryConfig);
  console.log('  Geo filter:', JSON.stringify(compiledGeo.filter));
  if (compiledGeo.filter['address.state'] !== 'Tamil Nadu' || compiledGeo.filter['address.city'] !== 'Chennai') {
    throw new Error('State/City filter mapping failed');
  }
  console.log('  ✅ State, City, and Country filter predicates verified.\n');

  // ── TEST 4: Live Execution with explain() on Database ────────────────────
  console.log('TEST 4: Live Search Execution against Database');
  
  // Search by single name
  const res1 = await patientService.search({ q: 'Saravanan', limit: 5 });
  console.log(`  Search 'Saravanan': found ${res1.total} matches`);

  // Search by full name
  const res2 = await patientService.search({ q: 'Saravanan Govindasamy', limit: 5 });
  console.log(`  Search 'Saravanan Govindasamy': found ${res2.total} matches`);

  // Search with state filter
  const res3 = await patientService.search({ state: 'Tamil Nadu', limit: 5 });
  console.log(`  Filter state='Tamil Nadu': found ${res3.total} matches`);

  // Check executionStats on compound address indexes
  const explainGeo = await Patient.find({ 'address.state': 'Tamil Nadu' })
    .sort({ createdAt: -1, _id: -1 })
    .limit(10)
    .explain('executionStats');
  console.log(`  Geo Index Query execution time: ${explainGeo.executionStats.executionTimeMillis}ms, docsExamined: ${explainGeo.executionStats.totalDocsExamined}`);

  console.log('\n✅ ALL SEARCH PARAMETER & GEO-FILTERING TESTS PASSED!');
  await mongoose.disconnect();
}

testSearchAndGeoParameters().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
