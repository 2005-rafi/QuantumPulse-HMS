import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ipdApi } from '../../services/ipdApi';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';
import './InpatientCaseFileDialog.css';

/**
 * InpatientCaseFileDialog — Material Design 3 Comprehensive Inpatient Case File Modal
 * Displays complete 360° clinical timeline: admission particulars, chronological SOAP
 * ward rounds, CPOE orders, nursing vitals, and discharge summary / gate pass.
 */
export const InpatientCaseFileDialog = ({ admissionId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [caseFile, setCaseFile] = useState(null);
  const [activeTab, setActiveTab] = useState('ROUNDS'); // 'ROUNDS' | 'CPOE' | 'DISCHARGE' | 'VITALS'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !admissionId) {
      setCaseFile(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    ipdApi.getCaseFile(admissionId)
      .then((res) => {
        if (!isMounted) return;
        setCaseFile(res.data?.data || null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load case file:', err);
        setError(err.response?.data?.message || 'Failed to retrieve inpatient case file.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, admissionId]);

  if (!isOpen) return null;

  const adm = caseFile?.admission || {};
  const patient = caseFile?.patient || adm?.patientId || {};
  const rounds = caseFile?.wardRounds || [];
  const cpoeOrders = caseFile?.cpoeOrders || [];
  const clearance = caseFile?.clearance;
  const vitals = caseFile?.vitals || [];

  const admDate = adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const disDate = adm.dischargeDate ? new Date(adm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (adm.status === 'DISCHARGED' ? 'Discharged' : 'Active');
  const losDays = caseFile?.losDays || adm.losDays || 1;

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'IMPROVING': return 'var(--md-sys-color-primary, #006874)';
      case 'STABLE': return '#2e7d32';
      case 'GUARDED': return '#f57c00';
      case 'CRITICAL': return '#d32f2f';
      default: return 'var(--md-sys-color-outline, #70797b)';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="case-file-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="case-file-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <header className="case-file-header">
          <div className="case-file-header__left">
            <div className="case-file-avatar">
              {getPatientInitials(patient)}
            </div>
            <div>
              <div className="case-file-patient-name">
                {formatPatientName(patient)}
                <span className={`case-file-status-badge case-file-status-badge--${(adm.status || '').toLowerCase()}`}>
                  {adm.status || 'ADMITTED'}
                </span>
              </div>
              <div className="case-file-meta-line">
                <span><strong>MRN:</strong> {patient.mrn || '—'}</span>
                <span>•</span>
                <span><strong>Adm No:</strong> {adm.admissionNumber || '—'}</span>
                <span>•</span>
                <span>{patient.age || '—'} Y / {patient.gender || '—'}</span>
                <span>•</span>
                <span>Bed: {adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '—'} ({adm.currentBedId?.wardClass || 'General'})</span>
              </div>
            </div>
          </div>

          <div className="case-file-header__right">
            <button type="button" className="case-file-btn case-file-btn--text" onClick={handlePrint}>
              <span className="material-symbols-rounded">print</span>
              <span>Print Ledger</span>
            </button>
            <button type="button" className="case-file-btn case-file-btn--icon" onClick={onClose} aria-label="Close dialog">
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </header>

        {/* Stay Summary Strip */}
        <div className="case-file-strip">
          <div className="case-file-strip__item">
            <span className="strip-label">Admission Stay</span>
            <span className="strip-value">{admDate} – {disDate}</span>
          </div>
          <div className="case-file-strip__item">
            <span className="strip-label">Length of Stay</span>
            <span className="strip-value strip-value--highlight">{losDays} Day{losDays > 1 ? 's' : ''}</span>
          </div>
          <div className="case-file-strip__item">
            <span className="strip-label">Attending Doctor</span>
            <span className="strip-value">{formatDoctorName(adm.primaryDoctorId)}</span>
          </div>
          <div className="case-file-strip__item">
            <span className="strip-label">Department</span>
            <span className="strip-value">{adm.admittingDepartmentId?.name || 'General Medicine'}</span>
          </div>
          <div className="case-file-strip__item">
            <span className="strip-label">Provisional Diagnosis</span>
            <span className="strip-value strip-value--dx">{adm.provisionalDiagnosis || '—'}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="case-file-nav">
          <button
            type="button"
            className={`case-file-tab ${activeTab === 'ROUNDS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ROUNDS')}
          >
            <span className="material-symbols-rounded">clinical_notes</span>
            <span>Daily SOAP Rounds ({rounds.length})</span>
          </button>
          <button
            type="button"
            className={`case-file-tab ${activeTab === 'CPOE' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('CPOE')}
          >
            <span className="material-symbols-rounded">prescriptions</span>
            <span>CPOE Physician Orders ({cpoeOrders.length})</span>
          </button>
          <button
            type="button"
            className={`case-file-tab ${activeTab === 'DISCHARGE' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('DISCHARGE')}
          >
            <span className="material-symbols-rounded">assignment_turned_in</span>
            <span>Discharge & Gate Pass</span>
          </button>
          <button
            type="button"
            className={`case-file-tab ${activeTab === 'VITALS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('VITALS')}
          >
            <span className="material-symbols-rounded">vital_signs</span>
            <span>Vitals History ({vitals.length})</span>
          </button>
        </nav>

        {/* Body Content */}
        <div className="case-file-body">
          {loading && (
            <div className="case-file-loader">
              <span className="material-symbols-rounded spin">progress_activity</span>
              <span>Loading complete clinical case file...</span>
            </div>
          )}

          {error && !loading && (
            <div className="case-file-error">
              <span className="material-symbols-rounded">error</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && activeTab === 'ROUNDS' && (
            <div className="case-file-timeline">
              {rounds.length === 0 ? (
                <div className="case-file-empty">
                  <span className="material-symbols-rounded">note_stack</span>
                  <p>No daily SOAP ward rounds recorded for this stay encounter.</p>
                </div>
              ) : (
                rounds.map((round, idx) => (
                  <div key={round._id || idx} className="case-file-round-card">
                    <div className="round-card-header">
                      <div className="round-header-left">
                        <span className="round-index">Round #{idx + 1}</span>
                        <span className="round-date">
                          {new Date(round.roundDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span
                          className="round-condition"
                          style={{ borderColor: getConditionColor(round.conditionAssessment), color: getConditionColor(round.conditionAssessment) }}
                        >
                          {round.conditionAssessment || 'STABLE'}
                        </span>
                      </div>
                      <div className="round-header-right">
                        <span>Clinician: <strong>{formatDoctorName(round.doctorId)}</strong></span>
                      </div>
                    </div>

                    <div className="round-soap-grid">
                      <div className="soap-box">
                        <span className="soap-letter">[S]</span>
                        <div className="soap-content">
                          <label>Subjective Findings & Complaints</label>
                          <p>{round.subjective || 'No complaints voiced.'}</p>
                        </div>
                      </div>

                      <div className="soap-box">
                        <span className="soap-letter">[O]</span>
                        <div className="soap-content">
                          <label>Objective & Examination Findings</label>
                          <p>{round.objective || 'Vitals checked; physical exam within expected parameters.'}</p>
                        </div>
                      </div>

                      <div className="soap-box">
                        <span className="soap-letter">[A]</span>
                        <div className="soap-content">
                          <label>Assessment & Response to Care</label>
                          <p>{round.assessment || 'Progressing appropriately.'}</p>
                        </div>
                      </div>

                      <div className="soap-box">
                        <span className="soap-letter">[P]</span>
                        <div className="soap-content">
                          <label>Treatment Plan & Daily Orders</label>
                          <p>{round.plan || 'Continue current line of therapy.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'CPOE' && (
            <div className="case-file-cpoe-table-wrap">
              {cpoeOrders.length === 0 ? (
                <div className="case-file-empty">
                  <span className="material-symbols-rounded">inventory</span>
                  <p>No physician orders logged during this encounter.</p>
                </div>
              ) : (
                <table className="case-file-table">
                  <thead>
                    <tr>
                      <th>Order Type</th>
                      <th>Order Item / Description</th>
                      <th>Instructions / Dosage</th>
                      <th>Priority</th>
                      <th>Ordered Date</th>
                      <th>Ordered By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpoeOrders.map((ord) => (
                      <tr key={ord._id}>
                        <td>
                          <span className={`cpoe-type-badge cpoe-type-badge--${(ord.orderType || '').toLowerCase()}`}>
                            {ord.orderType}
                          </span>
                        </td>
                        <td>
                          <strong>{ord.orderDetails?.medicineName || ord.orderDetails?.testName || ord.orderDetails?.dietTier || ord.orderDetails?.procedureName || 'Order Item'}</strong>
                        </td>
                        <td>
                          {ord.orderDetails?.dosage ? `${ord.orderDetails.dosage} • ${ord.orderDetails.route || ''} • ${ord.orderDetails.frequency || ''}` : (ord.instructions || 'Standard order protocol')}
                        </td>
                        <td>
                          <span className={`cpoe-urgency-badge cpoe-urgency-badge--${(ord.urgency || 'routine').toLowerCase()}`}>
                            {ord.urgency || 'ROUTINE'}
                          </span>
                        </td>
                        <td>
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>{formatDoctorName(ord.orderedBy)}</td>
                        <td>
                          <span className={`cpoe-status-pill cpoe-status-pill--${(ord.status || 'pending').toLowerCase()}`}>
                            {ord.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'DISCHARGE' && (
            <div className="case-file-discharge-pane">
              <div className="discharge-card">
                <h3>Final Clinical Discharge Summary</h3>
                <div className="discharge-grid">
                  <div className="discharge-item">
                    <label>Final Confirmed Diagnosis</label>
                    <p className="highlight-text">{adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || 'Diagnosis on record'}</p>
                  </div>
                  <div className="discharge-item">
                    <label>Course in Hospital</label>
                    <p>{adm.dischargeSummary?.courseInHospital || 'Patient admitted and treated according to clinical protocol. Responded favorably to management.'}</p>
                  </div>
                  <div className="discharge-item">
                    <label>Discharge Advice & Medications</label>
                    <p>{adm.dischargeSummary?.dischargeAdvice || 'Take prescribed medications as scheduled. Maintain proper hydration and diet.'}</p>
                  </div>
                  <div className="discharge-item">
                    <label>Recommended Follow-Up Date</label>
                    <p>
                      {adm.dischargeSummary?.followUpDate
                        ? new Date(adm.dischargeSummary.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Routine review in 7 days'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Clearance & Gate Pass Status */}
              <div className="clearance-summary-card">
                <h3>Exit Clearance & Gate Pass Verification</h3>
                <div className="clearance-status-row">
                  <div className="clearance-status-pill">
                    <span className="material-symbols-rounded">medication</span>
                    <span>Pharmacy: {clearance?.pharmacyClearance?.isCleared ? '✓ Cleared' : 'Pending'}</span>
                  </div>
                  <div className="clearance-status-pill">
                    <span className="material-symbols-rounded">hotel</span>
                    <span>Ward / Nursing: {clearance?.nursingClearance?.isCleared ? '✓ Cleared' : 'Pending'}</span>
                  </div>
                  <div className="clearance-status-pill">
                    <span className="material-symbols-rounded">payments</span>
                    <span>Billing: {clearance?.billingClearance?.isCleared ? '✓ System Verified Zero Balance' : 'Pending'}</span>
                  </div>
                </div>

                {clearance?.gatePassGenerated && (
                  <div className="gate-pass-verified-notice">
                    <span className="material-symbols-rounded">verified</span>
                    <div>
                      <strong>Official Exit Gate Pass Issued</strong>
                      <p>Gate Pass #{clearance.gatePassNumber || `GP-${adm.admissionNumber}`} • Generated on {new Date(clearance.gatePassGeneratedAt || adm.dischargeDate).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'VITALS' && (
            <div className="case-file-vitals-pane">
              {vitals.length === 0 ? (
                <div className="case-file-empty">
                  <span className="material-symbols-rounded">monitor_heart</span>
                  <p>No nursing vitals logs available for this admission stay.</p>
                </div>
              ) : (
                <table className="case-file-table">
                  <thead>
                    <tr>
                      <th>Time Logged</th>
                      <th>Blood Pressure</th>
                      <th>Heart Rate</th>
                      <th>SpO2</th>
                      <th>Temperature</th>
                      <th>Respiratory Rate</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.map((v) => (
                      <tr key={v._id}>
                        <td>{new Date(v.recordedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{v.bloodPressure?.systolic && v.bloodPressure?.diastolic ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic} mmHg` : '—'}</td>
                        <td>{v.heartRate ? `${v.heartRate} bpm` : '—'}</td>
                        <td>{v.spO2 ? `${v.spO2}%` : '—'}</td>
                        <td>{v.temperature ? `${v.temperature} °F` : '—'}</td>
                        <td>{v.respiratoryRate ? `${v.respiratoryRate}/min` : '—'}</td>
                        <td>{v.recordedBy?.firstName ? `Nurse ${v.recordedBy.firstName}` : 'Nursing Staff'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default InpatientCaseFileDialog;
