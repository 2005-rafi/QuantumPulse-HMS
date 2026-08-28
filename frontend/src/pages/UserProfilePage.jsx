import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import CommonHeader from '../components/shell/CommonHeader';
import Md3NavigationRail from '../components/md3/Md3NavigationRail';
import './UserProfilePage.css';

const PROFILE_NAV_ITEMS = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'employment', icon: 'corporate_fare', label: 'Employment' },
  { id: 'access', icon: 'lock', label: 'Access' },
  { id: 'credentials', icon: 'workspace_premium', label: 'Credentials' },
  { id: 'documents', icon: 'folder_shared', label: 'Documents' },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

const ROLE_HOME_ROUTES = {
  Reception: '/dashboard/reception',
  Nurse: '/dashboard/nurse',
  Doctor: '/dashboard/doctor',
  Laboratory: '/dashboard/laboratory',
  Pharmacy: '/dashboard/pharmacy',
  Administrator: '/dashboard/administrator',
};

const UserProfilePage = () => {
  const { user, logout } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [staffDetails, setStaffDetails] = useState(null);
  const [positionHistory, setPositionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleBackToDashboard = () => {
    const targetRoute = (user?.role && ROLE_HOME_ROUTES[user.role]) || '/dashboard';
    navigate(targetRoute);
  };

  // Determine active tab from URL path (e.g. /dashboard/profile/overview)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  const activeTab = PROFILE_NAV_ITEMS.some((item) => item.id === lastPart) ? lastPart : 'overview';

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
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formattedDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
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

      <div className="user-profile-body-layout">
        {/* ─── MD3 Navigation Rail / Sidebar ─── */}
        <aside className="user-profile-rail-container">
          <Md3NavigationRail
            items={PROFILE_NAV_ITEMS}
            activeItem={activeTab}
            onSelect={(id) => navigate(`/dashboard/profile/${id}`, { replace: true })}
          />
        </aside>

        {/* ─── Main Content Canvas ─── */}
        <main className="user-profile-main-canvas">
          {/* Top Bar: Back button & Emp ID Badge */}
          <div className="profile-top-nav-bar">
            <button
              type="button"
              className="profile-nav-back-btn"
              onClick={handleBackToDashboard}
              aria-label="Return to your dashboard"
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
              {/* ─── Sleek & Compact Profile Hero Card ─── */}
              <section className="profile-hero-card">
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
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                          {accountStatus === 'Active' ? 'check_circle' : 'block'}
                        </span>
                        {accountStatus.toUpperCase()}
                      </span>
                      {staffDetails.verificationDocument && (
                        <span className="profile-verified-chip" title="Credentials verified by administrator">
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>verified</span>
                          VERIFIED
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
              </section>

              {/* ─── Active Routed View Canvas ─── */}
              <div key={activeTab} className="profile-tab-content-area profile-view-fade-in">
                <Outlet
                  context={{
                    staffDetails,
                    positionHistory,
                    loading,
                    handleDownload,
                    roleName,
                    accountStatus,
                    userPermissionCodes,
                    formattedDate,
                    formattedDateTime,
                    user,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="profile-empty-docs">
              <span className="material-symbols-rounded">person_off</span>
              <p>Profile details could not be retrieved from the server.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserProfilePage;
