// Run this in the browser console after logging in as admin

const API_BASE = 'http://localhost:5000/api/v1';

async function fetchAPI(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok) {
    console.error(`Error ${method} ${endpoint}:`, data);
    throw new Error(data.message || 'API Error');
  }
  return data;
}

const depts = [
  { name: 'General Medicine', code: 'GEN2', description: 'General Medicine', type: 'CLINICAL' },
  { name: 'Cardiology', code: 'CARD2', description: 'Cardiology', type: 'CLINICAL' },
  { name: 'Neurology', code: 'NEURO2', description: 'Neurology', type: 'CLINICAL' },
  { name: 'Orthopedics', code: 'ORTH2', description: 'Orthopedics', type: 'CLINICAL' },
  { name: 'Pediatrics', code: 'PED', description: 'Pediatrics', type: 'CLINICAL' },
  { name: 'Gynecology', code: 'GYN', description: 'Gynecology', type: 'CLINICAL' },
  { name: 'Dermatology', code: 'DERM', description: 'Dermatology', type: 'CLINICAL' },
  { name: 'Psychiatry', code: 'PSY', description: 'Psychiatry', type: 'CLINICAL' },
  
  { name: 'Haematology Lab', code: 'HAEM2', description: 'Haematology Lab', type: 'DIAGNOSTIC' },
  { name: 'Biochemistry Lab', code: 'BCHEM2', description: 'Biochemistry Lab', type: 'DIAGNOSTIC' },
  { name: 'Microbiology Lab', code: 'MICRO2', description: 'Microbiology Lab', type: 'DIAGNOSTIC' },
  { name: 'Radiology Lab', code: 'RAD2', description: 'Radiology Lab', type: 'DIAGNOSTIC' },
  { name: 'Histopathology Lab', code: 'HISTO2', description: 'Histopathology Lab', type: 'DIAGNOSTIC' }
];

const staffs = [
  // General Medicine
  { fullName: 'Dr. Venkatesh Prasad', email: 'venkatesh@hospital.local', username: 'venkatesh', role: 'Doctor', deptName: 'General Medicine' },
  { fullName: 'Dr. Karthik Subbaraj', email: 'karthik@hospital.local', username: 'karthik', role: 'Doctor', deptName: 'General Medicine' },
  { fullName: 'Dr. Meenakshi Sundaram', email: 'meenakshi@hospital.local', username: 'meenakshi', role: 'Doctor', deptName: 'General Medicine' },
  // Cardiology
  { fullName: 'Dr. Anbumani Ramadoss', email: 'anbumani@hospital.local', username: 'anbumani', role: 'Doctor', deptName: 'Cardiology' },
  { fullName: 'Dr. Sivakumar Natarajan', email: 'sivakumar@hospital.local', username: 'sivakumar', role: 'Doctor', deptName: 'Cardiology' },
  { fullName: 'Dr. Priya Balasubramanian', email: 'priya@hospital.local', username: 'priya', role: 'Doctor', deptName: 'Cardiology' },
  // Neurology
  { fullName: 'Dr. Rajeshwaran Iyer', email: 'rajeshwaran@hospital.local', username: 'rajeshwaran', role: 'Doctor', deptName: 'Neurology' },
  { fullName: 'Dr. Srinivas Rao', email: 'srinivas@hospital.local', username: 'srinivas', role: 'Doctor', deptName: 'Neurology' },
  { fullName: 'Dr. Anandhi Rangarajan', email: 'anandhi@hospital.local', username: 'anandhi', role: 'Doctor', deptName: 'Neurology' },
  // Orthopedics
  { fullName: 'Dr. Vikram Prabhu', email: 'vikram@hospital.local', username: 'vikram', role: 'Doctor', deptName: 'Orthopedics' },
  { fullName: 'Dr. Muthukumar Swamy', email: 'muthukumar@hospital.local', username: 'muthukumar', role: 'Doctor', deptName: 'Orthopedics' },
  { fullName: 'Dr. Nandini Reddy', email: 'nandini@hospital.local', username: 'nandini', role: 'Doctor', deptName: 'Orthopedics' },
  // Pediatrics
  { fullName: 'Dr. Sanjay Kapoor', email: 'sanjay@hospital.local', username: 'sanjay', role: 'Doctor', deptName: 'Pediatrics' },
  { fullName: 'Dr. Sunita Menon', email: 'sunita@hospital.local', username: 'sunita', role: 'Doctor', deptName: 'Pediatrics' },
  { fullName: 'Dr. Rajiv Dixit', email: 'rajiv@hospital.local', username: 'rajiv', role: 'Doctor', deptName: 'Pediatrics' },
  // Gynecology
  { fullName: 'Dr. Kavita Sharma', email: 'kavita@hospital.local', username: 'kavita', role: 'Doctor', deptName: 'Gynecology' },
  { fullName: 'Dr. Lakshmi Narayan', email: 'lakshmi@hospital.local', username: 'lakshmi', role: 'Doctor', deptName: 'Gynecology' },
  { fullName: 'Dr. Radhika Apte', email: 'radhika@hospital.local', username: 'radhika', role: 'Doctor', deptName: 'Gynecology' },
  // Dermatology
  { fullName: 'Dr. Ramesh Bhat', email: 'ramesh@hospital.local', username: 'ramesh', role: 'Doctor', deptName: 'Dermatology' },
  { fullName: 'Dr. Neha Dhupia', email: 'neha@hospital.local', username: 'neha', role: 'Doctor', deptName: 'Dermatology' },
  { fullName: 'Dr. Vikram Singh', email: 'vikram2@hospital.local', username: 'vikram2', role: 'Doctor', deptName: 'Dermatology' },
  // Psychiatry
  { fullName: 'Dr. Amit Desai', email: 'amit@hospital.local', username: 'amit', role: 'Doctor', deptName: 'Psychiatry' },
  { fullName: 'Dr. Sushma Swaraj', email: 'sushma@hospital.local', username: 'sushma', role: 'Doctor', deptName: 'Psychiatry' },
  { fullName: 'Dr. Rohan Joshi', email: 'rohan@hospital.local', username: 'rohan', role: 'Doctor', deptName: 'Psychiatry' },

  // Haematology Lab
  { fullName: 'Gopinath Chandran', email: 'gopinath@hospital.local', username: 'gopinath', role: 'Laboratory', deptName: 'Haematology Lab' },
  { fullName: 'Aishwarya Rajesh', email: 'aishwarya@hospital.local', username: 'aishwarya', role: 'Laboratory', deptName: 'Haematology Lab' },
  // Biochemistry Lab
  { fullName: 'Surya Prakash', email: 'surya@hospital.local', username: 'surya', role: 'Laboratory', deptName: 'Biochemistry Lab' },
  { fullName: 'Divya Bharathi', email: 'divya@hospital.local', username: 'divya', role: 'Laboratory', deptName: 'Biochemistry Lab' },
  // Microbiology Lab
  { fullName: 'Saravanan Murugan', email: 'saravanan@hospital.local', username: 'saravanan', role: 'Laboratory', deptName: 'Microbiology Lab' },
  { fullName: 'Nithya Menen', email: 'nithya@hospital.local', username: 'nithya', role: 'Laboratory', deptName: 'Microbiology Lab' },
  // Radiology Lab
  { fullName: 'Vijay Kumar', email: 'vijay@hospital.local', username: 'vijay', role: 'Laboratory', deptName: 'Radiology Lab' },
  { fullName: 'Trisha Krishnan', email: 'trisha@hospital.local', username: 'trisha', role: 'Laboratory', deptName: 'Radiology Lab' },
  // Histopathology Lab
  { fullName: 'Ajith Kumar', email: 'ajith@hospital.local', username: 'ajith', role: 'Laboratory', deptName: 'Histopathology Lab' },
  { fullName: 'Nayanthara Kurian', email: 'nayanthara@hospital.local', username: 'nayanthara', role: 'Laboratory', deptName: 'Histopathology Lab' }
];

async function seed() {
  console.log('Starting client-side seeding...');
  
  // Get all roles
  const rolesData = await fetchAPI('/administration/roles');
  const roles = rolesData.data.roles;
  console.log('Fetched roles:', roles.length);

  // Create departments
  const deptMap = {};
  for (const dept of depts) {
    try {
      const res = await fetchAPI('/administration/departments', 'POST', dept);
      deptMap[dept.name] = res.data.department._id;
      console.log('Created dept:', dept.name);
    } catch(err) {
      console.error('Failed to create dept:', dept.name, err);
    }
  }

  // Refetch departments to map names to IDs
  const allDeptsRes = await fetchAPI('/administration/departments');
  const allDepts = allDeptsRes.data.departments;
  allDepts.forEach(d => { deptMap[d.name] = d._id; });
  console.log('Fetched departments:', allDepts.length);

  // Create staff
  let empCount = 2; // EMP-00001 is admin
  for (const st of staffs) {
    try {
      const roleId = roles.find(r => r.name === st.role)?._id;
      const departmentId = deptMap[st.deptName];
      if (!roleId || !departmentId) {
        console.error('Missing role or dept for:', st.fullName);
        continue;
      }
      
      const payload = {
        employeeId: 'EMP-' + String(empCount++).padStart(5, '0'),
        fullName: st.fullName,
        email: st.email,
        phone: '9876543210',
        departmentId: departmentId,
        roleId: roleId,
        username: st.username,
        password: 'Password123!'
      };

      await fetchAPI('/staff', 'POST', payload);
      console.log('Created staff:', st.fullName);
    } catch(err) {
      console.error('Failed to create staff:', st.fullName, err);
    }
  }
  
  console.log('Seeding complete! Please refresh the page.');
}

seed();
