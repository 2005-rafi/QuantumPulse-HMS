import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateDepartmentSheet from './CreateDepartmentSheet';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { Md3TestCatalogConfigurator } from '../../components/md3/Md3TestCatalogConfigurator';
import { Md3DynamicVitalsConfigurator } from '../../components/md3/Md3DynamicVitalsConfigurator';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
import DepartmentCard from '../../components/departments/DepartmentCard';
import DepartmentListView from '../../components/departments/DepartmentListView';
import DepartmentDetailSheet from '../../components/departments/DepartmentDetailSheet';
import { useDepartmentLayoutPreference } from '../../hooks/useDepartmentLayoutPreference';

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
  const [inspectingDept, setInspectingDept] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [typeFilter, setTypeFilter]         = useState('ALL');
  const [showInactive, setShowInactive]     = useState(false);
  const { isListView, isCardView, setLayout } = useDepartmentLayoutPreference();

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

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedDepts,
    showTopPagination,
  } = usePagination(filteredDepts, 50, [searchQuery, typeFilter, showInactive]);

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

  const handleToggleDeptStatus = (id, name, currentStatus) => {
    if (currentStatus === 'Inactive') {
      openConfirm({
        title: 'Reactivate Department',
        message: `Are you sure you want to reactivate the department "${name}"? It will become active in clinical workflows.`,
        confirmLabel: 'Reactivate',
        cancelLabel: 'Cancel',
        variant: 'primary',
        icon: 'check_circle',
        onConfirm: async () => {
          setConfirmLoading(true);
          try {
            await api.put(`/departments/${id}`, { status: 'Active' });
            showSuccess(`Department "${name}" reactivated successfully.`);
            fetchDepts();
            if (showInactive) fetchAllDepts();
            closeConfirm();
          } catch (err) {
            showError(err.response?.data?.message || 'Error reactivating department');
            closeConfirm();
          }
        },
      });
    } else {
      handleDeleteDept(id, name);
    }
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

            {/* View Mode Toggle: Cards vs List */}
            <div className="md3-view-toggle-group" role="group" aria-label="Department directory layout view mode">
              <button
                type="button"
                className={`md3-view-toggle-btn ${isCardView ? 'active' : ''}`}
                onClick={() => setLayout('cards')}
                title="Card Grid View"
                aria-pressed={isCardView}
              >
                <span className="material-symbols-rounded">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`md3-view-toggle-btn ${isListView ? 'active' : ''}`}
                onClick={() => setLayout('list')}
                title="Tabular List View"
                aria-pressed={isListView}
              >
                <span className="material-symbols-rounded">view_list</span>
                <span>List</span>
              </button>
            </div>

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
              height: '44px'
            }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ display: 'none' }} />
              <span className="material-symbols-rounded" style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                {showInactive ? 'visibility' : 'visibility_off'}
              </span>
              <span>{showInactive ? 'All' : 'Active'}</span>
            </label>

            <button
              onClick={() => setIsCreateOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: 'var(--md-sys-color-primary, #00668b)',
                color: 'var(--md-sys-color-on-primary, #ffffff)',
                border: 'none',
                borderRadius: '100px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'all 200ms ease',
                height: '44px',
                boxShadow: 'var(--md-sys-elevation-1, 0 1px 3px rgba(0,0,0,0.12))'
              }}
              className="dept-add-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
              Add Department
            </button>
          </div>
        </div>

        {/* ── Type filter tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
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

        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="departments"
            position="top"
          />
        )}

        {/* ── Department Cards Grid / Tabular List ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {paginatedDepts.length === 0 ? (
            <div style={{ width: '100%', padding: '20px 0' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                borderRadius: '16px',
                border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-sys-color-primary, #00668b)', marginBottom: '12px' }}>
                  corporate_fare
                </span>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
                  No departments found
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                  There are no departments matching your search criteria or filter selection.
                </p>
              </div>
            </div>
          ) : isListView ? (
            <div className="md3-paginated-content-fade" key={`list-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              <DepartmentListView
                departments={paginatedDepts}
                laboratories={laboratories}
                onInspect={(dept) => setInspectingDept(dept)}
                onEdit={(dept) => setEditingDept(dept)}
                onAssignHod={(dept) => openHodDialog(dept)}
                onToggleStatus={(id, name, status) => handleToggleDeptStatus(id, name, status)}
              />
            </div>
          ) : (
            <div className="dept-card-grid md3-paginated-content-fade" key={`cards-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              {paginatedDepts.map((dept) => {
                const linkedCount = laboratories.filter(
                  (lab) => (lab.departmentId?._id || lab.departmentId) === dept._id
                ).length;
                return (
                  <DepartmentCard
                    key={dept._id}
                    department={dept}
                    linkedLabsCount={linkedCount}
                    onInspect={(d) => setInspectingDept(d)}
                    onEdit={(d) => setEditingDept(d)}
                    onAssignHod={(d) => openHodDialog(d)}
                    onConfigureVitals={(d) => handleEditVitals(d)}
                    onToggleStatus={(id, name, status) => handleToggleDeptStatus(id, name, status)}
                  />
                );
              })}
            </div>
          )}

          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="departments"
              position="bottom"
            />
          )}
        </div>
      </section>

      {/* Slide-Over Detail Inspector */}
      <DepartmentDetailSheet
        department={inspectingDept}
        laboratories={laboratories}
        isOpen={!!inspectingDept}
        onClose={() => setInspectingDept(null)}
        onEdit={(dept) => { setInspectingDept(null); setEditingDept(dept); }}
        onAssignHod={(dept) => { setInspectingDept(null); openHodDialog(dept); }}
        onConfigureVitals={(dept) => { setInspectingDept(null); handleEditVitals(dept); }}
        onAddLab={(dept) => { setInspectingDept(null); setSelectedLabForEdit({ departmentId: dept._id }); setIsCreateLabOpen(true); }}
        onEditLabCatalog={(lab) => { setInspectingDept(null); handleEditLabCatalog(lab); }}
        onToggleStatus={(id, name, status) => { setInspectingDept(null); handleToggleDeptStatus(id, name, status); }}
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
      {hodDept && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.38)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '48px 16px 24px',
            overflowY: 'auto',
            zIndex: 2000,
            boxSizing: 'border-box',
          }}
          onClick={() => setHodDept(null)}
        >
          <div
            style={{
              background: 'var(--md-sys-color-surface, #ffffff)',
              color: 'var(--md-sys-color-on-surface, #1d1b20)',
              padding: '28px',
              borderRadius: '28px',
              maxWidth: '480px',
              width: '90%',
              margin: '0 auto',
              maxHeight: 'calc(100vh - 72px)',
              overflowY: 'auto',
              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: 'var(--md-sys-color-primary, #00668b)', fontSize: '18px', fontWeight: 700 }}>
              Assign Head of Department
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
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
                        background: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-lowest, #ffffff)',
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
                          <span style={{
                            fontSize: '11px',
                            background: 'var(--md-sys-color-surface-container)',
                            color: 'var(--md-sys-color-on-surface-variant)',
                            padding: '2px 8px',
                            borderRadius: '999px'
                          }}>
                            {s.roleId?.name || 'Staff'}
                          </span>
                          {isHodRole && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
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
        </div>,
        document.body
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
