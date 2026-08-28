import React, { useState, useEffect } from 'react';
import { Md3Section, Md3Card, Md3IconButton, Icon } from '../../components/md3/Md3Widgets';
import { Md3TextField, Md3Button, Md3Select } from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import BillingTemplate from './BillingTemplate';
import './BillingTemplateEditor.css';

const mockVisit = {
  _id: 'visit_mock_123456',
  createdAt: new Date().toISOString(),
  patientId: {
    firstName: 'Siva',
    lastName: 'Kumar',
    mrn: 'PT-20260803-0012',
    age: 36,
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'siva.kumar@email.com',
    bloodGroup: 'O+',
    address: {
      city: 'Bangalore',
    },
  },
  consultation: {
    doctorId: {
      firstName: 'Arjun',
      lastName: 'Desai',
    },
  },
};

const mockMedications = [
  {
    recommended: 'Paracetamol 650mg',
    quantity: 10,
    amount: 15,
    dosageSchedule: {
      morning: { count: 1, timing: 'AFTER_MEAL' },
      afternoon: { count: 0 },
      night: { count: 1, timing: 'AFTER_MEAL' },
    },
  },
  {
    recommended: 'Amoxicillin 500mg',
    quantity: 15,
    amount: 85,
    dosageSchedule: {
      morning: { count: 1, timing: 'BEFORE_MEAL' },
      afternoon: { count: 1, timing: 'BEFORE_MEAL' },
      night: { count: 1, timing: 'BEFORE_MEAL' },
    },
  },
];

const ExpandMoreIcon = () => (
  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>expand_more</span>
);

const ExpandLessIcon = () => (
  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>expand_less</span>
);

const DEFAULT_LABELS = {
  title: 'OFFICIAL MEDICAL BILL',
  date: 'Date',
  billNo: 'Bill No',
  patientName: 'Patient Name',
  mrn: 'MRN',
  ageGender: 'Age / Gender',
  doctor: 'Consulting Doctor',
  description: 'Description',
  quantity: 'Qty',
  amount: 'Amount',
  consultationFee: 'Doctor Consultation Fee',
  labCharges: 'Laboratory Charges',
  totalAmount: 'TOTAL AMOUNT DUE',
  pharmacistSignature: 'Pharmacist Signature',
  hospitalSeal: 'Authorized Hospital Seal',
  footerNote: 'Thank you for your visit. Wishing you a speedy recovery!',
};

const DEFAULT_VISIBILITY = {
  hospitalAddress: true,
  hospitalContact: true,
  ageGender: true,
  doctor: true,
  consultationFee: true,
  labCharges: true,
  pharmacistSignature: true,
  hospitalSeal: true,
  footerNote: true,
};

const BillingTemplateEditor = ({ initialSettings, onSave, loading }) => {
  const { showSuccess, showError, showWarning } = useToast();

  const [hospitalInfo, setHospitalInfo] = useState({
    name: 'GLOBAL HEALTH HOSPITAL',
    address: '123 Medical Center Blvd, City, Country',
    contact: 'Phone: +1 234 567 890 | Email: billing@globalhealth.com',
  });

  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [fieldVisibility, setFieldVisibility] = useState(DEFAULT_VISIBILITY);
  const [customFields, setCustomFields] = useState([]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    icon: 'delete',
    onConfirm: null,
  });

  const [openSections, setOpenSections] = useState({
    hospital: true,
    invoiceInfo: true,
    tableLabels: false,
    signatures: false,
    custom: true,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.hospitalInfo) {
        setHospitalInfo(initialSettings.hospitalInfo);
      }
      if (initialSettings.labels) {
        if (Array.isArray(initialSettings.labels)) {
          const flat = initialSettings.labels.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});
          setLabels((prev) => ({ ...prev, ...flat }));
        } else {
          setLabels((prev) => ({ ...prev, ...initialSettings.labels }));
        }
      }
      if (initialSettings.fieldVisibility) {
        setFieldVisibility((prev) => ({ ...prev, ...initialSettings.fieldVisibility }));
      }
      if (initialSettings.customFields) {
        setCustomFields(initialSettings.customFields);
      }
    }
  }, [initialSettings]);

  const handleLabelChange = (field, value) => {
    setLabels((prev) => ({ ...prev, [field]: value }));
  };

  // ── Remove Optional Field Handler with Md3ConfirmDialog ──
  const handlePromptRemoveField = (fieldKey, fieldDisplayName) => {
    setConfirmDialog({
      isOpen: true,
      title: `Remove ${fieldDisplayName}?`,
      message: `Are you sure you want to remove "${fieldDisplayName}" from the billing invoice template? It will no longer appear on printed bills. You can restore it anytime.`,
      variant: 'warning',
      confirmLabel: 'Remove Field',
      cancelLabel: 'Keep Field',
      icon: 'visibility_off',
      onConfirm: () => {
        setFieldVisibility((prev) => ({ ...prev, [fieldKey]: false }));
        showSuccess('Field Removed', `"${fieldDisplayName}" has been hidden from the billing template.`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ── Restore Optional Field Handler ──
  const handleRestoreField = (fieldKey, fieldDisplayName) => {
    setFieldVisibility((prev) => ({ ...prev, [fieldKey]: true }));
    showSuccess('Field Restored', `"${fieldDisplayName}" is now visible on the billing template.`);
  };

  // ── Reset to Defaults Handler with Md3ConfirmDialog ──
  const handlePromptResetDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Template to Defaults?',
      message: 'This will restore all default headers, metadata labels, and enable all optional fields. Custom fields will be preserved.',
      variant: 'danger',
      confirmLabel: 'Reset Template',
      cancelLabel: 'Cancel',
      icon: 'restart_alt',
      onConfirm: () => {
        setLabels(DEFAULT_LABELS);
        setFieldVisibility(DEFAULT_VISIBILITY);
        showSuccess('Template Reset', 'Billing template has been restored to standard defaults.');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ── Custom Field Handlers ──
  const handleAddCustomField = () => {
    const newField = {
      id: Math.random().toString(36).substr(2, 9),
      position: 'patientInfo',
      label: 'New Custom Field',
      valueType: 'static',
      staticValue: 'Custom Value',
      dynamicField: 'patient.phone',
    };
    setCustomFields([...customFields, newField]);
    showSuccess('Field Added', 'New custom field added to template.');
  };

  const handlePromptDeleteCustomField = (id, label) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Custom Field?',
      message: `Are you sure you want to permanently delete custom field "${label || 'Untitled'}"?`,
      variant: 'danger',
      confirmLabel: 'Delete Field',
      cancelLabel: 'Cancel',
      icon: 'delete_forever',
      onConfirm: () => {
        setCustomFields(customFields.filter((f) => f.id !== id));
        showSuccess('Field Deleted', 'Custom field removed from template.');
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCustomFieldChange = (id, property, value) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, [property]: value } : f)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const settingsToSave = {
      hospitalInfo,
      labels,
      fieldVisibility,
      customFields,
    };
    onSave(settingsToSave);
  };

  return (
    <div className="billing-editor-layout">
      {/* LEFT COLUMN: Controls Form */}
      <form onSubmit={handleSubmit} className="billing-editor-form">
        {/* 1. Hospital Information Section */}
        <Md3Section
          title="1. Hospital Information"
          subtitle="Hospital brand, address, and legal billing entity."
          headerAction={
            <Md3IconButton
              icon={openSections.hospital ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => toggleSection('hospital')}
              ariaLabel="Toggle Section"
            />
          }
        >
          {openSections.hospital && (
            <Md3Card>
              <div className="billing-editor-card-content">
                {/* Hospital Name (MANDATORY) */}
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      id="hosp-name"
                      label="Hospital Legal Name"
                      value={hospitalInfo.name}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, name: e.target.value })}
                      required
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory" title="Mandatory legal header - cannot be removed">
                    Mandatory
                  </span>
                </div>

                {/* Hospital Address (OPTIONAL) */}
                {fieldVisibility.hospitalAddress !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="hosp-address"
                        label="Hospital Address / Facility Location"
                        value={hospitalInfo.address}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, address: e.target.value })}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('hospitalAddress', 'Hospital Address')}
                      title="Remove Address from Print Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Address removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('hospitalAddress', 'Hospital Address')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Address
                    </button>
                  </div>
                )}

                {/* Contact Details (OPTIONAL) */}
                {fieldVisibility.hospitalContact !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        id="hosp-contact"
                        label="Hospital Contact / Email / Phone"
                        value={hospitalInfo.contact}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, contact: e.target.value })}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('hospitalContact', 'Hospital Contact Details')}
                      title="Remove Contact from Print Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Contact details removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('hospitalContact', 'Hospital Contact Details')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Contact
                    </button>
                  </div>
                )}
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 2. Titles & Patient Info Metadata */}
        <Md3Section
          title="2. Titles & Metadata Labels"
          subtitle="Configure invoice title, invoice number, and demographic fields."
          headerAction={
            <Md3IconButton
              icon={openSections.invoiceInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => toggleSection('invoiceInfo')}
              ariaLabel="Toggle Section"
            />
          }
        >
          {openSections.invoiceInfo && (
            <Md3Card>
              <div className="billing-editor-card-content">
                {/* Invoice Title (MANDATORY) */}
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      label="Invoice Title"
                      value={labels.title}
                      onChange={(e) => handleLabelChange('title', e.target.value)}
                      required
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">
                    Mandatory
                  </span>
                </div>

                {/* Date & Bill No (MANDATORY) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Date Label"
                        value={labels.date}
                        onChange={(e) => handleLabelChange('date', e.target.value)}
                        required
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">
                      Mandatory
                    </span>
                  </div>

                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Bill No Label"
                        value={labels.billNo}
                        onChange={(e) => handleLabelChange('billNo', e.target.value)}
                        required
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">
                      Mandatory
                    </span>
                  </div>
                </div>

                {/* Patient Name & MRN (MANDATORY) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Patient Name Label"
                        value={labels.patientName}
                        onChange={(e) => handleLabelChange('patientName', e.target.value)}
                        required
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">
                      Mandatory
                    </span>
                  </div>

                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="MRN Label"
                        value={labels.mrn}
                        onChange={(e) => handleLabelChange('mrn', e.target.value)}
                        required
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--mandatory">
                      Mandatory
                    </span>
                  </div>
                </div>

                {/* Age & Gender (OPTIONAL) */}
                {fieldVisibility.ageGender !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Age & Gender Label"
                        value={labels.ageGender}
                        onChange={(e) => handleLabelChange('ageGender', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('ageGender', 'Age & Gender')}
                      title="Remove Age/Gender from Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Age & Gender label removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('ageGender', 'Age & Gender')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Age & Gender
                    </button>
                  </div>
                )}

                {/* Consulting Doctor (OPTIONAL) */}
                {fieldVisibility.doctor !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Consulting Doctor Label"
                        value={labels.doctor}
                        onChange={(e) => handleLabelChange('doctor', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('doctor', 'Consulting Doctor')}
                      title="Remove Doctor Label from Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Consulting Doctor label removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('doctor', 'Consulting Doctor')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Doctor Label
                    </button>
                  </div>
                )}
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 3. Table & Charges Labels */}
        <Md3Section
          title="3. Table & Charges Labels"
          subtitle="Formatting for itemized ledger columns and clinical service rows."
          headerAction={
            <Md3IconButton
              icon={openSections.tableLabels ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => toggleSection('tableLabels')}
              ariaLabel="Toggle Section"
            />
          }
        >
          {openSections.tableLabels && (
            <Md3Card>
              <div className="billing-editor-card-content">
                {/* Table Column Headers (MANDATORY) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Description Col"
                        value={labels.description}
                        onChange={(e) => handleLabelChange('description', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Qty Col"
                        value={labels.quantity}
                        onChange={(e) => handleLabelChange('quantity', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Amount Col"
                        value={labels.amount}
                        onChange={(e) => handleLabelChange('amount', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Consultation Fee Row (OPTIONAL) */}
                {fieldVisibility.consultationFee !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Consultation Fee Row Label"
                        value={labels.consultationFee}
                        onChange={(e) => handleLabelChange('consultationFee', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('consultationFee', 'Consultation Fee Line')}
                      title="Remove Consultation Fee line from template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Consultation Fee line removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('consultationFee', 'Consultation Fee Line')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Consultation Fee Line
                    </button>
                  </div>
                )}

                {/* Lab Charges Row (OPTIONAL) */}
                {fieldVisibility.labCharges !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Laboratory Charges Row Label"
                        value={labels.labCharges}
                        onChange={(e) => handleLabelChange('labCharges', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('labCharges', 'Laboratory Charges Line')}
                      title="Remove Lab Charges line from template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Laboratory Charges line removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('labCharges', 'Laboratory Charges Line')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Lab Charges Line
                    </button>
                  </div>
                )}

                {/* Total Due (MANDATORY) */}
                <div className="template-field-row">
                  <div className="template-field-row__input">
                    <Md3TextField
                      label="Total Due Row Label"
                      value={labels.totalAmount}
                      onChange={(e) => handleLabelChange('totalAmount', e.target.value)}
                      required
                    />
                  </div>
                  <span className="template-field-row__badge template-field-row__badge--mandatory">
                    Mandatory
                  </span>
                </div>
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 4. Signatures & Footer Note */}
        <Md3Section
          title="4. Signatures & Footer Note"
          subtitle="Legal sign-offs, pharmacy verification, and patient recovery greetings."
          headerAction={
            <Md3IconButton
              icon={openSections.signatures ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => toggleSection('signatures')}
              ariaLabel="Toggle Section"
            />
          }
        >
          {openSections.signatures && (
            <Md3Card>
              <div className="billing-editor-card-content">
                {/* Pharmacist Signature (OPTIONAL) */}
                {fieldVisibility.pharmacistSignature !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Pharmacist Signature Label"
                        value={labels.pharmacistSignature}
                        onChange={(e) => handleLabelChange('pharmacistSignature', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('pharmacistSignature', 'Pharmacist Signature Block')}
                      title="Remove Pharmacist Signature from Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Pharmacist Signature block removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('pharmacistSignature', 'Pharmacist Signature Block')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Pharmacist Signature
                    </button>
                  </div>
                )}

                {/* Hospital Seal (OPTIONAL) */}
                {fieldVisibility.hospitalSeal !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Hospital Seal Label"
                        value={labels.hospitalSeal}
                        onChange={(e) => handleLabelChange('hospitalSeal', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('hospitalSeal', 'Hospital Seal Block')}
                      title="Remove Hospital Seal from Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Hospital Seal block removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('hospitalSeal', 'Hospital Seal Block')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Hospital Seal
                    </button>
                  </div>
                )}

                {/* Footer Note (OPTIONAL) */}
                {fieldVisibility.footerNote !== false ? (
                  <div className="template-field-row">
                    <div className="template-field-row__input">
                      <Md3TextField
                        label="Bottom Footer Note"
                        value={labels.footerNote}
                        onChange={(e) => handleLabelChange('footerNote', e.target.value)}
                      />
                    </div>
                    <span className="template-field-row__badge template-field-row__badge--optional">
                      Optional
                    </span>
                    <button
                      type="button"
                      className="template-field-delete-btn"
                      onClick={() => handlePromptRemoveField('footerNote', 'Footer Note')}
                      title="Remove Footer Note from Template"
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="removed-fields-bar">
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                      Footer note removed from template
                    </span>
                    <button
                      type="button"
                      className="removed-field-restore-btn"
                      onClick={() => handleRestoreField('footerNote', 'Footer Note')}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                      Restore Footer Note
                    </button>
                  </div>
                )}
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 5. Custom Invoice Fields */}
        <Md3Section
          title="5. Custom Invoice Fields"
          subtitle="Add custom metadata tags to the Patient Demographics panel or the Footer block."
          headerAction={
            <Md3IconButton
              icon={openSections.custom ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => toggleSection('custom')}
              ariaLabel="Toggle Section"
            />
          }
        >
          {openSections.custom && (
            <Md3Card>
              <div className="billing-editor-card-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        backgroundColor: 'var(--md-sys-color-surface-container, #f3edf7)',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <Md3Select
                          label="Field Position"
                          value={field.position}
                          onChange={(e) => handleCustomFieldChange(field.id, 'position', e.target.value)}
                        >
                          <option value="patientInfo">Patient Demographics Block</option>
                          <option value="footer">Footer Note Block</option>
                        </Md3Select>

                        <Md3TextField
                          label="Display Label Name"
                          value={field.label}
                          onChange={(e) => handleCustomFieldChange(field.id, 'label', e.target.value)}
                          required
                        />

                        <Md3Select
                          label="Value Type"
                          value={field.valueType}
                          onChange={(e) => handleCustomFieldChange(field.id, 'valueType', e.target.value)}
                        >
                          <option value="static">Static Text (Fixed)</option>
                          <option value="dynamic">Dynamic System Variable</option>
                        </Md3Select>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          {field.valueType === 'static' ? (
                            <Md3TextField
                              label="Static Text Value"
                              value={field.staticValue}
                              onChange={(e) => handleCustomFieldChange(field.id, 'staticValue', e.target.value)}
                              required
                            />
                          ) : (
                            <Md3Select
                              label="Choose Dynamic Variable"
                              value={field.dynamicField}
                              onChange={(e) => handleCustomFieldChange(field.id, 'dynamicField', e.target.value)}
                            >
                              <option value="patient.phone">Patient Phone Number</option>
                              <option value="patient.email">Patient Email Address</option>
                              <option value="patient.bloodGroup">Patient Blood Group</option>
                              <option value="patient.city">Patient Home City</option>
                              <option value="visit.date">Live Checked-out Date</option>
                            </Md3Select>
                          )}
                        </div>

                        <button
                          type="button"
                          className="template-field-delete-btn"
                          onClick={() => handlePromptDeleteCustomField(field.id, field.label)}
                          title="Delete Custom Field"
                        >
                          <span className="material-symbols-rounded">delete_forever</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                  <Md3Button
                    type="button"
                    variant="tonal"
                    onClick={handleAddCustomField}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>add</span>
                    Add Custom Field
                  </Md3Button>
                </div>
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* Global Save & Reset Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #cac4d0)',
          }}
        >
          <Md3Button
            type="button"
            variant="secondary"
            onClick={handlePromptResetDefaults}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>restart_alt</span>
            Reset Defaults
          </Md3Button>

          <Md3Button type="submit" variant="filled" disabled={loading} loading={loading}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>check</span>
            {loading ? 'Saving…' : 'Save Configuration'}
          </Md3Button>
        </div>
      </form>

      {/* RIGHT COLUMN: Live Print Preview */}
      <div className="billing-preview-panel">
        <div className="billing-preview-header">
          <h3>Live Print Preview</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
            A4 Mock Preview
          </span>
        </div>
        <div className="billing-preview-desk">
          <div className="billing-preview-sheet">
            <BillingTemplate
              hospitalInfo={hospitalInfo}
              labels={labels}
              fieldVisibility={fieldVisibility}
              customFields={customFields}
              visit={mockVisit}
              medications={mockMedications}
              consultationFee={50}
              labCharges={35}
              total={185}
            />
          </div>
        </div>
      </div>

      {/* Reusable Material Confirm Dialog for Deletions / Resets */}
      <Md3ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default BillingTemplateEditor;
