import React from 'react';
import { createPortal } from 'react-dom';
import { Md3Button } from '../../../components/md3/Md3FormComponents';
import { Icon, Md3Divider } from '../../../components/md3/Md3Widgets';
import { CURRENCY_SYMBOL } from '../../../constants/currency';

export const TariffRuleDetail = ({ isOpen, onClose, rule, onPublish, onCancelRule, onEdit }) => {
  if (!isOpen || !rule) return null;

  const scope = rule.scope || {};
  const history = rule.publishHistory || [];

  const handleEditClick = () => {
    if (onEdit) {
      onClose();
      onEdit(rule);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontSize: '0.75rem', fontWeight: 700 }}>PUBLISHED</span>;
      case 'DRAFT':
        return <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', fontSize: '0.75rem', fontWeight: 700 }}>DRAFT</span>;
      case 'SUPERSEDED':
        return <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700 }}>SUPERSEDED</span>;
      case 'CANCELLED':
        return <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', fontSize: '0.75rem', fontWeight: 700 }}>CANCELLED</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return createPortal(
    <div className="appt-modal-backdrop" onClick={onClose}>
      <div className="appt-modal-container" style={{ maxWidth: '640px', width: '92vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <div className="appt-modal-title-group">
            <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)' }}>
              <span className="material-symbols-rounded">receipt_long</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {rule.ruleNumber && (
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                    background: 'var(--md-sys-color-surface-variant)',
                    color: 'var(--md-sys-color-primary)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--md-sys-color-outline-variant)'
                  }}>
                    {rule.ruleNumber}
                  </span>
                )}
                <h3 className="appt-modal-title">{rule.name || `${rule.category} Tariff Rule`}</h3>
                {getStatusBadge(rule.status)}
              </div>
              <p className="appt-modal-subtitle">
                {rule.description ? rule.description : `Category: ${rule.category} · Rule ID: ${rule._id}`}
              </p>
            </div>
          </div>
          <button type="button" className="appt-modal-close" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>

        <div className="appt-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Status Context Banner */}
          {rule.status === 'SUPERSEDED' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--md-sys-color-surface-variant)',
              color: 'var(--md-sys-color-on-surface-variant)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              fontSize: '0.8125rem',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--md-sys-color-outline)', marginTop: '2px' }}>
                history_toggle_off
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '2px' }}>
                  Archived Historical Version (Superseded)
                </strong>
                <span>
                  This rule version was retired because a newer active tariff rule was published with matching scope. 
                  The newer rule is currently active for all live patient registrations and admissions. 
                  This record is permanently preserved for financial audit and past invoice verification.
                </span>
              </div>
            </div>
          )}

          {rule.status === 'PUBLISHED' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(22, 101, 52, 0.08)',
              color: '#15803d',
              border: '1px solid rgba(22, 101, 52, 0.2)',
              fontSize: '0.8125rem',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#16a34a', marginTop: '2px' }}>
                verified
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '2px' }}>
                  Active in Live Operations
                </strong>
                <span>
                  This rule is currently active. Reception, OPD clinics, Emergency, and IPD admissions will automatically inherit this rate with zero manual entry.
                </span>
              </div>
            </div>
          )}

          {rule.status === 'DRAFT' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(30, 58, 138, 0.06)',
              color: '#1e40af',
              border: '1px solid rgba(30, 58, 138, 0.15)',
              fontSize: '0.8125rem',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#2563eb', marginTop: '2px' }}>
                edit_note
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '2px' }}>
                  Draft Tariff Rule
                </strong>
                <span>
                  This rule is a pending draft. Click <strong>Publish Rule</strong> below to activate it for live patient registrations and hospital billing.
                </span>
              </div>
            </div>
          )}

          {/* Rate Highlights */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.85 }}>Authoritative Tariff Rate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{CURRENCY_SYMBOL}{rule.amount}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', opacity: 0.85 }}>Billing Unit</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{rule.unit?.replace('_', ' ')}</div>
            </div>
          </div>

          {/* Package Inclusions & Deliverables */}
          {rule.inclusions && (
            <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface-container-low, #f7fbf8)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--md-sys-color-on-surface)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>inventory_2</span>
                Package Inclusions & Deliverables
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {rule.inclusions.split(/\s*\+\s*|\s*,\s*/).filter(Boolean).map((inc, i) => (
                  <span key={i} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'var(--md-sys-color-surface)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--md-sys-color-on-surface)',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#16a34a' }}>check_circle</span>
                    {inc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scope Parameters */}
          <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>tune</span>
              Scope & Applicability
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.8125rem' }}>
              <div><strong>Department:</strong> {scope.departmentId?.name || 'All Departments (Global)'}</div>
              <div><strong>Tariff Grade:</strong> {scope.tariffGrade || 'All Grades'}</div>
              <div><strong>Visit Type:</strong> {scope.visitType || 'All (OPD & Emergency)'}</div>
              <div><strong>Appointment:</strong> {scope.appointmentType || 'All Types'}</div>
              {rule.testCode && <div><strong>Lab Test Code:</strong> {rule.testCode}</div>}
              {rule.serviceMasterId && <div><strong>Service Master:</strong> {rule.serviceMasterId.name} ({rule.serviceMasterId.code})</div>}
            </div>
          </div>

          {/* Effective Period */}
          <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>event</span>
              Validity & Effective Window
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.8125rem' }}>
              <div><strong>Effective From:</strong> {new Date(rule.effectiveFrom).toLocaleDateString()}</div>
              <div><strong>Effective To:</strong> {rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString() : 'Open-Ended (Current)'}</div>
              <div><strong>Created By:</strong> {rule.createdBy?.fullName || 'Administrator'}</div>
              <div><strong>Created On:</strong> {new Date(rule.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {/* Audit / Publication History Timeline */}
          {history.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>history</span>
                Publication Audit History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'var(--md-sys-color-surface-container-low)',
                    fontSize: '0.75rem',
                  }}>
                    <div>
                      <strong style={{ color: 'var(--md-sys-color-primary)' }}>{h.action}</strong>
                      <span style={{ marginLeft: '8px', color: 'var(--md-sys-color-on-surface-variant)' }}>{h.reason || 'No note'}</span>
                    </div>
                    <div style={{ color: 'var(--md-sys-color-outline)' }}>
                      {new Date(h.performedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="appt-modal-actions" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
          <Md3Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Md3Button>
          {onEdit && rule.status !== 'SUPERSEDED' && (
            <Md3Button type="button" variant="tonal" onClick={handleEditClick}>
              <span className="material-symbols-rounded">edit</span>
              <span>Edit Rule</span>
            </Md3Button>
          )}
          {rule.status === 'DRAFT' && onPublish && (
            <Md3Button type="button" onClick={() => onPublish(rule)}>
              <span className="material-symbols-rounded">publish</span>
              <span>Publish Rule</span>
            </Md3Button>
          )}
          {rule.status === 'PUBLISHED' && onCancelRule && (
            <Md3Button type="button" variant="danger" onClick={() => onCancelRule(rule)}>
              <span className="material-symbols-rounded">block</span>
              <span>Cancel Rule</span>
            </Md3Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TariffRuleDetail;
