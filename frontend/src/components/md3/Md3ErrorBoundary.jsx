/**
 * components/md3/Md3ErrorBoundary.jsx
 * Enterprise Material Design 3 Clinical Error Boundary & Route Error Element.
 * Prevents raw developer crash dumps and provides seamless workstation recovery.
 */
import React, { useState } from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import './Md3ErrorBoundary.css';

/**
 * Route-level Error Element for React Router v6
 */
export const Md3RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMessage =
    error?.message ||
    error?.statusText ||
    (typeof error === 'string' ? error : 'An unexpected workstation rendering error occurred.');

  const errorStack = error?.stack || '';

  const handleCopyDiagnostics = () => {
    const payload = `HMS Clinical Diagnostic Log\nTimestamp: ${new Date().toISOString()}\nPath: ${window.location.pathname}\nError: ${errorMessage}\nStack:\n${errorStack}`;
    navigator.clipboard?.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="md3-error-boundary-wrapper" role="alert" aria-live="assertive">
      <div className="md3-error-boundary-card">
        <div className="md3-error-boundary-icon-badge">
          <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>
            healing
          </span>
        </div>

        <div>
          <h2 className="md3-error-boundary-title">Clinical Workspace Recovered</h2>
          <p className="md3-error-boundary-desc" style={{ marginTop: '8px' }}>
            This clinical terminal encountered an unexpected interface disruption. Patient records and backend databases remain fully secured.
          </p>
        </div>

        <div className="md3-error-boundary-actions">
          <button
            type="button"
            className="md3-error-btn md3-error-btn--primary"
            onClick={handleReload}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              refresh
            </span>
            Reload Workspace
          </button>

          <button
            type="button"
            className="md3-error-btn md3-error-btn--outlined"
            onClick={handleGoHome}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              home
            </span>
            Return to Safe Dashboard
          </button>
        </div>

        <div>
          <button
            type="button"
            className="md3-error-diagnostics-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
              {showDetails ? 'expand_less' : 'tune'}
            </span>
            {showDetails ? 'Hide Diagnostics' : 'Technical Diagnostics (For IT / Support)'}
          </button>

          {showDetails && (
            <div style={{ marginTop: '10px' }}>
              <div className="md3-error-diagnostics-box">
                <strong style={{ color: 'var(--md-sys-color-error, #ba1a1a)' }}>{errorMessage}</strong>
                {errorStack && <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{errorStack}</div>}
              </div>
              <button
                type="button"
                className="md3-ward-btn-compact md3-ward-btn-compact--text"
                onClick={handleCopyDiagnostics}
                style={{ marginTop: '8px', fontSize: '0.75rem' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Diagnostic Log Copied!' : 'Copy Diagnostic Report for IT'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Standard React Class Component Error Boundary for component sub-trees
 */
export class Md3ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Component Tree Exception caught by Md3ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <Md3RouteErrorBoundary />;
    }
    return this.props.children;
  }
}

export default Md3ErrorBoundary;
