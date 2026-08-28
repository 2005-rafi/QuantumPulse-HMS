import { useState, useMemo, useEffect } from 'react';

/**
 * usePagination — Clean client-side pagination hook following SOLID & DBMS principles
 * 
 * @param {Array} items - Full raw or filtered dataset array
 * @param {number} [initialPageSize=50] - Number of records per page (default: 50)
 * @param {Array} [resetDeps=[]] - Dependency values (e.g. [search, filter]) that trigger page reset to 1
 * @returns {object} Pagination controller and sliced dataset
 */
export const usePagination = (items = [], initialPageSize = 50, resetDeps = []) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 whenever search query, filters, or dataset dependencies change
  useEffect(() => {
    setPage(1);
  }, resetDeps); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clamp page if items shrink
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Safe page changer
  const handlePageChange = (newPage) => {
    const safePage = Math.min(Math.max(1, newPage), totalPages);
    setPage(safePage);
  };

  // Page size changer (resets to page 1 to prevent out-of-bounds)
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Pure sliced data array for active page (O(1) slicing)
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Whether top pagination should be shown according to rule: totalItems > 20
  const showTopPagination = totalItems > 20;

  return {
    page,
    setPage: handlePageChange,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalPages,
    totalItems,
    paginatedItems,
    showTopPagination,
  };
};

export default usePagination;
