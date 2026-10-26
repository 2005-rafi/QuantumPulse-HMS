import React, { useState, useEffect, useMemo } from 'react';
import ipdApi from '../../services/ipdApi';
import { Md3Select } from '../md3/Md3FormComponents';
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

  const fetchBeds = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await ipdApi.getBedMap();
      const data = res.data?.data || [];
      setFloors(data);
      if (data.length > 0) {
        setActiveFloorId(data[0]._id);
      }
      setLoading(false);
    } catch (err) {
      const friendlyMsg =
        err.userMessage ||
        (err.response?.status === 404
          ? 'Inpatient bed allocation service is synchronizing. Please check with Ward Operations.'
          : 'Unable to retrieve live bed availability. Please click retry.');
      setLoadError(friendlyMsg);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  const floorOptions = useMemo(() => {
    return floors.map((floor) => {
      const vacantCount = (floor.rooms || []).reduce(
        (acc, rm) => acc + (rm.beds || []).filter((b) => b.status === 'VACANT').length,
        0
      );
      const floorName = floor.floorName || `Floor ${floor.floorNumber}`;
      return {
        value: floor._id,
        label: `${floorName} (${vacantCount} vacant)`,
      };
    });
  }, [floors]);

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

  const [genderNotice, setGenderNotice] = useState(null);

  // Validate gender compatibility (room and bed levels)
  const checkGenderCompatibility = (room, bed = null) => {
    const rawRestriction = (room?.genderRestriction || 'UNRESTRICTED').toUpperCase();
    const pGender = (patientGender || '').trim().toUpperCase();

    // Inclusive accommodation for Other / Non-binary / Transgender
    if (!pGender || pGender === 'OTHER' || pGender === 'NON_BINARY' || pGender === 'TRANSGENDER' || pGender === 'UNKNOWN') {
      return { isMatch: true, reason: null };
    }

    const isRoomFemale = rawRestriction === 'FEMALE_ONLY' || rawRestriction === 'FEMALE';
    const isRoomMale = rawRestriction === 'MALE_ONLY' || rawRestriction === 'MALE';

    if (isRoomFemale && pGender !== 'FEMALE') {
      return {
        isMatch: false,
        reason: `Room ${room.roomNumber} is a designated Female-only ward. Cannot assign Male patient (${patientGender}). Please select a Male or Unisex ward.`,
      };
    }

    if (isRoomMale && pGender !== 'MALE') {
      return {
        isMatch: false,
        reason: `Room ${room.roomNumber} is a designated Male-only ward. Cannot assign Female patient (${patientGender}). Please select a Female or Unisex ward.`,
      };
    }

    // Bed-level designation check
    const bedLabel = (bed?.bedLabel || bed?.bedNumber || '').toUpperCase();
    if (pGender === 'MALE' && (bedLabel.includes('FEMALE') || bedLabel.startsWith('F-') || bedLabel.startsWith('F_'))) {
      return {
        isMatch: false,
        reason: `Bed "${bed?.bedLabel || bed?.bedNumber}" is designated for Female patients.`,
      };
    }

    if (pGender === 'FEMALE' && (bedLabel.includes('MALE') && !bedLabel.includes('FEMALE') || bedLabel.startsWith('M-') || bedLabel.startsWith('M_'))) {
      return {
        isMatch: false,
        reason: `Bed "${bed?.bedLabel || bed?.bedNumber}" is designated for Male patients.`,
      };
    }

    return { isMatch: true, reason: null };
  };

  const getGenderBadgeInfo = (room) => {
    const raw = (room?.genderRestriction || 'UNRESTRICTED').toUpperCase();
    if (raw === 'FEMALE_ONLY' || raw === 'FEMALE') {
      return { label: 'Female Ward (Female Only)', classSuffix: 'female', icon: 'female' };
    }
    if (raw === 'MALE_ONLY' || raw === 'MALE') {
      return { label: 'Male Ward (Male Only)', classSuffix: 'male', icon: 'male' };
    }
    return { label: 'Unisex / All Genders', classSuffix: 'any', icon: 'wc' };
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

      {genderNotice && (
        <div className="md3-bed-picker-interactive-notice" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span className="material-symbols-rounded" style={{ color: '#be185d', fontSize: '18px', flexShrink: 0 }}>
              lock
            </span>
            <span><strong>Privacy &amp; Ward Restriction:</strong> {genderNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setGenderNotice(null)}
            className="md3-bed-notice-close-btn"
            aria-label="Dismiss Notice"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>close</span>
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.80rem' }}>
          Loading hospital floor layout and live bed status...
        </div>
      ) : loadError ? (
        <div style={{ padding: '14px', background: 'var(--md-sys-color-error-container, #ffdad6)', color: 'var(--md-sys-color-on-error-container, #410002)', borderRadius: '12px', border: '1px solid var(--md-sys-color-error, #ba1a1a)', display: 'flex', flexDirection: 'column', gap: '8px' }} role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>info</span>
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            className="md3-ward-btn-compact md3-ward-btn-compact--outlined"
            onClick={fetchBeds}
            style={{ alignSelf: 'flex-start', background: 'transparent', borderColor: 'currentColor', color: 'inherit' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>refresh</span>
            Retry Live Bed Map
          </button>
        </div>
      ) : floors.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.80rem' }}>
          No floors or inpatient rooms configured in the hospital builder.
        </div>
      ) : (
        <>
          {/* Floor Selection Dropdown */}
          <div className="md3-bed-picker-filter-bar">
            <Md3Select
              id="bed-picker-floor-select"
              name="floorId"
              label="Select Hospital Floor *"
              value={activeFloorId || (floors[0]?._id ?? '')}
              onChange={(e) => {
                setActiveFloorId(e.target.value);
                setGenderNotice(null);
              }}
              options={floorOptions}
              leadingIcon="apartment"
            />
          </div>

          {/* Rooms and Beds in Active Floor */}
          <div className="md3-bed-picker-rooms">
            {(!activeFloor?.rooms || activeFloor.rooms.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.78rem' }}>
                No rooms available on this floor.
              </div>
            ) : (
              activeFloor.rooms.map((room) => {
                const roomComp = checkGenderCompatibility(room);
                const isRoomMatch = roomComp.isMatch;
                const badgeInfo = getGenderBadgeInfo(room);

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
                        <span className={`md3-bed-picker-gender-badge md3-bed-picker-gender-badge--${badgeInfo.classSuffix}`}>
                          <span className="material-symbols-rounded" style={{ fontSize: '11px', marginRight: '3px', verticalAlign: 'middle' }}>
                            {badgeInfo.icon}
                          </span>
                          <span>{badgeInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    {!isRoomMatch && (
                      <div className="md3-bed-gender-warning">
                        <span className="material-symbols-rounded" style={{ fontSize: '14px', flexShrink: 0 }}>warning</span>
                        <span>{roomComp.reason}</span>
                      </div>
                    )}

                    {/* Beds Grid */}
                    <div className="md3-bed-picker-beds-row">
                      {visibleBeds.map((bed) => {
                        const bedComp = checkGenderCompatibility(room, bed);
                        const isGenderMatch = isRoomMatch && bedComp.isMatch;
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
                                setGenderNotice(null);
                                onSelectBed({
                                  ...bed,
                                  roomNumber: room.roomNumber,
                                  roomType: room.roomType,
                                  floorName: activeFloor.floorName,
                                  floorNumber: activeFloor.floorNumber,
                                });
                              } else if (!isGenderMatch) {
                                setGenderNotice(bedComp.reason || roomComp.reason);
                              }
                            }}
                            role="button"
                            tabIndex={canSelect ? 0 : 0}
                            aria-disabled={!canSelect}
                            title={!isGenderMatch ? (bedComp.reason || roomComp.reason) : `Bed ${bed.bedLabel || bed.bedNumber} (${bed.status})`}
                          >
                            <div className="md3-bed-pill-top">
                              <span className="md3-bed-pill-label">
                                {!isGenderMatch && (
                                  <span className="material-symbols-rounded" style={{ fontSize: '11px', color: '#be185d', marginRight: '3px', verticalAlign: 'middle' }}>
                                    lock
                                  </span>
                                )}
                                {bed.bedLabel || `Bed ${bed.bedNumber}`}
                              </span>
                              <span className={`md3-bed-pill-status md3-bed-pill-status--${bed.status.toLowerCase()}`}>
                                {!isGenderMatch ? 'Locked' : bed.status === 'VACANT' ? 'Vacant' : bed.status === 'OCCUPIED' ? 'Occupied' : 'Maint'}
                              </span>
                            </div>
                            <span className="md3-bed-pill-rate">
                              {!isGenderMatch ? 'Gender Restricted' : (bed.wardBillingTier?.replace(/_/g, ' ') || 'Standard')}
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
