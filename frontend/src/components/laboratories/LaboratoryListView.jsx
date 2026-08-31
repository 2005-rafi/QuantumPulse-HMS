import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './LaboratoryListView.css';

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
 * Material 3 Clinical List View for Laboratories.
 * Reusable table component replicating PatientListView / StaffListView structure.
 */
export const LaboratoryListView = ({
  laboratories = [],
  onInspect,
  onEdit,
  onEditCatalog,
  onToggleStatus,
  onDelete,
}) => {
  if (!laboratories || laboratories.length === 0) return null;

  return (
    <div className="md3-lab-list-table-container" role="region" aria-label="Laboratory Directory Table">
      <table className="md3-lab-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-lab-name">Laboratory &amp; Code</th>
            <th scope="col" className="col-lab-dept">Parent Department</th>
            <th scope="col" className="col-lab-type">Dept Type</th>
            <th scope="col" className="col-lab-catalog">Test Catalog</th>
            <th scope="col" className="col-lab-status">Status</th>
            <th scope="col" className="col-lab-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {laboratories.map((lab) => {
            const labId = lab._id;
            const isActive = lab.isActive !== false;
            const initials = getLabInitials(lab.name);
            const deptName = lab.departmentId?.name || 'Diagnostic Department';
            const deptCode = lab.departmentId?.code || 'LAB';
            const deptType = lab.departmentId?.type || 'DIAGNOSTIC';
            const testCount = lab.testCatalog?.length || 0;

            return (
              <tr
                key={labId}
                className={`md3-lab-list-row ${!isActive ? 'is-inactive' : ''}`}
                tabIndex={0}
              >
                {/* 1. Name & Code */}
                <td className="col-lab-name">
                  <div className="md3-lab-cell-profile">
                    <Md3Avatar
                      initials={initials}
                      size="small"
                      variant={isActive ? 'primary' : 'neutral'}
                    />
                    <div className="md3-lab-profile-meta">
                      <strong className="md3-lab-name" title={lab.name}>
                        {lab.name}
                      </strong>
                      <span className="md3-lab-code">{deptCode}</span>
                    </div>
                  </div>
                </td>

                {/* 2. Parent Department */}
                <td className="col-lab-dept">
                  <div className="md3-lab-dept-info" title={deptName}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>
                      corporate_fare
                    </span>
                    <span>{deptName}</span>
                  </div>
                </td>

                {/* 3. Dept Type */}
                <td className="col-lab-type">
                  <span className="md3-lab-type-badge">
                    {deptType}
                  </span>
                </td>

                {/* 4. Test Catalog Size */}
                <td className="col-lab-catalog">
                  <span className="md3-lab-catalog-pill">
                    <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>biotech</span>
                    {testCount} tests
                  </span>
                </td>

                {/* 5. Status */}
                <td className="col-lab-status">
                  <span className={`md3-lab-status-pill ${isActive ? 'md3-lab-status-pill--active' : 'md3-lab-status-pill--inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* 6. Actions */}
                <td className="col-lab-actions text-right">
                  <div className="md3-lab-table-actions">
                    <button
                      type="button"
                      onClick={() => onInspect?.(lab)}
                      className="md3-lab-table-btn"
                      title="Inspect Laboratory"
                    >
                      <span className="material-symbols-rounded">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(lab)}
                      className="md3-lab-table-btn"
                      title="Edit Laboratory"
                    >
                      <span className="material-symbols-rounded">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditCatalog?.(lab)}
                      className="md3-lab-table-btn"
                      title="Configure Test Catalog"
                    >
                      <span className="material-symbols-rounded">inventory_2</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(lab._id, lab.name, lab.isActive)}
                      className={`md3-lab-table-btn ${isActive ? 'md3-lab-table-btn--error' : 'md3-lab-table-btn--success'}`}
                      title={isActive ? 'Deactivate Laboratory' : 'Activate Laboratory'}
                    >
                      <span className="material-symbols-rounded">
                        {isActive ? 'block' : 'check_circle'}
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

export default LaboratoryListView;
