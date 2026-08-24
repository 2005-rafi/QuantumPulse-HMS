import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import CommonHeader from '../components/shell/CommonHeader';
import { CURRENCY_SYMBOL } from '../constants/currency';
import ThemePreferences from '../components/theme/ThemePreferences';
import { usePatientLayoutPreference } from '../hooks/usePatientLayoutPreference';
import './UserProfilePage.css';

// Permission module groupings for human-readable Access tab display
const PERMISSION_MODULES = [
  {
    module: 'Patient Management',
    icon: 'personal_injury',
    description: 'Patient registration, search, records, and profile updates',
    codes: [
      { code: 'PATIENT_VIEW', label: 'View Patient Records', description: 'Access patient demographics and history' },
      { code: 'PATIENT_REGISTER', label: 'Register New Patients', description: 'Create and register new patient files' },
      { code: 'PATIENT_UPDATE', label: 'Update Patient Records', description: 'Modify patient demographics and contact details' },
      { code: 'PATIENT_DELETE', label: 'Archive / Delete Patients', description: 'Request patient record deletion' },
    ],
  },
  {
    module: 'Clinical Consultations & OPD',
    icon: 'stethoscope',
    description: 'Clinical notes, vital signs, prescriptions, and diagnosis',
    codes: [
      { code: 'NOTE_OPEN', label: 'Open Clinical Notes', description: 'Initiate new consultation notes' },
      { code: 'NOTE_UPDATE', label: 'Edit Clinical Notes', description: 'Draft and modify consultation documentation' },
      { code: 'NOTE_FINALIZE', label: 'Finalize Notes', description: 'Sign off and lock clinical encounter notes' },
      { code: 'NOTE_AMEND', label: 'Amend Finalized Notes', description: 'Add addendums to finalized notes' },
      { code: 'VITALS_RECORD', label: 'Record Vital Signs', description: 'Capture triage and clinical vitals' },
      { code: 'RX_CREATE', label: 'Prescribe Medications', description: 'Create electronic prescriptions' },
      { code: 'RX_CANCEL', label: 'Cancel Prescriptions', description: 'Revoke or cancel active medication orders' },
    ],
  },
  {
    module: 'Laboratory & Diagnostics',
    icon: 'science',
    description: 'Lab test ordering, specimen processing, and test verification',
    codes: [
      { code: 'LAB_ORDER_CREATE', label: 'Create Lab Orders', description: 'Order diagnostic tests for patients' },
      { code: 'LAB_PROCESS', label: 'Process Lab Tests', description: 'Enter test results and specimen findings' },
      { code: 'LAB_VERIFY', label: 'Verify Test Results', description: 'Validate and approve final lab reports' },
      { code: 'LAB_MANAGE', label: 'Lab Catalog Management', description: 'Configure test parameters and ranges' },
    ],
  },
  {
    module: 'Pharmacy & Dispensing',
    icon: 'medication',
    description: 'Prescription dispensing, medication verification, and pharmacy billing',
    codes: [
      { code: 'MEDICINE_DISPENSE', label: 'Dispense Medications', description: 'Fulfill prescriptions and dispense drugs' },
    ],
  },
  {
    module: 'Billing & Cashier',
    icon: 'payments',
    description: 'Invoice generation, charges management, and payment receipts',
    codes: [
      { code: 'BILL_GENERATE', label: 'Generate Bills & Invoices', description: 'Calculate and generate OPD invoices' },
      { code: 'PAYMENT_RECORD', label: 'Record Payment Receipts', description: 'Collect and record patient payments' },
    ],
  },
  {
    module: 'Appointments & Scheduling',
    icon: 'event',
    description: 'Doctor slot booking, scheduling, check-ins, and cancellations',
    codes: [
      { code: 'APPOINTMENT_VIEW', label: 'View Appointments', description: 'View appointment lists and schedules' },
      { code: 'APPOINTMENT_CREATE', label: 'Book Appointments', description: 'Schedule new patient appointments' },
      { code: 'APPOINTMENT_UPDATE', label: 'Reschedule Appointments', description: 'Change appointment date and time' },
      { code: 'APPOINTMENT_CANCEL', label: 'Cancel Appointments', description: 'Cancel scheduled appointments' },
      { code: 'APPOINTMENT_CHECKIN', label: 'Check-In Patients', description: 'Mark patients arrived and check them in' },
      { code: 'APPOINTMENT_MARK_MISSED', label: 'Mark No-Show', description: 'Flag missed patient appointments' },
      { code: 'APPOINTMENT_MANAGE', label: 'Manage All Appointments', description: 'Full administrative control over appointments' },
      { code: 'APPOINTMENT_MANAGE_SCHEDULE', label: 'Manage Doctor Rosters', description: 'Configure clinician schedules and slots' },
    ],
  },
  {
    module: 'System Administration & Security',
    icon: 'admin_panel_settings',
    description: 'User access control, deletion approvals, and audit trail analysis',
    codes: [
      { code: 'MANAGE_USERS', label: 'Manage Staff & Roles', description: 'Create, update, and configure staff accounts' },
      { code: 'APPROVE_DELETION', label: 'Approve Record Deletion', description: 'Authorize permanent record removals' },
      { code: 'VIEW_AUDIT', label: 'View Audit Logs', description: 'Access immutable system security audit logs' },
    ],
  },
];

const UserProfilePage = () => {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useToast();
  const { layout: patientLayout, isListView: isPatientList, isCardView: isPatientCards, setLayout: setPatientLayout } = usePatientLayoutPreference();
  const navigate = useNavigate();

  const [staffDetails, setStaffDetails] = useState(null);
  const [positionHistory, setPositionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch full staff profile details & position history on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.staffId) return;
      try {
        setLoading(true);
        const [staffRes, historyRes] = await Promise.allSettled([
          api.get(`/staff/${user.staffId}`),
          api.get(`/staff/${user.staffId}/position-history`),
        ]);

        if (staffRes.status === 'fulfilled') {
          setStaffDetails(staffRes.value.data?.data);
        } else {
          showError('Failed to fetch profile details.');
        }

        if (historyRes.status === 'fulfilled') {
          setPositionHistory(historyRes.value.data?.data || []);
        }
      } catch (err) {
        showError('An unexpected error occurred while loading profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, showError]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = useMemo(() => {
    const name = staffDetails?.fullName || user?.fullName || '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [staffDetails, user]);

  const formattedDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formattedDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (doc) => {
    if (!doc?.url) return;
    try {
      const filename = doc.url.split('/').pop();
      const response = await api.get(`/staff/certificates/${filename}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', doc.fileName || 'certificate');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showError('Failed to download verification document.');
    }
  };

  // User permission codes list for quick checking
  const userPermissionCodes = useMemo(() => {
    if (staffDetails?.permissions && Array.isArray(staffDetails.permissions)) {
      return staffDetails.permissions.map((p) => (typeof p === 'string' ? p : p.code));
    }
    return user?.permissions || [];
  }, [staffDetails, user]);

  const roleName = staffDetails?.roleId?.name || user?.role || 'Staff';
  const accountStatus = staffDetails?.accountStatus || staffDetails?.status || 'Active';

  return (
    <div className="user-profile-page">
      {/* ─── Unified MD3 App Bar ─── */}
      <CommonHeader
        brandTitle="Staff Profile Console"
        brandSubtitle={staffDetails?.departmentId?.name || user?.department || 'CareOne HMS'}
        user={user}
        onLogout={handleLogout}
      />

      <div className="user-profile-content">
        {/* Navigation Action Bar */}
        <div className="profile-top-nav-bar">
          <button
            type="button"
            className="profile-nav-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Return to previous dashboard"
          >
            <span className="material-symbols-rounded">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
          <div className="profile-badge-summary">
            <span className="profile-emp-badge">
              <span className="material-symbols-rounded">badge</span>
              {staffDetails?.employeeId || user?.employeeId || 'EMP-0000'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="profile-loading-state">
            <div className="profile-loading-spinner" />
            <p className="profile-loading-text">Loading comprehensive staff profile...</p>
          </div>
        ) : staffDetails ? (
          <>
            {/* ─── Level 1: Profile Header Card (Hero) ─── */}
            <div className="profile-hero-card">
              <div className="profile-hero-avatar-wrap">
                <div className="profile-hero-avatar">{initials}</div>
                <div className={`profile-hero-status-dot profile-hero-status-dot--${accountStatus.toLowerCase()}`} />
              </div>

              <div className="profile-hero-main">
                <div className="profile-hero-title-row">
                  <div className="profile-hero-names">
                    <h1 className="profile-hero-name">{staffDetails.fullName}</h1>
                    <p className="profile-hero-position">
                      {staffDetails.position}
                      {staffDetails.positionRank ? ` (Rank ${staffDetails.positionRank})` : ''}
                    </p>
                  </div>
                  <div className="profile-hero-badges">
                    <span className={`profile-status-chip profile-status-chip--${accountStatus.toLowerCase()}`}>
                      <span className="material-symbols-rounded">
                        {accountStatus === 'Active' ? 'check_circle' : 'block'}
                      </span>
                      {accountStatus.toUpperCase()}
                    </span>
                    {staffDetails.verificationDocument && (
                      <span className="profile-verified-chip" title="Credentials verified by administrator">
                        <span className="material-symbols-rounded">verified</span>
                        VERIFIED CREDENTIALS
                      </span>
                    )}
                  </div>
                </div>

                <div className="profile-hero-meta-grid">
                  <div className="profile-hero-meta-item">
                    <span className="material-symbols-rounded">corporate_fare</span>
                    <span>{staffDetails.departmentId?.name || 'General Department'}</span>
                  </div>
                  <div className="profile-hero-meta-item">
                    <span className="material-symbols-rounded">shield_person</span>
                    <span>{roleName}</span>
                  </div>
                  <div className="profile-hero-meta-item">
                    <span className="material-symbols-rounded">mail</span>
                    <span>{staffDetails.email || 'No email registered'}</span>
                  </div>
                  <div className="profile-hero-meta-item">
                    <span className="material-symbols-rounded">call</span>
                    <span>{staffDetails.phone || 'No phone registered'}</span>
                  </div>
                  {staffDetails.reportingTo && (
                    <div className="profile-hero-meta-item">
                      <span className="material-symbols-rounded">supervisor_account</span>
                      <span>Reports to: {staffDetails.reportingTo.fullName}</span>
                    </div>
                  )}
                  {staffDetails.directReportsCount > 0 && (
                    <div className="profile-hero-meta-item">
                      <span className="material-symbols-rounded">groups</span>
                      <span>Direct Reports: {staffDetails.directReportsCount} Staff</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Level 2: Material 3 Navigation Tabs ─── */}
            <nav className="profile-tabs-bar" role="tablist" aria-label="Staff profile sections">
              <button
                role="tab"
                aria-selected={activeTab === 'overview'}
                className={`profile-tab-btn ${activeTab === 'overview' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span className="material-symbols-rounded">dashboard</span>
                <span>Overview</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'employment'}
                className={`profile-tab-btn ${activeTab === 'employment' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('employment')}
              >
                <span className="material-symbols-rounded">corporate_fare</span>
                <span>Employment &amp; Hierarchy</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'access'}
                className={`profile-tab-btn ${activeTab === 'access' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('access')}
              >
                <span className="material-symbols-rounded">lock</span>
                <span>Access &amp; Permissions</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'professional'}
                className={`profile-tab-btn ${activeTab === 'professional' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('professional')}
              >
                <span className="material-symbols-rounded">workspace_premium</span>
                <span>Professional Credentials</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'documents'}
                className={`profile-tab-btn ${activeTab === 'documents' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                <span className="material-symbols-rounded">folder_shared</span>
                <span>Documents</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'history'}
                className={`profile-tab-btn ${activeTab === 'history' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="material-symbols-rounded">history</span>
                <span>Position History</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'settings'}
                className={`profile-tab-btn ${activeTab === 'settings' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <span className="material-symbols-rounded">settings</span>
                <span>Settings &amp; Preferences</span>
              </button>
            </nav>

            {/* ─── Level 3: Tab Content Panels ─── */}
            <div className="profile-tab-content-area">

              {/* ─── TAB 1: OVERVIEW ─── */}
              {activeTab === 'overview' && (
                <div className="profile-grid-two-column">
                  {/* Personal & Demographics */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">badge</span>
                      <h2>Personal &amp; Demographic Identity</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Staff Employee ID</span>
                        <span className="profile-data-value profile-data-value--mono">{staffDetails.employeeId}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Full Name</span>
                        <span className="profile-data-value">{staffDetails.fullName}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Gender</span>
                        <span className="profile-data-value">{staffDetails.gender || 'Not specified'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Date of Birth</span>
                        <span className="profile-data-value">{formattedDate(staffDetails.dateOfBirth)}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Blood Group</span>
                        <span className="profile-data-value">
                          {staffDetails.bloodGroup ? (
                            <span className="profile-pill-tag">{staffDetails.bloodGroup}</span>
                          ) : '—'}
                        </span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Marital Status</span>
                        <span className="profile-data-value">{staffDetails.maritalStatus || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Nationality</span>
                        <span className="profile-data-value">{staffDetails.nationality || 'Indian'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Assignment & Organization */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">account_tree</span>
                      <h2>Current Hospital Assignment</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Department</span>
                        <span className="profile-data-value">{staffDetails.departmentId?.name || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Department Code</span>
                        <span className="profile-data-value profile-data-value--mono">
                          {staffDetails.departmentId?.code || '—'}
                        </span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Assigned Role</span>
                        <span className="profile-data-value">{roleName}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Organizational Position</span>
                        <span className="profile-data-value">{staffDetails.position}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Hierarchy Rank</span>
                        <span className="profile-data-value">Level {staffDetails.positionRank || 1}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Reporting Supervisor</span>
                        <span className="profile-data-value">
                          {staffDetails.reportingTo ? `${staffDetails.reportingTo.fullName} (${staffDetails.reportingTo.position})` : 'Independent / HOD'}
                        </span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Head of Department (HOD)</span>
                        <span className="profile-data-value">
                          {staffDetails.departmentId?.headOfDepartment?.fullName || 'Not assigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">contact_phone</span>
                      <h2>Contact &amp; Emergency Information</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Official Email</span>
                        <span className="profile-data-value">{staffDetails.email || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Primary Mobile</span>
                        <span className="profile-data-value">{staffDetails.phone || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Alternate Phone</span>
                        <span className="profile-data-value">{staffDetails.alternatePhone || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Residential Address</span>
                        <span className="profile-data-value profile-data-value--multiline">
                          {[staffDetails.addressLine1, staffDetails.addressLine2, staffDetails.city, staffDetails.state, staffDetails.postalCode]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Emergency Contact</span>
                        <span className="profile-data-value">
                          {staffDetails.emergencyContactName
                            ? `${staffDetails.emergencyContactName} (${staffDetails.emergencyContactNumber || 'No number'})`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Account Summary */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">security</span>
                      <h2>System Account &amp; Security Summary</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Login Username</span>
                        <span className="profile-data-value profile-data-value--mono">{staffDetails.username || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Account Status</span>
                        <span className="profile-data-value">
                          <span className={`profile-pill-status profile-pill-status--${accountStatus.toLowerCase()}`}>
                            {accountStatus}
                          </span>
                        </span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Last Successful Login</span>
                        <span className="profile-data-value">{formattedDateTime(staffDetails.lastLoginAt)}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Account Created Date</span>
                        <span className="profile-data-value">{formattedDate(staffDetails.accountCreatedAt || staffDetails.createdAt)}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Password Changed At</span>
                        <span className="profile-data-value">{formattedDateTime(staffDetails.passwordChangedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 2: EMPLOYMENT & HIERARCHY ─── */}
              {activeTab === 'employment' && (
                <div className="profile-grid-two-column">
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">work_history</span>
                      <h2>Employment Record &amp; Terms</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Staff Employee ID</span>
                        <span className="profile-data-value profile-data-value--mono">{staffDetails.employeeId}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Date of Joining</span>
                        <span className="profile-data-value">{formattedDate(staffDetails.joiningDate)}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Employment Type</span>
                        <span className="profile-data-value">{staffDetails.employmentType || 'Full-time'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Employment Status</span>
                        <span className="profile-data-value">{staffDetails.status || 'Active'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Shift Schedule</span>
                        <span className="profile-data-value">{staffDetails.shift || 'General / Rotational'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Years of Service</span>
                        <span className="profile-data-value">
                          {staffDetails.yearsOfExperience !== undefined ? `${staffDetails.yearsOfExperience} Years Experience` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Organizational Hierarchy Diagram Card */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">schema</span>
                      <h2>Organizational Reporting Structure</h2>
                    </div>
                    <div className="profile-hierarchy-tree">
                      {/* Department Level */}
                      <div className="hierarchy-node hierarchy-node--dept">
                        <span className="material-symbols-rounded">apartment</span>
                        <div className="hierarchy-node-content">
                          <span className="hierarchy-node-tag">Department</span>
                          <strong className="hierarchy-node-title">{staffDetails.departmentId?.name || 'General'}</strong>
                          <span className="hierarchy-node-sub">Code: {staffDetails.departmentId?.code || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="hierarchy-connector-line" />

                      {/* Supervisor / Reporting To */}
                      <div className="hierarchy-node hierarchy-node--supervisor">
                        <span className="material-symbols-rounded">supervisor_account</span>
                        <div className="hierarchy-node-content">
                          <span className="hierarchy-node-tag">Reporting Supervisor</span>
                          <strong className="hierarchy-node-title">
                            {staffDetails.reportingTo?.fullName || staffDetails.departmentId?.headOfDepartment?.fullName || 'Hospital Chief / Board'}
                          </strong>
                          <span className="hierarchy-node-sub">
                            {staffDetails.reportingTo?.position || 'Department Head / Executive'}
                          </span>
                        </div>
                      </div>

                      <div className="hierarchy-connector-line" />

                      {/* Current Staff (Active Highlight) */}
                      <div className="hierarchy-node hierarchy-node--current">
                        <span className="material-symbols-rounded">person</span>
                        <div className="hierarchy-node-content">
                          <span className="hierarchy-node-tag hierarchy-node-tag--active">This Employee</span>
                          <strong className="hierarchy-node-title">{staffDetails.fullName}</strong>
                          <span className="hierarchy-node-sub">
                            {staffDetails.position} (Rank {staffDetails.positionRank || 1})
                          </span>
                        </div>
                      </div>

                      {staffDetails.directReportsCount > 0 && (
                        <>
                          <div className="hierarchy-connector-line" />
                          <div className="hierarchy-node hierarchy-node--reports">
                            <span className="material-symbols-rounded">groups</span>
                            <div className="hierarchy-node-content">
                              <span className="hierarchy-node-tag">Subordinates</span>
                              <strong className="hierarchy-node-title">
                                {staffDetails.directReportsCount} Direct Report{staffDetails.directReportsCount > 1 ? 's' : ''}
                              </strong>
                              <span className="hierarchy-node-sub">Under supervision</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: ACCESS & PERMISSIONS ─── */}
              {activeTab === 'access' && (
                <div className="profile-access-container">
                  {/* Role Header Banner */}
                  <div className="profile-role-banner">
                    <div className="profile-role-icon">
                      <span className="material-symbols-rounded">verified_user</span>
                    </div>
                    <div className="profile-role-info">
                      <h2>{roleName} Role</h2>
                      <p>
                        {staffDetails.roleId?.description ||
                          'Configured with full system permissions and authorizations granted for hospital operations.'}
                      </p>
                    </div>
                    <div className="profile-permission-count-chip">
                      <span>{userPermissionCodes.length} Active Privileges</span>
                    </div>
                  </div>

                  {/* Grouped Permission Matrix */}
                  <div className="profile-permission-modules-grid">
                    {PERMISSION_MODULES.map((mod) => {
                      const activeInModule = mod.codes.filter((c) => userPermissionCodes.includes(c.code));
                      const isFullyActive = activeInModule.length === mod.codes.length;
                      const hasPartial = activeInModule.length > 0 && !isFullyActive;

                      return (
                        <div key={mod.module} className="profile-permission-module-card">
                          <div className="permission-module-header">
                            <div className="permission-module-title-wrap">
                              <span className="material-symbols-rounded permission-module-icon">{mod.icon}</span>
                              <div>
                                <h3>{mod.module}</h3>
                                <p>{mod.description}</p>
                              </div>
                            </div>
                            <span
                              className={`permission-status-pill ${
                                isFullyActive
                                  ? 'permission-status-pill--granted'
                                  : hasPartial
                                  ? 'permission-status-pill--partial'
                                  : 'permission-status-pill--denied'
                              }`}
                            >
                              {isFullyActive ? 'Full Access' : hasPartial ? `${activeInModule.length}/${mod.codes.length} Granted` : 'No Access'}
                            </span>
                          </div>

                          <div className="permission-items-list">
                            {mod.codes.map((item) => {
                              const isGranted = userPermissionCodes.includes(item.code);
                              return (
                                <div
                                  key={item.code}
                                  className={`permission-item-row ${isGranted ? 'permission-item-row--granted' : 'permission-item-row--denied'}`}
                                >
                                  <div className="permission-item-left">
                                    <span className="material-symbols-rounded permission-check-icon">
                                      {isGranted ? 'check_circle' : 'remove_circle_outline'}
                                    </span>
                                    <div>
                                      <span className="permission-item-label">{item.label}</span>
                                      <span className="permission-item-code">{item.code}</span>
                                    </div>
                                  </div>
                                  <span className={`permission-item-badge ${isGranted ? 'permission-item-badge--active' : ''}`}>
                                    {isGranted ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── TAB 4: PROFESSIONAL CREDENTIALS ─── */}
              {activeTab === 'professional' && (
                <div className="profile-grid-two-column">
                  {/* Qualifications & Degrees */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">school</span>
                      <h2>Academic &amp; Clinical Qualifications</h2>
                    </div>
                    <div className="profile-data-list">
                      <div className="profile-data-row">
                        <span className="profile-data-label">Primary Qualification</span>
                        <span className="profile-data-value">{staffDetails.primaryQualification || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Highest Qualification</span>
                        <span className="profile-data-value">{staffDetails.highestQualification || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Primary Specialization</span>
                        <span className="profile-data-value">{staffDetails.primarySpecialization || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Super Specialization</span>
                        <span className="profile-data-value">{staffDetails.superSpecialization || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Previous Institution / Hospital</span>
                        <span className="profile-data-value">{staffDetails.previousHospital || '—'}</span>
                      </div>
                      <div className="profile-data-row">
                        <span className="profile-data-label">Languages Known</span>
                        <span className="profile-data-value">
                          {staffDetails.languagesKnown && staffDetails.languagesKnown.length > 0 ? (
                            <div className="profile-chips-wrap">
                              {staffDetails.languagesKnown.map((lang, idx) => (
                                <span key={idx} className="profile-pill-tag">{lang}</span>
                              ))}
                            </div>
                          ) : 'English'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Licenses & Registrations */}
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">local_police</span>
                      <h2>Licenses &amp; Regulatory Authorizations</h2>
                    </div>
                    <div className="profile-data-list">
                      {roleName === 'Doctor' && (
                        <>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Medical License Number</span>
                            <span className="profile-data-value profile-data-value--mono">
                              {staffDetails.medicalLicenseNumber || '—'}
                            </span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Medical Council Authority</span>
                            <span className="profile-data-value">{staffDetails.medicalCouncil || 'State Medical Council'}</span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Registration Date</span>
                            <span className="profile-data-value">{formattedDate(staffDetails.licenseRegistrationDate)}</span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">License Expiry Date</span>
                            <span className="profile-data-value">{formattedDate(staffDetails.licenseExpiryDate)}</span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Consultation Mode</span>
                            <span className="profile-data-value">{staffDetails.consultationType || 'In-Person'}</span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Consulting Fee</span>
                            <span className="profile-data-value">{CURRENCY_SYMBOL}{staffDetails.consultingFee ?? '0.00'}</span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Follow-up Fee</span>
                            <span className="profile-data-value">{CURRENCY_SYMBOL}{staffDetails.followUpFee ?? '0.00'}</span>
                          </div>
                        </>
                      )}

                      {roleName === 'Nurse' && (
                        <>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Nursing License Number</span>
                            <span className="profile-data-value profile-data-value--mono">
                              {staffDetails.nursingLicenseNumber || '—'}
                            </span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Nursing Specialization</span>
                            <span className="profile-data-value">{staffDetails.nursingSpecialization || 'General Care'}</span>
                          </div>
                        </>
                      )}

                      {roleName === 'Laboratory' && (
                        <>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Lab Certification Code</span>
                            <span className="profile-data-value profile-data-value--mono">
                              {staffDetails.labCertificationCode || '—'}
                            </span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Lab Qualification</span>
                            <span className="profile-data-value">{staffDetails.labQualification || '—'}</span>
                          </div>
                        </>
                      )}

                      {roleName === 'Pharmacy' && (
                        <>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Pharmacy License Number</span>
                            <span className="profile-data-value profile-data-value--mono">
                              {staffDetails.pharmacyLicenseNumber || '—'}
                            </span>
                          </div>
                          <div className="profile-data-row">
                            <span className="profile-data-label">Pharmacy Qualification</span>
                            <span className="profile-data-value">{staffDetails.pharmacyQualification || '—'}</span>
                          </div>
                        </>
                      )}

                      {!['Doctor', 'Nurse', 'Laboratory', 'Pharmacy'].includes(roleName) && (
                        <div className="profile-data-row">
                          <span className="profile-data-label">Administrative Status</span>
                          <span className="profile-data-value">Hospital Operations &amp; Support</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 5: DOCUMENTS ─── */}
              {activeTab === 'documents' && (
                <div className="profile-documents-container">
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">verified</span>
                      <h2>Verified Credential Certificates &amp; Documents</h2>
                    </div>

                    {staffDetails.verificationDocument?.url ? (
                      <div className="profile-doc-card">
                        <div className="profile-doc-icon-wrap">
                          <span className="material-symbols-rounded">picture_as_pdf</span>
                        </div>
                        <div className="profile-doc-details">
                          <h3 className="profile-doc-name">{staffDetails.verificationDocument.fileName || 'Verified_Certificate.pdf'}</h3>
                          <div className="profile-doc-meta-row">
                            <span>
                              <strong>Size:</strong>{' '}
                              {((staffDetails.verificationDocument.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            <span>•</span>
                            <span>
                              <strong>Uploaded:</strong> {formattedDate(staffDetails.verificationDocument.uploadedAt || staffDetails.updatedAt)}
                            </span>
                            <span>•</span>
                            <span className="profile-doc-status-badge">
                              <span className="material-symbols-rounded">verified</span>
                              VERIFIED DOCUMENT
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="profile-doc-download-btn"
                          onClick={() => handleDownload(staffDetails.verificationDocument)}
                          title="Download document securely"
                        >
                          <span className="material-symbols-rounded">download</span>
                          <span>Download</span>
                        </button>
                      </div>
                    ) : (
                      <div className="profile-empty-docs">
                        <span className="material-symbols-rounded">folder_open</span>
                        <p>No verified credential document has been uploaded for this profile.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 6: POSITION HISTORY ─── */}
              {activeTab === 'history' && (
                <div className="profile-history-container">
                  <div className="profile-md3-card">
                    <div className="profile-md3-card-header">
                      <span className="material-symbols-rounded">timeline</span>
                      <h2>Career Progression &amp; Position History</h2>
                    </div>

                    {positionHistory && positionHistory.length > 0 ? (
                      <div className="profile-timeline">
                        {positionHistory.map((item, idx) => (
                          <div key={item._id || idx} className="profile-timeline-item">
                            <div className="profile-timeline-marker">
                              <span className="material-symbols-rounded">
                                {item.changeType === 'PROMOTION' ? 'trending_up' : item.changeType === 'DEMOTION' ? 'trending_down' : 'swap_horiz'}
                              </span>
                            </div>
                            <div className="profile-timeline-content">
                              <div className="profile-timeline-header">
                                <h3>
                                  {item.previousPosition ? (
                                    <>
                                      <span>{item.previousPosition}</span>
                                      <span className="profile-timeline-arrow">→</span>
                                      <strong className="profile-timeline-new">{item.newPosition}</strong>
                                    </>
                                  ) : (
                                    <strong>Initial Position: {item.newPosition}</strong>
                                  )}
                                </h3>
                                <span className={`profile-change-type-chip profile-change-type-chip--${(item.changeType || 'assignment').toLowerCase()}`}>
                                  {item.changeType || 'ASSIGNMENT'}
                                </span>
                              </div>
                              <div className="profile-timeline-meta">
                                <span>
                                  <span className="material-symbols-rounded">calendar_today</span>
                                  {formattedDate(item.effectiveDate || item.createdAt)}
                                </span>
                                {item.changedBy && (
                                  <span>
                                    <span className="material-symbols-rounded">admin_panel_settings</span>
                                    Authorized by: {item.changedBy.fullName || 'Administrator'}
                                  </span>
                                )}
                              </div>
                              {item.reason && (
                                <p className="profile-timeline-reason">
                                  <strong>Reason:</strong> {item.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="profile-empty-docs">
                        <span className="material-symbols-rounded">history_toggle_off</span>
                        <p>No position changes recorded. Current position is the initial hospital assignment.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 7: SETTINGS & PREFERENCES ─── */}
              {activeTab === 'settings' && (
                <div className="profile-settings-layout">
                  {/* Theme Preferences Component */}
                  <ThemePreferences />

                  <div className="profile-settings-grid">
                    {/* Patient Directory Layout Design (Administrator & Pharmacy only) */}
                    {(roleName === 'Administrator' || roleName === 'Pharmacy' || user?.role === 'Administrator' || user?.role === 'Pharmacy') && (
                      <div className="profile-md3-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="profile-md3-card-header">
                          <span className="material-symbols-rounded">view_quilt</span>
                          <h2>Patient Directory Layout Design</h2>
                        </div>
                        <div className="profile-layout-pref-body" style={{ padding: '20px' }}>
                          <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--md-sys-color-on-surface-variant, #4a4539)' }}>
                            Configure your preferred layout for browsing patient records in the directory. Selection is automatically synchronized and saved.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            
                            {/* Option 1: Card Grid View */}
                            <div
                              onClick={() => {
                                setPatientLayout('cards');
                                showSuccess('Patient directory layout set to Card Grid View.');
                              }}
                              style={{
                                border: `2px solid ${isPatientCards ? 'var(--md-sys-color-primary, #6b5f19)' : 'var(--md-sys-color-outline-variant, #e7e0d3)'}`,
                                borderRadius: '16px',
                                padding: '16px',
                                background: isPatientCards ? 'var(--md-sys-color-surface-container-high, #ede8dc)' : 'var(--md-sys-color-surface, #ffffff)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: isPatientCards ? '0 2px 8px rgba(107, 95, 25, 0.12)' : 'none'
                              }}
                            >
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: isPatientCards ? 'var(--md-sys-color-primary, #6b5f19)' : 'var(--md-sys-color-surface-container, #f3eee3)',
                                color: isPatientCards ? 'var(--md-sys-color-on-primary, #ffffff)' : 'var(--md-sys-color-on-surface-variant, #4a4539)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <span className="material-symbols-rounded">grid_view</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface, #1d1b16)' }}>Card Grid View</strong>
                                  {isPatientCards && (
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: 'var(--md-sys-color-primary, #6b5f19)',
                                      color: '#ffffff'
                                    }}>ACTIVE</span>
                                  )}
                                </div>
                                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--md-sys-color-on-surface-variant, #797667)', lineHeight: 1.4 }}>
                                  Multi-column responsive patient cards displaying contact badges, DOB, MRN, and OPD tag.
                                </p>
                              </div>
                            </div>

                            {/* Option 2: Tabular List View */}
                            <div
                              onClick={() => {
                                setPatientLayout('list');
                                showSuccess('Patient directory layout set to Tabular List View.');
                              }}
                              style={{
                                border: `2px solid ${isPatientList ? 'var(--md-sys-color-primary, #6b5f19)' : 'var(--md-sys-color-outline-variant, #e7e0d3)'}`,
                                borderRadius: '16px',
                                padding: '16px',
                                background: isPatientList ? 'var(--md-sys-color-surface-container-high, #ede8dc)' : 'var(--md-sys-color-surface, #ffffff)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: isPatientList ? '0 2px 8px rgba(107, 95, 25, 0.12)' : 'none'
                              }}
                            >
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: isPatientList ? 'var(--md-sys-color-primary, #6b5f19)' : 'var(--md-sys-color-surface-container, #f3eee3)',
                                color: isPatientList ? 'var(--md-sys-color-on-primary, #ffffff)' : 'var(--md-sys-color-on-surface-variant, #4a4539)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <span className="material-symbols-rounded">view_list</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface, #1d1b16)' }}>Tabular List View</strong>
                                  {isPatientList && (
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: 'var(--md-sys-color-primary, #6b5f19)',
                                      color: '#ffffff'
                                    }}>ACTIVE</span>
                                  )}
                                </div>
                                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--md-sys-color-on-surface-variant, #797667)', lineHeight: 1.4 }}>
                                  Structured clinical table showing Name, Age, Mobile No, City location, Last Visit Date, and Latest Appointment time.
                                </p>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}

                    {/* Regional & Monetary Localization */}
                    <div className="profile-md3-card">
                      <div className="profile-md3-card-header">
                        <span className="material-symbols-rounded">currency_rupee</span>
                        <h2>Regional &amp; Clinical Localization</h2>
                      </div>
                      <div className="profile-data-list">
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Monetary &amp; Billing Symbol</span>
                            <span className="profile-preference-hint">Active clinical currency for invoice generation</span>
                          </div>
                          <span className="profile-preference-badge">
                            {CURRENCY_SYMBOL} (INR - Indian Rupee)
                          </span>
                        </div>
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Clinical Locale &amp; Format</span>
                            <span className="profile-preference-hint">Date, time &amp; numeric formatting standard</span>
                          </div>
                          <span className="profile-preference-badge">
                            en-IN (DD MMM YYYY)
                          </span>
                        </div>
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Hospital Timezone</span>
                            <span className="profile-preference-hint">Timestamp synchronization zone</span>
                          </div>
                          <span className="profile-preference-badge">
                            Asia/Kolkata (IST +5:30)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account Security & Session Overview */}
                    <div className="profile-md3-card">
                      <div className="profile-md3-card-header">
                        <span className="material-symbols-rounded">security</span>
                        <h2>Account &amp; Session Security</h2>
                      </div>
                      <div className="profile-data-list">
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Authenticated Account</span>
                            <span className="profile-preference-hint">Active session identifier</span>
                          </div>
                          <span className="profile-preference-badge">
                            {user?.email || staffDetails?.email || 'N/A'}
                          </span>
                        </div>
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Access Level &amp; Role</span>
                            <span className="profile-preference-hint">Authorized clinical module permissions</span>
                          </div>
                          <span className="profile-preference-badge">
                            {roleName}
                          </span>
                        </div>
                        <div className="profile-preference-row">
                          <div className="profile-preference-meta">
                            <span className="profile-preference-label">Session Status</span>
                            <span className="profile-preference-hint">Active JWT access token valid</span>
                          </div>
                          <span className="profile-preference-badge" style={{ color: 'var(--md-sys-color-tertiary, #616218)' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span>
                            Secure &amp; Encrypted
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="profile-empty-docs">
            <span className="material-symbols-rounded">person_off</span>
            <p>Profile details could not be retrieved from the server.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
