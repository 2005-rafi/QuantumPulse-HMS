import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { patientAPI } from '../../services/patientAPI';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import { appointmentAPI } from '../../services/appointmentAPI';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PrintablePatientIdCard from '../../components/patients/PrintablePatientIdCard';
import { formatDoctorName } from '../../utils/patientFormatters';
import { Md3Button, Md3TextField, Md3Select, Md3BottomSheet } from '../../components/md3/Md3FormComponents';
import { AppointmentForm } from '../appointments/AppointmentForm';
import { AppointmentStatusBadge } from '../appointments/AppointmentStatusBadge';
import CheckInDialog from '../appointments/CheckInDialog';
import CancelDialog from '../appointments/CancelDialog';
import RescheduleDialog from '../appointments/RescheduleDialog';
import NewVisitDialog from './NewVisitDialog';
import {
  Md3Card,
  Md3CardHeader,
  Md3Chip,
  Md3StatCard,
  Md3Section,
  Md3Grid,
  Md3GridItem,
  Md3InfoRow,
  Md3Avatar,
  Md3IconButton,
  Md3Tabs,
  Md3EmptyState,
  Md3DataTable,
  Md3ActionBar,
  Md3Divider,
  Icon,
} from '../../components/md3/Md3Widgets';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './PatientProfile.css';

/* ============================================================
   PatientProfile — SOLID & MD3 Compressed Layout
   ============================================================ */

/* ─── Helper: Get Latest Triage Vitals ─── */
const getLatestVitals = (visits) => {
  if (!visits || visits.length === 0) return null;
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  for (const v of sorted) {
    if (v.vitals) {
      const hasVals = Object.keys(v.vitals).some(
        (k) => k !== 'chiefComplaint' && k !== 'dynamicVitals' && v.vitals[k] !== '' && v.vitals[k] !== null && v.vitals[k] !== undefined
      );
      if (hasVals) return v.vitals;
    }
  }
  return null;
};

/* ─── Sub-Component: Compressed Patient Hero (Identity, Demographics & Stats) ─── */
const PatientHero = ({
  patient,
  visits,
  userRole,
  onNewVisit,
  onPrintId,
  onSchedule,
  onDirectPharmacy,
  userId,
}) => {
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();
  const age = patient.age ?? (patient.dob ? computeAge(patient.dob) : null);
  const dobFormatted = patient.dob
    ? new Date(patient.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Stats calculation
  const completed = visits.filter((v) => v.status === 'COMPLETED').length;
  const active = visits.filter((v) => !['COMPLETED', 'CANCELLED'].includes(v.status)).length;
  const totalBill = visits.reduce((sum, v) => sum + (v.billing?.totalAmount || 0), 0);

  return (
    <div className="pp-hero-card">
      <div className="pp-hero__main-row">
        {/* Patient Identity */}
        <div className="pp-hero__identity">
          <div className="pp-hero__avatar-wrap">
            <Md3Avatar initials={initials} size="large" variant="primary" />
          </div>
          <div className="pp-hero__id-details">
            <div className="pp-hero__name-row">
              <h2 className="pp-hero__name">{fullName || 'Unnamed Patient'}</h2>
              {patient.mrn && <span className="pp-hero__mrn-chip">MRN {patient.mrn}</span>}
            </div>
            <div className="pp-hero__meta-row">
              {age != null && <span>{age} yrs</span>}
              <span className="pp-hero__meta-dot">•</span>
              {patient.gender && <span>{patient.gender}</span>}
              {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                <>
                  <span className="pp-hero__meta-dot">•</span>
                  <span className="pp-hero__blood-chip">
                    <Icon.Droplet />
                    {patient.bloodGroup}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Stats Pills */}
        {visits.length > 0 && (
          <div className="pp-hero__stats">
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">{visits.length}</span>
              <span className="pp-hero__stat-label">Visits</span>
            </div>
            <div className="pp-hero__stat-sep" />
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">{active}</span>
              <span className="pp-hero__stat-label">Active</span>
            </div>
            <div className="pp-hero__stat-sep" />
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">{CURRENCY_SYMBOL}{totalBill.toLocaleString()}</span>
              <span className="pp-hero__stat-label">Billed</span>
            </div>
          </div>
        )}
      </div>

      {/* Demographics & Action Strip */}
      <div className="pp-hero__sub-row">
        <div className="pp-hero__demographics">
          <div className="pp-hero__demo-item">
            <span className="pp-hero__demo-label">DOB:</span>
            <span className="pp-hero__demo-val">{dobFormatted}</span>
          </div>
          {patient.parentsName && (
            <div className="pp-hero__demo-item">
              <span className="pp-hero__demo-label">Guardian:</span>
              <span className="pp-hero__demo-val">{patient.parentsName}</span>
            </div>
          )}
          {patient.aadhaar && (
            <div className="pp-hero__demo-item">
              <span className="pp-hero__demo-label">Aadhaar:</span>
              <span className="pp-hero__demo-val">{patient.aadhaar}</span>
            </div>
          )}
          {patient.phone && (
            <div className="pp-hero__demo-item">
              <span className="pp-hero__demo-label">Phone:</span>
              <span className="pp-hero__demo-val">{patient.phone}</span>
            </div>
          )}
        </div>

        <div className="pp-hero__actions">
          {userRole === 'Reception' && (
            <>
              <Md3Button variant="secondary" onClick={onPrintId} style={{ width: 'auto' }}>
                <Icon.Print />
                <span>Print ID Card</span>
              </Md3Button>
              <Md3Button variant="tonal" onClick={onSchedule} style={{ width: 'auto' }}>
                <Icon.Calendar />
                <span>Schedule Appt</span>
              </Md3Button>
              <Md3Button variant="filled" onClick={onNewVisit} style={{ width: 'auto' }}>
                <Icon.Plus />
                <span>New Visit / Check-In</span>
              </Md3Button>
            </>
          )}
          {userRole === 'Pharmacy' && (
            <Md3Button variant="filled" onClick={onDirectPharmacy} style={{ width: 'auto' }}>
              Create Direct Bill
            </Md3Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-Component: High-Density Patient Snapshot Sidebar ─── */
const PatientSidebar = ({ patient, latestVitals }) => {
  const addr = patient.address || {};
  const addressText = typeof addr === 'string'
    ? addr
    : [addr.street, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ') || '—';

  const h = latestVitals?.height ? Number(latestVitals.height) / 100 : 0;
  const w = latestVitals?.weight ? Number(latestVitals.weight) : 0;
  const bmi = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : null;

  return (
    <div className="pp-sidebar-card">
      {/* Contact Section */}
      <h3 className="pp-sidebar-section-title">
        <Icon.Phone />
        <span>Contact & Address</span>
      </h3>
      <div className="pp-sidebar-contact-list">
        <div className="pp-sidebar-contact-item">
          <Icon.Phone />
          <div>
            <div className="pp-sidebar-contact-label">Mobile</div>
            <div className="pp-sidebar-contact-val">{patient.phone || '—'}</div>
          </div>
        </div>
        {patient.email && (
          <div className="pp-sidebar-contact-item">
            <Icon.Mail />
            <div>
              <div className="pp-sidebar-contact-label">Email</div>
              <div className="pp-sidebar-contact-val">{patient.email}</div>
            </div>
          </div>
        )}
        <div className="pp-sidebar-contact-item">
          <Icon.Location />
          <div>
            <div className="pp-sidebar-contact-label">Location</div>
            <div className="pp-sidebar-contact-val">{addressText}</div>
          </div>
        </div>
        {patient.emergencyContact?.name && (
          <div className="pp-sidebar-contact-item">
            <Icon.Alert />
            <div>
              <div className="pp-sidebar-contact-label">Emergency ({patient.emergencyContact.relation || 'Contact'})</div>
              <div className="pp-sidebar-contact-val">{patient.emergencyContact.name} · {patient.emergencyContact.phone || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Alerts / Allergies Callout */}
      {(patient.allergies || patient.operations) && (
        <div className="pp-sidebar-alerts">
          {patient.allergies && (
            <div className="pp-alert-row">
              <Icon.Droplet />
              <div>
                <span className="pp-alert-label">Allergies: </span>
                <span className="pp-alert-val">{patient.allergies}</span>
              </div>
            </div>
          )}
          {patient.operations && (
            <div className="pp-alert-row">
              <Icon.Shield />
              <div>
                <span className="pp-alert-label">Surgeries: </span>
                <span className="pp-alert-val">{patient.operations}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Latest Vitals Micro-Grid */}
      <h3 className="pp-sidebar-section-title" style={{ marginTop: '4px' }}>
        <Icon.Heart />
        <span>Latest Vitals</span>
      </h3>
      {latestVitals ? (
        <div className="pp-vitals-grid">
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">BP</span>
              <Icon.Activity />
            </div>
            <div className="pp-vital-value">{latestVitals.bloodPressure || '—'}</div>
          </div>
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">Temp</span>
              <Icon.Thermometer />
            </div>
            <div className="pp-vital-value">{latestVitals.temperature ? `${latestVitals.temperature}°F` : '—'}</div>
          </div>
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">Pulse</span>
              <Icon.Heart />
            </div>
            <div className="pp-vital-value">{latestVitals.pulse ? `${latestVitals.pulse} bpm` : '—'}</div>
          </div>
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">SpO₂</span>
              <Icon.Activity />
            </div>
            <div className="pp-vital-value">{latestVitals.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : '—'}</div>
          </div>
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">Weight</span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>scale</span>
            </div>
            <div className="pp-vital-value">{latestVitals.weight ? `${latestVitals.weight} kg` : '—'}</div>
          </div>
          <div className="pp-vital-tile">
            <div className="pp-vital-tile-head">
              <span className="pp-vital-label">Height</span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>straighten</span>
            </div>
            <div className="pp-vital-value">{latestVitals.height ? `${latestVitals.height} cm` : '—'}</div>
          </div>
          {bmi && (
            <div className="pp-vital-bmi-pill">
              <span>BMI: <strong>{bmi}</strong></span>
              <span>·</span>
              <span>{Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '0.8125rem', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic', padding: '4px 0' }}>
          No vitals on record yet.
        </div>
      )}
    </div>
  );
};

/* ─── Sub-Component: Clinical Overview Tab (Bento Layout) ─── */
const OverviewTabContent = ({ visits, userRole, onCancelVisit }) => {
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const activeVisits = sorted.filter((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED');
  const latestConsultation = sorted.find((v) => v.status === 'COMPLETED' && v.consultation);

  return (
    <div className="pp-overview-bento">
      {/* ── Active Clinical Encounters Banner ── */}
      {activeVisits.length > 0 && (
        <div style={{
          background: 'var(--md-sys-color-surface-container-low)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: '20px',
          padding: '18px 20px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)', fontSize: '22px' }}>person_play</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>Active Clinical Encounters ({activeVisits.length})</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Queue tokens active in hospital workflow</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeVisits.map((v) => {
              const canCancel = (v.status === 'WAITING_TRIAGE' || v.status === 'CALLED') && !v.vitals?.recordedAt;
              return (
                <div key={v._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', padding: '4px 10px', borderRadius: '8px' }}>
                      {v.tokenString || v.visitNumber}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--md-sys-color-on-surface)' }}>
                        {v.departmentId?.name || 'General OPD'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                        {v.consultation?.doctorId?.fullName ? formatDoctorName(v.consultation.doctorId.fullName) : 'Any Available Doctor'} · Registered {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Md3Chip variant={v.status === 'WAITING_TRIAGE' ? 'primary' : 'secondary'} size="small">
                      {v.status.replace(/_/g, ' ')}
                    </Md3Chip>

                    {userRole === 'Reception' && (
                      canCancel ? (
                        <button
                          onClick={() => onCancelVisit(v)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            background: 'var(--md-sys-color-error-container)',
                            color: 'var(--md-sys-color-on-error-container)',
                            border: 'none',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 150ms ease'
                          }}
                          title="Cancel this visit before nursing triage and revoke queue token"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>cancel</span>
                          Cancel Visit
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }} title="Triage has been recorded. Cancellation is restricted.">
                          Locked after Triage
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Consultation Hero Card ── */}
      {!latestConsultation ? (
        <Md3Card variant="outlined" padding="large">
          <Md3EmptyState
            icon={<Icon.FileText />}
            title="No Completed Consultation on Record"
            subtitle="Historical completed doctor encounters will appear here once finalized."
          />
        </Md3Card>
      ) : (
        <>
          <div className="pp-overview-hero-card">
            <div className="pp-overview-meta-bar">
              <div className="pp-overview-doctor-badge">
                <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary)', fontSize: '20px' }}>clinical_notes</span>
                <span>Last Consultation: <strong>{latestConsultation.departmentId?.name || 'General OPD'}</strong></span>
              </div>
              <span className="pp-overview-date-pill">
                {new Date(latestConsultation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* 2-Column Clinical Grid */}
            <div className="pp-overview-clinical-grid">
              <div className="pp-clinical-bento-tile">
                <span className="pp-clinical-bento-label">Chief Complaint</span>
                <span className="pp-clinical-bento-val">
                  {latestConsultation.vitals?.chiefComplaint || latestConsultation.consultation?.chiefComplaint || 'No specific complaints recorded'}
                </span>
              </div>

              <div className="pp-clinical-bento-tile">
                <span className="pp-clinical-bento-label">Clinical Diagnosis</span>
                <span className="pp-clinical-bento-val diagnosis">
                  {latestConsultation.consultation?.diagnosis || 'Diagnosis pending'}
                </span>
              </div>

              <div className="pp-clinical-bento-tile">
                <span className="pp-clinical-bento-label">Treatment Plan</span>
                <span className="pp-clinical-bento-val">
                  {latestConsultation.consultation?.treatmentPlan || 'Standard medical management'}
                </span>
              </div>

              <div className="pp-clinical-bento-tile">
                <span className="pp-clinical-bento-label">Clinical Notes</span>
                <span className="pp-clinical-bento-val">
                  {latestConsultation.consultation?.notes || 'Patient evaluated and advised.'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Prescriptions Grid */}
          {Array.isArray(latestConsultation.consultation?.prescribedMedications) && latestConsultation.consultation.prescribedMedications.length > 0 && (
            <div className="pp-prescriptions-wrap">
              <h3 className="pp-prescriptions-title">
                <Icon.Pill />
                <span>Active Prescriptions ({latestConsultation.consultation.prescribedMedications.length})</span>
              </h3>
              <div className="pp-prescriptions-grid">
                {latestConsultation.consultation.prescribedMedications.map((med, index) => (
                  <div key={index} className="pp-rx-card">
                    <div className="pp-rx-header">
                      <span className="pp-rx-name">{med.name}</span>
                      <span className="pp-rx-qty-badge">Qty: {med.quantity}</span>
                    </div>
                    <div className="pp-rx-badges-row">
                      <span className="pp-rx-badge">Dosage: {med.dosage}</span>
                      <span className="pp-rx-badge">Freq: {med.frequency}</span>
                      {med.duration && <span className="pp-rx-badge">Dur: {med.duration}</span>}
                    </div>
                    {med.instructions && (
                      <div className="pp-rx-instructions">
                        {med.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Sub-Component: Lab Orders History Tab ─── */
const LabOrdersSection = ({ visits }) => {
  const allOrders = [];
  visits.forEach(v => {
    if (Array.isArray(v.labOrders) && v.labOrders.length > 0) {
      v.labOrders.forEach(o => {
        allOrders.push({
          ...o,
          visitDate: v.createdAt,
          department: v.departmentId?.name || 'General'
        });
      });
    }
  });

  if (allOrders.length === 0) {
    return (
      <Md3Card variant="outlined" padding="large">
        <Md3EmptyState
          icon={<Icon.Beaker />}
          title="No Lab Orders Requested"
          subtitle="There are no laboratory investigation requests associated with this patient's visits."
        />
      </Md3Card>
    );
  }

  // Sort by date descending
  allOrders.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  const columns = [
    { key: 'testName', header: 'Test Name' },
    { key: 'labName', header: 'Laboratory' },
    { key: 'visitDate', header: 'Ordered On',
      render: (row) => new Date(row.visitDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    },
    { key: 'status', header: 'Status',
      render: (row) => {
        const statusColors = {
          'COMPLETED': 'tertiary',
          'PROCESSING': 'secondary',
          'COLLECTED': 'secondary',
          'PENDING': 'default',
          'AWAITING_SAMPLE': 'default'
        };
        return (
          <Md3Chip variant={statusColors[row.status] || 'default'} size="small">
            {row.status.replace(/_/g, ' ')}
          </Md3Chip>
        );
      }
    },
    { key: 'results', header: 'Results / Reports',
      render: (row) => {
        if (row.status !== 'COMPLETED') return <span className="pp-lab-pending">Awaiting Results</span>;
        const keys = row.results ? Object.keys(row.results) : [];
        if (keys.length === 0) return <span className="pp-lab-notes">{row.notes || 'No results recorded'}</span>;
        return (
          <div className="pp-lab-results-cell">
            {keys.map(k => (
              <span key={k} className="pp-lab-result-metric">
                {k.replace(/([A-Z])/g, ' $1').trim()}: <strong>{row.results[k]}</strong>
              </span>
            ))}
            {row.notes && <div className="pp-lab-notes"><strong>Note:</strong> {row.notes}</div>}
          </div>
        );
      }
    }
  ];

  return (
    <Md3Section
      title="Laboratory Investigation History"
      subtitle={`${allOrders.length} test order${allOrders.length !== 1 ? 's' : ''} on record`}
      icon={<Icon.Beaker />}
    >
      <Md3DataTable columns={columns} rows={allOrders} />
    </Md3Section>
  );
};

/* ─── Sub-Component: Visit History Table ─── */
const VisitHistorySection = ({ visits, userRole, onCancelVisit }) => {
  const columns = [
    { key: 'visitNumber', header: 'Token / Visit No.',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {row.tokenString || row.visitNumber}
        </span>
      )
    },
    { key: 'createdAt', header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    },
    { key: 'status', header: 'Status',
      render: (row) => {
        const variant = row.status === 'COMPLETED' ? 'tertiary'
          : row.status === 'CANCELLED' ? 'error'
          : 'secondary';
        return (
          <div>
            <Md3Chip variant={variant} size="small">
              {row.status.replace(/_/g, ' ')}
            </Md3Chip>
            {row.status === 'CANCELLED' && row.cancellationReason && (
              <div style={{ fontSize: '11px', color: 'var(--md-sys-color-error)', marginTop: '2px' }}>
                Reason: {row.cancellationReason}
              </div>
            )}
          </div>
        );
      }
    },
    { key: 'department', header: 'Department',
      render: (row) => row.departmentId?.name || 'General OPD'
    },
    { key: 'doctor', header: 'Doctor',
      render: (row) => row.consultation?.doctorId ? 'Consulted' : 'N/A (Direct)'
    },
    { key: 'totalAmount', header: `Total Bill (${CURRENCY_SYMBOL})`, align: 'right',
      render: (row) => {
        const reg = row.receptionPayment?.registrationFee || 0;
        const cons = row.receptionPayment?.consultationFee || 0;
        const total = reg + cons;
        return total > 0 ? `${CURRENCY_SYMBOL}${total.toFixed(2)}` : '—';
      }
    },
    ...(userRole === 'Reception' ? [{
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const canCancel = (row.status === 'WAITING_TRIAGE' || row.status === 'CALLED') && !row.vitals?.recordedAt;
        if (canCancel) {
          return (
            <button
              onClick={() => onCancelVisit(row)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                border: 'none',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Cancel this visit before nursing triage and revoke queue token"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>cancel</span>
              Cancel
            </button>
          );
        }
        if (row.status === 'CANCELLED') {
          return <span style={{ fontSize: '11px', color: 'var(--md-sys-color-error)' }}>Revoked</span>;
        }
        return <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>—</span>;
      }
    }] : [])
  ];

  return (
    <Md3Section
      title="Visit & Billing History"
      subtitle={`${visits.length} visit${visits.length !== 1 ? 's' : ''} on record`}
      icon={<Icon.History />}
    >
      {visits.length > 0 ? (
        <Md3DataTable columns={columns} rows={visits} />
      ) : (
        <Md3EmptyState
          icon={<Icon.FileText />}
          title="No visit history yet"
          subtitle="This patient's journey begins with their first check-in. Create a new visit to get started."
        />
      )}
    </Md3Section>
  );
};

/* ─── Sub-Component: Patient Appointments Tab ─── */
const PatientAppointmentsSection = ({
  appointments = [],
  loading = false,
  onBookNew,
  onCheckIn,
  onReschedule,
  onCancel,
}) => {
  const safeList = Array.isArray(appointments) ? appointments : [];

  const columns = [
    {
      key: 'appointmentNumber',
      header: 'Appt #',
      render: (row) => (
        <span style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
          {row.appointmentNumber || '—'}
        </span>
      ),
    },
    {
      key: 'appointmentDate',
      header: 'Date & Slot',
      render: (row) => {
        const timeStr = (row.startTime && row.endTime)
          ? `${row.startTime} – ${row.endTime}`
          : row.slot?.startTime
          ? `${row.slot.startTime} – ${row.slot.endTime}`
          : '—';
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>
              {row.appointmentDate ? new Date(row.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {timeStr}
            </span>
          </div>
        );
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.departmentId?.name || 'General',
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => (row.doctorId?.fullName ? formatDoctorName(row.doctorId.fullName) : 'Any Available'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AppointmentStatusBadge status={row.status} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => row.reason || 'Routine Consultation',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {row.status === 'SCHEDULED' && (
            <>
              <Md3Button
                variant="primary"
                onClick={() => onCheckIn(row)}
                style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Check In
              </Md3Button>
              <Md3Button
                variant="secondary"
                onClick={() => onReschedule(row)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Reschedule
              </Md3Button>
              <Md3Button
                variant="error"
                onClick={() => onCancel(row)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Cancel
              </Md3Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Md3Section
      title="Scheduled Doctor Appointments"
      subtitle={`${safeList.length} appointment${safeList.length !== 1 ? 's' : ''} on record`}
      icon={<Icon.Calendar />}
      headerAction={
        <Md3Button
          variant="primary"
          onClick={onBookNew}
          style={{ width: 'auto' }}
        >
          <Icon.Plus />
          <span>Book Appointment</span>
        </Md3Button>
      }
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
          Loading scheduled appointments...
        </div>
      ) : safeList.length > 0 ? (
        <Md3DataTable columns={columns} rows={safeList} />
      ) : (
        <Md3EmptyState
          icon={<Icon.Calendar />}
          title="No scheduled appointments"
          subtitle="This patient currently has no upcoming appointments scheduled. Book an appointment to assign a doctor and time slot."
          action={
            <Md3Button variant="primary" onClick={onBookNew}>
              <Icon.Plus />
              <span>Schedule First Appointment</span>
            </Md3Button>
          }
        />
      )}
    </Md3Section>
  );
};

/* ─── Helpers ─── */
const computeAge = (dobStr) => {
  try {
    const dob = new Date(dobStr);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  } catch { return null; }
};

/* ─── Sub-Component: Cancel Visit Dialog (Token Revocation before Triage) ─── */
const CancelVisitDialog = ({ visit, isOpen, onClose, onConfirm, loading, error }) => {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen || !visit) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setLocalError('Please enter a cancellation reason (minimum 3 characters)');
      return;
    }
    setLocalError('');
    await onConfirm(visit._id, reason.trim());
  };

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon cancel">
              <Icon.Alert />
            </div>
            <div>
              <h3 className="appt-modal-title">Cancel Clinical Visit</h3>
              <p className="appt-modal-subtitle">
                Token: <strong>{visit.tokenString || visit.visitNumber}</strong> · {visit.departmentId?.name || 'General OPD'}
              </p>
            </div>
          </div>
          <button className="appt-modal-close" onClick={onClose} aria-label="Close dialog">
            <Icon.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="appt-modal-body">
          {(error || localError) && (
            <div className="appt-dialog-error" role="alert">
              <Icon.Alert />
              <span>{error || localError}</span>
            </div>
          )}

          <p className="appt-cancel-warning" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
            Are you sure you want to cancel this visit and revoke queue token <strong>{visit.tokenString || visit.visitNumber}</strong>?
            This will permanently remove the patient from the active nursing triage queue.
          </p>

          <div className="appt-form-field" style={{ marginTop: '12px' }}>
            <label htmlFor="cancel-visit-reason" className="appt-field-label">
              Cancellation Reason <span className="req">*</span>
            </label>
            <textarea
              id="cancel-visit-reason"
              rows={3}
              className="appt-textarea"
              placeholder="e.g., Patient requested cancellation, wrong department chosen, unable to wait for triage..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container)' }}
            />
          </div>

          <div className="appt-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Md3Button type="button" variant="secondary" onClick={onClose} disabled={loading} style={{ width: 'auto' }}>
              Keep Visit
            </Md3Button>
            <Md3Button
              type="submit"
              variant="error"
              loading={loading}
              loadingText="Revoking Token…"
              style={{ width: 'auto' }}
            >
              <Icon.Trash />
              <span>Revoke Token & Cancel</span>
            </Md3Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ============================================================
   Main PatientProfile Component
   ============================================================ */
const PatientProfile = ({ patientId, onBack, onDirectPharmacy, onVisitCreated, headerActions }) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [appointmentForCheckIn, setAppointmentForCheckIn] = useState(null);
  const [appointmentForCancel, setAppointmentForCancel] = useState(null);
  const [appointmentForReschedule, setAppointmentForReschedule] = useState(null);
  const [visitForCancel, setVisitForCancel] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isNewVisitModalOpen, setIsNewVisitModalOpen] = useState(false);

  /* ─── Data Fetching ─── */
  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    setLoadingAppointments(true);
    try {
      const res = await appointmentAPI.list({ patientId });
      const raw = res.data?.data;
      const items = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw)
        ? raw
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];
      setAppointments(items);
    } catch (err) {
      console.error('[PatientProfile] appointments fetch error', err);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [patientId]);

  const fetchProfile = useCallback(async () => {
    try {
      const [patientRes, visitsRes] = await Promise.all([
        patientAPI.getById(patientId),
        visitAPI.getPatientVisits(patientId),
      ]);
      setPatient(patientRes.data);
      setVisits(visitsRes.data?.data || []);
    } catch (err) {
      console.error('[PatientProfile] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      await fetchProfile();
      await fetchAppointments();
    };
    loadAll();
    return () => { cancelled = true; };
  }, [fetchProfile, fetchAppointments]);

  /* ─── Handlers ─── */
  const handleDirectPharmacy = async () => {
    try {
      const res = await visitAPI.create({ patientId: patient._id, isDirectPharmacy: true });
      if (onDirectPharmacy) onDirectPharmacy(res.data.data);
    } catch {
      console.error('Failed to create direct pharmacy visit');
    }
  };

  /* ─── Appointment Actions ─── */
  const handleCheckInAppt = async (apptId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await appointmentAPI.checkIn(apptId);
      setAppointmentForCheckIn(null);
      fetchAppointments();
      if (onVisitCreated && res.data?.data?.visit) {
        onVisitCreated({ patient, visit: res.data.data.visit });
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleAppt = async (apptId, payload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await appointmentAPI.reschedule(apptId, payload);
      setAppointmentForReschedule(null);
      fetchAppointments();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Reschedule failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppt = async (apptId, reason) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await appointmentAPI.cancel(apptId, { cancellationReason: reason });
      setAppointmentForCancel(null);
      fetchAppointments();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelVisit = async (visitId, reason) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await visitAPI.cancelVisit(visitId, { cancellationReason: reason });
      setVisitForCancel(null);
      fetchProfile();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Visit cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Loading state ─── */
  if (loading || !patient) {
    return (
      <Md3Card padding="spacious">
        <Md3EmptyState
          icon={<span className="md3-spinner md3-spinner--sm" />}
          title="Loading patient profile…"
        />
      </Md3Card>
    );
  }

  const latestVitals = getLatestVitals(visits);

  return (
    <div className="pp-page">
      {/* ─── Top Navigation & Breadcrumbs (when onBack or headerActions is provided) ─── */}
      {(onBack || headerActions) && (
        <div className="pp-top-nav-bar">
          <div className="pp-top-nav-left">
            {onBack && (
              <button
                type="button"
                className="pp-back-btn"
                onClick={onBack}
                aria-label="Back to Patient Directory"
              >
                <span className="material-symbols-rounded">arrow_back</span>
                <span>Back to Patients</span>
              </button>
            )}
            <div className="pp-breadcrumb-trail">
              <span className="pp-breadcrumb-parent">Patient Directory</span>
              <span className="pp-breadcrumb-separator">›</span>
              <span className="pp-breadcrumb-current">{patient.firstName} {patient.lastName}</span>
              {patient.mrn && <span className="pp-breadcrumb-mrn">({patient.mrn})</span>}
            </div>
          </div>
          {headerActions && (
            <div className="pp-top-nav-right">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* ─── Compressed Patient Hero Card ─── */}
      <PatientHero
        patient={patient}
        visits={visits}
        userRole={user?.role}
        onNewVisit={() => setIsNewVisitModalOpen(true)}
        onSchedule={() => setIsScheduleModalOpen(true)}
        onPrintId={() => setActiveTab('idcard')}
        onDirectPharmacy={handleDirectPharmacy}
        userId={user?._id}
      />

      {/* ─── Bento-Box Responsive Grid ─── */}
      <div className="pp-layout">
        {/* Sidebar: Demographics & Vitals */}
        <div className="pp-layout__sidebar">
          <PatientSidebar patient={patient} latestVitals={latestVitals} />
        </div>

        {/* Content Pane */}
        <div className="pp-layout__content">
          {/* Dynamic Tabs */}
          <Md3Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'overview', label: 'Clinical Overview', icon: <Icon.Person /> },
              { id: 'appointments', label: 'Appointments', icon: <Icon.Calendar /> },
              { id: 'history', label: 'Visit History', icon: <Icon.History /> },
              { id: 'labs', label: 'Lab Reports', icon: <Icon.Beaker /> },
              { id: 'idcard', label: 'Print ID Card', icon: <Icon.Print /> },
            ]}
          />

          {/* Tab Views */}
          <div className="pp-tab-views">
            {activeTab === 'overview' && (
              <OverviewTabContent
                visits={visits}
                userRole={user?.role}
                onCancelVisit={(v) => { setActionError(null); setVisitForCancel(v); }}
              />
            )}
            {activeTab === 'appointments' && (
              <PatientAppointmentsSection
                appointments={appointments}
                loading={loadingAppointments}
                onBookNew={() => setIsScheduleModalOpen(true)}
                onCheckIn={(appt) => { setActionError(null); setAppointmentForCheckIn(appt); }}
                onReschedule={(appt) => { setActionError(null); setAppointmentForReschedule(appt); }}
                onCancel={(appt) => { setActionError(null); setAppointmentForCancel(appt); }}
              />
            )}
            {activeTab === 'history' && (
              <VisitHistorySection
                visits={visits}
                userRole={user?.role}
                onCancelVisit={(v) => { setActionError(null); setVisitForCancel(v); }}
              />
            )}
            {activeTab === 'labs' && <LabOrdersSection visits={visits} />}
            {activeTab === 'idcard' && (
              <PrintablePatientIdCard patient={patient} inline={true} />
            )}
          </div>
        </div>
      </div>

      {/* ─── SCHEDULE APPOINTMENT DIALOG (Portalled to document.body) ─── */}
      {isScheduleModalOpen && createPortal(
        <div className="appt-modal-backdrop" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="appt-modal-container modal-expanded" onClick={(e) => e.stopPropagation()}>
            <div className="appt-modal-header">
              <div className="appt-modal-title-group">
                <div className="appt-modal-icon booking">
                  <Icon.Calendar />
                </div>
                <div>
                  <h3 className="appt-modal-title">Schedule Doctor Appointment</h3>
                  <p className="appt-modal-subtitle">
                    Book planned consultation for {patient.firstName} {patient.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="appt-modal-close"
                onClick={() => setIsScheduleModalOpen(false)}
                aria-label="Close dialog"
              >
                <Icon.X />
              </button>
            </div>

            <div className="appt-modal-body no-padding">
              <AppointmentForm
                preselectedPatient={patient}
                onSuccess={(created) => {
                  setIsScheduleModalOpen(false);
                  fetchAppointments();
                  setActiveTab('appointments');
                }}
                onCancel={() => setIsScheduleModalOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── CHECK IN DIALOG ─── */}
      <CheckInDialog
        appointment={appointmentForCheckIn}
        isOpen={!!appointmentForCheckIn}
        onClose={() => setAppointmentForCheckIn(null)}
        onConfirm={handleCheckInAppt}
        loading={actionLoading}
        error={actionError}
      />

      {/* ─── RESCHEDULE DIALOG ─── */}
      <RescheduleDialog
        appointment={appointmentForReschedule}
        isOpen={!!appointmentForReschedule}
        onClose={() => setAppointmentForReschedule(null)}
        onConfirm={handleRescheduleAppt}
        loading={actionLoading}
        error={actionError}
      />

      {/* ─── CANCEL APPOINTMENT DIALOG ─── */}
      <CancelDialog
        appointment={appointmentForCancel}
        isOpen={!!appointmentForCancel}
        onClose={() => setAppointmentForCancel(null)}
        onConfirm={handleCancelAppt}
        loading={actionLoading}
        error={actionError}
      />

      {/* ─── CANCEL VISIT DIALOG (Revoke Queue Token before Triage) ─── */}
      <CancelVisitDialog
        visit={visitForCancel}
        isOpen={!!visitForCancel}
        onClose={() => setVisitForCancel(null)}
        onConfirm={handleCancelVisit}
        loading={actionLoading}
        error={actionError}
      />

      {/* ─── NEW VISIT / OPD CHECK-IN DIALOG (Reusable Modal) ─── */}
      <NewVisitDialog
        patient={patient}
        isOpen={isNewVisitModalOpen}
        existingVisits={visits}
        onClose={() => setIsNewVisitModalOpen(false)}
        onSuccess={(created) => {
          setIsNewVisitModalOpen(false);
          fetchProfile();
          fetchAppointments();
          if (onVisitCreated) {
            onVisitCreated(created);
          }
        }}
      />
    </div>
  );
};

export default PatientProfile;

