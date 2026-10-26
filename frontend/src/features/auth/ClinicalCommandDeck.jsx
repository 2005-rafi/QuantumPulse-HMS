import React from 'react';

// Core clinical system qualities and architecture pillars (Qualities, not quantities)
const CLINICAL_QUALITIES = [
  {
    id: 'emr',
    title: 'Unified Care Continuum',
    badge: 'OPD to IPD',
    description: 'Comprehensive longitudinal electronic medical records, structured SOAP notes, and real-time care coordination across all departments.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'security',
    title: 'Role-Secured Isolation',
    badge: 'Least-Privilege',
    description: 'Strict clinical domain boundaries ensuring doctors, nurses, surgeons, lab specialists, and billing staff access only authorized patient data.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'diagnostics',
    title: 'Integrated Lab & Surgery',
    badge: 'Direct Routing',
    description: 'Instant paperless doctor-to-lab diagnostic orders, specimen tracking, and WHO surgical safety verification for operating theatres.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2v7.31M14 2v7.31" />
        <path d="M8.5 2h7" />
        <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
        <path d="M5.52 16h12.96" />
      </svg>
    ),
  },
  {
    id: 'compliance',
    title: 'Audit & Governance',
    badge: 'HIPAA & NABH',
    description: 'Tamper-evident transaction logging, automated clinical audit trails, and strict compliance with national healthcare data standards.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

/**
 * Component: ClinicalCommandDeck
 * 
 * Right-side clinical qualities and architecture showcase.
 * Strictly presents system qualities (not arbitrary numbers/quantities),
 * organized with clean elevation, tactile cards, and clear typography.
 */
export const ClinicalCommandDeck = () => {
  return (
    <div className="qc-qualities-deck" aria-label="Hospital System Capabilities">
      {/* Deck Header */}
      <div className="qc-qualities-header">
        <div className="qc-qualities-badge-row">
          <span className="qc-qualities-pill">
            <span className="qc-pulse-dot" aria-hidden="true" />
            Enterprise Clinical Core
          </span>
          <span className="qc-qualities-node">Active Node</span>
        </div>
        <h2 className="qc-qualities-title">Precision Care Platform</h2>
        <p className="qc-qualities-subtitle">
          Next-generation hospital operating system unifying clinical decision support, diagnostic telemetry, and patient administration.
        </p>
      </div>

      {/* 4 Core Quality Cards */}
      <div className="qc-qualities-grid" role="list">
        {CLINICAL_QUALITIES.map((quality) => (
          <article key={quality.id} className="qc-quality-card" role="listitem">
            <div className="qc-quality-card-top">
              <div className="qc-quality-icon" aria-hidden="true">
                {quality.icon}
              </div>
              <span className="qc-quality-badge">{quality.badge}</span>
            </div>
            <h3 className="qc-quality-name">{quality.title}</h3>
            <p className="qc-quality-desc">{quality.description}</p>
          </article>
        ))}
      </div>

      {/* Compliance / Security Bar */}
      <div className="qc-qualities-footer">
        <div className="qc-qualities-cert-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>HIPAA &amp; NABH Ready</span>
        </div>
        <div className="qc-qualities-cert-divider" aria-hidden="true" />
        <div className="qc-qualities-cert-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>End-to-End Encrypted</span>
        </div>
        <div className="qc-qualities-cert-divider" aria-hidden="true" />
        <div className="qc-qualities-cert-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>24/7 Enterprise Uptime</span>
        </div>
      </div>
    </div>
  );
};

export default ClinicalCommandDeck;
