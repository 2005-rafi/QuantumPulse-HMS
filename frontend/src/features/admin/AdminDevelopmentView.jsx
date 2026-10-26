/**
 * src/features/admin/AdminDevelopmentView.jsx
 * Independent Administrator view for development-only hard purging of test patients
 * and forensic purging of ghost/orphaned clinical records.
 *
 * Requirements:
 * - Tab 1: Active Hospital Patients (cards/table with filters, search, pagination, preview purge).
 * - Tab 2: Ghost & Orphaned Records Studio (live detection of orphaned visits, soft-deleted residual records, dangling beds).
 * - Atomic one-click single purge & batch purge all capability.
 * - Zero hardcoding, 100% MD3 theme token compliance, clean separation.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import PatientList from '../patients/PatientList';
import PatientProfile from '../patients/PatientProfile';
import { patientDevelopmentAPI } from '../../services/patientDevelopmentAPI';
import { Md3ConfirmDialog } from '../../components/md3/Md3ConfirmDialog';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import './AdminDevelopmentView.css';

export const AdminDevelopmentView = () => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('PATIENTS'); // 'PATIENTS' | 'GHOST_STUDIO'
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Ghost Studio State
  const [ghosts, setGhosts] = useState(null);
  const [loadingGhosts, setLoadingGhosts] = useState(false);
  const [ghostFilter, setGhostFilter] = useState('ALL'); // 'ALL' | 'ORPHANED_VISIT' | 'SOFT_DELETED_PATIENT'
  const [targetGhost, setTargetGhost] = useState(null);
  const [isGhostPurging, setIsGhostPurging] = useState(false);
  const [isPurgeAllDialogOpen, setIsPurgeAllDialogOpen] = useState(false);
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  // Active Patient Purge Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetPatient, setTargetPatient] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  /**
   * Fetches ghost and orphaned records telemetry from backend.
   */
  const fetchGhosts = useCallback(async () => {
    setLoadingGhosts(true);
    try {
      const res = await patientDevelopmentAPI.getGhostRecords();
      setGhosts(res.data?.data || null);
    } catch (err) {
      console.warn('[AdminDevelopmentView] Failed to fetch ghost records:', err);
    } finally {
      setLoadingGhosts(false);
    }
  }, []);

  useEffect(() => {
    fetchGhosts();
  }, [fetchGhosts, refreshKey]);

  /**
   * Opens the purge preview dialog and fetches live impact details for an active patient.
   */
  const handleOpenPurge = useCallback(async (patient) => {
    if (!patient || !patient._id) return;
    setTargetPatient(patient);
    setIsDialogOpen(true);
    setIsLoadingPreview(true);
    setPreviewData(null);

    try {
      const res = await patientDevelopmentAPI.getPurgePreview(patient._id);
      setPreviewData(res.data?.data || null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch purge impact preview.';
      showError('Preview Error', msg);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [showError]);

  /**
   * Executes permanent ACID purge of an active patient via development API.
   */
  const handleExecutePurge = useCallback(async () => {
    if (!targetPatient?._id) return;
    setIsPurging(true);

    try {
      const res = await patientDevelopmentAPI.purgePatient(targetPatient._id);
      const msg = res.data?.message || 'Patient record permanently purged from database.';
      showSuccess('Patient Purged (Dev Mode)', msg);

      setIsDialogOpen(false);
      setTargetPatient(null);
      setPreviewData(null);
      if (selectedPatientId === targetPatient._id) {
        setSelectedPatientId(null);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to purge patient record.';
      showError('Purge Failed', msg);
    } finally {
      setIsPurging(false);
    }
  }, [targetPatient, selectedPatientId, showSuccess, showError]);

  /**
   * Executes permanent purge of an orphaned or ghost record.
   */
  const handleExecuteGhostPurge = useCallback(async () => {
    if (!targetGhost) return;
    setIsGhostPurging(true);

    try {
      const res = await patientDevelopmentAPI.purgeGhostRecord(targetGhost.type, targetGhost.id);
      showSuccess('Ghost Record Purged', res.data?.message || 'Ghost record permanently wiped.');
      setTargetGhost(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to purge ghost record.';
      showError('Purge Failed', msg);
    } finally {
      setIsGhostPurging(false);
    }
  }, [targetGhost, showSuccess, showError]);

  /**
   * Executes batch purge of all detected ghost records.
   */
  const handleExecutePurgeAllGhosts = useCallback(async () => {
    setIsPurgingAll(true);

    try {
      const res = await patientDevelopmentAPI.purgeAllGhostRecords();
      showSuccess('Ghost Records Cleared', res.data?.message || 'All ghost and orphaned records cleared.');
      setIsPurgeAllDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to execute batch ghost purge.';
      showError('Batch Purge Failed', msg);
    } finally {
      setIsPurgingAll(false);
    }
  }, [showSuccess, showError]);

  // Render Purge Action Button for Patient Cards & Table Rows
  const renderPurgeAction = useCallback((patient) => (
    <button
      type="button"
      className="dev-purge-action-btn"
      onClick={(e) => {
        e.stopPropagation();
        handleOpenPurge(patient);
      }}
      title={`Permanently Purge ${patient.fullName || patient.firstName || 'Patient'} (Dev Mode)`}
      aria-label={`Permanently Purge ${patient.fullName || patient.firstName || 'Patient'}`}
    >
      <span className="material-symbols-rounded">delete_sweep</span>
      <span>Purge (Dev)</span>
    </button>
  ), [handleOpenPurge]);

  // Combined and filtered ghost list
  const filteredGhostList = useMemo(() => {
    if (!ghosts) return [];
    const list = [];
    if (ghostFilter === 'ALL' || ghostFilter === 'ORPHANED_VISIT') {
      (ghosts.orphanedVisits || []).forEach((v) => list.push(v));
    }
    if (ghostFilter === 'ALL' || ghostFilter === 'SOFT_DELETED_PATIENT') {
      (ghosts.softDeletedPatients || []).forEach((p) => list.push(p));
    }
    if (ghostFilter === 'ALL' || ghostFilter === 'ORPHANED_ADMISSION') {
      (ghosts.orphanedAdmissions || []).forEach((a) => list.push(a));
    }
    if (ghostFilter === 'ALL' || ghostFilter === 'DANGLING_BED') {
      (ghosts.danglingBeds || []).forEach((b) => list.push(b));
    }
    return list;
  }, [ghosts, ghostFilter]);

  const totalGhostCount = ghosts?.totalGhosts || 0;

  // Header banner highlighting development environment capabilities and tab switcher
  const developmentHeaderBanner = (
    <div className="admin-dev-banner">
      <div className="admin-dev-banner-icon-wrap" aria-hidden="true">
        <span className="material-symbols-rounded">terminal</span>
      </div>
      <div className="admin-dev-banner-content">
        <div className="admin-dev-banner-header">
          <span className="admin-dev-banner-title">
            DEVELOPMENT WORKSTATION &bull; HARD PURGE &amp; GHOST SANITATION ENGINE
          </span>
          <span className="admin-dev-banner-badge">DEV MODE ONLY</span>
        </div>
        <p className="admin-dev-banner-text">
          Developer-only administrative environment for testing patient lifecycles. Patients in any clinical state
          can be permanently purged with atomic bed release. Inspect and permanently wipe orphaned visits,
          dangling hospital encounters, and residual ghost records left behind by simulation runs.
        </p>
      </div>
    </div>
  );

  return (
    <section className="admin-dev-container">
      {/* ── Tab Switcher Ribbon ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="admin-dev-tabs" role="tablist" aria-label="Development Navigation Modes">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'PATIENTS'}
            className={`admin-dev-tab-btn ${activeTab === 'PATIENTS' ? 'admin-dev-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('PATIENTS')}
          >
            <span className="material-symbols-rounded">group</span>
            <span>Active Hospital Patients</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'GHOST_STUDIO'}
            className={`admin-dev-tab-btn ${activeTab === 'GHOST_STUDIO' ? 'admin-dev-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('GHOST_STUDIO')}
          >
            <span className="material-symbols-rounded">troubleshoot</span>
            <span>Ghost &amp; Orphaned Records Studio</span>
            <span className={`admin-dev-tab-badge ${totalGhostCount > 0 ? 'admin-dev-tab-badge--alert' : ''}`}>
              {totalGhostCount > 0 ? `${totalGhostCount} Ghosts` : 'Clean'}
            </span>
          </button>
        </div>

        {activeTab === 'GHOST_STUDIO' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Md3Button
              variant="tonal"
              onClick={fetchGhosts}
              loading={loadingGhosts}
              title="Re-scan database for ghost and orphaned records"
            >
              <span className="material-symbols-rounded">refresh</span>
              <span>Re-Scan System</span>
            </Md3Button>

            {totalGhostCount > 0 && (
              <button
                type="button"
                className="dev-purge-action-btn"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => setIsPurgeAllDialogOpen(true)}
                title="Permanently wipe all detected ghost and orphaned records"
              >
                <span className="material-symbols-rounded">delete_forever</span>
                <span>Purge All Ghosts ({totalGhostCount})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Active Patients View ── */}
      {activeTab === 'PATIENTS' && (
        <>
          {selectedPatientId ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <PatientProfile
                key={`${selectedPatientId}-${refreshKey}`}
                patientId={selectedPatientId}
                onBack={() => setSelectedPatientId(null)}
                headerActions={(patient) => (
                  <button
                    type="button"
                    className="dev-purge-action-btn"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => handleOpenPurge(patient)}
                    title="Permanently Purge Patient (Dev Mode)"
                  >
                    <span className="material-symbols-rounded">delete_sweep</span>
                    <span>Purge Patient (Dev)</span>
                  </button>
                )}
              />
            </div>
          ) : (
            <PatientList
              key={refreshKey}
              onSelectPatient={(p) => setSelectedPatientId(p._id)}
              renderCardAction={renderPurgeAction}
              renderRowAction={renderPurgeAction}
              headerBanner={developmentHeaderBanner}
            />
          )}
        </>
      )}

      {/* ── Ghost & Orphaned Records Studio ── */}
      {activeTab === 'GHOST_STUDIO' && (
        <div className="ghost-studio-container">
          {developmentHeaderBanner}

          {/* Telemetry Stat Cards */}
          <div className="ghost-studio-stats">
            <div className={`ghost-stat-chip ${totalGhostCount > 0 ? 'ghost-stat-chip--alert' : ''}`}>
              <span className="ghost-stat-chip-label">Total Ghost Records</span>
              <span className="ghost-stat-chip-value">{totalGhostCount}</span>
            </div>
            <div className="ghost-stat-chip">
              <span className="ghost-stat-chip-label">Orphaned Visits</span>
              <span className="ghost-stat-chip-value">{ghosts?.orphanedVisits?.length || 0}</span>
            </div>
            <div className="ghost-stat-chip">
              <span className="ghost-stat-chip-label">Soft-Deleted Patients</span>
              <span className="ghost-stat-chip-value">{ghosts?.softDeletedPatients?.length || 0}</span>
            </div>
            <div className="ghost-stat-chip">
              <span className="ghost-stat-chip-label">Orphaned Admissions</span>
              <span className="ghost-stat-chip-value">{ghosts?.orphanedAdmissions?.length || 0}</span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="ghost-studio-action-bar">
            <div className="ghost-studio-filter-group">
              <button
                type="button"
                className={`ghost-filter-pill ${ghostFilter === 'ALL' ? 'ghost-filter-pill--active' : ''}`}
                onClick={() => setGhostFilter('ALL')}
              >
                <span>All Ghosts ({totalGhostCount})</span>
              </button>

              <button
                type="button"
                className={`ghost-filter-pill ${ghostFilter === 'ORPHANED_VISIT' ? 'ghost-filter-pill--active' : ''}`}
                onClick={() => setGhostFilter('ORPHANED_VISIT')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>medical_services</span>
                <span>Orphaned Visits ({ghosts?.orphanedVisits?.length || 0})</span>
              </button>

              <button
                type="button"
                className={`ghost-filter-pill ${ghostFilter === 'SOFT_DELETED_PATIENT' ? 'ghost-filter-pill--active' : ''}`}
                onClick={() => setGhostFilter('SOFT_DELETED_PATIENT')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>person_off</span>
                <span>Soft-Deleted Patients ({ghosts?.softDeletedPatients?.length || 0})</span>
              </button>
            </div>
          </div>

          {/* Ghost Records Grid */}
          {filteredGhostList.length === 0 ? (
            <div className="ghost-empty-state">
              <span className="material-symbols-rounded ghost-empty-icon">check_circle</span>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--md-sys-color-on-surface)' }}>
                System Database Clean
              </h3>
              <p style={{ margin: 0, fontSize: '13px', maxWidth: '420px' }}>
                No orphaned visits, dangling hospital encounters, or unpurged soft-deleted patient records were detected.
              </p>
            </div>
          ) : (
            <div className="ghost-cards-grid">
              {filteredGhostList.map((ghost, idx) => (
                <div key={ghost.id || idx} className="ghost-card">
                  <div>
                    <div className="ghost-card-top">
                      <span className="ghost-card-badge">
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>warning</span>
                        <span>{ghost.type.replace('_', ' ')}</span>
                      </span>
                      <span className="ghost-card-status-badge">
                        {ghost.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="ghost-card-title">
                      {ghost.encounterNumber || ghost.mrn || ghost.id}
                    </div>
                    <div className="ghost-card-sub">
                      {ghost.department ? `${ghost.department} Department • ` : ''}
                      {ghost.visitType ? `${ghost.visitType} Encounter` : ''}
                      {ghost.patientName ? ` • ${ghost.patientName}` : ''}
                    </div>

                    {/* Dangling Reference Telemetry Box */}
                    <div className="ghost-dangling-box" style={{ marginTop: '10px' }}>
                      <div className="ghost-dangling-row">
                        <span className="ghost-dangling-label">Target ID:</span>
                        <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{ghost.id}</span>
                      </div>
                      {ghost.patientId && (
                        <div className="ghost-dangling-row">
                          <span className="ghost-dangling-label">Patient Ref:</span>
                          <span className="ghost-dangling-val">{ghost.patientId}</span>
                        </div>
                      )}
                      {ghost.labOrdersCount > 0 && (
                        <div className="ghost-dangling-row">
                          <span className="ghost-dangling-label">Active Lab Orders:</span>
                          <span className="ghost-dangling-val">{ghost.labOrdersCount} Orders Retained</span>
                        </div>
                      )}
                      {ghost.residualRecords && (
                        <div className="ghost-dangling-row">
                          <span className="ghost-dangling-label">Residual Visits:</span>
                          <span className="ghost-dangling-val">{ghost.residualRecords.visits} Visits</span>
                        </div>
                      )}
                    </div>

                    {/* Order List if Present */}
                    {ghost.labOrders && ghost.labOrders.length > 0 && (
                      <div className="ghost-orders-strip">
                        {ghost.labOrders.map((o, oIdx) => (
                          <div key={o.id || oIdx} className="ghost-order-pill">
                            <span>{o.testName}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: o.sampleCollected ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-error)' }}>
                              {o.status} ({o.sampleCollected ? 'Sampled' : 'No Sample'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="ghost-card-reason">
                      {ghost.reason}
                    </p>
                  </div>

                  <div className="ghost-card-footer">
                    <span style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {ghost.createdAt ? new Date(ghost.createdAt).toLocaleString() : 'Forensic Record'}
                    </span>
                    <button
                      type="button"
                      className="dev-purge-action-btn"
                      onClick={() => setTargetGhost(ghost)}
                      title="Permanently purge this ghost record"
                    >
                      <span className="material-symbols-rounded">delete_sweep</span>
                      <span>Purge Ghost (Dev)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Single Ghost Record Purge Confirmation Dialog ── */}
      <Md3ConfirmDialog
        isOpen={Boolean(targetGhost)}
        onClose={() => {
          if (!isGhostPurging) setTargetGhost(null);
        }}
        onConfirm={handleExecuteGhostPurge}
        title="Permanently Purge Ghost Record"
        message={`Are you sure you want to permanently delete ghost ${targetGhost?.type} (${targetGhost?.encounterNumber || targetGhost?.id})? This will cascade-release any associated beds, scans, and unlinked sub-records.`}
        confirmLabel={isGhostPurging ? 'Purging...' : 'Confirm Purge'}
        cancelLabel="Cancel"
        variant="danger"
        icon="delete_forever"
        loading={isGhostPurging}
      />

      {/* ── Batch Purge All Ghosts Confirmation Dialog ── */}
      <Md3ConfirmDialog
        isOpen={isPurgeAllDialogOpen}
        onClose={() => {
          if (!isPurgingAll) setIsPurgeAllDialogOpen(false);
        }}
        onConfirm={handleExecutePurgeAllGhosts}
        title="Batch Purge All Ghost Records"
        message={`Are you sure you want to permanently delete all ${totalGhostCount} ghost and orphaned records from the hospital database? All dangling encounters, soft-deleted patient shells, and residual queues will be wiped cleanly.`}
        confirmLabel={isPurgingAll ? 'Purging All...' : `Purge All ${totalGhostCount} Ghosts`}
        cancelLabel="Cancel"
        variant="danger"
        icon="delete_forever"
        loading={isPurgingAll}
      />

      {/* ── Active Patient Purge Confirmation Dialog ── */}
      <Md3ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => {
          if (!isPurging) {
            setIsDialogOpen(false);
            setTargetPatient(null);
            setPreviewData(null);
          }
        }}
        onConfirm={handleExecutePurge}
        title="Permanent Patient Purge (Development)"
        message={`Are you sure you want to permanently delete ${targetPatient?.fullName || targetPatient?.firstName || 'this patient'} from the database? This is a hard deletion across all clinical and financial collections.`}
        confirmLabel={isPurging ? 'Purging...' : 'Confirm Permanent Purge'}
        cancelLabel="Cancel"
        variant="danger"
        icon="delete_forever"
        loading={isPurging}
      >
        <div className="dev-preview-box">
          {isLoadingPreview ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="material-symbols-rounded spin" style={{ fontSize: '24px', verticalAlign: 'middle', marginRight: '8px' }}>
                sync
              </span>
              <span>Analyzing clinical assets &amp; occupied beds...</span>
            </div>
          ) : previewData ? (
            <>
              {/* Patient Basic Info */}
              <div className="dev-preview-patient-summary">
                <div>
                  <div className="dev-preview-name">{previewData.patient?.fullName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {previewData.patient?.age ? `${previewData.patient.age} yrs` : ''} &bull; {previewData.patient?.gender || 'Unknown'} &bull; {previewData.patient?.phone || 'No phone'}
                  </div>
                </div>
                <div className="dev-preview-mrn">
                  {previewData.patient?.mrn || 'N/A'}
                </div>
              </div>

              {/* Occupied Beds Warning & Release */}
              {previewData.impactSummary?.occupiedBeds?.length > 0 && (
                <div>
                  <div className="dev-preview-section-title" style={{ color: 'var(--md-sys-color-error)' }}>
                    Physical Beds to Immediately Release:
                  </div>
                  <div className="dev-preview-bed-list">
                    {previewData.impactSummary.occupiedBeds.map((bed, idx) => (
                      <div key={idx} className="dev-preview-bed-item">
                        <span className="dev-preview-bed-name">
                          <span className="material-symbols-rounded">single_bed</span>
                          <span>Bed {bed.bedNumber} ({bed.wardClass}) &bull; {bed.room}</span>
                        </span>
                        <span className="dev-preview-bed-action">Will set to VACANT</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Encounters & Records Stats */}
              <div>
                <div className="dev-preview-section-title">Records to Cascade Purge:</div>
                <div className="dev-preview-grid">
                  <div className={`dev-preview-stat-card ${previewData.impactSummary?.activeEncounters?.length > 0 ? 'dev-preview-stat-card--highlight' : ''}`}>
                    <span className="dev-preview-stat-label">Active Queues</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.activeEncounters?.length || 0}</span>
                  </div>
                  <div className="dev-preview-stat-card">
                    <span className="dev-preview-stat-label">Total Visits</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.totalVisits || 0}</span>
                  </div>
                  <div className="dev-preview-stat-card">
                    <span className="dev-preview-stat-label">Admissions (IPD)</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.admissionsCount || 0}</span>
                  </div>
                  <div className="dev-preview-stat-card">
                    <span className="dev-preview-stat-label">Appointments</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.appointmentsCount || 0}</span>
                  </div>
                  <div className="dev-preview-stat-card">
                    <span className="dev-preview-stat-label">Lab Orders</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.labOrdersCount || 0}</span>
                  </div>
                  <div className="dev-preview-stat-card">
                    <span className="dev-preview-stat-label">Bills / Invoices</span>
                    <span className="dev-preview-stat-value">{previewData.impactSummary?.billsCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="dev-preview-warning-alert">
                <span className="material-symbols-rounded" style={{ fontSize: '20px', flexShrink: 0 }}>
                  warning
                </span>
                <span>
                  ACID Guarantee: All clinical data and active encounters will be deleted, and all workstations (Doctor, Nurse, Bed Map) will drop this patient in real-time.
                </span>
              </div>
            </>
          ) : (
            <div className="dev-preview-warning-alert">
              <span className="material-symbols-rounded">info</span>
              <span>Patient document and all references will be permanently removed.</span>
            </div>
          )}
        </div>
      </Md3ConfirmDialog>
    </section>
  );
};

export default AdminDevelopmentView;
