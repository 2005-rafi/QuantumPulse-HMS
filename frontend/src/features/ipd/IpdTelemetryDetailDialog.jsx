/**
 * features/ipd/IpdTelemetryDetailDialog.jsx
 * Enterprise Material 3 Inpatient Telemetry Drilldown Dialog.
 * Displays interactive list of patients and encounters when telemetry cards are tapped.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatPatientName, getPatientInitials, formatDoctorName } from '../../utils/patientFormatters';

export const IpdTelemetryDetailDialog = ({
  isOpen,
  onClose,
  type, // 'ADMITTED' | 'CRITICAL' | 'ROUNDS' | 'DISCHARGE'
  admissionList = [],
  wardRounds = [],
  currentAdmission = null,
  onSelectInpatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subFilter, setSubFilter] = useState('ALL');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset filters when opened or type changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSubFilter('ALL');
    }
  }, [isOpen, type]);

  // Dialog Configuration based on type
  const dialogConfig = useMemo(() => {
    switch (type) {
      case 'CRITICAL':
        return {
          title: 'Critical Care Inpatients (ICU / CCU / HDU)',
          subtitle: 'Inpatients admitted to high-acuity units requiring intensive monitoring',
          icon: 'e911_emergency',
          iconClass: 'critical',
        };
      case 'ROUNDS':
        return {
          title: 'Daily SOAP Ward Rounds Ledger',
          subtitle: 'Comprehensive log of physician ward rounds and clinical observations for active inpatient stays',
          icon: 'edit_note',
          iconClass: 'rounds',
        };
      case 'DISCHARGE':
        return {
          title: 'Inpatients Pending Discharge Governance',
          subtitle: 'Active 3-Way clearance Kanban tracking across Pharmacy, Nursing & Billing',
          icon: 'door_front',
          iconClass: 'discharge',
        };
      case 'ADMITTED':
      default:
        return {
          title: 'Admitted Inpatients Directory',
          subtitle: 'Active inpatient admissions currently receiving medical care across hospital wards',
          icon: 'hotel',
          iconClass: 'primary',
        };
    }
  }, [type]);

  // Filtered Admitted / Critical / Discharge Patients
  const filteredPatients = useMemo(() => {
    if (type === 'ROUNDS') return [];

    return admissionList.filter((adm) => {
      const patient = adm.patientId || {};
      const fullName = formatPatientName(patient).toLowerCase();
      const mrn = (patient.mrn || '').toLowerCase();
      const bedLabel = (adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '').toLowerCase();
      const ward = (adm.currentBedId?.wardClass || adm.currentBedId?.wardType || '').toUpperCase();
      const doctor = formatDoctorName(adm.primaryDoctorId?.fullName || `${adm.primaryDoctorId?.firstName || ''} ${adm.primaryDoctorId?.lastName || ''}`).toLowerCase();
      const diagnosis = (adm.provisionalDiagnosis || adm.dischargeSummary?.finalDiagnosis || '').toLowerCase();

      // Type-specific baseline filter
      if (type === 'CRITICAL') {
        const isCritical = ward.includes('ICU') || ward.includes('CCU') || ward.includes('HDU');
        if (!isCritical) return false;
      } else if (type === 'DISCHARGE') {
        const isDischarge = adm.status === 'DISCHARGE_INITIATED' || adm.dischargeSummary?.finalDiagnosis;
        if (!isDischarge) return false;
      }

      // Sub-filter
      if (subFilter !== 'ALL') {
        if (subFilter === 'ICU_CCU' && !ward.includes('ICU') && !ward.includes('CCU')) return false;
        if (subFilter === 'HDU' && !ward.includes('HDU')) return false;
        if (subFilter === 'GENERAL' && (ward.includes('ICU') || ward.includes('CCU') || ward.includes('HDU'))) return false;
      }

      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        fullName.includes(q) ||
        mrn.includes(q) ||
        bedLabel.includes(q) ||
        ward.toLowerCase().includes(q) ||
        doctor.includes(q) ||
        diagnosis.includes(q)
      );
    });
  }, [admissionList, type, subFilter, searchQuery]);

  // Filtered Ward Rounds
  const filteredRounds = useMemo(() => {
    if (type !== 'ROUNDS') return [];

    return wardRounds.filter((r) => {
      const doc = formatDoctorName(r.doctorId?.fullName || 'Physician').toLowerCase();
      const subjective = (r.subjective || '').toLowerCase();
      const objective = (r.objective || '').toLowerCase();
      const assessment = (r.assessment || '').toLowerCase();
      const plan = (r.plan || '').toLowerCase();

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.includes(q) ||
        subjective.includes(q) ||
        objective.includes(q) ||
        assessment.includes(q) ||
        plan.includes(q)
      );
    });
  }, [wardRounds, type, searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div className="md3-telemetry-dialog-backdrop" onClick={onClose}>
      <div className="md3-telemetry-dialog-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="md3-telemetry-dialog-header">
          <div className="md3-telemetry-dialog-header-left">
            <div className={`md3-telemetry-dialog-icon ${dialogConfig.iconClass}`}>
              <span className="material-symbols-rounded">{dialogConfig.icon}</span>
            </div>
            <div>
              <h2 className="md3-telemetry-dialog-title">{dialogConfig.title}</h2>
              <p className="md3-telemetry-dialog-subtitle">{dialogConfig.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="md3-dialog-close-btn"
            onClick={onClose}
            title="Close dialog (Esc)"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="md3-telemetry-dialog-toolbar">
          <div className="md3-telemetry-search-wrap">
            <span className="material-symbols-rounded md3-telemetry-search-icon">search</span>
            <input
              type="text"
              className="md3-search-input"
              placeholder={
                type === 'ROUNDS'
                  ? 'Search by doctor name, subjective notes, assessment, plan…'
                  : 'Search by patient name, MRN, bed number, ward, diagnosis, doctor…'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="md3-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          {type !== 'ROUNDS' && (
            <div className="md3-telemetry-subfilter-chips">
              {[
                { id: 'ALL', label: 'All Units' },
                { id: 'ICU_CCU', label: 'ICU / CCU' },
                { id: 'HDU', label: 'HDU' },
                { id: 'GENERAL', label: 'General Ward' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`md3-telemetry-subchip ${subFilter === chip.id ? 'active' : ''}`}
                  onClick={() => setSubFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Patient List Body */}
        <div className="md3-telemetry-dialog-body">
          {type === 'ROUNDS' ? (
            /* SOAP Rounds List */
            filteredRounds.length === 0 ? (
              <div className="md3-telemetry-empty-state">
                <span className="material-symbols-rounded">edit_note</span>
                <h4>No ward round notes match your criteria</h4>
                <p>Try clearing your search query or check back once rounds have been recorded.</p>
              </div>
            ) : (
              <div className="md3-telemetry-rounds-list">
                {filteredRounds.map((r, i) => (
                  <div key={r._id || i} className="md3-telemetry-round-card">
                    <div className="md3-telemetry-round-header">
                      <span className="md3-telemetry-round-doc">
                        Round #{wardRounds.length - i} • {formatDoctorName(r.doctorId?.fullName || 'Attending Physician')}
                      </span>
                      <span className="md3-telemetry-round-time">
                        {new Date(r.createdAt || r.roundDate).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="md3-telemetry-soap-grid">
                      <div className="md3-telemetry-soap-block">
                        <strong>[S] Subjective:</strong> {r.subjective}
                      </div>
                      {r.objective && (
                        <div className="md3-telemetry-soap-block">
                          <strong>[O] Objective:</strong> {r.objective}
                        </div>
                      )}
                      <div className="md3-telemetry-soap-block">
                        <strong>[A] Assessment:</strong> {r.assessment}
                      </div>
                      <div className="md3-telemetry-soap-block">
                        <strong>[P] Plan:</strong> {r.plan}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Patients List (Admitted, Critical, Discharge) */
            filteredPatients.length === 0 ? (
              <div className="md3-telemetry-empty-state">
                <span className="material-symbols-rounded">{dialogConfig.icon}</span>
                <h4>No patient records match your criteria</h4>
                <p>Try adjusting your search keywords or switching ward unit filters.</p>
              </div>
            ) : (
              <div className="md3-telemetry-patients-grid">
                {filteredPatients.map((adm) => {
                  const patient = adm.patientId || {};
                  const fullName = formatPatientName(patient);
                  const initials = getPatientInitials(patient);
                  const bed = adm.currentBedId;
                  const room = adm.currentRoomId;
                  const doctor = adm.primaryDoctorId;
                  const attendingName = formatDoctorName(doctor?.fullName || `${doctor?.firstName || ''} ${doctor?.lastName || ''}`.trim() || 'Physician');

                  const isSelected = currentAdmission?._id === adm._id;
                  const ward = (bed?.wardClass || bed?.wardType || 'General Ward').toUpperCase();
                  const isCritical = ward.includes('ICU') || ward.includes('CCU') || ward.includes('HDU');

                  let dayOfStay = 1;
                  if (adm.admissionDate) {
                    const diffMs = Date.now() - new Date(adm.admissionDate).getTime();
                    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                  }

                  return (
                    <div
                      key={adm._id}
                      className={`md3-telemetry-patient-card ${isSelected ? 'selected' : ''} ${isCritical ? 'critical-border' : ''}`}
                      onClick={() => {
                        if (onSelectInpatient) {
                          onSelectInpatient(adm._id);
                          onClose();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && onSelectInpatient) {
                          onSelectInpatient(adm._id);
                          onClose();
                        }
                      }}
                      title="Click to switch Cockpit to this patient"
                    >
                      {/* Card Top: Avatar & Name */}
                      <div className="md3-tpc-top">
                        <div className="md3-tpc-avatar-wrap">
                          <div className={`md3-tpc-avatar ${isCritical ? 'critical' : 'primary'}`}>
                            {initials}
                          </div>
                          <div>
                            <h4 className="md3-tpc-name">{fullName}</h4>
                            <span className="md3-tpc-demographics">
                              MRN: <strong>{patient.mrn || 'N/A'}</strong> • {patient.age ? `${patient.age}y` : ''}{patient.gender ? ` / ${patient.gender}` : ''}
                            </span>
                          </div>
                        </div>

                        <span className={`md3-tpc-bed-badge ${isCritical ? 'critical' : 'primary'}`}>
                          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>hotel</span>
                          <span>Bed {bed?.bedLabel || bed?.bedNumber || '—'}</span>
                        </span>
                      </div>

                      {/* Card Details: Ward, Room, Blood, Doctor, Stay */}
                      <div className="md3-tpc-details-grid">
                        <div>
                          <span className="md3-tpc-lbl">Ward / Unit:</span>
                          <span className="md3-tpc-val">{bed?.wardClass || bed?.wardType || 'General Ward'} (Room {room?.roomNumber || '—'})</span>
                        </div>

                        <div>
                          <span className="md3-tpc-lbl">Attending Clinician:</span>
                          <span className="md3-tpc-val">{attendingName}</span>
                        </div>

                        <div>
                          <span className="md3-tpc-lbl">Length of Stay:</span>
                          <span className="md3-tpc-val"><strong>Day {dayOfStay}</strong> (Admitted: {adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString('en-IN') : '—'})</span>
                        </div>

                        <div>
                          <span className="md3-tpc-lbl">Diet Plan:</span>
                          <span className="md3-tpc-val">{(adm.dietTier || 'REGULAR_DIET').replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      {/* Diagnosis snippet */}
                      {(adm.provisionalDiagnosis || adm.dischargeSummary?.finalDiagnosis) && (
                        <div className="md3-tpc-diagnosis">
                          <strong>Diagnosis:</strong> {adm.provisionalDiagnosis || adm.dischargeSummary?.finalDiagnosis}
                        </div>
                      )}

                      {/* Card Footer with CTA */}
                      <div className="md3-tpc-footer">
                        <span className={`md3-tpc-status ${adm.status === 'ADMITTED' ? 'admitted' : 'discharge'}`}>
                          {adm.status ? adm.status.replace(/_/g, ' ') : 'ADMITTED'}
                        </span>

                        <button
                          type="button"
                          className="md3-tpc-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectInpatient) {
                              onSelectInpatient(adm._id);
                              onClose();
                            }
                          }}
                        >
                          <span>{isSelected ? 'Active Inpatient' : 'Select Patient'}</span>
                          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                            {isSelected ? 'check' : 'arrow_forward'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="md3-telemetry-dialog-footer">
          <span className="md3-telemetry-footer-count">
            {type === 'ROUNDS'
              ? `${filteredRounds.length} Ward ${filteredRounds.length === 1 ? 'Round' : 'Rounds'} Listed`
              : `${filteredPatients.length} ${filteredPatients.length === 1 ? 'Inpatient' : 'Inpatients'} Listed`}
          </span>
          <button type="button" className="md3-dialog-btn secondary" onClick={onClose}>
            Close Dialog
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IpdTelemetryDetailDialog;
