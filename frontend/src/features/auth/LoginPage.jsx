import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { Md3TextField } from '../../components/md3/Md3FormComponents';
import { useWorkstationAuth } from './useWorkstationAuth';
import './LoginPage.css';

// 5 Hospital Environment Background Images from assets/background
const BACKGROUND_IMAGES = [
  {
    src: '/background/background-01.png',
    title: 'Precision Care. Connected Medicine.',
    subtitle: 'Unified inpatient, outpatient, and diagnostic telemetry platform.',
  },
  {
    src: '/background/background-02.png',
    title: 'Advanced Surgical & Critical Care',
    subtitle: 'Real-time operating theatre coordination and WHO surgical safety verification.',
  },
  {
    src: '/background/background-03.png',
    title: 'Automated Diagnostic Workflows',
    subtitle: 'Instant paperless specimen tracking and laboratory result validation.',
  },
  {
    src: '/background/background-04.png',
    title: 'Secure Clinical Governance',
    subtitle: 'Role-based data isolation adhering strictly to HIPAA & NABH standards.',
  },
  {
    src: '/background/background-05.png',
    title: '24/7 Intelligent Ward Management',
    subtitle: 'Live bed census, automated eMAR schedules, and streamlined patient transfer.',
  },
];

const SLIDE_INTERVAL_MS = 6500;

/**
 * LoginPage: Material 3 Split-Screen Clinical Workstation (50/50 Half Screen)
 * 
 * Architecture:
 * - Left 50% Pane: Surface-themed authentication surface with prominent hospital branding,
 *   warm greeting, and clean Material 3 input forms.
 * - Right 50% Pane: Cinematic cycling visual showcase with minimalist micro-copy.
 * - Mobile / Tablet (<960px): Centered single-column left-side surface view.
 */
export const LoginPage = () => {
  const { isDark } = useTheme();
  const config = useConfig();
  const [bgIndex, setBgIndex] = useState(0);
  const timerRef = useRef(null);

  const {
    form,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    isSubmitting,
    fieldErrors,
    lockoutSeconds,
    handleFieldChange,
    handleFieldFocus,
    handleFieldBlur,
    handleNeedAssistance,
    submitLogin,
  } = useWorkstationAuth();

  // Background slideshow cycle
  useEffect(() => {
    BACKGROUND_IMAGES.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });

    timerRef.current = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const hospitalName = config?.HOSPITAL_NAME || 'Quantum CareOne';
  const currentSlide = BACKGROUND_IMAGES[bgIndex] || BACKGROUND_IMAGES[0];

  const getPasswordHelperText = () => {
    if (!form.password || fieldErrors.password) return undefined;
    if (form.password.length < 4) {
      return 'Minimum 4 characters';
    }
    return undefined;
  };

  return (
    <div className="qc-split-viewport">
      {/* ─── LEFT COLUMN (50% SCREEN): THEMED AUTHENTICATION SURFACE ─── */}
      <section className="qc-split-form-col" aria-labelledby="qc-welcome-heading">
        <div className="qc-form-container">
          {/* Top Branding Header */}
          <header className="qc-form-header">
            <div className="qc-brand-group">
              <div className="qc-brand-logo-wrap">
                <img
                  src={isDark ? '/dark.svg' : '/light.svg'}
                  alt={hospitalName}
                  className="qc-brand-logo"
                  onError={(e) => { e.target.src = '/logo.svg'; }}
                />
              </div>
              <div className="qc-brand-text">
                <span className="qc-brand-name">{hospitalName}</span>
                <span className="qc-brand-tagline">Clinical Hospital Portal</span>
              </div>
            </div>
          </header>

          {/* Form Content Body */}
          <main className="qc-form-body">
            {/* Welcome Greeting */}
            <div className="qc-welcome-block">
              <h1 id="qc-welcome-heading" className="qc-welcome-title">Welcome back</h1>
              <p className="qc-welcome-subtitle">
                Sign in with your authorized staff credentials to access your designated clinical portal.
              </p>
            </div>

            {/* Input Form */}
            <form id="auth-form" onSubmit={submitLogin} className="qc-auth-form" noValidate>
              {/* Username Input */}
              <div className="qc-input-group">
                <Md3TextField
                  id="username"
                  name="username"
                  type="text"
                  label="Staff Username or ID"
                  value={form.username}
                  onChange={handleFieldChange}
                  onFocus={() => handleFieldFocus('username')}
                  onBlur={handleFieldBlur}
                  error={fieldErrors.username}
                  disabled={isSubmitting || lockoutSeconds > 0}
                  autoComplete="username"
                  autoFocus
                  maxLength={64}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                  leadingIcon={(
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                />
              </div>

              {/* Password Input */}
              <div className="qc-input-group">
                <Md3TextField
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Workstation Password"
                  value={form.password}
                  onChange={handleFieldChange}
                  onFocus={() => handleFieldFocus('password')}
                  onBlur={handleFieldBlur}
                  error={fieldErrors.password}
                  helperText={getPasswordHelperText()}
                  disabled={isSubmitting || lockoutSeconds > 0}
                  autoComplete="current-password"
                  maxLength={128}
                  spellCheck={false}
                  leadingIcon={(
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  trailingIcon={
                    showPassword ? (
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      </svg>
                    ) : (
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )
                  }
                  onTrailingIconClick={() => setShowPassword(!showPassword)}
                  trailingIconAriaLabel={showPassword ? 'Hide password' : 'Show password'}
                />
              </div>

              {/* Options Row */}
              <div className="qc-options-bar">
                <label className="qc-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="qc-native-checkbox"
                  />
                  <span className="qc-custom-checkbox" aria-hidden="true">
                    {rememberMe && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="qc-remember-text">Remember workstation</span>
                </label>

                <button
                  type="button"
                  className="qc-assist-btn"
                  onClick={handleNeedAssistance}
                >
                  Need assistance?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="qc-signin-btn"
                disabled={isSubmitting || lockoutSeconds > 0}
                aria-busy={isSubmitting}
              >
                {lockoutSeconds > 0 ? (
                  <span>Locked ({lockoutSeconds}s)</span>
                ) : isSubmitting ? (
                  <>
                    <span className="qc-btn-spinner" aria-hidden="true" />
                    <span>Authorizing Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </main>
        </div>
      </section>

      {/* ─── RIGHT COLUMN (50% SCREEN): CYCLING VISUAL SHOWCASE ─── */}
      <section className="qc-split-visual-col" aria-label="Hospital Environment Showcase">
        {/* Animated Background Slides */}
        <div className="qc-slides-viewport" aria-hidden="true">
          {BACKGROUND_IMAGES.map((item, idx) => (
            <div
              key={item.src}
              className={`qc-slide-img ${idx === bgIndex ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${item.src})` }}
            />
          ))}
          {/* Subtle Ambient Scrim */}
          <div className="qc-visual-scrim" />
        </div>

        {/* Minimalist Floating Overlay Card */}
        <div className="qc-visual-content-overlay">
          <div className="qc-visual-glass-card">
            <h2 className="qc-visual-quote-title">{currentSlide.title}</h2>
            <p className="qc-visual-quote-desc">{currentSlide.subtitle}</p>

            {/* Interactive Carousel Dots */}
            <div className="qc-dots-bar" role="tablist" aria-label="Slideshow Controls">
              {BACKGROUND_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  className={`qc-dot-btn ${idx === bgIndex ? 'is-active' : ''}`}
                  onClick={() => setBgIndex(idx)}
                  aria-selected={idx === bgIndex}
                  aria-label={`Show slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
