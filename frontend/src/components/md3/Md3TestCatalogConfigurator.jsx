import React, { useState } from 'react';
import { Md3Select, Md3Checkbox } from './Md3FormComponents';

export const Md3TestCatalogConfigurator = ({ lab, onClose, onSave }) => {
  const [tempTestCatalog, setTempTestCatalog] = useState(
    JSON.parse(JSON.stringify(lab.testCatalog || []))
  );
  const [expandedIndices, setExpandedIndices] = useState([0]); // Expand first test by default
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Expand / collapse helpers
  const toggleExpand = (index) => {
    if (expandedIndices.includes(index)) {
      setExpandedIndices(expandedIndices.filter((i) => i !== index));
    } else {
      setExpandedIndices([...expandedIndices, index]);
    }
  };

  // Test catalog modifiers
  const handleAddTest = () => {
    const newIdx = tempTestCatalog.length;
    setTempTestCatalog([...tempTestCatalog, { name: '', sampleType: '', resultFields: [] }]);
    setExpandedIndices([...expandedIndices, newIdx]); // Automatically expand new item
    setErrorBanner('');
  };

  const handleRemoveTest = (index, e) => {
    e.stopPropagation(); // Avoid triggering accordion toggle
    const updated = [...tempTestCatalog];
    updated.splice(index, 1);
    setTempTestCatalog(updated);
    setExpandedIndices(expandedIndices.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
    setErrorBanner('');
  };

  const handleTestFieldChange = (testIdx, field, value) => {
    const updated = [...tempTestCatalog];
    updated[testIdx][field] = value;
    setTempTestCatalog(updated);
  };

  const handleAddResultField = (testIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.push({ key: '', label: '', type: 'Text', unit: '', required: false });
    setTempTestCatalog(updated);
  };

  const handleRemoveResultField = (testIdx, fieldIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.splice(fieldIdx, 1);
    setTempTestCatalog(updated);
  };

  const handleResultFieldChange = (testIdx, fieldIdx, field, value) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields[fieldIdx][field] = value;
    if (field === 'label') {
      updated[testIdx].resultFields[fieldIdx].key = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_');
    }
    setTempTestCatalog(updated);
  };

  // Sanitization helper
  const sanitizeInput = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').trim();
  };

  // Form Validation & Save
  const handleSave = async () => {
    setErrorBanner('');
    // Validation
    for (let i = 0; i < tempTestCatalog.length; i++) {
      const test = tempTestCatalog[i];
      if (!test.name?.trim()) {
        setErrorBanner(`Validation failed: Test #${i + 1} must have a name.`);
        setExpandedIndices(Array.from(new Set([...expandedIndices, i]))); // Expand to show error
        return;
      }
      if (!test.sampleType?.trim()) {
        setErrorBanner(`Validation failed: Sample Type is required for "${test.name || `Test #${i + 1}`}".`);
        setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
        return;
      }
      for (let j = 0; j < test.resultFields.length; j++) {
        const field = test.resultFields[j];
        if (!field.label?.trim()) {
          setErrorBanner(`Validation failed: Field #${j + 1} label is required in test "${test.name}".`);
          setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
          return;
        }
        if (!field.key?.trim()) {
          setErrorBanner(`Validation failed: Field key is missing for "${field.label}" in test "${test.name}".`);
          setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
          return;
        }
      }
    }

    setSaving(true);
    try {
      const sanitizedCatalog = tempTestCatalog.map(test => ({
        name: sanitizeInput(test.name),
        sampleType: sanitizeInput(test.sampleType),
        resultFields: test.resultFields.map(field => ({
          key: sanitizeInput(field.key),
          label: sanitizeInput(field.label),
          type: field.type,
          unit: sanitizeInput(field.unit),
          required: !!field.required
        }))
      }));
      await onSave(sanitizedCatalog);
    } catch (err) {
      setErrorBanner(err.message || 'Error occurred while saving configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--md-sys-color-surface-container-high, #f7f2fa)',
          color: 'var(--md-sys-color-on-surface)',
          borderRadius: '24px',
          maxWidth: '1000px',
          width: '95%',
          maxHeight: 'calc(100vh - 48px)',
          margin: '0 auto',
          overflow: 'hidden',
          border: '1px solid var(--md-sys-color-outline-variant)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          background: 'var(--md-sys-color-surface-container-high)'
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '1.25rem', fontWeight: '700', fontFamily: 'Roboto' }}>
              Configure Test Catalog
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', display: 'inline-block' }}>
              {lab.name}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="md3-icon-btn"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            type="button"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>close</span>
          </button>
        </div>

        {/* Scrolling Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {errorBanner && (
            <div style={{
              background: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-on-error-container)',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
              <span>{errorBanner}</span>
            </div>
          )}

          {tempTestCatalog.map((test, testIdx) => {
            const isExpanded = expandedIndices.includes(testIdx);
            return (
              <div 
                key={testIdx} 
                style={{ 
                  border: '1px solid var(--md-sys-color-outline-variant)', 
                  borderRadius: '16px', 
                  background: 'var(--md-sys-color-surface-container-low, #fff)',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                  flexShrink: 0
                }}
              >
                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => toggleExpand(testIdx)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isExpanded ? 'var(--md-sys-color-surface-container)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--md-sys-color-outline-variant)' : 'none',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span className="material-symbols-rounded" style={{ 
                      fontSize: '24px', 
                      color: 'var(--md-sys-color-on-surface-variant)',
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s ease'
                    }}>
                      keyboard_arrow_down
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>
                      {test.name || <span style={{ fontStyle: 'italic', color: 'var(--md-sys-color-on-surface-variant)' }}>Unnamed Test Item</span>}
                    </span>
                    {test.sampleType && (
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: 'var(--md-sys-color-primary-container)',
                        color: 'var(--md-sys-color-on-primary-container)',
                        marginLeft: '8px'
                      }}>
                        {test.sampleType}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleRemoveTest(testIdx, e)}
                    className="md3-icon-btn is-error"
                    style={{ width: '36px', height: '36px' }}
                    title="Remove Test"
                    type="button"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* General details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)' }}>Test Name</label>
                        <input 
                          type="text" 
                          value={test.name} 
                          onChange={(e) => handleTestFieldChange(testIdx, 'name', e.target.value)} 
                          style={{ 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid var(--md-sys-color-outline-variant)', 
                            background: 'var(--md-sys-color-surface-container-lowest)', 
                            color: 'var(--md-sys-color-on-surface)', 
                            fontSize: '13px',
                            outline: 'none'
                          }} 
                          placeholder="Enter test name" 
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)' }}>Sample Type</label>
                        <input 
                          type="text" 
                          value={test.sampleType} 
                          onChange={(e) => handleTestFieldChange(testIdx, 'sampleType', e.target.value)} 
                          style={{ 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid var(--md-sys-color-outline-variant)', 
                            background: 'var(--md-sys-color-surface-container-lowest)', 
                            color: 'var(--md-sys-color-on-surface)', 
                            fontSize: '13px',
                            outline: 'none'
                          }} 
                          placeholder="Enter sample type (e.g. Blood, Urine)" 
                        />
                      </div>
                    </div>

                    {/* Result Fields Schema table wrapper */}
                    <div style={{ 
                      border: '1px solid var(--md-sys-color-outline-variant)', 
                      borderRadius: '12px', 
                      background: 'var(--md-sys-color-surface-container-lowest)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                        background: 'var(--md-sys-color-surface-container-low)'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--md-sys-color-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Result Fields Schema
                        </span>
                        <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                          schema
                        </span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-low)' }}>
                              <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)' }}>Label</th>
                              <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)', width: '160px' }}>Type</th>
                              <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)', width: '120px' }}>Unit</th>
                              <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', width: '80px' }}>Req</th>
                              <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '600', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', width: '60px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {test.resultFields.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                                  No result fields configured yet. Add one below to structure this test's results schema.
                                </td>
                              </tr>
                            ) : (
                              test.resultFields.map((field, fieldIdx) => (
                                <tr key={fieldIdx} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                                  <td style={{ padding: '6px 12px' }}>
                                    <input 
                                      type="text" 
                                      value={field.label} 
                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'label', e.target.value)} 
                                      style={{ 
                                        width: '100%', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid var(--md-sys-color-outline-variant)', 
                                        background: 'var(--md-sys-color-surface-container-lowest)', 
                                        color: 'var(--md-sys-color-on-surface)', 
                                        boxSizing: 'border-box',
                                        fontSize: '13px',
                                        outline: 'none'
                                      }} 
                                      placeholder="Enter field label" 
                                    />
                                  </td>
                                  <td style={{ padding: '6px 12px' }}>
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
                                  <td style={{ padding: '6px 12px' }}>
                                    <input 
                                      type="text" 
                                      value={field.unit} 
                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'unit', e.target.value)} 
                                      style={{ 
                                        width: '100%', 
                                        padding: '6px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid var(--md-sys-color-outline-variant)', 
                                        background: 'var(--md-sys-color-surface-container-lowest)', 
                                        color: 'var(--md-sys-color-on-surface)', 
                                        boxSizing: 'border-box',
                                        fontSize: '13px',
                                        outline: 'none'
                                      }} 
                                      placeholder="Enter unit" 
                                    />
                                  </td>
                                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                                      <Md3Checkbox 
                                        checked={field.required} 
                                        onChange={(val) => handleResultFieldChange(testIdx, fieldIdx, 'required', val)} 
                                      />
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                    <button 
                                      onClick={() => handleRemoveResultField(testIdx, fieldIdx)} 
                                      className="md3-icon-btn is-error"
                                      style={{ width: '36px', height: '36px' }}
                                      title="Remove Field"
                                      type="button"
                                    >
                                      <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-start' }}>
                        <button 
                          onClick={() => handleAddResultField(testIdx)} 
                          className="md3-btn md3-btn-text"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 8px',
                            color: 'var(--md-sys-color-primary)'
                          }}
                          type="button"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                          Add Result Field
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Test Trigger button */}
          <div 
            onClick={handleAddTest}
            style={{
              border: '2px dashed var(--md-sys-color-outline-variant)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'transparent',
              color: 'var(--md-sys-color-on-surface-variant)',
              transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
              flexShrink: 0
            }}
            className="md3-dashed-card-btn"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>add_circle</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Add New Test</span>
          </div>
        </div>

        {/* Footer Area */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          background: 'var(--md-sys-color-surface-container-high)'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>
            Total: {tempTestCatalog.length} {tempTestCatalog.length === 1 ? 'test' : 'tests'} configured
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={onClose} 
              className="md3-btn md3-btn-outlined"
              style={{ height: '36px', fontSize: '13px', padding: '0 16px' }}
              type="button"
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="md3-btn md3-btn-primary"
              style={{ height: '36px', fontSize: '13px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              type="button"
              disabled={saving}
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>
                  <span>Save Catalog</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
