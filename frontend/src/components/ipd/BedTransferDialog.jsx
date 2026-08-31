/**
 * components/ipd/BedTransferDialog.jsx
 * Modal dialog for atomic inpatient bed transfers.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';
import ipdApi from '../../services/ipdApi';
import './BedDetailDrawer.css';

export const BedTransferDialog = ({
  bed,
  admission,
  onClose,
  onSuccess,
}) => {
  const [vacantBeds, setVacantBeds] = useState([]);
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVacantBeds = async () => {
      try {
        const res = await ipdApi.getBeds({ status: 'VACANT' });
        const beds = (res.data?.data || []).filter((b) => String(b._id) !== String(bed?._id));
        setVacantBeds(beds);
        if (beds.length > 0) setTargetBedId(beds[0]._id);
      } catch (err) {
        console.error('Error fetching vacant beds:', err);
      }
    };
    fetchVacantBeds();
  }, [bed]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetBedId) {
      setError('Please select a target vacant bed');
      return;
    }
    if (!transferReason.trim()) {
      setError('Transfer reason is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const admissionId = admission?._id || bed.currentAdmissionId?._id || bed.currentAdmissionId;
      await ipdApi.transferBed(admissionId, targetBedId, transferReason.trim());
      setLoading(false);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.userMessage || 'Failed to transfer patient');
    }
  };

  if (!bed) return null;

  return createPortal(
    <div className="ipd-drawer-backdrop" onClick={onClose}>
      <div className="ipd-drawer-panel" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ipd-drawer-header">
          <div>
            <h2 className="ipd-drawer-title">Patient Bed Transfer</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
              Current: {bed.bedLabel} ({bed.wardClass})
            </span>
          </div>
          <button type="button" className="ipd-drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleTransfer} className="ipd-drawer-content">
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">Select Destination Bed</span>
            {vacantBeds.length === 0 ? (
              <div style={{ color: 'var(--md-sys-color-error)', fontSize: '0.85rem' }}>
                No other vacant beds currently available in the hospital facility.
              </div>
            ) : (
              <Md3Select
                label="Target Bed & Ward Class *"
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                required
              >
                {vacantBeds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bedLabel} — {b.wardClass} (Room {b.roomId?.roomNumber || '—'})
                  </option>
                ))}
              </Md3Select>
            )}
          </div>

          <div className="ipd-drawer-section">
            <span className="ipd-drawer-section-title">Clinical / Administrative Justification</span>
            <Md3TextField
              label="Transfer Reason *"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Patient condition deteriorated, transferred to ICU for telemetry"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Md3Button variant="outlined" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Md3Button>
            <Md3Button variant="filled" type="submit" disabled={loading || vacantBeds.length === 0}>
              {loading ? 'Transferring...' : 'Execute Transfer'}
            </Md3Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default BedTransferDialog;
