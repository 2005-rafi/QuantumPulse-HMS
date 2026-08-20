import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { usePharmacyDispense } from '../hooks/usePharmacyDispense';
import CommonHeader from '../components/shell/CommonHeader';
import PatientList from '../features/patients/PatientList';
import PatientProfile from '../features/patients/PatientProfile';
import BillingTemplate from '../features/billing/BillingTemplate';
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
    customFields,
    fetchQueue,
    handlePatientSelect,
    handleDirectPharmacy,
    selectVisit,
    handleAddMedication,
    handleRemoveMedication,
    handleMedChange,
    handleGeneratePreview,
    handleFinalize,
    totalBillAmount,
  } = usePharmacyDispense();

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
                  <span className="material-symbols-rounded text-primary" style={{ fontSize: '64px', color: 'var(--md-sys-color-primary)' }} aria-hidden="true">medication</span>
                  <p className="pharmacy-idle-text">
                    Select a patient to view and dispense their prescription.
                  </p>
                </div>
              ) : !showPreview ? (
                <div className="pharmacy-dispense-desk">

                  {/* Patient header */}
                  <div className="pharmacy-patient-header">
                    <div>
                      <h2 className="pharmacy-patient-name">
                        {selectedVisit.patientId.firstName} {selectedVisit.patientId.lastName}
                      </h2>
                      <div className="pharmacy-patient-meta">
                        <span><strong>MRN:</strong> {selectedVisit.patientId.mrn}</span>
                        <span><strong>DOB:</strong> {new Date(selectedVisit.patientId.dob).toLocaleDateString()}</span>
                        <span>
                          <strong>Weight:</strong>{' '}
                          {selectedVisit.vitals?.weight ? `${selectedVisit.vitals.weight} kg` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical context */}
                  {selectedVisit.consultation?.doctorId && (
                    <div className="pharmacy-clinical-context">
                      <h3 className="pharmacy-clinical-context__title">Clinical Context</h3>
                      <div className="pharmacy-clinical-context__grid">
                        <div>
                          <strong className="pharmacy-label">Diagnosis</strong>
                          <p className="pharmacy-value">{selectedVisit.consultation?.diagnosis || 'N/A'}</p>
                        </div>
                        <div>
                          <strong className="pharmacy-label">Treatment Plan</strong>
                          <p className="pharmacy-value">{selectedVisit.consultation?.treatmentPlan || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Medication dispense table */}
                  <div className="pharmacy-medications">
                    <h3 className="pharmacy-medications__title">
                      <span className="material-symbols-rounded text-primary" style={{ fontSize: '24px', marginRight: '8px', color: 'var(--md-sys-color-primary)' }}>pill</span>
                      {selectedVisit.consultation?.doctorId ? 'Prescribed Medications' : 'Direct Dispense Cart'}
                    </h3>

                    {medications.length === 0 ? (
                      <p className="pharmacy-no-meds">
                        {selectedVisit.consultation?.doctorId
                          ? 'No medications prescribed for this visit.'
                          : 'No medications added yet.'}
                      </p>
                    ) : (
                      <div className="pharmacy-med-table-wrapper">
                        <table className="pharmacy-med-table">
                          <thead>
                            <tr>
                              <th>Medicine Name</th>
                              <th>Alternative Given</th>
                              <th className="pharmacy-med-table__narrow">Quantity *</th>
                              <th className="pharmacy-med-table__narrow">Amount ({CURRENCY_SYMBOL}) *</th>
                              <th className="pharmacy-med-table__action">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medications.map((med, index) => (
                              <tr key={index}>
                                <td>
                                  <input
                                    type="text"
                                    placeholder="Medicine Name"
                                    value={med.recommended}
                                    onChange={(e) => handleMedChange(index, 'recommended', e.target.value)}
                                    className="pharmacy-med-input"
                                  />
                                    {med.dosageSchedule && (
                                      <div className="pharmacy-dosage-chips">
                                        <span className="pharmacy-dosage-chip">
                                          <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '4px', verticalAlign: 'middle' }}>light_mode</span>
                                          M: {med.dosageSchedule.morning?.count ?? 0}
                                          {med.dosageSchedule.morning?.timing !== 'N/A'
                                            ? ` (${(med.dosageSchedule.morning?.timing || '').replace('_', ' ')})`
                                            : ''}
                                        </span>
                                        <span className="pharmacy-dosage-chip">
                                          <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '4px', verticalAlign: 'middle' }}>sunny</span>
                                          A: {med.dosageSchedule.afternoon?.count ?? 0}
                                          {med.dosageSchedule.afternoon?.timing !== 'N/A'
                                            ? ` (${(med.dosageSchedule.afternoon?.timing || '').replace('_', ' ')})`
                                            : ''}
                                        </span>
                                        <span className="pharmacy-dosage-chip">
                                          <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '4px', verticalAlign: 'middle' }}>bedtime</span>
                                          N: {med.dosageSchedule.night?.count ?? 0}
                                          {med.dosageSchedule.night?.timing !== 'N/A'
                                            ? ` (${(med.dosageSchedule.night?.timing || '').replace('_', ' ')})`
                                            : ''}
                                        </span>
                                      </div>
                                    )}
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    placeholder="E.g. Brand B 500mg"
                                    value={med.alternativeGiven}
                                    onChange={(e) => handleMedChange(index, 'alternativeGiven', e.target.value)}
                                    className="pharmacy-med-input"
                                  />
                                </td>
                                <td>
                                  <div className="pharmacy-input-wrap">
                                    <input
                                      type="text"
                                      placeholder="e.g. 10"
                                      value={med.quantity}
                                      onChange={(e) => handleMedChange(index, 'quantity', e.target.value)}
                                      className={`pharmacy-med-input pharmacy-med-input--narrow ${validationErrors[index]?.quantity ? 'pharmacy-med-input--error' : ''}`}
                                    />
                                    {validationErrors[index]?.quantity && (
                                      <span className="pharmacy-input-error-msg">{validationErrors[index].quantity}</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="pharmacy-input-wrap">
                                    <input
                                      type="number"
                                      placeholder="0.00"
                                      value={med.amount}
                                      onChange={(e) => handleMedChange(index, 'amount', e.target.value)}
                                      className={`pharmacy-med-input pharmacy-med-input--narrow ${validationErrors[index]?.amount ? 'pharmacy-med-input--error' : ''}`}
                                      min="0"
                                      step="0.01"
                                    />
                                    {validationErrors[index]?.amount && (
                                      <span className="pharmacy-input-error-msg">{validationErrors[index].amount}</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="pharmacy-remove-med-btn"
                                    onClick={() => handleRemoveMedication(index)}
                                    aria-label={`Remove ${med.recommended || 'medication'}`}
                                  >
                                    <Icon.Trash />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <button
                      type="button"
                      className="pharmacy-add-med-btn"
                      onClick={handleAddMedication}
                    >
                      <Icon.Plus />
                      Add Medication
                    </button>
                  </div>

                  {/* Charges */}
                  <div className="pharmacy-charges">
                    <h3 className="pharmacy-charges__title">Additional Charges</h3>
                    <div className="pharmacy-charges__grid">
                      <label className="pharmacy-charge-label">
                        Consultation Fee ({CURRENCY_SYMBOL})
                        <input
                          type="number"
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                          className="pharmacy-charge-input"
                          min="0"
                        />
                      </label>
                      <label className="pharmacy-charge-label">
                        Lab Charges ({CURRENCY_SYMBOL})
                        <input
                          type="number"
                          value={labCharges}
                          onChange={(e) => setLabCharges(e.target.value)}
                          className="pharmacy-charge-input"
                          min="0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="pharmacy-bill-summary">
                    <div className="pharmacy-bill-total">
                      <span className="pharmacy-bill-total__label">Total Amount Due</span>
                      <span className="pharmacy-bill-total__value">{CURRENCY_SYMBOL}{totalBillAmount}</span>
                    </div>
                    <button
                      type="button"
                      className="pharmacy-preview-btn"
                      onClick={handleGeneratePreview}
                    >
                      Generate Bill Preview
                    </button>
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
                      customFields={customFields}
                    />
                  </div>

                  {/* High-Fidelity Print Portal */}
                  {createPortal(
                    <div className="print-only-document">
                      <BillingTemplate
                        visit={selectedVisit}
                        medications={medications}
                        consultationFee={Number(consultationFee)}
                        labCharges={Number(labCharges)}
                        total={Number(totalBillAmount)}
                        hospitalInfo={hospitalInfo}
                        labels={labels}
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
    </div>
  );
};

export default PharmacyDashboard;
