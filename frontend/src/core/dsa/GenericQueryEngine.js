/**
 * GenericQueryEngine — Polymorphic DSA Search, Filter, Sort Orchestrator.
 * Adheres strictly to SOLID principles (OCP, DIP).
 *
 * Plugs into Patients, Pharmacy, Appointments, Lab Tests, and Invoices.
 */

import { RadixTrie } from './RadixTrie';
import { InvertedIndex } from './InvertedIndex';
import { BitmaskFilter } from './BitmaskFilter';
import { BoundedBinaryHeap } from './MinMaxHeap';

export class GenericQueryEngine {
  /**
   * @param {Object} config
   * @param {string} config.primaryKey - e.g. '_id' or 'id'
   * @param {string[]} config.prefixFields - fields to index in RadixTrie (e.g. ['mrn', 'phone'])
   * @param {string[]} config.textFields - fields to index in InvertedIndex (e.g. ['firstName', 'lastName', 'city'])
   * @param {Object} config.categoricalDefinitions - mapping for BitmaskFilter
   */
  constructor(config = {}) {
    this.primaryKey = config.primaryKey || '_id';
    this.prefixFields = config.prefixFields || [];
    this.textFields = config.textFields || [];
    this.categoricalDefinitions = config.categoricalDefinitions || {};

    this.trie = new RadixTrie();
    this.invertedIndex = new InvertedIndex();
    this.bitmaskFilter = new BitmaskFilter(this.categoricalDefinitions);
    this.recordStore = new Map(); // id -> raw record
  }

  /**
   * Load and index a bulk collection of records.
   * @param {Array<Object>} records 
   */
  indexDataset(records = []) {
    this.clear();

    records.forEach((record) => {
      const id = record[this.primaryKey] || record.id || record._id;
      if (!id) return;

      this.recordStore.set(id, record);

      // 1. Index prefix fields in RadixTrie
      this.prefixFields.forEach((field) => {
        if (record[field]) {
          this.trie.insert(String(record[field]), id);
        }
      });

      // 2. Index text fields in InvertedIndex
      const textsToIndex = this.textFields
        .map((field) => (typeof field === 'function' ? field(record) : record[field]))
        .filter(Boolean);
      this.invertedIndex.indexRecord(id, textsToIndex);

      // 3. Index categorical properties in BitmaskFilter
      this.bitmaskFilter.indexRecord(id, record);
    });
  }

  /**
   * Execute optimized hybrid DSA Query.
   * @param {Object} queryParams
   * @param {string} queryParams.searchQuery - Text search string
   * @param {Object} queryParams.filters - Categorical filter map
   * @param {Function} queryParams.comparator - Sort comparator function
   * @param {number} queryParams.page - Page number (1-indexed)
   * @param {number} queryParams.pageSize - Number of items per page
   * @returns {Object} { items: Array, total: number, totalPages: number, page: number }
   */
  query({
    searchQuery = '',
    filters = {},
    comparator = null,
    page = 1,
    pageSize = 50,
  } = {}) {
    let candidateIds = null;

    // ── 1. DSA Search Step ──
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length > 0) {
      // Check prefix trie (e.g. MRN or Phone)
      const prefixResults = this.trie.searchPrefix(trimmedQuery);
      // Check inverted index (e.g. Name tokens)
      const fullTextResults = this.invertedIndex.search(trimmedQuery);

      // Union search results (OR)
      candidateIds = new Set([...prefixResults, ...fullTextResults]);
    }

    // ── 2. DSA Bitmask Filter Step ──
    const filterResults = this.bitmaskFilter.filter(filters);

    if (candidateIds === null) {
      candidateIds = filterResults;
    } else {
      // Intersect search & filter candidates
      const intersected = new Set();
      for (const id of candidateIds) {
        if (filterResults.has(id)) {
          intersected.add(id);
        }
      }
      candidateIds = intersected;
    }

    // ── 3. Resolve Records & Top-K Sort Step ──
    const matchedRecords = [];
    for (const id of candidateIds) {
      const record = this.recordStore.get(id);
      if (record) matchedRecords.push(record);
    }

    const total = matchedRecords.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const targetK = page * pageSize;

    let pagedItems = [];

    if (comparator) {
      if (matchedRecords.length <= targetK) {
        // Full sort if total is small
        matchedRecords.sort(comparator);
        pagedItems = matchedRecords.slice((page - 1) * pageSize, targetK);
      } else {
        // Use Bounded Min-Heap for Top-K
        const heap = new BoundedBinaryHeap(targetK, comparator);
        for (let i = 0; i < matchedRecords.length; i++) {
          heap.push(matchedRecords[i]);
        }
        const topK = heap.extractSorted();
        pagedItems = topK.slice((page - 1) * pageSize, targetK);
      }
    } else {
      pagedItems = matchedRecords.slice((page - 1) * pageSize, targetK);
    }

    return {
      items: pagedItems,
      total,
      totalPages,
      page,
      pageSize,
    };
  }

  /**
   * Reset all DSA indices.
   */
  clear() {
    this.trie.clear();
    this.invertedIndex.clear();
    this.bitmaskFilter.clear();
    this.recordStore.clear();
  }
}

export default GenericQueryEngine;
