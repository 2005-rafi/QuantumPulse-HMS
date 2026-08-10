import React, { useState, useEffect } from 'react';
import { Md3BottomSheet, Md3TextField, Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';
import api from '../../services/api';

const CreateLaboratorySheet = ({ isOpen, onClose, onSuccess, departments = [], laboratory }) => {
  const [formData, setFormData] = useState({ name: '', description: '', departmentId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const isEdit = !!(laboratory && laboratory._id);

  useEffect(() => {
    if (laboratory) {
      setFormData({
        name: laboratory.name || '',
        description: laboratory.description || '',
        departmentId: laboratory.departmentId?._id || laboratory.departmentId || ''
      });
    } else {
      setFormData({ name: '', description: '', departmentId: '' });
    }
    setError(null);
    setFieldErrors({});
  }, [laboratory, isOpen]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') {
      value = value.replace(/[^a-zA-Z0-9\s'-]/g, '');
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
        // Backend update schema only allows name, description, isActive
        await api.put(`/laboratory/config/${laboratory._id}`, {
          name: formData.name,
          description: formData.description
        });
        if (onSuccess) onSuccess(`Laboratory ${formData.name} updated successfully!`);
      } else {
        await api.post('/laboratory/config', formData);
        setFormData({ name: '', description: '', departmentId: '' });
        if (onSuccess) onSuccess(`Laboratory ${formData.name} created!`);
      }
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
    <Md3BottomSheet 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? "Edit Laboratory" : "Create Laboratory"} 
      subtitle={isEdit ? "Modify laboratory details and settings." : "Register a new lab facility linked to a Diagnostic or Clinical/Diagnostic department."}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
        {error && <div style={{ padding: '12px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}
        
        <Md3TextField 
          name="name"
          label="Laboratory Name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Core Pathology Lab"
          error={fieldErrors.name}
        />

        <Md3Select 
          name="departmentId"
          label="Diagnostic Department"
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

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Md3Button variant="text" onClick={onClose} type="button">Cancel</Md3Button>
          <Md3Button variant="filled" type="submit" disabled={loading || !formData.name || !formData.departmentId}>
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Laboratory')}
          </Md3Button>
        </div>
      </form>
    </Md3BottomSheet>
  );
};

export default CreateLaboratorySheet;
