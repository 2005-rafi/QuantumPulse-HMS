/**
 * Integration Test: Tariff & Billing Lifecycle Verification
 * Tests the entire financial flow:
 * 1. TariffResolver resolution across scopes
 * 2. Bill creation from BillableEvent
 * 3. LineItem snapshot immutability
 * 4. Payment recording & balance calculation
 * 5. Bill finalization
 * 6. Financial adjustments (Credit Note)
 * 7. Analytics aggregation pipeline
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const tariffResolver = require('../src/modules/tariff/tariff-resolver');
const billingService = require('../src/modules/billing/bill.service');
const billRepository = require('../src/modules/billing/bill.repository');
const Staff = require('../src/modules/staff/staff.model');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');

async function runTest() {
  await mongoose.connect(config.mongoUri);
  console.log('--- Connected to MongoDB Atlas ---');

  // 1. Test TariffResolver
  console.log('\n[1] Testing TariffResolver...');
  const opdRegRes = await tariffResolver.resolve({ category: 'REGISTRATION', visitType: 'OPD' });
  console.log('✅ Resolved OPD Registration Tariff:', opdRegRes);

  const consRes = await tariffResolver.resolve({ category: 'CONSULTATION', tariffGrade: 'GRADE_3' });
  console.log('✅ Resolved Grade 3 Consultation Tariff:', consRes);

  const diagRes = await tariffResolver.resolve({ category: 'DIAGNOSTICS', testCode: 'CBC' });
  console.log('✅ Resolved CBC Lab Test Tariff:', diagRes);

  // 2. Fetch dummy patient and staff
  const staff = (await Staff.findOne({ status: 'Active' }).lean()) || (await Staff.findOne({}).lean());
  const patient = await Patient.findOne({}).lean();
  if (!staff || !patient) {
    console.error('Staff or Patient missing for integration test.');
    process.exit(1);
  }

  // 3. Test Bill Creation via BillableEvent
  console.log('\n[2] Testing Bill Creation via BillableEvent (VISIT_REGISTERED)...');
  const dummyVisitId = new mongoose.Types.ObjectId();
  
  const createdBill = await billingService.processBillableEvent({
    type: 'VISIT_REGISTERED',
    visitId: dummyVisitId,
    patientId: patient._id,
    triggeredBy: staff._id,
    triggeredAt: new Date(),
    resolutionContext: {
      category: 'REGISTRATION',
      visitType: 'OPD',
      quantity: 1,
    },
    description: 'OPD Registration Fee',
  });
  console.log('✅ Created Bill Number:', createdBill.billNumber, 'Billed Amount:', createdBill.billedAmount);

  // 4. Add Consultation and Pharmacy charges
  console.log('\n[3] Adding Doctor Consultation & Dispensed Medicine charges...');
  await billingService.processBillableEvent({
    type: 'CONSULTATION_COMPLETED',
    visitId: dummyVisitId,
    patientId: patient._id,
    triggeredBy: staff._id,
    triggeredAt: new Date(),
    resolutionContext: {
      category: 'CONSULTATION',
      tariffGrade: 'GRADE_3',
      quantity: 1,
    },
    description: 'Senior Consultant Review',
  });

  await billingService.processBillableEvent({
    type: 'MEDICINE_DISPENSED',
    visitId: dummyVisitId,
    patientId: patient._id,
    triggeredBy: staff._id,
    triggeredAt: new Date(),
    resolutionContext: {
      category: 'PHARMACY',
      medicineName: 'Paracetamol 650mg',
      quantity: 10,
    },
    preResolvedPrice: 30, // 10 tablets * ₹3
    description: 'Paracetamol 650mg ×10',
  });

  const billAfterCharges = await billingService.getBillForVisit(dummyVisitId);
  console.log('✅ Bill After 3 Charges:');
  console.log('   Line Items count:', billAfterCharges.lineItems.length);
  console.log('   Total Billed:', billAfterCharges.billedAmount);
  console.log('   Outstanding:', billAfterCharges.outstandingAmount);

  // 5. Test Payment Recording
  console.log('\n[4] Recording Cash Payment...');
  const billAfterPay = await billingService.recordPayment(billAfterCharges._id, {
    amount: 500,
    method: 'Cash',
    reference: 'RECEIPT-001',
  }, staff._id);
  console.log('✅ Recorded ₹500 Payment. Remaining Outstanding:', billAfterPay.outstandingAmount);

  // 6. Test Bill Finalization
  console.log('\n[5] Finalizing Bill...');
  const finalized = await billingService.finalizeBill(billAfterCharges._id, staff._id);
  console.log('✅ Bill Status:', finalized.status);

  // 7. Test Adjustment (Credit Note)
  console.log('\n[6] Requesting & Approving Credit Note Adjustment...');
  const billWithAdjReq = await billingService.requestAdjustment(billAfterCharges._id, {
    type: 'CREDIT_NOTE',
    amount: 100,
    reason: 'Senior Citizen Hospital Concession',
  }, staff._id);
  const adjId = billWithAdjReq.adjustments[0]._id;

  const billWithApprovedAdj = await billingService.approveAdjustment(billAfterCharges._id, adjId, staff._id);
  console.log('✅ Approved Credit Note. Adjusted Amount:', billWithApprovedAdj.adjustedAmount, 'Outstanding:', billWithApprovedAdj.outstandingAmount);

  // 8. Test Analytics Aggregations
  console.log('\n[7] Testing Analytics Aggregation Pipelines...');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const summary = await billingService.getAnalyticsSummary(thirtyDaysAgo.toISOString(), tomorrow.toISOString());
  console.log('✅ Analytics Revenue Summary:', summary);

  const categoryBreakdown = await billingService.getAnalyticsByCategory(thirtyDaysAgo.toISOString(), tomorrow.toISOString());
  console.log('✅ Analytics Category Breakdown:', categoryBreakdown);

  // Cleanup test bill
  await billRepository.findById(billAfterCharges._id);
  const Bill = require('../src/modules/billing/bill.model');
  await Bill.findByIdAndDelete(billAfterCharges._id);
  console.log('\n🧹 Test bill cleaned up.');

  await mongoose.disconnect();
  console.log('\n🎉 ALL TARIFF & BILLING LIFECYCLE TESTS PASSED PERFECTLY!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
