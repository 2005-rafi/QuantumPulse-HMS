import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Md3TextField, Md3Button, Md3Checkbox } from '../../components/md3/Md3FormComponents';
import './LoginPage.css';

const ROLE_ROUTES = {
  Reception: '/dashboard/reception',
  Nurse: '/dashboard/nurse',
  Doctor: '/dashboard/doctor',
  Laboratory: '/dashboard/laboratory',
  Pharmacy: '/dashboard/pharmacy',
  Administrator: '/dashboard/administrator',
};

const DefaultMedicalLogo = ({ width = 44, height = 44, rx = 10 }) => (
  <svg width={width} height={height} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx={rx} fill="var(--md-sys-color-primary)" />
    <path d="M20 10v20M10 20h20" stroke="var(--md-sys-color-on-primary)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M26 26c1.5-2 2-5 0-7s-5 0-7 2" stroke="var(--md-sys-color-primary-container)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LoginPage = () => {
  const { isDark } = useTheme();
  const [form, setForm] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [heroLogoFailed, setHeroLogoFailed] = useState(false);
  const [cardLogoFailed, setCardLogoFailed] = useState(false);
  const [showHelpNotice, setShowHelpNotice] = useState(false);

  const { login } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

  // Load saved username if rememberMe was previously set in this session
  useEffect(() => {
    const savedUser = sessionStorage.getItem('hms_saved_username');
    if (savedUser) {
      setForm((prev) => ({ ...prev, username: savedUser }));
      setRememberMe(true);
    }
  }, []);

  const validateField = (name, value) => {
    let error = '';
    if (name === 'username') {
      if (!value.trim()) {
        error = 'Username is required';
      }
    } else if (name === 'password') {
      if (!value) {
        error = 'Password is required';
      } else if (value.length < 4) {
        error = 'Password must be at least 4 characters';
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setGlobalError('');
    setShowHelpNotice(false);
    
    // Inline real-time validation
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Full form validation check
    const usernameErr = validateField('username', form.username);
    const passwordErr = validateField('password', form.password);

    if (usernameErr || passwordErr) {
      setFieldErrors({ username: usernameErr, password: passwordErr });
      setGlobalError('Please fix the validation errors below.');
      return;
    }

    setLoading(true);
    setGlobalError('');

    try {
      const user = await login(form.username.trim(), form.password);
      
      // Handle Remember Me persistence (scoped to browser session)
      if (rememberMe) {
        sessionStorage.setItem('hms_saved_username', form.username.trim());
      } else {
        sessionStorage.removeItem('hms_saved_username');
      }

      const targetRoute = ROLE_ROUTES[user.role] || '/dashboard';
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const serverMsg = err.response?.data?.message;

      const ERROR_MAP = {
        AUTH_001: 'Invalid username or password credentials.',
        AUTH_004: 'Your account has been locked due to failed attempts. Contact IT Administrator.',
        AUTH_005: 'Your account has been deactivated.',
        AUTH_006: 'Account pending activation. Please verify your credentials.',
        ERR_NETWORK: 'Unable to connect to HMS API Server. Check backend server connection.',
      };

      const fallbackMsg = serverMsg || 'Authentication failed. Please verify your credentials.';
      setGlobalError(ERROR_MAP[code] || ERROR_MAP[err.code] || fallbackMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Column — Medical Product Hero Showcase Panel */}
      <div className="login-hero-panel">
        <div className="hero-brand">
          <BrandLogo variant="hero" maxHeight={48} />
          <div className="hero-brand-text">
            <h2>{config.HOSPITAL_NAME || 'Quantum CareOne'}</h2>
            <p>OPD CLINICAL PORTAL</p>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">Better Care,<br />Smarter Management</h1>
          <p className="hero-subtitle">
            Streamlining hospital operations. Enhancing patient care with integrated clinical workflows.
          </p>
        </div>

        <div className="hero-features">
          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h4>Secure & Reliable</h4>
            <p>Enterprise grade security & data privacy</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h4>Role Based Access</h4>
            <p>Right access for the right clinical role</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h4>Real-time Insights</h4>
            <p>Data-driven decisions for faster care</p>
          </div>
        </div>
      </div>

      {/* Right Column — MD3 Form Card Section */}
      <div className="login-form-panel">
        <div className="login-card-wrapper">
          <div className="card-header">
            <div className="brand-logo-container">
              <BrandLogo variant="card" maxHeight={52} maxWidth={260} />
            </div>
            <h2 className="card-title">Welcome Back</h2>
            <p className="card-subtitle">Sign in to continue to {config.SHORT_NAME || 'Quantum CareOne'} Portal</p>
          </div>

          {globalError && (
            <div className="alert-banner-error" role="alert" aria-live="assertive" style={{ marginBottom: '20px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{globalError}</span>
            </div>
          )}

          {showHelpNotice && (
            <div className="help-notice-banner" role="status">
              <strong>Need a password reset?</strong><br />
              Self-serve password resets are disabled for clinical security. Please contact your Hospital IT Helpdesk or Administrator.
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} className="login-form-md3" noValidate>
            <Md3TextField
              id="username"
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              disabled={loading}
              error={fieldErrors.username}
              leadingIcon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              }
            />

            <div className="md3-password-field-container">
              <Md3TextField
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                error={fieldErrors.password}
                leadingIcon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                }
                trailingIcon={
                  showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )
                }
                onTrailingIconClick={() => setShowPassword(!showPassword)}
                trailingIconAriaLabel={showPassword ? 'Hide password' : 'Show password'}
              />
              <div className="password-options-row">
                <a
                  href="#"
                  className="forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowHelpNotice(!showHelpNotice);
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <Md3Checkbox
              checked={rememberMe}
              onChange={setRememberMe}
              label="Remember me"
            />

            <Md3Button
              type="submit"
              variant="secondary"
              disabled={loading}
              loading={loading}
              loadingText="Signing In..."
              className="login-submit-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign In</span>
            </Md3Button>
          </form>

          {/* Card Footer Info */}
          <div className="card-footer-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Secure Login • Protected by HMS Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
