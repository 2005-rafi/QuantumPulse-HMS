import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Md3Avatar } from './Md3Widgets';
import { useConfig } from '../../context/ConfigContext';
import { formatTodayLabel } from '../../utils/dateFormatting';
import './Md3ClinicalDrawer.css';

/**
 * Md3ClinicalDrawer — Reusable Material 3 Standard Navigation Drawer for Mobile & Tablet.
 * Strictly adheres to SOLID principles (SRP, OCP, DIP).
 *
 * Features:
 * - Slide-in spring physics with backdrop scrim
 * - Centralized brand logo management via ConfigContext
 * - Dynamic spacing, margins, and accessible touch targets
 * - Clinical route navigation with active indicators
 * - "Today's Clinical Pulse" KPI metrics with text-wrapping and date badge
 * - Primary quick actions (e.g. Register Patient)
 * - Compact User identity and logout footer
 */
export const Md3ClinicalDrawer = ({
  isOpen,
  onClose,
  brandTitle = 'Quantum CareOne',
  brandSubtitle,
  brandIcon,
  navItems = [],
  sections = [],
  activeTab = '',
  activeSection = '',
  onNavigate,
  onSelectSection,
  pulseTitle,
  activities = [],
  actionSlot,
  user,
  onLogout,
}) => {
  const config = useConfig();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = config?.LOGO_URL || '/logo.svg';

  const resolvedNavItems = useMemo(() => {
    if (Array.isArray(navItems) && navItems.length > 0) return navItems;
    if (Array.isArray(sections) && sections.length > 0) {
      return sections.flatMap((sec) => sec.items || []);
    }
    return [];
  }, [navItems, sections]);

  const resolvedActiveTab = activeTab || activeSection || '';
  const resolvedOnNavigate = onNavigate || onSelectSection;
  const resolvedSubtitle = brandSubtitle !== undefined ? brandSubtitle : (user?.department || 'Clinical Operations');

  const resolvedLogo = useMemo(() => {
    const isDefaultIcon = !brandIcon || (React.isValidElement(brandIcon) && brandIcon.type === Icon.Hospital);
    if (isDefaultIcon && logoUrl && !logoFailed) {
      return (
        <img 
          src={logoUrl} 
          alt="Brand Logo" 
          className="md3-drawer-brand-logo"
          onError={() => setLogoFailed(true)}
        />
      );
    }
    return brandIcon || <Icon.Hospital />;
  }, [brandIcon, logoUrl, logoFailed]);

  const hasLogo = !!(logoUrl && !logoFailed);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AR';

  const userDisplayName = user?.fullName || 'Clinical Staff';
  const userRole = user?.role ? String(user.role).replace(/_/g, ' ') : 'STAFF';

  return createPortal(
    <div className="md3-drawer-portal" role="dialog" aria-modal="true" aria-label="Navigation Drawer">
      {/* Backdrop Scrim */}
      <div className="md3-drawer-scrim" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div className="md3-drawer-surface">
        {/* ── HEADER ── */}
        <div className="md3-drawer-header">
          <div className="md3-drawer-brand">
            <div className={`md3-drawer-brand-icon ${hasLogo ? 'md3-drawer-brand-icon--has-logo' : ''}`}>
              {resolvedLogo}
            </div>
            <div className="md3-drawer-brand-text">
              <span className="md3-drawer-title">{brandTitle}</span>
              {resolvedSubtitle && <span className="md3-drawer-subtitle">{resolvedSubtitle}</span>}
            </div>
          </div>
          <button
            type="button"
            className="md3-drawer-close-btn"
            onClick={onClose}
            aria-label="Close navigation drawer"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* ── ACTION SLOT (e.g. + Register New Patient) ── */}
        {actionSlot && (
          <div className="md3-drawer-action-slot">
            {actionSlot}
          </div>
        )}

        {/* ── SCROLLABLE CONTENT WITH DYNAMIC SPACING ── */}
        <div className="md3-drawer-body">
          {/* Navigation Section */}
          <div className="md3-drawer-section">
            <span className="md3-drawer-section-label">Navigation</span>
            <nav className="md3-drawer-nav">
              {resolvedNavItems.map((item) => {
                const isActive = resolvedActiveTab === item.id;
                const iconContent = typeof item.icon === 'string' ? (
                  <span className="material-symbols-rounded">{item.icon}</span>
                ) : (
                  item.icon
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`md3-drawer-nav-item ${isActive ? 'md3-drawer-nav-item--active' : ''}`}
                    onClick={() => {
                      resolvedOnNavigate?.(item.id);
                      onClose();
                    }}
                  >
                    <span className="md3-drawer-nav-icon">{iconContent}</span>
                    <span className="md3-drawer-nav-label">{item.label}</span>
                    {item.badge && <span className="md3-drawer-nav-badge">{item.badge}</span>}
                    {isActive && <span className="material-symbols-rounded md3-drawer-nav-active-check">chevron_right</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Operational / Clinical Pulse / Activities */}
          {activities && activities.length > 0 && (
            <div className="md3-drawer-section">
              <div className="md3-drawer-section-header">
                <span className="md3-drawer-section-label">{pulseTitle || "Today's Operational Pulse"}</span>
                <span className="md3-drawer-today-badge">
                  <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>calendar_today</span> {formatTodayLabel()}
                </span>
              </div>
              <div className="md3-drawer-activities-list">
                {activities.map((act, index) => {
                  const actIcon = typeof act.icon === 'string' ? (
                    <span className="material-symbols-rounded">{act.icon}</span>
                  ) : (
                    act.icon
                  );

                  return (
                    <div key={index} className={`md3-drawer-activity-card md3-drawer-activity-card--${act.variant || 'default'}`}>
                      <div className="md3-drawer-activity-left">
                        <div className="md3-drawer-activity-icon-wrap">
                          {actIcon}
                        </div>
                        <span className="md3-drawer-activity-label">{act.label}</span>
                      </div>
                      <span className="md3-drawer-activity-val">{act.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── USER FOOTER ── */}
        <div className="md3-drawer-footer">
          <div className="md3-drawer-user-card">
            <Md3Avatar initials={initials} size="small" variant="primary" />
            <div className="md3-drawer-user-info">
              <span className="md3-drawer-user-name">{userDisplayName}</span>
              <span className="md3-drawer-user-role">{userRole}</span>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              className="md3-drawer-logout-btn"
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <span className="material-symbols-rounded">logout</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Md3ClinicalDrawer;
