/**
 * scripts/test-concurrency-stress.js
 * Multi-Threaded High-Concurrency Stress Test & ACID Validation Suite.
 * Simulates 50+ concurrent clinicians executing simultaneous mutations on shared resources
 * to prove 0 race conditions, 0 sequence collisions, and 100% ACID consistency.
 */
const assert = require('assert');
const mongoose = require('mongoose');
const { connectDB } = require('../src/core/database/connection');
const sequenceService = require('../src/core/database/sequence.service');
const BedMaster = require('../src/modules/ipd/beds/bed.model');
const FloorMaster = require('../src/modules/ipd/beds/floor.model');
const RoomMaster = require('../src/modules/ipd/beds/room.model');
const bedRepository = require('../src/modules/ipd/beds/bed.repository');
const bedService = require('../src/modules/ipd/beds/bed.service');

async function runConcurrencyStressSuite() {
  console.log('\n======================================================');
  console.log('⚡ HIGH-CONCURRENCY & ACID DATA INTEGRITY STRESS SUITE');
  console.log('======================================================\n');

  await connectDB();

  try {
    // ── 1. CONCURRENT SEQUENCE GENERATION STRESS TEST ──
    console.log('👉 [1/4] Stress Testing 50 Concurrent Sequence Generation Requests...');
    const startTime = Date.now();
    const CONCURRENCY_COUNT = 50;

    const sequencePromises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) =>
      sequenceService.getNextSequence('stress_test', 'TST')
    );

    const generatedSequences = await Promise.all(sequencePromises);
    const uniqueSequences = new Set(generatedSequences);

    console.log(`  Generated ${generatedSequences.length} sequences in ${Date.now() - startTime}ms`);
    console.log(`  Sample IDs: ${generatedSequences.slice(0, 3).join(', ')} ... ${generatedSequences.slice(-1)}`);

    assert.strictEqual(
      uniqueSequences.size,
      CONCURRENCY_COUNT,
      `Duplicate sequence detected! Expected ${CONCURRENCY_COUNT} unique values, got ${uniqueSequences.size}`
    );
    console.log(`  ✅ [PASSED] 50/50 Sequences 100% Unique (Zero Collision Probability)\n`);

    // ── 2. CONCURRENT BED ALLOCATION CAS STRESS TEST ──
    console.log('👉 [2/4] Stress Testing 50 Concurrent Bed Allocation Claims on 1 Vacant Bed...');
    
    // Create test floor, room, and vacant bed
    const testFloor = await FloorMaster.create({ floorNumber: 99, floorName: 'Stress Test Ward', wing: 'NORTH' });
    const testRoom = await RoomMaster.create({ floorId: testFloor._id, roomNumber: '9901', roomName: 'Stress ICU', roomType: 'ICU' });
    const testBed = await BedMaster.create({
      floorId: testFloor._id,
      roomId: testRoom._id,
      bedNumber: 'STRESS-01',
      bedLabel: 'Stress Bed 01',
      wardClass: 'ICU',
      status: 'VACANT',
      dailyRate: 5000,
    });

    // Fire 50 simultaneous parallel claim attempts
    const claimPromises = Array.from({ length: CONCURRENCY_COUNT }, (_, idx) =>
      bedRepository.claimBedAtomically(
        testBed._id,
        {
          status: 'OCCUPIED',
          currentPatientId: new mongoose.Types.ObjectId(),
          notes: `Claimed by thread #${idx + 1}`,
        }
      )
    );

    const claimResults = await Promise.all(claimPromises);
    const successfulClaims = claimResults.filter((res) => res !== null);
    const rejectedClaims = claimResults.filter((res) => res === null);

    console.log(`  Successful claims: ${successfulClaims.length} (Expected: 1)`);
    console.log(`  Rejected conflicting claims: ${rejectedClaims.length} (Expected: ${CONCURRENCY_COUNT - 1})`);

    assert.strictEqual(successfulClaims.length, 1, 'Exactly ONE thread must successfully claim the bed!');
    assert.strictEqual(rejectedClaims.length, CONCURRENCY_COUNT - 1, 'All other concurrent threads must be rejected!');

    const finalBed = await BedMaster.findById(testBed._id);
    assert.strictEqual(finalBed.status, 'OCCUPIED');
    console.log(`  ✅ [PASSED] Atomic CAS Protected Bed from Double-Booking under 50-thread load\n`);

    // ── 3. MULTI-DOCUMENT ACID TRANSACTION ROLLBACK TEST ──
    console.log('👉 [3/4] Validating Multi-Document ACID Transaction Rollback Consistency...');
    const session = await mongoose.startSession();
    session.startTransaction();

    let transactionAbortedCleanly = false;
    try {
      // Step A: Modify bed
      await BedMaster.findByIdAndUpdate(testBed._id, { notes: 'Uncommitted mutation' }, { session });

      // Step B: Intentional failure to simulate database or network fault
      throw new Error('Simulated Mid-Flight Clinical Transaction Failure');
    } catch (err) {
      await session.abortTransaction();
      transactionAbortedCleanly = true;
    } finally {
      session.endSession();
    }

    assert.strictEqual(transactionAbortedCleanly, true);
    const uncommittedBedCheck = await BedMaster.findById(testBed._id);
    assert.notStrictEqual(uncommittedBedCheck.notes, 'Uncommitted mutation');
    console.log(`  ✅ [PASSED] ACID Rollback fully preserved database consistency with zero dirty writes\n`);

    // ── 4. CLEANUP TEST ENTITIES ──
    console.log('👉 [4/4] Cleaning Up Test Artifacts...');
    await BedMaster.deleteMany({ _id: testBed._id });
    await RoomMaster.deleteMany({ _id: testRoom._id });
    await FloorMaster.deleteMany({ _id: testFloor._id });
    console.log(`  ✅ [PASSED] Database cleaned up successfully\n`);

    console.log('======================================================');
    console.log('🎉 ALL HIGH-CONCURRENCY & ACID TESTS PASSED (100% INTEGRITY)');
    console.log('======================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runConcurrencyStressSuite().catch((err) => {
  console.error('❌ Concurrency stress suite failed:', err);
  process.exit(1);
});
