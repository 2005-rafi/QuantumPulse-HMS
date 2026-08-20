import React from 'react';
import { CURRENCY_SYMBOL } from '../../constants/currency';
import './BillingTemplate.css';

const BillingTemplate = React.forwardRef(({
  hospitalInfo,
  labels,
  customFields = [],
  visit,
  medications,
  consultationFee,
  labCharges,
  total,
  currency = CURRENCY_SYMBOL,
}, ref) => {
  const getDynamicValue = (fieldPath) => {
    if (!fieldPath) return '';
    if (fieldPath === 'patient.phone') return visit?.patientId?.phone || 'N/A';
    if (fieldPath === 'patient.email') return visit?.patientId?.email || 'N/A';
    if (fieldPath === 'patient.bloodGroup') return visit?.patientId?.bloodGroup || 'N/A';
    if (fieldPath === 'patient.city') return visit?.patientId?.address?.city || 'N/A';
    if (fieldPath === 'visit.date') return visit?.createdAt ? new Date(visit.createdAt).toLocaleDateString() : 'N/A';
    return 'N/A';
  };

  const renderField = (field) => {
    const displayVal = field.valueType === 'static' ? field.staticValue : getDynamicValue(field.dynamicField);
    return (
      <p key={field.id}><strong>{field.label}:</strong> {displayVal}</p>
    );
  };

  return (
    <div ref={ref} className="billing-template-container">
      {/* HEADER */}
      <div className="billing-header">
        <h1 className="hospital-name">{hospitalInfo.name}</h1>
        <p className="hospital-address">{hospitalInfo.address}</p>
        <p className="hospital-contact">{hospitalInfo.contact}</p>
      </div>

      <hr className="divider" />

      {/* BILL INFO */}
      <div className="billing-title">
        <h2>{labels.title}</h2>
        <p><strong>{labels.date}:</strong> {new Date().toLocaleDateString()}</p>
        <p><strong>{labels.billNo}:</strong> {visit?._id ? visit._id.substring(visit._id.length - 6).toUpperCase() : 'N/A'}</p>
      </div>

      {/* PATIENT INFO */}
      <div className="patient-info">
        <div className="info-column">
          <p><strong>{labels.patientName}:</strong> {visit?.patientId?.firstName} {visit?.patientId?.lastName}</p>
          <p><strong>{labels.mrn}:</strong> {visit?.patientId?.mrn}</p>
          {customFields.filter(f => f.position === 'patientInfo').filter((_, idx) => idx % 2 === 0).map(field => renderField(field))}
        </div>
        <div className="info-column">
          <p><strong>{labels.ageGender}:</strong> {visit?.patientId?.age} / {visit?.patientId?.gender}</p>
          <p><strong>{labels.doctor}:</strong> {visit?.consultation?.doctorId ? (typeof visit.consultation.doctorId === 'object' ? `Dr. ${visit.consultation.doctorId.firstName || ''} ${visit.consultation.doctorId.lastName || ''}`.trim() : 'Dr. ' + visit.consultation.doctorId) : 'N/A (Direct Sales)'}</p>
          {customFields.filter(f => f.position === 'patientInfo').filter((_, idx) => idx % 2 !== 0).map(field => renderField(field))}
        </div>
      </div>

      {/* CHARGES TABLE */}
      <table className="billing-table">
        <thead>
          <tr>
            <th>{labels.description}</th>
            <th>{labels.quantity}</th>
            <th className="amount-col">{labels.amount}</th>
          </tr>
        </thead>
        <tbody>
          {/* Consultation */}
          {Number(consultationFee) > 0 && (
            <tr>
              <td>{labels.consultationFee}</td>
              <td>1</td>
              <td className="amount-col">{currency}{Number(consultationFee).toFixed(2)}</td>
            </tr>
          )}
          
          {/* Lab */}
          {Number(labCharges) > 0 && (
            <tr>
              <td>{labels.labCharges}</td>
              <td>1</td>
              <td className="amount-col">{currency}{Number(labCharges).toFixed(2)}</td>
            </tr>
          )}

          {/* Medications */}
          {medications && medications.length > 0 && medications.map((med, idx) => {
            const ds = med.dosageSchedule;
            const formatSchedule = (data) => {
              if (!data || !data.count) return '0';
              const t = data.timing && data.timing !== 'N/A' ? ` (${data.timing.replace('_', ' ')})` : '';
              return `${data.count}${t}`;
            };
            return (
              <tr key={idx}>
                <td>
                  <div style={{ fontWeight: 'bold' }}>
                    {med.recommended} 
                    {med.alternativeGiven ? ` (Given: ${med.alternativeGiven})` : ''}
                  </div>
                  {ds && (
                    <div style={{ fontSize: '0.82em', color: '#444', marginTop: '3px' }}>
                      <span style={{ fontStyle: 'italic', color: '#666' }}>Dosage Schedule:</span> Morning: <strong>{formatSchedule(ds.morning)}</strong> | Afternoon: <strong>{formatSchedule(ds.afternoon)}</strong> | Night: <strong>{formatSchedule(ds.night)}</strong>
                    </div>
                  )}
                </td>
                <td>{med.quantity}</td>
                <td className="amount-col">{currency}{Number(med.amount || 0).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2" className="total-label">{labels.totalAmount || 'TOTAL AMOUNT DUE'}</td>
            <td className="total-amount">
              {currency}{(
                total !== undefined && total !== null && !isNaN(Number(total))
                  ? Number(total)
                  : (
                      Number(consultationFee || 0) +
                      Number(labCharges || 0) +
                      (medications || []).reduce((acc, m) => acc + (Number(m.amount) || 0), 0)
                    )
              ).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* SIGNATURE AREA */}
      <div className="signature-area">
        <div className="signature-block">
          <div className="signature-line"></div>
          <p>{labels.pharmacistSignature}</p>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <p>{labels.hospitalSeal}</p>
        </div>
      </div>

      <div className="footer-note">
        <p>{labels.footerNote}</p>
        {customFields.filter(f => f.position === 'footer').map(field => renderField(field))}
      </div>
    </div>
  );
});

export default BillingTemplate;
