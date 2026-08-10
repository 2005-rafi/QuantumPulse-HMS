import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3Select } from '../../components/md3/Md3FormComponents';
import { Md3SearchBar, Md3SegmentedFilter } from '../../components/md3/AdminControls';

const AdminLabManager = () => {
  const { 
    laboratories, 
    departments, 
    fetchLabs, 
    openConfirm, 
    closeConfirm, 
    setConfirmLoading, 
    showSuccess, 
    showError 
  } = useOutletContext();

  const [isCreateLaboratoryOpen, setIsCreateLaboratoryOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Both');

  // Test Catalog Configuration State
  const [configuringLab, setConfiguringLab] = useState(null);
  const [tempTestCatalog, setTempTestCatalog] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  const displayMessage = (msg, isError = false) => {
    if (isError) {
      showError(msg);
    } else {
      showSuccess(msg);
    }
  };

  const handleDeleteLaboratory = (id, name) => {
    openConfirm({
      title: 'Delete Laboratory',
      message: `Permanently delete "${name}" laboratory? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'delete_forever',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/laboratory/config/${id}`);
          showSuccess(`Laboratory "${name}" deleted.`);
          fetchLabs();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error deleting laboratory');
          closeConfirm();
        }
      },
    });
  };

  const handleEditLabCatalog = (lab) => {
    setConfiguringLab(lab);
    setTempTestCatalog(lab.testCatalog || []);
  };

  const handleSaveLabCatalog = async () => {
    // Basic validation before saving to backend
    for (const test of tempTestCatalog) {
      if (!test.name?.trim()) {
        displayMessage('All tests in the catalog must have a name.', true);
        return;
      }
      if (!test.sampleType?.trim()) {
        displayMessage(`Sample type is required for test "${test.name}".`, true);
        return;
      }
      for (const field of test.resultFields) {
        if (!field.label?.trim()) {
          displayMessage(`Result field display label is required in test "${test.name}".`, true);
          return;
        }
        if (!field.key?.trim()) {
          displayMessage(`Result field key is missing for "${field.label}" in test "${test.name}". Try typing a label to generate it.`, true);
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
      displayMessage('Laboratory test catalog updated successfully');
      setConfiguringLab(null);
      fetchLabs();
    } catch (err) {
      displayMessage(err.response?.data?.message || 'Error updating catalog', true);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleToggleLabStatus = async (id, name, currentStatus) => {
    try {
      await api.put(`/laboratory/config/${id}`, { isActive: !currentStatus });
      displayMessage(`Laboratory "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchLabs();
    } catch (err) {
      displayMessage(err.response?.data?.message || 'Error updating status', true);
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

  const filteredLaboratories = laboratories.filter((lab) => {
    const matchesSearch = searchQuery.trim() === '' ||
      (lab.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'Both' ||
      (lab.departmentId?.type || 'DIAGNOSTIC') === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>Hospital Laboratories</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <Md3SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search lab or dept code..." 
            />
            <Md3SegmentedFilter
              selectedValue={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Both', label: 'All' },
                { value: 'DIAGNOSTIC', label: 'Diagnostic' },
                { value: 'CLINICAL/DIAGNOSTIC', label: 'Clin+Diag' },
              ]}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid" style={{ flex: 1, paddingBottom: '80px' }}>
            {filteredLaboratories.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--md-sys-color-on-surface-variant)', gridColumn: '1 / -1', minHeight: '50vh', opacity: 0.8 }}>
                <Icon.Microscope style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.5, color: 'var(--md-sys-color-on-surface-variant)' }} />
                <h3 style={{ margin: 0, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>No laboratories found</h3>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>There are currently no laboratories configured matching the filters.</p>
              </div>
            ) : (
              filteredLaboratories.map(lab => (
                <div key={lab._id} className="md3-data-card">
                  <div className="md3-data-card-header">
                    <h3 className="md3-data-card-title" style={{ opacity: lab.isActive ? 1 : 0.65 }}>{lab.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!lab.isActive && (
                        <span className="md3-status-chip md3-card-btn-error" style={{ fontSize: '10px', padding: '2px 8px' }}>
                          INACTIVE
                        </span>
                      )}
                      <span className="md3-status-chip md3-card-btn-secondary" style={{ fontSize: '11px', padding: '3px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {lab.departmentId?.code || 'LAB'}
                      </span>
                    </div>
                  </div>
                  <div className="md3-data-card-body">
                    <p style={{ margin: 0, color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px', lineHeight: '1.4' }}>
                      {lab.description || 'No description provided.'}
                    </p>
                    <div className="md3-card-meta-list" style={{ marginTop: '12px' }}>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Department</span>
                        <span className="md3-card-meta-value">{lab.departmentId?.name || '—'}</span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Dept Type</span>
                        <span className="md3-status-chip md3-card-btn-secondary" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '11px', fontWeight: 600 }}>
                          {lab.departmentId?.type || 'DIAGNOSTIC'}
                        </span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Catalog Size</span>
                        <span className="md3-card-meta-value">{(lab.testCatalog?.length || 0)} test{lab.testCatalog?.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md3-data-card-actions">
                    <button 
                      onClick={() => setEditingLab(lab)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => handleEditLabCatalog(lab)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Test Catalog
                    </button>
                    <button 
                      onClick={() => handleToggleLabStatus(lab._id, lab.name, lab.isActive)}
                      className={`md3-card-btn ${lab.isActive ? 'md3-card-btn-outlined' : 'md3-card-btn-primary'}`}
                    >
                      {lab.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteLaboratory(lab._id, lab.name)}
                      className="md3-card-btn md3-card-btn-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <Md3Fab 
        icon={<Icon.Plus />} 
        label="Add Lab" 
        onClick={() => setIsCreateLaboratoryOpen(true)} 
        style={{ position: 'fixed', bottom: '32px', right: '32px' }} 
      />

      <CreateLaboratorySheet
        isOpen={isCreateLaboratoryOpen || !!editingLab}
        onClose={() => { setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        onSuccess={(msg) => { displayMessage(msg); fetchLabs(); setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        departments={departments}
        laboratory={editingLab}
      />

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
              >
                + Add Test to Catalog
              </button>
            </div>
            
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setConfiguringLab(null)} 
                style={{ padding: '10px 20px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveLabCatalog} 
                disabled={localLoading} 
                style={{ padding: '10px 20px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', cursor: localLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
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

export default AdminLabManager;
