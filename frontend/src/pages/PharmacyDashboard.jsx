import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { usePharmacyDispense } from '../hooks/usePharmacyDispense';
import CommonHeader from '../components/shell/CommonHeader';
import Md3ClinicalDrawer from '../components/md3/Md3ClinicalDrawer';
import { Icon, Md3Tabs } from '../components/md3/Md3Widgets';
import { Md3TextField } from '../components/md3/Md3FormComponents';
import BillHistoryViewer from '../features/billing/bills/BillHistoryViewer';
import BillingTemplate from '../features/billing/BillingTemplate';
import DirectDispenseModal from '../features/pharmacy/DirectDispenseModal';
import PharmacyInventoryView from '../features/pharmacy/PharmacyInventoryView';
import ClinicalStationIdleDeck from '../components/md3/ClinicalStationIdleDeck';
import { timeSince, formatQueueWaitTime } from '../utils/dateFormatting';
import { formatDoctorName } from '../utils/patientFormatters';
import { CURRENCY_SYMBOL } from '../constants/currency';
import './PharmacyDashboard.css';

/**
 * PharmacyDashboard — Pure Presentation Component
 *
 * SOLID:
 *   SRP  — Renders UI only. All queue management, billing, and dispense logic
 *           lives in usePharmacyDispense hook.
 *   OCP  — Add new pharmacy features by extending the hook, not this file.
 *   DIP  — Depends on usePharmacyDispense abstraction and timeSince utility.
 */
const PharmacyDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileQueueDrawerOpen, setIsMobileQueueDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    activeTab,
    setActiveTab,
    selectedPatient,
    queue,
    selectedVisit,
    medications,
    validationErrors,
    consultationFee,
    setConsultationFee,
    labCharges,
    setLabCharges,
    submitting,
    showPreview,
    setShowPreview,
    hospitalInfo,
    labels,
    fieldVisibility,
    customFields,
    fetchQueue,
    handlePatientSelect,
    handleDirectPharmacy,
    selectVisit,
    handleAddMedication,
    handleRemoveMedication,
    handleMedChange,
    handleDosageChange,
    handleGeneratePreview,
    handleFinalize,
    totalBillAmount,
    directDispenseOpen,
    setDirectDispenseOpen,
    catalogMedicines,
    handleStartDirectDispenseForPatient,
  } = usePharmacyDispense();

  // Primary Navigation tabs configuration
  const pharmacyTabs = [
    {
      id: 'queue',
      label: 'Pending Prescriptions & Bills',
      icon: <span className="material-symbols-rounded">prescriptions</span>,
    },
    {
      id: 'inventory',
      label: 'Stock Ledger & Formulary',
      icon: <span className="material-symbols-rounded">inventory_2</span>,
    },
    {
      id: 'history',
      label: 'Dispense & Bill History',
      icon: <span className="material-symbols-rounded">history_edu</span>,
    },
  ];

  // Filtered queue based on quick search
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter((v) => {
      const p = v.patientId || {};
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const mrn = (p.mrn || '').toLowerCase();
      const token = String(v.tokenNumber || '').toLowerCase();
      const doc = formatDoctorName(v.consultation?.doctorId).toLowerCase();
      return fullName.includes(q) || mrn.includes(q) || token.includes(q) || doc.includes(q);
    });
  }, [queue, searchQuery]);

  // Segregate Prescribed Medications vs Pharmacist Supplemental Additions
  const prescribedMeds = useMemo(
    () =>
      medications
        .map((med, index) => ({ ...med, originalIndex: index }))
        .filter((med) => med.isDoctorPrescribed !== false),
    [medications]
  );

  const pharmacistMeds = useMemo(
    () =>
      medications
        .map((med, index) => ({ ...med, originalIndex: index }))
        .filter((med) => med.isDoctorPrescribed === false),
    [medications]
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const renderQueueContent = () => (
    <>
      <div className="pharmacy-queue-header">
        <div className="pharmacy-queue-header-left">
          <button
            type="button"
            className="pharmacy-collapse-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Patient Queue Sidebar"
            aria-label="Collapse Queue"
          >
            <span className="material-symbols-rounded">left_panel_close</span>
          </button>
          <span className="pharmacy-queue-count" title={`${filteredQueue.length} Pending Prescriptions`}>
            {filteredQueue.length}
          </span>
        </div>

        <div className="pharmacy-queue-header-actions">
          <button
            type="button"
            className="pharmacy-refresh-btn"
            onClick={fetchQueue}
            title="Refresh Pending Prescriptions"
            aria-label="Refresh Queue"
          >
            <span className="material-symbols-rounded">sync</span>
          </button>

          <button
            type="button"
            className="pharmacy-mobile-close-btn"
            onClick={() => setIsMobileQueueDrawerOpen(false)}
            title="Close Queue Drawer"
            aria-label="Close Queue Drawer"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>

      <div className="pharmacy-queue-search">
        <Md3TextField
          label="Search Patient (Name, MRN, Token, Doctor)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Quick search..."
        />
      </div>

      <div className="pharmacy-queue-list" role="list">
        {filteredQueue.length === 0 ? (
          <div className="pharmacy-queue-empty">
            <span className="material-symbols-rounded" style={{ fontSize: '2rem', opacity: 0.5 }}>inbox</span>
            <p style={{ margin: '0.5rem 0 0 0' }}>No pending prescriptions in queue</p>
          </div>
        ) : (
          filteredQueue.map((v) => {
            const p = v.patientId || {};
            const isSelected = selectedVisit?._id === v._id;
            const patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.mrn || v.tokenNumber}`;
            return (
              <article
                key={v._id}
                className={`pharmacy-queue-card ${isSelected ? 'pharmacy-queue-card--active' : ''}`}
                onClick={() => {
                  selectVisit(v);
                  setIsMobileQueueDrawerOpen(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectVisit(v);
                    setIsMobileQueueDrawerOpen(false);
                  }
                }}
                aria-label={`${patientName}, waiting ${timeSince(v.updatedAt || v.createdAt)}`}
              >
                <div className="pharmacy-queue-card__top-row">
                  <div className="pharmacy-queue-card__token-wrap">
                    {v.tokenNumber ? (
                      <span className="pharmacy-queue-card__token-chip">
                        #{v.tokenNumber}
                      </span>
                    ) : (
                      <span className="pharmacy-queue-card__token-chip">Token</span>
                    )}
                  </div>
                  <span className="pharmacy-queue-card__wait-badge">
                    <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>schedule</span>
                    <span>{formatQueueWaitTime(v.updatedAt || v.createdAt)}</span>
                  </span>
                </div>

                <div className="pharmacy-queue-card__info">
                  <h3 className="pharmacy-queue-card__name">{patientName}</h3>
                  <p className="pharmacy-queue-card__meta">
                    <span>{p.age ?? '—'} yrs</span>
                    <span>·</span>
                    <span>{p.gender || '—'}</span>
                    {p.mrn && (
                      <>
                        <span>·</span>
                        <span>MRN: {p.mrn}</span>
                      </>
                    )}
                  </p>
                  {v.consultation?.doctorId && (
                    <div className="pharmacy-queue-card__doctor">
                      <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>stethoscope</span>
                      <span>{formatDoctorName(v.consultation.doctorId)}</span>
                    </div>
                  )}
                </div>

                <div className="pharmacy-queue-card__footer">
                  <span style={{ fontWeight: 700, color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)' }}>
                    {isSelected ? 'Desk Active' : 'Tap to Dispense'}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="pharmacy-page">

      {/* ─── TOP APP BAR (DESKTOP TABS & MOBILE HAMBURGER) ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Pharmacy`}
        brandSubtitle="Dispensing & Billing"
        centerSlot={
          <Md3Tabs
            tabs={pharmacyTabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
            className="pharmacy-header-tabs"
          />
        }
        actions={
          <button
            type="button"
            className="pharmacy-direct-dispense-btn"
            onClick={() => setDirectDispenseOpen(true)}
            title="Direct Over-The-Counter Medication Dispense"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>shopping_cart_checkout</span>
            <span>Direct OTC Dispense</span>
          </button>
        }
        user={user}
        onLogout={handleLogout}
        onMenuClick={() => setIsNavDrawerOpen(true)}
      />

      {/* ─── PRIMARY NAVIGATION DRAWER (MOBILE / TABLET) ─── */}
      <Md3ClinicalDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Pharmacy`}
        brandSubtitle="Dispensing Station"
        navItems={pharmacyTabs}
        activeTab={activeTab}
        onNavigate={(tabId) => {
          setActiveTab(tabId);
          setIsNavDrawerOpen(false);
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="pharmacy-main">

        {/* Dispense & Bill History tab */}
        {activeTab === 'history' && (
          <div className="pharmacy-panel pharmacy-panel--history">
            <BillHistoryViewer
              areaFilter="pharmacy"
              title="Pharmacy Dispense &amp; Bill History"
              subtitle="View, audit, and reprint previously dispensed medication invoices"
            />
          </div>
        )}

        {/* Stock Ledger & Formulary tab */}
        {activeTab === 'inventory' && (
          <div className="pharmacy-panel pharmacy-panel--inventory">
            <PharmacyInventoryView />
          </div>
        )}

        {/* Queue tab — Split pane */}
        {activeTab === 'queue' && (
          <>
            {/* ─── Mobile/Tablet Top Queue Quick Bar ─── */}
            <div className="pharmacy-mobile-queue-bar">
              <button
                type="button"
                className="pharmacy-mobile-queue-btn"
                onClick={() => setIsMobileQueueDrawerOpen(true)}
                aria-label="Open Pending Prescriptions Queue Drawer"
              >
                <span className="material-symbols-rounded">format_list_bulleted</span>
                <span>Pending Prescriptions</span>
                <span className="pharmacy-mobile-queue-badge">{filteredQueue.length}</span>
              </button>

              {selectedVisit && (
                <div className="pharmacy-mobile-patient-preview">
                  <span className="pharmacy-mobile-token-pill">
                    #{selectedVisit.tokenNumber || selectedVisit.patientId?.mrn}
                  </span>
                  <button
                    type="button"
                    className="pharmacy-mobile-back-btn"
                    onClick={() => selectVisit(null)}
                    title="Deselect patient and return to queue"
                    aria-label="Back to Queue"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                </div>
              )}
            </div>

            {/* ─── Mobile/Tablet Dedicated Patient Queue Drawer Portal ─── */}
            {isMobileQueueDrawerOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div className="pharmacy-queue-drawer-portal" role="dialog" aria-modal="true" aria-label="Pending Prescriptions Queue Drawer">
                  {/* Backdrop Scrim */}
                  <div
                    className="pharmacy-queue-drawer-scrim"
                    onClick={() => setIsMobileQueueDrawerOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Drawer Surface */}
                  <div className="pharmacy-queue-drawer-surface">
                    {renderQueueContent()}
                  </div>
                </div>,
                document.body
              )}

            <div className={`pharmacy-desk ${isSidebarCollapsed ? 'pharmacy-desk--rail' : ''}`}>

              {/* ─── LEFT MASTER: COLLAPSIBLE / RAIL PATIENT QUEUE SIDEBAR (DESKTOP) ─── */}
              {isSidebarCollapsed ? (
                <aside className="pharmacy-rail" aria-label="Collapsed Pharmacy Queue Rail">
                  <div className="pharmacy-rail-header">
                    <button
                      type="button"
                      className="pharmacy-rail-toggle-btn"
                      onClick={() => setIsSidebarCollapsed(false)}
                      title="Expand Patient Queue Sidebar"
                      aria-label="Expand Queue"
                    >
                      <span className="material-symbols-rounded">right_panel_open</span>
                    </button>
                    <span className="pharmacy-rail-count-badge" title={`${filteredQueue.length} Pending Prescriptions`}>
                      {filteredQueue.length}
                    </span>
                  </div>

                  <div className="pharmacy-rail-body">
                    {filteredQueue.map((v) => {
                      const p = v.patientId || {};
                      const firstName = p.firstName || p.name?.split(' ')[0] || 'Patient';
                      const initial = firstName.charAt(0).toUpperCase();
                      const isSelected = selectedVisit?._id === v._id;

                      return (
                        <button
                          key={v._id}
                          type="button"
                          className={`pharmacy-rail-item ${isSelected ? 'pharmacy-rail-item--selected' : ''}`}
                          onClick={() => selectVisit(v)}
                          title={`${firstName} ${p.lastName || ''} (Token #${v.tokenNumber || '—'})`}
                        >
                          <div className="pharmacy-rail-avatar">{initial}</div>
                          <span className="pharmacy-rail-token">#{v.tokenNumber || '—'}</span>
                          <span className="pharmacy-rail-name">{firstName}</span>
                        </button>
                      );
                    })}

                    {filteredQueue.length === 0 && (
                      <div className="pharmacy-rail-empty">
                        <span className="material-symbols-rounded" style={{ fontSize: '1.25rem', opacity: 0.4 }}>inbox</span>
                      </div>
                    )}
                  </div>
                </aside>
              ) : (
                <aside className="pharmacy-queue-pane">
                  {renderQueueContent()}
                </aside>
              )}

            {/* ─ Right: Dispensing Desk ─ */}
            <section className="pharmacy-workspace-pane">
              {!selectedVisit ? (
                <div style={{ width: '100%', padding: '16px' }}>
                  <ClinicalStationIdleDeck
                    preset="PHARMACY"
                    onAction={(key) => {
                      if (key === 'DIRECT_DISPENSE') setDirectDispenseOpen(true);
                    }}
                  />
                </div>
              ) : !showPreview ? (
                <div className="pharmacy-dispense-desk">

                  {/* ── MD3 PATIENT CLINICAL BANNER ── */}
                  <div className="pharmacy-patient-banner">
                    <div className="pharmacy-patient-banner__top">
                      <div className="pharmacy-patient-identity">
                        <div className="pharmacy-patient-avatar">
                          {selectedVisit.patientId?.firstName?.[0] || 'P'}
                          {selectedVisit.patientId?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="pharmacy-patient-title-row">
                            <h2 className="pharmacy-patient-name">
                              {selectedVisit.patientId?.firstName || '[Deleted'} {selectedVisit.patientId?.lastName || 'Patient]'}
                            </h2>
                            {selectedVisit.tokenNumber && (
                              <span className="pharmacy-token-badge">
                                Token #{selectedVisit.tokenNumber}
                              </span>
                            )}
                            <span className="pharmacy-mrn-chip">
                              MRN: {selectedVisit.patientId?.mrn || 'N/A'}
                            </span>
                          </div>
                          <div className="pharmacy-patient-submeta">
                            <span>{selectedVisit.patientId?.age ?? '—'} yrs</span>
                            <span>·</span>
                            <span>{selectedVisit.patientId?.gender || '—'}</span>
                            <span>·</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>call</span>
                              {selectedVisit.patientId?.phone || '—'}
                            </span>
                            <span>·</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>location_city</span>
                              {selectedVisit.patientId?.city || selectedVisit.patientId?.address?.city || '—'}
                            </span>
                            {selectedVisit.consultation?.doctorId && (
                              <>
                                <span>·</span>
                                <span className="pharmacy-doctor-tag">
                                  <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '3px' }}>stethoscope</span>
                                  {formatDoctorName(selectedVisit.consultation.doctorId)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Context Row */}
                    {selectedVisit.consultation?.doctorId && (selectedVisit.consultation?.diagnosis || selectedVisit.consultation?.treatmentPlan) && (
                      <div className="pharmacy-clinical-context-bar">
                        {selectedVisit.consultation?.diagnosis && (
                          <div className="pharmacy-context-item">
                            <span className="pharmacy-context-label">Diagnosis:</span>
                            <span className="pharmacy-context-value">{selectedVisit.consultation.diagnosis}</span>
                          </div>
                        )}
                        {selectedVisit.consultation?.treatmentPlan && (
                          <div className="pharmacy-context-item">
                            <span className="pharmacy-context-label">Treatment Plan:</span>
                            <span className="pharmacy-context-value">{selectedVisit.consultation.treatmentPlan}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── MEDICATION DISPENSE SECTIONS ── */}
                  <div className="pharmacy-medications-container">
                    {/* ── SECTION 1: DOCTOR PRESCRIBED MEDICATIONS ── */}
                    {selectedVisit.consultation?.doctorId && (
                      <div className="pharmacy-tier-card pharmacy-tier-card--prescribed">
                        <div className="pharmacy-tier-card__header">
                          <div className="pharmacy-tier-card__title-wrap">
                            <span className="material-symbols-rounded pharmacy-tier-card__icon pharmacy-tier-card__icon--doctor">
                              stethoscope
                            </span>
                            <div>
                              <h4 className="pharmacy-tier-card__title">
                                1. Doctor Prescribed Medications
                              </h4>
                              <p className="pharmacy-tier-card__desc">
                                Clinical prescription ordered by physician. Regimens are locked for patient safety.
                              </p>
                            </div>
                          </div>
                          <span className="pharmacy-tier-badge pharmacy-tier-badge--locked">
                            <span className="material-symbols-rounded" style={{ fontSize: '13px', marginRight: '4px' }}>lock</span>
                            Prescription Dosage Locked
                          </span>
                        </div>

                        {prescribedMeds.length === 0 ? (
                          <div className="pharmacy-tier-empty">
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>info</span>
                            <span>No medications prescribed during this consultation.</span>
                          </div>
                        ) : (
                          <div className="pharmacy-table-container">
                            <table className="pharmacy-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '34%' }}>Medicine Prescribed</th>
                                  <th style={{ width: '24%' }}>Alternative Given / Generic Substitution</th>
                                  <th style={{ width: '10%', textAlign: 'center' }}>Qty *</th>
                                  <th style={{ width: '14%', textAlign: 'right' }}>Unit Price ({CURRENCY_SYMBOL}) *</th>
                                  <th style={{ width: '13%', textAlign: 'right' }}>Line Total ({CURRENCY_SYMBOL})</th>
                                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescribedMeds.map((med) => {
                                  const idx = med.originalIndex;
                                  const lineTotal = ((Number(med.quantity) || 0) * (Number(med.unitPrice) || 0)).toFixed(2);
                                  return (
                                    <tr key={idx} className="pharmacy-med-row">
                                      <td className="pharmacy-cell--medicine" data-label="Medicine">
                                        <div className="pharmacy-med-cell">
                                          <input
                                            type="text"
                                            placeholder="Medicine Name"
                                            value={med.recommended}
                                            list={`med-catalog-${idx}`}
                                            onChange={(e) => handleMedChange(idx, 'recommended', e.target.value)}
                                            className="pharmacy-field-input pharmacy-field-input--strong"
                                          />
                                          <datalist id={`med-catalog-${idx}`}>
                                            {catalogMedicines.map((cm) => (
                                              <option key={cm._id} value={cm.medicineName}>
                                                {cm.genericName ? `${cm.genericName} — ` : ''}{CURRENCY_SYMBOL}{cm.unitPrice}/{cm.unit || 'tab'}
                                              </option>
                                            ))}
                                          </datalist>
                                          {med.dosageSchedule && (
                                            <div className="pharmacy-dosage-chips">
                                              <span className="pharmacy-dosage-chip pharmacy-dosage-chip--locked" title="Morning Dosage">
                                                <span className="material-symbols-rounded" style={{ fontSize: '12px', marginRight: '2px' }}>light_mode</span>
                                                FN (M): {med.dosageSchedule.morning?.count ?? 0}
                                                {med.dosageSchedule.morning?.timing && med.dosageSchedule.morning.timing !== 'N/A'
                                                  ? ` (${med.dosageSchedule.morning.timing.replace(/_/g, ' ')})` : ''}
                                              </span>
                                              <span className="pharmacy-dosage-chip pharmacy-dosage-chip--locked" title="Afternoon Dosage">
                                                <span className="material-symbols-rounded" style={{ fontSize: '12px', marginRight: '2px' }}>sunny</span>
                                                AN (A): {med.dosageSchedule.afternoon?.count ?? 0}
                                                {med.dosageSchedule.afternoon?.timing && med.dosageSchedule.afternoon.timing !== 'N/A'
                                                  ? ` (${med.dosageSchedule.afternoon.timing.replace(/_/g, ' ')})` : ''}
                                              </span>
                                              <span className="pharmacy-dosage-chip pharmacy-dosage-chip--locked" title="Night Dosage">
                                                <span className="material-symbols-rounded" style={{ fontSize: '12px', marginRight: '2px' }}>bedtime</span>
                                                Night: {med.dosageSchedule.night?.count ?? 0}
                                                {med.dosageSchedule.night?.timing && med.dosageSchedule.night.timing !== 'N/A'
                                                  ? ` (${med.dosageSchedule.night.timing.replace(/_/g, ' ')})` : ''}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="pharmacy-cell--substitute" data-label="Alternative Given">
                                        <input
                                          type="text"
                                          placeholder="Alternative Given / Generic Substitution"
                                          value={med.alternativeGiven}
                                          onChange={(e) => handleMedChange(idx, 'alternativeGiven', e.target.value)}
                                          className="pharmacy-field-input"
                                        />
                                      </td>
                                      <td className="pharmacy-cell--qty" data-label="Qty">
                                        <div className="pharmacy-mobile-field-wrap">
                                          <span className="pharmacy-mobile-field-label">Qty:</span>
                                          <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="10"
                                            value={med.quantity}
                                            onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                            className={`pharmacy-field-input pharmacy-field-input--center ${validationErrors[idx]?.quantity ? 'pharmacy-field-input--error' : ''}`}
                                          />
                                        </div>
                                      </td>
                                      <td className="pharmacy-cell--price" data-label="Unit Price">
                                        <div className="pharmacy-mobile-field-wrap">
                                          <span className="pharmacy-mobile-field-label">Price:</span>
                                          <input
                                            type="number"
                                            placeholder="0.00"
                                            value={med.unitPrice}
                                            onChange={(e) => handleMedChange(idx, 'unitPrice', e.target.value)}
                                            className={`pharmacy-field-input pharmacy-field-input--right ${validationErrors[idx]?.unitPrice ? 'pharmacy-field-input--error' : ''}`}
                                            min="0"
                                            step="0.01"
                                          />
                                        </div>
                                      </td>
                                      <td className="pharmacy-cell--total" data-label="Total">
                                        <div className="pharmacy-line-total-pill">
                                          {CURRENCY_SYMBOL}{lineTotal}
                                        </div>
                                      </td>
                                      <td className="pharmacy-cell--action" style={{ textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          className="pharmacy-icon-btn pharmacy-icon-btn--danger"
                                          onClick={() => handleRemoveMedication(idx)}
                                          aria-label={`Remove ${med.recommended || 'medication'}`}
                                          title="Remove from dispensation"
                                        >
                                          <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>delete</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── SECTION 2: PHARMACIST SUPPLEMENTAL & OTC ADDITIONS ── */}
                    <div className="pharmacy-tier-card pharmacy-tier-card--supplemental">
                      <div className="pharmacy-tier-card__header">
                        <div className="pharmacy-tier-card__title-wrap">
                          <span className="material-symbols-rounded pharmacy-tier-card__icon pharmacy-tier-card__icon--pharmacist">
                            local_pharmacy
                          </span>
                          <div>
                            <h4 className="pharmacy-tier-card__title">
                              {selectedVisit.consultation?.doctorId ? '2. Pharmacist Supplemental & OTC Additions' : 'Direct Pharmacy Dispense Items'}
                            </h4>
                            <p className="pharmacy-tier-card__desc">
                              Supportive medications, OTC supplements, or patient requests. Configure custom dosage schedules (FN / AN / Night &amp; Meal Timing).
                            </p>
                          </div>
                        </div>
                        <span className="pharmacy-tier-badge pharmacy-tier-badge--editable">
                          <span className="material-symbols-rounded" style={{ fontSize: '13px', marginRight: '4px' }}>edit_note</span>
                          Pharmacist Configurable
                        </span>
                      </div>

                      {pharmacistMeds.length === 0 ? (
                        <div className="pharmacy-tier-empty">
                          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add_shopping_cart</span>
                          <span>No supplemental OTC medications added yet. Click "+ Add Supplemental Medication" or select from catalog chips below.</span>
                        </div>
                      ) : (
                        <div className="pharmacy-table-container">
                          <table className="pharmacy-table">
                            <thead>
                              <tr>
                                <th style={{ width: '28%' }}>Medicine Name</th>
                                <th style={{ width: '30%' }}>Prescription Dosage Schedule (FN / AN / Night / Timing)</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Qty *</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>Unit Price ({CURRENCY_SYMBOL}) *</th>
                                <th style={{ width: '13%', textAlign: 'right' }}>Line Total ({CURRENCY_SYMBOL})</th>
                                <th style={{ width: '5%', textAlign: 'center' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {pharmacistMeds.map((med) => {
                                const idx = med.originalIndex;
                                const lineTotal = ((Number(med.quantity) || 0) * (Number(med.unitPrice) || 0)).toFixed(2);
                                return (
                                  <tr key={idx} className="pharmacy-med-row">
                                    <td className="pharmacy-cell--medicine" data-label="Medicine Name">
                                      <input
                                        type="text"
                                        placeholder="Type medicine name or generic..."
                                        value={med.recommended}
                                        list={`med-catalog-${idx}`}
                                        onChange={(e) => handleMedChange(idx, 'recommended', e.target.value)}
                                        className="pharmacy-field-input"
                                      />
                                      <datalist id={`med-catalog-${idx}`}>
                                        {catalogMedicines.map((cm) => (
                                          <option key={cm._id} value={cm.medicineName}>
                                            {cm.genericName ? `${cm.genericName} — ` : ''}{CURRENCY_SYMBOL}{cm.unitPrice}/{cm.unit || 'tab'}
                                          </option>
                                        ))}
                                      </datalist>
                                    </td>
                                    <td className="pharmacy-cell--dosage" data-label="Dosage Schedule">
                                      {/* Interactive Pharmacist Dosage Builder */}
                                      <div className="pharmacy-dosage-builder">
                                        <div className="dosage-stepper-row">
                                          <label className="dosage-stepper-item" title="Forenoon / Morning Dosage">
                                            <span className="dosage-stepper-label">FN (M):</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max="10"
                                              value={med.dosageSchedule?.morning?.count ?? 0}
                                              onChange={(e) => handleDosageChange(idx, 'morning', 'count', e.target.value)}
                                              className="dosage-stepper-input"
                                            />
                                          </label>
                                          <label className="dosage-stepper-item" title="Afternoon Dosage">
                                            <span className="dosage-stepper-label">AN (A):</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max="10"
                                              value={med.dosageSchedule?.afternoon?.count ?? 0}
                                              onChange={(e) => handleDosageChange(idx, 'afternoon', 'count', e.target.value)}
                                              className="dosage-stepper-input"
                                            />
                                          </label>
                                          <label className="dosage-stepper-item" title="Night Dosage">
                                            <span className="dosage-stepper-label">Night:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max="10"
                                              value={med.dosageSchedule?.night?.count ?? 0}
                                              onChange={(e) => handleDosageChange(idx, 'night', 'count', e.target.value)}
                                              className="dosage-stepper-input"
                                            />
                                          </label>
                                          <select
                                            value={med.dosageSchedule?.morning?.timing || med.dosageSchedule?.night?.timing || 'AFTER_FOOD'}
                                            onChange={(e) => {
                                              handleDosageChange(idx, 'morning', 'timing', e.target.value);
                                              handleDosageChange(idx, 'afternoon', 'timing', e.target.value);
                                              handleDosageChange(idx, 'night', 'timing', e.target.value);
                                            }}
                                            className="dosage-timing-select"
                                          >
                                            <option value="AFTER_FOOD">After Meals</option>
                                            <option value="BEFORE_FOOD">Before Meals</option>
                                            <option value="WITH_FOOD">With Food</option>
                                            <option value="EMPTY_STOMACH">Empty Stomach</option>
                                          </select>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="pharmacy-cell--qty" data-label="Qty">
                                      <div className="pharmacy-mobile-field-wrap">
                                        <span className="pharmacy-mobile-field-label">Qty:</span>
                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          placeholder="10"
                                          value={med.quantity}
                                          onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                          className={`pharmacy-field-input pharmacy-field-input--center ${validationErrors[idx]?.quantity ? 'pharmacy-field-input--error' : ''}`}
                                        />
                                      </div>
                                    </td>
                                    <td className="pharmacy-cell--price" data-label="Unit Price">
                                      <div className="pharmacy-mobile-field-wrap">
                                        <span className="pharmacy-mobile-field-label">Price:</span>
                                        <input
                                          type="number"
                                          placeholder="0.00"
                                          value={med.unitPrice}
                                          onChange={(e) => handleMedChange(idx, 'unitPrice', e.target.value)}
                                          className={`pharmacy-field-input pharmacy-field-input--right ${validationErrors[idx]?.unitPrice ? 'pharmacy-field-input--error' : ''}`}
                                          min="0"
                                          step="0.01"
                                        />
                                      </div>
                                    </td>
                                    <td className="pharmacy-cell--total" data-label="Total">
                                      <div className="pharmacy-line-total-pill">
                                        {CURRENCY_SYMBOL}{lineTotal}
                                      </div>
                                    </td>
                                    <td className="pharmacy-cell--action" style={{ textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        className="pharmacy-icon-btn pharmacy-icon-btn--danger"
                                        onClick={() => handleRemoveMedication(idx)}
                                        aria-label={`Remove ${med.recommended || 'medication'}`}
                                        title="Delete supplemental medication"
                                      >
                                        <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>delete</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="pharmacy-tier-actions-row">
                        <button
                          type="button"
                          className="pharmacy-outlined-action-btn"
                          onClick={() => handleAddMedication()}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                          <span>{selectedVisit.consultation?.doctorId ? 'Add Supplemental Medication' : 'Add Medication'}</span>
                        </button>

                        {catalogMedicines.length > 0 && (
                          <div className="pharmacy-quick-chips-bar">
                            <span className="pharmacy-quick-chips-label">Quick Add:</span>
                            <div className="pharmacy-quick-chips-list">
                              {catalogMedicines.slice(0, 5).map((cm) => (
                                <button
                                  key={cm._id}
                                  type="button"
                                  className="pharmacy-suggestion-chip"
                                  onClick={() => handleAddMedication(cm)}
                                  title={`Add ${cm.medicineName} (${CURRENCY_SYMBOL}${cm.unitPrice})`}
                                >
                                  + {cm.medicineName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── MD3 FINANCIAL RECONCILIATION & SETTLEMENT CARD ── */}
                  <div className="pharmacy-settlement-card">
                    <div className="pharmacy-settlement-grid">
                      {/* Left: Central Billing Counter Routing Policy */}
                      <div className="pharmacy-settlement-charges" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>point_of_sale</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                            Central Billing Routing Policy
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', maxWidth: '420px', marginTop: '2px' }}>
                            Dispensed medicines are accrued directly to the patient's bill ledger. The patient must present the dispensing slip at the Central Billing Station for settlement and encounter closure.
                          </div>
                        </div>
                      </div>

                      {/* Right: Net Total & Generate Dispensing Slip Action */}
                      <div className="pharmacy-settlement-action-block">
                        <div className="pharmacy-total-due-box">
                          <span className="pharmacy-total-due-label">MEDICATIONS TOTAL</span>
                          <span className="pharmacy-total-due-val">{CURRENCY_SYMBOL}{totalBillAmount}</span>
                        </div>
                        <button
                          type="button"
                          className="pharmacy-generate-bill-btn"
                          onClick={handleGeneratePreview}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>receipt_long</span>
                          <span>Generate Dispensing Slip</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* Dispensing Slip Preview */
                <div className="pharmacy-preview">
                  <div className="pharmacy-preview__actions">
                    <button
                      type="button"
                      className="pharmacy-back-btn"
                      onClick={() => setShowPreview(false)}
                    >
                      <Icon.ChevronLeft /> Edit Dispensing Items
                    </button>
                    <button
                      type="button"
                      className="pharmacy-print-btn"
                      onClick={handlePrint}
                    >
                      <Icon.Print /> Print Dispensing Slip
                    </button>
                    <button
                      type="button"
                      className="pharmacy-finalize-btn"
                      onClick={handleFinalize}
                      disabled={submitting}
                    >
                      {submitting ? 'Routing to Billing…' : (
                        <>
                          <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }}>send_and_archive</span>
                          Dispense &amp; Route to Billing Counter
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ background: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0', color: 'var(--md-sys-color-on-surface)' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)', fontSize: '20px' }}>info</span>
                    <span style={{ fontSize: '0.8125rem' }}>
                      <strong>Dispensing Memo:</strong> This slip verifies dispensed pharmaceuticals. Financial collection and patient visit completion are conducted at the Central Billing Station.
                    </span>
                  </div>
                  
                  {/* On-screen Preview */}
                  <div className="billing-template-screen-card">
                    <BillingTemplate
                      visit={selectedVisit}
                      medications={medications}
                      consultationFee={Number(consultationFee)}
                      labCharges={Number(labCharges)}
                      total={Number(totalBillAmount)}
                      hospitalInfo={hospitalInfo}
                      labels={labels}
                      fieldVisibility={fieldVisibility}
                      customFields={customFields}
                    />
                  </div>

                  {/* High-Fidelity Print Portal */}
                  {createPortal(
                    <div className="billing-print-portal">
                      <BillingTemplate
                        visit={selectedVisit}
                        medications={medications}
                        consultationFee={Number(consultationFee)}
                        labCharges={Number(labCharges)}
                        total={Number(totalBillAmount)}
                        hospitalInfo={hospitalInfo}
                        labels={labels}
                        fieldVisibility={fieldVisibility}
                        customFields={customFields}
                      />
                    </div>,
                    document.body
                  )}
                </div>
              )}
            </section>

            </div>
          </>
        )}
      </main>

      {/* ─── DIRECT DISPENSE MODAL ─── */}
      <DirectDispenseModal
        isOpen={directDispenseOpen}
        onClose={() => setDirectDispenseOpen(false)}
        onStartDirectDispense={handleStartDirectDispenseForPatient}
      />
    </div>
  );
};

export default PharmacyDashboard;
