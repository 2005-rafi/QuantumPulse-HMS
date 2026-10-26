import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Md3BottomSheet, Md3TextField, Md3Select, Md3Button, Md3UnsavedChangesDialog } from '../../components/md3/Md3FormComponents';
import api from '../../services/api';

const CreateLaboratorySheet = ({ isOpen, onClose, onSuccess, departments = [], laboratory }) => {
  const [formData, setFormData] = useState({ name: '', code: '', description: '', departmentId: '', requireVitalsCollection: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const initialDataRef = useRef({ name: '', code: '', description: '', departmentId: '', requireVitalsCollection: false });

  const isEdit = !!(laboratory && laboratory._id);

  useEffect(() => {
    if (laboratory) {
      const initial = {
        name: laboratory.name || '',
        code: laboratory.code || '',
        description: laboratory.description || '',
        departmentId: laboratory.departmentId?._id || laboratory.departmentId || '',
        requireVitalsCollection: Boolean(laboratory.requireVitalsCollection)
      };
      setFormData(initial);
      initialDataRef.current = initial;
    } else {
      const initial = { name: '', code: '', description: '', departmentId: '', requireVitalsCollection: false };
      setFormData(initial);
      initialDataRef.current = initial;
    }
    setError(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
  }, [laboratory, isOpen]);

  const isDirty = useMemo(() => {
    const init = initialDataRef.current;
    return (
      (formData.name || '').trim() !== (init.name || '').trim() ||
      (formData.code || '').trim() !== (init.code || '').trim() ||
      (formData.description || '').trim() !== (init.description || '').trim() ||
      (formData.departmentId || '') !== (init.departmentId || '') ||
      Boolean(formData.requireVitalsCollection) !== Boolean(init.requireVitalsCollection)
    );
  }, [formData]);

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

  const handleChange = (e) => {
    let { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'name') {
      value = value.replace(/[^a-zA-Z0-9\s'-]/g, '');
    }
    if (name === 'code') {
      value = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Laboratory name is required';
    } else if (!/^[a-zA-Z]/.test(formData.name.trim())) {
      errors.name = 'Laboratory name must start with a letter';
    }

    if (!formData.departmentId) {
      errors.departmentId = 'Department is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError(null);
    setLoading(true);
    
    try {
      if (isEdit) {
        await api.put(`/laboratory/config/${laboratory._id}`, {
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description,
          requireVitalsCollection: Boolean(formData.requireVitalsCollection),
        });
        if (onSuccess) onSuccess(`Laboratory ${formData.name} updated successfully!`);
      } else {
        await api.post('/laboratory/config', {
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description,
          departmentId: formData.departmentId,
          requireVitalsCollection: Boolean(formData.requireVitalsCollection),
        });
        setFormData({ name: '', code: '', description: '', departmentId: '', requireVitalsCollection: false });
        if (onSuccess) onSuccess(`Laboratory ${formData.name} created!`);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Error ${isEdit ? 'updating' : 'creating'} laboratory`);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = [
    { value: '', label: '-- Select a department --' },
    ...departments
      .filter((d) => d.type === 'DIAGNOSTIC' || d.type === 'CLINICAL/DIAGNOSTIC')
      .map((d) => ({ value: d._id, label: `${d.name} (${d.code || d.type})` }))
  ];

  return (
    <>
      <Md3BottomSheet 
        isOpen={isOpen} 
        onClose={handleAttemptClose} 
        title={isEdit ? "Edit Laboratory" : "Create Laboratory"} 
        subtitle={isEdit ? "Modify laboratory details and settings." : "Register a new lab facility linked to a Diagnostic or Clinical/Diagnostic department."}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
          {error && <div style={{ padding: '12px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <Md3TextField 
              name="name"
              label="Laboratory Name *"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Central Clinical Pathology Lab"
              error={fieldErrors.name}
            />

            <Md3TextField 
              name="code"
              label="Lab Code (Optional)"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. LAB-PATH"
            />
          </div>

          <Md3Select 
            name="departmentId"
            label="Diagnostic Department *"
            value={formData.departmentId}
            onChange={handleChange}
            options={departmentOptions}
            disabled={!!laboratory}
            error={fieldErrors.departmentId}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.875rem' }}>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              style={{
                padding: '12px',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: '8px',
                minHeight: '80px',
                fontFamily: 'inherit',
                resize: 'vertical',
                background: 'var(--md-sys-color-surface-container-lowest)',
                color: 'var(--md-sys-color-on-surface)'
              }} 
              placeholder="Brief description of the lab's services..."
            />
          </div>

          {/* ── Pre-Analytical Vitals Collection Policy Toggle ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: '10px',
            background: formData.requireVitalsCollection ? 'var(--md-sys-color-primary-container, #cce8e3)' : 'var(--md-sys-color-surface-container-low, #f8fafc)',
            transition: 'background 0.2s ease',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <span className="material-symbols-rounded" style={{
                fontSize: '24px',
                color: formData.requireVitalsCollection ? 'var(--md-sys-color-primary, #00668b)' : 'var(--md-sys-color-on-surface-variant, #64748b)'
              }}>
                vital_signs
              </span>
              <div>
                <strong style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  color: formData.requireVitalsCollection ? 'var(--md-sys-color-on-primary-container, #004d69)' : 'var(--md-sys-color-on-surface, #1e293b)'
                }}>
                  Default Pre-Analytical Vitals Collection
                </strong>
                <span style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: formData.requireVitalsCollection ? 'var(--md-sys-color-on-primary-container, #004d69)' : 'var(--md-sys-color-on-surface-variant, #64748b)',
                  marginTop: '2px'
                }}>
                  When enabled, Lab Nurses in this department are prompted to obtain vital signs (BP, Pulse, SpO2, Temp, Glucose) alongside specimen collection. Nurses can skip or rollback as clinically indicated.
                </span>
              </div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '16px' }}>
              <input 
                type="checkbox"
                name="requireVitalsCollection"
                checked={Boolean(formData.requireVitalsCollection)}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary, #00668b)' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Md3Button variant="text" onClick={handleAttemptClose} type="button">Cancel</Md3Button>
            <Md3Button variant="filled" type="submit" disabled={loading || !formData.name || !formData.departmentId}>
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Laboratory')}
            </Md3Button>
          </div>
        </form>
      </Md3BottomSheet>

      <Md3UnsavedChangesDialog
        isOpen={showDiscardConfirm}
        title="Discard unsaved changes?"
        message={isEdit
          ? "You have unsaved changes to this laboratory profile. Are you sure you want to discard your edits?"
          : "You have unsaved changes in this laboratory form. Are you sure you want to discard?"
        }
        confirmLabel="Discard & Exit"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};

export default CreateLaboratorySheet;

