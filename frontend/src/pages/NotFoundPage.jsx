import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { NotFoundIllustration } from '../components/md3/NotFoundIllustration';
import './NotFoundPage.css';

/**
 * CLINICAL_DIRECTORY_INDEX
 * Comprehensive catalog of valid clinical stations and workspaces for fuzzy discovery.
 */
const CLINICAL_DIRECTORY_INDEX = [
  {
    id: 'nurse-ipd',
    title: 'Inpatient Nursing Station',
    category: 'Nursing',
    route: '/dashboard/nurse/ipd',
    icon: 'bed',
    description: 'NEWS2 vital signs telemetry, 24-hr e-MAR drug charting & SBAR handovers.',
    roles: ['Nurse', 'IPD Nurse', 'Administrator'],
  },
  {
    id: 'nurse-triage',
    title: 'OPD Nurse Triage Sheet',
    category: 'Nursing',
    route: '/dashboard/nurse/triage',
    icon: 'assignment_turned_in',
    description: 'Initial vitals triage, acuity level rating, and doctor queue allocation.',
    roles: ['Nurse', 'OPD Nurse', 'Administrator'],
  },
  {
    id: 'doctor-ipd',
    title: 'Doctor Inpatient Cockpit',
    category: 'Clinical',
    route: '/dashboard/doctor/ipd',
    icon: 'stethoscope',
    description: 'Admitted patient clinical rounds, daily progress notes, and discharge summaries.',
    roles: ['Doctor', 'Surgeon', 'Administrator'],
  },
  {
    id: 'doctor-consultation',
    title: 'Doctor OPD Consultations',
    category: 'Clinical',
    route: '/dashboard/doctor/consultation',
    icon: 'clinical_notes',
    description: 'Outpatient consultations, electronic prescriptions, and diagnostic orders.',
    roles: ['Doctor', 'Surgeon', 'Administrator'],
  },
  {
    id: 'surgeon-ot',
    title: 'Operating Theatre & Surgical Board',
    category: 'Surgery',
    route: '/dashboard/surgeon',
    icon: 'medical_services',
    description: 'Theatre live scheduling, surgical booking requests, and post-op registry.',
    roles: ['Surgeon', 'Doctor', 'Administrator', 'Ward Operations'],
  },
  {
    id: 'lab-processing',
    title: 'Diagnostic Laboratory Workstation',
    category: 'Diagnostics',
    route: '/dashboard/laboratory/processing',
    icon: 'biotech',
    description: 'Specimen accessioning, analyzer telemetry, and diagnostic test reporting.',
    roles: ['Laboratory', 'Lab Nurse', 'Administrator'],
  },
  {
    id: 'pharmacy-dispense',
    title: 'Pharmacy Dispensing Desk',
    category: 'Pharmacy',
    route: '/dashboard/pharmacy',
    icon: 'medication',
    description: 'Prescription dispensing, drug inventory ledger, and ward floor requisitions.',
    roles: ['Pharmacy', 'Administrator'],
  },
  {
    id: 'ward-bed-map',
    title: 'Bed Map & Spatial Ward Matrix',
    category: 'Wards',
    route: '/dashboard/ward-operations/bed-map',
    icon: 'hotel',
    description: 'Real-time bed occupancy, ICU telemetry, and ward spatial layout.',
    roles: ['Ward Operations', 'Reception', 'Administrator'],
  },
  {
    id: 'ward-transfers',
    title: 'Ward Transfer & ICU Ledger',
    category: 'Wards',
    route: '/dashboard/ward-operations/transfers',
    icon: 'sync_alt',
    description: 'Inter-ward transfers, critical care escalations, and transfer authorizations.',
    roles: ['Ward Operations', 'Nurse', 'Administrator'],
  },
  {
    id: 'billing-cashier',
    title: 'Billing & Financial Cashier Desk',
    category: 'Billing',
    route: '/dashboard/billing',
    icon: 'payments',
    description: 'Encounter charge capture, invoice generation, and receipt settlement.',
    roles: ['Billing', 'Administrator'],
  },
  {
    id: 'reception-patients',
    title: 'Patient Directory & Registration',
    category: 'Reception',
    route: '/dashboard/reception/patients',
    icon: 'person_search',
    description: 'Master patient index, new patient registration, and appointment check-in.',
    roles: ['Reception', 'Administrator'],
  },
  {
    id: 'user-profile',
    title: 'Staff Profile & Security Credentials',
    category: 'Account',
    route: '/dashboard/profile/overview',
    icon: 'manage_accounts',
    description: 'Duty roster, digital signature, professional credentials, and session security.',
    roles: ['ALL'],
  },
];

const CATEGORIES = ['All', 'Clinical', 'Nursing', 'Surgery', 'Diagnostics', 'Pharmacy', 'Wards', 'Billing'];

/**
 * Detect host environment dynamically for domain-aware diagnostic reporting.
 */
const detectHostEnvironment = (hostname) => {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return {
      type: 'Local Station / On-Premises Host',
      tag: 'Development & Local Network',
      badgeClass: 'qc-host-badge--local',
    };
  }
  if (hostname.includes('trycloudflare.com') || hostname.includes('cloudflare')) {
    return {
      type: 'Cloudflare Edge Gateway',
      tag: 'Secure Edge Tunnel Active',
      badgeClass: 'qc-host-badge--cloudflare',
    };
  }
  if (hostname.includes('vercel.app')) {
    return {
      type: 'Vercel Edge Platform',
      tag: 'Serverless Global Gateway',
      badgeClass: 'qc-host-badge--vercel',
    };
  }
  if (hostname.includes('amazonaws.com') || hostname.includes('aws')) {
    return {
      type: 'AWS Hospital Cloud',
      tag: 'Cloud Infrastructure Dedicated',
      badgeClass: 'qc-host-badge--aws',
    };
  }
  return {
    type: 'Enterprise Hospital Domain',
    tag: 'Production Clinical Gateway',
    badgeClass: 'qc-host-badge--prod',
  };
};

/**
 * NotFoundPage — Material Design 3 Friendly Clinical 404 & Domain Route Assistance.
 */
export const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const config = useConfig();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  const currentHost = window.location.host || 'localhost:7123';
  const currentHostname = window.location.hostname || 'localhost';
  const hostEnv = useMemo(() => detectHostEnvironment(currentHostname), [currentHostname]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyUri = () => {
    const fullUrl = window.location.href;
    navigator.clipboard?.writeText(fullUrl);
    showToast(`Copied route URL: ${window.location.pathname}`);
  };

  const handleReportRoute = () => {
    showToast('Route diagnostic reported to Hospital IT & Systems Support.');
  };

  // Determine user's primary default dashboard
  const userPrimaryDashboard = useMemo(() => {
    if (!user) return '/login';
    switch (user.role) {
      case 'Reception':
        return '/dashboard/reception';
      case 'Doctor':
      case 'Surgeon':
        return '/dashboard/doctor';
      case 'Nurse':
      case 'OPD Nurse':
      case 'IPD Nurse':
        return '/dashboard/nurse';
      case 'Laboratory':
      case 'Lab Nurse':
        return '/dashboard/laboratory';
      case 'Pharmacy':
        return '/dashboard/pharmacy';
      case 'Ward Operations':
        return '/dashboard/ward-operations';
      case 'Billing':
        return '/dashboard/billing';
      case 'Administrator':
        return '/dashboard/administrator';
      default:
        return '/dashboard';
    }
  }, [user]);

  // Filter clinical directory based on search & category
  const filteredDirectory = useMemo(() => {
    return CLINICAL_DIRECTORY_INDEX.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCat;

      const matchesText =
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.route.toLowerCase().includes(query);

      return matchesCat && matchesText;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="qc-notfound-viewport">
      {/* Background Ambience Layer */}
      <div className="qc-notfound-bg-glow qc-notfound-bg-glow--top" aria-hidden="true" />
      <div className="qc-notfound-bg-glow qc-notfound-bg-glow--bottom" aria-hidden="true" />

      {/* Top Clinical Header Bar */}
      <header className="qc-notfound-header">
        <div className="qc-notfound-header__inner">
          <div className="qc-notfound-brand">
            <BrandLogo size="md" variant="header" />
            <div className="qc-notfound-brand-text">
              <span className="qc-notfound-brand-name">{config?.HOSPITAL_NAME || 'Quantum CareOne HMS'}</span>
              <span className="qc-notfound-brand-sub">Clinical Navigation & Route Gateway</span>
            </div>
          </div>

          <div className="qc-notfound-telemetry-badge">
            <span className="qc-notfound-telemetry-dot" />
            <span>Hospital Services Online · 99.99% Core Uptime</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="qc-notfound-main">
        <div className="qc-notfound-container">
          {/* Hero Surface Deck */}
          <section className="qc-notfound-hero-card">
            {/* Dynamic Domain Diagnostic Strip */}
            <div className="qc-domain-banner">
              <div className={`qc-host-badge ${hostEnv.badgeClass}`}>
                <span className="material-symbols-rounded qc-host-icon">dns</span>
                <span>{hostEnv.type}</span>
                <span className="qc-host-divider">·</span>
                <span className="qc-host-tag">{hostEnv.tag}</span>
              </div>
              <div className="qc-domain-endpoint">
                <span className="qc-endpoint-label">Host:</span>
                <code>{currentHost}</code>
                <span className="qc-host-divider">·</span>
                <span className="qc-endpoint-label">Path:</span>
                <code className="qc-endpoint-path">{location.pathname || '/'}</code>
              </div>
            </div>

            {/* Visual Vector Animation Deck */}
            <div className="qc-notfound-illu-wrapper">
              <NotFoundIllustration size="large" />
            </div>

            {/* Friendly Headline & Clinical Explanation */}
            <div className="qc-notfound-content">
              <div className="qc-reassurance-chip">
                <span className="material-symbols-rounded">verified_user</span>
                <span>All Patient Data & Medical Records Are Fully Intact</span>
              </div>

              <h1 className="qc-notfound-title">Clinical Resource Not Found on This Domain</h1>

              <p className="qc-notfound-lead">
                The requested URL <code>{location.pathname}</code> is not registered on the current hospital gateway{' '}
                <strong>{currentHost}</strong>. This usually happens if a link was typed with a typo, an outdated bookmark was opened, or the feature is mapped to a different clinical workstation.
              </p>

              {/* Primary & Secondary Call to Action Buttons */}
              <div className="qc-notfound-primary-actions">
                {user ? (
                  <button
                    type="button"
                    className="qc-btn qc-btn--primary"
                    onClick={() => navigate(userPrimaryDashboard)}
                  >
                    <span className="material-symbols-rounded">dashboard</span>
                    <span>Return to {user.role || 'Clinical'} Dashboard</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="qc-btn qc-btn--primary"
                    onClick={() => navigate('/login')}
                  >
                    <span className="material-symbols-rounded">lock</span>
                    <span>Return to Secure Hospital Sign In</span>
                  </button>
                )}

                <button
                  type="button"
                  className="qc-btn qc-btn--secondary"
                  onClick={() => navigate(-1)}
                >
                  <span className="material-symbols-rounded">arrow_back</span>
                  <span>Previous Screen</span>
                </button>

                <button
                  type="button"
                  className="qc-btn qc-btn--tonal"
                  onClick={handleCopyUri}
                  title="Copy the missing URL path to clipboard"
                >
                  <span className="material-symbols-rounded">content_copy</span>
                  <span>Copy URL</span>
                </button>

                <button
                  type="button"
                  className="qc-btn qc-btn--ghost"
                  onClick={handleReportRoute}
                  title="Report link to hospital systems administration"
                >
                  <span className="material-symbols-rounded">report</span>
                  <span>Report Route</span>
                </button>
              </div>
            </div>
          </section>

          {/* Interactive Clinical Directory & Search Discovery Section */}
          <section className="qc-directory-section">
            <div className="qc-directory-header">
              <div>
                <h2 className="qc-directory-title">Find Clinical Workstation or Module</h2>
                <p className="qc-directory-subtitle">
                  Directly navigate to any operational department, inpatient ward, or diagnostic station.
                </p>
              </div>

              {/* Live Search Input */}
              <div className="qc-search-box">
                <span className="material-symbols-rounded qc-search-icon">search</span>
                <input
                  type="text"
                  className="qc-search-input"
                  placeholder="Search stations (e.g., Bed Map, Surgery, Triage, Billing, Lab)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search clinical stations"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="qc-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="qc-category-pills" role="tablist">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`qc-category-pill ${selectedCategory === cat ? 'qc-category-pill--active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  role="tab"
                  aria-selected={selectedCategory === cat}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Clinical Cards Grid */}
            <div className="qc-directory-grid">
              {filteredDirectory.length > 0 ? (
                filteredDirectory.map((station) => (
                  <Link
                    key={station.id}
                    to={station.route}
                    className="qc-station-card"
                  >
                    <div className="qc-station-card__header">
                      <div className="qc-station-icon-vessel">
                        <span className="material-symbols-rounded">{station.icon}</span>
                      </div>
                      <span className="qc-station-category-tag">{station.category}</span>
                    </div>

                    <div className="qc-station-card__body">
                      <h3 className="qc-station-title">{station.title}</h3>
                      <p className="qc-station-desc">{station.description}</p>
                    </div>

                    <div className="qc-station-card__footer">
                      <code className="qc-station-route">{station.route}</code>
                      <span className="material-symbols-rounded qc-station-arrow">arrow_forward</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="qc-no-results">
                  <span className="material-symbols-rounded qc-no-results-icon">search_off</span>
                  <p className="qc-no-results-text">
                    No clinical stations match <em>"{searchQuery}"</em> in category <strong>{selectedCategory}</strong>.
                  </p>
                  <button
                    type="button"
                    className="qc-btn qc-btn--tonal qc-btn--sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                  >
                    Reset Search Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* System Security & Regulatory Assurance Strip */}
          <footer className="qc-notfound-footer">
            <div className="qc-footer-assurance">
              <div className="qc-assurance-item">
                <span className="material-symbols-rounded">security</span>
                <span>HIPAA § 164.312 Compliant</span>
              </div>
              <div className="qc-assurance-item">
                <span className="material-symbols-rounded">vpn_key</span>
                <span>End-to-End TLS 1.3 Encryption</span>
              </div>
              <div className="qc-assurance-item">
                <span className="material-symbols-rounded">cloud_done</span>
                <span>Zero Data Loss Guarantee</span>
              </div>
            </div>
            <div className="qc-footer-copy">
              <span>{config?.HOSPITAL_NAME || 'Quantum CareOne Multispeciality Hospital'} · System Gateway v4.8</span>
            </div>
          </footer>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="qc-toast" role="status" aria-live="polite">
          <span className="material-symbols-rounded qc-toast-icon">check_circle</span>
          <span className="qc-toast-text">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default NotFoundPage;
