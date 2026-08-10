/**
 * SEED SCRIPT — Laboratory Catalog Bootstrap
 *
 * Creates default laboratories linked to diagnostic departments,
 * each with a realistic test catalog including File-type fields.
 *
 * Usage:  node scripts/seed-labs.js
 * Safe:   Idempotent — uses upsert semantics. Safe to re-run.
 * Guard:  Requires departments to already exist (run seed-admin.js first).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });

const mongoose = require('mongoose');
const config = require('../src/core/config');
const Department = require('../src/modules/administration/department.model');
const Laboratory = require('../src/modules/laboratory/laboratory.model');

// ── Default test catalogs per laboratory ────────────────────────────────────────

const LAB_DEFINITIONS = [
  {
    deptName: 'Haematology',
    lab: {
      name: 'Haematology Laboratory',
      description: 'Complete blood analysis and haematology investigations',
      testCatalog: [
        {
          name: 'Complete Blood Count (CBC)',
          testCode: 'CBC',
          sampleType: 'EDTA Blood (3 mL)',
          resultFields: [
            { key: 'haemoglobin',      label: 'Haemoglobin',        type: 'Number', unit: 'g/dL',        reference: '12.0–17.5',  required: true },
            { key: 'rbc',              label: 'RBC Count',          type: 'Number', unit: 'million/µL',  reference: '4.5–5.5',    required: true },
            { key: 'wbc',              label: 'WBC Count',          type: 'Number', unit: 'thousands/µL',reference: '4.5–11.0',   required: true },
            { key: 'platelets',        label: 'Platelet Count',     type: 'Number', unit: 'thousands/µL',reference: '150–400',    required: true },
            { key: 'pcv',              label: 'PCV / Haematocrit',  type: 'Number', unit: '%',           reference: '37–52',      required: false },
            { key: 'mcv',              label: 'MCV',                type: 'Number', unit: 'fL',          reference: '80–100',     required: false },
            { key: 'mch',              label: 'MCH',                type: 'Number', unit: 'pg',          reference: '27–33',      required: false },
            { key: 'mchc',             label: 'MCHC',               type: 'Number', unit: 'g/dL',        reference: '31.5–36.0',  required: false },
            { key: 'neutrophils',      label: 'Neutrophils',        type: 'Number', unit: '%',           reference: '40–70',      required: false },
            { key: 'lymphocytes',      label: 'Lymphocytes',        type: 'Number', unit: '%',           reference: '20–40',      required: false },
            { key: 'eosinophils',      label: 'Eosinophils',        type: 'Number', unit: '%',           reference: '1–4',        required: false },
            { key: 'remarks',          label: 'Technician Remarks', type: 'Text',   unit: '',            reference: '',           required: false },
          ],
        },
        {
          name: 'Erythrocyte Sedimentation Rate (ESR)',
          testCode: 'ESR',
          sampleType: 'Citrate Blood (1.8 mL)',
          resultFields: [
            { key: 'esr_1hr',   label: 'ESR (1st hour)', type: 'Number', unit: 'mm/hr', reference: 'M: 0–15 / F: 0–20', required: true },
            { key: 'esr_2hr',   label: 'ESR (2nd hour)', type: 'Number', unit: 'mm/hr', reference: '',                   required: false },
          ],
        },
      ],
    },
  },

  {
    deptName: 'Biochemistry',
    lab: {
      name: 'Biochemistry Laboratory',
      description: 'Blood chemistry, metabolic panel, and organ function tests',
      testCatalog: [
        {
          name: 'Liver Function Test (LFT)',
          testCode: 'LFT',
          sampleType: 'Serum (5 mL)',
          resultFields: [
            { key: 'total_bilirubin',   label: 'Total Bilirubin',   type: 'Number', unit: 'mg/dL',  reference: '0.2–1.2',  required: true },
            { key: 'direct_bilirubin',  label: 'Direct Bilirubin',  type: 'Number', unit: 'mg/dL',  reference: '0.0–0.4',  required: true },
            { key: 'sgot',              label: 'SGOT / AST',        type: 'Number', unit: 'IU/L',   reference: '10–40',    required: true },
            { key: 'sgpt',              label: 'SGPT / ALT',        type: 'Number', unit: 'IU/L',   reference: '7–56',     required: true },
            { key: 'alp',               label: 'Alkaline Phosphatase', type: 'Number', unit: 'IU/L', reference: '44–147', required: false },
            { key: 'total_protein',     label: 'Total Protein',     type: 'Number', unit: 'g/dL',   reference: '6.0–8.3',  required: false },
            { key: 'albumin',           label: 'Albumin',           type: 'Number', unit: 'g/dL',   reference: '3.4–5.4',  required: false },
          ],
        },
        {
          name: 'Renal Function Test (RFT)',
          testCode: 'RFT',
          sampleType: 'Serum (5 mL)',
          resultFields: [
            { key: 'urea',        label: 'Blood Urea',     type: 'Number', unit: 'mg/dL',   reference: '7–20',      required: true },
            { key: 'creatinine',  label: 'Creatinine',     type: 'Number', unit: 'mg/dL',   reference: '0.6–1.2',   required: true },
            { key: 'uric_acid',   label: 'Uric Acid',      type: 'Number', unit: 'mg/dL',   reference: '3.4–7.0',   required: false },
            { key: 'sodium',      label: 'Sodium',         type: 'Number', unit: 'mEq/L',   reference: '136–145',   required: false },
            { key: 'potassium',   label: 'Potassium',      type: 'Number', unit: 'mEq/L',   reference: '3.5–5.1',   required: false },
          ],
        },
        {
          name: 'Blood Glucose (Fasting / Random / PP)',
          testCode: 'GLU',
          sampleType: 'Serum (2 mL)',
          resultFields: [
            { key: 'glucose_type',   label: 'Sample Type',        type: 'Text',   unit: '',       reference: 'Fasting / PP / Random', required: true },
            { key: 'glucose_value',  label: 'Glucose Level',      type: 'Number', unit: 'mg/dL',  reference: 'Fasting: 70–100',       required: true },
            { key: 'hba1c',          label: 'HbA1c',              type: 'Number', unit: '%',      reference: 'Normal: <5.7',          required: false },
          ],
        },
      ],
    },
  },

  {
    deptName: 'Microbiology',
    lab: {
      name: 'Microbiology Laboratory',
      description: 'Culture, sensitivity, and infection diagnostics',
      testCatalog: [
        {
          name: 'Urine Routine Examination',
          testCode: 'URINE_RE',
          sampleType: 'Mid-stream urine (10 mL)',
          resultFields: [
            { key: 'colour',      label: 'Colour',          type: 'Text',    unit: '', reference: 'Pale yellow',    required: true },
            { key: 'appearance',  label: 'Appearance',      type: 'Text',    unit: '', reference: 'Clear',          required: true },
            { key: 'ph',          label: 'pH',              type: 'Number',  unit: '', reference: '4.5–8.0',        required: true },
            { key: 'protein',     label: 'Protein',         type: 'Text',    unit: '', reference: 'Negative/Trace', required: true },
            { key: 'glucose',     label: 'Glucose',         type: 'Text',    unit: '', reference: 'Negative',       required: false },
            { key: 'pus_cells',   label: 'Pus Cells',       type: 'Text',    unit: '/HPF', reference: '0–5',        required: false },
            { key: 'rbc_urine',   label: 'RBC (Urine)',     type: 'Text',    unit: '/HPF', reference: 'Nil',        required: false },
            { key: 'bacteria',    label: 'Bacteria',        type: 'Text',    unit: '', reference: 'Nil',            required: false },
            { key: 'remarks',     label: 'Remarks',         type: 'Text',    unit: '', reference: '',               required: false },
          ],
        },
        {
          name: 'Blood Culture & Sensitivity',
          testCode: 'BCULTURE',
          sampleType: 'Venous Blood (10 mL in culture bottle)',
          resultFields: [
            { key: 'organism',     label: 'Organism Grown',    type: 'Text', unit: '', reference: 'No Growth in 5 days', required: true },
            { key: 'sensitivity',  label: 'Sensitivity Report',type: 'Text', unit: '', reference: '',                    required: false },
            { key: 'report_file',  label: 'Sensitivity PDF',   type: 'File', unit: '', reference: '',                    required: false },
          ],
        },
      ],
    },
  },

  {
    deptName: 'Radiology',
    lab: {
      name: 'Radiology & Imaging',
      description: 'X-Ray, Ultrasound, CT, MRI, and scan report uploads',
      testCatalog: [
        {
          name: 'X-Ray (Chest / Bone / Abdomen)',
          testCode: 'XRAY',
          sampleType: 'None (Imaging)',
          resultFields: [
            { key: 'region',       label: 'Region Examined',  type: 'Text', unit: '', reference: '',  required: true },
            { key: 'findings',     label: 'Radiologist Findings', type: 'Text', unit: '', reference: '', required: true },
            { key: 'impression',   label: 'Impression',       type: 'Text', unit: '', reference: '',  required: false },
            { key: 'scan_image',   label: 'Scan Image Upload',type: 'File', unit: '', reference: '',  required: false },
          ],
        },
        {
          name: 'Ultrasound (Abdomen / Pelvis / Thyroid)',
          testCode: 'USG',
          sampleType: 'None (Imaging)',
          resultFields: [
            { key: 'region',       label: 'Region',           type: 'Text', unit: '', reference: '',  required: true },
            { key: 'findings',     label: 'Findings',         type: 'Text', unit: '', reference: '',  required: true },
            { key: 'impression',   label: 'Impression',       type: 'Text', unit: '', reference: '',  required: false },
            { key: 'report_file',  label: 'Report Upload (PDF)', type: 'File', unit: '', reference: '', required: false },
          ],
        },
      ],
    },
  },

  {
    deptName: 'Histopathology',
    lab: {
      name: 'Histopathology Laboratory',
      description: 'Tissue, biopsy, and cytology analysis',
      testCatalog: [
        {
          name: 'Biopsy / Histopathology',
          testCode: 'BIOPSY',
          sampleType: 'Tissue in 10% formalin',
          resultFields: [
            { key: 'specimen',        label: 'Specimen',              type: 'Text', unit: '', reference: '',  required: true },
            { key: 'gross',           label: 'Gross Description',     type: 'Text', unit: '', reference: '',  required: false },
            { key: 'microscopy',      label: 'Microscopic Description', type: 'Text', unit: '', reference: '', required: false },
            { key: 'diagnosis',       label: 'Histopathological Diagnosis', type: 'Text', unit: '', reference: '', required: true },
            { key: 'slide_image',     label: 'Slide Image Upload',    type: 'File', unit: '', reference: '',  required: false },
            { key: 'report_file',     label: 'Report PDF Upload',     type: 'File', unit: '', reference: '',  required: false },
          ],
        },
      ],
    },
  },
];

// ── Seed ─────────────────────────────────────────────────────────────────────────

async function seedLabs() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');
  console.log('\n[Lab Seed] Starting laboratory seed...');

  for (const def of LAB_DEFINITIONS) {
    // 1. Find the target department
    const dept = await Department.findOne({ name: def.deptName });
    if (!dept) {
      console.warn(`  [SKIP] Department not found: "${def.deptName}". Run seed-admin.js first.`);
      continue;
    }

    // 2. Upsert the laboratory (update metadata, do NOT overwrite testCatalog on re-run)
    const labData = {
      name:         def.lab.name,
      description:  def.lab.description,
      departmentId: dept._id,
      isActive:     true,
    };

    let lab = await Laboratory.findOne({ name: def.lab.name });
    if (!lab) {
      lab = await Laboratory.create({ ...labData, testCatalog: def.lab.testCatalog });
      console.log(`  [CREATED] ${def.lab.name} (${def.lab.testCatalog.length} tests)`);
    } else {
      // Update metadata but leave existing testCatalog intact
      await Laboratory.findByIdAndUpdate(lab._id, labData);
      console.log(`  [EXISTS]  ${def.lab.name} — metadata refreshed, catalog unchanged`);
    }
  }

  console.log('\n[Lab Seed] Complete. Laboratories seeded successfully.\n');
  await mongoose.disconnect();
  process.exit(0);
}

seedLabs().catch((err) => {
  console.error('[Lab Seed] Failed:', err.message);
  process.exit(1);
});
