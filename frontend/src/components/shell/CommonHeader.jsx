import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Md3Avatar } from '../md3/Md3Widgets';
import { useConfig } from '../../contexts/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import './CommonHeader.css';

/**
 * CommonHeader
 * A generic MD3 top app bar acting as the unified shell header across all roles.
 * Strictly adheres to SOLID principles by decoupling data fetching and state from UI presentation.
 *
 * @param {Object} props
 * @param {string} props.brandTitle - The main application title (e.g. "Administrator Console").
 * @param {string} [props.brandSubtitle] - Optional subtitle (e.g. "Haematology Lab").
 * @param {React.ReactNode} [props.brandIcon] - Optional icon to replace the default hospital icon.
 * @param {React.ReactNode} [props.centerSlot] - Optional component injected in the middle (e.g. tabs or search).
 * @param {Object} props.user - The logged-in user object ({ fullName, role, employeeId, username, department }).
 * @param {Function} props.onLogout - Callback to handle logging out.
 * @param {Array} [props.extraMenuItems] - Optional array of scalable extra actions [{ icon, label, subtitle, onClick, path }].
 */
const CommonHeader = ({
  brandTitle = 'CareOne-QPT Hospital System',
  brandSubtitle,
  brandIcon,
  centerSlot,
  user,
  onLogout,
  extraMenuItems = []
}) => {
  const navigate = useNavigate();
  const config = useConfig();
  const { isDark } = useTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const togglePopover = () => setIsPopoverOpen(prev => !prev);

  const logoUrl = config?.LOGO_URL || '/logo.svg';

  const resolvedLogo = useMemo(() => {
    const isDefaultIcon = !brandIcon || (React.isValidElement(brandIcon) && brandIcon.type === Icon.Hospital);
    if (isDefaultIcon && logoUrl && !logoFailed) {
      return (
        <img 
          src={logoUrl} 
          alt="Brand Logo" 
          className="common-header__brand-logo"
          onError={() => setLogoFailed(true)}
        />
      );
    }
    return brandIcon || <Icon.Hospital />;
  }, [brandIcon, logoUrl, logoFailed]);

  const hasLogo = !!(logoUrl && !logoFailed);

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

  const initials = useMemo(() => {
    const fullName = user?.fullName || '';
    return fullName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user]);

  const displayName = useMemo(() => {
    if (!user?.fullName) return 'Portal User';
    if (user?.role === 'DOCTOR' || user?.role === 'Doctor') {
      return `Dr. ${String(user.fullName).replace(/^Dr\.\s*/i, '')}`;
    }
    return user.fullName;
  }, [user]);

  const roleLabel = useMemo(() => {
    return user?.role ? String(user.role).replace(/_/g, ' ') : 'STAFF';
  }, [user]);

  return (
    <header className="common-header" role="banner">
      {/* Brand Section */}
      <div className="common-header__left">
        <div className={`common-header__brand-icon ${hasLogo ? 'common-header__brand-icon--has-logo' : ''}`}>
          {resolvedLogo}
        </div>
        <div className="common-header__brand-text">
          <h1 className="common-header__title">{brandTitle}</h1>
          {brandSubtitle && (
            <p className="common-header__subtitle">{brandSubtitle}</p>
          )}
        </div>
      </div>

      {/* Center Slot (Tabs, Search Bar) */}
      {centerSlot && (
        <div className="common-header__center">
          {centerSlot}
        </div>
      )}

      {/* User Section */}
      <div className="common-header__right">
        <button
          ref={triggerRef}
          className="common-header__user-trigger"
          onClick={togglePopover}
          aria-haspopup="true"
          aria-expanded={isPopoverOpen}
          aria-label="User menu"
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
              <span className="common-header__popover-name">{displayName}</span>
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
              onClick={() => { setIsPopoverOpen(false); onLogout(); }} 
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
  );
};

export default CommonHeader;
