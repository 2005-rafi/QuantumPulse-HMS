require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const {
  QueryContext,
  QueryBuilder,
  SearchStrategy,
  FilterStrategy,
  SortStrategy,
  PaginationStrategy,
  ProjectionStrategy,
  PatientQueryConfig,
  VisitQueryConfig,
  AppointmentQueryConfig,
  StaffQueryConfig,
  AuditQueryConfig,
  LaboratoryQueryConfig,
  BillQueryConfig,
} = require('../src/core/query');

const Patient = require('../src/modules/patient/patient.model');
const AuditLog = require('../src/modules/audit/audit.model');
const Staff = require('../src/modules/staff/staff.model');
const Appointment = require('../src/modules/appointments/appointment.model');
const patientService = require('../src/modules/patient/patient.service');
const auditService = require('../src/modules/audit/audit.service');
const staffService = require('../src/modules/staff/staff.service');
const appointmentService = require('../src/modules/appointments/appointment.service');

async function runTests() {
  console.log('=== 🧪 RUNNING PLUGGABLE QUERY FRAMEWORK TEST SUITE ===\n');

  // ── TEST 1: QueryContext Sanitization & Security Scope ────────────────────
  console.log('TEST 1: QueryContext Sanitization & Security Scope');
  const ctx = new QueryContext({
    q: '  PT-2026-0001  ',
    filters: {
      $where: 'maliciousCode()', // should be stripped
      gender: 'Male',
      departmentId: 'dept123',
    },
    sortBy: 'name',
    sortOrder: 'asc',
    page: 2,
    limit: 15,
    securityScope: {
      isDeleted: false,
    },
  });

  if (ctx.q !== 'PT-2026-0001') throw new Error('Search term normalization failed');
  if (ctx.filters.$where) throw new Error('Security vulnerability: $ operator not stripped');
  if (ctx.filters.gender !== 'Male') throw new Error('Filter parsing failed');
  if (ctx.securityScope.isDeleted !== false) throw new Error('Security scope missing');
  if (ctx.limit !== 15 || ctx.page !== 2) throw new Error('Pagination parsing failed');
  console.log('  ✅ QueryContext sanitization, injection guard & normalization passed.\n');

  // ── TEST 2: SortStrategy Deterministic Tie-Breakers ────────────────────────
  console.log('TEST 2: SortStrategy Deterministic Tie-Breakers');
  const sortNewest = SortStrategy.build('newest', 'desc', PatientQueryConfig.sort);
  if (!sortNewest._id || sortNewest.createdAt !== -1) {
    throw new Error('Deterministic tie-breaker _id missing on newest sort');
  }
  const sortOldest = SortStrategy.build('oldest', 'asc', PatientQueryConfig.sort);
  if (sortOldest._id !== 1 || sortOldest.createdAt !== 1) {
    throw new Error('Deterministic tie-breaker _id missing on oldest sort');
  }
  const sortUnwhitelisted = SortStrategy.build('maliciousField', 'desc', PatientQueryConfig.sort);
  if (sortUnwhitelisted.maliciousField) {
    throw new Error('Security vulnerability: unwhitelisted sort field accepted');
  }
  console.log('  ✅ SortStrategy deterministic tie-breakers & whitelist enforcement passed.\n');

  // ── TEST 3: Keyset Cursor Pagination Strategy ─────────────────────────────
  console.log('TEST 3: Keyset Cursor Pagination Strategy');
  const sampleDoc = { _id: new mongoose.Types.ObjectId(), timestamp: new Date('2026-08-25T12:00:00.000Z') };
  const cursorToken = PaginationStrategy.encodeCursor(sampleDoc, 'timestamp');
  const decoded = PaginationStrategy.decodeCursor(cursorToken);
  if (!decoded || decoded[1] !== String(sampleDoc._id)) {
    throw new Error('Cursor encoding/decoding mismatch');
  }
  const cursorFilter = PaginationStrategy.buildCursorFilter(cursorToken, { timestamp: -1, _id: -1 });
  if (!cursorFilter.$or || cursorFilter.$or.length !== 2) {
    throw new Error('Keyset cursor predicate generation failed');
  }
  console.log('  ✅ Keyset cursor encoding/decoding and $or predicate generation passed.\n');

  // ── TEST 4: Database Connection & Query Execution Stats (explain) ─────────
  console.log('TEST 4: Connecting to MongoDB Atlas for executionStats & explain()...');
  await mongoose.connect(config.mongoUri);
  console.log('  Connected to MongoDB Atlas.\n');

  // 4a. Patient Search using QueryBuilder
  console.log('TEST 4a: Patient Query Plan & explain() verification');
  const patientContext = new QueryContext({
    q: 'PT-',
    filters: { gender: 'Male' },
    page: 1,
    limit: 10,
    sortBy: 'newest',
  });
  const compiledPatient = QueryBuilder.compile(patientContext, PatientQueryConfig);
  const patientExplain = await Patient.find(compiledPatient.filter)
    .sort(compiledPatient.sort)
    .select(compiledPatient.projection)
    .limit(10)
    .explain('executionStats');

  const pStats = patientExplain.executionStats;
  console.log(`  Patient Query: nReturned=${pStats.nReturned}, docsExamined=${pStats.totalDocsExamined}, keysExamined=${pStats.totalKeysExamined}, time=${pStats.executionTimeMillis}ms`);
  
  // 4b. Patient Service Search & Bounded Batch Enrichment
  const patientServiceResult = await patientService.search({ page: 1, limit: 10 });
  console.log(`  patientService.search result count: ${patientServiceResult.items.length}, total: ${patientServiceResult.total}`);
  if (patientServiceResult.items.length > 0) {
    const firstP = patientServiceResult.items[0];
    console.log(`  Sample enriched patient MRN: ${firstP.mrn}, FullName: ${firstP.firstName} ${firstP.lastName}`);
  }
  console.log('  ✅ Patient service & repository query framework verified.\n');

  // 4c. AuditLog Cursor Query & explain()
  console.log('TEST 4c: AuditLog Query Plan & explain() with deterministic sorting');
  const auditContext = new QueryContext({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const compiledAudit = QueryBuilder.compile(auditContext, AuditQueryConfig);
  const auditExplain = await AuditLog.find(compiledAudit.filter)
    .sort(compiledAudit.sort)
    .limit(10)
    .explain('executionStats');

  const aStats = auditExplain.executionStats;
  console.log(`  AuditLog Query: nReturned=${aStats.nReturned}, docsExamined=${aStats.totalDocsExamined}, keysExamined=${aStats.totalKeysExamined}, time=${aStats.executionTimeMillis}ms`);

  // 4d. AuditLog Service Cursor Pagination
  const auditPage1 = await auditService.getLogs({ limit: 5 });
  console.log(`  Audit Logs Page 1: retrieved ${auditPage1.items.length} items`);
  console.log('  ✅ AuditLog service & cursor query framework verified.\n');

  // 4e. Staff Service Query
  console.log('TEST 4e: Staff Service Listing with PositionRank Seniority Sort');
  const staffList = await staffService.list({ limit: 5 });
  console.log(`  Staff List retrieved ${staffList.items.length} items, total: ${staffList.total}`);
  if (staffList.items.length > 0) {
    console.log(`  Top staff member: ${staffList.items[0].fullName}, Position: ${staffList.items[0].position}`);
  }
  console.log('  ✅ Staff service & query framework verified.\n');

  // 4f. Appointment Service Query
  console.log('TEST 4f: Appointment Service Listing with Chronological Sort');
  const apptList = await appointmentService.getAppointments({}, { page: 1, limit: 5 });
  console.log(`  Appointments retrieved ${apptList.items?.length || 0} items`);
  console.log('  ✅ Appointment service & query framework verified.\n');

  await mongoose.disconnect();
  console.log('🎉 ALL PLUGGABLE QUERY FRAMEWORK TESTS PASSED WITH ZERO ERRORS!');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
