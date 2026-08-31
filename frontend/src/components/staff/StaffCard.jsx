import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './StaffCard.css';

const CURRENCY_SYMBOL = '₹';

const getStaffInitials = (fullName) => {
  if (!fullName) return 'ST';
  const cleanName = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '');
  return cleanName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * StaffCard — Compact, Informative & Responsive Material 3 Clinical Staff Card.
 * Matches the spatial footprint and aesthetic of PatientCard while tailoring internal
 * clinical metadata (Credentials, Department, Licenses, Consulting Fee, and Lifecycle Actions).
 */
export const StaffCard = ({
  staff,
  onEdit,
  onProgress,
  onDisable,
  onEnable,
  isSelected = false,
}) => {
  if (!staff) return null;

  const fullName = staff.fullName || 'Staff Member';
  const roleName = staff.roleId?.name || staff.role || 'Staff';
  const deptName = staff.departmentId?.name || staff.department || 'General';
  const position = staff.position || '';
  const empId = staff.employeeId || staff.username || (staff._id ? `EMP-${staff._id.slice(-4).toUpperCase()}` : 'EMP');
  const isActive = staff.status === 'Active';

  // Specific clinical license
  const licenseText = staff.medicalLicenseNumber
    ? `Lic: ${staff.medicalLicenseNumber}`
    : staff.nursingLicenseNumber
    ? `Nurse Lic: ${staff.nursingLicenseNumber}`
    : staff.pharmacyLicenseNumber
    ? `Pharm Lic: ${staff.pharmacyLicenseNumber}`
    : staff.labCertificationCode
    ? `Lab Cert: ${staff.labCertificationCode}`
    : null;

  return (
    <div
      className={`md3-staff-card ${isSelected ? 'md3-staff-card--selected' : ''} ${!isActive ? 'md3-staff-card--inactive' : ''}`}
      role="article"
      aria-label={`Staff card for ${fullName}`}
    >
      <div className="md3-staff-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER ── */}
      <div className="md3-staff-card-header">
        <div className="md3-staff-card-avatar-wrap">
          <Md3Avatar
            initials={getStaffInitials(fullName)}
            size="small"
            variant={isActive ? 'primary' : 'neutral'}
          />
        </div>

        <div className="md3-staff-card-identity">
          <h4 className="md3-staff-card-name" title={fullName}>
            {fullName}
          </h4>
          <span className="md3-staff-card-role-line" title={`${roleName}${position ? ` • ${position}` : ''}`}>
            {roleName}{position ? ` • ${position}` : ''}
          </span>
        </div>

        <div className="md3-staff-card-badges">
          <span className={`md3-staff-status-pill ${isActive ? 'md3-staff-status-pill--active' : 'md3-staff-status-pill--disabled'}`}>
            {isActive ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* ── SUB HEADER: EMP ID + DEPARTMENT ── */}
      <div className="md3-staff-card-sub-header">
        <code className="md3-staff-empid-badge" title={`Employee ID: ${empId}`}>
          {empId}
        </code>
        <span className="md3-staff-dept-pill" title={`Department: ${deptName}`}>
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>corporate_fare</span>
          <span className="md3-staff-dept-text">{deptName}</span>
        </span>
      </div>

      {/* ── CARD BODY METADATA ── */}
      <div className="md3-staff-card-details">
        {licenseText && (
          <div className="md3-staff-meta-row" title={licenseText}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
              verified
            </span>
            <span className="md3-staff-meta-text">{licenseText}</span>
          </div>
        )}

        {staff.consultingFee !== undefined && staff.consultingFee > 0 && (
          <div className="md3-staff-meta-row" title={`Consulting Fee: ${CURRENCY_SYMBOL}${staff.consultingFee}`}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#2e7d32' }}>
              payments
            </span>
            <span className="md3-staff-meta-text">
              Fee: <strong>{CURRENCY_SYMBOL}{staff.consultingFee}</strong>
            </span>
          </div>
        )}

        {staff.phone && (
          <div className="md3-staff-meta-row" title={`Phone: ${staff.phone}`}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
              call
            </span>
            <span className="md3-staff-meta-text">{staff.phone}</span>
          </div>
        )}
      </div>

      {/* ── CARD ACTION BUTTONS ── */}
      <div className="md3-staff-card-actions">
        <button
          type="button"
          onClick={() => onEdit?.(staff)}
          className="md3-staff-btn md3-staff-btn--outlined"
          title="Edit staff profile and assignments"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onProgress?.(staff)}
          className="md3-staff-btn md3-staff-btn--outlined"
          title="Manage designation & salary progression"
        >
          Progression
        </button>
        {isActive ? (
          <button
            type="button"
            onClick={() => onDisable?.(staff._id, fullName)}
            className="md3-staff-btn md3-staff-btn--error"
            title="Disable staff account"
          >
            Disable
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onEnable?.(staff._id, fullName)}
            className="md3-staff-btn md3-staff-btn--success"
            title="Re-enable staff account"
          >
            Enable
          </button>
        )}
      </div>
    </div>
  );
};

export default StaffCard;
