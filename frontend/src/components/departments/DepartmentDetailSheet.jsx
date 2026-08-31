import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Avatar } from '../md3/Md3Widgets';
import './DepartmentDetailSheet.css';

const TYPE_COLORS = {
  CLINICAL: { bg: 'var(--md-sys-color-primary-container, #eaddff)', fg: 'var(--md-sys-color-on-primary-container, #21005d)' },
  DIAGNOSTIC: { bg: 'var(--md-sys-color-tertiary-container, #ffd8e4)', fg: 'var(--md-sys-color-on-tertiary-container, #31111d)' },
  'CLINICAL/DIAGNOSTIC': { bg: 'var(--md-sys-color-secondary-container, #e8def8)', fg: 'var(--md-sys-color-on-secondary-container, #1d192b)' },
  SUPPORT: { bg: 'var(--md-sys-color-surface-container-high, #ece6f0)', fg: 'var(--md-sys-color-on-surface-variant, #49454f)' },
  ADMINISTRATIVE: { bg: 'var(--md-sys-color-error-container, #ffdad6)', fg: 'var(--md-sys-color-on-error-container, #410002)' },
};

export const DepartmentDetailSheet = ({
  department,
  laboratories = [],
  isOpen,
  onClose,
  onEdit,
  onAssignHod,
  onConfigureVitals,
  onAddLab,
  onEditLabCatalog,
  onToggleStatus,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !department) return null;

  const isInactive = department.status === 'Inactive';
  const typeColor = TYPE_COLORS[department.type] || TYPE_COLORS.SUPPORT;
  const hod = department.headOfDepartment;
  const linkedLabs = laboratories.filter(
    (lab) => (lab.departmentId?._id || lab.departmentId) === department._id
  );
  const vitalFields = department.vitalFields || [];

  return createPortal(
    <div className="md3-detail-sheet-overlay" onClick={onClose}>
      <div
        className="md3-detail-sheet-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${department.name}`}
      >
        {/* ── HEADER ── */}
        <div className="md3-detail-sheet-header">
          <div className="md3-detail-sheet-header-info">
            <span
              className="md3-detail-type-pill"
              style={{ backgroundColor: typeColor.bg, color: typeColor.fg }}
            >
              {department.type}
            </span>
            <h2 className="md3-detail-sheet-title">{department.name}</h2>
            <div className="md3-detail-header-badges">
              <code className="md3-detail-code-badge">{department.code || 'N/A'}</code>
              <span className={`md3-detail-status-pill ${!isInactive ? 'active' : 'inactive'}`}>
                {!isInactive ? 'Active Department' : 'Inactive Department'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="md3-detail-close-btn"
            onClick={onClose}
            title="Close Inspector"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* ── SCROLLABLE BODY CONTENT ── */}
        <div className="md3-detail-sheet-body">
          {/* Section 1: Overview & Description */}
          <section className="md3-detail-section">
            <h4 className="md3-detail-section-title">
              <span className="material-symbols-rounded">info</span>
              Department Description
            </h4>
            <div className="md3-detail-card">
              <p className="md3-detail-desc-text">
                {department.description || 'No detailed description provided for this department.'}
              </p>
            </div>
          </section>

          {/* Section 2: Head of Department Leadership */}
          <section className="md3-detail-section">
            <div className="md3-detail-section-header">
              <h4 className="md3-detail-section-title">
                <span className="material-symbols-rounded">military_tech</span>
                Leadership &amp; HOD
              </h4>
              <button
                type="button"
                className="md3-detail-action-link"
                onClick={() => onAssignHod?.(department)}
              >
                <span className="material-symbols-rounded">person_add</span>
                {hod ? 'Reassign HOD' : 'Assign HOD'}
              </button>
            </div>

            <div className="md3-detail-card">
              {hod ? (
                <div className="md3-detail-hod-card">
                  <Md3Avatar initials={hod.fullName?.slice(0, 2)?.toUpperCase() || 'HD'} size="medium" variant="primary" />
                  <div className="md3-detail-hod-details">
                    <strong>{hod.fullName}</strong>
                    <span>{hod.position || 'Head of Department'}</span>
                    {hod.employeeId && <small>ID: {hod.employeeId}</small>}
                  </div>
                </div>
              ) : (
                <div className="md3-detail-empty-hint">
                  <span className="material-symbols-rounded">person_off</span>
                  <span>No Head of Department currently assigned to this department.</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Clinical Vitals Schema (For Clinical & Clinical/Diag) */}
          {(department.type === 'CLINICAL' || department.type === 'CLINICAL/DIAGNOSTIC') && (
            <section className="md3-detail-section">
              <div className="md3-detail-section-header">
                <h4 className="md3-detail-section-title">
                  <span className="material-symbols-rounded">vital_signs</span>
                  Clinical Vitals Schema ({vitalFields.length})
                </h4>
                <button
                  type="button"
                  className="md3-detail-action-link"
                  onClick={() => onConfigureVitals?.(department)}
                >
                  <span className="material-symbols-rounded">tune</span>
                  Configure Schema
                </button>
              </div>

              <div className="md3-detail-card">
                {vitalFields.length > 0 ? (
                  <div className="md3-detail-vitals-grid">
                    {vitalFields.map((field, idx) => (
                      <div key={field.name || idx} className="md3-detail-vital-item">
                        <div className="md3-detail-vital-name">
                          <strong>{field.label || field.name}</strong>
                          {field.unit && <span className="md3-detail-vital-unit">({field.unit})</span>}
                        </div>
                        <div className="md3-detail-vital-meta">
                          {field.required ? (
                            <span className="vital-req-badge">Required</span>
                          ) : (
                            <span className="vital-opt-badge">Optional</span>
                          )}
                          {field.targetRange && (
                            <span className="vital-range-text">Range: {field.targetRange}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="md3-detail-empty-hint">
                    <span className="material-symbols-rounded">vital_signs</span>
                    <span>No clinical vitals configured. Click Configure Schema to set triage fields.</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 4: Linked Laboratories (For Diagnostic & Clinical/Diag) */}
          {(department.type === 'DIAGNOSTIC' || department.type === 'CLINICAL/DIAGNOSTIC') && (
            <section className="md3-detail-section">
              <div className="md3-detail-section-header">
                <h4 className="md3-detail-section-title">
                  <span className="material-symbols-rounded">science</span>
                  Linked Laboratories ({linkedLabs.length})
                </h4>
                <button
                  type="button"
                  className="md3-detail-action-link"
                  onClick={() => onAddLab?.(department)}
                >
                  <span className="material-symbols-rounded">add</span>
                  Add Laboratory
                </button>
              </div>

              <div className="md3-detail-card">
                {linkedLabs.length > 0 ? (
                  <div className="md3-detail-labs-list">
                    {linkedLabs.map((lab) => (
                      <div key={lab._id} className="md3-detail-lab-row">
                        <div className="md3-detail-lab-info">
                          <strong>{lab.name}</strong>
                          <span className="md3-detail-lab-count">
                            {(lab.testCatalog?.length || 0)} test catalog items
                          </span>
                        </div>
                        <button
                          type="button"
                          className="md3-detail-btn-manage-tests"
                          onClick={() => onEditLabCatalog?.(lab)}
                        >
                          <span className="material-symbols-rounded">inventory_2</span>
                          Manage Tests
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="md3-detail-empty-hint">
                    <span className="material-symbols-rounded">science</span>
                    <span>No laboratories linked. Click Add Laboratory to create one.</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── ACTION FOOTER ── */}
        <div className="md3-detail-sheet-footer">
          <button
            type="button"
            className="md3-detail-footer-btn md3-detail-footer-btn--primary"
            onClick={() => onEdit?.(department)}
          >
            <span className="material-symbols-rounded">edit</span>
            Edit Department
          </button>
          <button
            type="button"
            className={`md3-detail-footer-btn ${!isInactive ? 'md3-detail-footer-btn--error' : 'md3-detail-footer-btn--success'}`}
            onClick={() => onToggleStatus?.(department._id, department.name, department.status)}
          >
            <span className="material-symbols-rounded">
              {!isInactive ? 'block' : 'check_circle'}
            </span>
            {!isInactive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            className="md3-detail-footer-btn md3-detail-footer-btn--outlined"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DepartmentDetailSheet;
