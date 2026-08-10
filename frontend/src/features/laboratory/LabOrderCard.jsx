import {
  Icon,
  Md3ActionBar,
  Md3Card,
  Md3Chip,
  Md3EmptyState,
  Md3TextArea,
} from '../../components/md3/Md3Widgets';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import LabStatusChip from './LabStatusChip';

const LabOrderCard = ({
  order,
  laboratory,
  results,
  notes,
  onResultFieldChange,
  onNotesChange,
  onCollectSample,
  onSubmitResult,
  isBusy,
}) => {
  const testDefinition = laboratory?.testCatalog?.find((test) => test.name === order.testName);
  const fields = testDefinition?.resultFields || [];

  return (
    <Md3Card variant="outlined" padding="default" className="lab-dashboard__order-card">
      <div className="lab-dashboard__order-header">
        <div className="lab-dashboard__order-heading">
          <div className="lab-dashboard__order-title-row">
            <h3 className="lab-dashboard__order-title">{order.testName}</h3>
            <LabStatusChip status={order.status} />
          </div>
          <div className="lab-dashboard__order-meta">
            <Md3Chip variant="default" size="small" icon={<Icon.Microscope />}>
              {laboratory?.name || 'Unassigned lab'}
            </Md3Chip>
            <Md3Chip variant="secondary" size="small" icon={<Icon.Beaker />}>
              {order.sampleType || 'Sample not specified'}
            </Md3Chip>
          </div>
        </div>
      </div>

      {order.status === 'PENDING_SAMPLE' && (
        <div className="lab-dashboard__order-state">
          <p className="lab-dashboard__supporting-text">
            Collect and register the specimen before result entry becomes available.
          </p>
          <Md3ActionBar align="start">
            <Md3Button
              variant="secondary"
              onClick={() => onCollectSample(order._id)}
              loading={isBusy}
              loadingText="Collecting..."
            >
              <span className="lab-dashboard__button-content">
                <Icon.Beaker />
                <span>Collect Sample</span>
              </span>
            </Md3Button>
          </Md3ActionBar>
        </div>
      )}

      {order.status === 'PROCESSING' && (
        <div className="lab-dashboard__order-state">
          {fields.length > 0 ? (
            <>
              <div className="lab-dashboard__result-grid">
                {fields.map((field, index) => (
                  <div key={`${order._id}-${field.label}-${index}`} className="lab-dashboard__result-field">
                    <Md3TextField
                      id={`${order._id}-${index}`}
                      name={field.label}
                      type={field.type === 'Number' ? 'number' : 'text'}
                      label={`${field.label}${field.required ? ' *' : ''}${field.unit ? ` (${field.unit})` : ''}`}
                      value={results?.[field.label] || ''}
                      onChange={(event) => onResultFieldChange(order._id, field.label, event.target.value)}
                    />
                  </div>
                ))}
              </div>

              <Md3TextArea
                id={`${order._id}-notes`}
                name={`${order._id}-notes`}
                label="Remarks / Notes"
                rows={3}
                value={notes || ''}
                onChange={(event) => onNotesChange(order._id, event.target.value)}
                className="lab-dashboard__notes-field"
              />

              <Md3ActionBar align="end">
                <Md3Button
                  variant="primary"
                  onClick={() => onSubmitResult(order._id)}
                  loading={isBusy}
                  loadingText="Uploading..."
                >
                  <span className="lab-dashboard__button-content">
                    <Icon.Check />
                    <span>Upload Results</span>
                  </span>
                </Md3Button>
              </Md3ActionBar>
            </>
          ) : (
            <Md3EmptyState
              icon={<Icon.FileText />}
              title="No structured result fields configured"
              subtitle="Add result fields to this laboratory test before processing structured output."
            />
          )}
        </div>
      )}
    </Md3Card>
  );
};

export default LabOrderCard;
