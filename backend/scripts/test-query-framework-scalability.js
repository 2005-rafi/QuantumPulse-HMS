require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const {
  QueryContext,
  QueryBuilder,
  AuditQueryConfig,
  PaginationStrategy,
} = require('../src/core/query');
const AuditLog = require('../src/modules/audit/audit.model');

async function benchmark() {
  console.log('=== ⚡ RUNNING SCALABILITY & BENCHMARK TEST ===\n');
  await mongoose.connect(config.mongoUri);

  const totalLogs = await AuditLog.countDocuments();
  console.log(`Current AuditLog collection size: ${totalLogs} documents.`);

  // Test Cursor Keyset Pagination vs Offset Pagination performance
  console.log('\nBenchmarking 5 consecutive pages via Cursor Pagination vs Offset Pagination:');

  // 1. Cursor Pagination
  const cursorTimes = [];
  let currentCursor = null;
  let cursorItemsTotal = 0;

  for (let page = 1; page <= 5; page++) {
    const start = performance.now();
    const ctx = new QueryContext({
      cursor: currentCursor,
      limit: 20,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    const result = await QueryBuilder.execute(AuditLog, ctx, AuditQueryConfig);
    const elapsed = performance.now() - start;
    cursorTimes.push(elapsed);
    cursorItemsTotal += result.items.length;
    currentCursor = result.nextCursor;
  }
  const avgCursor = cursorTimes.reduce((a, b) => a + b, 0) / cursorTimes.length;
  console.log(`  Cursor Pagination: avg page latency = ${avgCursor.toFixed(2)}ms (times: ${cursorTimes.map(t => t.toFixed(1)).join(', ')}ms), total items = ${cursorItemsTotal}`);

  // 2. Offset Pagination
  const offsetTimes = [];
  for (let page = 1; page <= 5; page++) {
    const start = performance.now();
    const ctx = new QueryContext({
      page,
      limit: 20,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    const result = await QueryBuilder.execute(AuditLog, ctx, AuditQueryConfig);
    const elapsed = performance.now() - start;
    offsetTimes.push(elapsed);
  }
  const avgOffset = offsetTimes.reduce((a, b) => a + b, 0) / offsetTimes.length;
  console.log(`  Offset Pagination: avg page latency = ${avgOffset.toFixed(2)}ms (times: ${offsetTimes.map(t => t.toFixed(1)).join(', ')}ms)`);

  console.log('\n✅ Scalability benchmark completed successfully.');
  await mongoose.disconnect();
}

benchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
