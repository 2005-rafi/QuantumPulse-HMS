import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tariffAPI } from '../../services/tariffAPI';
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
  const [diagnosticTariffs, setDiagnosticTariffs] = useState([]);
  const [tariffsLoading, setTariffsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Fetch published diagnostic tariff rules for live pricing resolution
      setTariffsLoading(true);
      tariffAPI.listRules({ category: 'DIAGNOSTICS', status: 'PUBLISHED', limit: 100 })
        .then((res) => {
          const rules = res.data?.data?.items
            || res.data?.items
            || (Array.isArray(res.data?.data) ? res.data.data : null)
            || (Array.isArray(res.data) ? res.data : []);
          setDiagnosticTariffs(rules);
        })
        .catch((err) => {
          console.warn('Could not load diagnostic tariff rules for lab sheet:', err);
        })
        .finally(() => {
          setTariffsLoading(false);
        });
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !lab) return null;

  const isActive = lab.isActive !== false;
  const deptId = lab.departmentId?._id || lab.departmentId;
  const deptName = lab.departmentId?.name || 'Diagnostic Department';
  const deptCode = lab.departmentId?.code || 'LAB';
  const deptType = lab.departmentId?.type || 'DIAGNOSTIC';
  const testCatalog = lab.testCatalog || [];

  const filteredTests = testCatalog.filter((t) => {
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase();
    return (
      (t.name || t.testName || '').toLowerCase().includes(q) ||
      (t.testCode || t.code || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.sampleType || t.specimen || '').toLowerCase().includes(q)
    );
  });

  // Resolve authoritative tariff price from Centralized Tariff Management
  const getTestTariffInfo = (test) => {
    const rawCode = (test.testCode || test.code || '').trim();
    const cleanCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanName = (test.name || test.testName || '').trim().toLowerCase();

    // Helper: test if rule scope matches lab department or is global
    const matchesDeptScope = (r) => {
      const rDeptId = r.scope?.departmentId?._id || r.scope?.departmentId;
      return !rDeptId || String(rDeptId) === String(deptId);
    };

    // 1. Exact or normalized match by testCode
    if (cleanCode) {
      const matched = diagnosticTariffs.find((r) => {
        const rCode = (r.testCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return rCode === cleanCode && matchesDeptScope(r);
      }) || diagnosticTariffs.find((r) => {
        const rCode = (r.testCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return rCode === cleanCode;
      });

      if (matched && matched.amount != null) {
        return {
          amount: matched.amount,
          isConfigured: true,
          badge: 'Published Tariff',
          ruleNumber: matched.ruleNumber || 'TR-DX',
        };
      }
    }

    // 2. Direct match by test name
    if (cleanName) {
      const matchedByName = diagnosticTariffs.find((r) => {
        const rName = (r.name || '').trim().toLowerCase();
        return (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName)) && matchesDeptScope(r);
      }) || diagnosticTariffs.find((r) => {
        const rName = (r.name || '').trim().toLowerCase();
        return rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName);
      });

      if (matchedByName && matchedByName.amount != null) {
        return {
          amount: matchedByName.amount,
          isConfigured: true,
          badge: 'Published Tariff',
          ruleNumber: matchedByName.ruleNumber || 'TR-DX',
        };
      }
    }

    // 3. Category-level general diagnostic tariff rule
    const categoryRule = diagnosticTariffs.find((r) => !r.testCode && r.category === 'DIAGNOSTICS');
    if (categoryRule && categoryRule.amount != null) {
      return {
        amount: categoryRule.amount,
        isConfigured: true,
        badge: 'General Lab Tariff',
        ruleNumber: categoryRule.ruleNumber || 'TR-DX-GEN',
      };
    }

    // 4. Default institutional base tariff fallback
    return {
      amount: 250,
      isConfigured: false,
      badge: 'Default Tariff',
      ruleNumber: 'TR-FALLBACK',
    };
  };

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

          {/* Section 2: Centralized Tariff Governance Banner */}
          <div className="md3-lab-tariff-info-banner">
            <div className="md3-lab-tariff-info-icon">
              <span className="material-symbols-rounded">account_balance_wallet</span>
            </div>
            <div className="md3-lab-tariff-info-content">
              <div className="md3-lab-tariff-info-title">Centralized Hospital Tariff Governance</div>
              <div className="md3-lab-tariff-info-desc">
                Diagnostic test tariffs are centrally controlled by Hospital Administration in Tariff Management. Line items post automatically to the patient bill ledger, and payment is settled at Cashier / Bill Management desks.
              </div>
            </div>
          </div>

          {/* Section 3: Test Catalog Explorer */}
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
                        <th className="text-right">Tariff / Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test, idx) => {
                        const testTitle = test.name || test.testName || 'Unnamed Test';
                        const refDisplay = test.referenceRange
                          || test.normalRange
                          || (test.resultFields?.length
                              ? (test.resultFields.length === 1 && test.resultFields[0].reference
                                  ? test.resultFields[0].reference
                                  : `${test.resultFields.length} parameter${test.resultFields.length !== 1 ? 's' : ''}`)
                              : 'Standard');
                        const tariffInfo = getTestTariffInfo(test);

                        return (
                          <tr key={test.testCode || test._id || idx}>
                            <td>
                              <div className="test-cell-name">
                                <strong>{testTitle}</strong>
                                <code>{test.testCode || test.code || '—'}</code>
                              </div>
                            </td>
                            <td>
                              <span className="test-sample-badge">
                                {test.sampleType || test.specimen || 'Specimen'}
                              </span>
                            </td>
                            <td>
                              <div className="test-range-cell">
                                <span>{refDisplay}</span>
                                {test.unit && <small>({test.unit})</small>}
                              </div>
                            </td>
                            <td className="text-right">
                              <div className="test-price-cell">
                                <strong className="test-price-badge">
                                  {CURRENCY_SYMBOL}{tariffInfo.amount}
                                </strong>
                                <span className={`test-tariff-status-tag ${tariffInfo.isConfigured ? 'configured' : 'default'}`}>
                                  <span className="material-symbols-rounded" style={{ fontSize: '11px' }}>
                                    {tariffInfo.isConfigured ? 'verified' : 'info'}
                                  </span>
                                  {tariffInfo.badge}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
