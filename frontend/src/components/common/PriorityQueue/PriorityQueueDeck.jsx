/**
 * PriorityQueueDeck.jsx
 * Reusable Universal Priority Queue Component powered by PriorityQueueEngine.
 * 
 * Supports:
 * - O(log n) Max-Heap scheduler
 * - Sub-linear tokenized search index
 * - Dynamic priority badges (Emergency, Redraw, STAT, Urgent, Routine)
 * - Custom card rendering slot (`renderCard`)
 * - Auto-refresh trigger & batch actions
 */

import React, { useState, useMemo } from 'react';
import PriorityQueueEngine, { PRIORITY_TIERS } from './PriorityQueueEngine';
import './PriorityQueueDeck.css';

export default function PriorityQueueDeck({
  title = 'Work Queue',
  subtitle = 'Priority-scheduled patient queue',
  items = [],
  loading = false,
  onRefresh = null,
  renderCard = null,
  onSelectItem = null,
  strategy = null,
  emptyMessage = 'No patients currently in queue',
  emptySubtext = 'Incoming orders and redrawn requests will appear here dynamically',
  headerActions = null,
  className = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isSpinning, setIsSpinning] = useState(false);

  // Initialize DSA Priority Queue Engine
  const engine = useMemo(() => {
    return new PriorityQueueEngine(strategy || {});
  }, [strategy]);

  // Compute processed and heap-sorted queue items
  const { items: processedItems, metrics } = useMemo(() => {
    return engine.processQueue(items, searchQuery, activeFilter);
  }, [engine, items, searchQuery, activeFilter]);

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsSpinning(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsSpinning(false), 500);
    }
  };

  return (
    <div className={`pq-deck ${className}`}>
      {/* ── Header ── */}
      <div className="pq-deck__header">
        <div className="pq-deck__title-group">
          <div className="pq-deck__icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <h3 className="pq-deck__title">{title}</h3>
            {subtitle && <p className="pq-deck__subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="pq-deck__controls">
          {headerActions}
          {onRefresh && (
            <button
              type="button"
              className={`pq-deck__refresh-btn ${isSpinning || loading ? 'pq-deck__refresh--spinning' : ''}`}
              onClick={handleRefreshClick}
              title="Refresh queue"
              aria-label="Refresh queue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="pq-deck__toolbar">
        <div className="pq-deck__search-box">
          <span className="pq-deck__search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="pq-deck__search-input"
            placeholder="Search patient, MRN, token, test, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="pq-deck__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="pq-deck__pills">
          <button
            type="button"
            className={`pq-pill ${activeFilter === 'ALL' ? 'pq-pill--active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All <span className="pq-pill__count">{metrics.total}</span>
          </button>

          {metrics.redraws > 0 && (
            <button
              type="button"
              className={`pq-pill pq-pill--redraw ${activeFilter === 'REDRAW' ? 'pq-pill--active' : ''}`}
              onClick={() => setActiveFilter('REDRAW')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px', marginRight: '4px', verticalAlign: 'text-bottom' }}>replay</span>
              <span>Redraws</span> <span className="pq-pill__count">{metrics.redraws}</span>
            </button>
          )}

          {metrics.emergency > 0 && (
            <button
              type="button"
              className={`pq-pill pq-pill--emergency ${activeFilter === 'EMERGENCY' ? 'pq-pill--active' : ''}`}
              onClick={() => setActiveFilter('EMERGENCY')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px', marginRight: '4px', verticalAlign: 'text-bottom' }}>emergency</span>
              <span>Panic</span> <span className="pq-pill__count">{metrics.emergency}</span>
            </button>
          )}

          {metrics.stat > 0 && (
            <button
              type="button"
              className={`pq-pill pq-pill--stat ${activeFilter === 'STAT' ? 'pq-pill--active' : ''}`}
              onClick={() => setActiveFilter('STAT')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px', marginRight: '4px', verticalAlign: 'text-bottom' }}>bolt</span>
              <span>STAT</span> <span className="pq-pill__count">{metrics.stat}</span>
            </button>
          )}

          {metrics.routine > 0 && (
            <button
              type="button"
              className={`pq-pill ${activeFilter === 'ROUTINE' ? 'pq-pill--active' : ''}`}
              onClick={() => setActiveFilter('ROUTINE')}
            >
              Routine <span className="pq-pill__count">{metrics.routine}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Queue Cards Body ── */}
      <div className="pq-deck__body">
        {loading && items.length === 0 ? (
          <div className="pq-deck__empty">
            <div className="pq-deck__refresh--spinning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <p className="pq-deck__empty-text">Loading priority queue...</p>
          </div>
        ) : processedItems.length === 0 ? (
          <div className="pq-deck__empty">
            <div className="pq-deck__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <p className="pq-deck__empty-text">{searchQuery || activeFilter !== 'ALL' ? 'No matching queue items found' : emptyMessage}</p>
            <p className="pq-deck__empty-sub">{searchQuery ? 'Try adjusting your search keywords or priority filter' : emptySubtext}</p>
          </div>
        ) : (
          processedItems.map((item, index) => {
            const meta = item._priorityMeta || {};
            if (typeof renderCard === 'function') {
              return renderCard(item, index, meta, onSelectItem);
            }
            return (
              <div
                key={item._id || item.id || index}
                className="pq-default-card"
                onClick={() => onSelectItem && onSelectItem(item)}
              >
                <div className="pq-default-card__header">
                  <span className={`pq-badge ${meta.tier?.badgeClass || 'pq-badge-routine'}`}>
                    {meta.tier?.label || 'Routine'} (Score: {meta.computedScore})
                  </span>
                  <span className="pq-default-card__token">{item.tokenString || `#${item.queueNumber}`}</span>
                </div>
                <div className="pq-default-card__body">
                  <p className="pq-default-card__name">
                    {item.patientId?.firstName} {item.patientId?.lastName}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
