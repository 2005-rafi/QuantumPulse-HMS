import React, { useState, useMemo } from 'react';
import {
  Md3Section, Icon, Md3IconButton, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3Select, Md3Button, Md3TextField } from '../../components/md3/Md3FormComponents';

/* Quick Order Clinical Presets for Instant 1-Click Addition */
const QUICK_PRESETS = [
  { labCode: 'HAEM',    labName: 'Haematology Laboratory',   testName: 'Complete Blood Count (CBC)',        sampleType: 'EDTA Blood (3 mL)' },
  { labCode: 'HAEM',    labName: 'Haematology Laboratory',   testName: 'Erythrocyte Sedimentation Rate (ESR)', sampleType: 'Citrate Blood (1.8 mL)' },
  { labCode: 'BIOCHEM', labName: 'Biochemistry Laboratory',  testName: 'Liver Function Test (LFT)',          sampleType: 'Serum (5 mL)' },
  { labCode: 'BIOCHEM', labName: 'Biochemistry Laboratory',  testName: 'Renal Function Test (RFT)',          sampleType: 'Serum (5 mL)' },
  { labCode: 'BIOCHEM', labName: 'Biochemistry Laboratory',  testName: 'Blood Glucose (Fasting / Random / PP)', sampleType: 'Fluoride Plasma' },
  { labCode: 'BIOCHEM', labName: 'Biochemistry Laboratory',  testName: 'Lipid Profile',                     sampleType: 'Serum (3 mL)' },
  { labCode: 'MICRO',   labName: 'Microbiology Laboratory',  testName: 'Urine Routine & Microscopy',        sampleType: 'Clean-Catch Midstream Urine' },
  { labCode: 'RADIO',   labName: 'Radiology & Imaging',      testName: 'Chest X-Ray (PA View)',             sampleType: 'Diagnostic Imaging' },
  { labCode: 'RADIO',   labName: 'Radiology & Imaging',      testName: 'ECG (12-Lead Electrocardiogram)',    sampleType: 'Diagnostic Imaging' },
];

const LabOrdersManager = ({
  labOrders = [],
  laboratories = [],
  onLabOrdersChange,
}) => {
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [customTestName, setCustomTestName] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isCustomTest, setIsCustomTest] = useState(false);

  // Active laboratory object
  const activeLab = useMemo(() => {
    if (!selectedLabId && laboratories.length > 0) {
      return laboratories[0];
    }
    return laboratories.find((l) => l._id === selectedLabId) || laboratories[0];
  }, [laboratories, selectedLabId]);

  // Current laboratory's test catalog
  const testCatalog = useMemo(() => {
    return activeLab?.testCatalog || [];
  }, [activeLab]);

  // Handle Lab Selection
  const handleLabChange = (e) => {
    const labId = e.target.value;
    setSelectedLabId(labId);
    setSelectedTestName('');
    setCustomTestName('');
    setIsCustomTest(false);
    setSampleType('');
  };

  // Handle Test Selection
  const handleTestChange = (e) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomTest(true);
      setSelectedTestName('');
      setSampleType('');
    } else {
      setIsCustomTest(false);
      setSelectedTestName(val);
      const matchedTest = testCatalog.find((t) => t.name === val);
      setSampleType(matchedTest?.sampleType || '');
    }
  };

  // Handle 1-Click Quick Preset
  const handleApplyPreset = (preset) => {
    const matchedLab = laboratories.find(
      (l) => l.code === preset.labCode || l.name.toLowerCase().includes(preset.labName.toLowerCase())
    ) || laboratories[0];

    const newOrder = {
      laboratoryId: matchedLab?._id || preset.labCode,
      labName: matchedLab?.name || preset.labName,
      testName: preset.testName,
      sampleType: preset.sampleType,
      priority: 'ROUTINE',
      notes: '',
      status: 'PENDING_SAMPLE',
    };

    // Avoid duplicate orders of the exact same test in this draft
    if (!labOrders.some((o) => o.testName === newOrder.testName)) {
      onLabOrdersChange([...labOrders, newOrder]);
    }
  };

  // Handle Adding Order from Form
  const handleAddOrder = () => {
    const finalTestName = isCustomTest ? customTestName.trim() : selectedTestName;
    if (!finalTestName) return;

    const labObj = activeLab || laboratories[0];
    const newOrder = {
      laboratoryId: labObj?._id || 'default-lab',
      labName: labObj?.name || 'Laboratory',
      testName: finalTestName,
      sampleType: sampleType || 'Standard Specimen',
      priority: priority || 'ROUTINE',
      notes: clinicalNotes.trim(),
      status: 'PENDING_SAMPLE',
    };

    onLabOrdersChange([...labOrders, newOrder]);

    // Reset inputs
    setSelectedTestName('');
    setCustomTestName('');
    setSampleType('');
    setClinicalNotes('');
    setIsCustomTest(false);
  };

  // Remove order
  const removeLabOrder = (index) => {
    const order = labOrders[index];
    if (order.status && order.status !== 'PENDING_SAMPLE' && order.status !== 'PENDING') return;
    onLabOrdersChange(labOrders.filter((_, i) => i !== index));
  };

  return (
    <div className="lab-orders-workspace">
      {/* ── Order Composer Card ── */}
      <div className="lab-composer-card">
        <div className="lab-composer-header">
          <div className="lab-composer-title-wrap">
            <span className="lab-composer-icon">
              <Icon.Beaker size={20} />
            </span>
            <div>
              <h3 className="lab-composer-title">Order Laboratory & Diagnostic Investigations</h3>
              <p className="lab-composer-subtitle">
                Select diagnostic department, test catalog items, or use 1-click quick presets.
              </p>
            </div>
          </div>
          <Md3Chip variant="primary" size="small">
            {laboratories.length} Laboratories Available
          </Md3Chip>
        </div>

        {/* ── 1-Click Quick Order Presets ── */}
        <div className="lab-presets-section">
          <span className="lab-presets-label">Quick Clinical Presets:</span>
          <div className="lab-presets-list">
            {QUICK_PRESETS.map((preset, idx) => {
              const isAlreadyOrdered = labOrders.some((o) => o.testName === preset.testName);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`lab-preset-btn ${isAlreadyOrdered ? 'lab-preset-btn--ordered' : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                  title={`Add ${preset.testName} (${preset.labName})`}
                >
                  <span className="lab-preset-plus">{isAlreadyOrdered ? '✓' : '+'}</span>
                  <span>{preset.testName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Form Inputs with Layered Dropdowns ── */}
        <div className="lab-form-grid">
          {/* Laboratory Selector */}
          <div className="lab-form-field lab-form-field--dropdown">
            <Md3Select
              id="lab-select"
              name="laboratoryId"
              label="Diagnostic Department / Laboratory"
              value={selectedLabId || (activeLab?._id || '')}
              onChange={handleLabChange}
            >
              {laboratories.map((lab) => (
                <option key={lab._id} value={lab._id}>
                  {lab.name} {lab.testCatalog?.length ? `(${lab.testCatalog.length} tests)` : ''}
                </option>
              ))}
            </Md3Select>
          </div>

          {/* Test Catalog Selector */}
          <div className="lab-form-field lab-form-field--dropdown">
            <Md3Select
              id="lab-test-select"
              name="testName"
              label="Investigation / Test Name"
              value={isCustomTest ? '__CUSTOM__' : selectedTestName}
              onChange={handleTestChange}
            >
              <option value="">-- Select Test from Catalog --</option>
              {testCatalog.map((t, idx) => (
                <option key={idx} value={t.name}>
                  {t.name} {t.sampleType ? `— [${t.sampleType}]` : ''}
                </option>
              ))}
              <option value="__CUSTOM__">✍ + Enter Custom / Other Test Name</option>
            </Md3Select>
          </div>

          {/* Custom Test Name (conditional) */}
          {isCustomTest && (
            <div className="lab-form-field lab-form-field--full">
              <Md3TextField
                id="custom-test-name"
                name="customTestName"
                label="Custom Investigation Name"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="e.g. Serum Ferritin, Thyroid Profile, HLA-B27"
              />
            </div>
          )}

          {/* Specimen / Sample Type */}
          <div className="lab-form-field">
            <Md3TextField
              id="lab-sample-type"
              name="sampleType"
              label="Required Specimen / Sample Tube"
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value)}
              placeholder="e.g. EDTA Blood, Serum, Sterile Urine"
            />
          </div>

          {/* Priority Selector */}
          <div className="lab-form-field lab-form-field--dropdown">
            <Md3Select
              id="lab-priority"
              name="priority"
              label="Order Urgency / Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="ROUTINE">Routine (Standard OPD)</option>
              <option value="URGENT">Urgent (Expedited Analysis)</option>
              <option value="STAT">STAT / Emergency (Immediate)</option>
            </Md3Select>
          </div>

          {/* Clinical Indication / Notes */}
          <div className="lab-form-field lab-form-field--full">
            <Md3TextField
              id="lab-clinical-notes"
              name="clinicalNotes"
              label="Clinical Indications / Special Instructions for Lab Pathologist"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Patient is fasting; Evaluate for microcytic anaemia; Pre-op baseline"
            />
          </div>
        </div>

        {/* ── Add Button ── */}
        <div className="lab-form-actions">
          <Md3Button
            variant="primary"
            onClick={handleAddOrder}
            disabled={!(isCustomTest ? customTestName.trim() : selectedTestName)}
          >
            <Icon.Plus size={16} />
            <span>Add Investigation to Order</span>
          </Md3Button>
        </div>
      </div>

      {/* ── Active Investigation Orders Queue ── */}
      <div className="lab-orders-list-card">
        <div className="lab-orders-list-header">
          <div className="lab-orders-list-title-wrap">
            <span className="lab-orders-list-icon">
              <Icon.Clipboard size={18} />
            </span>
            <h4 className="lab-orders-list-title">
              Active Investigation Orders ({labOrders.length})
            </h4>
          </div>
          <span className="lab-orders-list-hint">
            Orders route automatically to laboratory workstations upon consultation finalization
          </span>
        </div>

        {labOrders.length === 0 ? (
          <div className="lab-orders-empty">
            <Icon.Inbox size={32} />
            <p className="lab-orders-empty-title">No laboratory investigations added yet</p>
            <p className="lab-orders-empty-sub">
              Use the composer or click a quick preset above to requisition diagnostic tests.
            </p>
          </div>
        ) : (
          <ul className="lab-orders-list">
            {labOrders.map((order, i) => {
              const labObj = laboratories.find((l) => l._id === order.laboratoryId);
              const labDisplayName = order.labName || labObj?.name || 'Diagnostic Laboratory';
              const canRemove = !order.status || order.status === 'PENDING_SAMPLE' || order.status === 'PENDING';

              const priorityVariant =
                order.priority === 'STAT' ? 'error' :
                order.priority === 'URGENT' ? 'tertiary' : 'default';

              return (
                <li key={i} className="lab-order-card">
                  <div className="lab-order-card__left">
                    <span className="lab-order-card__icon">
                      <Icon.Beaker size={18} />
                    </span>
                    <div className="lab-order-card__details">
                      <div className="lab-order-card__title-row">
                        <span className="lab-order-card__name">{order.testName}</span>
                        <Md3Chip variant={priorityVariant} size="small">
                          {order.priority || 'ROUTINE'}
                        </Md3Chip>
                      </div>
                      <div className="lab-order-card__meta-row">
                        <span className="lab-order-card__dept">
                          <Icon.Building size={12} /> {labDisplayName}
                        </span>
                        <span className="lab-order-card__bullet">•</span>
                        <span className="lab-order-card__sample">
                          <Icon.Activity size={12} /> {order.sampleType || 'Specimen'}
                        </span>
                        {order.notes && (
                          <>
                            <span className="lab-order-card__bullet">•</span>
                            <span className="lab-order-card__notes" title={order.notes}>
                              Notes: {order.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lab-order-card__right">
                    {order.status && order.status !== 'PENDING_SAMPLE' && order.status !== 'PENDING' ? (
                      <Md3Chip variant="secondary" size="small">
                        {order.status.replace(/_/g, ' ')}
                      </Md3Chip>
                    ) : null}

                    {canRemove && (
                      <Md3IconButton
                        icon={<Icon.Remove />}
                        onClick={() => removeLabOrder(i)}
                        variant="standard"
                        size="small"
                        ariaLabel={`Remove ${order.testName}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LabOrdersManager;
