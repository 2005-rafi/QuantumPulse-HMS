import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import CommonHeader from '../components/shell/CommonHeader';
import AppShell from '../components/shell/AppShell';
import './UserProfilePage.css';

const UserProfilePage = () => {
  const { user, logout } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const [staffDetails, setStaffDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch full staff details on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.staffId) return;
      try {
        const response = await api.get(`/staff/${user.staffId}`);
        setStaffDetails(response.data?.data);
      } catch (err) {
        showError('Failed to fetch profile details.');
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
      month: 'long',
      day: 'numeric',
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

  const isClinicalOrSupport = useMemo(() => {
    return ['Doctor', 'Nurse', 'Laboratory', 'Pharmacy'].includes(staffDetails?.roleId?.name);
  }, [staffDetails]);

  return (
    <div className="user-profile-page">
      <CommonHeader
        brandTitle="My Profile"
        brandSubtitle={staffDetails?.departmentId?.name || user?.department}
        user={user}
        onLogout={handleLogout}
      />

      <div className="user-profile-content">
        {loading ? (
          <div className="profile-loading">
            <div className="profile-loading-spinner" />
            <p>Loading profile details...</p>
          </div>
        ) : staffDetails ? (
          <>
            {/* Top Banner Header Card */}
            <div className="profile-banner-card">
              <div className="profile-avatar-large">{initials}</div>
              <div className="profile-header-details">
                <div className="profile-name-row">
                  <h2>{staffDetails.fullName}</h2>
                  {staffDetails.verificationDocument && (
                    <div className="profile-verified-badge" title="Credentials verified by administrator">
                      <span className="material-symbols-rounded">verified</span>
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <div className="profile-meta-row">
                  <div className="profile-meta-item">
                    <span className="material-symbols-rounded">badge</span>
                    <span>{staffDetails.employeeId}</span>
                  </div>
                  <div className="profile-meta-item">
                    <span className="material-symbols-rounded">work</span>
                    <span>{staffDetails.position}</span>
                  </div>
                  <div className="profile-meta-item">
                    <span className="material-symbols-rounded">apartment</span>
                    <span>{staffDetails.departmentId?.name || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid details */}
            <div className="profile-info-grid">
              {/* Card 1: Personal & Contact */}
              <div className="profile-section-card">
                <div className="profile-section-title">
                  <span className="material-symbols-rounded">contact_mail</span>
                  <h3>Personal & Contact Information</h3>
                </div>
                <div className="profile-data-list">
                  <div className="profile-data-item">
                    <span className="profile-data-label">Email Address</span>
                    <span className="profile-data-value">{staffDetails.email || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Mobile Number</span>
                    <span className="profile-data-value">{staffDetails.phone || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Gender</span>
                    <span className="profile-data-value">{staffDetails.gender || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Date of Birth</span>
                    <span className="profile-data-value">{formattedDate(staffDetails.dateOfBirth)}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Blood Group</span>
                    <span className="profile-data-value">{staffDetails.bloodGroup || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Address</span>
                    <span className="profile-data-value" style={{ textAlign: 'right', maxWidth: '60%' }}>
                      {[staffDetails.addressLine1, staffDetails.city, staffDetails.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Employment */}
              <div className="profile-section-card">
                <div className="profile-section-title">
                  <span className="material-symbols-rounded">corporate_fare</span>
                  <h3>Employment Details</h3>
                </div>
                <div className="profile-data-list">
                  <div className="profile-data-item">
                    <span className="profile-data-label">Role Assignment</span>
                    <span className="profile-data-value">{staffDetails.roleId?.name || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Employment Type</span>
                    <span className="profile-data-value">{staffDetails.employmentType || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Shift Schedule</span>
                    <span className="profile-data-value">{staffDetails.shift || '—'}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Joining Date</span>
                    <span className="profile-data-value">{formattedDate(staffDetails.joiningDate)}</span>
                  </div>
                  <div className="profile-data-item">
                    <span className="profile-data-label">Account Status</span>
                    <span className="profile-data-value" style={{ color: staffDetails.status === 'Active' ? 'green' : 'red' }}>
                      {staffDetails.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Professional Credentials */}
              {isClinicalOrSupport && (
                <div className="profile-section-card">
                  <div className="profile-section-title">
                    <span className="material-symbols-rounded">workspace_premium</span>
                    <h3>Professional Credentials</h3>
                  </div>
                  <div className="profile-data-list">
                    <div className="profile-data-item">
                      <span className="profile-data-label">Years of Experience</span>
                      <span className="profile-data-value">
                        {staffDetails.yearsOfExperience !== undefined ? `${staffDetails.yearsOfExperience} Years` : '—'}
                      </span>
                    </div>

                    {/* Role specific clinical values */}
                    {staffDetails.roleId?.name === 'Doctor' && (
                      <>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Medical License No.</span>
                          <span className="profile-data-value">{staffDetails.medicalLicenseNumber || '—'}</span>
                        </div>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Specialization</span>
                          <span className="profile-data-value">{staffDetails.primarySpecialization || '—'}</span>
                        </div>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Consulting Fee</span>
                          <span className="profile-data-value">₹{staffDetails.consultingFee ?? '0'}</span>
                        </div>
                      </>
                    )}

                    {staffDetails.roleId?.name === 'Nurse' && (
                      <>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Nursing License No.</span>
                          <span className="profile-data-value">{staffDetails.nursingLicenseNumber || '—'}</span>
                        </div>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Specialization</span>
                          <span className="profile-data-value">{staffDetails.nursingSpecialization || '—'}</span>
                        </div>
                      </>
                    )}

                    {staffDetails.roleId?.name === 'Laboratory' && (
                      <>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Lab Certification Code</span>
                          <span className="profile-data-value">{staffDetails.labCertificationCode || '—'}</span>
                        </div>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Lab Qualification</span>
                          <span className="profile-data-value">{staffDetails.labQualification || '—'}</span>
                        </div>
                      </>
                    )}

                    {staffDetails.roleId?.name === 'Pharmacy' && (
                      <>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Pharmacy License No.</span>
                          <span className="profile-data-value">{staffDetails.pharmacyLicenseNumber || '—'}</span>
                        </div>
                        <div className="profile-data-item">
                          <span className="profile-data-label">Pharmacy Qualification</span>
                          <span className="profile-data-value">{staffDetails.pharmacyQualification || '—'}</span>
                        </div>
                      </>
                    )}

                    {/* Verification Certificate Proof */}
                    {staffDetails.verificationDocument && (
                      <div className="profile-cert-container" style={{ marginTop: '0.5rem' }}>
                        <span className="profile-data-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem' }}>
                          Verified Credentials Document
                        </span>
                        <div className="profile-cert-box">
                          <div className="profile-cert-icon">
                            <span className="material-symbols-rounded">picture_as_pdf</span>
                          </div>
                          <div className="profile-cert-info">
                            <span className="profile-cert-name">{staffDetails.verificationDocument.fileName}</span>
                            <span className="profile-cert-meta">
                              {((staffDetails.verificationDocument.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            type="button"
                            className="profile-cert-download"
                            onClick={() => handleDownload(staffDetails.verificationDocument)}
                            title="Download Certificate"
                          >
                            <span className="material-symbols-rounded">download</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="profile-loading">
            <p>Profile details not found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
