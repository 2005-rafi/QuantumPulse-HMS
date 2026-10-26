import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getPatientStatus, PATIENT_STATUS_REGISTRY } from '../constants/patientStatus';

const PatientStatusContext = createContext(null);

export const PatientStatusProvider = ({ children }) => {
  const [statusMap, setStatusMap] = useState({});
  const [lastEvent, setLastEvent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef(new Set());
  const ledgerSubscribersRef = useRef(new Set());
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const sseUrl = '/api/v1/realtime/patient-status';
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.addEventListener('patient-status', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload.patientId) return;

          const patientIdStr = String(payload.patientId);

          // Handle development purge event: evict immediately from client status cache
          if (payload.action === 'PURGE' || payload.status === 'PURGED_DEV') {
            setStatusMap((prev) => {
              const updated = { ...prev };
              delete updated[patientIdStr];
              return updated;
            });
            const purgeRecord = {
              patientId: patientIdStr,
              status: 'PURGED_DEV',
              action: 'PURGE',
              timestamp: payload.timestamp || new Date().toISOString(),
            };
            setLastEvent(purgeRecord);
            subscribersRef.current.forEach((cb) => {
              try {
                cb(purgeRecord);
              } catch (err) {
                console.error('[PatientStatusContext] Subscriber callback error on purge:', err);
              }
            });
            return;
          }

          const meta = payload.statusMeta || getPatientStatus(payload.status);

          const statusRecord = {
            patientId: patientIdStr,
            visitId: payload.visitId,
            tokenString: payload.tokenString,
            status: payload.status,
            statusMeta: meta,
            stage: payload.stage,
            details: payload.details,
            timestamp: payload.timestamp || new Date().toISOString(),
          };

          setStatusMap((prev) => ({
            ...prev,
            [patientIdStr]: statusRecord,
          }));

          setLastEvent(statusRecord);

          // Notify any custom subscribers
          subscribersRef.current.forEach((cb) => {
            try {
              cb(statusRecord);
            } catch (err) {
              console.error('[PatientStatusContext] Subscriber callback error:', err);
            }
          });
        } catch (err) {
          console.error('[PatientStatusContext] Failed to parse SSE payload:', err);
        }
      });

      const handleLedgerEvent = (e) => {
        try {
          const payload = JSON.parse(e.data);
          ledgerSubscribersRef.current.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error('[PatientStatusContext] Ledger subscriber callback error:', err);
            }
          });
        } catch (err) {
          console.error('[PatientStatusContext] Failed to parse ledger SSE payload:', err);
        }
      };

      es.addEventListener('ipd-ledger-update', handleLedgerEvent);
      es.addEventListener('billing-clearance-update', handleLedgerEvent);

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        // Exponential reconnect backoff
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 5000);
      };
    } catch (err) {
      console.error('[PatientStatusContext] Error establishing SSE connection:', err);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  /**
   * Subscribe to specific or all status changes.
   * Returns an unsubscribe function.
   */
  const subscribeToStatusChanges = useCallback((callback) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  /**
   * Subscribe to real-time IPD financial ledger & clearance events.
   * Returns an unsubscribe function.
   */
  const subscribeToLedgerUpdates = useCallback((callback) => {
    ledgerSubscribersRef.current.add(callback);
    return () => {
      ledgerSubscribersRef.current.delete(callback);
    };
  }, []);

  /**
   * Get the live or fallback status for a given patientId.
   */
  const getLiveStatus = useCallback(
    (patientId, fallbackStatus = 'REGISTERED_IDLE') => {
      if (!patientId) return { status: fallbackStatus, statusMeta: getPatientStatus(fallbackStatus) };
      const pid = String(patientId);
      if (statusMap[pid]) {
        return statusMap[pid];
      }
      return {
        patientId: pid,
        status: fallbackStatus,
        statusMeta: getPatientStatus(fallbackStatus),
        isLive: false,
      };
    },
    [statusMap]
  );

  /**
   * Manually prime or update status in state (e.g., when initial list loads from API).
   */
  const seedPatientStatuses = useCallback((patientsList) => {
    if (!Array.isArray(patientsList) || patientsList.length === 0) return;
    setStatusMap((prev) => {
      const updated = { ...prev };
      patientsList.forEach((p) => {
        if (!p || !p._id) return;
        const pid = String(p._id);
        // Only seed if not already updated by a more recent real-time SSE event
        if (!updated[pid]) {
          const status = p.currentState || p.lastVisitStatus || 'REGISTERED_IDLE';
          updated[pid] = {
            patientId: pid,
            visitId: p.activeVisit?._id,
            tokenString: p.activeVisit?.tokenString,
            status,
            statusMeta: p.statusMeta || getPatientStatus(status),
            isLive: false,
          };
        }
      });
      return updated;
    });
  }, []);

  const value = {
    statusMap,
    lastEvent,
    isConnected,
    getLiveStatus,
    seedPatientStatuses,
    subscribeToStatusChanges,
    subscribeToLedgerUpdates,
    patientStatusRegistry: PATIENT_STATUS_REGISTRY,
  };

  return (
    <PatientStatusContext.Provider value={value}>
      {children}
    </PatientStatusContext.Provider>
  );
};

export const usePatientStatus = () => {
  const context = useContext(PatientStatusContext);
  if (!context) {
    throw new Error('usePatientStatus must be used within a PatientStatusProvider');
  }
  return context;
};

