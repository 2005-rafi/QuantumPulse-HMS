/**
 * components/ipd/EmarMedicationGrid.jsx
 * 24-Hour Electronic Medication Administration Record (e-MAR) Matrix.
 */
import React, { useState } from 'react';
import { Md3Button, Md3TextField } from '../md3/Md3FormComponents';

export const EmarMedicationGrid = ({
  records = [],
  onUpdateStatus,
  onScheduleNewMed,
}) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [omissionReason, setOmissionReason] = useState('');
  const [nurseNotes, setNurseNotes] = useState('');
  const [actionType, setActionType] = useState('GIVEN'); // GIVEN or OMITTED

  const handleOpenAction = (record, action) => {
    setSelectedRecord(record);
    setActionType(action);
    setBatchNumber('');
    setOmissionReason('');
    setNurseNotes('');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (actionType === 'GIVEN') {
      await onUpdateStatus(selectedRecord._id, 'GIVEN', { batchNumber, nurseNotes });
    } else {
      await onUpdateStatus(selectedRecord._id, 'OMITTED', { omissionReason, nurseNotes });
    }
    setSelectedRecord(null);
  };

  return (
    <div
      style={{
        background: 'var(--md-sys-color-surface, #ffffff)',
        border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Electronic Medication Administration Record (e-MAR)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            Scheduled 24-Hour Inpatient Dosing Matrix
          </span>
        </div>
      </div>

      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--md-sys-color-outline)', fontSize: '0.9rem' }}>
          No scheduled medication doses for today. Prescribe via Doctor CPOE orders.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Medication & Dosage</th>
                <th style={{ padding: '10px 12px' }}>Route & Frequency</th>
                <th style={{ padding: '10px 12px' }}>Scheduled Slot</th>
                <th style={{ padding: '10px 12px' }}>Administered Time</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isDue = r.status === 'DUE';
                const isGiven = r.status === 'GIVEN';
                const isOmitted = r.status === 'OMITTED' || r.status === 'REFUSED';

                return (
                  <tr
                    key={r._id}
                    style={{
                      borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                      backgroundColor: isDue ? 'rgba(0, 106, 87, 0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <strong>{r.medicationName}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>{r.dosage}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{r.route}</span> • {r.frequency}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {new Date(r.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {r.administeredTime ? (
                        <>
                          <div>{new Date(r.administeredTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-outline)' }}>
                            by {r.administeredBy?.firstName || 'Nurse'} {r.batchNumber ? `(Batch: ${r.batchNumber})` : ''}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isGiven
                            ? 'var(--md-sys-color-primary-container, #bbf2e1)'
                            : isDue
                            ? 'var(--md-sys-color-tertiary-container, #ffddb3)'
                            : 'var(--md-sys-color-error-container, #ffdad6)',
                          color: isGiven
                            ? 'var(--md-sys-color-on-primary-container, #00211a)'
                            : isDue
                            ? 'var(--md-sys-color-on-tertiary-container, #2b1700)'
                            : 'var(--md-sys-color-on-error-container, #410002)',
                        }}
                      >
                        ● {r.status}
                      </span>
                      {r.omissionReason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-error)', marginTop: '2px' }}>
                          Reason: {r.omissionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {isDue ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Md3Button
                            variant="filled"
                            size="small"
                            onClick={() => handleOpenAction(r, 'GIVEN')}
                          >
                            Give Dose
                          </Md3Button>
                          <Md3Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenAction(r, 'OMITTED')}
                          >
                            Omit
                          </Md3Button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>Logged</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Administration Action Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>
              {actionType === 'GIVEN' ? 'Confirm Medication Administration' : 'Record Dose Omission'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-outline)', margin: '0 0 16px 0' }}>
              Medication: <strong>{selectedRecord.medicationName}</strong> ({selectedRecord.dosage} - {selectedRecord.route})
            </p>

            <form onSubmit={handleConfirmAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {actionType === 'GIVEN' ? (
                <>
                  <Md3TextField
                    label="Medication Batch Number"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. BATCH-2026-X01"
                  />
                  <Md3TextField
                    label="Nurse Notes (Optional)"
                    value={nurseNotes}
                    onChange={(e) => setNurseNotes(e.target.value)}
                    placeholder="e.g. Administered after light food"
                  />
                </>
              ) : (
                <>
                  <Md3TextField
                    label="Reason for Omission *"
                    value={omissionReason}
                    onChange={(e) => setOmissionReason(e.target.value)}
                    placeholder="e.g. Patient asleep / Patient refused / NPO"
                    required
                  />
                  <Md3TextField
                    label="Clinical Notes"
                    value={nurseNotes}
                    onChange={(e) => setNurseNotes(e.target.value)}
                    placeholder="e.g. Doctor Dr. Smith informed"
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Md3Button variant="outlined" type="button" onClick={() => setSelectedRecord(null)}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit">
                  {actionType === 'GIVEN' ? 'Sign & Administer' : 'Confirm Omission'}
                </Md3Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmarMedicationGrid;
