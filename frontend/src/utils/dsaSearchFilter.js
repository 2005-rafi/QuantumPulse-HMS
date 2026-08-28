/**
 * dsaSearchFilter.js
 * High-Performance DSA-Based Multi-Field Search, Rank, and Filter Engine.
 *
 * Concepts Used:
 *   1. Prefix Trie (Retrieval Tree) — O(L) prefix-matching per token where L is token length.
 *   2. Inverted Index with Multi-Predicate Scoring — Instant token-to-record mapping.
 *   3. Weighted Relevance Ranking — Exact match (100) > Prefix match (60) > Substring match (40) > Partial (20).
 *   4. Multi-Token Conjunctive (AND) Query Evaluation.
 */

// ─── 1. Trie Node Definition ────────────────────────────────────────────────
class TrieNode {
  constructor() {
    this.children = new Map();
    this.recordIndices = new Set();
    this.isEndOfWord = false;
  }
}

// ─── 2. Prefix Trie Data Structure ──────────────────────────────────────────
export class PrefixTrie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, recordIndex) {
    if (!word || typeof word !== 'string') return;
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord) return;

    let current = this.root;
    current.recordIndices.add(recordIndex);

    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i];
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
      current.recordIndices.add(recordIndex);
    }
    current.isEndOfWord = true;
  }

  searchPrefix(prefix) {
    if (!prefix) return new Set();
    const cleanPrefix = prefix.toLowerCase().trim();
    let current = this.root;

    for (let i = 0; i < cleanPrefix.length; i++) {
      const char = cleanPrefix[i];
      if (!current.children.has(char)) {
        return new Set();
      }
      current = current.children.get(char);
    }

    return current.recordIndices;
  }
}

// ─── 3. Tokenizer Utility ────────────────────────────────────────────────────
export const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 0);
};

// ─── 4. High-Performance Clinical Queue Indexer & Search ────────────────────
export class ClinicalQueueSearchIndex {
  constructor(items = []) {
    this.items = items;
    this.trie = new PrefixTrie();
    this.fieldIndex = new Map();
    this.buildIndex();
  }

  buildIndex() {
    this.items.forEach((item, index) => {
      const patient = item.patientId || {};
      const vitals = item.vitals || {};

      // Extract indexed fields
      const fields = {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        mrn: patient.mrn || '',
        token: item.tokenString || (item.visitNumber ? item.visitNumber.slice(-4) : '') || '',
        visitNumber: item.visitNumber || '',
        complaint: vitals.chiefComplaint || item.reason || '',
        phone: patient.phoneNumber || '',
        department: item.departmentId?.name || '',
      };

      this.fieldIndex.set(index, fields);

      // Index tokens in Prefix Trie
      Object.entries(fields).forEach(([fieldKey, textVal]) => {
        if (!textVal) return;
        const tokens = tokenize(textVal);
        tokens.forEach((token) => {
          this.trie.insert(token, index);
        });
      });
    });
  }

  search(query, statusFilter = 'all') {
    let candidateIndices = null;

    // 1. Status Pre-Filter
    if (statusFilter && statusFilter !== 'all') {
      const statusMatches = new Set();
      this.items.forEach((item, index) => {
        if (item.status === statusFilter) {
          statusMatches.add(index);
        }
      });
      candidateIndices = statusMatches;
    }

    // 2. Query Search with Conjunctive (AND) Token Logic
    const queryTokens = tokenize(query);

    if (queryTokens.length > 0) {
      for (const token of queryTokens) {
        const tokenMatches = this.trie.searchPrefix(token);
        if (candidateIndices === null) {
          candidateIndices = new Set(tokenMatches);
        } else {
          // Intersection for AND semantics
          const intersected = new Set();
          for (const idx of candidateIndices) {
            if (tokenMatches.has(idx)) {
              intersected.add(idx);
            }
          }
          candidateIndices = intersected;
        }

        if (candidateIndices.size === 0) break;
      }
    }

    // If no query and no status filter, return all
    const resultIndices = candidateIndices !== null
      ? Array.from(candidateIndices)
      : this.items.map((_, idx) => idx);

    // 3. Relevance Scoring & Ranking
    if (queryTokens.length > 0) {
      const scoredResults = resultIndices.map((idx) => {
        const item = this.items[idx];
        const fields = this.fieldIndex.get(idx) || {};
        let score = 0;

        queryTokens.forEach((qToken) => {
          // Exact token match on token/MRN
          if (fields.token.toLowerCase() === qToken || fields.mrn.toLowerCase() === qToken) {
            score += 100;
          } else if (fields.name.toLowerCase().startsWith(qToken)) {
            score += 60;
          } else if (fields.name.toLowerCase().includes(qToken)) {
            score += 40;
          } else if (fields.complaint.toLowerCase().includes(qToken)) {
            score += 20;
          } else {
            score += 10;
          }
        });

        return { item, score };
      });

      // Sort by score descending, then by creation date ascending (FIFO)
      scoredResults.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.item.createdAt || 0) - new Date(b.item.createdAt || 0);
      });

      return scoredResults.map((r) => r.item);
    }

    // Default FIFO sort
    return resultIndices
      .map((idx) => this.items[idx])
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }
}
