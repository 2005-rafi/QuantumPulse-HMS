import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/adminAPI';
import { useConfig } from '../context/ConfigContext';

const DEFAULT_HOSPITAL_INFO = {
  name: 'QUANTUM CAREONE HOSPITAL',
  subHeader: 'Advanced Center for Clinical Care & Surgery',
  address: 'Plot 42, Health City Expressway, Tech Zone 4, Chennai, TN - 600001',
  phone: '+91 (044) 4900-8800',
  email: 'billing@quantumcare.org',
  gstin: '33AAAAA0000A1Z5',
  pan: 'AAACA0000A',
  cin: 'U85110TN2026PTC100000',
  dlNo: 'DL-TN-04-2026-99182',
  logoUrl: '',
};

const DEFAULT_WORKFLOW_TEMPLATES = {
  OPD: {
    labels: {
      title: 'OUTPATIENT OPD VISIT BILL & RECEIPT',
      tokenSlipTitle: 'OPD CLINICAL CONSULTATION SLIP',
      billNo: 'Receipt / Bill No',
      date: 'Date & Time',
      patientName: 'Patient Name',
      mrn: 'UHID / MRN',
      ageGender: 'Age / Gender',
      phone: 'Mobile',
      department: 'Clinical Specialty',
      doctor: 'Attending Physician',
      consultationFee: 'Doctor Consultation Fee',
      registrationFee: 'Patient Registration Fee',
      total: 'Total Amount Paid',
      footerNote: 'Thank you for choosing Quantum CareOne. For appointments or telemedicine follow-up, visit quantumcare.org.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      doctor: true,
      ageGender: true,
      phone: true,
      tokenNumber: true,
      department: true,
      chiefComplaints: true,
      consultationFee: true,
      registrationFee: true,
      patientSignature: true,
      billingOfficer: true,
      footerNote: true,
    },
    customFields: [],
  },
  IPD: {
    labels: {
      title: 'INPATIENT (IPD) HOSPITAL BILL & SETTLEMENT',
      admissionSlipTitle: 'INPATIENT ADMISSION SUMMARY',
      billNo: 'Invoice No',
      date: 'Billing Date',
      patientName: 'Patient Name',
      mrn: 'UHID / MRN',
      admissionNo: 'IPD Admission No',
      bedInfo: 'Ward / Bed Class',
      admissionDate: 'Date of Admission',
      dischargeDate: 'Date of Discharge',
      department: 'Admitting Specialty',
      doctor: 'Primary Consultant',
      total: 'Net Payable',
      footerNote: 'Computer generated inpatient bill. Valid without physical signature for TPA and tax exemption.',
    },
    fieldVisibility: {
      hospitalAddress: true,
      hospitalContact: true,
      hospitalTaxId: true,
      doctor: true,
      admissionNo: true,
      bedInfo: true,
      admissionDate: true,
      dischargeDate: true,
      department: true,
      diagnosis: true,
      patientSignature: true,
      billingOfficer: true,
      hospitalSeal: true,
      footerNote: true,
    },
    customFields: [],
  },
};

/**
 * useBillingTemplateSettings
 * Hook to retrieve authoritative, centralized billing template configuration
 * saved under Admin Settings (Tariff and Bill Management -> Billing Template Configuration).
 */
export const useBillingTemplateSettings = () => {
  const config = useConfig();
  const [templateConfig, setTemplateConfig] = useState(() => {
    return {
      hospitalInfo: {
        ...DEFAULT_HOSPITAL_INFO,
        name: config?.HOSPITAL_NAME || DEFAULT_HOSPITAL_INFO.name,
      },
      templates: DEFAULT_WORKFLOW_TEMPLATES,
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSetting('billing_template');
      const val = res.data?.data?.value || res.data?.value;
      if (val) {
        setTemplateConfig({
          hospitalInfo: {
            ...DEFAULT_HOSPITAL_INFO,
            name: config?.HOSPITAL_NAME || DEFAULT_HOSPITAL_INFO.name,
            ...(val.hospitalInfo || {}),
          },
          templates: {
            OPD: {
              ...DEFAULT_WORKFLOW_TEMPLATES.OPD,
              ...(val.templates?.OPD || {}),
              labels: { ...DEFAULT_WORKFLOW_TEMPLATES.OPD.labels, ...(val.templates?.OPD?.labels || {}) },
              fieldVisibility: { ...DEFAULT_WORKFLOW_TEMPLATES.OPD.fieldVisibility, ...(val.templates?.OPD?.fieldVisibility || {}) },
            },
            IPD: {
              ...DEFAULT_WORKFLOW_TEMPLATES.IPD,
              ...(val.templates?.IPD || {}),
              labels: { ...DEFAULT_WORKFLOW_TEMPLATES.IPD.labels, ...(val.templates?.IPD?.labels || {}) },
              fieldVisibility: { ...DEFAULT_WORKFLOW_TEMPLATES.IPD.fieldVisibility, ...(val.templates?.IPD?.fieldVisibility || {}) },
            },
            ...(val.templates || {}),
          },
        });
      }
    } catch (err) {
      console.warn('[useBillingTemplateSettings] Falling back to default template settings:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [config?.HOSPITAL_NAME]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getWorkflowTemplate = useCallback(
    (workflowType = 'OPD') => {
      const wfKey = String(workflowType).toUpperCase();
      const matched = templateConfig?.templates?.[wfKey] || templateConfig?.templates?.OPD || DEFAULT_WORKFLOW_TEMPLATES.OPD;
      return {
        hospitalInfo: templateConfig?.hospitalInfo || DEFAULT_HOSPITAL_INFO,
        labels: matched.labels || {},
        fieldVisibility: matched.fieldVisibility || {},
        customFields: matched.customFields || [],
      };
    },
    [templateConfig]
  );

  return {
    templateConfig,
    loading,
    error,
    refreshSettings: fetchSettings,
    getWorkflowTemplate,
  };
};

export default useBillingTemplateSettings;
