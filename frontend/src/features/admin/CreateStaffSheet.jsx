import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Country, State, City } from 'country-state-city';
import { Md3TextField, Md3Select, Md3Button, Md3UnsavedChangesDialog } from '../../components/md3/Md3FormComponents';
import api from '../../services/api';
import { staffAPI } from '../../services/staffAPI';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { POSITIONS, TARIFF_GRADES, getTariffGrade, SALARY_BANDS } from '../../core/constants';
import Md3FileUploader from '../../components/md3/Md3FileUploader';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './CreateStaffSheet.css';

const STAFF_DRAFT_KEY = 'hms_staff_form_draft';


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
  fullName: '', departmentId: '', roleId: '', position: '', positionRank: '', tariffGrade: '', salaryGrade: '', baseSalary: '',
  // Step 1 – Personal
  title: '', firstName: '', middleName: '', lastName: '',
  gender: '', dateOfBirth: '', bloodGroup: '', maritalStatus: '', nationality: 'Indian',
  // Step 1 – Contact
  phone: '', alternatePhone: '', email: '',
  addressLine1: '', addressLine2: '', area: '', city: '', state: '', stateCode: '', country: 'India', countryCode: 'IN', postalCode: '',
  emergencyContactName: '', emergencyContactNumber: '',
  // Step 2 – Employment
  employmentType: 'Full-time', joiningDate: new Date().toISOString().split('T')[0], shift: '', reportingTo: '', assignedWardId: '',
  // Step 3 – Professional (shared)
  yearsOfExperience: '', primaryQualification: '', highestQualification: '', languagesKnown: '',
  // Doctor
  medicalLicenseNumber: '', medicalCouncil: '',
  licenseRegistrationDate: '', licenseExpiryDate: '',
  primarySpecialization: '', superSpecialization: '',
  consultationType: 'In-Person', consultingFee: '', followUpFee: '',
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
const titleOpts        = [{ value:'', label:'-- Select Title --' }, { value:'Dr.', label:'Dr.' }, { value:'Mr.', label:'Mr.' }, { value:'Ms.', label:'Ms.' }, { value:'Mrs.', label:'Mrs.' }, { value:'Smt.', label:'Smt.' }, { value:'Sri.', label:'Sri.' }];
const genderOpts       = [{ value:'', label:'-- Select --' }, { value:'Male', label:'Male' }, { value:'Female', label:'Female' }, { value:'Other', label:'Other' }];
const bloodGroupOpts   = [{ value:'', label:'-- Select --' }, ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>({ value:v, label:v }))];
const maritalOpts      = [{ value:'', label:'-- Select --' }, ...['Single','Married','Divorced','Widowed'].map(v=>({ value:v, label:v }))];
const employTypeOpts   = [{ value:'', label:'-- Select --' }, ...['Full-time','Part-time','Contract','Consultant'].map(v=>({ value:v, label:v }))];
const shiftOpts        = [{ value:'', label:'-- None / N/A --' }, ...['Morning','Evening','Night','Rotational'].map(v=>({ value:v, label:v }))];
const consultTypeOpts  = [{ value:'', label:'-- Select --' }, ...['In-Person','Online','Both'].map(v=>({ value:v, label:v }))];
const statusOpts       = [{ value:'Active', label:'Active' }, { value:'Inactive', label:'Inactive' }];
const tariffGradeOpts  = [
  { value:'', label:'-- Auto-Derive from Position Rank --' },
  { value:'GRADE_1', label:'Grade 1 (Band A: Entry / Support)' },
  { value:'GRADE_2', label:'Grade 2 (Band B: Associate / Operational)' },
  { value:'GRADE_3', label:'Grade 3 (Band C: Senior / Specialist)' },
  { value:'GRADE_4', label:'Grade 4 (Band D: Leadership / HOD)' },
  { value:'GRADE_5', label:'Grade 5 (Band E: Executive / CMO)' }
];

// ── Specializations per role ────────────────────────────────────────────────
const DOCTOR_QUALIFICATIONS    = ['MBBS','MD','MS','DNB','DM','MCh','BDS','MDS'];
const DOCTOR_SPECIALIZATIONS   = ['General Medicine','Cardiology','Neurology','Orthopedics','Pediatrics','Obstetrics & Gynecology','Ophthalmology','ENT','Dermatology','Psychiatry','Radiology','Anesthesiology','Surgery','Emergency Medicine'];
const NURSE_SPECIALIZATIONS    = ['General Nursing','ICU','OT / Surgical','Maternity / Labour Room','Neonatal ICU','Pediatrics','Oncology','Cardiology','Psychiatric Nursing'];
const LAB_QUALIFICATIONS       = ['DMLT','BMLT','BSc MLT','MSc MLT','PhD Pathology'];
const PHARMACY_QUALIFICATIONS  = ['D.Pharm','B.Pharm','M.Pharm','Pharm.D'];

const toOpts = (arr) => [{ value:'', label:'-- Select --' }, ...arr.map(v=>({ value:v, label:v }))];

// ── Helper: form section header ─────────────────────────────────────────────
const SectionHeader = ({ icon, title }) => (
  <div className="md3-staff-section-header">
    <span className="material-symbols-rounded section-icon">{icon}</span>
    <span className="section-title">{title}</span>
  </div>
);

// ── 2-column grid row ───────────────────────────────────────────────────────
const FieldRow = ({ children }) => (
  <div className="md3-staff-field-row">{children}</div>
);

// ── Main component ──────────────────────────────────────────────────────────
const CreateStaffSheet = ({ isOpen, onClose, onSuccess, departments = [], roles = [], staff }) => {
  const { user } = useAuth();
  const isCallerAdmin = user?.role === 'Administrator' || (user?.permissions && user.permissions.includes('MANAGE_USERS'));
  const isCallerHod = Boolean(user?.isHod) && !isCallerAdmin;

  const { showError, showSuccess } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdStaffId, setCreatedStaffId] = useState(null);
  const [activeStaffList, setActiveStaffList] = useState([]);
  const [wardList, setWardList] = useState([]);
  const initialFormDataRef = useRef(null);

  // Sync open state
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Fetch active staff list to resolve supervisors and wards for IPD
  useEffect(() => {
    if (isOpen) {
      api.get('/staff?status=Active&limit=100')
        .then(res => {
          setActiveStaffList(res.data?.data?.items || []);
        })
        .catch(() => {});

      api.get('/ipd/beds/floors')
        .then(res => {
          setWardList(res.data?.data?.floors || res.data?.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Populate form on edit or reset on new
  useEffect(() => {
    if (!isOpen) return;
    if (staff) {
      let isMounted = true;
      const initStaff = (data) => {
        let matchedCountryCode = 'IN';
        if (data.country) {
          const foundC = Country.getAllCountries().find(
            c => c.name.toLowerCase() === data.country.toLowerCase() || c.isoCode.toLowerCase() === data.country.toLowerCase()
          );
          if (foundC) matchedCountryCode = foundC.isoCode;
        }

        let matchedStateCode = '';
        if (data.state) {
          const foundS = State.getStatesOfCountry(matchedCountryCode).find(
            s => s.name.toLowerCase() === data.state.toLowerCase() || s.isoCode.toLowerCase() === data.state.toLowerCase()
          );
          if (foundS) matchedStateCode = foundS.isoCode;
        }

        const initialLoaded = {
          ...EMPTY_FORM,
          fullName:             data.fullName || '',
          departmentId:         data.departmentId?._id || data.departmentId || '',
          roleId:               data.roleId?._id       || data.roleId       || '',
          position:             data.position           || '',
          positionRank:         data.positionRank       ?? '',
          tariffGrade:          data.tariffGrade        || '',
          salaryGrade:          data.salaryGrade        || '',
          baseSalary:           data.baseSalary         ?? '',
          title:                data.title              || '',
          firstName:            data.firstName          || '',
          middleName:           data.middleName         || '',
          lastName:             data.lastName           || '',
          gender:               data.gender             || '',
          dateOfBirth:          data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          bloodGroup:           data.bloodGroup         || '',
          maritalStatus:        data.maritalStatus      || '',
          nationality:          data.nationality        || '',
          phone:                data.phone              || '',
          alternatePhone:       data.alternatePhone     || '',
          email:                data.email              || '',
          addressLine1:         data.addressLine1       || '',
          addressLine2:         data.addressLine2       || '',
          area:                 data.area               || '',
          city:                 data.city               || '',
          state:                data.state              || '',
          stateCode:            matchedStateCode,
          country:              data.country            || 'India',
          countryCode:          matchedCountryCode,
          postalCode:           data.postalCode         || '',
          emergencyContactName:   data.emergencyContactName   || '',
          emergencyContactNumber: data.emergencyContactNumber || '',
          employmentType:       data.employmentType     || '',
          joiningDate:          data.joiningDate ? data.joiningDate.split('T')[0] : '',
          shift:                data.shift              || '',
          reportingTo:          data.reportingTo?._id   || data.reportingTo || '',
          assignedWardId:       data.assignedWardId?._id || data.assignedWardId || '',
          yearsOfExperience:    data.yearsOfExperience  ?? '',
          primaryQualification: data.primaryQualification || '',
          highestQualification: data.highestQualification || '',
          languagesKnown:       Array.isArray(data.languagesKnown) ? data.languagesKnown.join(', ') : (data.languagesKnown || ''),
          medicalLicenseNumber: data.medicalLicenseNumber || '',
          medicalCouncil:       data.medicalCouncil     || '',
          licenseRegistrationDate: data.licenseRegistrationDate ? data.licenseRegistrationDate.split('T')[0] : '',
          licenseExpiryDate:    data.licenseExpiryDate   ? data.licenseExpiryDate.split('T')[0] : '',
          primarySpecialization: data.primarySpecialization || '',
          superSpecialization:  data.superSpecialization  || '',
          consultationType:     data.consultationType   || '',
          consultingFee:        data.consultingFee       ?? '',
          followUpFee:          data.followUpFee         ?? '',
          previousHospital:     data.previousHospital    || '',
          nursingLicenseNumber: data.nursingLicenseNumber || '',
          nursingSpecialization: data.nursingSpecialization || '',
          labCertificationCode: data.labCertificationCode  || '',
          labQualification:     data.labQualification    || '',
          pharmacyLicenseNumber: data.pharmacyLicenseNumber || '',
          pharmacyQualification: data.pharmacyQualification || '',
          verificationDocument: data.verificationDocument || null,
          username:             data.username            || '',
          password:             '',
          accountStatus:        data.status              || 'Active',
        };

        initialFormDataRef.current = initialLoaded;
        setFormData(initialLoaded);
        setDraftBanner(false);
      };

      initStaff(staff);

      if (staff._id) {
        staffAPI.getById(staff._id)
          .then(res => {
            if (isMounted && res.data) {
              initStaff(res.data);
            }
          })
          .catch(() => {});
      }

      return () => { isMounted = false; };
    } else {
      const defaultDept = (isCallerHod ? (user?.hodDepartmentId || user?.departmentId) : '') || '';
      const baseForm = {
        ...EMPTY_FORM,
        departmentId: defaultDept,
      };
      initialFormDataRef.current = baseForm;

      let draftLoaded = false;
      try {
        const savedDraft = sessionStorage.getItem(STAFF_DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed?.formData && (parsed.formData.firstName || parsed.formData.lastName || parsed.formData.phone || parsed.formData.email || parsed.formData.roleId)) {
            setFormData(parsed.formData);
            if (parsed.currentStep) setCurrentStep(parsed.currentStep);
            setDraftBanner(true);
            draftLoaded = true;
          }
        }
      } catch {
        // ignore
      }

      if (!draftLoaded) {
        setFormData(baseForm);
        setDraftBanner(false);
      }
      setCreatedStaffId(null);
    }
    setCurrentStep(1);
    setError(null);
    setFieldErrors({});
  }, [isOpen, staff]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (!initialFormDataRef.current) return false;
    const init = initialFormDataRef.current;
    const keys = Object.keys(EMPTY_FORM);
    for (const k of keys) {
      if (k === 'verificationDocument') {
        if (formData[k] !== init[k]) return true;
      } else if (String(formData[k] ?? '').trim() !== String(init[k] ?? '').trim()) {
        return true;
      }
    }
    return false;
  }, [formData]);

  // Auto-persist draft to sessionStorage in create mode
  useEffect(() => {
    if (!isOpen || staff) return;
    if (isDirty) {
      try {
        sessionStorage.setItem(STAFF_DRAFT_KEY, JSON.stringify({ formData, currentStep }));
      } catch {
        // ignore
      }
    }
  }, [formData, currentStep, isOpen, staff, isDirty]);

  // Auto-load username suggestion when reaching Step 4 in create mode
  useEffect(() => {
    if (currentStep === 4 && !staff && !formData.username) {
      staffAPI.generateUsername()
        .then(res => setFormData(prev => ({ ...prev, username: res.data?.username || '' })))
        .catch(() => {});
    }
  }, [currentStep, staff]);


  // ── Country, State, City Cascading Lists ──
  const allCountries = useMemo(() => {
    return Country.getAllCountries().map(c => ({
      value: c.isoCode,
      label: `${c.flag || ''} ${c.name} (+${c.phonecode})`.trim(),
      name: c.name,
      isoCode: c.isoCode,
      phonecode: c.phonecode
    }));
  }, []);

  const availableStates = useMemo(() => {
    const code = formData.countryCode || 'IN';
    return State.getStatesOfCountry(code).map(s => ({
      value: s.name,
      label: s.name,
      isoCode: s.isoCode,
      name: s.name
    }));
  }, [formData.countryCode]);

  const availableCities = useMemo(() => {
    const countryCode = formData.countryCode || 'IN';
    let stateCode = formData.stateCode;
    if (!stateCode && formData.state) {
      const found = availableStates.find(s => s.name === formData.state || s.isoCode === formData.state);
      if (found) stateCode = found.isoCode;
    }
    if (!countryCode || !stateCode) return [];
    try {
      const rawCities = City.getCitiesOfState(countryCode, stateCode) || [];
      return rawCities.map(c => ({
        value: c.name,
        label: c.name
      }));
    } catch {
      return [];
    }
  }, [formData.countryCode, formData.stateCode, formData.state, availableStates]);

  const handleCountryChange = (e) => {
    const code = e.target.value;
    const cObj = allCountries.find(c => c.value === code);
    setFormData(prev => ({
      ...prev,
      countryCode: code,
      country: cObj ? cObj.name : code,
      state: '',
      stateCode: '',
      city: '',
    }));
    setFieldErrors(prev => ({ ...prev, country: null, state: null, city: null }));
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    const stObj = availableStates.find(s => s.name === val || s.isoCode === val);
    setFormData(prev => ({
      ...prev,
      state: val,
      stateCode: stObj ? stObj.isoCode : '',
      city: '',
    }));
    setFieldErrors(prev => ({ ...prev, state: null, city: null }));
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      city: val,
    }));
    setFieldErrors(prev => ({ ...prev, city: null }));
  };

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

      let suggestedDeptId = '';
      if (roleName === 'IPD Nurse' || roleName === 'Ward Operations') {
        const d = departments.find(dep => dep.code === 'WARD' || dep.name === 'Ward Operations');
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'Lab Nurse' || roleName === 'Laboratory') {
        const d = departments.find(dep => dep.code === 'PATH' || dep.code === 'HAEM' || dep.name?.toLowerCase().includes('pathology') || dep.type === 'DIAGNOSTIC');
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'OPD Nurse' || roleName === 'Doctor' || roleName === 'Surgeon') {
        const d = departments.find(dep => dep.code === 'GENMED' || dep.code === 'GEN' || dep.name?.toLowerCase().includes('general') || dep.type === 'CLINICAL');
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'Reception') {
        const d = departments.find(dep => dep.code === 'RECEP' || dep.name?.toLowerCase().includes('reception'));
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'Billing') {
        const d = departments.find(dep => dep.code === 'BILL' || dep.name?.toLowerCase().includes('billing'));
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'Pharmacy') {
        const d = departments.find(dep => dep.code === 'PHARM' || dep.name?.toLowerCase().includes('pharmacy'));
        if (d) suggestedDeptId = d._id;
      } else if (roleName === 'Administrator') {
        const d = departments.find(dep => dep.code === 'ADMIN' || dep.name?.toLowerCase().includes('admin'));
        if (d) suggestedDeptId = d._id;
      }

      setFormData(prev => ({
        ...prev,
        roleId: value,
        departmentId: isCallerHod ? (user?.hodDepartmentId || user?.departmentId) : (suggestedDeptId || prev.departmentId),
        position: allowed.some(p => p.title === prev.position) ? prev.position : '',
        positionRank: allowed.some(p => p.title === prev.position) ? prev.positionRank : '',
        tariffGrade: '',
        salaryGrade: '',
        // Clear specialty professional fields on role change
        medicalLicenseNumber:'', medicalCouncil:'',
        primarySpecialization:'', consultationType:'In-Person', consultingFee:'', followUpFee:'',
        nursingLicenseNumber:'', nursingSpecialization:'',
        labCertificationCode:'', labQualification:'',
        pharmacyLicenseNumber:'', pharmacyQualification:'',
      }));
    } else if (name === 'position') {
      const roleName = roles.find(r => r._id === formData.roleId)?.name || '';
      const allowed = roleName ? (POSITIONS[roleName] || []) : [];
      const posObj = allowed.find(p => p.title === value);
      const rank = posObj ? posObj.rank : (value ? 1 : '');
      const autoTariff = rank ? getTariffGrade(rank) : '';
      setFormData(prev => ({
        ...prev,
        position: value,
        positionRank: rank,
        tariffGrade: autoTariff,
        salaryGrade: autoTariff,
      }));
    } else if (name === 'tariffGrade') {
      setFormData(prev => ({
        ...prev,
        tariffGrade: value,
        salaryGrade: value || (prev.positionRank ? getTariffGrade(prev.positionRank) : ''),
      }));
    } else if (name === 'title' || name === 'firstName' || name === 'middleName' || name === 'lastName') {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        updated.fullName = [updated.title, updated.firstName, updated.middleName, updated.lastName].filter(Boolean).join(' ');
        return updated;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Proactively clear field errors and top banner error when user edits
    setFieldErrors(prev => ({ ...prev, [name]: null }));
    setError(null);
  }, [roles, departments, isCallerHod, user, formData.roleId]);

  const handleClose = () => {
    setIsClosing(true);
    setShowDiscardConfirm(false);
    setTimeout(() => {
      setFormData(EMPTY_FORM);
      setCreatedStaffId(null);
      setError(null);
      setFieldErrors({});
      setUploadStatusMessage('');
      setDraftBanner(false);
      setCurrentStep(1);
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    try {
      sessionStorage.removeItem(STAFF_DRAFT_KEY);
    } catch {}
    handleClose();
  };

  const handleSaveDraftAndClose = () => {
    try {
      sessionStorage.setItem(STAFF_DRAFT_KEY, JSON.stringify({ formData, currentStep }));
      showSuccess('Draft saved to this session.');
    } catch {}
    setShowDiscardConfirm(false);
    handleClose();
  };

  // Intercept Escape key to protect against accidental dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDiscardConfirm) {
        e.preventDefault();
        e.stopPropagation();
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, showDiscardConfirm]);


  // Derived role name and position rank
  const selectedRoleName = roles.find(r => r._id === formData.roleId)?.name || '';
  const rawPositions = selectedRoleName ? (POSITIONS[selectedRoleName] || []) : [];
  const availablePositions = isCallerHod 
    ? rawPositions.filter(p => p.rank < (user?.positionRank || 7) && !p.title.includes('Head of') && !p.title.includes('Director') && !p.title.includes('Superintendent') && !p.title.includes('Chief'))
    : rawPositions;
  const selectedPositionObj = availablePositions.find(p => p.title === formData.position);
  const positionRank = (formData.positionRank !== undefined && formData.positionRank !== '' && Number(formData.positionRank) > 0)
    ? Number(formData.positionRank)
    : (selectedPositionObj ? selectedPositionObj.rank : null);

  const supervisorOptions = useMemo(() => {
    return [
      { value: '', label: '-- None / Independent --' },
      ...activeStaffList
        .filter(s => s._id !== staff?._id && (s.positionRank >= 4 || s.roleId?.name === 'Doctor' || s.roleId?.name === 'Administrator'))
        .map(s => ({ value: s._id, label: `${s.fullName} (${s.position}${s.positionRank ? ` • Rank ${s.positionRank}` : ''})` }))
    ];
  }, [activeStaffList, staff]);

  const wardOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Assigned Ward / Floor --' },
      ...wardList.map(w => {
        const floorTitle = w.floorName || w.name || (w.floorNumber !== undefined && w.floorNumber !== null ? `Floor ${w.floorNumber}` : 'Inpatient Ward');
        const wingOrFloor = w.wing 
          ? `${w.wing}${w.floorNumber !== undefined && w.floorNumber !== null ? ` • Floor ${w.floorNumber}` : ''}`
          : (w.floorNumber !== undefined && w.floorNumber !== null ? `Floor ${w.floorNumber}` : (w.code || ''));
        const label = wingOrFloor ? `${floorTitle} (${wingOrFloor})` : floorTitle;
        return {
          value: w._id,
          label
        };
      })
    ];
  }, [wardList]);


  // Options lists
  const positionOptions = [
    { value: '', label: '-- Select Position --' },
    ...availablePositions.map(p => ({ value: p.title, label: p.title })),
  ];
  const departmentOptions = isCallerHod
    ? departments
        .filter(d => String(d._id) === String(user?.hodDepartmentId || user?.departmentId))
        .map(d => ({ value: d._id, label: `${d.name} (Your Purview)` }))
    : [{ value:'', label:'-- Select Department --' }, ...departments.map(d=>({ value:d._id, label:d.name }))];
  const roleOptions = [
    { value:'', label:'-- Select Role --' }, 
    ...(isCallerHod ? roles.filter(r => r.name !== 'Administrator') : roles).map(r=>({ value:r._id, label:r.name }))
  ];

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

      const trimmedEmail = (formData.email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address';
      }

      if (!formData.addressLine1?.trim()) {
        errors.addressLine1 = 'Address Line 1 is required';
      }

      if (!formData.countryCode) {
        errors.country = 'Country is required';
      }

      if (!formData.state?.trim()) {
        errors.state = 'State / Province is required';
      }

      if (!formData.city?.trim()) {
        errors.city = 'City / Town is required';
      }

      if (formData.postalCode?.trim() && formData.postalCode.trim().length !== 6) {
        errors.postalCode = 'Postal code must be exactly 6 digits';
      }
    }

    if (step === 2) {
      if (!formData.roleId) errors.roleId = 'Role is required';
      if (!formData.position) errors.position = 'Position is required';
      if (!formData.departmentId) errors.departmentId = 'Department is required';
      if (!formData.employmentType) errors.employmentType = 'Employment type is required';
      if (!formData.joiningDate) errors.joiningDate = 'Joining date is required';
      if (selectedRoleName === 'IPD Nurse' && !formData.shift) {
        errors.shift = 'Shift assignment is required for IPD Nurse';
      }
      if (positionRank === 1 && !formData.reportingTo) {
        errors.reportingTo = 'Reporting supervisor is required';
      }
    }

    if (step === 3) {
      if ((selectedRoleName === 'Doctor' || selectedRoleName === 'Surgeon') && positionRank !== 1 && !formData.medicalLicenseNumber?.trim()) {
        errors.medicalLicenseNumber = 'Medical registration number is required';
      }
      if (['Nurse', 'OPD Nurse', 'IPD Nurse', 'Lab Nurse'].includes(selectedRoleName) && !formData.nursingLicenseNumber?.trim()) {
        errors.nursingLicenseNumber = 'Nursing license number is required';
      }
      if (selectedRoleName === 'Laboratory' && !formData.labCertificationCode?.trim()) {
        errors.labCertificationCode = 'Laboratory certification code is required';
      }
      if (selectedRoleName === 'Pharmacy' && !formData.pharmacyLicenseNumber?.trim()) {
        errors.pharmacyLicenseNumber = 'Pharmacy license number is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isStep4Valid = () => !!formData.username && (!staff ? !!formData.password : true);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    // 1. Comprehensive Validation across all steps before initiating any upload
    if (!validateStep(1)) {
      setCurrentStep(1);
      showError('Please correct personal & contact details before saving.');
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      showError('Please correct employment details before saving.');
      return;
    }
    if (!validateStep(3)) {
      setCurrentStep(3);
      showError('Please correct professional details before saving.');
      return;
    }
    if (!isStep4Valid()) {
      setCurrentStep(4);
      setError('Username and password are required.');
      return;
    }

    setLoading(true);

    // 2. Staged Cloudinary Certificate Upload (Deferred Commit)
    let finalVerificationDocument = formData.verificationDocument;

    if (formData.verificationDocument?.isStaged && formData.verificationDocument?.file) {
      try {
        setUploadStatusMessage('Uploading credentials certificate to secure storage...');
        const uploadData = new FormData();
        uploadData.append('document', formData.verificationDocument.file);
        const uploadRes = await staffAPI.uploadCertificate(uploadData);
        finalVerificationDocument = uploadRes.data || uploadRes;
      } catch (uploadErr) {
        setLoading(false);
        setUploadStatusMessage('');
        const errMsg = uploadErr.response?.data?.message || uploadErr.message || 'Failed to upload certificate document.';
        setError(errMsg);
        showError('Certificate Upload Failed', errMsg);
        setCurrentStep(3);
        return;
      }
    }

    setUploadStatusMessage('');

    // Build clean payload — filter out empty optional fields and sanitize values
    const stripEmpty = (obj) => {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'verificationDocument') {
          if (v && typeof v === 'object' && v.url && v.fileName && v.url.trim() !== '' && v.fileName.trim() !== '') {
            clean[k] = {
              url: v.url.trim(),
              secureUrl: v.secureUrl?.trim() || v.url.trim(),
              cloudinaryPublicId: v.cloudinaryPublicId || undefined,
              resourceType: v.resourceType || undefined,
              fileName: v.fileName.trim(),
              sizeBytes: Number(v.sizeBytes) || 0,
              mimeType: v.mimeType || undefined,
              uploadedAt: v.uploadedAt || new Date().toISOString(),
            };
          } else {
            clean[k] = null; // Correctly map empty document state to null
          }
        } else if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed !== '') {
            clean[k] = k === 'email' ? trimmed.toLowerCase() : trimmed;
          }
        } else if (v !== null && v !== undefined) {
          clean[k] = v;
        }
      }
      return clean;
    };

    try {
      if (staff) {
        // Edit mode — update staff record atomically in a single unified request
        const { accountStatus, ...staffFields } = formData;
        const payload = stripEmpty({
          ...staffFields,
          verificationDocument: finalVerificationDocument,
          languagesKnown: formData.languagesKnown
            ? formData.languagesKnown.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
          assignedWardId: formData.assignedWardId || undefined,
          username: formData.username && formData.username.trim() !== (staff.username || '')
            ? formData.username.trim().toLowerCase()
            : undefined,
          password: formData.password && formData.password.trim() !== ''
            ? formData.password
            : undefined,
          consultingFee: positionRank === 1 ? 0 : (staffFields.consultingFee ? Number(staffFields.consultingFee) : undefined),
          followUpFee:   positionRank === 1 ? 0 : (staffFields.followUpFee   ? Number(staffFields.followUpFee)   : undefined),
          yearsOfExperience: staffFields.yearsOfExperience ? Number(staffFields.yearsOfExperience) : undefined,
          nursingDomain: selectedRoleName === 'OPD Nurse' ? 'OPD' : selectedRoleName === 'IPD Nurse' ? 'IPD' : selectedRoleName === 'Lab Nurse' ? 'LAB' : undefined,
        });
        await api.put(`/staff/${staff._id}`, payload, { skipGlobalToast: true });
        if (onSuccess) onSuccess(`${formData.fullName}'s profile updated successfully!`);
      } else {
        // Create mode — single atomic call creates staff + login identity
        const payload = stripEmpty({
          ...formData,
          verificationDocument: finalVerificationDocument,
          languagesKnown: formData.languagesKnown
            ? formData.languagesKnown.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
          assignedWardId: formData.assignedWardId || undefined,
          username: formData.username ? formData.username.trim().toLowerCase() : undefined,
          password: formData.password || undefined,
          consultingFee: positionRank === 1 ? 0 : (formData.consultingFee ? Number(formData.consultingFee) : undefined),
          followUpFee:   positionRank === 1 ? 0 : (formData.followUpFee   ? Number(formData.followUpFee)   : undefined),
          yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : undefined,
          nursingDomain: selectedRoleName === 'OPD Nurse' ? 'OPD' : selectedRoleName === 'IPD Nurse' ? 'IPD' : selectedRoleName === 'Lab Nurse' ? 'LAB' : undefined,
        });
        await api.post('/staff', payload, { skipGlobalToast: true });
        if (onSuccess) onSuccess(`Account for ${formData.fullName} created. They must change password on first login.`);
      }
      try { sessionStorage.removeItem(STAFF_DRAFT_KEY); } catch {}
      handleClose();
    } catch (err) {
      const responseData = err.response?.data;
      const details = responseData?.details || responseData?.invalidParams || (Array.isArray(responseData?.data) ? responseData.data : null);

      let errorDetail =
        responseData?.message ||
        responseData?.detail ||
        responseData?.title ||
        err.userMessage ||
        err.message ||
        `Error ${staff ? 'updating' : 'creating'} staff account.`;
      
      const newFieldErrors = {};
      let earliestStep = null;

      if (Array.isArray(details) && details.length > 0) {
        const errorMessages = details.map(d => {
          const field = d.field || d.path;
          const msg = d.message ? d.message.replace(/"/g, '') : 'Invalid field';
          if (field) {
            newFieldErrors[field] = msg;
            if (['firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'bloodGroup', 'maritalStatus', 'nationality', 'phone', 'alternatePhone', 'email', 'addressLine1', 'addressLine2', 'area', 'city', 'state', 'stateCode', 'country', 'countryCode', 'postalCode', 'emergencyContactName', 'emergencyContactNumber'].includes(field)) {
              if (!earliestStep || earliestStep > 1) earliestStep = 1;
            } else if (['departmentId', 'roleId', 'position', 'positionRank', 'employmentType', 'joiningDate', 'shift', 'reportingTo', 'nursingDomain'].includes(field)) {
              if (!earliestStep || earliestStep > 2) earliestStep = 2;
            } else if (['yearsOfExperience', 'medicalLicenseNumber', 'medicalCouncil', 'licenseRegistrationDate', 'licenseExpiryDate', 'primaryQualification', 'highestQualification', 'primarySpecialization', 'superSpecialization', 'previousHospital', 'languagesKnown', 'consultationType', 'consultingFee', 'followUpFee', 'nursingLicenseNumber', 'nursingSpecialization', 'labCertificationCode', 'labQualification', 'pharmacyLicenseNumber', 'pharmacyQualification', 'verificationDocument'].includes(field)) {
              if (!earliestStep || earliestStep > 3) earliestStep = 3;
            } else if (['username', 'password'].includes(field)) {
              if (!earliestStep || earliestStep > 4) earliestStep = 4;
            }
          }
          return msg;
        });
        errorDetail = errorMessages.join(' | ');
      } else {
        const lower = errorDetail.toLowerCase();
        if (lower.includes('medical license') || lower.includes('medical registration') || lower.includes('medical council')) {
          newFieldErrors.medicalLicenseNumber = errorDetail;
          earliestStep = 3;
        } else if (lower.includes('nursing license')) {
          newFieldErrors.nursingLicenseNumber = errorDetail;
          earliestStep = 3;
        } else if (lower.includes('laboratory') || lower.includes('certification code')) {
          newFieldErrors.labCertificationCode = errorDetail;
          earliestStep = 3;
        } else if (lower.includes('pharmacy license')) {
          newFieldErrors.pharmacyLicenseNumber = errorDetail;
          earliestStep = 3;
        } else if (lower.includes('supervisor') || lower.includes('intern')) {
          newFieldErrors.reportingTo = errorDetail;
          earliestStep = 2;
        } else if (lower.includes('position')) {
          newFieldErrors.position = errorDetail;
          earliestStep = 2;
        } else if (lower.includes('role')) {
          newFieldErrors.roleId = errorDetail;
          earliestStep = 2;
        } else if (lower.includes('department')) {
          newFieldErrors.departmentId = errorDetail;
          earliestStep = 2;
        } else if (lower.includes('email')) {
          newFieldErrors.email = errorDetail;
          earliestStep = 1;
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          newFieldErrors.phone = errorDetail;
          earliestStep = 1;
        } else if (lower.includes('address') || lower.includes('city') || lower.includes('state') || lower.includes('country') || lower.includes('postal')) {
          earliestStep = 1;
        } else if (lower.includes('username') || lower.includes('password')) {
          newFieldErrors.username = errorDetail;
          earliestStep = 4;
        }
      }

      if (earliestStep) {
        setCurrentStep(earliestStep);
      }

      setError(errorDetail);
      showError(
        staff ? 'Staff Profile Update Failed' : 'Staff Registration Failed',
        errorDetail
      );
      setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <>
      <div
        className={`md3-staff-sheet-backdrop ${isClosing ? 'is-closing' : ''}`}
        onClick={handleAttemptClose}
      >
        <div
          className={`md3-staff-sheet-container ${isClosing ? 'is-closing' : ''}`}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={staff ? 'Edit Staff Profile' : 'Register New Staff Member'}
        >
          {/* ── Header ── */}
          <div className="md3-staff-sheet-header">
            <div className="md3-staff-sheet-title-row">
              <div>
                <h2 className="md3-staff-sheet-title">
                  {staff ? 'Edit Staff Profile' : 'Register New Staff Member'}
                </h2>
                <p className="md3-staff-sheet-subtitle">
                  {staff ? 'Update employment and personal details.' : 'Complete all sections to create a staff account.'}
                </p>
              </div>
              <button
                onClick={handleAttemptClose}
                className="md3-staff-sheet-close-btn"
                aria-label="Close sheet"
                type="button"
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>


          {/* Step indicator */}
          <div className="md3-staff-stepper">
            {STEPS.map((step, idx) => {
              const isActive    = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    className={`md3-staff-step-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed is-clickable' : ''}`}
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    disabled={!isCompleted && !isActive}
                  >
                    <div className="md3-staff-step-circle">
                      {isCompleted
                        ? <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>check</span>
                        : <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{step.icon}</span>
                      }
                    </div>
                    <span className="md3-staff-step-label">
                      {step.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className="md3-staff-step-connector">
                      <div className={`md3-staff-step-line ${step.id < currentStep ? 'is-completed' : ''}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="md3-staff-sheet-body">
          {draftBanner && !staff && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--md-sys-color-surface-container-high, #f2f5f1)',
              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--md-sys-color-on-surface-variant, #49454f)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary, #006a57)' }}>restore</span>
                <span><strong>Draft Restored:</strong> Continuing from your previous editing session.</span>
              </div>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--md-sys-color-error, #ba1a1a)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
                onClick={() => {
                  try { sessionStorage.removeItem(STAFF_DRAFT_KEY); } catch {}
                  const defaultDept = (isCallerHod ? (user?.hodDepartmentId || user?.departmentId) : '') || '';
                  setFormData({ ...EMPTY_FORM, departmentId: defaultDept });
                  initialFormDataRef.current = { ...EMPTY_FORM, departmentId: defaultDept };
                  setCurrentStep(1);
                  setDraftBanner(false);
                }}
              >
                Clear Draft
              </button>
            </div>
          )}

          {error && (
            <div className="md3-staff-error-banner">
              <span className="material-symbols-rounded error-icon">error</span>
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* ════ STEP 1 — Personal & Contact ════ */}
          {currentStep === 1 && (
            <>
              <SectionHeader icon="badge" title="Personal Information" />
              <FieldRow>
                <Md3Select name="title" label="Salutation / Title" value={formData.title} onChange={handleChange} options={titleOpts} />
                <Md3TextField name="firstName"  label="First Name *" value={formData.firstName}  onChange={handleChange} error={fieldErrors.firstName} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="middleName" label="Middle Name"   value={formData.middleName} onChange={handleChange} error={fieldErrors.middleName} />
                <Md3TextField name="lastName" label="Last Name *" value={formData.lastName} onChange={handleChange} error={fieldErrors.lastName} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <Md3TextField 
                name="fullName" 
                label="Full Display Name (Auto-Generated / Editable) *" 
                value={formData.fullName} 
                onChange={handleChange} 
                error={fieldErrors.fullName} 
              />
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3Select name="gender" label="Gender *" value={formData.gender} onChange={handleChange} options={genderOpts} />
                <Md3TextField name="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3Select name="bloodGroup" label="Blood Group" value={formData.bloodGroup} onChange={handleChange} options={bloodGroupOpts} />
                <Md3Select name="maritalStatus" label="Marital Status" value={formData.maritalStatus} onChange={handleChange} options={maritalOpts} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="nationality" label="Nationality" value={formData.nationality} onChange={handleChange} />
              </FieldRow>

              <SectionHeader icon="call" title="Contact Details" />
              <FieldRow>
                <Md3TextField name="phone"          label="Mobile Number *" value={formData.phone}          onChange={handleChange} error={fieldErrors.phone} />
                <Md3TextField name="alternatePhone" label="Alternate Mobile" value={formData.alternatePhone} onChange={handleChange} error={fieldErrors.alternatePhone} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <Md3TextField name="email" label="Email Address *" type="email" value={formData.email} onChange={handleChange} error={fieldErrors.email} />

              <SectionHeader icon="home" title="Address" />
              <Md3TextField
                name="addressLine1"
                label="Address Line 1 *"
                value={formData.addressLine1}
                onChange={handleChange}
                error={fieldErrors.addressLine1}
              />
              <div style={{ height: '12px' }} />
              <Md3TextField
                name="addressLine2"
                label="Address Line 2"
                value={formData.addressLine2}
                onChange={handleChange}
              />
              <div style={{ height: '12px' }} />
              <Md3Select
                id="staffCountry"
                name="countryCode"
                label="Country *"
                value={formData.countryCode}
                onChange={handleCountryChange}
                disabled={loading}
                options={allCountries}
                error={fieldErrors.country}
              />
              <div style={{ height: '12px' }} />
              <FieldRow>
                {availableStates.length > 0 ? (
                  <Md3Select
                    id="staffState"
                    name="state"
                    label="State / Province *"
                    value={formData.state}
                    onChange={handleStateChange}
                    disabled={loading}
                    options={[{ value: '', label: 'Select State / Province' }, ...availableStates]}
                    error={fieldErrors.state}
                  />
                ) : (
                  <Md3TextField
                    id="staffState"
                    name="state"
                    label="State / Province *"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={loading}
                    error={fieldErrors.state}
                  />
                )}

                {availableStates.length > 0 ? (
                  <Md3Select
                    id="staffCity"
                    name="city"
                    label="City / Town *"
                    value={formData.city}
                    onChange={handleCityChange}
                    disabled={loading || !formData.state}
                    options={[
                      {
                        value: '',
                        label: !formData.state
                          ? 'Select State First'
                          : (availableCities.length > 0 ? 'Select City / Town' : 'No cities listed (type in address)')
                      },
                      ...availableCities
                    ]}
                    error={fieldErrors.city}
                  />
                ) : (
                  <Md3TextField
                    id="staffCity"
                    name="city"
                    label="City / Town *"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={loading}
                    error={fieldErrors.city}
                  />
                )}
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField
                  name="postalCode"
                  label="Postal Code"
                  value={formData.postalCode}
                  onChange={handleChange}
                  error={fieldErrors.postalCode}
                />
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
              <Md3Select 
                name="departmentId" 
                label={isCallerHod ? "Department (HOD Purview) *" : "Department *"} 
                value={formData.departmentId} 
                onChange={handleChange} 
                options={departmentOptions} 
                disabled={isCallerHod}
                error={fieldErrors.departmentId} 
              />

              {/* ── Progressive Tariff & Salary Grading Card ── */}
              {formData.position && (
                <div className="md3-tariff-grading-card">
                  <div className="md3-tariff-grading-header">
                    <div className="md3-tariff-grading-title">
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>payments</span>
                      Tariff & Salary Grading
                    </div>
                    {positionRank && (
                      <span className="md3-tariff-rank-badge">
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>workspace_premium</span>
                        Hierarchy Rank {positionRank} of 9
                      </span>
                    )}
                  </div>

                  <FieldRow>
                    <Md3Select
                      name="tariffGrade"
                      label="Tariff Grade (Billing Tier) *"
                      value={formData.tariffGrade || (positionRank ? getTariffGrade(positionRank) : '')}
                      onChange={handleChange}
                      options={tariffGradeOpts}
                      error={fieldErrors.tariffGrade}
                    />
                    <Md3TextField
                      name="baseSalary"
                      label={`Monthly Base Compensation (${CURRENCY_SYMBOL})`}
                      type="number"
                      value={formData.baseSalary}
                      onChange={handleChange}
                      placeholder={
                        formData.tariffGrade && SALARY_BANDS[formData.tariffGrade]
                          ? `e.g. ${SALARY_BANDS[formData.tariffGrade].minSalary}`
                          : "e.g. 30000"
                      }
                    />
                  </FieldRow>

                  {/* Active Salary Band & Billing Impact Preview */}
                  {(() => {
                    const effectiveGrade = formData.tariffGrade || (positionRank ? getTariffGrade(positionRank) : 'GRADE_1');
                    const bandInfo = SALARY_BANDS[effectiveGrade];
                    const gradeDescriptions = {
                      GRADE_1: "Applies to entry/support operations & base service tariff schedules (Interns, Support, Assistants, Front Desk).",
                      GRADE_2: "Standard operational & resident clinical tier billing schedule.",
                      GRADE_3: "Senior consultant & specialist service pricing schedule.",
                      GRADE_4: "Department head & executive consultation tariff schedule.",
                      GRADE_5: "Institutional Chief Medical Officer / Leadership billing schedule."
                    };
                    return (
                      <div className="md3-salary-band-info">
                        <div className="md3-salary-band-row">
                          <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                            {bandInfo?.band}: {bandInfo?.label}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                            Pay Scale: {CURRENCY_SYMBOL}{bandInfo?.minSalary?.toLocaleString()} - {CURRENCY_SYMBOL}{bandInfo?.maxSalary?.toLocaleString()} / mo
                          </span>
                        </div>
                        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '11px' }}>
                          {bandInfo?.description}
                        </div>
                        <div className="md3-tariff-impact-text">
                          <strong>Tariff Billing Impact:</strong> {gradeDescriptions[effectiveGrade] || "Standard institutional service rate applies."}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

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
              <div style={{ height: '12px' }} />
              <Md3Select 
                name="reportingTo" 
                label={positionRank === 1 ? "Reporting Supervisor (Doctor Rank 5+) *" : "Reporting Supervisor (Optional)"} 
                value={formData.reportingTo} 
                onChange={handleChange} 
                options={supervisorOptions} 
                error={fieldErrors.reportingTo}
              />
              {['IPD Nurse', 'Ward Operations'].includes(selectedRoleName) && (
                <>
                  <div style={{ height: '12px' }} />
                  <Md3Select 
                    name="assignedWardId" 
                    label="Assigned Inpatient Ward / Floor Station (Optional)" 
                    value={formData.assignedWardId} 
                    onChange={handleChange} 
                    options={wardOptions} 
                    error={fieldErrors.assignedWardId}
                  />
                </>
              )}
            </>
          )}

          {/* ════ STEP 3 — Professional / Role-Specific ════ */}
          {currentStep === 3 && (
            <>
              <SectionHeader icon="school" title="General Professional & Academic Credentials" />
              <FieldRow>
                <Md3TextField name="primaryQualification" label="Primary Qualification" value={formData.primaryQualification} onChange={handleChange} />
                <Md3TextField name="yearsOfExperience" label="Years of Experience" type="number" value={formData.yearsOfExperience} onChange={handleChange} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <FieldRow>
                <Md3TextField name="highestQualification" label="Highest Qualification" value={formData.highestQualification} onChange={handleChange} />
                <Md3TextField name="previousHospital" label="Previous Organization / Hospital" value={formData.previousHospital} onChange={handleChange} />
              </FieldRow>
              <div style={{ height: '12px' }} />
              <Md3TextField 
                name="languagesKnown" 
                label="Languages Known (Optional, comma-separated)" 
                value={formData.languagesKnown} 
                onChange={handleChange} 
              />

              {/* Doctor or Surgeon */}
              {(selectedRoleName === 'Doctor' || selectedRoleName === 'Surgeon') && (
                <>
                  <SectionHeader icon="stethoscope" title={selectedRoleName === 'Surgeon' ? "Surgical & Medical Credentials" : "Medical Credentials"} />
                  <FieldRow>
                    <Md3TextField name="medicalLicenseNumber" label={positionRank === 1 ? "Medical Registration No. (Optional for Intern)" : "Medical Registration No. *"} value={formData.medicalLicenseNumber} onChange={handleChange} error={fieldErrors.medicalLicenseNumber} />
                    <Md3TextField name="medicalCouncil"       label="Medical Council"            value={formData.medicalCouncil}       onChange={handleChange} />
                  </FieldRow>
                  <div style={{ height: '12px' }} />
                  <FieldRow>
                    <Md3TextField name="licenseRegistrationDate" label="Registration Date"   type="date" value={formData.licenseRegistrationDate} onChange={handleChange} />
                    <Md3TextField name="licenseExpiryDate"       label="Expiry Date"         type="date" value={formData.licenseExpiryDate}       onChange={handleChange} />
                  </FieldRow>
                  <SectionHeader icon="psychology" title="Specialization & Departmental Scope" />
                  <FieldRow>
                    <Md3Select name="primarySpecialization" label="Primary Specialization *" value={formData.primarySpecialization} onChange={handleChange} options={toOpts(DOCTOR_SPECIALIZATIONS)} />
                    <Md3Select name="superSpecialization"   label="Super Specialization"     value={formData.superSpecialization}   onChange={handleChange} options={toOpts(DOCTOR_SPECIALIZATIONS)} />
                  </FieldRow>
                  <SectionHeader icon="payments" title="Consultation Tariff Pricing" />
                  <FieldRow>
                    <Md3Select name="consultationType" label="Consultation Type *" value={formData.consultationType} onChange={handleChange} options={consultTypeOpts} />
                    <Md3TextField name="consultingFee" label={positionRank === 1 ? "Consultation Fee (Locked for Intern)" : `Consultation Fee (${CURRENCY_SYMBOL})`} type="number" value={positionRank === 1 ? '0' : formData.consultingFee} onChange={handleChange} disabled={positionRank === 1} />
                  </FieldRow>
                  <div style={{ height: '12px' }} />
                  <FieldRow>
                    <Md3TextField name="followUpFee"   label={positionRank === 1 ? "Follow-up Fee (Locked for Intern)" : `Follow-up Fee (${CURRENCY_SYMBOL})`}  type="number" value={positionRank === 1 ? '0' : formData.followUpFee}   onChange={handleChange} disabled={positionRank === 1} />
                  </FieldRow>
                </>
              )}

              {/* Nurse (General, OPD Nurse, IPD Nurse, or Lab Nurse) */}
              {['Nurse', 'OPD Nurse', 'IPD Nurse', 'Lab Nurse'].includes(selectedRoleName) && (
                <>
                  <SectionHeader icon="medical_services" title={`${selectedRoleName} Credentials`} />
                  <FieldRow>
                    <Md3TextField name="nursingLicenseNumber"  label="Nursing License No. *" value={formData.nursingLicenseNumber}  onChange={handleChange} error={fieldErrors.nursingLicenseNumber} />
                    <Md3Select    name="nursingSpecialization" label="Nursing Specialization" value={formData.nursingSpecialization} onChange={handleChange} options={toOpts(NURSE_SPECIALIZATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Laboratory */}
              {selectedRoleName === 'Laboratory' && (
                <>
                  <SectionHeader icon="biotech" title="Laboratory Credentials" />
                  <FieldRow>
                    <Md3TextField name="labCertificationCode" label="Lab Certification Code *" value={formData.labCertificationCode} onChange={handleChange} error={fieldErrors.labCertificationCode} />
                    <Md3Select    name="labQualification"     label="Lab Qualification"          value={formData.labQualification}     onChange={handleChange} options={toOpts(LAB_QUALIFICATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Pharmacy */}
              {selectedRoleName === 'Pharmacy' && (
                <>
                  <SectionHeader icon="medication" title="Pharmacy Credentials" />
                  <FieldRow>
                    <Md3TextField name="pharmacyLicenseNumber" label="Pharmacy License No. *" value={formData.pharmacyLicenseNumber} onChange={handleChange} error={fieldErrors.pharmacyLicenseNumber} />
                    <Md3Select    name="pharmacyQualification" label="Pharmacy Qualification"        value={formData.pharmacyQualification} onChange={handleChange} options={toOpts(PHARMACY_QUALIFICATIONS)} />
                  </FieldRow>
                </>
              )}

              {/* Reception / Administrator / Ward Operations / Billing */}
              {(selectedRoleName === 'Reception' || selectedRoleName === 'Administrator' || selectedRoleName === 'Ward Operations' || selectedRoleName === 'Billing') && (
                <div style={{ padding: '16px', background: 'var(--md-sys-color-surface-container)', borderRadius: '12px', marginTop: '8px', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>verified</span>
                    Non-Clinical Administration Profile
                  </div>
                  No statutory medical/nursing license is required for this position. Academic qualifications and work experience listed above constitute the primary credential baseline.
                </div>
              )}

              {/* Credential Upload for Clinical and Support Staff */}
              <SectionHeader icon="verified_user" title="Credentials & Verification Documents (Optional)" />
              <Md3FileUploader
                value={formData.verificationDocument}
                onChange={(val) => setFormData(prev => ({ ...prev, verificationDocument: val }))}
                disabled={loading}
              />
            </>
          )}

          {/* ════ STEP 4 — Account Setup ════ */}
          {currentStep === 4 && (
            <>
              <SectionHeader icon="manage_accounts" title="Login Credentials" />
              {staff && (staff.isLocked || staff.accountStatus === 'Locked') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  background: 'color-mix(in srgb, #b26a00 12%, transparent)',
                  border: '1px solid color-mix(in srgb, #b26a00 30%, transparent)',
                  borderRadius: '10px',
                  color: '#b26a00',
                  fontSize: '13px'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>lock</span>
                  <span><strong>Account Locked:</strong> This account is currently locked due to consecutive failed login attempts. Saving changes or resetting the password will automatically unblock the user.</span>
                </div>
              )}
              <div className="md3-staff-info-card">
                <strong>{staff ? 'Account Update Note:' : 'Note:'}</strong>{' '}
                {staff
                  ? 'Update username or enter a new password to reset the staff credentials. Leave password blank to keep current credentials unchanged.'
                  : 'A temporary password will be created. The staff member must change it upon their first login.'}
              </div>

              <Md3TextField
                name="username"
                label={staff ? "Username (Login Handle) *" : "Username *"}
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. EMP000245 (auto-generated, editable)"
                error={fieldErrors.username}
              />
              <div className="md3-staff-field-gap" />

              {!staff && (
                <>
                  <Md3TextField
                    name="password"
                    label="Temporary Password *"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters (staff must change on first login)"
                    error={fieldErrors.password}
                  />
                  <div className="md3-staff-field-gap" />
                </>
              )}

              {staff && (
                <>
                  <Md3TextField
                    name="password"
                    label="New Password (leave blank to keep current)"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep existing password"
                    error={fieldErrors.password}
                  />
                  <div className="md3-staff-field-gap" />
                </>
              )}

              <SectionHeader icon="info" title="Registration Summary" />
              <div className="md3-staff-summary-card">
                {[
                  ['Full Name',       formData.fullName       || '—'],
                  ['Role',            roles.find(r => r._id === formData.roleId)?.name || '—'],
                  ['Position',        formData.position ? `${formData.position}${positionRank ? ` (Rank ${positionRank})` : ''}` : '—'],
                  ['Tariff Grade',    formData.tariffGrade || (positionRank ? getTariffGrade(positionRank) : '—')],
                  ['Department',      departments.find(d => d._id === formData.departmentId)?.name || '—'],
                  ['Employment Type', formData.employmentType  || '—'],
                  ['Shift',           formData.shift           || 'General / Day'],
                  ['Joining Date',    formData.joiningDate     || '—'],
                  ['Email',           formData.email           || '—'],
                  ['Phone',           formData.phone           || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="md3-staff-summary-row">
                    <span className="md3-staff-summary-label">{label}</span>
                    <span className="md3-staff-summary-value">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </form>

        {/* ── Navigation Footer ── */}
        <div className="md3-staff-sheet-footer">
          <div>
            {currentStep > 1 && (
              <Md3Button variant="text" onClick={() => setCurrentStep(s => s - 1)} type="button">
                ← Back
              </Md3Button>
            )}
            {currentStep === 1 && (
              <Md3Button variant="text" onClick={handleAttemptClose} type="button">Cancel</Md3Button>
            )}
          </div>

          <div className="md3-staff-footer-actions">
            <span className="md3-staff-step-counter">
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
                loadingText={uploadStatusMessage || (staff ? 'Saving...' : 'Creating...')}
                disabled={loading || !isStep4Valid()}
              >
                {staff ? 'Save Changes' : 'Create Account'}
              </Md3Button>
            )}
          </div>
        </div>
      </div>
    </div>

    <Md3UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      title="Discard unsaved changes?"
      message={staff
        ? "You have modified details in this staff profile. If you exit now, these unsaved edits will be discarded."
        : "You have unsaved progress in this staff registration form. If you discard, all entered data will be lost."
      }
      confirmLabel="Discard & Exit"
      cancelLabel="Keep Editing"
      saveDraftLabel={!staff ? "Save as Draft & Exit" : undefined}
      onConfirm={handleConfirmDiscard}
      onCancel={() => setShowDiscardConfirm(false)}
      onSaveDraft={!staff ? handleSaveDraftAndClose : undefined}
    />
  </>,
  document.body
);
};


export default CreateStaffSheet;


