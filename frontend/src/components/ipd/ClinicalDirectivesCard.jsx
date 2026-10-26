/**
 * components/ipd/ClinicalDirectivesCard.jsx
 * Inpatient Clinical Directives, Provisional Diagnosis, Care Plan & Physician Orders Card.
 * Compact, borderless tabular layout matching EHR standards.
 */
import React from 'react';

export const ClinicalDirectivesCard = ({
  admission,
  cpoeOrders = [],
}) => {
  if (!admission) return null;

  const patient = admission.patientId || {};
  const allergies = patient.allergies || [];
  const hasAllergies = Array.isArray(allergies) && allergies.length > 0;

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Header — Sized for visibility */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="material-symbols-rounded"
            style={{
              fontSize: '18px',
              color: 'var(--md-sys-color-primary, #006a6a)',
            }}
          >
            assignment_turned_in
          </span>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
            Inpatient Clinical Directives &amp; Physician Orders
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline, #707973)' }}>
            • Admitting Diagnosis &amp; Care Directives
          </span>
        </div>

        <div>
          {hasAllergies ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#fee2e2',
                color: '#991b1b',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>warning</span>
              Allergies: {allergies.map((a) => (typeof a === 'string' ? a : a.allergen || 'Allergy')).join(', ')}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f0fdf4',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>verified</span>
              NKDA (No Known Drug Allergies)
            </span>
          )}
        </div>
      </div>

      {/* Nursing Care Directives & Protocol (Provisional Dx and Diet already displayed in Patient Banner above) */}
      <div
        style={{
          background: 'var(--md-sys-color-surface-container-low, #f7f9f8)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--md-sys-color-primary, #006a6a)' }}>
            Inpatient Care Plan &amp; Nursing Protocol
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-outline, #707973)' }}>
            Admission Type: <strong>{admission.admissionType || 'PLANNED'}</strong>
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface, #1d1b20)', lineHeight: '1.35' }}>
          {admission.carePlan || 'Standard Inpatient Nursing Protocol · Continuous vitals monitoring and shift telemetry handover.'}
        </div>
        {admission.chiefComplaints && (
          <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)', marginTop: '2px' }}>
            <strong>Chief Complaints:</strong> {admission.chiefComplaints}
          </div>
        )}
      </div>

      {/* 3. Active Doctor CPOE Orders Stream */}
      <div style={{ borderTop: '1px solid var(--md-sys-color-surface-container)', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            Active Physician Orders ({cpoeOrders.length})
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-outline)' }}>
            Prescribed via Doctor Cockpit
          </span>
        </div>

        {cpoeOrders.length === 0 ? (
          <div
            style={{
              background: 'var(--md-sys-color-surface-container-lowest, #ffffff)',
              borderRadius: '6px',
              padding: '8px 12px',
              textAlign: 'center',
              fontSize: '0.74rem',
              color: 'var(--md-sys-color-outline, #707973)',
            }}
          >
            No active physician CPOE orders recorded yet for this admission encounter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cpoeOrders.slice(0, 5).map((ord) => (
              <div
                key={ord._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--md-sys-color-surface-container-low, #f7f9f8)',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--md-sys-color-on-surface)' }}>
                    [{ord.orderType || 'ORDER'}] {ord.details?.medicationName || ord.details?.testName || ord.details?.dietType || ord.details?.procedureName || 'Clinical Directive'}
                  </strong>
                  <div style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-outline)' }}>
                    {ord.instructions || ord.details?.instructions || 'Standard ward protocol'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: ord.status === 'COMPLETED' ? '#dcfce7' : ord.status === 'IN_PROGRESS' ? '#e0f2fe' : '#fef3c7',
                    color: ord.status === 'COMPLETED' ? '#166534' : ord.status === 'IN_PROGRESS' ? '#0369a1' : '#92400e',
                  }}
                >
                  {ord.status || 'ORDERED'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalDirectivesCard;
