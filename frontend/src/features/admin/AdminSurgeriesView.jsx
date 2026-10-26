/**
 * features/admin/AdminSurgeriesView.jsx
 * Enterprise Material 3 Operating Theatre & Surgical Operations Command Deck for Hospital Administrators.
 * Provides live theatre suite occupancy, emergency procedures radar, staff in-charge matrix,
 * and integrated surgical scheduling management.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { staffAPI } from '../../services/staffAPI';
import { formatDoctorName, formatPatientName } from '../../utils/patientFormatters';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';
import OTScheduleBoard from '../ipd/OTScheduleBoard';
import './AdminSurgeriesView.css';

export const AdminSurgeriesView = () => {
  const [activeTab, setActiveTab] = useState('COMMAND_DECK'); // 'COMMAND_DECK' | 'EMERGENCY_RADAR' | 'STAFF_ROSTER' | 'FULL_BOARD'
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAdminSurgicalData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [sessionsRes, roomsRes, staffRes] = await Promise.allSettled([
        ipdApi.getOtSessions(),
        ipdApi.getRooms({ roomType: 'OT' }),
        staffAPI.list(1, 200),
      ]);

      if (sessionsRes.status === 'fulfilled') {
        setSessions(sessionsRes.value.data?.data || []);
      }
      if (roomsRes.status === 'fulfilled') {
        const allRooms = roomsRes.value.data?.data || [];
        const otRooms = allRooms.filter((r) => r.roomType === 'OT');
        setRooms(otRooms.length > 0 ? otRooms : allRooms);
      }
      if (staffRes.status === 'fulfilled') {
        const raw = staffRes.value?.data || staffRes.value;
        const list = raw?.items || raw?.data?.items || raw?.staff || (Array.isArray(raw) ? raw : []);
        setStaffList(Array.isArray(list) ? list : []);
      }
      if (!isSilent) setLoading(false);
    } catch (err) {
      if (!isSilent) setLoading(false);
      console.error('Failed to load admin surgical telemetry:', err);
    }
  }, []);

  useEffect(() => {
    loadAdminSurgicalData();
    const interval = setInterval(() => {
      loadAdminSurgicalData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadAdminSurgicalData]);

  // Executive KPIs
  const kpis = useMemo(() => {
    const totalToday = sessions.length;
    const activeIntraop = sessions.filter((s) =>
      ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)
    ).length;
    const emergencyCount = sessions.filter((s) =>
      ['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(s.procedureCategory) ||
      s.urgency === 'EMERGENCY_STAT' ||
      s.surgeryType === 'EMERGENCY'
    ).length;
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED').length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;

    // OT Suite Occupancy Rate
    const totalSuites = rooms.length || 1;
    const occupiedSuites = rooms.filter((r) => {
      return sessions.some(
        (s) =>
          (s.roomId?._id === r._id || s.roomId === r._id) &&
          ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)
      );
    }).length;
    const occupancyRate = Math.round((occupiedSuites / totalSuites) * 100);

    return { totalToday, activeIntraop, emergencyCount, scheduled, completed, occupiedSuites, totalSuites, occupancyRate };
  }, [sessions, rooms]);

  // Active Emergency Procedures
  const emergencySessions = useMemo(() => {
    return sessions.filter((s) => {
      const isEmerg =
        ['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(s.procedureCategory) ||
        s.urgency === 'EMERGENCY_STAT' ||
        s.surgeryType === 'EMERGENCY';
      return isEmerg && s.status !== 'CANCELLED' && s.status !== 'REJECTED';
    });
  }, [sessions]);

  // Staff In-Charge Roster & Roles
  const surgicalStaffRoster = useMemo(() => {
    // Map surgical personnel from sessions and staffList
    const doctors = staffList.filter((s) => {
      const role = s.roleId?.name || s.role || '';
      const pos = s.position || s.designation || '';
      return /Surgeon|Doctor/i.test(role) || /Surgeon|Doctor|Physician/i.test(pos);
    });

    return doctors.map((doc) => {
      const activeCases = sessions.filter(
        (s) =>
          (s.leadSurgeonId?._id === doc._id || s.leadSurgeonId === doc._id || s.suggestedSurgeonId?._id === doc._id) &&
          ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)
      );
      const scheduledCases = sessions.filter(
        (s) =>
          (s.leadSurgeonId?._id === doc._id || s.leadSurgeonId === doc._id || s.suggestedSurgeonId?._id === doc._id) &&
          s.status === 'SCHEDULED'
      );
      const completedCases = sessions.filter(
        (s) =>
          (s.leadSurgeonId?._id === doc._id || s.leadSurgeonId === doc._id || s.suggestedSurgeonId?._id === doc._id) &&
          s.status === 'COMPLETED'
      );

      return {
        ...doc,
        activeCount: activeCases.length,
        scheduledCount: scheduledCases.length,
        completedCount: completedCases.length,
        currentCase: activeCases[0] || null,
      };
    }).sort((a, b) => b.activeCount - a.activeCount || b.scheduledCount - a.scheduledCount);
  }, [staffList, sessions]);

  return (
    <div className="admin-surgeries-container">
      {/* ─── Executive Header Card ─── */}
      <div className="admin-surgeries-header">
        <div className="admin-surgeries-header__title-group">
          <div className="admin-surgeries-header__icon">
            <span className="material-symbols-rounded">medical_services</span>
          </div>
          <div>
            <h2 className="admin-surgeries-header__title">Surgical Operations Command Deck</h2>
          </div>
        </div>

        <div className="admin-surgeries-header__actions">
          <Md3Button
            variant="tonal"
            onClick={() => loadAdminSurgicalData(false)}
            loading={loading}
            disabled={loading}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>sync</span>
            <span>Sync Live Telemetry</span>
          </Md3Button>
        </div>
      </div>

      {/* ─── Executive Metric KPI Tiles ─── */}
      <div className="admin-surg-kpis">
        <div className="admin-surg-kpi">
          <div className="admin-surg-kpi__icon-box" style={{ background: '#eaddff', color: '#21005d' }}>
            <span className="material-symbols-rounded">meeting_room</span>
          </div>
          <div className="admin-surg-kpi__body">
            <span className="admin-surg-kpi__val">{kpis.occupiedSuites} / {kpis.totalSuites}</span>
            <span className="admin-surg-kpi__label">Theatres Occupied ({kpis.occupancyRate}%)</span>
          </div>
        </div>

        <div className="admin-surg-kpi">
          <div className="admin-surg-kpi__icon-box" style={{ background: '#ffdad6', color: '#ba1a1a' }}>
            <span className="material-symbols-rounded">vital_signs</span>
          </div>
          <div className="admin-surg-kpi__body">
            <span className="admin-surg-kpi__val" style={{ color: '#ba1a1a' }}>{kpis.activeIntraop}</span>
            <span className="admin-surg-kpi__label">Intra-Op Active Surgeries</span>
          </div>
        </div>

        <div className="admin-surg-kpi">
          <div className="admin-surg-kpi__icon-box" style={{ background: '#ffd8ec', color: '#8c005f' }}>
            <span className="material-symbols-rounded">e911_emergency</span>
          </div>
          <div className="admin-surg-kpi__body">
            <span className="admin-surg-kpi__val" style={{ color: '#8c005f' }}>{kpis.emergencyCount}</span>
            <span className="admin-surg-kpi__label">Emergency (Trauma / C-Section)</span>
          </div>
        </div>

        <div className="admin-surg-kpi">
          <div className="admin-surg-kpi__icon-box" style={{ background: '#cce8e7', color: '#006a6a' }}>
            <span className="material-symbols-rounded">calendar_month</span>
          </div>
          <div className="admin-surg-kpi__body">
            <span className="admin-surg-kpi__val">{kpis.scheduled}</span>
            <span className="admin-surg-kpi__label">Scheduled &amp; Queued</span>
          </div>
        </div>

        <div className="admin-surg-kpi">
          <div className="admin-surg-kpi__icon-box" style={{ background: '#c4eed0', color: '#146c2e' }}>
            <span className="material-symbols-rounded">verified</span>
          </div>
          <div className="admin-surg-kpi__body">
            <span className="admin-surg-kpi__val">{kpis.completed}</span>
            <span className="admin-surg-kpi__label">Completed Today</span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar ─── */}
      <div className="admin-surg-nav-tabs">
        <button
          className={`admin-surg-nav-tab ${activeTab === 'COMMAND_DECK' ? 'admin-surg-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('COMMAND_DECK')}
        >
          <span className="material-symbols-rounded">grid_view</span>
          <span>OT Suite Occupancy Matrix</span>
        </button>

        <button
          className={`admin-surg-nav-tab ${activeTab === 'EMERGENCY_RADAR' ? 'admin-surg-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('EMERGENCY_RADAR')}
        >
          <span className="material-symbols-rounded">e911_emergency</span>
          <span>Emergency Radar ({emergencySessions.length})</span>
        </button>

        <button
          className={`admin-surg-nav-tab ${activeTab === 'STAFF_ROSTER' ? 'admin-surg-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('STAFF_ROSTER')}
        >
          <span className="material-symbols-rounded">badge</span>
          <span>Surgeon &amp; Team In-Charge Roster</span>
        </button>

        <button
          className={`admin-surg-nav-tab ${activeTab === 'FULL_BOARD' ? 'admin-surg-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('FULL_BOARD')}
        >
          <span className="material-symbols-rounded">tune</span>
          <span>Scheduling &amp; Allocation Board</span>
        </button>
      </div>

      {/* ─── Tab Content 1: OT Suite Occupancy Matrix ─── */}
      {activeTab === 'COMMAND_DECK' && (
        <div className="admin-surg-deck">
          <div className="admin-surg-deck__header">
            <h3 className="admin-surg-deck__title">Operating Theatre Suite Real-Time Status</h3>
            <span className="admin-surg-deck__meta">Live monitoring across {rooms.length} surgical theatres</span>
          </div>

          <div className="admin-surg-suites-grid">
            {rooms.map((room) => {
              const activeSession = sessions.find(
                (s) =>
                  (s.roomId?._id === room._id || s.roomId === room._id) &&
                  ['IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'].includes(s.status)
              );
              const upcomingSession = sessions.find(
                (s) => (s.roomId?._id === room._id || s.roomId === room._id) && s.status === 'SCHEDULED'
              );

              const isOccupied = Boolean(activeSession);
              const pName = activeSession ? formatPatientName(activeSession.patientId) : '—';
              const surgeonName = activeSession?.leadSurgeonId
                ? formatDoctorName(activeSession.leadSurgeonId.fullName || `${activeSession.leadSurgeonId.firstName} ${activeSession.leadSurgeonId.lastName}`)
                : '—';
              const anesName = activeSession?.anesthetistId
                ? `${activeSession.anesthetistId.firstName} ${activeSession.anesthetistId.lastName}`
                : '—';

              return (
                <div
                  key={room._id}
                  className={`admin-surg-suite-card ${isOccupied ? 'admin-surg-suite-card--occupied' : 'admin-surg-suite-card--vacant'}`}
                >
                  <div className="admin-surg-suite-card__top">
                    <div className="admin-surg-suite-card__title-wrap">
                      <span className="material-symbols-rounded admin-surg-suite-card__icon">
                        {isOccupied ? 'medical_services' : 'meeting_room'}
                      </span>
                      <div>
                        <h4 className="admin-surg-suite-card__name">{room.roomName || `OT Suite ${room.roomNumber}`}</h4>
                        <span className="admin-surg-suite-card__type">{room.roomType || 'OT Suite'}</span>
                      </div>
                    </div>

                    <span className={`admin-surg-status-pill ${isOccupied ? 'admin-surg-status-pill--active' : 'admin-surg-status-pill--vacant'}`}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px', marginRight: '3px', verticalAlign: 'text-bottom' }}>
                        {isOccupied ? 'vital_signs' : 'check_circle'}
                      </span>
                      <span>{isOccupied ? activeSession.status : 'VACANT / READY'}</span>
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="admin-surg-suite-card__body">
                      <div className="admin-surg-suite-card__proc">
                        <Md3MarqueeText text={activeSession.procedureName || 'Surgical Procedure'} speed={26} />
                      </div>

                      <div className="admin-surg-suite-card__meta-list">
                        <div className="admin-surg-suite-card__meta-item">
                          <span>Patient:</span>
                          <strong>{pName} (MRN: {activeSession.patientId?.mrn || '—'})</strong>
                        </div>
                        <div className="admin-surg-suite-card__meta-item">
                          <span>Lead Surgeon:</span>
                          <strong>{surgeonName}</strong>
                        </div>
                        <div className="admin-surg-suite-card__meta-item">
                          <span>Anesthetist:</span>
                          <strong>{anesName} ({activeSession.anesthesiaType || 'General'})</strong>
                        </div>
                        <div className="admin-surg-suite-card__meta-item">
                          <span>Time In:</span>
                          <strong>
                            {activeSession.actualStart
                              ? new Date(activeSession.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : (activeSession.scheduledStart ? new Date(activeSession.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-surg-suite-card__empty-body">
                      <span className="material-symbols-rounded">door_front</span>
                      <p>Theatre suite is sanitized and available for elective or emergency booking.</p>
                      {upcomingSession && (
                        <div className="admin-surg-suite-card__next-up">
                          <small>Next Scheduled:</small>
                          <strong>{upcomingSession.procedureName} at {new Date(upcomingSession.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tab Content 2: Emergency Operations Radar ─── */}
      {activeTab === 'EMERGENCY_RADAR' && (
        <div className="admin-surg-deck">
          <div className="admin-surg-deck__header">
            <h3 className="admin-surg-deck__title">Emergency Operations &amp; STAT Procedures Radar</h3>
            <span className="admin-surg-deck__meta">High-priority Trauma, Maternity Childbirth, and Acute Cases</span>
          </div>

          {emergencySessions.length === 0 ? (
            <div className="admin-surg-empty-radar">
              <span className="material-symbols-rounded">verified_user</span>
              <h4>No Active Emergency Surgical Cases</h4>
              <p>All operating theatres are currently running elective schedules or standing by.</p>
            </div>
          ) : (
            <div className="admin-surg-radar-grid">
              {emergencySessions.map((session) => {
                const pName = formatPatientName(session.patientId) || 'Patient';
                const surgeonName = session.leadSurgeonId ? formatDoctorName(session.leadSurgeonId.fullName || `${session.leadSurgeonId.firstName} ${session.leadSurgeonId.lastName}`) : 'Surgeon On-Call';
                const roomName = session.roomId?.roomName || `Room ${session.roomId?.roomNumber || 'Pending Allocation'}`;

                return (
                  <div key={session._id} className="admin-surg-radar-card">
                    <div className="admin-surg-radar-card__head">
                      <span className="admin-surg-radar-card__tag">
                        <span className="material-symbols-rounded" style={{ fontSize: '15px', marginRight: '4px', verticalAlign: 'text-bottom' }}>
                          {session.procedureCategory === 'EMERGENCY_TRAUMA'
                            ? 'emergency'
                            : session.procedureCategory === 'EMERGENCY_MATERNITY_CSECTION'
                            ? 'child_care'
                            : session.procedureCategory === 'EMERGENCY_ACUTE'
                            ? 'bolt'
                            : 'emergency'}
                        </span>
                        <span>
                          {session.procedureCategory === 'EMERGENCY_TRAUMA' && 'STAT Trauma & Accident'}
                          {session.procedureCategory === 'EMERGENCY_MATERNITY_CSECTION' && 'Maternity Emergency Childbirth'}
                          {session.procedureCategory === 'EMERGENCY_ACUTE' && 'Acute Surgical Emergency'}
                          {!['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(session.procedureCategory) && 'Critical Emergency'}
                        </span>
                      </span>
                      <span className="admin-surg-radar-card__status">{session.status}</span>
                    </div>

                    <div className="admin-surg-radar-card__title">
                      <Md3MarqueeText text={session.procedureName || 'Emergency Procedure'} speed={26} />
                    </div>

                    <div className="admin-surg-radar-card__meta">
                      <div><span>Patient:</span> <strong>{pName} (MRN: {session.patientId?.mrn || '—'})</strong></div>
                      <div><span>Theatre:</span> <strong>{roomName}</strong></div>
                      <div><span>Surgeon in Charge:</span> <strong>{surgeonName}</strong></div>
                      <div><span>Logged At:</span> <strong>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    </div>

                    {session.requestNotes && (
                      <div className="admin-surg-radar-card__notes">
                        <small>Clinical Indications:</small>
                        <p>{session.requestNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab Content 3: Staff In-Charge Roster ─── */}
      {activeTab === 'STAFF_ROSTER' && (
        <div className="admin-surg-deck">
          <div className="admin-surg-deck__header">
            <h3 className="admin-surg-deck__title">Surgical Team &amp; Doctor In-Charge Roster</h3>
            <span className="admin-surg-deck__meta">Active surgeons, anesthetists, and case distributions</span>
          </div>

          <div className="admin-surg-roster-table-wrap">
            <table className="admin-surg-roster-table">
              <thead>
                <tr>
                  <th>Surgeon / Doctor Name</th>
                  <th>Designation / Specialization</th>
                  <th>Active Cases (Live)</th>
                  <th>Scheduled Today</th>
                  <th>Completed Today</th>
                  <th>Current Live Operation</th>
                </tr>
              </thead>
              <tbody>
                {surgicalStaffRoster.map((doc) => {
                  const docName = formatDoctorName(doc.fullName || `${doc.firstName} ${doc.lastName}`);
                  return (
                    <tr key={doc._id}>
                      <td>
                        <div className="admin-surg-roster-name-cell">
                          <span className="material-symbols-rounded">person</span>
                          <strong>{docName}</strong>
                        </div>
                      </td>
                      <td>{doc.specialization || doc.roleId?.name || doc.position || 'Surgeon'}</td>
                      <td>
                        <span className={`admin-surg-badge ${doc.activeCount > 0 ? 'admin-surg-badge--active' : ''}`}>
                          {doc.activeCount} Active
                        </span>
                      </td>
                      <td>{doc.scheduledCount} Scheduled</td>
                      <td>{doc.completedCount} Done</td>
                      <td>
                        {doc.currentCase ? (
                          <div className="admin-surg-roster-case-pill">
                            <span>{doc.currentCase.procedureName}</span>
                            <small>({doc.currentCase.roomId?.roomName || 'OT'})</small>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--md-sys-color-outline, #79747e)', fontSize: '0.8rem' }}>On Standby</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab Content 4: Full Schedule Board ─── */}
      {activeTab === 'FULL_BOARD' && (
        <div className="admin-surgeries-board-frame">
          <OTScheduleBoard embedded={true} hideHero={true} />
        </div>
      )}
    </div>
  );
};

export default AdminSurgeriesView;
