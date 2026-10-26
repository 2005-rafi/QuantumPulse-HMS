import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Md3Button, Md3TextField, Md3Select, Md3UnsavedChangesDialog } from '../../components/md3/Md3FormComponents';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './CreateDepartmentSheet.css';


const DEPT_TYPES = [
  { value: 'CLINICAL',            label: 'Clinical',                    desc: 'Patient consultation and treatment' },
  { value: 'DIAGNOSTIC',         label: 'Diagnostic',                  desc: 'Investigations and diagnostics (e.g. Lab, Radiology)' },
  { value: 'CLINICAL/DIAGNOSTIC', label: 'Clinical & Diagnostic',       desc: 'Both consultation and diagnostic services' },
  { value: 'SUPPORT',            label: 'Support',                     desc: 'Supports hospital operations (e.g. Pharmacy, Ward)' },
  { value: 'ADMINISTRATIVE',     label: 'Administrative',              desc: 'Administration and management (e.g. Billing, Front Desk)' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyDepartment = () => ({
  id: generateId(),
  name: '',
  code: '',
  type: 'CLINICAL',
  status: 'Active',
  description: '',
  isExpanded: true,
  errors: {},
});

/**
 * CreateDepartmentSheet — Multi-Department Expandable/Collapsible Builder.
 * Reusable Material Design 3 pattern matching Floor, Room & Bed Facility Builders.
 *
 * Features:
 * - Single Edit mode (when `department` prop is passed)
 * - Multi-Department Batch Creation (with accordion cards & centered add trigger)
 * - Input validation & auto-formatting (code uppercase, name alpha-first)
 * - Consolidated toast notifications and lifecycle guidance
 */
const CreateDepartmentSheet = ({ isOpen, onClose, onSuccess, department }) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEdit = Boolean(department && department._id);

  // ── Multi-Department Builder State ──
  const [departmentsList, setDepartmentsList] = useState([createEmptyDepartment()]);

  // ── Single Department Edit State ──
  const [singleName, setSingleName] = useState('');
  const [singleCode, setSingleCode] = useState('');
  const [singleType, setSingleType] = useState('CLINICAL');
  const [singleStatus, setSingleStatus] = useState('Active');
  const [singleDescription, setSingleDescription] = useState('');
  const [singleErrors, setSingleErrors] = useState({});

  const prevIsOpenRef = useRef(false);
  const prevDeptRef = useRef(null);

  // Sync state when drawer opens or edited department changes
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const deptChanged = isEdit && department !== prevDeptRef.current;

    if (isOpen && (justOpened || deptChanged)) {
      setShowDiscardConfirm(false);
      if (isEdit) {
        setSingleName(department.name || '');
        setSingleCode(department.code || '');
        setSingleType(department.type || 'CLINICAL');
        setSingleStatus(department.status || 'Active');
        setSingleDescription(department.description || '');
        setSingleErrors({});
      } else {
        setDepartmentsList([createEmptyDepartment()]);
      }
      setError(null);
    }
    prevIsOpenRef.current = isOpen;
    prevDeptRef.current = department;
  }, [isOpen, department, isEdit]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (isEdit) {
      if (!department) return false;
      return (
        (singleName || '') !== (department.name || '') ||
        (singleCode || '') !== (department.code || '') ||
        (singleType || 'CLINICAL') !== (department.type || 'CLINICAL') ||
        (singleStatus || 'Active') !== (department.status || 'Active') ||
        (singleDescription || '') !== (department.description || '')
      );
    } else {
      if (departmentsList.length > 1) return true;
      const first = departmentsList[0];
      if (!first) return false;
      return Boolean(first.name.trim() || first.code.trim() || first.description.trim());
    }
  }, [isEdit, department, singleName, singleCode, singleType, singleStatus, singleDescription, departmentsList]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Intercept Escape key to protect against accidental dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDiscardConfirm) {
        e.preventDefault();
        e.stopPropagation();
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, showDiscardConfirm]);


  // ══════════════════════════════════════════════════════════════
  // MULTI-DEPARTMENT BUILDER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleAddDepartmentItem = () => {
    setDepartmentsList((prev) => [
      ...prev.map((d) => ({ ...d, isExpanded: false })), // collapse previous cards for clean visual overview
      createEmptyDepartment(),
    ]);
  };

  const handleRemoveDepartmentItem = (id) => {
    if (departmentsList.length <= 1) {
      setDepartmentsList([createEmptyDepartment()]);
      return;
    }
    setDepartmentsList((prev) => prev.filter((d) => d.id !== id));
  };

  const handleToggleExpand = (id) => {
    setDepartmentsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isExpanded: !d.isExpanded } : d))
    );
  };

  const handleUpdateField = (id, field, rawValue) => {
    let value = rawValue;
    if (field === 'code') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (field === 'name') {
      value = value.replace(/[^a-zA-Z0-9\s'&/,-]/g, '');
    }

    setDepartmentsList((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updatedErrors = { ...d.errors };
        if (updatedErrors[field]) delete updatedErrors[field];
        return { ...d, [field]: value, errors: updatedErrors };
      })
    );
  };

  // ══════════════════════════════════════════════════════════════
  // SUBMIT HANDLER
  // ══════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // ── Single Edit Mode Submission ──
    if (isEdit) {
      const errors = {};
      if (!singleName.trim()) errors.name = 'Department name is required';
      if (!singleCode.trim()) errors.code = 'Department code is required';
      else if (singleCode.trim().length < 2) errors.code = 'Code must be at least 2 characters';
      if (!singleType) errors.type = 'Department type is required';

      if (Object.keys(errors).length > 0) {
        setSingleErrors(errors);
        showError('Please correct the highlighted fields');
        return;
      }

      try {
        setLoading(true);
        const payload = {
          name: singleName.trim(),
          code: singleCode.trim().toUpperCase(),
          type: singleType,
          status: singleStatus,
          description: singleDescription.trim(),
        };
        await api.put(`/departments/${department._id}`, payload);
        setLoading(false);
        const successMsg = `Department "${singleName}" updated successfully.`;
        if (onSuccess) {
          onSuccess(successMsg);
        } else {
          showSuccess(successMsg);
        }
      } catch (err) {
        setLoading(false);
        const errMsg = err.response?.data?.message || err.message || 'Error updating department';
        setError(errMsg);
        showError(errMsg);
      }
      return;
    }

    // ── Multi-Department Batch Creation Mode ──
    let hasValidationError = false;
    const validatedList = departmentsList.map((d) => {
      const errors = {};
      if (!d.name.trim()) errors.name = 'Department name is required';
      else if (!/^[a-zA-Z]/.test(d.name.trim())) errors.name = 'Must start with a letter';

      if (!d.code.trim()) errors.code = 'Department code is required';
      else if (d.code.trim().length < 2) errors.code = 'Code must be at least 2 characters';

      if (!d.type) errors.type = 'Department type is required';

      if (Object.keys(errors).length > 0) {
        hasValidationError = true;
        return { ...d, errors, isExpanded: true };
      }
      return { ...d, errors: {} };
    });

    if (hasValidationError) {
      setDepartmentsList(validatedList);
      showError('Please complete all required fields highlighted in red');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      const errorsOccurred = [];

      for (const d of departmentsList) {
        try {
          const payload = {
            name: d.name.trim(),
            code: d.code.trim().toUpperCase(),
            type: d.type,
            status: d.status,
            description: d.description.trim(),
          };
          await api.post('/departments', payload);
          successCount++;
        } catch (itemErr) {
          errorsOccurred.push(`"${d.name} (${d.code})": ${itemErr.response?.data?.message || itemErr.message}`);
        }
      }

      setLoading(false);

      if (errorsOccurred.length > 0) {
        const errorMsg = `Encountered issues: ${errorsOccurred.join('; ')}`;
        setError(errorMsg);
        showError(errorMsg);
        if (successCount > 0) {
          onSuccess && onSuccess(`Created ${successCount} department(s) with some notices.`);
        }
      } else {
        const successMsg = `${successCount} Department${successCount > 1 ? 's' : ''} created successfully.`;
        if (onSuccess) {
          onSuccess(successMsg);
        } else {
          showSuccess(successMsg);
        }
      }
    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create departments';
      setError(errMsg);
      showError(errMsg);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="dept-sheet-backdrop" onClick={handleAttemptClose}>
        <div className="dept-sheet-container" onClick={(e) => e.stopPropagation()}>
          {/* ── 1. Sheet Header ── */}
          <div className="dept-sheet-header">
            <div className="dept-sheet-header__title-group">
              <span className="material-symbols-rounded dept-sheet-header__icon">
                {isEdit ? 'edit_square' : 'apartment'}
              </span>
              <div>
                <h2 className="dept-sheet-header__title">
                  {isEdit ? 'Edit Department' : 'Create Department(s)'}
                </h2>
                <p className="dept-sheet-header__desc">
                  {isEdit
                    ? 'Modify department identity and operational settings'
                    : 'Add one or multiple hospital departments at once with custom codes and types'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="dept-sheet-header__close-btn"
              onClick={handleAttemptClose}
              title="Close"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>


        {/* ── 2. Sheet Form & Scrollable Body ── */}
        <form className="dept-sheet-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--md-sys-color-error-container, #ffdad6)',
              color: 'var(--md-sys-color-on-error-container, #410002)',
              borderRadius: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
            }}>
              {error}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              MODE A: SINGLE EDIT
             ════════════════════════════════════════════════════════════ */}
          {isEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="dept-form-row">
                <Md3TextField
                  label="Department Name *"
                  value={singleName}
                  onChange={(e) => {
                    setSingleName(e.target.value.replace(/[^a-zA-Z0-9\s'&/,-]/g, ''));
                    if (singleErrors.name) setSingleErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder="e.g. Cardiology & Cardiac Care"
                  error={singleErrors.name}
                  required
                />
                <Md3TextField
                  label="Department Code *"
                  value={singleCode}
                  onChange={(e) => {
                    setSingleCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                    if (singleErrors.code) setSingleErrors((prev) => ({ ...prev, code: null }));
                  }}
                  placeholder="e.g. CARD"
                  error={singleErrors.code}
                  required
                />
              </div>

              <div className="dept-form-field">
                <label className="dept-form-field__label">Department Type *</label>
                <Md3Select
                  value={singleType}
                  onChange={(e) => setSingleType(e.target.value)}
                  required
                >
                  {DEPT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} ({t.desc})
                    </option>
                  ))}
                </Md3Select>
              </div>

              <div className="dept-form-field">
                <label className="dept-form-field__label">Operational Status</label>
                <div className="dept-status-group">
                  {['Active', 'Inactive'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`dept-status-pill ${singleStatus === s ? 'dept-status-pill--active' : ''}`}
                      onClick={() => setSingleStatus(s)}
                    >
                      <span className="material-symbols-rounded">
                        {singleStatus === s ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="dept-form-field">
                <label className="dept-form-field__label">Description (optional)</label>
                <textarea
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief summary of clinical scope and department functions..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-outline-variant, #e0e4df)',
                    background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                    color: 'var(--md-sys-color-on-surface, #191c1b)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className="dept-lifecycle-banner">
                <span className="material-symbols-rounded">info</span>
                <div>
                  <strong>Lifecycle Note:</strong> Staff and Head of Department (HOD) are assigned from the main Department directory card after creation.
                </div>
              </div>
            </div>
          ) : (
            /* ════════════════════════════════════════════════════════════
                MODE B: MULTI-DEPARTMENT BATCH ACCORDION BUILDER
               ════════════════════════════════════════════════════════════ */
            <div className="dept-accordion-section">
              <div className="dept-section-header">
                <span className="dept-section-title">
                  Configured Departments ({departmentsList.length})
                </span>
                <span className="dept-section-hint">
                  Configure multiple departments in one go. Click plus (+) to add more.
                </span>
              </div>

              <div className="dept-accordion-list">
                {departmentsList.map((dept, idx) => {
                  const selectedTypeObj = DEPT_TYPES.find((t) => t.value === dept.type);
                  const titleLabel = dept.name.trim()
                    ? `${dept.code ? `[${dept.code.toUpperCase()}] ` : ''}${dept.name.trim()}`
                    : `New Department #${idx + 1}`;
                  const subLabel = `${selectedTypeObj?.label || dept.type} • ${dept.status}`;

                  return (
                    <div
                      key={dept.id}
                      className={`dept-accordion-card ${dept.isExpanded ? 'dept-accordion-card--expanded' : ''} ${Object.keys(dept.errors || {}).length > 0 ? 'dept-accordion-card--error' : ''}`}
                    >
                      {/* Accordion Card Header */}
                      <div
                        className="dept-accordion-header"
                        onClick={() => handleToggleExpand(dept.id)}
                      >
                        <div className="dept-accordion-header__left">
                          <span className="dept-item-badge">#{idx + 1}</span>
                          <div className="dept-accordion-header__titles">
                            <div className="dept-accordion-header__main">
                              {titleLabel}
                            </div>
                            <div className="dept-accordion-header__sub">
                              {subLabel}
                            </div>
                          </div>
                        </div>

                        <div
                          className="dept-accordion-header__actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {departmentsList.length > 1 && (
                            <button
                              type="button"
                              className="dept-item-btn dept-item-btn--delete"
                              title="Delete this department"
                              onClick={() => handleRemoveDepartmentItem(dept.id)}
                            >
                              <span className="material-symbols-rounded">delete_outline</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="dept-item-btn"
                            title={dept.isExpanded ? 'Collapse' : 'Expand'}
                            onClick={() => handleToggleExpand(dept.id)}
                          >
                            <span className="material-symbols-rounded">
                              {dept.isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Accordion Card Body */}
                      {dept.isExpanded && (
                        <div className="dept-accordion-body">
                          <div className="dept-form-row">
                            <Md3TextField
                              label="Department Name *"
                              value={dept.name}
                              onChange={(e) => handleUpdateField(dept.id, 'name', e.target.value)}
                              placeholder="e.g. General Medicine, Cardiology"
                              error={dept.errors?.name}
                              required
                            />
                            <Md3TextField
                              label="Department Code *"
                              value={dept.code}
                              onChange={(e) => handleUpdateField(dept.id, 'code', e.target.value)}
                              placeholder="e.g. GENMED, CARD"
                              error={dept.errors?.code}
                              required
                            />
                          </div>

                          <div className="dept-form-field">
                            <label className="dept-form-field__label">Department Type *</label>
                            <Md3Select
                              value={dept.type}
                              onChange={(e) => handleUpdateField(dept.id, 'type', e.target.value)}
                              required
                            >
                              {DEPT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label} ({t.desc})
                                </option>
                              ))}
                            </Md3Select>
                          </div>

                          {selectedTypeObj && (
                            <div className="dept-type-tag">
                              {selectedTypeObj.desc}
                            </div>
                          )}

                          <div className="dept-form-field">
                            <label className="dept-form-field__label">Status</label>
                            <div className="dept-status-group">
                              {['Active', 'Inactive'].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={`dept-status-pill ${dept.status === s ? 'dept-status-pill--active' : ''}`}
                                  onClick={() => handleUpdateField(dept.id, 'status', s)}
                                >
                                  <span className="material-symbols-rounded">
                                    {dept.status === s ? 'check_circle' : 'radio_button_unchecked'}
                                  </span>
                                  <span>{s}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="dept-form-field">
                            <label className="dept-form-field__label">Description (optional)</label>
                            <textarea
                              value={dept.description}
                              onChange={(e) => handleUpdateField(dept.id, 'description', e.target.value)}
                              rows={2}
                              placeholder="Brief summary of clinical scope or hospital functions..."
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--md-sys-color-outline-variant, #e0e4df)',
                                background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                color: 'var(--md-sys-color-on-surface, #191c1b)',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                minHeight: '68px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Centered Add Another Department Trigger Button */}
              <div className="dept-add-trigger-row">
                <button
                  type="button"
                  className="dept-add-another-btn"
                  onClick={handleAddDepartmentItem}
                >
                  <span className="material-symbols-rounded">add_circle</span>
                  <span>Add Another Department</span>
                </button>
              </div>

              <div className="dept-lifecycle-banner">
                <span className="material-symbols-rounded">info</span>
                <div>
                  <strong>Lifecycle Note:</strong> Staff profiles and HOD appointments can be assigned directly from the Department directory cards after creation.
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Sticky Sheet Footer ── */}
          <div className="dept-sheet-footer">
            <Md3Button variant="text" type="button" onClick={handleAttemptClose}>
              Cancel
            </Md3Button>
            <Md3Button
              variant="filled"
              type="submit"
              loading={loading}
              loadingText="Saving..."
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                {isEdit ? 'save' : 'add'}
              </span>
              {isEdit
                ? 'Save Changes'
                : `Create ${departmentsList.length} Department${departmentsList.length > 1 ? 's' : ''}`}
            </Md3Button>
          </div>
        </form>
      </div>
    </div>

    <Md3UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      title="Discard unsaved changes?"
      message={isEdit
        ? "You have modified department details. If you discard, your edits will not be saved."
        : "You have unsaved department configurations in this builder. Are you sure you want to discard and exit?"
      }
      confirmLabel="Discard & Exit"
      cancelLabel="Keep Editing"
      onConfirm={handleConfirmDiscard}
      onCancel={() => setShowDiscardConfirm(false)}
    />
  </>
);
};

export default CreateDepartmentSheet;




