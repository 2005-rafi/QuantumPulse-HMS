/**
 * components/ipd/IoBalanceCard.jsx
 * Dual-column Intake & Output Fluid Balance Chart.
 */
import React, { useState } from 'react';
import { Md3Button, Md3TextField, Md3Select } from '../md3/Md3FormComponents';

export const IoBalanceCard = ({
  ioRecords = [],
  onLogIO,
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [shift, setShift] = useState('MORNING');
  const [oral, setOral] = useState('');
  const [ivFluids, setIvFluids] = useState('');
  const [rylesTube, setRylesTube] = useState('');
  const [urine, setUrine] = useState('');
  const [drainage, setDrainage] = useState('');
  const [vomitus, setVomitus] = useState('');
  const [notes, setNotes] = useState('');

  const latest = ioRecords[0] || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogIO({
      shift,
      intake: {
        oral: oral ? parseFloat(oral) : 0,
        ivFluids: ivFluids ? parseFloat(ivFluids) : 0,
        rylesTube: rylesTube ? parseFloat(rylesTube) : 0,
      },
      output: {
        urine: urine ? parseFloat(urine) : 0,
        drainage: drainage ? parseFloat(drainage) : 0,
        vomitus: vomitus ? parseFloat(vomitus) : 0,
      },
      notes,
    });
    setShowLogModal(false);
    setOral('');
    setIvFluids('');
    setRylesTube('');
    setUrine('');
    setDrainage('');
    setVomitus('');
    setNotes('');
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
            Fluid Intake & Output (I/O) Balance
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)' }}>
            Hemodynamic fluid volume management
          </span>
        </div>
        <Md3Button variant="tonal" size="small" onClick={() => setShowLogModal(true)}>
          + Log Shift I/O
        </Md3Button>
      </div>

      {latest ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            background: 'var(--md-sys-color-surface-container, #f0f5f2)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
              Total Intake
            </span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--md-sys-color-primary)' }}>
              {latest.totalIntake || 0} mL
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
              Total Output
            </span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--md-sys-color-error)' }}>
              {latest.totalOutput || 0} mL
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)', display: 'block', textTransform: 'uppercase' }}>
              Net Balance
            </span>
            <strong
              style={{
                fontSize: '1.3rem',
                color: (latest.netBalance || 0) >= 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)',
              }}
            >
              {(latest.netBalance || 0) > 0 ? `+${latest.netBalance}` : latest.netBalance || 0} mL
            </strong>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--md-sys-color-outline)', fontSize: '0.85rem' }}>
          No fluid balance recorded for current admission yet.
        </div>
      )}

      {/* History table */}
      {ioRecords.length > 0 && (
        <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Date & Shift</th>
                <th style={{ padding: '8px' }}>Intake</th>
                <th style={{ padding: '8px' }}>Output</th>
                <th style={{ padding: '8px' }}>Net</th>
                <th style={{ padding: '8px' }}>Nurse</th>
              </tr>
            </thead>
            <tbody>
              {ioRecords.slice(0, 5).map((r) => (
                <tr key={r._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <td style={{ padding: '8px' }}>
                    {new Date(r.recordedAt).toLocaleDateString('en-IN')} ({r.shift})
                  </td>
                  <td style={{ padding: '8px', color: 'var(--md-sys-color-primary)' }}>{r.totalIntake} mL</td>
                  <td style={{ padding: '8px', color: 'var(--md-sys-color-error)' }}>{r.totalOutput} mL</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{r.netBalance} mL</td>
                  <td style={{ padding: '8px' }}>{r.recordedBy?.firstName || 'Nurse'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log I/O Modal */}
      {showLogModal && (
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
          onClick={() => setShowLogModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>Log Fluid Intake & Output (mL)</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Md3Select label="Shift" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="MORNING">Morning Shift (07:00 - 14:00)</option>
                <option value="EVENING">Evening Shift (14:00 - 21:00)</option>
                <option value="NIGHT">Night Shift (21:00 - 07:00)</option>
              </Md3Select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-primary)' }}>Intake (mL)</strong>
                  <Md3TextField label="Oral Fluids" type="number" value={oral} onChange={(e) => setOral(e.target.value)} placeholder="0" />
                  <Md3TextField label="IV Fluids" type="number" value={ivFluids} onChange={(e) => setIvFluids(e.target.value)} placeholder="0" />
                  <Md3TextField label="Ryles Tube" type="number" value={rylesTube} onChange={(e) => setRylesTube(e.target.value)} placeholder="0" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-error)' }}>Output (mL)</strong>
                  <Md3TextField label="Urine" type="number" value={urine} onChange={(e) => setUrine(e.target.value)} placeholder="0" />
                  <Md3TextField label="Drainage" type="number" value={drainage} onChange={(e) => setDrainage(e.target.value)} placeholder="0" />
                  <Md3TextField label="Vomitus" type="number" value={vomitus} onChange={(e) => setVomitus(e.target.value)} placeholder="0" />
                </div>
              </div>

              <Md3TextField label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Urine clear amber" />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Md3Button variant="outlined" type="button" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Md3Button>
                <Md3Button variant="filled" type="submit">
                  Save I/O Entry
                </Md3Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoBalanceCard;
