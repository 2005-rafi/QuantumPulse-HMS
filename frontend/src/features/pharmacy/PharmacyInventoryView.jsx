import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './PharmacyInventoryView.css';

export const PharmacyInventoryView = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedItemForBatches, setSelectedItemForBatches] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Form states
  const [newItem, setNewItem] = useState({
    brandName: '',
    genericName: '',
    category: 'TABLET',
    strength: '',
    dosageForm: 'Oral',
    manufacturer: '',
    hsnCode: '3004',
    gstRate: 12,
    unitPrice: '',
    reorderThreshold: 50,
  });

  const [newReceipt, setNewReceipt] = useState({
    itemId: '',
    batchNumber: '',
    purchaseCost: '',
    mrp: '',
    salePrice: '',
    manufactureDate: '',
    expiryDate: '',
    quantity: '',
    supplierName: '',
    invoiceNumber: '',
  });

  const [savingItem, setSavingItem] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);

  // Fetch summary telemetry
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/pharmacy/inventory/summary');
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (_) {}
  }, []);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (lowStockOnly) params.lowStock = true;

      const res = await api.get('/pharmacy/inventory/items', { params });
      if (res.data?.success) {
        setItems(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pharmacy inventory');
    } finally {
      setLoading(false);
    }
  }, [search, category, lowStockOnly]);

  useEffect(() => {
    fetchSummary();
    fetchItems();
  }, [fetchSummary, fetchItems]);

  // View batches for an item
  const handleViewBatches = async (item) => {
    setSelectedItemForBatches(item);
    setLoadingBatches(true);
    try {
      const res = await api.get(`/pharmacy/inventory/items/${item._id}/batches`);
      if (res.data?.success) {
        setBatches(res.data.data || []);
      }
    } catch (err) {
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Submit new catalogue item
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItem.brandName.trim() || !newItem.genericName.trim() || !newItem.unitPrice) return;
    setSavingItem(true);
    try {
      await api.post('/pharmacy/inventory/items', {
        ...newItem,
        unitPrice: Number(newItem.unitPrice),
        gstRate: Number(newItem.gstRate),
        reorderThreshold: Number(newItem.reorderThreshold),
      });
      setIsCatalogueOpen(false);
      setNewItem({
        brandName: '',
        genericName: '',
        category: 'TABLET',
        strength: '',
        dosageForm: 'Oral',
        manufacturer: '',
        hsnCode: '3004',
        gstRate: 12,
        unitPrice: '',
        reorderThreshold: 50,
      });
      fetchItems();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to catalogue medicine');
    } finally {
      setSavingItem(false);
    }
  };

  // Submit stock receipt (GRN)
  const handleReceiveStock = async (e) => {
    e.preventDefault();
    if (!newReceipt.itemId || !newReceipt.batchNumber || !newReceipt.expiryDate || !newReceipt.quantity) return;
    setSavingReceipt(true);
    try {
      await api.post('/pharmacy/inventory/receive', {
        ...newReceipt,
        purchaseCost: Number(newReceipt.purchaseCost) || 0,
        mrp: Number(newReceipt.mrp) || Number(newReceipt.salePrice),
        salePrice: Number(newReceipt.salePrice),
        quantity: Number(newReceipt.quantity),
      });
      setIsReceiptOpen(false);
      setNewReceipt({
        itemId: '',
        batchNumber: '',
        purchaseCost: '',
        mrp: '',
        salePrice: '',
        manufactureDate: '',
        expiryDate: '',
        quantity: '',
        supplierName: '',
        invoiceNumber: '',
      });
      fetchItems();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record stock receipt');
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <div className="pharmacy-inv-container">
      {/* ── 1. TELEMETRY STRIP ── */}
      {summary && (
        <section className="pharmacy-inv-telemetry">
          <div className="pharmacy-telemetry-pill">
            <span className="material-symbols-rounded telemetry-icon">medication</span>
            <div>
              <div className="telemetry-label">Formulary SKUs</div>
              <div className="telemetry-value">{summary.totalItems}</div>
            </div>
          </div>
          <div className="pharmacy-telemetry-pill">
            <span className="material-symbols-rounded telemetry-icon">inventory_2</span>
            <div>
              <div className="telemetry-label">Available Stock Units</div>
              <div className="telemetry-value">{summary.totalStockUnits.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="pharmacy-telemetry-pill">
            <span className="material-symbols-rounded telemetry-icon">payments</span>
            <div>
              <div className="telemetry-label">Inventory Valuation</div>
              <div className="telemetry-value">₹{summary.totalInventoryValue.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className={`pharmacy-telemetry-pill ${summary.lowStockAlerts > 0 ? 'pharmacy-telemetry-pill--warn' : ''}`}>
            <span className="material-symbols-rounded telemetry-icon">warning</span>
            <div>
              <div className="telemetry-label">Low Stock Alerts</div>
              <div className="telemetry-value">{summary.lowStockAlerts}</div>
            </div>
          </div>
          <div className={`pharmacy-telemetry-pill ${summary.expiringIn60Days > 0 ? 'pharmacy-telemetry-pill--alert' : ''}`}>
            <span className="material-symbols-rounded telemetry-icon">event_busy</span>
            <div>
              <div className="telemetry-label">Expiring in 60 Days</div>
              <div className="telemetry-value">{summary.expiringIn60Days}</div>
            </div>
          </div>
        </section>
      )}

      {/* ── 2. CONTROLS & ACTION BAR ── */}
      <section className="pharmacy-inv-actions">
        <div className="pharmacy-inv-search-wrap">
          <span className="material-symbols-rounded search-icon">search</span>
          <input
            type="text"
            className="pharmacy-inv-search-input"
            placeholder="Search by brand name, generic formula, or item code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="pharmacy-inv-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="TABLET">Tablets</option>
          <option value="CAPSULE">Capsules</option>
          <option value="SYRUP">Syrups</option>
          <option value="INJECTION">Injections</option>
          <option value="IV_FLUID">IV Fluids</option>
          <option value="OINTMENT">Ointments</option>
          <option value="DROPS">Drops</option>
          <option value="INHALER">Inhalers</option>
        </select>

        <label className="pharmacy-inv-checkbox-label">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low Stock Only
        </label>

        <div className="pharmacy-inv-btn-group">
          <button
            type="button"
            className="md3-btn md3-btn--tonal"
            onClick={() => setIsCatalogueOpen(true)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add_circle</span>
            Catalogue Medicine
          </button>
          <button
            type="button"
            className="md3-btn md3-btn--filled"
            onClick={() => setIsReceiptOpen(true)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>receipt_long</span>
            Receive Stock (GRN)
          </button>
        </div>
      </section>

      {/* ── 3. DATA TABLE ── */}
      <section className="pharmacy-inv-table-card">
        {loading ? (
          <div className="pharmacy-inv-loading">
            <span className="material-symbols-rounded spin">progress_activity</span>
            Loading formulary inventory...
          </div>
        ) : error ? (
          <div className="pharmacy-inv-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="pharmacy-inv-empty">
            <span className="material-symbols-rounded empty-icon">inventory</span>
            <p>No medicines found matching the current criteria.</p>
          </div>
        ) : (
          <table className="pharmacy-inv-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Item Code</th>
                <th style={{ width: '22%' }}>Brand & Trade Name</th>
                <th style={{ width: '22%' }}>Generic Composition</th>
                <th style={{ width: '10%' }}>Category</th>
                <th style={{ width: '8%', textAlign: 'center' }}>GST Rate</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Unit Price</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Stock On Hand</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Batches</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.currentStock <= item.reorderThreshold;
                return (
                  <tr key={item._id} className={isLow ? 'row-low-stock' : ''}>
                    <td className="cell-code">{item.itemCode}</td>
                    <td>
                      <div className="brand-name">{item.brandName}</div>
                      {item.manufacturer && <div className="mfg-name">{item.manufacturer}</div>}
                    </td>
                    <td>
                      <div className="generic-name">{item.genericName}</div>
                      {item.strength && <div className="strength-badge">{item.strength}</div>}
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="gst-pill">{item.gstRate}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`stock-badge ${isLow ? 'stock-badge--low' : 'stock-badge--ok'}`}>
                        {item.currentStock} units
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-view-batches"
                        onClick={() => handleViewBatches(item)}
                        title="Inspect FEFO batches"
                      >
                        <span className="material-symbols-rounded">layers</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── MODAL 1: BATCH INSPECTION MODAL ── */}
      {selectedItemForBatches && (
        <div className="modal-backdrop" onClick={() => setSelectedItemForBatches(null)}>
          <div className="modal-card modal-card--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedItemForBatches.brandName} — Active FEFO Batches</h3>
                <p className="modal-subtitle">
                  {selectedItemForBatches.genericName} • Total Stock: {selectedItemForBatches.currentStock} units
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedItemForBatches(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loadingBatches ? (
                <div>Loading batches...</div>
              ) : batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                  No active stock batches found. Please receive stock via GRN.
                </div>
              ) : (
                <table className="pharmacy-inv-table">
                  <thead>
                    <tr>
                      <th>Batch Number</th>
                      <th>Expiry Date (FEFO Order)</th>
                      <th style={{ textAlign: 'right' }}>MRP</th>
                      <th style={{ textAlign: 'right' }}>Sale Price</th>
                      <th style={{ textAlign: 'right' }}>Available Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b._id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                        <td style={{ color: new Date(b.expiryDate) < new Date() ? '#dc2626' : 'inherit' }}>
                          {new Date(b.expiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>₹{b.mrp.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{b.salePrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.availableQuantity}</td>
                        <td>
                          <span className={`status-tag status-tag--${b.status.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CATALOGUE MEDICINE MODAL ── */}
      {isCatalogueOpen && (
        <div className="modal-backdrop" onClick={() => setIsCatalogueOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Catalogue New Formulary Medicine</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCatalogueOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div className="modal-body form-grid">
                <div className="form-group">
                  <label>Brand / Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Augmentin 625 Duo"
                    value={newItem.brandName}
                    onChange={(e) => setNewItem({ ...newItem, brandName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Generic Chemical Composition *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin + Clavulanic Acid"
                    value={newItem.genericName}
                    onChange={(e) => setNewItem({ ...newItem, genericName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="SYRUP">Syrup</option>
                    <option value="INJECTION">Injection</option>
                    <option value="IV_FLUID">IV Fluid</option>
                    <option value="OINTMENT">Ointment</option>
                    <option value="DROPS">Drops</option>
                    <option value="INHALER">Inhaler</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 625mg or 500mg/5ml"
                    value={newItem.strength}
                    onChange={(e) => setNewItem({ ...newItem, strength: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. GSK Pharma"
                    value={newItem.manufacturer}
                    onChange={(e) => setNewItem({ ...newItem, manufacturer: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Standard Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 24.50"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>HSN Code</label>
                  <input
                    type="text"
                    value={newItem.hsnCode}
                    onChange={(e) => setNewItem({ ...newItem, hsnCode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <select
                    value={newItem.gstRate}
                    onChange={(e) => setNewItem({ ...newItem, gstRate: e.target.value })}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12% (Standard)</option>
                    <option value="18">18%</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Low Stock Reorder Alert Threshold</label>
                  <input
                    type="number"
                    value={newItem.reorderThreshold}
                    onChange={(e) => setNewItem({ ...newItem, reorderThreshold: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="md3-btn md3-btn--tonal" onClick={() => setIsCatalogueOpen(false)}>Cancel</button>
                <button type="submit" className="md3-btn md3-btn--filled" disabled={savingItem}>
                  {savingItem ? 'Saving...' : 'Save to Formulary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RECEIVE STOCK (GRN) MODAL ── */}
      {isReceiptOpen && (
        <div className="modal-backdrop" onClick={() => setIsReceiptOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Stock Receipt (GRN / Vendor Batch)</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsReceiptOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleReceiveStock}>
              <div className="modal-body form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Select Medicine from Formulary *</label>
                  <select
                    required
                    value={newReceipt.itemId}
                    onChange={(e) => {
                      const sel = items.find((it) => it._id === e.target.value);
                      setNewReceipt({
                        ...newReceipt,
                        itemId: e.target.value,
                        salePrice: sel ? sel.unitPrice : newReceipt.salePrice,
                        mrp: sel ? sel.unitPrice : newReceipt.mrp,
                      });
                    }}
                  >
                    <option value="">-- Choose Medicine --</option>
                    {items.map((it) => (
                      <option key={it._id} value={it._id}>
                        {it.itemCode} — {it.brandName} ({it.genericName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2409"
                    value={newReceipt.batchNumber}
                    onChange={(e) => setNewReceipt({ ...newReceipt, batchNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Received Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 100"
                    value={newReceipt.quantity}
                    onChange={(e) => setNewReceipt({ ...newReceipt, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Batch Expiry Date * (FEFO)</label>
                  <input
                    type="date"
                    required
                    value={newReceipt.expiryDate}
                    onChange={(e) => setNewReceipt({ ...newReceipt, expiryDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Manufacturing Date</label>
                  <input
                    type="date"
                    value={newReceipt.manufactureDate}
                    onChange={(e) => setNewReceipt({ ...newReceipt, manufactureDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Sale Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newReceipt.salePrice}
                    onChange={(e) => setNewReceipt({ ...newReceipt, salePrice: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Pharma Distributors"
                    value={newReceipt.supplierName}
                    onChange={(e) => setNewReceipt({ ...newReceipt, supplierName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vendor Invoice / GRN Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-9412"
                    value={newReceipt.invoiceNumber}
                    onChange={(e) => setNewReceipt({ ...newReceipt, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="md3-btn md3-btn--tonal" onClick={() => setIsReceiptOpen(false)}>Cancel</button>
                <button type="submit" className="md3-btn md3-btn--filled" disabled={savingReceipt}>
                  {savingReceipt ? 'Receiving...' : 'Confirm Receipt & Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyInventoryView;
