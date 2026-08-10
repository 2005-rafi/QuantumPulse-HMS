const mongoose = require('mongoose');
const logger = require('../logger');

/**
 * Execute a callback within a MongoDB ACID transaction if supported,
 * with automatic retries for transient write conflicts and commit uncertainties.
 * Includes graceful fallback for standalone MongoDB instances.
 * 
 * @param {Function} workFn - Async function taking (session)
 * @param {number} maxRetries - Maximum number of retries for transient errors (default 3)
 * @param {number} initialDelayMs - Base delay for exponential backoff in ms (default 100)
 * @returns {Promise<any>}
 */
const withTransaction = async (workFn, maxRetries = 3, initialDelayMs = 100) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await workFn(session);

      // Commit retry loop for UnknownTransactionCommitResult
      while (true) {
        try {
          await session.commitTransaction();
          break;
        } catch (commitError) {
          if (
            commitError.hasErrorLabel &&
            commitError.hasErrorLabel('UnknownTransactionCommitResult')
          ) {
            logger.warn(`UnknownTransactionCommitResult encountered. Retrying commit (attempt ${attempt})...`);
            continue;
          }
          throw commitError;
        }
      }

      session.endSession();
      return result;
    } catch (error) {
      // If standalone MongoDB instance (no replica set), transactions are not supported by the server engine.
      const isStandaloneError =
        error.message &&
        (error.message.includes('Transaction numbers are only allowed on a replica set member') ||
         error.message.includes('Standalone servers do not support transactions') ||
         error.message.includes('does not support retryable writes') ||
         error.message.includes('retryable writes'));

      if (isStandaloneError) {
        if (process.env.NODE_ENV === 'production') {
          session.endSession();
          logger.error('FATAL: Standalone MongoDB detected in production. Multi-document transactions are required but unsupported by standalone engines.');
          const AppError = require('../errors/AppError');
          throw new AppError('SYSTEM_003', 'Transaction failed: multi-document transactions are required in production but unsupported by standalone MongoDB engine.');
        }
        logger.warn('MongoDB standalone mode detected. Executing operation without multi-document transaction boundary.');
        session.endSession();
        // Fallback execution without session
        return await workFn(null);
      }

      // Abort transaction on operational/business errors
      try {
        await session.abortTransaction();
      } catch (abortError) {
        logger.error('Failed to abort transaction', { error: abortError.message });
      }
      session.endSession();

      // Check if error is a TransientTransactionError and retries remain
      const isTransient = error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');
      if (isTransient && attempt < maxRetries) {
        const backoff = initialDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`TransientTransactionError detected. Retrying transaction attempt ${attempt}/${maxRetries} after ${backoff}ms...`, {
          error: error.message
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      throw error;
    }
  }
};

module.exports = { withTransaction };
