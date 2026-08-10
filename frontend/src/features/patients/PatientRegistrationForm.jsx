import React, { useState, useEffect } from 'react';
import { patientAPI } from '../../services/patientAPI';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import api from '../../services/api';
import { Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';
import './PatientRegistrationForm.css';

const PatientRegistrationForm = ({ onSuccess, onCancel }) => {
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
    // Address
    street: '',
    city: '',
    state: '',
    pinCode: '',
    // Visit & Payment
    visitType: 'OPD',
    departmentId: '',
    doctorId: '',
    reasonForVisit: '',
    registrationFee: 0,
    consultationFee: 500,
    paymentMethod: 'Cash'
  };

  const [form, setForm] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isReviewingDuplicates, setIsReviewingDuplicates] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, staffRes] = await Promise.allSettled([
          api.get('/departments'),
          staffAPI.list(1, 100)
        ]);

        if (deptRes.status === 'fulfilled') {
          setDepartments(deptRes.value.data.data || []);
        }

        if (staffRes.status === 'fulfilled') {
          setDoctors((staffRes.value.data.items || []).filter((s) => s.roleId?.name === 'Doctor'));
        }
      } catch (err) {
        console.error('Failed to load departments/doctors dropdown data', err);
      }
    };

    fetchDropdowns();
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Strict input guards to block invalid characters and restrict length
    if (name === 'firstName' || name === 'lastName' || name === 'emergencyContactName') {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    } else if (name === 'phone' || name === 'whatsapp' || name === 'emergencyContactPhone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'aadhaar') {
      value = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'pinCode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error when user starts typing
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setError(null);
  };

  const validateForm = () => {
    const errors = {};
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
      errors.phone = 'Mobile phone is required';
    } else if (form.phone.trim().length !== 10) {
      errors.phone = 'Mobile phone must be exactly 10 digits';
    }

    if (form.whatsapp.trim() && form.whatsapp.trim().length !== 10) {
      errors.whatsapp = 'WhatsApp number must be exactly 10 digits';
    }

    if (form.emergencyContactPhone.trim() && form.emergencyContactPhone.trim().length !== 10) {
      errors.emergencyContactPhone = 'Emergency contact phone must be exactly 10 digits';
    }

    if (form.aadhaar.trim() && form.aadhaar.trim().length !== 12) {
      errors.aadhaar = 'Aadhaar number must be exactly 12 digits';
    }

    if (form.pinCode.trim() && form.pinCode.trim().length !== 6) {
      errors.pinCode = 'PIN code must be exactly 6 digits';
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate Department/Doctor if OPD
    if (form.visitType === 'OPD') {
      if (!form.departmentId) errors.departmentId = 'Please select a department for OPD';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const bypassCheckRef = React.useRef(false);

  const handleCreateVisitForExisting = async (existingPatientId) => {
    setLoading(true);
    setError(null);
    try {
      const visitPayload = {
        patientId: existingPatientId,
        visitType: form.visitType,
        ...(form.departmentId && { departmentId: form.departmentId }),
        ...(form.doctorId && { doctorId: form.doctorId }),
        ...(form.reasonForVisit && { reasonForVisit: form.reasonForVisit }),
        receptionPayment: {
          registrationFee: 0, // usually 0 for returning patients
          consultationFee: Number(form.consultationFee) || 0,
          paymentMethod: form.paymentMethod
        }
      };

      const visitResult = await visitAPI.create(visitPayload);
      
      setForm(initialFormData);
      setFieldErrors({});
      setIsReviewingDuplicates(false);
      setDuplicateMatches([]);
      
      if (onSuccess) {
        // We need the existing patient details, but for now we can just return the ID if we don't have the full object structured perfectly
        const matchedPatient = duplicateMatches.find(p => p._id === existingPatientId || p.id === existingPatientId);
        onSuccess({
          patient: matchedPatient,
          visit: visitResult.data.data || visitResult.data
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create visit for existing patient.');
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
      // Step 1: Register Patient
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

      // Step 2: Atomic Patient Registration & Visit Creation
      const registerPayload = {
        patient: patientPayload,
        visit: {
          visitType: form.visitType,
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

      setForm(initialFormData);
      setFieldErrors({});
      if (onSuccess) {
        onSuccess({
          patient: result.data?.patient || result.patient,
          visit: result.data?.visit || result.visit
        });
      }
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
          We found existing patients matching these details. If this is a returning patient, please create a visit for their existing record to avoid duplicate MRNs.
        </p>
        
        <div className="duplicate-list">
          {duplicateMatches.map(match => (
            <div key={match._id} className={`duplicate-card match-${match.matchConfidence?.toLowerCase()}`}>
              <div className="duplicate-card-main">
                <div className="duplicate-avatar">
                  {match.firstName[0]}{match.lastName[0]}
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
                  Create Visit for Existing Patient
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
            Ignore & Register as New Patient
          </button>
        </div>
      </div>
    );
  }

  return (
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

      {/* Section 1: Personal & Contact Info (Crucial) */}
      <div className="reg-section">
        <h4 className="reg-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          1. Personal & Contact Information
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
          <Md3TextField
            id="phone"
            name="phone"
            type="tel"
            label="Mobile Phone Number *"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            disabled={loading}
            error={fieldErrors.phone}
          />
          <Md3TextField
            id="whatsapp"
            name="whatsapp"
            type="tel"
            label="WhatsApp Number (Optional)"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="WhatsApp number"
            disabled={loading}
            error={fieldErrors.whatsapp}
          />
          <div className="col-span-2">
            <Md3TextField
              id="email"
              name="email"
              type="email"
              label="Email Address (Optional)"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. patient@example.com"
              disabled={loading}
              error={fieldErrors.email}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Identity & Emergency Contact */}
      <div className="reg-section">
        <h4 className="reg-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="13" y2="12" />
          </svg>
          2. Identity & Emergency Contact
        </h4>

        <div className="reg-grid-2">
          <Md3TextField
            id="aadhaar"
            name="aadhaar"
            label="Aadhaar Number (12 digits)"
            value={form.aadhaar}
            onChange={handleChange}
            placeholder="12-digit Aadhaar ID"
            disabled={loading}
            error={fieldErrors.aadhaar}
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
            id="emergencyContactName"
            name="emergencyContactName"
            label="Emergency Contact Name"
            value={form.emergencyContactName}
            onChange={handleChange}
            placeholder="Contact person full name"
            disabled={loading}
            error={fieldErrors.emergencyContactName}
          />
          <Md3TextField
            id="emergencyContactRelation"
            name="emergencyContactRelation"
            label="Relation"
            value={form.emergencyContactRelation}
            onChange={handleChange}
            placeholder="e.g. Spouse, Parent, Sibling"
            disabled={loading}
            error={fieldErrors.emergencyContactRelation}
          />
          <div className="col-span-2">
            <Md3TextField
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              label="Emergency Contact Phone"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              placeholder="Emergency phone number"
              disabled={loading}
              error={fieldErrors.emergencyContactPhone}
            />
          </div>
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
          <Md3TextField
            id="city"
            name="city"
            label="City"
            value={form.city}
            onChange={handleChange}
            placeholder="e.g. Mumbai"
            disabled={loading}
          />
          <Md3TextField
            id="state"
            name="state"
            label="State"
            value={form.state}
            onChange={handleChange}
            placeholder="e.g. Maharashtra"
            disabled={loading}
          />
          <div className="col-span-2">
            <Md3TextField
              id="pinCode"
              name="pinCode"
              label="PIN Code"
              value={form.pinCode}
              onChange={handleChange}
              placeholder="6-digit postal code"
              disabled={loading}
              error={fieldErrors.pinCode}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Visit & Payment Details (Highlighted) */}
      <div className="reg-section reg-section-highlight">
        <h4 className="reg-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          4. Visit & Payment Configuration
        </h4>

        <div className="reg-grid-2">
          <Md3Select
            id="visitType"
            name="visitType"
            label="Visit Type *"
            value={form.visitType}
            onChange={handleChange}
            disabled={loading}
            options={[
              { value: 'OPD', label: 'OPD (Outpatient)' },
              { value: 'IPD', label: 'IPD (Inpatient - Future)' }
            ]}
          />
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
            {doctors
              .filter((d) => !form.departmentId || d.departmentId?._id === form.departmentId)
              .map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullName}
                </option>
              ))}
          </Md3Select>

          <Md3TextField
            id="reasonForVisit"
            name="reasonForVisit"
            label="Reason for Visit / Chief Complaint"
            value={form.reasonForVisit}
            onChange={handleChange}
            placeholder="e.g. Fever, Consultation"
            disabled={loading}
          />
        </div>

        <div className="reg-grid-3" style={{ marginTop: '8px' }}>
          <Md3TextField
            id="registrationFee"
            name="registrationFee"
            type="number"
            label="Registration Fee (₹)"
            value={form.registrationFee}
            onChange={handleChange}
            disabled={loading}
          />
          <Md3TextField
            id="consultationFee"
            name="consultationFee"
            type="number"
            label="Consultation Fee (₹)"
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
      </div>

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
          loadingText="Registering Patient..."
          style={{ width: 'auto', minWidth: '220px' }}
        >
          Register & Issue Slips
        </Md3Button>
      </div>
    </form>
  );
};

export default PatientRegistrationForm;
