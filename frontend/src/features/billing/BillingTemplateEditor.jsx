import React, { useState, useEffect } from 'react';
import { Md3Section, Md3Card, Md3IconButton, Icon } from '../../components/md3/Md3Widgets';
import { Md3TextField, Md3Button, Md3Select } from '../../components/md3/Md3FormComponents';
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
      city: 'Bangalore'
    }
  },
  consultation: {
    doctorId: {
      firstName: 'Arjun',
      lastName: 'Desai'
    }
  }
};

const mockMedications = [
  {
    recommended: 'Paracetamol 650mg',
    quantity: 10,
    amount: 15,
    dosageSchedule: {
      morning: { count: 1, timing: 'AFTER_MEAL' },
      afternoon: { count: 0 },
      night: { count: 1, timing: 'AFTER_MEAL' }
    }
  },
  {
    recommended: 'Amoxicillin 500mg',
    quantity: 15,
    amount: 85,
    dosageSchedule: {
      morning: { count: 1, timing: 'BEFORE_MEAL' },
      afternoon: { count: 1, timing: 'BEFORE_MEAL' },
      night: { count: 1, timing: 'BEFORE_MEAL' }
    }
  }
];

const ExpandMoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ExpandLessIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const BillingTemplateEditor = ({ initialSettings, onSave, loading }) => {
  const [hospitalInfo, setHospitalInfo] = useState({ name: '', address: '', contact: '' });
  const [labels, setLabels] = useState({
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
    footerNote: 'Thank you for your visit. Wishing you a speedy recovery!'
  });
  const [customFields, setCustomFields] = useState([]);
  
  const [openSections, setOpenSections] = useState({
    hospital: true,
    invoiceInfo: false,
    tableLabels: false,
    signatures: false,
    custom: true
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (initialSettings) {
      setHospitalInfo(initialSettings.hospitalInfo || { name: '', address: '', contact: '' });
      if (initialSettings.labels) {
        if (Array.isArray(initialSettings.labels)) {
          // Convert array format to standard flat object
          const flat = initialSettings.labels.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});
          setLabels(prev => ({ ...prev, ...flat }));
        } else {
          setLabels(prev => ({ ...prev, ...initialSettings.labels }));
        }
      }
      setCustomFields(initialSettings.customFields || []);
    }
  }, [initialSettings]);

  const handleLabelChange = (field, value) => {
    setLabels(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomField = () => {
    const newField = {
      id: Math.random().toString(36).substr(2, 9),
      position: 'patientInfo',
      label: 'New Field Label',
      valueType: 'static',
      staticValue: 'Custom Value',
      dynamicField: 'patient.phone'
    };
    setCustomFields([...customFields, newField]);
  };

  const handleRemoveCustomField = (id) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleCustomFieldChange = (id, property, value) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, [property]: value } : f));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const settingsToSave = {
      hospitalInfo,
      labels,
      customFields
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
          subtitle="Hospital brand and contact info."
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
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Md3TextField 
                  id="hosp-name"
                  label="Hospital Name"
                  value={hospitalInfo.name}
                  onChange={e => setHospitalInfo({ ...hospitalInfo, name: e.target.value })}
                  required
                />
                <Md3TextField 
                  id="hosp-address"
                  label="Address"
                  value={hospitalInfo.address}
                  onChange={e => setHospitalInfo({ ...hospitalInfo, address: e.target.value })}
                  required
                />
                <Md3TextField 
                  id="hosp-contact"
                  label="Contact Details"
                  value={hospitalInfo.contact}
                  onChange={e => setHospitalInfo({ ...hospitalInfo, contact: e.target.value })}
                  required
                />
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 2. Titles & Patient Info Metadata */}
        <Md3Section 
          title="2. Titles & Metadata Labels" 
          subtitle="Define titles and label text for patient demographics."
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
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Md3TextField 
                  label="Invoice Title"
                  value={labels.title}
                  onChange={e => handleLabelChange('title', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Date Label"
                  value={labels.date}
                  onChange={e => handleLabelChange('date', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Bill Number Label"
                  value={labels.billNo}
                  onChange={e => handleLabelChange('billNo', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Patient Name Label"
                  value={labels.patientName}
                  onChange={e => handleLabelChange('patientName', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="MRN Label"
                  value={labels.mrn}
                  onChange={e => handleLabelChange('mrn', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Age & Gender Label"
                  value={labels.ageGender}
                  onChange={e => handleLabelChange('ageGender', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Consulting Doctor Label"
                  value={labels.doctor}
                  onChange={e => handleLabelChange('doctor', e.target.value)}
                  required
                />
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 3. Table & Charges Labels */}
        <Md3Section 
          title="3. Table & Charges Labels" 
          subtitle="Formatting for checkout table columns and row items."
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
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Md3TextField 
                  label="Description Column Header"
                  value={labels.description}
                  onChange={e => handleLabelChange('description', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Quantity Column Header"
                  value={labels.quantity}
                  onChange={e => handleLabelChange('quantity', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Amount Column Header"
                  value={labels.amount}
                  onChange={e => handleLabelChange('amount', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Consultation Fee Row Label"
                  value={labels.consultationFee}
                  onChange={e => handleLabelChange('consultationFee', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Laboratory Charges Row Label"
                  value={labels.labCharges}
                  onChange={e => handleLabelChange('labCharges', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Total Due Row Label"
                  value={labels.totalAmount}
                  onChange={e => handleLabelChange('totalAmount', e.target.value)}
                  required
                />
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 4. Footer & Signatures */}
        <Md3Section 
          title="4. Signatures & Footer Note" 
          subtitle="Verify sign-offs and terms footer content."
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
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Md3TextField 
                  label="Pharmacist Signature Label"
                  value={labels.pharmacistSignature}
                  onChange={e => handleLabelChange('pharmacistSignature', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Hospital Seal Label"
                  value={labels.hospitalSeal}
                  onChange={e => handleLabelChange('hospitalSeal', e.target.value)}
                  required
                />
                <Md3TextField 
                  label="Bottom Footer Note"
                  value={labels.footerNote}
                  onChange={e => handleLabelChange('footerNote', e.target.value)}
                  required
                />
              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* 5. Custom Invoice Fields (Visual drag-and-drop / selector builder) */}
        <Md3Section 
          title="5. Custom Invoice Fields" 
          subtitle="Add custom details to the Patient Information panel or the Footer block."
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
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {customFields.map((field) => (
                    <div key={field.id} style={{ display: 'flex', gap: '16px', backgroundColor: 'var(--md-sys-color-surface-container)', padding: '20px', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', flexDirection: 'column' }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        
                        <Md3Select
                          label="Field Position"
                          value={field.position}
                          onChange={e => handleCustomFieldChange(field.id, 'position', e.target.value)}
                        >
                          <option value="patientInfo">Patient Demographics Block</option>
                          <option value="footer">Footer Note Block</option>
                        </Md3Select>

                        <Md3TextField 
                          label="Display Label Name"
                          value={field.label}
                          onChange={e => handleCustomFieldChange(field.id, 'label', e.target.value)}
                          required
                        />
                        
                        <Md3Select
                          label="Value Type"
                          value={field.valueType}
                          onChange={e => handleCustomFieldChange(field.id, 'valueType', e.target.value)}
                        >
                          <option value="static">Static Text (Fixed value)</option>
                          <option value="dynamic">Dynamic System Data</option>
                        </Md3Select>

                      </div>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          {field.valueType === 'static' ? (
                            <Md3TextField 
                              label="Static Text Value"
                              value={field.staticValue}
                              onChange={e => handleCustomFieldChange(field.id, 'staticValue', e.target.value)}
                              required
                            />
                          ) : (
                            <Md3Select
                              label="Choose Dynamic Variable"
                              value={field.dynamicField}
                              onChange={e => handleCustomFieldChange(field.id, 'dynamicField', e.target.value)}
                            >
                              <option value="patient.phone">Patient Phone Number</option>
                              <option value="patient.email">Patient Email Address</option>
                              <option value="patient.bloodGroup">Patient Blood Group</option>
                              <option value="patient.city">Patient Home City</option>
                              <option value="visit.date">Live Checked-out Date</option>
                            </Md3Select>
                          )}
                        </div>
                        
                        <Md3IconButton 
                          icon={Icon.DELETE}
                          onClick={() => handleRemoveCustomField(field.id)}
                          variant="standard"
                          ariaLabel="Delete Custom Field"
                        />
                      </div>

                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                  <Md3Button 
                    type="button" 
                    variant="tonal" 
                    icon={Icon.PLUS}
                    onClick={handleAddCustomField}
                  >
                    Add Custom Field
                  </Md3Button>
                </div>

              </div>
            </Md3Card>
          )}
        </Md3Section>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
          <Md3Button type="submit" variant="filled" disabled={loading} icon={Icon.CHECK}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Md3Button>
        </div>

      </form>

      {/* RIGHT COLUMN: Live Print Preview */}
      <div className="billing-preview-panel">
        <div className="billing-preview-header">
          <h3>Live Print Preview</h3>
          <span style={{ fontSize: '0.8em', color: 'var(--md-sys-color-on-surface-variant)' }}>A4 Mock Preview</span>
        </div>
        <div className="billing-preview-desk">
          <div className="billing-preview-sheet">
            <BillingTemplate 
              hospitalInfo={hospitalInfo}
              labels={labels}
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

    </div>
  );
};

export default BillingTemplateEditor;
