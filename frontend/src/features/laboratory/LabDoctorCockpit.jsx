import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import PrintableLabReportDialog from './PrintableLabReportDialog';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import Md3ScanViewerDialog from '../../components/md3/Md3ScanViewerDialog';
import Md3FileUpload from '../../components/md3/Md3FileUpload';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import api from '../../services/api';
import { formatQueueWaitTime as timeSince } from '../../utils/dateFormatting';
import { formatDoctorName } from '../../utils/patientFormatters';
import './laboratory.tokens.css';
import './LabDoctorCockpit.css';

/**
 * Standard Medical Impression Quick Phrases for Senior Pathologist & Radiologist
 */
const QUICK_IMPRESSIONS = [
  'Within normal biological reference intervals.',
  'Normocytic normochromic red cell picture.',
  'Microcytic hypochromic picture; recommend Serum Ferritin correlation.',
  'Mild neutrophilic leukocytosis suggestive of reactive/inflammatory etiology.',
  'Adequate platelet count on peripheral smear review.',
  'Thrombocytopenia noted; repeat EDTA sample recommended if clumping suspected.',
  'No acute cardiopulmonary abnormality detected on imaging.',
  'Lung fields are clear bilaterally with normal vascular markings.',
  'Cardiac silhouette and mediastinal contours are within normal limits.',
  'No focal consolidation, pneumothorax, or pleural effusion visualized.',
  'Findings medically validated; clinically correlate with patient symptomatology.',
];

/**
 * Rejection Reasons for Compromised Diagnostic Specimen
 */
const REJECTION_REASONS = [
  'Severe specimen hemolysis noted (RBC lysis)',
  'Grossly clotted whole blood sample (fibrin formation)',
  'Quantity Not Sufficient (QNS) for automated analytical run',
  'Compromised / leaking vacutainer tube',
  'Improper collection vacutainer / incorrect additive',
  'Sample labeling discrepancy / unbarcoded collection vial',
  'Lipemic serum interfering with optical assay',
];

/**
 * Vacutainer tube styling helper mapping to Material 3 design tokens
 */
const getTubeBadge = (sampleType, testName) => {
  const name = (testName || '').toLowerCase();
  const type = (sampleType || '').toLowerCase();
  if (name.includes('cbc') || name.includes('hemogram') || type.includes('edta')) {
    return { className: 'ldc-tube--edta', label: 'EDTA Lavender Top', shortLabel: 'EDTA Lavender' };
  }
  if (name.includes('coagulation') || name.includes('pt/inr') || type.includes('citrate')) {
    return { className: 'ldc-tube--citrate', label: 'Sodium Citrate Light Blue', shortLabel: 'Citrate Blue' };
  }
  if (name.includes('glucose') || type.includes('fluoride')) {
    return { className: 'ldc-tube--fluoride', label: 'Sodium Fluoride Gray', shortLabel: 'Fluoride Gray' };
  }
  if (name.includes('culture') || type.includes('swab')) {
    return { className: 'ldc-tube--sterile', label: 'Sterile Swab', shortLabel: 'Sterile Swab' };
  }
  return { className: 'ldc-tube--sst', label: 'SST Gold Top', shortLabel: 'SST Gold' };
};

/**
 * Resolve state styling, pill labels, and clinical context
 */
const resolveCockpitState = (item) => {
  const { primaryCategory, orderStatus, visitStatus, isRedraw, isDispatchedToDoctor } = item;

  if (isRedraw || primaryCategory === 'RECOLLECT_SAMPLE') {
    return {
      label: 'Redraw Requisition',
      shortLabel: 'Redraw',
      icon: 'replay',
      className: 'ldc-pill--redraw',
      badgeClass: 'lab-state-badge--redraw',
      dotColor: '#d97706',
      description: 'Specimen rejected / compromised; flagged for nurse redraw',
    };
  }

  if (primaryCategory === 'AWAITING_VERIFICATION' || orderStatus === 'AWAITING_VERIFICATION') {
    return {
      label: 'Awaiting Verification',
      shortLabel: 'Verify',
      icon: 'verified_user',
      className: 'ldc-pill--verify',
      badgeClass: 'lab-state-badge--verify',
      dotColor: 'var(--md-sys-color-primary, #006a6a)',
      pulse: true,
      description: 'Analytical run complete; awaiting Pathologist medical authorization',
    };
  }

  if (primaryCategory === 'AT_DOCTOR_REVIEW' || isDispatchedToDoctor || visitStatus === 'WAITING_DOCTOR_REVIEW') {
    return {
      label: 'At Doctor (Review Pending)',
      shortLabel: 'At Doctor',
      icon: 'stethoscope',
      className: 'ldc-pill--doctor',
      badgeClass: 'lab-state-badge--doctor',
      dotColor: '#3b82f6',
      pulse: true,
      description: 'Patient dispatched to Attending Physician for clinical review',
    };
  }

  if (primaryCategory === 'IN_ANALYSIS' || orderStatus === 'PROCESSING' || orderStatus === 'IN_ANALYSIS') {
    return {
      label: 'Under Analysis',
      shortLabel: 'Analysis',
      icon: 'biotech',
      className: 'ldc-pill--analysis',
      badgeClass: 'lab-state-badge--analysis',
      dotColor: '#8b5cf6',
      pulse: true,
      description: 'Specimen accessioned; active analyzer telemetry running',
    };
  }

  if (primaryCategory === 'COMPLETED' || orderStatus === 'VERIFIED' || orderStatus === 'COMPLETED') {
    return {
      label: 'Report Authorized',
      shortLabel: 'Authorized',
      icon: 'check_circle',
      className: 'ldc-pill--authorized',
      badgeClass: 'lab-state-badge--authorized',
      dotColor: '#10b981',
      description: 'Diagnostic report medically signed & archived',
    };
  }

  return {
    label: 'Awaiting Phlebotomy',
    shortLabel: 'Intake',
    icon: 'hourglass_empty',
    className: 'ldc-pill--phlebotomy',
    badgeClass: 'lab-state-badge--phlebotomy',
    dotColor: '#94a3b8',
    description: 'Patient in Phlebotomy queue for sample collection & pre-vitals',
  };
};

/**
 * LabDoctorQueueCard — Material 3 Expressive Diagnostic Worklist Card Component
 * Supports both single investigations and multi-test patient encounter batteries
 */
const LabDoctorQueueCard = ({
  encounter,
  isSelected,
  onSelect,
  activeOrderId,
}) => {
  const { visit, orders = [], primaryCategory } = encounter;
  const p = visit.patientId || {};
  const isDeleted = Boolean(p.isDeleted || p.isOrphaned);
  const pName = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Unnamed Patient';
  const initials = isDeleted
    ? 'DP'
    : (((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'PT');
  const token = visit.tokenString || (visit.visitNumber ? visit.visitNumber.slice(-4) : 'PT');
  const formattedMrn = p.mrn
    ? (p.mrn === 'DELETED-RECORD' || p.mrn.startsWith('PT-') || p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`)
    : 'MRN: N/A';
  const waitFormatted = timeSince(visit.createdAt || orders[0]?.order?.createdAt);
  const totalTests = orders.length;
  const isMultiTest = totalTests > 1;

  // Derive top state metadata
  const topOrder = orders[0] || {};
  const stateMeta = topOrder.stateMeta || resolveCockpitState({
    primaryCategory,
    orderStatus: topOrder.orderStatus,
    visitStatus: visit.status,
    isRedraw: topOrder.isRedraw,
    isDispatchedToDoctor: topOrder.isDispatchedToDoctor,
  });

  return (
    <div
      className={`ldc-card ${isSelected ? 'ldc-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Select patient ${pName}, ${token}, ${totalTests} test investigations`}
    >
      {/* ── 1. Top Header Row: Monospace Token Badge + Status Pill & STAT / Multi-Test Flag ── */}
      <div className="ldc-card__header">
        <div className="ldc-card__token-badge">
          <span className="material-symbols-rounded ldc-card__token-icon">tag</span>
          <span className="ldc-card__token-text">{token}</span>
        </div>

        <div className="ldc-card__badges-group">
          {encounter.hasStat && (
            <span className="ldc-card__stat-chip" title="Urgent / STAT Investigation Battery">
              <span className="material-symbols-rounded">bolt</span>
              <span>STAT</span>
            </span>
          )}
          {isMultiTest && (
            <span className="ldc-card__count-badge" title={`${totalTests} diagnostic investigations in this encounter`}>
              <span className="material-symbols-rounded">playlist_add_check</span>
              <span>{totalTests} Tests</span>
            </span>
          )}
          <span className={`ldc-card__status-pill ${stateMeta.className}`} title={stateMeta.label}>
            <span className="material-symbols-rounded">{stateMeta.icon}</span>
            <span>{stateMeta.shortLabel}</span>
          </span>
        </div>
      </div>

      {/* ── 2. Patient Profile Row: Circular Initials Avatar + Patient Name + Demographic Chip ── */}
      <div className="ldc-card__patient-row">
        <div className="ldc-card__avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="ldc-card__patient-info">
          <h4 className="ldc-card__patient-name" title={pName}>
            {pName}
          </h4>
          <div className="ldc-card__demog-line">
            {p.gender && <span className="ldc-card__gender-tag">{p.gender}</span>}
            {p.gender && p.age && p.age !== '—' && !isNaN(Number(p.age)) && <span className="ldc-card__demog-dot">•</span>}
            {p.age && p.age !== '—' && !isNaN(Number(p.age)) && <span className="ldc-card__age-tag">{p.age} yrs</span>}
            {isDeleted && <span className="ldc-card__archived-pill">Archived</span>}
          </div>
        </div>
      </div>

      {/* ── 3. Diagnostic Investigation Section: Single Box or Multi-Test Pill Strip ── */}
      {!isMultiTest ? (
        <div className="ldc-card__test-box">
          <div className="ldc-card__test-main">
            <span className="material-symbols-rounded ldc-card__test-icon">biotech</span>
            <span className="ldc-card__test-title" title={topOrder.order?.testName || 'Laboratory Test'}>
              {topOrder.order?.testName || 'Laboratory Test'}
            </span>
          </div>
          {topOrder.tubeInfo && (
            <span className={`ldc-card__tube-tag ${topOrder.tubeInfo.className}`} title={topOrder.tubeInfo.label}>
              <span className="ldc-card__tube-indicator" />
              <span>{topOrder.tubeInfo.shortLabel}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="ldc-card__tests-strip">
          {orders.map(({ order, tubeInfo, stateMeta: itemState }) => {
            const isOrderActive = String(activeOrderId) === String(order._id || order.id);
            return (
              <div
                key={order._id || order.id}
                className={`ldc-card__test-pill ${isOrderActive ? 'ldc-card__test-pill--active' : ''}`}
              >
                <div className="ldc-card__test-pill-left">
                  <span
                    className="ldc-card__test-pill-dot"
                    style={{ backgroundColor: itemState?.dotColor || '#006a6a' }}
                  />
                  <span className="ldc-card__test-pill-name" title={order.testName}>
                    {order.testName}
                  </span>
                </div>
                {tubeInfo && (
                  <span className={`ldc-card__test-pill-tube ${tubeInfo.className}`}>
                    {tubeInfo.shortLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Card Footer: MRN Pill + Timestamp ── */}
      <div className="ldc-card__footer">
        <div className="ldc-card__mrn-box" title={`Medical Record Number: ${formattedMrn}`}>
          <span className="material-symbols-rounded ldc-card__mrn-icon">fingerprint</span>
          <span className="ldc-card__mrn-text">{formattedMrn}</span>
        </div>
        <div className="ldc-card__time-box" title={`Registered ${waitFormatted}`}>
          <span className="material-symbols-rounded ldc-card__time-icon">schedule</span>
          <span className="ldc-card__time-text">{waitFormatted}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * LabDoctorCockpit — Senior Pathologist & Diagnostic Verification Workspace
 */
export const LabDoctorCockpit = ({
  visits = [],
  historyVisits = [],
  reportedVisits = [],
  selectedVisit,
  onSelectVisit,
  onVerifyOrder,
  onBroadcastPanic,
  onFetchPatientHistory,
  onSubmitResult,
  onCollectSample,
  onDispatchVisit,
  laboratories = [],
  currentUser,
}) => {
  const { showError, showWarning, showSuccess } = useToast();
  const [doctorNotes, setDoctorNotes] = useState('');
  const [clinicalImpression, setClinicalImpression] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Multi-Stage State Selector Matrix
  const [stateFilter, setStateFilter] = useState('AWAITING_VERIFICATION');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Scans
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionNote, setCustomRejectionNote] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Emergency Panic Broadcast State
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [panicNotes, setPanicNotes] = useState('');
  const [broadcastingPanic, setBroadcastingPanic] = useState(false);

  // Inline Parameter Result Editing State
  const [isEditingResults, setIsEditingResults] = useState(false);
  const [tableResultForm, setTableResultForm] = useState({});
  const [savingTableResults, setSavingTableResults] = useState(false);

  // Diagnostic Scan Files State
  const [orderScans, setOrderScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [selectedScanReportId, setSelectedScanReportId] = useState(null);

  // 1. Extract and group all laboratory items by patient encounter (visit)
  const encounterList = useMemo(() => {
    const map = new Map();

    const processVisit = (v, source) => {
      if (!v) return;
      const vId = String(v._id || v.id || '');
      if (!vId) return;

      const visitStatus = (v.status || '').toUpperCase();
      const labOrders = v.labOrders || [];

      if (!map.has(vId)) {
        map.set(vId, {
          visitId: vId,
          visit: v,
          source,
          orders: [],
        });
      }

      const encounter = map.get(vId);

      labOrders.forEach((order) => {
        const orderStatus = (order.status || 'PENDING_SAMPLE').toUpperCase();
        const isRedraw = Boolean(order.recollectionRequested || orderStatus === 'RECOLLECT_SAMPLE');
        const isDispatchedToDoctor = (visitStatus === 'WAITING_DOCTOR_REVIEW' && (orderStatus === 'VERIFIED' || orderStatus === 'COMPLETED')) || v.phlebotomyDestination === 'DOCTOR';

        let primaryCategory = 'WAITING_NURSE';
        if (isRedraw) {
          primaryCategory = 'RECOLLECT_SAMPLE';
        } else if (orderStatus === 'AWAITING_VERIFICATION') {
          primaryCategory = 'AWAITING_VERIFICATION';
        } else if (orderStatus === 'VERIFIED' || orderStatus === 'COMPLETED' || visitStatus === 'COMPLETED') {
          primaryCategory = 'COMPLETED';
        } else if (orderStatus === 'PROCESSING' || orderStatus === 'IN_ANALYSIS') {
          if (v.phlebotomyDestination === 'PATHOLOGIST') {
            primaryCategory = 'AWAITING_VERIFICATION';
          } else {
            primaryCategory = 'IN_ANALYSIS';
          }
        } else if (orderStatus === 'PENDING_SAMPLE' || orderStatus === 'PENDING') {
          if (v.phlebotomyDispatched && v.phlebotomyDestination === 'PATHOLOGIST') {
            primaryCategory = 'AWAITING_VERIFICATION';
          } else if (isDispatchedToDoctor) {
            primaryCategory = 'AT_DOCTOR_REVIEW';
          } else {
            primaryCategory = 'WAITING_NURSE';
          }
        }

        const stateMeta = resolveCockpitState({ primaryCategory, orderStatus, visitStatus, isRedraw, isDispatchedToDoctor });
        const tubeInfo = getTubeBadge(order.sampleType, order.testName);

        if (!encounter.orders.some((o) => String(o.order._id || o.order.id) === String(order._id || order.id))) {
          encounter.orders.push({
            order,
            primaryCategory,
            orderStatus,
            visitStatus,
            isRedraw,
            isDispatchedToDoctor,
            stateMeta,
            tubeInfo,
          });
        }
      });
    };

    (visits || []).forEach((v) => processVisit(v, 'active'));
    (historyVisits || []).forEach((v) => processVisit(v, 'history'));
    (reportedVisits || []).forEach((v) => processVisit(v, 'reported'));

    return Array.from(map.values()).map((enc) => {
      let topCategory = 'COMPLETED';
      if (enc.orders.some((o) => o.primaryCategory === 'RECOLLECT_SAMPLE')) topCategory = 'RECOLLECT_SAMPLE';
      else if (enc.orders.some((o) => o.primaryCategory === 'AWAITING_VERIFICATION')) topCategory = 'AWAITING_VERIFICATION';
      else if (enc.orders.some((o) => o.primaryCategory === 'IN_ANALYSIS')) topCategory = 'IN_ANALYSIS';
      else if (enc.orders.some((o) => o.primaryCategory === 'WAITING_NURSE')) topCategory = 'WAITING_NURSE';
      else if (enc.orders.some((o) => o.primaryCategory === 'AT_DOCTOR_REVIEW')) topCategory = 'AT_DOCTOR_REVIEW';
      else if (enc.orders.length === 0) topCategory = 'WAITING_NURSE';

      const hasStat = enc.orders.some((o) => (o.order.priority || '').toUpperCase() === 'STAT' || (o.order.priority || '').toUpperCase() === 'URGENT');
      const hasDirectWalkin = enc.orders.some((o) => o.order.origin === 'DIRECT_WALKIN');

      return {
        ...enc,
        primaryCategory: topCategory,
        hasStat,
        hasDirectWalkin,
        totalOrders: enc.orders.length,
      };
    });
  }, [visits, historyVisits, reportedVisits]);

  // 2. Live category counts based on patient encounters
  const categoryCounts = useMemo(() => {
    const c = {
      AWAITING_VERIFICATION: 0,
      AT_DOCTOR_REVIEW: 0,
      IN_ANALYSIS: 0,
      WAITING_NURSE: 0,
      RECOLLECT_SAMPLE: 0,
      COMPLETED: 0,
      ALL: 0,
    };
    encounterList.forEach((enc) => {
      const uniqueCats = new Set(enc.orders.map((o) => o.primaryCategory));
      if (uniqueCats.size === 0) uniqueCats.add(enc.primaryCategory);
      uniqueCats.forEach((cat) => {
        if (c[cat] !== undefined) c[cat]++;
      });
      if (!enc.orders.every((o) => o.primaryCategory === 'COMPLETED')) {
        c.ALL++;
      } else if (enc.orders.length === 0) {
        c.ALL++;
      }
    });
    return c;
  }, [encounterList]);

  // 3. Filter encounters
  const filteredEncounters = useMemo(() => {
    return encounterList.filter((enc) => {
      if (stateFilter !== 'ALL') {
        const hasMatching = enc.orders.some((o) => o.primaryCategory === stateFilter);
        if (!hasMatching && enc.primaryCategory !== stateFilter) return false;
      } else {
        if (enc.orders.every((o) => o.primaryCategory === 'COMPLETED') && !searchQuery.trim()) {
          return false;
        }
      }

      if (urgencyFilter === 'STAT' && !enc.hasStat) return false;
      if (urgencyFilter === 'CLINICAL' && enc.hasDirectWalkin) return false;
      if (urgencyFilter === 'WALKIN' && !enc.hasDirectWalkin) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = enc.visit.patientId || {};
        const pName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const token = (enc.visit.tokenString || '').toLowerCase();
        const docName = (enc.visit.consultation?.doctorId?.fullName || enc.visit.referredBy || '').toLowerCase();
        const testsMatch = enc.orders.some(
          (o) => (o.order.testName || '').toLowerCase().includes(q) || (o.order.testCode || '').toLowerCase().includes(q)
        );

        return pName.includes(q) || mrn.includes(q) || token.includes(q) || docName.includes(q) || testsMatch;
      }

      return true;
    });
  }, [encounterList, stateFilter, urgencyFilter, searchQuery]);

  // 4. Currently selected encounter and active order
  const activeEncounter = useMemo(() => {
    if (!selectedVisit) return null;
    const vId = String(selectedVisit._id || selectedVisit.id);
    return encounterList.find((e) => e.visitId === vId) || null;
  }, [selectedVisit, encounterList]);

  const currentOrders = useMemo(() => activeEncounter?.orders || [], [activeEncounter]);

  const activeItem = useMemo(() => {
    if (!currentOrders.length) return null;
    if (selectedOrderId) {
      const found = currentOrders.find((o) => String(o.order._id || o.order.id) === String(selectedOrderId));
      if (found) return found;
    }
    return currentOrders[0];
  }, [currentOrders, selectedOrderId]);

  const activeOrder = activeItem?.order || null;

  // Auto-select first encounter & order if none selected or if selectedVisit is not in the filtered queue
  useEffect(() => {
    if (filteredEncounters.length > 0) {
      const currentSelectedId = selectedVisit ? String(selectedVisit._id || selectedVisit.id) : null;
      const isSelectedInFiltered = currentSelectedId && filteredEncounters.some(
        (enc) => String(enc.visit?._id || enc.visit?.id) === currentSelectedId
      );
      if (!isSelectedInFiltered) {
        const firstEnc = filteredEncounters[0];
        onSelectVisit(firstEnc.visit);
        if (firstEnc.orders.length > 0) {
          setSelectedOrderId(firstEnc.orders[0].order._id || firstEnc.orders[0].order.id);
        } else {
          setSelectedOrderId(null);
        }
      }
    } else if (filteredEncounters.length === 0 && selectedVisit) {
      onSelectVisit(null);
      setSelectedOrderId(null);
    }
  }, [filteredEncounters, selectedVisit, onSelectVisit]);

  // Sync tableResultForm when active order changes
  useEffect(() => {
    if (activeOrder?.results) {
      const raw = activeOrder.results instanceof Map
        ? Object.fromEntries(activeOrder.results)
        : activeOrder.results;
      setTableResultForm({ ...raw });
    } else {
      setTableResultForm({});
    }
    setIsEditingResults(false);
  }, [activeOrder?._id]);

  // Fetch patient historical verified encounters
  useEffect(() => {
    const rawPatient = selectedVisit?.patientId;
    const isDeleted = Boolean(rawPatient?.isDeleted || rawPatient?.isOrphaned);
    const resolvedPatientId = (typeof rawPatient === 'object' && rawPatient !== null)
      ? (rawPatient._id || rawPatient.id)
      : (typeof rawPatient === 'string' && rawPatient !== '[object Object]' ? rawPatient : null);

    if (resolvedPatientId && !isDeleted && activeOrder && onFetchPatientHistory) {
      setLoadingHistory(true);
      onFetchPatientHistory(resolvedPatientId, activeOrder.testCode)
        .then((history) => {
          const past = (history || []).filter((h) => String(h._id || h.visitId) !== String(selectedVisit._id));
          setPatientHistory(past);
        })
        .catch((err) => console.warn('History fetch error:', err))
        .finally(() => setLoadingHistory(false));
    } else {
      setPatientHistory([]);
    }
  }, [selectedVisit?._id, activeOrder?._id, onFetchPatientHistory]);

  // Fetch scan reports for active order
  useEffect(() => {
    const vId = selectedVisit?._id || selectedVisit?.id;
    const oId = activeOrder?._id || activeOrder?.id;
    if (vId && oId) {
      setLoadingScans(true);
      api.get(`/laboratory/orders/${vId}/${oId}/scans`)
        .then((res) => setOrderScans(res.data?.data || []))
        .catch((err) => {
          console.warn('Scan fetch error:', err);
          setOrderScans([]);
        })
        .finally(() => setLoadingScans(false));
    } else {
      setOrderScans([]);
    }
  }, [selectedVisit?._id, activeOrder?._id]);

  // Baseline comparison
  const previousEncounterResults = useMemo(() => {
    if (!patientHistory.length) return null;
    const latestPast = patientHistory[0];
    if (!latestPast?.results && !latestPast?.order?.results) return null;
    const raw = (latestPast.results || latestPast.order?.results);
    const resolved = raw instanceof Map ? Object.fromEntries(raw) : raw;
    return {
      results: resolved,
      date: latestPast.date ? new Date(latestPast.date).toLocaleDateString() : 'Previous',
      verifiedAt: latestPast.verifiedAt,
    };
  }, [patientHistory]);

  // Catalog test definition lookup
  const catalogTestDef = useMemo(() => {
    if (!activeOrder || !laboratories.length) return null;
    for (const lab of laboratories) {
      const catalog = lab.testCatalog || [];
      const matched = catalog.find(
        (t) => (t._id || t.id) === activeOrder.testId || t.name?.toLowerCase() === activeOrder.testName?.toLowerCase()
      );
      if (matched) return matched;
    }
    return null;
  }, [activeOrder, laboratories]);

  // Parameter calculation with automatic delta tags & historical trend comparison
  const analyzedParameters = useMemo(() => {
    const rawResults = isEditingResults ? tableResultForm : (
      activeOrder?.results
        ? (activeOrder.results instanceof Map ? Object.fromEntries(activeOrder.results) : activeOrder.results)
        : {}
    );

    const patientGender = (selectedVisit?.patientId?.gender || 'Universal').toLowerCase();
    const catalogFields = catalogTestDef?.resultFields || [];
    const pastResults = previousEncounterResults?.results || {};

    // Combine all fields from catalog or results
    const allKeys = Array.from(new Set([
      ...catalogFields.map((f) => f.key),
      ...Object.keys(rawResults).filter((k) => !k.startsWith('attachment_')),
    ]));

    return allKeys.map((key) => {
      const fieldDef = catalogFields.find(
        (f) => f.key === key || f.label?.toLowerCase() === key.toLowerCase()
      );

      let min = fieldDef?.min;
      let max = fieldDef?.max;

      if (fieldDef?.isGenderSpecific) {
        if (patientGender === 'male' && fieldDef.maleMin != null) {
          min = fieldDef.maleMin;
          max = fieldDef.maleMax;
        } else if (patientGender === 'female' && fieldDef.femaleMin != null) {
          min = fieldDef.femaleMin;
          max = fieldDef.femaleMax;
        }
      }

      const val = rawResults[key] !== undefined ? rawResults[key] : '';
      const numVal = parseFloat(val);
      let delta = 'NORMAL';
      let deltaLabel = 'Normal Baseline';
      let deltaClass = 'lab-delta--normal';

      if (!isNaN(numVal) && min != null && max != null) {
        if (numVal < min) {
          if (numVal <= min * 0.7) {
            delta = 'CRITICAL';
            deltaLabel = 'Critical Low';
            deltaClass = 'lab-delta--critical';
          } else {
            delta = 'LOW';
            deltaLabel = 'Abnormal Low';
            deltaClass = 'lab-delta--low';
          }
        } else if (numVal > max) {
          if (numVal >= max * 1.5) {
            delta = 'CRITICAL';
            deltaLabel = 'Panic Alert (High)';
            deltaClass = 'lab-delta--critical';
          } else {
            delta = 'HIGH';
            deltaLabel = 'Abnormal High';
            deltaClass = 'lab-delta--high';
          }
        }
      }

      // Historical Trend Delta Comparison
      const prevValRaw = pastResults[key];
      const numPrev = parseFloat(prevValRaw);
      let trend = null;
      if (!isNaN(numVal) && !isNaN(numPrev) && numPrev > 0) {
        const pctChange = Math.round(((numVal - numPrev) / numPrev) * 100);
        if (pctChange >= 15) {
          trend = { type: 'SURGE', icon: 'trending_up', label: `+${pctChange}%`, class: 'lab-trend-badge--surge', pct: pctChange };
        } else if (pctChange <= -15) {
          trend = { type: 'DROP', icon: 'trending_down', label: `${pctChange}%`, class: 'lab-trend-badge--drop', pct: pctChange };
        } else {
          trend = { type: 'STEADY', icon: 'trending_flat', label: `${pctChange >= 0 ? '+' : ''}${pctChange}%`, class: 'lab-trend-badge--steady', pct: pctChange };
        }
      }

      return {
        key,
        label: fieldDef?.label || key,
        val,
        unit: fieldDef?.unit || '',
        reference: fieldDef?.reference || (min != null && max != null ? `${min} - ${max} ${fieldDef?.unit || ''}` : 'Standard Range'),
        type: fieldDef?.type || 'Number',
        delta,
        deltaLabel,
        deltaClass,
        prevVal: prevValRaw !== undefined ? prevValRaw : null,
        prevDate: previousEncounterResults?.date || null,
        trend,
      };
    });
  }, [activeOrder, catalogTestDef, selectedVisit, previousEncounterResults, isEditingResults, tableResultForm]);

  const hasPanicDelta = useMemo(() => {
    return analyzedParameters.some((p) => p.delta === 'CRITICAL' || p.delta === 'HIGH');
  }, [analyzedParameters]);

  const criticalAnalytes = useMemo(() => {
    return analyzedParameters.filter((p) => p.delta === 'CRITICAL' || p.delta === 'HIGH');
  }, [analyzedParameters]);

  // Handle Save Table Results
  const handleSaveTableResults = async () => {
    if (!selectedVisit || !activeOrder || !onSubmitResult) return;
    setSavingTableResults(true);
    try {
      await onSubmitResult(
        selectedVisit._id,
        activeOrder._id || activeOrder.id,
        tableResultForm,
        doctorNotes || activeOrder.notes || ''
      );
      setIsEditingResults(false);
    } catch (err) {
      console.error('Save table results error:', err);
    } finally {
      setSavingTableResults(false);
    }
  };

  // Handle Upload Scan File
  const handleScanFileUpload = async (file) => {
    if (!selectedVisit || !activeOrder || !file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(
        `/laboratory/orders/${selectedVisit._id}/${activeOrder._id || activeOrder.id}/scan`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const res = await api.get(`/laboratory/orders/${selectedVisit._id}/${activeOrder._id || activeOrder.id}/scans`);
      setOrderScans(res.data?.data || []);
    } catch (err) {
      console.error('Scan file upload error:', err);
    }
  };

  // Authorize report
  const handleAuthorizeWithDisposition = async (disposition) => {
    if (!selectedVisit || !activeOrder) return;
    setVerifying(true);
    try {
      await onVerifyOrder(
        selectedVisit._id,
        activeOrder._id || activeOrder.id,
        {
          doctorNotes,
          clinicalImpression,
          deltaFlag: analyzedParameters.some((p) => p.delta !== 'NORMAL'),
          panicValueFlag: hasPanicDelta,
          disposition,
        }
      );
      setDoctorNotes('');
      setClinicalImpression('');
    } catch (err) {
      console.error('[LabDoctorCockpit] Authorization error:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Batch Authorize All Ready Investigations in Encounter
  const handleBatchAuthorizeAll = async (disposition) => {
    if (!selectedVisit || !currentOrders.length) return;

    // Quality Assurance & HIPAA Precondition:
    // Only tests that have already been sampled/accessioned can be medically authorized
    const unverified = currentOrders.filter(({ order }) => order.status !== 'VERIFIED' && order.status !== 'COMPLETED');
    const authorizable = unverified.filter(({ order }) => !(order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt));
    const uncollected = unverified.filter(({ order }) => order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt);

    if (authorizable.length === 0) {
      if (uncollected.length > 0) {
        showError(
          'Specimens Awaiting Collection',
          `Cannot authorize: ${uncollected.length} test order(s) require specimen collection and accessioning by the lab nurse first.`
        );
      }
      return;
    }

    setVerifying(true);
    try {
      let authorizedCount = 0;
      for (const { order } of authorizable) {
        await onVerifyOrder(
          selectedVisit._id,
          order._id || order.id,
          {
            doctorNotes: doctorNotes || 'Medically validated in diagnostic battery review.',
            clinicalImpression: clinicalImpression || 'Findings reviewed and verified in comprehensive patient battery.',
            deltaFlag: false,
            panicValueFlag: false,
            disposition,
          }
        );
        authorizedCount++;
      }
      setDoctorNotes('');
      setClinicalImpression('');

      if (uncollected.length > 0) {
        showWarning(
          'Partial Battery Authorized',
          `${authorizedCount} test(s) signed. ${uncollected.length} test(s) skipped (awaiting specimen collection).`
        );
      }
    } catch (err) {
      console.error('[LabDoctorCockpit] Batch authorization error:', err);
    } finally {
      setVerifying(false);
    }
  };

  // Emergency panic broadcast
  const handleConfirmPanicAlert = async () => {
    if (!selectedVisit || !activeOrder || !onBroadcastPanic) return;
    setBroadcastingPanic(true);
    try {
      const panicValues = criticalAnalytes.map((c) => ({
        analyte: c.label,
        observedValue: `${c.val} ${c.unit}`.trim(),
        referenceRange: c.reference,
        urgency: c.delta === 'CRITICAL' ? 'PANIC_CRITICAL' : 'ABNORMAL_HIGH',
      }));

      await onBroadcastPanic(selectedVisit._id, activeOrder._id || activeOrder.id, {
        panicValues,
        notes: panicNotes.trim() || 'Urgent clinical correlation advised for critical diagnostic values.',
      });
      setShowPanicModal(false);
      setPanicNotes('');
    } catch (err) {
      console.error('[LabDoctorCockpit] Panic broadcast error:', err);
    } finally {
      setBroadcastingPanic(false);
    }
  };

  // Rejection
  const handleConfirmRejection = async () => {
    if (!selectedVisit || !activeOrder) return;
    const finalReason = customRejectionNote.trim()
      ? `${rejectionReason}: ${customRejectionNote.trim()}`
      : rejectionReason;

    setVerifying(true);
    try {
      await onVerifyOrder(
        selectedVisit._id,
        activeOrder._id || activeOrder.id,
        {
          disposition: 'RECOLLECT_SAMPLE',
          rejectionReason: finalReason,
          doctorNotes: finalReason,
        }
      );
      setShowRejectModal(false);
      setCustomRejectionNote('');
    } catch (err) {
      console.error('[LabDoctorCockpit] Rejection error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleAppendImpression = (phrase) => {
    setClinicalImpression((prev) => (prev ? `${prev} ${phrase}` : phrase));
  };

  const attendingDoctor = formatDoctorName(
    selectedVisit?.referredBy ||
    selectedVisit?.consultation?.doctorId ||
    selectedVisit?.assignedDoctor ||
    'Attending Physician'
  );
  const pathologistName = formatDoctorName(currentUser || 'Authorized Pathologist');
  const pathologistLicense = currentUser?.licenseNumber || currentUser?.medicalRegistrationNumber || 'MD-PATH-IND-84920';
  const tubeInfo = activeOrder ? getTubeBadge(activeOrder.sampleType, activeOrder.testName) : null;
  const isSamplePending = Boolean(activeOrder && (activeOrder.status === 'PENDING_SAMPLE' || !activeOrder.sampleCollectedAt));
  const isAlreadyVerified = Boolean(activeOrder && (activeOrder.status === 'VERIFIED' || activeOrder.status === 'COMPLETED'));

  const unverifiedOrders = useMemo(() => {
    return currentOrders.filter(({ order }) => order.status !== 'VERIFIED' && order.status !== 'COMPLETED');
  }, [currentOrders]);

  const authorizableOrders = useMemo(() => {
    return unverifiedOrders.filter(({ order }) => !(order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt));
  }, [unverifiedOrders]);

  const uncollectedOrders = useMemo(() => {
    return unverifiedOrders.filter(({ order }) => order.status === 'PENDING_SAMPLE' && !order.sampleCollectedAt);
  }, [unverifiedOrders]);

  const currentCockpitState = useMemo(() => {
    if (!selectedVisit) return null;
    if (activeItem?.stateMeta) return activeItem.stateMeta;
    const topOrder = activeEncounter?.orders?.[0];
    if (topOrder?.stateMeta) return topOrder.stateMeta;
    return resolveCockpitState({
      primaryCategory: activeItem?.primaryCategory || activeEncounter?.primaryCategory || 'WAITING_NURSE',
      orderStatus: activeOrder?.status || topOrder?.orderStatus,
      visitStatus: selectedVisit?.status,
      isRedraw: activeItem?.isRedraw || topOrder?.isRedraw,
      isDispatchedToDoctor: activeItem?.isDispatchedToDoctor || topOrder?.isDispatchedToDoctor,
    });
  }, [selectedVisit, activeItem, activeEncounter, activeOrder]);

  // Vitals & Pre-vitals
  const vVitals = selectedVisit?.vitals || {};
  const oVitals = activeOrder?.labVitals || {};
  const isVitalsSkipped = Boolean(oVitals.isSkipped);
  const skipReason = oVitals.skipReason;
  const activeBp = oVitals.preScanBp || vVitals.bloodPressure;
  const activePulse = oVitals.pulse || vVitals.pulse;
  const activeTemp = oVitals.temperature || vVitals.temperature;
  const activeSpo2 = oVitals.oxygenSaturation || vVitals.oxygenSaturation;
  const activeGlucose = oVitals.bloodGlucose || vVitals.bloodGlucose;
  const activeWeight = oVitals.patientWeightKg || vVitals.weight;
  const activeFasting = oVitals.fastingHours;
  const hasAnyVitals = Boolean(activeBp || activePulse || activeTemp || activeSpo2 || activeGlucose || activeWeight || activeFasting != null || isVitalsSkipped);

  return (
    <div className={`lab-doctor-cockpit ${isSidebarCollapsed ? 'ldc-cockpit--rail' : ''}`}>
      {/* ── Mobile/Tablet Backdrop Scrim for Side-Based Slide Drawer ── */}
      {isMobileDrawerOpen && (
        <div
          className="ldc-drawer-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left Pane: Multi-Stage Worklist Sidebar (Expandable / Collapsible Rail for Desktop/Tablet) ── */}
      {isSidebarCollapsed && (
        <aside className="ldc-rail ldc-rail--desktop-only" aria-label="Collapsed Pathology Worklist">
          <div className="ldc-rail__header">
            <button
              type="button"
              className="ldc-rail__toggle-btn"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Expand Pathology Worklist"
              aria-label="Expand Pathology Worklist"
            >
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
            <span className="ldc-rail__count-badge" title={`${filteredEncounters.length} active patient encounters`}>
              {filteredEncounters.length}
            </span>
          </div>

          <div className="ldc-rail__body">
            {filteredEncounters.map((enc) => {
              const p = enc.visit.patientId || {};
              const pFirst = p.firstName || p.name?.split(' ')[0] || 'Patient';
              const pFull = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Unnamed';
              const initials = ((p.firstName?.charAt?.(0) || '') + (p.lastName?.charAt?.(0) || '')).toUpperCase() || 'PT';
              const isSel = String(selectedVisit?._id || selectedVisit?.id) === String(enc.visit._id || enc.visit.id);
              const topOrder = enc.orders[0] || {};
              const stateObj = topOrder.stateMeta || resolveCockpitState({
                primaryCategory: enc.primaryCategory,
                orderStatus: topOrder.orderStatus,
                visitStatus: enc.visit.status,
              });
              const testSummary = enc.orders.map((o) => o.order?.testName).filter(Boolean).join(', ');

              return (
                <div
                  key={enc.visitId}
                  className={`ldc-rail-item ${isSel ? 'ldc-rail-item--selected' : ''}`}
                  onClick={() => {
                    onSelectVisit(enc.visit);
                    if (enc.orders.length > 0) {
                      const matching = enc.orders.find((o) => String(o.order._id || o.order.id) === String(selectedOrderId));
                      setSelectedOrderId(matching ? (matching.order._id || matching.order.id) : (enc.orders[0].order._id || enc.orders[0].order.id));
                    }
                    setIsMobileDrawerOpen(false);
                  }}
                  role="button"
                  tabIndex={0}
                  title={`${pFull} (${enc.visit.tokenString || 'Token'})\n${enc.orders.length} Tests: ${testSummary}\nStatus: ${stateObj.label}`}
                >
                  <div className="ldc-rail-item__avatar-wrapper">
                    <div className="ldc-rail-item__avatar">{initials}</div>
                    <span className="ldc-rail-item__priority-dot" style={{ backgroundColor: stateObj.dotColor }} />
                    {enc.orders.length > 1 && (
                      <span className="ldc-rail-item__count-badge" title={`${enc.orders.length} investigations`}>
                        {enc.orders.length}
                      </span>
                    )}
                  </div>
                  <span className="ldc-rail-item__token">{enc.visit.tokenString || (topOrder.order?._id || '').slice(-4)}</span>
                  <div className="ldc-rail-item__name-box">
                    <Md3MarqueeText text={pFirst} className="ldc-rail-item__marquee" />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* ── Left Pane: Full Worklist (Fixed on desktop when expanded, or slide-over drawer on mobile/tablet) ── */}
      {(!isSidebarCollapsed || isMobileDrawerOpen) && (
        <aside className={`lab-doctor-queue ${isSidebarCollapsed ? 'ldc-queue--collapsed-desktop' : ''} ${isMobileDrawerOpen ? 'is-mobile-open' : ''}`}>
          <div className="lab-doctor-queue__header">
            <button
              type="button"
              className="ldc-collapse-btn"
              onClick={() => setIsSidebarCollapsed(true)}
              title="Collapse into Rail"
              aria-label="Collapse into Rail"
            >
              <span className="material-symbols-rounded">chevron_left</span>
              <span className="ldc-collapse-btn__label">Collapse to Rail</span>
            </button>
            <button
              type="button"
              className="ldc-mobile-close-btn"
              onClick={() => setIsMobileDrawerOpen(false)}
              title="Close Drawer"
              aria-label="Close Drawer"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          {/* 1. Multi-Stage Diagnostic State Selector Matrix */}
          <div className="ldc-state-matrix" role="tablist" aria-label="Laboratory Lifecycle State Matrix">
            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'AWAITING_VERIFICATION'}
              className={`ldc-state-tab ${stateFilter === 'AWAITING_VERIFICATION' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('AWAITING_VERIFICATION')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--verify">verified_user</span>
                <span className="ldc-state-tab__count ldc-state-tab__count--verify">{categoryCounts.AWAITING_VERIFICATION}</span>
              </div>
              <span className="ldc-state-tab__label">To Verify</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'AT_DOCTOR_REVIEW'}
              className={`ldc-state-tab ${stateFilter === 'AT_DOCTOR_REVIEW' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('AT_DOCTOR_REVIEW')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--doctor">stethoscope</span>
                <span className="ldc-state-tab__count ldc-state-tab__count--doctor">{categoryCounts.AT_DOCTOR_REVIEW}</span>
              </div>
              <span className="ldc-state-tab__label">At Doctor</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'IN_ANALYSIS'}
              className={`ldc-state-tab ${stateFilter === 'IN_ANALYSIS' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('IN_ANALYSIS')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--analysis">biotech</span>
                <span className="ldc-state-tab__count ldc-state-tab__count--analysis">{categoryCounts.IN_ANALYSIS}</span>
              </div>
              <span className="ldc-state-tab__label">In Analysis</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'WAITING_NURSE'}
              className={`ldc-state-tab ${stateFilter === 'WAITING_NURSE' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('WAITING_NURSE')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--phlebotomy">hourglass_empty</span>
                <span className="ldc-state-tab__count ldc-state-tab__count--phlebotomy">{categoryCounts.WAITING_NURSE}</span>
              </div>
              <span className="ldc-state-tab__label">Waiting Nurse</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'RECOLLECT_SAMPLE'}
              className={`ldc-state-tab ${stateFilter === 'RECOLLECT_SAMPLE' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('RECOLLECT_SAMPLE')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--redraw">replay</span>
                <span className="ldc-state-tab__count ldc-state-tab__count--redraw">{categoryCounts.RECOLLECT_SAMPLE}</span>
              </div>
              <span className="ldc-state-tab__label">Redraws</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={stateFilter === 'ALL'}
              className={`ldc-state-tab ${stateFilter === 'ALL' ? 'ldc-state-tab--active' : ''}`}
              onClick={() => setStateFilter('ALL')}
            >
              <div className="ldc-state-tab__top">
                <span className="material-symbols-rounded ldc-state-tab__icon ldc-state-tab__icon--all">view_list</span>
                <span className="ldc-state-tab__count">{categoryCounts.ALL}</span>
              </div>
              <span className="ldc-state-tab__label">All Active</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="ldc-search-box">
            <span className="material-symbols-rounded ldc-search-icon">search</span>
            <input
              type="text"
              className="ldc-search-input"
              placeholder="Search patient, MRN, token, test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="ldc-search-clear" onClick={() => setSearchQuery('')}>
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          {/* Priority / Origin Filter Bar */}
          <div className="lab-doctor-filter-bar">
            <button
              type="button"
              className={`lab-doc-filter-btn ${urgencyFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setUrgencyFilter('ALL')}
            >
              All ({filteredEncounters.length})
            </button>
            <button
              type="button"
              className={`lab-doc-filter-btn ${urgencyFilter === 'STAT' ? 'active' : ''}`}
              onClick={() => setUrgencyFilter('STAT')}
            >
              <span className="material-symbols-rounded">emergency</span>
              <span>STAT/Urgent</span>
            </button>
            <button
              type="button"
              className={`lab-doc-filter-btn ${urgencyFilter === 'CLINICAL' ? 'active' : ''}`}
              onClick={() => setUrgencyFilter('CLINICAL')}
            >
              Directives
            </button>
            <button
              type="button"
              className={`lab-doc-filter-btn ${urgencyFilter === 'WALKIN' ? 'active' : ''}`}
              onClick={() => setUrgencyFilter('WALKIN')}
            >
              Walk-Ins
            </button>
          </div>

          {/* Order List with Material 3 Expressive Cards */}
          <div className="lab-doctor-queue__list">
            {filteredEncounters.length === 0 ? (
              <div className="lab-doctor-empty">
                <span className="material-symbols-rounded text-primary">biotech</span>
                <p className="lab-doctor-empty__title">No diagnostic encounters found</p>
                <span className="lab-doctor-empty-sub">
                  {stateFilter === 'AWAITING_VERIFICATION'
                    ? 'All pending parameter worksheets have been verified.'
                    : 'No patients match the active state criteria.'}
                </span>
              </div>
            ) : (
              filteredEncounters.map((enc) => {
                const isSel = String(selectedVisit?._id || selectedVisit?.id) === String(enc.visit._id || enc.visit.id);

                return (
                  <LabDoctorQueueCard
                    key={enc.visitId}
                    encounter={enc}
                    isSelected={isSel}
                    activeOrderId={activeOrder?._id || activeOrder?.id}
                    onSelect={() => {
                      onSelectVisit(enc.visit);
                      if (enc.orders.length > 0) {
                        const matching = enc.orders.find((o) => String(o.order._id || o.order.id) === String(selectedOrderId));
                        setSelectedOrderId(matching ? (matching.order._id || matching.order.id) : (enc.orders[0].order._id || enc.orders[0].order.id));
                      }
                      setIsMobileDrawerOpen(false);
                    }}
                  />
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* ── Mobile/Tablet Floating/Sticky Toolbar ── */}
      <div className="ldc-mobile-toolbar">
        <button
          type="button"
          className="ldc-mobile-drawer-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Pathology Worklist Side Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Pathology Worklist</span>
          <span className="ldc-mobile-count-badge">{filteredEncounters.length}</span>
        </button>

        {selectedVisit && (
          <div className="ldc-mobile-patient-preview">
            <span className="ldc-mobile-token-pill">{selectedVisit.tokenString || (activeOrder?._id || '').slice(-4)}</span>
            <span className="ldc-mobile-patient-name">
              {selectedVisit.patientId?.name || [selectedVisit.patientId?.firstName, selectedVisit.patientId?.lastName].filter(Boolean).join(' ') || 'Active Patient'}
              {currentOrders.length > 1 && ` · ${currentOrders.length} Tests`}
            </span>
          </div>
        )}
      </div>

      {/* ── Right Workspace Pane ── */}
      <main className="lab-doctor-workspace" role="main">
        {!selectedVisit || !activeOrder ? (
          <ClinicalStationIdleDeck
            stationTitle="Pathologist Cockpit"
            stationSubtitle="Select a patient from the queue to verify diagnostic results, inspect telemetry, or broadcast critical panic alerts."
            badgeText="VERIFICATION STATION"
            stats={[
              { label: 'To Verify', value: categoryCounts.AWAITING_VERIFICATION, icon: 'verified_user', variant: 'primary' },
              { label: 'Under Analysis', value: categoryCounts.IN_ANALYSIS, icon: 'biotech', variant: 'tertiary' },
              { label: 'Redraws', value: categoryCounts.RECOLLECT_SAMPLE, icon: 'replay', variant: 'warning' },
              { label: 'At Doctor', value: categoryCounts.AT_DOCTOR_REVIEW, icon: 'stethoscope', variant: 'default' },
            ]}
          />
        ) : (
          <div className="lab-doctor-deck">
            {/* 1. Header & Patient Clinical Dossier Strip */}
            <div className="lab-doctor-deck__header">
              <div>
                <div className="lab-doctor-deck__patient-row">
                  <h3 className="lab-doctor-deck__patient">
                    {selectedVisit.patientId?.fullName ||
                      [selectedVisit.patientId?.firstName, selectedVisit.patientId?.lastName].filter(Boolean).join(' ') ||
                      'Patient Dossier'}
                  </h3>
                  <span className={`lab-badge-gender ${selectedVisit.patientId?.isDeleted ? 'lab-badge-gender--archived' : ''}`}>
                    {selectedVisit.patientId?.gender || 'Unknown'}
                    {selectedVisit.patientId?.age && selectedVisit.patientId.age !== '—' && !isNaN(Number(selectedVisit.patientId.age))
                      ? ` · ${selectedVisit.patientId.age}y`
                      : (selectedVisit.patientId?.isDeleted ? '' : ' · Adult')}
                  </span>
                  {selectedVisit.patientId?.isDeleted ? (
                    <span className="ldc-state-pill ldc-state-pill--archived">
                      <span className="material-symbols-rounded">inventory_2</span>
                      <span>Archived Record</span>
                    </span>
                  ) : (
                    currentCockpitState && (
                      <span className={`ldc-state-pill ${currentCockpitState.className}`}>
                        <span className="material-symbols-rounded">{currentCockpitState.icon}</span>
                        <span>{currentCockpitState.label}</span>
                      </span>
                    )
                  )}
                </div>
                <p className="lab-doctor-deck__meta">
                  MRN: <strong>{selectedVisit.patientId?.mrn || 'N/A'}</strong> · Encounter: <strong>{selectedVisit.tokenString || selectedVisit.visitNumber}</strong> ·
                  Attending: <strong>{attendingDoctor}</strong>
                </p>
              </div>

              {/* Patient Origin Badge */}
              <div className="lab-doctor-deck__routing-badges">
                {activeOrder?.origin === 'DIRECT_WALKIN' ? (
                  <div className="lab-route-badge lab-route-badge--billing">
                    <span className="material-symbols-rounded">payments</span>
                    <div>
                      <strong>Direct Walk-In (Reception)</strong>
                      <div className="lab-route-badge__sub">Post-authorization routes to Billing</div>
                    </div>
                  </div>
                ) : (
                  <div className="lab-route-badge lab-route-badge--doctor">
                    <span className="material-symbols-rounded">clinical_notes</span>
                    <div>
                      <strong>Clinical Doctor Directive</strong>
                      <div className="lab-route-badge__sub">Post-authorization returns to Doctor</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Archived Patient Statutory Retention Notice Banner */}
            {selectedVisit.patientId?.isDeleted && (
              <div className="ldc-archived-banner" role="status" aria-live="polite">
                <span className="material-symbols-rounded ldc-archived-banner__icon">inventory_2</span>
                <div className="ldc-archived-banner__body">
                  <div className="ldc-archived-banner__title">Archived Patient Dossier · Diagnostic Orders Retained</div>
                  <div className="ldc-archived-banner__desc">
                    This patient demographic record has been soft-deleted or purged from the active census. Under statutory clinical compliance &amp; HIPAA audit retention, ordered investigations, accessioned specimens, and verified lab results remain immutably preserved.
                  </div>
                </div>
              </div>
            )}

            {/* 2. Patient Clinical Vitals & Specimen Telemetry Card */}
            <div className="ldc-vitals-card">
              <div className="ldc-vitals-card__header">
                <span className="material-symbols-rounded">vital_signs</span>
                <strong>Clinical Vitals &amp; Specimen Accessioning Context</strong>
                {isVitalsSkipped && (
                  <span className="ldc-vitals-skipped-badge" title={skipReason}>
                    <span className="material-symbols-rounded">cancel</span>
                    <span>Pre-Vitals Skipped ({skipReason})</span>
                  </span>
                )}
              </div>
              {hasAnyVitals ? (
                <div className="ldc-vitals-grid">
                  {isVitalsSkipped && (
                    <div className="ldc-vital-item ldc-vital-item--skipped">
                      <span className="ldc-vital-label">Vitals Exemption Justification</span>
                      <span className="ldc-vital-val" style={{ color: 'var(--md-sys-color-tertiary, #7d5260)', fontSize: '0.82rem' }}>
                        {skipReason || 'Pre-procedure vitals clinically deemed non-essential or triaged elsewhere'}
                      </span>
                    </div>
                  )}
                  {activeBp && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">BP (mmHg)</span>
                      <span className="ldc-vital-val">{activeBp}</span>
                    </div>
                  )}
                  {activePulse && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Pulse</span>
                      <span className="ldc-vital-val">{activePulse} bpm</span>
                    </div>
                  )}
                  {activeSpo2 && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">SpO2</span>
                      <span className="ldc-vital-val">{activeSpo2}%</span>
                    </div>
                  )}
                  {activeTemp && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Temperature</span>
                      <span className="ldc-vital-val">{activeTemp}°F</span>
                    </div>
                  )}
                  {activeGlucose && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Blood Glucose</span>
                      <span className="ldc-vital-val">{activeGlucose} mg/dL</span>
                    </div>
                  )}
                  {activeWeight && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Weight</span>
                      <span className="ldc-vital-val">{activeWeight} kg</span>
                    </div>
                  )}
                  {activeFasting != null && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Fasting</span>
                      <span className="ldc-vital-val">{activeFasting} hrs</span>
                    </div>
                  )}
                  {tubeInfo && (
                    <div className="ldc-vital-item ldc-vital-item--tube">
                      <span className="ldc-vital-label">Specimen Vacutainer</span>
                      <span className="ldc-vital-val">{tubeInfo.label}</span>
                    </div>
                  )}
                  {activeOrder?.specimenBarcode && (
                    <div className="ldc-vital-item">
                      <span className="ldc-vital-label">Barcode ID</span>
                      <span className="ldc-vital-val" style={{ fontFamily: 'monospace' }}>{activeOrder.specimenBarcode}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ldc-vitals-empty">
                  <span className="material-symbols-rounded">info</span>
                  <span>Pre-procedure clinical vitals will be recorded by the Lab Nurse upon arrival at the Phlebotomy Station.</span>
                </div>
              )}
            </div>

            {/* 2b. Multi-Test Diagnostic Order Battery Selector Strip (if > 1 investigation) */}
            {currentOrders.length > 1 && (
              <div className="ldc-multi-test-hub">
                <div className="ldc-multi-test-hub__header">
                  <div className="ldc-multi-test-hub__title">
                    <span className="material-symbols-rounded">playlist_add_check</span>
                    <strong>Diagnostic Investigation Battery</strong>
                    <span className="ldc-multi-test-hub__count-badge">{currentOrders.length} Investigations</span>
                  </div>
                  <div className="ldc-multi-test-hub__summary">
                    {currentOrders.filter((o) => o.primaryCategory === 'COMPLETED').length} of {currentOrders.length} Reports Authorized
                  </div>
                </div>

                <div className="ldc-multi-test-tabs" role="tablist" aria-label="Diagnostic Investigations for Patient">
                  {currentOrders.map(({ order, tubeInfo: itemTube, stateMeta: itemState }) => {
                    const isOrderActive = String(activeOrder?._id || activeOrder?.id) === String(order._id || order.id);
                    return (
                      <button
                        key={order._id || order.id}
                        type="button"
                        role="tab"
                        aria-selected={isOrderActive}
                        className={`ldc-test-tab ${isOrderActive ? 'ldc-test-tab--active' : ''}`}
                        onClick={() => setSelectedOrderId(order._id || order.id)}
                      >
                        <div className="ldc-test-tab__top">
                          {itemTube && (
                            <span className={`ldc-test-tab__tube ${itemTube.className}`} title={itemTube.label}>
                              <span className="ldc-test-tab__tube-dot" />
                              <span>{itemTube.shortLabel}</span>
                            </span>
                          )}
                          <span className={`ldc-test-tab__status ${itemState.className}`} title={itemState.label}>
                            <span className="material-symbols-rounded">{itemState.icon}</span>
                            <span>{itemState.shortLabel}</span>
                          </span>
                        </div>
                        <div className="ldc-test-tab__name" title={order.testName}>
                          {order.testName}
                        </div>
                        <div className="ldc-test-tab__meta">
                          <span>Code: <strong>{order.testCode || 'LAB'}</strong></span>
                          {order.panicAlertBroadcasted && (
                            <span className="ldc-test-tab__panic-pill" title="Emergency critical values flagged">
                              <span className="material-symbols-rounded">emergency</span>
                              <span>PANIC</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HIPAA & Quality Assurance Specimen Lockout Banner */}
            {isSamplePending && (
              <div className="ldc-phlebotomy-lockout-banner">
                <div className="ldc-phlebotomy-lockout-banner__icon-wrap">
                  <span className="material-symbols-rounded">hourglass_top</span>
                </div>
                <div className="ldc-phlebotomy-lockout-banner__content">
                  <div className="ldc-phlebotomy-lockout-banner__title">
                    <strong>Specimen Accessioning Pending (Lab Nurse Station)</strong>
                    <span className="ldc-phlebotomy-lockout-banner__chip">HIPAA &amp; QA Chain-of-Custody</span>
                  </div>
                  <p className="ldc-phlebotomy-lockout-banner__desc">
                    Patient has arrived from physician consultation and is in queue at the <strong>Lab Nurse / Phlebotomy Station</strong> for pre-procedure vitals and specimen collection ({activeOrder?.sampleType || 'Specimen'}).
                    In compliance with HIPAA chain-of-custody and clinical quality assurance standards, analytical result entry, scan uploads, and report authorization unlock once specimen accessioning is confirmed by the lab nurse.
                  </p>
                  {onCollectSample && (
                    <div className="ldc-phlebotomy-lockout-banner__actions">
                      <Md3Button
                        variant="filled"
                        size="small"
                        onClick={async () => {
                          await onCollectSample(selectedVisit._id, activeOrder?._id || activeOrder?.id);
                        }}
                      >
                        <span className="material-symbols-rounded">bloodtype</span>
                        <span>Confirm Specimen Accessioning (Phlebotomy Clearance)</span>
                      </Md3Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panic Alert Banner if already broadcasted */}
            {activeOrder?.panicAlertBroadcasted && (
              <div className="lab-panic-broadcasted-strip">
                <div className="lab-panic-broadcasted-strip__info">
                  <span className="material-symbols-rounded">notification_important</span>
                  <div>
                    <strong>Emergency Panic Broadcast Active</strong>
                    <div className="lab-panic-broadcasted-strip__sub">
                      Broadcasted to {attendingDoctor} on {new Date(activeOrder?.panicAlertDetails?.triggeredAt || activeOrder?.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Diagnostic Investigation Title & Delta Bar */}
            {(() => {
              const isDocOnly = Boolean(
                activeOrder?.isDocumentUploadOnly ||
                activeOrder?.reportType === 'DOCUMENT_UPLOAD' ||
                catalogTestDef?.isDocumentUploadOnly ||
                catalogTestDef?.reportType === 'DOCUMENT_UPLOAD'
              );

              return (
                <>
                  <div className="lab-doctor-test-bar">
                    <div className="lab-doctor-test-bar__left">
                      <div className="lab-doctor-test-icon">
                        <span className="material-symbols-rounded">
                          {isDocOnly ? 'image' : 'biotech'}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 className="lab-doctor-test-name">{activeOrder?.testName || 'Diagnostic Investigation'}</h4>
                          {isDocOnly ? (
                            <span className="catalog-mode-badge catalog-mode-badge--upload" style={{ fontSize: '11px', padding: '2px 7px' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>upload_file</span>
                              Scan / Document Upload Only
                            </span>
                          ) : (
                            <span className="catalog-mode-badge catalog-mode-badge--structured" style={{ fontSize: '11px', padding: '2px 7px' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>table_chart</span>
                              Structured Analyte Entry
                            </span>
                          )}
                        </div>
                        <div className="lab-doctor-test-sub">
                          Code: <strong>{activeOrder?.testCode || 'LAB-TEST'}</strong> · Sample: <strong>{activeOrder?.sampleType || 'Specimen'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Delta Urgency Flag Pill */}
                    <div className="lab-doctor-test-bar__right">
                      <Md3Button
                        variant="tonal"
                        size="small"
                        onClick={() => setShowPrintModal(true)}
                        title="Preview official branded hospital diagnostic report"
                      >
                        <span className="material-symbols-rounded">picture_as_pdf</span>
                        <span>Hospital Report Template</span>
                      </Md3Button>

                      {!isDocOnly && (
                        <Md3Button
                          variant={isEditingResults ? 'filled' : 'outlined'}
                          size="small"
                          onClick={() => setIsEditingResults(!isEditingResults)}
                        >
                          <span className="material-symbols-rounded">{isEditingResults ? 'check' : 'edit'}</span>
                          <span>{isEditingResults ? 'Exit Edit Mode' : 'Edit Analyte Values'}</span>
                        </Md3Button>
                      )}

                      {!isDocOnly && (
                        hasPanicDelta ? (
                          <button
                            type="button"
                            className="lab-panic-trigger-btn"
                            onClick={() => setShowPanicModal(true)}
                            title="Broadcast emergency critical values to attending physician"
                          >
                            <span className="material-symbols-rounded">emergency_home</span>
                            <span>Broadcast Panic Alert ({criticalAnalytes.length})</span>
                          </button>
                        ) : (
                          <div className="lab-delta-normal-tag">
                            <span className="material-symbols-rounded">verified</span>
                            <span>Delta Checks Clear</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* 4. Document / Scan Upload Hero Section OR Interactive Quantitative Analyte Table */}
                  {isDocOnly ? (
                    <div className="ldc-scans-card ldc-scans-card--hero">
                      <div className="ldc-scans-card__header" style={{ background: '#f0fdf4', borderBottomColor: '#bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-rounded" style={{ color: '#15803d' }}>document_scanner</span>
                          <strong style={{ color: '#166534' }}>Diagnostic Scan Reports &amp; Image Attachments ({orderScans.length})</strong>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                          Direct Document Workflow
                        </span>
                      </div>

                      <div className="ldc-scans-card__body">
                        {orderScans.length > 0 ? (
                          <div className="ldc-scans-grid">
                            {orderScans.map((scan) => (
                              <div
                                key={scan._id}
                                className="ldc-scan-thumb"
                                onClick={() => setSelectedScanReportId(scan._id)}
                                role="button"
                                tabIndex={0}
                                title="Click to view full-resolution scan in PACS / Scan Viewer"
                              >
                                <span className="material-symbols-rounded ldc-scan-thumb__icon">
                                  {scan.mimeType?.includes('pdf') ? 'picture_as_pdf' : 'medical_services'}
                                </span>
                                <div className="ldc-scan-thumb__info">
                                  <span className="ldc-scan-thumb__name">{scan.originalFilename || 'Scan Document'}</span>
                                  <span className="ldc-scan-thumb__size">{(scan.sizeBytes / 1024).toFixed(0)} KB · Click to Preview</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#94a3b8' }}>upload_file</span>
                            <p style={{ margin: '8px 0 2px 0', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                              No scan or document files uploaded yet
                            </p>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Upload the patient's X-Ray, CT, MRI, Ultrasound image, or external diagnostic PDF report below.
                            </span>
                          </div>
                        )}

                        {/* Upload zone for pathologist/technician */}
                        <div style={{ marginTop: '16px' }}>
                          <Md3FileUpload
                            id={`doc-scan-upload-${activeOrder?._id || 'main'}`}
                            label="Upload X-Ray / Scan Image or PDF Report"
                            onChange={handleScanFileUpload}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="lab-doctor-params-card">
                        <div className="lab-doctor-params-card__header">
                          <div className="lab-doctor-params-card__title-row">
                            <span className="material-symbols-rounded">analytics</span>
                            <strong>Quantitative Analyte Findings &amp; Delta Validation Table</strong>
                          </div>
                          <div className="lab-doctor-params-card__sub">
                            {loadingHistory ? 'Comparing historical trends...' : previousEncounterResults ? `Historical baseline: ${previousEncounterResults.date}` : 'No prior encounters for delta check'}
                          </div>
                        </div>

                        <div className="lab-doctor-table-wrap">
                          <table className="lab-doctor-table">
                            <thead>
                              <tr>
                                <th style={{ width: '25%' }}>Analyte Parameter</th>
                                <th style={{ width: '25%' }}>Observed Result</th>
                                <th style={{ width: '20%' }}>Reference Interval</th>
                                <th style={{ width: '15%' }}>Prior Baseline</th>
                                <th style={{ width: '15%' }}>Clinical Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analyzedParameters.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="lab-doctor-table-empty">
                                    No quantitative parameter values recorded. Click "Edit Analyte Values" above to enter test results.
                                  </td>
                                </tr>
                              ) : (
                                analyzedParameters.map((param) => (
                                  <tr key={param.key}>
                                    <td className="lab-param-label-cell">
                                      <strong>{param.label}</strong>
                                    </td>

                                    {/* Current Value / Input cell */}
                                    <td>
                                      {isEditingResults ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <input
                                            type={param.type === 'Number' ? 'number' : 'text'}
                                            step="any"
                                            value={tableResultForm[param.key] ?? ''}
                                            onChange={(e) =>
                                              setTableResultForm((prev) => ({ ...prev, [param.key]: e.target.value }))
                                            }
                                            className="ldc-table-input"
                                            placeholder="Enter value"
                                          />
                                          {param.unit && <small className="lab-param-unit">{param.unit}</small>}
                                        </div>
                                      ) : (
                                        <span className="lab-observed-val">
                                          <strong>{String(param.val || '—')}</strong>
                                          {param.unit && <small className="lab-param-unit">{param.unit}</small>}
                                        </span>
                                      )}
                                    </td>

                                    {/* Reference Interval */}
                                    <td>
                                      <span style={{ fontSize: '0.80rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                                        {param.reference}
                                      </span>
                                    </td>

                                    {/* Prior Baseline & Trend */}
                                    <td>
                                      {param.prevVal !== null ? (
                                        <div className="lab-history-prev-val">
                                          <span className="lab-history-prev-num">{param.prevVal} {param.unit}</span>
                                          {param.trend && (
                                            <span className={`lab-trend-badge ${param.trend.class}`} title="Shift from prior encounter">
                                              <span className="material-symbols-rounded">{param.trend.icon}</span>
                                              <span>{param.trend.label}</span>
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="lab-param-empty-text">No Prior Test</span>
                                      )}
                                    </td>

                                    {/* Clinical Delta Tag */}
                                    <td>
                                      <span className={`lab-delta-badge ${param.deltaClass}`}>
                                        <span className="material-symbols-rounded">
                                          {param.delta === 'NORMAL' ? 'check_circle' : param.delta === 'CRITICAL' ? 'emergency' : 'arrow_upward'}
                                        </span>
                                        <span>{param.deltaLabel}</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {isEditingResults && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', background: 'var(--md-sys-color-surface-container-low)' }}>
                            <Md3Button
                              variant="filled"
                              size="small"
                              onClick={handleSaveTableResults}
                              loading={savingTableResults}
                            >
                              <span className="material-symbols-rounded">save</span>
                              <span>Save Analyte Values</span>
                            </Md3Button>
                          </div>
                        )}
                      </div>

                      {/* 5. Diagnostic Scans & File Attachments */}
                      <div className="ldc-scans-card">
                        <div className="ldc-scans-card__header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-rounded">image</span>
                            <strong>Diagnostic Scan Reports &amp; Image Attachments ({orderScans.length})</strong>
                          </div>
                        </div>

                        <div className="ldc-scans-card__body">
                          {orderScans.length > 0 ? (
                            <div className="ldc-scans-grid">
                              {orderScans.map((scan) => (
                                <div
                                  key={scan._id}
                                  className="ldc-scan-thumb"
                                  onClick={() => setSelectedScanReportId(scan._id)}
                                  role="button"
                                  tabIndex={0}
                                  title="Click to view full-resolution scan"
                                >
                                  <span className="material-symbols-rounded ldc-scan-thumb__icon">
                                    {scan.mimeType?.includes('pdf') ? 'picture_as_pdf' : 'medical_services'}
                                  </span>
                                  <div className="ldc-scan-thumb__info">
                                    <span className="ldc-scan-thumb__name">{scan.originalFilename || 'Scan Document'}</span>
                                    <span className="ldc-scan-thumb__size">{(scan.sizeBytes / 1024).toFixed(0)} KB</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="ldc-scans-empty">No imaging or scan files attached to this order.</p>
                          )}

                          {/* Upload zone for doctor */}
                          <div style={{ marginTop: '12px' }}>
                            <Md3FileUpload
                              id={`doc-scan-upload-${activeOrder?._id || 'main'}`}
                              label="Upload Supporting X-Ray / Scan Image or PDF Report"
                              onChange={handleScanFileUpload}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* 6. Pathologist Interpretation & Quick Phrases */}
            <div className="lab-doctor-notes-container">
              <label className="lab-notes-title">
                <span className="material-symbols-rounded">edit_note</span>
                <span>Pathologist Diagnostic Remarks &amp; Clinical Impression</span>
              </label>

              {/* Quick Medical Observation Phrase Chips */}
              <div className="lab-quick-chips">
                <span className="lab-quick-label">Presets:</span>
                {QUICK_IMPRESSIONS.map((phrase, i) => (
                  <button
                    key={i}
                    type="button"
                    className="lab-quick-chip-btn"
                    onClick={() => handleAppendImpression(phrase)}
                  >
                    <span className="material-symbols-rounded">add</span>
                    <span>{phrase.split(';')[0]}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="lab-doctor-textarea"
                rows={3}
                placeholder="Enter diagnostic impression, differential notes, or clinical correlation recommendations..."
                value={clinicalImpression || doctorNotes}
                onChange={(e) => {
                  setClinicalImpression(e.target.value);
                  setDoctorNotes(e.target.value);
                }}
              />
            </div>

            {/* 7. Pathologist Digital Stamp & Signature Verification Preview Card */}
            <div className="lab-pathologist-seal-card">
              <div className="lab-pathologist-seal-card__left">
                <div className="lab-pathologist-seal-icon">
                  <span className="material-symbols-rounded">verified_user</span>
                </div>
                <div>
                  <div className="lab-pathologist-seal-name">{pathologistName}</div>
                  <div className="lab-pathologist-seal-meta">
                    Consultant Pathologist · Reg: {pathologistLicense}
                  </div>
                </div>
              </div>
              <div className="lab-pathologist-seal-card__right">
                <span className="lab-pathologist-seal-title">
                  CRYPTOGRAPHIC VERIFICATION SEAL (SHA-256)
                </span>
                <div className="lab-pathologist-seal-hash" title="Cryptographically signed verification stamp">
                  {activeOrder?.pathologistVerification?.signatureHash || 'SHA256: Generated on Authorization'}
                </div>
              </div>
            </div>

            {/* 8. Clinical Disposition & Navigation Action Hub */}
            <div className="lab-doctor-handoff-hub">
              <div className="lab-handoff-info">
                <span className="material-symbols-rounded lab-handoff-info__icon">
                  route
                </span>
                <div>
                  <strong>Medical Authorization &amp; Patient Navigation Hub</strong>
                  <p className="lab-handoff-info__sub">
                    Authorizing electronically signs this report and updates the patient's hospital queue status.
                  </p>
                </div>
              </div>

              <div className="lab-handoff-actions">
                {/* Specimen Rejection Action */}
                <Md3Button
                  variant="outlined"
                  onClick={() => setShowRejectModal(true)}
                  disabled={verifying}
                  className="lab-reject-btn"
                >
                  <span className="material-symbols-rounded">replay</span>
                  <span>Reject (Recollect)</span>
                </Md3Button>

                {/* Print Report Preview Action */}
                <Md3Button
                  variant="tonal"
                  onClick={() => setShowPrintModal(true)}
                  disabled={verifying}
                >
                  <span className="material-symbols-rounded">print</span>
                  <span>Preview Report</span>
                </Md3Button>

                {/* Batch Authorize All Investigations Option (if > 1 order in encounter) */}
                {currentOrders.length > 1 && (
                  <Md3Button
                    variant="tonal"
                    onClick={() => handleBatchAuthorizeAll(activeOrder?.origin === 'DIRECT_WALKIN' ? 'ROUTE_TO_BILLING' : 'RETURN_TO_DOCTOR')}
                    loading={verifying}
                    disabled={authorizableOrders.length === 0 || verifying}
                    className="lab-batch-authorize-btn"
                    title={
                      authorizableOrders.length === 0
                        ? 'Cannot authorize: all remaining orders require specimen collection by the lab nurse'
                        : uncollectedOrders.length > 0
                        ? `Sign ${authorizableOrders.length} ready test(s) (${uncollectedOrders.length} uncollected test(s) will be skipped)`
                        : 'Sign all diagnostic reports in this encounter battery'
                    }
                  >
                    <span className="material-symbols-rounded">done_all</span>
                    <span>
                      {authorizableOrders.length === 0
                        ? `Specimens Pending (${unverifiedOrders.length} Tests)`
                        : uncollectedOrders.length > 0
                        ? `Sign Ready (${authorizableOrders.length}/${unverifiedOrders.length} Tests)`
                        : `Sign All Battery (${unverifiedOrders.length} Tests)`}
                    </span>
                  </Md3Button>
                )}

                {/* Primary Disposition Action Buttons based on Origin */}
                {activeOrder?.origin === 'DIRECT_WALKIN' ? (
                  <Md3Button
                    variant="filled"
                    onClick={() => handleAuthorizeWithDisposition('ROUTE_TO_BILLING')}
                    loading={verifying}
                    disabled={isSamplePending || isAlreadyVerified || verifying}
                    className="lab-dispatch-billing-btn"
                    title={
                      isAlreadyVerified
                        ? 'Diagnostic report already signed and authorized'
                        : isSamplePending
                        ? 'Specimen must be collected by the lab nurse before medical authorization'
                        : 'Sign and route to billing'
                    }
                  >
                    <span className="material-symbols-rounded">
                      {isAlreadyVerified ? 'verified' : 'payments'}
                    </span>
                    <span>{isAlreadyVerified ? 'Report Authorized' : 'Sign & Route to Billing'}</span>
                  </Md3Button>
                ) : (
                  <Md3Button
                    variant="filled"
                    onClick={() => handleAuthorizeWithDisposition('RETURN_TO_DOCTOR')}
                    loading={verifying}
                    disabled={isSamplePending || isAlreadyVerified || verifying}
                    className="lab-dispatch-doctor-btn"
                    title={
                      isAlreadyVerified
                        ? 'Diagnostic report already signed and authorized'
                        : isSamplePending
                        ? 'Specimen must be collected by the lab nurse before medical authorization'
                        : `Sign and return to ${attendingDoctor}`
                    }
                  >
                    <span className="material-symbols-rounded">
                      {isAlreadyVerified ? 'verified' : 'stethoscope'}
                    </span>
                    <span>{isAlreadyVerified ? 'Report Authorized' : `Sign & Return to ${attendingDoctor}`}</span>
                  </Md3Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals & Dialogs ── */}

      {/* Specimen Rejection Modal */}
      {showRejectModal && (
        <div className="printable-report-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="lab-rejection-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lab-rejection-dialog__header">
              <span className="material-symbols-rounded lab-rejection-dialog__icon">warning</span>
              <div>
                <h3 className="lab-rejection-dialog__title">Reject Specimen &amp; Request Redraw</h3>
                <p className="lab-rejection-dialog__sub">
                  This flags the specimen as compromised and sends the patient back to Phlebotomy Intake with an urgent Redraw Alert.
                </p>
              </div>
            </div>

            <div className="lab-rejection-dialog__body">
              <label className="lab-rejection-label">Primary Rejection Criterion</label>
              <select
                className="lab-rejection-select"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              >
                {REJECTION_REASONS.map((r, idx) => (
                  <option key={idx} value={r}>{r}</option>
                ))}
              </select>

              <label className="lab-rejection-label" style={{ marginTop: '12px' }}>
                Clinical Remarks for Nurse
              </label>
              <textarea
                className="lab-rejection-textarea"
                rows={2}
                placeholder="Specific instructions for phlebotomist..."
                value={customRejectionNote}
                onChange={(e) => setCustomRejectionNote(e.target.value)}
              />
            </div>

            <div className="lab-rejection-dialog__actions">
              <Md3Button variant="text" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Md3Button>
              <Md3Button variant="filled" className="lab-reject-confirm-btn" onClick={handleConfirmRejection} loading={verifying}>
                Confirm Redraw Request
              </Md3Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Panic Broadcast Modal */}
      {showPanicModal && (
        <div className="printable-report-backdrop" onClick={() => setShowPanicModal(false)}>
          <div className="lab-rejection-dialog lab-panic-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lab-rejection-dialog__header lab-panic-dialog__header">
              <span className="material-symbols-rounded lab-rejection-dialog__icon">emergency</span>
              <div>
                <h3 className="lab-rejection-dialog__title">Broadcast Emergency Critical Alert</h3>
                <p className="lab-rejection-dialog__sub">
                  Immediately transmits emergency critical values to {attendingDoctor} and the clinical care station.
                </p>
              </div>
            </div>

            <div className="lab-rejection-dialog__body">
              <div className="lab-panic-analytes-list">
                {criticalAnalytes.map((c, i) => (
                  <div key={i} className="lab-panic-analyte-chip">
                    <strong>{c.label}:</strong> {c.val} {c.unit} (Ref: {c.reference})
                  </div>
                ))}
              </div>

              <label className="lab-rejection-label" style={{ marginTop: '12px' }}>
                Urgent Clinical Notes for Care Team
              </label>
              <textarea
                className="lab-rejection-textarea"
                rows={2}
                placeholder="Immediate clinical intervention notes..."
                value={panicNotes}
                onChange={(e) => setPanicNotes(e.target.value)}
              />
            </div>

            <div className="lab-rejection-dialog__actions">
              <Md3Button variant="text" onClick={() => setShowPanicModal(false)}>
                Cancel
              </Md3Button>
              <Md3Button variant="filled" className="lab-panic-confirm-btn" onClick={handleConfirmPanicAlert} loading={broadcastingPanic}>
                Transmit Panic Broadcast
              </Md3Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Preview Dialog */}
      {showPrintModal && selectedVisit && activeOrder && (
        <PrintableLabReportDialog
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          visit={selectedVisit}
          order={activeOrder}
          currentUser={currentUser}
          laboratories={laboratories}
        />
      )}

      {/* Scan Document Viewer Dialog */}
      {selectedScanReportId && (
        <Md3ScanViewerDialog
          isOpen={Boolean(selectedScanReportId)}
          onClose={() => setSelectedScanReportId(null)}
          scanReportId={selectedScanReportId}
          testName={activeOrder?.testName || 'Diagnostic Scan'}
          patientName={selectedVisit?.patientId?.fullName || ''}
          mrn={selectedVisit?.patientId?.mrn || ''}
        />
      )}
    </div>
  );
};

export default LabDoctorCockpit;
