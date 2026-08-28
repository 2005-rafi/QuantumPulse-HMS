import React, { useMemo, useState } from 'react';
import {
  Md3Card,
  Md3Avatar,
  Md3Chip,
  Md3Grid,
  Md3GridItem,
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

/**
 * Compact Patient Identity Header Bar — SRP (Single Responsibility)
 */
const LabPatientHeader = ({ visit }) => {
  const p = visit?.patientId || {};
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown Patient';
  const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const ageGender = [p.age ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' • ') || '—';
  const attending = visit?.referredBy || visit?.doctor?.fullName || visit?.assignedDoctor || 'Attending';
  const reason = visit?.reasonForVisit || 'General checkup';
  const mrnText = p.mrn ? (p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`) : 'MRN: —';

  return (
    <div className="lwp-header-bar" role="banner" aria-label="Patient header">
      <div className="lwp-header-bar__left">
        <Md3Avatar initials={initials} size="small" variant="tertiary" />
        <div className="lwp-header-bar__info">
          <div className="lwp-header-bar__name-group">
            <span className="lwp-header-bar__name">{name}</span>
            <span className="lwp-header-bar__mrn">{mrnText}</span>
            <span className="lwp-header-bar__dot" aria-hidden="true">•</span>
            <span className="lwp-header-bar__demo">{ageGender}</span>
            {p.bloodGroup && (
              <span className="lwp-header-bar__blood-badge">{p.bloodGroup}</span>
            )}
          </div>
        </div>
      </div>
      <div className="lwp-header-bar__right">
        <span className="lwp-header-bar__attending">
          <Icon.Person aria-hidden="true" />
          <span>{attending}</span>
        </span>
        <span className="lwp-header-bar__reason">
          <Icon.Clipboard aria-hidden="true" />
          <span>{reason}</span>
        </span>
      </div>
    </div>
  );
};

/**
 * OrderCard — Compact Test Entry & Specimen Card Component (SRP)
 */
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
  const lab = orderLabs?.find((l) =>
    (l?._id && order.laboratoryId && String(l._id) === String(order.laboratoryId?._id || order.laboratoryId)) ||
    (l?.name && order.labName && l.name.toLowerCase().trim() === order.labName.toLowerCase().trim())
  ) || orderLabs?.find((l) => (l?.testCatalog || []).some((t) => t.name?.toLowerCase().trim() === order.testName?.toLowerCase().trim()))
    || orderLabs?.[0] || null;

  const testDefinition = lab?.testCatalog?.find((test) =>
    test.name?.toLowerCase().trim() === order.testName?.toLowerCase().trim() ||
    (test.testCode && order.testCode && test.testCode.toLowerCase().trim() === order.testCode.toLowerCase().trim()) ||
    (test.code && order.testCode && test.code.toLowerCase().trim() === order.testCode.toLowerCase().trim())
  );

  const fields = testDefinition?.resultFields || testDefinition?.fields || order.resultFields || order.fields || [];
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
        </div>
        <div className="lwp-order__actions">
          {!collected && (
            <Md3Button
              variant="filled"
              size="small"
              onClick={() => onCollect && onCollect(order)}
              loading={disabled}
            >
              <Icon.Beaker />
              <span>Collect specimen</span>
            </Md3Button>
          )}
        </div>
      </header>

      {collected ? (
        <div className="lwp-order__body">
          <div className="lwp-order__fields" aria-label={`${displayName} result fields`}>
            {fields.length === 0 ? (
              <div className="lwp-order__no-fields">
                <Icon.Info />
                <span>No result fields defined. Record observations in technician notes below.</span>
              </div>
            ) : (
              <Md3Grid columns={2} gap="compact">
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
              rows={2}
              placeholder="Add observations or specimen remarks…"
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
                size="small"
                onClick={() => onSaveResult && onSaveResult(order)}
                loading={disabled}
              >
                <Icon.Save />
                <span>Report results</span>
              </Md3Button>
            </footer>
          )}
        </div>
      ) : (
        <div className="lwp-order__awaiting">
          <Icon.Beaker />
          <div className="lwp-order__awaiting-text">
            <strong>Awaiting specimen collection</strong>
            <span>Collect specimen to unlock result entry.</span>
          </div>
        </div>
      )}
    </article>
  );
};

const LabResultWorksheet = ({
  visit,
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
  const activeOrders = useMemo(() => {
    if (tabMode === 'REPORTED') return orders.filter((o) => (o.status || '').toUpperCase().includes('COMPLETE'));
    if (tabMode === 'SPECIMENS') return orders.filter((o) => (o.status || '').toUpperCase() !== 'PENDING_SAMPLE' && !(o.status || '').toUpperCase().includes('PENDING'));
    return orders;
  }, [orders, tabMode]);

  const handleTriggerCollect = (order) => {
    setDialogState({
      isOpen: true,
      title: 'Collect Specimen?',
      message: `Register sample collection for "${order.testName || 'this test'}"?`,
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
      message: `Finalize and submit results for "${order.testName || 'this test'}"?`,
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
          subtitle="Choose a patient from the queue to review tests and record diagnostic results."
        />
      </Md3Card>
    );
  }

  return (
    <div className="lwp">
      {/* High-Density Single-Line Header Bar */}
      <LabPatientHeader visit={visit} />

      {/* 2-Column Split Compact Clinical Workbench */}
      <div className="lwp-workbench">
        {specimenTrackerSlot ? (
          <section className="lwp-workbench__col lwp-workbench__col--specimen" aria-label="Specimen tracker column">
            {specimenTrackerSlot}
          </section>
        ) : null}

        <section className="lwp-workbench__col lwp-workbench__col--orders" aria-label="Order result entry column">
          <div className="lwp-workbench__orders-header">
            <h3 className="lwp-workbench__orders-title">
              <Icon.Beaker />
              <span>Diagnostic Orders ({activeOrders.length})</span>
            </h3>
          </div>

          {activeOrders.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.FileSearch />}
              title="No matching test orders"
              subtitle="Select another patient or switch filters."
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
        </section>
      </div>

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
