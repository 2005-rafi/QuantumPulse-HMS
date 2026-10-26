const { EventEmitter } = require('events');
const logger = require('../../core/logger');

class PatientStatusEventEmitter extends EventEmitter {}

const patientStatusEvents = new PatientStatusEventEmitter();
patientStatusEvents.setMaxListeners(300);

// Active client counter for monitoring
let connectedClientsCount = 0;

/**
 * Broadcasts a patient status change event to all connected SSE clients.
 * Lightweight, zero-polling push mechanism.
 *
 * @param {object} payload
 * @param {string} payload.patientId
 * @param {string} [payload.mrn]
 * @param {string} [payload.patientName]
 * @param {string} payload.visitId
 * @param {string} [payload.tokenString]
 * @param {string} [payload.department]
 * @param {string} payload.status
 * @param {string} [payload.previousStatus]
 * @param {Date} [payload.timestamp]
 */
const broadcastPatientStatus = (payload) => {
  if (!payload || !payload.patientId) return;

  const eventPayload = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  patientStatusEvents.emit('statusChanged', eventPayload);
};

/**
 * Broadcasts an IPD Financial Ledger or Clearance change event to all connected SSE clients.
 * Instant real-time financial synchronization (Stock-market grade zero-polling push).
 *
 * @param {object} payload
 * @param {string} payload.admissionId
 * @param {string} [payload.patientId]
 * @param {number} [payload.totalGrossBilled]
 * @param {number} [payload.totalAdvanceDeposited]
 * @param {number} [payload.outstandingDue]
 * @param {boolean} [payload.isSettled]
 * @param {string} [payload.billStatus]
 * @param {string} [payload.eventType]
 */
const broadcastIPDLedgerUpdate = (payload) => {
  if (!payload || !payload.admissionId) return;

  const eventPayload = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  patientStatusEvents.emit('ledgerUpdated', eventPayload);
};

/**
 * Broadcasts a department billing clearance update event to all connected SSE clients.
 *
 * @param {object} payload
 * @param {string} payload.admissionId
 * @param {boolean} payload.isCleared
 * @param {number} [payload.outstandingDue]
 */
const broadcastBillingClearanceUpdate = (payload) => {
  broadcastIPDLedgerUpdate({
    ...payload,
    eventType: 'BILLING_CLEARANCE_UPDATE',
  });
};

/**
 * Express SSE Route Handler for live real-time patient status updates.
 */
const handlePatientStatusSSE = (req, res) => {
  // Set SSE Transport Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  connectedClientsCount++;
  res.write(`: connected (active clients: ${connectedClientsCount})\n\n`);

  // Listener for status mutations
  const statusListener = (data) => {
    try {
      const payload = JSON.stringify(data);
      res.write(`event: patient-status\ndata: ${payload}\n\n`);
      res.write(`event: patient_status\ndata: ${payload}\n\n`);
    } catch (err) {
      logger.warn('[SSE] Failed to write status event to client:', { error: err.message });
    }
  };

  // Listener for IPD financial ledger & clearance mutations
  const ledgerListener = (data) => {
    try {
      const payload = JSON.stringify(data);
      res.write(`event: ipd-ledger-update\ndata: ${payload}\n\n`);
      res.write(`event: billing-clearance-update\ndata: ${payload}\n\n`);
    } catch (err) {
      logger.warn('[SSE] Failed to write ledger event to client:', { error: err.message });
    }
  };

  patientStatusEvents.on('statusChanged', statusListener);
  patientStatusEvents.on('ledgerUpdated', ledgerListener);

  // Keep-alive ping every 25 seconds to prevent browser/proxy connection drop
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      clearInterval(keepAliveTimer);
    }
  }, 25000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(keepAliveTimer);
    patientStatusEvents.removeListener('statusChanged', statusListener);
    patientStatusEvents.removeListener('ledgerUpdated', ledgerListener);
    connectedClientsCount = Math.max(0, connectedClientsCount - 1);
  });
};

module.exports = {
  patientStatusEvents,
  broadcastPatientStatus,
  broadcastIPDLedgerUpdate,
  broadcastBillingClearanceUpdate,
  handlePatientStatusSSE,
};
