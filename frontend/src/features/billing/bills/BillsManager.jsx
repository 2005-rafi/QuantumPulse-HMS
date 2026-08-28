import React, { useState, useEffect } from 'react';
import { Md3Select, Md3TextField } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { billingAPI } from '../../../services/billingAPI';
import BillDetail from './BillDetail';
import PaymentRecordForm from './PaymentRecordForm';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import Md3Pagination from '../../../components/md3/Md3Pagination';
import usePagination from '../../../hooks/usePagination';
import './BillsManager.css';

export const BillsManager = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [selectedBill, setSelectedBill] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payBill, setPayBill] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  const [kpis, setKpis] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalAdjusted: 0,
  });

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (outstandingOnly) params.outstandingOnly = true;

      const res = await billingAPI.listBills(params);
      const items = res.data?.data?.items || res.data?.items || [];
      setBills(items);

      // Compute live KPI summary from current dataset
      const totalBilled = items.reduce((sum, b) => sum + (b.billedAmount || 0), 0);
      const totalCollected = items.reduce((sum, b) => sum + (b.collectedAmount || 0), 0);
      const totalOutstanding = items.reduce((sum, b) => sum + (b.outstandingAmount || 0), 0);
      const totalAdjusted = items.reduce((sum, b) => sum + (b.adjustedAmount || 0), 0);
      setKpis({ totalBilled, totalCollected, totalOutstanding, totalAdjusted });
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter, outstandingOnly]);

  const filteredBills = bills.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${b.patientId?.firstName || ''} ${b.patientId?.lastName || ''}`.toLowerCase();
    const mrn = (b.patientId?.mrn || '').toLowerCase();
    const billNum = (b.billNumber || '').toLowerCase();
    return name.includes(q) || mrn.includes(q) || billNum.includes(q);
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedBills,
    showTopPagination,
  } = usePagination(filteredBills, 50, [search, statusFilter, outstandingOnly]);

  const handleOpenDetail = (bill) => {
    setSelectedBill(bill);
    setDetailOpen(true);
  };

  const handleOpenPayment = (bill, e) => {
    if (e) e.stopPropagation();
    setPayBill(bill);
    setPayOpen(true);
  };

  return (
    <div className="bills-manager">
      {/* 4-KPI Metric Strip */}
      <div className="bills-kpi-grid">
        <div className="bills-kpi-card">
          <div className="bills-kpi-icon" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
            <span className="material-symbols-rounded">receipt_long</span>
          </div>
          <div>
            <div className="bills-kpi-label">Total Billed</div>
            <div className="bills-kpi-value">{CURRENCY_SYMBOL}{kpis.totalBilled}</div>
          </div>
        </div>

        <div className="bills-kpi-card">
          <div className="bills-kpi-icon" style={{ background: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32' }}>
            <span className="material-symbols-rounded">payments</span>
          </div>
          <div>
            <div className="bills-kpi-label">Collected Amount</div>
            <div className="bills-kpi-value" style={{ color: '#2e7d32' }}>{CURRENCY_SYMBOL}{kpis.totalCollected}</div>
          </div>
        </div>

        <div className="bills-kpi-card">
          <div className="bills-kpi-icon" style={{ background: 'rgba(211, 47, 47, 0.15)', color: '#d32f2f' }}>
            <span className="material-symbols-rounded">pending_actions</span>
          </div>
          <div>
            <div className="bills-kpi-label">Outstanding Dues</div>
            <div className="bills-kpi-value" style={{ color: '#d32f2f' }}>{CURRENCY_SYMBOL}{kpis.totalOutstanding}</div>
          </div>
        </div>

        <div className="bills-kpi-card">
          <div className="bills-kpi-icon" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
            <span className="material-symbols-rounded">tune</span>
          </div>
          <div>
            <div className="bills-kpi-label">Adjustments</div>
            <div className="bills-kpi-value">{CURRENCY_SYMBOL}{kpis.totalAdjusted}</div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bills-filter-row">
        <div style={{ flex: 1, maxWidth: '360px' }}>
          <Md3TextField
            id="bill-search"
            name="search"
            placeholder="Search patient, MRN, or Bill #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ width: '200px' }}>
          <Md3Select
            id="bill-status"
            name="statusFilter"
            label="Bill Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'OPEN', label: 'Open (In Progress)' },
              { value: 'FINALIZED', label: 'Finalized (Locked)' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>

        <button
          type="button"
          className={`bills-toggle-chip ${outstandingOnly ? 'bills-toggle-chip--active' : ''}`}
          onClick={() => setOutstandingOnly(!outstandingOnly)}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
            {outstandingOnly ? 'check_box' : 'check_box_outline_blank'}
          </span>
          <span>Dues Only</span>
        </button>

        <button
          type="button"
          className="tariff-refresh-btn"
          onClick={fetchBills}
          aria-label="Refresh bills"
          title="Refresh Bills"
          style={{ marginLeft: 'auto' }}
        >
          <Icon.Refresh />
        </button>
      </div>

      {/* Top Pagination (rendered when total records exceed 20) */}
      {showTopPagination && (
        <Md3Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="bills"
          position="top"
        />
      )}

      {/* Bills Table */}
      <div className="bills-table-container md3-paginated-content-fade" key={page}>
        <table className="bills-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Patient Details</th>
              <th>Service Date</th>
              <th>Status</th>
              <th>Billed</th>
              <th>Collected</th>
              <th>Outstanding</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Loading patient bills & ledger…
                </td>
              </tr>
            ) : paginatedBills.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No bills found matching current filters.
                </td>
              </tr>
            ) : (
              paginatedBills.map((bill) => (
                <tr key={bill._id} className="bills-row" onClick={() => handleOpenDetail(bill)}>
                  <td>
                    <strong>{bill.billNumber}</strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {bill.patientId?.firstName} {bill.patientId?.lastName}
                    </div>
                    {bill.patientId?.mrn && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-outline)' }}>
                        MRN: {bill.patientId.mrn}
                      </span>
                    )}
                  </td>
                  <td>{new Date(bill.serviceDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`bills-status-chip bills-status-chip--${bill.status.toLowerCase()}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{CURRENCY_SYMBOL}{bill.billedAmount || 0}</td>
                  <td style={{ fontWeight: 700, color: '#2e7d32' }}>{CURRENCY_SYMBOL}{bill.collectedAmount || 0}</td>
                  <td style={{ fontWeight: 800, color: bill.outstandingAmount > 0 ? '#d32f2f' : '#2e7d32' }}>
                    {CURRENCY_SYMBOL}{bill.outstandingAmount || 0}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {bill.outstandingAmount > 0 && bill.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="bills-action-btn bills-action-btn--pay"
                          onClick={(e) => handleOpenPayment(bill, e)}
                          title="Record Payment"
                        >
                          <span className="material-symbols-rounded">add_card</span>
                          <span>Pay</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="bills-action-btn"
                        onClick={() => handleOpenDetail(bill)}
                        title="View Detailed Bill Breakdown"
                      >
                        <span className="material-symbols-rounded">visibility</span>
                      </button>
                    </div>
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
          itemLabel="bills"
          position="bottom"
        />
      )}

      {/* Bill Detail Side Panel */}
      <BillDetail
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        bill={selectedBill}
        onRefresh={() => {
          fetchBills();
          if (selectedBill) {
            billingAPI.getBillById(selectedBill._id).then((res) => {
              setSelectedBill(res.data?.data || res.data);
            });
          }
        }}
      />

      {/* Quick Payment Modal */}
      <PaymentRecordForm
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        bill={payBill}
        onSuccess={fetchBills}
      />
    </div>
  );
};

export default BillsManager;
