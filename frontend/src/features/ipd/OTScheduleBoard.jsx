/**
 * features/ipd/OTScheduleBoard.jsx
 * Enterprise Material 3 Operating Theatre (OT) & Surgical Board
 * Orchestrates surgery requests, OT room allocation, safety checklists, and post-op hand-offs.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { staffAPI } from '../../services/staffAPI';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatDoctorName, formatPatientName } from '../../utils/patientFormatters';
import {
  Md3Button,
  Md3TextField,
  Md3Select,
  Md3TextArea,
  Md3BottomSheet,
} from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import SurgicalHistoryManager from './SurgicalHistoryManager';
import './OTScheduleBoard.css';

const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: 'Routine (Elective List)', color: '#006a6a', bg: '#cce8e7' },
  { value: 'URGENT', label: 'Urgent (24-48 hrs)', color: '#825500', bg: '#ffddb3' },
  { value: 'EMERGENCY_STAT', label: 'STAT Emergency', color: '#ba1a1a', bg: '#ffdad6' },
];

const SURGERY_TYPES = [
  { value: 'ELECTIVE', label: 'Elective' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

const ANESTHESIA_TYPES = [
  { value: 'GENERAL', label: 'General Anesthesia (GA)' },
  { value: 'SPINAL', label: 'Spinal Anesthesia' },
  { value: 'EPIDURAL', label: 'Epidural' },
  { value: 'LOCAL', label: 'Local / Sedation' },
  { value: 'NONE', label: 'None / Topical' },
];

const DESTINATIONS = [
  { value: 'POST_OP_RECOVERY', label: 'Post-Op Recovery Room (PACU)' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'HDU', label: 'High Dependency Unit (HDU)' },
  { value: 'CCU', label: 'Coronary Care Unit (CCU)' },
  { value: 'WARD', label: 'Inpatient Ward Bed' },
  { value: 'HOME', label: 'Day Surgery Discharge' },
];

export const OTScheduleBoard = ({
  userRole = 'ADMIN',
  embedded = false,
  hideHero = false,
  activeTab: controlledTab,
  onTabChange,
  onPendingRequestsCountChange,
  hasTopNav = false,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [internalTab, setInternalTab] = useState('LIVE_BOARD');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabSelect = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Data
  const [sessions, setSessions] = useState([]);
  const [otRooms, setOtRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [vacantBeds, setVacantBeds] = useState([]);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [schedulingSession, setSchedulingSession] = useState(null); // For Approve & Schedule Request
  const [checklistSession, setChecklistSession] = useState(null); // For Pre-op checklist
  const [handoffSession, setHandoffSession] = useState(null); // For Complete & Post-op
  const [consumableSession, setConsumableSession] = useState(null); // For logging consumables
  const [declineSession, setDeclineSession] = useState(null); // For rejecting request
  const [declineReason, setDeclineReason] = useState('');

  // Form states: Approve & Schedule
  const [allocRoomId, setAllocRoomId] = useState('');
  const [allocDate, setAllocDate] = useState('');
  const [allocStartTime, setAllocStartTime] = useState('09:00');
  const [allocEndTime, setAllocEndTime] = useState('11:00');
  const [allocLeadSurgeonId, setAllocLeadSurgeonId] = useState('');
  const [allocAnesthetistId, setAllocAnesthetistId] = useState('');
  const [allocScrubNurseId, setAllocScrubNurseId] = useState('');
  const [allocCirculatingNurseId, setAllocCirculatingNurseId] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Form states: Advisory Checklist
  const [checklistData, setChecklistData] = useState({
    consentSigned: false,
    npoConfirmed: false,
    siteMarked: false,
    allergiesReviewed: false,
    bloodCrossmatched: false,
    anesthesiaClearance: false,
    preOpNotes: '',
  });
  const [savingChecklist, setSavingChecklist] = useState(false);

  // Form states: Complete & Post-Op Handoff
  const [handoffData, setHandoffData] = useState({
    operativeNotes: '',
    postOpNotes: '',
    outcome: 'SUCCESSFUL',
    postOpDestination: 'POST_OP_RECOVERY',
    postOpBedId: '',
  });
  const [sessionConsumables, setSessionConsumables] = useState([]);
  const [completingHandoff, setCompletingHandoff] = useState(false);

  // Form states: Consumable logger
  const [consumableForm, setConsumableForm] = useState({
    itemName: '',
    quantity: 1,
    unitCost: 0,
    batchNumber: '',
    notes: '',
  });
  const [savingConsumable, setSavingConsumable] = useState(false);

  // ── Load All Data ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, roomsRes, staffRes, bedsRes] = await Promise.allSettled([
        ipdApi.getOtSessions(),
        ipdApi.getRooms(),
        staffAPI.list(1, 100),
        ipdApi.getBeds({ status: 'VACANT' }),
      ]);

      if (sessionsRes.status === 'fulfilled') {
        setSessions(sessionsRes.value.data?.data || []);
      }
      if (roomsRes.status === 'fulfilled') {
        const allRooms = roomsRes.value.data?.data || [];
        // Filter specifically for Operating Theatre rooms
        const filteredOtRooms = allRooms.filter((r) => r.roomType === 'OT');
        setOtRooms(filteredOtRooms.length > 0 ? filteredOtRooms : allRooms);
      }
      if (staffRes.status === 'fulfilled') {
        const rawStaff = staffRes.value?.data || staffRes.value;
        const staffPayload =
          rawStaff?.items ||
          rawStaff?.data?.items ||
          rawStaff?.staff ||
          (Array.isArray(rawStaff) ? rawStaff : []);
        setStaffList(Array.isArray(staffPayload) ? staffPayload : []);
      }
      if (bedsRes.status === 'fulfilled') {
        setVacantBeds(bedsRes.value.data?.data || []);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load OT board data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived surgeons and nurses
  const surgeons = useMemo(() => {
    return staffList.filter((s) => {
      const role = s.roleId?.name || s.role || '';
      const pos = s.position || s.designation || '';
      return /Surgeon|Doctor/i.test(role) || /Surgeon|Doctor|Physician/i.test(pos);
    });
  }, [staffList]);

  const nurses = useMemo(() => {
    return staffList.filter((s) => {
      const role = s.roleId?.name || s.role || '';
      const pos = s.position || s.designation || '';
      return /Nurse/i.test(role) || /Nurse/i.test(pos);
    });
  }, [staffList]);

  // Telemetry KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter((s) => {
      if (!s.scheduledStart) return false;
      return new Date(s.scheduledStart).toISOString().split('T')[0] === today;
    });

    const inProgress = sessions.filter((s) => s.status === 'IN_PROGRESS').length;
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED').length;
    const requested = sessions.filter((s) => s.status === 'REQUESTED').length;
    const completedToday = todaySessions.filter((s) => s.status === 'COMPLETED').length;

    return {
      totalToday: todaySessions.length,
      inProgress,
      scheduled,
      requested,
      completedToday,
    };
  }, [sessions]);

  // Filtered sessions for Live Board (strictly active & scheduled cases)
  const displayedSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        // Exclude requested, rejected, cancelled, and completed sessions from the live board
        if (
          s.status === 'REQUESTED' ||
          s.status === 'REJECTED' ||
          s.status === 'COMPLETED' ||
          s.status === 'CANCELLED'
        ) {
          return false;
        }

        // Filter by room
        if (filterRoom !== 'ALL') {
          const rId = s.roomId?._id || s.roomId;
          if (rId !== filterRoom) return false;
        }

        // Filter by status
        if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;

        // Filter by date if specified
        if (filterDate && s.scheduledStart) {
          const sDate = new Date(s.scheduledStart).toISOString().split('T')[0];
          if (sDate !== filterDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
        if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
        const aDate = new Date(a.scheduledStart || 0).getTime();
        const bDate = new Date(b.scheduledStart || 0).getTime();
        return aDate - bDate;
      });
  }, [sessions, filterRoom, filterStatus, filterDate]);

  // Pending Doctor Requests
  const pendingRequests = useMemo(() => {
    return sessions.filter((s) => s.status === 'REQUESTED');
  }, [sessions]);

  // Notify parent of pending requests count
  useEffect(() => {
    if (onPendingRequestsCountChange) {
      onPendingRequestsCountChange(pendingRequests.length);
    }
  }, [pendingRequests.length, onPendingRequestsCountChange]);

  // Overlap Conflict Check in modal
  const conflictWarning = useMemo(() => {
    if (!allocRoomId || !allocDate || !allocStartTime || !allocEndTime) return null;
    const startCandidate = new Date(`${allocDate}T${allocStartTime}:00`);
    const endCandidate = new Date(`${allocDate}T${allocEndTime}:00`);

    if (isNaN(startCandidate.getTime()) || isNaN(endCandidate.getTime()) || endCandidate <= startCandidate) {
      return null;
    }

    const overlap = sessions.find((s) => {
      if (s.status !== 'SCHEDULED' && s.status !== 'IN_PROGRESS') return false;
      if (schedulingSession && s._id === schedulingSession._id) return false;
      const rId = s.roomId?._id || s.roomId;
      if (rId !== allocRoomId) return false;

      const sStart = new Date(s.scheduledStart);
      const sEnd = new Date(s.scheduledEnd);
      return sStart < endCandidate && sEnd > startCandidate;
    });

    if (overlap) {
      const roomObj = otRooms.find((r) => r._id === allocRoomId);
      const sTime = new Date(overlap.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const eTime = new Date(overlap.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Warning: ${roomObj?.roomName || 'This room'} is already booked for "${overlap.procedureName}" from ${sTime} to ${eTime}.`;
    }
    return null;
  }, [allocRoomId, allocDate, allocStartTime, allocEndTime, sessions, schedulingSession, otRooms]);

  // ── Handlers ────────────────────────────────────────────────

  // Start Surgery
  const handleStartSurgery = async (session) => {
    try {
      await ipdApi.updateOtSessionStatus(session._id, 'IN_PROGRESS');
      showSuccess('Surgery Commenced', `Session for "${session.procedureName}" is now active in operating theatre.`);
      loadData();
    } catch (err) {
      showError('Action Failed', err.response?.data?.message || 'Failed to start surgery');
    }
  };

  // Advance Surgical Milestone Lifecycle
  const handleAdvanceMilestone = async (session, nextMilestone, notes = '') => {
    try {
      await ipdApi.updateOtMilestone(session._id, nextMilestone, notes);
      showSuccess('Milestone Advanced', `Surgery "${session.procedureName}" status updated to ${nextMilestone}.`);
      loadData();
    } catch (err) {
      showError('Milestone Update Failed', err.response?.data?.message || 'Failed to advance surgical milestone');
    }
  };

  // Open Schedule / Allocate Modal
  const handleOpenScheduleModal = (session) => {
    setSchedulingSession(session);
    const dateStr = session.targetDate
      ? new Date(session.targetDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setAllocDate(dateStr);
    setAllocStartTime('09:00');
    setAllocEndTime('11:00');
    setAllocRoomId(otRooms[0]?._id || '');
    const defaultSurgeonId =
      session.suggestedSurgeonId?._id ||
      session.suggestedSurgeonId ||
      session.leadSurgeonId?._id ||
      session.leadSurgeonId ||
      user?.staffId ||
      surgeons[0]?._id ||
      '';
    setAllocLeadSurgeonId(defaultSurgeonId);
    setAllocAnesthetistId('');
    setAllocScrubNurseId('');
    setAllocCirculatingNurseId('');
  };

  // Submit Schedule / Allocation
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!allocRoomId) {
      showError('Room Required', 'Please assign an Operating Theatre (OT) room.');
      return;
    }
    const scheduledStart = new Date(`${allocDate}T${allocStartTime}:00`);
    const scheduledEnd = new Date(`${allocDate}T${allocEndTime}:00`);

    if (scheduledEnd <= scheduledStart) {
      showError('Invalid Times', 'Scheduled end time must be after the start time.');
      return;
    }

    try {
      setSubmittingSchedule(true);
      const payload = {
        roomId: allocRoomId,
        scheduledStart,
        scheduledEnd,
        leadSurgeonId: allocLeadSurgeonId || undefined,
        anesthetistId: allocAnesthetistId || undefined,
        scrubNurseId: allocScrubNurseId || undefined,
        circulatingNurseId: allocCirculatingNurseId || undefined,
      };

      await ipdApi.approveAndScheduleOtSession(schedulingSession._id, payload);
      showSuccess('Surgery Scheduled', `OT Room and surgical team assigned for "${schedulingSession.procedureName}".`);
      setSubmittingSchedule(false);
      setSchedulingSession(null);
      loadData();
    } catch (err) {
      setSubmittingSchedule(false);
      showError('Scheduling Error', err.response?.data?.message || 'Failed to allocate room and schedule session');
    }
  };

  // Open Decline Modal
  const handleOpenDecline = (session) => {
    setDeclineSession(session);
    setDeclineReason('');
  };

  // Confirm Decline
  const handleConfirmDecline = async () => {
    try {
      await ipdApi.rejectOtRequest(declineSession._id, declineReason || 'Declined by surgical department');
      showSuccess('Request Declined', 'The doctor surgery request has been updated.');
      setDeclineSession(null);
      loadData();
    } catch (err) {
      showError('Decline Failed', err.response?.data?.message || 'Failed to decline request');
    }
  };

  // Open Pre-Op Checklist
  const handleOpenChecklist = (session) => {
    setChecklistSession(session);
    const existing = session.preOpChecklist || {};
    setChecklistData({
      consentSigned: Boolean(existing.consentSigned),
      npoConfirmed: Boolean(existing.npoConfirmed),
      siteMarked: Boolean(existing.siteMarked),
      allergiesReviewed: Boolean(existing.allergiesReviewed),
      bloodCrossmatched: Boolean(existing.bloodCrossmatched),
      anesthesiaClearance: Boolean(existing.anesthesiaClearance),
      preOpNotes: existing.preOpNotes || '',
    });
  };

  // Save Pre-Op Checklist
  const handleSaveChecklist = async (e) => {
    e.preventDefault();
    try {
      setSavingChecklist(true);
      await ipdApi.updateOtChecklist(checklistSession._id, checklistData);
      showSuccess('Checklist Saved', 'Advisory pre-operative safety checklist updated successfully.');
      setSavingChecklist(false);
      setChecklistSession(null);
      loadData();
    } catch (err) {
      setSavingChecklist(false);
      showError('Update Failed', err.response?.data?.message || 'Failed to update checklist');
    }
  };

  // Mark All Checklist items
  const handleMarkAllChecklist = () => {
    setChecklistData((prev) => ({
      ...prev,
      consentSigned: true,
      npoConfirmed: true,
      siteMarked: true,
      allergiesReviewed: true,
      bloodCrossmatched: true,
      anesthesiaClearance: true,
    }));
  };

  // Open Complete & Post-Op Handoff Modal
  const handleOpenHandoff = async (session) => {
    setHandoffSession(session);
    setHandoffData({
      operativeNotes: session.operativeNotes || '',
      postOpNotes: '',
      outcome: 'SUCCESSFUL',
      postOpDestination: 'POST_OP_RECOVERY',
      postOpBedId: '',
    });
    // Load logged consumables for this session
    try {
      const res = await ipdApi.getConsumables(session._id);
      setSessionConsumables(res.data?.data || []);
    } catch {
      setSessionConsumables([]);
    }
  };

  // Save Complete & Post-Op Handoff
  const handleSaveHandoff = async (e) => {
    e.preventDefault();
    try {
      setCompletingHandoff(true);
      await ipdApi.completeOtWithHandoff(handoffSession._id, handoffData);
      showSuccess(
        'Surgery Completed',
        `Post-op hand-off recorded, surgical history archived, and ${sessionConsumables.length} consumable items pushed to IPD bill.`
      );
      setCompletingHandoff(false);
      setHandoffSession(null);
      loadData();
    } catch (err) {
      setCompletingHandoff(false);
      showError('Completion Failed', err.response?.data?.message || 'Failed to complete surgery and execute hand-off');
    }
  };

  // Open Consumable Modal
  const handleOpenConsumable = (session) => {
    setConsumableSession(session);
    setConsumableForm({
      itemName: '',
      quantity: 1,
      unitCost: 0,
      batchNumber: '',
      notes: '',
    });
  };

  // Save Consumable
  const handleSaveConsumable = async (e) => {
    e.preventDefault();
    if (!consumableForm.itemName.trim()) {
      showError('Item Required', 'Please provide a consumable or implant name.');
      return;
    }
    const qty = Number(consumableForm.quantity) || 1;
    const price = Number(consumableForm.unitCost) || 0;
    try {
      setSavingConsumable(true);
      await ipdApi.logConsumable(consumableSession._id, {
        itemName: consumableForm.itemName.trim(),
        quantity: qty,
        unitPrice: price,
        unitCost: price,
        totalPrice: qty * price,
        batchNumber: (consumableForm.batchNumber || '').trim(),
        notes: (consumableForm.notes || '').trim(),
      });
      showSuccess('Consumable Logged', `Logged "${consumableForm.itemName.trim()}" for surgical session.`);
      setSavingConsumable(false);
      setConsumableSession(null);
      setConsumableForm({ itemName: '', quantity: 1, unitCost: 0, batchNumber: '', notes: '' });
      loadData();
    } catch (err) {
      setSavingConsumable(false);
      showError('Logging Failed', err.response?.data?.message || 'Failed to log consumable');
    }
  };

  return (
    <div className={`ot-board-container ${embedded ? 'ot-board-container--embedded' : ''}`}>
      {/* ── 1. Compact Telemetry Ribbon ── */}
      {!embedded && !hideHero && (
        <div className="ot-compact-ribbon" role="region" aria-label="Surgical Suite Telemetry">
          <div className="ot-ribbon-metrics">
            {/* Metric 1: Today's Theatres */}
            <button
              type="button"
              className="ot-ribbon-chip"
              onClick={() => {
                handleTabSelect('LIVE_BOARD');
                setFilterDate(new Date().toISOString().split('T')[0]);
                setFilterStatus('ALL');
                setFilterRoom('ALL');
              }}
              title="Filter by Today's Theatres"
            >
              <div className="ot-ribbon-chip-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                <span className="material-symbols-rounded">calendar_today</span>
              </div>
              <div className="ot-ribbon-chip-text">
                <span className="ot-ribbon-chip-val">{kpis.totalToday}</span>
                <span className="ot-ribbon-chip-label">Today's Theatres</span>
              </div>
            </button>

            {/* Metric 2: Active In Progress */}
            <button
              type="button"
              className={`ot-ribbon-chip ${kpis.inProgress > 0 ? 'ot-ribbon-chip--active-pulse' : ''}`}
              onClick={() => {
                handleTabSelect('LIVE_BOARD');
                setFilterStatus('IN_PROGRESS');
                setFilterDate('');
                setFilterRoom('ALL');
              }}
              title="Filter by Active Surgeries in Progress"
            >
              <div className="ot-ribbon-chip-icon" style={{ background: '#e6f4ea', color: '#137333' }}>
                <span className="material-symbols-rounded">play_arrow</span>
              </div>
              <div className="ot-ribbon-chip-text">
                <span className="ot-ribbon-chip-val" style={{ color: '#137333' }}>
                  {kpis.inProgress}
                </span>
                <span className="ot-ribbon-chip-label">In Progress</span>
              </div>
              {kpis.inProgress > 0 && <span className="ot-ribbon-live-dot" />}
            </button>

            {/* Metric 3: Scheduled */}
            <button
              type="button"
              className="ot-ribbon-chip"
              onClick={() => {
                handleTabSelect('LIVE_BOARD');
                setFilterStatus('SCHEDULED');
                setFilterDate('');
                setFilterRoom('ALL');
              }}
              title="Filter by Scheduled Surgeries"
            >
              <div className="ot-ribbon-chip-icon" style={{ background: '#cce8e7', color: '#006a6a' }}>
                <span className="material-symbols-rounded">schedule</span>
              </div>
              <div className="ot-ribbon-chip-text">
                <span className="ot-ribbon-chip-val">{kpis.scheduled}</span>
                <span className="ot-ribbon-chip-label">Scheduled</span>
              </div>
            </button>

            {/* Metric 4: Doctor Requests */}
            <button
              type="button"
              className={`ot-ribbon-chip ${kpis.requested > 0 ? 'ot-ribbon-chip--alert' : ''}`}
              onClick={() => handleTabSelect('REQUESTS')}
              title="View Doctor Surgery Requests"
            >
              <div className="ot-ribbon-chip-icon" style={{ background: '#ffdad6', color: '#ba1a1a' }}>
                <span className="material-symbols-rounded">notification_important</span>
              </div>
              <div className="ot-ribbon-chip-text">
                <span className="ot-ribbon-chip-val" style={{ color: kpis.requested > 0 ? '#ba1a1a' : 'inherit' }}>
                  {kpis.requested}
                </span>
                <span className="ot-ribbon-chip-label">Doctor Requests</span>
              </div>
              {kpis.requested > 0 && (
                <span className="ot-ribbon-chip-badge">{kpis.requested}</span>
              )}
            </button>

            {/* Metric 5: Completed Today (Navigates to Surgical History) */}
            <button
              type="button"
              className="ot-ribbon-chip"
              onClick={() => handleTabSelect('HISTORY')}
              title="View Completed Surgeries in Surgical History"
            >
              <div className="ot-ribbon-chip-icon" style={{ background: '#f3e8fd', color: '#7c3aed' }}>
                <span className="material-symbols-rounded">check_circle</span>
              </div>
              <div className="ot-ribbon-chip-text">
                <span className="ot-ribbon-chip-val" style={{ color: '#7c3aed' }}>
                  {kpis.completedToday}
                </span>
                <span className="ot-ribbon-chip-label">Completed Today</span>
              </div>
            </button>
          </div>

          <div className="ot-ribbon-actions">
            <button
              type="button"
              className="ot-ribbon-refresh-btn"
              onClick={loadData}
              disabled={loading}
              title="Refresh Operating Theatre Sessions"
            >
              <span className={`material-symbols-rounded ${loading ? 'ot-spin' : ''}`} style={{ fontSize: '18px' }}>
                refresh
              </span>
              <span className="ot-ribbon-refresh-label">Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Tab Navigation & Controls ── */}
      {(!hasTopNav || activeTab === 'LIVE_BOARD') && (
        <div className="ot-controls-bar">
          {!hasTopNav && (
            <div className="ot-nav-tabs">
              <button
                type="button"
                className={`ot-nav-tab-btn ${activeTab === 'LIVE_BOARD' ? 'ot-nav-tab-btn--active' : ''}`}
                onClick={() => handleTabSelect('LIVE_BOARD')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  table_chart
                </span>
                <span>Live OT Board</span>
              </button>

              <button
                type="button"
                className={`ot-nav-tab-btn ${activeTab === 'REQUESTS' ? 'ot-nav-tab-btn--active' : ''}`}
                onClick={() => handleTabSelect('REQUESTS')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  pending_actions
                </span>
                <span>Surgery Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="ot-nav-tab-badge">{pendingRequests.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`ot-nav-tab-btn ${activeTab === 'HISTORY' ? 'ot-nav-tab-btn--active' : ''}`}
                onClick={() => handleTabSelect('HISTORY')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  history
                </span>
                <span>Surgical History</span>
              </button>
            </div>
          )}

          {activeTab === 'LIVE_BOARD' && (
            <div className="ot-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Quick Date Chips */}
              <div style={{ display: 'inline-flex', gap: '4px', background: 'var(--md-sys-color-surface-container-high, #e5f0eb)', padding: '3px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: filterDate === '' ? 'var(--md-sys-color-primary, #006a6a)' : 'transparent',
                    color: filterDate === '' ? '#ffffff' : 'var(--md-sys-color-on-surface-variant, #49454f)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: filterDate === new Date().toISOString().split('T')[0] ? 'var(--md-sys-color-primary, #006a6a)' : 'transparent',
                    color: filterDate === new Date().toISOString().split('T')[0] ? '#ffffff' : 'var(--md-sys-color-on-surface-variant, #49454f)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Today
                </button>
              </div>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter by specific date"
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                }}
              />

              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                }}
              >
                <option value="ALL">All OT Rooms</option>
                {otRooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.roomName || `Room ${r.roomNumber}`}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                }}
              >
                <option value="ALL">All Live Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">Active in Surgery</option>
                <option value="POST_OP_PACU">PACU Recovery</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Tab 1: Live OT Board ── */}
      {activeTab === 'LIVE_BOARD' && (
        <>
          {displayedSessions.length === 0 ? (
            sessions.filter((s) => s.status !== 'REQUESTED' && s.status !== 'REJECTED').length > 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--md-sys-color-surface, #ffffff)',
                  borderRadius: '16px',
                  border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)',
                  margin: '16px 0',
                }}
              >
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: '40px', color: 'var(--md-sys-color-primary, #006a6a)', marginBottom: '8px' }}
                >
                  tune
                </span>
                <h3 style={{ margin: '4px 0 8px', fontSize: '1.05rem', color: '#191c1b', fontWeight: 700 }}>
                  No Surgeries Match Active Filter
                </h3>
                <p style={{ margin: '0 auto 16px', maxWidth: '460px', fontSize: '0.84rem', color: '#49454f' }}>
                  There are {sessions.filter((s) => s.status !== 'REQUESTED' && s.status !== 'REJECTED').length} active or scheduled surgical sessions in the system on other dates or rooms.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Md3Button
                    variant="filled"
                    onClick={() => {
                      setFilterDate('');
                      setFilterRoom('ALL');
                      setFilterStatus('ALL');
                    }}
                  >
                    <span className="material-symbols-rounded">event_available</span>
                    <span>Show All Scheduled Surgeries</span>
                  </Md3Button>
                  <Md3Button
                    variant="tonal"
                    onClick={() => {
                      setFilterDate(new Date().toISOString().split('T')[0]);
                      setFilterRoom('ALL');
                      setFilterStatus('ALL');
                    }}
                  >
                    <span className="material-symbols-rounded">today</span>
                    <span>Reset to Today</span>
                  </Md3Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                <ClinicalStationIdleDeck
                  preset="SURGEON_OT"
                  onAction={(key) => {
                    if (key === 'REQUESTS_TAB') setActiveTab('REQUESTS');
                  }}
                />
              </div>
            )
          ) : (
            <div className="ot-cards-grid">
              {displayedSessions.map((session) => {
                const isUrgent = session.urgency === 'URGENT';
                const isEmergency = session.urgency === 'EMERGENCY_STAT' || session.surgeryType === 'EMERGENCY';
                const isInProgress = session.status === 'IN_PROGRESS';
                const isCompleted = session.status === 'COMPLETED';

                // Checklist calculation
                const ch = session.preOpChecklist || {};
                const checkCount = [
                  ch.consentSigned,
                  ch.npoConfirmed,
                  ch.siteMarked,
                  ch.allergiesReviewed,
                  ch.bloodCrossmatched,
                  ch.anesthesiaClearance,
                ].filter(Boolean).length;

                const patientName = formatPatientName(session.patientId);
                const leadSurgeonName = formatDoctorName(
                  session.leadSurgeonId?.fullName ||
                    `${session.leadSurgeonId?.firstName || ''} ${session.leadSurgeonId?.lastName || ''}`.trim() ||
                    'Lead Surgeon'
                );
                const anesthetistName = session.anesthetistId
                  ? formatDoctorName(
                      session.anesthetistId.fullName ||
                        `${session.anesthetistId.firstName || ''} ${session.anesthetistId.lastName || ''}`.trim()
                    )
                  : 'Unassigned';
                const scrubNurseName = session.scrubNurseId
                  ? `${session.scrubNurseId.firstName || ''} ${session.scrubNurseId.lastName || ''}`.trim() ||
                    session.scrubNurseId.fullName ||
                    'Unassigned'
                  : 'Unassigned';

                const sTime = session.scheduledStart
                  ? new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—';
                const eTime = session.scheduledEnd
                  ? new Date(session.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—';

                return (
                  <div
                    key={session._id}
                    className={`ot-session-card ${isInProgress ? 'ot-session-card--inprogress' : ''}`}
                  >
                    {/* Header: Room & Status Badges */}
                    <div className="ot-session-header">
                      <span className="ot-room-badge">
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          meeting_room
                        </span>
                        <span>{session.roomId?.roomName || `Room ${session.roomId?.roomNumber || 'OT'}`}</span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {session.procedureCategory === 'EMERGENCY_TRAUMA' && (
                          <span className="ot-tag-stat-trauma">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '2px' }}>emergency</span>
                            <span>STAT TRAUMA</span>
                          </span>
                        )}
                        {session.procedureCategory === 'EMERGENCY_MATERNITY_CSECTION' && (
                          <span className="ot-tag-stat-maternity">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '2px' }}>child_care</span>
                            <span>MATERNITY C-SECTION</span>
                          </span>
                        )}
                        {session.procedureCategory === 'EMERGENCY_ACUTE' && (
                          <span className="ot-tag-stat-acute">
                            <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '2px' }}>bolt</span>
                            <span>ACUTE SURGERY</span>
                          </span>
                        )}
                        {isEmergency && !['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(session.procedureCategory) && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#ffdad6',
                              color: '#ba1a1a',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                            }}
                          >
                            <span className="ot-emergency-dot" />
                            <span>EMERGENCY</span>
                          </span>
                        )}
                        {isUrgent && !isEmergency && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#ffddb3',
                              color: '#825500',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                            }}
                          >
                            URGENT
                          </span>
                        )}
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background:
                              session.status === 'IN_PROGRESS'
                                ? '#ffdad6'
                                : session.status === 'COMPLETED'
                                ? '#c4eed0'
                                : session.status === 'POST_OP_PACU'
                                ? '#e0f2f1'
                                : '#e8f0fe',
                            color:
                              session.status === 'IN_PROGRESS'
                                ? '#ba1a1a'
                                : session.status === 'COMPLETED'
                                ? '#146c2e'
                                : session.status === 'POST_OP_PACU'
                                ? '#006a6a'
                                : '#1a73e8',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          {session.status}
                        </span>
                      </div>
                    </div>

                    {/* Procedure Title with Marquee */}
                    <div style={{ margin: '8px 0 6px', overflow: 'hidden' }}>
                      <Md3MarqueeText text={session.procedureName || 'Surgical Procedure'} speed={28} />
                    </div>

                    {/* Patient Meta Box */}
                    <div className="ot-patient-meta-box">
                      <div className="ot-patient-name-row">
                        <span className="ot-patient-name">{patientName}</span>
                        <span className="ot-patient-mrn">MRN: {session.patientId?.mrn || '—'}</span>
                      </div>
                      <div style={{ color: 'var(--md-sys-color-on-surface-variant, #49454f)', fontSize: '0.76rem' }}>
                        <span>Time: <strong>{sTime} – {eTime}</strong></span>
                        {session.anesthesiaType && (
                          <span> • Anesthesia: {session.anesthesiaType}</span>
                        )}
                      </div>
                    </div>

                    {/* Surgical Team */}
                    <div className="ot-team-grid">
                      <div className="ot-team-member">
                        <span className="ot-team-role">Lead Surgeon</span>
                        <span className="ot-team-name">{leadSurgeonName}</span>
                      </div>
                      <div className="ot-team-member">
                        <span className="ot-team-role">Anesthetist</span>
                        <span className="ot-team-name">{anesthetistName}</span>
                      </div>
                      <div className="ot-team-member">
                        <span className="ot-team-role">Scrub Nurse</span>
                        <span className="ot-team-name">{scrubNurseName}</span>
                      </div>
                      <div className="ot-team-member">
                        <span className="ot-team-role">Pre-Op Safety</span>
                        <span
                          onClick={() => handleOpenChecklist(session)}
                          style={{
                            cursor: 'pointer',
                            color: checkCount === 6 ? '#137333' : '#b06000',
                            fontWeight: 700,
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                            {checkCount === 6 ? 'verified' : 'pending_actions'}
                          </span>
                          <span>{checkCount}/6 Verified</span>
                        </span>
                      </div>
                    </div>

                    {/* Completed Notes Banner */}
                    {isCompleted && (
                      <div
                        style={{
                          background: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '0.76rem',
                          marginBottom: '10px',
                        }}
                      >
                        <div>
                          <strong>Outcome:</strong> {session.outcome || 'SUCCESSFUL'} • Duration: {session.actualDurationMinutes || '—'} min
                        </div>
                        {session.postOpDestination && (
                          <div style={{ marginTop: '2px', color: '#495057' }}>
                            Transferred to: <strong>{session.postOpDestination}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Actions & Granular Milestones */}
                    <div className="ot-card-actions">
                      {session.status === 'SCHEDULED' && (
                        <Md3Button
                          variant="filled"
                          onClick={() => handleAdvanceMilestone(session, 'IN_OT', 'Patient wheeled into Operating Theatre Pre-Induction bay')}
                          style={{ background: '#0062a0', color: '#ffffff' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            meeting_room
                          </span>
                          <span>Bring to OT</span>
                        </Md3Button>
                      )}

                      {session.status === 'IN_OT' && (
                        <Md3Button
                          variant="filled"
                          onClick={() => handleAdvanceMilestone(session, 'WAITING_FOR_SURGEON', 'Patient prepped; awaiting surgical team')}
                          style={{ background: '#825500', color: '#ffffff' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            hourglass_top
                          </span>
                          <span>Ready for Surgeon</span>
                        </Md3Button>
                      )}

                      {session.status === 'WAITING_FOR_SURGEON' && (
                        <Md3Button
                          variant="filled"
                          onClick={() => handleAdvanceMilestone(session, 'ANESTHESIA_ADMINISTERED', 'Anesthetic induction completed; vitals stable')}
                          style={{ background: '#7a5900', color: '#ffffff' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            vaccines
                          </span>
                          <span>Administer Anesthesia</span>
                        </Md3Button>
                      )}

                      {session.status === 'ANESTHESIA_ADMINISTERED' && (
                        <Md3Button
                          variant="filled"
                          onClick={() => handleStartSurgery(session)}
                          style={{ background: '#ba1a1a', color: '#ffffff' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            medical_services
                          </span>
                          <span>Start Incision</span>
                        </Md3Button>
                      )}

                      {isInProgress && (
                        <>
                          <Md3Button
                            variant="tonal"
                            onClick={() => handleAdvanceMilestone(session, 'POST_OP_PACU', 'Surgery concluded; patient transferred to PACU')}
                            style={{ background: '#cce8e7', color: '#006a6a' }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                              healing
                            </span>
                            <span>To PACU</span>
                          </Md3Button>

                          <Md3Button
                            variant="filled"
                            onClick={() => handleOpenHandoff(session)}
                            style={{ background: '#006a6a', color: '#ffffff' }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                              task_alt
                            </span>
                            <span>Complete &amp; Hand-off</span>
                          </Md3Button>
                        </>
                      )}

                      {session.status === 'POST_OP_PACU' && (
                        <Md3Button
                          variant="filled"
                          onClick={() => handleOpenHandoff(session)}
                          style={{ background: '#146c2e', color: '#ffffff' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            check_circle
                          </span>
                          <span>Finalize Recovery</span>
                        </Md3Button>
                      )}

                      <Md3Button variant="tonal" onClick={() => handleOpenChecklist(session)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          fact_check
                        </span>
                        <span>Safety Checklist</span>
                      </Md3Button>

                      <Md3Button variant="tonal" onClick={() => handleOpenConsumable(session)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          inventory_2
                        </span>
                        <span>Consumables</span>
                      </Md3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 4. Tab 2: Doctor Surgery Requests Ledger ── */}
      {activeTab === 'REQUESTS' && (
        <>
          {pendingRequests.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 16px',
                background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
                borderRadius: '16px',
                border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)',
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: '48px', color: '#006a6a', opacity: 0.6 }}
              >
                verified
              </span>
              <h3 style={{ margin: '12px 0 4px 0', fontSize: '1.05rem', fontWeight: 700 }}>
                All doctor requests processed
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                There are no pending doctor surgery requests awaiting OT allocation.
              </p>
            </div>
          ) : (
            <div className="ot-cards-grid">
              {pendingRequests.map((req) => {
                const patientName = formatPatientName(req.patientId);
                const requestingDoctor = formatDoctorName(
                  req.requestedBy?.fullName ||
                    `${req.requestedBy?.firstName || ''} ${req.requestedBy?.lastName || ''}`.trim() ||
                    'Attending Doctor'
                );
                const isEmergency = req.urgency === 'EMERGENCY_STAT' || req.surgeryType === 'EMERGENCY';

                return (
                  <div
                    key={req._id}
                    className="ot-session-card"
                    style={{ borderLeft: isEmergency ? '4px solid #ba1a1a' : '4px solid #006a6a' }}
                  >
                    <div className="ot-session-header">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: '#e0e4e8',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                          schedule
                        </span>
                        <span>Requested on {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                      </span>

                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isEmergency ? '#ffdad6' : '#cce8e7',
                          color: isEmergency ? '#ba1a1a' : '#006a6a',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                        }}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <h3 className="ot-procedure-title">{req.procedureName}</h3>

                    <div className="ot-patient-meta-box">
                      <div className="ot-patient-name-row">
                        <span className="ot-patient-name">{patientName}</span>
                        <span className="ot-patient-mrn">MRN: {req.patientId?.mrn || '—'}</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                        Requested by: <strong>{requestingDoctor}</strong>
                      </div>
                      {req.targetDate && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                          Target Date: <strong>{new Date(req.targetDate).toLocaleDateString('en-IN')}</strong>
                        </div>
                      )}
                    </div>

                    {req.requestNotes && (
                      <div
                        style={{
                          padding: '8px 10px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          marginBottom: '12px',
                          fontStyle: 'italic',
                          color: '#495057',
                        }}
                      >
                        "{req.requestNotes}"
                      </div>
                    )}

                    <div className="ot-card-actions">
                      <Md3Button
                        variant="filled"
                        onClick={() => handleOpenScheduleModal(req)}
                        style={{ background: '#006a6a', color: '#ffffff' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          how_to_reg
                        </span>
                        <span>Approve &amp; Allocate OT</span>
                      </Md3Button>

                      <Md3Button variant="tonal" onClick={() => handleOpenDecline(req)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          close
                        </span>
                        <span>Decline</span>
                      </Md3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 5. Tab 3: Surgical History & Case Management ── */}
      {activeTab === 'HISTORY' && (
        <SurgicalHistoryManager
          sessions={sessions}
          otRooms={otRooms}
          onOpenConsumables={handleOpenConsumable}
          onRefresh={loadData}
        />
      )}

      {/* ── MODAL 1: Approve & Allocate OT Room ── */}
      <Md3BottomSheet
        isOpen={Boolean(schedulingSession)}
        onClose={() => setSchedulingSession(null)}
        title="Approve Surgery &amp; Allocate Operating Theatre"
        subtitle={schedulingSession ? `Procedure: ${schedulingSession.procedureName} • Patient: ${formatPatientName(schedulingSession.patientId)}` : ''}
      >
        {schedulingSession && (
          <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Conflict Warning Alert */}
            {conflictWarning && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#ffdad6',
                  color: '#ba1a1a',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid #ffb4ab',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                  warning
                </span>
                <span>{conflictWarning}</span>
              </div>
            )}

            {/* Room Picker */}
            <Md3Select
              label="Operating Theatre Room *"
              value={allocRoomId}
              onChange={(e) => setAllocRoomId(e.target.value)}
              required
            >
              <option value="">Select an OT Room...</option>
              {otRooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roomName || `Room ${r.roomNumber}`} ({r.roomType || 'OT'})
                </option>
              ))}
            </Md3Select>

            {/* Date & Time Slot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Md3TextField
                label="Date *"
                type="date"
                value={allocDate}
                onChange={(e) => setAllocDate(e.target.value)}
                required
              />
              <Md3TextField
                label="Start Time *"
                type="time"
                value={allocStartTime}
                onChange={(e) => setAllocStartTime(e.target.value)}
                required
              />
              <Md3TextField
                label="End Time *"
                type="time"
                value={allocEndTime}
                onChange={(e) => setAllocEndTime(e.target.value)}
                required
              />
            </div>

            {/* Surgical Team Allocation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Md3Select
                label="Lead Surgeon *"
                value={allocLeadSurgeonId}
                onChange={(e) => setAllocLeadSurgeonId(e.target.value)}
                required
              >
                <option value="">Select Lead Surgeon...</option>
                {surgeons.map((s) => {
                  const roleTitle = s.roleId?.name || s.role || s.position || 'Surgeon';
                  return (
                    <option key={s._id} value={s._id}>
                      {formatDoctorName(s.fullName || `${s.firstName} ${s.lastName}`)} ({roleTitle})
                    </option>
                  );
                })}
              </Md3Select>

              <Md3Select
                label="Anesthetist"
                value={allocAnesthetistId}
                onChange={(e) => setAllocAnesthetistId(e.target.value)}
              >
                <option value="">Select Anesthetist...</option>
                {surgeons.map((s) => {
                  const roleTitle = s.roleId?.name || s.role || s.position || 'Specialist';
                  return (
                    <option key={s._id} value={s._id}>
                      {formatDoctorName(s.fullName || `${s.firstName} ${s.lastName}`)} ({roleTitle})
                    </option>
                  );
                })}
              </Md3Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Md3Select
                label="Scrub Nurse"
                value={allocScrubNurseId}
                onChange={(e) => setAllocScrubNurseId(e.target.value)}
              >
                <option value="">Select Scrub Nurse...</option>
                {nurses.map((n) => {
                  const roleTitle = n.roleId?.name || n.role || n.position || 'Nurse';
                  return (
                    <option key={n._id} value={n._id}>
                      {n.fullName || `${n.firstName} ${n.lastName}`} ({roleTitle})
                    </option>
                  );
                })}
              </Md3Select>

              <Md3Select
                label="Circulating Nurse"
                value={allocCirculatingNurseId}
                onChange={(e) => setAllocCirculatingNurseId(e.target.value)}
              >
                <option value="">Select Circulating Nurse...</option>
                {nurses.map((n) => {
                  const roleTitle = n.roleId?.name || n.role || n.position || 'Nurse';
                  return (
                    <option key={n._id} value={n._id}>
                      {n.fullName || `${n.firstName} ${n.lastName}`} ({roleTitle})
                    </option>
                  );
                })}
              </Md3Select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Md3Button variant="text" type="button" onClick={() => setSchedulingSession(null)}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="filled"
                type="submit"
                loading={submittingSchedule}
                style={{ background: '#006a6a', color: '#ffffff' }}
              >
                Approve &amp; Schedule OT
              </Md3Button>
            </div>
          </form>
        )}
      </Md3BottomSheet>

      {/* ── MODAL 2: Advisory Pre-Operative Checklist ── */}
      <Md3BottomSheet
        isOpen={Boolean(checklistSession)}
        onClose={() => setChecklistSession(null)}
        title="WHO Pre-Operative Safety Checklist"
        subtitle="Advisory clinical verification standard to ensure patient safety before incision."
      >
        {checklistSession && (
          <form onSubmit={handleSaveChecklist} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Advisory Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: '0.78rem',
                border: '1px solid #bae6fd',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                info
              </span>
              <span>
                <strong>Advisory Standard:</strong> Checklists guide clinical vigilance and are non-blocking for emergent surgeries.
              </span>
            </div>

            {/* Quick Mark All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleMarkAllChecklist}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--md-sys-color-primary, #006a6a)',
                  fontWeight: 700,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>done_all</span>
                <span>Mark All Verified</span>
              </button>
            </div>

            {/* Checklist Items */}
            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                1. Patient identity, procedure, and informed consent confirmed
              </span>
              <input
                type="checkbox"
                checked={checklistData.consentSigned}
                onChange={(e) => setChecklistData({ ...checklistData, consentSigned: e.target.checked })}
              />
            </label>

            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                2. NPO (fasting hours) verified and compliant
              </span>
              <input
                type="checkbox"
                checked={checklistData.npoConfirmed}
                onChange={(e) => setChecklistData({ ...checklistData, npoConfirmed: e.target.checked })}
              />
            </label>

            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                3. Surgical incision site marked by operating team
              </span>
              <input
                type="checkbox"
                checked={checklistData.siteMarked}
                onChange={(e) => setChecklistData({ ...checklistData, siteMarked: e.target.checked })}
              />
            </label>

            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                4. Known allergies and anaphylaxis risk reviewed
              </span>
              <input
                type="checkbox"
                checked={checklistData.allergiesReviewed}
                onChange={(e) => setChecklistData({ ...checklistData, allergiesReviewed: e.target.checked })}
              />
            </label>

            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                5. Blood products crossmatched and available in blood bank
              </span>
              <input
                type="checkbox"
                checked={checklistData.bloodCrossmatched}
                onChange={(e) => setChecklistData({ ...checklistData, bloodCrossmatched: e.target.checked })}
              />
            </label>

            <label className="ot-checklist-row">
              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                6. Anesthesia machine check &amp; medication clearance confirmed
              </span>
              <input
                type="checkbox"
                checked={checklistData.anesthesiaClearance}
                onChange={(e) => setChecklistData({ ...checklistData, anesthesiaClearance: e.target.checked })}
              />
            </label>

            <Md3TextArea
              label="Pre-Operative Clinical Notes"
              value={checklistData.preOpNotes}
              onChange={(e) => setChecklistData({ ...checklistData, preOpNotes: e.target.value })}
              placeholder="Record any baseline vitals, airway grade, or pre-medication notes..."
              rows={2}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Md3Button variant="text" type="button" onClick={() => setChecklistSession(null)}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="filled"
                type="submit"
                loading={savingChecklist}
                style={{ background: '#006a6a', color: '#ffffff' }}
              >
                Save Pre-Op Checklist
              </Md3Button>
            </div>
          </form>
        )}
      </Md3BottomSheet>

      {/* ── MODAL 3: Complete Surgery & Post-Op Hand-off ── */}
      <Md3BottomSheet
        isOpen={Boolean(handoffSession)}
        onClose={() => setHandoffSession(null)}
        title="Finalize Surgery &amp; Post-Op Hand-Off"
        subtitle={handoffSession ? `Procedure: ${handoffSession.procedureName} • Patient: ${formatPatientName(handoffSession.patientId)}` : ''}
      >
        {handoffSession && (
          <form onSubmit={handleSaveHandoff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Auto Billing Push Information Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#e6f4ea',
                color: '#137333',
                fontSize: '0.82rem',
                border: '1px solid #ceead6',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                receipt_long
              </span>
              <span>
                <strong>Automatic Billing Synchronization:</strong> Finalizing will push {sessionConsumables.length} surgical consumable(s) ({CURRENCY_SYMBOL}
                {sessionConsumables.reduce((s, c) => s + (c.totalCost || 0), 0)}) directly to the patient's Inpatient master bill.
              </span>
            </div>

            <Md3TextArea
              label="Operative Notes &amp; Surgical Technique *"
              value={handoffData.operativeNotes}
              onChange={(e) => setHandoffData({ ...handoffData, operativeNotes: e.target.value })}
              placeholder="Detailed surgical findings, incision, dissection, implants placed, blood loss, specimen sent to pathology..."
              rows={3}
              required
            />

            <Md3TextArea
              label="Post-Operative Instructions &amp; Nursing Orders *"
              value={handoffData.postOpNotes}
              onChange={(e) => setHandoffData({ ...handoffData, postOpNotes: e.target.value })}
              placeholder="Recovery vitals frequency, oxygen therapy, drains, IV fluids, pain management orders..."
              rows={2}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Md3Select
                label="Surgical Outcome *"
                value={handoffData.outcome}
                onChange={(e) => setHandoffData({ ...handoffData, outcome: e.target.value })}
              >
                <option value="SUCCESSFUL">Successful / Uncomplicated</option>
                <option value="GUARDED">Guarded / Close Monitoring</option>
                <option value="COMPLICATIONS">Intra-Operative Complications</option>
              </Md3Select>

              <Md3Select
                label="Post-Op Destination *"
                value={handoffData.postOpDestination}
                onChange={(e) => setHandoffData({ ...handoffData, postOpDestination: e.target.value, postOpBedId: '' })}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Md3Select>
            </div>

            {/* Destination Bed Allocation if transferring to ICU / HDU / Ward */}
            {['ICU', 'HDU', 'CCU', 'WARD'].includes(handoffData.postOpDestination) && (
              <Md3Select
                label={`Transfer to Vacant ${handoffData.postOpDestination} Bed`}
                value={handoffData.postOpBedId}
                onChange={(e) => setHandoffData({ ...handoffData, postOpBedId: e.target.value })}
              >
                <option value="">Keep current inpatient bed (no transfer)</option>
                {vacantBeds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bedLabel} ({b.bedNumber}) — {b.roomId?.roomName || `Room ${b.roomId?.roomNumber || ''}`} · {b.wardClass}
                  </option>
                ))}
              </Md3Select>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Md3Button variant="text" type="button" onClick={() => setHandoffSession(null)}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="filled"
                type="submit"
                loading={completingHandoff}
                style={{ background: '#006a6a', color: '#ffffff' }}
              >
                Finalize Surgery &amp; Execute Hand-off
              </Md3Button>
            </div>
          </form>
        )}
      </Md3BottomSheet>

      {/* ── MODAL 4: Log Surgical Consumables / Implants ── */}
      <Md3BottomSheet
        isOpen={Boolean(consumableSession)}
        onClose={() => setConsumableSession(null)}
        title="Log Operating Theatre Consumables &amp; Supplies"
        subtitle={consumableSession ? `Procedure: ${consumableSession.procedureName}` : ''}
      >
        {consumableSession && (
          <form onSubmit={handleSaveConsumable} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Md3TextField
              label="Item / Consumable Name *"
              value={consumableForm.itemName}
              onChange={(e) => setConsumableForm({ ...consumableForm, itemName: e.target.value })}
              placeholder="e.g. Polypropylene Mesh 15x15cm, Vicryl 2-0, Hemostatic Sponge"
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Md3TextField
                label="Quantity *"
                type="number"
                min="1"
                value={consumableForm.quantity}
                onChange={(e) => setConsumableForm({ ...consumableForm, quantity: e.target.value })}
                required
              />
              <Md3TextField
                label={`Unit Cost (${CURRENCY_SYMBOL}) *`}
                type="number"
                min="0"
                step="0.01"
                value={consumableForm.unitCost}
                onChange={(e) => setConsumableForm({ ...consumableForm, unitCost: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Md3TextField
                label="Batch / Lot Number"
                value={consumableForm.batchNumber}
                onChange={(e) => setConsumableForm({ ...consumableForm, batchNumber: e.target.value })}
                placeholder="e.g. LOT-2026-X99"
              />
              <Md3TextField
                label="Notes / Implantation Site"
                value={consumableForm.notes}
                onChange={(e) => setConsumableForm({ ...consumableForm, notes: e.target.value })}
                placeholder="e.g. Left inguinal region"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Md3Button variant="text" type="button" onClick={() => setConsumableSession(null)}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="filled"
                type="submit"
                loading={savingConsumable}
                style={{ background: '#006a6a', color: '#ffffff' }}
              >
                Log Consumable
              </Md3Button>
            </div>
          </form>
        )}
      </Md3BottomSheet>

      {/* ── MODAL 5: Decline Doctor Surgery Request ── */}
      <Md3ConfirmDialog
        isOpen={Boolean(declineSession)}
        onClose={() => setDeclineSession(null)}
        onConfirm={handleConfirmDecline}
        title="Decline Surgery Request?"
        message={`Are you sure you want to decline the surgery request for "${declineSession?.procedureName}"? Please provide an optional reason below.`}
        confirmLabel="Decline Request"
        cancelLabel="Cancel"
        variant="danger"
      >
        <div style={{ marginTop: '12px' }}>
          <Md3TextField
            label="Reason for Declining"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g. Requires prior cardiac optimization, patient scheduled for medical management"
          />
        </div>
      </Md3ConfirmDialog>
    </div>
  );
};

export default OTScheduleBoard;
