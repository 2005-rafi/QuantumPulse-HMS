import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateDepartmentSheet from './CreateDepartmentSheet';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3SearchBar } from '../../components/md3/AdminControls';
import { Md3Select } from '../../components/md3/Md3FormComponents';

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
  const [configuringDept, setConfiguringDept]   = useState(null);
  const [tempVitalFields, setTempVitalFields]   = useState([]);
  const [localLoading, setLocalLoading]         = useState(false);

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
  const [tempTestCatalog, setTempTestCatalog] = useState([]);

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
    setHodStaffId(dept.headOfDepartment?._id || '');
    setDeptStaffLoading(true);
    try {
      const res = await api.get('/staff', { params: { departmentId: dept._id, limit: 100 } });
      setDeptStaff(res.data?.data?.staff || []);
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
    setTempTestCatalog(lab.testCatalog || []);
  };

  const handleSaveLabCatalog = async () => {
    // Basic validation before saving to backend
    for (const test of tempTestCatalog) {
      if (!test.name?.trim()) {
        showError('All tests in the catalog must have a name.');
        return;
      }
      if (!test.sampleType?.trim()) {
        showError(`Sample type is required for test "${test.name}".`);
        return;
      }
      for (const field of test.resultFields) {
        if (!field.label?.trim()) {
          showError(`Result field display label is required in test "${test.name}".`);
          return;
        }
        if (!field.key?.trim()) {
          showError(`Result field key is missing for "${field.label}" in test "${test.name}".`);
          return;
        }
      }
    }

    setLocalLoading(true);
    try {
      await api.put(`/laboratory/config/${configuringLab._id}`, {
        name: configuringLab.name,
        description: configuringLab.description,
        isActive: configuringLab.isActive,
        testCatalog: tempTestCatalog
      });
      showSuccess('Laboratory test catalog updated successfully');
      setConfiguringLab(null);
      fetchLabs();
    } catch (err) {
      showError(err.response?.data?.message || 'Error updating catalog');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAddTestToCatalog = () => {
    setTempTestCatalog([...tempTestCatalog, { name: '', sampleType: '', resultFields: [] }]);
  };

  const handleRemoveTestFromCatalog = (index) => {
    const updated = [...tempTestCatalog];
    updated.splice(index, 1);
    setTempTestCatalog(updated);
  };

  const handleTestFieldChange = (testIdx, field, value) => {
    const updated = [...tempTestCatalog];
    updated[testIdx][field] = value;
    setTempTestCatalog(updated);
  };

  const handleAddResultFieldToTest = (testIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.push({ key: '', label: '', type: 'Text', unit: '', required: false });
    setTempTestCatalog(updated);
  };

  const handleRemoveResultFieldFromTest = (testIdx, fieldIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.splice(fieldIdx, 1);
    setTempTestCatalog(updated);
  };

  const handleResultFieldChange = (testIdx, fieldIdx, field, value) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields[fieldIdx][field] = value;
    if (field === 'label') {
      updated[testIdx].resultFields[fieldIdx].key = value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    }
    setTempTestCatalog(updated);
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
    setTempVitalFields(dept.vitalFields || []);
  };

  const handleSaveVitals = async () => {
    // Validate vitals schema fields before sending
    for (const f of tempVitalFields) {
      if (!f.label?.trim()) {
        showError('All vital fields must have a display label.');
        return;
      }
      if (!f.name?.trim()) {
        showError(`Vital field key is missing for "${f.label}". Try typing the label again to generate it.`);
        return;
      }
    }

    setLocalLoading(true);
    try {
      await api.put(`/departments/${configuringDept._id}`, { vitalFields: tempVitalFields });
      showSuccess('Department vital fields updated');
      setConfiguringDept(null);
      fetchDepts();
    } catch (err) {
      showError(err.response?.data?.message || 'Error updating vitals');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleVitalFieldChange = (idx, field, value) => {
    const updated = [...tempVitalFields];
    updated[idx][field] = value;
    if (field === 'label' && !updated[idx].name) {
      updated[idx].name = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    setTempVitalFields(updated);
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', marginBottom: '8px' }}>
                {deptStaff.map((s) => (
                  <label
                    key={s._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px',
                      border: `2px solid ${hodStaffId === s._id ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                      borderRadius: '12px', cursor: 'pointer',
                      background: hodStaffId === s._id ? 'var(--md-sys-color-primary-container)' : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <input type="radio" name="hodStaff" value={s._id} checked={hodStaffId === s._id} onChange={() => setHodStaffId(s._id)} style={{ display: 'none' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--md-sys-color-on-surface)' }}>{s.fullName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{s.position} · {s.employeeId}</div>
                    </div>
                  </label>
                ))}
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

      {/* ── Vitals Schema Dialog ──────────────────────────────────────────── */}
      {configuringDept && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--md-sys-color-surface-container-low)', color: 'var(--md-sys-color-on-surface)', padding: '24px', borderRadius: '28px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', color: 'var(--md-sys-color-on-surface)' }}>
              Configure Dynamic Vitals — {configuringDept.name}
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--md-sys-color-outline-variant)' }}>
                  <th style={{ padding: '10px 8px', width: '30%', fontSize: '13px', fontWeight: 'bold' }}>Label (Display Name)</th>
                  <th style={{ padding: '10px 8px', width: '22%', fontSize: '13px', fontWeight: 'bold' }}>Type</th>
                  <th style={{ padding: '10px 8px', width: '20%', fontSize: '13px', fontWeight: 'bold' }}>Unit</th>
                  <th style={{ padding: '10px 8px', width: '13%', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>Required</th>
                  <th style={{ padding: '10px 8px', width: '15%', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tempVitalFields.map((field, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={field.label} onChange={(e) => handleVitalFieldChange(idx, 'label', e.target.value)} style={tableInputStyle} placeholder="e.g. Blood Pressure" />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select value={field.type} onChange={(e) => handleVitalFieldChange(idx, 'type', e.target.value)} style={tableInputStyle}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes/No</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={field.unit} onChange={(e) => handleVitalFieldChange(idx, 'unit', e.target.value)} style={tableInputStyle} placeholder="e.g. mmHg" />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={field.required} onChange={(e) => handleVitalFieldChange(idx, 'required', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => setTempVitalFields(tempVitalFields.filter((_, i) => i !== idx))} style={actionBtn('var(--md-sys-color-error-container)', 'var(--md-sys-color-on-error-container)')}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '15px' }}>
              <button onClick={() => setTempVitalFields([...tempVitalFields, { name: '', label: '', type: 'text', unit: '', required: false }])} style={actionBtn('var(--md-sys-color-tertiary-container)', 'var(--md-sys-color-on-tertiary-container)')}>
                + Add Vital Field
              </button>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setConfiguringDept(null)} style={actionBtn('var(--md-sys-color-surface-container-high)', 'var(--md-sys-color-on-surface)')}>Cancel</button>
              <button onClick={handleSaveVitals} disabled={localLoading} style={{ padding: '10px 20px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', cursor: localLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {localLoading ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
          </div>
        </div>
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

      {/* Test Catalog Dialog */}
      {configuringLab && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7f2fa)', color: 'var(--md-sys-color-on-surface)', padding: '24px', borderRadius: '28px', maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', color: 'var(--md-sys-color-on-surface)' }}>
              Configure Test Catalog for {configuringLab.name}
            </h3>
            
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {tempTestCatalog.map((test, testIdx) => (
                <div key={testIdx} style={{ border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '16px', padding: '16px', background: 'var(--md-sys-color-surface-container)' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Test Name</label>
                      <input 
                        type="text" 
                        value={test.name} 
                        onChange={(e) => handleTestFieldChange(testIdx, 'name', e.target.value)} 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', boxSizing: 'border-box' }} 
                        placeholder="e.g. Complete Blood Count (CBC)" 
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Sample Type</label>
                      <input 
                        type="text" 
                        value={test.sampleType} 
                        onChange={(e) => handleTestFieldChange(testIdx, 'sampleType', e.target.value)} 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', boxSizing: 'border-box' }} 
                        placeholder="e.g. Whole Blood" 
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveTestFromCatalog(testIdx)} 
                      style={{ padding: '8px 16px', marginTop: '16px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', border: 'none', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      Remove Test
                    </button>
                  </div>
                  
                  <div style={{ marginLeft: '16px', borderLeft: '3px solid var(--md-sys-color-primary)', paddingLeft: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--md-sys-color-primary)', fontWeight: 'bold' }}>Result Fields Schema</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--md-sys-color-outline-variant)' }}>
                          <th style={{ padding: '8px 6px', fontSize: '12px', fontWeight: 'bold' }}>Label</th>
                          <th style={{ padding: '8px 6px', fontSize: '12px', fontWeight: 'bold' }}>Type</th>
                          <th style={{ padding: '8px 6px', fontSize: '12px', fontWeight: 'bold' }}>Unit</th>
                          <th style={{ padding: '8px 6px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>Required</th>
                          <th style={{ padding: '8px 6px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {test.resultFields.map((field, fieldIdx) => (
                          <tr key={fieldIdx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                            <td style={{ padding: '6px 4px' }}>
                              <input 
                                type="text" 
                                value={field.label} 
                                onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'label', e.target.value)} 
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', boxSizing: 'border-box' }} 
                                placeholder="e.g. Hemoglobin" 
                              />
                            </td>
                            <td style={{ padding: '6px 4px', minWidth: '130px' }}>
                              <Md3Select 
                                value={field.type} 
                                onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'type', e.target.value)} 
                                options={[
                                  { value: 'Text', label: 'Text' },
                                  { value: 'Number', label: 'Number' },
                                  { value: 'Boolean', label: 'Boolean' },
                                  { value: 'Yes/No', label: 'Yes/No' },
                                  { value: 'File', label: 'File Upload' }
                                ]}
                              />
                            </td>
                            <td style={{ padding: '6px 4px' }}>
                              <input 
                                type="text" 
                                value={field.unit} 
                                onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'unit', e.target.value)} 
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-lowest)', color: 'var(--md-sys-color-on-surface)', boxSizing: 'border-box' }} 
                                placeholder="e.g. g/dL" 
                              />
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={field.required} 
                                onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'required', e.target.checked)} 
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleRemoveResultFieldFromTest(testIdx, fieldIdx)} 
                                style={{ padding: '6px 12px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', border: 'none', borderRadius: '100px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                type="button"
                              >
                                X
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button 
                      onClick={() => handleAddResultFieldToTest(testIdx)} 
                      style={{ marginTop: '12px', padding: '6px 12px', background: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)', border: 'none', borderRadius: '100px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      type="button"
                    >
                      + Add Result Field
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleAddTestToCatalog} 
                style={{ padding: '10px 20px', background: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                type="button"
              >
                + Add Test to Catalog
              </button>
            </div>
            
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setConfiguringLab(null)} 
                style={{ padding: '10px 20px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold' }}
                type="button"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveLabCatalog} 
                disabled={localLoading} 
                style={{ padding: '10px 20px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', cursor: localLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                type="button"
              >
                {localLoading ? 'Saving...' : 'Save Catalog'}
              </button>
            </div>
          </div>
        </div>
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
