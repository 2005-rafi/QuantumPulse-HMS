/**
 * components/ipd/BedMapCanvas.jsx
 * 2D Spatial Floor & Room Cluster Layout Canvas for BookMyShow Bed Management.
 */
import React, { useState, useMemo } from 'react';
import BedCell from './BedCell';
import Md3TabSwitch from '../md3/Md3TabSwitch';
import './BedMapCanvas.css';

export const BedMapCanvas = ({
  floors = [],
  selectedBedId = null,
  onSelectBed,
  statusFilter = 'ALL',
  wardClassFilter = 'ALL',
  isAdminView = false,
  onAddBedToRoom,
}) => {
  const [activeFloorId, setActiveFloorId] = useState(null);

  // Tab definitions for floors
  const floorTabs = useMemo(() => {
    return floors.map((f) => ({
      id: String(f._id),
      label: `Floor ${f.floorNumber}: ${f.wing || f.floorName.split('—')[0]}`,
      badge: f.stats ? `${f.stats.vacantBeds} Free` : undefined,
    }));
  }, [floors]);

  // Set default active floor once floors load
  const currentFloor = useMemo(() => {
    if (!floors || floors.length === 0) return null;
    if (activeFloorId) {
      const match = floors.find((f) => String(f._id) === activeFloorId);
      if (match) return match;
    }
    return floors[0];
  }, [floors, activeFloorId]);

  if (!floors || floors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--md-sys-color-outline)' }}>
        No hospital floor layout configured. Create floors in the Administrator Setup panel.
      </div>
    );
  }

  const stats = currentFloor?.stats || {
    totalBeds: 0,
    vacantBeds: 0,
    occupiedBeds: 0,
    reservedBeds: 0,
    maintenanceBeds: 0,
    occupancyRate: 0,
  };

  return (
    <div className="ipd-map-container">
      {/* 1. Floor Selector Tabs */}
      {floorTabs.length > 1 && (
        <Md3TabSwitch
          tabs={floorTabs}
          activeTab={currentFloor ? String(currentFloor._id) : ''}
          onChange={(tabId) => setActiveFloorId(tabId)}
          size="medium"
        />
      )}

      {/* 2. Floor KPI Summary Header Bar */}
      <div className="ipd-map-stats-bar">
        <div>
          <strong style={{ fontSize: '0.95rem' }}>{currentFloor?.floorName}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', marginLeft: '8px' }}>
            ({stats.totalBeds} Total Beds • {stats.occupancyRate}% Occupied)
          </span>
        </div>

        <div className="ipd-map-stats-chips">
          <span className="ipd-stat-pill ipd-stat-pill--vacant">
            <span>●</span> {stats.vacantBeds} Vacant
          </span>
          <span className="ipd-stat-pill ipd-stat-pill--occupied">
            <span>●</span> {stats.occupiedBeds} Occupied
          </span>
          {stats.reservedBeds > 0 && (
            <span className="ipd-stat-pill ipd-stat-pill--reserved">
              <span>●</span> {stats.reservedBeds} Reserved
            </span>
          )}
          {stats.maintenanceBeds > 0 && (
            <span className="ipd-stat-pill ipd-stat-pill--maint">
              <span>●</span> {stats.maintenanceBeds} Maint
            </span>
          )}
        </div>
      </div>

      {/* 3. 2D Room Clusters & Bed Matrix */}
      <div className="ipd-rooms-grid">
        {currentFloor?.rooms?.map((room) => {
          // Apply client-side status & ward class filters
          const filteredBeds = room.beds?.filter((b) => {
            if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
            if (wardClassFilter !== 'ALL' && b.wardClass !== wardClassFilter) return false;
            return true;
          });

          if (filteredBeds?.length === 0 && (statusFilter !== 'ALL' || wardClassFilter !== 'ALL')) {
            return null; // hide empty rooms when filtering
          }

          return (
            <div key={room._id} className="ipd-room-card">
              <div className="ipd-room-header">
                <div className="ipd-room-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ipd-room-number">Room {room.roomNumber}</span>
                    <span className="ipd-room-type-badge">
                      {room.roomType?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="ipd-room-name">{room.roomName}</span>
                </div>

                {isAdminView && (
                  <button
                    type="button"
                    className="ipd-admin-add-bed-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBedToRoom?.(currentFloor._id, room._id);
                    }}
                    title={`Add new bed to Room ${room.roomNumber}`}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      add
                    </span>
                    Add Bed
                  </button>
                )}
              </div>

              <div className="ipd-room-beds">
                {room.beds?.map((bed) => (
                  <BedCell
                    key={bed._id}
                    bed={bed}
                    isSelected={selectedBedId === String(bed._id)}
                    onClick={onSelectBed}
                  />
                ))}

                {(!room.beds || room.beds.length === 0) && (
                  <div className="ipd-room-empty-state">
                    <span>No beds configured</span>
                    {isAdminView && (
                      <button
                        type="button"
                        className="ipd-admin-add-bed-btn"
                        onClick={() => onAddBedToRoom?.(currentFloor._id, room._id)}
                      >
                        + Add First Bed
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BedMapCanvas;
