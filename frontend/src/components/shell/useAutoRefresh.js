import { useEffect, useRef, useCallback } from 'react';

const useAutoRefresh = (fetchFn, intervalMs = 30000, deps = []) => {
  const stableFetch = useCallback(fetchFn, deps);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!intervalRef.current) {
      queueMicrotask(() => {
        if (!cancelled) stableFetch();
      });
    }

    intervalRef.current = setInterval(() => {
      stableFetch();
    }, intervalMs);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stableFetch, intervalMs]);

  return stableFetch;
};

export default useAutoRefresh;
