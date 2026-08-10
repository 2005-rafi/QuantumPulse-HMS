import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import BillingTemplateEditor from '../billing/BillingTemplateEditor';
import { adminAPI } from '../../services/adminAPI';

const AdminSettings = () => {
  const { billingSettings, setBillingSettings, showSuccess, showError } = useOutletContext();
  const [localLoading, setLocalLoading] = useState(false);

  const handleSaveBillingSettings = async (settings) => {
    setLocalLoading(true);
    try {
      await adminAPI.updateSetting('billing_template', settings);
      showSuccess('Billing template settings saved successfully!');
      setBillingSettings(settings);
    } catch (err) {
      showError(err.response?.data?.message || 'Error saving settings');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, margin: '0 auto', width: '100%' }}>
      <BillingTemplateEditor 
        initialSettings={billingSettings} 
        onSave={handleSaveBillingSettings} 
        loading={localLoading} 
      />
    </div>
  );
};

export default AdminSettings;
