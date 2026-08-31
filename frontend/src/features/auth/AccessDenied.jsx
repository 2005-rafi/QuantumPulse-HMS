/**
 * features/auth/AccessDenied.jsx
 * MD3 Access Denied / 403 Forbidden Feedback Screen.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_DEFAULT_ROUTES = {
  Reception: '/dashboard/reception',
  Nurse: '/dashboard/nurse',
  Doctor: '/dashboard/doctor',
  Laboratory: '/dashboard/laboratory',
  Pharmacy: '/dashboard/pharmacy',
  Administrator: '/dashboard/administrator',
};

export const AccessDenied = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    const homeRoute = ROLE_DEFAULT_ROUTES[user?.role] || '/dashboard';
    navigate(homeRoute, { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '24px',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--md-sys-color-surface, #ffffff)',
          border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
          borderRadius: '24px',
          padding: '36px 28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'var(--md-sys-color-error-container, #ffdad6)',
            color: 'var(--md-sys-color-on-error-container, #410002)',
            marginBottom: '20px',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>
            lock_person
          </span>
        </div>

        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--md-sys-color-on-surface, #191c1b)',
            margin: '0 0 8px 0',
          }}
        >
          Access Restricted
        </h1>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--md-sys-color-on-surface-variant, #404944)',
            lineHeight: 1.5,
            margin: '0 0 20px 0',
          }}
        >
          You do not have the required role or permission privileges to view this clinical module.
        </p>

        {user && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container-high, #e6eee9)',
              borderRadius: '100px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--md-sys-color-primary, #006a57)',
              marginBottom: '24px',
            }}
          >
            <span>Current Role: {user.role || 'Unspecified'}</span>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={handleReturn}
            style={{
              padding: '12px 28px',
              backgroundColor: 'var(--md-sys-color-primary, #006a57)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 106, 87, 0.25)',
              transition: 'opacity 0.2s',
            }}
          >
            Return to My Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
