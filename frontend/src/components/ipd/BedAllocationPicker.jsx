import React, { useState, useEffect, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './BedAllocationPicker.css';

/**
 * BedAllocationPicker — Interactive Material 3 Bed and Room Allocator.
 * 
 * Props:
 *   selectedBedId     {string}    Currently selected bed ID
 *   onSelectBed       {function}  Callback (bedObject) => void
 *   patientGender     {string}    'Male' | 'Female' | 'Other'
 *   wardClassFilter   {string}    Optional filter ('ALL', 'GENERAL_WARD', 'ICU', etc.)
 *   error             {string}    Error message to display
 */
export const BedAllocationPicker = ({
  selectedBedId,
  onSelectBed,
  patientGender = 'Male',
  wardClassFilter = 'ALL',
  error,
}) => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBeds = async () => {
      try {
        setLoading(true);
        const res = await ipdApi.getBedMap();
        const data = res.data?.data || [];
        if (isMounted) {
          setFloors(data);
          if (data.length > 0) {
            setActiveFloorId(data[0]._id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err.response?.data?.message || err.message || 'Failed to load bed map');
          setLoading(false);
        }
      }
    };

    fetchBeds();
    return () => { isMounted = false; };
  }, []);

  const activeFloor = useMemo(() => {
    if (!floors.length) return null;
    return floors.find((f) => f._id === activeFloorId) || floors[0];
  }, [floors, activeFloorId]);

  // Find currently selected bed object for summary
  const selectedBedObject = useMemo(() => {
    if (!selectedBedId || !floors.length) return null;
    for (const fl of floors) {
      for (const rm of fl.rooms || []) {
        for (const bd of rm.beds || []) {
          if (bd._id === selectedBedId) {
            return {
              ...bd,
              roomNumber: rm.roomNumber,
              roomType: rm.roomType,
              floorName: fl.floorName,
              floorNumber: fl.floorNumber,
            };
          }
        }
      }
    }
    return null;
  }, [selectedBedId, floors]);

  // Validate gender compatibility
  const checkGenderCompatibility = (room) => {
    const restriction = (room.genderRestriction || 'ANY').toUpperCase();
    const gender = (patientGender || '').toUpperCase();

    if (restriction === 'MALE' && gender !== 'MALE') return false;
    if (restriction === 'FEMALE' && gender !== 'FEMALE') return false;
    return true;
  };

  return (
    <div className="md3-bed-picker-container">
      {/* Header */}
      <div className="md3-bed-picker-header">
        <h4 className="md3-bed-picker-title">
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>bed</span>
          <span>Select Inpatient Bed &amp; Room</span>
        </h4>
        {patientGender && (
          <span className="md3-bed-picker-patient-gender-tag">
            <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
              {patientGender.toLowerCase() === 'female' ? 'female' : 'male'}
            </span>
            <span>Patient: {patientGender}</span>
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.80rem' }}>
          Loading hospital floor layout and live bed status...
        </div>
      ) : loadError ? (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.78rem' }}>
          {loadError}
        </div>
      ) : floors.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.80rem' }}>
          No floors or inpatient rooms configured in the hospital builder.
        </div>
      ) : (
        <>
          {/* Floor Tabs */}
          <div className="md3-bed-picker-nav">
            {floors.map((floor) => {
              const isActive = floor._id === activeFloorId;
              const vacantCount = (floor.rooms || []).reduce(
                (acc, rm) => acc + (rm.beds || []).filter((b) => b.status === 'VACANT').length,
                0
              );
              return (
                <button
                  key={floor._id}
                  type="button"
                  className={`md3-bed-picker-floor-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveFloorId(floor._id)}
                >
                  <span>{floor.floorName || `Floor ${floor.floorNumber}`}</span>
                  <span style={{ opacity: 0.8, fontSize: '0.70rem', marginLeft: '4px' }}>
                    ({vacantCount} vacant)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rooms and Beds in Active Floor */}
          <div className="md3-bed-picker-rooms">
            {(!activeFloor?.rooms || activeFloor.rooms.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.78rem' }}>
                No rooms available on this floor.
              </div>
            ) : (
              activeFloor.rooms.map((room) => {
                const isGenderMatch = checkGenderCompatibility(room);
                const genderLabel = (room.genderRestriction || 'ANY').toUpperCase();

                // Filter beds if wardClassFilter provided
                const visibleBeds = (room.beds || []).filter((b) => {
                  if (wardClassFilter && wardClassFilter !== 'ALL') {
                    return b.wardBillingTier === wardClassFilter || room.roomType === wardClassFilter;
                  }
                  return true;
                });

                if (visibleBeds.length === 0) return null;

                return (
                  <div key={room._id} className="md3-bed-picker-room-card">
                    {/* Room Header */}
                    <div className="md3-bed-picker-room-header">
                      <span className="md3-bed-picker-room-name">
                        <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--md-sys-color-primary)' }}>
                          meeting_room
                        </span>
                        <span>Room {room.roomNumber}</span>
                      </span>

                      <div className="md3-bed-picker-room-tags">
                        <span className="md3-bed-picker-tier-badge">
                          {room.roomType?.replace(/_/g, ' ') || 'General Ward'}
                        </span>
                        <span className={`md3-bed-picker-gender-badge md3-bed-picker-gender-badge--${genderLabel.toLowerCase()}`}>
                          {genderLabel === 'FEMALE' ? 'Female Ward' : genderLabel === 'MALE' ? 'Male Ward' : 'Unisex / Any'}
                        </span>
                      </div>
                    </div>

                    {!isGenderMatch && (
                      <div className="md3-bed-gender-warning">
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>warning</span>
                        <span>Gender restriction: This room is designated for {genderLabel} patients only.</span>
                      </div>
                    )}

                    {/* Beds Grid */}
                    <div className="md3-bed-picker-beds-row">
                      {visibleBeds.map((bed) => {
                        const isSelected = bed._id === selectedBedId;
                        const isVacant = bed.status === 'VACANT';
                        const isOccupied = bed.status === 'OCCUPIED';
                        const isMaintenance = bed.status === 'UNDER_MAINTENANCE' || bed.status === 'MAINTENANCE';
                        const canSelect = isVacant && isGenderMatch;

                        return (
                          <div
                            key={bed._id}
                            className={`md3-bed-pill ${isVacant ? 'is-vacant' : ''} ${isSelected ? 'is-selected' : ''} ${isOccupied ? 'is-occupied' : ''} ${isMaintenance ? 'is-maintenance' : ''} ${!isGenderMatch ? 'is-gender-mismatch' : ''}`}
                            onClick={() => {
                              if (canSelect) {
                                onSelectBed({
                                  ...bed,
                                  roomNumber: room.roomNumber,
                                  roomType: room.roomType,
                                  floorName: activeFloor.floorName,
                                  floorNumber: activeFloor.floorNumber,
                                });
                              }
                            }}
                            role="button"
                            tabIndex={canSelect ? 0 : -1}
                            title={!isGenderMatch ? 'Gender mismatch' : `Bed ${bed.bedLabel || bed.bedNumber} (${bed.status})`}
                          >
                            <div className="md3-bed-pill-top">
                              <span className="md3-bed-pill-label">
                                {bed.bedLabel || `Bed ${bed.bedNumber}`}
                              </span>
                              <span className={`md3-bed-pill-status md3-bed-pill-status--${bed.status.toLowerCase()}`}>
                                {bed.status === 'VACANT' ? 'Vacant' : bed.status === 'OCCUPIED' ? 'Occupied' : 'Maint'}
                              </span>
                            </div>
                            <span className="md3-bed-pill-rate">
                              {bed.wardBillingTier?.replace(/_/g, ' ') || 'Standard'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Bed Summary */}
          {selectedBedObject && (
            <div className="md3-bed-selected-summary">
              <div>
                <strong>Selected: {selectedBedObject.bedLabel || `Bed ${selectedBedObject.bedNumber}`}</strong>
                <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                  (Room {selectedBedObject.roomNumber} · {selectedBedObject.floorName || `Floor ${selectedBedObject.floorNumber}`})
                </span>
              </div>
              <span style={{ fontWeight: 700 }}>
                {selectedBedObject.wardBillingTier?.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ color: 'var(--md-sys-color-error, #ba1a1a)', fontSize: '0.75rem', fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default BedAllocationPicker;
