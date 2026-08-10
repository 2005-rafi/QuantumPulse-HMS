import React from 'react';
import ClinicalNotesEditor from './ClinicalNotesEditor';
import PrescriptionManager from './PrescriptionManager';
import DoctorNotesEditor from './DoctorNotesEditor';

const ConsultationTab = ({
  visit,
  form,
  onFormChange,
  onMedicationsChange,
  onNotesChange
}) => {
  return (
    <div className="consultation-layout">
      <ClinicalNotesEditor
        form={form}
        onChange={onFormChange}
        triageComplaint={visit?.vitals?.chiefComplaint}
      />
      <PrescriptionManager
        medications={form?.prescribedMedications || []}
        onMedicationsChange={onMedicationsChange}
      />
      <div className="clinical-notes-block">
        <DoctorNotesEditor
          notes={form?.notes}
          onChange={onNotesChange}
        />
      </div>
    </div>
  );
};

export default ConsultationTab;
