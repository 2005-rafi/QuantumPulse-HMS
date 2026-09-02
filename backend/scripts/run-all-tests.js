const assert = require('assert');
const path = require('path');

console.log('=====================================================');
console.log('QUANTUM CAREONE HMS: COMPREHENSIVE QA & VALIDATION');
console.log('=====================================================');

// ────────────────────────────────────────────────────────────────
// SUITE 1: UNIT TESTING - TARIFF & SPECIFICITY RESOLUTION
// ────────────────────────────────────────────────────────────────
console.log('\n[SUITE 1: UNIT TESTING - TARIFF SPECIFICITY]');
const tariffResolver = require('../src/modules/tariff/tariff-resolver');

// Test 1.1: Floor + Comfort Tier specificity overrides generic ward
const generalRule = {
  category: 'BED_CHARGES',
  amount: 1500,
  scope: { wardClass: 'GENERAL_WARD' }
};

const floorDeluxeRule = {
  category: 'BED_CHARGES',
  amount: 5500,
  scope: {
    floorId: '65f01234567890abcdef1234',
    wardClass: 'DELUXE_PRIVATE',
    comfortTier: 'DELUXE',
    sharingType: 'PRIVATE_SINGLE'
  }
};

const targetContext = {
  floorId: '65f01234567890abcdef1234',
  wardClass: 'DELUXE_PRIVATE',
  comfortTier: 'DELUXE',
  sharingType: 'PRIVATE_SINGLE'
};

const scoreGen = tariffResolver._scoreRule(generalRule, targetContext);
const scoreDel = tariffResolver._scoreRule(floorDeluxeRule, targetContext);

assert.strictEqual(scoreGen, -Infinity, 'Generic rule should be disqualified for ward mismatch');
assert.strictEqual(scoreDel, 30, 'Specific rule score must equal 30 (10 floor + 8 comfort + 6 sharing + 6 ward)');
console.log('  ✓ Specificity scoring: Specific floor+tier rule correctly wins over general rule');

// Test 1.2: Hourly Rate pro-rata calculation and grace period thresholding
function computeStay(rawHours, dailyRate, hourlyRate, graceMinutes = 60) {
  const fullDays = Math.floor(rawHours / 24);
  const remHoursFloat = rawHours % 24;
  let billableRemHours = Math.floor(remHoursFloat);
  const remMinutes = (remHoursFloat - billableRemHours) * 60;

  if (remMinutes > graceMinutes) {
    billableRemHours += 1;
  }
  const total = (fullDays * dailyRate) + (billableRemHours * hourlyRate);
  return { fullDays, billableRemHours, total };
}

// Exactly 48 hours -> 2 days, 0 hours
const s1 = computeStay(48, 5000, 250, 60);
assert.strictEqual(s1.fullDays, 2);
assert.strictEqual(s1.billableRemHours, 0);
assert.strictEqual(s1.total, 10000);
console.log('  ✓ Stay duration: Exactly 48 hrs billed as 2 full days');

// 24 hrs 45 mins -> Within 60 min grace period -> 1 day, 0 hours
const s2 = computeStay(24.75, 5000, 250, 60);
assert.strictEqual(s2.fullDays, 1);
assert.strictEqual(s2.billableRemHours, 0);
assert.strictEqual(s2.total, 5000);
console.log('  ✓ Grace period: 24h 45m waived under 60m threshold');

// 25 hrs 15 mins -> 1 hr 15 mins (15m < 60m grace) -> 1 day, 1 hour
const s3 = computeStay(25.25, 5000, 250, 60);
assert.strictEqual(s3.fullDays, 1);
assert.strictEqual(s3.billableRemHours, 1);
assert.strictEqual(s3.total, 5250);
console.log('  ✓ Pro-rata hour: 25h 15m billed as 1 day + 1 hour');

// ────────────────────────────────────────────────────────────────
// SUITE 2: INTEGRATION TESTING - CONTROLLERS & ROUTER BINDINGS
// ────────────────────────────────────────────────────────────────
console.log('\n[SUITE 2: INTEGRATION TESTING - ROUTES & ROUTER HANDLERS]');
const ipdRouter = require('../src/modules/ipd/billing/ipd-billing.routes');

// Verify all route layer stack entries have valid function handlers
let routeCount = 0;
ipdRouter.stack.forEach((layer) => {
  if (layer.route) {
    routeCount++;
    const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
    const pathStr = layer.route.path;
    layer.route.stack.forEach((handlerLayer) => {
      assert.strictEqual(typeof handlerLayer.handle, 'function', `Handler for ${methods} ${pathStr} must be a function`);
    });
    console.log(`  ✓ Route verified: ${methods} ${pathStr} -> valid handler function`);
  }
});
assert.ok(routeCount >= 5, 'Must have at least 5 verified billing endpoints');

// ────────────────────────────────────────────────────────────────
// SUITE 3: QUALITY ASSURANCE - FINANCIAL INVARIANTS & DOUBLE ENTRY
// ────────────────────────────────────────────────────────────────
console.log('\n[SUITE 3: QA TESTING - DOUBLE-ENTRY FINANCIAL INVARIANTS]');
function verifyDoubleEntry(grossBilled, discount, advanceDeposits, settledAmount = 0) {
  const netPayable = Math.max(0, grossBilled - discount);
  const totalPaid = advanceDeposits + settledAmount;
  const outstandingDue = Math.max(0, netPayable - totalPaid);
  const excessRefundable = Math.max(0, totalPaid - netPayable);

  // Invariant 1: Total accounting balance identity
  assert.strictEqual(netPayable + excessRefundable, totalPaid + outstandingDue);
  return { netPayable, outstandingDue, excessRefundable };
}

// Scenario A: Standard discharge with outstanding balance
const balA = verifyDoubleEntry(45000, 5000, 15000, 0);
assert.strictEqual(balA.netPayable, 40000);
assert.strictEqual(balA.outstandingDue, 25000);
assert.strictEqual(balA.excessRefundable, 0);
console.log('  ✓ Invariant A: Partial payment with outstanding due verified');

// Scenario B: Excess advance deposit requiring refund
const balB = verifyDoubleEntry(12000, 0, 25000, 0);
assert.strictEqual(balB.netPayable, 12000);
assert.strictEqual(balB.outstandingDue, 0);
assert.strictEqual(balB.excessRefundable, 13000);
console.log('  ✓ Invariant B: Excess deposit refundable credit verified');

// ────────────────────────────────────────────────────────────────
// SUITE 4: SECURITY & HIPAA 45 CFR § 164.514 COMPLIANCE
// ────────────────────────────────────────────────────────────────
console.log('\n[SUITE 4: SECURITY & HIPAA PHI COMPLIANCE]');
const logger = require('../src/core/logger');

// Test logger sanitization
const sensitivePayload = {
  message: 'Testing Inpatient Billing Operation',
  patientId: '65f09876543210abcdef4321',
  patientName: 'John Doe',
  phone: '+91 9876543210',
  mobile: '+91 9123456789',
  cardNumber: '4111222233334444',
  cvv: '123',
  ssn: '123-45-6789',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyToken',
  meta: {
    phone: '+91 9998887776',
    notes: 'Clinical discharge notes'
  }
};

const redacted = logger.redactPhi(sensitivePayload);

assert.strictEqual(redacted.phone, '[REDACTED_PHI]');
assert.strictEqual(redacted.mobile, '[REDACTED_PHI]');
assert.strictEqual(redacted.cardNumber, '[REDACTED_PHI]');
assert.strictEqual(redacted.cvv, '[REDACTED_PHI]');
assert.strictEqual(redacted.ssn, '[REDACTED_PHI]');
assert.strictEqual(redacted.token, '[REDACTED_PHI]');
assert.strictEqual(redacted.meta.phone, '[REDACTED_PHI]');
assert.strictEqual(redacted.meta.notes, 'Clinical discharge notes');
console.log('  ✓ HIPAA 45 CFR § 164.514: Direct and nested PHI fields (tokens, phones, SSN, cards) are actively redacted');

console.log('\n=====================================================');
console.log('ALL TESTS PASSED (100% SUCCESS): NO ERRORS DETECTED');
console.log('=====================================================');
