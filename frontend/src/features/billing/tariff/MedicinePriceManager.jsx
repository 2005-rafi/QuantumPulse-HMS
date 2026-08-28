import React, { useState, useEffect } from 'react';
import { Md3Button, Md3TextField } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import Md3ConfirmDialog from '../../../components/md3/Md3ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { medicinePriceAPI } from '../../../services/medicinePriceAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import Md3Pagination from '../../../components/md3/Md3Pagination';
import usePagination from '../../../hooks/usePagination';

export const MedicinePriceManager = () => {
  const { showSuccess, showError } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Deactivate',
    cancelLabel: 'Cancel',
    icon: 'delete_forever',
    onConfirm: null,
  });

  const [medForm, setMedForm] = useState({
    medicineName: '',
    genericName: '',
    manufacturer: '',
    unitPrice: '',
    unit: 'tablet',
    dispensingFee: '0',
  });

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await medicinePriceAPI.list({ search: search || undefined });
      setMedicines(res.data?.data?.items || res.data?.items || []);
    } catch (err) {
      console.error('Failed to load medicine prices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchMedicines();
    }, 250);
    return () => clearTimeout(delay);
  }, [search]);

  const handleSaveMed = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await medicinePriceAPI.create({
        medicineName: medForm.medicineName.trim(),
        genericName: medForm.genericName.trim(),
        manufacturer: medForm.manufacturer.trim(),
        unitPrice: Number(medForm.unitPrice),
        unit: medForm.unit,
        dispensingFee: Number(medForm.dispensingFee) || 0,
      });
      showSuccess('Medicine Saved', `Tariff pricing for "${medForm.medicineName}" added successfully.`);
      setShowAddModal(false);
      setMedForm({
        medicineName: '',
        genericName: '',
        manufacturer: '',
        unitPrice: '',
        unit: 'tablet',
        dispensingFee: '0',
      });
      fetchMedicines();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save medicine price');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = (id, medicineName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Medicine Tariff?',
      message: `Are you sure you want to deactivate tariff pricing for "${medicineName || 'this medicine'}"?`,
      variant: 'danger',
      confirmLabel: 'Deactivate Price',
      cancelLabel: 'Cancel',
      icon: 'delete_forever',
      onConfirm: async () => {
        try {
          await medicinePriceAPI.deactivate(id);
          showSuccess('Medicine Tariff Deactivated', 'The medicine tariff pricing has been deactivated.');
          fetchMedicines();
        } catch (err) {
          showError('Deactivation Failed', err.response?.data?.message || err.message || 'Failed to deactivate medicine');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedMeds,
    showTopPagination,
  } = usePagination(medicines, 50, [search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '540px' }}>
          <div style={{ flex: 1 }}>
            <Md3TextField
              id="med-search"
              name="search"
              placeholder="Search medicine by brand or generic name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Md3Button type="button" onClick={() => setShowAddModal(true)}>
          <Icon.Plus />
          <span>Add Medicine Tariff</span>
        </Md3Button>
      </div>

      {/* Top Pagination (rendered when total records exceed 20) */}
      {showTopPagination && (
        <Md3Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="medicines"
          position="top"
        />
      )}

      {/* Table */}
      <div className="md3-paginated-content-fade" key={page} style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--md-sys-color-outline-variant)', background: 'var(--md-sys-color-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--md-sys-color-surface-container-low)', textAlign: 'left', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Medicine Brand Name</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Generic Name</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Unit</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Rate ({CURRENCY_SYMBOL})</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Dispensing Fee</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Loading medicine pricing catalog…
                </td>
              </tr>
            ) : paginatedMeds.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No medicine prices configured. Click "Add Medicine Tariff" to create one.
                </td>
              </tr>
            ) : (
              paginatedMeds.map((med) => (
                <tr key={med._id} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{med.medicineName}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--md-sys-color-on-surface-variant)' }}>{med.genericName || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{med.unit}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                    {CURRENCY_SYMBOL}{med.unitPrice}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {med.dispensingFee ? `${CURRENCY_SYMBOL}${med.dispensingFee}` : '₹0'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: med.status === 'ACTIVE' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-variant)',
                      color: med.status === 'ACTIVE' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                    }}>
                      {med.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {med.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(med._id, med.medicineName)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--md-sys-color-error)', cursor: 'pointer', padding: '4px' }}
                        title="Deactivate Price"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>do_not_disturb_on</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      {totalItems > 0 && (
        <Md3Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="medicines"
          position="bottom"
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="appt-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="appt-modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="appt-modal-header">
              <div className="appt-modal-title-group">
                <div className="appt-modal-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  <span className="material-symbols-rounded">medication</span>
                </div>
                <div>
                  <h3 className="appt-modal-title">Add Medicine Price</h3>
                  <p className="appt-modal-subtitle">Configure pricing in Pharmacy catalog</p>
                </div>
              </div>
              <button type="button" className="appt-modal-close" onClick={() => setShowAddModal(false)}>
                <Icon.X />
              </button>
            </div>

            <div className="appt-modal-body">
              {formError && (
                <div className="appt-dialog-error" style={{ marginBottom: '14px' }}>
                  <Icon.Alert />
                  <span>{formError}</span>
                </div>
              )}

              <form id="med-price-form" onSubmit={handleSaveMed} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Md3TextField
                  id="mp-name"
                  name="medicineName"
                  label="Brand Name *"
                  placeholder="e.g. Paracetamol 650mg"
                  value={medForm.medicineName}
                  onChange={(e) => setMedForm({ ...medForm, medicineName: e.target.value })}
                  disabled={formLoading}
                  required
                />

                <Md3TextField
                  id="mp-generic"
                  name="genericName"
                  label="Generic Molecule / Formulation"
                  placeholder="e.g. Paracetamol"
                  value={medForm.genericName}
                  onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                  disabled={formLoading}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Md3TextField
                    id="mp-price"
                    name="unitPrice"
                    label={`Unit Price (${CURRENCY_SYMBOL}) *`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3.50"
                    value={medForm.unitPrice}
                    onChange={(e) => setMedForm({ ...medForm, unitPrice: e.target.value })}
                    disabled={formLoading}
                    required
                  />

                  <Md3TextField
                    id="mp-unit"
                    name="unit"
                    label="Unit (tablet, vial, ml)"
                    value={medForm.unit}
                    onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })}
                    disabled={formLoading}
                  />
                </div>

                <Md3TextField
                  id="mp-fee"
                  name="dispensingFee"
                  label={`Dispensing / Pharmacy Surcharge (${CURRENCY_SYMBOL})`}
                  type="number"
                  step="1"
                  min="0"
                  value={medForm.dispensingFee}
                  onChange={(e) => setMedForm({ ...medForm, dispensingFee: e.target.value })}
                  disabled={formLoading}
                />
              </form>
            </div>

            <div className="appt-modal-actions">
              <Md3Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} disabled={formLoading}>
                Cancel
              </Md3Button>
              <Md3Button type="submit" form="med-price-form" disabled={formLoading || !medForm.medicineName || !medForm.unitPrice} loading={formLoading}>
                Save Medicine Price
              </Md3Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Material Confirm Dialog */}
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

export default MedicinePriceManager;
