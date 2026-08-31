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
import ipdApi from '../../services/ipdApi';

export const ReceptionBedMap = () => {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);

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
      setFloors(res.data?.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load live bed map:', err);
    }
  };

  useEffect(() => {
    loadBedMap();
    // Auto-refresh bed state every 30 seconds
    const interval = setInterval(loadBedMap, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectBed = (bed) => {
    setSelectedBed(bed);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Spatial Inpatient Bed Allocation Map
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            BookMyShow-style Live Ward & Room Visualizer • Real-time Occupancy & Instant Bed Booking
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: 'auto' }}>
          <div style={{ minWidth: '130px', flex: '1 1 140px' }}>
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

          <div style={{ minWidth: '140px', flex: '1 1 150px' }}>
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

          <Md3Button variant="tonal" onClick={loadBedMap} disabled={loading} style={{ height: '40px', alignSelf: 'flex-end' }}>
            {loading ? 'Refreshing...' : '↻ Refresh Map'}
          </Md3Button>
        </div>
      </div>

      {/* Bed Map Canvas */}
      <BedMapCanvas
        floors={floors}
        selectedBedId={selectedBed ? String(selectedBed._id) : null}
        onSelectBed={handleSelectBed}
        statusFilter={statusFilter}
        wardClassFilter={wardClassFilter}
      />

      {/* Slide-in Bed Inspector Drawer */}
      {selectedBed && (
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

      {/* Walk-in Admission Sheet */}
      {showAdmitSheet && selectedBed && (
        <AdmissionSheet
          bed={selectedBed}
          onClose={() => setShowAdmitSheet(false)}
          onSuccess={() => {
            setSelectedBed(null);
            loadBedMap();
          }}
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
