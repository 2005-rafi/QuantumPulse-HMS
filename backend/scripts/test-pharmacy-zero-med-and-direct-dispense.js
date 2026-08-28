require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const visitService = require('../src/modules/visits/visit.service');
const pharmacyService = require('../src/modules/pharmacy/pharmacy.service');
const Patient = require('../src/modules/patient/patient.model');
const Staff = require('../src/modules/staff/staff.model');
const Visit = require('../src/modules/visits/visit.model');

async function testPharmacyEnhancements() {
  await mongoose.connect(config.mongoUri);
  console.log('--- Connected to MongoDB Atlas ---');

  const patient = await Patient.findOne();
  const staff = await Staff.findOne({ roleId: { $ne: null } });

  if (!patient || !staff) {
    throw new Error('Patient or Staff not found in database.');
  }

  console.log(`Using Patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);
  console.log(`Using Staff: ${staff.fullName}`);

  // ── [1] Test Zero-Medication Consultation Visit Finalization ──────────────
  console.log('\n[1] Testing Zero-Medication Consultation Visit Finalization...');
  const consultVisit = await visitService.createVisit({
    patientId: patient._id,
    visitType: 'OPD',
    reasonForVisit: 'Knee Osteoarthritis Routine Review',
    receptionPayment: { registrationFee: 100, consultationFee: 500, paymentMethod: 'Cash' },
  }, staff._id);

  // Transition visit to WAITING_PHARMACY to simulate doctor consultation completed without new meds
  await Visit.findByIdAndUpdate(consultVisit._id, {
    status: 'WAITING_PHARMACY',
    prescribedMedications: [],
    consultation: {
      doctorId: staff._id,
      diagnosis: 'Bilateral Knee Osteoarthritis - Grade 2',
      treatmentPlan: 'Continue prescribed home medications. Review in 30 days.',
      status: 'FINALIZED',
    },
  });

  const zeroMedDispenseResult = await pharmacyService.dispenseMedications(
    consultVisit._id,
    {
      consultationFee: 50,
      labCharges: 0,
      dispensedMedications: [],
    },
    staff._id
  );

  const updatedVisit = await Visit.findById(consultVisit._id);
  console.log('✅ Visit Status after Nil Dispense:', updatedVisit.status);
  console.log('✅ Pharmacy Work Total:', updatedVisit.pharmacyWork.totalAmount);
  console.log('✅ Total Billed for Advice-Only Encounter:', updatedVisit.billing.totalAmount);

  if (updatedVisit.status !== 'COMPLETED' || updatedVisit.billing.totalAmount !== 50) {
    throw new Error('Zero-medication dispense failed validation checks!');
  }

  // ── [2] Test Direct OTC / Walk-in Pharmacy Visit Creation ────────────────
  console.log('\n[2] Testing Direct OTC / Walk-in Pharmacy Visit Creation...');
  const directVisit = await visitService.createVisit({
    patientId: patient._id,
    isDirectPharmacy: true,
    reasonForVisit: 'Direct OTC Medicine Purchase',
  }, staff._id);

  console.log('✅ Direct Pharmacy Visit Token:', directVisit.tokenString);
  console.log('✅ Direct Pharmacy Initial Status:', directVisit.status);

  if (directVisit.status !== 'WAITING_PHARMACY' || !directVisit.tokenString) {
    throw new Error('Direct pharmacy visit token or status incorrect!');
  }

  // ── [3] Dispense OTC Medicines ──────────────────────────────────────────
  console.log('\n[3] Dispensing OTC Medicines for Direct Visit...');
  const directDispenseResult = await pharmacyService.dispenseMedications(
    directVisit._id,
    {
      consultationFee: 0,
      labCharges: 0,
      dispensedMedications: [
        { recommended: 'Paracetamol 650mg', alternativeGiven: '', quantity: '10', amount: 35 },
        { recommended: 'Cetirizine 10mg', alternativeGiven: '', quantity: '10', amount: 40 },
      ],
    },
    staff._id
  );

  const completedDirectVisit = await Visit.findById(directVisit._id);
  console.log('✅ Direct Visit Status:', completedDirectVisit.status);
  console.log('✅ Dispensed Medications Count:', completedDirectVisit.pharmacyWork.dispensedMedications.length);
  console.log('✅ Pharmacy Total Charges:', completedDirectVisit.pharmacyWork.totalAmount);

  // Clean up test visits
  await Visit.findByIdAndDelete(consultVisit._id);
  await Visit.findByIdAndDelete(directVisit._id);
  console.log('\n🧹 Test visits cleaned up.');

  console.log('\n🎉 ALL PHARMACY ZERO-MEDICATION & DIRECT OTC TESTS PASSED PERFECTLY!');
  await mongoose.disconnect();
}

testPharmacyEnhancements().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
