import React from 'react';
import { BentoGrid, BentoGridItem } from '../../components/md3/BentoGrid';
import MedicalHistoryPanel from './MedicalHistoryPanel';

const HistoryTab = ({ patient }) => {
  return (
    <BentoGrid columns={3} gap="large">
      <BentoGridItem colSpan={3}>
        <MedicalHistoryPanel patient={patient} />
      </BentoGridItem>
    </BentoGrid>
  );
};

export default HistoryTab;
