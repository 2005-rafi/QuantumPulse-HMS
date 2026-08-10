import React from 'react';
import { Md3Section, Icon, Md3TextArea } from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';

const ClinicalNotesEditor = ({ form, onChange, triageComplaint }) => {
  const handleChange = (field) => (e) => {
    onChange({ ...form, [field]: e.target.value });
  };

  const handleCopyTriage = () => {
    if (triageComplaint) {
      onChange({ ...form, chiefComplaint: triageComplaint });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-m)' }}>
      {/* Chief Complaint — secondary emphasis */}
      <Md3Section
        title="Clinical Assessment"
        subtitle="Patient presentation and chief complaint"
        icon={<Icon.Clipboard />}
        headerAction={
          <Md3Button
            variant="tonal"
            size="small"
            onClick={handleCopyTriage}
            icon={<Icon.Copy />}
            disabled={!triageComplaint || !!form.chiefComplaint}
          >
            Copy Triage
          </Md3Button>
        }
      >
        <div className="clinical-field-row-2">
          <Md3TextArea
            id="chief-complaint"
            name="chiefComplaint"
            label="Chief Complaint *"
            value={form.chiefComplaint || ''}
            onChange={handleChange('chiefComplaint')}
            rows={3}
          />
          <Md3TextArea
            id="hpi"
            name="hpi"
            label="History of Present Illness"
            value={form.hpi || ''}
            onChange={handleChange('hpi')}
            rows={3}
          />
        </div>
      </Md3Section>

      {/* Diagnosis — PRIMARY elevated emphasis block */}
      <div className="clinical-diagnosis-block">
        <div className="clinical-diagnosis-header">
          <div className="clinical-diagnosis-header__icon">
            <Icon.Stethoscope />
          </div>
          <h3 className="clinical-diagnosis-header__label">Diagnosis *</h3>
        </div>
        <Md3TextArea
          id="diagnosis"
          name="diagnosis"
          label="Clinical Diagnosis *"
          value={form.diagnosis || ''}
          onChange={handleChange('diagnosis')}
          rows={4}
          required
        />
      </div>

      {/* Treatment Plan — secondary tonal block */}
      <div className="clinical-treatment-block">
        <span className="clinical-treatment-label">Treatment Plan *</span>
        <Md3TextArea
          id="treatment-plan"
          name="treatmentPlan"
          label="Treatment Plan *"
          value={form.treatmentPlan || ''}
          onChange={handleChange('treatmentPlan')}
          rows={4}
          required
        />
      </div>
    </div>
  );
};

export default ClinicalNotesEditor;
