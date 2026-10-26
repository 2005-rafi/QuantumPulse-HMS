import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Md3Avatar } from '../md3/Md3Widgets';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandLogo, OfficialHospitalLogo } from '../brand/BrandLogo';
import { formatDoctorName } from '../../utils/patientFormatters';
import Md3MarqueeText from '../md3/Md3MarqueeText';
import { useAuth } from '../../context/AuthContext';
import OmnisearchModal from './OmnisearchModal';
import NotificationCenter from './NotificationCenter';
import './CommonHeader.css';

/**
 * CommonHeader
 * A generic Material 3 top app bar acting as the unified shell header across all roles.
 * Decoupled, responsive, and equipped with a drawer overlay for tablet/mobile viewports.
 *
 * @param {Object} props
 * @param {string} props.brandTitle - The main application title (e.g. "Administrator Console").
 * @param {string} [props.brandSubtitle] - Optional subtitle (e.g. "Haematology Lab").
 * @param {React.ReactNode} [props.brandIcon] - Optional icon to replace the default hospital icon.
 * @param {React.ReactNode} [props.centerSlot] - Optional component injected in the middle (e.g. Md3Tabs).
 * @param {Array} [props.tabs] - Optional explicit array of navigation tabs [{ id, label, icon, badge }].
 * @param {string} [props.activeTab] - Optional active tab ID.
 * @param {Function} [props.onTabChange] - Optional tab change callback.
 * @param {Object} props.user - The logged-in user object ({ fullName, role, employeeId, username, department }).
 * @param {Function} props.onLogout - Callback to handle logging out.
 * @param {Array} [props.extraMenuItems] - Optional array of scalable extra actions [{ icon, label, subtitle, onClick, path }].
 * @param {Function} [props.onMenuClick] - Optional custom drawer trigger handler.
 * @param {React.ReactNode} [props.quickActionSlot] - Optional quick action buttons (e.g. alerts, theme toggles).
 */
const CommonHeader = ({
  brandTitle = 'CareOne-QPT Hospital System',
  brandSubtitle,
  brandIcon,
  centerSlot,
  tabs,
  activeTab,
  onTabChange,
  user,
  onLogout,
  extraMenuItems = [],
  onMenuClick,
  quickActionSlot,
}) => {
  const navigate = useNavigate();
  const config = useConfig();
  const { isDark } = useTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOmnisearchOpen, setIsOmnisearchOpen] = useState(false);

  const authContext = useAuth();
  const effectiveUser = user || authContext?.user;

  // Omnisearch role access: Only Reception, Doctor, Billing, and Administration
  const isOmnisearchPermitted = useMemo(() => {
    const rawRole = String(effectiveUser?.role || '').toLowerCase().trim();
    return ['reception', 'doctor', 'billing', 'cashier', 'administrator', 'admin'].includes(rawRole);
  }, [effectiveUser?.role]);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K to launch Omnisearch Palette (Only for permitted roles)
  useEffect(() => {
    if (!isOmnisearchPermitted) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmnisearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOmnisearchPermitted]);

  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  // Derive navigation tabs from either explicit props or centerSlot (Md3Tabs)
  const resolvedTabs = useMemo(() => {
    if (tabs && Array.isArray(tabs)) return tabs;
    if (centerSlot && centerSlot.props && Array.isArray(centerSlot.props.tabs)) {
      return centerSlot.props.tabs;
    }
    return [];
  }, [tabs, centerSlot]);

  const resolvedActiveTab = useMemo(() => {
    if (activeTab !== undefined) return activeTab;
    if (centerSlot && centerSlot.props && centerSlot.props.activeTab !== undefined) {
      return centerSlot.props.activeTab;
    }
    return '';
  }, [activeTab, centerSlot]);

  const resolvedOnTabChange = useMemo(() => {
    if (onTabChange) return onTabChange;
    if (centerSlot && centerSlot.props && typeof centerSlot.props.onChange === 'function') {
      return centerSlot.props.onChange;
    }
    return null;
  }, [onTabChange, centerSlot]);

  const handleTabSelect = (tabId) => {
    closeDrawer();
    if (resolvedOnTabChange) {
      resolvedOnTabChange(tabId);
    }
  };

  const resolvedLogo = useMemo(() => {
    if (brandIcon && React.isValidElement(brandIcon) && brandIcon.type !== Icon.Hospital) {
      return brandIcon;
    }
    return <OfficialHospitalLogo width="32px" height="28px" />;
  }, [brandIcon]);

  const hasLogo = true;

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPopoverOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Handle Escape key to close drawer or popover
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (isPopoverOpen) setIsPopoverOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isPopoverOpen]);

  const initials = useMemo(() => {
    const fullName = user?.fullName || '';
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    if (!user?.fullName) return 'Portal User';
    if (user?.role === 'DOCTOR' || user?.role === 'Doctor') {
      return formatDoctorName(user);
    }
    return user.fullName;
  }, [user]);

  const roleLabel = useMemo(() => {
    return user?.role ? String(user.role).replace(/_/g, ' ') : 'STAFF';
  }, [user]);

  const hasDrawer = resolvedTabs.length > 0 || Boolean(onMenuClick);

  return (
    <>
      <header className="common-header" role="banner">
        {/* Brand Section */}
        <div className="common-header__left">
          {hasDrawer && (
            <button
              type="button"
              className="common-header__menu-trigger"
              onClick={() => {
                if (onMenuClick) onMenuClick();
                else setIsDrawerOpen(true);
              }}
              aria-label="Open navigation drawer"
              title="Navigation Menu"
            >
              <span className="material-symbols-rounded">menu</span>
            </button>
          )}

          <div className={`common-header__brand-icon ${hasLogo ? 'common-header__brand-icon--has-logo' : ''}`}>
            {resolvedLogo}
          </div>

          <div className="common-header__brand-text" title={`${brandTitle}${brandSubtitle ? ` — ${brandSubtitle}` : ''}`}>
            <Md3MarqueeText
              as="h1"
              className="common-header__title"
              text={brandTitle}
              autoAnimate
            />
            {brandSubtitle && (
              <Md3MarqueeText
                as="p"
                className="common-header__subtitle"
                text={brandSubtitle}
                autoAnimate
              />
            )}
          </div>
        </div>

        {/* Center Slot (Desktop Tabs / Search Bar) */}
        {centerSlot && (
          <div className="common-header__center">
            {centerSlot}
          </div>
        )}

        {/* User Section & Quick Action Slot */}
        <div className="common-header__right">
          {/* Global Omnisearch Trigger Pill - Visible only to Reception, Doctor, Billing, and Administration */}
          {isOmnisearchPermitted && (
            <button
              type="button"
              className="common-header__search-trigger"
              onClick={() => setIsOmnisearchOpen(true)}
              title="Advanced Search (Ctrl+K)"
              aria-label="Advanced Search"
            >
              <span className="material-symbols-rounded common-header__search-icon">search</span>
              <span className="common-header__search-text">Search...</span>
              <kbd className="common-header__search-kbd">Ctrl K</kbd>
            </button>
          )}

          {/* Persistent Notification Bell & Alert Center */}
          <NotificationCenter />

          {quickActionSlot && (
            <div className="common-header__quick-action">
              {quickActionSlot}
            </div>
          )}
          <button
            ref={triggerRef}
            className="common-header__user-trigger"
            onClick={togglePopover}
            aria-haspopup="true"
            aria-expanded={isPopoverOpen}
            aria-label="User menu"
            title={`${displayName} (${roleLabel})`}
          >
            <Md3Avatar initials={initials} size="medium" variant="primary" />
          </button>

          {/* Scalable Material 3 User Popover Menu */}
          <div
            ref={popoverRef}
            className={`common-header__user-popover ${isPopoverOpen ? 'common-header__user-popover--open' : ''}`}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header Identity Card */}
            <div className="common-header__popover-header">
              <div className="common-header__popover-avatar">
                {initials}
              </div>
              <div className="common-header__popover-identity">
                <span className="common-header__popover-name" title={displayName}>{displayName}</span>
                <div className="common-header__popover-tags">
                  <span className="common-header__popover-role-badge">{roleLabel}</span>
                  {user?.department && (
                    <span className="common-header__popover-dept-badge">{user.department}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="common-header__popover-divider" />

            {/* Navigation Action Items */}
            <div className="common-header__popover-nav">
              <button
                type="button"
                className="common-header__menu-item"
                onClick={() => { setIsPopoverOpen(false); navigate('/dashboard/profile'); }}
                role="menuitem"
              >
                <div className="common-header__menu-icon-wrap">
                  <span className="material-symbols-rounded">account_circle</span>
                </div>
                <div className="common-header__menu-text">
                  <span className="common-header__menu-title">My Profile</span>
                  <span className="common-header__menu-sub">Credentials, assignment &amp; details</span>
                </div>
                <span className="material-symbols-rounded common-header__menu-chevron">chevron_right</span>
              </button>

              {/* Scalable Custom Items */}
              {extraMenuItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className="common-header__menu-item"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    if (item.onClick) item.onClick();
                    if (item.path) navigate(item.path);
                  }}
                  role="menuitem"
                >
                  <div className="common-header__menu-icon-wrap">
                    <span className="material-symbols-rounded">{item.icon || 'star'}</span>
                  </div>
                  <div className="common-header__menu-text">
                    <span className="common-header__menu-title">{item.label}</span>
                    {item.subtitle && <span className="common-header__menu-sub">{item.subtitle}</span>}
                  </div>
                  <span className="material-symbols-rounded common-header__menu-chevron">chevron_right</span>
                </button>
              ))}
            </div>

            <div className="common-header__popover-divider" />

            {/* Footer Action */}
            <div className="common-header__popover-footer">
              <button
                type="button"
                className="common-header__menu-item common-header__menu-item--logout"
                onClick={() => { setIsPopoverOpen(false); onLogout?.(); }}
                role="menuitem"
              >
                <div className="common-header__menu-icon-wrap common-header__menu-icon-wrap--logout">
                  <span className="material-symbols-rounded">logout</span>
                </div>
                <div className="common-header__menu-text">
                  <span className="common-header__menu-title">Sign Out</span>
                  <span className="common-header__menu-sub">End active portal session</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Material 3 Expressive Tablet & Mobile Navigation Drawer Overlay ─── */}
      {hasDrawer && (
        <>
          <div
            className={`common-header__drawer-backdrop ${isDrawerOpen ? 'common-header__drawer-backdrop--open' : ''}`}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <aside
            className={`common-header__drawer ${isDrawerOpen ? 'common-header__drawer--open' : ''}`}
            aria-label="Navigation Drawer"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Top Branding Header */}
            <div className="common-header__drawer-header">
              <div className="common-header__drawer-brand">
                <div className="common-header__drawer-logo">
                  {resolvedLogo}
                </div>
                <div className="common-header__drawer-titles">
                  <h2 className="common-header__drawer-title">{brandTitle}</h2>
                  {brandSubtitle && (
                    <p className="common-header__drawer-subtitle">{brandSubtitle}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="common-header__drawer-close-btn"
                onClick={closeDrawer}
                aria-label="Close navigation drawer"
                title="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* User Profile Capsule in Drawer */}
            <div className="common-header__drawer-user-card">
              <div className="common-header__drawer-avatar">
                {initials}
              </div>
              <div className="common-header__drawer-user-info">
                <strong className="common-header__drawer-user-name">{displayName}</strong>
                <div className="common-header__drawer-user-meta">
                  <span className="common-header__drawer-role-tag">{roleLabel}</span>
                  {user?.department && (
                    <span className="common-header__drawer-dept-tag">{user.department}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Navigation Links */}
            <div className="common-header__drawer-body">
              <div className="common-header__drawer-section-title">Workstation Navigation</div>
              <nav className="common-header__drawer-nav">
                {resolvedTabs.map((tab) => {
                  const isActive = resolvedActiveTab === tab.id;
                  const iconElement = typeof tab.icon === 'string' ? (
                    <span className="material-symbols-rounded">{tab.icon}</span>
                  ) : (
                    tab.icon
                  );

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`common-header__drawer-nav-item ${isActive ? 'common-header__drawer-nav-item--active' : ''}`}
                      onClick={() => handleTabSelect(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="common-header__drawer-nav-icon">
                        {iconElement || <span className="material-symbols-rounded">tab</span>}
                      </div>
                      <span className="common-header__drawer-nav-label">{tab.label}</span>
                      {tab.badge !== undefined && tab.badge !== null && (
                        <span className="common-header__drawer-nav-badge">{tab.badge}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="common-header__drawer-footer">
              <button
                type="button"
                className="common-header__drawer-footer-btn"
                onClick={() => { closeDrawer(); navigate('/dashboard/profile'); }}
              >
                <span className="material-symbols-rounded">account_circle</span>
                <span>My Profile</span>
              </button>

              <button
                type="button"
                className="common-header__drawer-footer-btn common-header__drawer-footer-btn--logout"
                onClick={() => { closeDrawer(); onLogout?.(); }}
              >
                <span className="material-symbols-rounded">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Global Omnisearch Command Palette Modal - Accessible only to authorized clinical & admin roles */}
      {isOmnisearchPermitted && (
        <OmnisearchModal
          isOpen={isOmnisearchOpen}
          onClose={() => setIsOmnisearchOpen(false)}
        />
      )}
    </>
  );
};

export default CommonHeader;
