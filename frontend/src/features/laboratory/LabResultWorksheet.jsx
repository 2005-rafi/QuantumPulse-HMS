import React, { useMemo, useState } from 'react';
import {
  Md3Card,
  Md3CardHeader,
  Md3Section,
  Md3InfoRow,
  Md3Avatar,
  Md3Chip,
  Md3Divider,
  Md3Grid,
  Md3GridItem,
  Md3IconButton,
  Md3EmptyState,
  Icon,
} from '../../components/md3/Md3Widgets';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import './LabResultWorksheet.css';

const statusClass = (s) => {
  const key = (s || '').toUpperCase();
  if (key.includes('COMPLETE')) return 'completed';
  if (key.includes('PROCESSING')) return 'processing';
  if (key.includes('PENDING')) return 'pending';
  return 'pending';
};

const priorityMeta = (p) => {
  const key = (p || 'ROUTINE').toUpperCase();
  if (key === 'STAT') return { variant: 'error', label: 'STAT', icon: <Icon.Flag /> };
  if (key === 'URGENT') return { variant: 'warning', label: 'URGENT', icon: <Icon.Alert /> };
  return { variant: 'secondary', label: 'ROUTINE', icon: <Icon.Activity /> };
};

const PatientIdentityHeader = ({ visit }) => {
  const p = visit?.patientId || {};
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const ageGender = [p.age ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' • ') || '—';
  return (
    <div className="lwp-patient">
      <Md3Avatar initials={initials} size="large" variant="tertiary" />
      <div className="lwp-patient__text">
        <div className="lwp-patient__title-row">
          <h2 className="lwp-patient__name">{name}</h2>
          <Md3Chip variant="tertiary" size="medium" icon={<Icon.Calendar />}>
            {visit?.visitNumber ? `Visit ${visit.visitNumber}` : 'Visit'}
          </Md3Chip>
        </div>
        <div className="lwp-patient__meta-row">
          <span className="lwp-patient__mrn">MRN {p.mrn || '—'}</span>
          <span className="lwp-patient__dot" aria-hidden="true">•</span>
          <span className="lwp-patient__demo">{ageGender}</span>
          {p.phone && (
            <>
              <span className="lwp-patient__dot" aria-hidden="true">•</span>
              <span className="lwp-patient__demo">{p.phone}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickInfoRow = ({ visit }) => {
  const p = visit?.patientId || {};
  const orders = visit?.labOrders || [];
  const total = orders.length;
  const completed = orders.filter((o) => (o.status || '').toUpperCase().includes('COMPLETE')).length;
  const processing = orders.filter((o) => (o.status || '').toUpperCase().includes('PROCESSING')).length;
  const pending = total - completed - processing;
  const attending = visit?.referredBy || visit?.doctor?.fullName || visit?.assignedDoctor || '—';
  const reason = visit?.reasonForVisit || 'No reason recorded';
  const visitDate = visit?.checkInTime || visit?.createdAt || null;
  const dateText = visitDate ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(visitDate)) : '—';
  return (
    <div className="lwp-quick" role="group" aria-label="Patient quick summary">
      <div className="lwp-quick__col">
        <Md3InfoRow icon={<Icon.Clipboard />} label="Attending" value={attending} />
      </div>
      <div className="lwp-quick__col">
        <Md3InfoRow icon={<Icon.Calendar />} label="Check-in" value={dateText} />
      </div>
      <div className="lwp-quick__col">
        <Md3InfoRow icon={<Icon.Beaker />} label="Tests ordered" value={`${total} • ${completed} done`} />
      </div>
      <div className="lwp-quick__col lwp-quick__col--stack">
        <Md3InfoRow icon={<Icon.Activity />} label="Order status" value={`${pending} pending • ${processing} processing`} />
      </div>
      <div className="lwp-quick__reason" aria-label="Reason for visit">
        <div className="lwp-quick__reason-label">
          <Icon.Clipboard />
          <span>Reason for visit</span>
        </div>
        <div className="lwp-quick__reason-body">{reason}</div>
      </div>
    </div>
  );
};

const OrderCard = ({
  order,
  onCollect,
  onSaveResult,
  onChangeField,
  onChangeNotes,
  disabled,
  orderLabs,
  results,
  notes,
}) => {
  const lab = orderLabs?.find((l) => l?._id === order.laboratoryId) || orderLabs?.find((l) => l?.name === order.labName) || null;
  const testDefinition = lab?.testCatalog?.find((test) => test.name === order.testName);
  const fields = testDefinition?.resultFields || [];
  const meta = priorityMeta(order.priority);
  const displayName = order.testName || order.labName || lab?.name || 'Laboratory Order';
  const collected = (order.status || '').toUpperCase() !== 'PENDING_SAMPLE' && (order.status || '').toUpperCase() !== 'PENDING';
  const isCompleted = (order.status || '').toUpperCase().includes('COMPLETE');
  const notesValue = notes !== undefined ? notes : (order.notes || '');

  return (
    <article className={`lwp-order lwp-order--${statusClass(order.status)}`}>
      <header className="lwp-order__header">
        <div className="lwp-order__titles">
          <div className="lwp-order__name-row">
            <span className="lwp-order__name">{displayName}</span>
            <Md3Chip variant={meta.variant} size="small" icon={meta.icon}>{meta.label}</Md3Chip>
            <Md3Chip variant={isCompleted ? 'success' : collected ? 'tertiary' : 'default'} size="small">
              {isCompleted ? 'Reported' : collected ? 'Processing' : 'Awaiting sample'}
            </Md3Chip>
          </div>
          <div className="lwp-order__meta">
            {order.testCode || lab?.testCode ? <span>Code {order.testCode || lab.testCode}</span> : null}
            {order.createdAt && <span>Ordered {new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}</span>}
          </div>
        </div>
        <div className="lwp-order__actions">
          {!collected && (
            <Md3Button
              variant="filled"
              size="default"
              onClick={() => onCollect && onCollect(order)}
              loading={disabled}
            >
              <Icon.Beaker />
              <span>Collect specimen</span>
            </Md3Button>
          )}
        </div>
      </header>
      <Md3Divider variant="full" />
      {collected ? (
        <>
          <div className="lwp-order__fields" aria-label={`${displayName} result fields`}>
            {fields.length === 0 ? (
              <div className="lwp-order__no-fields">
                <Icon.Info />
                <span>No result fields are defined for this test. Use the notes area to record observations.</span>
              </div>
            ) : (
              <Md3Grid columns={2} gap="wide">
                {fields.map((f, idx) => {
                  const fieldKey = f.key || f.label || f.name || String(idx);
                  const draftVal = results && Object.prototype.hasOwnProperty.call(results, fieldKey) ? results[fieldKey] : undefined;
                  const savedVal = order.results instanceof Map
                    ? order.results.get(fieldKey)
                    : (order.results && Object.prototype.hasOwnProperty.call(order.results, fieldKey) ? order.results[fieldKey] : undefined);
                  const value = draftVal !== undefined ? draftVal : (savedVal !== undefined ? savedVal : (f.defaultValue ?? ''));
                  const unit = f.unit ? ` (${f.unit})` : '';

                  return (
                    <Md3GridItem key={fieldKey}>
                      <Md3TextField
                        id={`lab-field-${order._id || order.id}-${fieldKey}`}
                        name={fieldKey}
                        label={`${f.label || f.name || 'Result'}${unit}`}
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => onChangeField && onChangeField(order, f, e.target.value)}
                        disabled={disabled || isCompleted}
                        placeholder={f.reference ? `Ref: ${f.reference}` : undefined}
                      />
                    </Md3GridItem>
                  );
                })}
              </Md3Grid>
            )}
          </div>
          <div className="lwp-order__notes">
            <div className="lwp-order__notes-label">
              <Icon.Clipboard />
              <span>Technician notes</span>
            </div>
            <textarea
              className="lwp-order__notes-area"
              rows={3}
              placeholder="Add observations, method used, or specimen remarks…"
              value={notesValue}
              onChange={(e) => onChangeNotes && onChangeNotes(order, e.target.value)}
              disabled={disabled || isCompleted}
              aria-label={`${displayName} technician notes`}
            />
          </div>
          {!isCompleted && (
            <footer className="lwp-order__footer">
              <Md3Button
                variant="filled"
                size="default"
                onClick={() => onSaveResult && onSaveResult(order)}
                loading={disabled}
              >
                <Icon.Save />
                <span>Report results</span>
              </Md3Button>
            </footer>
          )}
        </>
      ) : (
        <div className="lwp-order__awaiting">
          <Icon.Beaker />
          <div className="lwp-order__awaiting-text">
            <strong>Awaiting specimen collection</strong>
            <span>Collect the specimen to unlock result entry fields and technician notes.</span>
          </div>
        </div>
      )}
    </article>
  );
};

const WorksheetActionBar = ({ onSave, onPrint, disabled, anyDirty }) => (
  <div className="lwp-actions">
    <div className="lwp-actions__hint">
      {anyDirty
        ? 'Unsaved result entries are shown below. Report each order individually to finalize results.'
        : 'Select an order above, then report results to complete the workflow.'}
    </div>
    <div className="lwp-actions__buttons">
      {typeof onPrint === 'function' && (
        <Md3Button variant="tonal" size="default" onClick={onPrint} disabled={disabled}>
          <Icon.Download />
          <span>Export sheet</span>
        </Md3Button>
      )}
      {typeof onSave === 'function' && (
        <Md3Button variant="outlined" size="default" onClick={onSave} disabled={disabled}>
          <Icon.Flag />
          <span>Save draft</span>
        </Md3Button>
      )}
    </div>
  </div>
);

const LabResultWorksheet = ({
  visit,
  selectedOrderId,
  onSelectOrder,
  onCollectSample,
  onSubmitResult,
  onChangeField,
  onChangeNotes,
  orderLabs = [],
  disabled,
  dirtyCount = 0,
  specimenTrackerSlot,
  resultsGridSlot,
  tabMode = 'PROCESSING',
  resultsForm = {},
  notesForm = {},
}) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'info',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  });

  const orders = useMemo(() => (visit?.labOrders ? [...visit.labOrders] : []), [visit]);
  const anyDirty = dirtyCount > 0;
  const activeOrders = useMemo(() => {
    if (tabMode === 'REPORTED') return orders.filter((o) => (o.status || '').toUpperCase().includes('COMPLETE'));
    if (tabMode === 'SPECIMENS') return orders.filter((o) => (o.status || '').toUpperCase() !== 'PENDING_SAMPLE' && !(o.status || '').toUpperCase().includes('PENDING'));
    return orders;
  }, [orders, tabMode]);

  const handleTriggerCollect = (order) => {
    setDialogState({
      isOpen: true,
      title: 'Collect Specimen?',
      message: `Are you sure you want to register sample collection for "${order.testName || 'this test'}"? This will allow result entry for the test.`,
      variant: 'info',
      confirmLabel: 'Collect Sample',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        onCollectSample?.(order);
        setDialogState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleTriggerSubmit = (order) => {
    setDialogState({
      isOpen: true,
      title: 'Submit Lab Results?',
      message: `Are you sure you want to finalize and submit the results for "${order.testName || 'this test'}"? This action cannot be undone.`,
      variant: 'success',
      confirmLabel: 'Submit Results',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        onSubmitResult?.(order);
        setDialogState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (!visit) {
    return (
      <Md3Card variant="elevated" padding="default" className="lwp-empty">
        <Md3EmptyState
          icon={<Icon.Microscope />}
          title="No patient selected"
          subtitle="Choose a patient from the laboratory queue to enter results and review the worksheet."
        />
      </Md3Card>
    );
  }

  return (
    <div className="lwp">
      <Md3Card variant="elevated" padding="none" className="lwp__card lwp__patient-card">
        <Md3CardHeader
          title="Clinical Worksheet"
          subtitle="Enter laboratory diagnosis, specimen collection, and reported results."
          icon={<Icon.Clipboard />}
          variant="primary"
        />
        <Md3Divider />
        <div className="lwp__patient-section">
          <PatientIdentityHeader visit={visit} />
          <Md3Divider variant="inset" />
          <QuickInfoRow visit={visit} />
        </div>
      </Md3Card>

      <WorksheetActionBar anyDirty={anyDirty} disabled={disabled} />

      {specimenTrackerSlot ? (
        <div className="lwp__tracker">{specimenTrackerSlot}</div>
      ) : null}

      <Md3Section
        title="Ordered tests"
        subtitle={`${activeOrders.length} ${activeOrders.length === 1 ? 'order' : 'orders'} in current view`}
        icon={<Icon.Beaker />}
        variant="default"
      >
        {activeOrders.length === 0 ? (
          <Md3EmptyState
            icon={<Icon.FileSearch />}
            title="No test orders match the current filter"
            subtitle="Use the priority filter bar in the queue or switch tabs to locate this patient's orders."
          />
        ) : (
          <div className="lwp-orders" role="list">
            {activeOrders.map((o) => (
              <OrderCard
                key={o._id || o.id}
                order={o}
                orderLabs={orderLabs}
                onCollect={handleTriggerCollect}
                onSaveResult={handleTriggerSubmit}
                onChangeField={onChangeField}
                onChangeNotes={onChangeNotes}
                disabled={disabled}
                results={resultsForm[o._id || o.id]}
                notes={notesForm[o._id || o.id]}
              />
            ))}
          </div>
        )}
      </Md3Section>

      {resultsGridSlot ? (
        <div className="lwp__results">{resultsGridSlot}</div>
      ) : null}

      <Md3ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        variant={dialogState.variant}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
      />
    </div>
  );
};

export default LabResultWorksheet;
