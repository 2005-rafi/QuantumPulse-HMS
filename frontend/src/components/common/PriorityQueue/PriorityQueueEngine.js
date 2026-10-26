/**
 * PriorityQueueEngine.js
 * Advanced DSA-based Queue Management Engine for QuantumPulse HMS.
 * 
 * Implements:
 * 1. BinaryMaxHeap: High-performance priority queue with dynamic dynamic wait-time aging (O(log n) insert/extract).
 * 2. BucketPartitioner: Multi-dimensional radix/bucket partitioning for categorical filtering (O(n)).
 * 3. InvertedIndexSearch: Fast tokenized inverted index for instant sub-linear search across patient attributes.
 * 4. PluggableQueueStrategy: Modular strategy pattern for customizing priorities across Lab, Phlebotomy, OPD, IPD, and Billing.
 */

export const PRIORITY_TIERS = Object.freeze({
  EMERGENCY: { level: 1, baseScore: 1000, label: 'Emergency / Panic', color: '#dc2626', badgeClass: 'pq-badge-emergency' },
  REDRAW:    { level: 2, baseScore: 500,  label: 'Specimen Redraw', color: '#ea580c', badgeClass: 'pq-badge-redraw' },
  STAT:      { level: 3, baseScore: 300,  label: 'STAT',            color: '#d97706', badgeClass: 'pq-badge-stat' },
  URGENT:    { level: 4, baseScore: 200,  label: 'Urgent',          color: '#2563eb', badgeClass: 'pq-badge-urgent' },
  ROUTINE:   { level: 5, baseScore: 100,  label: 'Routine',         color: '#059669', badgeClass: 'pq-badge-routine' },
});

/**
 * Binary Max-Heap Data Structure for O(log n) operations
 */
export class BinaryMaxHeap {
  constructor(comparator = (a, b) => b.computedScore - a.computedScore) {
    this.heap = [];
    this.comparator = comparator;
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top;
  }

  toSortedArray() {
    const clone = new BinaryMaxHeap(this.comparator);
    clone.heap = [...this.heap];
    const sorted = [];
    while (!clone.isEmpty()) {
      sorted.push(clone.pop());
    }
    return sorted;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.comparator(this.heap[index], this.heap[parentIdx]) < 0) {
        // heap[index] has higher priority than parent
        [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let candidate = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.comparator(this.heap[leftChild], this.heap[candidate]) < 0) {
        candidate = leftChild;
      }
      if (rightChild < length && this.comparator(this.heap[rightChild], this.heap[candidate]) < 0) {
        candidate = rightChild;
      }

      if (candidate !== index) {
        [this.heap[index], this.heap[candidate]] = [this.heap[candidate], this.heap[index]];
        index = candidate;
      } else {
        break;
      }
    }
  }
}

/**
 * Fast Inverted Index Search for instant sub-linear querying
 */
export class InvertedIndexSearch {
  constructor() {
    this.index = new Map(); // token -> Set of item keys
    this.itemMap = new Map(); // item key -> item
  }

  clear() {
    this.index.clear();
    this.itemMap.clear();
  }

  build(items, keyFn = (item) => item._id || item.id, extractFieldsFn = null) {
    this.clear();
    const defaultExtract = (item) => {
      const tokens = [];
      if (item.tokenString) tokens.push(item.tokenString);
      if (item.queueNumber) tokens.push(String(item.queueNumber));
      if (item.status) tokens.push(item.status);
      
      const pat = item.patientId || {};
      if (pat.firstName) tokens.push(pat.firstName);
      if (pat.lastName) tokens.push(pat.lastName);
      if (pat.mrn) tokens.push(pat.mrn);
      if (pat.phone) tokens.push(pat.phone);

      const doc = item.consultation?.doctorId || {};
      if (doc.fullName) tokens.push(doc.fullName);

      (item.labOrders || []).forEach(o => {
        if (o.testName) tokens.push(o.testName);
        if (o.testCode) tokens.push(o.testCode);
        if (o.specimenBarcode) tokens.push(o.specimenBarcode);
      });

      return tokens;
    };

    const extract = extractFieldsFn || defaultExtract;

    items.forEach((item) => {
      const key = keyFn(item);
      this.itemMap.set(key, item);
      const rawTokens = extract(item);

      rawTokens.forEach((raw) => {
        if (!raw) return;
        const clean = String(raw).toLowerCase().trim();
        const parts = clean.split(/[\s,_\-:/]+/);
        parts.forEach((p) => {
          if (!p) return;
          if (!this.index.has(p)) {
            this.index.set(p, new Set());
          }
          this.index.get(p).add(key);
        });
      });
    });
  }

  search(query) {
    if (!query || !query.trim()) {
      return Array.from(this.itemMap.values());
    }

    const searchTokens = query.toLowerCase().trim().split(/[\s,_\-:/]+/).filter(Boolean);
    if (searchTokens.length === 0) return Array.from(this.itemMap.values());

    // Find matching keys for each search token (prefix/substring match in token dictionary)
    const matchingKeySets = searchTokens.map((token) => {
      const matchedKeys = new Set();
      for (const [indexedToken, keySet] of this.index.entries()) {
        if (indexedToken.includes(token)) {
          keySet.forEach((k) => matchedKeys.add(k));
        }
      }
      return matchedKeys;
    });

    // Intersect all matched key sets (AND query)
    if (matchingKeySets.length === 0) return [];
    let intersection = Array.from(matchingKeySets[0]);
    for (let i = 1; i < matchingKeySets.length; i++) {
      const currentSet = matchingKeySets[i];
      intersection = intersection.filter((k) => currentSet.has(k));
    }

    return intersection.map((k) => this.itemMap.get(k)).filter(Boolean);
  }
}

/**
 * Bucket Partitioner for multi-dimensional aggregation
 */
export class BucketPartitioner {
  static partitionBy(items, classifierFn) {
    const buckets = new Map();
    items.forEach((item) => {
      const key = classifierFn(item);
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(item);
    });
    return buckets;
  }
}

/**
 * Pluggable Priority Strategy for HMS Queue Modules
 */
export class PriorityQueueEngine {
  constructor(strategy = {}) {
    this.strategy = {
      computePriorityScore: strategy.computePriorityScore || this.defaultLabPriorityScore,
      getCategory: strategy.getCategory || this.defaultCategory,
      ...strategy,
    };
    this.searchIndex = new InvertedIndexSearch();
  }

  /**
   * Default Laboratory Priority Scoring Algorithm
   * Emergency / Panic Alert = 1000
   * Recollect / Redraw Sample = 500
   * STAT Priority = 300
   * Urgent Priority = 200
   * Routine = 100
   * + Dynamic Aging: +10 points for every 60 seconds waited (capped at +600 points)
   */
  defaultLabPriorityScore(visit) {
    let baseScore = PRIORITY_TIERS.ROUTINE.baseScore;
    let tier = PRIORITY_TIERS.ROUTINE;

    const orders = visit.labOrders || [];
    const hasEmergency = orders.some(o => o.panicAlertBroadcasted || (o.pathologistVerification?.panicValueFlag));
    const hasRedraw = orders.some(o => Boolean(o.recollectionRequested));
    const hasStat = orders.some(o => (o.priority || '').toUpperCase() === 'STAT');
    const hasUrgent = orders.some(o => (o.priority || '').toUpperCase() === 'URGENT');

    if (hasEmergency) {
      baseScore = PRIORITY_TIERS.EMERGENCY.baseScore;
      tier = PRIORITY_TIERS.EMERGENCY;
    } else if (hasRedraw) {
      baseScore = PRIORITY_TIERS.REDRAW.baseScore;
      tier = PRIORITY_TIERS.REDRAW;
    } else if (hasStat) {
      baseScore = PRIORITY_TIERS.STAT.baseScore;
      tier = PRIORITY_TIERS.STAT;
    } else if (hasUrgent) {
      baseScore = PRIORITY_TIERS.URGENT.baseScore;
      tier = PRIORITY_TIERS.URGENT;
    }

    // Calculate dynamic wait time aging (in minutes)
    const createdAt = new Date(visit.createdAt || Date.now()).getTime();
    const waitTimeMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60)));
    const agingScore = Math.min(600, waitTimeMinutes * 10);

    const computedScore = baseScore + agingScore;

    return {
      computedScore,
      baseScore,
      agingScore,
      waitTimeMinutes,
      tier,
      isRedraw: hasRedraw,
      isEmergency: hasEmergency,
      isStat: hasStat,
      isUrgent: hasUrgent,
    };
  }

  defaultCategory(visit) {
    const orders = visit.labOrders || [];
    if (orders.some(o => o.panicAlertBroadcasted)) return 'EMERGENCY';
    if (orders.some(o => Boolean(o.recollectionRequested))) return 'REDRAW';
    if (orders.some(o => (o.priority || '').toUpperCase() === 'STAT')) return 'STAT';
    return 'ROUTINE';
  }

  /**
   * Process and sort raw queue visits into an optimized priority queue
   */
  processQueue(items, searchQuery = '', activeFilter = 'ALL') {
    if (!Array.isArray(items)) return { items: [], metrics: { total: 0, redraws: 0, emergency: 0, stat: 0, routine: 0 } };

    // 1. Build Inverted Search Index
    this.searchIndex.build(items);

    // 2. Perform Sub-linear Search Filter
    let filtered = this.searchIndex.search(searchQuery);

    // 3. Compute DSA Priority Scores & Enqueue into Max-Heap
    const maxHeap = new BinaryMaxHeap((a, b) => {
      // Primary: computedScore descending
      if (b._priorityMeta.computedScore !== a._priorityMeta.computedScore) {
        return b._priorityMeta.computedScore - a._priorityMeta.computedScore;
      }
      // Tie-breaker: earlier creation time gets higher priority
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let countRedraws = 0;
    let countEmergency = 0;
    let countStat = 0;
    let countRoutine = 0;

    filtered.forEach((item) => {
      const priorityMeta = this.strategy.computePriorityScore(item);
      const enhanced = { ...item, _priorityMeta: priorityMeta };

      if (priorityMeta.isEmergency) countEmergency++;
      else if (priorityMeta.isRedraw) countRedraws++;
      else if (priorityMeta.isStat) countStat++;
      else countRoutine++;

      // Apply category filter if not 'ALL'
      if (activeFilter === 'ALL') {
        maxHeap.push(enhanced);
      } else if (activeFilter === 'REDRAW' && priorityMeta.isRedraw) {
        maxHeap.push(enhanced);
      } else if (activeFilter === 'EMERGENCY' && priorityMeta.isEmergency) {
        maxHeap.push(enhanced);
      } else if (activeFilter === 'STAT' && priorityMeta.isStat) {
        maxHeap.push(enhanced);
      } else if (activeFilter === 'ROUTINE' && !priorityMeta.isRedraw && !priorityMeta.isEmergency && !priorityMeta.isStat) {
        maxHeap.push(enhanced);
      }
    });

    const sortedQueue = maxHeap.toSortedArray();

    return {
      items: sortedQueue,
      metrics: {
        total: items.length,
        filteredCount: sortedQueue.length,
        redraws: countRedraws,
        emergency: countEmergency,
        stat: countStat,
        routine: countRoutine,
      },
    };
  }
}

export default PriorityQueueEngine;
