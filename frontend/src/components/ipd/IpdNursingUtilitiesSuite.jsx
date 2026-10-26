import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';
import { Md3Tabs } from '../md3/Md3Widgets';
import Md3ClinicalDrawer from '../md3/Md3ClinicalDrawer';
import BedMapCanvas from './BedMapCanvas';
import BedDetailDrawer from './BedDetailDrawer';
import { AdmissionSheet } from './AdmissionSheet';
import { BedTransferDialog } from './BedTransferDialog';
import { GatePassPrintable } from './GatePassPrintable';
import { cleanClinicalText } from '../../utils/clinicalText';
import Md3ConfirmDialog from '../md3/Md3ConfirmDialog';
import ipdApi from '../../services/ipdApi';
import api from '../../services/api';
import './IpdNursingUtilitiesSuite.css';

/**
 * UTILITY_TABS
 */
export const UTILITY_TABS = [
  { id: 'ADMIT_BED_MAP', label: 'Bed Map & Admission', icon: <span className="material-symbols-rounded">hotel</span> },
  { id: 'WARD_TRANSFERS', label: 'Ward Transfer Ledger', icon: <span className="material-symbols-rounded">swap_horiz</span> },
  { id: 'EMERGENCY_REQUISITION', label: 'Ward Pharmacy Stock', icon: <span className="material-symbols-rounded">medication</span> },
  { id: 'CRASH_CART_CODE_BLUE', label: 'Crash Cart & Code Blue', icon: <span className="material-symbols-rounded">emergency</span> },
  { id: 'DISCHARGED_ARCHIVE', label: 'Discharged Patients', icon: <span className="material-symbols-rounded">history</span> },
  { id: 'IV_INFUSION_DOSER', label: 'IV Infusion Doser', icon: <span className="material-symbols-rounded">water_drop</span> },
];

/**
 * IpdNursingUtilitiesSuite — Full-Screen Material Design 3 Ward Operations & Logistics Workspace.
 */
export const IpdNursingUtilitiesSuite = ({
  activeTab: controlledTab,
  onChangeTab,
  initialTab = 'ADMIT_BED_MAP',
  admission = null,
  onAdmissionCreated,
  onTransferSuccess,
  onReturnToClinical,
}) => {
  const { user, logout } = useAuth();
  const [internalTab, setInternalTab] = useState(initialTab);
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleTabChange = (newTab) => {
    setInternalTab(newTab);
    onChangeTab && onChangeTab(newTab);
  };

  const [toastMessage, setToastMessage] = useState(null);

  // Sync activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab && controlledTab === undefined) {
      setInternalTab(initialTab);
    }
  }, [initialTab, controlledTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentTabObj = UTILITY_TABS.find((t) => t.id === activeTab) || UTILITY_TABS[0];

  return (
    <div className="ipd-ward-ops-workspace">
      {/* ── Reusable Material 3 Navigation Drawer for Mobile/Tablet ── */}
      <Md3ClinicalDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        brandTitle="Ward Operations"
        brandSubtitle="Facility Logistics & Tools"
        brandIcon={<span className="material-symbols-rounded">domain</span>}
        navItems={UTILITY_TABS}
        activeTab={activeTab}
        onNavigate={(tabId) => {
          handleTabChange(tabId);
          setIsMobileDrawerOpen(false);
        }}
        user={user}
        onLogout={logout}
      />

      {/* ── Mobile/Tablet Sticky Toolbar ── */}
      <div className="ipd-util-mobile-toolbar">
        <button
          type="button"
          className="ipd-util-mobile-drawer-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Ward Operations Drawer"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Ward Tools</span>
          <span className="ipd-util-mobile-count-badge">6</span>
        </button>

        <div className="ipd-util-mobile-active-preview">
          <span className="ipd-util-mobile-active-pill">
            {currentTabObj?.icon}
            <span>{currentTabObj?.label}</span>
          </span>
        </div>

        {onReturnToClinical && (
          <button
            type="button"
            className="ipd-util-mobile-return-icon-btn"
            onClick={onReturnToClinical}
            title="Return to Patient Care"
          >
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
        )}
      </div>

      {/* Workspace Top Header (Desktop) */}
      <div className="ipd-util-header">
        <div className="ipd-util-header-brand">
          <div className="ipd-util-avatar">
            <span className="material-symbols-rounded">domain</span>
          </div>
          <div>
            <h2 className="ipd-util-title">Ward Operations &amp; Facility Logistics Suite</h2>
            <p className="ipd-util-sub">
              Spatial Bed Matrix · Ward Transfer Ledger · Emergency Floor Stock · Code Blue Protocol · Discharges · IV Dosing
            </p>
          </div>
        </div>

        {onReturnToClinical && (
          <button
            type="button"
            className="ipd-util-return-btn"
            onClick={onReturnToClinical}
            title="Switch to Patient Clinical Care View"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_back</span>
            <span>Return to Patient Care</span>
          </button>
        )}
      </div>

      {/* Reusable Material Design 3 Navigation Tabs (Desktop) */}
      <div className="ipd-util-nav-strip">
        <Md3Tabs
          tabs={UTILITY_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="ipd-util-md3-tabs"
        />
      </div>

      {/* Dynamic Utility Body Panel with subtle smooth transition */}
      <div className="ipd-util-body">
        <div key={activeTab} className="ipd-util-body-content">
          {activeTab === 'ADMIT_BED_MAP' && (
            <BedMapAndAdmitPane
              showToast={showToast}
              onSuccess={() => {
                showToast('Inpatient successfully admitted & bed allocated.');
                onAdmissionCreated && onAdmissionCreated();
              }}
            />
          )}

          {activeTab === 'WARD_TRANSFERS' && (
            <WardTransferLedgerPane
              admission={admission}
              showToast={showToast}
              onTransferExecuted={() => {
                showToast('Ward transfer successfully initiated.');
                onTransferSuccess && onTransferSuccess();
              }}
            />
          )}

          {activeTab === 'EMERGENCY_REQUISITION' && (
            <EmergencyRequisitionPane
              onRequisitionSent={() => showToast('Emergency floor stock requisition dispatched to Pharmacy.')}
            />
          )}

          {activeTab === 'CRASH_CART_CODE_BLUE' && (
            <CrashCartCodeBluePane
              onCodeBlueTriggered={() => showToast('RAPID RESPONSE / CODE BLUE BROADCAST TO CRITICAL CARE TEAM!')}
            />
          )}

          {activeTab === 'DISCHARGED_ARCHIVE' && <DischargedPatientsArchivePane />}

          {activeTab === 'IV_INFUSION_DOSER' && (
            <IvInfusionDoserPane
              onApplyToEmar={(order) => {
                showToast(`IV Infusion (${order.rate} mL/hr) calculated.`);
              }}
            />
          )}
        </div>
      </div>



      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="ipd-util-toast">
          <span className="material-symbols-rounded">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   1. Bed Map & Rapid Inpatient Admission Pane (BookMyShow Spatial Canvas)
───────────────────────────────────────────────────────────── */
const BedMapAndAdmitPane = ({ onSuccess, showToast }) => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardClassFilter, setWardClassFilter] = useState('ALL');

  // Modals
  const [showAdmitSheet, setShowAdmitSheet] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTarget, setTransferTarget] = useState({ bed: null, admission: null });

  const loadBedMap = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      const data = res.data?.data || [];
      setFloors(data);
      if (data.length > 0) {
        setActiveFloorId((prev) => (prev ? prev : String(data[0]._id)));
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load live bed map:', err);
    }
  };

  useEffect(() => {
    loadBedMap();
    const interval = setInterval(loadBedMap, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectBed = (bed) => {
    setSelectedBed(bed);
  };

  const handleUpdateStatus = async (bedId, status) => {
    try {
      await ipdApi.updateBedStatus(bedId, status);
      setSelectedBed(null);
      showToast && showToast(`Bed status updated to ${status.replace(/_/g, ' ')}`);
      loadBedMap();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bed status');
    }
  };

  const isFiltered = statusFilter !== 'ALL' || wardClassFilter !== 'ALL';

  return (
    <div className="ipd-pane ipd-pane--bed-map">
      {/* ── Compact Filter & Navigation Toolbar ── */}
      <div className="ipd-bedmap-top-bar">
        <div className="ipd-bedmap-top-bar__filters">
          <div className="ipd-bedmap-top-bar__floor-select">
            <Md3Select
              label="Select Ward Floor"
              leadingIcon="layers"
              value={activeFloorId || (floors[0]?._id ? String(floors[0]._id) : '')}
              onChange={(e) => setActiveFloorId(e.target.value)}
            >
              {floors.map((f) => {
                const cleanFloorName = cleanClinicalText(f.floorName || '');
                const cleanWing = cleanClinicalText(f.wing || '');
                const shortName = cleanWing || cleanFloorName.split('—')[0].trim() || `Floor ${f.floorNumber}`;
                const freeCount = f.stats
                  ? f.stats.vacantBeds
                  : (f.rooms || []).reduce(
                      (acc, rm) => acc + (rm.beds || []).filter((b) => b.status === 'VACANT').length,
                      0
                    );
                return (
                  <option key={f._id} value={String(f._id)}>
                    Floor {f.floorNumber}: {shortName} ({freeCount} Free Beds)
                  </option>
                );
              })}
            </Md3Select>
          </div>

          <div className="ipd-bedmap-top-bar__status-select">
            <Md3Select
              label="Bed Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="VACANT">Vacant Only</option>
              <option value="OCCUPIED">Occupied Only</option>
              <option value="RESERVED">Reserved</option>
              <option value="UNDER_MAINTENANCE">Maintenance / Cleaning</option>
            </Md3Select>
          </div>

          <div className="ipd-bedmap-top-bar__ward-select">
            <Md3Select
              label="Ward Class Tier"
              value={wardClassFilter}
              onChange={(e) => setWardClassFilter(e.target.value)}
            >
              <option value="ALL">All Ward Tiers</option>
              <option value="GENERAL_WARD">General Ward</option>
              <option value="SEMI_PRIVATE">Semi-Private</option>
              <option value="PRIVATE">Private Single</option>
              <option value="DELUXE_PRIVATE">Deluxe Suite</option>
              <option value="ICU">ICU Critical Care</option>
              <option value="CCU">CCU Cardiac Care</option>
              <option value="EMERGENCY">Emergency Bay</option>
            </Md3Select>
          </div>

          {isFiltered && (
            <Md3Button
              variant="text"
              onClick={() => {
                setStatusFilter('ALL');
                setWardClassFilter('ALL');
              }}
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            >
              Reset Filters
            </Md3Button>
          )}
        </div>

        <div className="ipd-bedmap-top-bar__actions">
          <Md3Button
            variant="tonal"
            onClick={loadBedMap}
            disabled={loading}
            style={{ height: '40px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>sync</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Map'}</span>
          </Md3Button>
        </div>
      </div>

      {/* 2D Spatial Bed Canvas with Zero Infrastructure Editing Access (isAdminView={false}) */}
      <BedMapCanvas
        floors={floors}
        activeFloorId={activeFloorId}
        onFloorChange={setActiveFloorId}
        selectedBedId={selectedBed ? String(selectedBed._id) : null}
        onSelectBed={handleSelectBed}
        statusFilter={statusFilter}
        wardClassFilter={wardClassFilter}
        isAdminView={false}
      />

      {/* Slide-in Bed Inspector Drawer on Bed Tap */}
      {selectedBed && (
        <BedDetailDrawer
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
          onOpenAdmit={(b) => {
            setSelectedBed(b);
            setShowAdmitSheet(true);
          }}
          onOpenTransfer={(b, adm) => {
            setTransferTarget({ bed: b, admission: adm });
            setShowTransferDialog(true);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Rapid Inpatient Admission Sheet */}
      {showAdmitSheet && selectedBed && (
        <AdmissionSheet
          bed={selectedBed}
          onClose={() => setShowAdmitSheet(false)}
          onSuccess={() => {
            setShowAdmitSheet(false);
            setSelectedBed(null);
            showToast && showToast('Inpatient admitted & allocated to bed successfully.');
            onSuccess && onSuccess();
            loadBedMap();
          }}
        />
      )}

      {/* Enhanced Atomic Bed Transfer Confirmation Dialog */}
      {showTransferDialog && (
        <BedTransferDialog
          bed={transferTarget.bed}
          admission={transferTarget.admission}
          onClose={() => setShowTransferDialog(false)}
          onSuccess={() => {
            setShowTransferDialog(false);
            setSelectedBed(null);
            showToast && showToast('Patient bed transfer and financial ledger update executed successfully.');
            loadBedMap();
            onSuccess && onSuccess();
          }}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   2. IV Infusion Rate & Drug Dosage Calculator
───────────────────────────────────────────────────────────── */
const IvInfusionDoserPane = ({ onApplyToEmar }) => {
  const [volumeMl, setVolumeMl] = useState(500);
  const [durationHrs, setDurationHrs] = useState(4);
  const [dropFactor, setDropFactor] = useState(20); // 10, 15, 20 (macro), 60 (micro)
  const [drugDoseMg, setDrugDoseMg] = useState(100);
  const [patientWeightKg, setPatientWeightKg] = useState(70);

  const { flowRateMlHr, dropRateGttMin, infusionDurationFormatted, doseRatePerKg } = useMemo(() => {
    const hours = Number(durationHrs) || 1;
    const vol = Number(volumeMl) || 0;
    const rate = (vol / hours).toFixed(1);
    const gtt = Math.round((vol * Number(dropFactor)) / (hours * 60));
    const dosePerKg = ((Number(drugDoseMg) * 1000) / (Number(patientWeightKg) * (hours * 60))).toFixed(2);

    return {
      flowRateMlHr: rate,
      dropRateGttMin: gtt,
      infusionDurationFormatted: `${hours} hours (${hours * 60} mins)`,
      doseRatePerKg: dosePerKg,
    };
  }, [volumeMl, durationHrs, dropFactor, drugDoseMg, patientWeightKg]);

  return (
    <div className="ipd-pane ipd-pane--iv-doser">
      <div className="ipd-calc-layout">
        <div className="ipd-calc-inputs">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <Md3TextField
              label="Total Bag Volume (mL) *"
              type="number"
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value)}
            />
            <Md3TextField
              label="Infusion Time (Hours) *"
              type="number"
              step="0.5"
              value={durationHrs}
              onChange={(e) => setDurationHrs(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <Md3Select
              label="IV Set Drop Factor"
              value={dropFactor}
              onChange={(e) => setDropFactor(e.target.value)}
            >
              <option value={20}>Standard Macro-drip (20 gtts/mL)</option>
              <option value={15}>Standard Macro-drip (15 gtts/mL)</option>
              <option value={10}>Blood Tubing / Macro (10 gtts/mL)</option>
              <option value={60}>Pediatric Micro-drip (60 gtts/mL)</option>
            </Md3Select>
            <Md3TextField
              label="Patient Weight (kg)"
              type="number"
              value={patientWeightKg}
              onChange={(e) => setPatientWeightKg(e.target.value)}
            />
          </div>

          <Md3TextField
            label="Additive Drug Dose (mg) — Optional"
            type="number"
            value={drugDoseMg}
            onChange={(e) => setDrugDoseMg(e.target.value)}
          />
        </div>

        <div className="ipd-calc-results-card">
          <h4 className="ipd-results-title">Calculated Delivery Parameters</h4>

          <div className="ipd-calc-metric-row">
            <span className="ipd-metric-label">Infusion Pump Flow Rate</span>
            <span className="ipd-metric-value ipd-metric-value--teal">{flowRateMlHr} mL/hr</span>
          </div>

          <div className="ipd-calc-metric-row">
            <span className="ipd-metric-label">Gravity Drop Rate</span>
            <span className="ipd-metric-value ipd-metric-value--indigo">{dropRateGttMin} gtts/min</span>
          </div>

          <div className="ipd-calc-metric-row">
            <span className="ipd-metric-label">Infusion Duration</span>
            <span className="ipd-metric-value">{infusionDurationFormatted}</span>
          </div>

          <div className="ipd-calc-metric-row">
            <span className="ipd-metric-label">Weight-Adjusted Delivery</span>
            <span className="ipd-metric-value">{doseRatePerKg} mcg/kg/min</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Md3Button
              variant="filled"
              onClick={() => onApplyToEmar({ rate: flowRateMlHr, drops: dropRateGttMin })}
            >
              Copy Parameters to Nursing e-MAR
            </Md3Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   3. Inter-Ward Bed Transfer & Financial Audit Ledger Pane
───────────────────────────────────────────────────────────── */
const WardTransferLedgerPane = ({ admission, onTransferExecuted, showToast }) => {
  const navigate = useNavigate();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedTransfers({ limit: 50 });
      setTransfers(res.data?.data || []);
      setLoading(false);
    } catch (err) {
      console.warn('Could not load bed transfers:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const filteredTransfers = transfers.filter((t) => {
    const term = search.toLowerCase();
    const pName = `${t.patientId?.firstName || ''} ${t.patientId?.lastName || ''}`.toLowerCase();
    const mrn = (t.patientId?.mrn || '').toLowerCase();
    const bed = (t.bedId?.bedLabel || t.bedId?.bedNumber || '').toLowerCase();
    const reason = (t.transferReason || '').toLowerCase();
    return pName.includes(term) || mrn.includes(term) || bed.includes(term) || reason.includes(term);
  });

  return (
    <div className="ipd-pane ipd-pane--transfers">
      {/* Action & Search Strip */}
      <div className="ipd-pane-action-bar">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {admission && (
            <Md3Button
              variant="filled"
              onClick={() => setShowTransferDialog(true)}
              leadingIcon={<span className="material-symbols-rounded" style={{ fontSize: '18px' }}>swap_horiz</span>}
            >
              + Transfer Current Inpatient
            </Md3Button>
          )}

          <Md3Button
            variant="tonal"
            onClick={loadTransfers}
            disabled={loading}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>sync</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Ledger'}</span>
          </Md3Button>
        </div>

        <div style={{ width: '100%', maxWidth: '300px' }}>
          <Md3TextField
            label="Search Transfers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, MRN, bed..."
          />
        </div>
      </div>

      <div className="ipd-transfers-table-wrap">
        <table className="ipd-table">
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>Patient / MRN</th>
              <th>Allocated Bed &amp; Tier</th>
              <th>Room &amp; Floor</th>
              <th>Clinical Justification</th>
              <th>Authorizing Staff</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)' }}>
                  Loading hospital bed transfer logs...
                </td>
              </tr>
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)' }}>
                  No bed transfer events recorded in this period.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((t) => {
                const p = t.patientId || {};
                const staff = t.transferredBy || {};
                const admissionId = t.admissionId?._id || t.admissionId;

                return (
                  <tr key={t._id}>
                    <td>
                      <code>TR-{String(t._id).slice(-6).toUpperCase()}</code>
                    </td>
                    <td>
                      <strong>{p.firstName} {p.lastName || ''}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-outline)' }}>
                        MRN: {p.mrn} · {p.gender} / {p.age || '—'}y
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--md-sys-color-primary, #006a6a)' }}>
                        {t.bedId?.bedLabel || `Bed ${t.bedId?.bedNumber || '—'}`}
                      </strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                        {t.wardClass?.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td>
                      Room {t.roomId?.roomNumber || '—'}
                      <div style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-outline)' }}>
                        {t.floorId?.floorName || 'Ward Floor'}
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <span title={t.transferReason} style={{ fontSize: '0.82rem' }}>
                        {t.transferReason || 'Clinical ward transfer'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.80rem' }}>
                        {staff.firstName ? `${staff.firstName} ${staff.lastName || ''}` : 'Ward Clinician'}
                      </span>
                      {staff.employeeId && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)' }}>
                          ID: {staff.employeeId}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(t.createdAt || t.allocatedFrom).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>
                      {admissionId && (
                        <button
                          type="button"
                          className="ipd-util-return-btn"
                          onClick={() => navigate(`/dashboard/ipd/billing/${admissionId}`)}
                          title="View Inpatient Financial Ledger"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>receipt_long</span>
                          <span>Ledger</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showTransferDialog && admission && (
        <BedTransferDialog
          bed={admission.currentBedId}
          admission={admission}
          onClose={() => setShowTransferDialog(false)}
          onSuccess={() => {
            setShowTransferDialog(false);
            showToast && showToast('Patient bed transfer executed successfully.');
            loadTransfers();
            onTransferExecuted && onTransferExecuted();
          }}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   4. Discharged Inpatient History & Gate Pass Archive Pane
───────────────────────────────────────────────────────────── */
const DischargedPatientsArchivePane = () => {
  const [search, setSearch] = useState('');
  const [selectedDischarge, setSelectedDischarge] = useState(null);

  const mockDischarges = [
    {
      id: 'DIS-901',
      patientName: 'Arthur Dent',
      mrn: 'MRN-7734',
      wardClass: 'Semi-Private Room 302',
      admitDate: '04-09-2026',
      dischargeDate: '10-09-2026',
      doctor: 'Dr. Alistair Finch (Internal Medicine)',
      finalDiagnosis: 'Acute Bacterial Pneumonia — Recovered',
      dischargeStatus: 'CLEARANCE_COMPLETE',
      gatePassNumber: 'GP-2026-9912',
    },
    {
      id: 'DIS-902',
      patientName: 'Clara Oswald',
      mrn: 'MRN-6642',
      wardClass: 'General Ward Bed 102',
      admitDate: '07-09-2026',
      dischargeDate: '10-09-2026',
      doctor: 'Dr. Raymond Palmer (Orthopedics)',
      finalDiagnosis: 'Closed Tibia Fracture Post-ORIF Fixation',
      dischargeStatus: 'CLEARANCE_COMPLETE',
      gatePassNumber: 'GP-2026-9915',
    },
  ];

  const filtered = mockDischarges.filter(
    (d) =>
      d.patientName.toLowerCase().includes(search.toLowerCase()) ||
      d.mrn.toLowerCase().includes(search.toLowerCase()) ||
      d.finalDiagnosis.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ipd-pane ipd-pane--discharged">
      <div className="ipd-pane-action-bar" style={{ justifyContent: 'flex-end' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <Md3TextField
            label="Search Inpatient Records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, MRN, diagnosis..."
          />
        </div>
      </div>

      <div className="ipd-transfers-table-wrap">
        <table className="ipd-table">
          <thead>
            <tr>
              <th>Discharge Slip</th>
              <th>Patient Details</th>
              <th>Stay Duration</th>
              <th>Attending Consultant</th>
              <th>Final Clinical Diagnosis</th>
              <th>Gate Pass Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td><code>{d.id}</code></td>
                <td><strong>{d.patientName}</strong> <br /><small>{d.mrn}</small></td>
                <td>{d.admitDate} → {d.dischargeDate}</td>
                <td>{d.doctor}</td>
                <td>{d.finalDiagnosis}</td>
                <td>
                  <span className="ipd-status-pill ipd-status-pill--completed">
                    {d.gatePassNumber}
                  </span>
                </td>
                <td>
                  <Md3Button variant="tonal" onClick={() => setSelectedDischarge(d)}>
                    <span className="material-symbols-rounded">receipt_long</span>
                    <span>View Gate Pass</span>
                  </Md3Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDischarge && (
        <GatePassPrintable
          gatePassData={selectedDischarge}
          onClose={() => setSelectedDischarge(null)}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   5. Emergency Ward Floor Pharmacy Stock Requisition Pane
───────────────────────────────────────────────────────────── */
const EmergencyRequisitionPane = ({ onRequisitionSent }) => {
  const [items, setItems] = useState([
    { name: 'Inj. Atropine 0.6mg/mL Ampoule', qty: 5, category: 'Emergency Ampoules' },
    { name: 'Inj. Adrenaline (Epinephrine) 1:1000', qty: 5, category: 'Emergency Ampoules' },
    { name: 'IV Normal Saline 0.9% 500mL', qty: 10, category: 'IV Fluids' },
    { name: 'IV Ringer Lactate 500mL', qty: 10, category: 'IV Fluids' },
    { name: 'IV Cannula 20G (Pink) & 18G (Green)', qty: 20, category: 'Consumables' },
  ]);

  const [urgency, setUrgency] = useState('STAT_EMERGENCY');
  const [remarks, setRemarks] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    onRequisitionSent && onRequisitionSent();
  };

  return (
    <div className="ipd-pane ipd-pane--requisition">
      <form onSubmit={handleSend} className="ipd-req-form">
        <div className="ipd-req-items-list">
          <table className="ipd-table">
            <thead>
              <tr>
                <th>Emergency Item</th>
                <th>Category</th>
                <th>Requested Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="ipd-status-pill ipd-status-pill--neutral">{item.category}</span></td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].qty = Number(e.target.value);
                        setItems(newItems);
                      }}
                      style={{ width: '80px', padding: '6px', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '16px' }}>
          <Md3Select label="Requisition Urgency Level" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="STAT_EMERGENCY">STAT Emergency (&lt; 15 mins)</option>
            <option value="ROUTINE_FLOOR_RESTOCK">Routine Shift Restock (Next 2 Hours)</option>
          </Md3Select>
          <Md3TextField label="Ward Floor Location & Notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Inpatient Ward Floor 2 Nursing Station" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Md3Button variant="filled" type="submit">
            Dispatch Requisition to Pharmacy
          </Md3Button>
        </div>
      </form>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   6. Crash Cart & Rapid Response / Code Blue Protocol Pane
───────────────────────────────────────────────────────────── */
const CrashCartCodeBluePane = ({ onCodeBlueTriggered }) => {
  const [defibChecked, setDefibChecked] = useState(true);
  const [o2Checked, setO2Checked] = useState(true);
  const [airwayChecked, setAirwayChecked] = useState(true);
  const [suctionChecked, setSuctionChecked] = useState(true);
  const [drugsChecked, setDrugsChecked] = useState(true);
  const [isCodeBlueConfirmOpen, setIsCodeBlueConfirmOpen] = useState(false);

  return (
    <div className="ipd-pane ipd-pane--crash-cart">
      <div className="ipd-crash-cart-layout">
        <div className="ipd-crash-cart-checklist">
          <h4 className="ipd-checklist-title">Shift Crash Cart Verification Checklist</h4>
          <label className="ipd-check-item">
            <input type="checkbox" checked={defibChecked} onChange={(e) => setDefibChecked(e.target.checked)} />
            <span>Defibrillator Tested &amp; Battery Full (Pads, ECG Leads, Gel)</span>
          </label>
          <label className="ipd-check-item">
            <input type="checkbox" checked={o2Checked} onChange={(e) => setO2Checked(e.target.checked)} />
            <span>Emergency Oxygen Cylinder Pressure &gt; 1500 PSI</span>
          </label>
          <label className="ipd-check-item">
            <input type="checkbox" checked={airwayChecked} onChange={(e) => setAirwayChecked(e.target.checked)} />
            <span>Airway Drawer Intact (Laryngoscope, ET Tubes, Ambu Bag)</span>
          </label>
          <label className="ipd-check-item">
            <input type="checkbox" checked={suctionChecked} onChange={(e) => setSuctionChecked(e.target.checked)} />
            <span>Portable Suction Machine Tested &amp; Tubing Connected</span>
          </label>
          <label className="ipd-check-item">
            <input type="checkbox" checked={drugsChecked} onChange={(e) => setDrugsChecked(e.target.checked)} />
            <span>Emergency Drug Drawer Sealed (Adrenaline, Atropine, Amiodarone)</span>
          </label>
        </div>

        <div className="ipd-code-blue-card">
          <div className="ipd-code-blue-icon">
            <span className="material-symbols-rounded">emergency</span>
          </div>
          <h3 className="ipd-code-blue-title">RAPID RESPONSE / CODE BLUE</h3>
          <p className="ipd-code-blue-desc">
            Broadcasts an instant high-priority emergency alert to ICU, Anesthesia, and Critical Care Code Blue Teams.
          </p>
          <button
            type="button"
            className="ipd-code-blue-btn"
            onClick={() => setIsCodeBlueConfirmOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>emergency</span>
            <span>BROADCAST CODE BLUE EMERGENCY</span>
          </button>
        </div>
      </div>

      {/* ── CODE BLUE EMERGENCY CONFIRMATION MODAL ── */}
      <Md3ConfirmDialog
        isOpen={isCodeBlueConfirmOpen}
        title="Broadcast CODE BLUE Alert?"
        message="This will broadcast an instant, high-priority emergency alert to ICU, Anesthesiology, and Critical Care Rapid Response Teams for this ward."
        confirmLabel="Broadcast CODE BLUE"
        cancelLabel="Cancel"
        variant="danger"
        icon="emergency"
        onConfirm={() => {
          setIsCodeBlueConfirmOpen(false);
          onCodeBlueTriggered && onCodeBlueTriggered();
        }}
        onClose={() => setIsCodeBlueConfirmOpen(false)}
      />
    </div>
  );
};

export default IpdNursingUtilitiesSuite;
