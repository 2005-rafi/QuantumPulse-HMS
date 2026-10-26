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

    const startPolling = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          stableFetch();
        }, intervalMs);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        if (!cancelled) {
          stableFetch();
        }
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stableFetch, intervalMs]);

  return stableFetch;
};

export default useAutoRefresh;
