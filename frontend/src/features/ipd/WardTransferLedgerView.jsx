/**
 * features/ipd/WardTransferLedgerView.jsx
 * Historical & Active Patient Bed Transfer Ledger.
 *
 * SOLID:
 *   SRP — Renders the bed allocation & transfer audit ledger.
 *   DIP — Uses ipdApi to fetch bed allocations and execute transfers.
 */
import React, { useState, useEffect } from 'react';
import ipdApi from '../../services/ipdApi';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import BedTransferDialog from '../../components/ipd/BedTransferDialog';

export const WardTransferLedgerView = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedForTransfer, setSelectedForTransfer] = useState({ bed: null, admission: null });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ipdApi.getBedMap();
      const floors = res.data?.data || [];
      const activeAllocations = [];

      floors.forEach((f) => {
        f.rooms?.forEach((r) => {
          r.beds?.forEach((b) => {
            if (b.status === 'OCCUPIED' && b.currentPatientId) {
              activeAllocations.push({
                bedId: b._id,
                bedLabel: b.bedLabel,
                wardClass: b.wardClass,
                floorNumber: f.floorNumber,
                roomNumber: r.roomNumber,
                patient: b.currentPatientId,
                admission: b.currentAdmissionId,
                allocatedAt: b.currentAdmissionId?.admissionDate || b.updatedAt,
                bedObj: b,
              });
            }
          });
        });
      });

      setAllocations(activeAllocations);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Failed to load transfer ledger:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = allocations.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${item.patient?.firstName || ''} ${item.patient?.lastName || ''}`.toLowerCase();
    const mrn = (item.patient?.mrn || '').toLowerCase();
    const bed = (item.bedLabel || '').toLowerCase();
    const adm = (item.admission?.admissionNumber || '').toLowerCase();
    return name.includes(q) || mrn.includes(q) || bed.includes(q) || adm.includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Inpatient Bed Allocation &amp; Transfer Ledger
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
            Active patient bed assignments, inter-ward transfers, and historical audit trail
          </p>
        </div>

        <div style={{ width: '280px' }}>
          <Md3TextField
            placeholder="Search patient, MRN, bed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--md-sys-color-outline)' }}>
          Loading active bed allocations...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--md-sys-color-outline)' }}>
          No active bed allocations found.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--md-sys-color-surface-container-low)', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Patient</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Current Bed</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Ward Tier</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Location</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Admitted On</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.bedId}
                  style={{
                    borderBottom: '1px solid var(--md-sys-color-surface-container-highest)',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ color: 'var(--md-sys-color-on-surface)' }}>
                      {row.patient?.firstName} {row.patient?.lastName}
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
                      MRN: {row.patient?.mrn || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        backgroundColor: 'var(--md-sys-color-error-container)',
                        color: 'var(--md-sys-color-on-error-container)',
                      }}
                    >
                      {row.bedLabel}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {row.wardClass}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Floor {row.floorNumber}, Room {row.roomNumber}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {row.allocatedAt ? new Date(row.allocatedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Md3Button
                      variant="tonal"
                      onClick={() => {
                        setSelectedForTransfer({ bed: row.bedObj, admission: row.admission });
                        setShowTransferDialog(true);
                      }}
                    >
                      ⇄ Transfer Bed
                    </Md3Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bed Transfer Dialog */}
      {showTransferDialog && selectedForTransfer.bed && selectedForTransfer.admission && (
        <BedTransferDialog
          sourceBed={selectedForTransfer.bed}
          admission={selectedForTransfer.admission}
          onClose={() => {
            setShowTransferDialog(false);
            setSelectedForTransfer({ bed: null, admission: null });
          }}
          onSuccess={() => {
            setShowTransferDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default WardTransferLedgerView;
