import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateDepartmentSheet from './CreateDepartmentSheet';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { Md3Select, Md3Checkbox } from '../../components/md3/Md3FormComponents';
import { Md3TestCatalogConfigurator } from '../../components/md3/Md3TestCatalogConfigurator';
import { Md3DynamicVitalsConfigurator } from '../../components/md3/Md3DynamicVitalsConfigurator';

const TYPE_FILTERS = [
  { value: 'ALL',                  label: 'All' },
  { value: 'CLINICAL',             label: 'Clinical' },
  { value: 'DIAGNOSTIC',          label: 'Diagnostic' },
  { value: 'CLINICAL/DIAGNOSTIC', label: 'Clinical+Diag' },
  { value: 'SUPPORT',             label: 'Support' },
  { value: 'ADMINISTRATIVE',      label: 'Admin' },
];

const TYPE_COLORS = {
  CLINICAL:             { bg: 'var(--md-sys-color-primary-container)',   fg: 'var(--md-sys-color-on-primary-container)' },
  DIAGNOSTIC:          { bg: 'var(--md-sys-color-tertiary-container)',  fg: 'var(--md-sys-color-on-tertiary-container)' },
  'CLINICAL/DIAGNOSTIC': { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' },
  SUPPORT:             { bg: 'var(--md-sys-color-surface-variant)',     fg: 'var(--md-sys-color-on-surface-variant)' },
  ADMINISTRATIVE:      { bg: 'var(--md-sys-color-error-container)',     fg: 'var(--md-sys-color-on-error-container)' },
};

/**
 * AdminDepartmentManager — Full department lifecycle management.
 *
 * Lifecycle per docs/file.md:
 *   Step 1: Create Department (via CreateDepartmentSheet)
 *   Step 2: Register Staff → assign to department (via StaffManager)
 *   Step 3: Assign HOD (via this component's HOD dialog)
 *   Step 4: Operations
 */
const AdminDepartmentManager = () => {
  const {
    departments,
    laboratories,
    fetchDepts,
    fetchLabs,
    openConfirm,
    closeConfirm,
    setConfirmLoading,
    showSuccess,
    showError,
  } = useOutletContext();

  const [isCreateOpen, setIsCreateOpen]     = useState(false);
  const [editingDept, setEditingDept]       = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [typeFilter, setTypeFilter]         = useState('ALL');
  const [showInactive, setShowInactive]     = useState(false);

  // Vitals schema config state
  const [configuringDept, setConfiguringDept] = useState(null);

  // HOD assignment state
  const [hodDept, setHodDept]               = useState(null);   // dept being assigned HOD
  const [deptStaff, setDeptStaff]           = useState([]);     // staff for the HOD dept
  const [hodStaffId, setHodStaffId]         = useState('');
  const [hodLoading, setHodLoading]         = useState(false);
  const [deptStaffLoading, setDeptStaffLoading] = useState(false);

  // All departments (active + inactive) fetched when admin toggles showInactive
  const [allDepts, setAllDepts] = useState(null);

  // Laboratory creation/catalog state
  const [isCreateLabOpen, setIsCreateLabOpen] = useState(false);
  const [selectedLabForEdit, setSelectedLabForEdit] = useState(null);
  const [configuringLab, setConfiguringLab] = useState(null);

  const fetchAllDepts = useCallback(async () => {
    try {
      const res = await api.get('/departments/all');
      setAllDepts(res.data?.data || []);
    } catch {
      setAllDepts(departments);
    }
  }, [departments]);

  useEffect(() => {
    if (showInactive) fetchAllDepts();
    else setAllDepts(null);
  }, [showInactive, fetchAllDepts]);

  const displayDepts = showInactive ? (allDepts || departments) : departments;

  const filteredDepts = displayDepts.filter((dept) => {
    const matchesSearch = !searchQuery.trim() ||
      (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || dept.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // ── HOD Assignment ───────────────────────────────────────────────────────────

  const openHodDialog = async (dept) => {
    setHodDept(dept);
    const currentHodId = dept.headOfDepartment?._id || (typeof dept.headOfDepartment === 'string' ? dept.headOfDepartment : '');
    setHodStaffId(currentHodId);
    setDeptStaffLoading(true);
    try {
      const res = await api.get('/staff', { params: { departmentId: dept._id, limit: 100 } });
      const staffList = res.data?.data?.items || res.data?.data?.staff || (Array.isArray(res.data?.data) ? res.data.data : []);
      setDeptStaff(staffList);
      
      // Auto-preselect candidate: either existing HOD or staff registered as 'Head of Department'
      if (!currentHodId && staffList.length > 0) {
        const candidate = staffList.find(s => s.position === 'Head of Department') || staffList[0];
        if (candidate) setHodStaffId(candidate._id);
      }
    } catch {
      setDeptStaff([]);
    } finally {
      setDeptStaffLoading(false);
    }
  };

  const handleAssignHod = async () => {
    if (!hodStaffId) return;
    setHodLoading(true);
    try {
      await api.put(`/departments/${hodDept._id}/hod`, { staffId: hodStaffId });
      showSuccess(`Head of Department assigned for ${hodDept.name}`);
      setHodDept(null);
      fetchDepts();
      if (showInactive) fetchAllDepts();
    } catch (err) {
      showError(err.response?.data?.message || 'Error assigning HOD');
    } finally {
      setHodLoading(false);
    }
  };

  // ── Laboratory Catalog Management ──────────────────────────────────────────

  const handleEditLabCatalog = (lab) => {
    setConfiguringLab(lab);
  };

  // ── Delete (deactivate) ──────────────────────────────────────────────────────

  const handleDeleteDept = (id, name) => {
    openConfirm({
      title: 'Deactivate Department',
      message: `Mark "${name}" as Inactive? Staff must be unassigned first. This can be reversed later.`,
      confirmLabel: 'Deactivate',
      variant: 'danger',
      icon: 'archive',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/departments/${id}`);
          showSuccess(`Department "${name}" deactivated.`);
          fetchDepts();
          if (showInactive) fetchAllDepts();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error deactivating department');
          closeConfirm();
        }
      },
    });
  };

  // ── Vitals Schema ────────────────────────────────────────────────────────────
  const handleEditVitals = (dept) => {
    setConfiguringDept(dept);
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>Hospital Departments</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {filteredDepts.length} department{filteredDepts.length !== 1 ? 's' : ''} shown
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <Md3SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or code..."
            />
            {/* Inactive toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px',
              border: `1.5px solid ${showInactive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
              borderRadius: '100px', cursor: 'pointer',
              background: showInactive ? 'var(--md-sys-color-primary-container)' : 'transparent',
              color: showInactive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
              fontSize: '13px', fontWeight: 600,
              userSelect: 'none',
            }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ display: 'none' }} />
              <span className="material-symbols-rounded" style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                {showInactive ? 'visibility' : 'visibility_off'}
              </span>
              <span>{showInactive ? 'All' : 'Active'}</span>
            </label>
          </div>
        </div>

        {/* ── Type filter tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              style={{
                padding: '6px 14px',
                border: `1.5px solid ${typeFilter === f.value ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                borderRadius: '100px',
                background: typeFilter === f.value ? 'var(--md-sys-color-primary)' : 'transparent',
                color: typeFilter === f.value ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Department Cards Grid ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid" style={{ flex: 1, paddingBottom: '80px' }}>
            {filteredDepts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)', gridColumn: '1 / -1', minHeight: '40vh', opacity: 0.8 }}>
                <Icon.Hospital style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontWeight: 500 }}>No departments found</h3>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              filteredDepts.map((dept) => {
                const typeColor = TYPE_COLORS[dept.type] || TYPE_COLORS.SUPPORT;
                const isInactive = dept.status === 'Inactive';
                const hod = dept.headOfDepartment;

                return (
                  <div
                    key={dept._id}
                    className="md3-data-card"
                    style={{
                      opacity: isInactive ? 0.65 : 1,
                      position: 'relative'
                    }}
                  >
                    {/* Inactive overlay badge */}
                    {isInactive && (
                      <div className="md3-status-chip md3-card-btn-error" style={{
                        position: 'absolute', top: '12px', right: '12px',
                        zIndex: 2, padding: '2px 10px', fontSize: '10px'
                      }}>
                        INACTIVE
                      </div>
                    )}

                    <div className="md3-data-card-header">
                      <h3 className="md3-data-card-title">{dept.name}</h3>
                      <span className="md3-status-chip md3-card-btn-secondary" style={{
                        letterSpacing: '0.08em', fontFamily: 'monospace', fontSize: '11px', padding: '3px 10px'
                      }}>
                        {dept.code || 'N/A'}
                      </span>
                    </div>

                    <div className="md3-data-card-body">
                      {/* Fixed height line-clamp description box */}
                      <p style={{
                        margin: 0,
                        color: 'var(--md-sys-color-on-surface-variant)',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minHeight: '54px'
                      }}>
                        {dept.description || 'No description provided.'}
                      </p>

                      {/* Info badge row (Type & Vitals schema) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="md3-status-chip" style={{
                          background: typeColor.bg, color: typeColor.fg,
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px'
                        }}>
                          {dept.type}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 500 }}>
                          {(dept.type === 'CLINICAL' || dept.type === 'CLINICAL/DIAGNOSTIC')
                            ? `${dept.vitalFields?.length || 0} vital field${dept.vitalFields?.length !== 1 ? 's' : ''}`
                            : '\u00A0'}
                        </span>
                      </div>

                      {/* Linked Laboratories section (For Diagnostic or Hybrid) */}
                      {(dept.type === 'DIAGNOSTIC' || dept.type === 'CLINICAL/DIAGNOSTIC') ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px 12px',
                          border: '1.5px dashed var(--md-sys-color-outline-variant)',
                          borderRadius: '12px',
                          minHeight: '80px',
                          background: 'var(--md-sys-color-surface-container-lowest)',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--md-sys-color-primary)' }}>
                              Linked Labs
                            </span>
                            <button
                              onClick={() => {
                                setSelectedLabForEdit({ departmentId: dept._id });
                                setIsCreateLabOpen(true);
                              }}
                              style={{
                                border: 'none', background: 'transparent',
                                color: 'var(--md-sys-color-primary)', cursor: 'pointer',
                                fontSize: '11px', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '2px',
                                padding: 0
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span> Add Lab
                            </button>
                          </div>
                          
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            maxHeight: '60px',
                            overflowY: 'auto'
                          }}>
                            {laboratories.filter(lab => (lab.departmentId?._id || lab.departmentId) === dept._id).length > 0 ? (
                              laboratories.filter(lab => (lab.departmentId?._id || lab.departmentId) === dept._id).map(lab => (
                                <div key={lab._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--md-sys-color-surface-container-high)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                                  <span style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>{lab.name}</span>
                                  <button
                                    onClick={() => handleEditLabCatalog(lab)}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--md-sys-color-secondary)', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', padding: '0' }}
                                  >
                                    Manage Tests
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                                No linked labs. Click Add Lab to create.
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Empty spacing element for support/admin/clinical departments to keep height identical */
                        <div style={{ minHeight: '80px' }} />
                      )}

                      {/* HOD info - Fixed Height Centered Box */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: hod ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high, #ece6f0)',
                        borderRadius: '12px',
                        minHeight: '46px',
                        boxSizing: 'border-box',
                        marginTop: 'auto'
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '20px', color: hod ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)' }}>
                          {hod ? 'person' : 'person_off'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: hod ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)' }}>
                            {hod ? hod.fullName : 'No HOD assigned'}
                          </span>
                          {hod && (
                            <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-primary-container)', opacity: 0.8 }}>
                              {hod.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Symmetric Action Button Grid */}
                    <div className="md3-data-card-actions">
                      <button
                        onClick={() => setEditingDept(dept)}
                        className="md3-card-btn md3-card-btn-outlined"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openHodDialog(dept)}
                        className="md3-card-btn md3-card-btn-outlined"
                      >
                        Assign HOD
                      </button>
                      {(dept.type === 'CLINICAL' || dept.type === 'CLINICAL/DIAGNOSTIC') && (
                        <button
                          onClick={() => handleEditVitals(dept)}
                          className="md3-card-btn md3-card-btn-primary"
                          style={{
                            gridColumn: (isInactive) ? 'span 2' : 'span 1'
                          }}
                        >
                          Vitals
                        </button>
                      )}
                      {!isInactive && (
                        <button
                          onClick={() => handleDeleteDept(dept._id, dept.name)}
                          className="md3-card-btn md3-card-btn-error"
                          style={{
                            gridColumn: (dept.type === 'CLINICAL' || dept.type === 'CLINICAL/DIAGNOSTIC') ? 'span 1' : 'span 2'
                          }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* FAB */}
      <Md3Fab
        icon={<Icon.Plus />}
        label="Add Dept"
        onClick={() => setIsCreateOpen(true)}
        style={{ position: 'fixed', bottom: '32px', right: '32px' }}
      />

      {/* Create / Edit Sheet */}
      <CreateDepartmentSheet
        isOpen={isCreateOpen || !!editingDept}
        onClose={() => { setIsCreateOpen(false); setEditingDept(null); }}
        onSuccess={(msg) => {
          showSuccess(msg);
          fetchDepts();
          if (showInactive) fetchAllDepts();
          setIsCreateOpen(false);
          setEditingDept(null);
        }}
        department={editingDept}
      />

      {/* ── HOD Assignment Dialog ─────────────────────────────────────────── */}
      {hodDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--md-sys-color-surface-container-low)', color: 'var(--md-sys-color-on-surface)', padding: '28px', borderRadius: '28px', maxWidth: '480px', width: '90%', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--md-sys-color-primary)', fontSize: '18px' }}>
              Assign Head of Department
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Department: <strong>{hodDept.name}</strong> ({hodDept.code})
            </p>

            {deptStaffLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>Loading staff...</div>
            ) : deptStaff.length === 0 ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '16px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderRadius: '12px', fontSize: '13px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px', flexShrink: 0 }}>warning</span>
                <span>No staff are currently assigned to this department. Register staff and assign them to this department first, then come back to assign an HOD.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', marginBottom: '8px', paddingRight: '4px' }}>
                {deptStaff.map((s) => {
                  const isSelected = hodStaffId === s._id;
                  const isHodRole = s.position === 'Head of Department';
                  const initials = s.fullName
                    ? s.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'ST';

                  return (
                    <label
                      key={s._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 16px',
                        border: `2px solid ${isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-lowest)',
                        boxShadow: isSelected ? '0 2px 8px color-mix(in srgb, var(--md-sys-color-primary) 15%, transparent)' : 'none',
                        transition: 'all 180ms cubic-bezier(0.2, 0, 0, 1)',
                      }}
                    >
                      <input
                        type="radio"
                        name="hodStaff"
                        value={s._id}
                        checked={isSelected}
                        onChange={() => setHodStaffId(s._id)}
                        style={{ display: 'none' }}
                      />

                      {/* Avatar Circle */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-highest)',
                        color: isSelected ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--md-sys-color-on-surface)' }}>
                            {s.fullName}
                          </span>
                          {s.roleId?.name && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              background: 'var(--md-sys-color-surface-container)',
                              color: 'var(--md-sys-color-on-surface-variant)',
                              padding: '2px 8px',
                              borderRadius: '999px'
                            }}>
                              {s.roleId.name}
                            </span>
                          )}
                          {isHodRole && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'var(--md-sys-color-tertiary-container)',
                              color: 'var(--md-sys-color-on-tertiary-container)',
                              padding: '2px 8px',
                              borderRadius: '999px'
                            }}>
                              Recommended HOD
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                          {s.position} · <span style={{ fontFamily: 'monospace' }}>{s.employeeId}</span>
                        </div>
                      </div>

                      {/* Radio Checkmark Indicator */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: isSelected ? 'var(--md-sys-color-primary)' : 'transparent',
                        transition: 'all 150ms ease'
                      }}>
                        {isSelected && (
                          <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-on-primary)' }}>
                            check
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setHodDept(null)} style={actionBtn('var(--md-sys-color-surface-container-high)', 'var(--md-sys-color-on-surface)')}>
                Cancel
              </button>
              <button
                onClick={handleAssignHod}
                disabled={hodLoading || !hodStaffId || deptStaff.length === 0}
                style={{
                  padding: '10px 24px',
                  background: hodStaffId && !hodLoading ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                  color: hodStaffId && !hodLoading ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  border: 'none', borderRadius: '100px', cursor: hodStaffId && !hodLoading ? 'pointer' : 'not-allowed',
                  fontSize: '13px', fontWeight: 700,
                }}
              >
                {hodLoading ? 'Assigning...' : 'Assign HOD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Vitals Schema Dialog (Pure Material 3) ────────────────── */}
      {configuringDept && (
        <Md3DynamicVitalsConfigurator
          department={configuringDept}
          isOpen={!!configuringDept}
          onClose={() => setConfiguringDept(null)}
          onSave={async (updatedFields) => {
            await api.put(`/departments/${configuringDept._id}`, { vitalFields: updatedFields });
            showSuccess(`Dynamic vitals updated for ${configuringDept.name}`);
            setConfiguringDept(null);
            fetchDepts();
            if (showInactive) fetchAllDepts();
          }}
        />
      )}

      {/* Create / Edit Laboratory Sheet */}
      <CreateLaboratorySheet
        isOpen={isCreateLabOpen}
        onClose={() => { setIsCreateLabOpen(false); setSelectedLabForEdit(null); }}
        onSuccess={(msg) => {
          showSuccess(msg);
          fetchLabs();
          setIsCreateLabOpen(false);
          setSelectedLabForEdit(null);
        }}
        departments={departments}
        laboratory={selectedLabForEdit}
      />

      {configuringLab && (
        <Md3TestCatalogConfigurator
          lab={configuringLab}
          onClose={() => setConfiguringLab(null)}
          onSave={async (updatedCatalog) => {
            await api.put(`/laboratory/config/${configuringLab._id}`, {
              name: configuringLab.name,
              description: configuringLab.description,
              isActive: configuringLab.isActive,
              testCatalog: updatedCatalog
            });
            showSuccess('Laboratory test catalog updated successfully');
            setConfiguringLab(null);
            fetchLabs();
          }}
        />
      )}
    </div>
  );
};

const actionBtn = (bg, fg) => ({
  padding: '8px 12px',
  background: bg,
  color: fg,
  border: 'none',
  borderRadius: '100px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  transition: 'all 150ms ease',
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '38px',
  boxSizing: 'border-box'
});

const tableInputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid var(--md-sys-color-outline-variant)',
  background: 'var(--md-sys-color-surface-container-lowest)',
  color: 'var(--md-sys-color-on-surface)',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  fontSize: '13px',
};

export default AdminDepartmentManager;
