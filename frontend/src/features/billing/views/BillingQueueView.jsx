import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { billingAPI } from '../../../services/billingAPI';
import { Md3Button, Md3TextField } from '../../../components/md3/Md3FormComponents';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { timeSince } from '../../../utils/dateFormatting';
import { formatDoctorName } from '../../../utils/patientFormatters';
import './BillingQueueView.css';

const ENCOUNTER_CATEGORIES = [
  { id: 'ALL', label: 'All Encounters' },
  { id: 'OPD', label: 'OPD Consultation' },
  { id: 'PHARMACY', label: 'Pharmacy Dispensed' },
  { id: 'LAB', label: 'Lab Diagnostic' },
  { id: 'OT', label: 'Day Surgery / OT' },
  { id: 'IPD', label: 'IPD Discharge' },
];

export const BillingQueueView = ({ onSelectVisitForBilling }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/visits/queue/WAITING_BILLING');
      const items = res.data?.data || res.data || [];
      setQueue(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load billing queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-poll queue every 30 seconds for live updates
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const getEncounterTag = (visit) => {
    if (visit.admissionId || visit.visitType === 'IPD' || visit.visitType === 'IPD_MEDICAL') {
      return { id: 'IPD', label: 'IPD Discharge', color: '#6200ea', bg: '#ede7f6', icon: 'hotel' };
    }
    if (visit.metadata?.source === 'OT' || visit.visitType === 'IPD_SURGICAL' || visit.surgicalDetails) {
      return { id: 'OT', label: 'Day Surgery / OT', color: '#c2185b', bg: '#fce4ec', icon: 'medical_services' };
    }
    if (visit.pharmacyWork?.status === 'DISPENSED' || visit.metadata?.source === 'PHARMACY') {
      return { id: 'PHARMACY', label: 'Pharmacy Dispensed', color: '#00796b', bg: '#e0f2f1', icon: 'medication' };
    }
    if (visit.labOrders && visit.labOrders.length > 0 && visit.disposition?.status === 'ROUTED_TO_BILLING') {
      return { id: 'LAB', label: 'Lab Diagnostic', color: '#ef6c00', bg: '#fff3e0', icon: 'biotech' };
    }
    if (visit.visitType === 'EMERGENCY') {
      return { id: 'EMERGENCY', label: 'Emergency Care', color: '#c62828', bg: '#ffebee', icon: 'emergency' };
    }
    return { id: 'OPD', label: 'OPD Consultation', color: '#1565c0', bg: '#e3f2fd', icon: 'stethoscope' };
  };

  const filteredQueue = queue.filter((v) => {
    const tag = getEncounterTag(v);
    if (categoryFilter !== 'ALL' && tag.id !== categoryFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${v.patientId?.firstName || ''} ${v.patientId?.lastName || ''}`.toLowerCase();
    const mrn = (v.patientId?.mrn || '').toLowerCase();
    const token = (v.tokenString || '').toLowerCase();
    return name.includes(q) || mrn.includes(q) || token.includes(q);
  });

  const handleProcessVisit = async (visit) => {
    try {
      const res = await billingAPI.getOrCreateForVisit(visit._id, { issuingArea: 'BILLING' });
      const bill = res.data?.data || res.data;
      if (onSelectVisitForBilling) {
        onSelectVisitForBilling(visit, bill);
      }
    } catch (err) {
      console.error('Failed to load bill for visit:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            Live Billing &amp; Cashier Queue
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>person_pin</span>
            <span>{queue.length} Waiting</span>
          </div>
          {queue.length > 0 && (
            <Md3Button type="button" variant="secondary" onClick={fetchQueue} disabled={loading}>
              <span className={`material-symbols-rounded ${loading ? 'spin-animation' : ''}`}>refresh</span>
              <span>Refresh Queue</span>
            </Md3Button>
          )}
        </div>
      </div>

      {/* Queue items cards or Top-Aligned Idle Deck */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
          <span className="material-symbols-rounded spin-animation" style={{ fontSize: '32px' }}>progress_activity</span>
          <p>Syncing live billing queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="billing-idle-card">
          {/* Live Status Beacon */}
          <div className="billing-idle-badge">
            <span className="billing-idle-beacon-dot" />
            <span className="billing-idle-badge-text">Cashier Ready · Queue Clear</span>
          </div>

          {/* Animated Central Icon with Concentric Medical Pulse Rings */}
          <div className="billing-idle-icon-wrapper">
            <div className="billing-idle-pulse-ring ring-1" />
            <div className="billing-idle-pulse-ring ring-2" />
            <div className="billing-idle-icon-box">
              <span className="material-symbols-rounded billing-idle-icon">point_of_sale</span>
            </div>
          </div>

          {/* Minimal Text Block */}
          <div className="billing-idle-text-block">
            <h3 className="billing-idle-title">Billing &amp; Cashier Queue Clear</h3>
            <p className="billing-idle-desc">
              All encounter service dues and discharge invoices are currently reconciled. Standing by for incoming clinical handoffs.
            </p>
          </div>

          {/* Centered Refresh Action Button */}
          <div className="billing-idle-action-area">
            <Md3Button
              type="button"
              variant="primary"
              onClick={fetchQueue}
              disabled={loading}
              className="billing-idle-refresh-btn"
            >
              <span className={`material-symbols-rounded ${loading ? 'spin-animation' : 'billing-refresh-icon'}`}>
                refresh
              </span>
              <span>{loading ? 'Checking Live Queue...' : 'Refresh Live Queue'}</span>
            </Md3Button>

            <div className="billing-idle-sync-note">
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>sync</span>
              <span>Live auto-sync active · Polls every 30s</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Category filter chips */}
          <div className="billing-queue-filter-bar">
            {ENCOUNTER_CATEGORIES.map((cat) => {
              const isActive = categoryFilter === cat.id;
              const count = cat.id === 'ALL'
                ? queue.length
                : queue.filter((v) => getEncounterTag(v).id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`billing-queue-filter-btn ${isActive ? 'billing-queue-filter-btn--active' : ''}`}
                >
                  <span>{cat.label}</span>
                  <span className="billing-queue-filter-count">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter search bar for active queue */}
          <div className="billing-queue-search-wrap">
            <Md3TextField
              label="Search by Patient Name, MRN or Token"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<span className="material-symbols-rounded">search</span>}
              trailingIcon={
                search ? (
                  <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                  </button>
                ) : null
              }
            />
          </div>

          {filteredQueue.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--md-sys-color-surface-container-low)', borderRadius: '14px', border: '1px dashed var(--md-sys-color-outline-variant)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px', color: 'var(--md-sys-color-on-surface-variant)' }}>search_off</span>
              <p style={{ margin: '6px 0', fontSize: '0.88rem', fontWeight: 600 }}>No patients match criteria</p>
              <Md3Button type="button" variant="secondary" onClick={() => { setSearch(''); setCategoryFilter('ALL'); }}>Reset Filters</Md3Button>
            </div>
          ) : (
            <div className="billing-queue-cards-grid">
              {filteredQueue.map((visit) => {
                const tag = getEncounterTag(visit);
                const p = visit.patientId || {};
                const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Walk-in Patient';
                const mrn = p.mrn || 'N/A';
                const dept = visit.departmentId?.name || 'General';
                const doc = formatDoctorName(visit.consultation?.doctorId || 'Consulting Physician');
                const wait = timeSince(visit.updatedAt || visit.createdAt);

                return (
                  <div key={visit._id} className="billing-queue-card">
                    <div>
                      <div className="billing-queue-card-header">
                        <div>
                          <h4 className="billing-queue-patient-name">{name}</h4>
                          <span className="billing-queue-patient-mrn">MRN: {mrn}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span
                            style={{
                              background: tag.bg,
                              color: tag.color,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>{tag.icon}</span>
                            <span>{tag.label}</span>
                          </span>
                          {visit.tokenString && (
                            <span style={{ background: 'var(--md-sys-color-surface-container-high)', color: 'var(--md-sys-color-on-surface)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 600 }}>
                              {visit.tokenString}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="billing-queue-meta-list">
                        <div className="billing-queue-meta-item">
                          <span className="material-symbols-rounded">corporate_fare</span>
                          <span>{dept}</span>
                        </div>
                        <div className="billing-queue-meta-item">
                          <span className="material-symbols-rounded">stethoscope</span>
                          <span>{doc}</span>
                        </div>
                        <div className="billing-queue-meta-item" style={{ color: '#e65100', fontWeight: 600 }}>
                          <span className="material-symbols-rounded">schedule</span>
                          <span>Waiting: {wait}</span>
                        </div>
                      </div>
                    </div>

                    <div className="billing-queue-card-actions">
                      <Md3Button
                        type="button"
                        variant="primary"
                        onClick={() => handleProcessVisit(visit)}
                        style={{ height: '32px', fontSize: '0.78rem' }}
                      >
                        <span className="material-symbols-rounded">point_of_sale</span>
                        <span>Process Bill</span>
                      </Md3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default BillingQueueView;
