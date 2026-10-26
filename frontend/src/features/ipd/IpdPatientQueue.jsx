/**
 * features/ipd/IpdPatientQueue.jsx
 * Enterprise Material 3 Inpatient Queue Navigation Rail & Drawer Component.
 * Supports:
 * - Desktop Collapsible 76px Navigation Rail
 * - Desktop Expanded 320px Sidebar with Ward Unit Filtering & DSA Search
 * - Mobile & Tablet Slide-over Drawer with Backdrop Scrim
 */
import React, { useMemo, useState } from 'react';
import { formatPatientName, getPatientInitials } from '../../utils/patientFormatters';
import Md3MarqueeText from '../../components/md3/Md3MarqueeText';

const WARD_FILTERS = [
  { id: 'ALL', label: 'All', icon: 'hotel' },
  { id: 'ICU_CCU', label: 'ICU/CCU', icon: 'e911_emergency' },
  { id: 'HDU', label: 'HDU', icon: 'vital_signs' },
  { id: 'GENERAL', label: 'General', icon: 'single_bed' },
];

/* ─── Compact Collapsed Rail Item (76px) ─────────────────── */
const IpdQueueRailItem = ({ admission, selected, onSelect }) => {
  const patient = admission?.patientId || {};
  const patientName = formatPatientName(patient);
  const initials = getPatientInitials(patient);
  const bed = admission?.currentBedId;
  const bedLabel = bed?.bedLabel || bed?.bedNumber || '—';
  const ward = (bed?.wardClass || bed?.wardType || '').toUpperCase();
  const isCritical = ward.includes('ICU') || ward.includes('CCU') || ward.includes('HDU');
  const isDischarging = admission?.status === 'DISCHARGE_INITIATED';

  return (
    <div
      className={`ipd-rail-item ${selected ? 'ipd-rail-item--selected' : ''} ${isCritical ? 'ipd-rail-item--critical' : ''}`}
      onClick={() => onSelect?.(admission)}
      role="button"
      tabIndex={0}
      title={`${patientName} (Bed: ${bedLabel}) • ${ward || 'General'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(admission);
        }
      }}
      aria-label={`Select patient ${patientName}, Bed ${bedLabel}`}
    >
      <div className="ipd-rail-item__avatar-wrapper">
        <div className="ipd-rail-item__avatar">{initials}</div>
        {isCritical && <span className="ipd-rail-item__critical-dot" title="Critical Ward" />}
        {isDischarging && <span className="ipd-rail-item__discharge-dot" title="Discharge Initiated" />}
      </div>

      <span className="ipd-rail-item__bed">{bedLabel}</span>

      <div className="ipd-rail-item__name-box">
        <Md3MarqueeText text={patientName.split(' ')[0] || 'Patient'} className="ipd-rail-item__marquee" />
      </div>
    </div>
  );
};

/* ─── Full Inpatient Queue Card ──────────────────────────── */
const IpdQueueCard = ({ admission, selected, onSelect }) => {
  const patient = admission?.patientId || {};
  const patientName = formatPatientName(patient);
  const initials = getPatientInitials(patient);
  const bed = admission?.currentBedId;
  const bedLabel = bed?.bedLabel || bed?.bedNumber || '—';
  const ward = bed?.wardClass || bed?.wardType || 'General Ward';
  const wardUpper = ward.toUpperCase();
  const isCritical = wardUpper.includes('ICU') || wardUpper.includes('CCU');
  const isHdu = wardUpper.includes('HDU');
  const isDischarging = admission?.status === 'DISCHARGE_INITIATED';

  // Calculate day of stay
  let dayOfStay = 1;
  if (admission?.admissionDate) {
    const diffMs = Date.now() - new Date(admission.admissionDate).getTime();
    dayOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const wardBadgeClass = isCritical ? 'ward-critical' : isHdu ? 'ward-hdu' : 'ward-general';

  return (
    <div
      className={`ipd-queue-card ${selected ? 'ipd-queue-card--selected' : ''}`}
      onClick={() => onSelect?.(admission)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(admission);
        }
      }}
      aria-label={`Select patient ${patientName}, Bed ${bedLabel}`}
    >
      <div className="ipd-queue-card__header">
        <div className="ipd-queue-card__avatar">{initials}</div>
        <div className="ipd-queue-card__patient-info">
          <div className="ipd-queue-card__name" title={patientName}>
            {patientName}
          </div>
          <div className="ipd-queue-card__meta">
            MRN: {patient.mrn || '—'} {patient.age ? `• ${patient.age}y` : ''} {patient.gender ? `/${patient.gender[0]}` : ''}
          </div>
        </div>
        <span className={`ipd-queue-card__ward-badge ${wardBadgeClass}`}>
          {bedLabel}
        </span>
      </div>

      <div className="ipd-queue-card__footer">
        <span className="ipd-queue-card__ward-name">
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
            {isCritical ? 'e911_emergency' : 'hotel'}
          </span>
          <span>{ward}</span>
        </span>

        <div className="ipd-queue-card__stay-tag">
          <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>calendar_today</span>
          <span>Day {dayOfStay}</span>
        </div>

        {isDischarging && (
          <span className="ipd-queue-card__discharge-pill">Discharging</span>
        )}
      </div>
    </div>
  );
};

/* ─── Main Inpatient Queue Component ─────────────────────── */
export const IpdPatientQueue = ({
  admissionList = [],
  selectedAdmissionId,
  onSelectAdmission,
  onRefresh,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtered admissions list
  const filteredList = useMemo(() => {
    return admissionList.filter((adm) => {
      const patient = adm.patientId || {};
      const fullName = formatPatientName(patient).toLowerCase();
      const mrn = (patient.mrn || '').toLowerCase();
      const bedLabel = (adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || '').toLowerCase();
      const ward = (adm.currentBedId?.wardClass || adm.currentBedId?.wardType || '').toUpperCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || fullName.includes(query) || mrn.includes(query) || bedLabel.includes(query);

      let matchesWard = true;
      if (selectedWard === 'ICU_CCU') {
        matchesWard = ward.includes('ICU') || ward.includes('CCU');
      } else if (selectedWard === 'HDU') {
        matchesWard = ward.includes('HDU');
      } else if (selectedWard === 'GENERAL') {
        matchesWard = !ward.includes('ICU') && !ward.includes('CCU') && !ward.includes('HDU');
      }

      return matchesSearch && matchesWard;
    });
  }, [admissionList, searchQuery, selectedWard]);

  // Ward counts
  const wardCounts = useMemo(() => {
    const counts = { ALL: admissionList.length, ICU_CCU: 0, HDU: 0, GENERAL: 0 };
    admissionList.forEach((adm) => {
      const ward = (adm.currentBedId?.wardClass || adm.currentBedId?.wardType || '').toUpperCase();
      if (ward.includes('ICU') || ward.includes('CCU')) counts.ICU_CCU++;
      else if (ward.includes('HDU')) counts.HDU++;
      else counts.GENERAL++;
    });
    return counts;
  }, [admissionList]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  /* ─── Collapsed Desktop Rail Mode ─── */
  if (isCollapsed) {
    return (
      <aside className="ipd-queue-rail" aria-label="Inpatient queue collapsed rail">
        <div className="ipd-rail__header">
          <button
            type="button"
            className="ipd-rail__toggle-btn"
            onClick={onToggleCollapse}
            title="Expand Inpatient Queue"
            aria-label="Expand Inpatient Queue"
          >
            <span className="material-symbols-rounded">right_panel_open</span>
          </button>
          <span className="ipd-rail__count-badge" title={`${admissionList.length} Admitted Patients`}>
            {admissionList.length}
          </span>
        </div>

        <div className="ipd-rail__body">
          {admissionList.map((adm) => (
            <IpdQueueRailItem
              key={adm._id}
              admission={adm}
              selected={selectedAdmissionId === adm._id}
              onSelect={onSelectAdmission}
            />
          ))}
          {admissionList.length === 0 && (
            <div className="ipd-rail__empty">
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>hotel</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <div className="ipd-queue-panel">
      {/* ── 1. Header Bar ── */}
      <div className="ipd-queue__header">
        <div className="ipd-queue__header-left">
          {onToggleCollapse && (
            <button
              type="button"
              className="ipd-queue__collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse Inpatient Queue to Rail"
              aria-label="Collapse Inpatient Queue"
            >
              <span className="material-symbols-rounded">left_panel_close</span>
            </button>
          )}
          <div className="ipd-queue__title-group">
            <span className="ipd-queue__title">Inpatient Queue</span>
            <span className="ipd-queue__badge">{filteredList.length}</span>
          </div>
        </div>

        <div className="ipd-queue__header-actions">
          {onRefresh && (
            <button
              type="button"
              className={`ipd-queue__action-btn ${isRefreshing ? 'ipd-queue__action-btn--spinning' : ''}`}
              onClick={handleRefresh}
              title="Refresh Inpatient Queue"
              aria-label="Refresh Queue"
            >
              <span className="material-symbols-rounded">sync</span>
            </button>
          )}

          {onCloseMobileDrawer && (
            <button
              type="button"
              className="ipd-queue__action-btn ipd-queue__close-mobile-btn"
              onClick={onCloseMobileDrawer}
              title="Close Drawer"
              aria-label="Close Drawer"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Ward Unit Filter Chips ── */}
      <div className="ipd-queue__filters" role="tablist" aria-label="Ward Unit Filters">
        {WARD_FILTERS.map((wf) => {
          const isSelected = selectedWard === wf.id;
          const count = wardCounts[wf.id] || 0;
          return (
            <button
              key={wf.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`ipd-queue__filter-chip ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedWard(wf.id)}
            >
              <span className="material-symbols-rounded chip-icon">{wf.icon}</span>
              <span>{wf.label}</span>
              <span className="chip-count">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Search Bar ── */}
      <div className="ipd-queue__search-wrap">
        <span className="material-symbols-rounded ipd-queue__search-icon">search</span>
        <input
          type="text"
          className="ipd-queue__search-input"
          placeholder="Search name, MRN, bed..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="ipd-queue__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear Search"
          >
            <span className="material-symbols-rounded">cancel</span>
          </button>
        )}
      </div>

      {/* ── 4. Inpatient Queue List ── */}
      <div className="ipd-queue__list">
        {filteredList.length === 0 ? (
          <div className="ipd-queue__empty">
            <span className="material-symbols-rounded">hotel</span>
            <p>No inpatients found</p>
            <span>Try adjusting your ward filter or search criteria</span>
          </div>
        ) : (
          filteredList.map((adm) => (
            <IpdQueueCard
              key={adm._id}
              admission={adm}
              selected={selectedAdmissionId === adm._id}
              onSelect={onSelectAdmission}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default IpdPatientQueue;
