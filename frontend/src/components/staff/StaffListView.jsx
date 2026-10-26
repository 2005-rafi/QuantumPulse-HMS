import React from 'react';
import { Md3Avatar } from '../md3/Md3Widgets';
import './StaffListView.css';

const CURRENCY_SYMBOL = '₹';

const getStaffInitials = (fullName) => {
  if (!fullName) return 'ST';
  const cleanName = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Smt\.|Sri\.|Kum\.)\s+/i, '');
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
 * Matches Image 01 Section 4 comprehensive columns:
 * [Emp ID] [Staff Full Name] [Department] [System Role] [Position / Title] [Rank] [Tariff Grade] [Pay / mo] [Reg / License] [Consultation] [Status] [Actions]
 */
export const StaffListView = ({
  staffList = [],
  onEdit,
  onProgress,
  onDisable,
  onEnable,
  onUnlock,
}) => {
  if (!staffList || staffList.length === 0) return null;

  return (
    <div className="md3-staff-list-table-container" role="region" aria-label="Staff Directory Table">
      <table className="md3-staff-list-table">
        <thead>
          <tr>
            <th scope="col" className="col-staff-empid">Emp ID</th>
            <th scope="col" className="col-staff-name">Staff Full Name</th>
            <th scope="col" className="col-staff-dept">Department</th>
            <th scope="col" className="col-staff-role">System Role</th>
            <th scope="col" className="col-staff-position">Position / Title</th>
            <th scope="col" className="col-staff-rank text-center">Rank</th>
            <th scope="col" className="col-staff-grade">Tariff Grade</th>
            <th scope="col" className="col-staff-pay">Pay / mo</th>
            <th scope="col" className="col-staff-license">Reg / License</th>
            <th scope="col" className="col-staff-consultation">Consultation</th>
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
            const position = staff.position || '—';
            const rank = staff.positionRank || '—';
            const tariffGrade = staff.tariffGrade || '—';
            const empId = staff.employeeId || staff.username || (staffId ? `EMP-${staffId.slice(-5).toUpperCase()}` : '—');
            const isLocked = Boolean(staff.isLocked || staff.accountStatus === 'Locked');
            const isActive = staff.status === 'Active' && !isLocked;

            const licenseText = staff.medicalLicenseNumber ||
              staff.nursingLicenseNumber ||
              staff.pharmacyLicenseNumber ||
              staff.labCertificationCode ||
              '—';

            const monthlyPay = staff.baseSalary != null && staff.baseSalary > 0
              ? `${CURRENCY_SYMBOL}${Number(staff.baseSalary).toLocaleString('en-IN')}`
              : '—';

            const consultationFee = staff.consultingFee != null && staff.consultingFee > 0
              ? `${CURRENCY_SYMBOL}${Number(staff.consultingFee).toLocaleString('en-IN')}`
              : (staff.consultingFee === 0 && (roleName === 'Doctor' || roleName === 'Surgeon') ? `${CURRENCY_SYMBOL}0` : '—');

            return (
              <tr
                key={staffId}
                className={`md3-staff-list-row ${!isActive ? 'is-disabled' : ''}`}
                tabIndex={0}
              >
                {/* 1. Emp ID */}
                <td className="col-staff-empid">
                  <span className="md3-staff-empid-pill">
                    {empId}
                  </span>
                </td>

                {/* 2. Staff Full Name */}
                <td className="col-staff-name">
                  <div className="md3-staff-cell-profile">
                    <Md3Avatar
                      initials={initials}
                      size="small"
                      variant={isActive ? 'primary' : 'neutral'}
                    />
                    <strong className="md3-staff-name" title={fullName}>
                      {fullName}
                    </strong>
                  </div>
                </td>

                {/* 3. Department */}
                <td className="col-staff-dept">
                  <span className="md3-staff-dept-text" title={deptName}>
                    {deptName}
                  </span>
                </td>

                {/* 4. System Role */}
                <td className="col-staff-role">
                  <span className="md3-staff-role-chip">
                    {roleName}
                  </span>
                </td>

                {/* 5. Position / Title */}
                <td className="col-staff-position">
                  <span className="md3-staff-position-text" title={position}>
                    {position}
                  </span>
                </td>

                {/* 6. Rank */}
                <td className="col-staff-rank text-center">
                  <span className="md3-staff-rank-badge">
                    {rank}
                  </span>
                </td>

                {/* 7. Tariff Grade */}
                <td className="col-staff-grade">
                  {tariffGrade !== '—' ? (
                    <span className={`md3-staff-tariff-chip md3-staff-tariff-chip--${tariffGrade.toLowerCase()}`}>
                      {tariffGrade}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                  )}
                </td>

                {/* 8. Pay / mo */}
                <td className="col-staff-pay">
                  <span className="md3-staff-pay-val">
                    {monthlyPay}
                  </span>
                </td>

                {/* 9. Reg / License */}
                <td className="col-staff-license">
                  {licenseText !== '—' ? (
                    <span className="md3-staff-license-code" title={licenseText}>
                      {licenseText}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                  )}
                </td>

                {/* 10. Consultation */}
                <td className="col-staff-consultation">
                  {consultationFee !== '—' ? (
                    <span className="md3-staff-fee-badge">
                      {consultationFee}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                  )}
                </td>

                {/* 11. Status */}
                <td className="col-staff-status">
                  {isLocked ? (
                    <span className="md3-staff-status-pill md3-staff-status-pill--locked" title="Account locked due to consecutive failed logins" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>lock</span>
                      <span>Locked</span>
                    </span>
                  ) : (
                    <span className={`md3-staff-status-pill ${isActive ? 'md3-staff-status-pill--active' : 'md3-staff-status-pill--disabled'}`}>
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  )}
                </td>

                {/* 12. Action Buttons */}
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
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => onUnlock?.(staff._id, fullName)}
                        className="md3-staff-table-btn md3-staff-table-btn--warning"
                        title="Unlock Account"
                      >
                        <span className="material-symbols-rounded">lock_open</span>
                      </button>
                    ) : isActive ? (
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
