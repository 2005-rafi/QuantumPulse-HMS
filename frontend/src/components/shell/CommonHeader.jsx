import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Md3Avatar } from '../md3/Md3Widgets';
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
 * @param {Object} props.user - The logged-in user object ({ fullName, role }).
 * @param {Function} props.onLogout - Callback to handle logging out.
 */
const CommonHeader = ({
  brandTitle = 'HMS',
  brandSubtitle,
  brandIcon = <Icon.Hospital />,
  centerSlot,
  user,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const togglePopover = () => setIsPopoverOpen(prev => !prev);

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
        <div className="common-header__brand-icon">
          {brandIcon}
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

        {/* User Popover */}
        <div
          ref={popoverRef}
          className={`common-header__user-popover ${isPopoverOpen ? 'common-header__user-popover--open' : ''}`}
          role="menu"
        >
          <div className="common-header__user-info">
            <span className="common-header__user-name">{displayName}</span>
            <span className="common-header__user-role">{roleLabel}</span>
          </div>
          <button 
            className="common-header__logout-btn" 
            onClick={() => { setIsPopoverOpen(false); navigate('/dashboard/profile'); }} 
            role="menuitem"
            style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant, #e0e0e0)', borderRadius: 0 }}
          >
            <span className="material-symbols-rounded">person</span>
            <span>My Profile</span>
          </button>
          <button className="common-header__logout-btn" onClick={onLogout} role="menuitem">
            <span className="material-symbols-rounded">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CommonHeader;
