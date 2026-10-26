export const POSITIONS = {
  Doctor: [
    { title: 'Chief Medical Officer', rank: 9 },
    { title: 'Medical Superintendent', rank: 8 },
    { title: 'Head of Department', rank: 7 },
    { title: 'Senior Consultant', rank: 6 },
    { title: 'Consultant', rank: 5 },
    { title: 'Associate Consultant', rank: 4 },
    { title: 'Junior Consultant', rank: 3 },
    { title: 'Resident Doctor', rank: 2 },
    { title: 'Intern', rank: 1 }
  ],
  Surgeon: [
    { title: 'Chief Surgeon', rank: 9 },
    { title: 'Medical Superintendent', rank: 8 },
    { title: 'Head of Surgery Department', rank: 7 },
    { title: 'Senior Consultant Surgeon', rank: 6 },
    { title: 'Consultant Surgeon', rank: 5 },
    { title: 'Associate Consultant Surgeon', rank: 4 },
    { title: 'Junior Consultant Surgeon', rank: 3 },
    { title: 'Surgical Resident', rank: 2 },
    { title: 'Surgical Intern', rank: 1 }
  ],
  'OPD Nurse': [
    { title: 'Head OPD Nurse', rank: 5 },
    { title: 'Senior OPD Staff Nurse', rank: 4 },
    { title: 'OPD Staff Nurse', rank: 3 },
    { title: 'Junior OPD Nurse', rank: 2 },
    { title: 'OPD Nursing Assistant', rank: 1 }
  ],
  'IPD Nurse': [
    { title: 'Chief Nursing Officer', rank: 8 },
    { title: 'Nursing Superintendent', rank: 7 },
    { title: 'Deputy Nursing Superintendent', rank: 6 },
    { title: 'Head Ward Nurse', rank: 5 },
    { title: 'Senior Ward Staff Nurse', rank: 4 },
    { title: 'Ward Staff Nurse', rank: 3 },
    { title: 'Junior Ward Nurse', rank: 2 },
    { title: 'Ward Nursing Assistant', rank: 1 }
  ],
  'Lab Nurse': [
    { title: 'Chief Lab Nursing Officer', rank: 7 },
    { title: 'Head Lab Nurse / Phlebotomy Lead', rank: 5 },
    { title: 'Senior Lab Staff Nurse', rank: 4 },
    { title: 'Lab Staff Nurse', rank: 3 },
    { title: 'Junior Lab Nurse', rank: 2 },
    { title: 'Lab Nursing Assistant', rank: 1 }
  ],
  Nurse: [
    { title: 'Chief Nursing Officer', rank: 8 },
    { title: 'Nursing Superintendent', rank: 7 },
    { title: 'Deputy Nursing Superintendent', rank: 6 },
    { title: 'Head Nurse', rank: 5 },
    { title: 'Senior Staff Nurse', rank: 4 },
    { title: 'Staff Nurse', rank: 3 },
    { title: 'Junior Nurse', rank: 2 },
    { title: 'Nursing Assistant', rank: 1 }
  ],
  Laboratory: [
    { title: 'Laboratory Director', rank: 7 },
    { title: 'Laboratory Manager', rank: 6 },
    { title: 'Laboratory Supervisor', rank: 5 },
    { title: 'Senior Technologist', rank: 4 },
    { title: 'Lab Technologist', rank: 3 },
    { title: 'Lab Technician', rank: 2 },
    { title: 'Lab Assistant', rank: 1 }
  ],
  Pharmacy: [
    { title: 'Chief Pharmacist', rank: 6 },
    { title: 'Pharmacy Manager', rank: 5 },
    { title: 'Senior Pharmacist', rank: 4 },
    { title: 'Pharmacist', rank: 3 },
    { title: 'Pharmacy Technician', rank: 2 },
    { title: 'Pharmacy Assistant', rank: 1 }
  ],
  Reception: [
    { title: 'Front Office Manager', rank: 5 },
    { title: 'Reception Supervisor', rank: 4 },
    { title: 'Senior Receptionist', rank: 3 },
    { title: 'Front Desk Supervisor', rank: 2 },
    { title: 'Receptionist', rank: 2 },
    { title: 'Front Desk Assistant', rank: 1 }
  ],
  Billing: [
    { title: 'Billing Manager / Finance Lead', rank: 5 },
    { title: 'Billing Manager', rank: 5 },
    { title: 'Senior Billing Officer', rank: 4 },
    { title: 'Senior Billing Executive', rank: 4 },
    { title: 'Billing Executive', rank: 3 },
    { title: 'Cashier / Billing Associate', rank: 2 },
    { title: 'Junior Billing Executive', rank: 2 },
    { title: 'Billing Assistant', rank: 1 }
  ],
  'Ward Operations': [
    { title: 'Head of Department', rank: 5 },
    { title: 'Operations Manager', rank: 4 },
    { title: 'Senior Ward Executive', rank: 3 },
    { title: 'Junior Ward Executive', rank: 2 },
    { title: 'Housekeeping', rank: 1 }
  ],
  Administrator: [
    { title: 'Chief Executive Officer', rank: 4 },
    { title: 'Administrative Director', rank: 3 },
    { title: 'Admin Officer', rank: 2 },
    { title: 'Admin Assistant', rank: 1 }
  ]
};

export const TARIFF_GRADES = {
  GRADE_1: 'GRADE_1', // positionRank 1-2 (Intern/Junior)
  GRADE_2: 'GRADE_2', // positionRank 3-4 (Resident/Associate)
  GRADE_3: 'GRADE_3', // positionRank 5-6 (Consultant/Senior Consultant)
  GRADE_4: 'GRADE_4', // positionRank 7-8 (Head of Dept/Superintendent)
  GRADE_5: 'GRADE_5', // positionRank 9 (Chief Medical Officer / Top Leadership)
};

export const getTariffGrade = (positionRank) => {
  if (positionRank <= 2) return TARIFF_GRADES.GRADE_1;
  if (positionRank <= 4) return TARIFF_GRADES.GRADE_2;
  if (positionRank <= 6) return TARIFF_GRADES.GRADE_3;
  if (positionRank <= 8) return TARIFF_GRADES.GRADE_4;
  return TARIFF_GRADES.GRADE_5;
};

export const SALARY_BANDS = {
  [TARIFF_GRADES.GRADE_1]: {
    band: 'Band A',
    label: 'Entry / Support',
    minSalary: 20000,
    maxSalary: 35000,
    description: 'Entry-level support, junior reception, interns, nursing assistants'
  },
  [TARIFF_GRADES.GRADE_2]: {
    band: 'Band B',
    label: 'Operational / Associate',
    minSalary: 35000,
    maxSalary: 60000,
    description: 'Staff nurses, front desk supervisors, lab technicians, residents'
  },
  [TARIFF_GRADES.GRADE_3]: {
    band: 'Band C',
    label: 'Senior / Specialist',
    minSalary: 60000,
    maxSalary: 120000,
    description: 'Senior consultants, head nurses, lab supervisors, managers'
  },
  [TARIFF_GRADES.GRADE_4]: {
    band: 'Band D',
    label: 'Leadership / Department Head',
    minSalary: 120000,
    maxSalary: 250000,
    description: 'Heads of departments, nursing superintendents, senior medical officers'
  },
  [TARIFF_GRADES.GRADE_5]: {
    band: 'Band E',
    label: 'Executive / CMO',
    minSalary: 250000,
    maxSalary: 500000,
    description: 'Chief Medical Officer, Chief Executive Officer, Medical Director'
  }
};
