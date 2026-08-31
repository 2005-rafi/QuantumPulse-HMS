import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './LaboratoryCard.css';

const getLabInitials = (name) => {
  if (!name) return 'LB';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * LaboratoryCard — Compact Material 3 Clinical Laboratory Card.
 * Standardizes spatial footprint with PatientCard, StaffCard & DepartmentCard.
 */
export const LaboratoryCard = ({
  lab,
  onInspect,
  onEdit,
  onEditCatalog,
  onToggleStatus,
  onDelete,
  isSelected = false,
}) => {
  if (!lab) return null;

  const isActive = lab.isActive !== false;
  const initials = getLabInitials(lab.name);
  const deptName = lab.departmentId?.name || 'Diagnostic Department';
  const deptCode = lab.departmentId?.code || 'LAB';
  const testCount = lab.testCatalog?.length || 0;

  return (
    <div
      className={`md3-lab-card ${isSelected ? 'md3-lab-card--selected' : ''} ${!isActive ? 'md3-lab-card--inactive' : ''}`}
      role="article"
      aria-label={`Laboratory card for ${lab.name}`}
    >
      <div className="md3-lab-card-rail" aria-hidden="true" />

      {/* ── CARD HEADER ── */}
      <div className="md3-lab-card-header">
        <div className="md3-lab-card-avatar-wrap">
          <Md3Avatar
            initials={initials}
            size="small"
            variant={isActive ? 'primary' : 'neutral'}
          />
        </div>

        <div className="md3-lab-card-identity">
          <h4 className="md3-lab-card-name" title={lab.name}>
            {lab.name}
          </h4>
          <span className="md3-lab-dept-pill" title={`Department: ${deptName}`}>
            {deptName}
          </span>
        </div>

        <div className="md3-lab-card-badges">
          <span className={`md3-lab-status-pill ${isActive ? 'md3-lab-status-pill--active' : 'md3-lab-status-pill--inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* ── SUB HEADER: DEPT CODE + TEST CATALOG COUNT ── */}
      <div className="md3-lab-card-sub-header">
        <code className="md3-lab-code-badge" title={`Department Code: ${deptCode}`}>
          {deptCode}
        </code>
        <span className="md3-lab-test-counter" title={`${testCount} configured tests in catalog`}>
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>biotech</span>
          <span>{testCount} Test{testCount !== 1 ? 's' : ''}</span>
        </span>
      </div>

      {/* ── CARD BODY METADATA ── */}
      <div className="md3-lab-card-details">
        <div className="md3-lab-meta-row" title={`Classification: Diagnostic Services`}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
            science
          </span>
          <span className="md3-lab-meta-text">Diagnostic Testing Facility</span>
        </div>
      </div>

      {/* ── CARD ACTION BUTTONS ── */}
      <div className="md3-lab-card-actions">
        <button
          type="button"
          onClick={() => onInspect?.(lab)}
          className="md3-lab-btn md3-lab-btn--primary"
          title="Inspect Laboratory Details & Test Catalog"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>visibility</span>
          Inspect
        </button>
        <button
          type="button"
          onClick={() => onEdit?.(lab)}
          className="md3-lab-btn md3-lab-btn--outlined"
          title="Edit Laboratory Details"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onEditCatalog?.(lab)}
          className="md3-lab-btn md3-lab-btn--outlined"
          title="Configure Test Catalog Schema"
        >
          Catalog
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus?.(lab._id, lab.name, lab.isActive)}
          className={`md3-lab-btn ${isActive ? 'md3-lab-btn--error' : 'md3-lab-btn--success'}`}
          title={isActive ? 'Deactivate Laboratory' : 'Activate Laboratory'}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

export default LaboratoryCard;
