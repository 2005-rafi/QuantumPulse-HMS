/**
 * RadixTrie — Compact Prefix Search Tree for Clinical Identifiers & Names.
 * Time Complexity: O(K) where K is query length (independent of dataset size N).
 * Space Complexity: O(N * alphabet) with compressed edges.
 */

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.recordIds = new Set(); // Stores record IDs matching this prefix
  }
}

export class RadixTrie {
  constructor() {
    this.root = new TrieNode();
    this.size = 0;
  }

  /**
   * Insert a string token and associate it with a record ID.
   * @param {string} text 
   * @param {string|number} recordId 
   */
  insert(text, recordId) {
    if (!text || !recordId) return;
    const normalized = String(text).toLowerCase().trim();
    let current = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
      current.recordIds.add(recordId);
    }

    current.isEndOfWord = true;
    this.size++;
  }

  /**
   * Search for all record IDs that start with the given prefix.
   * @param {string} prefix 
   * @returns {Set<string|number>} Set of matching record IDs
   */
  searchPrefix(prefix) {
    if (!prefix) return new Set();
    const normalized = String(prefix).toLowerCase().trim();
    let current = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      if (!current.children.has(char)) {
        return new Set(); // Prefix not found
      }
      current = current.children.get(char);
    }

    return new Set(current.recordIds);
  }

  /**
   * Clear all trie nodes.
   */
  clear() {
    this.root = new TrieNode();
    this.size = 0;
  }
}

export default RadixTrie;
