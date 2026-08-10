import React, { useState, useEffect, useCallback } from 'react';
import { patientAPI } from '../../services/patientAPI';
import { visitAPI } from '../../services/visitAPI';
import { staffAPI } from '../../services/staffAPI';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PrintablePatientIdCard from '../../components/patients/PrintablePatientIdCard';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
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
  showCheckIn,
  onToggleCheckIn,
  onPrintId,
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
  const completed = visits.filter(v => v.status === 'COMPLETED').length;
  const active = visits.filter(v => !['COMPLETED', 'CANCELLED'].includes(v.status)).length;
  const totalBill = visits.reduce((sum, v) => sum + (v.billing?.totalAmount || 0), 0);

  return (
    <Md3Card variant="elevated" padding="none" className="pp-hero-card">
      <div className="pp-hero__top">
        <div className="pp-hero__identity">
          <Md3Avatar initials={initials} size="large" variant="primary" />
          <div className="pp-hero__id-details">
            <div className="pp-hero__name-row">
              <h2 className="pp-hero__name">{fullName || 'Unnamed Patient'}</h2>
              {patient.mrn && <Md3Chip variant="primary" size="medium">{`MRN ${patient.mrn}`}</Md3Chip>}
            </div>
            <div className="pp-hero__meta-row">
              {age != null && <span className="pp-hero__meta-item">{age} yrs</span>}
              <span className="pp-hero__meta-dot">•</span>
              {patient.gender && <span className="pp-hero__meta-item">{patient.gender}</span>}
              {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                <>
                  <span className="pp-hero__meta-dot">•</span>
                  <span className="pp-hero__meta-item pp-hero__meta-item--blood">
                    <Icon.Droplet />
                    {patient.bloodGroup}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Stats */}
        {visits.length > 0 && (
          <div className="pp-hero__stats">
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">{visits.length}</span>
              <span className="pp-hero__stat-label">Total Visits</span>
            </div>
            <div className="pp-hero__stat-sep" />
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">{active}</span>
              <span className="pp-hero__stat-label">Active</span>
            </div>
            <div className="pp-hero__stat-sep" />
            <div className="pp-hero__stat-item">
              <span className="pp-hero__stat-value">₹{totalBill.toLocaleString()}</span>
              <span className="pp-hero__stat-label">Billed</span>
            </div>
          </div>
        )}

        {/* Print Icon Action */}
        {userId && (
          <div className="pp-hero__print">
            <Md3IconButton
              variant="tonal"
              icon={<Icon.Print />}
              ariaLabel="Print patient ID card"
              onClick={onPrintId}
            />
          </div>
        )}
      </div>

      <Md3Divider />

      <div className="pp-hero__bottom">
        {/* Compressed Demographics */}
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
        </div>

        {/* Actions strip */}
        <div className="pp-hero__actions">
          {userRole === 'Reception' && (
            <Md3ActionBar align="end">
              <Md3Button
                variant="secondary"
                onClick={onPrintId}
                style={{ width: 'auto' }}
              >
                <Icon.Print />
                Print ID Card
              </Md3Button>
              <Md3Button
                onClick={onToggleCheckIn}
                style={{ width: 'auto' }}
              >
                <Icon.Plus />
                {showCheckIn ? 'Cancel Check-In' : 'Create New Visit'}
              </Md3Button>
            </Md3ActionBar>
          )}
          {userRole === 'Pharmacy' && (
            <Md3ActionBar align="end">
              <Md3Button onClick={onDirectPharmacy} style={{ width: 'auto' }}>
                Create Direct Bill
              </Md3Button>
            </Md3ActionBar>
          )}
        </div>
      </div>
    </Md3Card>
  );
};

/* ─── Sub-Component: Contact Section ─── */
const ContactSection = ({ patient }) => {
  const addr = patient.address || {};
  const addressText = typeof addr === 'string'
    ? addr
    : [addr.street, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ') || '—';

  return (
    <Md3Section
      title="Contact Details"
      icon={<Icon.Phone />}
    >
      <div className="pp-sidebar-info">
        <Md3InfoRow label="Mobile Phone" value={patient.phone || '—'} icon={<Icon.Phone />} />
        {patient.whatsapp && <Md3InfoRow label="WhatsApp" value={patient.whatsapp} icon={<Icon.Phone />} />}
        {patient.email && <Md3InfoRow label="Email Address" value={patient.email} icon={<Icon.Mail />} />}
        <Md3InfoRow label="Address" value={addressText} icon={<Icon.Location />} />
        {patient.emergencyContact?.name && (
          <Md3InfoRow
            label={`Emergency Contact (${patient.emergencyContact.relation || 'Relation'})`}
            value={`${patient.emergencyContact.name} · ${patient.emergencyContact.phone || '—'}`}
            icon={<Icon.Alert />}
          />
        )}
      </div>
    </Md3Section>
  );
};

/* ─── Sub-Component: Latest Vitals Section ─── */
const LatestVitalsSection = ({ vitals }) => {
  if (!vitals) {
    return (
      <Md3Section title="Latest Vitals" icon={<Icon.Heart />}>
        <div className="pp-sidebar-vitals pp-sidebar-vitals--empty">
          <span className="pp-vitals-empty-text">No vitals on record yet.</span>
        </div>
      </Md3Section>
    );
  }

  const h = Number(vitals.height) / 100;
  const w = Number(vitals.weight);
  const bmi = h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : null;

  return (
    <Md3Section title="Latest Vitals" icon={<Icon.Heart />} variant="tertiary">
      <div className="pp-sidebar-vitals">
        <Md3InfoRow label="Blood Pressure" value={vitals.bloodPressure || '—'} icon={<Icon.BloodPressure />} />
        <Md3InfoRow label="Temperature" value={vitals.temperature ? `${vitals.temperature}°F` : '—'} icon={<Icon.Thermometer />} />
        <Md3InfoRow label="Pulse Rate" value={vitals.pulse ? `${vitals.pulse} bpm` : '—'} icon={<Icon.Pulse />} />
        <Md3InfoRow label="Oxygen (SpO₂)" value={vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : '—'} icon={<Icon.Activity />} />
        <Md3InfoRow label="Weight" value={vitals.weight ? `${vitals.weight} kg` : '—'} icon={<Icon.Scale />} />
        <Md3InfoRow label="Height" value={vitals.height ? `${vitals.height} cm` : '—'} icon={<Icon.Ruler />} />
        {bmi && (
          <div className="pp-vitals-bmi">
            <Md3Chip variant="tertiary" size="small">
              {`BMI ${bmi} (${Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'})`}
            </Md3Chip>
          </div>
        )}
      </div>
    </Md3Section>
  );
};

/* ─── Sub-Component: Clinical History & Alerts Section ─── */
const ClinicalHistorySection = ({ patient }) => {
  return (
    <Md3Section title="Clinical History & Alerts" icon={<Icon.Alert />} variant="error">
      <div className="pp-sidebar-clinical" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Md3InfoRow
          label="Allergies"
          value={patient.allergies ? patient.allergies : 'No allergies recorded.'}
          icon={<Icon.Droplet />}
        />
        <Md3InfoRow
          label="Surgical History / Operations"
          value={patient.operations ? patient.operations : 'No operations recorded.'}
          icon={<Icon.Shield />}
        />
      </div>
    </Md3Section>
  );
};

/* ─── Sub-Component: Patient Sidebar (Contact & Vitals Container) ─── */
const PatientSidebar = ({ patient, latestVitals }) => (
  <div className="pp-sidebar">
    <ContactSection patient={patient} />
    <ClinicalHistorySection patient={patient} />
    <LatestVitalsSection latestVitals={latestVitals} vitals={latestVitals} />
  </div>
);

/* ─── Sub-Component: Clinical Overview Tab ─── */
const OverviewTabContent = ({ visits }) => {
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latestConsultation = sorted.find(v => v.status === 'COMPLETED' && v.consultation);

  if (!latestConsultation) {
    return (
      <Md3Card variant="outlined" padding="large">
        <Md3EmptyState
          icon={<Icon.FileText />}
          title="No Consultation Record Yet"
          subtitle="There is no completed doctor consultation history for this patient in the active timeline."
        />
      </Md3Card>
    );
  }

  const cons = latestConsultation.consultation;
  const meds = cons.prescribedMedications || [];

  return (
    <div className="pp-overview-tab">
      <Md3Section
        title="Last Consultation Summary"
        subtitle={`Diagnosed by ${latestConsultation.departmentId?.name || 'Attending Physician'} on ${new Date(latestConsultation.createdAt).toLocaleDateString('en-IN')}`}
        icon={<Icon.Clipboard />}
        variant="highlight"
      >
        <div className="pp-overview-clinical">
          <div className="pp-clinical-row">
            <strong className="pp-clinical-label">Chief Complaint:</strong>
            <span className="pp-clinical-value">{latestConsultation.vitals?.chiefComplaint || cons.chiefComplaint || 'No complaints reported'}</span>
          </div>
          <Md3Divider className="pp-clinical-divider" />
          <div className="pp-clinical-row">
            <strong className="pp-clinical-label">Diagnosis:</strong>
            <span className="pp-clinical-value pp-clinical-value--diagnosis">{cons.diagnosis || '—'}</span>
          </div>
          <Md3Divider className="pp-clinical-divider" />
          <div className="pp-clinical-row">
            <strong className="pp-clinical-label">Treatment Plan:</strong>
            <span className="pp-clinical-value">{cons.treatmentPlan || '—'}</span>
          </div>
          {cons.notes && (
            <>
              <Md3Divider className="pp-clinical-divider" />
              <div className="pp-clinical-row">
                <strong className="pp-clinical-label">Clinical Notes:</strong>
                <span className="pp-clinical-value pp-clinical-value--notes">{cons.notes}</span>
              </div>
            </>
          )}
        </div>
      </Md3Section>

      {meds.length > 0 && (
        <Md3Section title="Active Prescriptions" icon={<Icon.Pill />} variant="default" className="pp-prescriptions-section">
          <div className="pp-overview-meds">
            {meds.map((med, index) => (
              <div key={index} className="pp-med-card">
                <div className="pp-med-header">
                  <div className="pp-med-title-row">
                    <Icon.Pill />
                    <span className="pp-med-name">{med.name}</span>
                  </div>
                  <Md3Chip variant="secondary" size="small">
                    Qty: {med.quantity}
                  </Md3Chip>
                </div>
                <div className="pp-med-details">
                  <span><strong>Dosage:</strong> {med.dosage}</span>
                  <span className="pp-med-dot">•</span>
                  <span><strong>Frequency:</strong> {med.frequency}</span>
                  {med.duration && (
                    <>
                      <span className="pp-med-dot">•</span>
                      <span><strong>Duration:</strong> {med.duration}</span>
                    </>
                  )}
                </div>
                {med.instructions && (
                  <div className="pp-med-instructions">
                    <strong>Instructions:</strong> {med.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Md3Section>
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

/* ─── Sub-Component: Check-In Form (New Visit) ─── */
const CheckInFormSection = ({
  visitForm,
  setVisitForm,
  departments,
  doctors,
  onSubmit,
  loading,
  error,
  onCancel,
}) => {
  const handleField = (e) => {
    const { name, value } = e.target;
    setVisitForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Md3Section
      title="New Visit Details"
      subtitle="Complete to check patient into OPD triage"
      variant="highlight"
      icon={<Icon.Plus />}
    >
      {error && (
        <div className="pp-form-error" role="alert">
          <Icon.Alert />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="pp-checkin-form" noValidate>
        <Md3Grid columns={2} gap="default">
          <Md3Select
            id="pp-visitType"
            name="visitType"
            label="Visit Type *"
            value={visitForm.visitType}
            onChange={handleField}
            disabled={loading}
            options={[
              { value: 'OPD', label: 'OPD (Outpatient)' },
              { value: 'IPD', label: 'IPD (Inpatient — Future)' },
            ]}
          />
          <Md3Select
            id="pp-departmentId"
            name="departmentId"
            label="Department *"
            value={visitForm.departmentId}
            onChange={handleField}
            disabled={loading}
          >
            <option value="">-- Select Department --</option>
            {departments
              .filter(d => d.type === 'CLINICAL' || d.type === 'CLINICAL/DIAGNOSTIC')
              .map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
          </Md3Select>
          <Md3Select
            id="pp-doctorId"
            name="doctorId"
            label="Assigned Doctor (Optional)"
            value={visitForm.doctorId}
            onChange={handleField}
            disabled={loading}
          >
            <option value="">-- Any Available Doctor --</option>
            {doctors
              .filter(d => !visitForm.departmentId || d.departmentId?._id === visitForm.departmentId)
              .map(d => (
                <option key={d._id} value={d._id}>{d.fullName}</option>
              ))}
          </Md3Select>
          <Md3TextField
            id="pp-reasonForVisit"
            name="reasonForVisit"
            label="Reason for Visit / Chief Complaint"
            value={visitForm.reasonForVisit}
            onChange={handleField}
            placeholder="e.g. Fever, Annual check-up"
            disabled={loading}
          />
        </Md3Grid>

        <Md3Divider />

        <Md3Grid columns={3} gap="default">
          <Md3TextField
            id="pp-regFee"
            name="registrationFee"
            type="number"
            label="Registration Fee (₹)"
            value={visitForm.registrationFee}
            onChange={handleField}
            disabled={loading}
          />
          <Md3TextField
            id="pp-consultFee"
            name="consultationFee"
            type="number"
            label="Consultation Fee (₹)"
            value={visitForm.consultationFee}
            onChange={handleField}
            disabled={loading}
          />
          <Md3Select
            id="pp-paymentMethod"
            name="paymentMethod"
            label="Payment Method *"
            value={visitForm.paymentMethod}
            onChange={handleField}
            disabled={loading}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Card', label: 'Card' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Insurance', label: 'Insurance' },
            ]}
          />
        </Md3Grid>

        <Md3ActionBar align="end">
          <Md3Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            Cancel
          </Md3Button>
          <Md3Button
            type="submit"
            disabled={loading}
            loading={loading}
            loadingText="Checking in patient…"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            Check In & Generate Slips
          </Md3Button>
        </Md3ActionBar>
      </form>
    </Md3Section>
  );
};

/* ─── Sub-Component: Visit History Table ─── */
const VisitHistorySection = ({ visits }) => {
  const columns = [
    { key: 'visitNumber', header: 'Visit No.' },
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
        return <Md3Chip variant={variant} size="small">
          {row.status.replace(/_/g, ' ')}
        </Md3Chip>;
      }
    },
    { key: 'department', header: 'Department',
      render: (row) => row.departmentId?.name || 'General'
    },
    { key: 'doctor', header: 'Doctor',
      render: (row) => row.consultation?.doctorId ? 'Consulted' : 'N/A (Direct)'
    },
    { key: 'totalAmount', header: 'Total Bill (₹)', align: 'right',
      render: (row) => {
        const reg = row.receptionPayment?.registrationFee || 0;
        const cons = row.receptionPayment?.consultationFee || 0;
        const total = reg + cons;
        return total > 0 ? `₹${total.toFixed(2)}` : '—';
      }
    },
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

/* ─── Helpers ─── */
const computeAge = (dobStr) => {
  try {
    const dob = new Date(dobStr);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  } catch { return null; }
};

/* ============================================================
   Main PatientProfile Component
   ============================================================ */
const PatientProfile = ({ patientId, onBack, onDirectPharmacy, onVisitCreated }) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [visitForm, setVisitForm] = useState({
    visitType: 'OPD',
    departmentId: '',
    doctorId: '',
    reasonForVisit: '',
    registrationFee: 0,
    consultationFee: 500,
    paymentMethod: 'Cash',
  });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  /* ─── Data Fetching ─── */
  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const [patientRes, visitsRes] = await Promise.all([
          patientAPI.getById(patientId),
          visitAPI.getPatientVisits(patientId),
        ]);
        if (cancelled) return;
        setPatient(patientRes.data);
        setVisits(visitsRes.data?.data || []);
      } catch (err) {
        console.error('[PatientProfile] fetch error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => { cancelled = true; };
  }, [patientId]);

  const loadSelectData = useCallback(async () => {
    if (departments.length > 0 && doctors.length > 0) return;
    try {
      const [deptRes, staffRes] = await Promise.allSettled([
        api.get('/departments'),
        staffAPI.list(1, 100),
      ]);
      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value.data.data || []);
      }
      if (staffRes.status === 'fulfilled') {
        setDoctors((staffRes.value.data.items || []).filter(s => s.roleId?.name === 'Doctor'));
      }
    } catch (err) {
      console.error('[PatientProfile] failed to load dropdowns');
    }
  }, [departments.length, doctors.length]);

  /* ─── Handlers ─── */
  const toggleCheckIn = () => {
    if (!showCheckInForm) loadSelectData();
    setShowCheckInForm(prev => !prev);
    setFormError(null);
  };

  const handleDirectPharmacy = async () => {
    try {
      const res = await visitAPI.create({ patientId: patient._id, isDirectPharmacy: true });
      if (onDirectPharmacy) onDirectPharmacy(res.data.data);
    } catch {
      setFormError('Failed to create direct pharmacy visit');
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const payload = {
        patientId: patient._id,
        visitType: visitForm.visitType,
        ...(visitForm.departmentId && { departmentId: visitForm.departmentId }),
        ...(visitForm.doctorId && { doctorId: visitForm.doctorId }),
        ...(visitForm.reasonForVisit && { reasonForVisit: visitForm.reasonForVisit }),
        receptionPayment: {
          registrationFee: Number(visitForm.registrationFee) || 0,
          consultationFee: Number(visitForm.consultationFee) || 0,
          paymentMethod: visitForm.paymentMethod,
        },
      };
      const res = await visitAPI.create(payload);
      setShowCheckInForm(false);
      if (onVisitCreated) {
        onVisitCreated({ patient, visit: res.data.data || res.data });
      } else {
        onBack && onBack();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setFormLoading(false);
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
      {/* ─── Compressed Patient Hero Card (Identity, Demographics, Stats & Actions) ─── */}
      <PatientHero
        patient={patient}
        visits={visits}
        userRole={user?.role}
        showCheckIn={showCheckInForm}
        onToggleCheckIn={toggleCheckIn}
        onPrintId={() => setActiveTab('idcard')}
        onDirectPharmacy={handleDirectPharmacy}
        userId={user?._id}
      />

      {/* ─── Check-In Form (above content when active) ─── */}
      {showCheckInForm && (
        <CheckInFormSection
          visitForm={visitForm}
          setVisitForm={setVisitForm}
          departments={departments}
          doctors={doctors}
          onSubmit={handleCheckInSubmit}
          loading={formLoading}
          error={formError}
          onCancel={() => { setShowCheckInForm(false); setFormError(null); }}
        />
      )}

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
              { id: 'history', label: 'Visit History', icon: <Icon.History /> },
              { id: 'labs', label: 'Lab Reports', icon: <Icon.Beaker /> },
              { id: 'idcard', label: 'Print ID Card', icon: <Icon.Print /> },
            ]}
          />

          {/* Tab Views */}
          <div className="pp-tab-views">
            {activeTab === 'overview' && <OverviewTabContent visits={visits} />}
            {activeTab === 'history' && <VisitHistorySection visits={visits} />}
            {activeTab === 'labs' && <LabOrdersSection visits={visits} />}
            {activeTab === 'idcard' && (
              <PrintablePatientIdCard patient={patient} inline={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
