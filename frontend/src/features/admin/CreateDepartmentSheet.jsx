import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DEPT_TYPES = [
  { value: 'CLINICAL',            label: 'Clinical',                    desc: 'Patient consultation and treatment' },
  { value: 'DIAGNOSTIC',         label: 'Diagnostic',                  desc: 'Investigations and diagnostics (e.g. Lab, Radiology)' },
  { value: 'CLINICAL/DIAGNOSTIC', label: 'Clinical & Diagnostic',       desc: 'Both consultation and diagnostic services' },
  { value: 'SUPPORT',            label: 'Support',                     desc: 'Supports hospital operations (e.g. Pharmacy)' },
  { value: 'ADMINISTRATIVE',     label: 'Administrative',              desc: 'Administration and management (e.g. Billing, HR)' },
];

const EMPTY_FORM = { name: '', code: '', description: '', type: '', status: 'Active' };

/**
 * CreateDepartmentSheet — Right-side drawer for creating and editing departments.
 *
 * SOLID / SRP: This component owns only the department form interaction.
 * Parent (AdminDepartmentManager) owns data fetching and list rendering.
 *
 * Per docs/file.md §Department Creation Workflow:
 * - Only identity fields are created here (name, code, type, status, description).
 * - HOD assignment is a separate post-creation step in AdminDepartmentManager.
 */
const CreateDepartmentSheet = ({ isOpen, onClose, onSuccess, department }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (department) {
      setFormData({
        name:        department.name        || '',
        code:        department.code        || '',
        description: department.description || '',
        type:        department.type        || '',
        status:      department.status      || 'Active',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setError(null);
    setFieldErrors({});
  }, [department, isOpen]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'code') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (name === 'name') {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Department name is required';
    } else if (!/^[a-zA-Z]/.test(formData.name.trim())) {
      errors.name = 'Department name must start with a letter';
    }

    if (!formData.code.trim()) {
      errors.code = 'Department code is required';
    } else if (formData.code.trim().length < 2) {
      errors.code = 'Code must be at least 2 characters long';
    }

    if (!formData.type) {
      errors.type = 'Department type is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormPreFilled = formData.name.trim() && formData.code.trim() && formData.type;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError(null);
    setLoading(true);

    try {
      if (department) {
        await api.put(`/departments/${department._id}`, formData);
        onSuccess?.(`Department "${formData.name}" updated successfully!`);
      } else {
        await api.post('/departments', formData);
        onSuccess?.(`Department "${formData.name}" created successfully!`);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Error ${department ? 'updating' : 'creating'} department`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedType = DEPT_TYPES.find((t) => t.value === formData.type);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1200,
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '480px',
          background: 'var(--md-sys-color-surface-container-low)',
          color: 'var(--md-sys-color-on-surface)',
          zIndex: 1201,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          borderRadius: '28px 0 0 28px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            background: 'var(--md-sys-color-surface-container)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                {department ? 'Edit Department' : 'Create Department'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {department
                  ? 'Modify department configuration. HOD is managed separately.'
                  : 'Set up a new department. Staff & HOD are assigned after creation.'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--md-sys-color-surface-container-high)',
                border: 'none', borderRadius: '50%',
                width: '36px', height: '36px',
                cursor: 'pointer', fontSize: '18px',
                color: 'var(--md-sys-color-on-surface-variant)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-on-error-container)',
              borderRadius: '12px', fontSize: '13px', lineHeight: '1.5',
            }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Department Name <span style={{ color: 'var(--md-sys-color-error)' }}>*</span>
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Cardiology"
              required
              style={{
                ...inputStyle,
                border: fieldErrors.name ? '2px solid var(--md-sys-color-error)' : '1px solid var(--md-sys-color-outline-variant)'
              }}
            />
            {fieldErrors.name && (
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-error)', marginTop: '2px' }}>
                {fieldErrors.name}
              </span>
            )}
          </div>

          {/* Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Department Code <span style={{ color: 'var(--md-sys-color-error)' }}>*</span>
            </label>
            <input
              name="code"
              type="text"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. CARD"
              maxLength={10}
              required
              style={{
                ...inputStyle,
                letterSpacing: '0.1em',
                fontWeight: 700,
                fontFamily: 'monospace',
                border: fieldErrors.code ? '2px solid var(--md-sys-color-error)' : '1px solid var(--md-sys-color-outline-variant)'
              }}
            />
            {fieldErrors.code ? (
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-error)', marginTop: '2px' }}>
                {fieldErrors.code}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8 }}>
                Uppercase, max 10 chars. Used in token generation and reporting.
              </span>
            )}
          </div>

          {/* Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Department Type <span style={{ color: 'var(--md-sys-color-error)' }}>*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={{
                ...inputStyle,
                border: fieldErrors.type ? '2px solid var(--md-sys-color-error)' : '1px solid var(--md-sys-color-outline-variant)'
              }}
            >
              <option value="">-- Select department type --</option>
              {DEPT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {fieldErrors.type && (
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-error)', marginTop: '2px' }}>
                {fieldErrors.type}
              </span>
            )}
            {selectedType && (
              <span style={{
                fontSize: '12px',
                color: 'var(--md-sys-color-primary)',
                background: 'var(--md-sys-color-primary-container)',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'inline-block',
              }}>
                {selectedType.desc}
              </span>
            )}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['Active', 'Inactive'].map((s) => (
                <label
                  key={s}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px',
                    border: `2px solid ${formData.status === s ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: formData.status === s ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    color: formData.status === s ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                    fontSize: '14px', fontWeight: 600,
                    transition: 'all 150ms ease',
                    flex: 1, justifyContent: 'center',
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={formData.status === s}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                    {s === 'Active' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Description <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the department's functions..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {/* Lifecycle note */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
            borderRadius: '12px',
            fontSize: '12px',
            lineHeight: '1.6',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', flexShrink: 0 }}>info</span>
            <div>
              <strong>Lifecycle Note:</strong> After creating this department, you can register staff and assign
              a Head of Department from the department card in the main list.
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            background: 'var(--md-sys-color-surface-container)',
            display: 'flex', justifyContent: 'flex-end', gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            type="button"
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '100px',
              cursor: 'pointer',
              fontSize: '14px', fontWeight: 600,
              color: 'var(--md-sys-color-on-surface)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isFormPreFilled}
            style={{
              padding: '10px 28px',
              background: isFormPreFilled && !loading ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
              color: isFormPreFilled && !loading ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
              border: 'none',
              borderRadius: '100px',
              cursor: loading || !isFormPreFilled ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 700,
              transition: 'all 150ms ease',
            }}
          >
            {loading ? 'Saving...' : department ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </div>
    </>
  );
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid var(--md-sys-color-outline-variant)',
  background: 'var(--md-sys-color-surface-container-lowest)',
  color: 'var(--md-sys-color-on-surface)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export default CreateDepartmentSheet;


