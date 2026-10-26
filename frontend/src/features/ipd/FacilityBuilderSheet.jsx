import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Md3Button, Md3TextField, Md3Select, Md3UnsavedChangesDialog } from '../../components/md3/Md3FormComponents';
import { cleanClinicalText, formatRoomLabel } from '../../utils/clinicalText';
import ipdApi from '../../services/ipdApi';
import tariffAPI from '../../services/tariffAPI';

import { CURRENCY_SYMBOL } from '../../constants/currency';
import { useToast } from '../../context/ToastContext';
import './FacilityBuilderSheet.css';

const BedTariffPreviewBadge = ({ wardClass, comfortTier, dailyRateOverride }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    tariffAPI.resolvePrice({
      category: 'BED_CHARGES',
      wardClass,
      comfortTier,
      visitType: 'IPD',
    }).then(res => {
      if (active) setPreview(res.data?.data || res.data);
    }).catch(() => {});

    return () => { active = false; };
  }, [wardClass, comfortTier]);

  const effectiveRate = dailyRateOverride ? Number(dailyRateOverride) : (preview?.dailyRate || 0);
  const isOverridden = !!dailyRateOverride;

  return (
    <div style={{
      marginTop: '6px',
      padding: '6px 10px',
      borderRadius: '8px',
      background: isOverridden ? 'var(--md-sys-color-surface-variant, #e1e3e1)' : 'var(--md-sys-color-surface-container-low, #f0f7f4)',
      border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '16px', color: isOverridden ? '#ea580c' : 'var(--md-sys-color-primary, #006a57)' }}>
          {isOverridden ? 'edit_attributes' : 'verified'}
        </span>
        <span>
          {isOverridden ? 'Manual Bed Override Rate' : 'Inherited Central Master Tariff'}: <strong>{CURRENCY_SYMBOL}{effectiveRate}/day</strong>
          {!isOverridden && preview?.hourlyRate ? ` (${CURRENCY_SYMBOL}${preview.hourlyRate}/hr)` : ''}
        </span>
      </div>
      {preview?.minAdvanceDeposit > 0 && !isOverridden && (
        <span style={{ color: 'var(--md-sys-color-outline)' }}>
          Min Deposit: {CURRENCY_SYMBOL}{preview.minAdvanceDeposit}
        </span>
      )}
    </div>
  );
};

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
  { value: 'EMERGENCY', label: 'Emergency & Nursing Bay' },
  { value: 'OT', label: 'Operation Theatre (OT)' },
];

const WARD_CLASSES = [
  { value: 'GENERAL_WARD', label: 'General Ward (Base Tier)' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private Tier' },
  { value: 'PRIVATE', label: 'Private Single Tier' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Suite Tier' },
  { value: 'ICU', label: 'ICU / Critical Care Tier' },
];

const COMFORT_TIERS = [
  { value: 'STANDARD', label: 'Standard Tier' },
  { value: 'COMFORT', label: 'Comfort Tier' },
  { value: 'DELUXE', label: 'Deluxe Tier' },
  { value: 'SUPER_DELUXE_SUITE', label: 'Super Deluxe Suite' },
  { value: 'EXECUTIVE_PRESIDENTIAL', label: 'Executive Presidential' },
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

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyFloor = (suggestedNumber = '') => ({
  id: generateId(),
  floorNumber: suggestedNumber !== '' ? String(suggestedNumber) : '',
  floorName: '',
  wing: 'Main Wing',
  floorDescription: '',
  isExpanded: true,
  errors: {},
});

const createEmptyRoom = () => ({
  id: generateId(),
  roomNumber: '',
  roomName: '',
  roomType: 'GENERAL_WARD',
  genderRestriction: 'UNRESTRICTED',
  baseTariff: '',
  isExpanded: true,
  errors: {},
});

const createEmptyBed = () => ({
  id: generateId(),
  bedNumber: '',
  bedLabel: '',
  wardClass: 'GENERAL_WARD',
  comfortTier: 'STANDARD',
  dailyRateOverride: '',
  bedNotes: '',
  selectedFeatures: [],
  isExpanded: true,
  errors: {},
});

export const FacilityBuilderSheet = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'BED',
  floors = [],
  preselectedFloorId = '',
  preselectedRoomId = '',
  isEdit = false,
  editItem = null,
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // ── Multi-Floor Builder State ──
  const [floorsList, setFloorsList] = useState([createEmptyFloor(0)]);

  // Single Floor Edit State
  const [singleFloorNumber, setSingleFloorNumber] = useState('');
  const [singleFloorName, setSingleFloorName] = useState('');
  const [singleWing, setSingleWing] = useState('Main Wing');
  const [singleFloorDescription, setSingleFloorDescription] = useState('');

  // ── Multi-Room Builder State ──
  const [roomFloorId, setRoomFloorId] = useState('');
  const [roomsList, setRoomsList] = useState([createEmptyRoom()]);

  // Single Room Edit State
  const [singleRoomNumber, setSingleRoomNumber] = useState('');
  const [singleRoomName, setSingleRoomName] = useState('');
  const [singleRoomType, setSingleRoomType] = useState('GENERAL_WARD');
  const [singleGenderRestriction, setSingleGenderRestriction] = useState('UNRESTRICTED');
  const [singleBaseTariff, setSingleBaseTariff] = useState('');

  // ── Multi-Bed Builder State ──
  const [bedFloorId, setBedFloorId] = useState('');
  const [bedRoomId, setBedRoomId] = useState('');
  const [bedsList, setBedsList] = useState([createEmptyBed()]);

  // Single Bed Edit State
  const [singleBedNumber, setSingleBedNumber] = useState('');
  const [singleBedLabel, setSingleBedLabel] = useState('');
  const [singleWardClass, setSingleWardClass] = useState('GENERAL_WARD');
  const [singleComfortTier, setSingleComfortTier] = useState('STANDARD');
  const [singleDailyRateOverride, setSingleDailyRateOverride] = useState('');
  const [singleBedNotes, setSingleBedNotes] = useState('');
  const [singleSelectedFeatures, setSingleSelectedFeatures] = useState([]);

  const prevIsOpenRef = useRef(false);
  const prevEditItemRef = useRef(null);

  // Sync state ONLY when modal transitions from closed -> open or when editItem changes
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const editItemChanged = isEdit && editItem !== prevEditItemRef.current;

    if (isOpen && (justOpened || editItemChanged)) {
      setShowDiscardConfirm(false);
      if (isEdit && editItem?.data) {
        const item = editItem.data;
        setActiveTab(editItem.type);

        if (editItem.type === 'FLOOR') {
          setSingleFloorNumber(item.floorNumber !== undefined ? String(item.floorNumber) : '');
          setSingleFloorName(cleanClinicalText(item.floorName || ''));
          setSingleWing(cleanClinicalText(item.wing || 'Main Wing'));
          setSingleFloorDescription(cleanClinicalText(item.description || ''));
        } else if (editItem.type === 'ROOM') {
          setRoomFloorId(item.floorId?._id || item.floorId || preselectedFloorId || (floors.length > 0 ? floors[0]._id : ''));
          setSingleRoomNumber(cleanClinicalText(item.roomNumber || ''));
          setSingleRoomName(cleanClinicalText(item.roomName || ''));
          setSingleRoomType(item.roomType || 'GENERAL_WARD');
          setSingleGenderRestriction(item.genderRestriction || 'UNRESTRICTED');
          setSingleBaseTariff(item.baseTariff ?? item.baseTariffRate ?? '');
        } else if (editItem.type === 'BED') {
          setBedFloorId(item.floorId?._id || item.floorId || preselectedFloorId || (floors.length > 0 ? floors[0]._id : ''));
          setBedRoomId(item.roomId?._id || item.roomId || preselectedRoomId || '');
          setSingleBedNumber(cleanClinicalText(item.bedNumber || ''));
          setSingleBedLabel(cleanClinicalText(item.bedLabel || ''));
          setSingleWardClass(item.wardClass || 'GENERAL_WARD');
          setSingleComfortTier(item.comfortTier || 'STANDARD');
          setSingleDailyRateOverride(item.dailyRateOverride !== null && item.dailyRateOverride !== undefined ? String(item.dailyRateOverride) : '');
          setSingleBedNotes(cleanClinicalText(item.notes || ''));
          setSingleSelectedFeatures(item.features || []);
        }
      } else if (justOpened) {
        setActiveTab(initialMode);

        // Reset Multi-Floor Builder
        const nextFloorNum = floors.length > 0 ? floors.length : 0;
        setFloorsList([createEmptyFloor(nextFloorNum)]);

        // Reset Multi-Room Builder
        const defaultFloorId = preselectedFloorId || (floors.length > 0 ? floors[0]._id : '');
        setRoomFloorId(defaultFloorId);
        setRoomsList([createEmptyRoom()]);

        // Reset Multi-Bed Builder
        setBedFloorId(defaultFloorId);
        const currentFloorObj = floors.find((f) => String(f._id) === String(defaultFloorId)) || floors[0];
        const defaultRoomId = preselectedRoomId || (currentFloorObj?.rooms?.length > 0 ? currentFloorObj.rooms[0]._id : '');
        setBedRoomId(defaultRoomId);
        setBedsList([createEmptyBed()]);
      }
    }

    prevIsOpenRef.current = isOpen;
    prevEditItemRef.current = editItem;
  }, [isOpen, isEdit, editItem, initialMode, preselectedFloorId, preselectedRoomId, floors]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (isEdit) {
      if (!editItem?.data) return false;
      const item = editItem.data;
      if (editItem.type === 'FLOOR') {
        return (
          (singleFloorNumber || '') !== String(item.floorNumber ?? '') ||
          (singleFloorName || '') !== (item.floorName || '') ||
          (singleWing || 'Main Wing') !== (item.wing || 'Main Wing') ||
          (singleFloorDescription || '') !== (item.description || '')
        );
      } else if (editItem.type === 'ROOM') {
        return (
          (singleRoomNumber || '') !== (item.roomNumber || '') ||
          (singleRoomName || '') !== (item.roomName || '') ||
          (singleRoomType || 'GENERAL_WARD') !== (item.roomType || 'GENERAL_WARD')
        );
      } else if (editItem.type === 'BED') {
        return (
          (singleBedNumber || '') !== (item.bedNumber || '') ||
          (singleBedLabel || '') !== (item.bedLabel || '') ||
          (singleWardClass || 'GENERAL_WARD') !== (item.wardClass || 'GENERAL_WARD') ||
          (singleComfortTier || 'STANDARD') !== (item.comfortTier || 'STANDARD')
        );
      }
      return false;
    } else {
      if (activeTab === 'FLOOR') {
        if (floorsList.length > 1) return true;
        return Boolean(floorsList[0]?.floorName?.trim() || floorsList[0]?.description?.trim());
      } else if (activeTab === 'ROOM') {
        if (roomsList.length > 1) return true;
        return Boolean(roomsList[0]?.roomNumber?.trim() || roomsList[0]?.roomName?.trim());
      } else if (activeTab === 'BED') {
        if (bedsList.length > 1) return true;
        return Boolean(bedsList[0]?.bedNumber?.trim() || bedsList[0]?.bedLabel?.trim() || bedsList[0]?.bedNotes?.trim());
      }
      return false;
    }
  }, [isEdit, editItem, activeTab, singleFloorNumber, singleFloorName, singleWing, singleFloorDescription, singleRoomNumber, singleRoomName, singleRoomType, singleBedNumber, singleBedLabel, singleWardClass, singleComfortTier, floorsList, roomsList, bedsList]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Intercept Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showDiscardConfirm) {
        e.preventDefault();
        e.stopPropagation();
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, showDiscardConfirm]);


  if (!isOpen) return null;

  // Compute available rooms for selected bed floor
  const selectedFloorObj = floors.find((f) => String(f._id) === String(bedFloorId));
  const availableRoomsForBeds = selectedFloorObj?.rooms || [];

  // ══════════════════════════════════════════════════════════════
  // FLOOR BUILDER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleAddFloorItem = () => {
    const lastNum = floorsList.length > 0 ? Number(floorsList[floorsList.length - 1].floorNumber || 0) : 0;
    const nextNum = isNaN(lastNum) ? floorsList.length : lastNum + 1;
    setFloorsList((prev) => [
      ...prev.map((f) => ({ ...f, isExpanded: false })), // collapse previous for clean view
      createEmptyFloor(nextNum),
    ]);
  };

  const handleRemoveFloorItem = (id) => {
    if (floorsList.length <= 1) {
      setFloorsList([createEmptyFloor(0)]);
      return;
    }
    setFloorsList((prev) => prev.filter((f) => f.id !== id));
  };

  const handleToggleFloorExpand = (id) => {
    setFloorsList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  };

  const handleUpdateFloorField = (id, field, value) => {
    setFloorsList((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updatedErrors = { ...f.errors };
        if (updatedErrors[field]) delete updatedErrors[field];
        return { ...f, [field]: value, errors: updatedErrors };
      })
    );
  };

  // ══════════════════════════════════════════════════════════════
  // ROOM BUILDER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleAddRoomItem = () => {
    setRoomsList((prev) => [
      ...prev.map((r) => ({ ...r, isExpanded: false })), // collapse previous for clean view
      createEmptyRoom(),
    ]);
  };

  const handleRemoveRoomItem = (id) => {
    if (roomsList.length <= 1) {
      setRoomsList([createEmptyRoom()]);
      return;
    }
    setRoomsList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleRoomExpand = (id) => {
    setRoomsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isExpanded: !r.isExpanded } : r))
    );
  };

  const handleUpdateRoomField = (id, field, value) => {
    setRoomsList((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updatedErrors = { ...r.errors };
        if (updatedErrors[field]) delete updatedErrors[field];
        return { ...r, [field]: value, errors: updatedErrors };
      })
    );
  };

  // ══════════════════════════════════════════════════════════════
  // BED BUILDER HANDLERS
  // ══════════════════════════════════════════════════════════════
  const handleAddBedItem = () => {
    setBedsList((prev) => [
      ...prev.map((b) => ({ ...b, isExpanded: false })), // collapse previous for clean view
      createEmptyBed(),
    ]);
  };

  const handleRemoveBedItem = (id) => {
    if (bedsList.length <= 1) {
      setBedsList([createEmptyBed()]);
      return;
    }
    setBedsList((prev) => prev.filter((b) => b.id !== id));
  };

  const handleToggleBedExpand = (id) => {
    setBedsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isExpanded: !b.isExpanded } : b))
    );
  };

  const handleUpdateBedField = (id, field, value) => {
    setBedsList((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const updatedErrors = { ...b.errors };
        if (updatedErrors[field]) delete updatedErrors[field];
        return { ...b, [field]: value, errors: updatedErrors };
      })
    );
  };

  const handleToggleBedFeature = (bedId, featId) => {
    setBedsList((prev) =>
      prev.map((b) => {
        if (b.id !== bedId) return b;
        const currentFeats = b.selectedFeatures || [];
        const nextFeats = currentFeats.includes(featId)
          ? currentFeats.filter((id) => id !== featId)
          : [...currentFeats, featId];
        return { ...b, selectedFeatures: nextFeats };
      })
    );
  };

  // ══════════════════════════════════════════════════════════════
  // SAVE HANDLERS
  // ══════════════════════════════════════════════════════════════

  // ── Save Floor (Batch or Single Edit) ──
  const handleSaveFloors = async (e) => {
    e.preventDefault();

    if (isEdit) {
      if (singleFloorNumber === '' || !singleFloorName.trim()) {
        showError('Please provide Floor Number and Floor Name');
        return;
      }

      try {
        setLoading(true);
        await ipdApi.updateFloor(editItem.data._id, {
          floorNumber: Number(singleFloorNumber),
          floorName: singleFloorName.trim(),
          wing: singleWing.trim(),
          description: singleFloorDescription.trim(),
        });
        showSuccess(`Floor ${singleFloorNumber} updated successfully.`);
        setLoading(false);
        onSuccess && onSuccess();
      } catch (err) {
        setLoading(false);
        showError(err.response?.data?.message || 'Failed to save floor');
      }
      return;
    }

    // Batch Creation Mode
    let hasError = false;
    const validatedFloors = floorsList.map((fl) => {
      const errors = {};
      if (fl.floorNumber === '' || isNaN(Number(fl.floorNumber))) errors.floorNumber = 'Floor number required';
      if (!fl.floorName.trim()) errors.floorName = 'Floor name required';

      if (Object.keys(errors).length > 0) {
        hasError = true;
        return { ...fl, errors, isExpanded: true };
      }
      return { ...fl, errors: {} };
    });

    if (hasError) {
      setFloorsList(validatedFloors);
      showError('Please complete all required floor details highlighted in red');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      const errorsOccurred = [];

      for (const fl of floorsList) {
        try {
          await ipdApi.createFloor({
            floorNumber: Number(fl.floorNumber),
            floorName: fl.floorName.trim(),
            wing: fl.wing.trim(),
            description: fl.floorDescription.trim(),
          });
          successCount++;
        } catch (itemErr) {
          errorsOccurred.push(`Floor ${fl.floorNumber}: ${itemErr.response?.data?.message || itemErr.message}`);
        }
      }

      setLoading(false);
      if (errorsOccurred.length > 0) {
        showError(`Encountered issues: ${errorsOccurred.join('; ')}`);
        if (successCount > 0) onSuccess && onSuccess();
      } else {
        showSuccess(`${successCount} Floor${successCount > 1 ? 's' : ''} created successfully.`);
        onSuccess && onSuccess();
      }
    } catch (err) {
      setLoading(false);
      showError(err.response?.data?.message || 'Failed to save floors');
    }
  };

  // ── Save Rooms (Batch or Single Edit) ──
  const handleSaveRooms = async (e) => {
    e.preventDefault();

    if (isEdit) {
      if (!singleRoomNumber.trim() || !singleRoomName.trim()) {
        showError('Please provide Room Number and Room Name');
        return;
      }
      try {
        setLoading(true);
        await ipdApi.updateRoom(editItem.data._id, {
          roomNumber: singleRoomNumber.trim(),
          roomName: singleRoomName.trim(),
          roomType: singleRoomType,
          genderRestriction: singleGenderRestriction,
          baseTariff: singleBaseTariff ? Number(singleBaseTariff) : undefined,
        });
        showSuccess(`Room ${singleRoomNumber} updated successfully.`);
        setLoading(false);
        onSuccess && onSuccess();
      } catch (err) {
        setLoading(false);
        showError(err.response?.data?.message || 'Failed to save room');
      }
      return;
    }

    // Batch Creation Mode
    if (!roomFloorId) {
      showError('Please select a parent floor for the rooms');
      return;
    }

    // Validate all room items
    let hasError = false;
    const validatedRooms = roomsList.map((r) => {
      const errors = {};
      if (!r.roomNumber.trim()) errors.roomNumber = 'Room number required';
      if (!r.roomName.trim()) errors.roomName = 'Room name required';

      if (Object.keys(errors).length > 0) {
        hasError = true;
        return { ...r, errors, isExpanded: true }; // expand card with error
      }
      return { ...r, errors: {} };
    });

    if (hasError) {
      setRoomsList(validatedRooms);
      showError('Please complete all required room details highlighted in red');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      const errorsOccurred = [];

      for (const rm of roomsList) {
        try {
          await ipdApi.createRoom({
            floorId: roomFloorId,
            roomNumber: rm.roomNumber.trim(),
            roomName: rm.roomName.trim(),
            roomType: rm.roomType,
            genderRestriction: rm.genderRestriction,
            baseTariff: rm.baseTariff ? Number(rm.baseTariff) : undefined,
          });
          successCount++;
        } catch (itemErr) {
          errorsOccurred.push(`Room ${rm.roomNumber}: ${itemErr.response?.data?.message || itemErr.message}`);
        }
      }

      setLoading(false);
      if (errorsOccurred.length > 0) {
        showError(`Encountered issues: ${errorsOccurred.join('; ')}`);
        if (successCount > 0) onSuccess && onSuccess();
      } else {
        showSuccess(`${successCount} Room${successCount > 1 ? 's' : ''} created successfully.`);
        onSuccess && onSuccess();
      }
    } catch (err) {
      setLoading(false);
      showError(err.response?.data?.message || 'Failed to create rooms');
    }
  };

  // ── Save Beds (Batch or Single Edit) ──
  const handleSaveBeds = async (e) => {
    e.preventDefault();

    if (isEdit) {
      if (!singleBedNumber.trim()) {
        showError('Bed Number / Identifier is required');
        return;
      }
      try {
        setLoading(true);
        await ipdApi.updateBed(editItem.data._id, {
          bedNumber: singleBedNumber.trim(),
          bedLabel: singleBedLabel.trim() || singleBedNumber.trim(),
          wardClass: singleWardClass,
          comfortTier: singleComfortTier,
          dailyRateOverride: singleDailyRateOverride !== '' ? Number(singleDailyRateOverride) : null,
          features: singleSelectedFeatures,
          notes: singleBedNotes.trim(),
        });
        showSuccess(`Bed ${singleBedNumber} updated successfully.`);
        setLoading(false);
        onSuccess && onSuccess();
      } catch (err) {
        setLoading(false);
        showError(err.response?.data?.message || 'Failed to save bed');
      }
      return;
    }

    // Batch Creation Mode
    if (!bedFloorId || !bedRoomId) {
      showError('Please select both a Floor and a Room for the beds');
      return;
    }

    // Validate all bed items
    let hasError = false;
    const validatedBeds = bedsList.map((b) => {
      const errors = {};
      if (!b.bedNumber.trim()) errors.bedNumber = 'Bed identifier required';

      if (Object.keys(errors).length > 0) {
        hasError = true;
        return { ...b, errors, isExpanded: true }; // auto expand card
      }
      return { ...b, errors: {} };
    });

    if (hasError) {
      setBedsList(validatedBeds);
      showError('Please complete the required bed identifiers highlighted in red');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      const errorsOccurred = [];

      for (const bd of bedsList) {
        try {
          await ipdApi.createBed({
            floorId: bedFloorId,
            roomId: bedRoomId,
            bedNumber: bd.bedNumber.trim(),
            bedLabel: bd.bedLabel.trim() || bd.bedNumber.trim(),
            wardClass: bd.wardClass,
            comfortTier: bd.comfortTier,
            dailyRateOverride: bd.dailyRateOverride !== '' ? Number(bd.dailyRateOverride) : null,
            features: bd.selectedFeatures,
            notes: bd.bedNotes.trim(),
          });
          successCount++;
        } catch (itemErr) {
          errorsOccurred.push(`Bed ${bd.bedNumber}: ${itemErr.response?.data?.message || itemErr.message}`);
        }
      }

      setLoading(false);
      if (errorsOccurred.length > 0) {
        showError(`Encountered issues: ${errorsOccurred.join('; ')}`);
        if (successCount > 0) onSuccess && onSuccess();
      } else {
        showSuccess(`${successCount} Bed${successCount > 1 ? 's' : ''} added successfully.`);
        onSuccess && onSuccess();
      }
    } catch (err) {
      setLoading(false);
      showError(err.response?.data?.message || 'Failed to create beds');
    }
  };

  const getHeaderTitle = () => {
    if (isEdit) {
      if (activeTab === 'FLOOR') return `Edit Floor ${editItem?.data?.floorNumber || ''}`;
      if (activeTab === 'ROOM') return `Edit Room ${editItem?.data?.roomNumber || ''}`;
      if (activeTab === 'BED') return `Edit Bed ${editItem?.data?.bedNumber || ''}`;
      return 'Edit Infrastructure';
    }
    return 'Hospital Facility Builder';
  };

  return (
    <>
      <div className="facility-sheet-backdrop" onClick={handleAttemptClose}>
        <div className="facility-sheet-container" onClick={(e) => e.stopPropagation()}>
          {/* ── Header ── */}
          <div className="facility-sheet-header">
            <div className="facility-sheet-header__title-group">
              <span className="material-symbols-rounded facility-sheet-header__icon">
                {isEdit ? 'edit_note' : 'domain_add'}
              </span>
              <div>
                <h2 className="facility-sheet-header__title">{getHeaderTitle()}</h2>
                <p className="facility-sheet-header__desc">
                  {isEdit
                    ? 'Modify existing physical infrastructure and clinical attributes'
                    : 'Configure physical floors, clinical rooms & inpatient bed infrastructure'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="facility-sheet-header__close-btn"
              onClick={handleAttemptClose}
              aria-label="Close modal"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>


        {/* ── Navigation Tabs (hidden during edit mode for focused UX) ── */}
        {!isEdit && (
          <div className="facility-sheet-tabs">
            <button
              type="button"
              className={`facility-sheet-tab ${activeTab === 'FLOOR' ? 'facility-sheet-tab--active' : ''}`}
              onClick={() => setActiveTab('FLOOR')}
            >
              <span className="material-symbols-rounded">layers</span>
              1. Add Floor
            </button>

            <button
              type="button"
              className={`facility-sheet-tab ${activeTab === 'ROOM' ? 'facility-sheet-tab--active' : ''}`}
              onClick={() => setActiveTab('ROOM')}
            >
              <span className="material-symbols-rounded">meeting_room</span>
              2. Add Room
            </button>

            <button
              type="button"
              className={`facility-sheet-tab ${activeTab === 'BED' ? 'facility-sheet-tab--active' : ''}`}
              onClick={() => setActiveTab('BED')}
            >
              <span className="material-symbols-rounded">single_bed</span>
              3. Add Bed
            </button>
          </div>
        )}

        {/* ── Form Body ── */}
        <div className="facility-sheet-body">
          {/* ════════════════════════════════════════════════════════════
              TAB 1: FLOOR
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'FLOOR' && (
            <form className="facility-sheet-form" onSubmit={handleSaveFloors}>
              {/* ── Single Edit View ── */}
              {isEdit ? (
                <div className="facility-edit-container">
                  <div className="facility-form-row facility-form-row--floor-num">
                    <Md3TextField
                      label="Floor Number *"
                      type="number"
                      value={singleFloorNumber}
                      onChange={(e) => setSingleFloorNumber(e.target.value)}
                      placeholder="0, 1, 2..."
                      required
                    />
                    <Md3TextField
                      label="Floor Name / Title *"
                      value={singleFloorName}
                      onChange={(e) => setSingleFloorName(e.target.value)}
                      placeholder="e.g. Ground Floor — Surgical Hub"
                      required
                    />
                  </div>

                  <Md3TextField
                    label="Building Wing / Section"
                    value={singleWing}
                    onChange={(e) => setSingleWing(e.target.value)}
                    placeholder="e.g. Surgical Wing, East Wing, Mother & Child"
                  />

                  <Md3TextField
                    label="Floor Description / Clinical Scope"
                    value={singleFloorDescription}
                    onChange={(e) => setSingleFloorDescription(e.target.value)}
                    placeholder="e.g. Dedicated OT suites, PACU recovery, and emergency trauma resuscitation"
                  />
                </div>
              ) : (
                /* ── Multi-Floor Accordion Builder ── */
                <div className="facility-accordion-section">
                  <div className="facility-section-header">
                    <span className="facility-section-title">
                      Configured Floors ({floorsList.length})
                    </span>
                    <span className="facility-section-hint">
                      Add multiple hospital floors in one go with wings and clinical scopes
                    </span>
                  </div>

                  <div className="facility-accordion-list">
                    {floorsList.map((fl, idx) => {
                      const titleLabel = fl.floorName.trim()
                        ? `Floor ${fl.floorNumber !== '' ? fl.floorNumber : idx}: ${fl.floorName.trim()}`
                        : `New Floor #${idx + 1}`;
                      const subLabel = `${fl.wing.trim() || 'Main Wing'}${fl.floorDescription.trim() ? ` • ${fl.floorDescription.trim()}` : ''}`;

                      return (
                        <div
                          key={fl.id}
                          className={`facility-accordion-card ${fl.isExpanded ? 'facility-accordion-card--expanded' : ''} ${Object.keys(fl.errors || {}).length > 0 ? 'facility-accordion-card--error' : ''}`}
                        >
                          {/* Accordion Card Header */}
                          <div
                            className="facility-accordion-header"
                            onClick={() => handleToggleFloorExpand(fl.id)}
                          >
                            <div className="facility-accordion-header__left">
                              <span className="facility-item-badge">#{idx + 1}</span>
                              <div className="facility-accordion-header__titles">
                                <div className="facility-accordion-header__main">
                                  {titleLabel}
                                </div>
                                <div className="facility-accordion-header__sub">
                                  {subLabel}
                                </div>
                              </div>
                            </div>

                            <div className="facility-accordion-header__actions" onClick={(e) => e.stopPropagation()}>
                              {floorsList.length > 1 && (
                                <button
                                  type="button"
                                  className="facility-item-btn facility-item-btn--delete"
                                  title="Delete this floor"
                                  onClick={() => handleRemoveFloorItem(fl.id)}
                                >
                                  <span className="material-symbols-rounded">delete_outline</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="facility-item-btn facility-item-btn--toggle"
                                title={fl.isExpanded ? 'Collapse' : 'Expand'}
                                onClick={() => handleToggleFloorExpand(fl.id)}
                              >
                                <span className="material-symbols-rounded">
                                  {fl.isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Accordion Card Body */}
                          {fl.isExpanded && (
                            <div className="facility-accordion-body">
                              <div className="facility-form-row facility-form-row--floor-num">
                                <Md3TextField
                                  label="Floor Number *"
                                  type="number"
                                  value={fl.floorNumber}
                                  onChange={(e) => handleUpdateFloorField(fl.id, 'floorNumber', e.target.value)}
                                  placeholder="0, 1, 2..."
                                  error={fl.errors?.floorNumber}
                                  required
                                />
                                <Md3TextField
                                  label="Floor Name / Title *"
                                  value={fl.floorName}
                                  onChange={(e) => handleUpdateFloorField(fl.id, 'floorName', e.target.value)}
                                  placeholder="e.g. Ground Floor — Surgical Hub"
                                  error={fl.errors?.floorName}
                                  required
                                />
                              </div>

                              <Md3TextField
                                label="Building Wing / Section"
                                value={fl.wing}
                                onChange={(e) => handleUpdateFloorField(fl.id, 'wing', e.target.value)}
                                placeholder="e.g. Surgical Wing, East Wing, Mother & Child"
                              />

                              <Md3TextField
                                label="Floor Description / Clinical Scope"
                                value={fl.floorDescription}
                                onChange={(e) => handleUpdateFloorField(fl.id, 'floorDescription', e.target.value)}
                                placeholder="e.g. Dedicated OT suites, PACU recovery, and emergency trauma resuscitation"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Centered Add Another Floor Trigger */}
                  <div className="facility-add-trigger-row">
                    <button
                      type="button"
                      className="facility-add-another-btn"
                      onClick={handleAddFloorItem}
                    >
                      <span className="material-symbols-rounded">add_circle</span>
                      <span>Add Another Floor</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="facility-sheet-footer-inline">
                <Md3Button variant="text" type="button" onClick={handleAttemptClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Saving...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    {isEdit ? 'save' : 'add'}
                  </span>
                  {isEdit
                    ? 'Save Floor Changes'
                    : `Create ${floorsList.length} Floor${floorsList.length > 1 ? 's' : ''}`}
                </Md3Button>
              </div>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 2: ROOM (BATCH OR EDIT)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'ROOM' && (
            <form className="facility-sheet-form" onSubmit={handleSaveRooms}>
              {/* Floor Selection */}
              <div className="facility-form-field">
                <label className="facility-form-field__label">
                  Select Parent Floor *
                </label>
                <Md3Select
                  value={roomFloorId}
                  onChange={(e) => setRoomFloorId(e.target.value)}
                  required
                  disabled={isEdit}
                >
                  {floors.map((fl) => (
                    <option key={fl._id} value={fl._id}>
                      Floor {fl.floorNumber}: {cleanClinicalText(fl.floorName)} ({cleanClinicalText(fl.wing)})
                    </option>
                  ))}
                </Md3Select>
              </div>

              {/* ── Single Edit View ── */}
              {isEdit ? (
                <div className="facility-edit-container">
                  <div className="facility-form-row">
                    <Md3TextField
                      label="Room Number *"
                      value={singleRoomNumber}
                      onChange={(e) => setSingleRoomNumber(e.target.value)}
                      placeholder="e.g. G-01, 101, OT-1"
                      required
                    />
                    <Md3TextField
                      label="Room Name *"
                      value={singleRoomName}
                      onChange={(e) => setSingleRoomName(e.target.value)}
                      placeholder="e.g. Modular OT Suite 1"
                      required
                    />
                  </div>

                  <div className="facility-form-row">
                    <div className="facility-form-field">
                      <label className="facility-form-field__label">Room / Ward Type *</label>
                      <Md3Select
                        value={singleRoomType}
                        onChange={(e) => setSingleRoomType(e.target.value)}
                      >
                        {ROOM_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </Md3Select>
                    </div>

                    <div className="facility-form-field">
                      <label className="facility-form-field__label">Gender Restriction</label>
                      <Md3Select
                        value={singleGenderRestriction}
                        onChange={(e) => setSingleGenderRestriction(e.target.value)}
                      >
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </Md3Select>
                    </div>
                  </div>

                  <Md3TextField
                    label="Base Tariff Rate (₹ / Day)"
                    type="number"
                    value={singleBaseTariff}
                    onChange={(e) => setSingleBaseTariff(e.target.value)}
                    placeholder="e.g. 1500, 5000, 12000"
                  />
                </div>
              ) : (
                /* ── Multi-Item Accordion Builder ── */
                <div className="facility-accordion-section">
                  <div className="facility-section-header">
                    <span className="facility-section-title">
                      Configured Rooms ({roomsList.length})
                    </span>
                    <span className="facility-section-hint">
                      Add multiple rooms in one go with custom tariffs &amp; ward types
                    </span>
                  </div>

                  <div className="facility-accordion-list">
                    {roomsList.map((room, idx) => {
                      const roomTypeObj = ROOM_TYPES.find((t) => t.value === room.roomType);
                      const titleLabel = room.roomNumber.trim()
                        ? `${room.roomNumber.trim()}${room.roomName.trim() ? ` — ${room.roomName.trim()}` : ''}`
                        : `New Room #${idx + 1}`;
                      const subLabel = `${roomTypeObj?.label || room.roomType}${room.baseTariff ? ` • ₹${room.baseTariff}/day` : ''}`;

                      return (
                        <div
                          key={room.id}
                          className={`facility-accordion-card ${room.isExpanded ? 'facility-accordion-card--expanded' : ''} ${Object.keys(room.errors || {}).length > 0 ? 'facility-accordion-card--error' : ''}`}
                        >
                          {/* Accordion Card Header */}
                          <div
                            className="facility-accordion-header"
                            onClick={() => handleToggleRoomExpand(room.id)}
                          >
                            <div className="facility-accordion-header__left">
                              <span className="facility-item-badge">#{idx + 1}</span>
                              <div className="facility-accordion-header__titles">
                                <div className="facility-accordion-header__main">
                                  {titleLabel}
                                </div>
                                <div className="facility-accordion-header__sub">
                                  {subLabel}
                                </div>
                              </div>
                            </div>

                            <div className="facility-accordion-header__actions" onClick={(e) => e.stopPropagation()}>
                              {roomsList.length > 1 && (
                                <button
                                  type="button"
                                  className="facility-item-btn facility-item-btn--delete"
                                  title="Delete this room"
                                  onClick={() => handleRemoveRoomItem(room.id)}
                                >
                                  <span className="material-symbols-rounded">delete_outline</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="facility-item-btn facility-item-btn--toggle"
                                title={room.isExpanded ? 'Collapse' : 'Expand'}
                                onClick={() => handleToggleRoomExpand(room.id)}
                              >
                                <span className="material-symbols-rounded">
                                  {room.isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Accordion Card Body */}
                          {room.isExpanded && (
                            <div className="facility-accordion-body">
                              <div className="facility-form-row">
                                <Md3TextField
                                  label="Room Number *"
                                  value={room.roomNumber}
                                  onChange={(e) => handleUpdateRoomField(room.id, 'roomNumber', e.target.value)}
                                  placeholder="e.g. G-01, 101, OT-1"
                                  error={room.errors?.roomNumber}
                                  required
                                />
                                <Md3TextField
                                  label="Room Name *"
                                  value={room.roomName}
                                  onChange={(e) => handleUpdateRoomField(room.id, 'roomName', e.target.value)}
                                  placeholder="e.g. Modular OT Suite 1"
                                  error={room.errors?.roomName}
                                  required
                                />
                              </div>

                              <div className="facility-form-row">
                                <div className="facility-form-field">
                                  <label className="facility-form-field__label">
                                    Room / Ward Type *
                                  </label>
                                  <Md3Select
                                    value={room.roomType}
                                    onChange={(e) => handleUpdateRoomField(room.id, 'roomType', e.target.value)}
                                  >
                                    {ROOM_TYPES.map((rt) => (
                                      <option key={rt.value} value={rt.value}>
                                        {rt.label}
                                      </option>
                                    ))}
                                  </Md3Select>
                                </div>

                                <div className="facility-form-field">
                                  <label className="facility-form-field__label">
                                    Gender Restriction
                                  </label>
                                  <Md3Select
                                    value={room.genderRestriction}
                                    onChange={(e) => handleUpdateRoomField(room.id, 'genderRestriction', e.target.value)}
                                  >
                                    {GENDER_OPTIONS.map((g) => (
                                      <option key={g.value} value={g.value}>
                                        {g.label}
                                      </option>
                                    ))}
                                  </Md3Select>
                                </div>
                              </div>

                              <Md3TextField
                                label="Base Tariff Rate (₹ / Day)"
                                type="number"
                                value={room.baseTariff}
                                onChange={(e) => handleUpdateRoomField(room.id, 'baseTariff', e.target.value)}
                                placeholder="e.g. 1500, 5000, 12000"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Centered Add Another Room Trigger */}
                  <div className="facility-add-trigger-row">
                    <button
                      type="button"
                      className="facility-add-another-btn"
                      onClick={handleAddRoomItem}
                    >
                      <span className="material-symbols-rounded">add_circle</span>
                      <span>Add Another Room</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="facility-sheet-footer-inline">
                <Md3Button variant="text" type="button" onClick={handleAttemptClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Saving...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    {isEdit ? 'save' : 'add'}
                  </span>
                  {isEdit
                    ? 'Save Room Changes'
                    : `Create ${roomsList.length} Room${roomsList.length > 1 ? 's' : ''}`}
                </Md3Button>
              </div>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 3: BED (BATCH OR EDIT)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'BED' && (
            <form className="facility-sheet-form" onSubmit={handleSaveBeds}>
              {/* Floor & Room Global Selectors */}
              <div className="facility-form-row">
                <div className="facility-form-field">
                  <label className="facility-form-field__label">
                    Select Floor *
                  </label>
                  <Md3Select
                    value={bedFloorId}
                    onChange={(e) => {
                      setBedFloorId(e.target.value);
                      const fObj = floors.find((f) => String(f._id) === String(e.target.value));
                      setBedRoomId(fObj?.rooms?.length > 0 ? fObj.rooms[0]._id : '');
                    }}
                    required
                    disabled={isEdit}
                  >
                    {floors.map((fl) => (
                      <option key={fl._id} value={fl._id}>
                        Floor {fl.floorNumber} - {fl.floorName || fl.wing || 'Main Wing'}
                      </option>
                    ))}
                  </Md3Select>
                </div>

                <div className="facility-form-field">
                  <label className="facility-form-field__label">
                    Select Room *
                  </label>
                  <Md3Select
                    value={bedRoomId}
                    onChange={(e) => setBedRoomId(e.target.value)}
                    required
                    disabled={isEdit}
                  >
                    {availableRoomsForBeds.map((rm) => (
                      <option key={rm._id} value={rm._id}>
                        {formatRoomLabel(rm.roomNumber, rm.roomName)}
                      </option>
                    ))}
                  </Md3Select>
                </div>
              </div>

              {/* ── Single Edit View ── */}
              {isEdit ? (
                <div className="facility-edit-container">
                  <div className="facility-form-row">
                    <Md3TextField
                      label="Bed Identifier / Number *"
                      value={singleBedNumber}
                      onChange={(e) => setSingleBedNumber(e.target.value)}
                      placeholder="e.g. Bed-01, ICU-Bed-04"
                      required
                    />
                    <Md3TextField
                      label="Bed Display Label"
                      value={singleBedLabel}
                      onChange={(e) => setSingleBedLabel(e.target.value)}
                      placeholder="e.g. Near Window North"
                    />
                  </div>

                  <div className="facility-form-row">
                    <div className="facility-form-field">
                      <label className="facility-form-field__label">
                        Ward Class *
                      </label>
                      <Md3Select
                        value={singleWardClass}
                        onChange={(e) => setSingleWardClass(e.target.value)}
                        required
                      >
                        {ROOM_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Md3Select>
                    </div>

                    <div className="facility-form-field">
                      <label className="facility-form-field__label">
                        Comfort Tier *
                      </label>
                      <Md3Select
                        value={singleComfortTier}
                        onChange={(e) => setSingleComfortTier(e.target.value)}
                        required
                      >
                        {COMFORT_TIERS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Md3Select>
                    </div>
                  </div>

                  <BedTariffPreviewBadge
                    wardClass={singleWardClass}
                    comfortTier={singleComfortTier}
                    dailyRateOverride={singleDailyRateOverride}
                  />

                  <div className="facility-form-row" style={{ marginTop: '8px' }}>
                    <Md3TextField
                      label="Daily Tariff Override (optional)"
                      type="number"
                      value={singleDailyRateOverride}
                      onChange={(e) => setSingleDailyRateOverride(e.target.value)}
                      placeholder="Leave blank to inherit central master tariff"
                      helperText="Optional manual override rate for special suites"
                    />
                    <Md3TextField
                      label="Bed Clinical Notes"
                      value={singleBedNotes}
                      onChange={(e) => setSingleBedNotes(e.target.value)}
                      placeholder="e.g. Dedicated telemetry monitor attached"
                    />
                  </div>

                  {/* Bed Features Selector */}
                  <div className="facility-form-field" style={{ marginTop: '4px' }}>
                    <label className="facility-form-field__label">
                      Clinical Equipment & Amenities
                    </label>
                    <div className="facility-chip-grid">
                      {BED_FEATURES.map((feat) => {
                        const isSelected = singleSelectedFeatures.includes(feat.id);
                        return (
                          <button
                            key={feat.id}
                            type="button"
                            className={`facility-filter-chip ${isSelected ? 'facility-filter-chip--selected' : ''}`}
                            onClick={() => {
                              setSingleSelectedFeatures((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== feat.id)
                                  : [...prev, feat.id]
                              );
                            }}
                          >
                            <span className="material-symbols-rounded">
                              {isSelected ? 'check' : feat.icon}
                            </span>
                            {feat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Multi-Bed Builder List ── */
                <div>
                  <div className="facility-accordion-list">
                    {bedsList.map((bed, idx) => {
                      const selectedWardObj = ROOM_TYPES.find((t) => t.value === bed.wardClass);
                      const selectedTierObj = COMFORT_TIERS.find((c) => c.value === bed.comfortTier);
                      const titleLabel = bed.bedNumber.trim()
                        ? `${bed.bedNumber.trim()}${bed.bedLabel ? ` (${bed.bedLabel})` : ''}`
                        : `New Bed #${idx + 1}`;
                      const subLabel = `${selectedWardObj?.label || bed.wardClass} • ${selectedTierObj?.label || bed.comfortTier}`;

                      return (
                        <div
                          key={bed.id}
                          className={`facility-accordion-card ${bed.isExpanded ? 'facility-accordion-card--expanded' : ''} ${Object.keys(bed.errors || {}).length > 0 ? 'facility-accordion-card--error' : ''}`}
                        >
                          <div
                            className="facility-accordion-header"
                            onClick={() => handleToggleBedExpand(bed.id)}
                          >
                            <div className="facility-accordion-header__left">
                              <span className="facility-item-badge">#{idx + 1}</span>
                              <div className="facility-accordion-header__titles">
                                <div className="facility-accordion-header__main">
                                  {titleLabel}
                                </div>
                                <div className="facility-accordion-header__sub">
                                  {subLabel}
                                </div>
                              </div>
                            </div>

                            <div
                              className="facility-accordion-header__actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {bedsList.length > 1 && (
                                <button
                                  type="button"
                                  className="facility-item-btn facility-item-btn--delete"
                                  title="Delete this bed"
                                  onClick={() => handleRemoveBedItem(bed.id)}
                                >
                                  <span className="material-symbols-rounded">delete_outline</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="facility-item-btn"
                                title={bed.isExpanded ? 'Collapse' : 'Expand'}
                                onClick={() => handleToggleBedExpand(bed.id)}
                              >
                                <span className="material-symbols-rounded">
                                  {bed.isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {bed.isExpanded && (
                            <div className="facility-accordion-content">
                              <div className="facility-form-row">
                                <Md3TextField
                                  label="Bed Identifier / Number *"
                                  value={bed.bedNumber}
                                  onChange={(e) => handleUpdateBedField(bed.id, 'bedNumber', e.target.value)}
                                  placeholder="e.g. Bed-01"
                                  error={bed.errors?.bedNumber}
                                  required
                                />
                                <Md3TextField
                                  label="Bed Display Label"
                                  value={bed.bedLabel}
                                  onChange={(e) => handleUpdateBedField(bed.id, 'bedLabel', e.target.value)}
                                  placeholder="e.g. Near Window North"
                                />
                              </div>

                              <div className="facility-form-row">
                                <div className="facility-form-field">
                                  <label className="facility-form-field__label">
                                    Ward Class *
                                  </label>
                                  <Md3Select
                                    value={bed.wardClass}
                                    onChange={(e) => handleUpdateBedField(bed.id, 'wardClass', e.target.value)}
                                    required
                                  >
                                    {ROOM_TYPES.map((t) => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </Md3Select>
                                </div>

                                <div className="facility-form-field">
                                  <label className="facility-form-field__label">
                                    Comfort Tier *
                                  </label>
                                  <Md3Select
                                    value={bed.comfortTier}
                                    onChange={(e) => handleUpdateBedField(bed.id, 'comfortTier', e.target.value)}
                                    required
                                  >
                                    {COMFORT_TIERS.map((c) => (
                                      <option key={c.value} value={c.value}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </Md3Select>
                                </div>
                              </div>

                              <BedTariffPreviewBadge
                                wardClass={bed.wardClass}
                                comfortTier={bed.comfortTier}
                                dailyRateOverride={bed.dailyRateOverride}
                              />

                              <div className="facility-form-row" style={{ marginTop: '8px' }}>
                                <Md3TextField
                                  label="Daily Tariff Override (optional)"
                                  type="number"
                                  value={bed.dailyRateOverride}
                                  onChange={(e) => handleUpdateBedField(bed.id, 'dailyRateOverride', e.target.value)}
                                  placeholder="Inherits master pricing"
                                  helperText="Optional manual override rate for special suites"
                                />
                                <Md3TextField
                                  label="Bed Notes"
                                  value={bed.bedNotes}
                                  onChange={(e) => handleUpdateBedField(bed.id, 'bedNotes', e.target.value)}
                                  placeholder="e.g. Dedicated oxygen port"
                                />
                              </div>

                              <div className="facility-form-field" style={{ marginTop: '4px' }}>
                                <label className="facility-form-field__label">
                                  Equipment & Amenities
                                </label>
                                <div className="facility-chip-grid">
                                  {BED_FEATURES.map((feat) => {
                                    const isSelected = (bed.selectedFeatures || []).includes(feat.id);
                                    return (
                                      <button
                                        key={feat.id}
                                        type="button"
                                        className={`facility-filter-chip ${isSelected ? 'facility-filter-chip--selected' : ''}`}
                                        onClick={() => handleToggleBedFeature(bed.id, feat.id)}
                                      >
                                        <span className="material-symbols-rounded">
                                          {isSelected ? 'check' : feat.icon}
                                        </span>
                                        {feat.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Centered Add Another Bed Trigger */}
                  <div className="facility-add-trigger-row">
                    <button
                      type="button"
                      className="facility-add-another-btn"
                      onClick={handleAddBedItem}
                    >
                      <span className="material-symbols-rounded">add_circle</span>
                      <span>Add Another Bed</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="facility-sheet-footer-inline">
                <Md3Button variant="text" type="button" onClick={handleAttemptClose}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit" loading={loading} loadingText="Saving...">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>
                    {isEdit ? 'save' : 'add'}
                  </span>
                  {isEdit
                    ? 'Save Bed Changes'
                    : `Add ${bedsList.length} Bed${bedsList.length > 1 ? 's' : ''} to Room`}
                </Md3Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>

    <Md3UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      title="Discard unsaved facility configurations?"
      message={isEdit
        ? "You have unsaved changes to this infrastructure entity. Are you sure you want to discard your edits?"
        : "You have unsaved facility configurations in this builder. Are you sure you want to discard and exit?"
      }
      confirmLabel="Discard & Exit"
      cancelLabel="Keep Editing"
      onConfirm={handleConfirmDiscard}
      onCancel={() => setShowDiscardConfirm(false)}
    />
  </>
);
};

export default FacilityBuilderSheet;

