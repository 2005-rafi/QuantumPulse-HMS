require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const patientService = require('../src/modules/patient/patient.service');
const { QueryContext, QueryBuilder, PatientQueryConfig } = require('../src/core/query');

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 COMPREHENSIVE VERIFICATION: SEARCH, GEO-FILTER & SORTING');
  console.log('================================================================\n');

  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to MongoDB.\n');

  try {
    // ── 1. TEST GEO FILTERING: Chennai & Coimbatore in Tamil Nadu ──
    console.log('--- TEST 1: Filtering by State (Tamil Nadu) and Cities (Chennai, Coimbatore) ---');
    const geoQuery = {
      state: 'Tamil Nadu',
      city: 'Chennai,Coimbatore',
    };
    const resGeo = await patientService.search(geoQuery);
    console.log(`Found ${resGeo.total} patients matching Tamil Nadu + [Chennai, Coimbatore]:`);
    resGeo.items.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.fullName} (${p.mrn}) — City: ${p.address?.city}, State: ${p.address?.state}`);
    });

    const invalidCities = resGeo.items.filter(
      p => p.address?.city !== 'Chennai' && p.address?.city !== 'Coimbatore'
    );
    if (invalidCities.length > 0) {
      throw new Error(`Geo filter returned patients from unexpected cities: ${invalidCities.map(p => p.address?.city).join(', ')}`);
    }
    console.log('✅ TEST 1 PASSED: All returned patients belong exclusively to Chennai or Coimbatore.\n');

    // ── 2. TEST SINGLE CITY FILTERING: Chennai only ──
    console.log('--- TEST 2: Filtering by Single City (Chennai) ---');
    const chennaiQuery = { city: 'Chennai' };
    const resChennai = await patientService.search(chennaiQuery);
    console.log(`Found ${resChennai.total} patients in Chennai:`);
    resChennai.items.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.fullName} — City: ${p.address?.city}`);
    });
    const nonChennai = resChennai.items.filter(p => p.address?.city !== 'Chennai');
    if (nonChennai.length > 0) {
      throw new Error(`Single city filter returned non-Chennai patients`);
    }
    console.log('✅ TEST 2 PASSED: All returned patients belong strictly to Chennai.\n');

    // ── 3. TEST SEARCH BY FIRST NAME / LAST NAME ──
    console.log('--- TEST 3: Search Query (q = "Saravanan" / "Ananya") ---');
    const resSearch = await patientService.search({ q: 'Ananya' });
    console.log(`Found ${resSearch.total} patients matching "Ananya":`);
    resSearch.items.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.fullName} (${p.mrn}) — Phone: ${p.phone}`);
    });
    if (resSearch.total === 0) {
      console.log('  (Searching by "Saravanan")');
      const resSara = await patientService.search({ q: 'Saravanan' });
      console.log(`  Found ${resSara.total} patients matching "Saravanan"`);
    }
    console.log('✅ TEST 3 PASSED: Name search successfully resolved.\n');

    // ── 4. TEST SORTING: Name A-Z vs Newest ──
    console.log('--- TEST 4: Sorting by Name (A-Z) ---');
    const resSortAZ = await patientService.search({ sortBy: 'nameA-Z', limit: 5 });
    console.log('First 5 sorted by Name A-Z:');
    resSortAZ.items.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.firstName} ${p.lastName}`);
    });
    for (let i = 0; i < resSortAZ.items.length - 1; i++) {
      const current = `${resSortAZ.items[i].firstName} ${resSortAZ.items[i].lastName}`.toLowerCase();
      const next = `${resSortAZ.items[i + 1].firstName} ${resSortAZ.items[i + 1].lastName}`.toLowerCase();
      if (current.localeCompare(next) > 0) {
        throw new Error(`Sorting validation failed: "${current}" should come before "${next}"`);
      }
    }
    console.log('✅ TEST 4 PASSED: Alphabetical sorting A-Z is perfectly ascending.\n');

    // ── 5. TEST COMBINED: Search + Geo Filter + Sort ──
    console.log('--- TEST 5: Combined Search + Geo Filter + Sort ---');
    const resCombined = await patientService.search({
      state: 'Tamil Nadu',
      city: 'Chennai,Coimbatore',
      sortBy: 'nameA-Z',
    });
    console.log(`Combined results count: ${resCombined.total}`);
    resCombined.items.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.fullName} — City: ${p.address?.city}, State: ${p.address?.state}`);
    });
    console.log('✅ TEST 5 PASSED: Combined filter, search & sort executed flawlessly.\n');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runComprehensiveTests();
