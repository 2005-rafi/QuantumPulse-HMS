/**
 * features/ipd/WardTimeMonitoringView.jsx
 * Real-time Inpatient Length-of-Stay (LOS), Housekeeping Turnaround Timers, and Discharge Clearance Workstation.
 * Pure Material Design 3 theme tokens, compact clinical card sizing, zero hardcoded colors, zero emojis.
 */
import React, { useState, useEffect, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { Md3TextField } from '../../components/md3/Md3FormComponents';
import Md3TabSwitch from '../../components/md3/Md3TabSwitch';
import WardTimeCard from '../../components/ipd/WardTimeCard';
import WardTimeListView from '../../components/ipd/WardTimeListView';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';

export const WardTimeMonitoringView = ({ userPosition = '' }) => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // ALL, CLEANING, OCCUPIED, LONG_STAY, VACANT
  const [layoutMode, setLayoutMode] = useState('cards'); // 'cards' | 'list'
  const [actionLoading, setActionLoading] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 1-second interval for live ticking elapsed timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      setFloors(res.data?.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load telemetry bed data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Flatten all beds across floors and rooms
  const allBeds = useMemo(() => {
    const beds = [];
    floors.forEach((floor) => {
      floor.rooms?.forEach((room) => {
        room.beds?.forEach((bed) => {
          beds.push({
            ...bed,
            floorNumber: floor.floorNumber,
            floorName: floor.name,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
          });
        });
      });
    });
    return beds;
  }, [floors]);

  // Telemetry Aggregates
  const stats = useMemo(() => {
    let occupied = 0;
    let vacant = 0;
    let cleaning = 0;
    let maintenance = 0;
    let longStays = 0; // > 5 days

    allBeds.forEach((b) => {
      if (b.status === 'OCCUPIED') {
        occupied++;
        if (b.currentAdmissionId?.admissionDate) {
          const diffDays = (currentTime - new Date(b.currentAdmissionId.admissionDate).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 5) longStays++;
        }
      } else if (b.status === 'VACANT') {
        vacant++;
      } else if (b.status === 'CLEANING_IN_PROGRESS') {
        cleaning++;
      } else if (b.status === 'UNDER_MAINTENANCE' || b.status === 'BLOCKED') {
        maintenance++;
      }
    });

    return {
      total: allBeds.length,
      occupied,
      vacant,
      cleaning,
      maintenance,
      longStays,
      occupancyRate: allBeds.length > 0 ? Math.round((occupied / allBeds.length) * 100) : 0,
    };
  }, [allBeds, currentTime]);

  // Tab definitions for Md3TabSwitch
  const telemetryTabs = useMemo(() => {
    return [
      {
        id: 'ALL',
        label: 'All Active Beds',
        badge: stats.total,
        icon: 'hotel',
      },
      {
        id: 'CLEANING',
        label: 'Housekeeping Queue',
        badge: stats.cleaning + stats.maintenance,
        icon: 'cleaning_services',
      },
      {
        id: 'OCCUPIED',
        label: 'Occupied Inpatients',
        badge: stats.occupied,
        icon: 'bed',
      },
      {
        id: 'LONG_STAY',
        label: 'Long Stay Alert',
        badge: stats.longStays,
        icon: 'schedule',
      },
      {
        id: 'VACANT',
        label: 'Available Vacant',
        badge: stats.vacant,
        icon: 'check_circle',
      },
    ];
  }, [stats]);

  // Action Handlers
  const handleUpdateStatus = async (bedId, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [bedId]: true }));
    try {
      await ipdApi.updateBedStatus(bedId, newStatus);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bed status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [bedId]: false }));
    }
  };

  // Helper formatting for elapsed time
  const formatElapsedTime = (dateString) => {
    if (!dateString) return '—';
    const diffMs = Math.max(0, currentTime - new Date(dateString).getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Helper formatting for stay duration in days and hours
  const formatStayDuration = (admissionDate) => {
    if (!admissionDate) return { days: 0, text: 'Day 1' };
    const diffMs = Math.max(0, currentTime - new Date(admissionDate).getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24) + 1;
    return {
      days,
      text: `Day ${days} (${totalHours}h)`,
      isLongStay: days >= 5,
    };
  };

  // Filtered list
  const filteredBeds = useMemo(() => {
    return allBeds.filter((bed) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientName = `${bed.currentPatientId?.firstName || ''} ${bed.currentPatientId?.lastName || ''}`.toLowerCase();
        const bedLabel = (bed.bedLabel || '').toLowerCase();
        const mrn = (bed.currentPatientId?.mrn || '').toLowerCase();
        const room = (bed.roomNumber || '').toLowerCase();
        if (!patientName.includes(q) && !bedLabel.includes(q) && !mrn.includes(q) && !room.includes(q)) {
          return false;
        }
      }

      // Tab matching
      if (tabFilter === 'CLEANING') {
        return bed.status === 'CLEANING_IN_PROGRESS' || bed.status === 'UNDER_MAINTENANCE';
      }
      if (tabFilter === 'LONG_STAY') {
        if (bed.status !== 'OCCUPIED' || !bed.currentAdmissionId?.admissionDate) return false;
        const diffDays = (currentTime - new Date(bed.currentAdmissionId.admissionDate).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 5;
      }
      if (tabFilter === 'OCCUPIED') {
        return bed.status === 'OCCUPIED';
      }
      if (tabFilter === 'VACANT') {
        return bed.status === 'VACANT';
      }

      return true;
    });
  }, [allBeds, searchQuery, tabFilter, currentTime]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* ── TOP BAR: TITLE + VIEW SWITCHER + SEARCH BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
              Ward Time &amp; Turnaround Telemetry
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: 'var(--md-sys-shape-corner-full, 999px)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '12px', color: 'var(--md-sys-color-primary)' }}>sensors</span>
              LIVE TELEMETRY
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', margin: '2px 0 0 0' }}>
            Active Patient Length of Stay (LOS) • Sanitization Turnaround Timers • Housekeeping Dispatch &amp; SLA
          </p>
        </div>

        {/* View Switcher & Search Bar Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Card / List Layout Toggle */}
          <div className="md3-view-toggle-group" role="group" aria-label="Telemetry layout view mode">
            <button
              type="button"
              className={`md3-view-toggle-btn ${layoutMode === 'cards' ? 'active' : ''}`}
              onClick={() => setLayoutMode('cards')}
              title="Card Grid View"
              aria-pressed={layoutMode === 'cards'}
            >
              <span className="material-symbols-rounded">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`md3-view-toggle-btn ${layoutMode === 'list' ? 'active' : ''}`}
              onClick={() => setLayoutMode('list')}
              title="Tabular List View"
              aria-pressed={layoutMode === 'list'}
            >
              <span className="material-symbols-rounded">view_list</span>
              <span>List</span>
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ width: '240px' }}>
            <Md3TextField
              placeholder="Search bed, patient, MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── REAL-TIME TELEMETRY METRICS GRID (COMPACT DENSITY & MD3 COLOR THEORY) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          width: '100%',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
            background: 'var(--md-sys-color-surface-container-low)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 700, letterSpacing: '0.04em' }}>OCCUPANCY RATE</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--md-sys-color-primary)', marginTop: '2px', lineHeight: 1.1 }}>
            {stats.occupancyRate}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {stats.occupied} of {stats.total} beds occupied
          </span>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
            background: 'color-mix(in srgb, var(--md-sys-color-primary-container) 35%, var(--md-sys-color-surface))',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-primary)', fontWeight: 700, letterSpacing: '0.04em' }}>VACANT AVAILABLE</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--md-sys-color-primary)', marginTop: '2px', lineHeight: 1.1 }}>
            {stats.vacant}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Ready for instant admission
          </span>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
            background: 'color-mix(in srgb, var(--md-sys-color-tertiary-container) 40%, var(--md-sys-color-surface))',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-tertiary-container)', fontWeight: 700, letterSpacing: '0.04em' }}>CLEANING IN PROGRESS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--md-sys-color-tertiary)', marginTop: '2px', lineHeight: 1.1 }}>
            {stats.cleaning}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Housekeeping turnaround active
          </span>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
            background: 'color-mix(in srgb, var(--md-sys-color-error-container) 35%, var(--md-sys-color-surface))',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-error)', fontWeight: 700, letterSpacing: '0.04em' }}>LONG STAY (&gt;5 DAYS)</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--md-sys-color-error)', marginTop: '2px', lineHeight: 1.1 }}>
            {stats.longStays}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Review for discharge readiness
          </span>
        </div>
      </div>

      {/* ── REUSABLE MATERIAL 3 TAB SWITCHER COMPONENT ── */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '2px' }}>
        <Md3TabSwitch
          tabs={telemetryTabs}
          activeTab={tabFilter}
          onChange={(tabId) => setTabFilter(tabId)}
          size="medium"
        />
      </div>

      {/* ── REAL-TIME CONTENT: CARDS VS LIST ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--md-sys-color-outline)' }}>
          Loading real-time telemetry stream...
        </div>
      ) : filteredBeds.length === 0 ? (
        <div style={{ padding: '20px 0', width: '100%' }}>
          <Md3EmptyState
            icon="bed"
            title="No beds found"
            description="There are no beds matching the current filter. Try selecting another tab or resetting your search."
            variant="card"
          />
        </div>
      ) : layoutMode === 'list' ? (
        /* Tabular List View */
        <div style={{ width: '100%' }}>
          <WardTimeListView
            beds={filteredBeds}
            currentTime={currentTime}
            onUpdateStatus={handleUpdateStatus}
            actionLoading={actionLoading}
            formatElapsedTime={formatElapsedTime}
            formatStayDuration={formatStayDuration}
          />
        </div>
      ) : (
        /* 5-Column Responsive Card Grid View (Desktop 5 elements per row) */
        <div className="ward-telemetry-grid">
          {filteredBeds.map((bed) => (
            <WardTimeCard
              key={bed._id}
              bed={bed}
              currentTime={currentTime}
              onUpdateStatus={handleUpdateStatus}
              isActionBusy={actionLoading[bed._id]}
              formatElapsedTime={formatElapsedTime}
              formatStayDuration={formatStayDuration}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WardTimeMonitoringView;
