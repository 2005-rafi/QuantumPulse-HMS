import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Country, State, City } from 'country-state-city';
import { patientAPI } from '../../services/patientAPI';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';
import { Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';
import BedAllocationPicker from '../../components/ipd/BedAllocationPicker';
import IpdAdmissionSlip from '../../components/ipd/IpdAdmissionSlip';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './PatientRegistrationForm.css';

export const PatientRegistrationForm = ({ onSuccess, onCancel }) => {
  const initialFormData = {
    // Personal Info
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    // Contact Info
    phone: '',
    whatsapp: '',
    email: '',
    // Identity & Emergency
    aadhaar: '',
    bloodGroup: 'Unknown',
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    // Address (Default India)
    country: 'India',
    countryCode: 'IN',
    state: '',
    stateCode: '',
    city: '',
    street: '',
    pinCode: '',
    // Workflow Encounter Configuration
    workflowType: 'OPD', // 'OPD' | 'IPD_MEDICAL' | 'IPD_SURGICAL' | 'NONE'
    departmentId: '',
    doctorId: '',
    reasonForVisit: '',
    registrationFee: 0,
    consultationFee: 500,
    paymentMethod: 'Cash',
    // Inpatient (IPD) Specific Configuration
    selectedBedId: '',
    selectedBed: null,
    admissionType: 'PLANNED', // 'PLANNED' | 'EMERGENCY' | 'SURGICAL' | 'TRANSFER'
    provisionalDiagnosis: '',
    chiefComplaints: '',
    carePlan: '',
    dietTier: 'REGULAR_DIET',
    initialDepositAmount: 0,
    depositPaymentMethod: 'Cash',
  };

  const [form, setForm] = useState(initialFormData);
  const [resolvedBedTariff, setResolvedBedTariff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isReviewingDuplicates, setIsReviewingDuplicates] = useState(false);
  
  // Printable slip state for generated admission
  const [generatedAdmission, setGeneratedAdmission] = useState(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, staffRes] = await Promise.allSettled([
          api.get('/departments'),
          staffAPI.list(1, 100)
        ]);

        if (deptRes.status === 'fulfilled') {
          setDepartments(deptRes.value.data?.data || deptRes.value.data || []);
        }

        if (staffRes.status === 'fulfilled') {
          const staffItems = staffRes.value.data?.items || staffRes.value.data?.data?.items || [];
          setDoctors(staffItems.filter((s) => s.roleId?.name === 'Doctor'));
        }
      } catch (err) {
        console.error('Failed to load departments/doctors dropdown data', err);
      }
    };

    fetchDropdowns();
  }, []);

  // Memoized Country, State, City lists
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
    const code = form.countryCode || 'IN';
    return State.getStatesOfCountry(code).map(s => ({
      value: s.name,
      label: s.name,
      isoCode: s.isoCode,
      name: s.name
    }));
  }, [form.countryCode]);

  const availableCities = useMemo(() => {
    const countryCode = form.countryCode || 'IN';
    let stateCode = form.stateCode;
    if (!stateCode && form.state) {
      const found = availableStates.find(s => s.name === form.state || s.isoCode === form.state);
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
  }, [form.countryCode, form.stateCode, form.state, availableStates]);

  // Filter available doctors by department
  const availableDoctors = useMemo(() => {
    if (!form.departmentId) return doctors;
    return doctors.filter((doc) => {
      const docDeptId = doc.departmentId?._id || doc.departmentId?.id || doc.departmentId;
      return String(docDeptId) === String(form.departmentId);
    });
  }, [doctors, form.departmentId]);

  // Auto-resolve authoritative bed tariff and minimum advance deposit for IPD Admissions
  useEffect(() => {
    if (form.encounterType !== 'IPD' || !form.selectedBedId) {
      setResolvedBedTariff(null);
      return;
    }

    let isMounted = true;
    const resolveBedPricing = async () => {
      try {
        const res = await ipdApi.resolveBedTariff({
          bedId: form.selectedBedId,
          wardClass: form.selectedBed?.wardClass,
          comfortTier: form.selectedBed?.comfortTier,
          sharingType: form.selectedBed?.sharingType,
          floorId: form.selectedBed?.floorId?._id || form.selectedBed?.floorId,
        });
        const tariff = res.data?.data;
        if (isMounted && tariff) {
          setResolvedBedTariff(tariff);
          setForm((prev) => ({
            ...prev,
            initialDepositAmount: tariff.minAdvanceDeposit != null ? tariff.minAdvanceDeposit : 0,
          }));
        }
      } catch (err) {
        console.warn('[PatientRegistrationForm] Bed tariff resolution error:', err);
      }
    };

    resolveBedPricing();
    return () => {
      isMounted = false;
    };
  }, [form.encounterType, form.selectedBedId, form.selectedBed]);

  const handleCountryChange = (e) => {
    const iso = e.target.value;
    const countryObj = allCountries.find(c => c.isoCode === iso);
    setForm(prev => ({
      ...prev,
      countryCode: iso,
      country: countryObj ? countryObj.name : iso,
      state: '',
      stateCode: '',
      city: '',
      pinCode: '',
    }));
    setFieldErrors(prev => ({ ...prev, phone: null, pinCode: null, aadhaar: null }));
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    const stObj = availableStates.find(s => s.name === val || s.isoCode === val);
    setForm(prev => ({
      ...prev,
      state: stObj ? stObj.name : val,
      stateCode: stObj ? stObj.isoCode : '',
      city: '',
    }));
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    const isIndia = form.countryCode === 'IN';
    
    // Strict input guards
    if (name === 'firstName' || name === 'lastName' || name === 'emergencyContactName') {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    } else if (name === 'phone' || name === 'whatsapp' || name === 'emergencyContactPhone') {
      value = isIndia ? value.replace(/\D/g, '').slice(0, 10) : value.replace(/[^\d+]/g, '').slice(0, 16);
    } else if (name === 'aadhaar') {
      value = isIndia ? value.replace(/\D/g, '').slice(0, 12) : value.slice(0, 20);
    } else if (name === 'pinCode') {
      value = isIndia ? value.replace(/\D/g, '').slice(0, 6) : value.slice(0, 10);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setError(null);
  };

  const validateForm = () => {
    const errors = {};
    const isIndia = form.countryCode === 'IN';

    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (!/^[a-zA-Z]/.test(form.firstName.trim())) {
      errors.firstName = 'First name must start with a letter';
    }

    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z]/.test(form.lastName.trim())) {
      errors.lastName = 'Last name must start with a letter';
    }

    if (!form.dob) errors.dob = 'Date of birth is required';
    if (!form.gender) errors.gender = 'Gender is required';
    
    if (!form.phone.trim()) {
      errors.phone = 'Contact phone number is required';
    } else if (isIndia && form.phone.trim().length !== 10) {
      errors.phone = 'Indian mobile phone must be exactly 10 digits';
    } else if (!isIndia && (form.phone.trim().length < 7 || form.phone.trim().length > 15)) {
      errors.phone = 'International phone number must be 7-15 digits';
    }

    if (form.whatsapp.trim()) {
      if (isIndia && form.whatsapp.trim().length !== 10) {
        errors.whatsapp = 'WhatsApp number must be exactly 10 digits';
      }
    }

    if (form.emergencyContactPhone.trim()) {
      if (isIndia && form.emergencyContactPhone.trim().length !== 10) {
        errors.emergencyContactPhone = 'Emergency contact phone must be exactly 10 digits';
      }
    }

    if (isIndia && form.aadhaar.trim() && form.aadhaar.trim().length !== 12) {
      errors.aadhaar = 'Aadhaar number must be exactly 12 digits';
    }

    if (isIndia && form.pinCode.trim() && form.pinCode.trim().length !== 6) {
      errors.pinCode = 'PIN code must be exactly 6 digits';
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Workflow Specific Validation
    if (form.workflowType === 'OPD') {
      if (!form.departmentId) errors.departmentId = 'Please select an outpatient department';
    } else if (form.workflowType === 'IPD_MEDICAL' || form.workflowType === 'IPD_SURGICAL') {
      if (!form.departmentId) errors.departmentId = 'Please select an admitting clinical department';
      if (!form.doctorId) errors.doctorId = 'Attending doctor / surgeon is required for IPD';
      if (!form.selectedBedId) errors.selectedBedId = 'Please select a vacant bed from the live bed map';
      if (!form.provisionalDiagnosis.trim()) errors.provisionalDiagnosis = 'Provisional diagnosis is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const bypassCheckRef = useRef(false);

  const handleCreateVisitForExisting = async (existingPatientId) => {
    setLoading(true);
    setError(null);
    try {
      if (form.workflowType === 'IPD_MEDICAL' || form.workflowType === 'IPD_SURGICAL') {
        const admissionPayload = {
          patientId: existingPatientId,
          primaryDoctorId: form.doctorId,
          admittingDepartmentId: form.departmentId,
          bedId: form.selectedBedId,
          admissionType: form.workflowType === 'IPD_SURGICAL' ? 'SURGICAL' : (form.admissionType || 'PLANNED'),
          provisionalDiagnosis: form.provisionalDiagnosis.trim(),
          chiefComplaints: form.chiefComplaints || form.reasonForVisit || '',
          carePlan: form.carePlan || '',
          dietTier: form.dietTier || 'REGULAR_DIET',
          initialDepositAmount: Number(form.initialDepositAmount) || 0,
          depositPaymentMethod: form.depositPaymentMethod || 'Cash',
        };
        const admitRes = await ipdApi.admitPatient(admissionPayload);
        const admissionData = admitRes.data?.data;
        
        const matchedPatient = duplicateMatches.find(p => p._id === existingPatientId || p.id === existingPatientId);
        setGeneratedAdmission({
          ...admissionData,
          patient: matchedPatient || { _id: existingPatientId },
          primaryDoctor: doctors.find(d => d._id === form.doctorId) || {},
          department: departments.find(d => d._id === form.departmentId) || {},
          bed: form.selectedBed || {},
        });
      } else {
        const visitPayload = {
          patientId: existingPatientId,
          visitType: form.workflowType === 'NONE' ? 'OPD' : form.workflowType,
          ...(form.departmentId && { departmentId: form.departmentId }),
          ...(form.doctorId && { doctorId: form.doctorId }),
          ...(form.reasonForVisit && { reasonForVisit: form.reasonForVisit }),
          receptionPayment: {
            registrationFee: 0,
            consultationFee: Number(form.consultationFee) || 0,
            paymentMethod: form.paymentMethod
          }
        };

        const visitResult = await visitAPI.create(visitPayload);
        const matchedPatient = duplicateMatches.find(p => p._id === existingPatientId || p.id === existingPatientId);
        if (onSuccess) {
          onSuccess({
            patient: matchedPatient,
            visit: visitResult.data?.data || visitResult.data
          });
        }
      }
      
      setForm(initialFormData);
      setFieldErrors({});
      setIsReviewingDuplicates(false);
      setDuplicateMatches([]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create encounter for existing patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateForm()) {
      setError('Please correct the highlighted fields before submitting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const patientPayload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        aadhaar: form.aadhaar ? form.aadhaar.trim() : null,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp ? form.whatsapp.trim() : null,
        email: form.email ? form.email.trim() : null,
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          stateCode: form.stateCode || '',
          country: form.country || 'India',
          countryCode: form.countryCode || 'IN',
          pinCode: form.pinCode.trim()
        },
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          relation: form.emergencyContactRelation.trim(),
          phone: form.emergencyContactPhone.trim()
        }
      };

      if (!bypassCheckRef.current && !isReviewingDuplicates) {
        const duplicatesRes = await patientAPI.checkDuplicates(patientPayload);
        if (duplicatesRes.data && duplicatesRes.data.length > 0) {
          setDuplicateMatches(duplicatesRes.data);
          setIsReviewingDuplicates(true);
          setLoading(false);
          return;
        }
      }

      // Case A: Direct IPD Admission (Medical or Surgical)
      if (form.workflowType === 'IPD_MEDICAL' || form.workflowType === 'IPD_SURGICAL') {
        const regRes = await patientAPI.register(patientPayload);
        const registeredPatient = regRes.data?.patient || regRes.data?.data || regRes.data;

        const admissionPayload = {
          patientId: registeredPatient._id,
          primaryDoctorId: form.doctorId,
          admittingDepartmentId: form.departmentId,
          bedId: form.selectedBedId,
          admissionType: form.workflowType === 'IPD_SURGICAL' ? 'SURGICAL' : (form.admissionType || 'PLANNED'),
          provisionalDiagnosis: form.provisionalDiagnosis.trim(),
          chiefComplaints: form.chiefComplaints || form.reasonForVisit || '',
          carePlan: form.carePlan || '',
          dietTier: form.dietTier || 'REGULAR_DIET',
          initialDepositAmount: Number(form.initialDepositAmount) || 0,
          depositPaymentMethod: form.depositPaymentMethod || 'Cash',
        };

        const admitRes = await ipdApi.admitPatient(admissionPayload);
        const admissionData = admitRes.data?.data;

        const completeSlipData = {
          ...admissionData,
          patient: registeredPatient,
          primaryDoctor: doctors.find(d => d._id === form.doctorId) || {},
          department: departments.find(d => d._id === form.departmentId) || {},
          bed: form.selectedBed || {},
          initialDepositAmount: form.initialDepositAmount,
          depositPaymentMethod: form.depositPaymentMethod,
        };

        setGeneratedAdmission(completeSlipData);

        if (onSuccess) {
          onSuccess({
            patient: registeredPatient,
            admission: admissionData,
            isIpd: true,
          });
        }
      }
      // Case B: Standard OPD Visit
      else if (form.workflowType === 'OPD') {
        const registerPayload = {
          patient: patientPayload,
          visit: {
            visitType: 'OPD',
            ...(form.departmentId && { departmentId: form.departmentId }),
            ...(form.doctorId && { doctorId: form.doctorId }),
            ...(form.reasonForVisit && { reasonForVisit: form.reasonForVisit }),
            receptionPayment: {
              registrationFee: Number(form.registrationFee) || 0,
              consultationFee: Number(form.consultationFee) || 0,
              paymentMethod: form.paymentMethod
            }
          }
        };

        const result = await patientAPI.registerWithVisit(registerPayload);
        if (onSuccess) {
          onSuccess({
            patient: result.data?.patient || result.patient,
            visit: result.data?.visit || result.visit,
            isIpd: false,
          });
        }
      }
      // Case C: Registration Only (No active visit)
      else {
        const regRes = await patientAPI.register(patientPayload);
        if (onSuccess) {
          onSuccess({
            patient: regRes.data?.patient || regRes.data?.data || regRes.data,
            visit: null,
            isIpd: false,
          });
        }
      }

      setForm(initialFormData);
      setFieldErrors({});
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (isReviewingDuplicates) {
    return (
      <div className="duplicate-review-container">
        <div className="duplicate-review-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="duplicate-warning-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3>Potential Duplicates Found</h3>
        </div>
        <p className="duplicate-review-desc">
          We found existing patients matching these details. If this is a returning patient, please create an encounter for their existing record to avoid duplicate MRNs.
        </p>
        
        <div className="duplicate-list">
          {duplicateMatches.map(match => (
            <div key={match._id} className={`duplicate-card match-${match.matchConfidence?.toLowerCase()}`}>
              <div className="duplicate-card-main">
                <div className="duplicate-avatar">
                  {match.firstName?.[0]}{match.lastName?.[0]}
                </div>
                <div className="duplicate-info">
                  <div className="duplicate-name-row">
                    <strong>{match.firstName} {match.lastName}</strong>
                    <span className="duplicate-mrn">{match.mrn}</span>
                  </div>
                  <div className="duplicate-details">
                    <span>Phone: {match.phone}</span>
                    <span className="dot-sep">•</span>
                    <span>DOB: {new Date(match.dob).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={`match-badge ${match.matchConfidence?.toLowerCase()}`}>
                  {match.matchConfidence} MATCH
                </div>
              </div>
              <div className="duplicate-card-actions">
                <button 
                  type="button"
                  className="md3-btn md3-btn--filled"
                  onClick={() => handleCreateVisitForExisting(match._id)}
                  disabled={loading}
                >
                  {form.workflowType.startsWith('IPD') ? 'Admit Existing Patient to IPD' : 'Create OPD Visit for Patient'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="duplicate-global-actions">
          <button 
            type="button"
            className="md3-btn md3-btn--outlined"
            onClick={() => {
              setIsReviewingDuplicates(false);
              setDuplicateMatches([]);
            }}
            disabled={loading}
          >
            Cancel / Edit Details
          </button>
          <button 
            type="button"
            className="md3-btn md3-btn--text duplicate-ignore-btn"
            onClick={() => {
              bypassCheckRef.current = true;
              setIsReviewingDuplicates(false);
              handleSubmit();
            }}
            disabled={loading}
          >
            Ignore &amp; Register as New Patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form className="patient-reg-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="reg-error-alert" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Personal Information */}
        <div className="reg-section">
          <h4 className="reg-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            1. Personal Information &amp; Demographics
          </h4>

          <div className="reg-grid-2">
            <Md3TextField
              id="firstName"
              name="firstName"
              label="First Name *"
              value={form.firstName}
              onChange={handleChange}
              placeholder="e.g. John"
              disabled={loading}
              error={fieldErrors.firstName}
            />
            <Md3TextField
              id="lastName"
              name="lastName"
              label="Last Name *"
              value={form.lastName}
              onChange={handleChange}
              placeholder="e.g. Doe"
              disabled={loading}
              error={fieldErrors.lastName}
            />
            <Md3TextField
              id="dob"
              name="dob"
              type="date"
              label="Date of Birth *"
              value={form.dob}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.dob}
            />
            <Md3Select
              id="gender"
              name="gender"
              label="Gender *"
              value={form.gender}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.gender}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' }
              ]}
            />
          </div>
        </div>

        {/* Section 2: Contact & Emergency */}
        <div className="reg-section">
          <h4 className="reg-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            2. Contact &amp; Emergency Information
          </h4>

          <div className="reg-grid-2">
            <Md3TextField
              id="phone"
              name="phone"
              type="tel"
              label={form.countryCode === 'IN' ? 'Mobile Phone (10 digits) *' : 'Phone Number *'}
              value={form.phone}
              onChange={handleChange}
              placeholder={form.countryCode === 'IN' ? '9876543210' : '+1 234 567 8900'}
              disabled={loading}
              error={fieldErrors.phone}
            />
            <Md3TextField
              id="whatsapp"
              name="whatsapp"
              type="tel"
              label={form.countryCode === 'IN' ? 'WhatsApp (Optional, 10 digits)' : 'WhatsApp (Optional)'}
              value={form.whatsapp}
              onChange={handleChange}
              placeholder={form.countryCode === 'IN' ? '9876543210' : '+1 234 567 8900'}
              disabled={loading}
              error={fieldErrors.whatsapp}
            />
            <Md3TextField
              id="email"
              name="email"
              type="email"
              label="Email Address (Optional)"
              value={form.email}
              onChange={handleChange}
              placeholder="patient@example.com"
              disabled={loading}
              error={fieldErrors.email}
            />
            <Md3Select
              id="bloodGroup"
              name="bloodGroup"
              label="Blood Group"
              value={form.bloodGroup}
              onChange={handleChange}
              disabled={loading}
              options={[
                { value: 'Unknown', label: 'Unknown' },
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' }
              ]}
            />
            <Md3TextField
              id="aadhaar"
              name="aadhaar"
              label={form.countryCode === 'IN' ? 'Aadhaar (12 digits, Optional)' : 'National ID / SSN (Optional)'}
              value={form.aadhaar}
              onChange={handleChange}
              placeholder={form.countryCode === 'IN' ? '123456789012' : 'ID number'}
              disabled={loading}
              error={fieldErrors.aadhaar}
            />
            <Md3TextField
              id="emergencyContactName"
              name="emergencyContactName"
              label="Emergency Contact Name"
              value={form.emergencyContactName}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              disabled={loading}
            />
            <Md3TextField
              id="emergencyContactRelation"
              name="emergencyContactRelation"
              label="Emergency Contact Relation"
              value={form.emergencyContactRelation}
              onChange={handleChange}
              placeholder="e.g. Spouse, Parent"
              disabled={loading}
            />
            <Md3TextField
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              label="Emergency Contact Phone"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              placeholder={form.countryCode === 'IN' ? '9876543210' : '+1 234 567 8900'}
              disabled={loading}
              error={fieldErrors.emergencyContactPhone}
            />
          </div>
        </div>

        {/* Section 3: Address Information */}
        <div className="reg-section">
          <h4 className="reg-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            3. Address Information
          </h4>

          <div className="reg-grid-2">
            <div className="col-span-2">
              <Md3Select
                id="country"
                name="countryCode"
                label="Country *"
                value={form.countryCode}
                onChange={handleCountryChange}
                disabled={loading}
                options={allCountries}
              />
            </div>
            {availableStates.length > 0 ? (
              <Md3Select
                id="state"
                name="state"
                label="State / Province *"
                value={form.state}
                onChange={handleStateChange}
                disabled={loading}
                options={[{ value: '', label: 'Select State / Province' }, ...availableStates]}
              />
            ) : (
              <Md3TextField
                id="state"
                name="state"
                label="State / Province"
                value={form.state}
                onChange={handleChange}
                placeholder="e.g. State / Region"
                disabled={loading}
              />
            )}
            {availableStates.length > 0 ? (
              <Md3Select
                id="city"
                name="city"
                label="City / Town"
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                disabled={loading || !form.state}
                options={[
                  {
                    value: '',
                    label: !form.state
                      ? 'Select State / Province First'
                      : (availableCities.length > 0 ? 'Select City / Town' : 'No cities listed (type in address)')
                  },
                  ...availableCities
                ]}
              />
            ) : (
              <Md3TextField
                id="city"
                name="city"
                label="City / Town"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. City / Town"
                disabled={loading}
              />
            )}
            <div className="col-span-2">
              <Md3TextField
                id="street"
                name="street"
                label="Street / House No. / Area"
                value={form.street}
                onChange={handleChange}
                placeholder="Full street address"
                disabled={loading}
              />
            </div>
            <div className="col-span-2">
              <Md3TextField
                id="pinCode"
                name="pinCode"
                label={form.countryCode === 'IN' ? 'PIN Code (6 digits)' : 'Postal / ZIP Code'}
                value={form.pinCode}
                onChange={handleChange}
                placeholder={form.countryCode === 'IN' ? '6-digit PIN code' : 'Postal code'}
                disabled={loading}
                error={fieldErrors.pinCode}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Workflow & Admission Configuration */}
        <div className="reg-section reg-section-highlight">
          <h4 className="reg-section-title">
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>medical_services</span>
            <span>4. Clinical Encounter &amp; Admission Workflow</span>
          </h4>

          {/* Workflow Selector */}
          <div className="reg-workflow-selector" role="radiogroup" aria-label="Select Clinical Workflow">
            <button
              type="button"
              className={`reg-workflow-btn ${form.workflowType === 'OPD' ? 'is-active' : ''}`}
              onClick={() => setForm(p => ({ ...p, workflowType: 'OPD' }))}
            >
              <span className="material-symbols-rounded">stethoscope</span>
              <div>
                <span className="reg-workflow-btn-label">OPD Walk-in</span>
                <span className="reg-workflow-btn-sub">Outpatient queue token</span>
              </div>
            </button>

            <button
              type="button"
              className={`reg-workflow-btn ${form.workflowType === 'IPD_MEDICAL' ? 'is-active' : ''}`}
              onClick={() => setForm(p => ({ ...p, workflowType: 'IPD_MEDICAL', admissionType: 'PLANNED' }))}
            >
              <span className="material-symbols-rounded">hotel</span>
              <div>
                <span className="reg-workflow-btn-label">Direct IPD Admission</span>
                <span className="reg-workflow-btn-sub">Bed allocation &amp; Nursing</span>
              </div>
            </button>

            <button
              type="button"
              className={`reg-workflow-btn ${form.workflowType === 'IPD_SURGICAL' ? 'is-active' : ''}`}
              onClick={() => setForm(p => ({ ...p, workflowType: 'IPD_SURGICAL', admissionType: 'SURGICAL' }))}
            >
              <span className="material-symbols-rounded">surgical</span>
              <div>
                <span className="reg-workflow-btn-label">Surgical / OT</span>
                <span className="reg-workflow-btn-sub">Pre/Post-Op admission</span>
              </div>
            </button>

            <button
              type="button"
              className={`reg-workflow-btn ${form.workflowType === 'NONE' ? 'is-active' : ''}`}
              onClick={() => setForm(p => ({ ...p, workflowType: 'NONE' }))}
            >
              <span className="material-symbols-rounded">how_to_reg</span>
              <div>
                <span className="reg-workflow-btn-label">Registration Only</span>
                <span className="reg-workflow-btn-sub">Create master record</span>
              </div>
            </button>
          </div>

          {/* Sub-form A: OPD Outpatient Configuration */}
          {form.workflowType === 'OPD' && (
            <div className="reg-grid-2">
              <Md3Select
                id="departmentId"
                name="departmentId"
                label="Department *"
                value={form.departmentId}
                onChange={handleChange}
                disabled={loading}
                error={fieldErrors.departmentId}
              >
                <option value="">-- Select Clinical Department --</option>
                {departments
                  .filter((d) => d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC')
                  .map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
              </Md3Select>

              <Md3Select
                id="doctorId"
                name="doctorId"
                label="Assigned Doctor (Optional)"
                value={form.doctorId}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">-- Any Available Doctor --</option>
                {availableDoctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.fullName}
                  </option>
                ))}
              </Md3Select>

              <div className="col-span-2">
                <Md3TextField
                  id="reasonForVisit"
                  name="reasonForVisit"
                  label="Reason for Visit / Chief Complaint"
                  value={form.reasonForVisit}
                  onChange={handleChange}
                  placeholder="e.g. Fever, Routine checkup"
                  disabled={loading}
                />
              </div>

              <Md3TextField
                id="consultationFee"
                name="consultationFee"
                type="number"
                label={`Consultation Fee (${CURRENCY_SYMBOL})`}
                value={form.consultationFee}
                onChange={handleChange}
                disabled={loading}
              />
              <Md3Select
                id="paymentMethod"
                name="paymentMethod"
                label="Payment Method *"
                value={form.paymentMethod}
                onChange={handleChange}
                disabled={loading}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Card', label: 'Card' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Insurance', label: 'Insurance' }
                ]}
              />
            </div>
          )}

          {/* Sub-form B: IPD Inpatient & Surgical Admission Configuration */}
          {(form.workflowType === 'IPD_MEDICAL' || form.workflowType === 'IPD_SURGICAL') && (
            <div className="reg-ipd-highlight-box">
              {/* Doctor & Department */}
              <div className="reg-grid-2">
                <Md3Select
                  id="departmentId"
                  name="departmentId"
                  label="Admitting Department *"
                  value={form.departmentId}
                  onChange={handleChange}
                  disabled={loading}
                  error={fieldErrors.departmentId}
                >
                  <option value="">-- Select Inpatient Department --</option>
                  {departments
                    .filter((d) => d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC')
                    .map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                </Md3Select>

                <Md3Select
                  id="doctorId"
                  name="doctorId"
                  label={form.workflowType === 'IPD_SURGICAL' ? 'Primary Operating Surgeon *' : 'Attending Physician *'}
                  value={form.doctorId}
                  onChange={handleChange}
                  disabled={loading}
                  error={fieldErrors.doctorId}
                >
                  <option value="">-- Select Attending Consultant --</option>
                  {availableDoctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.fullName}
                    </option>
                  ))}
                </Md3Select>
              </div>

              {/* Interactive Bed Allocation Picker with Gender Segregation */}
              <BedAllocationPicker
                selectedBedId={form.selectedBedId}
                onSelectBed={(bedObj) => {
                  setForm(prev => ({
                    ...prev,
                    selectedBedId: bedObj._id,
                    selectedBed: bedObj
                  }));
                  setFieldErrors(prev => ({ ...prev, selectedBedId: null }));
                }}
                patientGender={form.gender}
                error={fieldErrors.selectedBedId}
              />

              {/* Authoritative Live Bed Tariff Banner */}
              {resolvedBedTariff && (
                <div
                  style={{
                    background: 'var(--md-sys-color-surface-container-low, #f7fbf8)',
                    border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary, #006a57)', fontSize: '20px' }}>
                      price_check
                    </span>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>
                        Authoritative Bed Tariff: {CURRENCY_SYMBOL}{resolvedBedTariff.dailyRate}/day
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>
                        Hourly: {CURRENCY_SYMBOL}{resolvedBedTariff.hourlyRate}/hr • Grace: {resolvedBedTariff.gracePeriodMinutes || 60}m
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block' }}>
                      Required Min Advance Deposit
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: resolvedBedTariff.minAdvanceDeposit > 0 ? '#b45309' : 'inherit' }}>
                      {CURRENCY_SYMBOL}{resolvedBedTariff.minAdvanceDeposit ?? 0}
                    </strong>
                  </div>
                </div>
              )}

              {/* Diagnosis, Care Plan & Diet */}
              <div className="reg-grid-2">
                <Md3TextField
                  id="provisionalDiagnosis"
                  name="provisionalDiagnosis"
                  label="Provisional Diagnosis *"
                  value={form.provisionalDiagnosis}
                  onChange={handleChange}
                  placeholder="e.g. Acute Appendicitis, Severe Dengue"
                  disabled={loading}
                  error={fieldErrors.provisionalDiagnosis}
                />

                <Md3Select
                  id="dietTier"
                  name="dietTier"
                  label="Inpatient Diet Tier *"
                  value={form.dietTier}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: 'REGULAR_DIET', label: 'Regular Hospital Diet' },
                    { value: 'DIABETIC_DIET', label: 'Diabetic Diet' },
                    { value: 'RENAL_DIET', label: 'Renal Diet' },
                    { value: 'HIGH_PROTEIN', label: 'High Protein Diet' },
                    { value: 'SOFT_DIET', label: 'Soft / Semi-Solid Diet' },
                    { value: 'LIQUID_DIET', label: 'Clear Liquid Diet' },
                    { value: 'NPO', label: 'NPO (Nil Per Os - Fasting)' }
                  ]}
                />

                <div className="col-span-2">
                  <Md3TextField
                    id="chiefComplaints"
                    name="chiefComplaints"
                    label="Chief Complaints &amp; Admission Notes"
                    value={form.chiefComplaints}
                    onChange={handleChange}
                    placeholder="e.g. High fever with abdominal pain since 3 days"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Advance Financial Deposit */}
              <div className="reg-grid-2">
                <Md3TextField
                  id="initialDepositAmount"
                  name="initialDepositAmount"
                  type="number"
                  label={`Initial Advance Deposit (${CURRENCY_SYMBOL})`}
                  value={form.initialDepositAmount}
                  onChange={handleChange}
                  disabled={loading}
                />
                <Md3Select
                  id="depositPaymentMethod"
                  name="depositPaymentMethod"
                  label="Deposit Payment Method *"
                  value={form.depositPaymentMethod}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Card', label: 'Credit / Debit Card' },
                    { value: 'UPI', label: 'UPI / Digital' },
                    { value: 'Insurance', label: 'Insurance Pre-Auth' }
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="reg-submit-row">
          {onCancel && (
            <Md3Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              style={{ width: 'auto', minWidth: '120px' }}
            >
              Cancel
            </Md3Button>
          )}
          <Md3Button
            type="submit"
            disabled={loading}
            loading={loading}
            loadingText={
              form.workflowType.startsWith('IPD')
                ? 'Allocating Bed & Admitting Patient...'
                : 'Registering Patient...'
            }
            style={{ width: 'auto', minWidth: '240px' }}
          >
            {form.workflowType === 'OPD'
              ? 'Register & Issue OPD Ticket'
              : form.workflowType === 'IPD_MEDICAL'
              ? 'Register & Admit to IPD'
              : form.workflowType === 'IPD_SURGICAL'
              ? 'Register for Surgical Admission'
              : 'Register Patient Only'}
          </Md3Button>
        </div>
      </form>

      {/* Generated IPD Admission Slip Modal */}
      {generatedAdmission && (
        <IpdAdmissionSlip
          admissionData={generatedAdmission}
          isOpen={!!generatedAdmission}
          onClose={() => setGeneratedAdmission(null)}
        />
      )}
    </>
  );
};

export default PatientRegistrationForm;
