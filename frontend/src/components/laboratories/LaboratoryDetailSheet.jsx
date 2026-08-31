import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './LaboratoryDetailSheet.css';

const CURRENCY_SYMBOL = '₹';

export const LaboratoryDetailSheet = ({
  lab,
  isOpen,
  onClose,
  onEdit,
  onEditCatalog,
  onToggleStatus,
}) => {
  const [testSearch, setTestSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !lab) return null;

  const isActive = lab.isActive !== false;
  const deptName = lab.departmentId?.name || 'Diagnostic Department';
  const deptCode = lab.departmentId?.code || 'LAB';
  const deptType = lab.departmentId?.type || 'DIAGNOSTIC';
  const testCatalog = lab.testCatalog || [];

  const filteredTests = testCatalog.filter((t) => {
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase();
    return (
      (t.testName || '').toLowerCase().includes(q) ||
      (t.testCode || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.sampleType || '').toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div className="md3-lab-detail-overlay" onClick={onClose}>
      <div
        className="md3-lab-detail-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${lab.name}`}
      >
        {/* ── HEADER ── */}
        <div className="md3-lab-detail-header">
          <div className="md3-lab-detail-header-info">
            <span className="md3-lab-detail-dept-badge">
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>corporate_fare</span>
              {deptName}
            </span>
            <h2 className="md3-lab-detail-title">{lab.name}</h2>
            <div className="md3-lab-detail-header-badges">
              <code className="md3-lab-detail-code-badge">{deptCode}</code>
              <span className="md3-lab-detail-type-badge">{deptType}</span>
              <span className={`md3-lab-detail-status-pill ${isActive ? 'active' : 'inactive'}`}>
                {isActive ? 'Active Laboratory' : 'Inactive Laboratory'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="md3-lab-detail-close-btn"
            onClick={onClose}
            title="Close Inspector"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="md3-lab-detail-body">
          {/* Section 1: Overview */}
          <section className="md3-lab-detail-section">
            <h4 className="md3-lab-detail-section-title">
              <span className="material-symbols-rounded">info</span>
              Facility Description
            </h4>
            <div className="md3-lab-detail-card">
              <p className="md3-lab-detail-desc">
                {lab.description || 'No detailed facility description provided for this laboratory.'}
              </p>
            </div>
          </section>

          {/* Section 2: Test Catalog Explorer */}
          <section className="md3-lab-detail-section">
            <div className="md3-lab-detail-section-header">
              <h4 className="md3-lab-detail-section-title">
                <span className="material-symbols-rounded">inventory_2</span>
                Configured Test Catalog ({testCatalog.length})
              </h4>
              <button
                type="button"
                className="md3-lab-detail-action-link"
                onClick={() => onEditCatalog?.(lab)}
              >
                <span className="material-symbols-rounded">tune</span>
                Manage Catalog
              </button>
            </div>

            {testCatalog.length > 0 && (
              <div className="md3-lab-test-search-wrap">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Search catalog tests by name, code, specimen..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="md3-lab-test-search-input"
                />
                {testSearch && (
                  <button
                    type="button"
                    onClick={() => setTestSearch('')}
                    className="md3-lab-test-search-clear"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                )}
              </div>
            )}

            <div className="md3-lab-detail-card md3-lab-catalog-card">
              {testCatalog.length === 0 ? (
                <div className="md3-lab-empty-hint">
                  <span className="material-symbols-rounded">science</span>
                  <span>No tests configured in this catalog. Click Manage Catalog to add diagnostic tests.</span>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="md3-lab-empty-hint">
                  <span className="material-symbols-rounded">search_off</span>
                  <span>No tests found matching "{testSearch}".</span>
                </div>
              ) : (
                <div className="md3-lab-catalog-table-wrap">
                  <table className="md3-lab-catalog-table">
                    <thead>
                      <tr>
                        <th>Test &amp; Code</th>
                        <th>Sample / Specimen</th>
                        <th>Reference Range</th>
                        <th className="text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test, idx) => (
                        <tr key={test.testCode || test._id || idx}>
                          <td>
                            <div className="test-cell-name">
                              <strong>{test.testName || 'Unnamed Test'}</strong>
                              <code>{test.testCode || '—'}</code>
                            </div>
                          </td>
                          <td>
                            <span className="test-sample-badge">
                              {test.sampleType || test.specimen || 'Specimen'}
                            </span>
                          </td>
                          <td>
                            <div className="test-range-cell">
                              <span>{test.referenceRange || test.normalRange || 'Standard'}</span>
                              {test.unit && <small>({test.unit})</small>}
                            </div>
                          </td>
                          <td className="text-right">
                            <strong className="test-price-badge">
                              {CURRENCY_SYMBOL}{test.price ?? test.cost ?? 0}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── FOOTER ── */}
        <div className="md3-lab-detail-footer">
          <button
            type="button"
            className="md3-lab-footer-btn md3-lab-footer-btn--primary"
            onClick={() => onEdit?.(lab)}
          >
            <span className="material-symbols-rounded">edit</span>
            Edit Details
          </button>
          <button
            type="button"
            className="md3-lab-footer-btn md3-lab-footer-btn--outlined"
            onClick={() => onEditCatalog?.(lab)}
          >
            <span className="material-symbols-rounded">tune</span>
            Test Catalog
          </button>
          <button
            type="button"
            className={`md3-lab-footer-btn ${isActive ? 'md3-lab-footer-btn--error' : 'md3-lab-footer-btn--success'}`}
            onClick={() => onToggleStatus?.(lab._id, lab.name, lab.isActive)}
          >
            <span className="material-symbols-rounded">
              {isActive ? 'block' : 'check_circle'}
            </span>
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            className="md3-lab-footer-btn md3-lab-footer-btn--outlined"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LaboratoryDetailSheet;
