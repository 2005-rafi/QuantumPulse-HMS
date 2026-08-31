/**
 * features/ipd/FacilityBuilderSheet.jsx
 * Slide-over popup modal for creating Floors, Rooms, and Inpatient Beds.
 * Follows Material 3 design tokens and matches CreateStaffSheet & RegistrationSheet UX.
 */
import React, { useState, useEffect } from 'react';
import { Md3Button, Md3TextField, Md3Select } from '../../components/md3/Md3FormComponents';
import ipdApi from '../../services/ipdApi';
import { useToast } from '../../context/ToastContext';

const ROOM_TYPES = [
  { value: 'GENERAL_WARD', label: 'General Ward' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private (Twin Sharing)' },
  { value: 'PRIVATE', label: 'Private Single Room' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Suite' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'CCU', label: 'Coronary Care Unit (CCU)' },
  { value: 'HDU', label: 'High Dependency Unit (HDU)' },
  { value: 'NICU', label: 'Neonatal ICU (NICU)' },
  { value: 'PICU', label: 'Pediatric ICU (PICU)' },
  { value: 'POST_OP_RECOVERY', label: 'Post-Op Recovery Room' },
  { value: 'ISOLATION', label: 'Negative Pressure Isolation' },
  { value: 'EMERGENCY', label: 'Emergency & Triage Bay' },
  { value: 'OT', label: 'Operation Theatre (OT)' },
];

const WARD_CLASSES = [
  { value: 'GENERAL_WARD', label: 'General Ward (Base Tier)' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private Tier' },
  { value: 'PRIVATE', label: 'Private Single Tier' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Suite Tier' },
  { value: 'ICU', label: 'ICU / Critical Care Tier' },
];

const GENDER_OPTIONS = [
  { value: 'UNRESTRICTED', label: 'Unrestricted (Any Gender)' },
  { value: 'MALE_ONLY', label: 'Male Patients Only' },
  { value: 'FEMALE_ONLY', label: 'Female Patients Only' },
];

const BED_FEATURES = [
  { id: 'VENTILATOR_READY', label: 'Ventilator Ready', icon: 'air' },
  { id: 'OXYGEN_PIPED', label: 'Oxygen Piped (Central)', icon: 'vital_signs' },
  { id: 'MONITOR_ATTACHED', label: 'Multipara Cardiac Monitor', icon: 'monitor_heart' },
  { id: 'SUCTION_READY', label: 'Central Suction', icon: 'vacuum' },
  { id: 'INFUSION_PUMP', label: 'Infusion Pump Ready', icon: 'syringe' },
];

export const FacilityBuilderSheet = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'BED',
  floors = [],
  preselectedFloorId = '',
  preselectedRoomId = '',
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState(initialMode);
  const [loading, setLoading] = useState(false);

  // Floor Form
  const [floorNumber, setFloorNumber] = useState('');
  const [floorName, setFloorName] = useState('');
  const [wing, setWing] = useState('Main Wing');

  // Room Form
  const [roomFloorId, setRoomFloorId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('GENERAL_WARD');
  const [genderRestriction, setGenderRestriction] = useState('UNRESTRICTED');
  const [baseTariff, setBaseTariff] = useState('');

  // Bed Form
  const [bedFloorId, setBedFloorId] = useState('');
  const [bedRoomId, setBedRoomId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [bedLabel, setBedLabel] = useState('');
  const [wardClass, setWardClass] = useState('GENERAL_WARD');
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // Sync state when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (preselectedFloorId) {
        setRoomFloorId(preselectedFloorId);
        setBedFloorId(preselectedFloorId);
      } else if (floors.length > 0) {
        setRoomFloorId(floors[0]._id);
        setBedFloorId(floors[0]._id);
      }

      if (preselectedRoomId) {
        setBedRoomId(preselectedRoomId);
      }
    }
  }, [isOpen, initialMode, preselectedFloorId, preselectedRoomId, floors]);

  // Derive rooms for the selected floor in Bed form
  const currentFloorForBeds = floors.find((f) => String(f._id) === String(bedFloorId));
  const availableRoomsForBeds = currentFloorForBeds?.rooms || [];

  useEffect(() => {
    if (availableRoomsForBeds.length > 0 && !bedRoomId) {
      setBedRoomId(availableRoomsForBeds[0]._id);
    }
  }, [bedFloorId, availableRoomsForBeds, bedRoomId]);

  if (!isOpen) return null;

  const toggleFeature = (featId) => {
    if (selectedFeatures.includes(featId)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== featId));
    } else {
      setSelectedFeatures([...selectedFeatures, featId]);
    }
  };

  // ── 1. Create Floor ──
  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (floorNumber === '') {
      showError('Please enter a valid floor number.');
      return;
    }
    try {
      setLoading(true);
      await ipdApi.createFloor({
        floorNumber: parseInt(floorNumber, 10),
        floorName: floorName.trim() || `Floor ${floorNumber}`,
        wing: wing.trim() || 'Main Wing',
      });
      showSuccess(`Floor ${floorNumber} created successfully!`);
      setFloorNumber('');
      setFloorName('');
      setWing('Main Wing');
      onSuccess?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create floor');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Create Room ──
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomFloorId) {
      showError('Please select a floor for this room.');
      return;
    }
    if (!roomNumber.trim() || !roomName.trim()) {
      showError('Please enter room code/number and room name.');
      return;
    }
    try {
      setLoading(true);
      await ipdApi.createRoom({
        floorId: roomFloorId,
        roomNumber: roomNumber.trim(),
        roomName: roomName.trim(),
        roomType,
        genderRestriction,
        baseTariffRate: baseTariff ? parseFloat(baseTariff) : undefined,
      });
      showSuccess(`Room "${roomName}" created successfully!`);
      setRoomNumber('');
      setRoomName('');
      setBaseTariff('');
      onSuccess?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Create Bed ──
  const handleCreateBed = async (e) => {
    e.preventDefault();
    if (!bedRoomId) {
      showError('Please select a room for this bed.');
      return;
    }
    if (!bedNumber.trim()) {
      showError('Please enter a bed number (e.g. Bed-01).');
      return;
    }
    try {
      setLoading(true);
      await ipdApi.createBed({
        roomId: bedRoomId,
        bedNumber: bedNumber.trim(),
        bedLabel: bedLabel.trim() || bedNumber.trim(),
        wardClass,
        features: selectedFeatures,
      });
      showSuccess(`Bed "${bedLabel || bedNumber}" added successfully!`);
      setBedNumber('');
      setBedLabel('');
      setSelectedFeatures([]);
      onSuccess?.();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add bed to room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 1200,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: 'var(--md-sys-color-surface, #ffffff)',
          color: 'var(--md-sys-color-on-surface, #1b1b1f)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--md-sys-elevation-3, -4px 0 24px rgba(0,0,0,0.18))',
          animation: 'slideInRight 0.25s cubic-bezier(0, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #e0e4df)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--md-sys-color-surface-container-low, #f4f4f7)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-sys-color-primary, #00668b)' }}>
                domain_add
              </span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Hospital Facility Builder</h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--md-sys-color-outline, #73777f)' }}>
              Configure physical floors, clinical rooms & inpatient bed infrastructure
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--md-sys-color-on-surface-variant, #44474e)',
            }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* ── Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #e0e4df)',
            backgroundColor: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('FLOOR')}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'FLOOR' ? '3px solid var(--md-sys-color-primary, #00668b)' : '3px solid transparent',
              color: activeTab === 'FLOOR' ? 'var(--md-sys-color-primary, #00668b)' : 'var(--md-sys-color-on-surface-variant, #44474e)',
              fontWeight: activeTab === 'FLOOR' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              layers
            </span>
            1. Floor
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROOM')}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ROOM' ? '3px solid var(--md-sys-color-primary, #00668b)' : '3px solid transparent',
              color: activeTab === 'ROOM' ? 'var(--md-sys-color-primary, #00668b)' : 'var(--md-sys-color-on-surface-variant, #44474e)',
              fontWeight: activeTab === 'ROOM' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              meeting_room
            </span>
            2. Room / Unit
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BED')}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'BED' ? '3px solid var(--md-sys-color-primary, #00668b)' : '3px solid transparent',
              color: activeTab === 'BED' ? 'var(--md-sys-color-primary, #00668b)' : 'var(--md-sys-color-on-surface-variant, #44474e)',
              fontWeight: activeTab === 'BED' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              single_bed
            </span>
            3. Inpatient Bed
          </button>
        </div>

        {/* ── Scrollable Form Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ════ TAB 1: ADD FLOOR ════ */}
          {activeTab === 'FLOOR' && (
            <form onSubmit={handleCreateFloor} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-container, #f0f4f2)',
                  fontSize: '0.82rem',
                  color: 'var(--md-sys-color-on-surface-variant, #44474e)',
                  lineHeight: '1.4',
                }}
              >
                <strong>Architectural Hierarchy</strong>: Hospital floors serve as top-level containers for wings, clinical wards, and operational units.
              </div>

              <Md3TextField
                label="Floor Number *"
                type="number"
                value={floorNumber}
                onChange={(e) => setFloorNumber(e.target.value)}
                placeholder="e.g. 0 (Ground), 1, 2, 3"
                required
              />

              <Md3TextField
                label="Floor Name *"
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="e.g. 2nd Floor — Deluxe & Executive Suites"
                required
              />

              <Md3TextField
                label="Hospital Wing"
                value={wing}
                onChange={(e) => setWing(e.target.value)}
                placeholder="e.g. Main Hospital Tower, East Surgical Block"
              />

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Md3Button variant="text" type="button" onClick={onClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Creating Floor...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    add
                  </span>
                  Create Floor
                </Md3Button>
              </div>
            </form>
          )}

          {/* ════ TAB 2: ADD ROOM / WARD ════ */}
          {activeTab === 'ROOM' && (
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Assigned Hospital Floor *
                </label>
                <Md3Select value={roomFloorId} onChange={(e) => setRoomFloorId(e.target.value)} required>
                  {floors.map((fl) => (
                    <option key={fl._id} value={fl._id}>
                      Floor {fl.floorNumber}: {fl.floorName} ({fl.wing})
                    </option>
                  ))}
                </Md3Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Md3TextField
                  label="Room / Ward Code *"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. G-01, ICU-02"
                  required
                />
                <Md3TextField
                  label="Room Name *"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Emergency Triage Bay"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Room Classification Type *
                </label>
                <Md3Select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </Md3Select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Gender Restriction Policy
                </label>
                <Md3Select value={genderRestriction} onChange={(e) => setGenderRestriction(e.target.value)}>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Md3Select>
              </div>

              <Md3TextField
                label="Base Daily Room Tariff (₹ optional override)"
                type="number"
                value={baseTariff}
                onChange={(e) => setBaseTariff(e.target.value)}
                placeholder="Leave blank to use default Tariff Rule"
              />

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Md3Button variant="text" type="button" onClick={onClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Creating Room...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    add
                  </span>
                  Create Room
                </Md3Button>
              </div>
            </form>
          )}

          {/* ════ TAB 3: ADD INPATIENT BED ════ */}
          {activeTab === 'BED' && (
            <form onSubmit={handleCreateBed} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Select Floor *
                  </label>
                  <Md3Select
                    value={bedFloorId}
                    onChange={(e) => {
                      setBedFloorId(e.target.value);
                      const f = floors.find((fl) => String(fl._id) === String(e.target.value));
                      if (f && f.rooms?.length > 0) setBedRoomId(f.rooms[0]._id);
                      else setBedRoomId('');
                    }}
                    required
                  >
                    {floors.map((fl) => (
                      <option key={fl._id} value={fl._id}>
                        Floor {fl.floorNumber}: {fl.floorName}
                      </option>
                    ))}
                  </Md3Select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Select Room *
                  </label>
                  <Md3Select value={bedRoomId} onChange={(e) => setBedRoomId(e.target.value)} required>
                    {availableRoomsForBeds.map((rm) => (
                      <option key={rm._id} value={rm._id}>
                        {rm.roomNumber} — {rm.roomName}
                      </option>
                    ))}
                  </Md3Select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Md3TextField
                  label="Bed Identifier / Number *"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  placeholder="e.g. Bed-01, ICU-Bed-04"
                  required
                />
                <Md3TextField
                  label="Bed Display Label"
                  value={bedLabel}
                  onChange={(e) => setBedLabel(e.target.value)}
                  placeholder="e.g. Bed 01 (Window Side)"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Ward Billing Tier *
                </label>
                <Md3Select value={wardClass} onChange={(e) => setWardClass(e.target.value)}>
                  {WARD_CLASSES.map((wc) => (
                    <option key={wc.value} value={wc.value}>
                      {wc.label}
                    </option>
                  ))}
                </Md3Select>
              </div>

              {/* Telemetry Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Equipped Medical Telemetry & Features:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {BED_FEATURES.map((feat) => {
                    const isSelected = selectedFeatures.includes(feat.id);
                    return (
                      <button
                        key={feat.id}
                        type="button"
                        onClick={() => toggleFeature(feat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid var(--md-sys-color-primary, #00668b)'
                            : '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
                          backgroundColor: isSelected
                            ? 'var(--md-sys-color-primary-container, #c3e7ff)'
                            : 'var(--md-sys-color-surface-container-low, #f4f4f7)',
                          color: isSelected
                            ? 'var(--md-sys-color-on-primary-container, #001e2e)'
                            : 'var(--md-sys-color-on-surface, #1b1b1f)',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                          {feat.icon}
                        </span>
                        {feat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Md3Button variant="text" type="button" onClick={onClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Adding Bed...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    add
                  </span>
                  Add Bed to Room
                </Md3Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacilityBuilderSheet;
