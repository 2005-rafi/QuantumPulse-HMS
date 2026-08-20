import React from 'react';
import LabOrdersManager from './LabOrdersManager';
import LabResultsPanel from './LabResultsPanel';

const OrdersResultsTab = ({
  visit,
  form,
  laboratories,
  onLabOrdersChange
}) => {
  return (
    <div className="orders-results-layout">
      {/* ── Order Composer & Requisitions ── */}
      <section className="orders-results-section">
        <LabOrdersManager
          labOrders={form?.labOrders || []}
          laboratories={laboratories}
          onLabOrdersChange={onLabOrdersChange}
        />
      </section>

      {/* ── Results Inspection & Workflow Tracker ── */}
      <section className="orders-results-section">
        <LabResultsPanel
          labOrders={visit?.labOrders || []}
          patient={visit?.patientId || {}}
        />
      </section>
    </div>
  );
};

export default OrdersResultsTab;
