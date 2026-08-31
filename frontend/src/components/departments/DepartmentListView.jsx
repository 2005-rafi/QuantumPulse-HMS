import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './DepartmentListView.css';

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
 * Material 3 Clinical List View for Departments.
 * Reusable table component replicating PatientListView / StaffListView structure.
 */
export const DepartmentListView = ({
  departments = [],
  laboratories = [],
  onInspect,
  onEdit,
  onAssignHod,
  onToggleStatus,
}) => {
  if (!departments || departments.length === 0) return null;

  return (
    <div className="md3-dept-list-table-container" role="region" aria-label="Department Directory Table">
      <table className="md3-dept-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-dept-name">Department &amp; Code</th>
            <th scope="col" className="col-dept-type">Classification</th>
            <th scope="col" className="col-dept-hod">Head of Department</th>
            <th scope="col" className="col-dept-vitals">Clinical Setup</th>
            <th scope="col" className="col-dept-status">Status</th>
            <th scope="col" className="col-dept-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => {
            const deptId = dept._id;
            const isInactive = dept.status === 'Inactive';
            const typeColor = TYPE_COLORS[dept.type] || TYPE_COLORS.SUPPORT;
            const initials = getDeptInitials(dept.name);
            const hod = dept.headOfDepartment;
            const vitalCount = dept.vitalFields?.length || 0;
            const linkedLabs = laboratories.filter(
              (lab) => (lab.departmentId?._id || lab.departmentId) === deptId
            );

            return (
              <tr
                key={deptId}
                className={`md3-dept-list-row ${isInactive ? 'is-inactive' : ''}`}
                tabIndex={0}
              >
                {/* 1. Name & Code */}
                <td className="col-dept-name">
                  <div className="md3-dept-cell-profile">
                    <Md3Avatar
                      initials={initials}
                      size="small"
                      variant={!isInactive ? 'primary' : 'neutral'}
                    />
                    <div className="md3-dept-profile-meta">
                      <strong className="md3-dept-name" title={dept.name}>
                        {dept.name}
                      </strong>
                      <span className="md3-dept-code">{dept.code || 'N/A'}</span>
                    </div>
                  </div>
                </td>

                {/* 2. Type Classification */}
                <td className="col-dept-type">
                  <span
                    className="md3-dept-type-badge"
                    style={{ backgroundColor: typeColor.bg, color: typeColor.fg }}
                  >
                    {dept.type}
                  </span>
                </td>

                {/* 3. Head of Department */}
                <td className="col-dept-hod">
                  {hod ? (
                    <div className="md3-dept-hod-info" title={`${hod.fullName} (${hod.position || 'HOD'})`}>
                      <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>
                        person
                      </span>
                      <div className="md3-dept-hod-text">
                        <strong>{hod.fullName}</strong>
                        {hod.position && <small>{hod.position}</small>}
                      </div>
                    </div>
                  ) : (
                    <span className="md3-dept-no-hod">No HOD assigned</span>
                  )}
                </td>

                {/* 4. Clinical Setup */}
                <td className="col-dept-vitals">
                  {(dept.type === 'CLINICAL' || dept.type === 'CLINICAL/DIAGNOSTIC') ? (
                    <span className="md3-dept-setup-pill">
                      <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>vital_signs</span>
                      {vitalCount} vital fields
                    </span>
                  ) : (dept.type === 'DIAGNOSTIC') ? (
                    <span className="md3-dept-setup-pill">
                      <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>science</span>
                      {linkedLabs.length} linked labs
                    </span>
                  ) : (
                    <span style={{ opacity: 0.5, fontSize: '12px' }}>Operational</span>
                  )}
                </td>

                {/* 5. Status */}
                <td className="col-dept-status">
                  <span className={`md3-dept-status-pill ${!isInactive ? 'md3-dept-status-pill--active' : 'md3-dept-status-pill--inactive'}`}>
                    {!isInactive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* 6. Actions */}
                <td className="col-dept-actions text-right">
                  <div className="md3-dept-table-actions">
                    <button
                      type="button"
                      onClick={() => onInspect?.(dept)}
                      className="md3-dept-table-btn"
                      title="Inspect Department"
                    >
                      <span className="material-symbols-rounded">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(dept)}
                      className="md3-dept-table-btn"
                      title="Edit Department"
                    >
                      <span className="material-symbols-rounded">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssignHod?.(dept)}
                      className="md3-dept-table-btn"
                      title="Assign HOD"
                    >
                      <span className="material-symbols-rounded">person_add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(dept._id, dept.name, dept.status)}
                      className={`md3-dept-table-btn ${!isInactive ? 'md3-dept-table-btn--error' : 'md3-dept-table-btn--success'}`}
                      title={!isInactive ? 'Deactivate Department' : 'Activate Department'}
                    >
                      <span className="material-symbols-rounded">
                        {!isInactive ? 'block' : 'check_circle'}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentListView;
