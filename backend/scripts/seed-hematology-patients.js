/**
 * SEED SCRIPT: Realistic Hematology Laboratory Simulation Dataset
 * 
 * 1. Upgrades Clinical Pathology & Haematology Laboratory test catalog with 10 comprehensive,
 *    simulation-oriented hematology diagnostic tests with structured clinical result fields.
 * 2. Seeds 10 realistic clinical patient profiles with nursing triage vitals, comprehensive doctor
 *    consultations across multiple clinical departments, and active laboratory orders queued at the
 *    Hematology Lab (WAITING_LAB status with STAT, URGENT, and ROUTINE priorities).
 *
 * Usage: node scripts/seed-hematology-patients.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const config = require('../src/core/config');
const Laboratory = require('../src/modules/laboratory/laboratory.model');
const Department = require('../src/modules/administration/department.model');
const Staff = require('../src/modules/staff/staff.model');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');
const { encryptDeterministic, encryptRandom } = require('../src/core/utils/encryption');

// ── 1. Comprehensive Hematology Test Catalog ─────────────────────────────────────
const HEMATOLOGY_TEST_CATALOG = [
  {
    name: 'Complete Blood Count (CBC) with Differential',
    testCode: 'CBC-DIFF',
    sampleType: 'EDTA Whole Blood (Lavender Top 3 mL)',
    resultFields: [
      { key: 'haemoglobin', label: 'Hemoglobin', type: 'Number', unit: 'g/dL', reference: '13.5–17.5 (M) / 12.0–15.5 (F)', required: true },
      { key: 'rbc', label: 'RBC Count', type: 'Number', unit: 'million/µL', reference: '4.5–5.9 (M) / 4.0–5.2 (F)', required: true },
      { key: 'pcv', label: 'Packed Cell Volume (PCV/Hct)', type: 'Number', unit: '%', reference: '40–52% (M) / 36–48% (F)', required: true },
      { key: 'wbc', label: 'Total WBC Count', type: 'Number', unit: 'cells/µL', reference: '4,000–11,000', required: true },
      { key: 'platelets', label: 'Platelet Count', type: 'Number', unit: 'thousands/µL', reference: '150–450', required: true },
      { key: 'mcv', label: 'Mean Corpuscular Volume (MCV)', type: 'Number', unit: 'fL', reference: '80–100', required: false },
      { key: 'mch', label: 'Mean Corpuscular Hemoglobin (MCH)', type: 'Number', unit: 'pg', reference: '27–33', required: false },
      { key: 'mchc', label: 'Mean Corpuscular Hb Conc (MCHC)', type: 'Number', unit: 'g/dL', reference: '32–36', required: false },
      { key: 'rdw', label: 'Red Cell Distribution Width (RDW)', type: 'Number', unit: '%', reference: '11.5–14.5', required: false },
      { key: 'neutrophils', label: 'Neutrophils', type: 'Number', unit: '%', reference: '45–70%', required: false },
      { key: 'lymphocytes', label: 'Lymphocytes', type: 'Number', unit: '%', reference: '20–40%', required: false },
      { key: 'monocytes', label: 'Monocytes', type: 'Number', unit: '%', reference: '2–8%', required: false },
      { key: 'eosinophils', label: 'Eosinophils', type: 'Number', unit: '%', reference: '1–4%', required: false },
      { key: 'basophils', label: 'Basophils', type: 'Number', unit: '%', reference: '0–1%', required: false },
    ],
  },
  {
    name: 'Peripheral Blood Smear Examination (PBS)',
    testCode: 'PBS-MORPH',
    sampleType: 'Fingerprick / EDTA Blood Smear (Glass Slide)',
    resultFields: [
      { key: 'rbc_morphology', label: 'RBC Morphology', type: 'Text', unit: '', reference: 'Normocytic Normochromic', required: true },
      { key: 'wbc_morphology', label: 'WBC Morphology & Maturity', type: 'Text', unit: '', reference: 'Normal distribution, no blasts/atypical cells', required: true },
      { key: 'platelet_adequacy', label: 'Platelet Adequacy & Clumping', type: 'Text', unit: '', reference: 'Adequate on smear (150–450k eq.)', required: true },
      { key: 'hemoparasites', label: 'Hemoparasites (MP / Microfilaria)', type: 'Text', unit: '', reference: 'Not Seen', required: true },
      { key: 'smear_impression', label: 'Smear Impression & Summary', type: 'Text', unit: '', reference: 'Clinical interpretation', required: true },
    ],
  },
  {
    name: 'Coagulation Profile (PT / INR / aPTT)',
    testCode: 'COAG-PANEL',
    sampleType: 'Sodium Citrate Plasma (Light Blue Top 2.7 mL)',
    resultFields: [
      { key: 'pt_test', label: 'Prothrombin Time (PT)', type: 'Number', unit: 'sec', reference: '11.0–13.5', required: true },
      { key: 'pt_control', label: 'Control PT', type: 'Number', unit: 'sec', reference: '11.5', required: true },
      { key: 'inr', label: 'INR (International Normalized Ratio)', type: 'Number', unit: 'ratio', reference: '0.8–1.2 (Therapeutic: 2.0–3.0)', required: true },
      { key: 'aptt', label: 'Activated Partial Thromboplastin Time (aPTT)', type: 'Number', unit: 'sec', reference: '25.0–35.0', required: true },
      { key: 'fibrinogen', label: 'Fibrinogen Level', type: 'Number', unit: 'mg/dL', reference: '200–400', required: false },
    ],
  },
  {
    name: 'Erythrocyte Sedimentation Rate (ESR - Westergren)',
    testCode: 'ESR-WEST',
    sampleType: 'Sodium Citrate Blood (Black Top 2 mL)',
    resultFields: [
      { key: 'esr_1hr', label: 'ESR (1st Hour)', type: 'Number', unit: 'mm/hr', reference: 'M: 0–15 / F: 0–20', required: true },
      { key: 'esr_2hr', label: 'ESR (2nd Hour)', type: 'Number', unit: 'mm/hr', reference: 'Optional', required: false },
    ],
  },
  {
    name: 'D-Dimer Quantitative Assay',
    testCode: 'D-DIMER',
    sampleType: 'Sodium Citrate Plasma (Light Blue Top 2.7 mL)',
    resultFields: [
      { key: 'd_dimer_val', label: 'D-Dimer Concentration', type: 'Number', unit: 'ng/mL FEU', reference: '< 500 ng/mL', required: true },
      { key: 'thrombo_risk', label: 'Clinical Thromboembolic Risk', type: 'Text', unit: '', reference: 'Low / Moderate / High', required: true },
    ],
  },
  {
    name: 'Serum Ferritin & Total Iron Binding Capacity (Iron Profile)',
    testCode: 'IRON-PANEL',
    sampleType: 'Clotted Blood / Serum (Gold Top SST 5 mL)',
    resultFields: [
      { key: 'serum_iron', label: 'Serum Iron', type: 'Number', unit: 'µg/dL', reference: '60–170', required: true },
      { key: 'tibc', label: 'Total Iron Binding Capacity (TIBC)', type: 'Number', unit: 'µg/dL', reference: '240–450', required: true },
      { key: 'transferrin_sat', label: 'Transferrin Saturation', type: 'Number', unit: '%', reference: '20–50%', required: false },
      { key: 'ferritin', label: 'Serum Ferritin', type: 'Number', unit: 'ng/mL', reference: '30–300 (M) / 15–200 (F)', required: true },
    ],
  },
  {
    name: 'Reticulocyte Count & Production Index',
    testCode: 'RETIC-COUNT',
    sampleType: 'EDTA Whole Blood (Lavender Top 2 mL)',
    resultFields: [
      { key: 'retic_pct', label: 'Reticulocyte Percentage', type: 'Number', unit: '%', reference: '0.5–2.5%', required: true },
      { key: 'abs_retic', label: 'Absolute Reticulocyte Count', type: 'Number', unit: 'thousands/µL', reference: '25–100', required: true },
      { key: 'rpi', label: 'Reticulocyte Production Index (RPI)', type: 'Number', unit: 'ratio', reference: '> 2.0 (Adequate Marrow Response)', required: false },
    ],
  },
  {
    name: 'Hemoglobin Variant Analysis (HPLC / Electrophoresis)',
    testCode: 'HB-ELECTRO',
    sampleType: 'EDTA Whole Blood (Lavender Top 4 mL)',
    resultFields: [
      { key: 'hb_a', label: 'Hb A', type: 'Number', unit: '%', reference: '95.0–98.0%', required: true },
      { key: 'hb_a2', label: 'Hb A2', type: 'Number', unit: '%', reference: '1.5–3.5%', required: true },
      { key: 'hb_f', label: 'Hb F (Fetal Hemoglobin)', type: 'Number', unit: '%', reference: '< 1.0%', required: true },
      { key: 'hb_variant', label: 'Abnormal Variant (Hb S / Hb E)', type: 'Number', unit: '%', reference: 'Absent (0%)', required: false },
      { key: 'hplc_report', label: 'HPLC Pattern Interpretation', type: 'Text', unit: '', reference: 'Normal Adult Pattern', required: true },
    ],
  },
  {
    name: 'ABO & Rh Blood Grouping with Crossmatch',
    testCode: 'BLOOD-GROUP',
    sampleType: 'EDTA Whole Blood + Plain Clotted Blood (5 mL)',
    resultFields: [
      { key: 'abo_group', label: 'ABO Blood Group', type: 'Text', unit: '', reference: 'A / B / AB / O', required: true },
      { key: 'rh_factor', label: 'Rh (D) Factor', type: 'Text', unit: '', reference: 'Positive / Negative', required: true },
      { key: 'crossmatch_status', label: 'Donor Compatibility Status', type: 'Text', unit: '', reference: 'Compatible / Incompatible', required: true },
    ],
  },
  {
    name: 'Bone Marrow Aspiration Cytology',
    testCode: 'BM-ASPIRATE',
    sampleType: 'Posterior Iliac Crest Bone Marrow Smear',
    resultFields: [
      { key: 'bm_cellularity', label: 'Bone Marrow Cellularity', type: 'Text', unit: '', reference: 'Normocellular (40–60%)', required: true },
      { key: 'me_ratio', label: 'Myeloid to Erythroid (M:E) Ratio', type: 'Text', unit: '', reference: '2:1 to 4:1', required: true },
      { key: 'erythropoiesis', label: 'Erythropoiesis Assessment', type: 'Text', unit: '', reference: 'Normoblastic maturation', required: true },
      { key: 'granulopoiesis', label: 'Granulopoiesis Assessment', type: 'Text', unit: '', reference: 'Sequential maturation intact', required: true },
      { key: 'megakaryocytes', label: 'Megakaryocyte Density', type: 'Text', unit: '', reference: 'Adequate, normal morphology', required: true },
      { key: 'bm_diagnosis', label: 'Cytopathological Diagnostic Summary', type: 'Text', unit: '', reference: 'Diagnostic impression', required: true },
    ],
  },
];

// ── 2. Realistic Simulation Patient & Visit Data ──────────────────────────────────
const PATIENT_SIMULATION_CASES = [
  {
    patient: {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      dob: new Date('1990-03-12'),
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '+919840123001',
      email: 'rajesh.kumar@healthmail.local',
      allergies: 'Ciprofloxacin, Sulfonamides',
      chronicConditions: ['None'],
    },
    deptCode: 'GEN',
    doctorName: 'Dr. Ramesh Krishnan',
    tokenSerial: 1,
    priority: 'STAT',
    visitType: 'EMERGENCY',
    reasonForVisit: 'High fever, hemorrhagic petechiae on arms, severe myalgia',
    vitals: {
      height: 174,
      weight: 68,
      bloodPressure: '90/60',
      temperature: 102.4,
      pulse: 118,
      oxygenSaturation: 94,
      chiefComplaint: 'Acute high-grade fever with chills, severe petechial rash on both forearms, extreme prostration and epistaxis for 24 hours.',
    },
    consultation: {
      chiefComplaint: 'Acute high fever with hemorrhagic skin manifestations and dizziness.',
      historyOfPresentIllness: 'Patient developed sudden onset high-grade fever 3 days ago with retro-orbital pain. Developed petechiae on limbs and one episode of epistaxis this morning. Blood pressure dropping.',
      physicalExamination: 'Febrile, toxic look. Bilateral lower limb and forearm petechial purpura. Positive tourniquet test. Hepatosplenomegaly palpable 2cm below costal margin.',
      diagnosis: 'Suspected Acute Dengue Hemorrhagic Fever / Severe Thrombocytopenia with Capillary Leak.',
      treatmentPlan: 'STAT IV fluid resuscitation with Ringer Lactate. Emergency Hematology testing for platelet count and coagulopathy. Crossmatch PRBC and Single Donor Platelets.',
      notes: 'URGENT: Monitor hematocrit and platelet drop every 4 hours.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'STAT', status: 'PENDING_SAMPLE' },
      { testName: 'Coagulation Profile (PT / INR / aPTT)', priority: 'STAT', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Priya',
      lastName: 'Sundaram',
      dob: new Date('1996-07-24'),
      gender: 'Female',
      bloodGroup: 'B+',
      phone: '+919840123002',
      email: 'priya.sundaram@healthmail.local',
      allergies: 'Penicillin',
      chronicConditions: ['Gestational Anemia'],
    },
    deptCode: 'OBG',
    doctorName: 'Dr. Revathi Krishnan',
    tokenSerial: 2,
    priority: 'URGENT',
    visitType: 'OPD',
    reasonForVisit: '2nd Trimester pregnancy with extreme fatigue, paleness, and breathlessness',
    vitals: {
      height: 160,
      weight: 54,
      bloodPressure: '106/70',
      temperature: 98.4,
      pulse: 92,
      oxygenSaturation: 99,
      chiefComplaint: '24 weeks gestation, severe fatigue, exertional breathlessness, craving ice (pica), pale conjunctiva, and spoon-shaped brittle nails.',
    },
    consultation: {
      chiefComplaint: 'Severe maternal fatigue and exertional dyspnea in second trimester.',
      historyOfPresentIllness: 'Primigravida at 24 weeks gestation reporting progressive weakness, postural lightheadedness, and palpitations on mild exertion. Poor dietary iron intake.',
      physicalExamination: 'Marked conjunctival and palmar pallor. Koilonychia present. Soft systolic hemic murmur at pulmonary area. Uterine fundus corresponds to 24 weeks.',
      diagnosis: 'Severe Microcytic Hypochromic Anemia in Pregnancy (Rule out Iron Deficiency vs Beta-Thalassemia Trait).',
      treatmentPlan: 'Hematology workup for CBC differential, Iron Profile (Ferritin/TIBC), and Peripheral Blood Smear. Parenteral iron sucrose planned post-results.',
      notes: 'Optimize hemoglobin before 3rd trimester to minimize peripartum risks.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'URGENT', status: 'PROCESSING', sampleCollectedMinutesAgo: 20 },
      { testName: 'Serum Ferritin & Total Iron Binding Capacity (Iron Profile)', priority: 'URGENT', status: 'PENDING_SAMPLE' },
      { testName: 'Peripheral Blood Smear Examination (PBS)', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Mohammed',
      lastName: 'Ibrahim',
      dob: new Date('1962-11-05'),
      gender: 'Male',
      bloodGroup: 'A+',
      phone: '+919840123003',
      email: 'ibrahim.md@healthmail.local',
      allergies: 'Aspirin (Bronchospasm)',
      chronicConditions: ['Atrial Fibrillation', 'Hypertension', 'Type 2 Diabetes'],
    },
    deptCode: 'CAR',
    doctorName: 'Dr. Balaji Swaminathan',
    tokenSerial: 3,
    priority: 'URGENT',
    visitType: 'OPD',
    reasonForVisit: 'Atrial fibrillation on Warfarin therapy, routine INR monitoring with mild thigh hematoma',
    vitals: {
      height: 168,
      weight: 78,
      bloodPressure: '138/86',
      temperature: 98.6,
      pulse: 74,
      oxygenSaturation: 97,
      chiefComplaint: 'Routine therapeutic Warfarin anticoagulation monitoring; noticed spontaneous small ecchymotic patch over left thigh yesterday.',
    },
    consultation: {
      chiefComplaint: 'Follow-up for oral anticoagulation dosage titration.',
      historyOfPresentIllness: 'Known case of non-valvular AF on Warfarin 5mg daily. Recently completed a course of antibiotic (clarithromycin) which might potentiate warfarin effects.',
      physicalExamination: 'Irregularly irregular pulse. Small 3x2 cm resolving subcutaneous ecchymosis over left anterior thigh. No mucosal bleed, hematuria, or melena.',
      diagnosis: 'Therapeutic Anticoagulation Surveillance — Check for Warfarin Over-anticoagulation / Elevated INR.',
      treatmentPlan: 'Order STAT Coagulation Profile (PT/INR). Hold Warfarin dose tonight pending laboratory verification.',
      notes: 'Target therapeutic INR window is 2.0–3.0.',
    },
    orders: [
      { testName: 'Coagulation Profile (PT / INR / aPTT)', priority: 'URGENT', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      dob: new Date('2017-05-18'),
      gender: 'Male',
      bloodGroup: 'AB+',
      phone: '+919840123004',
      email: 'sharma.family@healthmail.local',
      allergies: 'None',
      chronicConditions: ['None'],
    },
    deptCode: 'PED',
    doctorName: 'Dr. Anitha Venkat',
    tokenSerial: 4,
    priority: 'STAT',
    visitType: 'EMERGENCY',
    reasonForVisit: '7yo child with 3-week bone pain, unexplained bruises, fever, and generalized lymphadenopathy',
    vitals: {
      height: 118,
      weight: 21,
      bloodPressure: '98/64',
      temperature: 101.8,
      pulse: 124,
      oxygenSaturation: 96,
      chiefComplaint: 'Persistent limp due to deep bone pain in bilateral tibiae, low grade remittent fever for 3 weeks, lethargy, and multiple bruises on shins.',
    },
    consultation: {
      chiefComplaint: 'Pediatric bone pain, recurrent fevers, and multiple spontaneous ecchymoses.',
      historyOfPresentIllness: 'Child has been increasingly listless with refusal to bear weight. Mother noted pale complexion, cervical lumpiness, and easy bruising over the past month.',
      physicalExamination: 'Severe pallor. Multiple non-tender, discrete cervical and axillary lymph nodes (1.5 cm). Spleen palpable 3 cm below left costal margin, liver 2 cm. Sternal tenderness present.',
      diagnosis: 'High Index of Suspicion for Acute Leukemia (ALL) vs Aplastic Anemia / Severe Bone Marrow Infiltration.',
      treatmentPlan: 'STAT Emergency CBC with 5-part differential, Peripheral Blood Smear for blast search, and Reticulocyte index. Pediatric Hematology referral.',
      notes: 'CRITICAL: Screen smear carefully for atypical lymphoblasts and Auer rods.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'STAT', status: 'PENDING_SAMPLE' },
      { testName: 'Peripheral Blood Smear Examination (PBS)', priority: 'STAT', status: 'PENDING_SAMPLE' },
      { testName: 'Reticulocyte Count & Production Index', priority: 'STAT', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Lakshmi',
      lastName: 'Narayanan',
      dob: new Date('1972-09-08'),
      gender: 'Female',
      bloodGroup: 'O-',
      phone: '+919840123005',
      email: 'lakshmi.n@healthmail.local',
      allergies: 'Iodinated Contrast Media',
      chronicConditions: ['Obesity', 'Varicose Veins'],
    },
    deptCode: 'EME',
    doctorName: 'Dr. Sridhar Ramaswamy',
    tokenSerial: 5,
    priority: 'STAT',
    visitType: 'EMERGENCY',
    reasonForVisit: 'Acute unilateral calf swelling, redness, and sudden pleuritic chest pain after long-haul flight',
    vitals: {
      height: 156,
      weight: 82,
      bloodPressure: '130/84',
      temperature: 99.1,
      pulse: 108,
      oxygenSaturation: 93,
      chiefComplaint: 'Sudden onset acute painful right calf swelling and sudden sharp chest pain on deep inspiration following a 14-hour flight.',
    },
    consultation: {
      chiefComplaint: 'Acute right leg swelling and acute pleuritic chest pain with tachypnea.',
      historyOfPresentIllness: 'Returned from international flight 2 days ago. Developed asymmetric painful swelling in right calf yesterday, and sudden sharp right-sided chest pain today.',
      physicalExamination: 'Right calf circumference 3.5 cm greater than left, warm, tender along deep venous system with positive Homans sign. Tachypneic with mild sinus tachycardia.',
      diagnosis: 'Suspected Acute Deep Vein Thrombosis (DVT) with submassive Pulmonary Thromboembolism (PE). Wells Score = 6 (High Risk).',
      treatmentPlan: 'Immediate Supplemental Oxygen. STAT D-Dimer Quantitative Assay, Coagulation Screen, and Blood Grouping for crossmatch.',
      notes: 'Prepare for therapeutic Low Molecular Weight Heparin (Enoxaparin) protocol.',
    },
    orders: [
      { testName: 'D-Dimer Quantitative Assay', priority: 'STAT', status: 'PROCESSING', sampleCollectedMinutesAgo: 10 },
      { testName: 'Coagulation Profile (PT / INR / aPTT)', priority: 'STAT', status: 'PENDING_SAMPLE' },
      { testName: 'ABO & Rh Blood Grouping with Crossmatch', priority: 'STAT', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Venkatesh',
      lastName: 'Raghavan',
      dob: new Date('1978-01-20'),
      gender: 'Male',
      bloodGroup: 'B-',
      phone: '+919840123006',
      email: 'venkat.raghavan@healthmail.local',
      allergies: 'None',
      chronicConditions: ['Strict Vegetarianism (15 years)'],
    },
    deptCode: 'GAS',
    doctorName: 'Dr. Meera Selvan',
    tokenSerial: 6,
    priority: 'ROUTINE',
    visitType: 'OPD',
    reasonForVisit: 'Progressive numbness/tingling in bilateral feet, loss of balance, and chronic fatigue',
    vitals: {
      height: 172,
      weight: 70,
      bloodPressure: '124/78',
      temperature: 98.6,
      pulse: 72,
      oxygenSaturation: 99,
      chiefComplaint: 'Gradual onset numbness and pins-and-needles sensation in bilateral lower extremities, sore red beefy tongue, and chronic lightheadedness.',
    },
    consultation: {
      chiefComplaint: 'Peripheral neuropathy symptoms and chronic exhaustion.',
      historyOfPresentIllness: 'Patient has been on strict vegan diet for 15 years without supplementation. Over last 6 months noticed burning paresthesia in feet and unsteady gait in darkness.',
      physicalExamination: 'Mild lemon-yellow pallor. Glossitis with smooth, beefy red tongue (Hunter glossitis). Decreased vibration and proprioceptive sense in bilateral toes (Romberg positive).',
      diagnosis: 'Suspected Megaloblastic Anemia secondary to Vitamin B12 Deficiency / Subacute Combined Degeneration risk.',
      treatmentPlan: 'CBC Differential for elevated MCV (>100 fL), Peripheral Smear for macro-ovalocytes and hypersegmented neutrophils, Reticulocyte count.',
      notes: 'Investigate complete hematological indices before commencing cyanocobalamin therapy.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
      { testName: 'Peripheral Blood Smear Examination (PBS)', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
      { testName: 'Reticulocyte Count & Production Index', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Ananya',
      lastName: 'Deshmukh',
      dob: new Date('2005-08-14'),
      gender: 'Female',
      bloodGroup: 'A-',
      phone: '+919840123007',
      email: 'ananya.deshmukh@healthmail.local',
      allergies: 'None',
      chronicConditions: ['Thalassemia Intermedia'],
    },
    deptCode: 'HEM',
    doctorName: 'Dr. Suresh Gopalan',
    tokenSerial: 7,
    priority: 'URGENT',
    visitType: 'OPD',
    reasonForVisit: 'Known Thalassemia Intermedia with increasing icterus, dark urine, and severe exertion intolerance',
    vitals: {
      height: 162,
      weight: 48,
      bloodPressure: '102/66',
      temperature: 99.0,
      pulse: 88,
      oxygenSaturation: 98,
      chiefComplaint: 'Increasing yellowish discoloration of eyes (sclera), dark colored urine, chronic bone ache, and profound tiredness during college classes.',
    },
    consultation: {
      chiefComplaint: 'Hemolytic crisis and anemia surveillance in known hemoglobinopathy.',
      historyOfPresentIllness: 'Diagnosed with Thalassemia Intermedia in childhood, usually maintains baseline Hb around 8.5 g/dL. Following a recent viral infection, symptoms worsened severely.',
      physicalExamination: 'Scleral icterus (+2). Prominent malar bones and frontal bossing (thalassemic facies). Splenomegaly palpable 4 cm below left rib cage. Tachycardia.',
      diagnosis: 'Acute Hemolytic Exacerbation in Thalassemia Intermedia. Evaluate Transfusion Requirement.',
      treatmentPlan: 'Order Urgent CBC differential, Quantitative Hemoglobin HPLC Variant Electrophoresis, and Blood Grouping & Crossmatch for leukodepleted packed RBCs.',
      notes: 'Check baseline Hb F and Hb A2 percentages.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'URGENT', status: 'PROCESSING', sampleCollectedMinutesAgo: 30 },
      { testName: 'Hemoglobin Variant Analysis (HPLC / Electrophoresis)', priority: 'URGENT', status: 'PENDING_SAMPLE' },
      { testName: 'ABO & Rh Blood Grouping with Crossmatch', priority: 'URGENT', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Gopinath',
      lastName: 'Swaminathan',
      dob: new Date('1966-04-30'),
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '+919840123008',
      email: 'gopinath.swamy@healthmail.local',
      allergies: 'Codeine',
      chronicConditions: ['Severe Knee Osteoarthritis', 'Dyslipidemia'],
    },
    deptCode: 'ORT',
    doctorName: 'Dr. Shankar Mahadevan',
    tokenSerial: 8,
    priority: 'ROUTINE',
    visitType: 'OPD',
    reasonForVisit: 'Pre-operative anesthesia fitness workup for elective Total Knee Arthroplasty (TKA)',
    vitals: {
      height: 176,
      weight: 84,
      bloodPressure: '132/82',
      temperature: 98.4,
      pulse: 76,
      oxygenSaturation: 98,
      chiefComplaint: 'Scheduled for elective Left Total Knee Replacement surgery tomorrow morning; attending pre-anesthetic hematology clearance.',
    },
    consultation: {
      chiefComplaint: 'Pre-operative surgical hematology panel.',
      historyOfPresentIllness: 'Grade IV left knee osteoarthritis refractory to conservative therapy. No history of bleeding diathesis, easy bruising, or anticoagulant intake.',
      physicalExamination: 'Systemic examination normal. Restricted left knee range of motion with severe crepitus. No petechiae, ecchymosis, or lymphadenopathy.',
      diagnosis: 'Pre-Operative Hematological Screening for Major Orthopedic Surgery.',
      treatmentPlan: 'Order Baseline CBC, Coagulation Screen (PT/INR/aPTT), and ABO/Rh Grouping with 2-unit PRBC Crossmatch reservation.',
      notes: 'Ensure coagulation profile is strictly within normal limits prior to spinal anesthesia.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
      { testName: 'Coagulation Profile (PT / INR / aPTT)', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
      { testName: 'ABO & Rh Blood Grouping with Crossmatch', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Deepa',
      lastName: 'Venkataraman',
      dob: new Date('1983-12-19'),
      gender: 'Female',
      bloodGroup: 'AB-',
      phone: '+919840123009',
      email: 'deepa.venkat@healthmail.local',
      allergies: 'Sulfa Drugs',
      chronicConditions: ['Systemic Lupus Erythematosus (SLE)'],
    },
    deptCode: 'RHE',
    doctorName: 'Dr. Chitra Viswanathan',
    tokenSerial: 9,
    priority: 'ROUTINE',
    visitType: 'OPD',
    reasonForVisit: 'Lupus flare-up with symmetrical small joint arthritis, butterfly facial rash, and fatigue',
    vitals: {
      height: 158,
      weight: 62,
      bloodPressure: '118/74',
      temperature: 99.8,
      pulse: 82,
      oxygenSaturation: 99,
      chiefComplaint: 'Worsening symmetrical joint pain in wrists and knuckles with morning stiffness lasting over 1 hour, photosensitive facial rash, and exhaustion.',
    },
    consultation: {
      chiefComplaint: 'Systemic Lupus Erythematosus (SLE) disease activity monitoring.',
      historyOfPresentIllness: 'Diagnosed with SLE 4 years ago, currently on Hydroxychloroquine and low-dose Prednisolone. Presents with clinical signs of moderate disease flare.',
      physicalExamination: 'Erythematous butterfly rash across nasal bridge and cheeks. Active synovitis with tenderness and swelling of bilateral 2nd and 3rd MCP joints and wrists. No oral ulcers.',
      diagnosis: 'SLE Acute Flare — Screen for Autoimmune Cytopenias (Hemolytic Anemia / Leukopenia) and Active Inflammation.',
      treatmentPlan: 'Order CBC Differential for cytopenia assessment and Westergren ESR for inflammatory activity tracking.',
      notes: 'Monitor for lupus-induced autoimmune hemolytic anemia or thrombocytopenia.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
      { testName: 'Erythrocyte Sedimentation Rate (ESR - Westergren)', priority: 'ROUTINE', status: 'PENDING_SAMPLE' },
    ],
  },

  {
    patient: {
      firstName: 'Subramanian',
      lastName: 'Pillai',
      dob: new Date('1953-06-11'),
      gender: 'Male',
      bloodGroup: 'B+',
      phone: '+919840123010',
      email: 'subramanian.pillai@healthmail.local',
      allergies: 'None',
      chronicConditions: ['Diffuse Large B-Cell Lymphoma (DLBCL)'],
    },
    deptCode: 'ONC',
    doctorName: 'Dr. Kumaraswamy Naidu',
    tokenSerial: 10,
    priority: 'STAT',
    visitType: 'EMERGENCY',
    reasonForVisit: 'Day 10 post-R-CHOP chemotherapy with sudden high fever, rigors, oral mucositis and prostration',
    vitals: {
      height: 166,
      weight: 58,
      bloodPressure: '100/62',
      temperature: 103.2,
      pulse: 112,
      oxygenSaturation: 95,
      chiefComplaint: 'Day 10 following Cycle 3 R-CHOP chemotherapy; developed sudden shaking chills, spike in temperature to 103.2°F, painful mouth ulcers, and extreme weakness.',
    },
    consultation: {
      chiefComplaint: 'Suspected Febrile Neutropenia post-chemotherapy (Medical Emergency).',
      historyOfPresentIllness: 'DLBCL patient at expected nadir period (Day 10 post-chemo). High fever spike since this afternoon with severe mucositis preventing oral fluid intake.',
      physicalExamination: 'Febrile, flushed, tachycardic. Severe Grade 3 erythematous oral mucositis with ulcerations on buccal mucosa. No focal crepitations on chest auscultation. Soft abdomen.',
      diagnosis: 'High-Risk Post-Chemotherapy Febrile Neutropenia (MASCC Score < 21). Risk of Sepsis.',
      treatmentPlan: 'STAT Emergency CBC with Absolute Neutrophil Count (ANC) calculation, ESR, Blood Cultures. Immediate initiation of IV Cefepime within 60 minutes.',
      notes: 'CRITICAL: Expedite Absolute Neutrophil Count (ANC) immediately to guide G-CSF (Filgrastim) therapy.',
    },
    orders: [
      { testName: 'Complete Blood Count (CBC) with Differential', priority: 'STAT', status: 'PENDING_SAMPLE' },
      { testName: 'Erythrocyte Sedimentation Rate (ESR - Westergren)', priority: 'STAT', status: 'PENDING_SAMPLE' },
    ],
  },
];

// ── 3. Main Seeding Routine ──────────────────────────────────────────────────────
async function seedHematologyPatients() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to DB:', mongoose.connection.name);

    // 1. Find or upgrade Hematology Laboratory
    let lab = await Laboratory.findOne({
      $or: [
        { name: /Haematology/i },
        { name: /Hematology/i },
      ],
    });

    // Also look up Hematology department
    let hemDept = await Department.findOne({
      $or: [
        { code: 'HEM' },
        { name: /Haematology/i },
        { name: /Hematology/i },
      ],
    });

    if (!hemDept) {
      console.log('Creating Hematology Department...');
      hemDept = await Department.create({
        name: 'Haematology & Clinical Pathology',
        code: 'HEM',
        description: 'Comprehensive haematological investigations and diagnostic pathology',
        status: 'Active',
      });
    }

    if (!lab) {
      console.log('Creating Hematology Laboratory...');
      lab = await Laboratory.create({
        name: 'Clinical Pathology & Haematology Laboratory',
        description: 'Automated 5-part hematology, coagulation, hemoglobinopathy, and bone marrow diagnostics',
        departmentId: hemDept._id,
        isActive: true,
        testCatalog: HEMATOLOGY_TEST_CATALOG,
      });
    } else {
      console.log(`Upgrading test catalog for Laboratory "${lab.name}" (${lab._id})...`);
      lab.testCatalog = HEMATOLOGY_TEST_CATALOG;
      lab.isActive = true;
      if (!lab.departmentId) lab.departmentId = hemDept._id;
      await lab.save();
    }
    console.log(`Hematology Laboratory Catalog upgraded with ${lab.testCatalog.length} clinical tests.`);

    // 2. Fetch or prepare default Staff (Registrar, Doctors, Technicians)
    const staffList = await Staff.find({}).lean();
    const defaultStaff = staffList[0] || { _id: new mongoose.Types.ObjectId() };
    const defaultDoctor = staffList.find(s => s.role === 'Doctor' || s.role === 'DOCTOR') || defaultStaff;

    // Cache departments by code for quick lookup
    const allDepts = await Department.find({}).lean();
    const deptByCode = {};
    allDepts.forEach(d => { deptByCode[d.code] = d; });

    // 3. Clear existing simulated hematology test visits (if any) to prevent duplicate bloat
    const existingSimVisits = await Visit.find({ 'vitals.chiefComplaint': { $regex: /petechial|gestation|Warfarin|limb|DVT|strict vegan|Thalassemia|anesthetic|Lupus|R-CHOP/i } });
    if (existingSimVisits.length > 0) {
      console.log(`Cleaning up ${existingSimVisits.length} previously seeded simulation visits...`);
      await Visit.deleteMany({ _id: { $in: existingSimVisits.map(v => v._id) } });
    }

    console.log('\n--- SEEDING 10 REALISTIC PATIENTS & VISITS AT HEMATOLOGY LAB ---');

    const todayDate = new Date();
    const datePrefix = todayDate.toISOString().replace(/[-:T]/g, '').slice(0, 8);

    for (let i = 0; i < PATIENT_SIMULATION_CASES.length; i++) {
      const sim = PATIENT_SIMULATION_CASES[i];
      const pData = sim.patient;

      // 3a. Find or Create Patient
      let patient = await Patient.findOne({
        $or: [
          { firstName: pData.firstName, lastName: pData.lastName },
          { email: encryptDeterministic(pData.email) },
        ],
      });

      const mrnStr = patient?.mrn || `MRN-HEM-${200001 + i}`;

      if (!patient) {
        // Also check if mrnStr is taken
        const mrnTaken = await Patient.findOne({ mrn: mrnStr });
        const finalMrn = mrnTaken ? `MRN-HEM-${Math.floor(100000 + Math.random() * 900000)}` : mrnStr;

        patient = await Patient.create({
          firstName: pData.firstName,
          lastName: pData.lastName,
          dob: pData.dob,
          gender: pData.gender,
          bloodGroup: pData.bloodGroup,
          mrn: finalMrn,
          phone: encryptDeterministic(pData.phone),
          email: encryptDeterministic(pData.email),
          allergies: encryptRandom(pData.allergies),
          chronicConditions: pData.chronicConditions,
        });
        console.log(`Created Patient: ${patient.firstName} ${patient.lastName} (MRN: ${finalMrn})`);
      } else {
        patient.dob = pData.dob;
        patient.bloodGroup = pData.bloodGroup;
        await patient.save();
        console.log(`Found Existing Patient: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`);
      }

      // 3b. Resolve Department & Token
      const dept = deptByCode[sim.deptCode] || deptByCode['GEN'] || hemDept;
      const tokenSerial = sim.tokenSerial || (i + 1);
      const tokenString = `${dept.code || 'LAB'}-${String(tokenSerial).padStart(3, '0')}`;
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const visitNumber = `VST-${datePrefix}-${dept.code}-${1001 + i}-${uniqueSuffix}`;

      // 3c. Map Lab Orders with real Laboratory Test Catalog references
      const labOrders = sim.orders.map((ord) => {
        const testDef = lab.testCatalog.find(t => t.name.toLowerCase().includes(ord.testName.toLowerCase()) || ord.testName.toLowerCase().includes(t.name.toLowerCase()))
          || lab.testCatalog[0];

        let sampleCollectedAt = null;
        if (ord.status === 'PROCESSING' && ord.sampleCollectedMinutesAgo) {
          sampleCollectedAt = new Date(Date.now() - ord.sampleCollectedMinutesAgo * 60 * 1000);
        }

        return {
          laboratoryId: lab._id,
          labDepartmentId: lab.departmentId || hemDept._id,
          testName: testDef.name,
          labName: lab.name,
          sampleType: testDef.sampleType,
          priority: ord.priority || 'ROUTINE',
          status: ord.status || 'PENDING_SAMPLE',
          sampleCollectedAt,
          results: {},
          notes: '',
        };
      });

      // 3d. Create Visit with full triage vitals, consultation, and lab orders
      const visit = await Visit.create({
        visitNumber,
        tokenString,
        tokenSerial,
        patientId: patient._id,
        registeredBy: defaultStaff._id,
        departmentId: dept._id,
        visitType: sim.visitType || 'OPD',
        reasonForVisit: sim.reasonForVisit,
        status: 'WAITING_LAB',
        receptionPayment: {
          registrationFee: 150,
          consultationFee: 500,
          paymentMethod: i % 2 === 0 ? 'UPI' : 'Cash',
        },
        vitals: {
          height: sim.vitals.height,
          weight: sim.vitals.weight,
          bloodPressure: sim.vitals.bloodPressure,
          temperature: sim.vitals.temperature,
          pulse: sim.vitals.pulse,
          oxygenSaturation: sim.vitals.oxygenSaturation,
          chiefComplaint: sim.vitals.chiefComplaint,
          recordedBy: defaultStaff._id,
          recordedAt: new Date(Date.now() - (45 + i * 10) * 60 * 1000),
        },
        consultation: {
          doctorId: defaultDoctor._id,
          chiefComplaint: sim.consultation.chiefComplaint,
          historyOfPresentIllness: sim.consultation.historyOfPresentIllness,
          physicalExamination: sim.consultation.physicalExamination,
          diagnosis: sim.consultation.diagnosis,
          treatmentPlan: sim.consultation.treatmentPlan,
          notes: sim.consultation.notes,
          status: 'FINALIZED',
          recordedAt: new Date(Date.now() - (30 + i * 5) * 60 * 1000),
        },
        labOrders,
        createdAt: new Date(Date.now() - (60 + i * 15) * 60 * 1000),
      });

      console.log(`Seeded Visit [${i + 1}/10]: ${visit.visitNumber} | Token: ${tokenString} | Patient: ${patient.firstName} ${patient.lastName} | Priority: ${sim.priority} | Lab Orders: ${labOrders.length}`);
    }

    console.log('\nSUCCESS: 10 realistic simulation patients successfully seeded in MongoDB Atlas waiting at Hematology Lab.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seedHematologyPatients();
