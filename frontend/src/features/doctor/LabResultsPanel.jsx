import React from 'react';
import {
  Md3Section, Md3Grid, Md3GridItem, Icon, Md3Chip,
} from '../../components/md3/Md3Widgets';

const LabResultsPanel = ({ labOrders = [] }) => {
  const completedOrders = labOrders.filter((l) => l.status === 'COMPLETED');

  if (!completedOrders.length) return null;

  return (
    <Md3Section
      title="Laboratory Results"
      subtitle={`${completedOrders.length} completed test${completedOrders.length !== 1 ? 's' : ''} available for review`}
      icon={<Icon.Microscope />}
      variant="tertiary"
    >
      <div className="lab-results__list">
        {completedOrders.map((order, idx) => {
          const hasResults = order.results && Object.keys(order.results).length > 0;
          const entries = hasResults ? Object.entries(order.results) : [];
          return (
            <div key={`${order.testName || idx}-${idx}`} className="lab-results__item">
              <div className="lab-results__item-header">
                <div className="lab-results__title-box">
                  <div className="lab-results__icon">
                    <Icon.Beaker />
                  </div>
                  <h4 className="lab-results__title">
                    {order.testName || 'Unknown Test'}
                  </h4>
                </div>
                <Md3Chip variant="tertiary" size="small">
                  {order.labName || 'Lab Result'}
                </Md3Chip>
              </div>

              {hasResults ? (
                <Md3Grid columns={2} gap="small">
                  {entries.map(([key, val]) => (
                    <Md3GridItem key={key}>
                      <div className="lab-results__metric">
                        <span className="lab-results__metric-label">
                          {camelToLabel(key)}
                        </span>
                        <span className="lab-results__metric-value">
                          {val !== null && val !== undefined && val !== '' ? String(val) : '—'}
                        </span>
                      </div>
                    </Md3GridItem>
                  ))}
                </Md3Grid>
              ) : (
                <span className="lab-results__empty">
                  No structured results provided.
                </span>
              )}

              {order.notes && (
                <div className="lab-results__notes">
                  <strong className="lab-results__notes-strong">Notes: </strong>
                  {order.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Md3Section>
  );
};

const camelToLabel = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

export default LabResultsPanel;
