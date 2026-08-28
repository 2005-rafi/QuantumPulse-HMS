/**
 * Seed Script: Tariff Management Initial Data
 * Seeds ServiceMasters and TariffRules for the QuantumPulse HMS.
 *
 * Usage: node backend/scripts/seed-tariff-data.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const ServiceMaster = require('../src/modules/tariff/service-master.model');
const TariffRule = require('../src/modules/tariff/tariff-rule.model');
const MedicinePrice = require('../src/modules/pharmacy/medicine-price.model');
const Staff = require('../src/modules/staff/staff.model');

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB Atlas');

  // Find an admin/staff to use as createdBy
  const admin = (await Staff.findOne({ status: 'Active' }).lean()) || (await Staff.findOne({}).lean());
  if (!admin) {
    console.error('No staff found. Please seed staff first.');
    process.exit(1);
  }
  const adminId = admin._id;

  // ── ServiceMasters ───────────────────────────────────────────────────────
  const services = [
    { code: 'REG-OPD', name: 'OPD Registration', category: 'REGISTRATION', defaultUnit: 'PER_VISIT' },
    { code: 'REG-EMERGENCY', name: 'Emergency Registration', category: 'REGISTRATION', defaultUnit: 'PER_VISIT' },
    { code: 'CONS-GEN', name: 'General Consultation', category: 'CONSULTATION', defaultUnit: 'PER_VISIT' },
    { code: 'CONS-CARD', name: 'Cardiology Consultation', category: 'CONSULTATION', defaultUnit: 'PER_VISIT' },
    { code: 'CONS-NEURO', name: 'Neurology Consultation', category: 'CONSULTATION', defaultUnit: 'PER_VISIT' },
    { code: 'CONS-ORTH', name: 'Orthopaedics Consultation', category: 'CONSULTATION', defaultUnit: 'PER_VISIT' },
    { code: 'CONS-PEDS', name: 'Paediatrics Consultation', category: 'CONSULTATION', defaultUnit: 'PER_VISIT' },
    { code: 'PROC-DRESSING', name: 'Wound Dressing', category: 'PROCEDURE', defaultUnit: 'PER_PROCEDURE' },
    { code: 'PROC-SUTURE', name: 'Suturing', category: 'PROCEDURE', defaultUnit: 'PER_PROCEDURE' },
    { code: 'PROC-IV', name: 'IV Line Insertion', category: 'PROCEDURE', defaultUnit: 'PER_PROCEDURE' },
  ];

  let seededServices = 0;
  for (const svc of services) {
    const exists = await ServiceMaster.findOne({ code: svc.code });
    if (!exists) {
      await ServiceMaster.create({ ...svc, createdBy: adminId });
      seededServices++;
    }
  }
  console.log(`✅ Seeded ${seededServices} ServiceMasters (${services.length - seededServices} already existed)`);

  // ── TariffRules (Global defaults) ────────────────────────────────────────
  const now = new Date();
  const regOPD = await ServiceMaster.findOne({ code: 'REG-OPD' });
  const regEmergency = await ServiceMaster.findOne({ code: 'REG-EMERGENCY' });
  const consGen = await ServiceMaster.findOne({ code: 'CONS-GEN' });
  const procDressing = await ServiceMaster.findOne({ code: 'PROC-DRESSING' });
  const procSuture = await ServiceMaster.findOne({ code: 'PROC-SUTURE' });

  const rules = [
    // Registration — global defaults
    {
      serviceMasterId: regOPD?._id,
      category: 'REGISTRATION',
      scope: {},
      amount: 100,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    {
      serviceMasterId: regEmergency?._id,
      category: 'REGISTRATION',
      scope: { visitType: 'EMERGENCY' },
      amount: 200,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    // Consultation — global defaults by grade
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: { tariffGrade: 'GRADE_1' },
      amount: 300,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: { tariffGrade: 'GRADE_2' },
      amount: 400,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: { tariffGrade: 'GRADE_3' },
      amount: 600,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: { tariffGrade: 'GRADE_4' },
      amount: 900,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: { tariffGrade: 'GRADE_5' },
      amount: 1500,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    // Global fallback consultation
    {
      serviceMasterId: consGen?._id,
      category: 'CONSULTATION',
      scope: {},
      amount: 500,
      unit: 'PER_VISIT',
      effectiveFrom: now,
      status: 'PUBLISHED',
    },
    // Procedures
    { serviceMasterId: procDressing?._id, category: 'PROCEDURE', scope: {}, amount: 150, unit: 'PER_PROCEDURE', effectiveFrom: now, status: 'PUBLISHED' },
    { serviceMasterId: procSuture?._id, category: 'PROCEDURE', scope: {}, amount: 500, unit: 'PER_PROCEDURE', effectiveFrom: now, status: 'PUBLISHED' },
    // Diagnostics — global fallback by testCode
    { testCode: 'CBC', category: 'DIAGNOSTICS', scope: {}, amount: 250, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'LFT', category: 'DIAGNOSTICS', scope: {}, amount: 400, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'KFT', category: 'DIAGNOSTICS', scope: {}, amount: 350, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'URINE-RE', category: 'DIAGNOSTICS', scope: {}, amount: 150, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'XRAY-CHEST', category: 'DIAGNOSTICS', scope: {}, amount: 300, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'ECG', category: 'DIAGNOSTICS', scope: {}, amount: 200, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'ECHO', category: 'DIAGNOSTICS', scope: {}, amount: 1200, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
    { testCode: 'USG-ABDOMEN', category: 'DIAGNOSTICS', scope: {}, amount: 800, unit: 'PER_TEST', effectiveFrom: now, status: 'PUBLISHED' },
  ];

  let seededRules = 0;
  for (const rule of rules) {
    const query = {
      category: rule.category,
      status: rule.status,
      ...(rule.testCode ? { testCode: rule.testCode } : {}),
      ...(rule.serviceMasterId ? { serviceMasterId: rule.serviceMasterId } : {}),
      'scope.tariffGrade': rule.scope?.tariffGrade || null,
      'scope.visitType': rule.scope?.visitType || null,
      'scope.departmentId': rule.scope?.departmentId || null,
    };
    const exists = await TariffRule.findOne(query);
    if (!exists) {
      await TariffRule.create({
        ...rule,
        createdBy: adminId,
        publishHistory: [{ action: 'DRAFTED', performedBy: adminId, performedAt: now }, { action: 'PUBLISHED', performedBy: adminId, performedAt: now, reason: 'Initial seed' }],
      });
      seededRules++;
    }
  }
  console.log(`✅ Seeded ${seededRules} TariffRules (${rules.length - seededRules} already existed)`);

  // ── Medicine Prices ──────────────────────────────────────────────────────
  const medicines = [
    { medicineName: 'Paracetamol 500mg', genericName: 'Paracetamol', unitPrice: 2.5, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Paracetamol 650mg', genericName: 'Paracetamol', unitPrice: 3.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Amoxicillin 500mg', genericName: 'Amoxicillin', unitPrice: 8.0, unit: 'capsule', dispensingFee: 10 },
    { medicineName: 'Ibuprofen 400mg', genericName: 'Ibuprofen', unitPrice: 5.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Metformin 500mg', genericName: 'Metformin', unitPrice: 3.5, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Atorvastatin 10mg', genericName: 'Atorvastatin', unitPrice: 6.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Amlodipine 5mg', genericName: 'Amlodipine', unitPrice: 4.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Omeprazole 20mg', genericName: 'Omeprazole', unitPrice: 7.0, unit: 'capsule', dispensingFee: 0 },
    { medicineName: 'Azithromycin 500mg', genericName: 'Azithromycin', unitPrice: 35.0, unit: 'tablet', dispensingFee: 10 },
    { medicineName: 'Normal Saline 500ml', genericName: 'Sodium Chloride', unitPrice: 45.0, unit: 'bottle', dispensingFee: 20 },
    { medicineName: 'Dextrose 5% 500ml', genericName: 'Dextrose', unitPrice: 50.0, unit: 'bottle', dispensingFee: 20 },
    { medicineName: 'Ondansetron 4mg', genericName: 'Ondansetron', unitPrice: 12.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Pantoprazole 40mg', genericName: 'Pantoprazole', unitPrice: 9.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Cetirizine 10mg', genericName: 'Cetirizine', unitPrice: 3.0, unit: 'tablet', dispensingFee: 0 },
    { medicineName: 'Vitamin D3 60000 IU', genericName: 'Cholecalciferol', unitPrice: 28.0, unit: 'sachet', dispensingFee: 5 },
  ];

  let seededMeds = 0;
  for (const med of medicines) {
    const exists = await MedicinePrice.findOne({ medicineName: med.medicineName, status: 'ACTIVE' });
    if (!exists) {
      await MedicinePrice.create({ ...med, effectiveFrom: now, setBy: adminId });
      seededMeds++;
    }
  }
  console.log(`✅ Seeded ${seededMeds} MedicinePrices (${medicines.length - seededMeds} already existed)`);

  await mongoose.disconnect();
  console.log('\n🎉 Tariff seeding complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
