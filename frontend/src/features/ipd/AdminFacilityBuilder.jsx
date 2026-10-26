/**
 * features/ipd/AdminFacilityBuilder.jsx
 * Unified Bed Map & Hospital Facility Setup Command Center.
 * Integrates 2D Spatial Bed Canvas, Real-time Occupancy Metrics, Doctor Inpatient Admission
 * Advice Queue, and full Physical Infrastructure Setup (Floors, Rooms, Beds).
 */
import React, { useState, useEffect, useMemo } from 'react';
import BedMapCanvas from '../../components/ipd/BedMapCanvas';
import BedDetailDrawer from '../../components/ipd/BedDetailDrawer';
import FacilityBuilderSheet from './FacilityBuilderSheet';
import AdmissionSheet from '../../components/ipd/AdmissionSheet';
import BedTransferDialog from '../../components/ipd/BedTransferDialog';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import { Md3Select } from '../../components/md3/Md3FormComponents';
import { formatDoctorName } from '../../utils/patientFormatters';
import { cleanClinicalText } from '../../utils/clinicalText';
import { useToast } from '../../context/ToastContext';
import ipdApi from '../../services/ipdApi';
import './AdminFacilityBuilder.css';

export const AdminFacilityBuilder = () => {
  const { showSuccess, showError } = useToast();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeFloorId, setActiveFloorId] = useState('');

  // Reusable MD3 Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'danger',
    icon: 'delete',
    loading: false,
    onConfirm: null,
  });

  // Doctor Admission Advice Queue
  const [pendingAdviceList, setPendingAdviceList] = useState([]);
  const [activeAdvice, setActiveAdvice] = useState(null);
  const [showAdviceQueue, setShowAdviceQueue] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardClassFilter, setWardClassFilter] = useState('ALL');

  // Modals
  const [showAdmitSheet, setShowAdmitSheet] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTarget, setTransferTarget] = useState({ bed: null, admission: null });

  // Facility Builder Modal Sheet state
  const [sheetState, setSheetState] = useState({
    isOpen: false,
    mode: 'BED', // 'FLOOR' | 'ROOM' | 'BED'
    floorId: '',
    roomId: '',
    isEdit: false,
    editItem: null,
  });

  const loadFacilityData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await ipdApi.getBedMap();
      setFloors(res.data?.data || []);
      if (!isSilent) setLoading(false);
    } catch (err) {
      if (!isSilent) setLoading(false);
      console.error('Failed to load facility bed map:', err);
      if (!isSilent) showError('Failed to load live facility layout');
    }
  };

  const loadPendingAdvice = async () => {
    try {
      const res = await ipdApi.getPendingAdmissionAdvice();
      setPendingAdviceList(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load pending admission advice:', err);
    }
  };

  useEffect(() => {
    loadFacilityData();
    loadPendingAdvice();
    const interval = setInterval(() => {
      loadFacilityData(true);
      loadPendingAdvice();
    }, 30000);
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

  const handleOpenSheet = (mode = 'BED', floorId = '', roomId = '', isEdit = false, editItem = null) => {
    setSheetState({
      isOpen: true,
      mode,
      floorId: floorId || (floors.length > 0 ? floors[0]._id : ''),
      roomId,
      isEdit,
      editItem,
    });
  };

  const handleCloseSheet = () => {
    setSheetState((prev) => ({ ...prev, isOpen: false, isEdit: false, editItem: null }));
  };

  const handleSheetSuccess = () => {
    handleCloseSheet();
    loadFacilityData();
  };

  const handleSelectBed = (bed) => {
    setSelectedBed(bed);
    if (activeAdvice && bed.status === 'VACANT') {
      setShowAdmitSheet(true);
    }
  };

  const handleStartAdviceAllocation = (advice) => {
    if (activeAdvice?._id === advice._id) {
      setActiveAdvice(null);
      return;
    }
    setActiveAdvice(advice);
    if (advice.ipdAdmissionAdvice?.targetWardClass) {
      setWardClassFilter(advice.ipdAdmissionAdvice.targetWardClass);
    }
    setStatusFilter('VACANT');
  };

  const handleAdmissionSuccess = () => {
    setSelectedBed(null);
    setActiveAdvice(null);
    setShowAdmitSheet(false);
    loadFacilityData();
    loadPendingAdvice();
  };

  // ── Infrastructure Edit & Delete Handlers ──
  const handleEditFloor = (floor) => {
    handleOpenSheet('FLOOR', floor._id, '', true, { type: 'FLOOR', data: floor });
  };

  const handleDeleteFloor = (floor) => {
    const cleanName = cleanClinicalText(floor.floorName || `Floor ${floor.floorNumber}`);
    setConfirmDialog({
      isOpen: true,
      title: `Delete Floor ${floor.floorNumber}?`,
      message: `Are you sure you want to delete Floor ${floor.floorNumber} (${cleanName})? All inactive rooms and vacant beds on this floor will also be permanently removed.`,
      confirmLabel: 'Delete Floor',
      cancelLabel: 'Cancel',
      variant: 'danger',
      icon: 'delete',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          await ipdApi.deleteFloor(floor._id);
          showSuccess(`Floor ${floor.floorNumber} deleted successfully.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          loadFacilityData();
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, loading: false }));
          showError(err.response?.data?.message || 'Failed to delete floor');
        }
      },
    });
  };

  const handleEditRoom = (floor, room) => {
    handleOpenSheet('ROOM', floor?._id || room.floorId, room._id, true, { type: 'ROOM', data: room });
  };

  const handleDeleteRoom = (room) => {
    const cleanName = cleanClinicalText(room.roomName || room.roomNumber);
    setConfirmDialog({
      isOpen: true,
      title: `Delete Room ${room.roomNumber}?`,
      message: `Are you sure you want to delete Room ${room.roomNumber} (${cleanName})? All vacant beds in this room will also be removed.`,
      confirmLabel: 'Delete Room',
      cancelLabel: 'Cancel',
      variant: 'danger',
      icon: 'delete',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          await ipdApi.deleteRoom(room._id);
          showSuccess(`Room ${room.roomNumber} deleted successfully.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          loadFacilityData();
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, loading: false }));
          showError(err.response?.data?.message || 'Failed to delete room');
        }
      },
    });
  };

  const handleEditBed = (bed) => {
    setSelectedBed(null);
    handleOpenSheet('BED', bed.floorId?._id || bed.floorId, bed.roomId?._id || bed.roomId, true, {
      type: 'BED',
      data: bed,
    });
  };

  const handleDeleteBed = (bed) => {
    if (bed.status === 'OCCUPIED') {
      showError('Cannot delete an occupied bed. Discharge or transfer the patient first.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Delete Bed ${bed.bedNumber}?`,
      message: `Are you sure you want to permanently delete Bed ${bed.bedNumber}? This action cannot be undone.`,
      confirmLabel: 'Delete Bed',
      cancelLabel: 'Cancel',
      variant: 'danger',
      icon: 'delete',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          await ipdApi.deleteBed(bed._id);
          setSelectedBed(null);
          showSuccess(`Bed ${bed.bedNumber} deleted successfully.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          loadFacilityData();
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, loading: false }));
          showError(err.response?.data?.message || 'Failed to delete bed');
        }
      },
    });
  };

  const handleUpdateStatus = async (bedId, newStatus) => {
    try {
      await ipdApi.updateBedStatus(bedId, newStatus);
      showSuccess(`Bed status updated to ${newStatus.replace(/_/g, ' ')}`);
      if (selectedBed && String(selectedBed._id) === String(bedId)) {
        setSelectedBed((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      loadFacilityData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update bed status');
    }
  };

  return (
    <div className="facility-builder-page">
      {/* ── 1. Unified Action & Filter Toolbar (Zero redundant whitespace) ── */}
      <div className="facility-top-toolbar">
        <div className="facility-top-toolbar__filters">
          {/* Floor Selection Dropdown */}
          <div className="facility-top-toolbar__floor-select">
            <Md3Select
              label="Select Floor"
              leadingIcon="layers"
              value={activeFloorId || (floors[0]?._id ? String(floors[0]._id) : '')}
              onChange={(e) => setActiveFloorId(e.target.value)}
            >
              {floors.map((f) => {
                const cleanFloorName = cleanClinicalText(f.floorName || '');
                const cleanWing = cleanClinicalText(f.wing || '');
                const shortName = cleanWing || cleanFloorName.split('—')[0].trim() || `Floor ${f.floorNumber}`;
                const freeCount = f.stats
                  ? f.stats.vacantBeds
                  : (f.rooms || []).reduce(
                      (acc, rm) => acc + (rm.beds || []).filter((b) => b.status === 'VACANT').length,
                      0
                    );
                return (
                  <option key={f._id} value={String(f._id)}>
                    Floor {f.floorNumber}: {shortName} ({freeCount} Free)
                  </option>
                );
              })}
            </Md3Select>
          </div>

          <div className="facility-top-toolbar__status-select">
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

          <div className="facility-top-toolbar__ward-select">
            <Md3Select
              label="Ward Class"
              value={wardClassFilter}
              onChange={(e) => setWardClassFilter(e.target.value)}
            >
              <option value="ALL">All Ward Tiers</option>
              <option value="GENERAL_WARD">General Ward</option>
              <option value="SEMI_PRIVATE">Semi-Private</option>
              <option value="PRIVATE">Private Single</option>
              <option value="DELUXE_PRIVATE">Deluxe Suite</option>
              <option value="ICU">ICU / Critical Care</option>
            </Md3Select>
          </div>

          {(statusFilter !== 'ALL' || wardClassFilter !== 'ALL') && (
            <button
              type="button"
              className="facility-filter-bar__reset-btn"
              onClick={() => {
                setStatusFilter('ALL');
                setWardClassFilter('ALL');
              }}
            >
              Reset
            </button>
          )}
        </div>

        <div className="admin-dir-controls">
          <button
            type="button"
            className="admin-btn admin-btn-tonal"
            onClick={() => handleOpenSheet('FLOOR')}
          >
            <span className="material-symbols-rounded">layers</span>
            Add Floor
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-tonal"
            onClick={() => handleOpenSheet('ROOM', activeFloorId || (floors.length > 0 ? floors[0]._id : ''))}
          >
            <span className="material-symbols-rounded">meeting_room</span>
            Add Room
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => handleOpenSheet('BED', activeFloorId || (floors.length > 0 ? floors[0]._id : ''))}
          >
            <span className="material-symbols-rounded">single_bed</span>
            Add Bed
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-tonal"
            onClick={() => {
              loadFacilityData();
              loadPendingAdvice();
            }}
            disabled={loading}
          >
            <span className="material-symbols-rounded">sync</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Doctor Admission Advice Queue Alert (Optional Strip) ── */}
      {pendingAdviceList.length > 0 && (
        <div className="facility-advice-alert">
          <div className="facility-advice-alert__header">
            <div className="facility-advice-alert__info">
              <span className="material-symbols-rounded facility-advice-alert__icon">clinical_notes</span>
              <div>
                <strong className="facility-advice-alert__title">Doctor Inpatient Admission Advice Queue</strong>
                <span className="facility-advice-alert__count">
                  {pendingAdviceList.length} patient(s) advised for admission awaiting bed allocation
                </span>
              </div>
            </div>
            <button
              type="button"
              className="facility-advice-alert__toggle-btn"
              onClick={() => setShowAdviceQueue(!showAdviceQueue)}
            >
              {showAdviceQueue ? 'Hide Queue' : 'Show Queue'} ({pendingAdviceList.length})
            </button>
          </div>

          {activeAdvice && (
            <div className="facility-active-advice-banner">
              <span className="material-symbols-rounded">person_pin</span>
              <span>
                Allocating bed for <strong>{activeAdvice.patientId?.firstName} {activeAdvice.patientId?.lastName}</strong> (MRN: {activeAdvice.patientId?.mrn}) — Click any <strong>VACANT</strong> bed below to confirm check-in.
              </span>
              <button
                type="button"
                className="facility-advice-cancel-btn"
                onClick={() => setActiveAdvice(null)}
              >
                Cancel Allocation
              </button>
            </div>
          )}

          {showAdviceQueue && (
            <div className="facility-advice-list">
              {pendingAdviceList.map((advice) => {
                const isSelected = activeAdvice?._id === advice._id;
                const p = advice.patientId || {};
                const doc = advice.doctorId || {};
                const urgency = advice.ipdAdmissionAdvice?.urgency || 'ROUTINE';
                const wardClass = advice.ipdAdmissionAdvice?.targetWardClass || 'GENERAL_WARD';

                return (
                  <div
                    key={advice._id}
                    className={`facility-advice-card ${isSelected ? 'facility-advice-card--selected' : ''}`}
                  >
                    <div className="facility-advice-card__head">
                      <div>
                        <strong>{p.firstName} {p.lastName || ''}</strong>
                        <div className="facility-advice-card__meta">
                          MRN: {p.mrn || '—'} • {p.gender || '—'} / {p.age || '—'}y
                        </div>
                      </div>
                      <span className={`facility-advice-badge facility-advice-badge--${urgency.toLowerCase()}`}>
                        {urgency}
                      </span>
                    </div>

                    <div className="facility-advice-card__details">
                      <div><strong>Tier:</strong> {wardClass.replace(/_/g, ' ')}</div>
                      <div><strong>Doctor:</strong> {formatDoctorName(doc)}</div>
                    </div>

                    <div className="facility-advice-card__action">
                      <button
                        type="button"
                        className={`admin-btn ${isSelected ? 'admin-btn-primary' : 'admin-btn-tonal'}`}
                        onClick={() => handleStartAdviceAllocation(advice)}
                      >
                        <span className="material-symbols-rounded">hotel</span>
                        {isSelected ? 'Selecting Bed...' : 'Allocate Bed'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. KPI Hospital Metrics Row (5 Cards) ── */}
      <div className="facility-kpi-grid">
        {/* Total Beds */}
        <div className="facility-kpi-card">
          <div className="facility-kpi-card__icon facility-kpi-card__icon--primary">
            <span className="material-symbols-rounded">hotel</span>
          </div>
          <div className="facility-kpi-card__content">
            <span className="facility-kpi-card__label">Total Inpatient Beds</span>
            <span className="facility-kpi-card__value">
              {globalStats.totalBeds} <span className="facility-kpi-card__sub">Beds</span>
            </span>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="facility-kpi-card">
          <div className="facility-kpi-card__icon facility-kpi-card__icon--occupied">
            <span className="material-symbols-rounded">analytics</span>
          </div>
          <div className="facility-kpi-card__content">
            <span className="facility-kpi-card__label">Occupied</span>
            <span className="facility-kpi-card__value">
              {globalStats.occupiedBeds}{' '}
              <span className="facility-kpi-card__sub">({globalStats.occupancyRate}%)</span>
            </span>
          </div>
        </div>

        {/* Vacant Beds */}
        <div className="facility-kpi-card">
          <div className="facility-kpi-card__icon facility-kpi-card__icon--vacant">
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div className="facility-kpi-card__content">
            <span className="facility-kpi-card__label">Vacant &amp; Ready</span>
            <span className="facility-kpi-card__value">{globalStats.vacantBeds}</span>
          </div>
        </div>

        {/* Critical Care (ICU) */}
        <div className="facility-kpi-card">
          <div className="facility-kpi-card__icon facility-kpi-card__icon--icu">
            <span className="material-symbols-rounded">monitor_heart</span>
          </div>
          <div className="facility-kpi-card__content">
            <span className="facility-kpi-card__label">Critical Care / ICU</span>
            <span className="facility-kpi-card__value">{globalStats.icuBeds}</span>
          </div>
        </div>

        {/* Maintenance / Sanitizing */}
        <div className="facility-kpi-card">
          <div className="facility-kpi-card__icon facility-kpi-card__icon--maint">
            <span className="material-symbols-rounded">cleaning_services</span>
          </div>
          <div className="facility-kpi-card__content">
            <span className="facility-kpi-card__label">Sanitizing / Maint</span>
            <span className="facility-kpi-card__value">{globalStats.maintenanceBeds}</span>
          </div>
        </div>
      </div>

      {/* ── 4. 2D Spatial Bed Map Canvas ── */}
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
          activeFloorId={activeFloorId}
          onFloorChange={setActiveFloorId}
          onAddBedToRoom={(floorId, roomId) => handleOpenSheet('BED', floorId, roomId)}
          onEditFloor={handleEditFloor}
          onDeleteFloor={handleDeleteFloor}
          onEditRoom={handleEditRoom}
          onDeleteRoom={handleDeleteRoom}
        />
      )}

      {/* ── 5. Administrative Bed Detail Drawer ── */}
      <BedDetailDrawer
        bed={selectedBed}
        isOpen={Boolean(selectedBed)}
        onClose={() => setSelectedBed(null)}
        onUpdateStatus={handleUpdateStatus}
        onEditBed={handleEditBed}
        onDeleteBed={handleDeleteBed}
        onOpenAdmit={(b) => {
          setSelectedBed(b);
          setShowAdmitSheet(true);
        }}
        onOpenTransfer={(b, adm) => {
          setTransferTarget({ bed: b, admission: adm });
          setShowTransferDialog(true);
        }}
      />

      {/* ── 6. On-Tap Facility Builder Slide-Over Sheet (Modal) ── */}
      <FacilityBuilderSheet
        isOpen={sheetState.isOpen}
        onClose={handleCloseSheet}
        onSuccess={handleSheetSuccess}
        initialMode={sheetState.mode}
        floors={floors}
        preselectedFloorId={sheetState.floorId}
        preselectedRoomId={sheetState.roomId}
        isEdit={sheetState.isEdit}
        editItem={sheetState.editItem}
      />

      {/* ── 7. Walk-in or Doctor-Advised Admission Sheet ── */}
      {showAdmitSheet && selectedBed && (
        <AdmissionSheet
          bed={selectedBed}
          initialAdvice={activeAdvice}
          onClose={() => setShowAdmitSheet(false)}
          onSuccess={handleAdmissionSuccess}
        />
      )}

      {/* ── 8. Bed Transfer Dialog ── */}
      {showTransferDialog && (
        <BedTransferDialog
          bed={transferTarget.bed}
          admission={transferTarget.admission}
          onClose={() => setShowTransferDialog(false)}
          onSuccess={() => {
            setSelectedBed(null);
            loadFacilityData();
          }}
        />
      )}

      {/* ── 9. Reusable Material Design 3 Confirmation Dialog ── */}
      <Md3ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        icon={confirmDialog.icon}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }))}
      />
    </div>
  );
};

export default AdminFacilityBuilder;
