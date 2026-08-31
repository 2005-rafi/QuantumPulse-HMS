/**
 * features/ipd/AdminFacilityBuilder.jsx
 * Administrator Physical Hospital Facility & Spatial Bed Management Command Center.
 * Integrates 2D BookMyShow Bed Canvas, real-time KPI metrics, and on-tap FacilityBuilderSheet modals.
 */
import React, { useState, useEffect, useMemo } from 'react';
import BedMapCanvas from '../../components/ipd/BedMapCanvas';
import BedDetailDrawer from '../../components/ipd/BedDetailDrawer';
import FacilityBuilderSheet from './FacilityBuilderSheet';
import { Md3Button, Md3Select } from '../../components/md3/Md3FormComponents';
import { useToast } from '../../context/ToastContext';
import ipdApi from '../../services/ipdApi';

export const AdminFacilityBuilder = () => {
  const { showSuccess, showError } = useToast();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardClassFilter, setWardClassFilter] = useState('ALL');

  // Modal Sheet state
  const [sheetState, setSheetState] = useState({
    isOpen: false,
    mode: 'BED', // 'FLOOR' | 'ROOM' | 'BED'
    floorId: '',
    roomId: '',
  });

  const loadFacilityData = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      setFloors(res.data?.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load facility bed map:', err);
      showError('Failed to load live facility layout');
    }
  };

  useEffect(() => {
    loadFacilityData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadFacilityData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute Hospital-Wide Global Metrics
  const globalStats = useMemo(() => {
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let maintenanceBeds = 0;
    let reservedBeds = 0;
    let icuBeds = 0;

    for (const floor of floors) {
      for (const room of floor.rooms || []) {
        const isIcu = ['ICU', 'CCU', 'HDU', 'NICU', 'PICU'].includes(room.roomType);
        for (const bed of room.beds || []) {
          totalBeds++;
          if (bed.status === 'OCCUPIED') occupiedBeds++;
          else if (bed.status === 'VACANT') vacantBeds++;
          else if (['UNDER_MAINTENANCE', 'CLEANING_IN_PROGRESS', 'BLOCKED'].includes(bed.status)) maintenanceBeds++;
          else if (bed.status === 'RESERVED') reservedBeds++;

          if (isIcu) icuBeds++;
        }
      }
    }

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      occupiedBeds,
      vacantBeds,
      maintenanceBeds,
      reservedBeds,
      icuBeds,
      occupancyRate,
    };
  }, [floors]);

  const handleOpenSheet = (mode = 'BED', floorId = '', roomId = '') => {
    setSheetState({
      isOpen: true,
      mode,
      floorId: floorId || (floors.length > 0 ? floors[0]._id : ''),
      roomId,
    });
  };

  const handleCloseSheet = () => {
    setSheetState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSheetSuccess = () => {
    handleCloseSheet();
    loadFacilityData();
  };

  const handleSelectBed = (bed) => {
    setSelectedBed(bed);
  };

  const handleUpdateStatus = async (bedId, status) => {
    try {
      await ipdApi.updateBedStatus(bedId, status);
      showSuccess(`Bed status updated to ${status}`);
      setSelectedBed(null);
      loadFacilityData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update bed status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* ── Top Header & Actions ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '28px', color: 'var(--md-sys-color-primary)' }}>
              domain_add
            </span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
              Hospital Facility & Spatial Bed Management
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Interactive Spatial Ward Canvas • Infrastructure Planning & Bed Inventory Control
          </p>
        </div>

        {/* ── Action Trigger Buttons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Md3Button
            variant="tonal"
            onClick={() => handleOpenSheet('FLOOR')}
            type="button"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
              layers
            </span>
            + Add Floor
          </Md3Button>

          <Md3Button
            variant="tonal"
            onClick={() => handleOpenSheet('ROOM')}
            type="button"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
              meeting_room
            </span>
            + Add Room
          </Md3Button>

          <Md3Button
            variant="filled"
            onClick={() => handleOpenSheet('BED')}
            type="button"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
              single_bed
            </span>
            + Add Bed
          </Md3Button>
        </div>
      </div>

      {/* ── KPI Hospital Metrics Row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Total Beds */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-primary-container, #c3e7ff)',
              color: 'var(--md-sys-color-on-primary-container, #001e2e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded">bed</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', fontWeight: 600 }}>Total Beds</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{globalStats.totalBeds}</div>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-error-container, #ffdad6)',
              color: 'var(--md-sys-color-on-error-container, #410002)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded">analytics</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', fontWeight: 600 }}>Occupied</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {globalStats.occupiedBeds}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--md-sys-color-outline)' }}>
                ({globalStats.occupancyRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Vacant Beds */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-primary-container, #bbf2e1)',
              color: 'var(--md-sys-color-on-primary-container, #00211a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', fontWeight: 600 }}>Vacant & Ready</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{globalStats.vacantBeds}</div>
          </div>
        </div>

        {/* Critical Care (ICU) */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-tertiary-container, #ffddb3)',
              color: 'var(--md-sys-color-on-tertiary-container, #2b1700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded">monitor_heart</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', fontWeight: 600 }}>Critical Care / ICU</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{globalStats.icuBeds}</div>
          </div>
        </div>

        {/* Maintenance / Sanitizing */}
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-surface-container-high, #e0e8e4)',
              color: 'var(--md-sys-color-on-surface-variant, #404944)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-rounded">cleaning_services</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', fontWeight: 600 }}>Sanitizing / Maint</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{globalStats.maintenanceBeds}</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: 'var(--md-sys-color-surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ width: '160px' }}>
            <Md3Select
              label="Bed Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="VACANT">Vacant Only</option>
              <option value="OCCUPIED">Occupied Only</option>
              <option value="RESERVED">Reserved</option>
              <option value="UNDER_MAINTENANCE">Maintenance</option>
              <option value="CLEANING_IN_PROGRESS">Cleaning</option>
            </Md3Select>
          </div>

          <div style={{ width: '180px' }}>
            <Md3Select
              label="Ward Billing Class"
              value={wardClassFilter}
              onChange={(e) => setWardClassFilter(e.target.value)}
            >
              <option value="ALL">All Ward Tiers</option>
              <option value="GENERAL_WARD">General Ward</option>
              <option value="SEMI_PRIVATE">Semi-Private</option>
              <option value="PRIVATE">Private Single</option>
              <option value="DELUXE_PRIVATE">Deluxe Suite</option>
              <option value="ICU">ICU Critical Care</option>
            </Md3Select>
          </div>
        </div>

        <button
          type="button"
          onClick={loadFacilityData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            backgroundColor: 'var(--md-sys-color-surface-container-low, #f4f4f7)',
            color: 'var(--md-sys-color-on-surface, #1b1b1f)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
            refresh
          </span>
          Refresh Layout
        </button>
      </div>

      {/* ── 2D Spatial Bed Map Canvas ── */}
      {loading && floors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--md-sys-color-outline)' }}>
          Loading live hospital spatial layout...
        </div>
      ) : (
        <BedMapCanvas
          floors={floors}
          selectedBedId={selectedBed ? String(selectedBed._id) : null}
          onSelectBed={handleSelectBed}
          statusFilter={statusFilter}
          wardClassFilter={wardClassFilter}
          isAdminView={true}
          onAddBedToRoom={(floorId, roomId) => handleOpenSheet('BED', floorId, roomId)}
        />
      )}

      {/* ── Administrative Bed Detail Drawer ── */}
      <BedDetailDrawer
        bed={selectedBed}
        isOpen={Boolean(selectedBed)}
        onClose={() => setSelectedBed(null)}
        onUpdateStatus={handleUpdateStatus}
        onAdmit={() => {}}
        onTransfer={() => {}}
      />

      {/* ── On-Tap Facility Builder Slide-Over Sheet (Modal) ── */}
      <FacilityBuilderSheet
        isOpen={sheetState.isOpen}
        onClose={handleCloseSheet}
        onSuccess={handleSheetSuccess}
        initialMode={sheetState.mode}
        floors={floors}
        preselectedFloorId={sheetState.floorId}
        preselectedRoomId={sheetState.roomId}
      />
    </div>
  );
};

export default AdminFacilityBuilder;
