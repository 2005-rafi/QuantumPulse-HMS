import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './StaffListView.css';

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
 * Material 3 Clinical List View for Staff Directory.
 * Reusable table component replicating PatientListView structure and aesthetic.
 */
export const StaffListView = ({
  staffList = [],
  onEdit,
  onProgress,
  onDisable,
  onEnable,
}) => {
  if (!staffList || staffList.length === 0) return null;

  return (
    <div className="md3-staff-list-table-container" role="region" aria-label="Staff Directory Table">
      <table className="md3-staff-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-staff-name">Staff Member &amp; ID</th>
            <th scope="col" className="col-staff-dept">Department</th>
            <th scope="col" className="col-staff-role">Role &amp; Position</th>
            <th scope="col" className="col-staff-license">Clinical License / Cert</th>
            <th scope="col" className="col-staff-fee">Consulting Fee</th>
            <th scope="col" className="col-staff-status">Status</th>
            <th scope="col" className="col-staff-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => {
            const staffId = staff._id;
            const fullName = staff.fullName || 'Staff Member';
            const initials = getStaffInitials(fullName);
            const deptName = staff.departmentId?.name || staff.department || '—';
            const roleName = staff.roleId?.name || staff.role || '—';
            const position = staff.position || '';
            const empId = staff.employeeId || staff.username || (staffId ? `EMP-${staffId.slice(-4).toUpperCase()}` : '—');
            const isActive = staff.status === 'Active';

            const licenseText = staff.medicalLicenseNumber ||
              staff.nursingLicenseNumber ||
              staff.pharmacyLicenseNumber ||
              staff.labCertificationCode ||
              '—';

            return (
              <tr
                key={staffId}
                className={`md3-staff-list-row ${!isActive ? 'is-disabled' : ''}`}
                tabIndex={0}
              >
                {/* 1. Name & Employee ID */}
                <td className="col-staff-name">
                  <div className="md3-staff-cell-profile">
                    <Md3Avatar
                      initials={initials}
                      size="small"
                      variant={isActive ? 'primary' : 'neutral'}
                    />
                    <div className="md3-staff-profile-meta">
                      <strong className="md3-staff-name" title={fullName}>
                        {fullName}
                      </strong>
                      <span className="md3-staff-empid">{empId}</span>
                    </div>
                  </div>
                </td>

                {/* 2. Department */}
                <td className="col-staff-dept">
                  <div className="md3-staff-dept-wrapper" title={deptName}>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-primary)' }}>
                      corporate_fare
                    </span>
                    <span>{deptName}</span>
                  </div>
                </td>

                {/* 3. Role & Position */}
                <td className="col-staff-role">
                  <div className="md3-staff-role-badge-group">
                    <span className="md3-staff-role-chip">{roleName}</span>
                    {position && (
                      <span className="md3-staff-pos-chip">{position}</span>
                    )}
                  </div>
                </td>

                {/* 4. License */}
                <td className="col-staff-license">
                  <span className="md3-staff-license-code" title={licenseText}>
                    {licenseText}
                  </span>
                </td>

                {/* 5. Consulting Fee */}
                <td className="col-staff-fee">
                  {staff.consultingFee !== undefined && staff.consultingFee > 0 ? (
                    <span className="md3-staff-fee-badge">
                      {CURRENCY_SYMBOL}{staff.consultingFee}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.4 }}>—</span>
                  )}
                </td>

                {/* 6. Status */}
                <td className="col-staff-status">
                  <span className={`md3-staff-status-pill ${isActive ? 'md3-staff-status-pill--active' : 'md3-staff-status-pill--disabled'}`}>
                    {isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>

                {/* 7. Action Buttons */}
                <td className="col-staff-actions text-right">
                  <div className="md3-staff-table-actions">
                    <button
                      type="button"
                      onClick={() => onEdit?.(staff)}
                      className="md3-staff-table-btn"
                      title="Edit Profile"
                    >
                      <span className="material-symbols-rounded">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onProgress?.(staff)}
                      className="md3-staff-table-btn"
                      title="Salary / Designation Progression"
                    >
                      <span className="material-symbols-rounded">trending_up</span>
                    </button>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => onDisable?.(staff._id, fullName)}
                        className="md3-staff-table-btn md3-staff-table-btn--error"
                        title="Disable Account"
                      >
                        <span className="material-symbols-rounded">block</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEnable?.(staff._id, fullName)}
                        className="md3-staff-table-btn md3-staff-table-btn--success"
                        title="Enable Account"
                      >
                        <span className="material-symbols-rounded">check_circle</span>
                      </button>
                    )}
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

export default StaffListView;
