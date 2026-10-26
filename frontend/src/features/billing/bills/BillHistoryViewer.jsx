import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Md3Select, Md3TextField, Md3Button } from '../../../components/md3/Md3FormComponents';
import { Icon } from '../../../components/md3/Md3Widgets';
import { billingAPI } from '../../../services/billingAPI';
import { adminAPI } from '../../../services/adminAPI';
import { BillDetail } from './BillDetail';
import { UnifiedBillPrintModal } from '../print';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import Md3Pagination from '../../../components/md3/Md3Pagination';
import usePagination from '../../../hooks/usePagination';
import './BillHistoryViewer.css';

/**
 * BillHistoryViewer — Enterprise Reusable Historical Bill Viewer & Direct Reprinter
 *
 * Applicable for:
 *   - Pharmacy (areaFilter="pharmacy"): View & reprint dispensed medicine invoices
 *   - Reception (areaFilter="reception"): View & reprint patient registration fee slips
 *   - Billing Station (areaFilter="billing"): View & reprint surgical, ward, ICU, and procedural bills
 *   - Universal / Admin (areaFilter="all" / null): All department invoices
 *
 * Immutability:
 *   - Mounts BillDetail with `readOnly={true}` — zero mutation or payment altering possible.
 *   - Direct Reprint rendered via React Portal + window.print().
 */
export const BillHistoryViewer = ({
  areaFilter = 'all',
  title = 'Bill & Receipt History',
  subtitle = 'Search and reprint historical invoices independent of visit completion',
}) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected bill for read-only inspection
  const [activeBill, setActiveBill] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Print modal state
  const [printBill, setPrintBill] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [templateConfig, setTemplateConfig] = useState(null);

  // Fetch billing template branding settings once
  useEffect(() => {
    adminAPI
      .getSetting('billing_template')
      .then((res) => {
        if (res.data?.data?.value) {
          setTemplateConfig(res.data.data.value);
        }
      })
      .catch(() => {
        // Fallback handled by BillingTemplate
      });
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (search.trim()) params.search = search.trim();

      // Resolve area filter parameters
      if (areaFilter === 'pharmacy') {
        params.categoryFilter = 'PHARMACY';
        params.issuingArea = 'PHARMACY';
      } else if (areaFilter === 'reception') {
        params.categoryFilter = 'REGISTRATION';
        params.issuingArea = 'RECEPTION';
      } else if (areaFilter === 'billing') {
        params.categoryFilter = 'PROCEDURE,BED_CHARGES,CONSULTATION';
      }

      const res = await billingAPI.listBills(params);
      const items = res.data?.data?.items || res.data?.items || [];
      setBills(items);
    } catch (err) {
      console.error('Failed to load bill history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [areaFilter, statusFilter, dateFrom, dateTo]);

  // Handle live query debounce or explicit submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalBilled = bills.reduce((sum, b) => sum + (b.billedAmount || 0), 0);
    const totalCollected = bills.reduce((sum, b) => sum + (b.collectedAmount || 0), 0);
    return {
      count: bills.length,
      billed: totalBilled,
      collected: totalCollected,
    };
  }, [bills]);

  // Client-side pagination
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedBills,
    showTopPagination,
  } = usePagination(bills, 20, [bills]);

  const handleOpenDetail = (bill) => {
    setActiveBill(bill);
    setIsDetailOpen(true);
  };

  const handleDirectPrint = (bill) => {
    setPrintBill(bill);
    setAutoPrint(true);
    setIsPrintModalOpen(true);
  };

  const getAreaBadgeClass = (area, lineItems = []) => {
    const norm = (area || '').toUpperCase();
    if (norm === 'PHARMACY' || lineItems.some((l) => l.category === 'PHARMACY')) {
      return 'bh-area-badge--pharmacy';
    }
    if (norm === 'RECEPTION' || lineItems.some((l) => l.category === 'REGISTRATION')) {
      return 'bh-area-badge--reception';
    }
    return 'bh-area-badge--billing';
  };

  const getAreaLabel = (area, lineItems = []) => {
    const norm = (area || '').toUpperCase();
    if (norm === 'PHARMACY' || lineItems.some((l) => l.category === 'PHARMACY')) {
      return 'Pharmacy';
    }
    if (norm === 'RECEPTION' || lineItems.some((l) => l.category === 'REGISTRATION')) {
      return 'Reception';
    }
    return 'Billing Station';
  };

  return (
    <div className="bill-history-viewer">
      {/* Header bar */}
      <div className="bh-header-bar">
        <div className="bh-header-title-group">
          <div className="bh-header-icon">
            <span className="material-symbols-rounded">history_edu</span>
          </div>
          <div>
            <h3 className="bh-header-title">{title}</h3>
            <p className="bh-header-subtitle">{subtitle}</p>
          </div>
        </div>

        <Md3Button type="button" variant="secondary" onClick={fetchBills} disabled={loading}>
          <span className={`material-symbols-rounded ${loading ? 'spin-animation' : ''}`}>refresh</span>
          <span>Refresh</span>
        </Md3Button>
      </div>

      {/* KPI summary cards */}
      <div className="bh-kpi-summary-row">
        <div className="bh-kpi-pill">
          <div className="bh-kpi-icon bh-kpi-icon--count">
            <span className="material-symbols-rounded">receipt_long</span>
          </div>
          <div className="bh-kpi-data">
            <span className="bh-kpi-label">Total Invoices</span>
            <span className="bh-kpi-value">{kpis.count}</span>
          </div>
        </div>

        <div className="bh-kpi-pill">
          <div className="bh-kpi-icon bh-kpi-icon--billed">
            <span className="material-symbols-rounded">payments</span>
          </div>
          <div className="bh-kpi-data">
            <span className="bh-kpi-label">Total Invoiced</span>
            <span className="bh-kpi-value">{CURRENCY_SYMBOL}{kpis.billed.toLocaleString()}</span>
          </div>
        </div>

        <div className="bh-kpi-pill">
          <div className="bh-kpi-icon bh-kpi-icon--collected">
            <span className="material-symbols-rounded">check_circle</span>
          </div>
          <div className="bh-kpi-data">
            <span className="bh-kpi-label">Total Collected</span>
            <span className="bh-kpi-value">{CURRENCY_SYMBOL}{kpis.collected.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Search & filters container */}
      <div className="bh-controls-card">
        <form onSubmit={handleSearchSubmit} className="bh-controls-row">
          <div className="bh-search-box">
            <Md3TextField
              label="Search by Patient, MRN or Bill #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<span className="material-symbols-rounded">search</span>}
              trailingIcon={
                search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      fetchBills();
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit' }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
                  </button>
                ) : null
              }
            />
          </div>

          <div className="bh-filter-select">
            <Md3Select
              label="Invoice Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'OPEN', label: 'Open / Pending' },
                { value: 'FINALIZED', label: 'Finalized & Locked' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="bh-date-input">
            <Md3TextField
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="bh-date-input">
            <Md3TextField
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <Md3Button type="submit" variant="primary" style={{ height: '48px', padding: '0 20px' }}>
            <span className="material-symbols-rounded">filter_alt</span>
            <span>Filter</span>
          </Md3Button>
        </form>
      </div>

      {/* Table container */}
      <div className="bh-table-container">
        {loading ? (
          <div className="bh-empty-state">
            <span className="material-symbols-rounded spin-animation">progress_activity</span>
            <p>Loading invoices &amp; receipts history...</p>
          </div>
        ) : paginatedBills.length === 0 ? (
          <div className="bh-empty-state">
            <span className="material-symbols-rounded">receipt_long</span>
            <h4>No Invoices Found</h4>
            <p>No historical bills match your selected filter criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bh-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date &amp; Time</th>
                  <th>Patient Identity</th>
                  <th>Issuing Area</th>
                  <th>Billed Amount</th>
                  <th>Collected</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBills.map((b) => {
                  const patientName = `${b.patientId?.firstName || ''} ${b.patientId?.lastName || ''}`.trim() || 'Direct Patient';
                  const mrn = b.patientId?.mrn || 'N/A';
                  const areaBadge = getAreaBadgeClass(b.issuingArea, b.lineItems);
                  const areaLabel = getAreaLabel(b.issuingArea, b.lineItems);

                  return (
                    <tr key={b._id}>
                      <td className="bh-bill-num">{b.billNumber}</td>
                      <td>{new Date(b.serviceDate || b.createdAt).toLocaleDateString()} {new Date(b.serviceDate || b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <div className="bh-patient-info">
                          <span className="bh-patient-name">{patientName}</span>
                          <span className="bh-patient-mrn">MRN: {mrn}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`bh-area-badge ${areaBadge}`}>
                          {areaLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{CURRENCY_SYMBOL}{b.billedAmount || 0}</td>
                      <td style={{ color: '#2e7d32', fontWeight: 600 }}>{CURRENCY_SYMBOL}{b.collectedAmount || 0}</td>
                      <td>
                        <span className={`bh-status-pill bh-status-pill--${(b.status || 'open').toLowerCase()}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div className="bh-actions-cell">
                          <button
                            type="button"
                            className="bh-action-btn"
                            onClick={() => handleOpenDetail(b)}
                            title="Inspect Bill Details (Read Only)"
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>visibility</span>
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="bh-action-btn bh-action-btn--primary"
                            onClick={() => handleDirectPrint(b)}
                            title="Reprint Official Invoice"
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>print</span>
                            <span>Reprint</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {bills.length > 0 && (
        <Md3Pagination
          page={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}

      {/* Read-Only BillDetail modal */}
      {isDetailOpen && activeBill && (
        <BillDetail
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setActiveBill(null);
          }}
          bill={activeBill}
          readOnly={true}
        />
      )}

      {/* ─── UNIFIED BILL REPRINT MODAL & RENDERING ENGINE ─── */}
      <UnifiedBillPrintModal
        isOpen={isPrintModalOpen && !!printBill}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintBill(null);
          setAutoPrint(false);
        }}
        bill={printBill}
        patient={printBill?.patientId}
        config={templateConfig}
        autoPrint={autoPrint}
        defaultMode="INVOICE"
        title="Official Tax Invoice & Settlement Receipt"
      />
    </div>
  );
};

export default BillHistoryViewer;
