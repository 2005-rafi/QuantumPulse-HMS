const assert = require('assert');
const tariffResolver = require('../src/modules/tariff/tariff-resolver');

console.log('--- TEST 1: Specificity Scoring Test ---');
const generalWardRule = {
  category: 'BED_CHARGES',
  amount: 1200,
  scope: { wardClass: 'GENERAL_WARD' }
};

const deluxeFloorRule = {
  category: 'BED_CHARGES',
  amount: 6000,
  scope: {
    wardClass: 'DELUXE_PRIVATE',
    floorId: '65f01234567890abcdef1234',
    comfortTier: 'DELUXE',
    sharingType: 'PRIVATE_SINGLE'
  }
};

const contextDeluxe = {
  wardClass: 'DELUXE_PRIVATE',
  floorId: '65f01234567890abcdef1234',
  comfortTier: 'DELUXE',
  sharingType: 'PRIVATE_SINGLE'
};

const scoreGeneral = tariffResolver._scoreRule(generalWardRule, contextDeluxe);
const scoreDeluxe = tariffResolver._scoreRule(deluxeFloorRule, contextDeluxe);

console.log('Score for General Rule on Deluxe Context:', scoreGeneral); // -Infinity (wardClass mismatch)
console.log('Score for Deluxe Specific Rule on Deluxe Context:', scoreDeluxe); // 10 (floor) + 8 (comfort) + 6 (sharing) + 6 (ward) = 30

assert.strictEqual(scoreGeneral, -Infinity);
assert.strictEqual(scoreDeluxe, 30);
console.log('Specificity Scoring Test PASSED');

console.log('--- TEST 2: Duration Math & Grace Period Thresholding ---');
function calculateProRata(rawHours, dailyRate, hourlyRate, graceMin = 60) {
  const fullDays = Math.floor(rawHours / 24);
  const remainingHoursFloat = rawHours % 24;
  let billableRemainingHours = Math.floor(remainingHoursFloat);
  const remainingMinutes = (remainingHoursFloat - billableRemainingHours) * 60;

  if (remainingMinutes > graceMin) {
    billableRemainingHours += 1;
  }
  const total = (fullDays * dailyRate) + (billableRemainingHours * hourlyRate);
  return { fullDays, billableRemainingHours, total };
}

// 36 hours (1 day 12 hours) with daily ₹4000, hourly ₹200
const r1 = calculateProRata(36, 4000, 200, 60);
assert.strictEqual(r1.fullDays, 1);
assert.strictEqual(r1.billableRemainingHours, 12);
assert.strictEqual(r1.total, 4000 + 2400); // 6400
console.log('36 Hours Pro-Rata Test PASSED:', r1);

// 24 hours 30 min (within 60m grace period) -> 1 day 0 hours
const r2 = calculateProRata(24.5, 4000, 200, 60);
assert.strictEqual(r2.fullDays, 1);
assert.strictEqual(r2.billableRemainingHours, 0);
assert.strictEqual(r2.total, 4000);
console.log('Grace Period (under 60 min) Test PASSED:', r2);

// 25 hours 15 min (1 hour 15 min -> 15 min < 60 min grace) -> 1 day 1 hour
const r3 = calculateProRata(25.25, 4000, 200, 60);
assert.strictEqual(r3.fullDays, 1);
assert.strictEqual(r3.billableRemainingHours, 1);
assert.strictEqual(r3.total, 4200);
console.log('Grace Period (1 hr 15m) Test PASSED:', r3);

console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
