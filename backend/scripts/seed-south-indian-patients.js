require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');
const Appointment = require('../src/modules/appointments/appointment.model');
const Department = require('../src/modules/administration/department.model');
const Role = require('../src/modules/administration/role.model');
const Staff = require('../src/modules/staff/staff.model');
const { encryptDeterministic, encryptRandom } = require('../src/core/utils/encryption');

const SOUTH_INDIAN_PATIENTS_DATA = [
  {
    firstName: 'Karthik',
    lastName: 'Subramanian',
    dob: new Date('1988-04-12'),
    gender: 'Male',
    bloodGroup: 'O+',
    aadhaar: '984512347890',
    phone: '+919840123456',
    whatsapp: '+919840123456',
    email: 'karthik.subramanian@gmail.com',
    parentsName: 'Subramanian Natarajan',
    allergies: 'Penicillin, Dust Mites',
    operations: 'Appendectomy (2017)',
    address: {
      street: '14, Anna Nagar 2nd Avenue',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600040'
    },
    emergencyContact: {
      name: 'Priya Karthik',
      relation: 'Spouse',
      phone: '+919840198765'
    },
    condition: 'Hypertension',
    reasonForVisit: 'Routine blood pressure checkup and mild morning headaches',
    diagnosis: 'Essential Hypertension - Stage 1',
    prescription: [{ medicineName: 'Telmisartan 40mg', dosage: '1 Tab', frequency: 'OD (Morning)', duration: '30 Days', instructions: 'After breakfast' }]
  },
  {
    firstName: 'Ananya',
    lastName: 'Venkatesh',
    dob: new Date('1994-08-23'),
    gender: 'Female',
    bloodGroup: 'A+',
    aadhaar: '876543219012',
    phone: '+919443219876',
    whatsapp: '+919443219876',
    email: 'ananya.venkatesh@outlook.com',
    parentsName: 'Venkatesh Ramanathan',
    allergies: 'Sulfa drugs',
    operations: 'None',
    address: {
      street: '42, Race Course Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pinCode: '641018'
    },
    emergencyContact: {
      name: 'Venkatesh Ramanathan',
      relation: 'Father',
      phone: '+919443200112'
    },
    condition: 'Bronchial Asthma',
    reasonForVisit: 'Seasonal wheezing and dry cough during morning hours',
    diagnosis: 'Mild Persistent Asthma with Bronchospasm',
    prescription: [{ medicineName: 'Budecort Inhaler 200mcg', dosage: '2 Puffs', frequency: 'BD', duration: '14 Days', instructions: 'Rinse mouth after inhalation' }]
  },
  {
    firstName: 'Suresh',
    lastName: 'Natarajan',
    dob: new Date('1972-11-05'),
    gender: 'Male',
    bloodGroup: 'B+',
    aadhaar: '765432109876',
    phone: '+919884567123',
    whatsapp: '+919884567123',
    email: 'suresh.natarajan72@yahoo.com',
    parentsName: 'Natarajan Chettiar',
    allergies: 'None',
    operations: 'Laparoscopic Cholecystectomy (2020)',
    address: {
      street: '88, West Masi Street',
      city: 'Madurai',
      state: 'Tamil Nadu',
      pinCode: '625001'
    },
    emergencyContact: {
      name: 'Meena Suresh',
      relation: 'Spouse',
      phone: '+919884567999'
    },
    condition: 'Type 2 Diabetes Mellitus',
    reasonForVisit: 'Quarterly HbA1c review and fasting glucose evaluation',
    diagnosis: 'Type 2 Diabetes Mellitus (Moderately Controlled)',
    prescription: [{ medicineName: 'Metformin 500mg SR', dosage: '1 Tab', frequency: 'BD', duration: '30 Days', instructions: 'With meals' }]
  },
  {
    firstName: 'Meenakshi',
    lastName: 'Sundaram',
    dob: new Date('1985-02-18'),
    gender: 'Female',
    bloodGroup: 'AB+',
    aadhaar: '654321098765',
    phone: '+919841234001',
    whatsapp: '+919841234001',
    email: 'meenakshi.sundaram@gmail.com',
    parentsName: 'Sundaram Ganapathy',
    allergies: 'NSAIDs (Ibuprofen)',
    operations: 'C-Section (2016)',
    address: {
      street: '23, 4th Block Jayanagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560011'
    },
    emergencyContact: {
      name: 'Sundaram Ganapathy',
      relation: 'Father',
      phone: '+919841234002'
    },
    condition: 'Hypothyroidism',
    reasonForVisit: 'Fatigue, mild hair thinning, thyroid panel follow-up',
    diagnosis: 'Primary Hypothyroidism - Euthyroid optimization',
    prescription: [{ medicineName: 'Thyronorm 50mcg', dosage: '1 Tab', frequency: 'OD (Fasting)', duration: '60 Days', instructions: 'Empty stomach in morning' }]
  },
  {
    firstName: 'Rajeshwari',
    lastName: 'Ramachandran',
    dob: new Date('1965-09-30'),
    gender: 'Female',
    bloodGroup: 'O-',
    aadhaar: '543210987654',
    phone: '+919790123888',
    whatsapp: '+919790123888',
    email: 'rajeshwari.rc65@gmail.com',
    parentsName: 'Ramachandran Iyer',
    allergies: 'None',
    operations: 'Hysterectomy (2012)',
    address: {
      street: '105, Gokulam 3rd Stage',
      city: 'Mysuru',
      state: 'Karnataka',
      pinCode: '570002'
    },
    emergencyContact: {
      name: 'Ramesh Ramachandran',
      relation: 'Son',
      phone: '+919790123999'
    },
    condition: 'Osteoarthritis',
    reasonForVisit: 'Bilateral knee joint pain aggravated by stair climbing',
    diagnosis: 'Bilateral Knee Osteoarthritis - Grade 2',
    prescription: [{ medicineName: 'Paracetamol 650mg', dosage: '1 Tab', frequency: 'SOS / PRN', duration: '5 Days', instructions: 'For severe pain' }]
  },
  {
    firstName: 'Balasubramaniam',
    lastName: 'Krishnamurthy',
    dob: new Date('1958-12-14'),
    gender: 'Male',
    bloodGroup: 'B+',
    aadhaar: '432109876543',
    phone: '+919842109876',
    whatsapp: '+919842109876',
    email: 'bala.krishnamurthy@gmail.com',
    parentsName: 'Krishnamurthy Sastry',
    allergies: 'Aspirin',
    operations: 'Coronary Angioplasty with Stent (2019)',
    address: {
      street: '7, MG Road, Palasia Enclave',
      city: 'Kochi',
      state: 'Kerala',
      pinCode: '682016'
    },
    emergencyContact: {
      name: 'Saraswathi Balasubramaniam',
      relation: 'Spouse',
      phone: '+919842109999'
    },
    condition: 'Coronary Artery Disease',
    reasonForVisit: 'Post-CABG annual cardiology evaluation and lipid profile review',
    diagnosis: 'Stable Ischemic Heart Disease (Post-PCI)',
    prescription: [{ medicineName: 'Atorvastatin 20mg', dosage: '1 Tab', frequency: 'OD (Night)', duration: '30 Days', instructions: 'After dinner' }]
  },
  {
    firstName: 'Deepa',
    lastName: 'Padmanabhan',
    dob: new Date('1991-07-08'),
    gender: 'Female',
    bloodGroup: 'A-',
    aadhaar: '321098765432',
    phone: '+919940123789',
    whatsapp: '+919940123789',
    email: 'deepa.padmanabhan@gmail.com',
    parentsName: 'Padmanabhan Nair',
    allergies: 'Peanuts',
    operations: 'None',
    address: {
      street: '18, Kowdiar Gardens',
      city: 'Thiruvananthapuram',
      state: 'Kerala',
      pinCode: '695003'
    },
    emergencyContact: {
      name: 'Padmanabhan Nair',
      relation: 'Father',
      phone: '+919940123000'
    },
    condition: 'Migraine with Aura',
    reasonForVisit: 'Throbbing hemicranial headache associated with photophobia',
    diagnosis: 'Acute Classic Migraine Episode',
    prescription: [{ medicineName: 'Naproxen 500mg', dosage: '1 Tab', frequency: 'SOS', duration: '3 Days', instructions: 'At onset of aura' }]
  },
  {
    firstName: 'Harish',
    lastName: 'Vijayaraghavan',
    dob: new Date('1983-03-25'),
    gender: 'Male',
    bloodGroup: 'O+',
    aadhaar: '210987654321',
    phone: '+919840987654',
    whatsapp: '+919840987654',
    email: 'harish.vr83@gmail.com',
    parentsName: 'Vijayaraghavan Varadachari',
    allergies: 'None',
    operations: 'Knee Arthroscopy (2018)',
    address: {
      street: '55, Road No 36, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500033'
    },
    emergencyContact: {
      name: 'Swathi Harish',
      relation: 'Spouse',
      phone: '+919840987111'
    },
    condition: 'Gastroesophageal Reflux Disease',
    reasonForVisit: 'Epigastric burning sensation, post-prandial acid regurgitation',
    diagnosis: 'GERD with Mild Dyspepsia',
    prescription: [{ medicineName: 'Pantoprazole 40mg', dosage: '1 Tab', frequency: 'OD', duration: '14 Days', instructions: '30 mins before breakfast' }]
  },
  {
    firstName: 'Shalini',
    lastName: 'Rajagopalan',
    dob: new Date('1997-10-19'),
    gender: 'Female',
    bloodGroup: 'B-',
    aadhaar: '109876543210',
    phone: '+919884012345',
    whatsapp: '+919884012345',
    email: 'shalini.raja97@gmail.com',
    parentsName: 'Rajagopalan Srinivasan',
    allergies: 'Ciprofloxacin',
    operations: 'None',
    address: {
      street: '12, Thillai Nagar 11th Cross',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pinCode: '620018'
    },
    emergencyContact: {
      name: 'Rajagopalan Srinivasan',
      relation: 'Father',
      phone: '+919884012999'
    },
    condition: 'Allergic Rhinitis',
    reasonForVisit: 'Continuous morning sneezing, nasal congestion, and watery eyes',
    diagnosis: 'Perennial Allergic Rhinitis',
    prescription: [{ medicineName: 'Levocetirizine 5mg', dosage: '1 Tab', frequency: 'OD (Night)', duration: '10 Days', instructions: 'Before sleep' }]
  },
  {
    firstName: 'Murugan',
    lastName: 'Thirunavukkarasu',
    dob: new Date('1976-06-11'),
    gender: 'Male',
    bloodGroup: 'AB-',
    aadhaar: '908765432109',
    phone: '+919443109876',
    whatsapp: '+919443109876',
    email: 'murugan.thiru76@gmail.com',
    parentsName: 'Thirunavukkarasu Pillai',
    allergies: 'None',
    operations: 'Inguinal Hernia Repair (2015)',
    address: {
      street: '34, Fairlands Main Road',
      city: 'Salem',
      state: 'Tamil Nadu',
      pinCode: '636016'
    },
    emergencyContact: {
      name: 'Kavitha Murugan',
      relation: 'Spouse',
      phone: '+919443109111'
    },
    condition: 'Dyslipidemia',
    reasonForVisit: 'Executive annual health checkup follow-up',
    diagnosis: 'Hypercholesterolemia with Elevated LDL',
    prescription: [{ medicineName: 'Rosuvastatin 10mg', dosage: '1 Tab', frequency: 'OD (Night)', duration: '30 Days', instructions: 'Post dinner' }]
  },
  {
    firstName: 'Divya',
    lastName: 'Soundararajan',
    dob: new Date('1993-01-15'),
    gender: 'Female',
    bloodGroup: 'A+',
    aadhaar: '897654321098',
    phone: '+919840223344',
    whatsapp: '+919840223344',
    email: 'divya.soundar@gmail.com',
    parentsName: 'Soundararajan Krishnan',
    allergies: 'None',
    operations: 'None',
    address: {
      street: '28, Besant Nagar 4th Main Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600090'
    },
    emergencyContact: {
      name: 'Soundararajan Krishnan',
      relation: 'Father',
      phone: '+919840223000'
    },
    condition: 'Iron Deficiency Anemia',
    reasonForVisit: 'Generalized fatigue, weakness, and pallor',
    diagnosis: 'Microcytic Hypochromic Anemia',
    prescription: [{ medicineName: 'Ferrous Ascorbate + Folic Acid', dosage: '1 Tab', frequency: 'OD', duration: '60 Days', instructions: 'After lunch with citrus juice' }]
  },
  {
    firstName: 'Vigneshwaran',
    lastName: 'Senthilkumar',
    dob: new Date('1989-11-28'),
    gender: 'Male',
    bloodGroup: 'O+',
    aadhaar: '786543210987',
    phone: '+919841556677',
    whatsapp: '+919841556677',
    email: 'vicky.senthil@gmail.com',
    parentsName: 'Senthilkumar Palanisamy',
    allergies: 'Ibuprofen',
    operations: 'None',
    address: {
      street: '72, Saibaba Colony',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pinCode: '641011'
    },
    emergencyContact: {
      name: 'Palanisamy Senthilkumar',
      relation: 'Father',
      phone: '+919841556000'
    },
    condition: 'Lumbar Spondylosis',
    reasonForVisit: 'Lower back stiffness radiating to right gluteal region after desk work',
    diagnosis: 'Mechanical Lower Back Strain / L4-L5 Spondylosis',
    prescription: [{ medicineName: 'Aceclofenac + Paracetamol', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', instructions: 'After food' }]
  },
  {
    firstName: 'Kavitha',
    lastName: 'Manoharan',
    dob: new Date('1982-05-14'),
    gender: 'Female',
    bloodGroup: 'B+',
    aadhaar: '675432109876',
    phone: '+919884778899',
    whatsapp: '+919884778899',
    email: 'kavitha.manohar@gmail.com',
    parentsName: 'Manoharan Chelliah',
    allergies: 'None',
    operations: 'Tonsillectomy (1998)',
    address: {
      street: '19, KK Nagar West',
      city: 'Madurai',
      state: 'Tamil Nadu',
      pinCode: '625020'
    },
    emergencyContact: {
      name: 'Manoharan Chelliah',
      relation: 'Father',
      phone: '+919884778000'
    },
    condition: 'Chronic Gastritis',
    reasonForVisit: 'Recurrent upper abdominal fullness and post-meal discomfort',
    diagnosis: 'H. Pylori Negative Functional Gastritis',
    prescription: [{ medicineName: 'Rabeprazole 20mg + Domperidone 30mg', dosage: '1 Cap', frequency: 'OD', duration: '14 Days', instructions: 'Before breakfast' }]
  },
  {
    firstName: 'Arvind',
    lastName: 'Swaminathan',
    dob: new Date('1990-09-03'),
    gender: 'Male',
    bloodGroup: 'AB+',
    aadhaar: '564321098765',
    phone: '+919840334455',
    whatsapp: '+919840334455',
    email: 'arvind.swami@gmail.com',
    parentsName: 'Swaminathan Venkatraman',
    allergies: 'None',
    operations: 'None',
    address: {
      street: '61, Indiranagar 100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560038'
    },
    emergencyContact: {
      name: 'Nithya Arvind',
      relation: 'Spouse',
      phone: '+919840334000'
    },
    condition: 'Sinusitis',
    reasonForVisit: 'Frontal facial pressure and yellowish post-nasal drip for 1 week',
    diagnosis: 'Acute Maxillary Sinusitis',
    prescription: [{ medicineName: 'Amoxicillin + Clavulanic Acid 625mg', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', instructions: 'After meals' }]
  },
  {
    firstName: 'Gayathri',
    lastName: 'Jayaraman',
    dob: new Date('1978-03-22'),
    gender: 'Female',
    bloodGroup: 'O+',
    aadhaar: '453210987654',
    phone: '+919790667788',
    whatsapp: '+919790667788',
    email: 'gayu.jayaram@gmail.com',
    parentsName: 'Jayaraman Raghavan',
    allergies: 'Dust, Pollen',
    operations: 'C-Section (2006)',
    address: {
      street: '15, Vijayanagar 2nd Stage',
      city: 'Mysuru',
      state: 'Karnataka',
      pinCode: '570017'
    },
    emergencyContact: {
      name: 'Raghavan Jayaraman',
      relation: 'Brother',
      phone: '+919790667000'
    },
    condition: 'Carpal Tunnel Syndrome',
    reasonForVisit: 'Nocturnal tingling and numbness in thumb and index finger',
    diagnosis: 'Mild Right Carpal Tunnel Syndrome',
    prescription: [{ medicineName: 'Pregabalin 75mg + Methylcobalamin 750mcg', dosage: '1 Cap', frequency: 'OD (Night)', duration: '20 Days', instructions: 'At bedtime' }]
  },
  {
    firstName: 'Selvam',
    lastName: 'Muthusamy',
    dob: new Date('1968-12-01'),
    gender: 'Male',
    bloodGroup: 'B+',
    aadhaar: '342109876543',
    phone: '+919842889900',
    whatsapp: '+919842889900',
    email: 'selvam.muthu68@gmail.com',
    parentsName: 'Muthusamy Thevar',
    allergies: 'None',
    operations: 'Cataract Surgery OD (2022)',
    address: {
      street: '9, Marine Drive Apartment Complex',
      city: 'Kochi',
      state: 'Kerala',
      pinCode: '682031'
    },
    emergencyContact: {
      name: 'Lakshmi Selvam',
      relation: 'Spouse',
      phone: '+919842889000'
    },
    condition: 'Chronic Kidney Disease - Stage 2',
    reasonForVisit: 'Serum creatinine and microalbuminuria periodic evaluation',
    diagnosis: 'Hypertensive Nephrosclerosis (Early Stage)',
    prescription: [{ medicineName: 'Amlodipine 5mg', dosage: '1 Tab', frequency: 'OD', duration: '30 Days', instructions: 'Morning' }]
  },
  {
    firstName: 'Preethi',
    lastName: 'Lakshminarayanan',
    dob: new Date('1996-04-18'),
    gender: 'Female',
    bloodGroup: 'A-',
    aadhaar: '231098765432',
    phone: '+919940445566',
    whatsapp: '+919940445566',
    email: 'preethi.ln96@gmail.com',
    parentsName: 'Lakshminarayanan Sundaram',
    allergies: 'None',
    operations: 'None',
    address: {
      street: '44, Sasthamangalam Main Road',
      city: 'Thiruvananthapuram',
      state: 'Kerala',
      pinCode: '695010'
    },
    emergencyContact: {
      name: 'Lakshminarayanan Sundaram',
      relation: 'Father',
      phone: '+919940445000'
    },
    condition: 'Polycystic Ovarian Syndrome',
    reasonForVisit: 'Irregular menstrual cycle and metabolic screening',
    diagnosis: 'PCOS with Insulin Resistance',
    prescription: [{ medicineName: 'Myo-Inositol + D-Chiro Inositol + Folic Acid', dosage: '1 Sachet', frequency: 'OD', duration: '60 Days', instructions: 'Dissolve in glass of water' }]
  },
  {
    firstName: 'Naveen',
    lastName: 'Kumaravel',
    dob: new Date('1986-08-10'),
    gender: 'Male',
    bloodGroup: 'O-',
    aadhaar: '120987654321',
    phone: '+919840667788',
    whatsapp: '+919840667788',
    email: 'naveen.k@gmail.com',
    parentsName: 'Kumaravel Murugesan',
    allergies: 'Penicillin',
    operations: 'Nasal Septoplasty (2019)',
    address: {
      street: '102, Gachibowli Financial District',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500032'
    },
    emergencyContact: {
      name: 'Divya Naveen',
      relation: 'Spouse',
      phone: '+919840667000'
    },
    condition: 'Fatty Liver Disease - Grade 1',
    reasonForVisit: 'Abdominal ultrasound follow-up and liver function assessment',
    diagnosis: 'Non-Alcoholic Fatty Liver Disease (NAFLD - Grade 1)',
    prescription: [{ medicineName: 'Ursodeoxycholic Acid 300mg', dosage: '1 Tab', frequency: 'BD', duration: '30 Days', instructions: 'After meals' }]
  },
  {
    firstName: 'Janaki',
    lastName: 'Narayanaswamy',
    dob: new Date('1954-10-05'),
    gender: 'Female',
    bloodGroup: 'B+',
    aadhaar: '918273645019',
    phone: '+919884223311',
    whatsapp: '+919884223311',
    email: 'janaki.narayan54@gmail.com',
    parentsName: 'Narayanaswamy Iyer',
    allergies: 'None',
    operations: 'Total Knee Replacement Right (2021)',
    address: {
      street: '5, Srirangam North Chithirai Street',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pinCode: '620006'
    },
    emergencyContact: {
      name: 'Venkataraman Narayanaswamy',
      relation: 'Son',
      phone: '+919884223000'
    },
    condition: 'Osteoporosis & Hypertension',
    reasonForVisit: 'Bone mineral density DXA scan review and calcium supplement renewal',
    diagnosis: 'Senile Osteoporosis with Controlled BP',
    prescription: [{ medicineName: 'Calcium Carbonate 500mg + Vit D3', dosage: '1 Tab', frequency: 'OD', duration: '90 Days', instructions: 'Post lunch' }]
  },
  {
    firstName: 'Saravanan',
    lastName: 'Govindasamy',
    dob: new Date('1979-02-20'),
    gender: 'Male',
    bloodGroup: 'AB+',
    aadhaar: '827364501928',
    phone: '+919443998877',
    whatsapp: '+919443998877',
    email: 'saravanan.g79@gmail.com',
    parentsName: 'Govindasamy Gounder',
    allergies: 'None',
    operations: 'None',
    address: {
      street: '89, Shevapet Bazaar Road',
      city: 'Salem',
      state: 'Tamil Nadu',
      pinCode: '636002'
    },
    emergencyContact: {
      name: 'Chitra Saravanan',
      relation: 'Spouse',
      phone: '+919443998000'
    },
    condition: 'Gouty Arthritis',
    reasonForVisit: 'Acute throbbing pain and erythema in 1st metatarsophalangeal joint (Big Toe)',
    diagnosis: 'Acute Gouty Arthritis Flare',
    prescription: [{ medicineName: 'Colchicine 0.5mg', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', instructions: 'With food' }]
  }
];

const seedSouthIndianPatientsAndVisits = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set in secrets/backend.env!');
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas successfully.');

    // 1. Fetch available departments
    const departments = await Department.find({});
    if (!departments.length) {
      throw new Error('No departments found in Atlas. Please ensure seed-admin.js has run.');
    }
    console.log(`Found ${departments.length} departments.`);

    // 2. Fetch available staff (Doctors, Nurses, Receptionists)
    const staffMembers = await Staff.find({}).populate('roleId');
    if (!staffMembers.length) {
      throw new Error('No staff members found in Atlas. Please ensure seed-staff.js has run.');
    }

    const doctors = staffMembers.filter(s => s.roleId?.name?.toLowerCase().includes('doc') || s.roleId?.name === 'Doctor');
    const nurses = staffMembers.filter(s => s.roleId?.name?.toLowerCase().includes('nurse') || s.roleId?.name === 'Nurse');
    const defaultStaff = staffMembers[0];
    const defaultDoctor = doctors.length ? doctors[0] : defaultStaff;
    const defaultNurse = nurses.length ? nurses[0] : defaultStaff;

    console.log(`Staff distribution: ${doctors.length} Doctors, ${nurses.length} Nurses, Total Staff: ${staffMembers.length}`);

    // Department map helper
    const genDept = departments.find(d => d.code === 'GEN' || d.name?.includes('General')) || departments[0];

    const VISIT_STATUSES = [
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
      'WAITING_PHARMACY',
      'WAITING_DOCTOR',
      'IN_PROGRESS',
      'WAITING_TRIAGE'
    ];

    let patientCount = 0;
    let visitCount = 0;
    let appointmentCount = 0;

    for (let i = 0; i < SOUTH_INDIAN_PATIENTS_DATA.length; i++) {
      const data = SOUTH_INDIAN_PATIENTS_DATA[i];
      const mrn = `MRN-2026-${String(1000 + i + 1).padStart(5, '0')}`;

      // Check if patient already exists by MRN or Aadhaar
      let patient = await Patient.findOne({ mrn });
      if (!patient) {
        patient = await Patient.create({
          mrn,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          aadhaar: data.aadhaar,
          phone: encryptDeterministic(data.phone),
          whatsapp: data.whatsapp ? encryptDeterministic(data.whatsapp) : undefined,
          email: data.email ? encryptDeterministic(data.email) : undefined,
          parentsName: data.parentsName,
          allergies: data.allergies ? encryptRandom(data.allergies) : undefined,
          operations: data.operations ? encryptRandom(data.operations) : undefined,
          address: data.address,
          emergencyContact: data.emergencyContact,
          medicalHistory: [
            {
              condition: data.condition,
              diagnosedDate: new Date(Date.now() - (i + 1) * 60 * 24 * 60 * 60 * 1000),
              notes: `Patient diagnosed with ${data.condition}. On active outpatient medical protocol.`,
              status: 'Active',
              addedBy: defaultDoctor._id
            }
          ]
        });
        patientCount++;
        console.log(`[PATIENT ${i + 1}/20] Created: ${data.firstName} ${data.lastName} (${mrn}) from ${data.address.city}, ${data.address.state}`);
      } else {
        console.log(`[PATIENT ${i + 1}/20] Already exists: ${data.firstName} ${data.lastName} (${mrn})`);
      }

      // Assign a specific department for clinical variety
      const assignedDept = departments[i % departments.length] || genDept;
      const assignedDoctor = doctors.length ? doctors[i % doctors.length] : defaultDoctor;
      const assignedNurse = nurses.length ? nurses[i % nurses.length] : defaultNurse;

      // 3. Create Visit for Patient
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const visitNumber = `VST-${datePrefix}-${String(2000 + i + 1).padStart(4, '0')}`;
      const tokenSerial = i + 1;
      const tokenString = `${assignedDept.code || 'GEN'}-${String(tokenSerial).padStart(3, '0')}`;
      const status = VISIT_STATUSES[i % VISIT_STATUSES.length];

      let visit = await Visit.findOne({ visitNumber });
      if (!visit) {
        visit = await Visit.create({
          visitNumber,
          tokenString,
          tokenSerial,
          patientId: patient._id,
          departmentId: assignedDept._id,
          registeredBy: defaultStaff._id,
          visitType: 'OPD',
          reasonForVisit: data.reasonForVisit,
          status,
          receptionPayment: {
            registrationFee: 150,
            consultationFee: 500,
            paymentMethod: i % 2 === 0 ? 'UPI' : 'Cash'
          },
          vitals: {
            height: 155 + (i * 2) % 30,
            weight: 54 + (i * 3) % 40,
            bloodPressure: i % 3 === 0 ? '138/88' : i % 2 === 0 ? '124/82' : '118/78',
            temperature: 98.4 + ((i % 5) * 0.2),
            pulse: 72 + (i % 15),
            oxygenSaturation: 98 + (i % 2),
            chiefComplaint: data.reasonForVisit,
            recordedBy: assignedNurse._id,
            recordedAt: new Date(Date.now() - (i + 1) * 3600 * 1000)
          },
          consultation: {
            doctorId: assignedDoctor._id,
            chiefComplaint: data.reasonForVisit,
            historyOfPresentIllness: `Patient presents with ${data.reasonForVisit}. Reports good compliance with lifestyle modifications.`,
            physicalExamination: 'Systemic examination unremarkable. Vitals stable. No acute distress observed.',
            diagnosis: data.diagnosis,
            treatmentPlan: `Continue prescribed medications. Follow up in 30 days. Maintain low sodium and balanced diet.`,
            notes: 'Patient educated regarding warning signs.',
            status: status === 'COMPLETED' ? 'FINALIZED' : 'DRAFT',
            recordedAt: new Date()
          },
          prescribedMedications: data.prescription,
          createdAt: new Date(Date.now() - (i + 1) * 7200 * 1000)
        });
        visitCount++;
        console.log(`  └─ [VISIT] Created: ${visitNumber} [${tokenString}] Status: ${status} in ${assignedDept.name}`);
      }

      // 4. Create Appointment for Patient
      const aptDate = new Date();
      aptDate.setDate(aptDate.getDate() + (i % 7)); // Next 7 days
      const startHour = 9 + (i % 7);
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const endTime = `${String(startHour).padStart(2, '0')}:30`;
      const appointmentNumber = `APT-${datePrefix}-${String(5000 + i + 1).padStart(4, '0')}`;

      const aptStatus = i < 5 ? 'COMPLETED' : i < 10 ? 'CHECKED_IN' : 'SCHEDULED';

      let appointment = await Appointment.findOne({ appointmentNumber });
      if (!appointment) {
        appointment = await Appointment.create({
          appointmentNumber,
          patientId: patient._id,
          departmentId: assignedDept._id,
          doctorId: assignedDoctor._id,
          appointmentType: i % 3 === 0 ? 'FOLLOW_UP' : 'SCHEDULED',
          appointmentDate: aptDate,
          startTime,
          endTime,
          status: aptStatus,
          reason: data.reasonForVisit,
          notes: `Follow up appointment scheduled with Dr. ${assignedDoctor.fullName || 'Consultant'}.`,
          source: 'RECEPTION',
          visitId: aptStatus === 'CHECKED_IN' || aptStatus === 'COMPLETED' ? visit._id : null,
          createdBy: defaultStaff._id
        });
        appointmentCount++;
        console.log(`  └─ [APPOINTMENT] Created: ${appointmentNumber} Status: ${aptStatus} on ${aptDate.toISOString().slice(0, 10)} at ${startTime}`);
      }
    }

    console.log('\n======================================================');
    console.log('✅ ATLAS SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`   Patients created:     ${patientCount}`);
    console.log(`   Visits created:       ${visitCount}`);
    console.log(`   Appointments created: ${appointmentCount}`);
    console.log('======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedSouthIndianPatientsAndVisits();
