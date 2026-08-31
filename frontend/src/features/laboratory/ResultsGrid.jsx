import React, { useState } from 'react';
import {
  Icon,
  Md3Section,
  Md3DataTable,
  Md3EmptyState,
  Md3Chip,
  Md3Avatar,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
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

const ActionsCell = ({ row, onViewReport }) => {
  const { showError } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!row.scanReportId) return;
    try {
      setDownloading(true);
      const res = await api.get(`/laboratory/scans/${row.scanReportId}?json=true`);
      if (res.data?.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const blobRes = await api.get(`/laboratory/scans/${row.scanReportId}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([blobRes.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `Lab_Report_${row.orderId || 'Scan'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Download Failed', err.response?.data?.message || err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (row.scanReportId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Md3Button variant="tonal" size="small" onClick={handleDownload} loading={downloading}>
          <Icon.Download />
          <span>View Scan</span>
        </Md3Button>
      </div>
    );
  }

  return <span style={{ color: 'var(--md-sys-color-outline, #79747e)', fontSize: '0.75rem' }}>—</span>;
};

const ResultsGrid = ({
  completedOrders = [],
  laboratories = [],
  patient = null,
  visit = null,
  onViewReport,
  className = '',
}) => {
  // Resolve patient info fallback
  const resolvedPatientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ')
    || patient?.fullName
    || patient?.name
    || (visit?.patientId && typeof visit.patientId === 'object' ? [visit.patientId.firstName, visit.patientId.lastName].filter(Boolean).join(' ') : '')
    || '';

  const resolvedMRN = patient?.mrn || (visit?.patientId && typeof visit.patientId === 'object' ? visit.patientId.mrn : '') || '';

  // ── Flatten orders into structured diagnostic rows ──
  const rows = React.useMemo(() => {
    const flat = [];

    completedOrders.forEach((order) => {
      const scanReportId = order.results?.scanReportId || null;
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

      const doctorName = order._orderedBy
        ? (order._orderedBy.startsWith('Dr.') ? order._orderedBy : `Dr. ${order._orderedBy}`)
        : (visit?.consultation?.doctorId ? `Dr. ${visit.consultation.doctorId.firstName || ''} ${visit.consultation.doctorId.lastName || ''}`.trim() : 'Attending Physician');

      const resultsObj = order.results && typeof order.results === 'object' ? order.results : {};
      const entries = Object.entries(resultsObj).filter(
        ([k]) => k !== '_notes' && k !== 'scanReportId' && !k.startsWith('attachment')
      );

      const completedTime = order.processedAt || order.completedAt || order.updatedAt || order._visitCreatedAt;

      if (entries.length === 0) {
        flat.push({
          _id: `${order._id || Math.random()}-summary`,
          orderId: order._id,
          laboratory: order._laboratoryName || order.labName || lab?.name || 'Laboratory',
          testName: testDisplayName,
          parameter: '',
          value: scanReportId ? 'Uploaded Document' : (order.notes || 'Verified / Reported'),
          reference: testDef?.referenceRange || '—',
          unit: '',
          isAbnormal: false,
          priority: (order.priority || 'ROUTINE').toUpperCase(),
          completedAt: completedTime,
          patientName: pName,
          tokenString: order._tokenString || visit?.tokenString || '',
          mrn: pMrn,
          orderedBy: doctorName,
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
        const ref = fieldMeta?.reference || '';
        const unit = fieldMeta?.unit || '';
        const isAbnormal = checkAbnormal(String(val), order.flag);

        flat.push({
          _id: `${order._id || Math.random()}-${key}-${i}`,
          orderId: order._id,
          laboratory: order._laboratoryName || order.labName || lab?.name || 'Laboratory',
          testName: testDisplayName,
          parameter: label,
          value: val == null ? '—' : String(val),
          reference: ref || '—',
          unit: unit || '',
          isAbnormal,
          priority: (order.priority || 'ROUTINE').toUpperCase(),
          completedAt: completedTime,
          patientName: pName,
          tokenString: order._tokenString || visit?.tokenString || '',
          mrn: pMrn,
          orderedBy: doctorName,
          sampleCollectedAt: order.sampleCollectedAt,
          processedAt: order.processedAt,
          notes: order.notes || '',
          scanReportId,
        });
      });
    });

    return flat;
  }, [completedOrders, laboratories, resolvedPatientName, resolvedMRN, visit]);

  // Group by test panel for clean linear worksheet presentation
  const isWorksheetEmbedded = Boolean(visit || patient);

  return (
    <Md3Section
      title="Reported Results"
      subtitle={rows.length > 0
        ? `${rows.length} verified parameter${rows.length === 1 ? '' : 's'}`
        : 'Completed test results appear here'}
      icon={<Icon.FileSearch />}
      variant="compact"
      className={`results-grid ${className}`.trim()}
    >
      {rows.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px 12px',
          color: 'var(--md-sys-color-on-surface-variant, #49454f)',
          fontSize: '0.78rem',
          fontStyle: 'italic',
          background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
          borderRadius: '6px',
          border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)',
        }}>
          <Icon.Clipboard style={{ width: '16px', height: '16px', color: 'var(--md-sys-color-outline)' }} />
          <span>No reported results yet. Completed tests will appear here.</span>
        </div>
      ) : isWorksheetEmbedded ? (
        /* ─── 1. Linear Parameter Panel for Patient Worksheet ─── */
        <div className="results-grid__panels-list">
          {completedOrders.map((order) => {
            const orderRows = rows.filter((r) => r.orderId === order._id);
            const pMeta = priorityVariant((order.priority || 'ROUTINE').toUpperCase());
            const tat = calcTAT(order.sampleCollectedAt, order.processedAt || order.updatedAt);

            return (
              <div key={order._id || order.id} className="results-panel-card">
                <header className="results-panel-card__header">
                  <div className="results-panel-card__title-group">
                    <Icon.Beaker style={{ width: '15px', height: '15px', color: 'var(--md-sys-color-primary)' }} />
                    <h4 className="results-panel-card__title">{order.testName || 'Diagnostic Panel'}</h4>
                    <Md3Chip variant={pMeta} size="small">
                      {(order.priority || 'ROUTINE').toUpperCase()}
                    </Md3Chip>
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
                    <span><strong>Note:</strong> {order.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── 2. Global Hospital-Wide Linear Results Table ─── */
        <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Priority</th>
                <th>Patient</th>
                <th>Test / Parameter</th>
                <th>Measured Value</th>
                <th>Reference Interval</th>
                <th>Reported Time</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <Md3Chip variant={priorityVariant(row.priority)} size="small">
                      {row.priority}
                    </Md3Chip>
                  </td>
                  <td>
                    <div className="results-table__patient-cell">
                      <Md3Avatar initials={row.patientName?.slice(0, 2).toUpperCase() || 'PT'} size="small" variant="primary" />
                      <div className="results-table__patient-info">
                        <span className="results-table__patient-name">{row.patientName}</span>
                        <span className="results-table__patient-meta">
                          {row.tokenString && `${row.tokenString} • `}MRN: {row.mrn}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="results-table__test-cell">
                      <span className="results-table__test-name">{row.testName}</span>
                      {row.parameter && (
                        <span className="results-table__test-meta">{row.parameter} • {row.laboratory}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`results-table__val-box ${row.isAbnormal ? 'results-table__val-box--abnormal' : ''}`}>
                      {row.isAbnormal && <Icon.Alert style={{ width: '13px', height: '13px' }} />}
                      <span>{row.value}</span>
                      {row.unit && <span style={{ fontSize: '0.70rem', fontWeight: 400 }}>&nbsp;{row.unit}</span>}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                      {row.reference || '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface, #1c1b1f)' }}>
                        {formatTime(row.completedAt)}
                      </span>
                      {row.sampleCollectedAt && (
                        <span style={{ fontSize: '0.66rem', color: 'var(--md-sys-color-secondary, #625b71)', fontWeight: 600 }}>
                          TAT: {calcTAT(row.sampleCollectedAt, row.completedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <ActionsCell row={row} onViewReport={onViewReport} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Md3Section>
  );
};

export default ResultsGrid;
