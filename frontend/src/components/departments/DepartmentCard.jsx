import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './DepartmentCard.css';

const TYPE_COLORS = {
  CLINICAL: { bg: 'var(--md-sys-color-primary-container, #eaddff)', fg: 'var(--md-sys-color-on-primary-container, #21005d)' },
  DIAGNOSTIC: { bg: 'var(--md-sys-color-tertiary-container, #ffd8e4)', fg: 'var(--md-sys-color-on-tertiary-container, #31111d)' },
  'CLINICAL/DIAGNOSTIC': { bg: 'var(--md-sys-color-secondary-container, #e8def8)', fg: 'var(--md-sys-color-on-secondary-container, #1d192b)' },
  SUPPORT: { bg: 'var(--md-sys-color-surface-container-high, #ece6f0)', fg: 'var(--md-sys-color-on-surface-variant, #49454f)' },
  ADMINISTRATIVE: { bg: 'var(--md-sys-color-error-container, #ffdad6)', fg: 'var(--md-sys-color-on-error-container, #410002)' },
};

const getDeptInitials = (name) => {
  if (!name) return 'DP';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * DepartmentCard — Compact Material 3 Clinical Department Card.
 * Matches the spatial footprint and aesthetic of PatientCard & StaffCard.
 */
export const DepartmentCard = ({
  department,
  linkedLabsCount = 0,
  onInspect,
  onEdit,
  onAssignHod,
  onConfigureVitals,
  onToggleStatus,
  isSelected = false,
}) => {
  if (!department) return null;

  const isInactive = department.status === 'Inactive';
  const typeColor = TYPE_COLORS[department.type] || TYPE_COLORS.SUPPORT;
  const hod = department.headOfDepartment;
  const initials = getDeptInitials(department.name);
  const vitalCount = department.vitalFields?.length || 0;

  return (
    <div
      className={`md3-dept-card ${isSelected ? 'md3-dept-card--selected' : ''} ${isInactive ? 'md3-dept-card--inactive' : ''}`}
      role="article"
      aria-label={`Department card for ${department.name}`}
    >
      <div className="md3-dept-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER ── */}
      <div className="md3-dept-card-header">
        <div className="md3-dept-card-avatar-wrap">
          <Md3Avatar
            initials={initials}
            size="small"
            variant={!isInactive ? 'primary' : 'neutral'}
          />
        </div>

        <div className="md3-dept-card-identity">
          <h4 className="md3-dept-card-name" title={department.name}>
            {department.name}
          </h4>
          <span
            className="md3-dept-type-pill"
            style={{ backgroundColor: typeColor.bg, color: typeColor.fg }}
            title={`Department Type: ${department.type}`}
          >
            {department.type}
          </span>
        </div>

        <div className="md3-dept-card-badges">
          <span className={`md3-dept-status-pill ${!isInactive ? 'md3-dept-status-pill--active' : 'md3-dept-status-pill--inactive'}`}>
            {!isInactive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* ── SUB HEADER: CODE + CLINICAL SUMMARY ── */}
      <div className="md3-dept-card-sub-header">
        <code className="md3-dept-code-badge" title={`Department Code: ${department.code || 'N/A'}`}>
          {department.code || 'N/A'}
        </code>
        <span className="md3-dept-counter-pill">
          {(department.type === 'CLINICAL' || department.type === 'CLINICAL/DIAGNOSTIC') ? (
            <span title={`${vitalCount} configured vital field${vitalCount !== 1 ? 's' : ''}`}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>vital_signs</span>
              <span>{vitalCount} Vitals</span>
            </span>
          ) : (department.type === 'DIAGNOSTIC') ? (
            <span title={`${linkedLabsCount} linked laborator${linkedLabsCount !== 1 ? 'ies' : 'y'}`}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>science</span>
              <span>{linkedLabsCount} Labs</span>
            </span>
          ) : (
            <span title="Operational Department">
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>domain</span>
              <span>Hospital Dept</span>
            </span>
          )}
        </span>
      </div>

      {/* ── CARD BODY METADATA (HOD & DESCRIPTION SUMMARY) ── */}
      <div className="md3-dept-card-details">
        <div className="md3-dept-meta-row md3-dept-hod-row" title={hod ? `HOD: ${hod.fullName}` : 'No HOD Assigned'}>
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: hod ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)' }}>
            {hod ? 'person' : 'person_off'}
          </span>
          <span className="md3-dept-meta-text">
            {hod ? <strong>{hod.fullName}</strong> : <em>No HOD Assigned</em>}
          </span>
        </div>
      </div>

      {/* ── CARD ACTION BUTTONS ── */}
      <div className="md3-dept-card-actions">
        <button
          type="button"
          onClick={() => onInspect?.(department)}
          className="md3-dept-btn md3-dept-btn--primary"
          title="View full department details & inspect sub-modules"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>visibility</span>
          Inspect
        </button>
        <button
          type="button"
          onClick={() => onEdit?.(department)}
          className="md3-dept-btn md3-dept-btn--outlined"
          title="Edit Department Details"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onAssignHod?.(department)}
          className="md3-dept-btn md3-dept-btn--outlined"
          title="Assign or Change Head of Department"
        >
          HOD
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus?.(department._id, department.name, department.status)}
          className={`md3-dept-btn ${!isInactive ? 'md3-dept-btn--error' : 'md3-dept-btn--success'}`}
          title={!isInactive ? 'Deactivate Department' : 'Activate Department'}
        >
          {!isInactive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

export default DepartmentCard;
