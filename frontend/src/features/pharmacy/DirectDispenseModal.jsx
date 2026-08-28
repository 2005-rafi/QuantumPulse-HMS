import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { patientAPI } from '../../services/patientAPI';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import { Icon, Md3Avatar } from '../../components/md3/Md3Widgets';

export const DirectDispenseModal = ({
  isOpen,
  onClose,
  onStartDirectDispense,
}) => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await patientAPI.list(1, 10, search.trim());
        const items = res.data?.items || res.data?.patients || (Array.isArray(res.data) ? res.data : []);
        setPatients(items);
      } catch (err) {
        console.error('Failed to search patients for direct pharmacy', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delay);
  }, [search, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async (patientId) => {
    const targetId = patientId || selectedPatientId;
    if (!targetId) return;
    setSubmitting(true);
    try {
      await onStartDirectDispense(targetId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
              <span className="material-symbols-rounded">shopping_cart_checkout</span>
            </div>
            <div>
              <h3 className="appt-modal-title">Direct OTC / Walk-in Dispensing</h3>
              <p className="appt-modal-subtitle">Select registered patient for direct prescription refill or OTC medicine purchase</p>
            </div>
          </div>
          <button type="button" className="appt-modal-close" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>

        {/* Body */}
        <div className="appt-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Md3TextField
              id="direct-patient-search"
              name="patientSearch"
              label="Search Registered Patient"
              placeholder="Search by Patient Name, MRN, or Phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Patient Results List */}
          <div style={{
            maxHeight: '280px',
            overflowY: 'auto',
            borderRadius: '14px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            background: 'var(--md-sys-color-surface)',
          }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.875rem' }}>
                Searching hospital patient registry…
              </div>
            ) : patients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.875rem' }}>
                No matching patients found.
              </div>
            ) : (
              patients.map((p) => {
                const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
                const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();
                const isSelected = selectedPatientId === p._id;

                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedPatientId(p._id)}
                    onDoubleClick={() => handleConfirm(p._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--md-sys-color-primary-container)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Md3Avatar initials={initials} size="medium" variant={isSelected ? 'primary' : 'secondary'} />
                      <div>
                        <div style={{ fontWeight: 700, color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)' }}>
                          {fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)' }}>
                          MRN: {p.mrn || 'N/A'} · {p.gender || 'Unknown'} · {p.age ? `${p.age} yrs` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirm(p._id);
                      }}
                      disabled={submitting}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        background: 'var(--md-sys-color-primary)',
                        color: 'var(--md-sys-color-on-primary)',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add_shopping_cart</span>
                      <span>Start Cart</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="appt-modal-actions">
          <Md3Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Md3Button>
          <Md3Button
            type="button"
            onClick={() => handleConfirm()}
            disabled={!selectedPatientId || submitting}
            loading={submitting}
          >
            Open Dispensing Cart
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DirectDispenseModal;
