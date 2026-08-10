import {
  Icon,
  Md3Avatar,
  Md3Card,
  Md3Chip,
  Md3EmptyState,
  Md3Section,
  Md3StatCard,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import {
  countPendingOrders,
  formatElapsedTime,
  formatPatientName,
  getClinicalContext,
  getPatientAge,
  getPatientInitials,
} from './labDashboard.utils';

const LabQueuePanel = ({
  queue,
  selectedVisitId,
  onSelectVisit,
  aggregateStats = [],
  isLoading,
  errorMessage,
  onRetry,
  priorityBar,
}) => {
  const hasQueue = queue.length > 0;

  return (
    <Md3Section
      title="Pending Queue"
      subtitle={hasQueue
        ? `${queue.length} active visit${queue.length === 1 ? '' : 's'} awaiting laboratory action`
        : 'New specimen requests appear here automatically'}
      icon={<Icon.Clipboard />}
      className="lab-dashboard__queue-panel"
    >
      {priorityBar ? (
        <div className="lab-dashboard__queue-priority-bar">
          {priorityBar}
        </div>
      ) : null}

      <div className="lab-dashboard__queue-summary">
        {aggregateStats.map((item) => (
          <Md3StatCard
            key={item.id}
            icon={item.icon}
            label={item.label}
            value={item.value}
            variant={item.variant}
            className="lab-dashboard__sidebar-stat"
          />
        ))}
      </div>

      <div className="lab-dashboard__queue-list" aria-live="polite">
        {isLoading ? (
          <Md3EmptyState
            icon={<Icon.Refresh />}
            title="Loading laboratory queue"
            subtitle="Checking for visits that need specimen collection or result entry."
          />
        ) : errorMessage ? (
          <Md3EmptyState
            icon={<Icon.AlertTriangle />}
            title="Queue unavailable"
            subtitle={errorMessage}
            action={(
              <Md3Button variant="secondary" className="lab-dashboard__retry-button" onClick={onRetry}>
                Try again
              </Md3Button>
            )}
          />
        ) : !hasQueue ? (
          <Md3EmptyState
            icon={<Icon.Inbox />}
            title="Queue is clear"
            subtitle="There are no pending laboratory visits right now. New requests will appear here."
          />
        ) : (
          queue.map((visit) => {
            const patient = visit.patientId || {};
            const isSelected = selectedVisitId === visit._id;
            const context = getClinicalContext(visit);

            return (
              <Md3Card
                key={visit._id}
                variant="outlined"
                padding="compact"
                className={[
                  'lab-dashboard__queue-card',
                  isSelected ? 'lab-dashboard__queue-card--selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectVisit(visit)}
                ariaLabel={`Open laboratory workspace for ${formatPatientName(patient)}`}
              >
                <div className="lab-dashboard__queue-card-top">
                  <div className="lab-dashboard__queue-patient">
                    <Md3Avatar
                      initials={getPatientInitials(patient)}
                      size="medium"
                      variant={isSelected ? 'primary' : 'tertiary'}
                    />
                    <div className="lab-dashboard__queue-patient-text">
                      <h3 className="lab-dashboard__queue-patient-name">{formatPatientName(patient)}</h3>
                      <p className="lab-dashboard__queue-patient-meta">
                        {getPatientAge(patient)} yrs · {patient.gender || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <Md3Chip variant={isSelected ? 'primary' : 'default'} size="small" icon={<Icon.Clock />}>
                    {formatElapsedTime(visit.updatedAt)}
                  </Md3Chip>
                </div>

                <div className="lab-dashboard__queue-card-bottom">
                  <p className="lab-dashboard__queue-complaint">{context.chiefComplaint}</p>
                  <Md3Chip variant="secondary" size="small" icon={<Icon.Microscope />}>
                    {countPendingOrders(visit)} pending test{countPendingOrders(visit) === 1 ? '' : 's'}
                  </Md3Chip>
                </div>
              </Md3Card>
            );
          })
        )}
      </div>
    </Md3Section>
  );
};

export default LabQueuePanel;
