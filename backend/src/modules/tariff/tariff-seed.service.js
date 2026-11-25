/**
 * modules/tariff/tariff-seed.js
 * Production-grade baseline hospital tariff seeding.
 * Pre-builds mandatory tariff rules across Registration, Consultations, Bed Accommodations,
 * Bed Support & Nursing Care, Surgical OT Suites, and Diagnostic Laboratories.
 *
 * Admins can inspect and customize all rules in AdminTariffBilling UI, but pre-seeding
 * guarantees zero unpriced charges across the entire patient lifecycle.
 */
const mongoose = require('mongoose');
const TariffRule = require('./tariff-rule.model');
const Staff = require('../staff/staff.model');

const BASELINE_TARIFFS = [
  // ── 1. REGISTRATION ────────────────────────────────────────────────────────
  {
    ruleNumber: 'TR-REG-01',
    name: 'Standard Outpatient Registration Fee',
    description: 'Permanent MRN generation, queue token issuance, and clinic intake',
    category: 'REGISTRATION',
    scope: { visitType: 'OPD' },
    amount: 100,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-REG-02',
    name: 'Inpatient Hospital Admission Fee',
    description: 'Inpatient chart creation, bed reservation protocol, and administrative admission',
    category: 'REGISTRATION',
    scope: { visitType: 'IPD' },
    amount: 500,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-REG-03',
    name: 'Emergency Casualty Triage Intake Fee',
    description: 'STAT emergency intake, fast-track triage, and acute registration',
    category: 'REGISTRATION',
    scope: { visitType: 'EMERGENCY' },
    amount: 250,
    unit: 'PER_VISIT',
  },

  // ── 2. DOCTOR CONSULTATIONS (BY TARIFF GRADE & EMERGENCY) ────────────────────
  {
    ruleNumber: 'TR-CON-01',
    name: 'Junior Resident Doctor Consultation',
    description: 'Initial clinical evaluation by Duty Medical Officer / Junior Resident (Grade 1)',
    category: 'CONSULTATION',
    scope: { tariffGrade: 'GRADE_1' },
    amount: 200,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CON-02',
    name: 'Medical Officer / Senior Resident Consultation',
    description: 'Clinical evaluation and prescription by Senior Resident (Grade 2)',
    category: 'CONSULTATION',
    scope: { tariffGrade: 'GRADE_2' },
    amount: 300,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CON-03',
    name: 'Consultant Specialist Physician Consultation',
    description: 'Comprehensive specialty consultation by Board-Certified Specialist (Grade 3)',
    category: 'CONSULTATION',
    scope: { tariffGrade: 'GRADE_3' },
    amount: 500,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CON-04',
    name: 'Senior Consultant / Department Head Consultation',
    description: 'Advanced specialty consultation by Senior Consultant or HOD (Grade 4)',
    category: 'CONSULTATION',
    scope: { tariffGrade: 'GRADE_4' },
    amount: 800,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CON-05',
    name: 'Super-Specialist / Medical Director Consultation',
    description: 'Complex sub-specialty consultation by Medical Director or Professor (Grade 5)',
    category: 'CONSULTATION',
    scope: { tariffGrade: 'GRADE_5' },
    amount: 1200,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CON-EMRG',
    name: 'Emergency Casualty Doctor Consultation',
    description: 'Immediate trauma and acute life-support medical evaluation',
    category: 'CONSULTATION',
    scope: { visitType: 'EMERGENCY' },
    amount: 500,
    unit: 'PER_VISIT',
  },

  // ── 3. INPATIENT BED ACCOMMODATIONS ──────────────────────────────────────────
  {
    ruleNumber: 'TR-BED-GEN',
    name: 'General Ward Inpatient Bed Stay',
    description: 'Multi-occupancy ward bed with shared nursing and utilities',
    category: 'BED_CHARGES',
    scope: { wardClass: 'GENERAL_WARD', hourlyRate: 63, minAdvanceDeposit: 5000, gracePeriodMinutes: 60 },
    amount: 1500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-SEMI',
    name: 'Semi-Private Room Bed Stay (2-Sharing)',
    description: 'Twin-sharing room with curtain partition and attached restroom',
    category: 'BED_CHARGES',
    scope: { wardClass: 'SEMI_PRIVATE', hourlyRate: 104, minAdvanceDeposit: 8000, gracePeriodMinutes: 60 },
    amount: 2500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-PRIV',
    name: 'Private Single Room Bed Stay',
    description: 'Single-occupancy private room with attendant couch and private television',
    category: 'BED_CHARGES',
    scope: { wardClass: 'PRIVATE', hourlyRate: 167, minAdvanceDeposit: 12000, gracePeriodMinutes: 60 },
    amount: 4000,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-DELUXE',
    name: 'Deluxe Suite Bed Accommodation',
    description: 'Premium air-conditioned suite with private lounge and refrigerator',
    category: 'BED_CHARGES',
    scope: { wardClass: 'DELUXE_PRIVATE', comfortTier: 'DELUXE', hourlyRate: 271, minAdvanceDeposit: 18000, gracePeriodMinutes: 60 },
    amount: 6500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-ICU',
    name: 'Intensive Care Unit (ICU) Critical Care Bed',
    description: 'Multi-parameter hemodynamic monitoring, central oxygen, and invasive support ready',
    category: 'BED_CHARGES',
    scope: { wardClass: 'ICU', hourlyRate: 354, minAdvanceDeposit: 25000, gracePeriodMinutes: 60 },
    amount: 8500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-NICU',
    name: 'Neonatal / Pediatric ICU Bed Accommodation',
    description: 'Infant incubator, radiant warmer, and specialized pediatric telemetry',
    category: 'BED_CHARGES',
    scope: { wardClass: 'NICU', hourlyRate: 313, minAdvanceDeposit: 20000, gracePeriodMinutes: 60 },
    amount: 7500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-HDU',
    name: 'High Dependency Unit (HDU) Step-Down Bed',
    description: 'Intermediate step-down monitoring with high-ratio nursing supervision',
    category: 'BED_CHARGES',
    scope: { wardClass: 'HDU', hourlyRate: 208, minAdvanceDeposit: 15000, gracePeriodMinutes: 60 },
    amount: 5000,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-BED-POSTOP',
    name: 'Post-Operative Recovery Room (PACU) Bed Stay',
    description: 'Post-anesthesia recovery observation and vital stabilization',
    category: 'BED_CHARGES',
    scope: { wardClass: 'POST_OP_RECOVERY', hourlyRate: 125, minAdvanceDeposit: 6000, gracePeriodMinutes: 60 },
    amount: 3000,
    unit: 'PER_DAY',
  },

  // ── 4. BED SUPPORT & CLINICAL NURSING CARE ACCRUALS ─────────────────────────
  {
    ruleNumber: 'TR-CARE-GEN',
    name: 'General Ward Nursing & Bed Support Care',
    description: '24-hour ward nursing supervision, fluid charts, medication administration, and linens',
    category: 'PROCEDURE',
    scope: { wardClass: 'GENERAL_WARD', visitType: 'IPD' },
    amount: 500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-CARE-ICU',
    name: 'ICU 1:1 Critical Care Nursing Support',
    description: 'Dedicated critical care nurse, ventilator management, and arterial line monitoring',
    category: 'PROCEDURE',
    scope: { wardClass: 'ICU', visitType: 'IPD' },
    amount: 1500,
    unit: 'PER_DAY',
  },
  {
    ruleNumber: 'TR-CARE-RMO',
    name: 'Resident Medical Officer (RMO) Ward Round',
    description: 'Daily clinical progress evaluation and chart note documentation by duty RMO',
    category: 'CONSULTATION',
    scope: { wardClass: 'GENERAL_WARD', visitType: 'IPD' },
    amount: 400,
    unit: 'PER_VISIT',
  },
  {
    ruleNumber: 'TR-CARE-RMO-ICU',
    name: 'Intensivist / RMO Critical Care Unit Round',
    description: 'Multi-hourly critical organ system review and intensivist management',
    category: 'CONSULTATION',
    scope: { wardClass: 'ICU', visitType: 'IPD' },
    amount: 1000,
    unit: 'PER_VISIT',
  },

  // ── 5. OPERATING THEATRE & SURGICAL SUITE TARIFFS ───────────────────────────
  {
    ruleNumber: 'TR-SURG-MINOR',
    name: 'Minor OT Surgical Theatre Charge',
    description: 'Operating theatre facility, laminar airflow, surgical equipment sterilization for minor procedure',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 3500,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-SURG-MAJOR',
    name: 'Major OT Surgical Theatre Charge',
    description: 'High-tier operating theatre facility, advanced electrocautery, and central surgical gases',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 12000,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-SURG-LAP',
    name: 'Laparoscopic / Complex OT Theatre Charge',
    description: '4K Laparoscopy tower, harmonic scalpel, and specialized endoscopic theatre setup',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 20000,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-FEE-SURG-MIN',
    name: 'Minor Surgical Procedure Surgeon Fee',
    description: 'Professional surgeon operative fee for minor day-care surgical interventions',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 5000,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-FEE-SURG-MAJ',
    name: 'Major Surgical Procedure Surgeon Fee',
    description: 'Professional lead surgeon operative fee for major open or laparoscopic surgery',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 15000,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-FEE-ANES-MIN',
    name: 'Minor Surgery Anaesthesia Professional Fee',
    description: 'Local/sedation or short spinal anesthesia administration and monitoring',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 2000,
    unit: 'PER_PROCEDURE',
  },
  {
    ruleNumber: 'TR-FEE-ANES-MAJ',
    name: 'Major Surgery Anaesthesia Professional Fee',
    description: 'Endotracheal general anesthesia (GA), arterial line placement, and intra-op ventilation',
    category: 'PROCEDURE',
    scope: { visitType: 'SURGERY' },
    amount: 6000,
    unit: 'PER_PROCEDURE',
  },

  // ── 6. DIAGNOSTIC LABORATORY MASTER TARIFFS ──────────────────────────────────
  {
    ruleNumber: 'TR-LAB-CBC',
    name: 'Complete Blood Count (CBC) with Differential',
    description: 'Automated 5-part differential hematology cell counter evaluation',
    category: 'DIAGNOSTICS',
    testCode: 'CBC',
    amount: 350,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-LFT',
    name: 'Liver Function Test (LFT) Complete Panel',
    description: 'Bilirubin (Total/Direct), SGOT, SGPT, ALP, Total Protein, Albumin, Globulin',
    category: 'DIAGNOSTICS',
    testCode: 'LFT',
    amount: 750,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-KFT',
    name: 'Kidney Function Test (KFT/RFT) Panel',
    description: 'Blood Urea, Serum Creatinine, Uric Acid, Serum Electrolytes (Na+, K+, Cl-)',
    category: 'DIAGNOSTICS',
    testCode: 'KFT',
    amount: 650,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-LIPID',
    name: 'Lipid Profile Cardiovascular Panel',
    description: 'Total Cholesterol, HDL, LDL, VLDL, Triglycerides, TC/HDL Ratio',
    category: 'DIAGNOSTICS',
    testCode: 'LIPID',
    amount: 800,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-GLUCOSE',
    name: 'Blood Glucose Test (Fasting / PP / Random)',
    description: 'Enzymatic hexokinase quantitative plasma glucose assay',
    category: 'DIAGNOSTICS',
    testCode: 'GLUCOSE',
    amount: 120,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-URINE',
    name: 'Complete Urine Routine & Microscopy',
    description: 'Physical, chemical dipstick, and centrifugal microscopic sediment analysis',
    category: 'DIAGNOSTICS',
    testCode: 'URINE',
    amount: 200,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-XRAY',
    name: 'Digital Chest Radiograph (X-Ray PA View)',
    description: 'High-frequency digital chest radiography with reporting',
    category: 'DIAGNOSTICS',
    testCode: 'XRAY_CHEST',
    amount: 500,
    unit: 'PER_TEST',
  },
  {
    ruleNumber: 'TR-LAB-ECG',
    name: '12-Lead Diagnostic Electrocardiogram (ECG)',
    description: 'Computerized 12-channel resting cardiac rhythm strip with physician interpretation',
    category: 'DIAGNOSTICS',
    testCode: 'ECG',
    amount: 300,
    unit: 'PER_TEST',
  },
];

/**
 * Idempotently seed baseline tariff schedules.
 * @param {object} [options]
 * @param {string} [options.staffId] - Authorizing staff ID
 * @returns {Promise<{total: number, created: number, updated: number}>}
 */
async function seedDefaultTariffs(options = {}) {
  let authorId = options.staffId;
  if (!authorId || !mongoose.Types.ObjectId.isValid(authorId)) {
    const adminStaff = await Staff.findOne({ status: { $in: ['Active', 'ACTIVE'] } }).select('_id').lean();
    authorId = adminStaff?._id || new mongoose.Types.ObjectId();
  }

  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const item of BASELINE_TARIFFS) {
    const existing = await TariffRule.findOne({ ruleNumber: item.ruleNumber });

    if (!existing) {
      await TariffRule.create({
        ...item,
        status: 'PUBLISHED',
        effectiveFrom: now,
        createdBy: authorId,
        publishHistory: [
          {
            action: 'PUBLISHED',
            performedBy: authorId,
            performedAt: now,
            reason: 'Initial institutional tariff schedule seed',
            prevAmount: null,
          },
        ],
      });
      created += 1;
    } else {
      // Preserve status if already PUBLISHED or DRAFT, ensure mandatory core fields exist
      existing.name = existing.name || item.name;
      existing.description = existing.description || item.description;
      if (!existing.amount || existing.amount <= 0) {
        existing.amount = item.amount;
      }
      if (existing.status !== 'PUBLISHED' && existing.status !== 'DRAFT') {
        existing.status = 'PUBLISHED';
      }
      await existing.save();
      updated += 1;
    }
  }

  return {
    total: BASELINE_TARIFFS.length,
    created,
    updated,
  };
}

module.exports = {
  seedDefaultTariffs,
  BASELINE_TARIFFS,
};
