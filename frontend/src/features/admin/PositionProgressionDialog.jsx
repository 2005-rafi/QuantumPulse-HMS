import React, { useState, useEffect } from 'react';
import { staffAPI } from '../../services/staffAPI';
import { useToast } from '../../context/ToastContext';
import { POSITIONS } from '../../core/constants';
import { Md3Select, Md3TextField } from '../../components/md3/Md3FormComponents';

const PositionProgressionDialog = ({ isOpen, onClose, staff, onUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      fetchHistory();
      setSelectedPosition('');
      setReason('');
    }
  }, [isOpen, staff]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await staffAPI.getPositionHistory(staff._id);
      setHistory(res.data || []);
    } catch (err) {
      showError(err.response?.data?.message || 'Error loading position history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    if (!selectedPosition) return;
    if (!reason.trim()) {
      showError('Please provide a reason for the progression update.');
      return;
    }

    setSaving(true);
    try {
      await staffAPI.changePosition(staff._id, selectedPosition, reason);
      showSuccess(`Position successfully updated to "${selectedPosition}"`);
      if (onUpdate) onUpdate();
      fetchHistory();
      setSelectedPosition('');
      setReason('');
    } catch (err) {
      showError(err.response?.data?.message || 'Error updating position');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !staff) return null;

  // Filter valid positions for selected staff member's role
  const roleName = staff.roleId?.name || '';
  const availablePositions = roleName ? (POSITIONS[roleName] || []) : [];
  const otherPositions = availablePositions.filter(p => p.title !== staff.position);

  const positionOptions = [
    { value: '', label: '-- Select New Position --' },
    ...otherPositions.map(p => ({ value: p.title, label: p.title }))
  ];

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'PROMOTION':
        return { bg: 'var(--md-sys-color-primary-container)', fg: 'var(--md-sys-color-on-primary-container)' };
      case 'DEMOTION':
        return { bg: 'var(--md-sys-color-error-container)', fg: 'var(--md-sys-color-on-error-container)' };
      case 'LATERAL':
        return { bg: 'var(--md-sys-color-secondary-container)', fg: 'var(--md-sys-color-on-secondary-container)' };
      default:
        return { bg: 'var(--md-sys-color-surface-container-high)', fg: 'var(--md-sys-color-on-surface-variant)' };
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7f2fa)', color: 'var(--md-sys-color-on-surface)', padding: '24px', borderRadius: '28px', maxWidth: '640px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--md-sys-color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)' }}>{staff.fullName}</h3>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 'bold' }}>
              Current: {staff.position || 'No position assigned'} ({roleName})
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface)' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Form to Update Position */}
        {otherPositions.length > 0 ? (
          <form onSubmit={handleUpdatePosition} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--md-sys-color-surface-container)', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
            <h4 style={{ margin: 0, color: 'var(--md-sys-color-primary)', fontSize: '14px', fontWeight: 'bold' }}>Change Staff Position Hierarchy</h4>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <Md3Select
                  name="newPosition"
                  label="Select New Position"
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  options={positionOptions}
                />
              </div>
            </div>
            
            <Md3TextField
              name="reason"
              label="Reason for Change"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Merit-based promotion or department transfer"
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                disabled={saving || !selectedPosition || !reason.trim()} 
                style={{ padding: '10px 24px', background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: '100px', cursor: (saving || !selectedPosition || !reason.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'background-color 150ms ease' }}
              >
                {saving ? 'Updating...' : 'Apply Change'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '16px', background: 'var(--md-sys-color-surface-container)', borderRadius: '16px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Only one position is configured for role "{roleName}". No other positions available to transfer.
          </div>
        )}

        {/* History Timeline */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--md-sys-color-on-surface)', fontSize: '14px', fontWeight: 'bold' }}>Career Progression Timeline</h4>
          
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--md-sys-color-on-surface-variant)' }}>Loading history logs...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--md-sys-color-on-surface-variant)', fontStyle: 'italic' }}>No progression history logged.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid var(--md-sys-color-outline-variant)', marginLeft: '10px', marginTop: '10px' }}>
              {history.map((log) => {
                const colors = getChangeTypeColor(log.changeType);
                return (
                  <div key={log._id} style={{ position: 'relative' }}>
                    {/* Timeline dot */}
                    <div style={{ position: 'absolute', left: '-23px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: colors.bg, border: '2px solid var(--md-sys-color-outline)' }} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 'bold' }}>
                          {new Date(log.effectiveDate || log.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{ padding: '2px 8px', background: colors.bg, color: colors.fg, borderRadius: '100px', fontSize: '10px', fontWeight: 'bold' }}>
                          {log.changeType}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>
                        {log.previousPosition ? `${log.previousPosition} ➔ ` : ''} {log.newPosition}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', background: 'var(--md-sys-color-surface-container-high)', padding: '6px 12px', borderRadius: '8px', marginTop: '4px' }}>
                        "{log.reason}"
                      </div>
                      
                      <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px', textAlign: 'right' }}>
                        Updated by: {log.changedBy?.fullName || 'System'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Footer */}
        <div style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '10px 24px', background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default PositionProgressionDialog;
