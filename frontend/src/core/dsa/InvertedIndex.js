/**
 * InvertedIndex — Multi-Field Tokenized Inverted Index with Postings Intersection.
 * Time Complexity: O(1) token lookup, O(|L1| + |L2|) postings intersection.
 */

export class InvertedIndex {
  constructor() {
    this.postings = new Map(); // token -> Set<recordId>
    this.tokenTrie = null; // Optional hook for prefix token search
  }

  /**
   * Tokenize text into normalized unique words/ngrams.
   * @param {string} text 
   * @returns {string[]}
   */
  static tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Index multiple text fields of a record.
   * @param {string|number} recordId 
   * @param {string[]} textFields 
   */
  indexRecord(recordId, textFields = []) {
    if (!recordId) return;
    const allTokens = new Set();

    textFields.forEach((field) => {
      InvertedIndex.tokenize(field).forEach((token) => allTokens.add(token));
    });

    allTokens.forEach((token) => {
      if (!this.postings.has(token)) {
        this.postings.set(token, new Set());
      }
      this.postings.get(token).add(recordId);
    });
  }

  /**
   * Search for record IDs matching ALL query tokens (AND logic via set intersection).
   * @param {string} query 
   * @returns {Set<string|number>}
   */
  search(query) {
    const tokens = InvertedIndex.tokenize(query);
    if (tokens.length === 0) return new Set();

    let intersection = null;

    for (const token of tokens) {
      // Find matching postings (exact or prefix match)
      let matchedIds = this.postings.get(token) || new Set();

      // If exact token not found, check partial prefix matches
      if (matchedIds.size === 0) {
        const prefixMatches = new Set();
        for (const [key, idSet] of this.postings.entries()) {
          if (key.startsWith(token)) {
            idSet.forEach((id) => prefixMatches.add(id));
          }
        }
        matchedIds = prefixMatches;
      }

      if (matchedIds.size === 0) {
        return new Set(); // If any token has 0 matches, intersection is empty
      }

      if (intersection === null) {
        intersection = new Set(matchedIds);
      } else {
        // Intersect
        const nextIntersection = new Set();
        for (const id of intersection) {
          if (matchedIds.has(id)) {
            nextIntersection.add(id);
          }
        }
        intersection = nextIntersection;
        if (intersection.size === 0) break;
      }
    }

    return intersection || new Set();
  }

  /**
   * Clear all postings.
   */
  clear() {
    this.postings.clear();
  }
}

export default InvertedIndex;
