/**
 * features/ipd/PharmacyFloorRequisitions.jsx
 * Pharmacy Floor Requisition & Inpatient Dispensing Station.
 */
import React, { useState, useEffect } from 'react';
import { Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';
import ipdApi from '../../services/ipdApi';

export const PharmacyFloorRequisitions = () => {
  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmissions = async () => {
      try {
        setLoading(true);
        const res = await ipdApi.getAdmissions({ status: 'ADMITTED' });
        const list = res.data?.data || [];
        setAdmissions(list);
        if (list.length > 0) {
          setSelectedAdmissionId(list[0]._id);
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error('Failed to load admissions for pharmacy:', err);
      }
    };
    loadAdmissions();
  }, []);

  useEffect(() => {
    if (!selectedAdmissionId) return;
    const loadOrders = async () => {
      try {
        const res = await ipdApi.getCpoeOrders(selectedAdmissionId, { orderType: 'MEDICATION' });
        setOrders(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load CPOE medication orders:', err);
      }
    };
    loadOrders();
  }, [selectedAdmissionId]);

  const handleDispense = async (orderId) => {
    try {
      await ipdApi.updateCpoeOrderStatus(orderId, 'COMPLETED');
      setOrders(orders.map((o) => (o._id === orderId ? { ...o, status: 'COMPLETED' } : o)));
      alert('Medications marked as dispensed to ward floor stock.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
          Pharmacy Inpatient Floor Requisitions
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '4px 0 0 0' }}>
          Dispense Physician CPOE Prescriptions to Hospital Wards & Reconcile Discharge Medications
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Inpatients List */}
        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Active Inpatient Wards</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {admissions.map((adm) => {
              const isSelected = String(adm._id) === String(selectedAdmissionId);
              return (
                <div
                  key={adm._id}
                  onClick={() => setSelectedAdmissionId(adm._id)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--md-sys-color-primary-container, #bbf2e1)' : 'var(--md-sys-color-surface-container-lowest)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {adm.patientId?.firstName} {adm.patientId?.lastName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-outline)' }}>
                    MRN: {adm.patientId?.mrn} • Bed: {adm.currentBedId?.bedNumber || '—'} ({adm.currentBedId?.wardClass || 'General'})
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Medication Orders */}
        <div
          style={{
            background: 'var(--md-sys-color-surface, #ffffff)',
            border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Physician Prescriptions & Indents</h3>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)' }}>
              No medication orders pending for this inpatient.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.map((ord) => (
                <div
                  key={ord._id}
                  style={{
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{ord.medication?.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
                      Dosage: {ord.medication?.dosage} • Route: {ord.medication?.route} • Frequency: {ord.medication?.frequency}
                    </div>
                    {ord.medication?.instructions && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-primary)', marginTop: '2px' }}>
                        Instructions: {ord.medication?.instructions}
                      </div>
                    )}
                  </div>

                  <div>
                    {ord.status === 'COMPLETED' ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                        ✓ Dispensed
                      </span>
                    ) : (
                      <Md3Button variant="filled" size="small" onClick={() => handleDispense(ord._id)}>
                        Dispense to Ward
                      </Md3Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyFloorRequisitions;
