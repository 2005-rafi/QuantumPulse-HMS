import React, { useState } from 'react';
import {
  Md3Section, Icon, Md3IconButton, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3Select, Md3Button } from '../../components/md3/Md3FormComponents';

const LabOrdersManager = ({
  labOrders = [],
  laboratories = [],
  onLabOrdersChange,
}) => {
  const [labInput, setLabInput] = useState({
    laboratoryId: '',
    testName: '',
    sampleType: '',
  });

  const selectedLab = laboratories.find((l) => l._id === labInput.laboratoryId);

  const setField = (field) => (e) => {
    const value = e.target.value;
    if (field === 'laboratoryId') {
      setLabInput({ laboratoryId: value, testName: '', sampleType: '' });
    } else if (field === 'testName') {
      const test = selectedLab?.testCatalog?.find((t) => t.name === value);
      setLabInput({ ...labInput, testName: value, sampleType: test?.sampleType || '' });
    } else {
      setLabInput({ ...labInput, [field]: value });
    }
  };

  const addLabOrder = () => {
    if (!labInput.laboratoryId || !labInput.testName) return;
    onLabOrdersChange([...labOrders, { ...labInput }]);
    setLabInput({ laboratoryId: '', testName: '', sampleType: '' });
  };

  const removeLabOrder = (index) => {
    const order = labOrders[index];
    if (order.status && order.status !== 'PENDING_SAMPLE' && order.status !== 'PENDING') return;
    onLabOrdersChange(labOrders.filter((_, i) => i !== index));
  };

  return (
    <Md3Section title="Lab Orders" icon={<Icon.Beaker />}>
      <div className="lab-entry-row">
        <div className="lab-entry-row__lab">
          <Md3Select
            id="lab-select"
            name="laboratoryId"
            label="Laboratory"
            value={labInput.laboratoryId}
            onChange={setField('laboratoryId')}
          >
            <option value="">-- Select Laboratory --</option>
            {laboratories.map((lab) => (
              <option key={lab._id} value={lab._id}>{lab.name}</option>
            ))}
          </Md3Select>
        </div>
        <div className="lab-entry-row__test">
          <Md3Select
            id="lab-test-select"
            name="testName"
            label="Test Name"
            value={labInput.testName}
            onChange={setField('testName')}
            disabled={!labInput.laboratoryId}
          >
            <option value="">-- Select Test --</option>
            {selectedLab?.testCatalog?.map((t, idx) => (
              <option key={idx} value={t.name}>{t.name}</option>
            ))}
          </Md3Select>
        </div>
        <div className="lab-entry-row__btn">
          <Md3Button
            variant="tonal"
            onClick={addLabOrder}
            disabled={!labInput.laboratoryId || !labInput.testName}
          >
            Add Order
          </Md3Button>
        </div>
      </div>

      {labOrders.length > 0 && (
        <ul className="lab-order-list">
          {labOrders.map((l, i) => {
            const labName = laboratories.find((lab) => lab._id === l.laboratoryId)?.name || 'Lab';
            const canRemove = !l.status || l.status === 'PENDING_SAMPLE' || l.status === 'PENDING';
            return (
              <li key={i} className="lab-row">
                <div className="lab-row__info">
                  <span className="lab-row__name">{l.testName}</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <Md3Chip variant="tertiary" size="small">{labName}</Md3Chip>
                    {l.sampleType && (
                      <Md3Chip variant="default" size="small">{l.sampleType}</Md3Chip>
                    )}
                    {l.status && l.status !== 'PENDING_SAMPLE' && l.status !== 'PENDING' && (
                      <Md3Chip variant="secondary" size="small">{l.status.replace(/_/g, ' ')}</Md3Chip>
                    )}
                  </div>
                </div>
                {canRemove && (
                  <Md3IconButton
                    icon={<Icon.Remove />}
                    onClick={() => removeLabOrder(i)}
                    variant="standard"
                    size="small"
                    ariaLabel={`Remove ${l.testName}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Md3Section>
  );
};

export default LabOrdersManager;
