import React from 'react';
import { Md3Section, Icon } from '../../components/md3/Md3Widgets';
import { Md3TextArea } from '../../components/md3/Md3Widgets';

const DoctorNotesEditor = ({ notes, onChange }) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <Md3Section
      title="Private Doctor Notes"
      subtitle="Confidential clinical notes — visible to clinical staff only"
      icon={<Icon.FileText />}
    >
      <Md3TextArea
        id="doctor-notes"
        name="notes"
        label="Notes (Optional)"
        value={notes || ''}
        onChange={handleChange}
        rows={3}
        placeholder="Record any additional observations, follow-up instructions, or clinical context..."
      />
    </Md3Section>
  );
};

export default DoctorNotesEditor;
