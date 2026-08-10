import React from 'react';
import {
  Icon,
  Md3Section,
  Md3DataTable,
  Md3EmptyState,
  Md3Chip,
} from '../../components/md3/Md3Widgets';

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
      if (!order.results || typeof order.results !== 'object') {
        if (orderTests.length === 0) {
          flat.push({
            _id: `${order._id}-summary`,
            orderId: order._id,
            laboratory: order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: order.panelName || 'Test panel',
            value: '—',
            reference: order.referenceRange || 'See report',
            unit: '',
            flag: order.abnormalFlag || '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
          });
        }
        orderTests.forEach((t, i) => {
          flat.push({
            _id: `${order._id}-${t._id || t.code || i}`,
            orderId: order._id,
            laboratory: order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: t.name || t.code || `Test ${i + 1}`,
            value: t.result || '—',
            reference: t.referenceRange || 'See report',
            unit: t.unit || '',
            flag: (t.result && t.flag) || t.abnormalFlag || '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
          });
        });
        return;
      }
      const entries = Object.entries(order.results).filter(([k]) => k !== '_notes');
      if (entries.length === 0 && orderTests.length > 0) {
        orderTests.forEach((t, i) => {
          flat.push({
            _id: `${order._id}-${t._id || t.code || i}`,
            orderId: order._id,
            laboratory: order.laboratoryName || order.laboratoryId || 'Laboratory',
            test: t.name || t.code || `Test ${i + 1}`,
            value: 'Pending',
            reference: t.referenceRange || 'See report',
            unit: t.unit || '',
            flag: '',
            priority: order.priority || 'ROUTINE',
            completedAt: order.completedAt || order.updatedAt,
          });
        });
        return;
      }
      entries.forEach(([key, val], i) => {
        flat.push({
          _id: `${order._id}-${key}-${i}`,
          orderId: order._id,
          laboratory: order.laboratoryName || order.laboratoryId || 'Laboratory',
          test: key,
          value: val == null ? '—' : String(val),
          reference: orderTests.find((t) => (t.name || t.code) === key)?.referenceRange || '',
          unit: orderTests.find((t) => (t.name || t.code) === key)?.unit || '',
          flag: typeof val === 'string' && /H|L|Abnormal|High|Low/i.test(val) ? 'ABNORMAL' : '',
          priority: order.priority || 'ROUTINE',
          completedAt: order.completedAt || order.updatedAt,
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
      width: 'minmax(0, 100px)',
    },
    {
      key: 'laboratory',
      label: 'Laboratory',
      render: (row) => (
        <div className="results-grid__lab">
          <Icon.Microscope aria-hidden="true" />
          <span>{row.laboratory}</span>
        </div>
      ),
      width: 'minmax(0, 1.2fr)',
    },
    {
      key: 'test',
      label: 'Test',
      render: (row) => <span className="results-grid__test">{row.test}</span>,
      width: 'minmax(0, 1.6fr)',
    },
    {
      key: 'value',
      label: 'Result',
      render: (row) => (
        <span className={[
          'results-grid__value',
          row.flag ? 'results-grid__value--abnormal' : '',
        ].filter(Boolean).join(' ')}>
          {row.flag === 'ABNORMAL' ? <Icon.Alert aria-hidden="true" /> : null}
          <strong>{row.value}</strong>
          {row.unit ? <span className="results-grid__unit">&nbsp;{row.unit}</span> : null}
        </span>
      ),
      width: 'minmax(0, 1.3fr)',
    },
    {
      key: 'reference',
      label: 'Reference range',
      render: (row) => (
        <span className="results-grid__reference">{row.reference || '—'}</span>
      ),
      width: 'minmax(0, 1.4fr)',
    },
    {
      key: 'completedAt',
      label: 'Reported',
      render: (row) => {
        const d = row.completedAt ? new Date(row.completedAt) : null;
        const txt = d && !Number.isNaN(+d)
          ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
          : '—';
        return <time className="results-grid__time" dateTime={d ? d.toISOString() : ''}>{txt}</time>;
      },
      width: 'minmax(0, 160px)',
    },
    ...(typeof onViewReport === 'function' ? [{
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          type="button"
          className="results-grid__view-btn"
          onClick={() => onViewReport(row)}
        >
          <Icon.FileText aria-hidden="true" />
          <span>Report</span>
        </button>
      ),
      width: 'minmax(0, 120px)',
    }] : []),
  ];

  return (
    <Md3Section
      title="Reported Results"
      subtitle={rows.length > 0
        ? `${rows.length} completed test${rows.length === 1 ? '' : 's'} · sorted by recency and priority`
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
          density="compact"
          zebra
        />
      )}
    </Md3Section>
  );
};

export default ResultsGrid;
