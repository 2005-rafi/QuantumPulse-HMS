import {
  Icon,
  Md3Avatar,
  Md3Chip,
  Md3EmptyState,
  Md3Grid,
  Md3GridItem,
  Md3InfoRow,
  Md3Section,
  Md3StatCard,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import LabOrderCard from './LabOrderCard';
import {
  formatDate,
  formatPatientName,
  getClinicalContext,
  getPatientAge,
  getPatientInitials,
} from './labDashboard.utils';

const LabWorkspace = ({
  selectedVisit,
  laboratories,
  resultsForm,
  notesForm,
  onResultFieldChange,
  onNotesChange,
  onCollectSample,
  onSubmitResult,
  busyAction,
  isLoading,
  isQueueEmpty,
  errorMessage,
  onRetry,
  specimenTrackerSlot,
  resultsGridSlot,
}) => {
  if (!selectedVisit) {
    const title = isLoading
      ? 'Preparing laboratory desk'
      : errorMessage
        ? 'Laboratory desk unavailable'
        : isQueueEmpty
          ? 'No specimens are waiting'
          : 'Choose a patient to begin';
    const subtitle = isLoading
      ? 'Loading active specimen requests.'
      : errorMessage
        ? errorMessage
        : isQueueEmpty
          ? 'The queue is clear. This workspace will be ready as soon as a new test request arrives.'
          : 'Select a patient from the queue to collect samples, review requests, and enter results.';

    return (
      <section className="lab-dashboard__workspace-empty" aria-live="polite">
        <Md3EmptyState
          icon={errorMessage ? <Icon.AlertTriangle /> : isQueueEmpty ? <Icon.Inbox /> : <Icon.Microscope />}
          title={title}
          subtitle={subtitle}
          action={errorMessage ? (
            <Md3Button variant="secondary" className="lab-dashboard__retry-button" onClick={onRetry}>
              Try again
            </Md3Button>
          ) : null}
        />
      </section>
    );
  }

  const patient = selectedVisit.patientId || {};
  const context = getClinicalContext(selectedVisit);
  const orders = selectedVisit.labOrders || [];
  const pendingOrders = orders.filter((order) => order.status !== 'COMPLETED');
  const awaitingSampleCount = orders.filter((order) => order.status === 'PENDING_SAMPLE').length;
  const processingCount = orders.filter((order) => order.status === 'PROCESSING').length;
  const completedCount = orders.filter((order) => order.status === 'COMPLETED').length;

  return (
    <div className="lab-dashboard__workspace">
      <div className="lab-dashboard__patient-hero">
        <div className="lab-dashboard__patient-overview">
          <div className="lab-dashboard__patient-title-block">
            <Md3Avatar
              initials={getPatientInitials(patient)}
              size="large"
              variant="primary"
              imageUrl={patient.profilePicture}
            />
            <div className="lab-dashboard__patient-title-text">
              <div className="lab-dashboard__patient-chip-row">
                <Md3Chip variant="primary" size="small" icon={<Icon.CreditCard />}>
                  MRN {patient.mrn || 'Unassigned'}
                </Md3Chip>
                <Md3Chip variant="tertiary" size="small" icon={<Icon.Person />}>
                  {getPatientAge(patient)} yrs · {patient.gender || 'Unknown'}
                </Md3Chip>
                {patient.bloodGroup ? (
                  <Md3Chip variant="error" size="small" icon={<Icon.Droplet />}>
                    {patient.bloodGroup}
                  </Md3Chip>
                ) : null}
              </div>

              <h2 className="lab-dashboard__patient-name">{formatPatientName(patient)}</h2>
              <p className="lab-dashboard__patient-subtitle">
                Ordered by Dr. {context.requestedBy} · Updated {formatDate(selectedVisit.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <Md3Grid columns={2} gap="default" className="lab-dashboard__patient-facts">
          <Md3InfoRow icon={<Icon.Calendar />} label="Date of Birth" value={formatDate(patient.dob)} />
          <Md3InfoRow icon={<Icon.Hospital />} label="Blood Group" value={patient.bloodGroup || 'Not recorded'} />
          <Md3InfoRow icon={<Icon.Clipboard />} label="Chief Complaint" value={context.chiefComplaint} />
          <Md3InfoRow icon={<Icon.FileText />} label="Diagnosis" value={context.diagnosis} />
        </Md3Grid>
      </div>

        <Md3Grid columns={3} gap="default" className="lab-dashboard__metric-strip">
          <Md3StatCard icon={<Icon.Beaker />} label="Awaiting sample" value={awaitingSampleCount} variant="secondary" />
          <Md3StatCard icon={<Icon.Activity />} label="In analysis" value={processingCount} variant="tertiary" />
          <Md3StatCard icon={<Icon.Check />} label="Completed" value={completedCount} variant="default" />
        </Md3Grid>

        {specimenTrackerSlot ? (
          <div className="lab-dashboard__specimen-slot">{specimenTrackerSlot}</div>
        ) : null}

      <Md3Grid columns={4} gap="large" className="lab-dashboard__workspace-grid">
        <Md3GridItem span={3}>
          <Md3Section
            title="Ordered Tests"
            subtitle={`${pendingOrders.length} active test${pendingOrders.length === 1 ? '' : 's'} still require laboratory action`}
            icon={<Icon.Microscope />}
            className="lab-dashboard__orders-section"
          >
            {pendingOrders.length === 0 ? (
              <Md3EmptyState
                icon={<Icon.Check />}
                title="All requested tests are complete"
                subtitle="This visit can be cleared from the laboratory queue."
              />
            ) : (
              <div className="lab-dashboard__order-list">
                {pendingOrders.map((order) => {
                  const laboratory = laboratories.find((item) => item._id === order.laboratoryId);
                  const isCollecting = busyAction === `collect:${order._id}`;
                  const isSubmitting = busyAction === `submit:${order._id}`;

                  return (
                    <LabOrderCard
                      key={order._id}
                      order={order}
                      laboratory={laboratory}
                      results={resultsForm[order._id]}
                      notes={notesForm[order._id]}
                      onResultFieldChange={onResultFieldChange}
                      onNotesChange={onNotesChange}
                      onCollectSample={onCollectSample}
                      onSubmitResult={onSubmitResult}
                      isBusy={isCollecting || isSubmitting}
                    />
                  );
                })}
              </div>
            )}
          </Md3Section>
        </Md3GridItem>

        <Md3GridItem span={1}>
          <Md3Section
            title="Clinical Context"
            subtitle="Read-only context from the consultation note"
            icon={<Icon.Stethoscope />}
            className="lab-dashboard__context-section"
          >
            <Md3InfoRow icon={<Icon.Clipboard />} label="Chief Complaint" value={context.chiefComplaint} />
            <Md3InfoRow icon={<Icon.FileText />} label="Diagnosis" value={context.diagnosis} />
            <Md3InfoRow icon={<Icon.Person />} label="Requested By" value={`Dr. ${context.requestedBy}`} />
            <Md3InfoRow icon={<Icon.Clock />} label="Visit Updated" value={formatDate(selectedVisit.updatedAt)} />
          </Md3Section>
        </Md3GridItem>
      </Md3Grid>
    </div>
  );
};

export default LabWorkspace;
