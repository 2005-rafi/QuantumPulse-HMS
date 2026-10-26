/**
 * components/ipd/BedTransferDialog.jsx
 * Material Design 3 Inpatient Bed Allocation & Atomic Transfer Confirmation Modal.
 * Features: Cascading Floor -> Room -> Bed Selection, Gender Privacy Verification,
 * Real-Time Tariff Differential Analytics, and Clean Minimal UI.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import { formatDoctorName } from '../../utils/patientFormatters';
import { cleanClinicalText } from '../../utils/clinicalText';
import ipdApi from '../../services/ipdApi';
import './BedTransferDialog.css';

const TRANSFER_CATEGORIES = [
  { value: 'CLINICAL_ESCALATION', label: 'Clinical Escalation (ICU / HDU / Step-Up)' },
  { value: 'STEP_DOWN', label: 'Clinical De-escalation (Step-Down to General Ward)' },
  { value: 'POST_OP_RECOVERY', label: 'Post-Operative Recovery Transfer' },
  { value: 'PATIENT_REQUEST', label: 'Patient / Family Request (Room Class Upgrade)' },
  { value: 'INFECTION_ISOLATION', label: 'Infection Control & Cohorting Isolation' },
  { value: 'MAINTENANCE_TURNAROUND', label: 'Facility Maintenance & Bed Turnaround' },
  { value: 'OTHER', label: 'Other Clinical / Operational Justification' },
];

export const BedTransferDialog = ({
  bed,
  sourceBed,
  admission: propAdmission,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const effectiveBed = bed || sourceBed;

  // Floor, Room, Bed Hierarchical Data
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');

  const [category, setCategory] = useState('CLINICAL_ESCALATION');
  const [transferReason, setTransferReason] = useState('');
  const [consultingDoctor, setConsultingDoctor] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [error, setError] = useState('');

  // Extract patient & admission context
  const admission = propAdmission || effectiveBed?.currentAdmissionId;
  const patient = effectiveBed?.currentPatientId || admission?.patientId;
  const primaryDoc = admission?.primaryDoctorId;

  // Set default consulting doctor
  useEffect(() => {
    if (primaryDoc) {
      setConsultingDoctor(formatDoctorName(primaryDoc));
    }
  }, [primaryDoc]);

  // Calculate duration in current bed
  const currentStayDuration = useMemo(() => {
    if (!admission?.admissionDate) return null;
    const fromTime = new Date(admission.admissionDate).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - fromTime);
    const totalHours = diffMs / (1000 * 60 * 60);
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours % 24);
    return {
      days,
      hours,
      totalHoursFormatted: totalHours.toFixed(1),
      admitDateFormatted: new Date(admission.admissionDate).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };
  }, [admission]);

  // Fetch full live bed map
  useEffect(() => {
    const fetchLiveBedMap = async () => {
      try {
        setLoadingMap(true);
        const res = await ipdApi.getBedMap();
        const data = res.data?.data || [];
        setFloors(data);

        // Identify current floor
        const currentFloorId =
          effectiveBed?.floorId?._id ||
          effectiveBed?.floorId ||
          admission?.currentFloorId?._id ||
          admission?.currentFloorId ||
          '';

        // Find initial floor: prefer current floor if it exists in data, else first floor with vacant beds, else data[0]
        let initialFloor = data.find((f) => String(f._id) === String(currentFloorId));
        if (!initialFloor) {
          initialFloor = data.find((f) =>
            (f.rooms || []).some((r) =>
              (r.beds || []).some((b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id))
            )
          ) || data[0];
        }

        if (initialFloor) {
          const initFloorId = String(initialFloor._id);
          setSelectedFloorId(initFloorId);

          // Find rooms on this initial floor with vacant beds
          const candidateRooms = (initialFloor.rooms || []).filter((r) =>
            (r.beds || []).some((b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id))
          );

          if (candidateRooms.length > 0) {
            // Prefer current room if it has another vacant bed, else first available room
            const currentRoomId = effectiveBed?.roomId?._id || effectiveBed?.roomId || '';
            const matchingRoom = candidateRooms.find((r) => String(r._id) === String(currentRoomId)) || candidateRooms[0];
            setSelectedRoomId(String(matchingRoom._id));

            const candidateBeds = (matchingRoom.beds || []).filter(
              (b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)
            );
            if (candidateBeds.length > 0) {
              setTargetBedId(String(candidateBeds[0]._id));
            }
          }
        }
        setLoadingMap(false);
      } catch (err) {
        console.error('Error fetching live bed map for transfer dialog:', err);
        setLoadingMap(false);
      }
    };
    fetchLiveBedMap();
  }, [effectiveBed?._id, effectiveBed?.floorId, effectiveBed?.roomId, admission?.currentFloorId]);

  // Active Floor Object
  const currentFloorObj = useMemo(() => {
    return floors.find((f) => String(f._id) === String(selectedFloorId)) || null;
  }, [floors, selectedFloorId]);

  // Available Rooms on Selected Floor with Vacant Beds
  const availableRooms = useMemo(() => {
    if (!currentFloorObj?.rooms) return [];
    return currentFloorObj.rooms.filter((r) =>
      (r.beds || []).some((b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id))
    );
  }, [currentFloorObj, effectiveBed?._id]);

  // Active Room Object
  const currentRoomObj = useMemo(() => {
    return availableRooms.find((r) => String(r._id) === String(selectedRoomId)) || null;
  }, [availableRooms, selectedRoomId]);

  // Available Vacant Beds in Selected Room
  const availableBeds = useMemo(() => {
    if (!currentRoomObj?.beds) return [];
    return currentRoomObj.beds.filter(
      (b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)
    );
  }, [currentRoomObj, effectiveBed?._id]);

  // Handler when Floor changes: update Room and Bed automatically
  const handleFloorChange = (newFloorId) => {
    setSelectedFloorId(newFloorId);
    const fl = floors.find((f) => String(f._id) === String(newFloorId));
    if (!fl) return;

    const roomsWithBeds = (fl.rooms || []).filter((r) =>
      (r.beds || []).some((b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id))
    );

    if (roomsWithBeds.length > 0) {
      const firstRoom = roomsWithBeds[0];
      setSelectedRoomId(String(firstRoom._id));
      const firstBeds = (firstRoom.beds || []).filter(
        (b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)
      );
      if (firstBeds.length > 0) {
        setTargetBedId(String(firstBeds[0]._id));
      } else {
        setTargetBedId('');
      }
    } else {
      setSelectedRoomId('');
      setTargetBedId('');
    }
  };

  // Handler when Room changes: update Bed automatically
  const handleRoomChange = (newRoomId) => {
    setSelectedRoomId(newRoomId);
    const rm = availableRooms.find((r) => String(r._id) === String(newRoomId));
    if (!rm) return;

    const bedsInRoom = (rm.beds || []).filter(
      (b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)
    );
    if (bedsInRoom.length > 0) {
      setTargetBedId(String(bedsInRoom[0]._id));
    } else {
      setTargetBedId('');
    }
  };

  // Selected Target Bed Object
  const selectedTargetBed = useMemo(() => {
    if (!currentRoomObj || !targetBedId) return null;
    return (currentRoomObj.beds || []).find((b) => String(b._id) === String(targetBedId)) || null;
  }, [currentRoomObj, targetBedId]);

  // Gender Policy Compatibility Check
  const genderValidation = useMemo(() => {
    if (!patient || !currentRoomObj) {
      return { isValid: true, reason: 'Gender policy verified' };
    }
    const patientGender = (patient.gender || '').trim().toUpperCase();
    const rawRestriction = (currentRoomObj.genderRestriction || 'UNRESTRICTED').toUpperCase();

    // Accommodate non-binary / other
    if (!patientGender || patientGender === 'OTHER' || patientGender === 'UNKNOWN') {
      return { isValid: true, reason: 'Inclusive gender assignment verified' };
    }

    if (patientGender === 'MALE' && (rawRestriction === 'FEMALE_ONLY' || rawRestriction === 'FEMALE')) {
      return {
        isValid: false,
        reason: `Privacy Violation: Cannot transfer Male patient (${patient.firstName}) to designated Female-only Room ${currentRoomObj.roomNumber}.`,
      };
    }

    if (patientGender === 'FEMALE' && (rawRestriction === 'MALE_ONLY' || rawRestriction === 'MALE')) {
      return {
        isValid: false,
        reason: `Privacy Violation: Cannot transfer Female patient (${patient.firstName}) to designated Male-only Room ${currentRoomObj.roomNumber}.`,
      };
    }

    return {
      isValid: true,
      reason: `Compliant: ${patient.gender} patient cleared for ${rawRestriction === 'UNRESTRICTED' ? 'Unisex' : rawRestriction} ward`,
    };
  }, [patient, currentRoomObj]);

  // Tariff Comparison
  const tariffComparison = useMemo(() => {
    const currentDaily = effectiveBed?.dailyRateOverride || (effectiveBed?.wardClass === 'ICU' ? 6000 : 1500);
    const targetDaily = selectedTargetBed?.dailyRateOverride || (selectedTargetBed?.wardClass === 'ICU' ? 6000 : 1500);
    const diff = targetDaily - currentDaily;

    return {
      currentDaily,
      targetDaily,
      diff,
      isIncrease: diff > 0,
      isDecrease: diff < 0,
      isEqual: diff === 0,
    };
  }, [effectiveBed, selectedTargetBed]);

  // Submit transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetBedId) {
      setError('Please select a destination vacant bed.');
      return;
    }
    if (!genderValidation.isValid) {
      setError(genderValidation.reason);
      return;
    }

    const fullReason = `${category}: ${transferReason.trim() || 'Clinical relocation'}${
      consultingDoctor ? ` (Consultant: ${consultingDoctor})` : ''
    }`;

    setLoading(true);
    setError('');

    try {
      const admissionId = admission?._id || effectiveBed?.currentAdmissionId?._id || effectiveBed?.currentAdmissionId;
      if (!admissionId) {
        throw new Error('Active inpatient admission ID could not be identified for this bed.');
      }
      await ipdApi.transferBed(admissionId, targetBedId, fullReason);
      setLoading(false);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.userMessage || 'Failed to execute patient bed transfer.');
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  if (!effectiveBed) return null;

  const isNewAdmission = !patient && !admission;

  return createPortal(
    <div className="ipd-transfer-backdrop" onClick={onClose}>
      <div className="ipd-transfer-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="ipd-transfer-header">
          <div className="ipd-transfer-header-title">
            <div className="ipd-transfer-header-icon">
              <span className="material-symbols-rounded">swap_horiz</span>
            </div>
            <div>
              <h2 className="ipd-transfer-title">
                {isNewAdmission ? 'Bed Allocation & Admission Confirmation' : 'Inpatient Bed Transfer & Tariff Control'}
              </h2>
              <p className="ipd-transfer-sub">
                {isNewAdmission
                  ? 'Verify room tier and gender privacy before bed confirmation'
                  : `Transferring ${patient?.firstName || 'Patient'} ${patient?.lastName || ''} (MRN: ${patient?.mrn || 'N/A'})`}
              </p>
            </div>
          </div>
          <button type="button" className="ipd-transfer-close-btn" onClick={onClose} aria-label="Close dialog">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleTransfer} className="ipd-transfer-body">
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--md-sys-color-error-container, #ffdad6)',
                color: 'var(--md-sys-color-on-error-container, #410002)',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              role="alert"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Compact Transfer Route Comparison Summary ── */}
          <div className="ipd-transfer-route-strip">
            {/* Source Bed Column */}
            <div className="ipd-transfer-route-item ipd-transfer-route-item--source">
              <div className="ipd-transfer-route-tag">
                <span className="material-symbols-rounded">meeting_room</span>
                <span>{isNewAdmission ? 'New Inpatient' : 'Current Bed'}</span>
              </div>
              {isNewAdmission ? (
                <div className="ipd-transfer-route-name">Unassigned (Admission)</div>
              ) : (
                <>
                  <div className="ipd-transfer-route-name">
                    {effectiveBed.bedLabel || `Bed ${effectiveBed.bedNumber}`}
                  </div>
                  <div className="ipd-transfer-route-meta">
                    Room {effectiveBed.roomId?.roomNumber || '—'} · {effectiveBed.wardClass?.replace(/_/g, ' ') || 'General'}
                  </div>
                  <div className="ipd-transfer-route-rate">
                    {CURRENCY_SYMBOL}{tariffComparison.currentDaily.toLocaleString('en-IN')}/day
                    {currentStayDuration && (
                      <span className="ipd-transfer-stay-badge" title={`Admitted: ${currentStayDuration.admitDateFormatted}`}>
                        {currentStayDuration.days}d {currentStayDuration.hours}h
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Transfer Arrow Indicator */}
            <div className="ipd-transfer-route-divider">
              <div className="ipd-transfer-route-arrow">
                <span className="material-symbols-rounded">arrow_forward</span>
              </div>
            </div>

            {/* Target Bed Column */}
            <div className="ipd-transfer-route-item ipd-transfer-route-item--target">
              <div className="ipd-transfer-route-tag ipd-transfer-route-tag--target">
                <span className="material-symbols-rounded">bed</span>
                <span>Target Bed</span>
              </div>
              {selectedTargetBed ? (
                <>
                  <div className="ipd-transfer-route-name" style={{ color: 'var(--md-sys-color-primary, #006a6a)' }}>
                    {selectedTargetBed.bedLabel || `Bed ${selectedTargetBed.bedNumber}`}
                  </div>
                  <div className="ipd-transfer-route-meta">
                    Room {currentRoomObj?.roomNumber || '—'} · {selectedTargetBed.wardClass?.replace(/_/g, ' ')}
                  </div>
                  <div className="ipd-transfer-route-rate" style={{ color: 'var(--md-sys-color-primary, #006a6a)' }}>
                    {CURRENCY_SYMBOL}{tariffComparison.targetDaily.toLocaleString('en-IN')}/day
                    <span
                      className={`ipd-transfer-delta-pill ${
                        tariffComparison.isIncrease
                          ? 'ipd-transfer-delta-pill--increase'
                          : tariffComparison.isDecrease
                          ? 'ipd-transfer-delta-pill--decrease'
                          : 'ipd-transfer-delta-pill--neutral'
                      }`}
                    >
                      {tariffComparison.isIncrease
                        ? `+${CURRENCY_SYMBOL}${Math.abs(tariffComparison.diff).toLocaleString('en-IN')}/d`
                        : tariffComparison.isDecrease
                        ? `-${CURRENCY_SYMBOL}${Math.abs(tariffComparison.diff).toLocaleString('en-IN')}/d`
                        : 'Same Rate'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ipd-transfer-route-empty">Select floor, room & bed below</div>
              )}
            </div>
          </div>

          {/* ── Cascading Selection Grid (Floor -> Room -> Bed) ── */}
          <div className="ipd-transfer-cascading-grid">
            {/* 1. Destination Floor */}
            <div className="ipd-transfer-field-group">
              <label className="ipd-transfer-label">
                1. Destination Floor <span className="ipd-required-star">*</span>
              </label>
              <Md3Select
                value={selectedFloorId}
                onChange={(e) => handleFloorChange(e.target.value)}
                disabled={loadingMap || floors.length === 0}
              >
                {floors.map((f) => {
                  const cleanName = cleanClinicalText(f.floorName || '');
                  const cleanWing = cleanClinicalText(f.wing || '');
                  const shortName = cleanWing || cleanName.split('—')[0].trim() || `Floor ${f.floorNumber}`;
                  const freeCount = (f.rooms || []).reduce(
                    (acc, rm) => acc + (rm.beds || []).filter((b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)).length,
                    0
                  );
                  return (
                    <option key={f._id} value={String(f._id)}>
                      Floor {f.floorNumber}: {shortName} ({freeCount} free)
                    </option>
                  );
                })}
              </Md3Select>
            </div>

            {/* 2. Destination Room */}
            <div className="ipd-transfer-field-group">
              <label className="ipd-transfer-label">
                2. Destination Room <span className="ipd-required-star">*</span>
              </label>
              {availableRooms.length === 0 ? (
                <div className="ipd-transfer-no-vacant-hint">
                  No vacant rooms on floor
                </div>
              ) : (
                <Md3Select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  disabled={availableRooms.length === 0}
                >
                  {availableRooms.map((r) => {
                    const freeCount = (r.beds || []).filter(
                      (b) => b.status === 'VACANT' && String(b._id) !== String(effectiveBed?._id)
                    ).length;
                    const genderBadge =
                      r.genderRestriction === 'FEMALE_ONLY' || r.genderRestriction === 'FEMALE'
                        ? '[Female]'
                        : r.genderRestriction === 'MALE_ONLY' || r.genderRestriction === 'MALE'
                        ? '[Male]'
                        : '[Unisex]';
                    return (
                      <option key={r._id} value={String(r._id)}>
                        Room {r.roomNumber} ({r.roomType?.replace(/_/g, ' ') || 'Ward'}) {genderBadge} · {freeCount} free
                      </option>
                    );
                  })}
                </Md3Select>
              )}
            </div>

            {/* 3. Destination Bed */}
            <div className="ipd-transfer-field-group ipd-transfer-field-group--bed">
              <label className="ipd-transfer-label">
                3. Destination Bed <span className="ipd-required-star">*</span>
              </label>
              {availableBeds.length === 0 ? (
                <div className="ipd-transfer-no-vacant-hint">
                  No vacant beds in room
                </div>
              ) : (
                <Md3Select
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(e.target.value)}
                  disabled={availableBeds.length === 0}
                  required
                >
                  {availableBeds.map((b) => (
                    <option key={b._id} value={String(b._id)}>
                      {b.bedLabel || `Bed ${b.bedNumber}`} — {b.wardClass?.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Md3Select>
              )}
            </div>
          </div>

          {/* ── Gender Privacy & Rate Notification Strip ── */}
          <div className="ipd-transfer-status-strip">
            <div
              className={`ipd-transfer-gender-badge ${
                genderValidation.isValid ? 'ipd-transfer-gender-badge--valid' : 'ipd-transfer-gender-badge--invalid'
              }`}
            >
              <span className="material-symbols-rounded">
                {genderValidation.isValid ? 'verified_user' : 'lock'}
              </span>
              <span>{genderValidation.reason}</span>
            </div>
          </div>

          {/* ── Clinical Justification & Consulting Doctor ── */}
          <div className="ipd-transfer-form-row">
            <div className="ipd-transfer-field-group">
              <label className="ipd-transfer-label">
                Clinical Transfer Category <span className="ipd-required-star">*</span>
              </label>
              <Md3Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {TRANSFER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Md3Select>
            </div>

            <div className="ipd-transfer-field-group">
              <label className="ipd-transfer-label">
                Consulting Physician / Order Ref
              </label>
              <Md3TextField
                value={consultingDoctor}
                onChange={(e) => setConsultingDoctor(e.target.value)}
                placeholder="Dr. Consultant Name"
              />
            </div>
          </div>

          <div className="ipd-transfer-field-group">
            <label className="ipd-transfer-label">
              Detailed Transfer Remarks / Justification
            </label>
            <Md3TextField
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Patient stabilized, moving to Step-Down ward for telemetry."
            />
          </div>

          {/* Modal Actions */}
          <div className="ipd-transfer-footer">
            <div className="ipd-transfer-footer-left">
              {admission?._id && (
                <button
                  type="button"
                  className="ipd-util-return-btn"
                  onClick={() => {
                    onClose();
                    navigate(`/dashboard/ipd/billing/${admission._id}`);
                  }}
                  title="View Inpatient Financial Ledger & History"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>receipt_long</span>
                  <span>Ledger</span>
                </button>
              )}
            </div>

            <div className="ipd-transfer-footer-right">
              <Md3Button variant="outlined" type="button" onClick={onClose} disabled={loading}>
                Cancel
              </Md3Button>
              <Md3Button
                variant="filled"
                type="submit"
                disabled={loading || !targetBedId || !genderValidation.isValid}
                leadingIcon={<span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>}
              >
                {loading ? 'Transferring...' : 'Confirm & Transfer'}
              </Md3Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default BedTransferDialog;
