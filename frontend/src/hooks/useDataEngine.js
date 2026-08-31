/**
 * useDataEngine — React Hook for High-Performance DSA Search, Filter, and Sort.
 * Decouples rendering components from query algorithms.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GenericQueryEngine } from '../core/dsa/GenericQueryEngine';

export const useDataEngine = ({
  rawDataset = [],
  config = {},
  initialPageSize = 50,
}) => {
  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new GenericQueryEngine(config);
  }

  const [queryState, setQueryState] = useState({
    searchQuery: '',
    filters: {},
    page: 1,
    pageSize: initialPageSize,
    sortBy: null,
    sortOrder: 'asc',
  });

  // Re-index whenever raw dataset changes
  useEffect(() => {
    if (engineRef.current && Array.isArray(rawDataset)) {
      engineRef.current.indexDataset(rawDataset);
    }
  }, [rawDataset]);

  // Comparator builder based on sortBy and sortOrder
  const comparator = useMemo(() => {
    if (!queryState.sortBy) return null;
    const { sortBy, sortOrder } = queryState;
    const multiplier = sortOrder === 'desc' ? -1 : 1;

    return (a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * multiplier;
      }
      return String(valA).localeCompare(String(valB)) * multiplier;
    };
  }, [queryState.sortBy, queryState.sortOrder]);

  // Execute query via DSA engine
  const result = useMemo(() => {
    if (!engineRef.current) {
      return { items: [], total: 0, totalPages: 1, page: 1, pageSize: initialPageSize };
    }

    return engineRef.current.query({
      searchQuery: queryState.searchQuery,
      filters: queryState.filters,
      comparator,
      page: queryState.page,
      pageSize: queryState.pageSize,
    });
  }, [
    rawDataset,
    queryState.searchQuery,
    queryState.filters,
    queryState.page,
    queryState.pageSize,
    comparator,
    initialPageSize,
  ]);

  const setSearchQuery = useCallback((searchQuery) => {
    setQueryState((prev) => ({ ...prev, searchQuery, page: 1 }));
  }, []);

  const setFilters = useCallback((filters) => {
    setQueryState((prev) => ({ ...prev, filters, page: 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize) => {
    setQueryState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy, sortOrder = 'asc') => {
    setQueryState((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  return {
    items: result.items,
    total: result.total,
    totalPages: result.totalPages,
    page: result.page,
    pageSize: result.pageSize,
    queryState,
    setSearchQuery,
    setFilters,
    setPage,
    setPageSize,
    setSort,
  };
};

export default useDataEngine;
