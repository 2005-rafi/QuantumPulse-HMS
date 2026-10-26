/**
 * features/ipd/WardTransferLedgerView.jsx
 * Adaptive, High-Information-Utility Inpatient Bed Allocation & Transfer Ledger.
 *
 * Segregation Principles:
 *   - Desktop (>= 1024px): Spacious, low-eye-strain clinical table with rich metadata.
 *   - Tablet (768px - 1023px): Responsive prioritized columns with merged clinical context.
 *   - Mobile (< 768px): Zero-horizontal-scroll adaptive card deck with compact touch targets.
 */
import React, { useState, useEffect, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import BedTransferDialog from '../../components/ipd/BedTransferDialog';
import ClinicalStationIdleDeck from '../../components/md3/ClinicalStationIdleDeck';
import { formatDoctorName } from '../../utils/patientFormatters';
import './WardTransferLedgerView.css';

const getInitials = (firstName = '', lastName = '') => {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'PT';
};

const getWardPillClass = (wardClass = '') => {
  const w = (wardClass || '').toUpperCase();
  if (w.includes('ICU') || w.includes('HDU') || w.includes('CCU')) return 'wtl-bed-pill--icu';
  if (w.includes('GENERAL')) return 'wtl-bed-pill--general';
  if (w.includes('DELUXE') || w.includes('SUITE') || w.includes('PRIVATE')) return 'wtl-bed-pill--private';
  if (w.includes('SEMI')) return 'wtl-bed-pill--semi';
  return 'wtl-bed-pill--default';
};

const formatLengthOfStay = (admissionDate) => {
  if (!admissionDate) return null;
  const diffMs = Date.now() - new Date(admissionDate).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return 'Admitted Today';
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} Day${diffDays !== 1 ? 's' : ''} in Ward`;
};

export const WardTransferLedgerView = () => {
  const [allocations, setAllocations] = useState([]);
  const [vacantCount, setVacantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedForTransfer, setSelectedForTransfer] = useState({ bed: null, admission: null });
  const [layoutMode, setLayoutMode] = useState('table'); // 'table' | 'cards'

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      const floors = res.data?.data || [];
      const activeAllocations = [];
      let totalVacant = 0;

      floors.forEach((f) => {
        f.rooms?.forEach((r) => {
          r.beds?.forEach((b) => {
            if (b.status === 'VACANT') {
              totalVacant++;
            } else if (b.status === 'OCCUPIED' && b.currentPatientId) {
              const adm = b.currentAdmissionId || {};
              activeAllocations.push({
                bedId: b._id,
                bedLabel: b.bedLabel || `Bed ${b.bedNumber}`,
                bedNumber: b.bedNumber,
                wardClass: b.wardClass || 'GENERAL_WARD',
                dailyRate: b.dailyRate || 0,
                floorNumber: f.floorNumber,
                floorName: f.floorName || `Floor ${f.floorNumber}`,
                wing: f.wing || '',
                roomNumber: r.roomNumber,
                roomName: r.roomName || `Room ${r.roomNumber}`,
                roomType: r.roomType || '',
                patient: b.currentPatientId,
                admission: adm,
                primaryDoctor: adm.primaryDoctorId,
                provisionalDiagnosis: adm.provisionalDiagnosis || '',
                allocatedAt: adm.admissionDate || b.updatedAt,
                bedObj: b,
              });
            }
          });
        });
      });

      setAllocations(activeAllocations);
      setVacantCount(totalVacant);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load transfer ledger:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Operational Telemetry KPI Counters ──
  const kpiStats = useMemo(() => {
    const total = allocations.length;
    const icu = allocations.filter((a) => (a.wardClass || '').toUpperCase().includes('ICU') || (a.wardClass || '').toUpperCase().includes('HDU')).length;
    const general = allocations.filter((a) => (a.wardClass || '').toUpperCase().includes('GENERAL')).length;
    const privateCount = allocations.filter((a) => (a.wardClass || '').toUpperCase().includes('PRIVATE') || (a.wardClass || '').toUpperCase().includes('DELUXE') || (a.wardClass || '').toUpperCase().includes('SEMI')).length;

    return {
      total,
      icu,
      general,
      privateCount,
      vacant: vacantCount,
    };
  }, [allocations, vacantCount]);

  // ── Filtered Allocations ──
  const filtered = useMemo(() => {
    return allocations.filter((item) => {
      // 1. Tier Filter
      if (tierFilter !== 'ALL') {
        const wClass = (item.wardClass || '').toUpperCase();
        if (tierFilter === 'ICU' && !wClass.includes('ICU') && !wClass.includes('HDU')) return false;
        if (tierFilter === 'GENERAL' && !wClass.includes('GENERAL')) return false;
        if (tierFilter === 'PRIVATE' && !wClass.includes('PRIVATE') && !wClass.includes('DELUXE') && !wClass.includes('SEMI')) return false;
      }

      // 2. Search Query Match
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const p = item.patient || {};
      const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const mrn = (p.mrn || '').toLowerCase();
      const bed = (item.bedLabel || '').toLowerCase();
      const room = String(item.roomNumber || '').toLowerCase();
      const doctor = (item.primaryDoctor?.fullName || `${item.primaryDoctor?.firstName || ''} ${item.primaryDoctor?.lastName || ''}`).toLowerCase();
      const adm = (item.admission?.admissionNumber || '').toLowerCase();
      const diag = (item.provisionalDiagnosis || '').toLowerCase();

      return (
        name.includes(q) ||
        mrn.includes(q) ||
        bed.includes(q) ||
        room.includes(q) ||
        doctor.includes(q) ||
        adm.includes(q) ||
        diag.includes(q)
      );
    });
  }, [allocations, search, tierFilter]);

  const handleOpenTransfer = (row) => {
    setSelectedForTransfer({ bed: row.bedObj, admission: row.admission });
    setShowTransferDialog(true);
  };

  return (
    <div className="wtl-container">
      {/* ── 1. OPERATIONAL KPI METRICS DECK ── */}
      <div className="wtl-kpi-deck">
        <div className="wtl-kpi-card">
          <div className="wtl-kpi-icon-wrap wtl-kpi-icon--occupied">
            <span className="material-symbols-rounded">hotel</span>
          </div>
          <div className="wtl-kpi-meta">
            <span className="wtl-kpi-label">Total Inpatients</span>
            <span className="wtl-kpi-value">{kpiStats.total}</span>
          </div>
        </div>

        <div className="wtl-kpi-card">
          <div className="wtl-kpi-icon-wrap wtl-kpi-icon--icu">
            <span className="material-symbols-rounded">emergency</span>
          </div>
          <div className="wtl-kpi-meta">
            <span className="wtl-kpi-label">ICU / Critical Care</span>
            <span className="wtl-kpi-value">{kpiStats.icu}</span>
          </div>
        </div>

        <div className="wtl-kpi-card">
          <div className="wtl-kpi-icon-wrap wtl-kpi-icon--general">
            <span className="material-symbols-rounded">meeting_room</span>
          </div>
          <div className="wtl-kpi-meta">
            <span className="wtl-kpi-label">General &amp; Private</span>
            <span className="wtl-kpi-value">{kpiStats.general + kpiStats.privateCount}</span>
          </div>
        </div>

        <div className="wtl-kpi-card">
          <div className="wtl-kpi-icon-wrap wtl-kpi-icon--vacant">
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div className="wtl-kpi-meta">
            <span className="wtl-kpi-label">Vacant Destinations</span>
            <span className="wtl-kpi-value">{kpiStats.vacant}</span>
          </div>
        </div>
      </div>

      {/* ── 2. SEARCH & WARD TIER FILTER STRIP + VIEW TOGGLE ── */}
      <div className="wtl-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Desktop & Tablet Layout Toggle (Hidden on mobile) */}
          <div className="wtl-view-toggle-group" role="group" aria-label="Layout view mode">
            <button
              type="button"
              className={`wtl-view-toggle-btn ${layoutMode === 'table' ? 'is-active' : ''}`}
              onClick={() => setLayoutMode('table')}
              title="Table / List View"
            >
              <span className="material-symbols-rounded">view_list</span>
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`wtl-view-toggle-btn ${layoutMode === 'cards' ? 'is-active' : ''}`}
              onClick={() => setLayoutMode('cards')}
              title="Card Grid View"
            >
              <span className="material-symbols-rounded">grid_view</span>
              <span>Cards</span>
            </button>
          </div>

          {/* Ward Tier Filter Chips */}
          <div className="wtl-filter-chips" role="tablist" aria-label="Filter by Ward Tier">
            <button
              type="button"
              className={`wtl-filter-chip ${tierFilter === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setTierFilter('ALL')}
            >
              <span>All Wards</span>
              <span className="wtl-filter-chip-count">{allocations.length}</span>
            </button>
            <button
              type="button"
              className={`wtl-filter-chip ${tierFilter === 'ICU' ? 'is-active' : ''}`}
              onClick={() => setTierFilter('ICU')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>emergency</span>
              <span>ICU &amp; Critical</span>
              <span className="wtl-filter-chip-count">{kpiStats.icu}</span>
            </button>
            <button
              type="button"
              className={`wtl-filter-chip ${tierFilter === 'GENERAL' ? 'is-active' : ''}`}
              onClick={() => setTierFilter('GENERAL')}
            >
              <span>General Ward</span>
              <span className="wtl-filter-chip-count">{kpiStats.general}</span>
            </button>
            <button
              type="button"
              className={`wtl-filter-chip ${tierFilter === 'PRIVATE' ? 'is-active' : ''}`}
              onClick={() => setTierFilter('PRIVATE')}
            >
              <span>Deluxe / Private</span>
              <span className="wtl-filter-chip-count">{kpiStats.privateCount}</span>
            </button>
          </div>
        </div>

        <div className="wtl-search-box" style={{ flex: 1, minWidth: '220px' }}>
          <Md3TextField
            placeholder="Search patient, MRN, bed, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── 3. CONTENT VIEWPORT (Desktop Table/Cards vs Mobile Cards) ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--md-sys-color-outline)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, animation: 'spin 1.5s linear infinite' }}>
            progress_activity
          </span>
          <p style={{ marginTop: 8, fontSize: '0.90rem' }}>Loading active bed allocations and inpatient ledger...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          <ClinicalStationIdleDeck preset="WARD_OPERATIONS" />
        </div>
      ) : (
        <>
          {/* ── DESKTOP & TABLET VIEW: High-Legibility Spacious Table (When layoutMode === 'table') ── */}
          <div className={`wtl-table-wrapper ${layoutMode !== 'table' ? 'is-hidden-on-desktop' : ''}`}>
            <table className="wtl-table">
              <thead>
                <tr>
                  <th className="wtl-th" style={{ width: '25%' }}>Patient Demographics</th>
                  <th className="wtl-th" style={{ width: '18%' }}>Current Bed</th>
                  <th className="wtl-th" style={{ width: '17%' }}>Ward &amp; Location</th>
                  <th className="wtl-th" style={{ width: '20%' }}>Attending Physician &amp; Diag</th>
                  <th className="wtl-th" style={{ width: '10%' }}>Stay</th>
                  <th className="wtl-th" style={{ width: '10%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const p = row.patient || {};
                  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
                  const initials = getInitials(p.firstName, p.lastName);
                  const pillClass = getWardPillClass(row.wardClass);
                  const losText = formatLengthOfStay(row.allocatedAt);
                  const docName = formatDoctorName(row.primaryDoctor || 'Attending Physician');

                  return (
                    <tr key={row.bedId} className="wtl-tr">
                      {/* 1. Patient Profile */}
                      <td className="wtl-td">
                        <div className="wtl-cell-patient">
                          <div className="wtl-patient-avatar">{initials}</div>
                          <div className="wtl-patient-meta">
                            <span className="wtl-patient-name">{fullName}</span>
                            <div className="wtl-patient-sub">
                              <span>MRN: {p.mrn ? (p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`) : '—'}</span>
                              {(p.age || p.gender) && (
                                <span className="wtl-demo-pill">
                                  {[p.age ? `${p.age}Y` : null, p.gender].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Current Bed Pill */}
                      <td className="wtl-td">
                        <span className={`wtl-bed-pill ${pillClass}`}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>bed</span>
                          <span>{row.bedLabel}</span>
                        </span>
                      </td>

                      {/* 3. Ward & Physical Location */}
                      <td className="wtl-td">
                        <div className="wtl-location-cell">
                          <span className="wtl-location-primary">
                            <span className="material-symbols-rounded">location_on</span>
                            <span>Floor {row.floorNumber}, Room {row.roomNumber}</span>
                          </span>
                          <span className="wtl-location-tier">
                            {row.wardClass.replace(/_/g, ' ')} {row.wing ? `• ${row.wing}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* 4. Attending Doctor & Diagnosis */}
                      <td className="wtl-td">
                        <div className="wtl-doctor-cell">
                          <span className="wtl-doctor-name">
                            <span className="material-symbols-rounded">stethoscope</span>
                            <span>{docName}</span>
                          </span>
                          <span className="wtl-diagnosis-text" title={row.provisionalDiagnosis || 'General in-patient care'}>
                            {row.provisionalDiagnosis || 'General in-patient care'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Stay & Admission Date */}
                      <td className="wtl-td">
                        <div className="wtl-time-cell">
                          <span className="wtl-admitted-date">
                            {row.allocatedAt ? new Date(row.allocatedAt).toLocaleDateString('en-IN') : '—'}
                          </span>
                          {losText && (
                            <span className="wtl-los-pill">
                              <span className="material-symbols-rounded">schedule</span>
                              <span>{losText}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Transfer Bed Action */}
                      <td className="wtl-td" style={{ textAlign: 'right' }}>
                        <Md3Button
                          variant="tonal"
                          size="small"
                          onClick={() => handleOpenTransfer(row)}
                          title={`Transfer ${fullName} to another bed`}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>sync_alt</span>
                          <span>Transfer</span>
                        </Md3Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── CARD DECK: Rendered either on Mobile (always) OR Desktop/Tablet (when layoutMode === 'cards') ── */}
          <div className={`wtl-card-deck ${layoutMode === 'cards' ? 'is-desktop-cards-active' : ''}`}>
            {filtered.map((row) => {
              const p = row.patient || {};
              const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
              const initials = getInitials(p.firstName, p.lastName);
              const pillClass = getWardPillClass(row.wardClass);
              const losText = formatLengthOfStay(row.allocatedAt);
              const docName = formatDoctorName(row.primaryDoctor || 'Attending Physician');

              return (
                <div key={row.bedId} className="wtl-card">
                  {/* Card Header: Patient Identity & Ward Badge */}
                  <div className="wtl-card-header">
                    <div className="wtl-card-patient-info">
                      <div className="wtl-patient-avatar">{initials}</div>
                      <div className="wtl-card-patient-titles">
                        <div className="wtl-patient-name">{fullName}</div>
                        <div className="wtl-card-mrn-line">
                          <span>MRN: {p.mrn ? (p.mrn.startsWith('MRN-') ? p.mrn : `MRN-${p.mrn}`) : '—'}</span>
                          {(p.age || p.gender) && (
                            <span> • {[p.age ? `${p.age}Y` : null, p.gender].filter(Boolean).join('/')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`wtl-bed-pill ${pillClass}`}>
                      {row.wardClass.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Structured 2x2 Telemetry Grid */}
                  <div className="wtl-card-grid">
                    <div className="wtl-card-grid-item">
                      <span className="wtl-card-grid-label">Current Bed</span>
                      <span className="wtl-card-grid-val wtl-card-grid-val--highlight">
                        {row.bedLabel}
                      </span>
                    </div>

                    <div className="wtl-card-grid-item">
                      <span className="wtl-card-grid-label">Location</span>
                      <span className="wtl-card-grid-val">
                        Floor {row.floorNumber}, Rm {row.roomNumber}
                      </span>
                    </div>

                    <div className="wtl-card-grid-item">
                      <span className="wtl-card-grid-label">Stay Duration</span>
                      <span className="wtl-card-grid-val">
                        {row.allocatedAt ? new Date(row.allocatedAt).toLocaleDateString('en-IN') : '—'}
                        {losText ? ` (${losText})` : ''}
                      </span>
                    </div>

                    <div className="wtl-card-grid-item">
                      <span className="wtl-card-grid-label">Physician</span>
                      <span className="wtl-card-grid-val" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {docName}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="wtl-card-actions">
                    <Md3Button
                      variant="filled"
                      size="small"
                      onClick={() => handleOpenTransfer(row)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>sync_alt</span>
                      <span>Transfer Patient Bed</span>
                    </Md3Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 5. ATOMIC BED TRANSFER MODAL DIALOG ── */}
      {showTransferDialog && selectedForTransfer.bed && selectedForTransfer.admission && (
        <BedTransferDialog
          bed={selectedForTransfer.bed}
          sourceBed={selectedForTransfer.bed}
          admission={selectedForTransfer.admission}
          onClose={() => {
            setShowTransferDialog(false);
            setSelectedForTransfer({ bed: null, admission: null });
          }}
          onSuccess={() => {
            setShowTransferDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default WardTransferLedgerView;
