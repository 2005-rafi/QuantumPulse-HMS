import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Icon } from './Md3Widgets';
import { Md3Button, Md3TextField } from './Md3FormComponents';
import './ClinicalPatientOverlayDialog.css';

/**
 * ClinicalPatientOverlayDialog
 * High-utility, full horizontal & vertical expanded overlay ledger for doctors, nurses, and administrators.
 * Opens on tap of any metric stat tile, appointment card, or queue summary component.
 */
const ClinicalPatientOverlayDialog = ({
  isOpen,
  onClose,
  type,
  title: customTitle,
  subtitle: customSubtitle,
  items: preloadedItems,
  onSelectPatient,
  doctorId,
}) => {
  const { showError } = useToast();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'critical' | 'routine' | 'followup' | 'walkin'
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all' | 'today' | 'custom'
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState(getTodayISO());

  useEffect(() => {
    if (!isOpen) return;

    if (preloadedItems && Array.isArray(preloadedItems)) {
      setDataList(preloadedItems);
      return;
    }

    if (type) {
      fetchData();
    }
  }, [isOpen, type, preloadedItems, dateFilterMode, startDate, endDate, doctorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = {};

      if (dateFilterMode === 'today') {
        const today = getTodayISO();
        params.startDate = today;
        params.endDate = today;
      } else if (dateFilterMode === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      if (doctorId) {
        params.doctorId = doctorId;
      }

      // Map types to API endpoints
      if (type === 'today_visits' || type === 'all_visits') {
        endpoint = '/visits/queue/ALL';
      } else if (type === 'completed_visits' || type === 'completed_today') {
        endpoint = '/visits/queue/COMPLETED';
      } else if (type === 'triage_queue') {
        endpoint = '/visits/queue/WAITING_TRIAGE,CALLED';
      } else if (type === 'waiting_doctor' || type === 'doctor_queue') {
        endpoint = '/visits/queue/WAITING_DOCTOR,WAITING_DOCTOR_REVIEW';
      } else if (type === 'in_consultation' || type === 'in_progress') {
        endpoint = '/visits/queue/IN_PROGRESS';
      } else if (type === 'lab_reviews' || type === 'pending_lab') {
        endpoint = '/visits/queue/WAITING_DOCTOR_REVIEW,WAITING_LAB';
      } else if (type === 'pending_pharmacy') {
        endpoint = '/visits/queue/WAITING_PHARMACY';
      } else if (type?.startsWith('appointments')) {
        endpoint = '/appointments';
        if (doctorId) params.doctorId = doctorId;
      }

      if (endpoint) {
        const res = await api.get(endpoint, { params });
        const items = res.data?.data || res.data?.appointments || [];
        setDataList(items);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Error fetching patient details');
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = (p) => {
    if (!p) return 'Unknown Patient';
    if (typeof p === 'string') return p;
    if (p.fullName && p.fullName.trim()) return p.fullName.trim();
    const combined = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    if (combined) return combined;
    if (p.name && p.name.trim()) return p.name.trim();
    return 'Unknown Patient';
  };

  const getTitle = () => {
    if (customTitle) return customTitle;
    switch (type) {
      case 'today_appointments':
      case 'appointments_total':
        return 'Total Scheduled Appointments';
      case 'checked_in_appointments':
      case 'appointments_checked_in':
        return 'Ready & Checked-In Consultations';
      case 'awaiting_appointments':
      case 'appointments_scheduled':
        return 'Pre-Booked Consultations Awaiting Arrival';
      case 'completed_appointments':
      case 'appointments_completed':
        return 'Completed Consultations';
      case 'in_consultation':
      case 'in_progress':
        return 'Active In-Consultation Visits';
      case 'waiting_doctor':
      case 'doctor_queue':
        return 'Patients Awaiting Doctor Consultation';
      case 'lab_reviews':
      case 'pending_lab':
        return 'Diagnostic Lab Reports Ready for Review';
      case 'completed_today':
      case 'completed_visits':
        return 'Completed Patient Consultations';
      case 'triage_queue':
        return 'Triage Queue — Waiting for Vitals';
      default:
        return 'Clinical Patient Ledger';
    }
  };

  const getSubtitle = () => {
    if (customSubtitle) return customSubtitle;
    switch (type) {
      case 'today_appointments':
      case 'appointments_total':
        return 'Complete ledger of all booked consultations for today & upcoming schedules';
      case 'checked_in_appointments':
      case 'appointments_checked_in':
        return 'Patients who have checked in at reception with vitals recorded, ready to consult';
      case 'awaiting_appointments':
      case 'appointments_scheduled':
        return 'Pre-booked appointment patients expected for consultation today';
      case 'completed_appointments':
      case 'appointments_completed':
        return 'Historical and today’s record of concluded patient consultations';
      case 'in_consultation':
      case 'in_progress':
        return 'Visits currently active inside doctor consultation rooms';
      case 'waiting_doctor':
      case 'doctor_queue':
        return 'Patients with triage vitals recorded, waiting in line for consultation';
      case 'lab_reviews':
      case 'pending_lab':
        return 'Patients whose diagnostic lab test results have arrived and require doctor analysis';
      case 'completed_today':
      case 'completed_visits':
        return 'Patients whose consultations and discharge notes were completed';
      default:
        return 'Real-time patient tracking and clinical management';
    }
  };

  const getDuration = (visit) => {
    const start = new Date(visit.createdAt || visit.appointmentDate || Date.now());
    const end = visit.status === 'COMPLETED' && visit.billing?.billedAt 
      ? new Date(visit.billing.billedAt) 
      : new Date();
    const diffMs = Math.max(0, end - start);
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const maskPhone = (phone) => {
    if (!phone) return null;
    const str = String(phone).trim();
    if (str.length <= 4) return str;
    return str.slice(0, 3) + '••••' + str.slice(-3);
  };

  const isNoneOrNkda = (text) => {
    if (!text) return true;
    if (typeof text === 'string') {
      const clean = text.trim().toUpperCase();
      return (
        clean === '' ||
        clean === 'NONE' ||
        clean === 'NIL' ||
        clean === 'NO' ||
        clean === 'NKDA' ||
        clean === 'NO KNOWN ALLERGIES' ||
        clean === 'NO KNOWN DRUG ALLERGIES' ||
        clean === 'N/A' ||
        clean === 'NULL' ||
        clean === 'UNDEFINED'
      );
    }
    return false;
  };

  // Filtered and searched data
  const filteredData = useMemo(() => {
    let list = [...dataList];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((item) => {
        const patient = item.patientId || item;
        const pName = getPatientName(patient);
        const mrn = patient.mrn || '';
        const phone = patient.phoneNumber || '';
        const token = item.tokenString || item.visitNumber || item.appointmentNumber || '';
        const complaint = item.vitals?.chiefComplaint || item.reason || '';
        const dept = item.departmentId?.name || '';
        return (
          pName.toLowerCase().includes(q) ||
          mrn.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          token.toLowerCase().includes(q) ||
          complaint.toLowerCase().includes(q) ||
          dept.toLowerCase().includes(q)
        );
      });
    }

    // Category filter
    if (filterMode === 'critical') {
      list = list.filter((item) => {
        const vitals = item.vitals || item.visitId?.vitals || {};
        const bpSys = vitals.bloodPressureSystolic || 0;
        const bpDia = vitals.bloodPressureDiastolic || 0;
        const pulse = vitals.pulseRate || 0;
        const spo2 = vitals.spO2 || 100;
        const temp = vitals.temperature || 98.6;
        return (
          bpSys >= 140 || bpSys <= 90 ||
          bpDia >= 90 || bpDia <= 60 ||
          pulse >= 100 || pulse <= 55 ||
          spo2 < 95 ||
          temp >= 100.4
        );
      });
    } else if (filterMode === 'followup') {
      list = list.filter((item) => item.appointmentType === 'FOLLOW_UP' || item.visitType === 'FOLLOW_UP');
    } else if (filterMode === 'walkin') {
      list = list.filter((item) => item.appointmentType === 'WALK_IN' || item.visitType === 'OPD' || !item.appointmentNumber);
    }

    return list;
  }, [dataList, searchTerm, filterMode]);

  // Keyboard shortcut: ESC to close & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="c-overlay-backdrop" onClick={onClose}>
      <div
        className="c-overlay-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ─── 1. MODAL HEADER ─── */}
        <div className="c-overlay-header">
          <div className="c-overlay-header-left">
            <div className="c-overlay-icon-badge">
              <Icon.Users />
            </div>
            <div>
              <div className="c-overlay-title-row">
                <h3 className="c-overlay-title">{getTitle()}</h3>
                <span className="c-overlay-count-pill">
                  {filteredData.length} {filteredData.length === 1 ? 'Patient' : 'Patients'}
                </span>
              </div>
              <p className="c-overlay-subtitle">{getSubtitle()}</p>
            </div>
          </div>

          <div className="c-overlay-header-actions">
            <Md3Button
              variant="secondary"
              onClick={fetchData}
              loading={loading}
              className="c-overlay-refresh-btn"
            >
              <Icon.Refresh />
              <span>Refresh Ledger</span>
            </Md3Button>

            <button
              type="button"
              className="c-overlay-close-btn"
              onClick={onClose}
              title="Close (ESC)"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* ─── 2. SEARCH & FILTER TOOLBAR ─── */}
        <div className="c-overlay-toolbar">
          {/* Quick Search */}
          <div className="c-overlay-search-box">
            <span className="c-overlay-search-icon">
              <Icon.Search />
            </span>
            <input
              type="text"
              placeholder="Search by patient name, MRN, token, phone, complaint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-overlay-search-input"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                className="c-overlay-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                <Icon.Clear />
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="c-overlay-filter-chips">
            <button
              type="button"
              className={`c-overlay-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({dataList.length})
            </button>
            <button
              type="button"
              className={`c-overlay-filter-chip ${filterMode === 'critical' ? 'active' : ''}`}
              onClick={() => setFilterMode('critical')}
            >
              <Icon.Alert />
              <span>Critical Vitals</span>
            </button>
            <button
              type="button"
              className={`c-overlay-filter-chip ${filterMode === 'followup' ? 'active' : ''}`}
              onClick={() => setFilterMode('followup')}
            >
              Follow-Ups
            </button>
            <button
              type="button"
              className={`c-overlay-filter-chip ${filterMode === 'walkin' ? 'active' : ''}`}
              onClick={() => setFilterMode('walkin')}
            >
              Walk-Ins
            </button>
          </div>

          {/* Date Mode Filter */}
          <div className="c-overlay-date-group">
            <button
              type="button"
              className={`c-overlay-date-btn ${dateFilterMode === 'all' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('all')}
            >
              All Dates
            </button>
            <button
              type="button"
              className={`c-overlay-date-btn ${dateFilterMode === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('today')}
            >
              Today
            </button>
          </div>
        </div>

        {/* ─── 3. PATIENT LEDGER BODY ─── */}
        <div className="c-overlay-body">
          {loading ? (
            <div className="c-overlay-state-msg">
              <span className="md3-spinner md3-spinner--md" />
              <span>Fetching real-time patient records...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="c-overlay-empty-state">
              <div className="c-overlay-empty-icon">
                <Icon.Inbox />
              </div>
              <h4>No Patient Records Found</h4>
              <p>
                {searchTerm
                  ? 'No patient records matched your search query. Try clearing the search.'
                  : 'Patients entering this queue will automatically appear here in real-time.'}
              </p>
              {searchTerm && (
                <Md3Button variant="secondary" onClick={() => setSearchTerm('')} style={{ marginTop: '10px' }}>
                  Clear Search Filter
                </Md3Button>
              )}
            </div>
          ) : (
            <div className="c-overlay-grid">
              {filteredData.map((item) => {
                const patient = item.patientId || item;
                const visit = item.visitId || item;
                const vitals = item.vitals || item.visitId?.vitals || {};
                const hasVitals = !!(
                  vitals.bloodPressureSystolic ||
                  vitals.pulseRate ||
                  vitals.temperature ||
                  vitals.spO2 ||
                  vitals.weightKg
                );

                const patientName = getPatientName(patient);
                const initials = patientName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'PT';

                const token = item.tokenString || item.visitNumber || item.appointmentNumber || '—';
                const complaint = vitals.chiefComplaint || item.reason || visit.reason || 'General Consultation';
                const duration = getDuration(item);
                const maskedPhone = maskPhone(patient.phoneNumber);

                // Allergies check
                const rawAllergies = Array.isArray(patient.allergies)
                  ? patient.allergies.filter((a) => !isNoneOrNkda(a))
                  : typeof patient.allergies === 'string' && !isNoneOrNkda(patient.allergies)
                  ? patient.allergies.split(',').map((s) => s.trim()).filter((s) => !isNoneOrNkda(s))
                  : [];
                const hasAllergies = rawAllergies.length > 0;
                const allergyText = rawAllergies.join(', ');

                const isCompleted = item.status === 'COMPLETED' || visit.status === 'COMPLETED';
                const isReady = item.status === 'WAITING_DOCTOR' || item.status === 'CHECKED_IN' || visit.status === 'WAITING_DOCTOR';
                const isInProgress = item.status === 'IN_PROGRESS' || visit.status === 'IN_PROGRESS';

                return (
                  <div
                    key={item._id || item.id}
                    className={`c-overlay-card ${isReady ? 'ready' : ''} ${isInProgress ? 'in-progress' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    {/* Left Token & Slot Column */}
                    <div className="c-overlay-card-slot">
                      <span className="c-overlay-token-badge">{token}</span>
                      <span className="c-overlay-time-tag">
                        <Icon.Clock />
                        <span>{item.startTime || duration}</span>
                      </span>
                      <span className="c-overlay-type-pill">
                        {item.appointmentType || item.visitType || 'OPD'}
                      </span>
                    </div>

                    {/* Main Patient Demographics & Vitals */}
                    <div className="c-overlay-card-main">
                      <div className="c-overlay-card-top-row">
                        <div className="c-overlay-identity-group">
                          <div className="c-overlay-avatar">{initials}</div>
                          <div>
                            <div className="c-overlay-name-line">
                              <h4 className="c-overlay-patient-name">{patientName}</h4>
                              <span className="c-overlay-mrn-tag">MRN: {patient.mrn || '—'}</span>
                              <span className={`c-overlay-status-pill ${item.status?.toLowerCase() || 'routine'}`}>
                                {item.status?.replace(/_/g, ' ') || 'ACTIVE'}
                              </span>
                            </div>

                            <div className="c-overlay-meta-line">
                              <span><strong>{patient.age ? `${patient.age}y` : '—'}</strong> · {patient.gender || '—'}</span>
                              {patient.bloodGroup && (
                                <span className="c-overlay-blood-tag">
                                  <Icon.Droplet />
                                  <span>{patient.bloodGroup}</span>
                                </span>
                              )}
                              {maskedPhone && (
                                <span className="c-overlay-phone-tag">
                                  <Icon.Phone />
                                  <span>{maskedPhone}</span>
                                </span>
                              )}
                              {hasAllergies ? (
                                <span className="c-overlay-allergy-tag" title={`Allergies: ${allergyText}`}>
                                  <Icon.Alert />
                                  <span>Allergy: {allergyText}</span>
                                </span>
                              ) : (
                                <span className="c-overlay-nkda-tag">
                                  <Icon.Check />
                                  <span>NKDA</span>
                                </span>
                              )}
                              {item.departmentId?.name && (
                                <span className="c-overlay-dept-tag">
                                  <Icon.Activity />
                                  <span>{item.departmentId.name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Direct Action Button */}
                        <div className="c-overlay-action-slot">
                          <Md3Button
                            variant="primary"
                            onClick={() => {
                              onClose();
                              onSelectPatient?.(item);
                            }}
                            className="c-overlay-open-btn"
                          >
                            <Icon.FileText />
                            <span>Open Patient File</span>
                          </Md3Button>
                        </div>
                      </div>

                      {/* Chief Complaint */}
                      <div className="c-overlay-complaint-row">
                        <span className="c-overlay-complaint-label">Chief Complaint:</span>
                        <span className="c-overlay-complaint-val">{complaint}</span>
                      </div>

                      {/* Structured Vitals Matrix */}
                      {hasVitals && (
                        <div className="c-overlay-vitals-row">
                          <span className="c-overlay-vitals-badge">
                            <Icon.Activity />
                            <span>Vitals:</span>
                          </span>
                          <div className="c-overlay-vital-chips">
                            {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
                              <span className="c-overlay-vital-chip">
                                <strong>BP</strong> {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
                              </span>
                            )}
                            {vitals.pulseRate && (
                              <span className="c-overlay-vital-chip">
                                <strong>Pulse</strong> {vitals.pulseRate} bpm
                              </span>
                            )}
                            {vitals.spO2 && (
                              <span className="c-overlay-vital-chip">
                                <strong>SpO2</strong> {vitals.spO2}%
                              </span>
                            )}
                            {vitals.temperature && (
                              <span className="c-overlay-vital-chip">
                                <strong>Temp</strong> {vitals.temperature}°F
                              </span>
                            )}
                            {vitals.weightKg && (
                              <span className="c-overlay-vital-chip">
                                <strong>Weight</strong> {vitals.weightKg} kg
                              </span>
                            )}
                            {vitals.bmi && (
                              <span className="c-overlay-vital-chip">
                                <strong>BMI</strong> {vitals.bmi}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 4. MODAL FOOTER ─── */}
        <div className="c-overlay-footer">
          <div className="c-overlay-footer-left">
            <span>
              Showing <strong>{filteredData.length}</strong> of <strong>{dataList.length}</strong> patient records
            </span>
          </div>
          <Md3Button variant="secondary" onClick={onClose} className="c-overlay-footer-close">
            Close Overlay (ESC)
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ClinicalPatientOverlayDialog;
