import React from 'react';
import {
  Icon,
  Md3Chip,
  Md3Section,
  Md3Avatar,
  Md3InfoRow,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import LabStatusChip from './LabStatusChip';
import './SpecimenTracker.css';

const SAMPLE_STAGE_STYLE = {
  PENDING_SAMPLE: { ring: 'pending' },
  PENDING: { ring: 'pending' },
  PROCESSING: { ring: 'processing' },
  PENDING_REVIEW: { ring: 'processing' },
  COMPLETED: { ring: 'completed' },
  REJECTED: { ring: 'rejected' },
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
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
                {/* Tier 1: Lab Identity, Sample Info, & Status Chips */}
                <div className="specimen-tracker__header-row">
                  <div className="specimen-tracker__col-info">
                    <Md3Avatar
                      initials={
                        order._patientName
                          ? order._patientName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                          : String(lab).slice(0, 2).toUpperCase()
                      }
                      size="small"
                      variant={order._patientName ? 'primary' : 'tertiary'}
                    />
                    <div className="specimen-tracker__title-text">
                      <div className="specimen-tracker__title-line">
                        {order._patientName ? (
                          <>
                            <h4 className="specimen-tracker__title">{order._patientName}</h4>
                            {order._tokenString && (
                              <span className="specimen-tracker__token-tag">{order._tokenString}</span>
                            )}
                            {order._mrn && order._mrn !== '—' && (
                              <span className="specimen-tracker__mrn-tag">{order._mrn}</span>
                            )}
                            {order._bloodGroup && (
                              <span className="specimen-tracker__blood-tag">{order._bloodGroup}</span>
                            )}
                          </>
                        ) : (
                          <h4 className="specimen-tracker__title">{lab}</h4>
                        )}
                        {order.testName && (
                          <span className="specimen-tracker__test-panel-tag">{order.testName}</span>
                        )}
                      </div>
                      <span className="specimen-tracker__meta">
                        {order.sampleType || order.specimenType || 'Standard specimen'}
                        {order._departmentName ? ` • ${order._departmentName}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="specimen-tracker__badges">
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
                    <LabStatusChip status={order.status} size="small" />
                  </div>
                </div>

                {/* Tier 2: Ordered Tests + Timestamps & Action */}
                <div className="specimen-tracker__footer-row">
                  <div className="specimen-tracker__details">
                    {(order.tests?.length || order.fields?.length) ? (
                      <ul className="specimen-tracker__tests" aria-label={`${lab} tests list`}>
                        {(order.tests && order.tests.length ? order.tests : (order.fields || []).map((f) => ({ name: f.name, code: f.key }))).map((test, i) => (
                          <li key={`${order._id || order.id}-${i}`} className="specimen-tracker__test-item">
                            <span className="specimen-tracker__test-name">{test.name || test.key || test.code || `Test ${i + 1}`}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="specimen-tracker__ordered-by">
                        Ordered by {order._orderedBy ? (order._orderedBy.startsWith('Dr.') ? order._orderedBy : `Dr. ${order._orderedBy}`) : (order.requestedBy || order.orderedBy || 'Attending Physician')}
                      </span>
                    )}

                    {order.sampleCollectedAt && (
                      <span className="specimen-tracker__timestamp">
                        <Icon.Clock />
                        <span>Collected {formatDateTime(order.sampleCollectedAt)}</span>
                      </span>
                    )}
                  </div>

                  {(stage === 'PENDING_SAMPLE' || stage === 'PENDING') && typeof onCollect === 'function' ? (
                    <div className="specimen-tracker__action-box">
                      <Md3Button
                        variant="tonal"
                        size="small"
                        disabled={isCollecting}
                        onClick={() => onCollect(order)}
                        loading={isCollecting}
                        loadingText="Collecting…"
                      >
                        <Icon.Beaker />
                        <span>Collect sample</span>
                      </Md3Button>
                    </div>
                  ) : null}
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
