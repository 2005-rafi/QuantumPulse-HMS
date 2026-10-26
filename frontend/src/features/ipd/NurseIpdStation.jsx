/**
 * features/ipd/NurseIpdStation.jsx
 * Inpatient Nursing Clinical Workstation & Unified Care Deck.
 * Refactored: Left-attached collapsible patient queue sidebar & rail, mobile queue drawer portal,
 * and high-intent Material Design 3 clinical duty tabs (Vitals & Directives, e-MAR, Fluid I/O, SBAR Handover).
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import IpdPatientBanner from '../../components/ipd/IpdPatientBanner';
import VitalsMonitorCard from '../../components/ipd/VitalsMonitorCard';
import ClinicalDirectivesCard from '../../components/ipd/ClinicalDirectivesCard';
import EmarMedicationGrid from '../../components/ipd/EmarMedicationGrid';
import IoBalanceCard from '../../components/ipd/IoBalanceCard';
import SbarHandoverForm from '../../components/ipd/SbarHandoverForm';
import News2Badge from '../../components/ipd/News2Badge';
import { IpdNursingUtilitiesSuite } from '../../components/ipd/IpdNursingUtilitiesSuite';
import { Md3Button, Md3TextField, Md3Select, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import { formatPatientName, getPatientInitials } from '../../utils/patientFormatters';
import ipdApi from '../../services/ipdApi';
import './NurseIpdStation.css';

import Md3MarqueeText from '../../components/md3/Md3MarqueeText';

const ROSTER_FILTERS = [
  { id: 'ALL', label: 'All Inpatients', icon: 'groups' },
  { id: 'HIGH_RISK', label: 'NEWS2 Alert', icon: 'warning', alert: true },
  { id: 'POST_OP', label: 'Post-Op', icon: 'medical_services' },
  { id: 'STABLE', label: 'Stable', icon: 'check_circle' },
];

export const NurseIpdStation = ({ defaultMode }) => {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isOperationsMode = location.pathname.includes('/ipd-operations') || defaultMode === 'OPERATIONS';

  const [admissionList, setAdmissionList] = useState([]);
  const [currentAdmission, setCurrentAdmission] = useState(null);
  const [vitalsList, setVitalsList] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [cpoeOrders, setCpoeOrders] = useState([]);
  const [emarRecords, setEmarRecords] = useState([]);
  const [ioRecords, setIoRecords] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  // Desktop sidebar & Mobile drawer states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileQueueDrawerOpen, setIsMobileQueueDrawerOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Clinical duty active tab state
  const [activeTab, setActiveTab] = useState('VITALS'); // 'VITALS' | 'EMAR' | 'IO' | 'SBAR'

  // Active operations utility tab
  const [activeUtilTab, setActiveUtilTab] = useState('ADMIT_BED_MAP');

  // Vitals record bottom sheet
  const [showVitalsSheet, setShowVitalsSheet] = useState(false);
  const [temp, setTemp] = useState('37.0');
  const [sysBp, setSysBp] = useState('120');
  const [diaBp, setDiaBp] = useState('80');
  const [hr, setHr] = useState('75');
  const [rr, setRr] = useState('16');
  const [spo2, setSpo2] = useState('98');
  const [o2Therapy, setO2Therapy] = useState(false);
  const [o2Flow, setO2Flow] = useState('0');
  const [avpu, setAvpu] = useState('ALERT');
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isMobileQueueDrawerOpen) setIsMobileQueueDrawerOpen(false);
        if (showVitalsSheet) setShowVitalsSheet(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileQueueDrawerOpen, showVitalsSheet]);

  // Prevent background scroll when mobile queue drawer is open
  useEffect(() => {
    if (isMobileQueueDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileQueueDrawerOpen]);

  const openUtility = (tabKey) => {
    if (tabKey) setActiveUtilTab(tabKey);
    navigate('/dashboard/nurse/ipd-operations');
  };

  const handleReturnToClinical = () => {
    if (currentAdmission?._id) {
      navigate(`/dashboard/nurse/ipd/${currentAdmission._id}`);
    } else if (admissionList.length > 0) {
      navigate(`/dashboard/nurse/ipd/${admissionList[0]._id}`);
    } else {
      navigate('/dashboard/nurse/ipd');
    }
  };

  // Load admissions list
  const fetchAdmissions = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
      const list = res.data?.data || [];
      setAdmissionList(list);
      if (!isOperationsMode && !admissionId && list.length > 0) {
        navigate(`/dashboard/nurse/ipd/${list[0]._id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load active admissions:', err);
    } finally {
      setLoadingList(false);
    }
  }, [admissionId, isOperationsMode, navigate]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  // Load admission clinical data
  const loadClinicalData = useCallback(async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const [admRes, vitRes, emarRes, ioRes, handRes, cpoeRes] = await Promise.allSettled([
        ipdApi.getAdmissionById(admissionId),
        ipdApi.getVitals(admissionId),
        ipdApi.getEmarGrid(admissionId),
        ipdApi.getIO(admissionId),
        ipdApi.getHandovers(admissionId),
        ipdApi.getCpoeOrders(admissionId),
      ]);

      if (admRes.status === 'fulfilled') {
        setCurrentAdmission(admRes.value.data?.data || null);
      }
      if (vitRes.status === 'fulfilled') {
        const vList = vitRes.value.data?.data || [];
        setVitalsList(vList);
        setLatestVitals(vList[0] || null);
      }
      if (emarRes.status === 'fulfilled') {
        setEmarRecords(emarRes.value.data?.data || []);
      }
      if (ioRes.status === 'fulfilled') {
        setIoRecords(ioRes.value.data?.data || []);
      }
      if (handRes.status === 'fulfilled') {
        setHandovers(handRes.value.data?.data || []);
      }
      if (cpoeRes.status === 'fulfilled') {
        setCpoeOrders(cpoeRes.value.data?.data || []);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load inpatient clinical records:', err);
    }
  }, [admissionId]);

  useEffect(() => {
    loadClinicalData();
  }, [loadClinicalData]);

  // Record vitals & NEWS2
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    setSavingVitals(true);
    try {
      await ipdApi.recordVitals(admissionId, {
        temperature: parseFloat(temp),
        systolicBp: parseInt(sysBp, 10),
        diastolicBp: parseInt(diaBp, 10),
        heartRate: parseInt(hr, 10),
        respirationRate: parseInt(rr, 10),
        spO2: parseInt(spo2, 10),
        oxygenTherapy: o2Therapy,
        oxygenFlowRateLpm: parseFloat(o2Flow) || 0,
        avpu,
        clinicalNotes: vitalsNotes,
      });
      setShowVitalsSheet(false);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setSavingVitals(false);
    }
  };

  // Vitals frequency order updates
  const handleUpdateVitalsFrequency = async (planData) => {
    const targetAdmId = admissionId || currentAdmission?._id;
    if (!targetAdmId) {
      alert('Please select an active inpatient admission first.');
      return;
    }
    try {
      const res = await ipdApi.updateVitalsFrequency(targetAdmId, planData);
      const updatedData = res.data?.data;
      if (updatedData) {
        setCurrentAdmission((prev) => prev ? {
          ...prev,
          vitalsMonitoringPlan: updatedData.vitalsMonitoringPlan || {
            ...prev.vitalsMonitoringPlan,
            frequency: planData.frequency,
            specialInstructions: planData.specialInstructions,
          },
          nextVitalsDueAt: updatedData.nextVitalsDueAt !== undefined ? updatedData.nextVitalsDueAt : prev.nextVitalsDueAt,
        } : prev);
      }
      await loadClinicalData();
    } catch (err) {
      console.error('Failed to update vitals monitoring frequency:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update vitals monitoring frequency');
    }
  };

  // e-MAR updates
  const handleUpdateEmar = async (emarId, status, details) => {
    try {
      await ipdApi.updateEmarStatus(emarId, status, details);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update e-MAR dose');
    }
  };

  // Log I/O
  const handleLogIO = async (data) => {
    try {
      await ipdApi.logIO(admissionId, data);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log fluid balance');
    }
  };

  // SBAR Handover
  const handleCreateHandover = async (data) => {
    try {
      await ipdApi.createHandover(admissionId, data);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create handover');
    }
  };

  const handleAcknowledgeHandover = async (handoverId) => {
    try {
      await ipdApi.acknowledgeHandover(handoverId);
      await loadClinicalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge handover');
    }
  };

  // Patient queue filtering
  const filteredAdmissions = useMemo(() => {
    return admissionList.filter((adm) => {
      const p = adm.patientId || {};
      const pName = formatPatientName(p).toLowerCase();
      const mrn = (p.mrn || '').toLowerCase();
      const bedLabel = (adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '').toString().toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || pName.includes(q) || mrn.includes(q) || bedLabel.includes(q);
      if (!matchesSearch) return false;

      if (filterCategory === 'HIGH_RISK') {
        const score = adm.latestVitals?.news2Score || 0;
        return score >= 3 || adm.latestVitals?.news2RiskLevel === 'HIGH' || adm.latestVitals?.news2RiskLevel === 'MEDIUM';
      }
      if (filterCategory === 'POST_OP') {
        return (adm.admissionType || '').toUpperCase() === 'SURGICAL' || (adm.conversionType || '').toUpperCase() === 'POST_OP';
      }
      if (filterCategory === 'STABLE') {
        const score = adm.latestVitals?.news2Score || 0;
        return score < 3;
      }
      return true;
    });
  }, [admissionList, filterCategory, searchQuery]);

  // Summary counts
  const highRiskCount = useMemo(
    () => admissionList.filter((a) => (a.latestVitals?.news2Score || 0) >= 3 || a.latestVitals?.news2RiskLevel === 'HIGH').length,
    [admissionList]
  );
  const postOpCount = useMemo(
    () => admissionList.filter((a) => (a.admissionType || '').toUpperCase() === 'SURGICAL').length,
    [admissionList]
  );
  const stableCount = useMemo(
    () => admissionList.filter((a) => (a.latestVitals?.news2Score || 0) < 3).length,
    [admissionList]
  );

  const filterCounts = {
    ALL: admissionList.length,
    HIGH_RISK: highRiskCount,
    POST_OP: postOpCount,
    STABLE: stableCount,
  };

  const handleSelectAdmission = (admId) => {
    navigate(`/dashboard/nurse/ipd/${admId}`);
    setIsMobileQueueDrawerOpen(false);
  };

  // Render Patient Roster (Used in both Desktop Sidebar and Mobile Drawer)
  const renderRosterContent = () => (
    <>
      <div className="ipd-terminal__sidebar-header">
        <div className="ipd-terminal__sidebar-header-left">
          <button
            type="button"
            className="ipd-terminal__collapse-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Patient Roster Sidebar"
            aria-label="Collapse Roster"
          >
            <span className="material-symbols-rounded">left_panel_close</span>
          </button>
          <span className="ipd-terminal__sidebar-count" title={`${filteredAdmissions.length} Admitted Patients`}>
            {filteredAdmissions.length}
          </span>
        </div>

        <div className="ipd-terminal__sidebar-header-actions">
          <button
            type="button"
            className="ipd-terminal__admit-btn"
            onClick={() => openUtility('ADMIT_BED_MAP')}
            title="Admit Patient / Bed Map"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>person_add</span>
            <span>Admit</span>
          </button>

          <button
            type="button"
            className={`ipd-terminal__icon-btn ${loadingList ? 'is-loading' : ''}`}
            onClick={fetchAdmissions}
            disabled={loadingList}
            title="Refresh Inpatient Roster"
            aria-label="Refresh Roster"
          >
            <span className="material-symbols-rounded" style={{ animation: loadingList ? 'spin 1s linear infinite' : 'none' }}>
              sync
            </span>
          </button>

          <button
            type="button"
            className="ipd-terminal__mobile-close-btn"
            onClick={() => setIsMobileQueueDrawerOpen(false)}
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>

      {/* 2x2 Clinical Risk Segregation Matrix */}
      <div className="ipd-filter-matrix" role="tablist" aria-label="Inpatient Risk Segregation Filters">
        {ROSTER_FILTERS.map((item) => {
          const isSelected = filterCategory === item.id;
          const count = filterCounts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`ipd-matrix-tile ${isSelected ? 'ipd-matrix-tile--active' : ''} ${item.alert && count > 0 ? 'ipd-matrix-tile--alert' : ''}`}
              onClick={() => setFilterCategory(item.id)}
              title={`Filter by ${item.label} (${count})`}
            >
              <div className="ipd-matrix-tile__top">
                <span className="material-symbols-rounded ipd-matrix-tile__icon">{item.icon}</span>
                <span className="ipd-matrix-tile__count">{count}</span>
              </div>
              <span className="ipd-matrix-tile__label">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="ipd-terminal__sidebar-search">
        <Md3TextField
          label="Search Patient or Bed"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g. John, Bed 101, Bay 1"
        />
      </div>

      {/* Inpatient Cards Deck */}
      <div className="ipd-terminal__card-list">
        {filteredAdmissions.length === 0 ? (
          <div className="ipd-terminal__empty-state">
            <span className="material-symbols-rounded">hotel</span>
            <p>No inpatients match the selected filter</p>
          </div>
        ) : (
          filteredAdmissions.map((adm) => {
            const p = adm.patientId || {};
            const fullName = formatPatientName(p) || 'Admitted Patient';
            const initials = getPatientInitials(p) || 'P';
            const bed = adm.currentBedId;
            const bedLabel = bed?.bedLabel || bed?.bedNumber || '—';
            const roomNumber = adm.currentRoomId?.roomNumber;
            const ageGender = [p.age ? `${p.age}y` : '', p.gender ? `${p.gender}` : ''].filter(Boolean).join(' • ');
            const isSelected = adm._id === admissionId;
            const news2Score = adm.latestVitals?.news2Score ?? 0;
            const news2Risk = adm.latestVitals?.news2RiskLevel || (news2Score >= 7 ? 'HIGH' : news2Score >= 5 ? 'MEDIUM' : 'LOW');

            return (
              <div
                key={adm._id}
                role="button"
                tabIndex={0}
                className={`ipd-queue-card ${isSelected ? 'ipd-queue-card--active' : ''}`}
                onClick={() => handleSelectAdmission(adm._id)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectAdmission(adm._id)}
              >
                {/* 1. Header: Avatar + Patient Full Name (Marquee) + Demographics */}
                <div className="ipd-queue-card__header">
                  <div className="ipd-queue-card__avatar">{initials}</div>
                  <div className="ipd-queue-card__name-wrapper">
                    <Md3MarqueeText text={fullName} className="ipd-queue-card__name" as="h4" />
                    {ageGender && <span className="ipd-queue-card__demog">{ageGender}</span>}
                  </div>
                </div>

                {/* 2. Sequential Chips: Bed Location (Marquee) followed by NEWS2 / Vitals Status */}
                <div className="ipd-queue-card__chips-col">
                  <div className="ipd-queue-card__bed-tag" title={`Bed ${bedLabel}${roomNumber ? `, Room ${roomNumber}` : ''}`}>
                    <span className="material-symbols-rounded">hotel</span>
                    <Md3MarqueeText
                      text={`Bed ${bedLabel}${roomNumber ? ` (Rm ${roomNumber})` : ''}`}
                      className="ipd-queue-card__chip-marquee"
                    />
                  </div>

                  <div className="ipd-queue-card__status-wrap">
                    {adm.latestVitals ? (
                      <News2Badge score={news2Score} riskLevel={news2Risk} />
                    ) : (
                      <span className="ipd-queue-card__vitals-pending">
                        <span className="ipd-queue-card__pending-dot" />
                        Vitals Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  // ─── FULL-SCREEN WARD OPERATIONS & LOGISTICS WORKSPACE (ROUTED) ───
  if (isOperationsMode) {
    return (
      <div className="ipd-ward-operations-viewport">
        <IpdNursingUtilitiesSuite
          activeTab={activeUtilTab}
          onChangeTab={setActiveUtilTab}
          admission={currentAdmission}
          onAdmissionCreated={() => {
            fetchAdmissions();
            loadClinicalData();
          }}
          onTransferSuccess={() => {
            fetchAdmissions();
            loadClinicalData();
          }}
          onReturnToClinical={handleReturnToClinical}
        />
      </div>
    );
  }

  // ─── IDLE DECK WHEN NO ACTIVE INPATIENTS EXIST (CLINICAL MODE) ───
  if (!admissionId && admissionList.length === 0) {
    return (
      <div className="ipd-terminal-viewport">
        <ClinicalStationIdleDeck
          preset="IPD_NURSE"
          readinessChips={[
            { label: 'Ward Floor Stock: Active', icon: 'medication', onClick: () => openUtility('EMERGENCY_REQUISITION') },
            { label: 'Crash Cart Protocol: Armed', icon: 'emergency', onClick: () => openUtility('CRASH_CART_CODE_BLUE') },
            { label: 'IV Infusion Doser: Ready', icon: 'water_drop', onClick: () => openUtility('IV_INFUSION_DOSER') },
            { label: 'Ward Transfers: Active', icon: 'swap_horiz', onClick: () => openUtility('WARD_TRANSFERS') },
          ]}
          primaryAction={{
            label: 'Open Bed Map & Admit Patient',
            icon: 'person_add',
            onClick: () => openUtility('ADMIT_BED_MAP'),
          }}
          quickCards={[
            {
              title: 'Bed Allocation Matrix',
              subtitle: 'View spatial floor layout & available ward beds',
              icon: 'grid_view',
              onClick: () => openUtility('ADMIT_BED_MAP'),
            },
            {
              title: 'Ward Transfer Ledger',
              subtitle: 'Inspect inter-ward & ICU bed transfers',
              icon: 'swap_horiz',
              onClick: () => openUtility('WARD_TRANSFERS'),
            },
            {
              title: 'Discharged Patients',
              subtitle: 'Search past inpatient summaries & gate passes',
              icon: 'history',
              onClick: () => openUtility('DISCHARGED_ARCHIVE'),
            },
          ]}
        />
      </div>
    );
  }

  const currentPatientName = currentAdmission?.patientId
    ? formatPatientName(currentAdmission.patientId)
    : 'Active Inpatient';

  return (
    <div className="ipd-terminal-viewport">
      {/* ─── Mobile/Tablet Dedicated Patient Queue Drawer Portal ─── */}
      {isMobileQueueDrawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="ipd-queue-drawer-portal" role="dialog" aria-modal="true" aria-label="Inpatient Ward Roster Drawer">
            <div
              className="ipd-queue-drawer-scrim"
              onClick={() => setIsMobileQueueDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="ipd-queue-drawer-surface">
              {renderRosterContent()}
            </div>
          </div>,
          document.body
        )}

      {/* ─── Mobile/Tablet Sticky Toolbar ─── */}
      <div className="ipd-mobile-toolbar">
        <button
          type="button"
          className="ipd-mobile-drawer-btn"
          onClick={() => setIsMobileQueueDrawerOpen(true)}
          aria-label="Open Inpatient Ward Roster"
        >
          <span className="material-symbols-rounded">menu_open</span>
          <span>Ward Roster</span>
          <span className="ipd-mobile-count-badge">{filteredAdmissions.length}</span>
        </button>

        {currentAdmission && (
          <div className="ipd-mobile-patient-preview">
            <span className="ipd-mobile-token-pill" title={currentPatientName}>
              {currentPatientName} (Bed {currentAdmission.currentBedId?.bedLabel || currentAdmission.currentBedId?.bedNumber || '—'})
            </span>
          </div>
        )}

        <div className="ipd-mobile-quick-actions">
          <button
            type="button"
            className="ipd-mobile-action-icon-btn"
            onClick={() => setShowVitalsSheet(true)}
            title="Record Vitals"
          >
            <span className="material-symbols-rounded">favorite</span>
          </button>
          <button
            type="button"
            className="ipd-mobile-action-icon-btn"
            onClick={() => openUtility('ADMIT_BED_MAP')}
            title="Ward Utilities"
          >
            <span className="material-symbols-rounded">medical_services</span>
          </button>
        </div>
      </div>

      {/* ─── 2-PANE MASTER-DETAIL CLINICAL WORKSPACE ─── */}
      <div className={`ipd-terminal-layout ${isSidebarCollapsed ? 'ipd-terminal-layout--rail' : ''}`}>
        {/* ─── LEFT MASTER: COLLAPSIBLE / RAIL PATIENT ROSTER (DESKTOP) ─── */}
        {isSidebarCollapsed ? (
          <aside className="ipd-terminal__rail" aria-label="Collapsed Patient Roster Rail">
            <div className="ipd-terminal__rail-header">
              <button
                type="button"
                className="ipd-terminal__rail-toggle-btn"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Inpatient Roster Sidebar"
                aria-label="Expand Roster"
              >
                <span className="material-symbols-rounded">right_panel_open</span>
              </button>
              <span className="ipd-terminal__rail-count-badge" title={`${filteredAdmissions.length} Inpatients`}>
                {filteredAdmissions.length}
              </span>
            </div>

            <div className="ipd-terminal__rail-body">
              {filteredAdmissions.map((adm) => {
                const p = adm.patientId || {};
                const fullName = formatPatientName(p) || 'Patient';
                const firstName = p.firstName || fullName.split(' ')[0] || 'Patient';
                const initials = getPatientInitials(p) || 'P';
                const bedLabel = adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '—';
                const isSelected = adm._id === admissionId;

                return (
                  <div
                    key={adm._id}
                    role="button"
                    tabIndex={0}
                    className={`ipd-terminal__rail-item ${isSelected ? 'ipd-terminal__rail-item--selected' : ''}`}
                    onClick={() => handleSelectAdmission(adm._id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectAdmission(adm._id)}
                    title={`${fullName} (Bed ${bedLabel})`}
                  >
                    <div className="ipd-terminal__rail-avatar">{initials}</div>
                    <span className="ipd-terminal__rail-bed">B-{bedLabel}</span>
                    <div className="ipd-terminal__rail-name-box">
                      <Md3MarqueeText text={firstName} className="ipd-terminal__rail-name" />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        ) : (
          <aside className="ipd-terminal__sidebar" aria-label="Inpatient Ward Roster">
            {renderRosterContent()}
          </aside>
        )}

        {/* ─── RIGHT DETAIL: ACTIVE PATIENT CLINICAL WORKSPACE ─── */}
        <main className="ipd-workspace">
          {currentAdmission ? (
            <>
              {/* 1. Inpatient Clinical Identity Banner */}
              <IpdPatientBanner
                admission={currentAdmission}
                latestVitals={latestVitals}
                onOpenRecordVitals={() => setShowVitalsSheet(true)}
                onOpenUtilities={openUtility}
              />

              {/* 2. MD3 Clinical Workflow Duty Tab Bar */}
              <div className="ipd-tab-bar-container" role="tablist" aria-label="Clinical Duty Tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'VITALS'}
                  className={`ipd-tab-btn ${activeTab === 'VITALS' ? 'ipd-tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('VITALS')}
                >
                  <span className="material-symbols-rounded">monitor_heart</span>
                  <span>Vitals &amp; Directives</span>
                  {latestVitals && (
                    <span className="ipd-tab-badge">NEWS2: {latestVitals.news2Score ?? 0}</span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'EMAR'}
                  className={`ipd-tab-btn ${activeTab === 'EMAR' ? 'ipd-tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('EMAR')}
                >
                  <span className="material-symbols-rounded">medication</span>
                  <span>e-MAR &amp; Meds</span>
                  {emarRecords.length > 0 && (
                    <span className="ipd-tab-badge ipd-tab-badge--neutral">{emarRecords.length} Doses</span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'IO'}
                  className={`ipd-tab-btn ${activeTab === 'IO' ? 'ipd-tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('IO')}
                >
                  <span className="material-symbols-rounded">opacity</span>
                  <span>Fluid I/O Balance</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'SBAR'}
                  className={`ipd-tab-btn ${activeTab === 'SBAR' ? 'ipd-tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('SBAR')}
                >
                  <span className="material-symbols-rounded">assignment</span>
                  <span>SBAR Handover</span>
                  {handovers.length > 0 && (
                    <span className="ipd-tab-badge ipd-tab-badge--neutral">{handovers.length}</span>
                  )}
                </button>
              </div>

              {/* 3. Tab Content Panels */}
              <div className="ipd-tab-panel">
                {activeTab === 'VITALS' && (
                  <div className="ipd-tab-content ipd-tab-content--vitals">
                    {/* Bedside Vitals & NEWS2 Telemetry */}
                    <VitalsMonitorCard
                      latestVitals={latestVitals}
                      vitalsList={vitalsList}
                      admissionId={admissionId}
                      monitoringPlan={currentAdmission?.vitalsMonitoringPlan}
                      lastVitalsRecordedAt={currentAdmission?.lastVitalsRecordedAt || latestVitals?.recordedAt}
                      nextVitalsDueAt={currentAdmission?.nextVitalsDueAt}
                      onOpenRecordSheet={() => setShowVitalsSheet(true)}
                      onUpdateFrequency={handleUpdateVitalsFrequency}
                    />

                    {/* Physician Directives & Active CPOE Orders */}
                    <ClinicalDirectivesCard
                      admission={currentAdmission}
                      cpoeOrders={cpoeOrders}
                      onOpenUtilities={openUtility}
                    />
                  </div>
                )}

                {activeTab === 'EMAR' && (
                  <div className="ipd-tab-content">
                    <EmarMedicationGrid
                      records={emarRecords}
                      onUpdateStatus={handleUpdateEmar}
                    />
                  </div>
                )}

                {activeTab === 'IO' && (
                  <div className="ipd-tab-content">
                    <IoBalanceCard
                      ioRecords={ioRecords}
                      onLogIO={handleLogIO}
                    />
                  </div>
                )}

                {activeTab === 'SBAR' && (
                  <div className="ipd-tab-content">
                    <SbarHandoverForm
                      handovers={handovers}
                      onCreateHandover={handleCreateHandover}
                      onAcknowledge={handleAcknowledgeHandover}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ipd-workspace-empty">
              <span className="material-symbols-rounded">hotel</span>
              <h3>No Inpatient Selected</h3>
              <p>Select a patient from the ward roster on the left to review bedside vitals, e-MAR charts, and clinical directives.</p>
            </div>
          )}
        </main>
      </div>

      {/* Record Vitals Bottom Sheet */}
      <Md3BottomSheet
        isOpen={showVitalsSheet}
        onClose={() => setShowVitalsSheet(false)}
        title="Record Inpatient Vitals &amp; NEWS2 Telemetry"
        subtitle="System evaluates early clinical deterioration risk score according to NHS NEWS2 protocol"
      >
        <form onSubmit={handleSaveVitals} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Body Temp (°C) *" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} required />
            <Md3TextField label="Heart Rate (BPM) *" type="number" value={hr} onChange={(e) => setHr(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Systolic BP (mmHg) *" type="number" value={sysBp} onChange={(e) => setSysBp(e.target.value)} required />
            <Md3TextField label="Diastolic BP (mmHg) *" type="number" value={diaBp} onChange={(e) => setDiaBp(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Md3TextField label="Respiration Rate (bpm) *" type="number" value={rr} onChange={(e) => setRr(e.target.value)} required />
            <Md3TextField label="SpO2 (%) *" type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={o2Therapy} onChange={(e) => setO2Therapy(e.target.checked)} />
              <span>Supplemental Oxygen Therapy</span>
            </label>
            {o2Therapy && (
              <Md3TextField label="Flow Rate (L/min)" type="number" value={o2Flow} onChange={(e) => setO2Flow(e.target.value)} />
            )}
          </div>

          <Md3Select label="Consciousness Level (AVPU Scale) *" value={avpu} onChange={(e) => setAvpu(e.target.value)}>
            <option value="ALERT">Alert (A)</option>
            <option value="VOICE">Responds to Voice (V)</option>
            <option value="PAIN">Responds to Pain (P)</option>
            <option value="UNRESPONSIVE">Unresponsive (U)</option>
          </Md3Select>

          <Md3TextField
            label="Clinical Observation Notes"
            value={vitalsNotes}
            onChange={(e) => setVitalsNotes(e.target.value)}
            placeholder="e.g. Chest clear, patient calm and resting comfortably"
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '14px' }}>
            <Md3Button variant="secondary" type="button" onClick={() => setShowVitalsSheet(false)}>
              Cancel
            </Md3Button>
            <Md3Button variant="filled" type="submit" loading={savingVitals}>
              Evaluate &amp; Save Vitals
            </Md3Button>
          </div>
        </form>
      </Md3BottomSheet>
    </div>
  );
};

export default NurseIpdStation;
