import React, { useState, useEffect } from 'react';
import { billingAPI } from '../../../services/billingAPI';
import { CURRENCY_SYMBOL } from '../../../constants/currency';
import { Icon } from '../../../components/md3/Md3Widgets';
import Md3TabSwitch from '../../../components/md3/Md3TabSwitch';
import {
  TimeSeriesSplineChart,
  DonutStreamChart,
  PaymentMethodBars,
  RevenueWaterfallChart,
  DayOfWeekHeatmap,
} from './FinancialCharts';
import './FinancialAnalytics.css';

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: 'Past 7 Days' },
  { id: '30days', label: 'Past 30 Days' },
  { id: '90days', label: 'Quarterly (90D)' },
  { id: '365days', label: 'Annual (YTD)' },
];

export const FinancialAnalytics = () => {
  const [range, setRange] = useState('30days');
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalAdjusted: 0,
    totalOutstanding: 0,
    billCount: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getDateRange = (r) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setHours(0, 0, 0, 0);

    if (r === 'today') {
      // today
    } else if (r === '7days') {
      from.setDate(from.getDate() - 7);
    } else if (r === '30days') {
      from.setDate(from.getDate() - 30);
    } else if (r === '90days') {
      from.setDate(from.getDate() - 90);
    } else if (r === '365days') {
      from.setDate(from.getDate() - 365);
    }
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(range);
      const [sumRes, catRes, trendRes, payRes, dowRes] = await Promise.allSettled([
        billingAPI.getSummary({ from, to }),
        billingAPI.getByCategory({ from, to }),
        billingAPI.getTrend({ from, to, granularity: range === 'today' || range === '7days' ? 'day' : range === '30days' ? 'day' : 'week' }),
        billingAPI.getPaymentMethods({ from, to }),
        billingAPI.getDayOfWeek({ from, to }),
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value.data?.data || { totalBilled: 0, totalCollected: 0, totalAdjusted: 0, totalOutstanding: 0, billCount: 0 });
      }
      if (catRes.status === 'fulfilled') {
        setCategoryData(catRes.value.data?.data || []);
      }
      if (trendRes.status === 'fulfilled') {
        setTrendData(trendRes.value.data?.data || []);
      }
      if (payRes.status === 'fulfilled') {
        setPaymentMethods(payRes.value.data?.data || []);
      }
      if (dowRes.status === 'fulfilled') {
        setDayOfWeekData(dowRes.value.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load financial analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const collectionRate = summary.totalBilled > 0
    ? Math.round((summary.totalCollected / summary.totalBilled) * 100)
    : 0;

  const arpu = summary.billCount > 0
    ? Math.round(summary.totalBilled / summary.billCount)
    : 0;

  return (
    <div className="fin-analytics">
      {/* Date Range Bar with Material 3 Tab Switch */}
      <div className="fin-range-bar">
        <div className="fin-range-selector">
          <Md3TabSwitch
            tabs={DATE_RANGES}
            activeTab={range}
            onChange={setRange}
            size="small"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button
            type="button"
            className="tariff-refresh-btn"
            onClick={fetchAnalytics}
            aria-label="Refresh financial analytics"
            title="Refresh Analytics"
          >
            <Icon.Refresh />
          </button>
        </div>
      </div>

      {/* Linear 6-KPI Metric Command Bar */}
      <div className="fin-kpi-grid">
        <div className="fin-kpi-card">
          <div className="fin-kpi-icon" style={{ background: 'var(--md-sys-color-primary-container, #eaddff)', color: 'var(--md-sys-color-on-primary-container, #21005d)' }}>
            <span className="material-symbols-rounded">receipt_long</span>
          </div>
          <div className="fin-kpi-content">
            <span className="fin-kpi-label">Total Invoiced</span>
            <div className="fin-kpi-value">{CURRENCY_SYMBOL}{summary.totalBilled.toLocaleString('en-IN')}</div>
            <span className="fin-kpi-sub">{summary.billCount} patient bills</span>
          </div>
        </div>

        <div className="fin-kpi-card">
          <div className="fin-kpi-icon" style={{ background: 'rgba(46, 125, 50, 0.14)', color: '#2e7d32' }}>
            <span className="material-symbols-rounded">account_balance_wallet</span>
          </div>
          <div className="fin-kpi-content">
            <span className="fin-kpi-label">Cash Collected</span>
            <div className="fin-kpi-value" style={{ color: '#2e7d32' }}>
              {CURRENCY_SYMBOL}{summary.totalCollected.toLocaleString('en-IN')}
            </div>
            <span className="fin-kpi-sub" style={{ color: '#2e7d32', fontWeight: 600 }}>
              Efficiency: {collectionRate}%
            </span>
          </div>
        </div>

        <div className="fin-kpi-card">
          <div className="fin-kpi-icon" style={{ background: 'rgba(211, 47, 47, 0.14)', color: '#d32f2f' }}>
            <span className="material-symbols-rounded">pending_actions</span>
          </div>
          <div className="fin-kpi-content">
            <span className="fin-kpi-label">Outstanding Dues</span>
            <div className="fin-kpi-value" style={{ color: summary.totalOutstanding > 0 ? '#d32f2f' : '#2e7d32' }}>
              {CURRENCY_SYMBOL}{summary.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <span className="fin-kpi-sub">Overdue receivables</span>
          </div>
        </div>

        <div className="fin-kpi-card">
          <div className="fin-kpi-icon" style={{ background: 'rgba(230, 81, 0, 0.14)', color: '#e65100' }}>
            <span className="material-symbols-rounded">price_check</span>
          </div>
          <div className="fin-kpi-content">
            <span className="fin-kpi-label">Adjustments</span>
            <div className="fin-kpi-value" style={{ color: '#e65100' }}>
              {CURRENCY_SYMBOL}{summary.totalAdjusted.toLocaleString('en-IN')}
            </div>
            <span className="fin-kpi-sub">Waivers &amp; concessions</span>
          </div>
        </div>

        <div className="fin-kpi-card">
          <div className="fin-kpi-icon" style={{ background: 'var(--md-sys-color-secondary-container, #e8def8)', color: 'var(--md-sys-color-on-secondary-container, #1d192b)' }}>
            <span className="material-symbols-rounded">insights</span>
          </div>
          <div className="fin-kpi-content">
            <span className="fin-kpi-label">Avg Ticket (ARPU)</span>
            <div className="fin-kpi-value">{CURRENCY_SYMBOL}{arpu.toLocaleString('en-IN')}</div>
            <span className="fin-kpi-sub">Per patient encounter</span>
          </div>
        </div>
      </div>

      {/* 5 Unique Interactive Charts Layout */}
      <div className="fin-dashboard-grid">
        {/* Chart 1: Dual-Axis Time-Series Spline & Area (Full Width) */}
        <div className="fin-grid-full">
          <TimeSeriesSplineChart data={trendData} range={range} />
        </div>

        {/* Chart 2: Donut Stream Chart */}
        <div className="fin-grid-half">
          <DonutStreamChart data={categoryData} />
        </div>

        {/* Chart 3: Payment Method Bars */}
        <div className="fin-grid-half">
          <PaymentMethodBars data={paymentMethods} />
        </div>

        {/* Chart 4: Revenue Waterfall Chart */}
        <div className="fin-grid-half">
          <RevenueWaterfallChart summary={summary} />
        </div>

        {/* Chart 5: Day-of-Week Revenue Heatmap */}
        <div className="fin-grid-half">
          <DayOfWeekHeatmap data={dayOfWeekData} />
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
