/**
 * components/ipd/BedMapCanvas.jsx
 * 2D Spatial Floor & Room Cluster Layout Canvas for BookMyShow Bed Management.
 * Implements Material Design 3 expressive cards, clinical text sanitization,
 * and robust responsive wrapping.
 */
import React, { useState, useMemo } from 'react';
import BedCell from './BedCell';
import ClinicalStationIdleDeck from '../md3/ClinicalStationIdleDeck';
import { cleanClinicalText } from '../../utils/clinicalText';
import './BedMapCanvas.css';

/**
 * Helper to map room type to semantic MD3 color modifier
 */
const getRoomTypeBadgeModifier = (roomType) => {
  const type = String(roomType || '').toUpperCase();
  if (['ICU', 'CCU', 'HDU', 'NICU', 'PICU', 'EMERGENCY'].includes(type)) {
    return 'ipd-room-type-badge--icu';
  }
  if (['OT', 'POST_OP_RECOVERY'].includes(type)) {
    return 'ipd-room-type-badge--ot';
  }
  if (['PRIVATE', 'DELUXE_PRIVATE', 'SUITE'].includes(type)) {
    return 'ipd-room-type-badge--private';
  }
  return 'ipd-room-type-badge--ward';
};

export const BedMapCanvas = ({
  floors = [],
  selectedBedId = null,
  onSelectBed,
  statusFilter = 'ALL',
  wardClassFilter = 'ALL',
  isAdminView = false,
  activeFloorId: controlledFloorId = null,
  onFloorChange,
  onAddBedToRoom,
  onEditFloor,
  onDeleteFloor,
  onEditRoom,
  onDeleteRoom,
}) => {
  const [internalFloorId, setInternalFloorId] = useState(null);
  const activeFloorId = controlledFloorId ? controlledFloorId : internalFloorId;

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
      <div style={{ padding: '24px 8px' }}>
        <ClinicalStationIdleDeck
          preset="WARD_OPERATIONS"
          title="No Hospital Floor Layout Configured"
          description="Hospital floors, rooms and bed comfort tiers have not been created yet. Configure floors and ward maps in the Facility Builder."
        />
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

  const cleanCurrentFloorName = cleanClinicalText(currentFloor?.floorName || `Floor ${currentFloor?.floorNumber}`);

  return (
    <div className="ipd-map-container">
      {/* Floor KPI Summary Header Bar with Action Controls */}
      <div className="ipd-map-stats-bar">
        <div className="ipd-map-stats-bar__title-wrap">
          <span className="ipd-map-stats-bar__floor-title">{cleanCurrentFloorName}</span>
          <span className="ipd-map-stats-bar__floor-sub">
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

          {isAdminView && currentFloor && (
            <div className="ipd-admin-btn-group" style={{ marginLeft: '6px' }}>
              <button
                type="button"
                className="ipd-admin-pill-btn"
                onClick={() => onEditFloor?.(currentFloor)}
                title={`Edit Floor ${currentFloor.floorNumber}`}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  edit
                </span>
                Edit Floor
              </button>
              <button
                type="button"
                className="ipd-admin-pill-btn ipd-admin-pill-btn--danger"
                onClick={() => onDeleteFloor?.(currentFloor)}
                disabled={stats.occupiedBeds > 0}
                title={
                  stats.occupiedBeds > 0
                    ? 'Cannot delete floor with active occupied beds'
                    : `Delete Floor ${currentFloor.floorNumber}`
                }
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  delete
                </span>
                Delete Floor
              </button>
            </div>
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

          const hasOccupiedBeds = room.beds?.some((b) => b.status === 'OCCUPIED');
          const cleanRoomNumber = cleanClinicalText(room.roomNumber || '');
          const cleanRoomName = cleanClinicalText(room.roomName || '');
          const cleanRoomType = cleanClinicalText(room.roomType?.replace(/_/g, ' ') || 'ROOM');
          const badgeClassModifier = getRoomTypeBadgeModifier(room.roomType);

          return (
            <div key={room._id} className="ipd-room-card">
              <div className="ipd-room-header">
                <div className="ipd-room-title-group">
                  <div className="ipd-room-number-row">
                    <span className="ipd-room-number">Room {cleanRoomNumber}</span>
                    <span className={`ipd-room-type-badge ${badgeClassModifier}`}>
                      {cleanRoomType}
                    </span>
                  </div>
                  {cleanRoomName && (
                    <span className="ipd-room-name" title={cleanRoomName}>
                      {cleanRoomName}
                    </span>
                  )}
                </div>

                {isAdminView && (
                  <div className="ipd-admin-btn-group">
                    <button
                      type="button"
                      className="ipd-admin-add-bed-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddBedToRoom?.(currentFloor._id, room._id);
                      }}
                      title={`Add new bed to Room ${cleanRoomNumber}`}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                        add
                      </span>
                      Add Bed
                    </button>
                    <button
                      type="button"
                      className="ipd-admin-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRoom?.(currentFloor, room);
                      }}
                      title={`Edit Room ${cleanRoomNumber}`}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ipd-admin-icon-btn ipd-admin-icon-btn--delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRoom?.(room);
                      }}
                      disabled={hasOccupiedBeds}
                      title={
                        hasOccupiedBeds
                          ? 'Cannot delete room with active occupied beds'
                          : `Delete Room ${cleanRoomNumber}`
                      }
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                        delete
                      </span>
                    </button>
                  </div>
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
                    <div className="ipd-room-empty-state__info">
                      <span className="material-symbols-rounded">single_bed</span>
                      <span>No beds configured</span>
                    </div>
                    {isAdminView && (
                      <button
                        type="button"
                        className="ipd-admin-add-bed-btn"
                        onClick={() => onAddBedToRoom?.(currentFloor._id, room._id)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          add
                        </span>
                        Add First Bed
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
