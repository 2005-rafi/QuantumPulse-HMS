import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { usePharmacyDispense } from '../hooks/usePharmacyDispense';
import CommonHeader from '../components/shell/CommonHeader';
import PatientList from '../features/patients/PatientList';
import PatientProfile from '../features/patients/PatientProfile';
import BillingTemplate from '../features/billing/BillingTemplate';
import DirectDispenseModal from '../features/pharmacy/DirectDispenseModal';
import { Icon } from '../components/md3/Md3Widgets';
import { timeSince, formatQueueWaitTime } from '../utils/dateFormatting';
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
 *
 * Changes from original:
 *   - Removed ALL inline styles — replaced with PharmacyDashboard.css classes
 *   - Removed inline timeSince — imported from utils/dateFormatting
 *   - Connected to usePharmacyDispense hook for all state management
 */
const PharmacyDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();

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

  return (
    <div className="pharmacy-page">

      {/* ─── TOP APP BAR ─── */}
      <CommonHeader
        brandTitle={`${config?.SHORT_NAME || 'HMS'} Pharmacy`}
        brandSubtitle="Dispensing & Billing"
        user={user}
        onLogout={handleLogout}
      />

      {/* ─── NAVIGATION TABS ─── */}
      <nav className="pharmacy-tabs" role="tablist" aria-label="Pharmacy sections">
        <button
          role="tab"
          aria-selected={activeTab === 'queue'}
          className={`pharmacy-tab ${activeTab === 'queue' ? 'pharmacy-tab--active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <Icon.Activity />
          <span>Pending Prescriptions &amp; Bills</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'search'}
          className={`pharmacy-tab ${activeTab === 'search' ? 'pharmacy-tab--active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Icon.Search />
          <span>Search Patients</span>
        </button>
        {activeTab === 'profile' && (
          <button
            role="tab"
            aria-selected={true}
            className="pharmacy-tab pharmacy-tab--active"
          >
            <Icon.Person />
            <span>Patient Profile</span>
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="pharmacy-direct-dispense-btn"
            onClick={() => setDirectDispenseOpen(true)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>shopping_cart_checkout</span>
            <span>Direct OTC Dispense</span>
          </button>
        </div>
      </nav>

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="pharmacy-main">

        {/* Search tab */}
        {activeTab === 'search' && (
          <div className="pharmacy-panel pharmacy-panel--search">
            <PatientList onSelectPatient={handlePatientSelect} />
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && selectedPatient && (
          <div className="pharmacy-panel pharmacy-panel--profile">
            <PatientProfile
              patientId={selectedPatient._id}
              onBack={() => { setSelectedPatient(null); setActiveTab('search'); }}
              onDirectPharmacy={handleDirectPharmacy}
            />
          </div>
        )}

        {/* Queue tab — Split pane */}
        {activeTab === 'queue' && (
          <div className="pharmacy-desk">

            {/* ─ Left: Queue Panel ─ */}
            <aside className="pharmacy-queue-pane">
              <div className="pharmacy-queue-header">
                <h2 className="pharmacy-queue-title">
                  Pending Prescriptions
                  <span className="pharmacy-queue-count">({queue.length})</span>
                </h2>
                <button
                  className="pharmacy-refresh-btn"
                  onClick={fetchQueue}
                  aria-label="Refresh queue"
                >
                  <Icon.Refresh />
                </button>
              </div>

              {queue.length === 0 ? (
                <p className="pharmacy-queue-empty">No patients waiting for pharmacy.</p>
              ) : (
                <div className="pharmacy-queue-list" role="list">
                  {queue.map((v) => (
                    <article
                      key={v._id}
                      className={`pharmacy-queue-card ${selectedVisit?._id === v._id ? 'pharmacy-queue-card--active' : ''}`}
                      onClick={() => selectVisit(v)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && selectVisit(v)}
                      aria-label={`${v.patientId.firstName} ${v.patientId.lastName}, waiting ${timeSince(v.updatedAt)}`}
                    >
                      <div className="pharmacy-queue-card__info">
                        <div className="pharmacy-queue-card__top-row">
                          <h3 className="pharmacy-queue-card__name">
                            {v.patientId.firstName} {v.patientId.lastName}
                          </h3>
                          {v.tokenNumber && (
                            <span className="pharmacy-queue-card__token-chip">
                              #{v.tokenNumber}
                            </span>
                          )}
                        </div>
                        <p className="pharmacy-queue-card__meta">
                          {v.patientId.age} yrs · {v.patientId.gender} {v.patientId.mrn ? `· ${v.patientId.mrn}` : ''}
                        </p>
                      </div>
                      <span className="pharmacy-queue-card__wait-badge">
                        <span className="material-symbols-rounded">schedule</span>
                        <span>{formatQueueWaitTime(v.updatedAt || v.createdAt)}</span>
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </aside>

            {/* ─ Right: Dispensing Desk ─ */}
            <section className="pharmacy-workspace-pane">
              {!selectedVisit ? (
                <div className="pharmacy-idle-state">
                  <span className="material-symbols-rounded pharmacy-idle-icon" aria-hidden="true">medication</span>
                  <p className="pharmacy-idle-text">
                    Select a patient from the queue to review prescriptions and dispense medications.
                  </p>
                </div>
              ) : !showPreview ? (
                <div className="pharmacy-dispense-desk">

                  {/* ── MD3 PATIENT CLINICAL BANNER ── */}
                  <div className="pharmacy-patient-banner">
                    <div className="pharmacy-patient-banner__top">
                      <div className="pharmacy-patient-identity">
                        <div className="pharmacy-patient-avatar">
                          {selectedVisit.patientId.firstName?.[0] || 'P'}
                          {selectedVisit.patientId.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="pharmacy-patient-title-row">
                            <h2 className="pharmacy-patient-name">
                              {selectedVisit.patientId.firstName} {selectedVisit.patientId.lastName}
                            </h2>
                            {selectedVisit.tokenNumber && (
                              <span className="pharmacy-token-badge">
                                Token #{selectedVisit.tokenNumber}
                              </span>
                            )}
                            <span className="pharmacy-mrn-chip">
                              MRN: {selectedVisit.patientId.mrn || 'N/A'}
                            </span>
                          </div>
                          <div className="pharmacy-patient-submeta">
                            <span>{selectedVisit.patientId.age || '—'} yrs</span>
                            <span>·</span>
                            <span>{selectedVisit.patientId.gender || '—'}</span>
                            <span>·</span>
                            <span>DOB: {selectedVisit.patientId.dob ? new Date(selectedVisit.patientId.dob).toLocaleDateString('en-IN') : '—'}</span>
                            <span>·</span>
                            <span>Weight: {selectedVisit.vitals?.weight ? `${selectedVisit.vitals.weight} kg` : 'N/A'}</span>
                            {selectedVisit.consultation?.doctorId && (
                              <>
                                <span>·</span>
                                <span className="pharmacy-doctor-tag">
                                  <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '3px' }}>stethoscope</span>
                                  {typeof selectedVisit.consultation.doctorId === 'object'
                                    ? `Dr. ${selectedVisit.consultation.doctorId.firstName || ''} ${selectedVisit.consultation.doctorId.lastName || ''}`.trim()
                                    : 'Attending Doctor'}
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
                                  <th style={{ width: '42%' }}>Medicine Prescribed</th>
                                  <th style={{ width: '28%' }}>Alternative Given / Generic Substitution</th>
                                  <th style={{ width: '12%', textAlign: 'center' }}>Qty *</th>
                                  <th style={{ width: '13%', textAlign: 'right' }}>Amount ({CURRENCY_SYMBOL}) *</th>
                                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescribedMeds.map((med) => {
                                  const idx = med.originalIndex;
                                  return (
                                    <tr key={idx}>
                                      <td>
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
                                      <td>
                                        <input
                                          type="text"
                                          placeholder="E.g. Brand B 500mg"
                                          value={med.alternativeGiven}
                                          onChange={(e) => handleMedChange(idx, 'alternativeGiven', e.target.value)}
                                          className="pharmacy-field-input"
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          placeholder="10"
                                          value={med.quantity}
                                          onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                          className={`pharmacy-field-input pharmacy-field-input--center ${validationErrors[idx]?.quantity ? 'pharmacy-field-input--error' : ''}`}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          placeholder="0.00"
                                          value={med.amount}
                                          onChange={(e) => handleMedChange(idx, 'amount', e.target.value)}
                                          className={`pharmacy-field-input pharmacy-field-input--right ${validationErrors[idx]?.amount ? 'pharmacy-field-input--error' : ''}`}
                                          min="0"
                                          step="0.01"
                                        />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
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
                                <th style={{ width: '32%' }}>Medicine Name</th>
                                <th style={{ width: '38%' }}>Prescription Dosage Schedule (FN / AN / Night / Timing)</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Qty *</th>
                                <th style={{ width: '13%', textAlign: 'right' }}>Amount ({CURRENCY_SYMBOL}) *</th>
                                <th style={{ width: '5%', textAlign: 'center' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {pharmacistMeds.map((med) => {
                                const idx = med.originalIndex;
                                return (
                                  <tr key={idx}>
                                    <td>
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
                                    <td>
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
                                    <td>
                                      <input
                                        type="text"
                                        placeholder="10"
                                        value={med.quantity}
                                        onChange={(e) => handleMedChange(idx, 'quantity', e.target.value)}
                                        className={`pharmacy-field-input pharmacy-field-input--center ${validationErrors[idx]?.quantity ? 'pharmacy-field-input--error' : ''}`}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={med.amount}
                                        onChange={(e) => handleMedChange(idx, 'amount', e.target.value)}
                                        className={`pharmacy-field-input pharmacy-field-input--right ${validationErrors[idx]?.amount ? 'pharmacy-field-input--error' : ''}`}
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
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
                      {/* Left: Optional Service Dues */}
                      <div className="pharmacy-settlement-charges">
                        <span className="pharmacy-settlement-heading">Encounter Service Dues</span>
                        <div className="pharmacy-charges-row">
                          <label className="pharmacy-mini-field">
                            <span className="pharmacy-mini-label">Consultation Fee ({CURRENCY_SYMBOL})</span>
                            <input
                              type="number"
                              value={consultationFee}
                              onChange={(e) => setConsultationFee(e.target.value)}
                              className="pharmacy-field-input pharmacy-field-input--compact"
                              min="0"
                            />
                          </label>
                          <label className="pharmacy-mini-field">
                            <span className="pharmacy-mini-label">Lab Charges ({CURRENCY_SYMBOL})</span>
                            <input
                              type="number"
                              value={labCharges}
                              onChange={(e) => setLabCharges(e.target.value)}
                              className="pharmacy-field-input pharmacy-field-input--compact"
                              min="0"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Right: Net Total & Generate Bill Preview Action */}
                      <div className="pharmacy-settlement-action-block">
                        <div className="pharmacy-total-due-box">
                          <span className="pharmacy-total-due-label">NET AMOUNT DUE</span>
                          <span className="pharmacy-total-due-val">{CURRENCY_SYMBOL}{totalBillAmount}</span>
                        </div>
                        <button
                          type="button"
                          className="pharmacy-generate-bill-btn"
                          onClick={handleGeneratePreview}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>receipt_long</span>
                          <span>Generate Bill Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* Bill Preview */
                <div className="pharmacy-preview">
                  <div className="pharmacy-preview__actions">
                    <button
                      type="button"
                      className="pharmacy-back-btn"
                      onClick={() => setShowPreview(false)}
                    >
                      <Icon.ChevronLeft /> Edit Bill
                    </button>
                    <button
                      type="button"
                      className="pharmacy-print-btn"
                      onClick={handlePrint}
                    >
                      <Icon.Print /> Print Bill
                    </button>
                    <button
                      type="button"
                      className="pharmacy-finalize-btn"
                      onClick={handleFinalize}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving…' : (
                        <>
                          <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }}>check_circle</span>
                          Finalize & Complete Visit
                        </>
                      )}
                    </button>
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
