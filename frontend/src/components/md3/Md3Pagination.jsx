import React, { useMemo } from 'react';
import './Md3Pagination.css';

/**
/**
 * Md3Pagination — Pure Material Design 3 Production-Grade Pagination Component
 * 
 * Props:
 * @param {number} currentPage - 1-based active page index
 * @param {number} totalItems - Total count of records in dataset (or total)
 * @param {number} pageSize - Items per page (e.g. 10, 20, 50, 100)
 * @param {Function} onPageChange - Callback (newPage: number) => void
 * @param {Function} [onPageSizeChange] - Optional callback (newSize: number) => void
 * @param {Array<number>} [pageSizeOptions=[10, 20, 50]] - Available page size choices
 * @param {string} [itemLabel='records'] - Singular/Plural descriptor for records
 * @param {'top'|'bottom'} [position='bottom'] - Vertical placement style modifier
 * @param {boolean} [showSizeSelector=true] - Whether to render page size selector
 * @param {boolean} [disabled=false] - Disable controls while in-flight query is loading (exhaustion prevention)
 */
export const Md3Pagination = ({
  currentPage = 1,
  totalItems = 0,
  total,
  pageSize = 50,
  limit,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'records',
  position = 'bottom',
  showSizeSelector = true,
  disabled = false,
}) => {
  const effectiveTotalItems = Math.max(0, Number(totalItems ?? total ?? 0));
  const effectivePageSize = Math.max(1, Number(pageSize ?? limit ?? 50));
  const totalPages = Math.max(1, Math.ceil(effectiveTotalItems / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  // Calculate slice range (1-based for humans)
  const startItem = effectiveTotalItems === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endItem = Math.min(safeCurrentPage * effectivePageSize, effectiveTotalItems);

  // Generate page numbers array with smart ellipsis (e.g. [1, '...', 4, 5, 6, '...', 10])
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const delta = 1; // Number of pages around current page

    const left = safeCurrentPage - delta;
    const right = safeCurrentPage + delta;

    let hasLeftEllipsis = false;
    let hasRightEllipsis = false;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i);
      } else if (i < left && !hasLeftEllipsis) {
        pages.push('ellipsis-left');
        hasLeftEllipsis = true;
      } else if (i > right && !hasRightEllipsis) {
        pages.push('ellipsis-right');
        hasRightEllipsis = true;
      }
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  // Don't render anything if there are no items and no pagination is required
  if (effectiveTotalItems === 0) return null;

  return (
    <nav
      className={`md3-pagination md3-pagination--${position} ${disabled ? 'is-loading' : ''}`}
      aria-label={`Pagination controls (${position})`}
      aria-busy={disabled}
    >
      {/* ── 1. Summary & Range Metrics ── */}
      <div className="md3-pagination__summary">
        <span>
          Showing <span className="md3-pagination__range-text">{startItem}–{endItem}</span> of{' '}
          <span className="md3-pagination__range-text">{effectiveTotalItems.toLocaleString()}</span> {itemLabel}
        </span>

        {/* Page Size Selector (Optional) */}
        {showSizeSelector && onPageSizeChange && pageSizeOptions.length > 0 && (
          <div className="md3-pagination__size-selector">
            <span>Show:</span>
            <div className="md3-pagination__size-options">
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  className={`md3-pagination__size-btn ${effectivePageSize === size ? 'is-active' : ''}`}
                  onClick={() => !disabled && onPageSizeChange(size)}
                  title={`Show ${size} ${itemLabel} per page`}
                  aria-pressed={effectivePageSize === size}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Navigation Action Buttons & Page Pills ── */}
      <div className="md3-pagination__controls">
        {/* First Page Button */}
        <button
          type="button"
          className="md3-pagination__nav-btn is-edge"
          disabled={disabled || safeCurrentPage <= 1}
          onClick={() => !disabled && onPageChange(1)}
          title="Go to First Page"
          aria-label="First page"
        >
          <span className="material-symbols-rounded md3-pagination__nav-icon">first_page</span>
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          className="md3-pagination__nav-btn"
          disabled={disabled || safeCurrentPage <= 1}
          onClick={() => !disabled && onPageChange(safeCurrentPage - 1)}
          title="Previous Page"
          aria-label="Previous page"
        >
          <span className="material-symbols-rounded md3-pagination__nav-icon">chevron_left</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="md3-pagination__pages-group">
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ell-${idx}`} className="md3-pagination__ellipsis" aria-hidden="true">
                  …
                </span>
              );
            }
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                className={`md3-pagination__page-btn ${safeCurrentPage === p ? 'is-active' : ''}`}
                onClick={() => !disabled && onPageChange(p)}
                aria-current={safeCurrentPage === p ? 'page' : undefined}
                title={`Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          className="md3-pagination__nav-btn"
          disabled={disabled || safeCurrentPage >= totalPages}
          onClick={() => !disabled && onPageChange(safeCurrentPage + 1)}
          title="Next Page"
          aria-label="Next page"
        >
          <span className="material-symbols-rounded md3-pagination__nav-icon">chevron_right</span>
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          className="md3-pagination__nav-btn is-edge"
          disabled={disabled || safeCurrentPage >= totalPages}
          onClick={() => !disabled && onPageChange(totalPages)}
          title="Go to Last Page"
          aria-label="Last page"
        >
          <span className="material-symbols-rounded md3-pagination__nav-icon">last_page</span>
        </button>
      </div>
    </nav>
  );
};

export default Md3Pagination;
