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
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import SpecimenBarcodeModal from './SpecimenBarcodeModal';
import SpecimenRedrawRemediationCard from './SpecimenRedrawRemediationCard';
import { formatDoctorName } from '../../utils/patientFormatters';
import './LabResultWorksheet.css';

const statusClass = (s) => {
  const key = (s || '').toUpperCase();
  if (key.includes('COMPLETE') || key.includes('VERIFIED')) return 'completed';
  if (key.includes('PROCESSING') || key.includes('AWAITING_VERIFICATION')) return 'processing';
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
const LabPatientHeader = ({ visit, completedOrdersCount = 0, onToggleVerified, viewMode }) => {
  const p = visit?.patientId || {};
  const isDeleted = Boolean(p.isDeleted || p.isOrphaned);
  const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Unknown Patient';
  const initials = isDeleted ? 'DP' : (((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PT');
  const validAge = p.age && p.age !== '—' && !isNaN(Number(p.age)) ? `${p.age} yrs` : null;
  const ageGender = [validAge, p.gender].filter(Boolean).join(' • ') || '—';
  const attending = formatDoctorName(visit?.referredBy || visit?.doctor?.fullName || visit?.assignedDoctor || visit?.consultation?.doctorId);
  const reason = visit?.reasonForVisit || 'Diagnostic Investigation';
  const mrnText = p.mrn ? (p.mrn === 'DELETED-RECORD' || p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`) : 'MRN: —';

  const isIpd = visit?.visitType === 'IPD' || Boolean(visit?.ipdAdmissionId);
  const bedInfo = visit?.ipdAdmissionId?.currentBedId?.bedLabel || visit?.ipdAdmissionId?.currentBedId?.bedNumber || '';
  const wardName = visit?.ipdAdmissionId?.wardId?.name || visit?.ipdAdmissionId?.departmentId?.name || 'Inpatient Admission';

  const vitals = visit?.vitals || {};
  const labVitals = visit?.labOrders?.[0]?.labVitals || {};
  const bp = labVitals.preScanBp || vitals.bloodPressure;
  const pulse = labVitals.pulse || vitals.pulse;
  const temp = labVitals.temperature || vitals.temperature;
  const spo2 = labVitals.oxygenSaturation || vitals.oxygenSaturation;
  const glucose = labVitals.bloodGlucose || vitals.bloodGlucose;
  const weight = labVitals.patientWeightKg || vitals.weight;
  const fasting = labVitals.fastingHours;
  const isVitalsSkipped = Boolean(labVitals.isSkipped);
  const skipReason = labVitals.skipReason;
  const hasAnyVitals = Boolean(bp || pulse || temp || spo2 || glucose || weight || fasting != null || isVitalsSkipped);

  return (
    <div className="lwp-header-bar" role="banner" aria-label="Patient header">
      <div className="lwp-header-bar__left">
        <div className="lwp-header-bar__avatar">{initials}</div>
        <div className="lwp-header-bar__info">
          <div className="lwp-header-bar__name-group">
            <span className="lwp-header-bar__name">{name}</span>
            <span className="lwp-header-bar__mrn">
              <span className="material-symbols-rounded">badge</span>
              <span>{mrnText}</span>
            </span>
            <span className="lwp-header-bar__dot" aria-hidden="true">•</span>
            <span className="lwp-header-bar__demo">{ageGender}</span>
            {p.bloodGroup && p.bloodGroup !== 'Unknown' && (
              <span className="lwp-header-bar__blood-badge">
                <span className="material-symbols-rounded">bloodtype</span>
                <span>{p.bloodGroup}</span>
              </span>
            )}
          </div>

          {/* Clinical Vitals Strip */}
          <div className="lwp-header-bar__vitals-strip">
            {hasAnyVitals ? (
              <>
                {isVitalsSkipped && (
                  <span className="lwp-vitals-chip lwp-vitals-chip--skipped" title={`Pre-vitals skipped: ${skipReason || 'Clinically Exempt'}`}>
                    <span className="material-symbols-rounded">cancel</span>
                    <strong>Pre-Vitals:</strong> Skipped ({skipReason || 'Exempted'})
                  </span>
                )}
                {bp && (
                  <span className="lwp-vitals-chip" title="Blood Pressure">
                    <span className="material-symbols-rounded">speed</span>
                    <strong>BP:</strong> {bp}
                  </span>
                )}
                {pulse && (
                  <span className="lwp-vitals-chip" title="Pulse Rate">
                    <span className="material-symbols-rounded">favorite</span>
                    <strong>Pulse:</strong> {pulse} bpm
                  </span>
                )}
                {spo2 && (
                  <span className="lwp-vitals-chip" title="Oxygen Saturation">
                    <span className="material-symbols-rounded">air</span>
                    <strong>SpO2:</strong> {spo2}%
                  </span>
                )}
                {temp && (
                  <span className="lwp-vitals-chip" title="Body Temperature">
                    <span className="material-symbols-rounded">thermostat</span>
                    <strong>Temp:</strong> {temp}°F
                  </span>
                )}
                {glucose && (
                  <span className="lwp-vitals-chip" title="Blood Glucose">
                    <span className="material-symbols-rounded">bloodtype</span>
                    <strong>Glucose:</strong> {glucose} mg/dL
                  </span>
                )}
                {weight && (
                  <span className="lwp-vitals-chip" title="Patient Weight">
                    <span className="material-symbols-rounded">monitor_weight</span>
                    <strong>Weight:</strong> {weight} kg
                  </span>
                )}
                {fasting != null && (
                  <span className="lwp-vitals-chip lwp-vitals-chip--fasting" title="Fasting Duration">
                    <span className="material-symbols-rounded">restaurant</span>
                    <strong>Fasting:</strong> {fasting} hrs
                  </span>
                )}
              </>
            ) : (
              <span className="lwp-vitals-chip lwp-vitals-chip--muted" title="No vitals recorded yet">
                <span className="material-symbols-rounded">medical_information</span>
                <span>No pre-vitals recorded (Direct phlebotomy intake active)</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="lwp-header-bar__right">
        {completedOrdersCount > 0 && (
          <button
            type="button"
            className={`lwp-header-bar__verified-pill ${viewMode === 'results' || viewMode === 'split' ? 'lwp-header-bar__verified-pill--active' : ''}`}
            onClick={onToggleVerified}
            title="Toggle Reported Results & Verified Diagnostic Findings"
          >
            <span className="material-symbols-rounded">verified</span>
            <span>{completedOrdersCount} Verified Report{completedOrdersCount === 1 ? '' : 's'}</span>
          </button>
        )}
        {isIpd && (
          <span className="lwp-header-bar__ipd" title={`Inpatient Ward: ${wardName} (Bed: ${bedInfo || 'Assigned'})`}>
            <span className="material-symbols-rounded">hotel</span>
            <span>{wardName}{bedInfo ? `: ${bedInfo}` : ''}</span>
          </span>
        )}
        <span className="lwp-header-bar__attending" title="Prescribing Physician / Referral">
          <span className="material-symbols-rounded">stethoscope</span>
          <span>{attending}</span>
        </span>
        {reason && reason !== 'Diagnostic Investigation' && (
          <span className="lwp-header-bar__reason" title="Clinical Indication / Reason for Investigation">
            <span className="material-symbols-rounded">clinical_notes</span>
            <span>{reason}</span>
          </span>
        )}
      </div>
    </div>
  );
};

const getTubeColor = (sampleType, testName) => {
  const name = (testName || '').toLowerCase();
  const type = (sampleType || '').toLowerCase();
  if (name.includes('cbc') || name.includes('hemogram') || type.includes('edta')) {
    return { bg: 'var(--md-lab-tube-edta-bg)', color: 'var(--md-lab-tube-edta-text)', border: 'var(--md-lab-tube-edta-border)', label: 'EDTA Lavender Top', code: 'EDTA-K2' };
  }
  if (name.includes('coagulation') || name.includes('pt/inr') || type.includes('citrate')) {
    return { bg: 'var(--md-lab-tube-citrate-bg)', color: 'var(--md-lab-tube-citrate-text)', border: 'var(--md-lab-tube-citrate-border)', label: 'Sodium Citrate Light Blue', code: 'CIT-3.2%' };
  }
  if (name.includes('glucose') || type.includes('fluoride')) {
    return { bg: 'var(--md-lab-tube-fluoride-bg)', color: 'var(--md-lab-tube-fluoride-text)', border: 'var(--md-lab-tube-fluoride-border)', label: 'Sodium Fluoride Gray', code: 'NAF-OX' };
  }
  if (name.includes('culture') || type.includes('swab')) {
    return { bg: 'var(--md-lab-tube-sterile-bg)', color: 'var(--md-lab-tube-sterile-text)', border: 'var(--md-lab-tube-sterile-border)', label: 'Sterile Swab', code: 'CULT-SW' };
  }
  return { bg: 'var(--md-lab-tube-sst-bg)', color: 'var(--md-lab-tube-sst-text)', border: 'var(--md-lab-tube-sst-border)', label: 'SST Gold Top Gel', code: 'SST-GEL' };
};

const resolveFieldReference = (f, patientGender) => {
  const genderLower = String(patientGender || '').toLowerCase().trim();
  const isFemale = genderLower.startsWith('f');
  const isMale = genderLower.startsWith('m');

  if (f.isGenderSpecific || f.maleMin != null || f.femaleMin != null) {
    if (isFemale && (f.femaleMin != null || f.femaleMax != null)) {
      const min = f.femaleMin != null ? f.femaleMin : '';
      const max = f.femaleMax != null ? f.femaleMax : '';
      if (min !== '' && max !== '') return { text: `${min} – ${max}`, label: 'Female', min, max };
      if (min !== '') return { text: `>= ${min}`, label: 'Female', min, max: null };
      if (max !== '') return { text: `<= ${max}`, label: 'Female', min: null, max };
    }
    if (isMale && (f.maleMin != null || f.maleMax != null)) {
      const min = f.maleMin != null ? f.maleMin : '';
      const max = f.maleMax != null ? f.maleMax : '';
      if (min !== '' && max !== '') return { text: `${min} – ${max}`, label: 'Male', min, max };
      if (min !== '') return { text: `>= ${min}`, label: 'Male', min, max: null };
      if (max !== '') return { text: `<= ${max}`, label: 'Male', min: null, max };
    }
  }

  // Fallback to universal min/max
  if (f.min != null || f.max != null) {
    const min = f.min != null ? f.min : '';
    const max = f.max != null ? f.max : '';
    if (min !== '' && max !== '') return { text: `${min} – ${max}`, label: 'Universal', min, max };
    if (min !== '') return { text: `>= ${min}`, label: 'Universal', min, max: null };
    if (max !== '') return { text: `<= ${max}`, label: 'Universal', min: null, max };
  }

  return { text: f.reference || '', label: '', min: null, max: null };
};

const evaluateLiveRange = (val, refMeta) => {
  if (val === '' || val === null || val === undefined || isNaN(Number(val))) return null;
  const num = Number(val);
  const { min, max } = refMeta;

  if (min !== null && min !== '' && !isNaN(Number(min)) && num < Number(min)) {
    return { status: 'LOW', label: `Low (< ${min})`, color: 'var(--md-lab-delta-abnormal-text)', bg: 'var(--md-lab-delta-abnormal-bg)' };
  }
  if (max !== null && max !== '' && !isNaN(Number(max)) && num > Number(max)) {
    return { status: 'HIGH', label: `High (> ${max})`, color: 'var(--md-lab-delta-critical-text)', bg: 'var(--md-lab-delta-critical-bg)' };
  }
  if ((min !== null && min !== '' && !isNaN(Number(min))) || (max !== null && max !== '' && !isNaN(Number(max)))) {
    return { status: 'NORMAL', label: 'Normal', color: 'var(--md-lab-delta-normal-text)', bg: 'var(--md-lab-delta-normal-bg)' };
  }
  return null;
};

/**
 * Phlebotomy Patient Safety Screening Chips Component
 */
const PhlebotomyRiskChips = ({ risks = {}, onToggleRisk, disabled }) => {
  const [localToggles, setLocalToggles] = React.useState({});

  // Reset local toggles if external risks prop synchronizes
  React.useEffect(() => {
    setLocalToggles({});
  }, [risks]);

  const effectiveRisks = { ...risks, ...localToggles };

  const riskList = [
    { key: 'syncopeRisk', label: 'Syncope / Fainting History', icon: 'sentiment_very_dissatisfied', color: 'var(--md-lab-tube-sst-text)', bg: 'var(--md-lab-tube-sst-bg)', border: 'var(--md-lab-tube-sst-border)' },
    { key: 'difficultVein', label: 'Difficult / Fragile Vein', icon: 'bloodtype', color: 'var(--md-lab-tube-edta-text)', bg: 'var(--md-lab-tube-edta-bg)', border: 'var(--md-lab-tube-edta-border)' },
    { key: 'anticoagulantTherapy', label: 'Anticoagulant Precaution', icon: 'medication', color: 'var(--md-lab-status-redraw-text)', bg: 'var(--md-lab-status-redraw-bg)', border: 'var(--md-lab-status-redraw-border)' },
    { key: 'latexAllergy', label: 'Latex / Skin Allergy', icon: 'coronavirus', color: 'var(--md-sys-color-error)', bg: 'var(--md-sys-color-error-container)', border: 'var(--md-sys-color-outline-variant)' },
  ];

  const handleChipClick = async (key, nextVal) => {
    setLocalToggles((prev) => ({ ...prev, [key]: nextVal }));
    try {
      if (onToggleRisk) {
        await onToggleRisk(key, nextVal);
      }
    } catch {
      setLocalToggles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="lwp-risk-screening">
      <div className="lwp-risk-screening__title">
        <span className="material-symbols-rounded">shield</span>
        <span>Phlebotomy Patient Safety Screening</span>
      </div>
      <div className="lwp-risk-screening__chips" role="group" aria-label="Phlebotomy safety risk screening flags">
        {riskList.map((r) => {
          const isActive = Boolean(effectiveRisks[r.key]);
          return (
            <button
              key={r.key}
              type="button"
              role="switch"
              aria-checked={isActive}
              className={`lwp-risk-chip ${isActive ? 'lwp-risk-chip--active' : ''}`}
              style={{
                backgroundColor: isActive ? r.bg : 'var(--md-sys-color-surface)',
                borderColor: isActive ? r.border || r.color : 'var(--md-sys-color-outline-variant)',
                color: isActive ? r.color : 'var(--md-sys-color-on-surface-variant)',
              }}
              onClick={() => handleChipClick(r.key, !isActive)}
              title={`${isActive ? 'Disable' : 'Enable'} ${r.label} precaution`}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{r.icon}</span>
              <span>{r.label}</span>
              {isActive && <span className="material-symbols-rounded lwp-risk-chip__check" style={{ fontSize: 14 }}>check</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Dedicated Lab Nurse Phlebotomy Accessioning Card (SRP)
 * Replaces numerical chemical entry with specimen tube printing, safety flags, and accessioning.
 */
const NurseAccessionCard = ({
  order,
  visit,
  tube,
  displayName,
  meta,
  collected,
  isCompleted,
  isAwaitingVerify,
  onCollect,
  onRecordVitals,
  onOpenBarcode,
  onToggleRisk,
  onChangeNotes,
  notesValue,
  disabled,
}) => {
  const barcode = order.specimenBarcode || `SPEC-${(order._id || order.id || '0000').slice(-6).toUpperCase()}`;

  return (
    <article className={`lwp-order lwp-order--${statusClass(order.status)}`}>
      <header className="lwp-order__header">
        <div className="lwp-order__titles">
          <div className="lwp-order__name-row">
            <span className="lwp-order__name">{displayName}</span>
            <Md3Chip variant={meta.variant} size="small" icon={meta.icon}>{meta.label}</Md3Chip>

            {/* Color-Coded Specimen Vacutainer Tube Badge */}
            <span
              className="lwp-tube-badge"
              style={{
                backgroundColor: tube.bg,
                color: tube.color,
                border: `1px solid ${tube.border || tube.color}`,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={tube.label}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>science</span>
              <span>{tube.label}</span>
            </span>

            <Md3Chip variant={isCompleted ? 'success' : isAwaitingVerify ? 'warning' : collected ? 'tertiary' : 'default'} size="small">
              {isCompleted ? 'Verified & Final' : isAwaitingVerify ? 'Awaiting Pathologist Verification' : collected ? 'Specimen Accessioned' : 'Awaiting Collection'}
            </Md3Chip>
          </div>
        </div>
        <div className="lwp-order__actions">
          {/* Step 1: Pre-Analytical Clinical Vitals */}
          <Md3Button
            variant="secondary"
            size="small"
            onClick={() => onRecordVitals && onRecordVitals(order)}
            title={order.labVitals?.isSkipped ? `Pre-vitals skipped: ${order.labVitals.skipReason}` : order.labVitals ? 'Pre-analytical vitals recorded' : 'Record pre-analytical vitals'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              {order.labVitals?.isSkipped ? 'cancel' : order.labVitals ? 'check_circle' : 'medical_information'}
            </span>
            <span>
              {order.labVitals?.isSkipped ? 'Vitals Skipped' : order.labVitals ? 'Lab Vitals Logged' : 'Lab Pre-Vitals'}
            </span>
          </Md3Button>

          {/* Step 2: Specimen Barcode & Tube Labeling */}
          <Md3Button
            variant="tonal"
            size="small"
            onClick={() => onOpenBarcode && onOpenBarcode(order)}
            title="Generate & print 2x1 thermal barcode sticker for collection tube"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>barcode_scanner</span>
            <span>Print Tube Label</span>
          </Md3Button>
        </div>
      </header>

      {/* Dynamic Specimen Redraw Remediation Engine */}
      {order.recollectionRequested && (
        <div style={{ padding: '0 16px' }}>
          <SpecimenRedrawRemediationCard
            order={order}
            visit={visit}
            onCollectRedraw={onCollect}
            onOpenBarcode={onOpenBarcode}
            disabled={disabled}
          />
        </div>
      )}

      <div className="lwp-order__body">
        {/* Phlebotomy Accessioning Information Box */}
        <div className="lwp-nurse-accession-card">
          <div className="lwp-nurse-accession-card__tube">
            <div className="lwp-tube-dot" style={{ backgroundColor: tube.color }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface)' }}>
                Required Tube: {tube.label} ({tube.code})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Specimen Type: <strong>{order.sampleType || 'Venous Blood'}</strong> · Barcode ID: <code>{barcode}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!collected ? (
              <Md3Button
                variant="filled"
                size="medium"
                onClick={() => onCollect && onCollect(order)}
                loading={disabled}
                className="lwp-collect-btn"
              >
                <Icon.Beaker />
                <span>Collect &amp; Accession Specimen</span>
              </Md3Button>
            ) : (
              <div className="lwp-accessioned-badge">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>check_circle</span>
                <span>Specimen Accessioned</span>
              </div>
            )}
          </div>
        </div>

        {/* Phlebotomy Risk Screening Flags */}
        <PhlebotomyRiskChips
          risks={order.phlebotomyRisks || {}}
          onToggleRisk={onToggleRisk}
          disabled={disabled}
        />

        {/* Phlebotomy Intake Notes */}
        <div className="lwp-order__notes">
          <div className="lwp-order__notes-label">
            <Icon.Clipboard />
            <span>Phlebotomy &amp; Specimen Observations</span>
          </div>
          <textarea
            className="lwp-order__notes-area"
            rows={2}
            placeholder="Record venipuncture site (e.g. left antecubital fossa), patient tolerance, or specimen remarks…"
            value={notesValue}
            onChange={(e) => onChangeNotes && onChangeNotes(order, e.target.value)}
            disabled={disabled}
            aria-label={`${displayName} phlebotomy notes`}
          />
        </div>

        {/* Footer info for nurse workflow */}
        <footer className="lwp-order__footer lwp-order__footer--info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-sys-color-primary)' }}>info</span>
            <span>
              {collected
                ? 'Sample collected. Machine analysis and numerical parameters will be processed by laboratory analyzers.'
                : 'Collect sample into color-coded tube and print barcode label before sending patient forward.'}
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
};

/**
 * OrderCard — Technical Chemistry & Machine Numerical Results Entry (SRP)
 */
const OrderCard = ({
  order,
  onCollect,
  onSaveResult,
  onRecordVitals,
  onOpenBarcode,
  onChangeField,
  onChangeNotes,
  disabled,
  orderLabs,
  results,
  notes,
  patientGender,
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
  const statusKey = (order.status || '').toUpperCase();
  const collected = statusKey !== 'PENDING_SAMPLE' && statusKey !== 'PENDING';
  const isCompleted = statusKey === 'COMPLETED' || statusKey === 'VERIFIED';
  const isAwaitingVerify = statusKey === 'AWAITING_VERIFICATION';
  const notesValue = notes !== undefined ? notes : (order.notes || '');
  const tube = getTubeColor(order.sampleType, displayName);
  const resolvedGender = patientGender || order._gender || '';

  return (
    <article className={`lwp-order lwp-order--${statusClass(order.status)}`}>
      <header className="lwp-order__header">
        <div className="lwp-order__titles">
          <div className="lwp-order__name-row">
            <span className="lwp-order__name">{displayName}</span>
            <Md3Chip variant={meta.variant} size="small" icon={meta.icon}>{meta.label}</Md3Chip>

            {/* Tube Accession Badge */}
            <span
              className="lwp-tube-badge"
              style={{
                backgroundColor: tube.bg,
                color: tube.color,
                border: `1px solid ${tube.border || tube.color}`,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={tube.label}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>science</span>
              <span>{tube.label}</span>
            </span>

            <Md3Chip variant={isCompleted ? 'success' : isAwaitingVerify ? 'warning' : collected ? 'tertiary' : 'default'} size="small">
              {isCompleted ? 'Verified & Final' : isAwaitingVerify ? 'Awaiting Pathologist Verification' : collected ? 'Processing' : 'Awaiting Sample'}
            </Md3Chip>
          </div>
        </div>
        <div className="lwp-order__actions">
          <Md3Button
            variant="secondary"
            size="small"
            onClick={() => onRecordVitals && onRecordVitals(order)}
            title={order.labVitals?.isSkipped ? `Pre-vitals skipped: ${order.labVitals.skipReason}` : order.labVitals ? 'Pre-analytical vitals recorded' : 'Record pre-analytical vitals'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              {order.labVitals?.isSkipped ? 'cancel' : order.labVitals ? 'check_circle' : 'medical_information'}
            </span>
            <span>
              {order.labVitals?.isSkipped ? 'Vitals Skipped' : order.labVitals ? 'Lab Vitals Logged' : 'Lab Pre-Vitals'}
            </span>
          </Md3Button>

          <Md3Button
            variant="tonal"
            size="small"
            onClick={() => onOpenBarcode && onOpenBarcode(order)}
            title="Generate & print 2x1 thermal barcode sticker for collection tube"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>barcode_scanner</span>
            <span>Print Tube Label</span>
          </Md3Button>

          {!collected && (
            <Md3Button
              variant="filled"
              size="small"
              onClick={() => onCollect && onCollect(order)}
              loading={disabled}
            >
              <Icon.Beaker />
              <span>Collect Specimen</span>
            </Md3Button>
          )}
        </div>
      </header>

      {/* Recollection Alert if specimen was rejected by Pathologist */}
      {order.recollectionRequested && (
        <div className="lwp-recollection-banner">
          <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-error)', fontSize: 20 }}>warning</span>
          <div>
            <strong style={{ color: 'var(--md-sys-color-error)', fontSize: '0.82rem', display: 'block' }}>Specimen Recollection Requested by Pathologist</strong>
            <span style={{ color: 'var(--md-sys-color-on-error-container)', fontSize: '0.75rem' }}>
              Reason: {order.rejectionReason || 'Specimen compromised. Please redraw sample.'}
            </span>
          </div>
        </div>
      )}

      {collected ? (
        <div className="lwp-order__body">
          <div className="lwp-order__fields" aria-label={`${displayName} result fields`}>
            {fields.length === 0 ? (
              <div className="lwp-order__no-fields">
                <Icon.Info />
                <span>No result fields defined. Record observations in technician notes below.</span>
              </div>
            ) : (
              <Md3Grid columns={2} gap="default">
                {fields.map((f, idx) => {
                  const fieldKey = f.key || f.label || f.name || String(idx);
                  const draftVal = results && Object.prototype.hasOwnProperty.call(results, fieldKey) ? results[fieldKey] : undefined;
                  const savedVal = order.results instanceof Map
                    ? order.results.get(fieldKey)
                    : (order.results && Object.prototype.hasOwnProperty.call(order.results, fieldKey) ? order.results[fieldKey] : undefined);
                  const value = draftVal !== undefined ? draftVal : (savedVal !== undefined ? savedVal : (f.defaultValue ?? ''));
                  const unit = f.unit ? ` (${f.unit})` : '';

                  const refMeta = resolveFieldReference(f, resolvedGender);
                  const liveEvaluation = f.type === 'Number' ? evaluateLiveRange(value, refMeta) : null;

                  return (
                    <Md3GridItem key={fieldKey}>
                      <div className="lwp-field-cell">
                        <div className="lwp-field-cell__header">
                          <span className="lwp-field-cell__ref">
                            {refMeta.text ? (
                              <span title={`Reference range for ${refMeta.label || 'standard'}`}>
                                Ref: {refMeta.text} {refMeta.label ? `(${refMeta.label})` : ''}
                              </span>
                            ) : null}
                          </span>
                          {liveEvaluation && (
                            <span
                              className="lwp-field-cell__badge"
                              style={{
                                color: liveEvaluation.color,
                                background: liveEvaluation.bg,
                              }}
                            >
                              {liveEvaluation.label}
                            </span>
                          )}
                        </div>
                        <Md3TextField
                          id={`lab-field-${order._id || order.id}-${fieldKey}`}
                          name={fieldKey}
                          label={`${f.label || f.name || 'Result'}${unit}`}
                          type="text"
                          value={value ?? ''}
                          onChange={(e) => onChangeField && onChangeField(order, f, e.target.value)}
                          disabled={disabled || isCompleted}
                        />
                      </div>
                    </Md3GridItem>
                  );
                })}
              </Md3Grid>
            )}
          </div>

          <div className="lwp-order__notes">
            <div className="lwp-order__notes-label">
              <Icon.Clipboard />
              <span>Technician remarks</span>
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

          {isAwaitingVerify ? (
            <footer className="lwp-order__footer lwp-order__footer--awaiting-verify">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--md-lab-tube-sst-text)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--md-lab-tube-sst-text)' }}>hourglass_top</span>
                <span>Results submitted to Pathologist for medical verification.</span>
              </div>
              <Md3Button
                variant="outlined"
                size="small"
                onClick={() => onSaveResult && onSaveResult(order)}
                loading={disabled}
              >
                <Icon.Save />
                <span>Update Results</span>
              </Md3Button>
            </footer>
          ) : !isCompleted ? (
            <footer className="lwp-order__footer">
              <Md3Button
                variant="filled"
                size="small"
                onClick={() => onSaveResult && onSaveResult(order)}
                loading={disabled}
              >
                <Icon.Save />
                <span>Submit for Pathologist Authorization</span>
              </Md3Button>
            </footer>
          ) : (
            <footer className="lwp-order__footer lwp-order__footer--authorized">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>verified</span>
              <span>Report Medically Authorized &amp; Released by Pathologist</span>
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
  onRecordVitals,
  onSavePhlebotomyRisks,
  onDispatchVisit,
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
  isNurseMode = true,
  currentUser,
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

  const [dispatchModal, setDispatchModal] = useState({
    isOpen: false,
    disposition: 'RETURN_TO_DOCTOR',
    notes: '',
  });

  const [barcodeModalOrder, setBarcodeModalOrder] = useState(null);

  const orders = useMemo(() => (visit?.labOrders ? [...visit.labOrders] : []), [visit]);
  const activeOrders = useMemo(() => {
    if (tabMode === 'REPORTED') return orders.filter((o) => (o.status || '').toUpperCase().includes('COMPLETE'));
    if (tabMode === 'SPECIMENS') return orders.filter((o) => (o.status || '').toUpperCase() !== 'PENDING_SAMPLE' && !(o.status || '').toUpperCase().includes('PENDING'));
    return orders;
  }, [orders, tabMode]);

  const completedOrders = useMemo(() => {
    return (visit?.labOrders || []).filter(
      (o) => (o.status || '').toUpperCase() === 'COMPLETED' || (o.status || '').toUpperCase() === 'VERIFIED'
    );
  }, [visit]);

  const [viewMode, setViewMode] = useState(() => {
    return (visit?.labOrders || []).some(
      (o) => (o.status || '').toUpperCase() === 'COMPLETED' || (o.status || '').toUpperCase() === 'VERIFIED'
    ) ? 'split' : 'orders';
  });

  // Automatically adapt viewMode when selected visit changes
  React.useEffect(() => {
    if (completedOrders.length > 0) {
      setViewMode('split');
    } else {
      setViewMode('orders');
    }
  }, [visit?._id, completedOrders.length]);

  const recordedVitals = useMemo(() => {
    const orderWithVitals = (visit?.labOrders || []).find(
      (o) => o.labVitals && (o.labVitals.preScanBp || o.labVitals.pulse || o.labVitals.temperature || o.labVitals.oxygenSaturation || o.labVitals.bloodGlucose || o.labVitals.patientWeightKg || o.labVitals.fastingHours != null || o.labVitals.isSkipped)
    );
    if (orderWithVitals?.labVitals) {
      if (orderWithVitals.labVitals.isSkipped) {
        return {
          isSkipped: true,
          skipReason: orderWithVitals.labVitals.skipReason || 'Clinically Exempted',
          source: 'Pre-Vitals Skipped',
        };
      }
      return {
        bp: orderWithVitals.labVitals.preScanBp,
        pulse: orderWithVitals.labVitals.pulse ? `${orderWithVitals.labVitals.pulse} bpm` : null,
        spo2: orderWithVitals.labVitals.oxygenSaturation ? `${orderWithVitals.labVitals.oxygenSaturation}%` : null,
        glucose: orderWithVitals.labVitals.bloodGlucose ? `${orderWithVitals.labVitals.bloodGlucose} mg/dL` : null,
        temp: orderWithVitals.labVitals.temperature ? `${orderWithVitals.labVitals.temperature}°F` : null,
        weight: orderWithVitals.labVitals.patientWeightKg ? `${orderWithVitals.labVitals.patientWeightKg} kg` : null,
        fasting: orderWithVitals.labVitals.fastingHours != null ? `${orderWithVitals.labVitals.fastingHours}h fasting` : null,
        source: 'Lab Pre-Vitals',
      };
    }
    if (visit?.vitals?.bloodPressure || visit?.vitals?.temperature || visit?.vitals?.pulse) {
      return {
        bp: visit.vitals.bloodPressure,
        pulse: visit.vitals.pulse ? `${visit.vitals.pulse} bpm` : null,
        temp: visit.vitals.temperature ? `${visit.vitals.temperature}°F` : null,
        weight: visit.vitals.weight ? `${visit.vitals.weight} kg` : null,
        source: 'Triage Vitals',
      };
    }
    return null;
  }, [visit]);

  const specimensCollectedCount = useMemo(() => {
    return (visit?.labOrders || []).filter((o) => (o.status || '').toUpperCase() !== 'PENDING_SAMPLE').length;
  }, [visit]);
  const totalOrdersCount = (visit?.labOrders || []).length;

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

  const handleToggleOrderRisk = async (order, riskKey, value) => {
    const targetOrderId = order?._id || order?.id;
    const targetVisitId = visit?._id || visit?.id;
    if (!onSavePhlebotomyRisks || !targetVisitId || !targetOrderId) return;
    const currentRisks = order.phlebotomyRisks || {};
    const updated = { ...currentRisks, [riskKey]: value };
    try {
      await onSavePhlebotomyRisks(targetVisitId, targetOrderId, updated);
    } catch (e) {
      console.warn('Failed to update phlebotomy risks:', e);
      throw e;
    }
  };

  const openPathologistDispatch = () => {
    setDispatchModal({
      isOpen: true,
      disposition: 'ROUTE_TO_PATHOLOGIST',
      notes: 'Intake and specimen collection concluded. Transferred to Diagnostic Lab Doctor (Pathologist) for Analysis & Verification.',
    });
  };

  const openDoctorDispatch = () => {
    setDispatchModal({
      isOpen: true,
      disposition: 'RETURN_TO_DOCTOR',
      notes: 'Intake concluded. Dispatched to Attending Doctor Consultation Queue.',
    });
  };

  const openBillingDispatch = () => {
    setDispatchModal({
      isOpen: true,
      disposition: 'ROUTE_TO_BILLING',
      notes: 'Direct Walk-In lab work dispatched to Billing / Cashier counter.',
    });
  };

  const handleConfirmDispatch = async () => {
    if (!onDispatchVisit || !visit?._id) return;
    try {
      await onDispatchVisit(visit._id, dispatchModal.disposition, dispatchModal.notes);
      setDispatchModal({ isOpen: false, disposition: 'ROUTE_TO_PATHOLOGIST', notes: '' });
    } catch (e) {
      console.warn('Dispatch failed:', e);
    }
  };

  if (!visit) {
    return (
      <div style={{ padding: '16px 8px', width: '100%' }}>
        <ClinicalStationIdleDeck preset="LABORATORY" />
      </div>
    );
  }

  const attendingDoctorName = formatDoctorName(visit?.referredBy || visit?.consultation?.doctorId || visit?.assignedDoctor || visit?.doctor);
  const patientFullName = [visit?.patientId?.firstName, visit?.patientId?.lastName].filter(Boolean).join(' ') || visit?.patientId?.fullName || 'Patient';

  /* ─── Active Orders List Element ─── */
  const activeOrdersListElement = (
    <>
      <div className="lwp-workbench__orders-header">
        <h3 className="lwp-workbench__orders-title">
          <Icon.Beaker />
          <span>Diagnostic Orders ({activeOrders.length})</span>
        </h3>
        {activeOrders.length > 0 && (
          <Md3Button
            variant="outlined"
            size="small"
            onClick={() => setBarcodeModalOrder(activeOrders[0])}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>print</span>
            <span>Print Tube Labels</span>
          </Md3Button>
        )}
      </div>

      {activeOrders.length === 0 ? (
        <Md3EmptyState
          icon={<Icon.FileSearch />}
          title="No matching test orders"
          subtitle="Select another patient or switch filters."
        />
      ) : (
        <div className="lwp-orders" role="list">
          {activeOrders.map((o) => {
            const displayName = o.testName || o.labName || 'Laboratory Order';
            const meta = priorityMeta(o.priority);
            const tube = getTubeColor(o.sampleType, displayName);
            const statusKey = (o.status || '').toUpperCase();
            const collected = statusKey !== 'PENDING_SAMPLE' && statusKey !== 'PENDING';
            const isCompleted = statusKey === 'COMPLETED' || statusKey === 'VERIFIED';
            const isAwaitingVerify = statusKey === 'AWAITING_VERIFICATION';

            if (isNurseMode) {
              return (
                <NurseAccessionCard
                  key={o._id || o.id}
                  order={o}
                  visit={visit}
                  tube={tube}
                  displayName={displayName}
                  meta={meta}
                  collected={collected}
                  isCompleted={isCompleted}
                  isAwaitingVerify={isAwaitingVerify}
                  onCollect={handleTriggerCollect}
                  onRecordVitals={onRecordVitals}
                  onOpenBarcode={(ord) => setBarcodeModalOrder(ord)}
                  onToggleRisk={(k, v) => handleToggleOrderRisk(o, k, v)}
                  onChangeNotes={onChangeNotes}
                  notesValue={notesForm[o._id || o.id] !== undefined ? notesForm[o._id || o.id] : (o.notes || '')}
                  disabled={disabled}
                />
              );
            }

            return (
              <OrderCard
                key={o._id || o.id}
                order={o}
                orderLabs={orderLabs}
                onCollect={handleTriggerCollect}
                onSaveResult={handleTriggerSubmit}
                onRecordVitals={onRecordVitals}
                onOpenBarcode={(ord) => setBarcodeModalOrder(ord)}
                onChangeField={onChangeField}
                onChangeNotes={onChangeNotes}
                disabled={disabled}
                results={resultsForm[o._id || o.id]}
                notes={notesForm[o._id || o.id]}
                patientGender={visit?.patientId?.gender || o._gender || ''}
              />
            );
          })}
        </div>
      )}

      {/* Secondary Quick-Dispatch Bottom Bar */}
      {activeOrders.length > 0 && (
        <div className="lwp-dispatch-deck lwp-dispatch-deck--bottom">
          <div className="lwp-dispatch-deck__prompt">
            <span className="material-symbols-rounded">task_alt</span>
            <span>Phlebotomy step complete? Hand over specimen to Lab Doctor for diagnostic analysis:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Md3Button
              variant="filled"
              size="small"
              className="lwp-dispatch-deck__btn-doctor"
              onClick={openPathologistDispatch}
              disabled={disabled}
            >
              <span className="material-symbols-rounded">biotech</span>
              <span>Hand Over Specimen to Lab Doctor</span>
            </Md3Button>
            {!isNurseMode && (
              <Md3Button
                variant="tonal"
                size="small"
                className="lwp-dispatch-deck__btn-billing"
                onClick={openBillingDispatch}
                disabled={disabled}
              >
                <span className="material-symbols-rounded">point_of_sale</span>
                <span>Route to Billing</span>
              </Md3Button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="lwp">
      {/* High-Density Single-Line Header Bar */}
      <LabPatientHeader
        visit={visit}
        completedOrdersCount={completedOrders.length}
        onToggleVerified={() => setViewMode((prev) => (prev === 'results' ? 'split' : 'results'))}
        viewMode={viewMode}
      />

      {/* Primary Clinical Handoff & Dispatch Banner for Lab Nurse */}
      <div className="lwp-dispatch-deck">
        <div className="lwp-dispatch-deck__status">
          <div className="lwp-dispatch-deck__tag">
            <span className="material-symbols-rounded">medical_services</span>
            <strong>Phlebotomy &amp; Clinical Intake Station</strong>
          </div>
          <div className="lwp-dispatch-deck__meta">
            <span className="lwp-dispatch-deck__specimen-badge">
              <span className="material-symbols-rounded">biotech</span>
              <span>{specimensCollectedCount}/{totalOrdersCount} Specimens Collected</span>
            </span>
            {recordedVitals ? (
              recordedVitals.isSkipped ? (
                <span className="lwp-dispatch-deck__vitals-badge lwp-dispatch-deck__vitals-badge--skipped" title={`Pre-Vitals Skipped: ${recordedVitals.skipReason}`}>
                  <span className="material-symbols-rounded">cancel</span>
                  <span>Pre-Vitals Skipped ({recordedVitals.skipReason})</span>
                </span>
              ) : (
                <span className="lwp-dispatch-deck__vitals-badge lwp-dispatch-deck__vitals-badge--recorded" title={recordedVitals.source}>
                  <span className="material-symbols-rounded">monitor_heart</span>
                  <span>
                    {recordedVitals.bp ? `BP: ${recordedVitals.bp}` : ''}
                    {recordedVitals.pulse ? ` • ${recordedVitals.pulse}` : ''}
                    {recordedVitals.spo2 ? ` • SpO2: ${recordedVitals.spo2}` : ''}
                    {recordedVitals.glucose ? ` • Glu: ${recordedVitals.glucose}` : ''}
                    {recordedVitals.temp ? ` • ${recordedVitals.temp}` : ''}
                    {recordedVitals.fasting ? ` • ${recordedVitals.fasting}` : ''}
                  </span>
                </span>
              )
            ) : (
              <span className="lwp-dispatch-deck__vitals-badge lwp-dispatch-deck__vitals-badge--missing">
                <span className="material-symbols-rounded">warning</span>
                <span>Pre-Vitals Pending</span>
              </span>
            )}
          </div>
        </div>

        <div className="lwp-dispatch-deck__actions">
          {onRecordVitals && activeOrders[0] && (
            <Md3Button
              variant="outlined"
              size="small"
              onClick={() => onRecordVitals(activeOrders[0])}
              disabled={disabled}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>vital_signs</span>
              <span>{recordedVitals ? (recordedVitals.isSkipped ? 'Review / Rollback Vitals' : 'Edit Pre-Vitals') : 'Record Pre-Vitals'}</span>
            </Md3Button>
          )}

          {activeOrders[0] && (
            <Md3Button
              variant="tonal"
              size="small"
              onClick={() => setBarcodeModalOrder(activeOrders[0])}
              disabled={disabled}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>barcode_scanner</span>
              <span>Print Barcode Sticker</span>
            </Md3Button>
          )}

          <Md3Button
            variant="filled"
            size="medium"
            className="lwp-dispatch-deck__btn-doctor"
            onClick={openPathologistDispatch}
            disabled={disabled}
            title="Hand over collected specimen & pre-vitals to Diagnostic Lab Doctor (Pathologist) for analysis & verification"
          >
            <span className="material-symbols-rounded">biotech</span>
            <span>Hand Over Specimen to Lab Doctor</span>
          </Md3Button>

          {!isNurseMode && (
            <Md3Button
              variant="tonal"
              size="medium"
              className="lwp-dispatch-deck__btn-billing"
              onClick={openBillingDispatch}
              disabled={disabled}
              title="Route direct walk-in patient directly to Cashier / Billing"
            >
              <span className="material-symbols-rounded">point_of_sale</span>
              <span>Route to Billing</span>
            </Md3Button>
          )}
        </div>
      </div>

      {/* Material 3 Segmented Clinical Workspace View Controls */}
      <div className="lwp-workspace-toolbar" role="tablist" aria-label="Clinical workspace view modes">
        <div className="lwp-segmented-group">
          {completedOrders.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'split'}
              className={`lwp-segment-btn ${viewMode === 'split' ? 'is-active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Side-by-side split view: Active Orders & Verified Diagnostic Log"
            >
              <span className="material-symbols-rounded">splitscreen</span>
              <span>Split View</span>
              <span className="lwp-segment-badge lwp-segment-badge--split">Active + Verified</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'orders'}
            className={`lwp-segment-btn ${viewMode === 'orders' ? 'is-active' : ''}`}
            onClick={() => setViewMode('orders')}
            title="Focus on Active Intake & Test Orders"
          >
            <span className="material-symbols-rounded">bloodtype</span>
            <span>Active Orders</span>
            <span className="lwp-segment-badge">{activeOrders.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'results'}
            className={`lwp-segment-btn ${viewMode === 'results' ? 'is-active' : ''}`}
            onClick={() => setViewMode('results')}
            title="View Reported Results & Verified Diagnostic Log"
          >
            <span className="material-symbols-rounded">verified</span>
            <span>Verified Findings &amp; Scans</span>
            <span className={`lwp-segment-badge ${completedOrders.length > 0 ? 'lwp-segment-badge--success' : ''}`}>
              {completedOrders.length}
            </span>
          </button>

          {specimenTrackerSlot && (
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'specimens'}
              className={`lwp-segment-btn ${viewMode === 'specimens' ? 'is-active' : ''}`}
              onClick={() => setViewMode('specimens')}
              title="View Specimen Collection Timeline"
            >
              <span className="material-symbols-rounded">timeline</span>
              <span>Specimen Tracker</span>
              <span className="lwp-segment-badge">{totalOrdersCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Adaptive Multi-Mode Clinical Workbench */}
      {viewMode === 'split' ? (
        <div className="lwp-workbench lwp-workbench--split">
          <section className="lwp-workbench__col lwp-workbench__col--primary" aria-label="Active orders and accessioning column">
            {activeOrdersListElement}
            {specimenTrackerSlot ? (
              <div className="lwp-split-specimen-section">
                {specimenTrackerSlot}
              </div>
            ) : null}
          </section>

          <section className="lwp-workbench__col lwp-workbench__col--verified" aria-label="Verified diagnostic results column">
            {resultsGridSlot || (
              <div className="results-grid__empty-box">
                <Icon.Clipboard style={{ width: '18px', height: '18px', color: 'var(--md-sys-color-outline)' }} />
                <span>No reported results yet. Completed tests will appear here.</span>
              </div>
            )}
          </section>
        </div>
      ) : viewMode === 'results' ? (
        <div className="lwp-workbench lwp-workbench--full">
          <section className="lwp-workbench__col lwp-workbench__col--full" aria-label="Reported results full view">
            {resultsGridSlot}
          </section>
        </div>
      ) : viewMode === 'specimens' ? (
        <div className="lwp-workbench lwp-workbench--full">
          <section className="lwp-workbench__col lwp-workbench__col--full" aria-label="Specimen tracker full view">
            {specimenTrackerSlot}
          </section>
        </div>
      ) : (
        <div className="lwp-workbench lwp-workbench--orders">
          {specimenTrackerSlot ? (
            <section className="lwp-workbench__col lwp-workbench__col--specimen" aria-label="Specimen tracker column">
              {specimenTrackerSlot}
            </section>
          ) : null}

          <section className="lwp-workbench__col lwp-workbench__col--orders" aria-label="Order result entry column">
            {activeOrdersListElement}

            {/* Quick Context Banner for Verified Results when in Orders Mode */}
            {completedOrders.length > 0 && (
              <div
                className="lwp-verified-dock-banner"
                onClick={() => setViewMode('split')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewMode('split'); }}
                title="Click to view verified diagnostic reports in split view"
              >
                <div className="lwp-verified-dock-banner__left">
                  <span className="material-symbols-rounded">verified</span>
                  <div>
                    <strong>{completedOrders.length} Reported &amp; Verified Diagnostic Result{completedOrders.length === 1 ? '' : 's'} Available</strong>
                    <span>Includes {completedOrders.map((o) => o.testName || 'Diagnostic Report').join(', ')}. Click to open side-by-side.</span>
                  </div>
                </div>
                <Md3Button variant="tonal" size="small" onClick={(e) => { e.stopPropagation(); setViewMode('split'); }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>splitscreen</span>
                  <span>Open Split View</span>
                </Md3Button>
              </div>
            )}
          </section>
        </div>
      )}

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

      {/* Barcode Sticker Modal */}
      {barcodeModalOrder && (
        <SpecimenBarcodeModal
          isOpen={Boolean(barcodeModalOrder)}
          onClose={() => setBarcodeModalOrder(null)}
          visit={visit}
          order={barcodeModalOrder}
        />
      )}

      {/* Clinical Handoff & Dispatch Modal */}
      {dispatchModal.isOpen && (
        <div className="lwp-handoff-modal-overlay" role="dialog" aria-modal="true">
          <div className="lwp-handoff-modal">
            <header className="lwp-handoff-modal__header">
              <div className={`lwp-handoff-modal__header-icon ${dispatchModal.disposition === 'ROUTE_TO_BILLING' ? 'lwp-handoff-modal__header-icon--billing' : ''}`}>
                <span className="material-symbols-rounded">
                  {dispatchModal.disposition === 'ROUTE_TO_PATHOLOGIST'
                    ? 'biotech'
                    : dispatchModal.disposition === 'RETURN_TO_DOCTOR'
                    ? 'stethoscope'
                    : 'point_of_sale'}
                </span>
              </div>
              <div>
                <h3 className="lwp-handoff-modal__title">
                  {dispatchModal.disposition === 'ROUTE_TO_PATHOLOGIST'
                    ? 'Hand Over Specimen to Diagnostic Lab Doctor?'
                    : dispatchModal.disposition === 'RETURN_TO_DOCTOR'
                    ? 'Send Patient to OPD Doctor?'
                    : 'Route Patient to Billing / Cashier?'}
                </h3>
                <p className="lwp-handoff-modal__subtitle">
                  {dispatchModal.disposition === 'ROUTE_TO_PATHOLOGIST'
                    ? 'This will transfer the collected specimen and intake pre-vitals to the Diagnostic Lab Doctor\'s verification worklist. The patient remains in the laboratory workflow until the Pathologist medically authorizes the report.'
                    : dispatchModal.disposition === 'RETURN_TO_DOCTOR'
                    ? 'This will immediately transfer the patient to the Doctor\'s consultation review queue.'
                    : 'This will route the patient directly to Billing / Cashier settlement.'}
                </p>
              </div>
            </header>

            <div className="lwp-handoff-modal__body">
              <div className="lwp-handoff-modal__patient-strip">
                <div>
                  <strong>{patientFullName}</strong>
                  <span className="lwp-handoff-modal__patient-sub">
                    ({visit?.patientId?.mrn ? `MRN-${visit.patientId.mrn}` : 'MRN: —'} • Token {visit?.tokenString || '—'})
                  </span>
                </div>
                  <div className="lwp-handoff-modal__dest-label">
                    {dispatchModal.disposition === 'ROUTE_TO_PATHOLOGIST'
                      ? 'Diagnostic Lab Doctor (Pathologist)'
                      : dispatchModal.disposition === 'RETURN_TO_DOCTOR'
                      ? attendingDoctorName
                      : 'Billing Desk'}
                  </div>
              </div>

              {recordedVitals ? (
                <div className="lwp-handoff-modal__vitals-alert lwp-handoff-modal__vitals-alert--success">
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>
                    Recorded Pre-Vitals will be transferred with specimen: <strong>BP {recordedVitals.bp || '—'}</strong>{recordedVitals.temp ? `, Temp ${recordedVitals.temp}` : ''}{recordedVitals.pulse ? `, Pulse ${recordedVitals.pulse}` : ''}{recordedVitals.fasting ? `, Fasting ${recordedVitals.fasting}` : ''}
                  </span>
                </div>
              ) : (
                <div className="lwp-handoff-modal__vitals-alert lwp-handoff-modal__vitals-alert--warning">
                  <span className="material-symbols-rounded">info</span>
                  <span>No lab pre-vitals recorded yet. You can still hand over the specimen now or record them first.</span>
                </div>
              )}

              <div>
                <label className="lwp-handoff-modal__notes-label">
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>clinical_notes</span>
                  <span>Phlebotomy Handover Remarks &amp; Observations</span>
                </label>
                <textarea
                  className="lwp-handoff-modal__textarea"
                  rows={3}
                  value={dispatchModal.notes}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. CBC EDTA and SST serum tubes drawn, labeled with barcode, handed over to Analytical Deck..."
                />
              </div>
            </div>

            <footer className="lwp-handoff-modal__footer">
              <Md3Button
                variant="outlined"
                size="medium"
                onClick={() => setDispatchModal({ isOpen: false, disposition: 'ROUTE_TO_PATHOLOGIST', notes: '' })}
                disabled={disabled}
              >
                <span>Cancel</span>
              </Md3Button>
              <Md3Button
                variant="filled"
                size="medium"
                className="lwp-dispatch-deck__btn-doctor"
                onClick={handleConfirmDispatch}
                loading={disabled}
              >
                <span className="material-symbols-rounded">send</span>
                <span>
                  {dispatchModal.disposition === 'ROUTE_TO_PATHOLOGIST'
                    ? 'Confirm & Hand Over to Lab Doctor'
                    : dispatchModal.disposition === 'RETURN_TO_DOCTOR'
                    ? 'Confirm & Send to Doctor'
                    : 'Confirm & Route to Billing'}
                </span>
              </Md3Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabResultWorksheet;
