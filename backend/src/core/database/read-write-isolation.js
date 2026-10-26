/**
 * backend/src/core/database/read-write-isolation.js
 * CQRS Read & Write Isolation Engine.
 * Segregates high-throughput read operations (searches, census listings, audit checks)
 * from transactional write-heavy mutations (admissions, prescriptions, billing).
 * Enforces forced .lean() execution, execution timeout guardrails (maxTimeMS),
 * and secondaryPreferred routing in MongoDB replica sets with standalone graceful fallback.
 */
const mongoose = require('mongoose');
const logger = require('../logger');

const readMetrics = {
  totalIsolatedQueries: 0,
  totalIsolatedAggregations: 0,
  totalExecutionTimeMs: 0,
  fallbackToPrimaryCount: 0,
  activeReadPreference: 'secondaryPreferred',
};

/**
 * Executes a high-scale read query isolated from primary transactional write locks.
 *
 * @param {mongoose.Model} model - The Mongoose Model to query
 * @param {Function} queryFn - Function taking (model) and returning a Mongoose Query
 * @param {Object} options - { readPreference, maxTimeMS, lean }
 * @returns {Promise<any>}
 */
const executeIsolatedQuery = async (model, queryFn, options = {}) => {
  const startTime = Date.now();
  const readPreference = options.readPreference || 'secondaryPreferred';
  const maxTimeMS = options.maxTimeMS || 8000;
  const forceLean = options.lean !== false;

  try {
    let query = queryFn(model);

    // Apply read preference if query supports it
    if (typeof query.read === 'function') {
      try {
        query = query.read(readPreference);
      } catch (err) {
        readMetrics.fallbackToPrimaryCount++;
      }
    }

    // Apply max execution time guardrail to prevent rogue hanging queries
    if (typeof query.maxTimeMS === 'function') {
      query = query.maxTimeMS(maxTimeMS);
    }

    // Enforce .lean() for zero Mongoose wrapper overhead
    if (forceLean && typeof query.lean === 'function') {
      query = query.lean();
    }

    const result = await query.exec ? query.exec() : await query;
    const duration = Date.now() - startTime;
    readMetrics.totalIsolatedQueries++;
    readMetrics.totalExecutionTimeMs += duration;

    return result;
  } catch (error) {
    logger.warn('Isolated read query warning or fallback', {
      model: model?.modelName,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Executes an isolated aggregation pipeline on read nodes with forced timeout.
 *
 * @param {mongoose.Model} model - The Mongoose Model
 * @param {Array<Object>} pipeline - Aggregation pipeline stages
 * @param {Object} options - { readPreference, maxTimeMS }
 * @returns {Promise<any>}
 */
const executeIsolatedAggregate = async (model, pipeline, options = {}) => {
  const startTime = Date.now();
  const readPreference = options.readPreference || 'secondaryPreferred';
  const maxTimeMS = options.maxTimeMS || 12000;

  try {
    let aggregation = model.aggregate(pipeline);

    if (typeof aggregation.read === 'function') {
      try {
        aggregation = aggregation.read(readPreference);
      } catch (err) {
        readMetrics.fallbackToPrimaryCount++;
      }
    }

    if (typeof aggregation.maxTimeMS === 'function') {
      aggregation = aggregation.maxTimeMS(maxTimeMS);
    }

    const result = await aggregation.exec();
    const duration = Date.now() - startTime;
    readMetrics.totalIsolatedAggregations++;
    readMetrics.totalExecutionTimeMs += duration;

    return result;
  } catch (error) {
    logger.warn('Isolated read aggregate warning or fallback', {
      model: model?.modelName,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Telemetry metrics for CQRS Read/Write isolation
 */
const getIsolationMetrics = () => {
  const total = readMetrics.totalIsolatedQueries + readMetrics.totalIsolatedAggregations;
  const avgTime = total > 0 ? (readMetrics.totalExecutionTimeMs / total).toFixed(2) : 0;
  return {
    ...readMetrics,
    totalOperations: total,
    averageLatencyMs: Number(avgTime),
    isReplicaSet: Boolean(mongoose.connection?.client?.topology?.description?.type?.includes('ReplicaSet')),
  };
};

module.exports = {
  executeIsolatedQuery,
  executeIsolatedAggregate,
  getIsolationMetrics,
};
