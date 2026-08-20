import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';
import api from '../../services/api';
import { staffAPI } from '../../services/staffAPI';
import { useToast } from '../../context/ToastContext';
import { POSITIONS } from '../../core/constants';
import Md3FileUploader from '../../components/md3/Md3FileUploader';
import { CURRENCY_SYMBOL } from '../../constants/currency';

// ── Step config ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal & Contact', icon: 'person' },
  { id: 2, label: 'Employment',         icon: 'work' },
  { id: 3, label: 'Professional',       icon: 'medical_information' },
  { id: 4, label: 'Account Setup',      icon: 'manage_accounts' },
];

// ── Initial form state ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  // Core (always required)
  fullName: '', departmentId: '', roleId: '', position: '',
  // Step 1 – Personal
  firstName: '', middleName: '', lastName: '',
  gender: '', dateOfBirth: '', bloodGroup: '', maritalStatus: '', nationality: '',
  // Step 1 – Contact
  phone: '', alternatePhone: '', email: '',
  addressLine1: '', addressLine2: '', area: '', city: '', state: '', country: '', postalCode: '',
  emergencyContactName: '', emergencyContactNumber: '',
  // Step 2 – Employment
  employmentType: '', joiningDate: '', shift: '', reportingTo: '',
  // Step 3 – Professional (shared)
  yearsOfExperience: '',
  // Doctor
  medicalLicenseNumber: '', medicalCouncil: '',
  licenseRegistrationDate: '', licenseExpiryDate: '',
  primaryQualification: '', highestQualification: '',
  primarySpecialization: '', superSpecialization: '',
  consultationType: '', consultingFee: '', followUpFee: '',
  previousHospital: '',
  // Nurse
  nursingLicenseNumber: '', nursingSpecialization: '',
  // Lab
  labCertificationCode: '', labQualification: '',
  // Pharmacy
  pharmacyLicenseNumber: '', pharmacyQualification: '',
  // Verification Document
  verificationDocument: null,
  // Step 4 – Account
  username: '', password: '', accountStatus: 'Active',
};

// ── Option lists ────────────────────────────────────────────────────────────
const genderOpts       = [{ value:'', label:'-- Select --' }, { value:'Male', label:'Male' }, { value:'Female', label:'Female' }, { value:'Other', label:'Other' }];
const bloodGroupOpts   = [{ value:'', label:'-- Select --' }, ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>({ value:v, label:v }))];
const maritalOpts      = [{ value:'', label:'-- Select --' }, ...['Single','Married','Divorced','Widowed'].map(v=>({ value:v, label:v }))];
const employTypeOpts   = [{ value:'', label:'-- Select --' }, ...['Full-time','Part-time','Contract','Consultant'].map(v=>({ value:v, label:v }))];
const shiftOpts        = [{ value:'', label:'-- None / N/A --' }, ...['Morning','Evening','Night','Rotational'].map(v=>({ value:v, label:v }))];
const consultTypeOpts  = [{ value:'', label:'-- Select --' }, ...['In-Person','Online','Both'].map(v=>({ value:v, label:v }))];
const statusOpts       = [{ value:'Active', label:'Active' }, { value:'Inactive', label:'Inactive' }];

// ── Specializations per role ────────────────────────────────────────────────
const DOCTOR_QUALIFICATIONS    = ['MBBS','MD','MS','DNB','DM','MCh','BDS','MDS'];
const DOCTOR_SPECIALIZATIONS   = ['General Medicine','Cardiology','Neurology','Orthopedics','Pediatrics','Obstetrics & Gynecology','Ophthalmology','ENT','Dermatology','Psychiatry','Radiology','Anesthesiology','Surgery','Emergency Medicine'];
const NURSE_SPECIALIZATIONS    = ['General Nursing','ICU','OT / Surgical','Maternity / Labour Room','Neonatal ICU','Pediatrics','Oncology','Cardiology','Psychiatric Nursing'];
const LAB_QUALIFICATIONS       = ['DMLT','BMLT','BSc MLT','MSc MLT','PhD Pathology'];
const PHARMACY_QUALIFICATIONS  = ['D.Pharm','B.Pharm','M.Pharm','Pharm.D'];

const toOpts = (arr) => [{ value:'', label:'-- Select --' }, ...arr.map(v=>({ value:v, label:v }))];

// ── Helper: form section header ─────────────────────────────────────────────
const SectionHeader = ({ icon, title }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'20px 0 12px', paddingBottom:'8px', borderBottom:'1px solid var(--md-sys-color-outline-variant)' }}>
    <span className="material-symbols-rounded" style={{ fontSize:'18px', color:'var(--md-sys-color-primary)' }}>{icon}</span>
    <span style={{ fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--md-sys-color-on-surface-variant)' }}>{title}</span>
  </div>
);

// ── 2-column grid row ───────────────────────────────────────────────────────
const FieldRow = ({ children }) => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>{children}</div>
);

// ── Main component ──────────────────────────────────────────────────────────
const CreateStaffSheet = ({ isOpen, onClose, onSuccess, departments = [], roles = [], staff }) => {
  const { showError } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdStaffId, setCreatedStaffId] = useState(null);
  const [activeStaffList, setActiveStaffList] = useState([]);

  // Fetch active staff list to resolve supervisors
  useEffect(() => {
    if (isOpen) {
      api.get('/staff?status=Active&limit=100')
        .then(res => {
          setActiveStaffList(res.data?.data?.items || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Populate form on edit or reset on new
  useEffect(() => {
    if (!isOpen) return;
    if (staff) {
      setFormData({
        ...EMPTY_FORM,
        fullName:             staff.fullName || '',
        departmentId:         staff.departmentId?._id || staff.departmentId || '',
        roleId:               staff.roleId?._id       || staff.roleId       || '',
        position:             staff.position           || '',
        firstName:            staff.firstName          || '',
        middleName:           staff.middleName         || '',
        lastName:             staff.lastName           || '',
        gender:               staff.gender             || '',
        dateOfBirth:          staff.dateOfBirth ? staff.dateOfBirth.split('T')[0] : '',
        bloodGroup:           staff.bloodGroup         || '',
        maritalStatus:        staff.maritalStatus      || '',
        nationality:          staff.nationality        || '',
        phone:                staff.phone              || '',
        alternatePhone:       staff.alternatePhone     || '',
        email:                staff.email              || '',
        addressLine1:         staff.addressLine1       || '',
        addressLine2:         staff.addressLine2       || '',
        area:                 staff.area               || '',
        city:                 staff.city               || '',
        state:                staff.state              || '',
        country:              staff.country            || '',
        postalCode:           staff.postalCode         || '',
        emergencyContactName:   staff.emergencyContactName   || '',
        emergencyContactNumber: staff.emergencyContactNumber || '',
        employmentType:       staff.employmentType     || '',
        joiningDate:          staff.joiningDate ? staff.joiningDate.split('T')[0] : '',
        shift:                staff.shift              || '',
        reportingTo:          staff.reportingTo?._id   || staff.reportingTo || '',
        yearsOfExperience:    staff.yearsOfExperience  ?? '',
        medicalLicenseNumber: staff.medicalLicenseNumber || '',
        medicalCouncil:       staff.medicalCouncil     || '',
        licenseRegistrationDate: staff.licenseRegistrationDate ? staff.licenseRegistrationDate.split('T')[0] : '',
        licenseExpiryDate:    staff.licenseExpiryDate   ? staff.licenseExpiryDate.split('T')[0] : '',
        primaryQualification: staff.primaryQualification || '',
        highestQualification: staff.highestQualification || '',
        primarySpecialization: staff.primarySpecialization || '',
        superSpecialization:  staff.superSpecialization  || '',
        consultationType:     staff.consultationType   || '',
        consultingFee:        staff.consultingFee       ?? '',
        followUpFee:          staff.followUpFee         ?? '',
        previousHospital:     staff.previousHospital    || '',
        nursingLicenseNumber: staff.nursingLicenseNumber || '',
        nursingSpecialization: staff.nursingSpecialization || '',
        labCertificationCode: staff.labCertificationCode  || '',
        labQualification:     staff.labQualification    || '',
        pharmacyLicenseNumber: staff.pharmacyLicenseNumber || '',
        pharmacyQualification: staff.pharmacyQualification || '',
        verificationDocument: staff.verificationDocument || null,
        username:             staff.username            || '',
        password:             '',
        accountStatus:        staff.status              || 'Active',
      });
    } else {
      setFormData(EMPTY_FORM);
      setCreatedStaffId(null);
    }
    setCurrentStep(1);
    setError(null);
    setFieldErrors({});
  }, [isOpen, staff]);

  // Auto-load username suggestion when reaching Step 4 in create mode
  useEffect(() => {
    if (currentStep === 4 && !staff && !formData.username) {
      staffAPI.generateUsername()
        .then(res => setFormData(prev => ({ ...prev, username: res.data?.username || '' })))
        .catch(() => {});
    }
  }, [currentStep, staff]);

  const handleChange = useCallback((e) => {
    let { name, value } = e.target;
    
    // Strict input guards to block invalid characters and restrict length
    if (name === 'firstName' || name === 'lastName' || name === 'middleName' || name === 'emergencyContactName') {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    } else if (name === 'phone' || name === 'alternatePhone' || name === 'emergencyContactNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'postalCode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    } else if (name === 'yearsOfExperience' || name === 'consultingFee' || name === 'followUpFee') {
      value = value.replace(/\D/g, '');
    }

    if (name === 'roleId') {
      const roleName = roles.find(r => r._id === value)?.name || '';
      const allowed = roleName ? (POSITIONS[roleName] || []) : [];
      setFormData(prev => ({
        ...prev,
        roleId: value,
        position: allowed.some(p => p.title === prev.position) ? prev.position : '',
        // Clear all professional fields on role change
        medicalLicenseNumber:'', medicalCouncil:'', primaryQualification:'',
        primarySpecialization:'', consultationType:'', consultingFee:'', followUpFee:'',
        nursingLicenseNumber:'', nursingSpecialization:'',
        labCertificationCode:'', labQualification:'',
        pharmacyLicenseNumber:'', pharmacyQualification:'',
      }));
    } else if (name === 'firstName' || name === 'lastName') {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        updated.fullName = [updated.firstName, updated.middleName, updated.lastName].filter(Boolean).join(' ');
        return updated;
      });
    } else if (name === 'middleName') {
      setFormData(prev => {
        const updated = { ...prev, middleName: value };
        updated.fullName = [updated.firstName, updated.middleName, updated.lastName].filter(Boolean).join(' ');
        return updated;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Proactively clear field errors when user edits
    setFieldErrors(prev => ({ ...prev, [name]: null }));
  }, [roles]);

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setCreatedStaffId(null);
    setError(null);
    setFieldErrors({});
    setCurrentStep(1);
    onClose();
  };

  // Derived role name and position rank
  const selectedRoleName = roles.find(r => r._id === formData.roleId)?.name || '';
  const availablePositions = selectedRoleName ? (POSITIONS[selectedRoleName] || []) : [];
  const selectedPositionObj = availablePositions.find(p => p.title === formData.position);
  const positionRank = selectedPositionObj ? selectedPositionObj.rank : null;

  const supervisorOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Supervisor --' },
      ...activeStaffList
        .filter(s => s._id !== staff?._id && s.positionRank >= 5 && (s.roleId?.name === 'Doctor' || s.roleId === 'Doctor'))
        .map(s => ({ value: s._id, label: `${s.fullName} (${s.position})` }))
    ];
  }, [activeStaffList, staff]);

  // Options lists
  const positionOptions = [
    { value: '', label: '-- Select Position --' },
    ...availablePositions.map(p => ({ value: p.title, label: p.title })),
  ];
  const departmentOptions = [{ value:'', label:'-- Select Department --' }, ...departments.map(d=>({ value:d._id, label:d.name }))];
  const roleOptions       = [{ value:'', label:'-- Select Role --'       }, ...roles.map(r=>({ value:r._id, label:r.name }))];

  // ── Step validation ────────────────────────────────────────────────────
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      
      if (!formData.phone.trim()) {
        errors.phone = 'Mobile phone is required';
      } else if (formData.phone.trim().length !== 10) {
        errors.phone = 'Mobile phone must be exactly 10 digits';
      }

      if (formData.alternatePhone.trim() && formData.alternatePhone.trim().length !== 10) {
        errors.alternatePhone = 'Alternate mobile must be exactly 10 digits';
      }

      if (formData.emergencyContactNumber.trim() && formData.emergencyContactNumber.trim().length !== 10) {
        errors.emergencyContactNumber = 'Emergency contact phone must be exactly 10 digits';
      }

      if (!formData.email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }

      if (formData.postalCode.trim() && formData.postalCode.trim().length !== 6) {
        errors.postalCode = 'Postal code must be exactly 6 digits';
      }
    }

    if (step === 2) {
      if (!formData.roleId) errors.roleId = 'Role is required';
      if (!formData.position) errors.position = 'Position is required';
      if (!formData.departmentId) errors.departmentId = 'Department is required';
      if (!formData.employmentType) errors.employmentType = 'Employment type is required';
      if (!formData.joiningDate) errors.joiningDate = 'Joining date is required';
      if (positionRank === 1 && !formData.reportingTo) {
        errors.reportingTo = 'Reporting supervisor is required';
      }
    }

    if (step === 3) {
      if (selectedRoleName === 'Doctor' && positionRank !== 1 && !formData.medicalLicenseNumber.trim()) {
        errors.medicalLicenseNumber = 'Medical registration number is required';
      }
      if (selectedRoleName === 'Nurse' && !formData.nursingLicenseNumber.trim()) {
        errors.nursingLicenseNumber = 'Nursing license number is required';
      }
      if (selectedRoleName === 'Laboratory' && !formData.labCertificationCode.trim()) {
        errors.labCertificationCode = 'Laboratory certification code is required';
      }
      if (selectedRoleName === 'Pharmacy' && !formData.pharmacyLicenseNumber.trim()) {
        errors.pharmacyLicenseNumber = 'Pharmacy license number is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isStep4Valid = () => !!formData.username && (!staff ? !!formData.password : true);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStep4Valid()) { setError('Username and password are required.'); return; }
    setError(null);
    setLoading(true);

    // Build clean payload — filter out empty optional fields and sanitize values
    const stripEmpty = (obj) => {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'verificationDocument') {
          if (v && typeof v === 'object' && v.url && v.fileName && v.url.trim() !== '' && v.fileName.trim() !== '') {
            clean[k] = {
              url: v.url.trim(),
              fileName: v.fileName.trim(),
              sizeBytes: Number(v.sizeBytes) || 0,
              uploadedAt: v.uploadedAt
            };
          } else {
            clean[k] = null; // Correctly map empty document state to null
          }
        } else if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed !== '') {
            clean[k] = trimmed;
          }
        } else if (v !== null && v !== undefined) {
          clean[k] = v;
        }
      }
      return clean;
    };

    try {
      if (staff) {
        // Edit mode — update staff record
        const { username, password, accountStatus, ...staffFields } = formData;
        const payload = stripEmpty({
          ...staffFields,
          consultingFee: positionRank === 1 ? 0 : (staffFields.consultingFee ? Number(staffFields.consultingFee) : undefined),
          followUpFee:   positionRank === 1 ? 0 : (staffFields.followUpFee   ? Number(staffFields.followUpFee)   : undefined),
          yearsOfExperience: staffFields.yearsOfExperience ? Number(staffFields.yearsOfExperience) : undefined,
        });
        await api.put(`/staff/${staff._id}`, payload);
        if (username !== staff.username || password) {
          const credPayload = {};
          if (username !== staff.username) credPayload.username = username;
          if (password) credPayload.password = password;
          if (Object.keys(credPayload).length) await api.put(`/staff/${staff._id}`, credPayload);
        }
        if (onSuccess) onSuccess(`${formData.fullName}'s profile updated successfully!`);
      } else {
        // Create mode — two-step: staff record then identity
        let staffId = createdStaffId;
        if (!staffId) {
          const { username, password, accountStatus, ...staffFields } = formData;
          const payload = stripEmpty({
            ...staffFields,
            consultingFee: positionRank === 1 ? 0 : (staffFields.consultingFee ? Number(staffFields.consultingFee) : undefined),
            followUpFee:   positionRank === 1 ? 0 : (staffFields.followUpFee   ? Number(staffFields.followUpFee)   : undefined),
            yearsOfExperience: staffFields.yearsOfExperience ? Number(staffFields.yearsOfExperience) : undefined,
          });
          const staffRes = await api.post('/staff', payload);
          staffId = staffRes.data.data._id;
          setCreatedStaffId(staffId);
        }
        // Create identity (username + temp password → firstLogin: true enforced server-side)
        await api.post('/identity', {
          staffId,
          username: formData.username,
          password: formData.password,
        });
        if (onSuccess) onSuccess(`Account for ${formData.fullName} created. They must change password on first login.`);
      }
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.message || `Error ${staff ? 'updating' : 'creating'} staff account.`;
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
    }} onClick={handleClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(760px, 95vw)',
          height: '100%',
          background: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          overflowY: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                {staff ? 'Edit Staff Profile' : 'Register New Staff Member'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {staff ? 'Update employment and personal details.' : 'Complete all sections to create a staff account.'}
              </p>
            </div>
            <button onClick={handleClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--md-sys-color-on-surface)', padding:'4px', display:'flex' }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '20px' }}>
            {STEPS.map((step, idx) => {
              const isActive    = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: isCompleted ? 'pointer' : 'default' }}
                       onClick={() => isCompleted && setCurrentStep(step.id)}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isActive ? 'var(--md-sys-color-primary)' : isCompleted ? 'var(--md-sys-color-secondary-container)' : 'var(--md-sys-color-surface-container-high)',
                      color: isActive ? 'var(--md-sys-color-on-primary)' : isCompleted ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', transition: 'all 200ms',
                    }}>
                      {isCompleted
                        ? <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>check</span>
                        : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{step.icon}</span>
                      }
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', lineHeight: 1.2 }}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div style={{ flex: 0.3, display: 'flex', alignItems: 'center', paddingBottom: '18px' }}>
                      <div style={{ height: '2px', width: '100%', background: step.id < currentStep ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)', borderRadius: '2px', transition: 'background 300ms' }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
          {error && (
            <div style={{ margin: '16px 0', padding: '12px 16px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* ════ STEP 1 — Personal & Contact ════ */}
          {currentStep === 1 && (
            <>
              <SectionHeader icon="badge" title="Personal Information" />
              <FieldRow>
                <Md3TextField name="firstName"  label="First Name *" value={formData.firstName}  onChange={handleChange} placeholder="e.g. John" error={fieldErrors.firstName} />
                <Md3TextField name="middleName" label="Middle Name"   value={formData.middleName} onChange={handleChange} placeholder="Optional" error={fieldErrors.middleName} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="lastName" label="Last Name *" value={formData.lastName} onChange={handleChange} placeholder="e.g. Doe" error={fieldErrors.lastName} />
                <Md3Select name="gender" label="Gender *" value={formData.gender} onChange={handleChange} options={genderOpts} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
                <Md3Select name="bloodGroup" label="Blood Group" value={formData.bloodGroup} onChange={handleChange} options={bloodGroupOpts} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3Select name="maritalStatus" label="Marital Status" value={formData.maritalStatus} onChange={handleChange} options={maritalOpts} />
                <Md3TextField name="nationality" label="Nationality" value={formData.nationality} onChange={handleChange} placeholder="e.g. Indian" />
              </FieldRow>

              <SectionHeader icon="call" title="Contact Details" />
              <FieldRow>
                <Md3TextField name="phone"          label="Mobile Number *" value={formData.phone}          onChange={handleChange} placeholder="+91 9876543210" error={fieldErrors.phone} />
                <Md3TextField name="alternatePhone" label="Alternate Mobile" value={formData.alternatePhone} onChange={handleChange} placeholder="Optional" error={fieldErrors.alternatePhone} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <Md3TextField name="email" label="Email Address *" type="email" value={formData.email} onChange={handleChange} placeholder="doctor@hospital.com" error={fieldErrors.email} />

              <SectionHeader icon="home" title="Address" />
              <Md3TextField name="addressLine1" label="Address Line 1 *" value={formData.addressLine1} onChange={handleChange} placeholder="House / Flat / Street" />
              <div style={{ height: '12px' }} />
              <Md3TextField name="addressLine2" label="Address Line 2" value={formData.addressLine2} onChange={handleChange} placeholder="Locality / Area" />
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="city"       label="City *"    value={formData.city}    onChange={handleChange} />
                <Md3TextField name="state"      label="State *"   value={formData.state}   onChange={handleChange} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="country"    label="Country"    value={formData.country}    onChange={handleChange} />
                <Md3TextField name="postalCode" label="Postal Code" value={formData.postalCode} onChange={handleChange} error={fieldErrors.postalCode} />
              </FieldRow>

              <SectionHeader icon="emergency" title="Emergency Contact" />
              <FieldRow>
                <Md3TextField name="emergencyContactName"   label="Emergency Contact Name"   value={formData.emergencyContactName}   onChange={handleChange} error={fieldErrors.emergencyContactName} />
                <Md3TextField name="emergencyContactNumber" label="Emergency Contact Number" value={formData.emergencyContactNumber} onChange={handleChange} error={fieldErrors.emergencyContactNumber} />
              </FieldRow>
            </>
          )}

          {/* ════ STEP 2 — Employment ════ */}
          {currentStep === 2 && (
            <>
              <SectionHeader icon="work" title="Role & Department Assignment" />
              <Md3Select name="roleId" label="Role *" value={formData.roleId} onChange={handleChange} options={roleOptions} error={fieldErrors.roleId} />
              <div style={{ height: '12px' }} />
              {formData.roleId && (
                <Md3Select name="position" label="Position / Hierarchy *" value={formData.position} onChange={handleChange} options={positionOptions} error={fieldErrors.position} />
              )}
              <div style={{ height: '12px' }} />
              <Md3Select name="departmentId" label="Department *" value={formData.departmentId} onChange={handleChange} options={departmentOptions} error={fieldErrors.departmentId} />

              <SectionHeader icon="schedule" title="Employment Details" />
              <FieldRow>
                <Md3Select name="employmentType" label="Employment Type *" value={formData.employmentType} onChange={handleChange} options={employTypeOpts} error={fieldErrors.employmentType} />
                <Md3TextField name="joiningDate" label="Joining Date *" type="date" value={formData.joiningDate} onChange={handleChange} error={fieldErrors.joiningDate} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3Select name="shift" label="Shift" value={formData.shift} onChange={handleChange} options={shiftOpts} />
                <Md3Select name="accountStatus" label="Working Status" value={formData.accountStatus} onChange={handleChange} options={statusOpts} />
              </FieldRow>
              {positionRank === 1 && (
                <>
                  <div style={{ height: '12px' }} />
                  <Md3Select 
                    name="reportingTo" 
                    label="Reporting Supervisor (Doctor Rank 5+) *" 
                    value={formData.reportingTo} 
                    onChange={handleChange} 
                    options={supervisorOptions} 
                    error={fieldErrors.reportingTo}
                  />
                </>
              )}
            </>
          )}

          {/* ════ STEP 3 — Professional / Role-Specific ════ */}
          {currentStep === 3 && (
            <>
              <SectionHeader icon="school" title="General Professional Information" />
              <Md3TextField name="yearsOfExperience" label="Years of Experience" type="number" value={formData.yearsOfExperience} onChange={handleChange} placeholder="e.g. 5" />

              {/* Doctor */}
              {selectedRoleName === 'Doctor' && (
                <>
                  <SectionHeader icon="stethoscope" title="Medical Credentials" />
                  <FieldRow>
                    <Md3TextField name="medicalLicenseNumber" label={positionRank === 1 ? "Medical Registration No. (Optional for Intern)" : "Medical Registration No. *"} value={formData.medicalLicenseNumber} onChange={handleChange} placeholder="e.g. MH-12345" error={fieldErrors.medicalLicenseNumber} />
                    <Md3TextField name="medicalCouncil"       label="Medical Council"            value={formData.medicalCouncil}       onChange={handleChange} placeholder="e.g. Maharashtra Medical Council" />
                  </FieldRow>
                  <div style={{ height: '12px' }} />
                  <FieldRow>
                    <Md3TextField name="licenseRegistrationDate" label="Registration Date"   type="date" value={formData.licenseRegistrationDate} onChange={handleChange} />
                    <Md3TextField name="licenseExpiryDate"       label="Expiry Date"         type="date" value={formData.licenseExpiryDate}       onChange={handleChange} />
                  </FieldRow>
                  <SectionHeader icon="psychology" title="Qualifications & Specialization" />
                  <FieldRow>
                    <Md3Select name="primaryQualification"  label="Primary Qualification *" value={formData.primaryQualification}  onChange={handleChange} options={toOpts(DOCTOR_QUALIFICATIONS)} />
                    <Md3Select name="highestQualification"  label="Highest Qualification"   value={formData.highestQualification}  onChange={handleChange} options={toOpts(DOCTOR_QUALIFICATIONS)} />
                  </FieldRow>
                  <div style={{ height: '12px' }} />
                  <FieldRow>
                    <Md3Select name="primarySpecialization" label="Primary Specialization *" value={formData.primarySpecialization} onChange={handleChange} options={toOpts(DOCTOR_SPECIALIZATIONS)} />
                    <Md3Select name="superSpecialization"   label="Super Specialization"     value={formData.superSpecialization}   onChange={handleChange} options={toOpts(DOCTOR_SPECIALIZATIONS)} />
                  </FieldRow>
                  <SectionHeader icon="payments" title="Consultation" />
                  <FieldRow>
                    <Md3Select name="consultationType" label="Consultation Type *" value={formData.consultationType} onChange={handleChange} options={consultTypeOpts} />
                    <Md3TextField name="consultingFee" label={positionRank === 1 ? "Consultation Fee (Locked for Intern)" : `Consultation Fee (${CURRENCY_SYMBOL})`} type="number" value={positionRank === 1 ? '0' : formData.consultingFee} onChange={handleChange} placeholder="e.g. 500" disabled={positionRank === 1} />
                  </FieldRow>
                  <div style={{ height: '12px' }} />
                  <FieldRow>
                    <Md3TextField name="followUpFee"   label={positionRank === 1 ? "Follow-up Fee (Locked for Intern)" : `Follow-up Fee (${CURRENCY_SYMBOL})`}  type="number" value={positionRank === 1 ? '0' : formData.followUpFee}   onChange={handleChange} placeholder="e.g. 200" disabled={positionRank === 1} />
                    <Md3TextField name="previousHospital" label="Previous Hospital" value={formData.previousHospital} onChange={handleChange} placeholder="Optional" />
                  </FieldRow>
                </>
              )}

              {/* Nurse */}
              {selectedRoleName === 'Nurse' && (
                <>
                  <SectionHeader icon="medical_services" title="Nursing Credentials" />
                  <FieldRow>
                    <Md3TextField name="nursingLicenseNumber"  label="Nursing License No. *" value={formData.nursingLicenseNumber}  onChange={handleChange} placeholder="e.g. NMC-12345" error={fieldErrors.nursingLicenseNumber} />
                    <Md3Select    name="nursingSpecialization" label="Nursing Specialization" value={formData.nursingSpecialization} onChange={handleChange} options={toOpts(NURSE_SPECIALIZATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Laboratory */}
              {selectedRoleName === 'Laboratory' && (
                <>
                  <SectionHeader icon="biotech" title="Laboratory Credentials" />
                  <FieldRow>
                    <Md3TextField name="labCertificationCode" label="Lab Certification Code *" value={formData.labCertificationCode} onChange={handleChange} placeholder="e.g. LC-12345" error={fieldErrors.labCertificationCode} />
                    <Md3Select    name="labQualification"     label="Qualification"             value={formData.labQualification}     onChange={handleChange} options={toOpts(LAB_QUALIFICATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Pharmacy */}
              {selectedRoleName === 'Pharmacy' && (
                <>
                  <SectionHeader icon="medication" title="Pharmacy Credentials" />
                  <FieldRow>
                    <Md3TextField name="pharmacyLicenseNumber" label="Pharmacy License No. *" value={formData.pharmacyLicenseNumber} onChange={handleChange} placeholder="e.g. PC-12345" error={fieldErrors.pharmacyLicenseNumber} />
                    <Md3Select    name="pharmacyQualification" label="Qualification"           value={formData.pharmacyQualification} onChange={handleChange} options={toOpts(PHARMACY_QUALIFICATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Reception / Administrator */}
              {(selectedRoleName === 'Reception' || selectedRoleName === 'Administrator') && (
                <div style={{ padding: '16px', background: 'var(--md-sys-color-surface-container)', borderRadius: '12px', marginTop: '8px', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No specialized credentials required for this role. Years of experience above is sufficient.
                </div>
              )}

              {/* Credential Upload for Clinical and Support Staff */}
              {['Doctor', 'Nurse', 'Laboratory', 'Pharmacy'].includes(selectedRoleName) && (
                <>
                  <SectionHeader icon="verified_user" title="Credentials Certificate Proof" />
                  <Md3FileUploader
                    value={formData.verificationDocument}
                    onChange={(val) => setFormData(prev => ({ ...prev, verificationDocument: val }))}
                    disabled={loading}
                  />
                </>
              )}
            </>
          )}

          {/* ════ STEP 4 — Account Setup ════ */}
          {currentStep === 4 && (
            <>
              <SectionHeader icon="manage_accounts" title="Login Credentials" />
              <div style={{ padding: '12px 16px', background: 'var(--md-sys-color-secondary-container)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--md-sys-color-on-secondary-container)', lineHeight: 1.6 }}>
                <strong>Note:</strong> A temporary password will be created. The staff member must change it upon their first login.
              </div>

              <Md3TextField
                name="username"
                label="Username *"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. EMP000245 (auto-generated, editable)"
              />
              <div style={{ height: '12px' }} />

              {!staff && (
                <>
                  <Md3TextField
                    name="password"
                    label="Temporary Password *"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters (staff must change on first login)"
                  />
                  <div style={{ height: '12px' }} />
                </>
              )}

              {staff && (
                <Md3TextField
                  name="password"
                  label="New Password (leave blank to keep current)"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep existing password"
                />
              )}

              <SectionHeader icon="info" title="Registration Summary" />
              <div style={{ background: 'var(--md-sys-color-surface-container)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                {[
                  ['Full Name',       formData.fullName       || '—'],
                  ['Role',            roles.find(r => r._id === formData.roleId)?.name || '—'],
                  ['Position',        formData.position        || '—'],
                  ['Department',      departments.find(d => d._id === formData.departmentId)?.name || '—'],
                  ['Employment Type', formData.employmentType  || '—'],
                  ['Joining Date',    formData.joiningDate     || '—'],
                  ['Email',           formData.email           || '—'],
                  ['Phone',           formData.phone           || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </form>

        {/* ── Navigation Footer ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'var(--md-sys-color-surface-container-lowest)',
        }}>
          <div>
            {currentStep > 1 && (
              <Md3Button variant="text" onClick={() => setCurrentStep(s => s - 1)} type="button">
                ← Back
              </Md3Button>
            )}
            {currentStep === 1 && (
              <Md3Button variant="text" onClick={handleClose} type="button">Cancel</Md3Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Step {currentStep} of {STEPS.length}
            </span>
            {currentStep < STEPS.length ? (
              <Md3Button
                variant="filled"
                type="button"
                onClick={() => {
                  if (validateStep(currentStep)) {
                    setCurrentStep(s => s + 1);
                  } else {
                    showError('Please correct the highlighted fields before proceeding.');
                  }
                }}
              >
                Next →
              </Md3Button>
            ) : (
              <Md3Button
                variant="filled"
                type="submit"
                onClick={handleSubmit}
                loading={loading}
                loadingText="Saving..."
                disabled={loading || !isStep4Valid()}
              >
                {staff ? 'Save Changes' : 'Create Account'}
              </Md3Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStaffSheet;


