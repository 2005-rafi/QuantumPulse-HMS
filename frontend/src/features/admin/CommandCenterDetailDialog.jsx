import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
import { formatVisitStatus, formatDoctorName } from '../../utils/patientFormatters';

const CommandCenterDetailDialog = ({ isOpen, onClose, type }) => {
  const { showError } = useToast();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Date mode: 'all' | 'today' | 'custom'
  const [dateFilterMode, setDateFilterMode] = useState('all');
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState(getTodayISO());

  const isIpdType = type?.startsWith('ipd_');
  const isOtType = type?.startsWith('ot_');

  useEffect(() => {
    if (isOpen && type) {
      fetchDetails();
    }
  }, [isOpen, type, dateFilterMode, startDate, endDate]);

  const fetchDetails = async () => {
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

      // OPD Queue Types
      if (type === 'today_visits') {
        endpoint = '/visits/queue/ALL';
      } else if (type === 'completed_visits') {
        endpoint = '/visits/queue/COMPLETED';
      } else if (type === 'triage_queue' || type === 'nurse_queue') {
        endpoint = '/visits/queue/WAITING_TRIAGE,CALLED';
      } else if (type === 'doctor_queue') {
        endpoint = '/visits/queue/WAITING_DOCTOR,WAITING_DOCTOR_REVIEW';
      } else if (type === 'in_consultation') {
        endpoint = '/visits/queue/IN_PROGRESS';
      } else if (type === 'pending_lab') {
        endpoint = '/visits/queue/WAITING_LAB';
      } else if (type === 'pending_pharmacy') {
        endpoint = '/visits/queue/WAITING_PHARMACY';
      } else if (type === 'pending_billing' || type === 'waiting_billing') {
        endpoint = '/visits/queue/WAITING_BILLING';
      } else if (type === 'skipped') {
        endpoint = '/visits/queue/SKIPPED';
      }
      
      // IPD Queue Types
      else if (type === 'ipd_admitted' || type === 'ipd_active') {
        endpoint = '/ipd/admissions';
        params.status = 'ADMITTED';
      } else if (type === 'ipd_pending') {
        endpoint = '/ipd/admissions';
        params.status = 'REQUESTED';
      } else if (type === 'ipd_discharging') {
        endpoint = '/ipd/admissions';
        params.status = 'DISCHARGE_INITIATED';
      } else if (type === 'ipd_discharged') {
        endpoint = '/ipd/admissions';
        params.status = 'DISCHARGED';
      } else if (type === 'ipd_emergency') {
        endpoint = '/ipd/admissions';
        params.admissionType = 'EMERGENCY';
      }

      // OT Session Queue Types
      else if (type === 'ot_scheduled') {
        endpoint = '/ipd/ot/sessions';
        params.status = 'SCHEDULED';
      } else if (type === 'ot_in_theatre') {
        endpoint = '/ipd/ot/sessions';
        params.status = 'IN_THEATRE';
      } else if (type === 'ot_pacu') {
        endpoint = '/ipd/ot/sessions';
        params.status = 'PACU';
      } else if (type === 'ot_completed') {
        endpoint = '/ipd/ot/sessions';
        params.status = 'COMPLETED';
      }

      if (endpoint) {
        const res = await api.get(endpoint, { params });
        let list = res.data?.data || [];
        if (!Array.isArray(list) && res.data?.sessions) list = res.data.sessions;
        if (!Array.isArray(list) && res.data?.admissions) list = res.data.admissions;
        setDataList(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Error fetching queue details');
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

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return dataList;
    const q = searchTerm.toLowerCase();
    return dataList.filter((item) => {
      const pName = getPatientName(item.patientId);
      const mrn = item.patientId?.mrn || '';

      if (isIpdType) {
        const admNo = item.admissionNumber || '';
        const dept = item.admittingDepartmentId?.name || '';
        const doc = `${item.primaryDoctorId?.firstName || ''} ${item.primaryDoctorId?.lastName || ''}`;
        const diag = item.provisionalDiagnosis || '';
        const bed = item.currentBedId?.bedNumber || '';
        return (
          pName.toLowerCase().includes(q) ||
          mrn.toLowerCase().includes(q) ||
          admNo.toLowerCase().includes(q) ||
          dept.toLowerCase().includes(q) ||
          doc.toLowerCase().includes(q) ||
          diag.toLowerCase().includes(q) ||
          bed.toLowerCase().includes(q)
        );
      }

      if (isOtType) {
        const proc = item.procedureName || '';
        const room = item.roomId?.roomName || item.roomId?.roomNumber || '';
        const surgeon = `${item.leadSurgeonId?.firstName || ''} ${item.leadSurgeonId?.lastName || ''}`;
        return (
          pName.toLowerCase().includes(q) ||
          mrn.toLowerCase().includes(q) ||
          proc.toLowerCase().includes(q) ||
          room.toLowerCase().includes(q) ||
          surgeon.toLowerCase().includes(q)
        );
      }

      // Default OPD Visit matching
      const vNum = item.visitNumber || '';
      const token = item.tokenString || '';
      const dept = item.departmentId?.name || '';
      const doc = item.consultation?.doctorId?.fullName || '';
      const chiefComplaint = item.vitals?.chiefComplaint || item.reason || '';
      return (
        pName.toLowerCase().includes(q) ||
        mrn.toLowerCase().includes(q) ||
        vNum.toLowerCase().includes(q) ||
        token.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        doc.toLowerCase().includes(q) ||
        chiefComplaint.toLowerCase().includes(q)
      );
    });
  }, [dataList, searchTerm, isIpdType, isOtType]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedQueue,
    showTopPagination,
  } = usePagination(filteredData, 50, [searchTerm, dateFilterMode, startDate, endDate, type]);

  if (!isOpen || !type) return null;

  const getDuration = (visit) => {
    const start = new Date(visit.createdAt || visit.admissionDate);
    const end = (visit.status === 'COMPLETED' && visit.billing?.billedAt) || visit.dischargeDate
      ? new Date(visit.billing?.billedAt || visit.dischargeDate) 
      : new Date();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  const getTitle = () => {
    switch (type) {
      case 'today_visits': return 'Today’s Patient Registrations';
      case 'completed_visits': return 'Completed & Discharged Patient Visits';
      case 'triage_queue': case 'nurse_queue': return 'Nurse Queue — Waiting for Vitals';
      case 'doctor_queue': return 'Doctor Queue — Waiting for Consultation';
      case 'in_consultation': return 'Active In-Consultation Visits';
      case 'pending_lab': return 'Diagnostic Lab Investigation Queue';
      case 'pending_pharmacy': return 'Pharmacy Dispensation Queue';
      case 'pending_billing': return 'Billing & Cashier Queue';
      case 'skipped': return 'Skipped / Unattended Queue Calls';
      case 'ipd_admitted': case 'ipd_active': return 'Active Inpatient Admissions (IPD)';
      case 'ipd_pending': return 'Pending Bed Allocation / Admissions Ingest';
      case 'ipd_discharging': return 'Inpatient Discharge Clearance Queue';
      case 'ipd_discharged': return 'Discharged Inpatient Stays';
      case 'ipd_emergency': return 'Emergency / Critical Inpatient Cases';
      case 'ot_scheduled': return 'Scheduled & Pre-Op Surgeries';
      case 'ot_in_theatre': return 'Active Surgical Suites (In Theatre)';
      case 'ot_pacu': return 'PACU / Post-Operative Recovery Queue';
      case 'ot_completed': return 'Completed Surgeries Today';
      default: return 'Hospital Queue Ledger';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'today_visits': return 'Comprehensive ledger of all patient encounters registered in the system';
      case 'completed_visits': return 'Historical and today’s record of patients whose clinical visits have been finalized';
      case 'triage_queue': case 'nurse_queue': return 'Live queue of walk-in & appointment patients awaiting nursing assessment';
      case 'doctor_queue': return 'Live queue of patients with nurse vitals recorded, awaiting medical consultation';
      case 'in_consultation': return 'Patients currently inside doctor consultation rooms across all clinical departments';
      case 'pending_lab': return 'Patients with ordered diagnostic investigations awaiting specimen analysis';
      case 'pending_pharmacy': return 'Patients with finalized clinical prescriptions awaiting pharmacy checks & billing';
      case 'pending_billing': return 'Live queue of patients awaiting surgical, bed stay, or procedural invoice settlement';
      case 'skipped': return 'Patients who missed their token call and require queue repositioning';
      case 'ipd_admitted': case 'ipd_active': return 'Active inpatients occupying hospital beds undergoing clinical care';
      case 'ipd_pending': return 'Patients approved for admission awaiting physical bed assignment';
      case 'ipd_discharging': return 'Inpatients in multi-department discharge clearance process';
      case 'ipd_discharged': return 'Inpatients whose discharge protocols and billing settlements are completed';
      case 'ipd_emergency': return 'Critical and emergency admissions prioritized for intensive inpatient care';
      case 'ot_scheduled': return 'Surgical procedures scheduled with confirmed theatre suites and surgical teams';
      case 'ot_in_theatre': return 'Patients currently undergoing surgical operation inside operating theatres';
      case 'ot_pacu': return 'Patients receiving post-anesthesia intensive recovery monitoring';
      case 'ot_completed': return 'Surgeries completed with surgical notes and post-op handoff recorded';
      default: return 'Live command center queue telemetry';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'DISCHARGED':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'WAITING_LAB':
      case 'IN_THEATRE':
      case 'EMERGENCY':
        return { bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-on-error-container)' };
      case 'WAITING_PHARMACY':
      case 'IN_PROGRESS':
      case 'ADMITTED':
      case 'PACU':
        return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
      case 'WAITING_DOCTOR':
      case 'WAITING_DOCTOR_REVIEW':
      case 'SCHEDULED':
      case 'DISCHARGE_INITIATED':
        return { bg: 'var(--md-sys-color-tertiary-container)', fg: 'var(--md-sys-color-on-tertiary-container)' };
      case 'WAITING_TRIAGE':
      case 'CALLED':
      case 'REQUESTED':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'SKIPPED':
      default:
        return { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)' };
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.38)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '36px 16px 24px',
        zIndex: 2000,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
          color: 'var(--md-sys-color-on-surface, #1c1b1f)',
          padding: '20px 24px',
          borderRadius: 'var(--md-sys-shape-corner-extra-large, 24px)',
          width: 'min(1560px, 96vw)',
          maxHeight: 'calc(100vh - 48px)',
          height: 'min(900px, calc(100vh - 48px))',
          overflow: 'hidden',
          border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{getTitle()}</h3>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 12px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', borderRadius: '999px' }}>
                {filteredData.length} records
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', display: 'block' }}>{getSubtitle()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchDetails}
              disabled={loading}
              title="Refresh Queue Data"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'var(--md-sys-color-surface-container-high)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', color: 'var(--md-sys-color-primary)', cursor: loading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 700, transition: 'all 150ms ease' }}
            >
              <span className={`material-symbols-rounded ${loading ? 'spin-animation' : ''}`} style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </button>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-highest)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: 'var(--md-sys-color-surface-container)', padding: '10px 16px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', flexWrap: 'wrap' }}>
          
          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-on-surface-variant)' }}>search</span>
            <input 
              type="text" 
              placeholder={
                isIpdType 
                  ? "Search admission #, patient name, MRN, department, doctor, diagnosis, bed..." 
                  : isOtType 
                  ? "Search procedure, patient name, MRN, room, lead surgeon..."
                  : "Search patient name, MRN, token, department, doctor, complaint..."
              }
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--md-sys-color-on-surface)', fontSize: '13px', outline: 'none' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', padding: 0 }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>clear</span>
              </button>
            )}
          </div>

          {/* Date Range Selector */}
          {(type === 'today_visits' || type === 'completed_visits' || type === 'ipd_discharged' || type === 'ot_completed') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: 'var(--md-sys-color-surface-container-high)', borderRadius: '999px', padding: '2px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                <button
                  onClick={() => setDateFilterMode('all')}
                  style={{ border: 'none', background: dateFilterMode === 'all' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'all' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  All Records
                </button>
                <button
                  onClick={() => setDateFilterMode('today')}
                  style={{ border: 'none', background: dateFilterMode === 'today' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'today' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  Today Only
                </button>
                <button
                  onClick={() => setDateFilterMode('custom')}
                  style={{ border: 'none', background: dateFilterMode === 'custom' ? 'var(--md-sys-color-primary)' : 'transparent', color: dateFilterMode === 'custom' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)', padding: '5px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}
                >
                  Custom Range
                </button>
              </div>

              {dateFilterMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', fontSize: '12px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>to</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Top Pagination */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="entries"
            position="top"
          />
        )}

        {/* Table Body Container */}
        <div className="md3-paginated-content-fade" key={page} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', scrollbarWidth: 'thin' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="md3-spinner md3-spinner--md" style={{ display: 'inline-block', marginBottom: '8px' }} />
              <div>Fetching real-time clinical ledger records...</div>
            </div>
          ) : paginatedQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '48px', opacity: 0.4, marginBottom: '8px' }}>inbox</span>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>No patient records found in this queue.</div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                {searchTerm ? 'No results matched your search term.' : 'Records entering this clinical stage will automatically appear here.'}
              </div>
            </div>
          ) : isIpdType ? (
            /* IPD Admission Table */
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Admission No</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Patient & MRN</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Age / Gender</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Ward & Bed</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Admitting Dept</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Primary Doctor</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Provisional Diagnosis</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Admitted</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Length of Stay</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((adm) => {
                  const badge = getStatusBadgeStyle(adm.status);
                  const p = adm.patientId || {};
                  const patientFullName = getPatientName(p);
                  const initials = patientFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT';
                  const docName = adm.primaryDoctorId ? formatDoctorName(adm.primaryDoctorId) : '';
                  const diag = adm.provisionalDiagnosis || adm.chiefComplaints || 'Inpatient Care';
                  const bedInfo = adm.currentBedId?.bedNumber 
                    ? `Bed ${adm.currentBedId.bedNumber} (${adm.currentRoomId?.roomName || adm.currentBedId.wardClass || 'General'})`
                    : 'Unallocated Bed';

                  return (
                    <tr 
                      key={adm._id} 
                      style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', transition: 'background 120ms ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-lowest)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface)'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                          {adm.admissionNumber}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--md-sys-color-on-surface)', fontSize: '13px' }}>
                              {patientFullName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'monospace', marginTop: '1px' }}>
                              MRN: {p.mrn || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                          {p.age ? `${p.age} yrs` : '—'}
                        </span>{' '}
                        / <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{p.gender || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--md-sys-color-tertiary)' }}>
                          {bedInfo}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                          {adm.admittingDepartmentId?.name || 'Inpatient Ward'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface)' }}>
                        {docName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>stethoscope</span>
                            <span>{docName}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '220px' }} title={diag}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--md-sys-color-on-surface)' }}>
                          {diag}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {new Date(adm.admissionDate || adm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(adm.admissionDate || adm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>
                        {getDuration(adm)}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 12px', background: badge.bg, color: badge.fg, borderRadius: '999px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                          {adm.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : isOtType ? (
            /* OT Surgery Session Table */
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>OT Suite / Room</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Patient & MRN</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Age / Gender</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Surgical Procedure</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Lead Surgeon</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Scheduled Start</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Priority</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((ot) => {
                  const badge = getStatusBadgeStyle(ot.status);
                  const p = ot.patientId || {};
                  const patientFullName = getPatientName(p);
                  const initials = patientFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT';
                  const surgeon = ot.leadSurgeonId ? formatDoctorName(ot.leadSurgeonId) : '';
                  const room = ot.roomId?.roomName || ot.roomId?.roomNumber || 'Main Theatre';

                  return (
                    <tr 
                      key={ot._id} 
                      style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', transition: 'background 120ms ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-lowest)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface)'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                          {room}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--md-sys-color-on-surface)', fontSize: '13px' }}>
                              {patientFullName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'monospace', marginTop: '1px' }}>
                              MRN: {p.mrn || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                          {p.age ? `${p.age} yrs` : '—'}
                        </span>{' '}
                        / <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{p.gender || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                        {ot.procedureName || 'Surgical Intervention'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface)' }}>
                        {surgeon ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>medical_services</span>
                            <span>{surgeon}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {ot.scheduledStart ? (
                          <>
                            {new Date(ot.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(ot.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </>
                        ) : 'Pending Schedule'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: ot.priority === 'EMERGENCY' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-surface-container-high)', color: ot.priority === 'EMERGENCY' ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-surface)' }}>
                          {ot.priority || 'ELECTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 12px', background: badge.bg, color: badge.fg, borderRadius: '999px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                          {ot.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Standard OPD Visit Table */
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--md-sys-color-surface-container)', borderBottom: '1px solid var(--md-sys-color-outline-variant)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Token / ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Patient & MRN</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Age / Gender</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Department</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Assigned Doctor</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Chief Complaint</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Registered</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Wait Duration</th>
                  <th style={{ padding: '14px 16px', fontWeight: 'bold', color: 'var(--md-sys-color-on-surface-variant)' }}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((visit) => {
                  const badge = getStatusBadgeStyle(visit.status);
                  const p = visit.patientId || {};
                  const patientFullName = getPatientName(p);
                  const initials = patientFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT';
                  const token = visit.tokenString || visit.visitNumber;
                  const docName = visit.consultation?.doctorId ? formatDoctorName(visit.consultation.doctorId) : (visit.assignedDoctor ? formatDoctorName(visit.assignedDoctor) : '');
                  const complaint = visit.vitals?.chiefComplaint || visit.reason || 'General Consultation';

                  return (
                    <tr 
                      key={visit._id} 
                      style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)', transition: 'background 120ms ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface-container-lowest)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--md-sys-color-surface)'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                          {token}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--md-sys-color-on-surface)', fontSize: '13px' }}>
                              {patientFullName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'monospace', marginTop: '1px' }}>
                              MRN: {p.mrn || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                          {p.age ? `${p.age} yrs` : '—'}
                        </span>{' '}
                        / <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{p.gender || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                          {visit.departmentId?.name || 'General OPD'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface)' }}>
                        {docName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>stethoscope</span>
                            <span>{docName}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }} title={complaint}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--md-sys-color-on-surface)' }}>
                          {complaint}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {new Date(visit.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap' }}>
                        {getDuration(visit)}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 12px', background: badge.bg, color: badge.fg, borderRadius: '999px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                          {formatVisitStatus(visit.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Pagination */}
        {totalItems > 0 && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="entries"
            position="bottom"
          />
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--md-sys-color-outline-variant)', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 24px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 150ms ease' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CommandCenterDetailDialog;
