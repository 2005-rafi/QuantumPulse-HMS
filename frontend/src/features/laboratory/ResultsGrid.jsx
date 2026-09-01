import React, { useState, useMemo } from 'react';
import {
  Icon,
  Md3Section,
  Md3DataTable,
  Md3EmptyState,
  Md3Chip,
  Md3Avatar,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import Md3ScanViewerDialog from '../../components/md3/Md3ScanViewerDialog';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import './ResultsGrid.css';

const priorityVariant = (p) => ({
  STAT: 'error', URGENT: 'warning', ROUTINE: 'secondary',
})[p] || 'default';

/**
 * Strict clinical abnormal checker — avoids false positives on words like "Normal"
 */
const checkAbnormal = (val, flag) => {
  if (flag === 'ABNORMAL' || flag === 'CRITICAL' || flag === 'HIGH' || flag === 'LOW') return true;
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim().toLowerCase();
  if (
    trimmed === 'normal' ||
    trimmed.startsWith('normal') ||
    trimmed.includes('verified') ||
    trimmed.includes('negative') ||
    trimmed === 'compatible'
  ) {
    return false;
  }
  return ['abnormal', 'critical', 'high', 'low', 'positive', 'reactive', 'incompatible'].includes(trimmed);
};

const formatTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(+date)) return '—';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calcTAT = (collectedAt, completedAt) => {
  if (!collectedAt || !completedAt) return '';
  const diffMs = new Date(completedAt) - new Date(collectedAt);
  const diffMins = Math.max(1, Math.round(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
};

const ResultsGrid = ({
  completedOrders = [],
  laboratories = [],
  patient = null,
  visit = null,
  onViewReport,
  className = '',
}) => {
  const { showSuccess, showError } = useToast();

  // Search & Filter state for global reported log
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Document Viewer state
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    scanReportId: null,
    testName: '',
    patientName: '',
    mrn: '',
    labName: '',
  });

  // Resolve patient info fallback
  const resolvedPatientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ')
    || patient?.fullName
    || patient?.name
    || (visit?.patientId && typeof visit.patientId === 'object' ? [visit.patientId.firstName, visit.patientId.lastName].filter(Boolean).join(' ') : '')
    || '';

  const resolvedMRN = patient?.mrn || (visit?.patientId && typeof visit.patientId === 'object' ? visit.patientId.mrn : '') || '';

  // ── Flatten orders into structured diagnostic rows ──
  const allRows = useMemo(() => {
    const flat = [];

    completedOrders.forEach((order) => {
      const scanReportId = order.results?.scanReportId || order.scanReportId || null;
      const lab = laboratories?.find((l) =>
        (l?._id && order.laboratoryId && String(l._id) === String(order.laboratoryId?._id || order.laboratoryId)) ||
        (l?.name && order.labName && l.name.toLowerCase().trim() === order.labName.toLowerCase().trim())
      ) || laboratories?.find((l) => (l?.testCatalog || []).some((t) => t.name?.toLowerCase().trim() === (order.testName || '').toLowerCase().trim()))
        || laboratories?.[0] || null;

      const testDef = lab?.testCatalog?.find((test) =>
        test.name?.toLowerCase().trim() === (order.testName || '').toLowerCase().trim() ||
        (test.testCode && order.testCode && test.testCode.toLowerCase().trim() === order.testCode.toLowerCase().trim()) ||
        (test.code && order.testCode && test.code.toLowerCase().trim() === order.testCode.toLowerCase().trim())
      );

      const catalogFields = testDef?.resultFields || testDef?.fields || [];
      const testDisplayName = order.testName || order.panelName || testDef?.name || order.labName || lab?.name || 'Laboratory Test';

      const pName = order._patientName && order._patientName !== 'Unknown patient'
        ? order._patientName
        : (resolvedPatientName || 'Patient');

      const pMrn = order._mrn && order._mrn !== '—'
        ? order._mrn
        : (resolvedMRN || '—');

      const pAge = order._age || (patient?.age ? `${patient.age} yrs` : '');
      const pGender = order._gender || patient?.gender || '';
      const pBlood = order._bloodGroup || patient?.bloodGroup || '';

      const doctorName = order._orderedBy
        ? (order._orderedBy.startsWith('Dr.') ? order._orderedBy : `Dr. ${order._orderedBy}`)
        : (visit?.consultation?.doctorId ? `Dr. ${visit.consultation.doctorId.firstName || ''} ${visit.consultation.doctorId.lastName || ''}`.trim() : 'Attending Physician');

      const doctorDept = order._departmentName || visit?.departmentId?.name || '';
      const doctorSpecialty = order._doctorSpecialty || '';
      const clinicalReason = order._chiefComplaint || order._diagnosis || visit?.reasonForVisit || '';

      const resultsObj = order.results && typeof order.results === 'object' ? order.results : {};
      const entries = Object.entries(resultsObj).filter(
        ([k]) => k !== '_notes' && k !== 'scanReportId' && !k.startsWith('attachment')
      );

      const completedTime = order.processedAt || order.completedAt || order.updatedAt || order._visitCreatedAt;
      const sampleType = order.sampleType || testDef?.sampleType || 'Whole Blood';

      if (entries.length === 0) {
        flat.push({
          _id: `${order._id || Math.random()}-summary`,
          orderId: order._id || order.id,
          laboratory: order._laboratoryName || order.labName || lab?.name || 'Central Clinical Laboratory',
          testName: testDisplayName,
          parameter: 'Clinical Findings',
          value: scanReportId ? 'Uploaded Document' : (order.notes || 'Verified / Reported'),
          reference: testDef?.referenceRange || '—',
          unit: '',
          isAbnormal: false,
          priority: (order.priority || 'ROUTINE').toUpperCase(),
          completedAt: completedTime,
          patientName: pName,
          tokenString: order._tokenString || visit?.tokenString || '',
          mrn: pMrn,
          age: pAge,
          gender: pGender,
          bloodGroup: pBlood,
          orderedBy: doctorName,
          doctorDept,
          doctorSpecialty,
          clinicalReason,
          sampleType,
          sampleCollectedAt: order.sampleCollectedAt,
          processedAt: order.processedAt,
          notes: order.notes || '',
          scanReportId,
        });
        return;
      }

      entries.forEach(([key, val], i) => {
        const fieldMeta = catalogFields.find((f) => (f.key || f.label || f.name) === key);
        const label = fieldMeta?.label || (key === 'test_key' ? 'Clinical Findings' : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
        const ref = fieldMeta?.reference || '—';
        const unit = fieldMeta?.unit || '';
        const isAbnormal = checkAbnormal(String(val), order.flag);

        flat.push({
          _id: `${order._id || Math.random()}-${key}-${i}`,
          orderId: order._id || order.id,
          laboratory: order._laboratoryName || order.labName || lab?.name || 'Central Clinical Laboratory',
          testName: testDisplayName,
          parameter: label,
          value: val == null ? '—' : String(val),
          reference: ref,
          unit,
          isAbnormal,
          priority: (order.priority || 'ROUTINE').toUpperCase(),
          completedAt: completedTime,
          patientName: pName,
          tokenString: order._tokenString || visit?.tokenString || '',
          mrn: pMrn,
          age: pAge,
          gender: pGender,
          bloodGroup: pBlood,
          orderedBy: doctorName,
          doctorDept,
          doctorSpecialty,
          clinicalReason,
          sampleType,
          sampleCollectedAt: order.sampleCollectedAt,
          processedAt: order.processedAt,
          notes: order.notes || '',
          scanReportId,
        });
      });
    });

    return flat;
  }, [completedOrders, laboratories, resolvedPatientName, resolvedMRN, visit, patient]);

  // ── Filtered Rows for Global Table Mode ──
  const rows = useMemo(() => {
    return allRows.filter((r) => {
      // Priority filter
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesPatient = (r.patientName || '').toLowerCase().includes(term);
        const matchesMrn = (r.mrn || '').toLowerCase().includes(term);
        const matchesTest = (r.testName || '').toLowerCase().includes(term);
        const matchesDoctor = (r.orderedBy || '').toLowerCase().includes(term);
        const matchesParam = (r.parameter || '').toLowerCase().includes(term);
        const matchesReason = (r.clinicalReason || '').toLowerCase().includes(term);
        if (!matchesPatient && !matchesMrn && !matchesTest && !matchesDoctor && !matchesParam && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [allRows, priorityFilter, searchTerm]);

  // ── Metrics for Header Summary Strip ──
  const metrics = useMemo(() => {
    const total = allRows.length;
    const statCount = allRows.filter((r) => r.priority === 'STAT').length;
    const abnormalCount = allRows.filter((r) => r.isAbnormal).length;
    const uniqueDoctors = new Set(allRows.map((r) => r.orderedBy).filter((d) => d && d !== 'Attending Physician')).size;

    return { total, statCount, abnormalCount, uniqueDoctors };
  }, [allRows]);

  const isWorksheetEmbedded = Boolean(visit || patient);

  const handleOpenScanViewer = (row) => {
    if (!row.scanReportId) {
      showSuccess('Diagnostic Report Verified', `Test results for "${row.testName}" are finalized and routed to ${row.orderedBy}.`);
      return;
    }
    setViewerState({
      isOpen: true,
      scanReportId: row.scanReportId,
      testName: row.testName,
      patientName: row.patientName,
      mrn: row.mrn,
      labName: row.laboratory,
    });
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const headers = ['Priority', 'Patient Name', 'MRN', 'Ordering Doctor', 'Department', 'Clinical Indication', 'Test Name', 'Parameter', 'Measured Value', 'Reference Range', 'Reported Time'];
    const csvRows = [
      headers.join(','),
      ...rows.map((r) => [
        `"${r.priority}"`,
        `"${r.patientName}"`,
        `"${r.mrn}"`,
        `"${r.orderedBy}"`,
        `"${r.doctorDept || ''}"`,
        `"${(r.clinicalReason || '').replace(/"/g, '""')}"`,
        `"${r.testName}"`,
        `"${r.parameter || ''}"`,
        `"${r.value} ${r.unit || ''}".trim()`,
        `"${r.reference || ''}"`,
        `"${formatTime(r.completedAt)}"`,
      ].join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reported_Lab_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showSuccess('Export Complete', 'Laboratory reported results downloaded as CSV.');
  };

  return (
    <Md3Section
      title="Reported Results &amp; Verified Diagnostic Log"
      subtitle={rows.length > 0
        ? `${rows.length} verified parameter${rows.length === 1 ? '' : 's'} across ${completedOrders.length} test order${completedOrders.length === 1 ? '' : 's'}`
        : 'Completed and verified test results appear here'}
      icon={<Icon.FileSearch />}
      variant="compact"
      className={`results-grid ${className}`.trim()}
    >
      {/* ─── 1. Single Patient Embedded Mode ─── */}
      {isWorksheetEmbedded ? (
        rows.length === 0 ? (
          <div className="results-grid__empty-box">
            <Icon.Clipboard style={{ width: '18px', height: '18px', color: 'var(--md-sys-color-outline)' }} />
            <span>No reported results yet. Completed tests will appear here.</span>
          </div>
        ) : (
          <div className="results-grid__panels-list">
            {completedOrders.map((order) => {
              const orderRows = rows.filter((r) => r.orderId === (order._id || order.id));
              const pMeta = priorityVariant((order.priority || 'ROUTINE').toUpperCase());
              const tat = calcTAT(order.sampleCollectedAt, order.processedAt || order.updatedAt);
              const firstRow = orderRows[0] || {};

              return (
                <div key={order._id || order.id} className="results-panel-card">
                  <header className="results-panel-card__header">
                    <div className="results-panel-card__title-group">
                      <Icon.Beaker style={{ width: '16px', height: '16px', color: 'var(--md-sys-color-primary)' }} />
                      <h4 className="results-panel-card__title">{order.testName || 'Diagnostic Panel'}</h4>
                      <Md3Chip variant={pMeta} size="small">
                        {(order.priority || 'ROUTINE').toUpperCase()}
                      </Md3Chip>
                      {firstRow.orderedBy && (
                        <span className="results-panel-card__doctor-badge">
                          <Icon.Person style={{ width: '13px', height: '13px' }} />
                          <span>{firstRow.orderedBy}</span>
                        </span>
                      )}
                    </div>

                    <div className="results-panel-card__badges">
                      <span className="results-panel-card__time" title="Reported Timestamp">
                        <Icon.Clock />
                        <span>{formatTime(order.processedAt || order.updatedAt)}</span>
                      </span>
                      {tat && (
                        <span className="results-panel-card__time" style={{ color: 'var(--md-sys-color-secondary)' }}>
                          <span>• TAT: {tat}</span>
                        </span>
                      )}
                    </div>
                  </header>

                  <div className="results-panel-card__grid">
                    {orderRows.map((r) => (
                      <div key={r._id} className="result-parameter-item">
                        <span className="result-parameter-item__label">{r.parameter || r.testName}</span>
                        <div className="result-parameter-item__val-box">
                          <span className={`result-parameter-item__val ${r.isAbnormal ? 'result-parameter-item__val--abnormal' : ''}`}>
                            {r.value}
                            {r.unit && <span style={{ fontSize: '0.70rem', fontWeight: 400 }}> {r.unit}</span>}
                          </span>
                          {r.reference && r.reference !== '—' && (
                            <span className="result-parameter-item__ref">({r.reference})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="results-panel-card__notes">
                      <span className="material-symbols-rounded results-panel-card__notes-icon">notes</span>
                      <span><strong>Technician Note:</strong> {order.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ─── 2. Global Hospital-Wide Clinical Laboratory Information Dashboard ─── */
        <div className="results-grid__global-container">
          {/* Top Clinical Stats Strip */}
          <div className="results-grid__summary-strip">
            <div className="results-grid__stat-card">
              <div className="results-grid__stat-icon results-grid__stat-icon--primary">
                <Icon.CheckCircle size={20} />
              </div>
              <div className="results-grid__stat-content">
                <span className="results-grid__stat-value">{metrics.total}</span>
                <span className="results-grid__stat-label">Verified Results</span>
              </div>
            </div>

            <div className="results-grid__stat-card">
              <div className="results-grid__stat-icon results-grid__stat-icon--error">
                <Icon.Flag size={20} />
              </div>
              <div className="results-grid__stat-content">
                <span className="results-grid__stat-value">{metrics.statCount}</span>
                <span className="results-grid__stat-label">STAT Orders</span>
              </div>
            </div>

            <div className="results-grid__stat-card">
              <div className="results-grid__stat-icon results-grid__stat-icon--warning">
                <Icon.Alert size={20} />
              </div>
              <div className="results-grid__stat-content">
                <span className="results-grid__stat-value">{metrics.abnormalCount}</span>
                <span className="results-grid__stat-label">Abnormal Flags</span>
              </div>
            </div>

            <div className="results-grid__stat-card">
              <div className="results-grid__stat-icon results-grid__stat-icon--tertiary">
                <Icon.Users size={20} />
              </div>
              <div className="results-grid__stat-content">
                <span className="results-grid__stat-value">{metrics.uniqueDoctors || '—'}</span>
                <span className="results-grid__stat-label">Ordering Clinicians</span>
              </div>
            </div>
          </div>

          {/* Interactive Search & Filter Toolbar */}
          <div className="results-grid__toolbar">
            <div className="results-grid__search-box">
              <Icon.Search className="results-grid__search-icon" />
              <input
                type="text"
                placeholder="Search patient, MRN, test, ordering physician, or clinical indication..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="results-grid__search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="results-grid__search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <Icon.Clear size={14} />
                </button>
              )}
            </div>

            <div className="results-grid__filter-group">
              <span className="results-grid__filter-label">Priority:</span>
              {['ALL', 'STAT', 'URGENT', 'ROUTINE'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`results-grid__filter-pill ${priorityFilter === p ? 'active' : ''} ${p.toLowerCase()}`}
                  onClick={() => setPriorityFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="results-grid__actions-group">
              <Md3Button variant="tonal" size="small" onClick={handleExportCSV} disabled={rows.length === 0}>
                <Icon.Download />
                <span>Export CSV</span>
              </Md3Button>
            </div>
          </div>

          {/* Master Clinical Table */}
          {rows.length === 0 ? (
            <div className="results-grid__empty-box">
              <Icon.FileSearch style={{ width: '28px', height: '28px', color: 'var(--md-sys-color-outline)' }} />
              <h4>No Reported Records Found</h4>
              <p>No verified results match your search or priority filter criteria.</p>
            </div>
          ) : (
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Priority</th>
                    <th style={{ width: '200px' }}>Patient &amp; Encounter</th>
                    <th style={{ width: '220px' }}>Ordering Physician &amp; Indication</th>
                    <th>Diagnostic Test &amp; Laboratory</th>
                    <th style={{ width: '160px' }}>Measured Result</th>
                    <th style={{ width: '130px' }}>Reference Range</th>
                    <th style={{ width: '140px' }}>Reported &amp; TAT</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const tat = calcTAT(row.sampleCollectedAt, row.completedAt || row.processedAt);
                    return (
                      <tr key={row._id} className={`results-table__row ${row.isAbnormal ? 'results-table__row--abnormal' : ''}`}>
                        <td>
                          <Md3Chip variant={priorityVariant(row.priority)} size="small">
                            {row.priority}
                          </Md3Chip>
                        </td>

                        {/* Patient & Demographics */}
                        <td>
                          <div className="results-table__patient-cell">
                            <Md3Avatar
                              initials={row.patientName?.slice(0, 2).toUpperCase() || 'PT'}
                              size="small"
                              variant="primary"
                            />
                            <div className="results-table__patient-info">
                              <span className="results-table__patient-name">{row.patientName}</span>
                              <div className="results-table__patient-meta-row">
                                {row.tokenString && (
                                  <span className="results-table__token-tag">{row.tokenString}</span>
                                )}
                                <span className="results-table__mrn-tag">MRN: {row.mrn}</span>
                              </div>
                              {(row.age || row.gender || row.bloodGroup) && (
                                <span className="results-table__demo-text">
                                  {[row.age, row.gender].filter(Boolean).join(' • ')}
                                  {row.bloodGroup && ` • ${row.bloodGroup}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Ordering Physician & Clinical Indication */}
                        <td>
                          <div className="results-table__doctor-cell">
                            <div className="results-table__doctor-header">
                              <Icon.Person className="results-table__doctor-icon" />
                              <span className="results-table__doctor-name">{row.orderedBy}</span>
                            </div>
                            {row.doctorDept && (
                              <span className="results-table__doctor-dept">
                                {row.doctorDept}
                                {row.doctorSpecialty ? ` (${row.doctorSpecialty})` : ''}
                              </span>
                            )}
                            {row.clinicalReason && (
                              <div className="results-table__doctor-reason" title={row.clinicalReason}>
                                <Icon.Clipboard style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                <span>{row.clinicalReason}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Test & Laboratory */}
                        <td>
                          <div className="results-table__test-cell">
                            <span className="results-table__test-name">{row.testName}</span>
                            <div className="results-table__test-sub-row">
                              {row.parameter && (
                                <span className="results-table__parameter-pill">{row.parameter}</span>
                              )}
                              <span className="results-table__specimen-tag">{row.sampleType}</span>
                            </div>
                            <span className="results-table__lab-name">{row.laboratory}</span>
                          </div>
                        </td>

                        {/* Measured Value */}
                        <td>
                          <div className="results-table__value-box">
                            <span className={`results-table__val-text ${row.isAbnormal ? 'results-table__val-text--abnormal' : ''}`}>
                              {row.isAbnormal && <Icon.Alert style={{ width: '14px', height: '14px', flexShrink: 0 }} />}
                              <span>{row.value}</span>
                              {row.unit && <span className="results-table__unit"> {row.unit}</span>}
                            </span>
                            {row.isAbnormal && (
                              <span className="results-table__abnormal-badge">Abnormal Flag</span>
                            )}
                          </div>
                        </td>

                        {/* Reference Range */}
                        <td>
                          <span className="results-table__ref-range">{row.reference || '—'}</span>
                        </td>

                        {/* Reported Time & TAT */}
                        <td>
                          <div className="results-table__time-cell">
                            <span className="results-table__time-text">
                              <Icon.Clock style={{ width: '13px', height: '13px' }} />
                              <span>{formatTime(row.completedAt)}</span>
                            </span>
                            {tat && (
                              <span className="results-table__tat-badge">TAT: {tat}</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="results-table__action-btn"
                            onClick={() => handleOpenScanViewer(row)}
                            title="Preview Verified Diagnostic Document"
                          >
                            <Icon.Eye style={{ width: '15px', height: '15px' }} />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* In-App Document &amp; Diagnostic Report Viewer Dialog */}
      <Md3ScanViewerDialog
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false, scanReportId: null }))}
        scanReportId={viewerState.scanReportId}
        testName={viewerState.testName}
        patientName={viewerState.patientName}
        mrn={viewerState.mrn}
        labName={viewerState.labName}
      />
    </Md3Section>
  );
};

export default ResultsGrid;
