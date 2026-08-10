import React from 'react';
import {
  Icon,
  Md3Chip,
  Md3Section,
  Md3Divider,
  Md3Avatar,
  Md3InfoRow,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import LabStatusChip from './LabStatusChip';

const SAMPLE_STAGE_STYLE = {
  PENDING_SAMPLE: { ring: 'pending' },
  PENDING: { ring: 'pending' },
  PROCESSING: { ring: 'processing' },
  PENDING_REVIEW: { ring: 'processing' },
  COMPLETED: { ring: 'completed' },
  REJECTED: { ring: 'rejected' },
};

const SpecimenTracker = ({
  orders = [],
  laboratories = [],
  onCollect,
  busyCollecting,
  className = '',
}) => {
  if (orders.length === 0) {
    return (
      <div className={`specimen-tracker specimen-tracker--empty ${className}`.trim()}>
        <div className="specimen-tracker__empty-icon" aria-hidden="true">
          <Icon.Beaker />
        </div>
        <p className="specimen-tracker__empty-text">No specimens to track for this visit yet.</p>
      </div>
    );
  }

  const labNameById = React.useMemo(() => {
    const map = {};
    (laboratories || []).forEach((l) => { map[l._id] = l.name; });
    return map;
  }, [laboratories]);

  const collectByPriority = (a, b) => {
    const weight = { STAT: 0, URGENT: 1, ROUTINE: 2 };
    const wa = weight[a.priority] ?? 99;
    const wb = weight[b.priority] ?? 99;
    if (wa !== wb) return wa - wb;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  };

  const sortedOrders = [...orders].sort(collectByPriority);

  return (
    <Md3Section
      title="Specimen Tracker"
      subtitle="Collection status for every ordered test, sorted by priority"
      icon={<Icon.Activity />}
      variant="compact"
      className={`specimen-tracker ${className}`.trim()}
    >
      <ol className="specimen-tracker__list" aria-label="Specimen collection timeline">
        {sortedOrders.map((order, idx) => {
          const stage = (order.status || 'PENDING_SAMPLE').toUpperCase();
          const cfg = SAMPLE_STAGE_STYLE[stage] || SAMPLE_STAGE_STYLE.PENDING_SAMPLE;
          const lab = labNameById[order.laboratoryId] || labNameById[order.labId] || order.labName || order.laboratoryName || 'Laboratory';
          const isCollecting = busyCollecting === `collect:${order._id}` || busyCollecting === `collect:${order._id || order.id}`;
          const tests = order.tests && Array.isArray(order.tests) ? order.tests.length : 0;
          const fields = order.fields && Array.isArray(order.fields) ? order.fields.length : 0;
          const testCount = tests || fields || 'Panel';
          return (
            <li key={order._id || order.id || idx} className="specimen-tracker__item">
              <div className="specimen-tracker__timeline" aria-hidden="true">
                <div className={[
                  'specimen-tracker__dot',
                  `specimen-tracker__dot--${cfg.ring}`,
                ].filter(Boolean).join(' ')} />
                {idx < sortedOrders.length - 1 ? (
                  <div className={[
                    'specimen-tracker__connector',
                    `specimen-tracker__connector--${cfg.ring}`,
                  ].filter(Boolean).join(' ')} />
                ) : null}
              </div>

              <div className="specimen-tracker__card">
                <div className="specimen-tracker__row-head">
                  <div className="specimen-tracker__title-block">
                    <Md3Avatar
                      initials={String(lab).slice(0, 2).toUpperCase()}
                      size="small"
                      variant="tertiary"
                    />
                    <div className="specimen-tracker__title-text">
                      <h4 className="specimen-tracker__title">{lab}</h4>
                      <p className="specimen-tracker__meta">
                        {typeof testCount === 'number' ? `${testCount} test${testCount === 1 ? '' : 's'} ordered` : `${testCount}`}
                        {' · '}
                        {order.sampleType || order.specimenType || 'Sample type pending'}
                      </p>
                    </div>
                  </div>

                  <div className="specimen-tracker__actions">
                    {order.priority ? (
                      <Md3Chip
                        variant={
                          (order.priority || 'ROUTINE').toUpperCase() === 'STAT' ? 'error'
                            : (order.priority || '').toUpperCase() === 'URGENT' ? 'warning'
                              : 'secondary'
                        }
                        size="small"
                        icon={(order.priority || 'ROUTINE').toUpperCase() === 'STAT'
                          ? <Icon.Flag />
                          : (order.priority || '').toUpperCase() === 'URGENT'
                            ? <Icon.Alert />
                            : <Icon.Activity />}
                      >
                        {(order.priority || 'ROUTINE').toUpperCase()}
                      </Md3Chip>
                    ) : null}
                    <LabStatusChip status={order.status} />
                  </div>
                </div>

                {(order.tests?.length || order.fields?.length) ? (
                  <ul className="specimen-tracker__tests" aria-label={`${lab} tests list`}>
                    {(order.tests && order.tests.length ? order.tests : (order.fields || []).map((f) => ({ name: f.name, code: f.key }))).map((test, i) => (
                      <li key={`${order._id || order.id}-${i}`} className="specimen-tracker__test-item">
                        <Icon.Activity aria-hidden="true" />
                        <span className="specimen-tracker__test-name">{test.name || test.key || test.code || `Test ${i + 1}`}</span>
                        {(test.code || test.key) && test.name ? (
                          <span className="specimen-tracker__test-code">{test.code || test.key}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Md3Divider variant="inset" />

                <div className="specimen-tracker__row-foot">
                  <Md3InfoRow
                    icon={<Icon.Clipboard />}
                    label="Ordered by"
                    value={order.requestedBy || order.orderedBy || 'Attending physician'}
                    compact
                  />
                  {stage === 'PENDING_SAMPLE' || stage === 'PENDING' ? (typeof onCollect === 'function' ? (
                    <Md3Button
                      variant="tonal"
                      size="default"
                      disabled={isCollecting}
                      onClick={() => onCollect(order)}
                      loading={isCollecting}
                      loadingText="Collecting..."
                    >
                      <Icon.Beaker />
                      <span>Mark collected</span>
                    </Md3Button>
                  ) : null) : (
                    <div className="specimen-tracker__collected-by">
                      {stage === 'COMPLETED' ? (
                        <Md3Chip variant="success" size="small" icon={<Icon.CheckCircle />}>
                          Results published
                        </Md3Chip>
                      ) : stage === 'PROCESSING' || stage === 'PENDING_REVIEW' ? (
                        <Md3Chip variant="tertiary" size="small" icon={<Icon.Activity />}>
                          Analysis in progress
                        </Md3Chip>
                      ) : stage === 'REJECTED' ? (
                        <Md3Chip variant="error" size="small" icon={<Icon.Alert />}>
                          Sample rejected — re-collect required
                        </Md3Chip>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Md3Section>
  );
};

export default SpecimenTracker;
