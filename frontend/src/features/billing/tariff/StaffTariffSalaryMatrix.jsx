import React, { useState, useEffect } from 'react';
import { staffAPI } from '../../../services/staffAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { SALARY_BANDS, TARIFF_GRADES } from '../../../core/constants';
import './StaffTariffSalaryMatrix.css';

const MATRIX_DATA = [
  {
    grade: 'GRADE_1',
    band: 'Band A: Entry / Support',
    ranks: 'Rank 1–2',
    payRange: '₹20,000 – ₹35,000',
    minPay: 20000,
    maxPay: 35000,
    roles: 'Front Desk Assistants, Receptionists, Nursing Assistants, Lab Assistants, Pharmacy Assistants, Medical/Surgical Interns, Junior Ward Executives, Housekeeping.',
    billingImpact: 'Base service rates; Junior support tariff tier; Intern consultation locked to ₹0.',
    color: '#0284c7',
  },
  {
    grade: 'GRADE_2',
    band: 'Band B: Operational / Associate',
    ranks: 'Rank 3–4',
    payRange: '₹35,000 – ₹60,000',
    minPay: 35000,
    maxPay: 60000,
    roles: 'Staff Nurses (OPD, IPD, Lab), Senior Receptionists, Lab Technicians, Pharmacy Technicians, Resident Doctors, Surgical Residents, Junior Billing Executives.',
    billingImpact: 'Standard operational billing schedule; Resident clinical procedural fee scale.',
    color: '#0d9488',
  },
  {
    grade: 'GRADE_3',
    band: 'Band C: Senior / Specialist',
    ranks: 'Rank 5–6',
    payRange: '₹60,000 – ₹1,20,000',
    minPay: 60000,
    maxPay: 120000,
    roles: 'Senior Consultants, Head Nurses, Lab Supervisors, Senior Pharmacists, Operations Managers, Senior Billing Officers, Associate Consultants.',
    billingImpact: 'Specialist consultation pricing; Advanced procedural and diagnostic interpretation tariff.',
    color: '#7c3aed',
  },
  {
    grade: 'GRADE_4',
    band: 'Band D: Leadership / HOD',
    ranks: 'Rank 7–8',
    payRange: '₹1,20,000 – ₹2,50,000',
    minPay: 120000,
    maxPay: 250000,
    roles: 'Heads of Clinical Departments, Chief Lab Nursing Officers, Laboratory Directors, Nursing Superintendents, Medical Superintendents.',
    billingImpact: 'Department Head & Super-Specialist institutional consultation tariff schedule.',
    color: '#c026d3',
  },
  {
    grade: 'GRADE_5',
    band: 'Band E: Executive / CMO',
    ranks: 'Rank 9',
    payRange: '₹2,50,000 – ₹5,00,000',
    minPay: 250000,
    maxPay: 500000,
    roles: 'Chief Medical Officer (CMO), Chief Surgeon, Chief Executive Officer (CEO), Medical Director.',
    billingImpact: 'Institutional leadership & executive review billing schedule.',
    color: '#b91c1c',
  },
];

export const StaffTariffSalaryMatrix = ({ onConfigureConsultation, departments = [] }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const res = await staffAPI.list({ limit: 100 });
        const items = res.data?.items || res.data?.staff || (Array.isArray(res.data) ? res.data : []);
        setStaffList(items);
      } catch (err) {
        console.error('Failed to load staff for matrix:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const totalMonthlyPayroll = staffList.reduce((acc, s) => acc + (Number(s.baseSalary) || 0), 0);
  const clinicalDoctors = staffList.filter((s) => s.roleId?.name === 'Doctor' || s.roleId?.name === 'Surgeon' || s.consultingFee > 0);
  const avgConsultFee = clinicalDoctors.length > 0
    ? Math.round(clinicalDoctors.reduce((acc, s) => acc + (Number(s.consultingFee) || 0), 0) / clinicalDoctors.length)
    : 0;

  const filteredStaff = staffList.filter((s) => {
    if (selectedGrade !== 'ALL' && s.tariffGrade !== selectedGrade) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.fullName?.toLowerCase().includes(q);
      const matchEmpId = s.employeeId?.toLowerCase().includes(q);
      const matchPos = s.position?.toLowerCase().includes(q);
      const matchDept = (s.departmentId?.name || s.department || '').toLowerCase().includes(q);
      const matchLic = (s.medicalLicenseNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchEmpId && !matchPos && !matchDept && !matchLic) return false;
    }
    return true;
  });

  return (
    <div className="staff-tariff-salary-matrix">
      {/* ── Top Executive KPI Overview ── */}
      <div className="matrix-kpi-grid">
        <div className="matrix-kpi-card">
          <div className="matrix-kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <span className="material-symbols-rounded">badge</span>
          </div>
          <div className="matrix-kpi-content">
            <span className="matrix-kpi-label">Active Staff Directory</span>
            <span className="matrix-kpi-value">{staffList.length} Staff</span>
            <span className="matrix-kpi-sub">Across 11 Hospital Roles</span>
          </div>
        </div>

        <div className="matrix-kpi-card">
          <div className="matrix-kpi-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
            <span className="material-symbols-rounded">payments</span>
          </div>
          <div className="matrix-kpi-content">
            <span className="matrix-kpi-label">Monthly Payroll Commitment</span>
            <span className="matrix-kpi-value">{CURRENCY_SYMBOL}{totalMonthlyPayroll.toLocaleString('en-IN')}</span>
            <span className="matrix-kpi-sub">Institutional Compensation</span>
          </div>
        </div>

        <div className="matrix-kpi-card">
          <div className="matrix-kpi-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <span className="material-symbols-rounded">stethoscope</span>
          </div>
          <div className="matrix-kpi-content">
            <span className="matrix-kpi-label">Clinical Doctor Roster</span>
            <span className="matrix-kpi-value">{clinicalDoctors.length} Practitioners</span>
            <span className="matrix-kpi-sub">Avg Fee: {CURRENCY_SYMBOL}{avgConsultFee} / consult</span>
          </div>
        </div>

        <div className="matrix-kpi-card">
          <div className="matrix-kpi-icon" style={{ background: '#fffbeb', color: '#b45309' }}>
            <span className="material-symbols-rounded">account_tree</span>
          </div>
          <div className="matrix-kpi-content">
            <span className="matrix-kpi-label">Tariff Compensation Bands</span>
            <span className="matrix-kpi-value">5 Active Bands</span>
            <span className="matrix-kpi-sub">GRADE_1 to GRADE_5</span>
          </div>
        </div>
      </div>

      {/* ── Section 3.1: Tariff Grade & Salary Band Matrix ── */}
      <div className="matrix-section-card">
        <div className="matrix-section-header">
          <div className="matrix-section-title-group">
            <span className="material-symbols-rounded matrix-section-icon">table_chart</span>
            <div>
              <h3 className="matrix-section-title">3.1 Tariff Grade &amp; Salary Band Matrix</h3>
              <p className="matrix-section-subtitle">
                Institutional compensation scale, hierarchy ranks, monthly pay range, and correlated clinical tariff billing impact.
              </p>
            </div>
          </div>
        </div>

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Tariff Grade</th>
                <th style={{ width: '180px' }}>Salary Band</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Hierarchy Ranks</th>
                <th style={{ width: '160px' }}>Monthly Pay Range</th>
                <th>Applicable Roles &amp; Positions</th>
                <th>Institutional Tariff Billing Impact</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Staff Count</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_DATA.map((row) => {
                const count = staffList.filter((s) => s.tariffGrade === row.grade).length;
                const isSelected = selectedGrade === row.grade;

                return (
                  <tr
                    key={row.grade}
                    className={`matrix-row ${isSelected ? 'matrix-row--selected' : ''}`}
                    onClick={() => setSelectedGrade(selectedGrade === row.grade ? 'ALL' : row.grade)}
                    style={{ cursor: 'pointer' }}
                    title={`Click to filter staff directory by ${row.grade}`}
                  >
                    <td>
                      <span
                        className="matrix-grade-pill"
                        style={{
                          background: `${row.color}15`,
                          color: row.color,
                          borderColor: `${row.color}35`,
                        }}
                      >
                        {row.grade}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface)' }}>
                        {row.band}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="matrix-rank-tag">{row.ranks}</span>
                    </td>
                    <td>
                      <span className="matrix-pay-range">{row.payRange}</span>
                    </td>
                    <td>
                      <span className="matrix-desc-text">{row.roles}</span>
                    </td>
                    <td>
                      <span className="matrix-impact-text">{row.billingImpact}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="matrix-count-badge" style={{ background: count > 0 ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-variant)' }}>
                        {count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 4: Comprehensive Staffing Directory & Tariff Alignment Table ── */}
      <div className="matrix-section-card" style={{ marginTop: '16px' }}>
        <div className="matrix-section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="matrix-section-title-group">
            <span className="material-symbols-rounded matrix-section-icon">groups</span>
            <div>
              <h3 className="matrix-section-title">SECTION 4: Comprehensive Staffing Directory Summary Master Table</h3>
              <p className="matrix-section-subtitle">
                Active staff profiles ({filteredStaff.length} shown of {staffList.length}) spanning all 11 system roles with compensation and clinical consultation tariffs.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Grade filter chips */}
            <div className="matrix-filter-chips">
              {['ALL', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5'].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`matrix-filter-chip ${selectedGrade === g ? 'active' : ''}`}
                  onClick={() => setSelectedGrade(g)}
                >
                  {g === 'ALL' ? 'All Grades' : g}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="tariff-search-wrapper" style={{ maxWidth: '240px', minWidth: '180px' }}>
              <span className="material-symbols-rounded tariff-search-icon">search</span>
              <input
                type="text"
                className="tariff-search-input"
                placeholder="Search staff, Emp ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th style={{ width: '95px' }}>Emp ID</th>
                <th style={{ width: '190px' }}>Staff Full Name</th>
                <th style={{ width: '140px' }}>Department</th>
                <th style={{ width: '110px' }}>System Role</th>
                <th style={{ width: '160px' }}>Position / Title</th>
                <th style={{ width: '55px', textAlign: 'center' }}>Rank</th>
                <th style={{ width: '90px' }}>Tariff Grade</th>
                <th style={{ width: '95px' }}>Pay / mo</th>
                <th style={{ width: '110px' }}>Reg / License</th>
                <th style={{ width: '95px' }}>Consultation</th>
                <th style={{ width: '85px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--md-sys-color-outline)' }}>
                    Loading staff directory matrix...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--md-sys-color-outline)' }}>
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const staffId = staff._id;
                  const fullName = staff.fullName || 'Staff Member';
                  const deptName = staff.departmentId?.name || staff.department || '—';
                  const roleName = staff.roleId?.name || staff.role || '—';
                  const position = staff.position || '—';
                  const rank = staff.positionRank || '—';
                  const tariffGrade = staff.tariffGrade || '—';
                  const empId = staff.employeeId || staff.username || (staffId ? `EMP-${staffId.slice(-5).toUpperCase()}` : '—');
                  const isActive = staff.status === 'Active';

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
                    <tr key={staffId} className="matrix-staff-row">
                      {/* 1. Emp ID */}
                      <td>
                        <span className="md3-staff-empid-pill">
                          {empId}
                        </span>
                      </td>

                      {/* 2. Full Name */}
                      <td>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--md-sys-color-on-surface)' }}>
                          {fullName}
                        </strong>
                      </td>

                      {/* 3. Department */}
                      <td>
                        <span style={{ fontSize: '0.80rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                          {deptName}
                        </span>
                      </td>

                      {/* 4. Role */}
                      <td>
                        <span className="md3-staff-role-chip">
                          {roleName}
                        </span>
                      </td>

                      {/* 5. Position */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface)' }}>
                          {position}
                        </span>
                      </td>

                      {/* 6. Rank */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="md3-staff-rank-badge">
                          {rank}
                        </span>
                      </td>

                      {/* 7. Tariff Grade */}
                      <td>
                        {tariffGrade !== '—' ? (
                          <span className={`md3-staff-tariff-chip md3-staff-tariff-chip--${tariffGrade.toLowerCase()}`}>
                            {tariffGrade}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                        )}
                      </td>

                      {/* 8. Pay / mo */}
                      <td>
                        <span className="md3-staff-pay-val">
                          {monthlyPay}
                        </span>
                      </td>

                      {/* 9. License */}
                      <td>
                        {licenseText !== '—' ? (
                          <span className="md3-staff-license-code">
                            {licenseText}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                        )}
                      </td>

                      {/* 10. Consultation */}
                      <td>
                        {consultationFee !== '—' ? (
                          <span className="md3-staff-fee-badge">
                            {consultationFee}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--md-sys-color-outline)' }}>—</span>
                        )}
                      </td>

                      {/* 11. Status */}
                      <td>
                        <span className={`tariff-status-badge tariff-status-badge--${isActive ? 'published' : 'cancelled'}`}>
                          {isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffTariffSalaryMatrix;
