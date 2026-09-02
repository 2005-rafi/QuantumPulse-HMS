import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Md3Button, Md3TextField, Md3Select } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { tariffAPI } from '../../../services/tariffAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

const CATEGORIES = [
  { value: 'BED_CHARGES', label: 'Bed & Ward Tariff' },
  { value: 'REGISTRATION', label: 'Registration Fees' },
  { value: 'CONSULTATION', label: 'Doctor Consultation' },
  { value: 'DIAGNOSTICS', label: 'Laboratory Diagnostics' },
  { value: 'PROCEDURE', label: 'Clinical Procedures' },
  { value: 'PACKAGE', label: 'Health Packages' },
];

const COMFORT_TIERS = [
  { value: '', label: 'All Comfort Tiers (Global)' },
  { value: 'STANDARD', label: 'Standard Clinical Cot' },
  { value: 'COMFORT', label: 'Comfort (Semi-Motorized)' },
  { value: 'DELUXE', label: 'Deluxe (Motorized Suite)' },
  { value: 'SUPER_DELUXE_SUITE', label: 'Super Deluxe VIP Suite' },
  { value: 'EXECUTIVE_PRESIDENTIAL', label: 'Executive Presidential' },
];

const SHARING_TYPES = [
  { value: '', label: 'All Sharing Types' },
  { value: 'GENERAL_WARD', label: 'General Ward (Multi-Bed 6-12)' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private (Twin Sharing)' },
  { value: 'PRIVATE_SINGLE', label: 'Private Single Occupancy' },
  { value: 'VIP_ISOLATION', label: 'VIP Isolation Suite' },
];

const WARD_CLASSES = [
  { value: '', label: 'All Ward Classes' },
  { value: 'GENERAL_WARD', label: 'General Ward' },
  { value: 'SEMI_PRIVATE', label: 'Semi-Private' },
  { value: 'PRIVATE', label: 'Private Room' },
  { value: 'DELUXE_PRIVATE', label: 'Deluxe Private Suite' },
  { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
  { value: 'CCU', label: 'Coronary Care Unit (CCU)' },
  { value: 'HDU', label: 'High Dependency Unit (HDU)' },
  { value: 'NICU', label: 'Neonatal ICU (NICU)' },
  { value: 'PICU', label: 'Pediatric ICU (PICU)' },
  { value: 'ISOLATION', label: 'Negative Pressure Isolation' },
  { value: 'POST_OP_RECOVERY', label: 'Post-Op Recovery' },
];

const TARIFF_GRADES = [
  { value: '', label: 'All Grades (Global)' },
  { value: 'GRADE_1', label: 'Grade 1 — Intern / Junior' },
  { value: 'GRADE_2', label: 'Grade 2 — Resident / Associate' },
  { value: 'GRADE_3', label: 'Grade 3 — Consultant / Senior Consultant' },
  { value: 'GRADE_4', label: 'Grade 4 — Head of Dept / Superintendent' },
  { value: 'GRADE_5', label: 'Grade 5 — Chief Medical Officer' },
];

const getCategoryConfig = (cat) => {
  switch (cat) {
    case 'BED_CHARGES':
      return {
        title: 'Bed & Ward Tariff',
        subtitle: 'Define day & hourly rates, comfort tier, sharing, and minimum advance deposits',
        icon: 'hotel',
      };
    case 'CONSULTATION':
      return {
        title: 'Doctor Consultation Tariff',
        subtitle: 'Define consultation fees by department, staff grade, and appointment type',
        icon: 'stethoscope',
      };
    case 'REGISTRATION':
      return {
        title: 'Registration Fee Tariff',
        subtitle: 'Define patient OPD and emergency check-in registration charges',
        icon: 'how_to_reg',
      };
    case 'DIAGNOSTICS':
      return {
        title: 'Laboratory Diagnostic Tariff',
        subtitle: 'Define test pricing and billing codes for pathology and radiology',
        icon: 'biotech',
      };
    case 'PROCEDURE':
      return {
        title: 'Clinical Procedure Tariff',
        subtitle: 'Define surgical, nursing, and minor procedure fees',
        icon: 'healing',
      };
    case 'PACKAGE':
      return {
        title: 'Health Package Tariff',
        subtitle: 'Define bundled wellness and surgery package rates',
        icon: 'inventory_2',
      };
    default:
      return {
        title: 'Tariff Rule',
        subtitle: 'Rules define authoritative pricing across clinical scopes and departments',
        icon: 'price_change',
      };
  }
};

export const TariffRuleForm = ({
  isOpen,
  onClose,
  onSuccess,
  rule = null,
  initialCategory = 'CONSULTATION',
  departments = [],
  services = [],
  floors = [],
}) => {
  const [formData, setFormData] = useState({
    category: 'CONSULTATION',
    serviceMasterId: '',
    testCode: '',
    wardClass: '',
    comfortTier: '',
    sharingType: '',
    floorId: '',
    departmentId: '',
    tariffGrade: '',
    visitType: '',
    appointmentType: '',
    amount: '',
    hourlyRate: '',
    minAdvanceDeposit: '',
    gracePeriodMinutes: '60',
    unit: 'PER_VISIT',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (rule) {
      setFormData({
        category: rule.category || initialCategory || 'CONSULTATION',
        serviceMasterId: rule.serviceMasterId?._id || rule.serviceMasterId || '',
        testCode: rule.testCode || '',
        wardClass: rule.scope?.wardClass || '',
        comfortTier: rule.scope?.comfortTier || '',
        sharingType: rule.scope?.sharingType || '',
        floorId: rule.scope?.floorId?._id || rule.scope?.floorId || '',
        departmentId: rule.scope?.departmentId?._id || rule.scope?.departmentId || '',
        tariffGrade: rule.scope?.tariffGrade || '',
        visitType: rule.scope?.visitType || '',
        appointmentType: rule.scope?.appointmentType || '',
        amount: rule.amount != null ? String(rule.amount) : '',
        hourlyRate: rule.scope?.hourlyRate != null ? String(rule.scope.hourlyRate) : '',
        minAdvanceDeposit: rule.scope?.minAdvanceDeposit != null ? String(rule.scope.minAdvanceDeposit) : '',
        gracePeriodMinutes: rule.scope?.gracePeriodMinutes != null ? String(rule.scope.gracePeriodMinutes) : '60',
        unit: rule.unit || (rule.category === 'BED_CHARGES' ? 'PER_DAY' : rule.category === 'DIAGNOSTICS' ? 'PER_TEST' : 'PER_VISIT'),
        effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    } else {
      const cat = initialCategory && initialCategory !== 'ALL' && initialCategory !== 'PHARMACY'
        ? initialCategory
        : 'CONSULTATION';

      setFormData({
        category: cat,
        serviceMasterId: '',
        testCode: '',
        wardClass: '',
        comfortTier: '',
        sharingType: '',
        floorId: '',
        departmentId: '',
        tariffGrade: '',
        visitType: '',
        appointmentType: '',
        amount: '',
        hourlyRate: '',
        minAdvanceDeposit: '',
        gracePeriodMinutes: '60',
        unit: cat === 'BED_CHARGES' ? 'PER_DAY' : cat === 'DIAGNOSTICS' ? 'PER_TEST' : 'PER_VISIT',
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
    }
    setError(null);
    setImpact(null);
  }, [rule, isOpen, initialCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'category') {
        if (value === 'BED_CHARGES') {
          next.unit = 'PER_DAY';
        } else if (value === 'DIAGNOSTICS') {
          next.unit = 'PER_TEST';
        } else {
          next.unit = 'PER_VISIT';
        }
      }
      if (name === 'amount' && next.category === 'BED_CHARGES' && (!next.hourlyRate || Number(next.hourlyRate) === 0)) {
        // Auto-calculate suggested hourly rate (daily / 24)
        const amt = Number(value);
        if (amt > 0) next.hourlyRate = String(Math.round(amt / 24));
      }
      return next;
    });
  };

  const filteredServices = services.filter((s) => s.category === formData.category);

  const handleSubmit = async (e, shouldPublish = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        category: formData.category,
        amount: Number(formData.amount),
        unit: formData.unit || (formData.category === 'BED_CHARGES' ? 'PER_DAY' : 'PER_VISIT'),
        effectiveFrom: formData.effectiveFrom,
        scope: {
          departmentId: formData.departmentId || null,
          tariffGrade: formData.tariffGrade || null,
          visitType: formData.visitType || null,
          appointmentType: formData.appointmentType || null,
          wardClass: formData.wardClass || null,
          comfortTier: formData.comfortTier || null,
          sharingType: formData.sharingType || null,
          floorId: formData.floorId || null,
          hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
          minAdvanceDeposit: formData.minAdvanceDeposit ? Number(formData.minAdvanceDeposit) : 0,
          gracePeriodMinutes: formData.gracePeriodMinutes ? Number(formData.gracePeriodMinutes) : 60,
        },
      };

      if (formData.category === 'DIAGNOSTICS') {
        if (!formData.testCode.trim()) {
          throw new Error('Test Code is required for Diagnostic tariffs');
        }
        payload.testCode = formData.testCode.trim().toUpperCase();
      } else if (formData.category !== 'BED_CHARGES') {
        if (formData.serviceMasterId) {
          payload.serviceMasterId = formData.serviceMasterId;
        }
      }

      let savedRuleId = rule?._id;
      if (rule && rule._id) {
        const res = await tariffAPI.updateRule(rule._id, payload);
        savedRuleId = res.data?.data?._id || res.data?._id || rule._id;
      } else {
        const res = await tariffAPI.createRule(payload);
        savedRuleId = res.data?.data?._id || res.data?._id;
      }

      if (shouldPublish && savedRuleId) {
        await tariffAPI.publishRule(savedRuleId);
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

  const isBedCategory = formData.category === 'BED_CHARGES';
  const categoryInfo = getCategoryConfig(formData.category);

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--md-sys-color-surface, #ffffff)' }}>
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
              <span className="material-symbols-rounded">{categoryInfo.icon}</span>
            </div>
            <div>
              <h3 className="appt-modal-title">
                {rule ? `Edit ${categoryInfo.title}` : `Configure ${categoryInfo.title}`}
              </h3>
              <p className="appt-modal-subtitle">
                {categoryInfo.subtitle}
              </p>
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
            {/* Category */}
            <div style={{ display: 'grid', gridTemplateColumns: isBedCategory ? '1fr' : '1fr 1fr', gap: '14px' }}>
              <Md3Select
                id="tr-category"
                name="category"
                label="Tariff Category *"
                value={formData.category}
                onChange={handleChange}
                disabled={loading || (rule && rule.status !== 'DRAFT')}
                options={CATEGORIES}
              />

              {!isBedCategory && (
                formData.category === 'DIAGNOSTICS' ? (
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
                )
              )}
            </div>

            {/* Bed & Ward Hierarchy Scope */}
            {isBedCategory ? (
              <div style={{ background: 'var(--md-sys-color-surface-container-low, #f7fbf8)', padding: '14px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline-variant, #c0c9c4)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>hotel</span>
                  Bed Comfort, Ward Class & Spatial Scope
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <Md3Select
                    id="tr-wardClass"
                    name="wardClass"
                    label="Ward Classification *"
                    value={formData.wardClass}
                    onChange={handleChange}
                    disabled={loading}
                    options={WARD_CLASSES}
                  />

                  <Md3Select
                    id="tr-comfortTier"
                    name="comfortTier"
                    label="Comfort Hierarchy Tier"
                    value={formData.comfortTier}
                    onChange={handleChange}
                    disabled={loading}
                    options={COMFORT_TIERS}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Md3Select
                    id="tr-sharingType"
                    name="sharingType"
                    label="Sharing Configuration"
                    value={formData.sharingType}
                    onChange={handleChange}
                    disabled={loading}
                    options={SHARING_TYPES}
                  />

                  <Md3Select
                    id="tr-floorId"
                    name="floorId"
                    label="Floor / Wing (Optional)"
                    value={formData.floorId}
                    onChange={handleChange}
                    disabled={loading}
                    options={[
                      { value: '', label: 'All Floors (Hospital-wide)' },
                      ...floors.map((f) => ({ value: f._id, label: `${f.floorName || `Floor ${f.floorNumber}`}` })),
                    ]}
                  />
                </div>
              </div>
            ) : (
              /* General Scope Selection */
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
            )}

            {/* Pricing & Advance Deposit Controls */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>payments</span>
                {isBedCategory ? 'Bed Rates, Advance Deposit & Effective Period' : 'Tariff Amount & Effective Period'}
              </h4>

              {isBedCategory ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <Md3TextField
                    id="tr-amount"
                    name="amount"
                    label={`Daily Rate (${CURRENCY_SYMBOL}/day) *`}
                    type="number"
                    min="0"
                    placeholder="2500"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />

                  <Md3TextField
                    id="tr-hourlyRate"
                    name="hourlyRate"
                    label={`Hourly Rate (${CURRENCY_SYMBOL}/hr)`}
                    type="number"
                    min="0"
                    placeholder="110"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    disabled={loading}
                  />

                  <Md3TextField
                    id="tr-minAdvanceDeposit"
                    name="minAdvanceDeposit"
                    label={`Min Advance Deposit (${CURRENCY_SYMBOL})`}
                    type="number"
                    min="0"
                    placeholder="10000"
                    value={formData.minAdvanceDeposit}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
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
              )}

              {isBedCategory && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Md3TextField
                    id="tr-gracePeriodMinutes"
                    name="gracePeriodMinutes"
                    label="Hourly Grace Period (Minutes)"
                    type="number"
                    min="0"
                    value={formData.gracePeriodMinutes}
                    onChange={handleChange}
                    disabled={loading}
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
              )}
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
              <span>Publishing activates the rule immediately across Reception, Nursing, and IPD Billing.</span>
            </div>
          </form>
        </div>

        <div className="appt-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Md3Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Md3Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Md3Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading || !formData.amount}
              loading={loading}
              loadingText="Saving Draft…"
            >
              {rule ? 'Save Draft Changes' : 'Save as Draft'}
            </Md3Button>
            <Md3Button
              type="button"
              variant="primary"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !formData.amount}
              loading={loading}
              loadingText="Publishing…"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '6px' }}>publish</span>
              {rule ? 'Update & Publish' : 'Save & Publish Now'}
            </Md3Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TariffRuleForm;
