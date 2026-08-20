import React, { useState } from 'react';
import {
  Icon,
  Md3Section,
  Md3DataTable,
  Md3EmptyState,
  Md3Chip,
} from '../../components/md3/Md3Widgets';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const priorityVariant = (p) => ({
  STAT: 'error', URGENT: 'warning', ROUTINE: 'secondary',
})[p] || 'default';

const ResultsGrid = ({
  completedOrders = [],
  laboratories = [],
  onViewReport,
  className = '',
}) => {
  const rows = React.useMemo(() => {
    const flat = [];
    completedOrders.forEach((order) => {
      const orderTests = order.tests && Array.isArray(order.tests) ? order.tests : [];
      const scanReportId = order.results?.scanReportId || null;

      if (!order.results || typeof order.results !== 'object') {
        if (orderTests.length === 0) {
          flat.push({
            _id: `${order._id}-summary`,
            orderId: order._id,
            laboratory: order._laboratoryName || order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: order.panelName || 'Test panel',
            value: '—',
            reference: order.referenceRange || 'See report',
            unit: '',
            flag: order.abnormalFlag || '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
            patientName: order._patientName || 'Unknown Patient',
            mrn: order._mrn || '—',
            orderedBy: order._orderedBy || 'Attending Physician',
            sampleCollectedAt: order.sampleCollectedAt,
            processedAt: order.processedAt,
            scanReportId,
          });
        }
        orderTests.forEach((t, i) => {
          flat.push({
            _id: `${order._id}-${t._id || t.code || i}`,
            orderId: order._id,
            laboratory: order._laboratoryName || order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: t.name || t.code || `Test ${i + 1}`,
            value: t.result || '—',
            reference: t.referenceRange || 'See report',
            unit: t.unit || '',
            flag: (t.result && t.flag) || t.abnormalFlag || '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
            patientName: order._patientName || 'Unknown Patient',
            mrn: order._mrn || '—',
            orderedBy: order._orderedBy || 'Attending Physician',
            sampleCollectedAt: order.sampleCollectedAt,
            processedAt: order.processedAt,
            scanReportId,
          });
        });
        return;
      }

      // Filter out internal metadata keys like scanReportId or notes
      const entries = Object.entries(order.results).filter(
        ([k]) => k !== '_notes' && k !== 'scanReportId' && !k.startsWith('attachment')
      );

      if (entries.length === 0 && orderTests.length > 0) {
        orderTests.forEach((t, i) => {
          flat.push({
            _id: `${order._id}-${t._id || t.code || i}`,
            orderId: order._id,
            laboratory: order._laboratoryName || order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: t.name || t.code || `Test ${i + 1}`,
            value: 'Pending',
            reference: t.referenceRange || 'See report',
            unit: t.unit || '',
            flag: '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
            patientName: order._patientName || 'Unknown Patient',
            mrn: order._mrn || '—',
            orderedBy: order._orderedBy || 'Attending Physician',
            sampleCollectedAt: order.sampleCollectedAt,
            processedAt: order.processedAt,
            scanReportId,
          });
        });
        return;
      }

      // If results map contains values but orderTests is empty (dynamic tests)
      if (entries.length === 0 && orderTests.length === 0) {
        flat.push({
          _id: `${order._id}-dynamic-empty`,
          orderId: order._id,
          laboratory: order._laboratoryName || order.laboratoryName || order.laboratoryId || 'Laboratory',
          test: order.panelName || 'Diagnostic Report',
          value: 'Uploaded Document',
          reference: 'See report file',
          unit: '',
          flag: '',
          priority: order.priority || 'ROUTINE',
          completedAt: order.completedAt || order.updatedAt,
          patientName: order._patientName || 'Unknown Patient',
          mrn: order._mrn || '—',
          orderedBy: order._orderedBy || 'Attending Physician',
          sampleCollectedAt: order.sampleCollectedAt,
          processedAt: order.processedAt,
          scanReportId,
        });
        return;
      }

      entries.forEach(([key, val], i) => {
        flat.push({
          _id: `${order._id}-${key}-${i}`,
          orderId: order._id,
          laboratory: order._laboratoryName || order.laboratoryName || order.laboratoryId || 'Laboratory',
          test: key,
          value: val == null ? '—' : String(val),
          reference: orderTests.find((t) => (t.name || t.code) === key)?.referenceRange || '',
          unit: orderTests.find((t) => (t.name || t.code) === key)?.unit || '',
          flag: typeof val === 'string' && /H|L|Abnormal|High|Low/i.test(val) ? 'ABNORMAL' : '',
          priority: order.priority || 'ROUTINE',
          completedAt: order.completedAt || order.updatedAt,
          patientName: order._patientName || 'Unknown Patient',
          mrn: order._mrn || '—',
          orderedBy: order._orderedBy || 'Attending Physician',
          sampleCollectedAt: order.sampleCollectedAt,
          processedAt: order.processedAt,
          scanReportId,
        });
      });
    });
    return flat;
  }, [completedOrders]);

  const columns = [
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <Md3Chip variant={priorityVariant(row.priority)} size="small">
          {row.priority}
        </Md3Chip>
      ),
      width: 'minmax(0, 90px)',
    },
    {
      key: 'patient',
      label: 'Patient / Diagnosis Subject',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface, #1d1b20)', fontSize: '0.875rem' }}>
            {row.patientName}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontWeight: 500 }}>
            MRN: {row.mrn}
          </span>
        </div>
      ),
      width: 'minmax(0, 1.4fr)',
    },
    {
      key: 'orderedBy',
      label: 'Requesting MD',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.8125rem' }}>
          <Icon.Person style={{ width: '16px', height: '16px', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
            {row.orderedBy}
          </span>
        </div>
      ),
      width: 'minmax(0, 1.2fr)',
    },
    {
      key: 'laboratory',
      label: 'Facility / Laboratory',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.8125rem' }}>
          <Icon.Microscope style={{ width: '16px', height: '16px', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
            {row.laboratory}
          </span>
        </div>
      ),
      width: 'minmax(0, 1.2fr)',
    },
    {
      key: 'test',
      label: 'Analyzed Test',
      render: (row) => (
        <span style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface, #1d1b20)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
          {row.test}
        </span>
      ),
      width: 'minmax(0, 1.1fr)',
    },
    {
      key: 'value',
      label: 'Result Value',
      render: (row) => {
        const isAbnormal = row.flag === 'ABNORMAL';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: isAbnormal ? 'var(--md-sys-color-error, #b3261e)' : 'var(--md-sys-color-on-surface, #1d1b20)',
              background: isAbnormal ? 'var(--md-sys-color-error-container, #f9dedc)' : 'transparent',
              padding: isAbnormal ? '2px 6px' : '0',
              borderRadius: '4px',
            }}
          >
            {isAbnormal && <Icon.Alert style={{ width: '14px', height: '14px' }} aria-hidden="true" />}
            <span>{row.value}</span>
            {row.unit && (
              <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                &nbsp;{row.unit}
              </span>
            )}
          </span>
        );
      },
      width: 'minmax(0, 1.1fr)',
    },
    {
      key: 'reference',
      label: 'Ref Range',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
          {row.reference || '—'}
        </span>
      ),
      width: 'minmax(0, 100px)',
    },
    {
      key: 'completedAt',
      label: 'Reported / turnaround time',
      render: (row) => {
        const d = row.completedAt ? new Date(row.completedAt) : null;
        const dateText = d && !Number.isNaN(+d)
          ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
          : '—';

        let tatText = '';
        if (row.sampleCollectedAt && row.completedAt) {
          const diffMs = new Date(row.completedAt) - new Date(row.sampleCollectedAt);
          const diffMins = Math.max(1, Math.round(diffMs / 60000));
          if (diffMins < 60) {
            tatText = `${diffMins}m`;
          } else {
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            tatText = `${hrs}h ${mins}m`;
          }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <time style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface, #1d1b20)' }} dateTime={d ? d.toISOString() : ''}>
              {dateText}
            </time>
            {tatText && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--md-sys-color-secondary, #625b71)',
              }}>
                <Icon.Clock style={{ width: '12px', height: '12px' }} />
                <span>TAT: {tatText}</span>
              </span>
            )}
          </div>
        );
      },
      width: 'minmax(0, 150px)',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => <ActionsCell row={row} onViewReport={onViewReport} />,
      width: 'minmax(0, 130px)',
    },
  ];

  return (
    <Md3Section
      title="Reported Results"
      subtitle={rows.length > 0
        ? `${rows.length} completed analysis record${rows.length === 1 ? '' : 's'} · sorted by recency and urgency`
        : 'Completed test results appear here as soon as they are published'}
      icon={<Icon.FileSearch />}
      variant="default"
      className={`results-grid ${className}`.trim()}
    >
      {rows.length === 0 ? (
        <Md3EmptyState
          icon={<Icon.Clipboard />}
          title="No reported results yet"
          subtitle="Complete a test and submit results to view them in this results grid."
        />
      ) : (
        <Md3DataTable
          ariaLabel="Laboratory results grid"
          columns={columns}
          rows={rows}
          rowKey={(r) => r._id}
          density="normal"
          zebra
        />
      )}
    </Md3Section>
  );
};

/* Actions cell component to handle authenticated document streaming */
const ActionsCell = ({ row, onViewReport }) => {
  const [viewing, setViewing] = useState(false);
  const { showError } = useToast();

  const handleView = async (e) => {
    e.preventDefault();
    if (!row.scanReportId) return;
    try {
      setViewing(true);
      const response = await api.get(`/laboratory/scans/${row.scanReportId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[ResultsGrid] Failed to stream scan:', err);
      showError('Failed to retrieve scan report document.');
    } finally {
      setViewing(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {row.scanReportId ? (
        <button
          type="button"
          className="md3-btn-tonal"
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minHeight: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '100px',
            cursor: 'pointer',
            background: 'var(--md-sys-color-secondary-container, #e8def8)',
            color: 'var(--md-sys-color-on-secondary-container, #1d192b)',
            fontWeight: 500,
          }}
          onClick={handleView}
          disabled={viewing}
        >
          <Icon.FileText style={{ width: '14px', height: '14px' }} />
          <span>{viewing ? 'Opening...' : 'View Scan'}</span>
        </button>
      ) : null}

      {typeof onViewReport === 'function' ? (
        <button
          type="button"
          className="md3-btn-outlined"
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minHeight: '28px',
            height: '28px',
            border: '1px solid var(--md-sys-color-outline, #79747e)',
            borderRadius: '100px',
            background: 'transparent',
            color: 'var(--md-sys-color-primary, #6750a4)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
          onClick={() => onViewReport(row)}
        >
          <Icon.FileText style={{ width: '14px', height: '14px' }} />
          <span>Report</span>
        </button>
      ) : null}

      {!row.scanReportId && typeof onViewReport !== 'function' ? (
        <span style={{ color: 'var(--md-sys-color-outline-variant, #c4c7c5)', fontSize: '0.875rem' }}>—</span>
      ) : null}
    </div>
  );
};

export default ResultsGrid;
