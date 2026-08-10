import React from 'react';
import { BentoGrid, BentoGridItem } from '../../components/md3/BentoGrid';
import TriageVitalsPanel from './TriageVitalsPanel';
import MedicalHistoryPanel from './MedicalHistoryPanel';
import LabResultsPanel from './LabResultsPanel';

const SummaryTab = ({ visit, patient }) => {
  return (
    <BentoGrid columns={3} gap="large">
      <BentoGridItem colSpan={3}>
        <TriageVitalsPanel vitals={visit?.vitals || {}} />
      </BentoGridItem>

      <BentoGridItem colSpan={2}>
        <MedicalHistoryPanel patient={patient} />
      </BentoGridItem>

      <BentoGridItem colSpan={1}>
        <LabResultsPanel labOrders={visit?.labOrders || []} />
      </BentoGridItem>
    </BentoGrid>
  );
};

export default SummaryTab;
