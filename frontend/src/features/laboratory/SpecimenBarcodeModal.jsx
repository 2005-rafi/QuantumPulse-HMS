import React from 'react';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import './SpecimenBarcodeModal.css';

/* ============================================================
   SpecimenBarcodeModal.jsx — 2" x 1" Thermal Tube Label Generator
   Code-128 barcode simulation for clinical vacutainer accessioning
   ============================================================ */

const getTubeInfo = (sampleType, testName) => {
  const name = (testName || '').toLowerCase();
  const type = (sampleType || '').toLowerCase();
  if (name.includes('cbc') || name.includes('hemogram') || type.includes('edta')) {
    return { bg: 'var(--md-lab-tube-edta-bg)', color: 'var(--md-lab-tube-edta-text)', border: 'var(--md-lab-tube-edta-border)', label: 'EDTA Lavender Top', code: 'EDTA-K2' };
  }
  if (name.includes('coagulation') || name.includes('pt/inr') || type.includes('citrate')) {
    return { bg: 'var(--md-lab-tube-citrate-bg)', color: 'var(--md-lab-tube-citrate-text)', border: 'var(--md-lab-tube-citrate-border)', label: 'Sodium Citrate Light Blue', code: 'CIT-3.2%' };
  }
  if (name.includes('glucose') || type.includes('fluoride')) {
    return { bg: 'var(--md-lab-tube-fluoride-bg)', color: 'var(--md-lab-tube-fluoride-text)', border: 'var(--md-lab-tube-fluoride-border)', label: 'Sodium Fluoride Gray', code: 'NAF-OX' };
  }
  if (name.includes('culture') || type.includes('swab')) {
    return { bg: 'var(--md-lab-tube-sterile-bg)', color: 'var(--md-lab-tube-sterile-text)', border: 'var(--md-lab-tube-sterile-border)', label: 'Sterile Swab', code: 'CULT-SW' };
  }
  return { bg: 'var(--md-lab-tube-sst-bg)', color: 'var(--md-lab-tube-sst-text)', border: 'var(--md-lab-tube-sst-border)', label: 'SST Gold Top Gel', code: 'SST-GEL' };
};

// Generates consistent bar widths simulating Code-128
const generateBarcodeBars = (str = 'SPEC-001') => {
  const hash = str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bars = [];
  for (let i = 0; i < 36; i++) {
    const isThick = ((hash * (i + 1) * 7) % 5) === 0;
    const isMedium = ((hash * (i + 3) * 3) % 3) === 0;
    const width = isThick ? 4 : isMedium ? 2 : 1;
    bars.push({ id: i, width });
  }
  return bars;
};

export const SpecimenBarcodeModal = ({
  isOpen,
  onClose,
  visit,
  order,
}) => {
  if (!isOpen || !visit || !order) return null;

  const patient = visit.patientId || {};
  const fullName = patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown Patient';
  const mrn = patient.mrn ? (patient.mrn === 'DELETED-RECORD' || patient.mrn.startsWith('MRN-') ? patient.mrn : `MRN-${patient.mrn}`) : 'MRN-UNASSIGNED';
  const token = visit.tokenString || 'TOKEN-001';
  const testName = order.testName || 'Diagnostic Investigation';
  const tube = getTubeInfo(order.sampleType, testName);
  const barcode = order.specimenBarcode || `SPEC-${token}-${(order._id || order.id || '0000').slice(-4).toUpperCase()}`;
  const collectionDate = order.sampleCollectedAt ? new Date(order.sampleCollectedAt) : new Date();
  const timeFormatted = collectionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = collectionDate.toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });

  const bars = generateBarcodeBars(barcode);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard?.writeText(barcode);
  };

  return (
    <div className="sbm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sbm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sbm-header">
          <div className="sbm-header__title">
            <span className="material-symbols-rounded">barcode_scanner</span>
            <span>Thermal Specimen Tube Label</span>
          </div>
          <button
            onClick={onClose}
            className="sbm-close-btn"
            aria-label="Close barcode dialog"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="sbm-body">
          {/* Physical 2" x 1" Label Preview */}
          <div className="sbm-sticker" id="specimen-printable-label">
            <div className="sbm-sticker__cap-strip" style={{ backgroundColor: tube.color }} />

            <div className="sbm-sticker__top">
              <div className="sbm-sticker__pt-name">{fullName}</div>
              <div className="sbm-sticker__meta">{token}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sbm-sticker__meta">{mrn} • {patient.age && patient.age !== '—' && !isNaN(Number(patient.age)) ? `${patient.age}y` : ''} {patient.gender ? `/${patient.gender[0]}` : ''}</span>
              <span className="sbm-sticker__meta" style={{ fontWeight: 700, color: tube.color }}>{tube.code}</span>
            </div>

            <div className="sbm-sticker__test-name">{testName}</div>

            {/* Barcode Strip */}
            <div className="sbm-barcode-box">
              <div className="sbm-barcode-bars">
                {bars.map((b) => (
                  <div key={b.id} className="sbm-bar" style={{ width: `${b.width}px` }} />
                ))}
              </div>
              <div className="sbm-barcode-text">*{barcode}*</div>
            </div>

            <div className="sbm-sticker__bottom">
              <span>{tube.label}</span>
              <span>{dateFormatted} {timeFormatted}</span>
            </div>
          </div>

          <div className="sbm-sub-tip">
            Ready for 2" x 1" (50mm x 25mm) thermal sticker printer accessioning.
          </div>
        </div>

        <footer className="sbm-footer">
          <Md3Button variant="outlined" size="medium" onClick={handleCopyBarcode}>
            <span className="material-symbols-rounded">content_copy</span>
            <span>Copy Barcode</span>
          </Md3Button>
          <Md3Button
            variant="filled"
            size="medium"
            onClick={handlePrint}
            className="sbm-print-btn"
          >
            <span className="material-symbols-rounded">print</span>
            <span>Print Label</span>
          </Md3Button>
        </footer>
      </div>
    </div>
  );
};

export default SpecimenBarcodeModal;
