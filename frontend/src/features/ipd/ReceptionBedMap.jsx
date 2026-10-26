/**
 * features/ipd/ReceptionBedMap.jsx
 * BookMyShow-style Spatial Bed Allocation Canvas for Reception and Admission Desks.
 */
import React, { useState, useEffect } from 'react';
import BedMapCanvas from '../../components/ipd/BedMapCanvas';
import BedDetailDrawer from '../../components/ipd/BedDetailDrawer';
import AdmissionSheet from '../../components/ipd/AdmissionSheet';
import BedTransferDialog from '../../components/ipd/BedTransferDialog';
import { Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';
import { formatDoctorName } from '../../utils/patientFormatters';
import { cleanClinicalText } from '../../utils/clinicalText';
import ipdApi from '../../services/ipdApi';

export const ReceptionBedMap = () => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);

  // Doctor Admission Advice Queue
  const [pendingAdviceList, setPendingAdviceList] = useState([]);
  const [activeAdvice, setActiveAdvice] = useState(null);
  const [showAdviceQueue, setShowAdviceQueue] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardClassFilter, setWardClassFilter] = useState('ALL');

  // Modals
  const [showAdmitSheet, setShowAdmitSheet] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTarget, setTransferTarget] = useState({ bed: null, admission: null });

  const loadBedMap = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      const data = res.data?.data || [];
      setFloors(data);
      if (data.length > 0) {
        setActiveFloorId((prev) => (prev ? prev : String(data[0]._id)));
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load live bed map:', err);
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
    loadBedMap();
    loadPendingAdvice();
    const interval = setInterval(() => {
      loadBedMap();
      loadPendingAdvice();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
    loadBedMap();
    loadPendingAdvice();
  };

  const handleUpdateStatus = async (bedId, status) => {
    try {
      await ipdApi.updateBedStatus(bedId, status);
      setSelectedBed(null);
      loadBedMap();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bed status');
    }
  };

  const isFiltered = statusFilter !== 'ALL' || wardClassFilter !== 'ALL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* ── COMPACT UNIFIED CONTROLS STRIP (Zero redundant whitespace) ── */}
      <div className="ipd-bedmap-top-bar">
        <div className="ipd-bedmap-top-bar__filters">
          {/* Floor Selection Dropdown */}
          <div className="ipd-bedmap-top-bar__floor-select">
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

          <div className="ipd-bedmap-top-bar__status-select">
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
            </Md3Select>
          </div>

          <div className="ipd-bedmap-top-bar__ward-select">
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
              <option value="ICU">ICU Critical Care</option>
              <option value="CCU">CCU Cardiac Care</option>
              <option value="EMERGENCY">Emergency Bay</option>
            </Md3Select>
          </div>

          {isFiltered && (
            <Md3Button
              variant="text"
              onClick={() => {
                setStatusFilter('ALL');
                setWardClassFilter('ALL');
              }}
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            >
              Reset Filters
            </Md3Button>
          )}
        </div>

        <div className="ipd-bedmap-top-bar__actions">
          <Md3Button
            variant="tonal"
            onClick={() => { loadBedMap(); loadPendingAdvice(); }}
            disabled={loading}
            style={{ height: '40px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>sync</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Map'}</span>
          </Md3Button>
        </div>
      </div>

      {/* Doctor Admission Advice Queue Section */}
      {pendingAdviceList.length > 0 && (
        <div
          style={{
            borderRadius: '16px',
            border: '1px solid var(--md-sys-color-outline-variant, #c2e7ff)',
            background: 'var(--md-sys-color-surface-container-low, #f8fafd)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--md-sys-color-primary, #0b57d0)' }}>
                clinical_notes
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                  Doctor Inpatient Admission Advice Queue
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
                  {pendingAdviceList.length} patient(s) advised for admission by doctors awaiting physical bed allocation
                </span>
              </div>
            </div>
            <Md3Button
              type="button"
              variant="text"
              onClick={() => setShowAdviceQueue(!showAdviceQueue)}
              style={{ fontSize: '0.85rem' }}
            >
              {showAdviceQueue ? 'Hide Queue' : 'Show Queue'} ({pendingAdviceList.length})
            </Md3Button>
          </div>

          {activeAdvice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--md-sys-color-primary-container, #d3e3fd)',
                color: 'var(--md-sys-color-on-primary-container, #041e49)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>hotel</span>
                <span>
                  Allocating bed for{' '}
                  <strong>
                    {activeAdvice.patientId?.firstName} {activeAdvice.patientId?.lastName}
                  </strong>{' '}
                  (Advised Tier: <strong>{activeAdvice.ipdAdmissionAdvice?.targetWardClass || 'General Ward'}</strong>).
                  Please click any vacant bed below on the map to complete check-in.
                </span>
              </span>
              <Md3Button
                type="button"
                variant="text"
                onClick={() => setActiveAdvice(null)}
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                Clear Selection
              </Md3Button>
            </div>
          )}

          {showAdviceQueue && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '12px',
              }}
            >
              {pendingAdviceList.map((advice) => {
                const isSelected = activeAdvice?._id === advice._id;
                const p = advice.patientId || {};
                const doc = advice.ipdAdmissionAdvice?.advisingDoctorId || {};
                const surgeon = advice.ipdAdmissionAdvice?.suggestedSurgeonId;
                const ot = advice.ipdAdmissionAdvice?.otSessionId;
                const urgency = advice.ipdAdmissionAdvice?.urgency || 'ROUTINE';
                const wardClass = advice.ipdAdmissionAdvice?.targetWardClass || 'GENERAL_WARD';

                return (
                  <div
                    key={advice._id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected
                        ? '2px solid var(--md-sys-color-primary, #0b57d0)'
                        : '1px solid var(--md-sys-color-outline-variant, #e0e2ec)',
                      background: isSelected
                        ? 'var(--md-sys-color-surface-container-high, #edf2fc)'
                        : 'var(--md-sys-color-surface, #ffffff)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: isSelected ? '0 2px 8px rgba(11, 87, 208, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--md-sys-color-on-surface)' }}>
                          {p.firstName} {p.lastName || ''}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
                          MRN: {p.mrn} • {p.gender} / {p.age || '—'}y
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background:
                            urgency === 'EMERGENCY_STAT' ? '#fee2e2' : urgency === 'URGENT' ? '#fef3c7' : '#e0f2fe',
                          color:
                            urgency === 'EMERGENCY_STAT' ? '#991b1b' : urgency === 'URGENT' ? '#92400e' : '#075985',
                        }}
                      >
                        {urgency}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      <div>
                        <strong>Recommended Tier:</strong> {wardClass.replace(/_/g, ' ')}
                      </div>
                      <div>
                        <strong>Doctor:</strong> {formatDoctorName(doc)}
                      </div>
                      {surgeon && (
                        <div>
                          <strong>Suggested Surgeon:</strong> {formatDoctorName(surgeon)}
                        </div>
                      )}
                      {ot && (
                        <div style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>
                          OT Procedure: {ot.procedureName}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Md3Button
                        type="button"
                        variant={isSelected ? 'primary' : 'tonal'}
                        onClick={() => handleStartAdviceAllocation(advice)}
                        style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px', marginRight: '4px' }}>
                          hotel
                        </span>
                        <span>{isSelected ? 'Selecting Bed...' : 'Allocate Bed & Check-In'}</span>
                      </Md3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bed Map Canvas */}
      <BedMapCanvas
        floors={floors}
        activeFloorId={activeFloorId}
        onFloorChange={setActiveFloorId}
        selectedBedId={selectedBed ? String(selectedBed._id) : null}
        onSelectBed={handleSelectBed}
        statusFilter={statusFilter}
        wardClassFilter={wardClassFilter}
      />

      {/* Slide-in Bed Inspector Drawer */}
      {selectedBed && !activeAdvice && (
        <BedDetailDrawer
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
          onOpenAdmit={(b) => {
            setSelectedBed(b);
            setShowAdmitSheet(true);
          }}
          onOpenTransfer={(b, adm) => {
            setTransferTarget({ bed: b, admission: adm });
            setShowTransferDialog(true);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Walk-in or Doctor-Advised Admission Sheet */}
      {showAdmitSheet && selectedBed && (
        <AdmissionSheet
          bed={selectedBed}
          initialAdvice={activeAdvice}
          onClose={() => {
            setShowAdmitSheet(false);
          }}
          onSuccess={handleAdmissionSuccess}
        />
      )}

      {/* Atomic Bed Transfer Dialog */}
      {showTransferDialog && (
        <BedTransferDialog
          bed={transferTarget.bed}
          admission={transferTarget.admission}
          onClose={() => setShowTransferDialog(false)}
          onSuccess={() => {
            setSelectedBed(null);
            loadBedMap();
          }}
        />
      )}
    </div>
  );
};

export default ReceptionBedMap;
