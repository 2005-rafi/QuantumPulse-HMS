import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { tariffAPI } from '../../../services/tariffAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

const CATEGORIES = [
  { value: 'REGISTRATION', label: 'Registration Fees' },
  { value: 'CONSULTATION', label: 'Doctor Consultation' },
  { value: 'DIAGNOSTICS', label: 'Laboratory Diagnostics' },
  { value: 'PROCEDURE', label: 'Clinical Procedures' },
  { value: 'PACKAGE', label: 'Health Packages' },
];

const TARIFF_GRADES = [
  { value: '', label: 'All Grades (Global)' },
  { value: 'GRADE_1', label: 'Grade 1 — Intern / Junior' },
  { value: 'GRADE_2', label: 'Grade 2 — Resident / Associate' },
  { value: 'GRADE_3', label: 'Grade 3 — Consultant / Senior Consultant' },
  { value: 'GRADE_4', label: 'Grade 4 — Head of Dept / Superintendent' },
  { value: 'GRADE_5', label: 'Grade 5 — Chief Medical Officer' },
];

export const TariffRuleForm = ({
  isOpen,
  onClose,
  onSuccess,
  rule = null,
  departments = [],
  services = [],
}) => {
  const [formData, setFormData] = useState({
    category: 'CONSULTATION',
    serviceMasterId: '',
    testCode: '',
    departmentId: '',
    tariffGrade: '',
    visitType: '',
    appointmentType: '',
    amount: '',
    unit: 'PER_VISIT',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (rule) {
      setFormData({
        category: rule.category || 'CONSULTATION',
        serviceMasterId: rule.serviceMasterId?._id || rule.serviceMasterId || '',
        testCode: rule.testCode || '',
        departmentId: rule.scope?.departmentId?._id || rule.scope?.departmentId || '',
        tariffGrade: rule.scope?.tariffGrade || '',
        visitType: rule.scope?.visitType || '',
        appointmentType: rule.scope?.appointmentType || '',
        amount: rule.amount != null ? String(rule.amount) : '',
        unit: rule.unit || 'PER_VISIT',
        effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    } else {
      setFormData({
        category: 'CONSULTATION',
        serviceMasterId: '',
        testCode: '',
        departmentId: '',
        tariffGrade: '',
        visitType: '',
        appointmentType: '',
        amount: '',
        unit: 'PER_VISIT',
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
    }
    setError(null);
    setImpact(null);
  }, [rule, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredServices = services.filter((s) => s.category === formData.category);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        category: formData.category,
        amount: Number(formData.amount),
        unit: formData.unit || 'PER_VISIT',
        effectiveFrom: formData.effectiveFrom,
        scope: {
          departmentId: formData.departmentId || null,
          tariffGrade: formData.tariffGrade || null,
          visitType: formData.visitType || null,
          appointmentType: formData.appointmentType || null,
        },
      };

      if (formData.category === 'DIAGNOSTICS') {
        if (!formData.testCode.trim()) {
          throw new Error('Test Code is required for Diagnostic tariffs');
        }
        payload.testCode = formData.testCode.trim().toUpperCase();
      } else {
        if (formData.serviceMasterId) {
          payload.serviceMasterId = formData.serviceMasterId;
        }
      }

      if (rule && rule._id) {
        await tariffAPI.updateRule(rule._id, payload);
      } else {
        await tariffAPI.createRule(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[TariffRuleForm] Error saving rule:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save tariff rule');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
              <span className="material-symbols-rounded">price_change</span>
            </div>
            <div>
              <h3 className="appt-modal-title">{rule ? 'Edit Tariff Rule (Draft)' : 'Configure New Tariff Rule'}</h3>
              <p className="appt-modal-subtitle">Rules define authoritative pricing across scopes and departments</p>
            </div>
          </div>
          <button type="button" className="appt-modal-close" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>

        <div className="appt-modal-body">
          {error && (
            <div className="appt-dialog-error" style={{ marginBottom: '14px' }}>
              <Icon.Alert />
              <span>{error}</span>
            </div>
          )}

          <form id="tariff-rule-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Category & Service */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Md3Select
                id="tr-category"
                name="category"
                label="Service Category *"
                value={formData.category}
                onChange={handleChange}
                disabled={loading || (rule && rule.status !== 'DRAFT')}
                options={CATEGORIES}
              />

              {formData.category === 'DIAGNOSTICS' ? (
                <Md3TextField
                  id="tr-testCode"
                  name="testCode"
                  label="Lab Test Code * (e.g. CBC)"
                  placeholder="CBC, LFT, KFT..."
                  value={formData.testCode}
                  onChange={handleChange}
                  disabled={loading}
                />
              ) : (
                <Md3Select
                  id="tr-serviceMasterId"
                  name="serviceMasterId"
                  label="Service Master (Optional)"
                  value={formData.serviceMasterId}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: '', label: 'General / Unlinked' },
                    ...filteredServices.map((s) => ({ value: s._id, label: `${s.name} (${s.code})` })),
                  ]}
                />
              )}
            </div>

            {/* Scope Selection */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>tune</span>
                Pricing Scope & Applicability
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <Md3Select
                  id="tr-departmentId"
                  name="departmentId"
                  label="Department (Optional)"
                  value={formData.departmentId}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: '', label: 'All Departments (Hospital-wide)' },
                    ...departments.map((d) => ({ value: d._id, label: d.name })),
                  ]}
                />

                <Md3Select
                  id="tr-tariffGrade"
                  name="tariffGrade"
                  label="Staff Tariff Grade (Optional)"
                  value={formData.tariffGrade}
                  onChange={handleChange}
                  disabled={loading}
                  options={TARIFF_GRADES}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Md3Select
                  id="tr-visitType"
                  name="visitType"
                  label="Visit Type (Optional)"
                  value={formData.visitType}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: '', label: 'All Visit Types (OPD & Emergency)' },
                    { value: 'OPD', label: 'OPD (Outpatient)' },
                    { value: 'EMERGENCY', label: 'Emergency' },
                  ]}
                />

                <Md3Select
                  id="tr-appointmentType"
                  name="appointmentType"
                  label="Appointment Type (Optional)"
                  value={formData.appointmentType}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'WALK_IN', label: 'Walk-in' },
                    { value: 'FOLLOW_UP', label: 'Follow-up' },
                    { value: 'SCHEDULED', label: 'Scheduled' },
                  ]}
                />
              </div>
            </div>

            {/* Pricing & Effective Date */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>payments</span>
                Tariff Amount & Effective Period
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <Md3TextField
                  id="tr-amount"
                  name="amount"
                  label={`Rate (${CURRENCY_SYMBOL}) *`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="500"
                  value={formData.amount}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />

                <Md3Select
                  id="tr-unit"
                  name="unit"
                  label="Billing Unit *"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={loading}
                  options={[
                    { value: 'PER_VISIT', label: 'Per Visit' },
                    { value: 'PER_TEST', label: 'Per Test' },
                    { value: 'PER_PROCEDURE', label: 'Per Procedure' },
                    { value: 'PER_ITEM', label: 'Per Item' },
                    { value: 'PER_DAY', label: 'Per Day' },
                  ]}
                />

                <Md3TextField
                  id="tr-effectiveFrom"
                  name="effectiveFrom"
                  label="Effective From *"
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--md-sys-color-surface-container)',
              fontSize: '0.8125rem',
              color: 'var(--md-sys-color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>verified_user</span>
              <span>New rules are created in <strong>DRAFT</strong> status. You can validate and publish them with conflict checking from the Tariff table.</span>
            </div>
          </form>
        </div>

        <div className="appt-modal-actions">
          <Md3Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Md3Button>
          <Md3Button
            type="submit"
            form="tariff-rule-form"
            onClick={handleSubmit}
            disabled={loading || !formData.amount}
            loading={loading}
            loadingText="Saving Rule…"
          >
            {rule ? 'Update Draft Rule' : 'Create Draft Rule'}
          </Md3Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TariffRuleForm;
