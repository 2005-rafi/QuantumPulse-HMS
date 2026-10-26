import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Select, Md3Checkbox, Md3Button, Md3UnsavedChangesDialog } from './Md3FormComponents';
import './Md3TestCatalogConfigurator.css';

/**
 * Helper to parse min and max numerical bounds from legacy reference range strings
 */
const parseMinMaxFromRef = (ref) => {
  if (!ref || typeof ref !== 'string') {
    return { isGenderSpecific: false, min: '', max: '', maleMin: '', maleMax: '', femaleMin: '', femaleMax: '' };
  }

  // Check for gender specific formats: e.g. "13.0 - 17.0 (M), 12.0 - 15.5 (F)" or "0 - 15 (M), 0 - 20 (F)"
  const maleMatch = ref.match(/([0-9.]+)\s*[-–—to]+\s*([0-9.]+)\s*\(\s*M(?:ale)?\s*\)/i);
  const femaleMatch = ref.match(/([0-9.]+)\s*[-–—to]+\s*([0-9.]+)\s*\(\s*F(?:emale)?\s*\)/i);

  if (maleMatch || femaleMatch) {
    return {
      isGenderSpecific: true,
      min: '',
      max: '',
      maleMin: maleMatch ? maleMatch[1] : '',
      maleMax: maleMatch ? maleMatch[2] : '',
      femaleMin: femaleMatch ? femaleMatch[1] : '',
      femaleMax: femaleMatch ? femaleMatch[2] : '',
    };
  }

  // Universal range: e.g. "4,000 - 11,000" or "4000 - 11000" or "1.50 - 4.50"
  const cleanRef = ref.replace(/,/g, '');
  const universalMatch = cleanRef.match(/([0-9.]+)\s*[-–—to]+\s*([0-9.]+)/i);
  if (universalMatch) {
    return {
      isGenderSpecific: false,
      min: universalMatch[1],
      max: universalMatch[2],
      maleMin: '',
      maleMax: '',
      femaleMin: '',
      femaleMax: '',
    };
  }

  return { isGenderSpecific: false, min: '', max: '', maleMin: '', maleMax: '', femaleMin: '', femaleMax: '' };
};

/**
 * Helper to dynamically recompute composite reference string
 */
const computeReferenceString = (field) => {
  if (field.type !== 'Number') return field.reference || '';
  if (field.isGenderSpecific) {
    const mPart = (field.maleMin !== '' && field.maleMax !== '')
      ? `${field.maleMin} – ${field.maleMax} (M)`
      : (field.maleMin !== '' ? `>= ${field.maleMin} (M)` : (field.maleMax !== '' ? `<= ${field.maleMax} (M)` : ''));

    const fPart = (field.femaleMin !== '' && field.femaleMax !== '')
      ? `${field.femaleMin} – ${field.femaleMax} (F)`
      : (field.femaleMin !== '' ? `>= ${field.femaleMin} (F)` : (field.femaleMax !== '' ? `<= ${field.femaleMax} (F)` : ''));

    if (mPart && fPart) return `${mPart}, ${fPart}`;
    if (mPart) return mPart;
    if (fPart) return fPart;
    return '';
  } else {
    const min = field.min;
    const max = field.max;
    if (min !== '' && max !== '') return `${min} – ${max}`;
    if (min !== '') return `>= ${min}`;
    if (max !== '') return `<= ${max}`;
    return '';
  }
};

export const Md3TestCatalogConfigurator = ({ lab, onClose, onSave }) => {
  const initialCatalog = useMemo(() => {
    const raw = JSON.parse(JSON.stringify(lab.testCatalog || []));
    return raw.map((test) => {
      const isDocOnly = Boolean(test.isDocumentUploadOnly || test.reportType === 'DOCUMENT_UPLOAD');
      return {
        name: test.name || '',
        testCode: test.testCode || '',
        sampleType: test.sampleType || '',
        reportType: test.reportType || (isDocOnly ? 'DOCUMENT_UPLOAD' : 'STRUCTURED_DATA'),
        isDocumentUploadOnly: isDocOnly,
        templateLayout: test.templateLayout || 'STANDARD_NUMERICAL',
        resultFields: (test.resultFields || []).map((f) => {
          let isGenderSpecific = Boolean(f.isGenderSpecific);
          let minVal = f.min !== undefined && f.min !== null ? String(f.min) : '';
          let maxVal = f.max !== undefined && f.max !== null ? String(f.max) : '';
          let maleMinVal = f.maleMin !== undefined && f.maleMin !== null ? String(f.maleMin) : '';
          let maleMaxVal = f.maleMax !== undefined && f.maleMax !== null ? String(f.maleMax) : '';
          let femaleMinVal = f.femaleMin !== undefined && f.femaleMin !== null ? String(f.femaleMin) : '';
          let femaleMaxVal = f.femaleMax !== undefined && f.femaleMax !== null ? String(f.femaleMax) : '';

          if (!isGenderSpecific && minVal === '' && maxVal === '' && maleMinVal === '' && femaleMinVal === '' && f.reference) {
            const parsed = parseMinMaxFromRef(f.reference);
            isGenderSpecific = parsed.isGenderSpecific;
            minVal = parsed.min;
            maxVal = parsed.max;
            maleMinVal = parsed.maleMin;
            maleMaxVal = parsed.maleMax;
            femaleMinVal = parsed.femaleMin;
            femaleMaxVal = parsed.femaleMax;
          }

          if (maleMinVal !== '' || femaleMinVal !== '') {
            isGenderSpecific = true;
          }

          return {
            key: f.key || '',
            label: f.label || '',
            type: f.type || 'Number',
            unit: f.unit || '',
            isGenderSpecific,
            min: minVal,
            max: maxVal,
            maleMin: maleMinVal,
            maleMax: maleMaxVal,
            femaleMin: femaleMinVal,
            femaleMax: femaleMaxVal,
            reference: f.reference || '',
            required: !!f.required,
          };
        }),
      };
    });
  }, [lab]);

  const [tempTestCatalog, setTempTestCatalog] = useState(initialCatalog);
  const [catalogFilter, setCatalogFilter] = useState('ALL'); // 'ALL' | 'STRUCTURED' | 'UPLOAD_ONLY'
  const [expandedIndices, setExpandedIndices] = useState([0]); // Expand first test by default
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Compute dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(tempTestCatalog) !== JSON.stringify(initialCatalog);
  }, [tempTestCatalog, initialCatalog]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        handleRequestClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saving, isDirty]);

  const toggleExpand = (index) => {
    if (expandedIndices.includes(index)) {
      setExpandedIndices(expandedIndices.filter((i) => i !== index));
    } else {
      setExpandedIndices([...expandedIndices, index]);
    }
  };

  const handleAddTest = () => {
    const newIdx = tempTestCatalog.length;
    const isDoc = catalogFilter === 'UPLOAD_ONLY';
    setTempTestCatalog([
      ...tempTestCatalog,
      {
        name: '',
        testCode: '',
        sampleType: '',
        reportType: isDoc ? 'DOCUMENT_UPLOAD' : 'STRUCTURED_DATA',
        isDocumentUploadOnly: isDoc,
        templateLayout: 'STANDARD_NUMERICAL',
        resultFields: [],
      },
    ]);
    setExpandedIndices([...expandedIndices, newIdx]);
    setErrorBanner('');
  };

  const handleRemoveTest = (index, e) => {
    e.stopPropagation();
    const updated = [...tempTestCatalog];
    updated.splice(index, 1);
    setTempTestCatalog(updated);
    setExpandedIndices(expandedIndices.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
    setErrorBanner('');
  };

  const handleTestFieldChange = (testIdx, field, value) => {
    const updated = [...tempTestCatalog];
    updated[testIdx][field] = value;
    if (field === 'testCode') {
      updated[testIdx].testCode = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    }
    if (field === 'reportType') {
      if (value === 'DOCUMENT_UPLOAD') {
        updated[testIdx].isDocumentUploadOnly = true;
      } else if (value === 'STRUCTURED_DATA') {
        updated[testIdx].isDocumentUploadOnly = false;
      } else if (value === 'HYBRID') {
        updated[testIdx].isDocumentUploadOnly = false;
      }
    }
    setTempTestCatalog(updated);
  };

  const handleAddResultField = (testIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.push({
      key: '',
      label: '',
      type: 'Number',
      unit: '',
      isGenderSpecific: false,
      min: '',
      max: '',
      maleMin: '',
      maleMax: '',
      femaleMin: '',
      femaleMax: '',
      reference: '',
      required: false,
    });
    setTempTestCatalog(updated);
  };

  const handleRemoveResultField = (testIdx, fieldIdx) => {
    const updated = [...tempTestCatalog];
    updated[testIdx].resultFields.splice(fieldIdx, 1);
    setTempTestCatalog(updated);
  };

  const handleResultFieldChange = (testIdx, fieldIdx, field, value) => {
    const updated = [...tempTestCatalog];
    const target = updated[testIdx].resultFields[fieldIdx];
    target[field] = value;

    if (field === 'label') {
      target.key = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_');
    }

    if (['min', 'max', 'maleMin', 'maleMax', 'femaleMin', 'femaleMax', 'isGenderSpecific', 'type'].includes(field)) {
      target.reference = computeReferenceString(target);
    }

    setTempTestCatalog(updated);
  };

  const sanitizeInput = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').trim();
  };

  const handleSave = async () => {
    setErrorBanner('');
    // Validation
    for (let i = 0; i < tempTestCatalog.length; i++) {
      const test = tempTestCatalog[i];
      if (!test.name?.trim()) {
        setErrorBanner(`Validation failed: Test #${i + 1} must have a name.`);
        setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
        return;
      }
      if (!test.sampleType?.trim()) {
        setErrorBanner(`Validation failed: Specimen / Sample Type is required for "${test.name || `Test #${i + 1}`}".`);
        setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
        return;
      }
      if (test.reportType !== 'DOCUMENT_UPLOAD' && !test.isDocumentUploadOnly) {
        for (let j = 0; j < test.resultFields.length; j++) {
          const field = test.resultFields[j];
          if (!field.label?.trim()) {
            setErrorBanner(`Validation failed: Parameter #${j + 1} label is required in test "${test.name}".`);
            setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
            return;
          }
          if (!field.key?.trim()) {
            setErrorBanner(`Validation failed: Parameter key is missing for "${field.label}" in test "${test.name}".`);
            setExpandedIndices(Array.from(new Set([...expandedIndices, i])));
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const sanitizedCatalog = tempTestCatalog.map((test) => {
        const cleanName = sanitizeInput(test.name);
        let cleanCode = sanitizeInput(test.testCode || '').toUpperCase();
        if (!cleanCode && cleanName) {
          cleanCode = cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
        }

        const isDocOnly = Boolean(test.isDocumentUploadOnly || test.reportType === 'DOCUMENT_UPLOAD');
        const finalReportType = test.reportType || (isDocOnly ? 'DOCUMENT_UPLOAD' : 'STRUCTURED_DATA');

        return {
          name: cleanName,
          testCode: cleanCode,
          sampleType: sanitizeInput(test.sampleType),
          reportType: finalReportType,
          isDocumentUploadOnly: isDocOnly,
          templateLayout: test.templateLayout || 'STANDARD_NUMERICAL',
          resultFields: test.resultFields.map((field) => {
            const isGen = Boolean(field.isGenderSpecific);
            const numMin = !isGen && field.min !== '' && field.min !== null && !isNaN(Number(field.min)) ? Number(field.min) : null;
            const numMax = !isGen && field.max !== '' && field.max !== null && !isNaN(Number(field.max)) ? Number(field.max) : null;
            const numMaleMin = isGen && field.maleMin !== '' && field.maleMin !== null && !isNaN(Number(field.maleMin)) ? Number(field.maleMin) : null;
            const numMaleMax = isGen && field.maleMax !== '' && field.maleMax !== null && !isNaN(Number(field.maleMax)) ? Number(field.maleMax) : null;
            const numFemMin = isGen && field.femaleMin !== '' && field.femaleMin !== null && !isNaN(Number(field.femaleMin)) ? Number(field.femaleMin) : null;
            const numFemMax = isGen && field.femaleMax !== '' && field.femaleMax !== null && !isNaN(Number(field.femaleMax)) ? Number(field.femaleMax) : null;

            const refStr = computeReferenceString({
              ...field,
              isGenderSpecific: isGen,
              min: numMin ?? '',
              max: numMax ?? '',
              maleMin: numMaleMin ?? '',
              maleMax: numMaleMax ?? '',
              femaleMin: numFemMin ?? '',
              femaleMax: numFemMax ?? '',
            });

            return {
              key: sanitizeInput(field.key),
              label: sanitizeInput(field.label),
              type: field.type,
              unit: sanitizeInput(field.unit),
              isGenderSpecific: isGen,
              min: numMin,
              max: numMax,
              maleMin: numMaleMin,
              maleMax: numMaleMax,
              femaleMin: numFemMin,
              femaleMax: numFemMax,
              reference: refStr,
              required: !!field.required,
            };
          }),
        };
      });

      await onSave(sanitizedCatalog);
    } catch (err) {
      setErrorBanner(err.message || 'Error occurred while saving configuration.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTests = useMemo(() => {
    return tempTestCatalog.map((test, index) => ({ test, originalIndex: index })).filter(({ test }) => {
      if (catalogFilter === 'STRUCTURED') {
        return test.reportType === 'STRUCTURED_DATA' || (!test.isDocumentUploadOnly && test.reportType !== 'DOCUMENT_UPLOAD' && test.reportType !== 'HYBRID');
      }
      if (catalogFilter === 'UPLOAD_ONLY') {
        return test.isDocumentUploadOnly || test.reportType === 'DOCUMENT_UPLOAD';
      }
      if (catalogFilter === 'HYBRID') {
        return test.reportType === 'HYBRID';
      }
      return true;
    });
  }, [tempTestCatalog, catalogFilter]);

  return createPortal(
    <div className="catalog-sheet-backdrop" onClick={handleRequestClose}>
      <div
        className="catalog-sheet-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-sheet-title"
      >
        {/* 1. Header Strip */}
        <div className="catalog-sheet-header">
          <div className="catalog-sheet-header__title-group">
            <div className="catalog-sheet-header__icon">
              <span className="material-symbols-rounded">biotech</span>
            </div>
            <div>
              <h2 id="catalog-sheet-title" className="catalog-sheet-header__title">
                Configure Diagnostic Test Catalog
              </h2>
              <p className="catalog-sheet-header__desc">
                <span>{lab?.name || 'Laboratory Services'}</span>
                {lab?.code && <span className="catalog-code-badge">{lab.code}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="catalog-sheet-header__close-btn"
            title="Close drawer"
            type="button"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorBanner && (
          <div className="catalog-error-banner">
            <span className="material-symbols-rounded">error</span>
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Centralized Tariff Governance Callout */}
        <div
          style={{
            margin: '0 24px 12px 24px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'var(--md-sys-color-surface-container-low, #f4f6fb)',
            border: '1px solid var(--md-sys-color-outline-variant, #d0d7de)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.78rem',
            color: 'var(--md-sys-color-on-surface-variant, #49454f)',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary, #00668b)', flexShrink: 0 }}>
            verified_user
          </span>
          <span>
            <strong>Clinical Master:</strong> Configure test codes, specimens, reporting modes (Document Upload vs. Structured Data Entry), and reference intervals here.
          </span>
        </div>

        {/* Filter Bar */}
        <div className="catalog-filter-bar">
          <button
            type="button"
            className={`catalog-filter-btn ${catalogFilter === 'ALL' ? 'catalog-filter-btn--active' : ''}`}
            onClick={() => setCatalogFilter('ALL')}
          >
            <span>All Tests</span>
            <span>({tempTestCatalog.length})</span>
          </button>
          <button
            type="button"
            className={`catalog-filter-btn ${catalogFilter === 'STRUCTURED' ? 'catalog-filter-btn--active' : ''}`}
            onClick={() => setCatalogFilter('STRUCTURED')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>table_chart</span>
            <span>Structured Analyte Entry</span>
            <span>({tempTestCatalog.filter((t) => t.reportType === 'STRUCTURED_DATA' || (!t.isDocumentUploadOnly && t.reportType !== 'DOCUMENT_UPLOAD' && t.reportType !== 'HYBRID')).length})</span>
          </button>
          <button
            type="button"
            className={`catalog-filter-btn ${catalogFilter === 'UPLOAD_ONLY' ? 'catalog-filter-btn--active' : ''}`}
            onClick={() => setCatalogFilter('UPLOAD_ONLY')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>upload_file</span>
            <span>Document / Scan Upload</span>
            <span>({tempTestCatalog.filter((t) => t.isDocumentUploadOnly || t.reportType === 'DOCUMENT_UPLOAD').length})</span>
          </button>
          <button
            type="button"
            className={`catalog-filter-btn ${catalogFilter === 'HYBRID' ? 'catalog-filter-btn--active' : ''}`}
            onClick={() => setCatalogFilter('HYBRID')}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>sync_alt</span>
            <span>Hybrid</span>
            <span>({tempTestCatalog.filter((t) => t.reportType === 'HYBRID').length})</span>
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="catalog-sheet-body">
          {filteredTests.length === 0 && (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--md-sys-color-on-surface-variant)',
                background: 'var(--md-sys-color-surface-container-low, #f7f7fa)',
                borderRadius: '20px',
                border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '52px', color: 'var(--md-sys-color-outline)' }}>
                science
              </span>
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '1.05rem', fontWeight: '700' }}>
                {tempTestCatalog.length === 0 ? 'No Diagnostic Tests Configured' : 'No Matching Tests in Filter'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {tempTestCatalog.length === 0
                  ? 'Add standard test profiles with reporting modes, parameters, and physiological reference intervals.'
                  : 'Try switching the filter tab or click "Add Another Test Profile" below.'}
              </p>
            </div>
          )}

          <div className="catalog-accordion-list">
            {filteredTests.map(({ test, originalIndex: testIdx }) => {
              const isExpanded = expandedIndices.includes(testIdx);
              const isDocOnly = test.isDocumentUploadOnly || test.reportType === 'DOCUMENT_UPLOAD';
              const isHybrid = test.reportType === 'HYBRID';

              return (
                <div
                  key={testIdx}
                  className={`catalog-test-card ${isExpanded ? 'catalog-test-card--expanded' : ''}`}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleExpand(testIdx)}
                    className="catalog-test-header"
                  >
                    <div className="catalog-test-header__left">
                      <span
                        className="material-symbols-rounded"
                        style={{
                          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 0.2s ease',
                          color: 'var(--md-sys-color-on-surface-variant)',
                        }}
                      >
                        expand_more
                      </span>
                      <span className="catalog-test-header__title">
                        {test.name || `New Diagnostic Test Profile #${testIdx + 1}`}
                      </span>
                      {test.testCode && (
                        <span className="catalog-code-badge">
                          {test.testCode}
                        </span>
                      )}
                      {test.sampleType && (
                        <span className="catalog-sample-badge">
                          {test.sampleType}
                        </span>
                      )}
                      {isDocOnly ? (
                        <span className="catalog-mode-badge catalog-mode-badge--upload">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>upload_file</span>
                          Scan / Doc Upload
                        </span>
                      ) : isHybrid ? (
                        <span className="catalog-mode-badge catalog-mode-badge--hybrid">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>sync_alt</span>
                          Hybrid
                        </span>
                      ) : (
                        <span className="catalog-mode-badge catalog-mode-badge--structured">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>table_chart</span>
                          Structured Analyte
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => handleRemoveTest(testIdx, e)}
                        className="md3-icon-btn is-error"
                        style={{ width: '34px', height: '34px' }}
                        title="Delete Test Profile"
                        type="button"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="catalog-test-body">
                      {/* Test Level Metadata: Name, Code, Sample Type */}
                      <div className="catalog-meta-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: 'var(--md-sys-color-on-surface-variant)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Test Profile Name *</span>
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '14px', color: 'var(--md-sys-color-outline)', cursor: 'help' }}
                              title="Clinical or assay panel name displayed on worksheets and diagnostic order sheets"
                            >
                              info
                            </span>
                          </label>
                          <input
                            type="text"
                            value={test.name}
                            onChange={(e) => handleTestFieldChange(testIdx, 'name', e.target.value)}
                            style={{
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                              color: 'var(--md-sys-color-on-surface)',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: 'var(--md-sys-color-on-surface-variant)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Test Code</span>
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '14px', color: 'var(--md-sys-color-outline)', cursor: 'help' }}
                              title="Unique diagnostic code (e.g. CBC-001, LFT-002, CHEST-XRAY). If left empty, a short code is derived automatically."
                            >
                              info
                            </span>
                          </label>
                          <input
                            type="text"
                            value={test.testCode}
                            onChange={(e) => handleTestFieldChange(testIdx, 'testCode', e.target.value)}
                            style={{
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                              color: 'var(--md-sys-color-on-surface)',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              fontWeight: '600',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: 'var(--md-sys-color-on-surface-variant)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Specimen / Sample Type *</span>
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '14px', color: 'var(--md-sys-color-outline)', cursor: 'help' }}
                              title="Specimen tube or procedure trace required (e.g. Blood K2-EDTA Purple Top, Radiological Procedure, Sterile Swab)"
                            >
                              info
                            </span>
                          </label>
                          <input
                            type="text"
                            value={test.sampleType}
                            onChange={(e) => handleTestFieldChange(testIdx, 'sampleType', e.target.value)}
                            style={{
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                              color: 'var(--md-sys-color-on-surface)',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* 2. Reporting & Data Entry Mode Selector */}
                      <div className="catalog-mode-selection-container">
                        <div className="catalog-mode-selection-header">
                          <span className="catalog-mode-selection-title">
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>tune</span>
                            Reporting & Data Management Architecture
                          </span>
                          {!isDocOnly && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--md-sys-color-on-surface-variant)' }}>
                                Hospital Template Layout:
                              </label>
                              <select
                                value={test.templateLayout || 'STANDARD_NUMERICAL'}
                                onChange={(e) => handleTestFieldChange(testIdx, 'templateLayout', e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                  background: 'var(--md-sys-color-surface-container-lowest, #fff)',
                                  color: 'var(--md-sys-color-on-surface)',
                                  outline: 'none',
                                }}
                              >
                                <option value="STANDARD_NUMERICAL">Standard Numerical Assay</option>
                                <option value="DETAILED_HEMATOLOGY">Detailed Hematology (CBC/Diff)</option>
                                <option value="ORGAN_PANEL">Organ Panel (LFT, KFT, Lipid)</option>
                                <option value="MICROBIOLOGY_CULTURE">Microbiology & Culture</option>
                                <option value="RADIOLOGY_SCAN_REPORT">Radiology Findings Template</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="catalog-mode-grid">
                          {/* Option 1: Structured Data Entry */}
                          <div
                            className={`catalog-mode-card ${(!isDocOnly && !isHybrid) ? 'catalog-mode-card--active' : ''}`}
                            onClick={() => handleTestFieldChange(testIdx, 'reportType', 'STRUCTURED_DATA')}
                          >
                            <div className="catalog-mode-card__top">
                              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>table_chart</span>
                              <span>Structured Analyte Entry</span>
                            </div>
                            <p className="catalog-mode-card__desc">
                              Pathologist enters quantitative parameters with delta checks. Compiles into standardized branded Hospital Report template.
                            </p>
                          </div>

                          {/* Option 2: Scan / Document Upload Only */}
                          <div
                            className={`catalog-mode-card ${isDocOnly ? 'catalog-mode-card--active' : ''}`}
                            onClick={() => handleTestFieldChange(testIdx, 'reportType', 'DOCUMENT_UPLOAD')}
                          >
                            <div className="catalog-mode-card__top">
                              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>upload_file</span>
                              <span>Scan / Document Upload Only</span>
                            </div>
                            <p className="catalog-mode-card__desc">
                              For Scans, Radiology, X-Rays, Ultrasound, & external PDFs. Pathologist uploads documents as-is; no parameter entry required.
                            </p>
                          </div>

                          {/* Option 3: Hybrid */}
                          <div
                            className={`catalog-mode-card ${isHybrid ? 'catalog-mode-card--active' : ''}`}
                            onClick={() => handleTestFieldChange(testIdx, 'reportType', 'HYBRID')}
                          >
                            <div className="catalog-mode-card__top">
                              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>sync_alt</span>
                              <span>Hybrid (Data + Uploads)</span>
                            </div>
                            <p className="catalog-mode-card__desc">
                              Enables both structured parameter fields and document/scan file uploads on the same diagnostic worksheet.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Render either Upload-Only Info Banner or Schema Table */}
                      {isDocOnly ? (
                        <div className="catalog-upload-mode-banner">
                          <span className="material-symbols-rounded catalog-upload-mode-banner__icon">
                            document_scanner
                          </span>
                          <div>
                            <h4 className="catalog-upload-mode-banner__title">
                              Document & Scan Upload Mode Active
                            </h4>
                            <p className="catalog-upload-mode-banner__desc">
                              For this test, pathologists and lab doctors will directly upload scan images (X-Rays, Ultrasound, CT, MRI) or diagnostic PDF documents in the Pathology Cockpit. Attending doctors will view the scans with the high-resolution MD3 Scan Viewer or download the attached PDF. Parameter field entry is bypassed.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Result Fields Schema Table Wrapper */
                        <div className="catalog-params-card">
                          <div className="catalog-params-card__header">
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: 'var(--md-sys-color-primary, #00668b)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>schema</span>
                              Parameters & Result Fields Schema
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                              {test.resultFields.length} parameter{test.resultFields.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="catalog-params-table-wrapper">
                            <table className="catalog-params-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '20%' }}>Parameter Label *</th>
                                  <th style={{ width: '15%' }}>Type</th>
                                  <th style={{ width: '12%' }}>Unit</th>
                                  <th style={{ width: '37%' }} title="Target normal reference interval. Can be configured as Universal or Gender-Specific (Male/Female).">
                                    Normal Reference Interval
                                  </th>
                                  <th style={{ width: '8%', textAlign: 'center' }} title="Whether entering this parameter is required before report submission">
                                    Req
                                  </th>
                                  <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {test.resultFields.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>
                                      No parameters configured yet. Click "Add Parameter Field" below to build this test's assay schema.
                                    </td>
                                  </tr>
                                ) : (
                                  test.resultFields.map((field, fieldIdx) => {
                                    const isNumeric = field.type === 'Number';
                                    const isGen = Boolean(field.isGenderSpecific);

                                    return (
                                      <tr key={fieldIdx}>
                                        {/* Parameter Label */}
                                        <td>
                                          <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'label', e.target.value)}
                                            style={{
                                              width: '100%',
                                              padding: '7px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                              color: 'var(--md-sys-color-on-surface)',
                                              boxSizing: 'border-box',
                                              fontSize: '13px',
                                              outline: 'none',
                                            }}
                                          />
                                        </td>

                                        {/* Type Selector */}
                                        <td>
                                          <Md3Select
                                            value={field.type}
                                            onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'type', e.target.value)}
                                            options={[
                                              { value: 'Number', label: 'Number' },
                                              { value: 'Text', label: 'Text' },
                                              { value: 'Boolean', label: 'Boolean' },
                                              { value: 'Yes/No', label: 'Yes/No' },
                                              { value: 'File', label: 'File Upload' },
                                            ]}
                                          />
                                        </td>

                                        {/* Unit */}
                                        <td>
                                          <input
                                            type="text"
                                            value={field.unit}
                                            onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'unit', e.target.value)}
                                            style={{
                                              width: '100%',
                                              padding: '7px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                              color: 'var(--md-sys-color-on-surface)',
                                              boxSizing: 'border-box',
                                              fontSize: '13px',
                                              outline: 'none',
                                            }}
                                          />
                                        </td>

                                        {/* Normal Reference Range: Universal vs Gender-Specific (M/F) */}
                                        <td>
                                          {isNumeric ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                              {/* Mode Switcher Toggle: Universal vs By Gender */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button
                                                  type="button"
                                                  onClick={() => handleResultFieldChange(testIdx, fieldIdx, 'isGenderSpecific', false)}
                                                  style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    background: !isGen ? 'var(--md-sys-color-primary, #00668b)' : 'var(--md-sys-color-surface-container-high, #e0e0e0)',
                                                    color: !isGen ? '#ffffff' : 'var(--md-sys-color-on-surface-variant)',
                                                    transition: 'all 0.15s ease',
                                                  }}
                                                >
                                                  Universal
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleResultFieldChange(testIdx, fieldIdx, 'isGenderSpecific', true)}
                                                  style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    background: isGen ? 'var(--md-sys-color-secondary, #625b71)' : 'var(--md-sys-color-surface-container-high, #e0e0e0)',
                                                    color: isGen ? '#ffffff' : 'var(--md-sys-color-on-surface-variant)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    transition: 'all 0.15s ease',
                                                  }}
                                                >
                                                  <span>By Gender (M / F)</span>
                                                </button>
                                              </div>

                                              {!isGen ? (
                                                /* Universal Min - Max */
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                  <input
                                                    type="number"
                                                    step="any"
                                                    value={field.min ?? ''}
                                                    onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'min', e.target.value)}
                                                    title="Normal lower bound (Min)"
                                                    aria-label="Min value"
                                                    style={{
                                                      width: '100%',
                                                      padding: '6px 8px',
                                                      borderRadius: '6px',
                                                      border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                                      background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                                      color: 'var(--md-sys-color-on-surface)',
                                                      boxSizing: 'border-box',
                                                      fontSize: '12px',
                                                      outline: 'none',
                                                    }}
                                                  />
                                                  <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '600' }}>
                                                    –
                                                  </span>
                                                  <input
                                                    type="number"
                                                    step="any"
                                                    value={field.max ?? ''}
                                                    onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'max', e.target.value)}
                                                    title="Normal upper bound (Max)"
                                                    aria-label="Max value"
                                                    style={{
                                                      width: '100%',
                                                      padding: '6px 8px',
                                                      borderRadius: '6px',
                                                      border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                                      background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                                      color: 'var(--md-sys-color-on-surface)',
                                                      boxSizing: 'border-box',
                                                      fontSize: '12px',
                                                      outline: 'none',
                                                    }}
                                                  />
                                                </div>
                                              ) : (
                                                /* Gender Specific Inputs: Male (M) & Female (F) */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  {/* Male Row */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        color: '#0284c7',
                                                        width: '28px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                      }}
                                                      title="Male Normal Range"
                                                    >
                                                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>male</span>
                                                      <span>M</span>
                                                    </span>
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={field.maleMin ?? ''}
                                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'maleMin', e.target.value)}
                                                      title="Male lower bound (Min)"
                                                      aria-label="Male Min"
                                                      style={{
                                                        width: '100%',
                                                        padding: '5px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #bae6fd',
                                                        background: '#f0f9ff',
                                                        color: 'var(--md-sys-color-on-surface)',
                                                        boxSizing: 'border-box',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                      }}
                                                    />
                                                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>–</span>
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={field.maleMax ?? ''}
                                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'maleMax', e.target.value)}
                                                      title="Male upper bound (Max)"
                                                      aria-label="Male Max"
                                                      style={{
                                                        width: '100%',
                                                        padding: '5px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #bae6fd',
                                                        background: '#f0f9ff',
                                                        color: 'var(--md-sys-color-on-surface)',
                                                        boxSizing: 'border-box',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                      }}
                                                    />
                                                  </div>

                                                  {/* Female Row */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        color: '#db2777',
                                                        width: '28px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                      }}
                                                      title="Female Normal Range"
                                                    >
                                                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>female</span>
                                                      <span>F</span>
                                                    </span>
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={field.femaleMin ?? ''}
                                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'femaleMin', e.target.value)}
                                                      title="Female lower bound (Min)"
                                                      aria-label="Female Min"
                                                      style={{
                                                        width: '100%',
                                                        padding: '5px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #fbcfe8',
                                                        background: '#fdf2f8',
                                                        color: 'var(--md-sys-color-on-surface)',
                                                        boxSizing: 'border-box',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                      }}
                                                    />
                                                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>–</span>
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={field.femaleMax ?? ''}
                                                      onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'femaleMax', e.target.value)}
                                                      title="Female upper bound (Max)"
                                                      aria-label="Female Max"
                                                      style={{
                                                        width: '100%',
                                                        padding: '5px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #fbcfe8',
                                                        background: '#fdf2f8',
                                                        color: 'var(--md-sys-color-on-surface)',
                                                        boxSizing: 'border-box',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {/* Live Reference String Preview */}
                                              {field.reference && (
                                                <span style={{ fontSize: '10px', color: 'var(--md-sys-color-outline)', fontStyle: 'italic' }}>
                                                  {field.reference}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <input
                                              type="text"
                                              value={field.reference || ''}
                                              onChange={(e) => handleResultFieldChange(testIdx, fieldIdx, 'reference', e.target.value)}
                                              title="Qualitative normal reference criteria"
                                              style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                                                background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                                                color: 'var(--md-sys-color-on-surface)',
                                                boxSizing: 'border-box',
                                                fontSize: '13px',
                                                outline: 'none',
                                              }}
                                            />
                                          )}
                                        </td>

                                        {/* Required Checkbox */}
                                        <td style={{ textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', paddingTop: '4px' }}>
                                            <Md3Checkbox
                                              checked={field.required}
                                              onChange={(val) => handleResultFieldChange(testIdx, fieldIdx, 'required', val)}
                                            />
                                          </div>
                                        </td>

                                        {/* Action (Delete Field) */}
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            onClick={() => handleRemoveResultField(testIdx, fieldIdx)}
                                            className="md3-icon-btn is-error"
                                            style={{ width: '32px', height: '32px' }}
                                            title="Remove this parameter"
                                            type="button"
                                          >
                                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
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
                                color: 'var(--md-sys-color-primary, #00668b)',
                                fontSize: '13px',
                                fontWeight: '600',
                              }}
                              type="button"
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                              Add Parameter Field
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Centered Add Another Test Trigger Button matching CreateDepartmentSheet */}
          <div className="catalog-add-trigger-row">
            <button
              onClick={handleAddTest}
              className="catalog-add-another-btn"
              type="button"
            >
              <span className="material-symbols-rounded">add_circle</span>
              <span>Add Another Test Profile</span>
            </button>
          </div>
        </div>

        {/* 3. Sheet Footer */}
        <div className="catalog-sheet-footer">
          <span style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '600' }}>
            Total: {tempTestCatalog.length} test profile{tempTestCatalog.length !== 1 ? 's' : ''} configured
          </span>
          <div className="catalog-sheet-footer__actions">
            <Md3Button
              variant="outlined"
              onClick={handleRequestClose}
              disabled={saving}
            >
              Cancel
            </Md3Button>
            <Md3Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              loadingText="Saving..."
              icon={<span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>}
            >
              Save Catalog
            </Md3Button>
          </div>
        </div>
      </div>

      {/* Discard Unsaved Changes Dialog */}
      <Md3UnsavedChangesDialog
        isOpen={showDiscardConfirm}
        onStay={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Catalog Changes?"
        message="You have unsaved changes in the diagnostic test catalog. Closing now will discard all modifications."
      />
    </div>,
    document.body
  );
};

export default Md3TestCatalogConfigurator;
