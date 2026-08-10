import React from 'react';
import { BentoGrid, BentoGridItem } from '../../components/md3/BentoGrid';
import LabOrdersManager from './LabOrdersManager';
import LabResultsPanel from './LabResultsPanel';

const OrdersResultsTab = ({
  visit,
  form,
  laboratories,
  onLabOrdersChange
}) => {
  return (
    <BentoGrid columns={3} gap="large">
      <BentoGridItem colSpan={2}>
        <LabOrdersManager
          labOrders={form?.labOrders || []}
          laboratories={laboratories}
          onLabOrdersChange={onLabOrdersChange}
        />
      </BentoGridItem>

      <BentoGridItem colSpan={1}>
        <LabResultsPanel labOrders={visit?.labOrders || []} />
      </BentoGridItem>
    </BentoGrid>
  );
};

export default OrdersResultsTab;
